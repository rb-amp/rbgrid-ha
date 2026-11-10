"""Import the hub's stored history into Home Assistant long-term statistics.

The device keeps per-period energy and money on flash (hour is the finest
period). ``{"cmd":"series"}`` returns rows ``[ts, dur, wh_in, wh_out, cost,
revenue, q]`` newest first, where ``ts`` is the END of the covered interval and
``dur`` its length in seconds. A reboot splits an hour into two rows; both land
in the same statistics hour here.

Statistic ids (external statistics, source ``rbgrid``):

    rbgrid:<mac>_<unit>_energy_in   Wh   sum
    rbgrid:<mac>_<unit>_energy_out  Wh   sum
    rbgrid:<mac>_<unit>_cost        <currency> sum
    rbgrid:<mac>_<unit>_revenue     <currency> sum

``state`` of a row is the value of that hour, ``sum`` the running total since
the first imported row. Re-importing the last hour (after a reboot added a
partial row) rewrites it in place: ``async_add_external_statistics`` updates
existing rows.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta
import logging
from typing import Any

from homeassistant.components.recorder import get_instance
from homeassistant.components.recorder.models import StatisticData, StatisticMeanType, StatisticMetaData
from homeassistant.components.recorder.statistics import async_add_external_statistics, get_last_statistics
from homeassistant.core import HomeAssistant
from homeassistant.util.unit_conversion import EnergyConverter

from .const import STAT_SOURCE
from .hub import RbgridHub

_LOGGER = logging.getLogger(__name__)

HOUR = 3600
SERIES_LIMIT = 720  # device cap

_KINDS: dict[str, tuple[str, str]] = {
    # key: (series column, label)
    "energy_in": ("wh_in", "Energy in"),
    "energy_out": ("wh_out", "Energy out"),
    "cost": ("cost", "Cost"),
    "revenue": ("revenue", "Export value"),
}


def stat_id(mac: str, unit: str, kind: str) -> str:
    """``rbgrid:021122334455_6a04_energy_in``."""
    # statistic ids must be lower-case [a-z0-9_]: the HEX4 unit key is lower-cased here
    return f"{STAT_SOURCE}:{mac.replace(':', '').lower()}_{unit.lower()}_{kind}"


def _hour_start(ts_end: int, dur: int) -> int:
    start = ts_end - dur
    return start - start % HOUR


def aggregate_hours(cols: list[str], rows: list[list[Any]]) -> dict[int, dict[str, float]]:
    """Sum series rows into whole hours keyed by hour start (unix)."""
    idx = {c: i for i, c in enumerate(cols)}
    out: dict[int, dict[str, float]] = defaultdict(lambda: {k: 0.0 for k in _KINDS})
    for row in rows:
        ts, dur = int(row[idx["ts"]]), int(row[idx["dur"]])
        if dur <= 0:
            continue
        bucket = out[_hour_start(ts, dur)]
        for kind, (col, _) in _KINDS.items():
            if col in idx and row[idx[col]] is not None:
                bucket[kind] += float(row[idx[col]])
    return dict(out)


async def _last_row(hass: HomeAssistant, statistic_id: str) -> dict[str, Any] | None:
    res = await get_instance(hass).async_add_executor_job(
        get_last_statistics, hass, 1, statistic_id, False, {"state", "sum"}
    )
    rows = res.get(statistic_id) or []
    return rows[0] if rows else None


def _unit_list(units_reply: Any) -> list[dict[str, Any]]:
    """``get units`` → [{"unit_id": "0100", "name": ...}] for points that keep history.

    The reply is ``{"type":"units_config", ..., "data": {"units": [...]}}`` with
    integer ``unit_id`` (256 = 0x0100); statistics and the series command use
    the HEX4 key.
    """
    items: Any = units_reply
    if isinstance(items, dict):
        inner = items.get("data")
        if isinstance(inner, dict) and "units" in inner:
            items = inner["units"]
        elif "units" in items:
            items = items["units"]
    out: list[dict[str, Any]] = []
    if not isinstance(items, list):
        return out
    for val in items:
        if not isinstance(val, dict) or val.get("unit_id") is None:
            continue
        if val.get("history") is False or val.get("is_active") is False:
            continue
        uid = val["unit_id"]
        key = f"{uid:04X}" if isinstance(uid, int) else str(uid).removeprefix("0x").upper()
        out.append({"unit_id": key, "name": str(val.get("name") or key)})
    return out


async def async_import_unit(
    hass: HomeAssistant, hub: RbgridHub, unit: str, unit_name: str, currency: str | None
) -> dict[str, int]:
    """Import one unit's hourly history. Returns rows imported per kind."""
    # Start from the hour of the last imported row (re-import it: a reboot may have split it)
    lasts = {kind: await _last_row(hass, stat_id(hub.mac, unit, kind)) for kind in _KINDS}
    oldest_last = min((row["start"] for row in lasts.values() if row), default=None)
    ts_from = int(oldest_last) + 1 if oldest_last is not None else None  # rows ending after that hour's start

    series = await hub.async_series(unit, "hour", ts_from=ts_from, limit=SERIES_LIMIT)
    cols, rows = series.get("cols") or [], series.get("rows") or []
    currency = currency or series.get("currency")
    if not rows:
        return {kind: 0 for kind in _KINDS}
    if not currency:
        # Money kinds need a known currency for their metadata; without one, import energy only this run
        _LOGGER.debug("RBgrid %s: currency unknown yet, importing energy only for unit %s", hub.name, unit)
    hours = aggregate_hours(cols, rows)

    imported: dict[str, int] = {}
    for kind, (_, label) in _KINDS.items():
        sid = stat_id(hub.mac, unit, kind)
        last = lasts[kind]
        # running sum before the first re-imported hour
        base = 0.0
        if last is not None:
            base = float(last.get("sum") or 0.0) - float(last.get("state") or 0.0)
            # drop hours older than the last imported one (cannot rewrite history we did not fetch)
            hours_k = {h: v for h, v in hours.items() if h >= int(last["start"])}
        else:
            hours_k = hours
        is_energy = kind.startswith("energy")
        if not hours_k or (not is_energy and not currency):
            imported[kind] = 0
            continue
        meta = StatisticMetaData(
            source=STAT_SOURCE,
            statistic_id=sid,
            name=f"{hub.name} {unit_name} {label}",
            unit_of_measurement="Wh" if is_energy else currency,
            unit_class=EnergyConverter.UNIT_CLASS if is_energy else None,
            has_sum=True,
            mean_type=StatisticMeanType.NONE,
        )
        stats: list[StatisticData] = []
        running = base
        for hour in sorted(hours_k):
            value = round(hours_k[hour][kind], 4)
            running += value
            stats.append(
                StatisticData(
                    start=datetime.fromtimestamp(hour, tz=UTC),
                    state=value,
                    sum=round(running, 6),
                )
            )
        async_add_external_statistics(hass, meta, stats)
        imported[kind] = len(stats)
    return imported


