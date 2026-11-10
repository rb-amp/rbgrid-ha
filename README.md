# RBgrid for Home Assistant

Home Assistant side of the **RBgrid hub on ESPHome**: the hub (ESP32 + rbAmp current modules and
ESP-NOW nodes) counts energy and money on the device; Home Assistant shows, configures and automates
it. One install, one wizard, no YAML.

What you get:

| Piece | What it does |
|---|---|
| **Sidebar panel `RBgrid Hub`** | Everything the RBgrid web app does: live overview, points (create / edit / rebind / delete), tariff plan editor, I2C modules and ESP-NOW nodes, hourly history charts, the device event log. Talks to the hub through the device's `rbgrid_cmd` action over Home Assistant's own ESPHome connection — no second connection, no credentials. |
| **Long-term statistics** | The hub's stored hourly energy and money per point are imported as external statistics `rbgrid:<mac>_<point>_{energy_in,energy_out,cost,revenue}` every hour. They show up in Energy dashboard pickers and statistics cards. |
| **Energy dashboard** | The wizard can fill the Energy dashboard: grid import/export from the hub's lifetime counters, cost and export value from the hub's own money sensors, every point as an individual device. |
| **Events** | Device event-log lines (`esphome.rbgrid_event`: reverse flow, module absent/restored, node online/offline, bus stuck, boot, tariff, firmware) buffered for the panel and usable in automations; a notification blueprint ships in `blueprints/`. Lines the device logged while Home Assistant was disconnected (boot, rollback, diagnostics) are read back after every reconnect, so the Events tab is complete. |
| **Prices tab** (hubs with dynamic-price firmware) | The hub's own price loop, configured and watched from Home Assistant: primary and backup provider from the hub's catalogue (Energy-Charts, Nord Pool, EnergyZero, Octopus Agile, … or Home Assistant as a local source), bidding zone, spot formula and floors, sell-price mode; the price per 15-minute period as the hub books it (chart + table with provenance), the current rank and signal flags; **cheap windows** (threshold / cheapest periods of the day / cheapest before a deadline) that the hub computes and reports — automations in Home Assistant do the switching. A **Hub time** card sets the hub's time zone (POSIX string, one click to take Home Assistant's zone): a fresh hub runs on UTC, so tariff zones and daily windows would otherwise switch at UTC midnight. |
| **Hub health** | Uptime, reset reason, Wi-Fi signal, free memory and the running firmware image/partition on the Overview; after an OTA that the bootloader rolled back the panel says so. |

The entities themselves (grid power, energy in/out, cost, prices, tariff zone, per-point power /
current / energy / cost) come from the ESPHome integration; this integration adds what entities
cannot express.

## Requirements

- Home Assistant **2026.1 or later** (ESPHome action responses).
- The hub running the ESPHome build of RBgrid: the `rbgrid` ESPHome component from
  [rb-amp/rbgrid-esphome](https://github.com/rb-amp/rbgrid-esphome) (v1.2.0 or later; install,
  YAML, entities and the `rbgrid_cmd` reference are in that repository's `esphome/README.md` and
  `esphome/RBGRID_CMD.md`), adopted by the **ESPHome integration** (it is discovered automatically;
  one click "Configure"). In the hub's YAML:

  ```yaml
  external_components:
    - source:
        type: git
        url: https://github.com/rb-amp/rbgrid-esphome
        ref: v1.2.0
        path: esphome/components
      components: [rbgrid]
  ```

## Install

**HACS:** add `https://github.com/rb-amp/rbgrid-ha` as a custom repository (type *Integration*),
install *RBgrid*, restart Home Assistant.

Issues and questions: <https://github.com/rb-amp/rbgrid-ha/issues>.

**Manual:** copy `custom_components/rbgrid` into `<config>/custom_components/`, restart.

## Set up (the wizard)

