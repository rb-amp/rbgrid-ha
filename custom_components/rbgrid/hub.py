"""RBgrid hub: talks to the device through Home Assistant's own ESPHome connection.

The ESPHome build of the RBgrid hub exposes one API action, ``rbgrid_cmd``, whose
single field ``command`` carries a JSON command and whose response carries the
device reply (see RBGRID_CMD.md in rbgrid-esphome). This class wraps that action:

* builds the action name from the ESPHome device name (``<name>_rbgrid_cmd``);
* reassembles replies that arrive in base64 parts (ESPHome caps a response at
  5119 bytes, so the device splits anything over 4000 bytes);
* turns device errors into :class:`RbgridError` with the bare device message;
* caches read sections for a few seconds and drops the cache on every change;
* keeps a ring buffer of ``esphome.rbgrid_event`` events for this hub.
"""

from __future__ import annotations

import asyncio
import base64
import binascii
from collections import deque
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
import json
import logging
import re
import time
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.event import async_call_later, async_track_state_change_event

from .const import (
    ACTION_SUFFIX,
    DOMAIN,
    CONF_DEVICE_ID,
    CONF_ESPHOME_ENTRY_ID,
    CONF_MAC,
    CONF_NAME,
    ESPHOME_DOMAIN,
    EVENT_BUFFER,
    EVENT_TYPE,
    GET_CACHE_TTL,
    SIGNAL_EVENT,
)

_LOGGER = logging.getLogger(__name__)

# "Failed to execute the action call rbgrid_cmd on rbgrid-hub-s3: <device message>"
_ESPHOME_ERR = re.compile(r"^Failed to execute the action call \S+ on \S+: (?P<msg>.*)$", re.S)
_POINT_DEVICE = re.compile(r"Point (?P<slot>\d+)$")

# Read sections that may be cached between calls
_CACHEABLE = {"schema", "sensors", "units", "tariff", "system", "i2c", "espnow"}
# Commands that change the device configuration (drop the read cache)
_CHANGING = {"set", "unit"}


class RbgridError(HomeAssistantError):
    """A device-side error, message as the device wrote it."""


@dataclass
class RbgridReply:
    """A normalised reply: wrapper fields + the bare device reply in ``data``."""

    ok: bool
    data: Any
    type: str | None = None
    schema: int | None = None
    config_version: str | None = None
    parts: int = 1
    elapsed_ms: float = 0.0

    def as_dict(self) -> dict[str, Any]:
        """Serialise for the websocket API."""
        return {
            "ok": self.ok,
            "type": self.type,
            "schema": self.schema,
            "config_version": self.config_version,
            "parts": self.parts,
            "elapsed_ms": round(self.elapsed_ms, 1),
            "data": self.data,
        }


@dataclass
class RbgridEvent:
    """One line of the device event log, as received on the HA bus."""

    time_fired: str
    kind: str
    level: str
    message: str
    seq: int | None = None  # device event-log sequence (replayed lines)
    replay: bool = False  # True when read back with `get events` after a (re)connect

    def as_dict(self) -> dict[str, Any]:
        """Serialise."""
        return {"t": self.time_fired, "kind": self.kind, "level": self.level, "message": self.message, "seq": self.seq, "replay": self.replay}


@dataclass
class _CacheItem:
    at: float
    reply: RbgridReply


