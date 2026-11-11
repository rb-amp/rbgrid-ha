"""Cheap-window signal of a hub as Home Assistant entities.

The hub computes the windows (``get signal``: ``windows[]`` with ``active`` / ``active_until`` /
``next_start`` per rule, plus ``buy_cheap``, ``sell_low``, ``rank_buy``) and switches nothing itself.
This coordinator polls that section every minute and right after every ``price`` event of the hub, so
an automation in Home Assistant is one state condition on a binary sensor — no templates.
"""

from __future__ import annotations

from datetime import timedelta
import logging
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import SIGNAL_EVENT
from .hub import RbgridError, RbgridHub

_LOGGER = logging.getLogger(__name__)
SCAN = timedelta(seconds=60)


class RbgridSignalCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """``get signal`` of one hub, refreshed every minute and on every price event."""

    def __init__(self, hass: HomeAssistant, hub: RbgridHub) -> None:
        super().__init__(hass, _LOGGER, name=f"RBgrid signal {hub.name}", update_interval=SCAN, config_entry=hub.entry)
        self.hub = hub
        self.supported: bool | None = None  # None until the hub answered once
        hub.entry.async_on_unload(async_dispatcher_connect(hass, SIGNAL_EVENT.format(hub.entry.entry_id), self._on_event))

    @callback
    def _on_event(self, item: Any) -> None:
        if getattr(item, "kind", None) in ("price", "tariff", "boot"):
            self.hass.async_create_task(self.async_request_refresh())

    async def _async_update_data(self) -> dict[str, Any]:
        if not self.hub.action_registered or not self.hub.available:
            raise UpdateFailed("hub offline")
        try:
            data = await self.hub.async_get("signal")
        except RbgridError as err:
            text = str(err)
            if "unknown section" in text:
                # Firmware without dynamic prices: nothing to show, and no point asking every minute
                self.supported = False
                self.update_interval = timedelta(minutes=30)
            raise UpdateFailed(text) from err
        while isinstance(data, dict) and isinstance(data.get("data"), dict) and "windows" not in data:
            data = data["data"]
        if not isinstance(data, dict) or "windows" not in data:
            raise UpdateFailed("signal reply without windows")
        self.supported = True
        self.update_interval = SCAN
        return data

    def windows(self) -> list[dict[str, Any]]:
        return list((self.data or {}).get("windows") or [])

    def window(self, rule_id: int) -> dict[str, Any] | None:
        return next((w for w in self.windows() if w.get("rule_id") == rule_id), None)