1. The hub advertises itself on the network (mDNS). On *Settings → Devices & services* two cards
   appear: **ESPHome** (the device) and **RBgrid** (this integration). Configure the ESPHome one
   first if it is not in yet — the RBgrid card waits for it. No RBgrid card (mDNS does not reach
   Home Assistant on every network, e.g. Docker bridge networks)? Use *Add integration → RBgrid*:
   it lists the hubs the ESPHome integration already has. Removing a hub does not make Home
   Assistant discover it again by itself: restart Home Assistant (or use *Add integration*).
2. Click **Configure** on the RBgrid card (or *Add integration → RBgrid*; with one hub there is
   nothing to choose).
   (ESPHome's own "Name and assign" dialog lists the hub and its point slots — press *Skip*, the
   names come from the points.)
3. Last step: tick **Configure the Energy dashboard with this hub** if you want it filled in
   (default on when the Energy dashboard is empty), and leave **Set the hub's tariff plan to Home
   Assistant's currency** on: the hub and Home Assistant must count in one currency (there is no
   conversion — the Energy dashboard labels the hub's numbers with Home Assistant's currency). The
   Tariff tab warns and offers a one-click fix whenever the two differ. Submit.

Done: the **RBgrid Hub** panel is in the sidebar (also at `/rbgrid`), statistics import starts
within a minute, and the Energy dashboard shows the hub after the next full hour (statistics are
imported at hh:02).

Where to find things afterwards:

- **Panel:** sidebar *RBgrid Hub*, or the **Visit** button on the integration's own device
  (*Settings → Devices & services → RBgrid → 1 device*). The hub's ESPHome device page stays the
  ESPHome one — a device has one owner in Home Assistant — so the panel is linked from the RBgrid
  device, not from there.
- **Options** (external price sensor, Energy re-setup): *RBgrid → Configure*.
- **Removing the integration** removes the panel (a bookmark to `/rbgrid` then shows Home
  Assistant's plain "404: Not Found") and its own small device. The hub, its entities and the
  ESPHome integration stay — Home Assistant's standard warning "its devices and entities will be
  permanently deleted" refers to the RBgrid device only. Imported long-term statistics stay too.

## External prices (Nord Pool, ENTSO-e, Tibber, …)

The hub prices energy with its tariff plan. If you have a dynamic price sensor in Home Assistant,
open *Settings → Devices & services → RBgrid → Configure* and pick it: the integration pushes the
sensor's price list to the hub, re-sends it every 15 minutes and after the hub reconnects.
Recognised shapes: `raw_today`/`raw_tomorrow` (Nord Pool and compatible), `prices_today`/
`prices_tomorrow`/`prices` (ENTSO-e), `data` (EPEX Spot, Tibber Prices, the community Nord Pool
template), `outlook_quarters`, any other attribute holding a list of `{start, price}` dicts, or the
plain state (one price, re-sent on change). The unit option covers currency/kWh, cents/kWh and
currency/MWh.

Since October 2025 the day-ahead markets publish 15-minute prices (96 a day). Hub firmware from
November 2025 (dev build d00a3e7) keeps **192 entries**, enough for today + tomorrow at 15-minute
resolution, so the hub prices every 15-minute period exactly even with Home Assistant off. Older firmware
keeps 48; the integration notices (it reads the stored list back once per connection) and then
packs the list: the next 15-minute periods stay exact and the rest goes as hourly means until it fits
(about 4 h exact + 30 h hourly at 13:00). In both cases the list is re-sent every 15 minutes while
Home Assistant runs, and the hub falls back to the tariff plan beyond the list. A state-only
sensor (core Nord Pool, EnergyZero) gives the hub about two hours on its own — pick a sensor that
carries the list when the hub must price alone.

On the device the external price replaces the zone's energy rate for its time range; the plan's
fees and VAT still apply, so the `Buy price` entity stays the all-in price. The *External price*
card on the panel's Tariff tab shows what the hub holds ("not active — the tariff plan applies"
when nothing was pushed) and lets you clear it.

Actions for automations: `rbgrid.set_prices` (a list of `{buy, sell?, from, until}` or one price),
`rbgrid.clear_prices`, `rbgrid.command` (any `rbgrid_cmd` command, reply returned),
`rbgrid.import_statistics`.

