"""Energy dashboard setup for a hub.

Fills the Energy dashboard with the hub's lifetime counters and its own money
sensors (the device applies the tariff plan, so cost and compensation come from
the device, not from an HA price entity):

    grid  stat_energy_from  Energy in   + stat_cost          Cost
          stat_energy_to    Energy out  + stat_compensation  Export value
    device_consumption: every point's Energy in (named after the point device)

Entities are looked up by unique_id (``<MAC>/<device_key>/sensor/<Name>``),
never by entity id.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from .const import ESPHOME_DOMAIN
from .hub import RbgridHub

_LOGGER = logging.getLogger(__name__)


def _hub_entity(ent_reg: er.EntityRegistry, mac: str, name: str) -> str | None:
    return ent_reg.async_get_entity_id("sensor", ESPHOME_DOMAIN, f"{mac.upper()}/0/sensor/{name}")


async def async_setup_energy(hass: HomeAssistant, hub: RbgridHub) -> dict[str, Any]:
    """Write Energy dashboard preferences for the hub. Returns what was written."""
    from homeassistant.components.energy.data import async_get_manager  # noqa: PLC0415

    ent_reg = er.async_get(hass)
    dev_reg = dr.async_get(hass)
    energy_in = _hub_entity(ent_reg, hub.mac, "Energy in")
    energy_out = _hub_entity(ent_reg, hub.mac, "Energy out")
    cost = _hub_entity(ent_reg, hub.mac, "Cost")
    export_value = _hub_entity(ent_reg, hub.mac, "Export value")
    if not energy_in:
        raise ValueError("hub 'Energy in' sensor not found in the entity registry")

    # HA 2026.x unified grid connection: one import/export pair per source (legacy flow_from/flow_to
    # lists are migrated on load but the Energy settings UI renders only the unified shape)
    grid: dict[str, Any] = {
        "type": "grid",
        "stat_energy_from": energy_in,
        "stat_energy_to": energy_out,
        "stat_cost": cost,
        "entity_energy_price": None,
        "number_energy_price": None,
        "stat_compensation": export_value if energy_out else None,
        "entity_energy_price_export": None,
        "number_energy_price_export": None,
        "cost_adjustment_day": 0,
    }

    # Individual devices: one per point sub-device that has an Energy in sensor — loads only. Supply points (the grid
    # input, split per phase or not) are the grid source already; renewable and storage points are not consumption.
    not_devices = {"MAIN_SUPPLY", "ALTERNATIVE_SUPPLY", "RENEWABLE_SOURCE", "STORAGE_SYSTEM"}
    roles: dict[str, str] = {}
    try:
        units = await hub.async_get("units")
        while isinstance(units, dict) and isinstance(units.get("data"), dict) and "units" not in units:
            units = units["data"]
        roles = {str(u.get("name")): str(u.get("role")) for u in (units.get("units") or []) if isinstance(u, dict)}
    except Exception:  # noqa: BLE001 — hub offline: fall back to "every named point", as before
        _LOGGER.debug("RBgrid %s: unit roles unavailable for the Energy setup", hub.name, exc_info=True)
    devices: list[dict[str, Any]] = []
    slot_stats: set[str] = set()  # every slot's Energy in sensor, bound or not: stale entries from an earlier setup go
    for device in dr.async_entries_for_config_entry(dev_reg, hub.esphome_entry_id):
        if device.via_device_id != hub.device_id:
            continue
        ents = er.async_entries_for_device(ent_reg, device.id)
        slot_stats.update(e.entity_id for e in ents if e.domain == "sensor" and e.unique_id.endswith("/sensor/Energy in"))
        # Only slots that hold a point: the slot's Name text sensor is non-empty
        name_ent = next((e for e in ents if e.unique_id.endswith("/text_sensor/Name")), None)
        name_state = hass.states.get(name_ent.entity_id) if name_ent else None
        if not name_state or name_state.state in ("", "unknown", "unavailable"):
            continue
        if roles.get(name_state.state) in not_devices:
            continue
        for ent in ents:
            if ent.domain == "sensor" and ent.unique_id.endswith("/sensor/Energy in"):
                devices.append(
                    {
                        "stat_consumption": ent.entity_id,
                        "name": f"{name_state.state} ({device.name_by_user or device.name})",
                    }
                )
    devices.sort(key=lambda d: d["name"] or "")

    manager = await async_get_manager(hass)
    current = dict(manager.data or {})
    # Replace only this hub's grid connection (matched by its import sensor); other grid sources (another hub, a
    # utility meter) and the user's order stay. HA allows several grid connections.
    sources = [s for s in current.get("energy_sources", []) if not (s.get("type") == "grid" and s.get("stat_energy_from") == grid["stat_energy_from"])]
    sources.append(grid)
    # Drop every earlier entry of this hub's slots (a slot whose point was deleted or the hub was reset keeps its
    # old name in the dashboard otherwise); other devices stay in the user's order.
    known = {d["stat_consumption"] for d in devices} | slot_stats
    others = [d for d in current.get("device_consumption", []) if d.get("stat_consumption") not in known]
    update = {"energy_sources": sources, "device_consumption": others + devices}
    await manager.async_update(update)  # type: ignore[arg-type]
    _LOGGER.info("RBgrid %s: Energy dashboard configured (%d points)", hub.name, len(devices))
    return update
