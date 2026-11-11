"""Price rank of the current period as a sensor."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import RbgridConfigEntry
from .entity import RbgridSignalEntity
from .signal import RbgridSignalCoordinator


class RbgridRank(RbgridSignalEntity, SensorEntity):
    """Rank of the current buy price among today's periods (1 = cheapest)."""

    _attr_name = "Price rank today"
    _attr_icon = "mdi:podium"

    def __init__(self, coordinator: RbgridSignalCoordinator) -> None:
        super().__init__(coordinator, "rank_buy")

    @property
    def native_value(self) -> int | None:
        v = (self.coordinator.data or {}).get("rank_buy")
        return int(v) if isinstance(v, (int, float)) and v > 0 else None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        d = self.coordinator.data or {}
        return {"periods_today": d.get("periods_today"), "rank_sell": d.get("rank_sell"), "provenance": d.get("provenance"), "price_state": d.get("price_state")}


async def async_setup_entry(hass: HomeAssistant, entry: RbgridConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    coordinator: RbgridSignalCoordinator = entry.runtime_data.signal
    added = False

    @callback
    def _sync() -> None:
        nonlocal added
        if coordinator.data and not added:
            added = True
            async_add_entities([RbgridRank(coordinator)])

    entry.async_on_unload(coordinator.async_add_listener(_sync))
    _sync()