@dataclass
class RbgridHub:
    """One RBgrid hub (an ESPHome device with the rbgrid component)."""

    hass: HomeAssistant
    entry: ConfigEntry
    device_id: str
    mac: str
    esphome_entry_id: str
    name: str
    events: deque[RbgridEvent] = field(default_factory=lambda: deque(maxlen=EVENT_BUFFER))
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    _cache: dict[str, _CacheItem] = field(default_factory=dict)
    _unsubs: list[Any] = field(default_factory=list)
    last_config_version: str | None = None
    price_pusher: Any = None  # prices.PricePusher when an HA price entity is configured
    last_seq: int | None = None  # last device event-log seq seen (live or replayed)
    firmware: dict[str, Any] = field(default_factory=dict)  # from boot/fw log lines: image, partition, boot, reset
    _replay_task: Any = None
    runtime_options: Any = None  # options the running hub was built with (see __init__._runtime_options)
    signal: Any = None  # signal.RbgridSignalCoordinator (cheap windows / flags / rank), set by async_setup_entry

    @classmethod
    def from_entry(cls, hass: HomeAssistant, entry: ConfigEntry) -> RbgridHub:
        """Build from a config entry."""
        return cls(
            hass=hass,
            entry=entry,
            device_id=entry.data[CONF_DEVICE_ID],
            mac=entry.data[CONF_MAC],
            esphome_entry_id=entry.data[CONF_ESPHOME_ENTRY_ID],
            name=entry.title or entry.data.get(CONF_NAME, "RBgrid Hub"),  # the entry title: renaming the integration in HA renames the hub in the panel
        )

    # ------------------------------------------------------------------ ESPHome
    @property
    def esphome_entry(self) -> ConfigEntry | None:
        """The ESPHome config entry that owns the device."""
        return self.hass.config_entries.async_get_entry(self.esphome_entry_id)

    def _esphome_names(self) -> list[str]:
        """Candidate ESPHome device names, most likely first.

        The ESPHome integration names its actions after the device name stored in
        its config entry at adoption; after a re-flash under a new name (factory
        image, ``name_add_mac_suffix``) the live ``device_info.name`` differs while
        the actions keep the stored name, so both are tried.
        """
        entry = self.esphome_entry
        if entry is None:
            return []
        names: list[str] = []
        stored = entry.data.get("device_name")
        if stored:
            names.append(str(stored))
        runtime = getattr(entry, "runtime_data", None)
        info = getattr(runtime, "device_info", None)
        live = getattr(info, "name", None) if info is not None else None
        if live and str(live) not in names:
            names.append(str(live))
        return names

    @property
    def esphome_device_name(self) -> str | None:
        """ESPHome ``esphome: name:`` of the device (drives the action name).

        Candidates: the name stored in the ESPHome entry, the live one, and the name that
        resolved last time (ESPHome keeps the action under the name it had when the device
        first connected, even after the entry's stored name follows a rename). As a last
        resort an ``esphome.*_rbgrid_cmd`` action no other hub claims is taken.
        """
        names = self._esphome_names()
        last = getattr(self, "_action_device_name", None)
        if last and last not in names:
            names.append(last)
        for name in names:
            if self.hass.services.has_service(ESPHOME_DOMAIN, name.replace("-", "_") + ACTION_SUFFIX):
                self._action_device_name = name
                return name
        claimed = {
            n.replace("-", "_")
            for other in self.hass.config_entries.async_entries(DOMAIN)
            if other.entry_id != self.entry.entry_id
            for n in (getattr(getattr(other, "runtime_data", None), "_esphome_names", list)() or [])
        }
        free = [
            key[: -len(ACTION_SUFFIX)]
            for key in self.hass.services.async_services_for_domain(ESPHOME_DOMAIN)
            if key.endswith(ACTION_SUFFIX) and key[: -len(ACTION_SUFFIX)] not in claimed
        ]
        if len(free) == 1:
            self._action_device_name = free[0].replace("_", "-")
            return self._action_device_name
        return names[0] if names else None

    @property
    def action_name(self) -> str | None:
        """``<device>_rbgrid_cmd`` as registered in the ``esphome`` domain."""
        name = self.esphome_device_name
        if not name:
            return None
        return name.replace("-", "_") + ACTION_SUFFIX

    @property
    def available(self) -> bool:
        """True while HA holds a connection to the device."""
        entry = self.esphome_entry
        runtime = getattr(entry, "runtime_data", None) if entry else None
        return bool(getattr(runtime, "available", False))

    @property
    def action_registered(self) -> bool:
        """True once ESPHome has registered the action in HA."""
        action = self.action_name
        return bool(action) and self.hass.services.has_service(ESPHOME_DOMAIN, action)

    def info(self) -> dict[str, Any]:
        """Summary for the frontend."""
        return {
            "entry_id": self.entry.entry_id,
            "device_id": self.device_id,
            "mac": self.mac,
            "name": self.name,
            "esphome_name": self.esphome_device_name,
            "action": self.action_name,
            "available": self.available,
            "action_registered": self.action_registered,
            "config_version": self.last_config_version,
            "firmware": self.firmware,
            "last_seq": self.last_seq,
            "price_entity": getattr(self.price_pusher, "entity_id", None),
            "price_last_push": getattr(self.price_pusher, "last_push", None),
        }

    # ------------------------------------------------------------------ commands
    async def _raw(self, command: Mapping[str, Any]) -> dict[str, Any]:
        """One action call; returns the raw response object."""
        action = self.action_name
        if action is None:
            raise RbgridError("ESPHome device not found for this hub")
        if not self.hass.services.has_service(ESPHOME_DOMAIN, action):
            raise RbgridError(f"Action esphome.{action} is not registered (device offline or wrong firmware)")
        try:
            response = await self.hass.services.async_call(
                ESPHOME_DOMAIN,
                action,
                {"command": json.dumps(command, separators=(",", ":"), ensure_ascii=False)},
                blocking=True,
                return_response=True,
            )
        except HomeAssistantError as err:
            msg = str(err)
            if m := _ESPHOME_ERR.match(msg):
                msg = m.group("msg")
            raise RbgridError(msg) from err
        if not isinstance(response, dict):
            raise RbgridError(f"Unexpected response type {type(response).__name__}")
        return response

    async def async_call(self, command: Mapping[str, Any]) -> RbgridReply:
        """Run a command; reassemble parts; return the normalised reply.

        ``[code=STARTING]`` (firmware e524fd7+: the core is not up yet, typically the first seconds after an
        OTA) is not an error for the caller — the command is repeated a few times, a few seconds apart.
        """
        last: RbgridError | None = None
        for attempt in range(6):
            try:
                return await self._async_call_once(command)
            except RbgridError as err:
                if "[code=STARTING]" not in str(err) or attempt == 5:
                    raise
                last = err
                _LOGGER.debug("RBgrid %s: hub starting, retry %d: %s", self.name, attempt + 1, err)
                await asyncio.sleep(2.5)
        raise last or RbgridError("hub is starting")  # pragma: no cover

    async def _async_call_once(self, command: Mapping[str, Any]) -> RbgridReply:
        cmd = command.get("cmd")
        section = command.get("section")
        # A node removal/disable also takes points (and their slots) away, like a unit delete
        data = command.get("data") if isinstance(command.get("data"), Mapping) else {}
        frees_slots = (cmd == "unit" and command.get("op") == "delete") or (
            cmd == "set" and section == "espnow" and data.get("action") in ("remove", "disable")
        )
        bound_before = self._bound_slots() if frees_slots else set()
        cache_key = None
        if cmd == "get" and section in _CACHEABLE and len(command) == 2:
            cache_key = str(section)
            if (item := self._cache.get(cache_key)) and time.monotonic() - item.at < GET_CACHE_TTL:
                return item.reply
        async with self._lock:
            if cache_key and (item := self._cache.get(cache_key)) and time.monotonic() - item.at < GET_CACHE_TTL:
                return item.reply  # a parallel caller filled the cache while we waited for the lock
            started = time.monotonic()
            first = await self._raw(command)
            if "parts" in first:
                try:
                    rid = first["rid"]
                    parts = int(first["parts"])
                    if not 1 <= parts <= 64:
                        raise RbgridError(f"Unreasonable part count {parts}")
                    buf = bytearray(base64.b64decode(first.get("b64", ""), validate=True))
                    for i in range(1, parts):
                        nxt = await self._raw({"cmd": "part", "rid": rid, "part": i})
                        buf += base64.b64decode(nxt.get("b64", ""), validate=True)
                    data = json.loads(buf.decode())
                except RbgridError:
                    raise
                except (KeyError, TypeError, ValueError, binascii.Error) as err:
                    raise RbgridError(f"Malformed multi-part reply: {err}") from err
                reply = RbgridReply(
                    ok=bool(first.get("ok", True)),
                    data=data,
                    type=first.get("type") or (data.get("type") if isinstance(data, dict) else None),
                    schema=first.get("schema"),
                    config_version=first.get("config_version"),
                    parts=parts,
                    elapsed_ms=(time.monotonic() - started) * 1000,
                )
            else:
                reply = RbgridReply(
                    ok=bool(first.get("ok", True)),
                    data=first.get("data", first),
                    type=first.get("type"),
                    schema=first.get("schema"),
                    config_version=first.get("config_version"),
                    parts=1,
                    elapsed_ms=(time.monotonic() - started) * 1000,
                )
        # A rejection the device returns as a body instead of an action error: ok:false, or a point operation
        # with an HTTP-style code >= 400 in data.code. Surface it the same way as a thrown action error, with the
        # device's code in front so the panel can switch on it.
        body = reply.data if isinstance(reply.data, dict) else {}
        inner = body.get("reply") if isinstance(body.get("reply"), dict) else body
        http_code = body.get("code") if isinstance(body.get("code"), int) else None
        if not reply.ok or (http_code is not None and http_code >= 400) or inner.get("status") == "error":
            msg = inner.get("message") or inner.get("error") or body.get("message") or body.get("error") or f"device replied {http_code or 'error'}"
            code = inner.get("code") if isinstance(inner.get("code"), str) else None
            raise RbgridError(f"[code={code}] {msg}" if code else str(msg))
        if cmd == "unit" or (cmd == "set" and section == "espnow"):
            # A point took or left a slot (point commands; a node pairing/removal creates or removes its points): bring the
            # slot's entities in line after the device published the slot names. Only slots that held a point before a
            # delete/removal are disabled, never slots the user keeps on.
            self._schedule_slot_sync(3.0, disable_slots=bound_before)
        if reply.config_version:
            if self.last_config_version not in (None, reply.config_version):
                self._cache.clear()
            self.last_config_version = reply.config_version
        if cmd in _CHANGING:
            self._cache.clear()
        elif cache_key:
            self._cache[cache_key] = _CacheItem(time.monotonic(), reply)
        return reply

    async def async_get(self, section: str, **extra: Any) -> Any:
        """``{"cmd":"get","section":S, ...}`` → the bare device reply."""
        return (await self.async_call({"cmd": "get", "section": section, **extra})).data

    async def async_series(
        self,
        unit: str,
        period: str = "hour",
        *,
        ts_from: int | None = None,
        ts_to: int | None = None,
        limit: int = 168,
    ) -> dict[str, Any]:
        """Chart series for a unit: ``{"cols":[...],"rows":[...]}`` newest first."""
        cmd: dict[str, Any] = {"cmd": "series", "unit": unit, "period": period, "limit": limit}
        if ts_from is not None:
            cmd["from"] = ts_from
        if ts_to is not None:
            cmd["to"] = ts_to
        return (await self.async_call(cmd)).data

    @callback
    def async_invalidate(self) -> None:
        """Drop the read cache (e.g. on a Config version change)."""
        self._cache.clear()

    # ------------------------------------------------------------------ entities
    @callback
    def entity_map(self) -> dict[str, Any]:
        """Entities of the hub and its point sub-devices, addressed by unique_id parts.

        Returns ``{"hub": {"Grid power": {...}, ...}, "slots": {"1": {"Power": {...}, ...}}}``
        where every value is ``{"entity_id", "unique_id", "device_id", "domain"}``.
        The frontend must never rely on entity ids (they are frozen at first
        adoption and differ between installs); this map is the indirection.
        """
        dev_reg = dr.async_get(self.hass)
        ent_reg = er.async_get(self.hass)
        hub: dict[str, Any] = {}
        slots: dict[str, dict[str, Any]] = {}
        devices: dict[str, str | None] = {self.device_id: None}
        for device in dr.async_entries_for_config_entry(dev_reg, self.esphome_entry_id):
            if device.via_device_id == self.device_id:
                m = _POINT_DEVICE.search(device.name or "")
                devices[device.id] = m.group("slot") if m else device.name or device.id
        for device_id, slot in devices.items():
            for ent in er.async_entries_for_device(ent_reg, device_id, include_disabled_entities=True):
                key = ent.original_name or ent.unique_id.rsplit("/", 1)[-1]
                item = {
                    "entity_id": ent.entity_id,
                    "unique_id": ent.unique_id,
                    "device_id": device_id,
                    "domain": ent.domain,
                    "disabled": ent.disabled_by is not None,
                }
                if slot is None:
                    hub[key] = item
                else:
                    slots.setdefault(str(slot), {})[key] = item
        dev = dev_reg.async_get(self.device_id)
        return {
            "hub": hub,
            "slots": slots,
            "device": {
                "name": dev.name if dev else self.name,
                "name_by_user": dev.name_by_user if dev else None,
                "sw_version": dev.sw_version if dev else None,
                "area_id": dev.area_id if dev else None,
            },
        }

    # ------------------------------------------------------------------ events
    @callback
    def _on_event(self, event: Event) -> None:
        data = event.data
        if data.get("device_id") != self.device_id:
            return
        # Firmware 0fd3f8e+ sends the event-log sequence with every live event (a string); it is the replay cursor.
        seq: int | None = None
        try:
            seq = int(data["seq"]) if data.get("seq") not in (None, "") else None
        except (TypeError, ValueError):
            seq = None
        item = RbgridEvent(
            time_fired=event.time_fired.isoformat(),
            kind=str(data.get("kind", "event")),
            level=str(data.get("level", "event")),
            message=str(data.get("message", "")),
            seq=seq,
        )
        if seq is not None and (self.last_seq is None or seq > self.last_seq):
            self.last_seq = seq
        self.events.append(item)
        self._note_firmware(item.message)
        if item.kind in ("boot", "firmware", "tariff"):
            self._cache.clear()
        async_dispatcher_send(self.hass, SIGNAL_EVENT.format(self.entry.entry_id), item)

    # ------------------------------------------------------------------ event-log replay
    _KIND_RULES = (
        ("fw:", "firmware"),
        ("boot:", "boot"),
        ("evlog:", "boot"),
        ("tariff", "tariff"),
        ("reverse", "reverse_flow"),
        ("bus stuck", "bus_stuck"),
        ("poll fail", "module_poll_fail"),
        ("module", "module_absent"),
        (" offline", "node_offline"),
        (" online", "node_online"),
        ("node disabled", "node_disabled"),
        ("QTR ", "diag"),
        ("gap", "diag"),
        ("anchor=", "diag"),
    )

    @classmethod
    def _kind_of(cls, msg: str, lvl: str) -> str:
        if lvl == "fail" or msg.startswith("FAIL"):
            return "fail"
        if lvl == "debug":
            return "diag"
        low = msg.lower()
        for needle, kind in cls._KIND_RULES:
            if needle.lower() in low:
                if kind == "module_absent" and ("restored" in low or "back" in low):
                    return "module_restored"
                return kind
        return "event"

    def _note_firmware(self, msg: str) -> None:
        """Pick image/partition/boot facts out of boot-time log lines."""
        if msg.startswith("fw: image "):
            m = re.match(r"fw: image (?P<img>\S+) \(md5 (?P<md5>[0-9a-f]+)\) on '(?P<part>[^']+)'", msg)
            if m:
                prev = dict(self.firmware)
                self.firmware.update({"image": m["img"], "md5": m["md5"], "partition": m["part"]})
                if prev.get("image") == m["img"] and prev.get("partition") and prev["partition"] != m["part"]:
                    self.firmware["rolled_back"] = True
        elif msg.startswith("boot: "):
            m = re.match(r"boot: reset=(?P<reset>.+?) uptime_before=(?P<up>\S+)", msg)
            if m:
                self.firmware.update({"reset": m["reset"], "uptime_before": m["up"]})
        elif msg.startswith("evlog: boot "):
            m = re.match(r"evlog: boot (?P<boot>\d+)", msg)
            if m:
                self.firmware["boot"] = int(m["boot"])

    def _seen_live(self, msg: str, when: str) -> bool:
        """True when the same line already arrived live (live events carry no seq, so match on text + time)."""
        try:
            t0 = datetime.fromisoformat(when)
        except ValueError:
            return False
        for ev in reversed(self.events):
            if ev.replay or ev.message != msg:
                continue
            try:
                if abs((datetime.fromisoformat(ev.time_fired) - t0).total_seconds()) <= 5:
                    return True
            except ValueError:
                continue
        return False

    async def async_replay_events(self, *, max_pages: int = 20) -> int:
        """Read event-log lines missed while disconnected (`get events since=last_seq`). Returns lines added."""
        added = 0
        since = self.last_seq
        for _ in range(max_pages):
            cmd: dict[str, Any] = {"cmd": "get", "section": "events", "level": "all", "limit": 50}
            if since is not None:
                cmd["since"] = since  # device returns seq > since; `next` of a page is the next since
            try:
                reply = await self.async_call(cmd)
            except RbgridError as err:
                _LOGGER.debug("RBgrid %s: event replay failed: %s", self.name, err)
                break
            data = reply.data if isinstance(reply.data, dict) else {}
            lines = data.get("lines") or []
            for line in lines:
                seq = line.get("seq")
                if seq is not None and self.last_seq is not None and seq <= self.last_seq:
                    continue
                if not isinstance(line, dict):
                    continue
                msg = str(line.get("msg", ""))
                lvl = str(line.get("lvl", "event"))
                ts = line.get("ts")
                try:
                    when = datetime.fromtimestamp(int(ts), tz=UTC).isoformat() if ts else datetime.now(tz=UTC).isoformat()
                except (TypeError, ValueError, OSError):
                    when = datetime.now(tz=UTC).isoformat()
                if seq is not None:
                    self.last_seq = seq
                if self._seen_live(msg, when):
                    continue
                item = RbgridEvent(time_fired=when, kind=self._kind_of(msg, lvl), level=lvl, message=msg, seq=seq, replay=True)
                self._note_firmware(msg)
                self.events.append(item)
                added += 1
                async_dispatcher_send(self.hass, SIGNAL_EVENT.format(self.entry.entry_id), item)
            if not data.get("more") or not lines:
                break
            since = data.get("next", self.last_seq)
        return added

    @callback
    def _schedule_replay(self, delay: float = 5.0) -> None:
        if self._replay_task:
            self._replay_task()

        @callback
        def _run(_now: Any) -> None:
            self._replay_task = None
            self.entry.async_create_background_task(self.hass, self._replay_guarded(), f"rbgrid {self.name} event replay")

        self._replay_task = async_call_later(self.hass, delay, _run)

    async def _replay_guarded(self) -> None:
        try:
            await self.async_replay_events()
        except Exception:  # noqa: BLE001 — a malformed device reply must not become "task exception was never retrieved"
            _LOGGER.debug("RBgrid %s: event replay failed", self.name, exc_info=True)
        self._schedule_slot_sync(5.0)

    # ------------------------------------------------------------------ point slots
    # The ready-made ESPHome configs create every slot entity disabled (`slots_disabled_by_default`), so a
    # fresh hub does not show 12 x 7 unknown sensors. The slot's ``Name`` text sensor is the integration's
    # probe: it is kept enabled on every slot; a non-empty name means a point holds the slot, and then the
    # slot's other entities (and its sub-device) are enabled. A deleted point disables them again. Entities
    # the user disabled or enabled by hand are never touched (only ``disabled_by`` None / INTEGRATION).

    def _bound_slots(self) -> set[str]:
        """Slots whose Name probe currently reports a point."""
        out: set[str] = set()
        for slot, ents in self.entity_map()["slots"].items():
            name_ent = ents.get("Name")
            state = self.hass.states.get(name_ent["entity_id"]) if name_ent else None
            if state and state.state not in ("", "unknown", "unavailable"):
                out.add(slot)
        return out

    def _schedule_slot_sync(self, delay: float, *, disable_slots: set[str] | None = None) -> None:
        async def _later() -> None:
            await asyncio.sleep(delay)
            try:
                await self.async_sync_slots(disable_slots=disable_slots or set())
            except Exception:  # noqa: BLE001
                _LOGGER.debug("RBgrid %s: slot sync failed", self.name, exc_info=True)

        self.entry.async_create_background_task(self.hass, _later(), f"rbgrid slot sync {self.name}")

    async def async_sync_slots(self, *, disable_slots: set[str] | None = None) -> dict[str, int]:
        """Enable the entities of slots that hold a point; disable those of ``disable_slots`` that are free now."""
        disable_slots = disable_slots or set()
        ent_reg = er.async_get(self.hass)
        dev_reg = dr.async_get(self.hass)
        slots = self.entity_map()["slots"]
        counts = {"enabled": 0, "disabled": 0, "probes": 0}
        for slot, ents in slots.items():
            name_ent = ents.get("Name")
            if name_ent is None:
                continue
            if name_ent["disabled"]:
                # The probe itself is off (fresh hub): switch it on; HA reloads the ESPHome entry shortly after,
                # and the next sync (reconnect) classifies the slot.
                entry = ent_reg.async_get(name_ent["entity_id"])
                if entry and entry.disabled_by in (None, er.RegistryEntryDisabler.INTEGRATION):
                    ent_reg.async_update_entity(name_ent["entity_id"], disabled_by=None)
                    counts["probes"] += 1
                continue
            state = self.hass.states.get(name_ent["entity_id"])
            bound = bool(state and state.state not in ("", "unknown", "unavailable"))
            for key, item in ents.items():
                if key == "Name":
                    continue
                entry = ent_reg.async_get(item["entity_id"])
                if entry is None or entry.disabled_by not in (None, er.RegistryEntryDisabler.INTEGRATION):
                    continue
                if bound and entry.disabled_by is not None:
                    ent_reg.async_update_entity(item["entity_id"], disabled_by=None)
                    counts["enabled"] += 1
                elif slot in disable_slots and not bound and entry.disabled_by is None:
                    ent_reg.async_update_entity(item["entity_id"], disabled_by=er.RegistryEntryDisabler.INTEGRATION)
                    counts["disabled"] += 1
            if bound:
                device = dev_reg.async_get(name_ent["device_id"])
                if device and device.disabled_by == dr.DeviceEntryDisabler.INTEGRATION:
                    dev_reg.async_update_device(device.id, disabled_by=None)
        if counts["enabled"] or counts["disabled"] or counts["probes"]:
            _LOGGER.info("RBgrid %s: point slots synced (%s)", self.name, counts)
        if counts["probes"]:
            self._schedule_slot_sync(45.0)
        return counts

    @callback
    def _on_hub_state(self, event: Event) -> None:
        old, new = event.data.get("old_state"), event.data.get("new_state")
        if new is None:
            return
        if (old is None or old.state == "unavailable") and new.state != "unavailable":
            self._cache.clear()
            self._schedule_replay()

    async def async_start(self) -> None:
        """Subscribe to device events; replay the device log after every (re)connect."""
        self._unsubs.append(self.hass.bus.async_listen(EVENT_TYPE, self._on_event))
        probe = self.entity_map()["hub"].get("Grid power")
        if probe:
            self._unsubs.append(async_track_state_change_event(self.hass, [probe["entity_id"]], self._on_hub_state))
        if self.action_registered:
            self._schedule_replay(2.0)
        self._schedule_slot_sync(8.0)

    async def async_stop(self) -> None:
        """Release listeners."""
        for unsub in self._unsubs:
            unsub()
        self._unsubs.clear()
        if self._replay_task:
            self._replay_task()
            self._replay_task = None