## What Home Assistant shows when things go wrong

Measured on the test hub (fault-injection run, 2026-11-08): a hub reboot shorter than ~30 s appears as a
sub-second `unavailable` blip about 30 s later (Home Assistant's ESPHome keepalive), so automations on
`unavailable` should not read the blip time as the outage time. On every reconnect all entities are
republished within 0.2 s; `Config version` passes through `unknown` for a few seconds (reconnecting,
not a lost configuration). `Modules online`, `Nodes online` and each point's `Online` sensor follow the
device within a second and make good blueprint triggers; the event stream carries the reason text.
Statistics stayed consistent across disconnects, an OTA rollback and serial resets.

## Entity ids

Home Assistant builds entity ids once, at first adoption, and point sub-devices come out as
`sensor.point_1_power` on current Home Assistant versions (a second hub gets `_2`). The panel and
the integration therefore address entities by **unique id and device** (`<MAC>/<device_key>/sensor/<Name>`),
never by entity id. In your own automations prefer device triggers or the entity picker over
typing ids.

## Automations

- **Events:** trigger `event`, type `esphome.rbgrid_event`, filter `event_data: {kind: reverse_flow}`.
  `device_id` in the event is the hub device. Blueprint: `blueprints/automation/rbgrid/event_notify.yaml`.
- **Tariff zone:** the `Tariff zone` text sensor carries NIGHT / MORNING_PEAK / DAY / EVENING_PEAK /
  LATE_EVENING / WEEKEND / HOLIDAY / CRITICAL_PEAK; `Buy price` is the all-in price (fees + VAT).
- **Commands from automations:** the action `esphome.<device>_rbgrid_cmd` with field `command`
  (a JSON string) works from scripts too — see `RBGRID_CMD.md` in `rbgrid-esphome` for the
  command set.

## WebSocket API (for your own cards)

```
rbgrid/hubs                               → [{entry_id, device_id, mac, name, available, …}]
rbgrid/entities {entry_id}                → {hub: {Name → entity}, slots: {"1": {Name → entity}}}
rbgrid/call {entry_id, command}           → {ok, type, config_version, parts, elapsed_ms, data}
rbgrid/events {entry_id}                  → [{t, kind, level, message, seq, replay}]
rbgrid/subscribe_events {entry_id}        → stream
rbgrid/import_statistics {entry_id}       → {units: {"0100": {energy_in: n, …}}, errors: []}
```

`rbgrid/call` reassembles replies the device sends in parts (ESPHome caps an action response
at 5 KB) and returns the bare device reply in `data`; device errors come back as
`device_error` with the device's message.

## License

MIT — see `LICENSE`. This integration contains no metering core; it talks to the hub over the
ESPHome API. The ESPHome package it pairs with, [rb-amp/rbgrid-esphome](https://github.com/rb-amp/rbgrid-esphome)
(core + component), is MIT as well. The standalone hub firmware in `rb-amp/RBgrid` (web app, MQTT,
node) is a different package under PolyForm Noncommercial 1.0.0; its licence does not apply here.

## Development

`./deploy.sh` copies the component into a local Home Assistant `/config` (Docker bind mount) and
restarts the container; `--no-restart` for panel-only (JavaScript) changes, `--dry-run` to look.

## Layout

```
custom_components/rbgrid/
  __init__.py        setup: hub object, panel + static files, hourly statistics import, Energy setup
  config_flow.py     wizard: zeroconf discovery, manual pick, options flow (price entity)
  prices.py          external prices: HA price entity → hub (every 15 minutes, after reconnect; packed to the hub's capacity)
  services.py        rbgrid.set_prices / clear_prices / command / import_statistics
  hub.py             RbgridHub: action call, parts reassembly, read cache, event buffer, entity map
  websocket.py       rbgrid/* commands
  history_import.py  series → external long-term statistics
  energy.py          Energy dashboard preferences
  panel/rbgrid-panel.js   the sidebar panel (plain web component, no build step)
blueprints/automation/rbgrid/event_notify.yaml
```
