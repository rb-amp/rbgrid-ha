"""Base class for the integration's own entities (attached to the hub's ESPHome device)."""

from __future__ import annotations

from homeassistant.helpers.device_registry import CONNECTION_NETWORK_MAC, DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .signal import RbgridSignalCoordinator


class RbgridSignalEntity(CoordinatorEntity[RbgridSignalCoordinator]):
    _attr_has_entity_name = True

    def __init__(self, coordinator: RbgridSignalCoordinator, key: str) -> None:
        super().__init__(coordinator)
        self._key = key
        self._attr_unique_id = f"{coordinator.hub.mac}_{key}"
        # The hub's own device (owned by the ESPHome entry): same MAC → same device page
        self._attr_device_info = DeviceInfo(connections={(CONNECTION_NETWORK_MAC, coordinator.hub.mac)})

    @property
    def available(self) -> bool:
        return super().available and bool(self.coordinator.data)