async def async_import_hub(hass: HomeAssistant, hub: RbgridHub) -> dict[str, Any]:
    """Import every unit of the hub. Returns {"units": {...}, "errors": [...]}."""
    units_reply = await hub.async_get("units")
    units = _unit_list(units_reply)
    tariff: Any = None
    currency: str | None = None
    try:
        tariff = await hub.async_get("tariff")
        if isinstance(tariff, dict):
            plans = (tariff.get("data") or {}).get("list") or []
            currency = (plans[0].get("currency_code") if plans else None) or tariff.get("currency")
    except Exception:  # noqa: BLE001 — currency is cosmetic, the series carries it too
        _LOGGER.debug("tariff not readable for currency", exc_info=True)
    result: dict[str, Any] = {"units": {}, "errors": []}
    for unit in units:
        try:
            result["units"][unit["unit_id"]] = await async_import_unit(hass, hub, unit["unit_id"], unit["name"], currency)
        except Exception as err:  # noqa: BLE001 — one bad unit must not stop the others
            _LOGGER.warning("RBgrid %s: statistics import of unit %s failed: %s", hub.name, unit["unit_id"], err)
            result["errors"].append({"unit": unit["unit_id"], "error": str(err)})
    result["at"] = datetime.now(tz=UTC).isoformat()
    return result
