"""Cheap windows and price flags of a hub as binary sensors."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from homeassistant.components.binary_sensor import BinarySensorEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import RbgridConfigEntry
from .entity import RbgridSignalEntity
from .signal import RbgridSignalCoordinator

FLAGS = (("buy_cheap", "Price cheap", "mdi:cash-check"), ("sell_low", "Sell price low", "mdi:cash-minus"))


def _ts(value: Any) -> datetime | None:
    try:
        n = int(value or 0)
    except (TypeError, ValueError):
        return None
    return datetime.fromtimestamp(n, UTC) if n > 0 else None


class RbgridFlag(RbgridSignalEntity, BinarySensorEntity):
    def __init__(self, coordinator: RbgridSignalCoordinator, key: str, name: str, icon: str) -> None:
        super().__init__(coordinator, key)
        self._attr_name = name
        self._attr_icon = icon

    @property
    def is_on(self) -> bool | None:
        v = (self.coordinator.data or {}).get(self._key)
        return None if v is None else bool(v)


class RbgridWindow(RbgridSignalEntity, BinarySensorEntity):
    """One cheap-window rule of the hub: on while the window is active."""

    _attr_icon = "mdi:clock-check-outline"

    def __init__(self, coordinator: RbgridSignalCoordinator, rule_id: int) -> None:
        super().__init__(coordinator, f"window_{rule_id}")
        self.rule_id = rule_id
        self._attr_name = self._window_name()

    def _window_name(self) -> str:
        w = self.coordinator.window(self.rule_id) or {}
        return f"{w.get('name') or f'Rule {self.rule_id}'} window"

    @property
    def available(self) -> bool:
        return super().available and self.coordinator.window(self.rule_id) is not None

    @property
    def is_on(self) -> bool | None:
        w = self.coordinator.window(self.rule_id)
        return None if w is None else bool(w.get("active"))

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        w = self.coordinator.window(self.rule_id) or {}
        return {"rule_id": self.rule_id, "active_until": _ts(w.get("active_until")), "next_start": _ts(w.get("next_start"))}

    @callback
    def _handle_coordinator_update(self) -> None:
        self._attr_name = self._window_name()  # a renamed rule renames the entity
        super()._handle_coordinator_update()


async def async_setup_entry(hass: HomeAssistant, entry: RbgridConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    hub = entry.runtime_data
    coordinator: RbgridSignalCoordinator = hub.signal
    known: set[str] = set()

    @callback
    def _sync() -> None:
        """Create the flags on the first signal and a window entity per rule as rules appear."""
        if not coordinator.data:
            return
        new: list[BinarySensorEntity] = []
        if "flags" not in known:
            known.add("flags")
            new.extend(RbgridFlag(coordinator, key, name, icon) for key, name, icon in FLAGS)
        for w in coordinator.windows():
            rid = w.get("rule_id")
            if isinstance(rid, int) and f"window_{rid}" not in known:
                known.add(f"window_{rid}")
                new.append(RbgridWindow(coordinator, rid))
        if new:
            async_add_entities(new)

    entry.async_on_unload(coordinator.async_add_listener(_sync))
    _sync()
