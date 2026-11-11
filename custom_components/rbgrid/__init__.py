"""RBgrid: Home Assistant side of the RBgrid hub on ESPHome.

What this integration adds on top of the ESPHome entities the hub already has:

* a sidebar panel (/rbgrid) that configures the hub the way the RBgrid web app
  does — points, tariff plan, I2C modules, ESP-NOW nodes, history charts,
  event log — through the device's ``rbgrid_cmd`` action;
* WebSocket commands for that panel (``rbgrid/*``);
* import of the device's stored hourly history into long-term statistics
  (``rbgrid:<mac>_<unit>_*``) so per-point energy and cost appear in the Energy
  dashboard and statistics cards without YAML;
* a ring buffer of ``esphome.rbgrid_event`` events per hub.

It does not open a second connection to the device: every command goes through
Home Assistant's own ESPHome connection (``esphome.<device>_rbgrid_cmd``).
"""

from __future__ import annotations

from datetime import timedelta
import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry, ConfigEntryState
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers import config_validation as cv, device_registry as dr
from homeassistant.helpers.event import async_call_later, async_track_time_change
from homeassistant.helpers.typing import ConfigType

from . import services, websocket
from .config_flow import async_find_hubs
from .const import (
    PLATFORMS,
    CONF_DEVICE_ID,
    CONF_ESPHOME_ENTRY_ID,
    CONF_MAC,
    DOMAIN,
    OPT_PRICE_ENTITY,
    OPT_PRICE_UNIT,
    OPT_SETUP_ENERGY,
    OPT_SYNC_CURRENCY,
    PANEL_ELEMENT,
    PANEL_ICON,
    PANEL_TITLE,
    PANEL_URL_PATH,
    STAT_IMPORT_MINUTE,
    STAT_IMPORT_SECOND,
    STATIC_URL,
    VERSION,
)
from .signal import RbgridSignalCoordinator
from .hub import RbgridHub

_LOGGER = logging.getLogger(__name__)

type RbgridConfigEntry = ConfigEntry[RbgridHub]

_PANEL = f"{DOMAIN}_panel"
STARTUP_IMPORT_DELAY = 45  # s after setup: let ESPHome connect and register the action
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Things registered once per HA run and never removed: WS commands, services, the panel's static files."""
    websocket.async_register(hass)
    services.async_register(hass)
    panel_dir = Path(__file__).parent / "panel"
    await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL, str(panel_dir), cache_headers=False)])
    return True


async def _async_ensure_panel(hass: HomeAssistant) -> None:
    """The sidebar panel exists while at least one hub entry is loaded."""
    if hass.data.get(_PANEL):
        return
    hass.data[_PANEL] = True
    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=f"{STATIC_URL}/rbgrid-panel.js?v={VERSION}",
        embed_iframe=False,
        require_admin=True,
    )


