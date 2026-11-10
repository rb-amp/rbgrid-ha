"""WebSocket commands used by the RBgrid panel.

    rbgrid/hubs                       → [hub.info()]
    rbgrid/call   {entry_id, command} → RbgridReply.as_dict()   (admin)
    rbgrid/entities {entry_id}        → hub.entity_map()
    rbgrid/events {entry_id}          → [event]
    rbgrid/subscribe_events {entry_id}→ stream of events (subscription)
    rbgrid/import_statistics {entry_id} → import result        (admin)
"""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import DOMAIN, SIGNAL_EVENT
from .hub import RbgridError, RbgridEvent, RbgridHub


def _hubs(hass: HomeAssistant) -> dict[str, RbgridHub]:
    return {
        entry.entry_id: entry.runtime_data
        for entry in hass.config_entries.async_entries(DOMAIN)
        if isinstance(getattr(entry, "runtime_data", None), RbgridHub)
    }


def _hub(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> RbgridHub | None:
    hub = _hubs(hass).get(msg["entry_id"])
    if hub is None:
        connection.send_error(msg["id"], websocket_api.ERR_NOT_FOUND, "Unknown RBgrid hub entry")
    return hub


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register all commands (once per HA run)."""
    websocket_api.async_register_command(hass, ws_hubs)
    websocket_api.async_register_command(hass, ws_call)
    websocket_api.async_register_command(hass, ws_entities)
    websocket_api.async_register_command(hass, ws_events)
    websocket_api.async_register_command(hass, ws_subscribe_events)
    websocket_api.async_register_command(hass, ws_import_statistics)


@websocket_api.websocket_command({vol.Required("type"): "rbgrid/hubs"})
@callback
def ws_hubs(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """List configured hubs."""
    connection.send_result(msg["id"], [hub.info() for hub in _hubs(hass).values()])


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "rbgrid/call",
        vol.Required("entry_id"): str,
        vol.Required("command"): dict,
    }
)
@websocket_api.async_response
async def ws_call(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Run one rbgrid_cmd command (parts reassembled)."""
    if (hub := _hub(hass, connection, msg)) is None:
        return
    try:
        reply = await hub.async_call(msg["command"])
    except RbgridError as err:
        connection.send_error(msg["id"], "device_error", str(err))
        return
    connection.send_result(msg["id"], reply.as_dict())


@websocket_api.websocket_command({vol.Required("type"): "rbgrid/entities", vol.Required("entry_id"): str})
@callback
def ws_entities(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Entity map by unique-id name parts."""
    if (hub := _hub(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], hub.entity_map())


@websocket_api.websocket_command({vol.Required("type"): "rbgrid/events", vol.Required("entry_id"): str})
@callback
def ws_events(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Buffered device events, oldest first."""
    if (hub := _hub(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], [e.as_dict() for e in hub.events])


@websocket_api.websocket_command({vol.Required("type"): "rbgrid/subscribe_events", vol.Required("entry_id"): str})
@callback
def ws_subscribe_events(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Stream device events as they arrive."""
    if (hub := _hub(hass, connection, msg)) is None:
        return

    @callback
    def _forward(event: RbgridEvent) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], event.as_dict()))

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_EVENT.format(hub.entry.entry_id), _forward)
    connection.send_result(msg["id"])


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "rbgrid/import_statistics", vol.Required("entry_id"): str})
@websocket_api.async_response
async def ws_import_statistics(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Import device history into long-term statistics now."""
    if (hub := _hub(hass, connection, msg)) is None:
        return
    from .history_import import async_import_hub  # noqa: PLC0415 — keep recorder import lazy

    try:
        result = await async_import_hub(hass, hub)
    except RbgridError as err:
        connection.send_error(msg["id"], "device_error", str(err))
        return
    connection.send_result(msg["id"], result)
