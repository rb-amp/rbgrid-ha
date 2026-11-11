# Changelog

All notable changes to the RBgrid Home Assistant integration. Dates are the day the change reached the test
installation; versions follow `custom_components/rbgrid/manifest.json`.

## 0.2.8 — 2026-11-11
- Energy dashboard setup adds only load points as individual devices: supply points (the grid input, also when split per phase), renewable and storage points are left out — they are the grid source or not consumption.
- Cheap windows as entities: a binary sensor per rule ("<rule> window", on while active, with `active_until` / `next_start`), "Price cheap" and "Sell price low" flags and a "Price rank today" sensor, on the hub's device, refreshed every minute and on every price event. New blueprint *cheap window turns a switch on and off*. Hubs without dynamic prices get none of these.
- Points: the Edit dialog offers the **CT clamp model** of the point's channel (models from the hub's own list) when the module allows it; the hub applies it at once or refuses with its reason (uncalibrated module). Until now this was only reachable through the `rbgrid.command` action.
- History / statistics import: 0-second and physically impossible series rows are skipped (a fresh hub once served a 0 s row with −2^40 Wh); the import already ignored 0 s rows, the panel's History table now does too.

## 0.2.7 — 2026-11-10
- A hub that answers `[code=STARTING]` — firmware refusing commands while its core is still coming up, typically in the first seconds after an OTA — is retried a few times instead of surfacing an error; the panel's text for the rare leftover case says to try again.
- Panel: "Reuse a retired point" lets you pick which deleted point the new one continues, from the list the device keeps (`point_tombstones`); the device reclaims a retired point only when its id is named, so the earlier checkbox had no effect. The edit dialog no longer offers it: a rename never changes a point's id.
- Point slots: the ready-made ESPHome configs create the 12 slot entities disabled; the integration keeps each slot's Name sensor enabled as a probe, enables a slot's entities (and sub-device) when a point takes it, and disables them again when that point is deleted or its ESP-NOW node is removed. Entities you disabled by hand are left alone.
- Actions: the field descriptions of `rbgrid.set_prices` (prices) and `rbgrid.command` (command) showed a translation error in Developer tools (braces in the text).
- Wizard: the final "is set up" text showed a translation error instead of the hub's name (missing placeholder).
- Re-flash / factory image: the hub's action is found under whichever ESPHome device name has it registered (the name stored at adoption or the live one), so a hub flashed under a new name keeps working without a Home Assistant restart.
- Energy dashboard setup drops this hub's stale point entries (a slot whose point was deleted or a reset hub kept its old name in the dashboard).
- README: discovery after removing a hub.
- The hub's name in the panel is the integration entry's title, so renaming the entry in Home Assistant renames the hub in the panel.
- A hub renamed over OTA (its ESPHome action keeps the old name until Home Assistant restarts) keeps working: the resolver remembers the last working name and, as a last resort, takes an unclaimed `esphome.*_rbgrid_cmd` action.
- `LICENSE`: MIT (owner decision 2026-11-10). Public repository `github.com/rb-amp/rbgrid-ha` (documentation / issue tracker in the manifest, HACS custom repository URL in the README); `codeowners` is not listed yet; the ESPHome component is referenced at `rb-amp/rbgrid-esphome` (its own MIT repository, with the `external_components` snippet in the README).

## 0.2.6 — 2026-11-10
- Pre-release code review (23 findings): a crash in the external-price capacity probe that failed entry setup with 15-minute price entities; the first statistics import / Energy setup / currency sync now run 45 s after setup on a running Home Assistant (they waited for the next hour); clearing a one-shot wizard option no longer reloads the entry; the Energy dashboard setup replaces only this hub's grid connection; event replay no longer duplicates lines that already arrived live; the ESPHome device is re-resolved by MAC at every setup (re-adoption safe, `ConfigEntryNotReady` until adopted); shared registrations moved to `async_setup`; malformed multi-part replies become device errors; background tasks are entry-bound and guarded; `rbgrid.set_prices` takes up to 192 entries and checks `until > from`; quieter logs for an offline hub; statistics import never guesses a currency; the panel escapes every device-provided value and checks link schemes.
- Also from the review: device rejections returned as a body (`ok:false`, HTTP-style `code` ≥ 400, `status: error`) are raised like action errors, with the device's code prefixed (`[code=…]`); point re-creation and rename recognise a retired name and offer `reuse` with the device's text kept; helpers for free sensors and dialog hints; consistent `metering_points` column; Network cache refreshed after point changes.

## 0.2.5 — 2026-11-10
- One currency: the wizard and the options flow can write Home Assistant's currency into the hub's tariff plan;
  the Tariff form shows Home Assistant's currency and warns with a one-click fix when the plan differs; the Prices
  form warns when a bidding zone's currency differs.
- Panel design pass after an independent UI/UX review (30 findings) and a second persona test (24 findings):
  Home Assistant 2026 look (theme-relative header, pill buttons, tinted badges and alerts, primary tabs), stacked
  tables and 40 px targets on phones, real-width charts with 1-2-5 ticks, units, now-marker, cheap-window shading
  and tap captions, Overview rebalanced (eyebrows, kWh/currency formatting, Hub health card, demo-plan alert), one
  date formatter, events capped with day groups, empty and offline states, history day groups and totals, rule
  dialog in household terms, 24-hour zone selectors, dialog close buttons, field-aware device errors, hex module
  addresses, per-phase voltages on three-phase hubs, `metering_points`, point re-creation with `reuse`.
- The panel refresh morphs the DOM instead of rebuilding it (no more page jump every 10 s).

## 0.2.4 — 2026-11-09
- Prices tab for the hub-owned dynamic prices: provider / backup / zone / formula configuration from the hub's
  provider catalogue, status and attribution, 15-minute resolved prices chart and table with provenance,
  cheap-window rules editor, signal thresholds, import peaks, hub time zone (POSIX, one click from Home
  Assistant's zone), Home Assistant price push card.
- Second and third hubs (test bench) supported through the hub selector.

## 0.2.3 — 2026-11-09
- External prices: the pusher probes the hub's capacity (192 entries on firmware d00a3e7+, 48 on older builds),
  packs long lists into hourly means only when needed, sends newest-first, re-sends every quarter hour.

## 0.2.2 — 2026-11-09
- External prices for 15-minute markets: more price-entity shapes (`data`, `outlook_quarters`, nested lists),
  per-MWh unit, quarter-hour re-push.

## 0.2.1 — 2026-11-09
- Entry points into the panel: a service device with a **Visit** link, wizard success text; sidebar "RBgrid Hub"
  with its own icon; panel polish from the first UI test (field help, in-panel confirmations, pins editor with
  validation, zone hours, currency labels, chart grid, load-vs-input hint); README on where things are and on
  removal.

## 0.2.0 — 2026-11-08
- External prices from a Home Assistant price entity (options flow, `rbgrid.set_prices` / `clear_prices`),
  `rbgrid.command`, `rbgrid.import_statistics`; event replay after every reconnect (`get events`), firmware
  image / partition / rollback detection, Hub health card; UI test fixes.

## 0.1.0 — 2026-11-08
- First version: wizard (zeroconf + manual), sidebar panel, `rbgrid/*` WebSocket commands, hourly statistics import
  into long-term statistics, Energy dashboard setup, event blueprint.
