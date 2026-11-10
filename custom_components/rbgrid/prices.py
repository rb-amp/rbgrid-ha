"""External prices: push an HA price entity (Nord Pool, ENTSO-e, Tibber, …) to the hub.

The hub prices each 15-minute period at its midpoint; an external entry replaces the
tariff zone's *energy rate* for [from, until) while the plan's fees and VAT still
apply (see RBGRID_CMD.md, "External price"). Entries live in RAM on the device, so
they are re-sent whenever the hub reconnects.

Device capacity. Firmware from dev/esphome d00a3e7 on keeps 192 entries (2 × 96 quarters),
older builds 48. Since the day-ahead markets moved to 15-minute prices (SDAC, October
2025) a day is 96 entries, so on a 48-entry hub a "today + tomorrow" list is packed: the
next quarters stay exact, the tail is collapsed into hourly time-weighted means until
everything fits (:func:`pack_entries`). The pusher does not know the firmware: it probes
once per connection — sends the full list, reads ``get price`` back, and if the device
kept fewer than it sent, clears and re-sends the packed list, remembering the cap until
the hub reconnects. It re-sends at every quarter boundary, so while Home Assistant is
up the exact window rolls forward; without Home Assistant the hub still has the stored
list (hourly means on a 48-entry hub), and the tariff plan's zones after that.

Entries are sent newest first: builds before d00a3e7 purged, on every new entry, the
entries that ended more than 24 h before *its* start, so an ascending today + tomorrow
list lost today's quarters; descending order keeps them, and the fixed build does not
care about order.

Supported entity shapes (first match wins):

* attributes ``raw_today`` / ``raw_tomorrow``: lists of ``{start, end, value}``
  (Nord Pool and compatible integrations);
* attributes ``prices_today`` / ``prices_tomorrow`` / ``prices``: lists of
  ``{time, price}`` (ENTSO-e style); ``data`` (EPEX Spot, Tibber Prices, the community
  Nord Pool template) and ``outlook_quarters``;
* any other attribute that is a list of dicts — or a dict holding such a list under
  ``data`` — with a start-like key (``start``, ``time``, ``startsAt``, ``from``,
  ``start_time``) and a price-like key (``value``, ``price``, ``total``, ``buy``,
  ``price_ct_per_kwh``);
* otherwise the entity *state* is one price, valid from the current quarter hour
  until the end of the next full hour; it is re-sent on every state change (so a
  state-only sensor gives the hub about two hours of autonomy — pick a sensor that
  carries the list when the hub must price on its own).

Prices are in the entity's currency per kWh; ``price_unit`` = ``cents`` divides by 100,
``mwh`` (per MWh, as core Nord Pool's action results) by 1000.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import Any

from homeassistant.core import Event, EventStateChangedData, HomeAssistant, State, callback
from homeassistant.helpers.event import async_call_later, async_track_state_change_event, async_track_time_change
from homeassistant.util import dt as dt_util

from .const import OPT_PRICE_ENTITY, OPT_PRICE_UNIT
from .hub import RbgridError, RbgridHub

_LOGGER = logging.getLogger(__name__)

DEVICE_CAP = 192  # entries the device keeps (firmware d00a3e7+, RBGRID_CMD.md "External price")
DEVICE_CAP_LEGACY = 48  # older firmware; 12 h of quarter-hour prices
MAX_ENTRIES = DEVICE_CAP
_START_KEYS = ("start", "time", "startsAt", "from", "start_time", "datetime", "timestamp")
_END_KEYS = ("end", "until", "end_time", "endsAt")
_PRICE_KEYS = ("value", "price", "total", "buy", "price_ct_per_kwh", "price_per_kwh", "price_eur_per_kwh")
_LIST_ATTRS = (
    ("raw_today", "raw_tomorrow"),
    ("prices_today", "prices_tomorrow"),
    ("prices",),
    ("data",),
    ("outlook_quarters",),
    ("today", "tomorrow"),
)
_DIVISORS = {"major": 1.0, "cents": 100.0, "mwh": 1000.0}


def _ts(value: Any) -> int | None:
    if isinstance(value, (int, float)):
        return int(value / 1000) if value > 100_000_000_000 else int(value)  # ms vs s
    if isinstance(value, datetime):
        return int(value.timestamp())
    if isinstance(value, str):
        parsed = dt_util.parse_datetime(value)
        if parsed is None:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt_util.DEFAULT_TIME_ZONE)
        return int(parsed.timestamp())
    return None


def _first(d: dict[str, Any], keys: tuple[str, ...]) -> Any:
    for k in keys:
        if k in d and d[k] is not None:
            return d[k]
    return None


def _rows_from_items(items: list[dict[str, Any]], divisor: float) -> list[dict[str, Any]]:
    """Parse a list of ``{start, end?, price}`` dicts into device rows; an entry without an end runs to the next start."""
    parsed = []
    for x in items:
        start = _ts(_first(x, _START_KEYS))
        price = _first(x, _PRICE_KEYS)
        if start is None or price is None:
            continue
        try:
            price_f = float(price)
        except (TypeError, ValueError):
            continue
        parsed.append((start, _ts(_first(x, _END_KEYS)), price_f))
    if not parsed:
        return []
    parsed.sort(key=lambda t: t[0])
    rows = []
    for i, (start, end, price) in enumerate(parsed):
        if end is None:
            end = parsed[i + 1][0] if i + 1 < len(parsed) else start + 3600
        rows.append({"buy": round(price / divisor, 5), "from": start, "until": end})
    return rows


def _hourly(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse rows into hour buckets with duration-weighted mean prices."""
    buckets: dict[int, list[dict[str, Any]]] = {}
    for r in rows:
        buckets.setdefault(r["from"] // 3600, []).append(r)
    out = []
    for key in sorted(buckets):
        group = buckets[key]
        dur = sum(r["until"] - r["from"] for r in group) or 1
        entry = {"buy": round(sum(r["buy"] * (r["until"] - r["from"]) for r in group) / dur, 5), "from": min(r["from"] for r in group), "until": max(r["until"] for r in group)}
        if all("sell" in r for r in group):
            entry["sell"] = round(sum(r["sell"] * (r["until"] - r["from"]) for r in group) / dur, 5)
        out.append(entry)
    return out


def pack_entries(rows: list[dict[str, Any]], limit: int = MAX_ENTRIES) -> list[dict[str, Any]]:
    """Fit sorted rows into the device's limit: the first rows exact, the tail as hourly means.

    96 quarter-hour prices for today + 96 for tomorrow do not fit in 48 entries; this keeps as
    many leading quarters exact as the hourly tail allows (typically ~6 h exact + ~30 h hourly).
    """
    if len(rows) <= limit:
        return rows
    for k in range(limit, -1, -1):
        tail = _hourly(rows[k:])
        if k + len(tail) <= limit:
            return rows[:k] + tail
    return rows[:limit]


def entries_from_state(state: State, divisor: float, now: datetime | None = None, limit: int = MAX_ENTRIES) -> list[dict[str, Any]]:
    """Turn a price entity into device entries ``[{"buy","from","until"}]`` (sorted, deduplicated, packed into ``limit``)."""
    attrs = state.attributes
    now = now or dt_util.utcnow()
    now_ts = int(now.timestamp())
    rows: list[dict[str, Any]] = []
    for group in _LIST_ATTRS:
        lists = [attrs.get(a) for a in group if isinstance(attrs.get(a), list)]
        if not lists:
            continue
        items = [x for lst in lists for x in lst]
        if items and all(isinstance(x, dict) for x in items):
            rows = _rows_from_items(items, divisor)
            if rows:
                break
        elif items and all(isinstance(x, (int, float)) for x in items) and group == ("today", "tomorrow"):
            # Nord Pool legacy: hourly numbers for today (and tomorrow), local midnight based
            day0 = dt_util.start_of_local_day(dt_util.as_local(now))
            for d, lst in enumerate(lists):
                step = 86400 // max(len(lst), 1)
                base = int((day0 + timedelta(days=d)).timestamp())
                for i, price in enumerate(lst):
                    rows.append({"buy": round(float(price) / divisor, 5), "from": base + i * step, "until": base + (i + 1) * step})
            break
    if not rows:
        # Any other attribute: a list of price dicts, or a dict that holds one under "data"
        for value in attrs.values():
            items = value if isinstance(value, list) else value.get("data") if isinstance(value, dict) else None
            if isinstance(items, list) and items and all(isinstance(x, dict) for x in items):
                rows = _rows_from_items(items, divisor)
                if rows:
                    break
    if not rows:
        try:
            price = float(state.state)
        except (TypeError, ValueError):
            return []
        start = now_ts - now_ts % 900
        end = (now_ts // 3600 + 2) * 3600
        rows.append({"buy": round(price / divisor, 5), "from": start, "until": end})
    # keep current + future only, dedupe by start, cap
    rows = [r for r in rows if r["until"] > now_ts]  # current and future periods only
    seen: dict[int, dict[str, Any]] = {}
    for r in rows:
        seen[r["from"]] = r
    out = sorted(seen.values(), key=lambda r: r["from"])
    return pack_entries(out, limit)


class PricePusher:
    """Keeps the hub's external prices in sync with one HA entity."""

    def __init__(self, hass: HomeAssistant, hub: RbgridHub, entity_id: str, unit: str) -> None:
        self.hass = hass
        self.hub = hub
        self.entity_id = entity_id
        self.divisor = _DIVISORS.get(unit, 1.0)
        self._unsubs: list[Any] = []
        self._retry: Any = None
        self.cap: int | None = None  # device entry capacity, learned by probing; None = unknown
        self._failing = False
        self.last_push: dict[str, Any] | None = None

    async def async_start(self) -> None:
        """Subscribe and push once."""
        self._unsubs.append(async_track_state_change_event(self.hass, [self.entity_id], self._on_price_change))
        hub_cv = self.hub.entity_map()["hub"].get("Config version")
        if hub_cv:
            self._unsubs.append(async_track_state_change_event(self.hass, [hub_cv["entity_id"]], self._on_hub_change))
        # Every quarter boundary: the exact window of a packed list rolls forward (and a state-only
        # sensor stays covered); the device drops nothing on a re-send with the same starts.
        self._unsubs.append(async_track_time_change(self.hass, self._on_timer, minute=[0, 15, 30, 45], second=20))
        await self._push_guarded()

    @callback
    def async_stop(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._retry:
            self._retry()
            self._retry = None

    def _spawn(self) -> None:
        self.hub.entry.async_create_background_task(self.hass, self._push_guarded(), f"rbgrid {self.hub.name} price push")

    async def _push_guarded(self) -> None:
        """A push must never take the entry down or leave an unretrieved task exception."""
        try:
            summary = await self.async_push()
        except Exception as err:  # noqa: BLE001
            summary = {"at": dt_util.utcnow().isoformat(), "entity": self.entity_id, "sent": 0, "error": f"{type(err).__name__}: {err}"}
            self.last_push = summary
            _LOGGER.debug("RBgrid %s: price push crashed", self.hub.name, exc_info=True)
        failed = bool(summary.get("error"))
        if failed and not self._failing:
            _LOGGER.info("RBgrid %s: price push failing: %s", self.hub.name, summary.get("error"))
        elif not failed and self._failing:
            _LOGGER.info("RBgrid %s: price push working again (%s entries)", self.hub.name, summary.get("sent"))
        self._failing = failed

    @callback
    def _on_price_change(self, event: Event[EventStateChangedData]) -> None:
        self._spawn()

    @callback
    def _on_hub_change(self, event: Event[EventStateChangedData]) -> None:
        old, new = event.data.get("old_state"), event.data.get("new_state")
        if old and new and old.state in ("unavailable", "unknown") and new.state not in ("unavailable", "unknown"):
            # Hub came back (reboot clears RAM prices, firmware may have changed): re-probe and re-send
            self.cap = None

            @callback
            def _later(_now: datetime) -> None:
                self._retry = None
                self._spawn()

            self._retry = async_call_later(self.hass, 10, _later)

    @callback
    def _on_timer(self, _now: datetime) -> None:
        self._spawn()

    async def _send(self, entries: list[dict[str, Any]], clear: bool = False) -> None:
        """One ``set price`` command, newest entry first (see module docstring)."""
        if clear:
            await self.hub.async_call({"cmd": "set", "section": "price", "data": {"clear": True}})
        ordered = sorted(entries, key=lambda r: r["from"], reverse=True)
        await self.hub.async_call({"cmd": "set", "section": "price", "data": {"prices": ordered}})

    async def _stored_count(self) -> int | None:
        try:
            reply = await self.hub.async_call({"cmd": "get", "section": "price"})
        except RbgridError:
            return None
        data = reply.data if isinstance(reply.data, dict) else {}
        prices = data.get("prices")
        return len(prices) if isinstance(prices, list) else None

    async def async_push(self) -> dict[str, Any]:
        """Send the current entries. Returns a summary (also kept as ``last_push``)."""
        state = self.hass.states.get(self.entity_id)
        at = dt_util.utcnow().isoformat()
        if state is None or state.state in ("unavailable", "unknown"):
            self.last_push = {"at": at, "entity": self.entity_id, "sent": 0, "error": "price entity unavailable"}
            return self.last_push
        full = entries_from_state(state, self.divisor, limit=DEVICE_CAP)
        if not full:
            self.last_push = {"at": at, "entity": self.entity_id, "sent": 0, "error": "no usable prices in entity"}
            return self.last_push
        try:
            if self.cap is not None or len(full) <= DEVICE_CAP_LEGACY:
                entries = pack_entries(full, self.cap or DEVICE_CAP)
                await self._send(entries)
            else:
                # Unknown capacity and a long list: probe. Send everything; a legacy hub keeps 48 of it.
                entries = full
                try:
                    await self._send(full)
                    kept = await self._stored_count()
                except RbgridError as err:
                    _LOGGER.debug("RBgrid %s: full price list refused (%s), assuming a %d-entry hub", self.hub.name, err, DEVICE_CAP_LEGACY)
                    kept = 0
                if kept is not None and kept < len(full):
                    self.cap = DEVICE_CAP_LEGACY if kept <= DEVICE_CAP_LEGACY else kept
                    entries = pack_entries(full, self.cap)
                    await self._send(entries, clear=True)
                    _LOGGER.info("RBgrid %s: hub keeps %d price entries; sending packed lists (exact quarters + hourly means)", self.hub.name, self.cap)
                else:
                    self.cap = DEVICE_CAP
            self.last_push = {"at": at, "entity": self.entity_id, "sent": len(entries), "cap": self.cap, "first": entries[0], "last": entries[-1]}
        except RbgridError as err:
            self.last_push = {"at": at, "entity": self.entity_id, "sent": 0, "error": str(err)}
        return self.last_push


def pusher_from_options(hass: HomeAssistant, hub: RbgridHub, options: dict[str, Any]) -> PricePusher | None:
    """Build a pusher from entry options, or None when no price entity is configured."""
    entity_id = options.get(OPT_PRICE_ENTITY)
    if not entity_id:
        return None
    return PricePusher(hass, hub, entity_id, options.get(OPT_PRICE_UNIT, "major"))
