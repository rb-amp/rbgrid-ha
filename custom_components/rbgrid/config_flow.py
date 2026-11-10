"""Config flow: a wizard that finds the RBgrid hub among the ESPHome devices.

Paths into the wizard:

* **Discovery.** The hub advertises ``_esphomelib._tcp.local.`` with
  ``project_name=rbgrid.*``; the ``zeroconf`` matcher in the manifest starts this
  flow and Home Assistant shows a "Discovered: RBgrid" card. One click
  "Configure" lands in :meth:`async_step_confirm`.
* **Manual.** Settings → Devices & services → Add integration → RBgrid lists
  the hubs already adopted by the ESPHome integration.

If the ESPHome integration has not adopted the device yet, the wizard waits
(``esphome_missing`` step with a retry button) instead of aborting, so the
discovery card stays until the device is in.

Last step options: configure the Energy dashboard with this hub (grid import /
export with cost and compensation from the hub's own money sensors).
"""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.helpers.service_info.zeroconf import ZeroconfServiceInfo
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.selector import (
    EntitySelector,
    EntitySelectorConfig,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)

from .const import (
    CONF_DEVICE_ID,
    CONF_ESPHOME_ENTRY_ID,
    CONF_MAC,
    CONF_NAME,
    DOMAIN,
    ESPHOME_DOMAIN,
    OPT_PRICE_ENTITY,
    OPT_PRICE_UNIT,
    OPT_SETUP_ENERGY,
    OPT_SYNC_CURRENCY,
)

_LOGGER = logging.getLogger(__name__)
MANUFACTURER = "rbgrid"


def _format_mac(raw: str) -> str:
    """``021122334455`` / ``02:11:22:33:44:55`` → ``02:11:22:33:44:55``."""
    return dr.format_mac(raw)


@callback
def async_find_hubs(hass: HomeAssistant) -> list[dict[str, str]]:
    """ESPHome devices made by rbgrid that are hubs (no via_device)."""
    dev_reg = dr.async_get(hass)
    hubs: list[dict[str, str]] = []
    for esphome_entry in hass.config_entries.async_entries(ESPHOME_DOMAIN):
        for device in dr.async_entries_for_config_entry(dev_reg, esphome_entry.entry_id):
            if (device.manufacturer or "").lower() != MANUFACTURER or device.via_device_id:
                continue
            mac = next((addr for kind, addr in device.connections if kind == dr.CONNECTION_NETWORK_MAC), None)
            if not mac:
                continue
            hubs.append(
                {
                    CONF_DEVICE_ID: device.id,
                    CONF_MAC: _format_mac(mac),
                    CONF_ESPHOME_ENTRY_ID: esphome_entry.entry_id,
                    CONF_NAME: device.name_by_user or device.name or "RBgrid Hub",
                    "model": device.model or "",
                    "sw": device.sw_version or "",
                }
            )
    return hubs


class RbgridConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the wizard."""

    VERSION = 1

    def __init__(self) -> None:
        self._hub: dict[str, str] | None = None
        self._discovered_name: str | None = None

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> RbgridOptionsFlow:
        """Options: external price entity, Energy re-setup."""
        return RbgridOptionsFlow()

    # ------------------------------------------------------------------ discovery
    async def async_step_zeroconf(self, discovery_info: ZeroconfServiceInfo) -> ConfigFlowResult:
        """An ESPHome device with project rbgrid.* appeared on the network."""
        props = discovery_info.properties
        mac_raw = props.get("mac")
        if not mac_raw:
            return self.async_abort(reason="no_mac")
        mac = _format_mac(mac_raw)
        await self.async_set_unique_id(mac)
        self._abort_if_unique_id_configured()
        self._discovered_name = props.get("friendly_name") or discovery_info.hostname.removesuffix(".local.")
        self.context["title_placeholders"] = {"name": self._discovered_name}
        return await self.async_step_confirm()

    async def async_step_confirm(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Discovered hub: wait for its ESPHome entry, then finish."""
        hub = next((h for h in async_find_hubs(self.hass) if h[CONF_MAC] == self.unique_id), None)
        if hub is None:
            return await self.async_step_esphome_missing()
        self._hub = hub
        return await self.async_step_options()

    async def async_step_esphome_missing(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """The ESPHome integration has not adopted the device yet; retry on submit."""
        if user_input is not None:
            return await self.async_step_confirm()
        return self.async_show_form(
            step_id="esphome_missing",
            description_placeholders={"name": self._discovered_name or self.unique_id or ""},
        )

    # ------------------------------------------------------------------ manual
    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Let the user pick a hub."""
        hubs = {h[CONF_MAC]: h for h in async_find_hubs(self.hass)}
        configured = {e.unique_id for e in self._async_current_entries()}
        candidates = {mac: h for mac, h in hubs.items() if mac not in configured}
        if not candidates:
            return self.async_abort(reason="no_hubs" if not hubs else "all_configured")

        if user_input is not None:
            hub = candidates.get(user_input[CONF_MAC])
            if hub is None:
                return self.async_abort(reason="no_hubs")
            await self.async_set_unique_id(hub[CONF_MAC])
            self._abort_if_unique_id_configured()
            self._hub = hub
            return await self.async_step_options()

        if len(candidates) == 1:
            # One hub: no need to ask which
            mac, hub = next(iter(candidates.items()))
            await self.async_set_unique_id(mac)
            self._abort_if_unique_id_configured()
            self._hub = hub
            return await self.async_step_options()

        options = [
            SelectOptionDict(value=mac, label=f"{h[CONF_NAME]} ({h['model']} {h['sw']}, {mac})".replace("( ", "("))
            for mac, h in candidates.items()
        ]
        schema = vol.Schema(
            {
                vol.Required(CONF_MAC, default=options[0]["value"]): SelectSelector(
                    SelectSelectorConfig(options=options, mode=SelectSelectorMode.LIST)
                )
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema)

    # ------------------------------------------------------------------ finish
    async def async_step_options(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Last step: what to set up automatically."""
        assert self._hub is not None
        if user_input is not None:
            return self.async_create_entry(
                title=self._hub[CONF_NAME],
                description_placeholders={"name": self._hub[CONF_NAME]},
                data={
                    CONF_DEVICE_ID: self._hub[CONF_DEVICE_ID],
                    CONF_MAC: self._hub[CONF_MAC],
                    CONF_ESPHOME_ENTRY_ID: self._hub[CONF_ESPHOME_ENTRY_ID],
                    CONF_NAME: self._hub[CONF_NAME],
                },
                options={
                    OPT_SETUP_ENERGY: bool(user_input.get(OPT_SETUP_ENERGY, False)),
                    OPT_SYNC_CURRENCY: bool(user_input.get(OPT_SYNC_CURRENCY, True)),
                },
            )
        energy_empty = await _async_energy_is_empty(self.hass)
        schema = vol.Schema(
            {
                vol.Optional(OPT_SETUP_ENERGY, default=energy_empty): bool,
                vol.Optional(OPT_SYNC_CURRENCY, default=True): bool,
            }
        )
        return self.async_show_form(
            step_id="options",
            data_schema=schema,
            description_placeholders={
                "name": self._hub[CONF_NAME],
                "model": self._hub["model"],
                "sw": self._hub["sw"],
                "currency": self.hass.config.currency,
            },
        )


async def _async_energy_is_empty(hass: HomeAssistant) -> bool:
    """True when the Energy dashboard has no sources yet (so we default to configuring it)."""
    try:
        from homeassistant.components.energy.data import async_get_manager  # noqa: PLC0415

        manager = await async_get_manager(hass)
    except Exception:  # noqa: BLE001 — energy not loaded
        return False
    data = manager.data
    return not data or not data.get("energy_sources")


class RbgridOptionsFlow(OptionsFlow):
    """Per-hub options."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Edit options."""
        if user_input is not None:
            options = {
                OPT_PRICE_ENTITY: user_input.get(OPT_PRICE_ENTITY) or None,
                OPT_PRICE_UNIT: user_input.get(OPT_PRICE_UNIT, "major"),
                OPT_SETUP_ENERGY: bool(user_input.get(OPT_SETUP_ENERGY, False)),
                OPT_SYNC_CURRENCY: bool(user_input.get(OPT_SYNC_CURRENCY, False)),
            }
            return self.async_create_entry(title="", data=options)
        cur = self.config_entry.options
        schema = vol.Schema(
            {
                vol.Optional(OPT_PRICE_ENTITY, description={"suggested_value": cur.get(OPT_PRICE_ENTITY)}): EntitySelector(
                    EntitySelectorConfig(domain=["sensor", "input_number"])
                ),
                vol.Optional(OPT_PRICE_UNIT, default=cur.get(OPT_PRICE_UNIT, "major")): SelectSelector(
                    SelectSelectorConfig(
                        options=[SelectOptionDict(value="major", label="major"), SelectOptionDict(value="cents", label="cents"), SelectOptionDict(value="mwh", label="mwh")],
                        mode=SelectSelectorMode.DROPDOWN,
                        translation_key="price_unit",
                    )
                ),
                vol.Optional(OPT_SETUP_ENERGY, default=False): bool,
                vol.Optional(OPT_SYNC_CURRENCY, default=False): bool,
            }
        )
        return self.async_show_form(
            step_id="init",
            data_schema=schema,
            description_placeholders={"name": self.config_entry.title, "currency": self.hass.config.currency},
        )
