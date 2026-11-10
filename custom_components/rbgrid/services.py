"""Services: rbgrid.set_prices, rbgrid.clear_prices, rbgrid.command, rbgrid.import_statistics."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse, callback
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv

from .const import DOMAIN
from .hub import RbgridError, RbgridHub

ATTR_ENTRY = "config_entry_id"
ATTR_PRICES = "prices"
ATTR_BUY = "buy"
ATTR_SELL = "sell"
ATTR_FROM = "from"
ATTR_UNTIL = "until"
ATTR_COMMAND = "command"

def _until_after_from(entry: dict) -> dict:
    if entry[ATTR_UNTIL] <= entry[ATTR_FROM]:
        raise vol.Invalid("until must be after from")
    return entry


_PRICE_ENTRY_FIELDS = vol.Schema(
    {
        vol.Required(ATTR_BUY): vol.Coerce(float),
        vol.Optional(ATTR_SELL): vol.Coerce(float),
        vol.Required(ATTR_FROM): vol.Coerce(int),
        vol.Required(ATTR_UNTIL): vol.Coerce(int),
    }
)

_PRICE_ENTRY = vol.All(_PRICE_ENTRY_FIELDS, _until_after_from)

SET_PRICES_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_ENTRY): cv.string,
        vol.Optional(ATTR_PRICES): vol.All(cv.ensure_list, [_PRICE_ENTRY], vol.Length(min=1, max=192)),
        vol.Optional(ATTR_BUY): vol.Coerce(float),
        vol.Optional(ATTR_SELL): vol.Coerce(float),
        vol.Optional(ATTR_FROM): vol.Coerce(int),
        vol.Optional(ATTR_UNTIL): vol.Coerce(int),
    }
)
ENTRY_ONLY_SCHEMA = vol.Schema({vol.Optional(ATTR_ENTRY): cv.string})
COMMAND_SCHEMA = vol.Schema({vol.Optional(ATTR_ENTRY): cv.string, vol.Required(ATTR_COMMAND): dict})


def _hub(hass: HomeAssistant, call: ServiceCall) -> RbgridHub:
    entries = [e for e in hass.config_entries.async_entries(DOMAIN) if isinstance(getattr(e, "runtime_data", None), RbgridHub)]
    entry_id = call.data.get(ATTR_ENTRY)
    if entry_id:
        entries = [e for e in entries if e.entry_id == entry_id]
    if not entries:
        raise ServiceValidationError("No RBgrid hub matches this call")
    if len(entries) > 1:
        raise ServiceValidationError("Several RBgrid hubs are configured: pass config_entry_id")
    return entries[0].runtime_data


@callback
def async_register(hass: HomeAssistant) -> None:
    """Register the services once."""
    if hass.services.has_service(DOMAIN, "set_prices"):
        return

    async def set_prices(call: ServiceCall) -> ServiceResponse:
        hub = _hub(hass, call)
        if ATTR_PRICES in call.data:
            data: dict[str, Any] = {"prices": call.data[ATTR_PRICES]}
        elif ATTR_BUY in call.data and ATTR_FROM in call.data and ATTR_UNTIL in call.data:
            data = {k: call.data[k] for k in (ATTR_BUY, ATTR_SELL, ATTR_FROM, ATTR_UNTIL) if k in call.data}
        else:
            raise ServiceValidationError("Give either prices[] or buy/from/until")
        try:
            reply = await hub.async_call({"cmd": "set", "section": "price", "data": data})
        except RbgridError as err:
            raise HomeAssistantError(f"RBgrid: {err}") from err
        return {"ok": reply.ok, "config_version": reply.config_version, "reply": reply.data}

    async def clear_prices(call: ServiceCall) -> ServiceResponse:
        hub = _hub(hass, call)
        try:
            reply = await hub.async_call({"cmd": "set", "section": "price", "data": {"clear": True}})
        except RbgridError as err:
            raise HomeAssistantError(f"RBgrid: {err}") from err
        return {"ok": reply.ok, "reply": reply.data}

    async def command(call: ServiceCall) -> ServiceResponse:
        hub = _hub(hass, call)
        try:
            reply = await hub.async_call(call.data[ATTR_COMMAND])
        except RbgridError as err:
            raise HomeAssistantError(f"RBgrid: {err}") from err
        return reply.as_dict()

    async def import_statistics(call: ServiceCall) -> ServiceResponse:
        from .history_import import async_import_hub  # noqa: PLC0415

        hub = _hub(hass, call)
        try:
            return await async_import_hub(hass, hub)
        except RbgridError as err:
            raise HomeAssistantError(f"RBgrid: {err}") from err

    hass.services.async_register(DOMAIN, "set_prices", set_prices, SET_PRICES_SCHEMA, supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(DOMAIN, "clear_prices", clear_prices, ENTRY_ONLY_SCHEMA, supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(DOMAIN, "command", command, COMMAND_SCHEMA, supports_response=SupportsResponse.OPTIONAL)
    hass.services.async_register(DOMAIN, "import_statistics", import_statistics, ENTRY_ONLY_SCHEMA, supports_response=SupportsResponse.OPTIONAL)
