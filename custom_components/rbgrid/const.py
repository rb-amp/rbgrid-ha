"""Constants for the RBgrid integration."""

from __future__ import annotations

DOMAIN = "rbgrid"
VERSION = "0.2.7"

# Config entry data
CONF_DEVICE_ID = "device_id"  # HA device registry id of the hub device
CONF_MAC = "mac"  # lower-case colon MAC, as in the device registry connection
CONF_ESPHOME_ENTRY_ID = "esphome_entry_id"
CONF_NAME = "name"

# Options
OPT_SETUP_ENERGY = "setup_energy"
OPT_SYNC_CURRENCY = "sync_currency"  # wizard: write Home Assistant's currency into the hub's tariff plan once  # wizard: configure the Energy dashboard with this hub
OPT_PRICE_ENTITY = "price_entity"  # HA price sensor pushed to the hub as external prices
OPT_PRICE_UNIT = "price_unit"  # "major" (EUR/kWh) or "cents"

# ESPHome side
ESPHOME_DOMAIN = "esphome"
ACTION_SUFFIX = "_rbgrid_cmd"  # esphome.<device>_rbgrid_cmd
EVENT_TYPE = "esphome.rbgrid_event"
EVENT_BUFFER = 300

# Frontend
PANEL_URL_PATH = "rbgrid"
PANEL_ELEMENT = "rbgrid-panel"
STATIC_URL = "/rbgrid-static"
PANEL_TITLE = "RBgrid Hub"
PANEL_ICON = "mdi:meter-electric-outline"

# Statistics
STAT_SOURCE = DOMAIN
STAT_IMPORT_MINUTE = 2  # import closed hour rows at hh:02:30
STAT_IMPORT_SECOND = 30

# Cache for read sections (seconds); invalidated by every changing command
GET_CACHE_TTL = 15.0
# Reply over this many bytes comes in base64 parts (device rule, informational)
PARTS_THRESHOLD = 4000

SIGNAL_EVENT = f"{DOMAIN}_event_{{}}"  # .format(entry_id)