@callback
def _resolve_hub(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Re-resolve the ESPHome device by MAC: ids change when the device is re-adopted by ESPHome."""
    hub = next((h for h in async_find_hubs(hass) if h[CONF_MAC] == entry.data[CONF_MAC]), None)
    if hub is None:
        raise ConfigEntryNotReady(f"ESPHome device {entry.data[CONF_MAC]} is not adopted (yet)")
    if hub[CONF_DEVICE_ID] != entry.data.get(CONF_DEVICE_ID) or hub[CONF_ESPHOME_ENTRY_ID] != entry.data.get(CONF_ESPHOME_ENTRY_ID):
        _LOGGER.info("RBgrid %s: ESPHome device re-adopted, updating ids", entry.title)
        hass.config_entries.async_update_entry(
            entry, data={**entry.data, CONF_DEVICE_ID: hub[CONF_DEVICE_ID], CONF_ESPHOME_ENTRY_ID: hub[CONF_ESPHOME_ENTRY_ID]}
        )


def _runtime_options(options: dict) -> tuple:
    """The options whose change needs a reload (one-shot flags do not)."""
    return (options.get(OPT_PRICE_ENTITY), options.get(OPT_PRICE_UNIT))


async def async_setup_entry(hass: HomeAssistant, entry: RbgridConfigEntry) -> bool:
    """Set up one hub."""
    _resolve_hub(hass, entry)
    hub = RbgridHub.from_entry(hass, entry)
    hub.runtime_options = _runtime_options(dict(entry.options))
    entry.runtime_data = hub
    await hub.async_start()
    await _async_ensure_panel(hass)
    # Cheap windows / price flags / rank as entities: polled every minute and on price events
    hub.signal = RbgridSignalCoordinator(hass, hub)
    await hub.signal.async_refresh()  # no raise: a hub without dynamic prices or offline just has no data yet
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # The hub itself belongs to the ESPHome entry (a device has one owner), so the integration gets
    # its own small service device: it gives the integration page a device link and a "Visit" button
    # that opens the panel (homeassistant:// URLs open internal pages). Identifiers only — no MAC
    # connection, or the device registry would merge it into the ESPHome device.
    dr.async_get(hass).async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, hub.mac)},
        manufacturer="rbgrid",
        model="RBgrid panel",
        name=f"{hub.name} · RBgrid",
        sw_version=VERSION,
        configuration_url=f"homeassistant://{PANEL_URL_PATH}",
        entry_type=dr.DeviceEntryType.SERVICE,
    )

    failing = {"import": False}

    async def _import(_now=None) -> None:
        from .history_import import async_import_hub  # noqa: PLC0415

        if entry.state is not ConfigEntryState.LOADED:
            return
        if entry.options.get(OPT_SYNC_CURRENCY) and hub.action_registered:
            await _async_sync_currency_once(hass, entry, hub)
        if entry.options.get(OPT_SETUP_ENERGY):
            await _async_setup_energy_once(hass, entry, hub)

        if not hub.action_registered:
            _LOGGER.debug("RBgrid %s: action not registered yet, skipping statistics import", hub.name)
            return
        try:
            result = await async_import_hub(hass, hub)
        except Exception as err:  # noqa: BLE001 — the device may be offline; next hour retries
            # First failure after a success at INFO, repeats at DEBUG, recovery at INFO (an offline hub must not fill the log)
            _LOGGER.log(logging.DEBUG if failing["import"] else logging.INFO, "RBgrid %s: statistics import skipped: %s", hub.name, err)
            failing["import"] = True
            return
        if failing["import"]:
            _LOGGER.info("RBgrid %s: statistics import working again", hub.name)
            failing["import"] = False
        _LOGGER.debug("RBgrid %s: statistics import %s", hub.name, result)

    entry.async_on_unload(
        async_track_time_change(hass, _import, minute=STAT_IMPORT_MINUTE, second=STAT_IMPORT_SECOND)
    )

    @callback
    def _schedule_first_import(_event=None) -> None:
        # Called synchronously from setup (entry state SETUP_IN_PROGRESS) or from the HA-started event (LOADED);
        # skipped only when the entry is gone or failed meanwhile. `_import` re-checks the state when it fires.
        if entry.state not in (ConfigEntryState.LOADED, ConfigEntryState.SETUP_IN_PROGRESS):
            return
        entry.async_on_unload(async_call_later(hass, timedelta(seconds=STARTUP_IMPORT_DELAY), _import))

    if hass.state is CoreState.running:
        _schedule_first_import()
    else:
        # A once-listener removes itself when it fires; unsubscribing it again on unload would log an error,
        # so it is not registered with async_on_unload — the callback checks the entry state instead.
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _schedule_first_import)

    # External prices from an HA entity (options)
    from .prices import pusher_from_options  # noqa: PLC0415

    if pusher := pusher_from_options(hass, hub, dict(entry.options)):
        hub.price_pusher = pusher
        await pusher.async_start()
        entry.async_on_unload(pusher.async_stop)

    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def _async_setup_energy_once(hass: HomeAssistant, entry: RbgridConfigEntry, hub: RbgridHub) -> None:
    """Wizard option: configure the Energy dashboard, then clear the option so it runs once."""
    from .energy import async_setup_energy  # noqa: PLC0415

    try:
        await async_setup_energy(hass, hub)
    except Exception as err:  # noqa: BLE001 — entities may not be registered yet; retry next time
        _LOGGER.info("RBgrid %s: Energy dashboard setup postponed: %s", hub.name, err)
        return
    hass.config_entries.async_update_entry(entry, options={**entry.options, OPT_SETUP_ENERGY: False})


async def _async_sync_currency_once(hass: HomeAssistant, entry: RbgridConfigEntry, hub: RbgridHub) -> None:
    """Wizard option: the hub's tariff plan takes Home Assistant's currency (one currency, no conversion).

    The hub and Home Assistant must agree on the currency: the Energy dashboard labels money with Home
    Assistant's currency while the numbers come from the hub. Runs once, then clears the option.
    """
    want = hass.config.currency
    try:
        reply = await hub.async_get("tariff")
        plan = ((reply or {}).get("data") or {}).get("list", [{}])[0]
        have = plan.get("currency_code")
        if have != want and plan:
            # Read-modify-write of the whole plan (the panel does the same), so the result does not depend on
            # whether the firmware merges or replaces a partial `set tariff`.
            await hub.async_call({"cmd": "set", "section": "tariff", "data": {**plan, "currency_code": want}})
            _LOGGER.info("RBgrid %s: tariff plan currency %s → %s (Home Assistant's currency)", hub.name, have, want)
    except Exception as err:  # noqa: BLE001 — device offline or a network provider pins the zone currency; retry next hour
        _LOGGER.info("RBgrid %s: currency sync postponed: %s", hub.name, err)
        return
    hass.config_entries.async_update_entry(entry, options={**entry.options, OPT_SYNC_CURRENCY: False})


async def _async_update_listener(hass: HomeAssistant, entry: RbgridConfigEntry) -> None:
    """Reload only for options the running hub depends on; clearing a one-shot flag must not reload."""
    hub = getattr(entry, "runtime_data", None)
    if hub is not None and getattr(hub, "runtime_options", None) == _runtime_options(dict(entry.options)):
        return
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: RbgridConfigEntry) -> bool:
    """Unload one hub; drop the panel with the last loaded one."""
    await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    await entry.runtime_data.async_stop()
    others = [e for e in hass.config_entries.async_loaded_entries(DOMAIN) if e.entry_id != entry.entry_id]
    if not others and hass.data.get(_PANEL):
        frontend.async_remove_panel(hass, PANEL_URL_PATH, warn_if_unknown=False)
        hass.data.pop(_PANEL, None)
    return True
