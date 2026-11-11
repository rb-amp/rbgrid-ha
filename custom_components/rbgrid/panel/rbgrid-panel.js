/*  RBgrid panel for Home Assistant — /rbgrid
 *
 *  A plain web component (no build step, no external libraries). Home Assistant
 *  sets `hass`, `narrow`, `route`, `panel` on it. Everything the panel shows or
 *  changes goes through the integration's WebSocket commands:
 *
 *    rbgrid/hubs                     configured hubs
 *    rbgrid/entities {entry_id}      entity map by unique-id name parts
 *    rbgrid/call {entry_id, command} one rbgrid_cmd command, parts reassembled
 *    rbgrid/events, rbgrid/subscribe_events
 *    rbgrid/import_statistics
 *
 *  Live values come from HA states through the entity map (never by entity id:
 *  ids are frozen at first adoption and differ between installs).
 */

const STR = {
  en: {
    overview: "Overview", points: "Points", tariff: "Tariff", network: "Network", history: "History", events: "Events",
    online: "online", offline: "offline", noHubs: "No RBgrid hub is configured. Add one in Settings → Devices & services → Add integration → RBgrid.",
    gridPower: "Grid power", today: "today", lifetime: "lifetime", energyIn: "Energy in", energyOut: "Energy out", cost: "Cost", exportValue: "Export value",
    buyPrice: "Buy price", sellPrice: "Sell price", zone: "Tariff zone", configVersion: "Config version", clock: "Clock", clockSet: "set", clockUnset: "not set",
    demoTariff: "demo tariff plan", voltage: "Voltage", frequency: "Frequency", boot: "Last boot", refresh: "Refresh", loading: "Loading…",
    name: "Name", role: "Role", source: "Source", slot: "Slot", power: "Power", current: "Current", energy: "Energy", state: "State", actions: "Actions",
    present: "present", absent: "absent", edit: "Edit", delete: "Delete", rebind: "Rebind", addPoint: "Add point", noFreeSensors: "Every sensor channel already has a point. Connect another rbAmp module (Network tab) to add one.",
    confirmDelete: "Delete point “{name}”? Its hourly history stays on the device flash but is no longer reachable, and its long-term statistics in Home Assistant stop growing.",
    confirmTitle: "Please confirm", yesDelete: "Yes, delete", yesContinue: "Continue", hShortName: "Up to 8 characters for tight layouts (the web app's tiles)", hGroup: "Points with the same group number are summed in the web app (0 = no group)",
    hInvert: "Tick when the clamp is mounted the other way round and the point shows negative power while consuming", hRated: "Nameplate power — used for the overload hint, not for measuring", hMaxCur: "Breaker rating — used for the overload hint", hPhase: "Which phase(s) the point measures",
    clockSynced: "Time synced ✓", clockUnsynced: "Time not synced — hourly history is marked until the hub gets the time", goTariff: "open the Tariff tab to enter your rates",
    loadGtSupply: "{load} has counted more energy ({e_load}) than the main input ({e_main}). Is its clamp really behind the input, or is the direction inverted?",
    pinsConfirm: "Change bus {bus} to SDA {sda} / SCL {scl}? The new pins apply after the device restarts; modules on the old pins drop off until then.", pinsSame: "SDA and SCL must be different pins.", durationMin: "Minutes",
    zoneHours: "Hours", from: "from", to: "to",
    prices: "Prices", dynPrices: "Dynamic prices", priceNow: "Price now", priceState: "State", sourceNow: "Source now", validUntil: "Prices known until", lastFetch: "Last fetch", nextFetch: "Next fetch", lastError: "Last error",
    rank: "rank", ofPeriods: "of {n} periods today", cheapNow: "cheap now", sellLowNow: "sell price low", provider: "Provider", backupProvider: "Backup provider", noBackup: "none", zoneSel: "Bidding zone", haClass: "What Home Assistant pushes",
    classSpot: "spot (exchange price, fees and VAT added by the plan)", classAllIn: "all-in (price as billed)", factor: "Factor", markup: "Markup, {cur}/kWh", zonesStack: "Add the plan zone's rate on top of the spot (time-of-use grid fees)", hourlyMean: "Bill each quarter at its hour's mean price",
    floorBuy: "Lowest buy price (empty = none)", floorSell: "Lowest sell price (empty = none)", sellMode: "Sell price", sellSource: "from the provider, else the plan", sellPlan: "the plan's", sellFormula: "formula: raw × k − fee", kSell: "k", feedinFee: "Feed-in fee, {cur}/kWh",
    product: "Import product", exportProduct: "Export product (empty = none)", token: "Token (stored on the hub, never shown)", tokenSet: "token stored", dynEnabled: "Dynamic prices on", dynOff: "Off: only Home Assistant pushes apply, as before",
    dynSaved: "Price settings applied", attribution: "Source", resolved: "Prices per 15 minutes", provSource: "provider", provBackup: "backup", provHa: "HA push", provPlan: "plan", raw: "raw", allInBuy: "buy (all-in)", sellCol: "sell", now: "now", showAll: "show all periods", showNext: "show the next 6 hours only",
    ps_ok: "prices in force", ps_backup: "running on the backup provider", ps_today_only: "tomorrow's prices not in yet", ps_stale: "Home Assistant is the source and nothing covers now — the plan applies", ps_plan_fallback: "nothing covers now — the plan applies", ps_disabled: "off",
    rules: "Cheap windows", rule: "Rule", kind: "Kind", k_threshold: "below a price", k_cheapest: "cheapest periods of the day", k_deadline: "cheapest periods before a deadline", onBelow: "On when buy ≤", offAbove: "Off when buy ≥", fromH: "Window from (h)", toH: "Window to (h)", periods: "Periods (15 min)", consecutive: "Consecutive block", deadlineH: "Deadline (h)",
    windowActive: "active until {t}", windowNext: "next start {t}", windowIdle: "no window planned", addRule: "Add rule", rulesSaved: "Rules saved", confirmRuleDel: "Delete rule “{name}”?", maxRules: "The hub holds up to 8 rules.", rulesHint: "The hub computes the windows from the all-in price of every 15-minute period and reports them (entity, event, MQTT signal); it switches nothing itself. Automations in Home Assistant turn devices on and off.",
    hubTime: "Hub time", timezone: "Time zone", tzNotSet: "not set — the hub runs on UTC, so daily windows and the tariff zones start at UTC midnight", tzSetHa: "Use Home Assistant's zone ({tz})", tzSaved: "Time zone saved", tzPosix: "POSIX TZ string", localTime: "Local time on the hub",
    emptyPoints: "No points yet. Points appear when a module channel or a node input is bound — see the Network tab.", emptySensors: "No sensor channels: connect an rbAmp module or pair a node.", emptyNodes: "No nodes paired yet. Press “Pair” and power the node within 3 minutes.", emptyRules: "No cheap windows yet. Add a rule to let the hub mark cheap periods.", emptyHistory: "No stored history for this point yet — the first full hour appears at the top of the hour.",
    showMore: "Show {n} more", total: "Total", ruleType: "Rule type", searchWindow: "Search window", durationSel: "Run time", finishBy: "Finished by", allDay: "all day", min: "min", h: "h", perKwh: "/kWh",
    demoAlert: "This hub still runs its demo tariff plan — your bills will not match until you enter your own rates.", openTariff: "Open Tariff", consumptionOnlyNote: "All rows: consumption-only sensor (no export direction).", historyFailed: "The hub has no stored history for this point yet.",
    tzPosixLabel: "Time zone (POSIX format)", tzHaBtn: "Use Home Assistant's zone", configVersion2: "Configuration version", nowMarker: "now", windowMarker: "cheap window",
    hubOffline: "The hub is offline. Settings, points and history are unavailable until it reconnects; the panel updates by itself.", offlineList: "The hub is offline — this list will load when it reconnects.",
    haCurrency: "Home Assistant's currency: {cur}", useHaCurrency: "Use {cur}", currencyMismatch: "The hub counts in {hub} but Home Assistant labels money as {ha}. Use one currency: enter {ha} here, or change Home Assistant's currency in Settings → System → General.", zoneCurrencyMismatch: "Zone {zone} prices are in {zone_cur}; the tariff plan and Home Assistant use {ha}. The hub needs the plan in {zone_cur} — change the plan currency on the Tariff tab and Home Assistant's currency in Settings → System → General.",
    boundInputs: "Bound inputs", reusePoint: "Reuse a retired point (its history comes back)", retiredPoint: "Retired point to bring back", hRetiredPoint: "The device keeps the ids of deleted points; pick the one this point continues. The name you enter above is kept.", noRetired: "No retired points on this hub. Deleted points can be brought back here.", hReuse: "A deleted point keeps its id reserved so its history is not mixed up; tick to continue one of them, otherwise the new point gets a fresh id.", tombstoned: "This id belongs to a deleted point. Tick “Reuse a retired point” and pick it to bring it back, or choose another name.", code_POINT_TAKEN: "This name is already used by another point.", code_SENSOR_BOUND: "This sensor channel already feeds a point — rebind or delete that point first.", code_ROLE_SUPPLY_LOCKED: "A supply point's role cannot be changed here.", code_NOT_PHASE_MODULE: "This module has no per-phase inputs, so a phase cannot be assigned.",
    signalFlags: "Signal thresholds", buyCheapBelow: "“Cheap” when buy below", sellLowBelow: "“Sell low” when sell below", peaks: "Import peaks (capacity tariff)", cycleDay: "Billing cycle starts on day", max15: "Highest 15-min average", maxHour: "Highest hour", top3: "Mean of the 3 highest days", noDyn: "This hub's firmware has no dynamic-price support; only the Home Assistant push below applies.",
    save: "Save", cancel: "Cancel", apply: "Apply", close: "Close", shortName: "Short name", ratedPower: "Rated power, W", maxCurrent: "Max current, A", phase: "Phase",
    invertSign: "Invert sign", ctModel: "CT clamp model", hCtModel: "The current clamp on this channel; the hub recalculates with the new model at once. Needs a calibrated module — otherwise the hub refuses and says so.", groupId: "Group", module: "Module", channel: "Channel", sensor: "Sensor channel", created: "Point created", saved: "Saved", deleted: "Point deleted",
    plan: "Plan", provider: "Provider", type: "Type", currency: "Currency", vat: "VAT, %", energyTax: "Energy tax /kWh", gridFee: "Grid fee /kWh", levy: "Renewable levy /kWh",
    zones: "Zones", zoneId: "Zone", buy: "Buy /kWh", sell: "Sell /kWh", conditions: "Conditions", enabled: "Enabled", active: "active now", placeholder: "This is the device's demo plan — replace it with your supplier's rates.",
    advanced: "Advanced: edit the plan as JSON", invalidJson: "Invalid JSON", tariffSaved: "Tariff plan applied", allIn: "all-in (fees + VAT)",
    i2c: "I2C buses and rbAmp modules", bus: "Bus", pins: "Pins", up: "up", down: "down", notConfigured: "not configured", scan: "Scan", add: "Add", addr: "Address", model: "Model", fw: "Firmware", pointsOn: "Points",
    changePins: "Change pins", sda: "SDA", scl: "SCL", rebootPending: "A restart is pending: pin changes apply after the device restarts.", scanResult: "Found on bus {bus}: {list}", nothingFound: "Nothing answered on bus {bus}",
    espnow: "ESP-NOW nodes", nodes: "Nodes", pair: "Pair (3 min)", pairCancel: "Cancel pairing", pairingOpen: "Pairing open, {s} s left", pairingClosed: "Pairing closed", chan: "Wi-Fi channel", paired: "paired",
    mac: "MAC", rssi: "RSSI", lastSeen: "Seen", period: "Period", disable: "Disable", enable: "Enable", remove: "Remove", channels: "Inputs", confirmRemove: "Remove node {mac}? Its points lose their source.",
    unit: "Point", range: "Range", h24: "24 h", d7: "7 days", d30: "30 days", d365: "365 days", hour: "hour", day: "day", week: "week", month: "month", year: "year",
    noRows: "No stored rows for this range.", importStats: "Import into HA statistics", imported: "Imported into long-term statistics", quality: "Quality", interval: "Interval", durationS: "Duration",
    statsHint: "Hourly energy and money are also imported into Home Assistant's long-term statistics every hour (at hh:02), so each point is available in the Energy dashboard and statistics cards.",
    kind: "Kind", level: "Level", message: "Message", time: "Time", noEvents: "No events since Home Assistant started.", all: "all", live: "live",
    error: "Error", deviceSays: "Device: ", actionMissing: "The ESPHome action for this hub is not registered: the device is offline or runs a firmware without rbgrid_cmd.",
    partsNote: "{n} parts, {ms} ms", v: "V", hz: "Hz", mainInput: "main", modules: "rbAmp modules online",
    extPrice: "External price", extActive: "active", extInactive: "not active — the tariff plan applies", extEntries: "Stored price entries", extClear: "Clear external prices", extCleared: "External prices cleared", extSource: "Source entity", extLastPush: "Last push", extHint: "Prices from an HA sensor (Nord Pool, ENTSO-e, Tibber…) replace the plan's energy rate for their time range; fees and VAT still apply. Configure the sensor in the integration's options (Settings → Devices & services → RBgrid → Configure), or call the action rbgrid.set_prices from an automation.", none: "none", configState: "config", configShort: "config", showDiag: "show diagnostics", health: "Hub health", uptime: "Uptime", wifi: "Wi-Fi signal", resetReason: "Reset reason", freeHeap: "Free memory", firmware: "Firmware image", rolledBack: "rolled back to the previous image", replayed: "from device log", notBound: "not bound", espnowCreateHint: "ESP-NOW points are created by the node when it pairs; configure its inputs under Network.", espnowOff: "ESP-NOW is off in the hub's settings — turn it on to pair nodes.", code_STARTING: "The hub is still starting — try again in a few seconds.",
  },
  ru: {
    overview: "Обзор", points: "Точки", tariff: "Тариф", network: "Сеть", history: "История", events: "События",
    online: "на связи", offline: "нет связи", noHubs: "Хаб RBgrid не настроен. Добавьте его: Настройки → Устройства и службы → Добавить интеграцию → RBgrid.",
    gridPower: "Мощность сети", today: "сегодня", lifetime: "всего", energyIn: "Потребление", energyOut: "Отдача", cost: "Стоимость", exportValue: "Выручка",
    buyPrice: "Цена покупки", sellPrice: "Цена продажи", zone: "Тарифная зона", configVersion: "Версия конфигурации", clock: "Часы", clockSet: "установлены", clockUnset: "не установлены",
    demoTariff: "демо-тариф", voltage: "Напряжение", frequency: "Частота", boot: "Последний запуск", refresh: "Обновить", loading: "Загрузка…",
    name: "Имя", role: "Роль", source: "Источник", slot: "Слот", power: "Мощность", current: "Ток", energy: "Энергия", state: "Состояние", actions: "Действия",
    present: "есть", absent: "нет", edit: "Изменить", delete: "Удалить", rebind: "Перепривязать", addPoint: "Добавить точку", noFreeSensors: "У каждого канала датчика уже есть точка. Чтобы добавить ещё одну, подключите модуль rbAmp (вкладка «Сеть»).",
    confirmDelete: "Удалить точку «{name}»? Её почасовая история останется во флеш-памяти устройства, но станет недоступна, а её долгосрочная статистика в Home Assistant перестанет пополняться.",
    confirmTitle: "Подтвердите", yesDelete: "Да, удалить", yesContinue: "Продолжить", hShortName: "До 8 символов для тесных мест (плитки веб-приложения)", hGroup: "Точки с одним номером группы суммируются в веб-приложении (0 — без группы)",
    hInvert: "Отметьте, если клещи надеты наоборот и точка показывает отрицательную мощность при потреблении", hRated: "Паспортная мощность — для подсказки о перегрузке, не для измерения", hMaxCur: "Номинал автомата — для подсказки о перегрузке", hPhase: "Какую фазу (фазы) измеряет точка",
    clockSynced: "Время синхронизировано ✓", clockUnsynced: "Время не синхронизировано — почасовая история помечается, пока хаб не получит время", goTariff: "откройте вкладку «Тариф» и введите свои ставки",
    loadGtSupply: "«{load}» насчитала больше энергии ({e_load}), чем главный ввод ({e_main}). Клещи точно стоят за вводом, не перепутано ли направление?",
    pinsConfirm: "Переключить шину {bus} на SDA {sda} / SCL {scl}? Новые выводы применятся после перезапуска устройства; модули на старых выводах до этого пропадут.", pinsSame: "SDA и SCL должны быть разными выводами.", durationMin: "Минут",
    zoneHours: "Часы", from: "с", to: "до",
    prices: "Цены", dynPrices: "Динамические цены", priceNow: "Цена сейчас", priceState: "Состояние", sourceNow: "Источник сейчас", validUntil: "Цены известны до", lastFetch: "Последняя загрузка", nextFetch: "Следующая загрузка", lastError: "Последняя ошибка",
    rank: "ранг", ofPeriods: "из {n} периодов сегодня", cheapNow: "сейчас дёшево", sellLowNow: "цена продажи низкая", provider: "Провайдер", backupProvider: "Запасной провайдер", noBackup: "нет", zoneSel: "Ценовая зона", haClass: "Что присылает Home Assistant",
    classSpot: "спот (биржевая цена, сборы и НДС добавляет план)", classAllIn: "полная (цена как в счёте)", factor: "Коэффициент", markup: "Наценка, {cur}/кВт·ч", zonesStack: "Прибавлять ставку зоны плана к споту (сетевые сборы по времени суток)", hourlyMean: "Считать каждую четверть по средней цене её часа",
    floorBuy: "Минимальная цена покупки (пусто = нет)", floorSell: "Минимальная цена продажи (пусто = нет)", sellMode: "Цена продажи", sellSource: "от провайдера, иначе из плана", sellPlan: "из плана", sellFormula: "формула: сырая × k − сбор", kSell: "k", feedinFee: "Сбор за отдачу, {cur}/кВт·ч",
    product: "Продукт на покупку", exportProduct: "Продукт на отдачу (пусто = нет)", token: "Токен (хранится на хабе, не показывается)", tokenSet: "токен сохранён", dynEnabled: "Динамические цены включены", dynOff: "Выключено: действуют только отправки из Home Assistant, как раньше",
    dynSaved: "Настройки цен применены", attribution: "Источник данных", resolved: "Цены по 15 минут", provSource: "провайдер", provBackup: "запасной", provHa: "из HA", provPlan: "план", raw: "сырая", allInBuy: "покупка (полная)", sellCol: "продажа", now: "сейчас", showAll: "показать все периоды", showNext: "показать только ближайшие 6 часов",
    ps_ok: "цены действуют", ps_backup: "работает запасной провайдер", ps_today_only: "цен на завтра ещё нет", ps_stale: "источник — Home Assistant, и сейчас ничего не покрыто: действует план", ps_plan_fallback: "сейчас ничего не покрыто: действует план", ps_disabled: "выключено",
    rules: "Дешёвые окна", rule: "Правило", kind: "Тип", k_threshold: "ниже цены", k_cheapest: "самые дешёвые периоды дня", k_deadline: "самые дешёвые периоды до срока", onBelow: "Вкл., когда покупка ≤", offAbove: "Выкл., когда покупка ≥", fromH: "Окно с (ч)", toH: "Окно до (ч)", periods: "Периодов (15 мин)", consecutive: "Подряд", deadlineH: "Срок (ч)",
    windowActive: "активно до {t}", windowNext: "следующий старт {t}", windowIdle: "окно не запланировано", addRule: "Добавить правило", rulesSaved: "Правила сохранены", confirmRuleDel: "Удалить правило «{name}»?", maxRules: "Хаб хранит до 8 правил.", rulesHint: "Хаб вычисляет окна по полной цене каждого 15-минутного периода и сообщает о них (сущность, событие, MQTT-сигнал); сам он ничего не включает. Включают и выключают устройства автоматизации Home Assistant.",
    hubTime: "Время хаба", timezone: "Часовой пояс", tzNotSet: "не задан — хаб живёт по UTC, поэтому суточные окна и зоны тарифа начинаются в полночь UTC", tzSetHa: "Взять пояс Home Assistant ({tz})", tzSaved: "Часовой пояс сохранён", tzPosix: "Строка POSIX TZ", localTime: "Местное время хаба",
    emptyPoints: "Точек пока нет. Они появляются, когда канал модуля или вход узла привязан — см. вкладку «Сеть».", emptySensors: "Нет каналов датчиков: подключите модуль rbAmp или сопрягите узел.", emptyNodes: "Узлы ещё не сопряжены. Нажмите «Сопряжение» и включите узел в течение 3 минут.", emptyRules: "Дешёвых окон пока нет. Добавьте правило, чтобы хаб отмечал дешёвые периоды.", emptyHistory: "Сохранённой истории по этой точке ещё нет — первый полный час появится в начале часа.",
    showMore: "Показать ещё {n}", total: "Итого", ruleType: "Тип правила", searchWindow: "Окно поиска", durationSel: "Время работы", finishBy: "Завершить к", allDay: "весь день", min: "мин", h: "ч", perKwh: "/кВт·ч",
    demoAlert: "На хабе всё ещё демо-тариф — суммы не совпадут со счётом, пока вы не введёте свои ставки.", openTariff: "Открыть тариф", consumptionOnlyNote: "Все строки: датчик без направления (отдача не измеряется).", historyFailed: "У хаба пока нет сохранённой истории по этой точке.",
    tzPosixLabel: "Часовой пояс (формат POSIX)", tzHaBtn: "Взять пояс Home Assistant", configVersion2: "Версия конфигурации", nowMarker: "сейчас", windowMarker: "дешёвое окно",
    hubOffline: "Хаб не на связи. Настройки, точки и история недоступны, пока он не переподключится; панель обновится сама.", offlineList: "Хаб не на связи — список загрузится после восстановления связи.",
    haCurrency: "Валюта Home Assistant: {cur}", useHaCurrency: "Взять {cur}", currencyMismatch: "Хаб считает в {hub}, а Home Assistant подписывает деньги как {ha}. Валюта должна быть одна: введите {ha} здесь или смените валюту Home Assistant в Настройки → Система → Общие.", zoneCurrencyMismatch: "Цены зоны {zone} в {zone_cur}; тарифный план и Home Assistant используют {ha}. Хабу нужен план в {zone_cur} — смените валюту плана на вкладке «Тариф» и валюту Home Assistant в Настройки → Система → Общие.",
    boundInputs: "Привязано входов", reusePoint: "Вернуть удалённую точку (вернётся её история)", retiredPoint: "Какую удалённую точку вернуть", hRetiredPoint: "Устройство хранит идентификаторы удалённых точек; выберите ту, которую продолжает эта точка. Имя, введённое выше, сохраняется.", noRetired: "Удалённых точек на этом хабе нет. Здесь можно вернуть удалённую точку.", hReuse: "Удалённая точка сохраняет свой идентификатор, чтобы её история не смешалась; отметьте, чтобы продолжить одну из них, иначе новая точка получит новый идентификатор.", tombstoned: "Этот идентификатор принадлежит удалённой точке. Отметьте «Вернуть удалённую точку» и выберите её, либо укажите другое имя.", code_POINT_TAKEN: "Это имя уже занято другой точкой.", code_SENSOR_BOUND: "Этот канал датчика уже привязан к точке — сначала перепривяжите или удалите её.", code_ROLE_SUPPLY_LOCKED: "Роль точки ввода здесь изменить нельзя.", code_NOT_PHASE_MODULE: "У этого модуля нет пофазных входов, фазу назначить нельзя.",
    signalFlags: "Пороги сигнала", buyCheapBelow: "«Дёшево», когда покупка ниже", sellLowBelow: "«Продажа низкая», когда продажа ниже", peaks: "Пики потребления (тариф за мощность)", cycleDay: "Расчётный период начинается с числа", max15: "Наибольшее 15-мин среднее", maxHour: "Наибольший час", top3: "Среднее 3 наибольших дней", noDyn: "Прошивка этого хаба не поддерживает динамические цены; действует только отправка из Home Assistant ниже.",
    save: "Сохранить", cancel: "Отмена", apply: "Применить", close: "Закрыть", shortName: "Короткое имя", ratedPower: "Номинальная мощность, Вт", maxCurrent: "Макс. ток, А", phase: "Фаза",
    invertSign: "Инвертировать знак", ctModel: "Модель токовых клещей", hCtModel: "Клещи на этом канале; хаб сразу пересчитывает с новой моделью. Нужен откалиброванный модуль — иначе хаб откажет и скажет об этом.", groupId: "Группа", module: "Модуль", channel: "Канал", sensor: "Канал датчика", created: "Точка создана", saved: "Сохранено", deleted: "Точка удалена",
    plan: "План", provider: "Поставщик", type: "Тип", currency: "Валюта", vat: "НДС, %", energyTax: "Налог на энергию /кВт·ч", gridFee: "Сетевой сбор /кВт·ч", levy: "Сбор ВИЭ /кВт·ч",
    zones: "Зоны", zoneId: "Зона", buy: "Покупка /кВт·ч", sell: "Продажа /кВт·ч", conditions: "Условия", enabled: "Включена", active: "активна сейчас", placeholder: "Это демо-план устройства — замените его тарифами вашего поставщика.",
    advanced: "Расширенно: править план как JSON", invalidJson: "Некорректный JSON", tariffSaved: "Тарифный план применён", allIn: "полная (сборы + НДС)",
    i2c: "Шины I2C и модули rbAmp", bus: "Шина", pins: "Выводы", up: "работает", down: "не работает", notConfigured: "не настроена", scan: "Сканировать", add: "Добавить", addr: "Адрес", model: "Модель", fw: "Прошивка", pointsOn: "Точек",
    changePins: "Сменить выводы", sda: "SDA", scl: "SCL", rebootPending: "Ожидается перезапуск: смена выводов применится после перезагрузки устройства.", scanResult: "На шине {bus} найдено: {list}", nothingFound: "На шине {bus} никто не ответил",
    espnow: "Узлы ESP-NOW", nodes: "Узлы", pair: "Сопряжение (3 мин)", pairCancel: "Отменить сопряжение", pairingOpen: "Сопряжение открыто, осталось {s} с", pairingClosed: "Сопряжение закрыто", chan: "Канал Wi-Fi", paired: "сопряжено",
    mac: "MAC", rssi: "RSSI", lastSeen: "Виден", period: "Период", disable: "Выключить", enable: "Включить", remove: "Удалить", channels: "Входы", confirmRemove: "Удалить узел {mac}? Его точки потеряют источник.",
    unit: "Точка", range: "Диапазон", h24: "24 ч", d7: "7 дней", d30: "30 дней", d365: "365 дней", hour: "час", day: "день", week: "неделя", month: "месяц", year: "год",
    noRows: "Нет сохранённых строк за этот диапазон.", importStats: "Импортировать в статистику HA", imported: "Импортировано в долгосрочную статистику", quality: "Качество", interval: "Интервал", durationS: "Длительность",
    statsHint: "Почасовые энергия и деньги каждый час (в чч:02) импортируются в долгосрочную статистику Home Assistant, поэтому каждая точка доступна в Energy dashboard и карточках статистики.",
    kind: "Тип", level: "Уровень", message: "Сообщение", time: "Время", noEvents: "Событий с момента запуска Home Assistant нет.", all: "все", live: "онлайн",
    error: "Ошибка", deviceSays: "Устройство: ", actionMissing: "Действие ESPHome для этого хаба не зарегистрировано: устройство не на связи или прошивка без rbgrid_cmd.",
    partsNote: "{n} частей, {ms} мс", v: "В", hz: "Гц", mainInput: "ввод", modules: "Модули rbAmp онлайн",
    extPrice: "Внешняя цена", extActive: "активна", extInactive: "не активна — действует тарифный план", extEntries: "Сохранённые записи цен", extClear: "Сбросить внешние цены", extCleared: "Внешние цены сброшены", extSource: "Сенсор-источник", extLastPush: "Последняя отправка", extHint: "Цены из сенсора HA (Nord Pool, ENTSO-e, Tibber…) заменяют энергетическую ставку плана на свой интервал; сборы и НДС применяются по-прежнему. Укажите сенсор в параметрах интеграции (Настройки → Устройства и службы → RBgrid → Настроить) или вызывайте действие rbgrid.set_prices из автоматизации.", none: "нет", configState: "конфиг", configShort: "конфиг", showDiag: "показывать диагностику", health: "Состояние хаба", uptime: "Время работы", wifi: "Сигнал Wi-Fi", resetReason: "Причина перезапуска", freeHeap: "Свободная память", firmware: "Образ прошивки", rolledBack: "откат на предыдущий образ", replayed: "из журнала устройства", notBound: "не привязан", espnowCreateHint: "Точки ESP-NOW создаёт сам узел при сопряжении; его входы настраиваются на вкладке «Сеть».", espnowOff: "ESP-NOW выключен в настройках хаба — включите его, чтобы сопрягать ноды.", code_STARTING: "Хаб ещё запускается — повторите через несколько секунд.",
  },
};

const TABS = ["overview", "points", "tariff", "prices", "network", "history", "events"];
const PROV_CLASS = { source: "src", backup: "bak", ha_push: "ha", plan: "plan" };
const RANGES = { h24: 24 * 3600, d7: 7 * 86400, d30: 30 * 86400, d365: 365 * 86400 };
const Q_BITS = ["PARTIAL", "TIME_UNSYNC", "CLOCK_STEP", "SRC_GAP", "RECOMPUTED", "ESTIMATED", "UNSIGNED_SRC", "OVERRANGE", "MIGRATED", "SRC_RESTART", "SRC_FW", "REVERSE_LOST", "OUTAGE"];

const Q_LABELS = {
  en: { PARTIAL: "partial period", TIME_UNSYNC: "clock not synced", CLOCK_STEP: "clock adjusted", SRC_GAP: "sensor gap", RECOMPUTED: "recomputed", ESTIMATED: "estimated", UNSIGNED_SRC: "consumption-only sensor", OVERRANGE: "over range", MIGRATED: "migrated", SRC_RESTART: "sensor restarted", SRC_FW: "sensor firmware changed", REVERSE_LOST: "direction lost", OUTAGE: "outage" },
  ru: { PARTIAL: "неполный период", TIME_UNSYNC: "часы не синхронизированы", CLOCK_STEP: "коррекция часов", SRC_GAP: "пропуск датчика", RECOMPUTED: "пересчитано", ESTIMATED: "оценка", UNSIGNED_SRC: "датчик без направления", OVERRANGE: "перегрузка диапазона", MIGRATED: "перенесено", SRC_RESTART: "датчик перезапущен", SRC_FW: "прошивка датчика сменилась", REVERSE_LOST: "направление потеряно", OUTAGE: "отключение" },
};
const PLAN_TYPES = {
  en: { SIMPLE: "single rate", TWO_ZONE: "two zones (day/night)", THREE_ZONE: "three zones", MULTI_ZONE: "several zones", PROGRESSIVE: "progressive tiers", SEASONAL: "seasonal", DYNAMIC: "dynamic", CUSTOM: "custom" },
  ru: { SIMPLE: "одна ставка", TWO_ZONE: "две зоны (день/ночь)", THREE_ZONE: "три зоны", MULTI_ZONE: "несколько зон", PROGRESSIVE: "прогрессивные ступени", SEASONAL: "сезонный", DYNAMIC: "динамический", CUSTOM: "пользовательский" },
};
const ROLE_LABELS = {
  en: { MAIN_SUPPLY: "Main supply", ALTERNATIVE_SUPPLY: "Alternative supply", CIRCUIT_BREAKER: "Circuit breaker", DEVICE_LOAD: "Device load", ZONE_LOAD: "Zone load", RENEWABLE_SOURCE: "Renewable source", STORAGE_SYSTEM: "Storage system", EV_CHARGING: "EV charging", HEATING_COOLING: "Heating / cooling", SMART_APPLIANCE: "Smart appliance" },
  ru: { MAIN_SUPPLY: "Главный ввод", ALTERNATIVE_SUPPLY: "Резервный ввод", CIRCUIT_BREAKER: "Автомат", DEVICE_LOAD: "Нагрузка", ZONE_LOAD: "Зона", RENEWABLE_SOURCE: "ВИЭ", STORAGE_SYSTEM: "Накопитель", EV_CHARGING: "Зарядка электромобиля", HEATING_COOLING: "Отопление / охлаждение", SMART_APPLIANCE: "Умный прибор" },
};
const PHASE_LABELS = {
  en: { "1P": "single phase", L1: "L1", L2: "L2", L3: "L3", "3P": "3-phase", L1L2: "L1–L2", L2L3: "L2–L3", L1L3: "L1–L3", SPLIT: "split phase", UNKNOWN: "unknown" },
  ru: { "1P": "одна фаза", L1: "L1", L2: "L2", L3: "L3", "3P": "три фазы", L1L2: "L1–L2", L2L3: "L2–L3", L1L3: "L1–L3", SPLIT: "расщеплённая фаза", UNKNOWN: "не задана" },
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hex4 = (n) => (typeof n === "number" ? n.toString(16).toUpperCase().padStart(4, "0") : String(n ?? "").replace(/^0x/i, "").toUpperCase().replace(/[^0-9A-F]/g, ""));
const hexAddr = (a) => (a === null || a === undefined || a === "" || Number.isNaN(Number(a)) ? String(a ?? "") : `0x${Number(a).toString(16).toUpperCase().padStart(2, "0")}`);
const num = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

const CSS = `
:host { display:block; color: var(--primary-text-color); background: var(--primary-background-color); min-height:100%; font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); }
*:focus-visible { outline:2px solid var(--primary-color); outline-offset:2px; }
.toolbar { position:sticky; top:0; z-index:5; display:flex; align-items:center; gap:12px; height:56px; padding:0 12px; background: var(--app-header-background-color, var(--card-background-color,#fff)); color: var(--app-header-text-color, var(--primary-text-color)); border-bottom:1px solid var(--divider-color,#e0e0e0); }
.toolbar h1 { font-size:20px; font-weight:400; margin:0; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.toolbar .menu { --mdc-icon-size:24px; cursor:pointer; display:flex; }
.toolbar .act { display:none; position:absolute; left:0; right:0; bottom:-1px; height:2px; background: var(--primary-color); }
.toolbar.busy .act { display:block; animation: rbg-slide 1.2s linear infinite; }
@keyframes rbg-slide { 0% { transform: scaleX(.2); transform-origin:left; } 50% { transform: scaleX(1); transform-origin:left; } 51% { transform-origin:right; } 100% { transform: scaleX(.2); transform-origin:right; } }
.chip { display:inline-flex; align-items:center; gap:6px; height:28px; padding:0 10px; border-radius:14px; font-size:12px; background: var(--secondary-background-color,#f1f1f1); border:1px solid var(--divider-color,#e0e0e0); color: var(--primary-text-color); white-space:nowrap; }
.chip.ok::before, .chip.bad::before { content:""; width:8px; height:8px; border-radius:50%; background: var(--success-color,#43a047); }
.chip.bad::before { background: var(--error-color,#db4437); }
select.hub { height:36px; background: var(--card-background-color,#fff); color: var(--primary-text-color); border:1px solid var(--divider-color,#bbb); border-radius:18px; padding:0 10px; font-size:14px; max-width:220px; }
.tabs { display:flex; gap:4px; padding:0 8px; background: var(--app-header-background-color, var(--card-background-color,#fff)); border-bottom:1px solid var(--divider-color,#e0e0e0); overflow-x:auto; scrollbar-width:none; }
.tabs::-webkit-scrollbar { display:none; }
.tabs button { flex:0 0 auto; height:48px; background:none; border:0; color: var(--app-header-text-color, var(--primary-text-color)); opacity:.7; padding:0 16px; font-size:14px; font-weight:500; cursor:pointer; border-bottom:2px solid transparent; white-space:nowrap; }
.tabs button.on { opacity:1; color: var(--primary-color); border-bottom-color: var(--primary-color); }
.tabs button:focus-visible { outline-offset:-3px; }
.hours { flex-wrap:nowrap; }
main { padding:16px; max-width:1200px; margin:0 auto; box-sizing:border-box; }
#busy { display:none; }
.grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:12px; align-items:start; }
.card { background: var(--card-background-color,#fff); border-radius: var(--ha-card-border-radius,12px); box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.2)); padding:14px 16px; box-sizing:border-box; margin-bottom:12px; }
.card h2 { font-size:16px; font-weight:500; margin:0 0 10px; display:flex; flex-wrap:wrap; align-items:center; gap:8px; row-gap:8px; }
.card h2 .sp { flex:1; }
.card h3.sub { font-size:13px; font-weight:500; color: var(--secondary-text-color); margin:16px 0 6px; }
.eyebrow { font-size:12px; color: var(--secondary-text-color); margin-bottom:2px; }
.big { font-size:32px; font-weight:400; line-height:1.15; font-variant-numeric: tabular-nums; }
.big small, .big .u { font-size:18px; color: var(--secondary-text-color); margin-left:4px; font-weight:400; }
.kv { display:flex; justify-content:space-between; gap:12px; padding:4px 0; font-size:14px; }
.kv > span:first-child { flex:0 1 auto; color: var(--secondary-text-color); }
.kv > span:last-child { flex:1 1 auto; font-variant-numeric: tabular-nums; text-align:right; overflow-wrap:anywhere; }
.card.wide .kv { justify-content:flex-start; gap:16px; }
.card.wide .kv > span:first-child { flex:0 0 200px; }
.card.wide .kv > span:last-child { text-align:left; }
.muted { color: var(--secondary-text-color); font-size:12px; }
a { color: var(--primary-color); }
table { width:100%; border-collapse:collapse; font-size:14px; }
th, td { text-align:left; padding:8px 8px; border-bottom:1px solid var(--divider-color,#e0e0e0); vertical-align:middle; }
th { color: var(--secondary-text-color); font-weight:500; font-size:12px; }
td.n, th.n { text-align:right; font-variant-numeric: tabular-nums; white-space:nowrap; }
tr.dim td { color: var(--disabled-text-color,#9e9e9e); }
tr.now td { font-weight:600; }
td.empty { color: var(--secondary-text-color); text-align:center; padding:20px 8px; font-size:13px; }
.tbl { overflow-x:auto; position:relative; }
button.b, .b { display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:40px; background: var(--primary-color); color: var(--text-primary-color,#fff); border:0; border-radius:20px; padding:0 16px; font-size:14px; font-weight:500; cursor:pointer; white-space:nowrap; }
button.b.o { background:transparent; color: var(--primary-color); border:1px solid var(--primary-color); }
button.b.d { background: var(--error-color,#db4437); }
button.b.s { min-height:36px; padding:0 12px; font-size:13px; }
button.b:disabled { opacity:.5; cursor:default; }
button.x { position:absolute; top:12px; right:12px; width:40px; height:40px; border:0; border-radius:20px; background:transparent; color: var(--secondary-text-color); font-size:22px; cursor:pointer; }
button.x:hover { background: var(--secondary-background-color,#eee); }
.row { display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end; }
.row > label.c { min-height:40px; }
input, select, textarea { font: inherit; color: inherit; background: var(--card-background-color,#fff); border:1px solid var(--divider-color,#bbb); border-radius:8px; padding:0 10px; min-height:40px; box-sizing:border-box; }
textarea { width:100%; min-height:260px; padding:10px; font-family: ui-monospace, Menlo, Consolas, monospace; font-size:12px; }
input[type=checkbox] { width:20px; height:20px; min-height:0; margin:0; flex:0 0 20px; accent-color: var(--primary-color); }
label.f { display:flex; flex-direction:column; gap:4px; font-size:12px; color: var(--secondary-text-color); flex:1 1 160px; min-width:140px; max-width:320px; }
label.f > input, label.f > select { width:100%; font-size:14px; color: var(--primary-text-color); }
label.f > span.v { font-size:14px; color: var(--primary-text-color); min-height:40px; display:flex; align-items:center; }
.c { display:flex; align-items:center; gap:10px; font-size:14px; }
td.nowrap { white-space:nowrap; } select.hm { width:auto; min-height:36px; padding:0 6px; }
td.evday { font-size:12px; font-weight:500; color: var(--secondary-text-color); padding-top:14px; }
.hint { font-size:12px; color: var(--secondary-text-color); }
.alert { display:flex; gap:10px; align-items:flex-start; border-radius:8px; padding:10px 14px; margin-bottom:12px; font-size:14px; border-left:4px solid; }
.alert .ic { flex:0 0 auto; font-size:18px; line-height:1.2; }
.alert .body { flex:1; }
.alert .b { margin-left:auto; }
.err, .alert.err { background: color-mix(in srgb, var(--error-color,#db4437) 12%, transparent); border-left-color: var(--error-color,#db4437); color: var(--primary-text-color); border-radius:8px; padding:10px 14px; margin-bottom:12px; white-space:pre-wrap; }
.msg, .alert.msg { background: color-mix(in srgb, var(--success-color,#43a047) 12%, transparent); border-left:4px solid var(--success-color,#43a047); color: var(--primary-text-color); border-radius:8px; padding:10px 14px; margin-bottom:12px; }
.warn, .alert.warn { background: color-mix(in srgb, var(--warning-color,#ffa600) 14%, transparent); border-left:4px solid var(--warning-color,#ffa600); color: var(--primary-text-color); border-radius:8px; padding:10px 14px; margin-bottom:12px; }
.badge { display:inline-flex; align-items:center; height:22px; padding:0 8px; border-radius:11px; font-size:12px; font-weight:500; background: var(--secondary-background-color,#eee); color: var(--primary-text-color); white-space:nowrap; }
.badge.fail { background: color-mix(in srgb, var(--error-color,#db4437) 15%, transparent); color: var(--error-color,#db4437); }
.badge.ok { background: color-mix(in srgb, var(--success-color,#43a047) 15%, transparent); color: var(--success-color,#2e7d32); }
.badge.warnb, .badge.bak { background: color-mix(in srgb, var(--warning-color,#ffa600) 22%, transparent); color: var(--primary-text-color); }
.badge.src { background: color-mix(in srgb, var(--primary-color) 15%, transparent); color: var(--primary-color); }
.badge.ha { background: color-mix(in srgb, var(--success-color,#43a047) 15%, transparent); color: var(--success-color,#2e7d32); }
.badge.plan { background: var(--secondary-background-color,#eee); color: var(--secondary-text-color); }
.dlg-bg { position:fixed; inset:0; background: rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:20; padding:16px; }
.dlg { position:relative; background: var(--card-background-color,#fff); border-radius:12px; padding:20px; width:min(560px, 100%); max-height:90vh; overflow:auto; box-shadow:0 8px 32px rgba(0,0,0,.3); }
.dlg h3 { margin:0 0 4px; padding-right:44px; font-weight:500; font-size:18px; }
.dlg .subtitle { font-size:12px; color: var(--secondary-text-color); margin-bottom:14px; }
.dlg .fields { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:14px; margin-bottom:16px; }
.dlg .fields label.f { max-width:none; }
.dlg .fields label.f input:not([type=checkbox]), .dlg .fields label.f select { width:100%; }
.dlg .fields label.f .c { color: var(--primary-text-color); min-height:40px; }
.dlg .acts { display:flex; justify-content:flex-end; gap:8px; }
svg.chart, svg.pchart { width:100%; display:block; }
svg.chart { height:220px; } svg.pchart { height:200px; }
svg.chart rect.in { fill: var(--primary-color); }
svg.chart rect.out { fill: var(--success-color,#43a047); }
svg.chart text, svg.pchart text { fill: var(--secondary-text-color); font-size:11px; }
svg.chart line, svg.pchart line { stroke: var(--divider-color,#ddd); }
svg.pchart rect.src { fill: var(--primary-color); } svg.pchart rect.bak { fill: var(--warning-color,#ffa600); } svg.pchart rect.ha { fill: var(--success-color,#43a047); } svg.pchart rect.plan { fill: var(--disabled-text-color,#9e9e9e); }
svg.pchart rect.now { fill: none; stroke: var(--error-color,#db4437); stroke-width:2; }
svg.pchart rect.win { fill: var(--success-color,#43a047); opacity:.12; }
svg.pchart rect.hit { fill: transparent; cursor:pointer; }
.legend { display:flex; flex-wrap:wrap; gap:10px; font-size:12px; color: var(--secondary-text-color); align-items:center; }
.legend i { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:4px; vertical-align:-1px; }
.ev { display:grid; grid-template-columns: 90px 120px 1fr; gap:8px; padding:6px 0; border-bottom:1px solid var(--divider-color,#eee); font-size:13px; align-items:baseline; }
.ev.fail .m { color: var(--error-color,#db4437); }
.ev .m { overflow-wrap:anywhere; }
.evday { font-size:12px; font-weight:500; color: var(--secondary-text-color); padding:12px 0 4px; }
@media (max-width:700px) {
  .toolbar h1 { font-size:16px; } main { padding:10px; }
  .tabs button { padding:0 12px; }
  .card { padding:12px; } .big { font-size:28px; }
  .card.wide .kv { flex-direction:column; gap:2px; } .card.wide .kv > span:first-child { flex-basis:auto; }
  .tabs { mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); }
  .hours { flex-wrap:wrap; } td.nowrap { white-space:normal; }
  .tbl:not(.nostack) table, .tbl:not(.nostack) thead, .tbl:not(.nostack) tbody, .tbl:not(.nostack) tr, .tbl:not(.nostack) td { display:block; }
  .tbl:not(.nostack) thead { display:none; }
  .tbl:not(.nostack) tr { border-bottom:1px solid var(--divider-color,#e0e0e0); padding:8px 0; }
  .tbl:not(.nostack) tr:has(td.empty) { border:0; }
  .tbl:not(.nostack) td { border:0; padding:3px 0; display:flex; justify-content:space-between; gap:12px; text-align:right; }
  .tbl:not(.nostack) td::before { content: attr(data-label); color: var(--secondary-text-color); font-size:12px; text-align:left; flex:0 0 40%; }
  .tbl:not(.nostack) td[data-label=""]::before, .tbl:not(.nostack) td.row::before, .tbl:not(.nostack) td.empty::before { display:none; }
  .tbl:not(.nostack) td.n { white-space:normal; }
  .tbl:not(.nostack) td.row { justify-content:flex-start; gap:8px; padding-top:8px; } .tbl:not(.nostack) td.row .b { flex:1 1 auto; }
  .tbl:not(.nostack) td.empty { display:block; text-align:center; }
  .tbl:not(.nostack) td:empty { display:none; }
  .tbl:not(.nostack) td.evday { display:block; text-align:left; padding:10px 0 2px; } .tbl:not(.nostack) td.evday::before { display:none; }
  .tbl.nostack th, .tbl.nostack td { padding:6px 4px; font-size:13px; }
  .ev { grid-template-columns: 1fr; gap:2px; }
  .toolbar .chip[title] { display:none; }
  label.f { max-width:none; }
}
`;

class RbgridPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.s = {
      tab: localStorage.getItem("rbgrid.tab") || "overview",
      hubs: [], hub: null, ents: null, schema: null,
      data: {}, error: null, msg: null, busy: 0, dialog: null,
      events: [], evFilter: "all", evSub: null,
      hist: { unit: null, period: "hour", range: "h24", series: null },
      showJson: false, scan: null,
    };
    this._timers = [];
    this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
    this.shadowRoot.addEventListener("change", (e) => this._onChange(e));
    this.shadowRoot.addEventListener("submit", (e) => this._onSubmit(e));
    this._onKey = (e) => { if (e.key === "Escape" && this.s.dialog) this._closeDialog(false); };
  }
  connectedCallback() {
    document.addEventListener("keydown", this._onKey);
    if (!this._ro && typeof ResizeObserver !== "undefined") {
      this._ro = new ResizeObserver((entries) => { const w = entries[0]?.contentRect?.width || 0; if (Math.abs(w - (this._w || 0)) > 24) { const had = this._w; this._w = w; if (had && (this.s.tab === "prices" || this.s.tab === "history") && this._hass) this.render(); } });
      this._ro.observe(this);
    }
  }

  set hass(h) { const first = !this._hass; this._hass = h; if (first) this._init(); else this._live(); }
  get hass() { return this._hass; }
  set narrow(v) { this._narrow = v; }
  set panel(v) { this._panel = v; }
  set route(v) { this._route = v; }
  disconnectedCallback() { document.removeEventListener("keydown", this._onKey); if (this._ro) { this._ro.disconnect(); this._ro = null; } this._clearTimers(); if (this.s.evSub) { this.s.evSub.then((u) => u()); this.s.evSub = null; } }

  t(k, vars) { const lang = (this._hass?.language || "en").slice(0, 2); let s = (STR[lang] || STR.en)[k] ?? STR.en[k] ?? k; if (vars) for (const [a, b] of Object.entries(vars)) s = s.replace(`{${esc(a)}}`, esc(b)); return s; }

  // ------------------------------------------------------------------ data
  async _init() {
    try {
      this.s.hubs = await this._hass.callWS({ type: "rbgrid/hubs" });
      const want = localStorage.getItem("rbgrid.hub");
      this.s.hub = this.s.hubs.find((h) => h.entry_id === want) || this.s.hubs[0] || null;
      if (this.s.hub) await this._loadHub();
    } catch (e) { this.s.error = e.message || String(e); }
    this.render();
    this._loadTab();
  }
  async _loadHub() {
    this.s.ents = await this._hass.callWS({ type: "rbgrid/entities", entry_id: this.s.hub.entry_id });
    this.s.data = {}; this.s.schema = null; this.s.hist.series = null; this.s.events = [];
    if (this.s.evSub) { this.s.evSub.then((u) => u()); this.s.evSub = null; }
  }
  async _call(command, opts = {}) {
    if (!this.s.hub) throw new Error(this.t("noHubs"));
    this.s.busy++; if (!opts.quiet) this._renderBusy();
    try {
      const r = await this._hass.callWS({ type: "rbgrid/call", entry_id: this.s.hub.entry_id, command });
      this.s.lastCall = r;
      if (r.config_version) this.s.hub.config_version = r.config_version;
      return r.data;
    } catch (e) {
      const m = e?.message || e?.error?.message || String(e);
      throw new Error(m);
    } finally { this.s.busy--; this._renderBusy(); }
  }
  async _get(section, extra) { return this._call({ cmd: "get", section, ...(extra || {}) }); }
  async _load(key, section, extra, force) {
    if (!force && this.s.data[key]) return this.s.data[key];
    const d = await this._get(section, extra); this.s.data[key] = d; return d;
  }
  async _schema() { if (!this.s.schema) this.s.schema = await this._get("schema"); return this.s.schema; }
  _invalidate(...keys) { for (const k of keys) delete this.s.data[k]; }

  async _loadTab() {
    this._clearTimers(); this.s.error = null;
    if (!this.s.hub) return;
    const tab = this.s.tab; const seq = (this._loadSeq = (this._loadSeq || 0) + 1); const stale = () => seq !== this._loadSeq;
    try {
      if (tab === "overview") { await Promise.all([this._load("tele", "telemetry_data", null, true), this._load("units", "units")]); const hubs = await this._hass.callWS({ type: "rbgrid/hubs" }); const h = hubs.find((x) => x.entry_id === this.s.hub.entry_id); if (h) this.s.hub = { ...this.s.hub, ...h }; if (stale()) return; this._timers.push(setInterval(() => this._refreshTele(), 10000)); }
      else if (tab === "points") { await Promise.all([this._load("units", "units"), this._load("sensors", "sensors"), this._schema(), this._load("tele", "telemetry_data")]); }
      else if (tab === "tariff") { await Promise.all([this._load("tariff", "tariff"), this._load("price", "price", null, true), this._schema()]); const hubs = await this._hass.callWS({ type: "rbgrid/hubs" }); const h = hubs.find((x) => x.entry_id === this.s.hub.entry_id); if (h) this.s.hub = { ...this.s.hub, ...h }; }
      else if (tab === "prices") {
        await Promise.all([this._schema(), this._load("price", "price", null, true)]);
        if (this._dynSupported()) { await Promise.all([this._load("dynprice", "dynprice", null, true), this._load("rules", "rules", null, true), this._load("signal", "signal", null, true), this._load("peaks", "peaks", null, true).catch(() => null), this._load("time", "time", null, true).catch(() => null)]); this.s.dyn = null; }
        const hubs = await this._hass.callWS({ type: "rbgrid/hubs" }); const h = hubs.find((x) => x.entry_id === this.s.hub.entry_id); if (h) this.s.hub = { ...this.s.hub, ...h };
        if (stale()) return;
        this._timers.push(setInterval(() => this._refreshPrices(), 30000));
      }
      else if (tab === "network") { await Promise.all([this._load("i2c", "i2c"), this._load("espnow", "espnow"), this._schema()]); if (stale()) return; if (this.s.data.espnow?.pairing_open) this._timers.push(setInterval(() => this._refreshEspnow(), 5000)); }
      else if (tab === "history") { await Promise.all([this._load("units", "units"), this._schema()]); if (!this.s.hist.unit) this.s.hist.unit = this._unitList()[0]?.hex || "0100"; await this._loadSeries(); }
      else if (tab === "events") { this.s.events = await this._hass.callWS({ type: "rbgrid/events", entry_id: this.s.hub.entry_id }); this._subscribeEvents(); }
    } catch (e) { if (!stale()) this.s.error = e.message; }
    if (stale()) return;
    this.render();
  }
  async _refreshTele() { try { await this._load("tele", "telemetry_data", null, true); this.render(); } catch (e) { /* keep last */ } }
  async _refreshEspnow() { try { await this._load("espnow", "espnow", null, true); this.render(); } catch (e) { /* keep last */ } }
  async _refreshPrices() { if (this.s.dialog || this.s.dyn) return; try { await this._load("signal", "signal", null, true); if (this._dynSupported()) await this._load("rules", "rules", null, true); this.render(); } catch (e) { /* keep last */ } }
  _dynSupported() { return Boolean(this.s.schema?.capabilities?.dynamicTariffs); }
  _clearTimers() { for (const t of this._timers) clearInterval(t); this._timers = []; }
  _subscribeEvents() {
    if (this.s.evSub) return;
    this.s.evSub = this._hass.connection.subscribeMessage((ev) => { this.s.events.push(ev); if (this.s.events.length > 300) this.s.events.shift(); if (this.s.tab === "events") this.render(); },
      { type: "rbgrid/subscribe_events", entry_id: this.s.hub.entry_id });
  }
  async _loadSeries() {
    const h = this.s.hist; const now = Math.floor(Date.now() / 1000);
    const cmd = { cmd: "series", unit: h.unit, period: h.period, from: now - RANGES[h.range], to: now + 1, limit: 720 };
    h.series = await this._call(cmd);
  }

  // ------------------------------------------------------------------ helpers
  _unitList() {
    const raw = this.s.data.units?.data?.units || this.s.data.units?.units || [];
    return raw.map((u) => ({ ...u, hex: hex4(u.unit_id) }));
  }
  _slotByName(name) { const slots = this.s.ents?.slots || {}; for (const [n, m] of Object.entries(slots)) if (this._st(m.Name)?.state === name) return n; return null; }
  _st(item) { return item ? this._hass.states[item.entity_id] : undefined; }
  _hubSt(key) { return this._st(this.s.ents?.hub?.[key]); }
  _slotSt(slot, key) { return this._st(this.s.ents?.slots?.[slot]?.[key]); }
  _val(st, digits) { if (!st || st.state === "unknown" || st.state === "unavailable") return "—"; const n = Number(st.state); return Number.isFinite(n) ? n.toFixed(digits) : esc(st.state); }
  _unitOf(st) { return st?.attributes?.unit_of_measurement || ""; }
  _lang() { return this._hass?.locale?.language || this._hass?.language || undefined; }
  _money(v, cur, d) {
    const n = num(v); if (n === null) return "—"; const c = cur || this._currency(); const digits = d ?? (Math.abs(n) < 1 && n !== 0 ? 4 : 2);
    try { if (/^[A-Z]{3}$/.test(c)) return new Intl.NumberFormat(this._lang(), { style: "currency", currency: c, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n); } catch { /* fall through */ }
    return `${n.toFixed(digits)} ${esc(c)}`;
  }
  _fmt(unix, o = {}) {
    if (!unix) return "—"; const d = new Date(unix * 1000); const opt = { hour: "2-digit", minute: "2-digit", hour12: false };
    if (o.seconds) opt.second = "2-digit";
    if (o.date !== false) { opt.day = "numeric"; opt.month = "short"; if (o.weekday) opt.weekday = "short"; }
    if (o.year) opt.year = "numeric";
    try { return new Intl.DateTimeFormat(this._lang(), opt).format(d); } catch { return d.toLocaleString(); }
  }
  _day(unix) { try { return new Intl.DateTimeFormat(this._lang(), { weekday: "long", day: "numeric", month: "long" }).format(new Date(unix * 1000)); } catch { return new Date(unix * 1000).toDateString(); } }
  _ticks(max, n = 4) { if (!(max > 0)) return [0]; const raw = max / n; const mag = 10 ** Math.floor(Math.log10(raw)); const step = [1, 2, 5, 10].map((k) => k * mag).find((k) => k >= raw) || mag; const out = []; for (let v = 0; v < max + step - 1e-9; v += step) out.push(Number(v.toFixed(6))); if (out[out.length - 1] < max) out.push(Number((out[out.length - 1] + step).toFixed(6))); return out; }
  _chartW() { return Math.max(320, Math.round((this._w || this.getBoundingClientRect().width || 1000) - (this._w && this._w < 700 ? 44 : 64))); }
  _currency() { return this.s.data.tariff?.data?.list?.[0]?.currency_code || this.s.data.tele?.system?.tariff?.currency || this._unitOf(this._hubSt("Cost")) || ""; }
  _wh(v) { const n = num(v); if (n === null) return "—"; return Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(3)} kWh` : `${n.toFixed(1)} Wh`; }
  _ts(unix) { return this._fmt(unix); }
  _qBits(q) { const out = []; for (let i = 0; i < Q_BITS.length; i++) if (q & (1 << i)) out.push(Q_BITS[i]); return out; }
  _lbl(table, key) { const lang = (this._hass?.language || "en").slice(0, 2); return (table[lang] || table.en)[key] || table.en[key] || esc(key); }
  _uptime(st) { const n = Number(st?.state); if (!st || !Number.isFinite(n)) return "—"; const d = Math.floor(n / 86400), h = Math.floor((n % 86400) / 3600), m = Math.floor((n % 3600) / 60); return d ? `${esc(d)} d ${esc(h)} h` : h ? `${esc(h)} h ${esc(m)} min` : `${esc(m)} min`; }
  _kb(st) { const n = Number(st?.state); return st && Number.isFinite(n) ? `${(n / 1024).toFixed(0)} kB` : "—"; }
  _roleName(r) { if (!r) return ""; const lang = (this._hass?.language || "en").slice(0, 2); return (ROLE_LABELS[lang] || ROLE_LABELS.en)[r] || ROLE_LABELS.en[r] || esc(String(r).replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())); }
  _phaseName(p) { const ph = this.s.schema?.enums?.phase; const code = ph ? ph[String(p)] || String(p) : String(p); return this._lbl(PHASE_LABELS, code); }
  _confirm(text, yesLabel) { return new Promise((resolve) => { this.s.dialog = { kind: "confirm", text, yes: yesLabel || this.t("yesContinue"), resolve }; this.render(); }); }
  _closeDialog(result = false) { const d = this.s.dialog; this.s.dialog = null; if (d?.resolve) d.resolve(result); this.render(); }
  _loadVsSupply(units, tele) {
    const main = units.find((u) => u.hex === tele.main_unit) || units.find((u) => u.role === "MAIN_SUPPLY"); if (!main) return "";
    const eMain = num(tele.units?.[main.hex]?.e_in); if (eMain === null) return "";
    const over = units.filter((u) => u.hex !== main.hex && u.is_active !== false && ["DEVICE_LOAD", "ZONE_LOAD", "EV_CHARGING", "HEATING_COOLING", "SMART_APPLIANCE", "CIRCUIT_BREAKER"].includes(u.role)).map((u) => ({ u, e: num(tele.units?.[u.hex]?.e_in) })).filter((x) => x.e !== null && x.e > Math.max(eMain * 1.05, 10));
    return over.map((x) => `<div class="warn">${esc(this.t("loadGtSupply", { load: x.u.name, e_load: this._wh(x.e), e_main: this._wh(eMain) }))}</div>`).join("");
  }
  _sourceText(u) {
    const sensors = this.s.data.sensors?.sensors || [];
    const s = sensors.find((x) => hex4(x.unit_id) === u.hex);
    if (s) return s.iface === "i2c" ? `rbAmp bus ${esc(s.bus)} / ${esc(s.module)} / ${s.ch_label || s.ch}${s.ct_name ? ` · ${esc(s.ct_name)}` : ""}` : `ESP-NOW ch ${esc(s.channel)}`;
    const src = u.sources?.[0]; return src ? `${esc(src.source_type)} #${esc(src.source_id)}` : this.t("notBound");
  }

  // ------------------------------------------------------------------ render
  render() {
    const s = this.s;
    const hub = s.hub;
    const online = Boolean(hub && this._hubSt("Grid power") && this._hubSt("Grid power").state !== "unavailable"); this._online = online;
    const html = `<style>${CSS}</style>
<div class="toolbar${s.busy ? " busy" : ""}" style="position:sticky">
  <span class="act"></span>
  <span class="menu" data-action="menu"><ha-icon icon="mdi:menu"></ha-icon></span>
  <h1>${hub && s.hubs.length <= 1 ? esc(hub.name) : "RBgrid"}</h1>
  ${s.hubs.length > 1 ? `<select class="hub" data-change="hub">${s.hubs.map((h) => `<option value="${esc(h.entry_id)}" ${h.entry_id === hub.entry_id ? "selected" : ""}>${esc(h.name)}</option>`).join("")}</select>` : ""}
  ${hub ? `<span class="chip ${online ? "ok" : "bad"}">${online ? this.t("online") : this.t("offline")}</span>` : ""}
</div>
<div class="tabs">${TABS.map((t) => `<button data-tab="${esc(t)}" class="${t === s.tab ? "on" : ""}">${this.t(t)}</button>`).join("")}</div>
<main>
  ${hub && !online ? `<div class="alert warn"><span class="ic">⚠</span><span class="body">${this.t("hubOffline")}</span></div>` : ""}
  ${s.error && online && !(s.tab === "history" && /history|records|flash/i.test(s.error)) ? `<div class="err">${esc(s.error)}</div>` : ""}
  ${s.msg ? `<div class="msg">${esc(s.msg)}</div>` : ""}
  ${!hub ? `<div class="card">${this.t("noHubs")}</div>` : ""}
  ${hub ? this[`_r_${esc(s.tab)}`]() : ""}
</main>
${s.dialog ? this._rDialog() : ""}`;
    this._apply(html);
  }
  // Periodic refreshes used to rebuild the whole shadow DOM every 10 s, which made the page jump and
  // flicker. Now the new markup is parsed and only the changed nodes are swapped (attributes and text
  // in place, subtrees replaced where the shape differs), so scroll position, focus and unchanged
  // cards stay put.
  _apply(html) {
    const root = this.shadowRoot;
    if (!root.childElementCount) { root.innerHTML = html; this._labelCells(); return; }
    const tpl = document.createElement("template"); tpl.innerHTML = html;
    const a = Array.from(root.childNodes), b = Array.from(tpl.content.childNodes);
    if (a.length !== b.length) { root.innerHTML = html; this._labelCells(); return; }
    for (let i = 0; i < a.length; i++) this._morph(a[i], b[i]);
    this._labelCells();
  }
  _labelCells() {
    for (const table of this.shadowRoot.querySelectorAll(".tbl table")) {
      const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
      for (const tr of table.querySelectorAll("tbody tr")) Array.from(tr.children).forEach((td, i) => { if (td.dataset.label === undefined) td.dataset.label = td.classList.contains("row") || td.classList.contains("evday") ? "" : heads[i] || ""; });
    }
  }
  _morph(a, b) {
    if (a.isEqualNode(b)) return;
    const el = a.nodeType === 1 && b.nodeType === 1;
    if (!el || a.tagName !== b.tagName || a.childNodes.length !== b.childNodes.length || /^(svg|select|input|textarea|style)$/i.test(a.tagName)) { a.replaceWith(b.cloneNode(true)); return; }
    for (const at of Array.from(a.attributes)) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
    for (const at of Array.from(b.attributes)) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    const ac = Array.from(a.childNodes), bc = Array.from(b.childNodes);
    for (let i = 0; i < ac.length; i++) this._morph(ac[i], bc[i]);
  }
  _renderBusy() { const tb = this.shadowRoot.querySelector(".toolbar"); if (tb) tb.classList.toggle("busy", Boolean(this.s.busy)); }
  _live() {
    // Patch live values without a full re-render
    for (const el of this.shadowRoot.querySelectorAll("[data-live]")) {
      const [scope, slot, key, digits] = el.dataset.live.split("|");
      const st = scope === "hub" ? this._hubSt(key) : this._slotSt(slot, key);
      if (digits === "wh" || digits === "money") { const n = num(st?.state); el.textContent = n === null || !st || st.state === "unavailable" ? "—" : digits === "wh" ? this._wh(n) : this._money(n, this._currency()); continue; }
      const v = this._val(st, Number(digits || 1));
      el.textContent = el.dataset.unit === "1" && v !== "—" ? `${v} ${this._unitOf(st)}` : v;
    }
    const chip = this.shadowRoot.querySelector(".toolbar .chip");
    if (chip && this.s.hub) {
      const st = this._hubSt("Grid power"); const on = Boolean(st && st.state !== "unavailable");
      chip.className = `chip ${on ? "ok" : "bad"}`; chip.textContent = on ? this.t("online") : this.t("offline");
      // The hub went away or came back: the offline banner lives in the full template, and the lists promised to load
      // on reconnect, so re-render (offline) or reload the tab's data (online) instead of patching values only.
      if (on !== this._online) { this._online = on; if (on) { this._invalidate("tele", "units", "sensors", "i2c", "espnow", "tariff", "time", "rules", "signal", "price", "dynprice"); this._loadTab(); } else { this.render(); } }
    }
    const cv = this._hubSt("Config version"); if (cv && this.s.hub && cv.state !== this.s.hub.config_version && cv.state !== "unknown" && cv.state !== "unavailable") { this.s.hub.config_version = cv.state; this._invalidate("units", "sensors", "tariff", "i2c", "espnow"); }
  }
  _liveSpan(scope, slot, key, digits, unit = true) { const st = scope === "hub" ? this._hubSt(key) : this._slotSt(slot, key); const v = this._val(st, digits); return `<span data-live="${esc(scope)}|${slot || ""}|${esc(key)}|${esc(digits)}" data-unit="${unit ? 1 : 0}">${unit && v !== "—" ? `${esc(v)} ${this._unitOf(st)}` : v}</span>`; }

  _r_overview() {
    const tele = this.s.data.tele || {}; const sys = tele.system || {}; const vbus = tele.units?.v_bus;
    const zone = this._hubSt("Tariff zone"); const clock = this._hubSt("Clock set"); const demo = this._hubSt("Demo tariff");
    const units = this._unitList(); const cur = this._currency(); const H = this.s.ents?.hub || {};
    const whSpan = (key) => { const st = this._hubSt(key); const v = num(st?.state); return `<span data-live="hub||${esc(key)}|wh">${v === null ? "—" : this._wh(v)}</span>`; };
    const moneySpan = (key) => { const st = this._hubSt(key); const v = num(st?.state); return `<span data-live="hub||${esc(key)}|money">${v === null ? "—" : this._money(v, cur)}</span>`; };
    const ps = this._hubSt("Price state")?.state; const psrc = this._hubSt("Price source")?.state;
    const vs = Object.entries(tele.units || {}).filter(([k, u]) => k !== "v_bus" && u && u.v != null).map(([, u]) => Math.round(u.v * 10)); const showV = vs.length > 1 && new Set(vs).size > 1;
    return `
<div class="grid">
  <div class="card"><div class="eyebrow">${this.t("gridPower")}</div><div class="big">${this._liveSpan("hub", null, "Grid power", 0)}</div>
    ${(() => { const pv = Object.entries(tele.units || {}).filter(([k, u]) => k !== "v_bus" && u && u.v != null && u.present !== false).map(([k, u]) => ({ k, u })); const multi = new Set(pv.map((x) => Math.round(x.u.v * 10))).size > 1 || pv.length >= 3; if (multi && pv.length > 1) { const lbl = (u) => u.ch_label || this._phaseName(units.find((x) => x.hex === u.unit_id)?.phase) || u.point || ""; return pv.slice(0, 3).map(({ u }) => `<div class="kv"><span>${this.t("voltage")} ${esc(lbl(u))}</span><span>${u.v.toFixed(1)} ${this.t("v")}</span></div>`).join(""); } return `<div class="kv"><span>${this.t("voltage")}</span><span>${vbus?.v != null ? `${vbus.v.toFixed(1)} ${this.t("v")}` : "—"}</span></div>`; })()}
    <div class="kv"><span>${this.t("frequency")}</span><span>${tele.freq != null ? `${esc(tele.freq)} ${this.t("hz")}` : "—"}</span></div></div>
  <div class="card"><div class="eyebrow">${this.t("energyIn")} · ${this.t("today")}</div><div class="big">${whSpan("Energy in today")}</div>
    <div class="kv"><span>${this.t("lifetime")}</span><span>${whSpan("Energy in")}</span></div>
    <div class="kv"><span>${this.t("energyOut")} · ${this.t("today")}</span><span>${whSpan("Energy out today")}</span></div></div>
  <div class="card"><div class="eyebrow">${this.t("cost")} · ${this.t("today")}</div><div class="big">${moneySpan("Cost today")}</div>
    <div class="kv"><span>${this.t("lifetime")}</span><span>${moneySpan("Cost")}</span></div>
    <div class="kv"><span>${this.t("exportValue")} · ${this.t("today")}</span><span>${moneySpan("Export value today")}</span></div></div>
  <div class="card"><div class="eyebrow">${this.t("zone")}</div><div class="big">${zone && !["unavailable", "unknown"].includes(zone.state) ? esc(zone.state) : "—"}</div>
    <div class="kv"><span>${this.t("buyPrice")}, ${this.t("allIn")}</span><span>${this._liveSpan("hub", null, "Buy price", 4, false)} ${esc(cur)}${this.t("perKwh")}</span></div>
    <div class="kv"><span>${this.t("sellPrice")}</span><span>${this._liveSpan("hub", null, "Sell price", 4, false)} ${esc(cur)}${this.t("perKwh")}</span></div>
    ${H["Price state"] && ps && !["unavailable", "unknown"].includes(ps) ? `<div class="kv"><span>${this.t("dynPrices")}</span><span><a href="#" data-tab="prices">${esc(this.t(`ps_${esc(ps)}`) === `ps_${esc(ps)}` ? ps || "—" : this.t(`ps_${esc(ps)}`))}</a>${psrc && psrc !== "plan" ? ` · ${esc(this._provName(psrc.replace(/ \(backup\)$/, "")).replace(/_/g, " ").replace(/^energy charts$/i, "Energy-Charts").replace(/^energyzero$/i, "EnergyZero").replace(/^nordpool$/i, "Nord Pool").replace(/^ha$/i, "Home Assistant"))}` : ""}</span></div>` : ""}</div>
  <div class="card"><div class="eyebrow">${this.t("health")}</div>
    ${H["Uptime"] ? `<div class="kv"><span>${this.t("uptime")}</span><span>${this._uptime(this._hubSt("Uptime"))}</span></div>` : ""}
    <div class="kv"><span>${this.t("clock")}</span><span>${clock?.state === "on" ? this.t("clockSynced") : clock?.state === "off" ? `⚠ ${this.t("clockUnsynced")}` : "—"}</span></div>
    ${H["Modules online"] ? `<div class="kv"><span>${this.t("modules")}</span><span>${this._liveSpan("hub", null, "Modules online", 0, false)} / ${this._liveSpan("hub", null, "Modules", 0, false)}</span></div>` : ""}
    ${H["Nodes online"] ? `<div class="kv"><span>${this.t("nodes")}</span><span>${this._liveSpan("hub", null, "Nodes online", 0, false)} / ${this._liveSpan("hub", null, "Nodes", 0, false)}</span></div>` : ""}
    ${H["Wi-Fi signal"] ? `<div class="kv"><span>${this.t("wifi")}</span><span>${this._liveSpan("hub", null, "Wi-Fi signal", 0)}</span></div>` : ""}
    ${H["Free heap"] ? `<div class="kv"><span>${this.t("freeHeap")}</span><span>${this._kb(this._hubSt("Free heap"))}</span></div>` : ""}
    ${sys.boot ? `<div class="kv"><span>${this.t("boot")}</span><span>${this._fmt(sys.boot.ts)}</span></div>` : ""}
    ${H["Reset reason"] && !["unavailable", "unknown"].includes(this._hubSt("Reset reason")?.state) ? `<div class="kv"><span>${this.t("resetReason")}</span><span>${esc(String(this._hubSt("Reset reason")?.state || "—").split(" (")[0])}</span></div>` : ""}
    ${this.s.hub?.firmware?.image ? `<div class="kv"><span>${this.t("firmware")}</span><span>${esc(this.s.hub.firmware.image)}${this.s.hub.firmware.rolled_back ? ` · ⚠ ${this.t("rolledBack")}` : ""}</span></div>` : ""}
    ${this.s.hub?.config_version ? `<div class="kv"><span>${this.t("configVersion2")}</span><span>${esc(this.s.hub.config_version)}</span></div>` : ""}
  </div>
</div>
${demo?.state === "on" ? `<div class="alert warn"><span class="ic">⚠</span><span class="body">${this.t("demoAlert")}</span><button class="b o s" data-tab="tariff">${this.t("openTariff")}</button></div>` : ""}
${this._loadVsSupply(units, tele)}
<div class="card"><h2>${this.t("points")}<span class="sp"></span><button class="b o s" data-action="refresh">${this.t("refresh")}</button></h2>
<div class="tbl"><table><thead><tr><th>${this.t("slot")}</th><th>${this.t("name")}</th><th>${this.t("role")}</th>${showV ? `<th class="n">${this.t("voltage")}</th>` : ""}<th class="n">${this.t("power")}</th><th class="n">${this.t("current")}</th><th class="n">${this.t("energyIn")}</th><th class="n">${this.t("energyOut")}</th><th class="n">${this.t("cost")}</th><th>${this.t("state")}</th></tr></thead><tbody>
${!units.length ? `<tr><td class="empty" colspan="${showV ? 10 : 9}">${this._online ? this.t("emptyPoints") : this.t("offlineList")}</td></tr>` : ""}
${units.map((u) => { const slot = this._slotByName(u.name); const tu = tele.units?.[u.hex]; const on = slot ? this._slotSt(slot, "Online") : null; const present = on && on.state !== "unknown" && on.state !== "unavailable" ? on.state === "on" : tu ? tu.present : null; return `<tr class="${present === false ? "dim" : ""}">
  <td>${slot ?? "—"}</td><td>${esc(u.name)}${u.hex === tele.main_unit ? ` <span class="badge">${this.t("mainInput")}</span>` : ""}</td><td>${this._roleName(u.role)}</td>
  ${showV ? `<td class="n">${tu?.v != null ? `${tu.v.toFixed(1)} V` : "—"}</td>` : ""}
  <td class="n">${slot ? this._liveSpan("slot", slot, "Power", 1) : tu ? `${esc(tu.p_act)} W` : "—"}</td>
  <td class="n">${slot ? this._liveSpan("slot", slot, "Current", 3) : tu?.i != null ? `${esc(tu.i)} A` : "—"}</td>
  <td class="n">${slot ? this._liveSpan("slot", slot, "Energy in", 1) : tu ? this._wh(tu.e_in) : "—"}</td>
  <td class="n">${slot ? this._liveSpan("slot", slot, "Energy out", 1) : tu ? this._wh(tu.e_out) : "—"}</td>
  <td class="n">${slot ? `<span data-live="slot|${esc(slot)}|Cost|money">${this._money(num(this._slotSt(slot, "Cost")?.state), cur)}</span>` : tu?.cost_total != null ? this._money(tu.cost_total, tele.system?.tariff?.currency) : "—"}</td>
  <td>${present === null ? "—" : `<span class="badge ${present ? "ok" : ""}">${present ? this.t("present") : this.t("absent")}</span>`}</td></tr>`; }).join("")}
</tbody></table></div></div>`;
  }

  _r_points() {
    const units = this._unitList(); const sensors = this.s.data.sensors?.sensors || []; const free = this._freeSensors();
    return `<div class="card"><h2>${this.t("points")}<span class="sp"></span><button class="b o s" data-action="refresh">${this.t("refresh")}</button><button class="b s" data-action="dlg-create" ${free.length && this._online ? "" : `disabled title="${esc(this._online ? this.t("noFreeSensors") : this.t("offlineList"))}"`}>${this.t("addPoint")}</button></h2>
${!free.length && this._online && units.length ? `<p class="hint">${this.t("noFreeSensors")} ${this.t("espnowCreateHint")}</p>` : ""}
<div class="tbl"><table><thead><tr><th>ID</th><th>${this.t("name")}</th><th>${this.t("role")}</th><th>${this.t("source")}</th><th class="n">${this.t("ratedPower")}</th><th class="n">${this.t("maxCurrent")}</th><th>${this.t("phase")}</th><th>${this.t("slot")}</th><th>${this.t("actions")}</th></tr></thead><tbody>
${!units.length ? `<tr><td class="empty" colspan="9">${this._online ? this.t("emptyPoints") : this.t("offlineList")}</td></tr>` : ""}
${units.map((u) => `<tr class="${u.is_active ? "" : "dim"}"><td>${esc(u.hex)}</td><td>${esc(u.name)}${u.short_name ? ` <span class="muted">${esc(u.short_name)}</span>` : ""}<div class="muted">${esc(u.point || "")}</div></td><td>${this._roleName(u.role)}</td><td>${esc(this._sourceText(u))}</td>
  <td class="n">${u.rated_power_w ?? "—"}</td><td class="n">${u.max_current_a ?? "—"}</td><td>${this._phaseName(u.phase)}</td><td>${this._slotByName(u.name) ?? "—"}</td>
  <td class="row"><button class="b o s" data-action="dlg-edit" data-arg="${esc(u.hex)}">${this.t("edit")}</button>${(u.sources?.[0]?.source_type === "I2C_SENSOR") ? `<button class="b o s" data-action="dlg-rebind" data-arg="${esc(u.hex)}">${this.t("rebind")}</button>` : ""}</td></tr>`).join("")}
</tbody></table></div></div>
<div class="card"><h2>${this.t("sensor")}</h2><div class="tbl"><table><thead><tr><th>${this.t("source")}</th><th>${this.t("module")}</th><th>${this.t("channel")}</th><th>CT</th><th>${this.t("unit")}</th><th>${this.t("state")}</th></tr></thead><tbody>
${!sensors.length ? `<tr><td class="empty" colspan="6">${this._online ? this.t("emptySensors") : this.t("offlineList")}</td></tr>` : ""}
${sensors.map((x) => `<tr class="${x.present ? "" : "dim"}"><td>${esc(x.iface === "i2c" ? `rbAmp bus ${x.bus}` : "ESP-NOW")}</td><td>${x.module ?? "—"}${x.addr ? ` <span class="muted">${hexAddr(x.addr)}</span>` : ""}</td><td>${esc(x.ch_label ?? x.channel ?? x.ch ?? "")}</td><td>${esc(x.ct_name || "")}</td><td>${x.unit_id ? hex4(x.unit_id) : `<span class="muted">${this.t("notBound")}</span>`}</td><td><span class="badge ${x.present ? "ok" : ""}">${x.present ? this.t("present") : this.t("absent")}</span></td></tr>`).join("")}
</tbody></table></div></div>`;
  }

  _r_tariff() {
    const plan = this.s.data.tariff?.data?.list?.[0]; if (!plan) return `<div class="card"><p class="muted" style="font-size:13px">${this._online ? this.t("loading") : this.t("offlineList")}</p></div>`;
    const cur = plan.currency_code; const haCur = this._hass?.config?.currency || "";
    const curAlert = haCur && cur && cur !== haCur ? `<div class="alert warn"><span class="ic">⚠</span><span class="body">${this.t("currencyMismatch", { hub: cur, ha: haCur }).replace("{ha}", haCur)}</span><button class="b o s" type="button" data-action="cur-ha" data-arg="${esc(haCur)}">${this.t("useHaCurrency", { cur: haCur })}</button></div>` : "";
    const cond = (c) => { const p = c.params || {}; if (c.condition_type === "TIME_RANGE") return `${String(p.start_hour).padStart(2, "0")}:${String(p.start_minute || 0).padStart(2, "0")}–${String(p.end_hour).padStart(2, "0")}:${String(p.end_minute || 0).padStart(2, "0")}`; return `${esc(c.condition_type)}${Object.keys(p).length ? " " + JSON.stringify(p) : ""}`; };
    return `<form data-form="tariff"><div class="card"><h2>${this.t("plan")}: ${esc(plan.plan_name)}<span class="sp"></span><button class="b o s" type="button" data-action="refresh">${this.t("refresh")}</button><button class="b s" type="submit">${this.t("apply")}</button></h2>
${plan.is_placeholder ? `<div class="alert warn"><span class="ic">⚠</span><span class="body">${this.t("placeholder")}</span></div>` : ""}${curAlert}
<div class="row">
  <label class="f">${this.t("plan")}<input name="plan_name" value="${esc(plan.plan_name)}" maxlength="31"></label>
  <label class="f">${this.t("provider")}<input name="provider_name" value="${esc(plan.provider_name || "")}" maxlength="31"></label>
  <label class="f">${this.t("type")}<span class="v" title="${esc(plan.plan_type)}">${esc(this._lbl(PLAN_TYPES, plan.plan_type))}</span></label>
  <label class="f">${this.t("currency")}<input name="currency_code" value="${esc(cur)}" maxlength="3" pattern="[A-Za-z]{3}" style="text-transform:uppercase" title="${this.t("haCurrency", { cur: haCur })}"></label>
  <label class="f">${this.t("vat")}<input type="number" step="0.1" name="vat_percent" value="${esc(plan.vat_percent)}"></label>
  <label class="f">${this.t("energyTax").replace("/kWh", `${esc(cur)}/kWh`)}<input type="number" step="0.0001" name="energy_tax_per_kwh" value="${esc(plan.energy_tax_per_kwh)}"></label>
  <label class="f">${this.t("gridFee").replace("/kWh", `${esc(cur)}/kWh`)}<input type="number" step="0.0001" name="grid_usage_fee_per_kwh" value="${esc(plan.grid_usage_fee_per_kwh)}"></label>
  <label class="f">${this.t("levy").replace("/kWh", `${esc(cur)}/kWh`)}<input type="number" step="0.0001" name="renewable_levy_per_kwh" value="${esc(plan.renewable_levy_per_kwh)}"></label>
</div><p class="hint" style="margin:8px 0 0">${this.t("haCurrency", { cur: haCur })}</p></div>
<div class="card"><h2>${this.t("zones")}</h2><div class="tbl"><table><thead><tr><th>${this.t("zoneId")}</th><th>${this.t("name")}</th><th class="n">${this.t("buy").replace("/kWh", `${esc(cur)}/kWh`)}</th><th class="n">${this.t("sell").replace("/kWh", `${esc(cur)}/kWh`)}</th><th>${this.t("zoneHours")}</th><th>${this.t("enabled")}</th></tr></thead><tbody>
${(plan.zones || []).map((z, i) => `<tr><td>${esc(z.zone_id)}${z.is_currently_active ? ` <span class="badge ok">${this.t("active")}</span>` : ""}</td><td><input name="z${i}.zone_name" value="${esc(z.zone_name)}" maxlength="31" style="width:140px"></td>
  <td class="n"><input type="number" step="0.0001" name="z${i}.rate_buying_per_kwh" value="${esc(z.rate_buying_per_kwh)}"></td><td class="n"><input type="number" step="0.0001" name="z${i}.rate_selling_per_kwh" value="${esc(z.rate_selling_per_kwh)}"></td>
  <td class="nowrap">${(z.conditions || []).map((c, j) => { const p = c.params || {}; if (c.condition_type !== "TIME_RANGE") return esc(cond(c)); const hsel = (name, val, max) => `<select name="${esc(name)}" class="hm">${Array.from({ length: max + 1 }, (_, k) => `<option value="${esc(k)}" ${k === Number(val ?? 0) ? "selected" : ""}>${String(k).padStart(2, "0")}</option>`).join("")}</select>`; const msel = (name, val) => `<select name="${esc(name)}" class="hm">${[0, 15, 30, 45].map((k) => `<option value="${esc(k)}" ${k === Number(val ?? 0) ? "selected" : ""}>${String(k).padStart(2, "0")}</option>`).join("")}</select>`; return `<span class="row hours" style="gap:4px;align-items:center"><span class="hint">${this.t("from")}</span>${hsel(`z${i}.c${esc(j)}.start_h`, p.start_hour, 23)}:${msel(`z${i}.c${esc(j)}.start_m`, p.start_minute)}<span class="hint">${this.t("to")}</span>${hsel(`z${i}.c${esc(j)}.end_h`, p.end_hour, 24)}:${msel(`z${i}.c${esc(j)}.end_m`, p.end_minute)}</span>`; }).join("<br>")}</td><td><input type="checkbox" name="z${i}.is_enabled" ${z.is_enabled ? "checked" : ""}></td></tr>`).join("")}
</tbody></table></div>
<p><label class="c"><input type="checkbox" data-change="showJson" ${this.s.showJson ? "checked" : ""}> ${this.t("advanced")}</label></p>
${this.s.showJson ? `<textarea name="json">${esc(JSON.stringify(plan, null, 2))}</textarea>` : ""}
</div></form>`;
  }

  _rExtPrice() {
    const pr = this.s.data.price || {}; const cur = this._currency(); const hub = this.s.hub || {};
    const ext = this._hubSt("External price");
    const rows = pr.prices || [];
    const haActive = Boolean(pr.active && rows.length);
    return `<div class="card wide"><h2>${this.t("extPrice")} <span class="badge ${haActive ? "ok" : ""}">${haActive ? this.t("extActive") : this.t("extInactive")}</span><span class="sp"></span>${rows.length ? `<button class="b d s" data-action="price-clear">${this.t("extClear")}</button>` : ""}</h2>
<div class="kv"><span>${this.t("extSource")}</span><span>${hub.price_entity ? esc(hub.price_entity) : `<span class="muted">${this.t("none")}</span>`}</span></div>
${hub.price_last_push ? `<div class="kv muted"><span>${this.t("extLastPush")}</span><span>${this._fmt(Date.parse(hub.price_last_push.at) / 1000, { seconds: true })} · ${esc(hub.price_last_push.sent)}${hub.price_last_push.error ? ` · ${esc(hub.price_last_push.error)}` : ""}</span></div>` : ""}
${ext ? `<div class="kv muted"><span>${this.t("extPrice")} (HA)</span><span>${esc(ext.state)}</span></div>` : ""}
<p class="muted">${this.t("extHint")}</p>
${rows.length ? `<div class="tbl"><table><thead><tr><th>${this.t("interval")}</th><th class="n">${this.t("buy")}</th><th class="n">${this.t("sell")}</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${this._fmt(r.from)} – ${this._hm(r.until)}</td><td class="n">${this._money(r.buy, cur, 5)}</td><td class="n">${r.sell != null ? this._money(r.sell, cur, 5) : "—"}</td></tr>`).join("")}
</tbody></table></div>` : `<p class="muted">${this.t("extEntries")}: ${this.t("none")}</p>`}</div>`;
  }

  _r_network() {
    const i2c = this.s.data.i2c || {}; const en = this.s.data.espnow || {}; const pins = i2c.pins_ok || [];
    const pinSel = (name, cur) => `<select name="${esc(name)}">${pins.map((p) => `<option value="${esc(p)}" ${p === cur ? "selected" : ""}>${esc(p)}</option>`).join("")}</select>`;
    return `<div class="card"><h2>${this.t("i2c")}<span class="sp"></span><button class="b o s" data-action="refresh">${this.t("refresh")}</button></h2>
${i2c.reboot_pending ? `<div class="warn">${this.t("rebootPending")}</div>` : ""}
<div class="tbl"><table><thead><tr><th>${this.t("bus")}</th><th>${this.t("pins")}</th><th>${this.t("state")}</th><th>${this.t("actions")}</th></tr></thead><tbody>
${(i2c.buses || []).map((b) => `<tr><td>${esc(b.bus)}</td><td>${b.configured ? `SDA ${esc(b.sda)} / SCL ${esc(b.scl)}` : `<span class="muted">${this.t("notConfigured")}</span>`}</td><td><span class="badge ${b.up ? "ok" : ""}">${b.up ? this.t("up") : this.t("down")}</span></td>
  <td>${this.s.pinsEdit === b.bus ? `<form class="row" data-form="pins" data-bus="${esc(b.bus)}">${this.t("sda")} ${pinSel("sda", b.sda)} ${this.t("scl")} ${pinSel("scl", b.scl)} <button class="b s" type="submit">${this.t("apply")}</button> <button class="b o s" type="button" data-action="pins-edit" data-arg="">${this.t("cancel")}</button></form>` : `<span class="row"><button class="b s" data-action="scan" data-arg="${esc(b.bus)}">${this.t("scan")}</button> <button class="b o s" data-action="pins-edit" data-arg="${esc(b.bus)}">${this.t("changePins")}…</button></span>`}</td></tr>`).join("")}
</tbody></table></div>
${this.s.scan ? `<p>${this.s.scan.found?.length ? this.t("scanResult", { bus: this.s.scan.bus, list: "" }) : this.t("nothingFound", { bus: this.s.scan.bus })} ${(this.s.scan.found || []).map((a) => `${a.module != null ? `<span class="badge ok">${hexAddr(a.addr)} ${esc(a.model || "")} · ${this.t("module")} ${esc(a.module)}</span>` : `<button class="b s" data-action="i2c-add" data-arg="${a.addr ?? a}" data-bus="${esc(this.s.scan.bus)}">${this.t("add")} ${hexAddr(a.addr ?? a)}${a.model ? ` ${esc(a.model)}` : ""}</button>`}`).join(" ")}</p>` : ""}
<h3 class="sub">${this.t("modules").replace(" online", "").replace(" онлайн", "")}</h3>
<div class="tbl"><table><thead><tr><th>${this.t("module")}</th><th>${this.t("bus")}</th><th>${this.t("addr")}</th><th>${this.t("model")}</th><th>${this.t("fw")}</th><th class="n">${(i2c.modules || []).length && (i2c.modules || []).every((m) => m.metering_points != null) ? this.t("pointsOn") : this.t("boundInputs")}</th><th>${this.t("state")}</th></tr></thead><tbody>
${!(i2c.modules || []).length ? `<tr><td class="empty" colspan="7">${this.t("emptySensors")}</td></tr>` : ""}
${(i2c.modules || []).map((m) => { const sm = (this.s.data.sensors?.modules || []).find((x) => x.module === m.module); return `<tr class="${m.present ? "" : "dim"}"><td>${esc(m.module)}</td><td>${esc(m.bus)}</td><td>${hexAddr(m.addr)}</td><td>${esc(m.model)}</td><td>${esc(sm?.fw_name || "")}</td><td class="n">${(i2c.modules || []).every((x) => x.metering_points != null) ? m.metering_points : m.points}</td><td><span class="badge ${m.present ? "ok" : ""}">${m.present ? this.t("present") : this.t("absent")}</span></td></tr>`; }).join("")}
</tbody></table></div></div>
<div class="card"><h2>${this.t("espnow")} <span class="badge ${en.running ? "ok" : "fail"}">${en.running ? this.t("up") : this.t("down")}</span><span class="sp"></span>${en.pairing_open ? `<button class="b o s" data-action="espnow" data-arg="pair_cancel">${this.t("pairCancel")}</button>` : `<button class="b ${en.running ? "" : "o"} s" data-action="espnow" data-arg="pair" ${en.enabled === "off" ? `disabled title="${this.t("espnowOff")}"` : ""}>${this.t("pair")}</button>`}</h2>
<div class="legend" style="margin-bottom:8px"><span>${this.t("chan")}: ${en.channel ?? "—"}</span><span>·</span><span>${(en.nodes || []).length} ${this.t("paired")}</span><span>·</span><span>${en.pairing_open ? `<span class="badge ok">${this.t("pairingOpen", { s: en.pairing_left_s })}</span>` : this.t("pairingClosed")}</span></div>
<div class="tbl"><table><thead><tr><th>${this.t("mac")}</th><th>${this.t("state")}</th><th class="n">${this.t("rssi")}</th><th>${this.t("fw")}</th><th class="n">${this.t("period")}</th><th>${this.t("channels")}</th><th>${this.t("actions")}</th></tr></thead><tbody>
${!(en.nodes || []).length ? `<tr><td class="empty" colspan="7">${this.t("emptyNodes")}</td></tr>` : ""}
${(en.nodes || []).map((n) => `<tr class="${n.disabled ? "dim" : ""}"><td>${esc(n.mac)}</td><td><span class="badge ${n.online && !n.disabled ? "ok" : ""}">${n.disabled ? this.t("disable") : n.online ? this.t("online") : this.t("offline")}</span>${n.config_state && n.config_state !== "applied" ? ` <span class="badge">${this.t("configState")}: ${esc(n.config_state)}</span>` : ""}</td><td class="n">${n.rssi_dbm ?? "—"}</td><td>${esc(n.fw || "")}</td><td class="n">${n.period_s ? `${n.period_s} s` : "—"}</td>
  <td>${(n.channels || []).map((c) => { const cfg = (n.config || []).find((x) => x.ch === c.ch) || {}; return `<label class="c"><input type="checkbox" data-change="node-ch" data-mac="${esc(n.mac)}" data-ch="${esc(c.ch)}" ${cfg.enabled !== false ? "checked" : ""}> ch${esc(c.ch)} ${c.unit_id ? hex4(c.unit_id) : ""} <span class="muted">${esc(this.s.schema?.enums?.ct_model?.[String(cfg.ct_code ?? c.ct_code)] || "")}</span></label>`; }).join("")}</td>
  <td class="row">${n.disabled ? `<button class="b o s" data-action="espnow" data-arg="enable" data-mac="${esc(n.mac)}">${this.t("enable")}</button>` : `<button class="b o s" data-action="espnow" data-arg="disable" data-mac="${esc(n.mac)}">${this.t("disable")}</button>`}<button class="b d s" data-action="espnow-remove" data-mac="${esc(n.mac)}">${this.t("remove")}</button></td></tr>`).join("")}
</tbody></table></div></div>`;
  }

  _r_history() {
    const h = this.s.hist; const units = this._unitList(); const ser = h.series; const cur = ser?.currency || this._currency();
    const idx = {}; (ser?.cols || []).forEach((c, i) => (idx[c] = i)); const rows = (ser?.rows || []).filter((r) => (r[idx.dur] || 0) > 0 && Math.abs(r[idx.wh_in] || 0) < 1e8 && Math.abs(r[idx.wh_out] || 0) < 1e8).slice().reverse(); // skip 0-second / implausible rows (a fresh hub once served -2^40 Wh)
    const anyData = rows.some((r) => (r[idx.wh_in] || 0) > 0 || (r[idx.wh_out] || 0) > 0 || (r[idx.cost] || 0) > 0);
    let chart = "";
    if (rows.length && anyData) {
      const W = this._chartW(), Hh = 220, padL = 74, padB = 24, padT = 8; const n = rows.length; const bw = Math.max(1, (W - padL) / n - 1);
      const maxIn = Math.max(...rows.map((r) => r[idx.wh_in] || 0), 0.001), maxOut = Math.max(...rows.map((r) => r[idx.wh_out] || 0), 0);
      const ticks = this._ticks(maxIn, 4); const top = ticks[ticks.length - 1] || maxIn;
      const scale = (Hh - padB - padT) / (top + maxOut || 1); const zero = padT + top * scale; const y = (v) => zero - v * scale;
      const unit = top >= 1000 ? "kWh" : "Wh"; const lbl = (v) => (unit === "kWh" ? (v / 1000).toFixed(v % 1000 ? 1 : 0) : v.toFixed(0));
      const every = Math.max(1, Math.ceil(n / Math.floor((W - padL) / 90)));
      chart = `<svg class="chart" viewBox="0 0 ${W} ${Hh}">
${ticks.map((t, i) => `<line x1="${padL}" y1="${y(t)}" x2="${W}" y2="${y(t)}" ${t ? 'stroke-dasharray="4 4"' : ""}/><text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${lbl(t)}${i === ticks.length - 1 ? ` ${esc(unit)}` : ""}</text>`).join("")}${maxOut ? `<text x="${padL - 6}" y="${Hh - padB}" text-anchor="end">-${lbl(maxOut)}</text>` : ""}
${rows.map((r, i) => { const x = padL + i * ((W - padL) / n); const hi = (r[idx.wh_in] || 0) * scale, ho = (r[idx.wh_out] || 0) * scale; const t = `${this._fmt(r[idx.ts] - r[idx.dur], { weekday: true })} – ${this._hm(r[idx.ts])}\n${this._wh(r[idx.wh_in])} in · ${this._wh(r[idx.wh_out])} out\n${this._money(r[idx.cost], cur)} · ${this._money(r[idx.revenue], cur)}`; return `<rect class="in" x="${x}" y="${zero - hi}" width="${bw}" height="${esc(hi)}"><title>${esc(t)}</title></rect>${ho ? `<rect class="out" x="${x}" y="${zero}" width="${bw}" height="${esc(ho)}"><title>${esc(t)}</title></rect>` : ""}${i % every === 0 && x < W - 48 ? `<text x="${x}" y="${Hh - 6}">${esc(h.period === "hour" ? this._fmt(r[idx.ts] - r[idx.dur], { date: new Date((r[idx.ts] - r[idx.dur]) * 1000).getHours() === 0 }) : this._fmt(r[idx.ts] - r[idx.dur]).replace(/,? ?\d{2}:\d{2}$/, ""))}</text>` : ""}`; }).join("")}</svg>`;
    }
    const allUnsigned = rows.length && rows.every((r) => this._qBits(r[idx.q]).includes("UNSIGNED_SRC"));
    const qb = (r) => this._qBits(r[idx.q]).filter((b) => !(allUnsigned && b === "UNSIGNED_SRC")).map((b) => `<span class="badge" title="${esc(b)}">${esc(this._lbl(Q_LABELS, b))}</span>`).join(" ");
    const period = { hour: 3600, day: 86400, week: 7 * 86400, month: 30 * 86400, year: 365 * 86400 }[h.period] || 3600;
    const tot = (k) => rows.reduce((a, r) => a + (r[idx[k]] || 0), 0);
    let lastDay = "";
    const trs = rows.slice().reverse().map((r) => { const from = r[idx.ts] - r[idx.dur]; const day = this._day(from); const head = h.period === "hour" && day !== lastDay ? `<tr><td colspan="6" class="evday">${esc(day)}</td></tr>` : ""; lastDay = day; const span = h.period === "hour" ? `${this._hm(from)} – ${this._hm(r[idx.ts])}` : this._fmt(from).replace(/,? ?\d{2}:\d{2}$/, ""); const partial = Math.abs(r[idx.dur] - period) > 60 && h.period === "hour"; return `${head}<tr><td>${esc(span)}${partial ? ` <span class="hint">(${Math.round(r[idx.dur] / 60)} ${this.t("min")})</span>` : ""}</td><td class="n">${this._wh(r[idx.wh_in])}</td><td class="n">${this._wh(r[idx.wh_out])}</td><td class="n">${this._money(r[idx.cost], cur)}</td><td class="n">${this._money(r[idx.revenue], cur)}</td><td>${qb(r)}</td></tr>`; }).join("");
    const errText = this.s.error && /history|records|flash/i.test(this.s.error) ? this.t("historyFailed") : null;
    return `<div class="card"><h2>${this.t("history")}<span class="sp"></span><button class="b o s" data-action="import-stats">${this.t("importStats")}</button></h2>
<div class="row">
  <label class="f">${this.t("unit")}<select data-change="hist-unit">${units.map((u) => `<option value="${esc(u.hex)}" ${u.hex === h.unit ? "selected" : ""}>${esc(u.name)}</option>`).join("")}</select></label>
  <label class="f">${this.t("period")}<select data-change="hist-period">${["hour", "day", "week", "month", "year"].map((p) => `<option value="${esc(p)}" ${p === h.period ? "selected" : ""}>${this.t(p)}</option>`).join("")}</select></label>
  <label class="f">${this.t("range")}<select data-change="hist-range">${Object.keys(RANGES).map((r) => `<option value="${esc(r)}" ${r === h.range ? "selected" : ""}>${this.t(r)}</option>`).join("")}</select></label>
  <button class="b o s" data-action="hist-reload">${this.t("refresh")}</button>
</div>
${!units.length ? `<p class="muted" style="font-size:13px">${this._online ? this.t("emptyPoints") : this.t("offlineList")}</p>` : rows.length ? chart : `<p class="muted" style="font-size:13px">${errText || this.t("emptyHistory")}</p>`}
${rows.length ? `<div class="tbl"><table><thead><tr><th>${this.t("interval")}</th><th class="n">${this.t("energyIn")}</th><th class="n">${this.t("energyOut")}</th><th class="n">${this.t("cost")}</th><th class="n">${this.t("exportValue")}</th><th>${this.t("quality")}</th></tr></thead><tbody>
${trs}
<tr class="now"><td>${this.t("total")}</td><td class="n">${this._wh(tot("wh_in"))}</td><td class="n">${this._wh(tot("wh_out"))}</td><td class="n">${this._money(tot("cost"), cur)}</td><td class="n">${this._money(tot("revenue"), cur)}</td><td></td></tr>
</tbody></table></div>${allUnsigned ? `<p class="hint">${this.t("consumptionOnlyNote")}</p>` : ""}` : ""}
<p class="hint">${this.t("statsHint")}</p></div>`;
  }

  _r_events() {
    const isDiag = (e) => e.level === "debug" || e.kind === "diag";
    const visible = this.s.events.filter((e) => this.s.showDiag || !isDiag(e));
    const kinds = ["all", ...new Set(visible.map((e) => e.kind))];
    const all = visible.filter((e) => this.s.evFilter === "all" || e.kind === this.s.evFilter).slice().reverse();
    const limit = this.s.evLimit || 50; const list = all.slice(0, limit); const rest = all.length - list.length;
    const hidden = this.s.events.length - visible.length;
    let lastDay = "";
    const rows = list.map((e) => { const ts = Math.floor(new Date(e.t).getTime() / 1000); const day = this._day(ts); const head = day !== lastDay ? `<div class="evday">${esc(day)}</div>` : ""; lastDay = day; const isFail = e.level === "fail" || /^FAIL\b/.test(e.message || ""); const lvl = isFail ? "fail" : e.level === "debug" ? "" : "ok"; return `${head}<div class="ev ${isFail ? "fail" : ""}"><span>${this._fmt(ts, { date: false, seconds: true })}${e.replay ? ` <span class="hint" title="${this.t("replayed")}">↺</span>` : ""}</span><span><span class="badge ${esc(lvl)}">${esc(e.kind.replace(/_/g, " "))}</span></span><span class="m">${esc(e.message)}</span></div>`; }).join("");
    return `<div class="card"><h2>${this.t("events")} <span class="badge ok">${this.t("live")}</span><span class="sp"></span><label class="c"><input type="checkbox" data-change="show-diag" ${this.s.showDiag ? "checked" : ""}> <span class="hint">${this.t("showDiag")}${hidden ? ` (${esc(hidden)})` : ""}</span></label><select data-change="ev-filter">${kinds.map((k) => `<option value="${esc(k)}" ${k === this.s.evFilter ? "selected" : ""}>${k === "all" ? this.t("all") : esc(k.replace(/_/g, " "))}</option>`).join("")}</select></h2>
${!list.length ? `<p class="muted" style="font-size:13px">${this.t("noEvents")}</p>` : rows}
${rest > 0 ? `<p><button class="b o s" data-action="ev-more">${this.t("showMore", { n: Math.min(50, rest) })}</button></p>` : ""}</div>`;
  }

  // ------------------------------------------------------------------ prices tab
  _prov(id) { return (this.s.data.dynprice?.providers || []).find((p) => p.id === id); }
  _provName(id) { if (!id || id === "none") return this.t("noBackup"); if (id === "plan") return this.t("provPlan"); return this._prov(id)?.name || id; }
  _psClass(st) { return st === "ok" ? "ok" : st === "backup" || st === "today_only" ? "warnb" : st === "disabled" ? "" : "fail"; }
  _dynDraft() { if (!this.s.dyn) { const d = this.s.data.dynprice || {}; this.s.dyn = {}; for (const k of ["enabled", "source", "backup_source", "zone", "ha_class", "factor", "markup", "zones_stack", "hourly_mean", "floor_buy", "floor_sell", "sell_mode", "k_sell", "feedin_fee", "product", "export_product"]) this.s.dyn[k] = d[k]; } return this.s.dyn; }
  _freeSensors() { return (this.s.data.sensors?.sensors || []).filter((x) => !x.unit_id && x.iface === "i2c" && x.present !== false); }
  // Device rejections arrive as text: "[field=<f>][code=<CODE>] <message>" (firmware 377e34d+; older builds send the
  // bare message). The code drives the panel's reaction, the message is shown as the device wrote it.
  _devErr(msg) { const m = /^((?:\[(?:field|code)=[^\]]*\])+)\s*/.exec(msg || ""); const out = { field: null, code: null, text: msg || "" }; if (m) { out.text = (msg || "").slice(m[0].length); const f = /\[field=([^\]]*)\]/.exec(m[1]); const c = /\[code=([^\]]*)\]/.exec(m[1]); out.field = f ? f[1] : null; out.code = c ? c[1] : null; } if (!out.code && /slug retired|reuse:true/i.test(out.text)) out.code = "POINT_TOMBSTONED"; return out; }
  _friendlyErr(msg, extra) { const e = this._devErr(msg); const key = e.code === "POINT_TOMBSTONED" ? "tombstoned" : e.code ? `code_${esc(e.code)}` : null; const friendly = key && this.t(key) !== key ? this.t(key) : null; if (extra && extra(e)) return extra(e); return friendly ? `${esc(friendly)} (${esc(e.text)})` : e.text; }
  _rulesPayload(list) {
    // The device reports an all-day window as from_h 0 / to_h 0 but accepts it only as 0 / 24 (dev build 78334ff).
    return (list || this.s.data.rules?.rules || []).map(({ state, ...r }) => (r.kind === "cheapest" && r.from_h === r.to_h ? { ...r, from_h: 0, to_h: 24 } : r));
  }
  _hm(ts) { return ts ? this._fmt(ts, { date: false }) : "—"; }

  _posixTz(name) {
    const EU_CET = ["Europe/Amsterdam", "Europe/Andorra", "Europe/Belgrade", "Europe/Berlin", "Europe/Bratislava", "Europe/Brussels", "Europe/Budapest", "Europe/Copenhagen", "Europe/Gibraltar", "Europe/Ljubljana", "Europe/Luxembourg", "Europe/Madrid", "Europe/Malta", "Europe/Monaco", "Europe/Oslo", "Europe/Paris", "Europe/Prague", "Europe/Rome", "Europe/San_Marino", "Europe/Sarajevo", "Europe/Skopje", "Europe/Stockholm", "Europe/Tirane", "Europe/Vaduz", "Europe/Vatican", "Europe/Vienna", "Europe/Warsaw", "Europe/Zagreb", "Europe/Zurich"];
    const EU_EET = ["Europe/Athens", "Europe/Bucharest", "Europe/Chisinau", "Europe/Helsinki", "Europe/Kiev", "Europe/Kyiv", "Europe/Riga", "Europe/Sofia", "Europe/Tallinn", "Europe/Vilnius", "Asia/Nicosia", "Europe/Nicosia"];
    const EU_WET = ["Europe/Lisbon", "Atlantic/Canary", "Atlantic/Madeira", "Atlantic/Faroe"];
    if (EU_CET.includes(name)) return "CET-1CEST,M3.5.0,M10.5.0/3";
    if (EU_EET.includes(name)) return "EET-2EEST,M3.5.0/3,M10.5.0/4";
    if (EU_WET.includes(name)) return "WET0WEST,M3.5.0/1,M10.5.0";
    if (name === "Europe/London" || name === "Europe/Dublin" || name === "Europe/Jersey" || name === "Europe/Guernsey" || name === "Europe/Isle_of_Man") return "GMT0BST,M3.5.0/1,M10.5.0";
    if (name === "Europe/Moscow" || name === "Europe/Minsk" || name === "Europe/Simferopol") return "MSK-3";
    if (name === "Europe/Istanbul" || name === "Asia/Istanbul") return "<+03>-3";
    if (name === "Asia/Shanghai" || name === "Asia/Hong_Kong" || name === "Asia/Taipei" || name === "Asia/Singapore" || name === "Asia/Macau" || name === "Asia/Manila" || name === "Australia/Perth") return "CST-8";
    if (name === "Asia/Tokyo" || name === "Asia/Seoul") return "JST-9";
    if (name === "UTC" || name === "Etc/UTC" || name === "GMT") return "UTC0";
    // Fallback: the zone's current fixed offset (no DST rule). POSIX inverts the sign: UTC+2 → "<+02>-2".
    try {
      const parts = new Intl.DateTimeFormat("en-US", { timeZone: name, timeZoneName: "longOffset" }).formatToParts(new Date());
      const off = parts.find((p) => p.type === "timeZoneName")?.value || "GMT"; const m = /GMT([+-])(\d{2})(?::(\d{2}))?/.exec(off);
      if (!m) return "UTC0";
      const sign = m[1] === "+" ? "-" : "+"; const h = Number(m[2]), mm = m[3] ? `:${esc(m[3])}` : "";
      return `<${m[1]}${m[2]}${m[3] || ""}>${sign}${h}${mm}`;
    } catch { return "UTC0"; }
  }

  _rHubTime() {
    const tm = this.s.data.time; if (!tm) return "";
    const haTz = this._hass?.config?.time_zone || "UTC"; const posix = this._posixTz(haTz); const unset = !tm.timezone || /^UTC0?$/i.test(tm.timezone);
    return `<div class="card wide"><h2>${this.t("hubTime")}</h2>
${unset ? `<div class="alert warn"><span class="ic">⚠</span><span class="body">${this.t("tzNotSet")}</span>${tm.timezone !== posix ? `<button class="b s" data-action="tz-ha" data-arg="${esc(posix)}">${this.t("tzHaBtn")}</button>` : ""}</div>` : ""}
${tm.local ? `<div class="kv"><span>${this.t("localTime")}</span><span>${esc(tm.local.replace("T", " ").slice(0, 16))}</span></div>` : ""}
<form data-form="time" class="row" style="margin-top:8px"><label class="f">${this.t("tzPosixLabel")}<input name="timezone" value="${unset ? "" : esc(tm.timezone)}" placeholder="${esc(posix)}"></label><button class="b o s" type="submit">${this.t("save")}</button>${!unset && tm.timezone !== posix ? `<button class="b o s" type="button" data-action="tz-ha" data-arg="${esc(posix)}">${this.t("tzHaBtn")} (${esc(haTz)})</button>` : ""}</form></div>`;
  }

  _r_prices() {
    if (!this._dynSupported()) return `<div class="card"><p class="muted">${this.t("noDyn")}</p></div>${this._rExtPrice()}`;
    const dyn = this.s.data.dynprice || {}; const pr = this.s.data.price || {}; const sig = this.s.data.signal || {}; const cur = dyn.currency || pr.currency || this._currency();
    const st = dyn.price_state || pr.price_state || "disabled"; const srcNow = dyn.source_now || pr.source_now;
    const prov = this._prov(srcNow);
    const status = `<div class="card wide"><h2>${this.t("dynPrices")} <span class="badge ${this._psClass(st)}">${this.t(`ps_${esc(st)}`)}</span><span class="sp"></span><button class="b o s" data-action="refresh">${this.t("refresh")}</button></h2>
<div class="eyebrow">${this.t("priceNow")}, ${this.t("allIn")}</div><div class="big">${sig.buy != null ? `${this._money(sig.buy, cur, 4)}<small>${this.t("perKwh")}</small>` : "—"}</div>
${sig.rank_buy ? `<div class="muted">${this.t("rank")} ${esc(sig.rank_buy)} ${this.t("ofPeriods", { n: sig.periods_today })}${sig.buy_cheap ? ` · <span class="badge ok">${this.t("cheapNow")}</span>` : ""}${sig.sell_low ? ` · <span class="badge">${this.t("sellLowNow")}</span>` : ""}</div>` : ""}
<div class="kv"><span>${this.t("sourceNow")}</span><span>${esc(this._provName(srcNow))}${dyn.backup_now ? ` (${this.t("provBackup")})` : ""}</span></div>
${sig.sell != null ? `<div class="kv"><span>${this.t("sellPrice")}</span><span>${this._money(sig.sell, cur, 4)}</span></div>` : ""}
<div class="kv"><span>${this.t("validUntil")}</span><span>${dyn.valid_until ? this._ts(dyn.valid_until) : "—"}</span></div>
${dyn.last_fetch ? `<div class="kv"><span>${this.t("lastFetch")}</span><span>${this._fmt(dyn.last_fetch)}</span></div>` : ""}
${dyn.next_fetch ? `<div class="kv"><span>${this.t("nextFetch")}</span><span>${this._fmt(dyn.next_fetch)}</span></div>` : ""}
${dyn.last_error && dyn.last_error !== "none" ? `<div class="kv"><span>${this.t("lastError")}</span><span class="badge fail">${esc(dyn.last_error)}</span></div>` : ""}
${prov?.attribution ? `<p class="hint">${this.t("attribution")}: ${esc(prov.attribution)}${/^https?:\/\//i.test(prov.terms_url || "") ? ` · <a href="${esc(prov.terms_url)}" target="_blank" rel="noopener">terms</a>` : ""}</p>` : ""}</div>`;
    return status + this._rDynConfig(dyn, cur) + this._rPriceChart(pr, cur) + this._rRules(cur) + this._rHubTime() + this._rPeaks() + this._rExtPrice();
  }

  _rDynConfig(dyn, cur) {
    const d = this._dynDraft(); const provs = (dyn.providers || []).filter((p) => p.available !== false || p.id === d.source || p.id === d.backup_source);
    const sel = (id) => this._prov(id); const net = [sel(d.source), sel(d.backup_source)].filter((p) => p && !p.local);
    const zones = []; const seen = new Set(); for (const p of net) for (const z of p.zones || []) if (!seen.has(z.id)) { seen.add(z.id); zones.push(z); }
    const haUsed = d.source === "ha" || d.backup_source === "ha";
    const spot = [sel(d.source), sel(d.backup_source)].some((p) => p && (p.id === "ha" ? d.ha_class !== "all_in" : p.class === "spot"));
    const octo = d.source === "octopus" || d.backup_source === "octopus";
    const needTok = (id) => sel(id)?.needs_token;
    const f = (label, inner, hint) => `<label class="f">${label}${inner}${hint ? `<span class="hint">${hint}</span>` : ""}</label>`;
    const provSel = (name, val, allowNone) => `<select name="${esc(name)}" data-change="dyn">${allowNone ? `<option value="none" ${val === "none" || !val ? "selected" : ""}>${this.t("noBackup")}</option>` : ""}${provs.filter((p) => !(name === "backup_source" && p.id === d.source)).map((p) => `<option value="${esc(p.id)}" ${p.id === val ? "selected" : ""}>${esc(p.name)} · ${p.class === "all_in" ? this.t("classAllIn").split(" (")[0] : "spot"}${p.local ? " · HA" : ""}</option>`).join("")}</select>`;
    return `<form data-form="dynprice"><div class="card"><h2>${this.t("provider")}<span class="sp"></span><button class="b s" type="submit">${this.t("apply")}</button></h2>
<p><label class="c"><input type="checkbox" name="enabled" data-change="dyn" ${d.enabled ? "checked" : ""}> ${this.t("dynEnabled")}</label>${d.enabled ? "" : `<span class="muted"> — ${this.t("dynOff")}</span>`}</p>
<div class="row">
  ${f(this.t("provider"), provSel("source", d.source, false))}
  ${f(this.t("backupProvider"), provSel("backup_source", d.backup_source, true))}
  ${zones.length ? f(this.t("zoneSel"), `<select name="zone" data-change="dyn">${zones.map((z) => `<option value="${esc(z.id)}" ${z.id === d.zone ? "selected" : ""}>${esc(z.id)} — ${esc(z.name)} (${esc(z.currency)})</option>`).join("")}</select>`, (() => { const z = zones.find((x) => x.id === d.zone); const ha = this._hass?.config?.currency; return z && ha && z.currency !== ha ? `⚠ ${this.t("zoneCurrencyMismatch", { zone: z.id, zone_cur: z.currency, ha }).replace("{zone_cur}", z.currency)}` : ""; })()) : ""}
  ${haUsed ? f(this.t("haClass"), `<select name="ha_class" data-change="dyn"><option value="spot" ${d.ha_class !== "all_in" ? "selected" : ""}>${this.t("classSpot")}</option><option value="all_in" ${d.ha_class === "all_in" ? "selected" : ""}>${this.t("classAllIn")}</option></select>`) : ""}
</div>
${spot ? `<div class="row">
  ${f(this.t("factor"), `<input type="number" step="0.0001" name="factor" value="${d.factor ?? 1}">`)}
  ${f(this.t("markup", { cur }), `<input type="number" step="0.0001" name="markup" value="${d.markup ?? 0}">`)}
  <label class="c"><input type="checkbox" name="zones_stack" ${d.zones_stack ? "checked" : ""}> ${this.t("zonesStack")}</label><input type="hidden" name="has_zones_stack" value="1">
</div>` : ""}
<div class="row">
  <label class="c"><input type="checkbox" name="hourly_mean" ${d.hourly_mean ? "checked" : ""}> ${this.t("hourlyMean")}</label>
  ${f(this.t("floorBuy"), `<input type="number" step="0.0001" name="floor_buy" value="${d.floor_buy ?? ""}">`)}
  ${f(this.t("floorSell"), `<input type="number" step="0.0001" name="floor_sell" value="${d.floor_sell ?? ""}">`)}
</div>
<div class="row">
  ${f(this.t("sellMode"), `<select name="sell_mode" data-change="dyn">${[["source", "sellSource"], ["plan", "sellPlan"], ["formula", "sellFormula"]].map(([v, k]) => `<option value="${esc(v)}" ${d.sell_mode === v ? "selected" : ""}>${this.t(k)}</option>`).join("")}</select>`)}
  ${d.sell_mode === "formula" ? f(this.t("kSell"), `<input type="number" step="0.0001" name="k_sell" value="${d.k_sell ?? 1}">`) + f(this.t("feedinFee", { cur }), `<input type="number" step="0.0001" name="feedin_fee" value="${d.feedin_fee ?? 0}">`) : ""}
  ${octo ? f(this.t("product"), `<input name="product" value="${esc(d.product || "")}">`) + f(this.t("exportProduct"), `<input name="export_product" value="${esc(d.export_product || "")}">`) : ""}
  ${needTok(d.source) ? f(this.t("token"), `<input type="password" name="token" autocomplete="off">`, dyn.token_set ? `✓ ${this.t("tokenSet")}` : "") : ""}
  ${needTok(d.backup_source) ? f(`${this.t("backupProvider")} · ${this.t("token")}`, `<input type="password" name="backup_token" autocomplete="off">`, dyn.backup_token_set ? `✓ ${this.t("tokenSet")}` : "") : ""}
</div>
${this.s.dynError ? `<div class="err">${this.s.dynErrorField ? `<b>${esc(this.s.dynErrorField)}</b>: ` : ""}${esc(this.s.dynError)}</div>` : ""}</div></form>`;
  }

  _rPriceChart(pr, cur) {
    const rows = pr.resolved || []; if (!rows.length) return "";
    const now = Math.floor(Date.now() / 1000); const W = this._chartW(), Hh = 200, padL = 84, padB = 22, padT = 8; const n = rows.length; const bw = Math.max(1, (W - padL) / n - 1);
    const vals = rows.map((r) => r.buy); const maxV = Math.max(...vals, 0.0001), minV = Math.min(...vals, 0);
    const ticks = this._ticks(maxV, 4); const top = ticks[ticks.length - 1] || maxV; const scale = (Hh - padB - padT) / (top - minV || 1); const zero = padT + top * scale; const y = (v) => zero - v * scale;
    const xOf = (i) => padL + i * ((W - padL) / n);
    const windows = (this.s.data.rules?.rules || []).filter((r) => r.enabled !== false && r.state?.active && r.state.active_until).map((r) => ({ from: now - (now % 900), until: r.state.active_until, name: r.name }));
    const every = Math.max(1, Math.ceil(n / Math.floor((W - padL) / 70)));
    const provs = [...new Set(rows.map((r) => r.prov))];
    const provLabel = (p) => this.t(`prov${p === "ha_push" ? "Ha" : p[0].toUpperCase() + p.slice(1)}`);
    const chart = `<svg class="pchart" viewBox="0 0 ${W} ${Hh}">
${ticks.map((t, i) => `<line x1="${padL}" y1="${y(t)}" x2="${W}" y2="${y(t)}" ${t ? 'stroke-dasharray="4 4"' : ""}/><text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${t.toFixed(2)}${i === ticks.length - 1 ? ` ${esc(cur)}${this.t("perKwh")}` : ""}</text>`).join("")}${minV < 0 ? `<text x="${padL - 6}" y="${y(minV)}" text-anchor="end">${minV.toFixed(2)}</text>` : ""}
${windows.map((w) => { const i0 = rows.findIndex((r) => r.until > w.from), i1 = rows.findIndex((r) => r.from >= w.until); const x0 = xOf(Math.max(0, i0)), x1 = i1 < 0 ? W : xOf(i1); return `<rect class="win" x="${esc(x0)}" y="${padT}" width="${Math.max(0, x1 - x0)}" height="${Hh - padB - padT}"><title>${esc(w.name)}</title></rect>`; }).join("")}
${rows.map((r, i) => { const x = xOf(i); const h = Math.abs(r.buy) * scale; const topY = r.buy >= 0 ? y(r.buy) : zero; const isNow = r.from <= now && now < r.until; const d = new Date(r.from * 1000); return `<rect class="${PROV_CLASS[r.prov] || "plan"}" x="${x}" y="${esc(topY)}" width="${bw}" height="${Math.max(h, 0.5)}"/><rect class="hit" x="${x}" y="${padT}" width="${bw + 1}" height="${Hh - padB - padT}" data-action="price-pick" data-arg="${esc(r.from)}"/>${isNow ? `<rect class="now" x="${x - 1}" y="${padT}" width="${bw + 2}" height="${Hh - padB - padT}"/>` : ""}${d.getMinutes() === 0 && x < W - 48 && (d.getHours() % (every >= 12 ? 6 : every >= 4 ? 3 : 1) === 0) ? `<text x="${x}" y="${Hh - 6}">${d.getHours() === 0 ? esc(this._fmt(r.from).replace(/,? ?\d{2}:\d{2}$/, "")) : this._hm(r.from)}</text>` : ""}`; }).join("")}</svg>`;
    const picked = rows.find((r) => r.from === this.s.pricePick) || rows.find((r) => r.from <= now && now < r.until);
    const caption = picked ? `<p class="hint" style="margin:6px 0 0">${this._fmt(picked.from, { weekday: true })} – ${this._hm(picked.until)}: <b>${this._money(picked.buy, cur, 4)}${this.t("perKwh")}</b>${picked.sell != null ? ` · ${this.t("sellCol")} ${this._money(picked.sell, cur, 4)}` : ""}${picked.raw != null && picked.raw !== picked.buy ? ` · ${this.t("raw")} ${picked.raw.toFixed(4)}` : ""} · ${provLabel(picked.prov)}${picked.hourly_mean ? " · mean" : ""}</p>` : "";
    const shown = this.s.priceAll ? rows : rows.filter((r) => r.until > now && r.from < now + 6 * 3600);
    const showProv = provs.length > 1; const showRaw = rows.some((r) => r.raw != null && Math.abs(r.raw - r.buy) > 1e-6);
    let lastDay = "";
    const trs = shown.map((r) => { const day = this._day(r.from); const head = day !== lastDay ? `<tr><td class="evday" colspan="5">${esc(day)}</td></tr>` : ""; lastDay = day; return `${head}<tr class="${r.from <= now && now < r.until ? "now" : ""}"><td>${this._hm(r.from)} – ${this._hm(r.until)}</td><td class="n">${this._money(r.buy, cur, 4)}</td><td class="n">${r.sell != null ? this._money(r.sell, cur, 4) : "—"}</td>${showRaw ? `<td class="n">${r.raw != null ? r.raw.toFixed(4) : "—"}</td>` : ""}${showProv ? `<td><span class="badge ${PROV_CLASS[r.prov] || "plan"}">${provLabel(r.prov)}${r.hourly_mean ? " · mean" : ""}</span></td>` : ""}</tr>`; }).join("");
    return `<div class="card"><h2>${this.t("resolved")}<span class="sp"></span><span class="legend">${provs.map((p) => `<span><i style="background:${p === "source" ? "var(--primary-color)" : p === "backup" ? "var(--warning-color,#ffa600)" : p === "ha_push" ? "var(--success-color,#43a047)" : "var(--disabled-text-color,#9e9e9e)"}"></i>${provLabel(p)}</span>`).join("")}<span><i style="background:none;border:2px solid var(--error-color,#db4437);box-sizing:border-box"></i>${this.t("nowMarker")}</span>${windows.length ? `<span><i style="background:var(--success-color,#43a047);opacity:.25"></i>${this.t("windowMarker")}</span>` : ""}</span></h2>
${chart}${caption}
<p><label class="c"><input type="checkbox" data-change="price-all" ${this.s.priceAll ? "checked" : ""}> ${this.t("showAll")}</label></p>
<div class="tbl nostack"><table><thead><tr><th>${this.t("interval")}</th><th class="n">${this.t("allInBuy")}</th><th class="n">${this.t("sellCol")}</th>${showRaw ? `<th class="n">${this.t("raw")}</th>` : ""}${showProv ? `<th>${this.t("attribution")}</th>` : ""}</tr></thead><tbody>
${trs}
</tbody></table></div></div>`;
  }

  _rRules(cur) {
    const rs = this.s.data.rules || {}; const list = rs.rules || []; const sig = rs.signal || {};
    const kindTxt = (r) => r.kind === "threshold" ? `≤ ${this._money(r.on_below, cur, 4)} / ≥ ${this._money(r.off_above, cur, 4)}` : r.kind === "cheapest" ? `${esc(r.periods)} × 15 min${r.consecutive ? ` · ${this.t("consecutive").toLowerCase()}` : ""} · ${r.from_h === r.to_h || (r.from_h === 0 && r.to_h === 24) ? this.t("allDay") : `${String(r.from_h).padStart(2, "0")}:00–${String(r.to_h).padStart(2, "0")}:00`}` : `${esc(r.periods)} × 15 min${r.consecutive ? ` · ${this.t("consecutive").toLowerCase()}` : ""} · ${this.t("deadlineH").split(" (")[0]} ${String(r.deadline_h).padStart(2, "0")}:00`;
    const stTxt = (r) => { const s = r.state || {}; if (s.active) return `<span class="badge ok">${this.t("windowActive", { t: this._hm(s.active_until) })}</span>`; if (s.next_start) return `<span class="badge">${this.t("windowNext", { t: this._fmt(s.next_start) })}</span>`; return `<span class="muted">${this.t("windowIdle")}</span>`; };
    return `<div class="card"><h2>${this.t("rules")}<span class="sp"></span><button class="b s" data-action="rule-add" ${list.length >= 8 ? `disabled title="${this.t("maxRules")}"` : ""}>${this.t("addRule")}</button></h2>
<p class="hint">${this.t("rulesHint")}</p>
<div class="tbl"><table><thead><tr><th>${this.t("enabled")}</th><th>${this.t("name")}</th><th>${this.t("ruleType")}</th><th>${this.t("conditions")}</th><th>${this.t("state")}</th><th>${this.t("actions")}</th></tr></thead><tbody>
${!list.length ? `<tr><td class="empty" colspan="6">${this.t("emptyRules")}</td></tr>` : ""}
${list.map((r) => `<tr class="${r.enabled === false ? "dim" : ""}"><td><input type="checkbox" data-change="rule-enabled" data-id="${esc(r.id)}" ${r.enabled !== false ? "checked" : ""}></td><td>${esc(r.name)}</td><td>${this.t(`k_${esc(r.kind)}`)}</td><td>${esc(kindTxt(r))}</td><td>${stTxt(r)}</td>
  <td class="row"><button class="b o s" data-action="rule-edit" data-arg="${esc(r.id)}">${this.t("edit")}</button></td></tr>`).join("")}
</tbody></table></div>
<form data-form="signal" class="row" style="margin-top:12px"><span class="muted">${this.t("signalFlags")}:</span>
  <label class="f">${this.t("buyCheapBelow")}<input type="number" step="0.0001" name="buy_cheap_below" value="${sig.buy_cheap_below ?? ""}"></label>
  <label class="f">${this.t("sellLowBelow")}<input type="number" step="0.0001" name="sell_low_below" value="${sig.sell_low_below ?? ""}"></label>
  <button class="b o s" type="submit">${this.t("save")}</button></form></div>`;
  }

  _rPeaks() {
    const p = this.s.data.peaks; if (!p || !(p.max_15min_w || p.cycle_start)) return "";
    return `<div class="card wide"><h2>${this.t("peaks")}</h2>
<div class="kv"><span>${this.t("cycleDay")}</span><span>${esc(p.cycle_day)}</span></div>
<div class="kv"><span>${this.t("max15")}</span><span>${esc(p.max_15min_w)} W${p.max_15min_end ? ` · ${this._ts(p.max_15min_end)}` : ""}</span></div>
<div class="kv"><span>${this.t("maxHour")}</span><span>${esc(p.max_hour_w)} W${p.max_hour_start ? ` · ${this._ts(p.max_hour_start)}` : ""}</span></div>
<div class="kv"><span>${this.t("top3")}</span><span>${esc(p.top3_days_mean_w)} W</span></div></div>`;
  }

  _rDialog() {
    const d = this.s.dialog; const en = this.s.schema?.enums || {}; const u = d.unit || {};
    const roleSel = (cur) => `<select name="role">${(en.role || []).map((r) => `<option value="${esc(r)}" ${r === cur ? "selected" : ""}>${this._roleName(r)}</option>`).join("")}</select>`;
    const phaseSel = (cur) => `<select name="phase">${Object.entries(en.phase || {}).map(([k, v]) => `<option value="${esc(k)}" ${Number(k) === Number(cur) ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
    let body = "", title = "";
    const hint = (k) => `<span class="hint">${this.t(k)}</span>`;
    if (d.kind === "edit") {
      title = `${this.t("edit")} · ${esc(u.name)}`; this._dlgSub = `ID ${esc(u.hex)}`;
      body = `<div class="fields">
<label class="f">${this.t("name")}<input name="name" value="${esc(u.name)}" maxlength="31" required></label>
<label class="f">${this.t("shortName")}<input name="short_name" value="${esc(u.short_name || "")}" maxlength="24">${hint("hShortName")}</label>
<label class="f">${this.t("role")}${roleSel(u.role)}</label>
<label class="f">${this.t("phase")}${phaseSel(u.phase)}${hint("hPhase")}</label>
<label class="f">${this.t("ratedPower")}<input type="number" name="rated_power_w" value="${u.rated_power_w ?? ""}" min="0">${hint("hRated")}</label>
<label class="f">${this.t("maxCurrent")}<input type="number" step="0.1" name="max_current_a" value="${u.max_current_a ?? ""}" min="0">${hint("hMaxCur")}</label>
<label class="f">${this.t("groupId")}<input type="number" name="group_id" value="${u.group_id ?? 0}" min="0">${hint("hGroup")}</label>
<label class="f"><span class="c"><input type="checkbox" name="invert_sign" ${u.sources?.[0]?.invert_sign ? "checked" : ""}> ${this.t("invertSign")}</span>${hint("hInvert")}</label>
${(() => { const sn = (this.s.data.sensors?.sensors || []).find((x) => x.unit_id === u.hex); const md = sn && (this.s.data.sensors?.modules || []).find((m) => m.module === sn.module); const models = en.ct_model || {};
  return sn && md?.ct_settable && Object.keys(models).length ? `<label class="f">${this.t("ctModel")}<select name="ct_code">${Object.entries(models).map(([k, v]) => `<option value="${esc(k)}" ${Number(k) === Number(sn.ct_code) ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>${hint("hCtModel")}</label>` : ""; })()}
</div>`;
    } else if (d.kind === "rebind") {
      title = `${this.t("rebind")} · ${esc(u.name)}`;
      const src = u.sources?.[0] || {}; const sensors = (this.s.data.sensors?.sensors || []).filter((x) => x.iface === "i2c");
      body = `<div class="fields"><label class="f">${this.t("sensor")}<select name="sensor">${sensors.map((x) => `<option value="${x.module}:${x.ch}" ${hex4(x.unit_id) === u.hex ? "selected" : ""}>${this.t("module")} ${x.module} ${hexAddr(x.addr)} · ${esc(x.ch_label || x.ch)}${x.unit_id ? ` (${hex4(x.unit_id)})` : ""}</option>`).join("")}</select></label></div>`;
    } else if (d.kind === "create") {
      title = this.t("addPoint");
      const free = this._freeSensors();
      body = `<div class="fields">
<label class="f">${this.t("sensor")}<select name="sensor">${free.map((x) => `<option value="${x.bus}:${x.module}:${x.ch}">${this.t("module")} ${x.module} ${hexAddr(x.addr)} · ${esc(x.ch_label || x.ch)} · ${esc(x.ct_name || "")}</option>`).join("")}</select></label>
<label class="f">${this.t("name")}<input name="name" maxlength="31" required></label>
<label class="f">${this.t("role")}${roleSel("DEVICE_LOAD")}</label>
${(() => { const tombs = this.s.data.units?.data?.point_tombstones || this.s.data.units?.point_tombstones || []; return tombs.length
  ? `<label class="f"><span class="c"><input type="checkbox" name="reuse" data-change="reuse-toggle"> ${this.t("reusePoint")}</span>${hint("hReuse")}</label>
<label class="f reuse-pick" hidden>${this.t("retiredPoint")}<select name="reuse_point">${tombs.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("")}</select>${hint("hRetiredPoint")}</label>`
  : `<div class="muted">${this.t("noRetired")}</div>`; })()}</div>`;
    } else if (d.kind === "rule") {
      const r = d.rule; title = r.id ? `${this.t("edit")} · ${esc(r.name)}` : this.t("addRule"); this._dlgSub = this.t(`k_${esc(r.kind)}`);
      const hsel = (name, val, max) => `<select name="${esc(name)}">${Array.from({ length: max + 1 }, (_, k) => `<option value="${esc(k)}" ${k === Number(val ?? 0) ? "selected" : ""}>${String(k).padStart(2, "0")}:00</option>`).join("")}</select>`;
      const dur = (val) => `<select name="periods">${[1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 48, 96].map((p) => `<option value="${esc(p)}" ${p === Number(val ?? 8) ? "selected" : ""}>${p < 4 ? `${p * 15} ${this.t("min")}` : `${p % 4 ? (p / 4).toFixed(2).replace(/\.?0+$/, "") : p / 4} ${this.t("h")}`}</option>`).join("")}</select>`;
      const cur = this._currency();
      body = `<div class="fields">
<label class="f">${this.t("name")}<input name="name" value="${esc(r.name || "")}" maxlength="23" required></label>
<label class="f">${this.t("ruleType")}<select name="kind" data-change="rule-kind">${["threshold", "cheapest", "deadline"].map((k) => `<option value="${esc(k)}" ${r.kind === k ? "selected" : ""}>${this.t(`k_${esc(k)}`)}</option>`).join("")}</select></label>
${r.kind === "threshold" ? `<label class="f">${this.t("onBelow")}, ${esc(cur)}${this.t("perKwh")}<input type="number" step="0.0001" name="on_below" value="${r.on_below ?? ""}" required></label><label class="f">${this.t("offAbove")}, ${esc(cur)}${this.t("perKwh")}<input type="number" step="0.0001" name="off_above" value="${r.off_above ?? ""}" required><span class="hint">${this.t("allIn")}</span></label>` : ""}
${r.kind === "cheapest" ? `<label class="f">${this.t("searchWindow")} · ${this.t("from")}${hsel("from_h", r.from_h, 23)}</label><label class="f">${this.t("searchWindow")} · ${this.t("to")}${hsel("to_h", r.to_h === 0 && r.from_h === 0 ? 24 : r.to_h, 24)}</label>` : ""}
${r.kind === "deadline" ? `<label class="f">${this.t("finishBy")}${hsel("deadline_h", r.deadline_h ?? 7, 23)}</label>` : ""}
${r.kind !== "threshold" ? `<label class="f">${this.t("durationSel")}${dur(r.periods)}</label><label class="f"><span class="c"><input type="checkbox" name="consecutive" ${r.consecutive ? "checked" : ""}> ${this.t("consecutive")}</span></label>` : ""}
<label class="f"><span class="c"><input type="checkbox" name="enabled" ${r.enabled !== false ? "checked" : ""}> ${this.t("enabled")}</span></label></div>`;
    }
    if (d.kind === "confirm") {
      return `<div class="dlg-bg" data-action="dlg-close"><div class="dlg" role="alertdialog"><button class="x" type="button" data-action="dlg-close" aria-label="${this.t("close")}">×</button><h3>${this.t("confirmTitle")}</h3><p>${esc(d.text)}</p>
<div class="acts"><button class="b o" type="button" data-action="dlg-close">${this.t("cancel")}</button><button class="b d" type="button" data-action="confirm-yes">${esc(d.yes)}</button></div></div></div>`;
    }
    const delBtn = (action, arg, name) => `<button class="b o" type="button" style="margin-right:auto;color:var(--error-color,#db4437);border-color:var(--error-color,#db4437)" data-action="${esc(action)}" data-arg="${esc(arg)}" data-name="${esc(name)}">${this.t("delete")}</button>`;
    const del = d.kind === "edit" ? delBtn("delete", u.hex, u.name) : d.kind === "rule" && d.rule?.id ? delBtn("rule-del", d.rule.id, d.rule.name) : "";
    const sub = this._dlgSub; this._dlgSub = null;
    return `<div class="dlg-bg" data-action="dlg-close"><form class="dlg" data-form="${esc(d.kind)}" data-arg="${u.hex || d.rule?.id || ""}"><button class="x" type="button" data-action="dlg-close" aria-label="${this.t("close")}">×</button><h3>${title}</h3>${sub ? `<div class="subtitle">${esc(sub)}</div>` : '<div class="subtitle"></div>'}${d.error ? `<div class="err">${esc(d.error)}</div>` : ""}${body}
<div class="acts">${del}<button class="b o" type="button" data-action="dlg-close">${this.t("cancel")}</button><button class="b" type="submit">${this.t("save")}</button></div></form></div>`;
  }

  // ------------------------------------------------------------------ actions
  async _onClick(e) {
    const tabBtn = e.target.closest("[data-tab]"); if (tabBtn) { e.preventDefault(); this.s.tab = tabBtn.dataset.tab; localStorage.setItem("rbgrid.tab", this.s.tab); this.s.msg = null; this.render(); this._loadTab(); return; }
    const el = e.target.closest("[data-action]"); if (!el) return;
    const a = el.dataset.action, arg = el.dataset.arg;
    if (a === "dlg-close" && el.classList.contains("dlg-bg") && e.target !== el) return; // click inside the dialog body
    this.s.msg = null;
    try {
      if (a === "menu") this.dispatchEvent(new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true }));
      else if (a === "refresh") { this._invalidate("tele", "units", "sensors", "tariff", "i2c", "espnow"); this.s.scan = null; await this._loadTab(); }
      else if (a === "dlg-close") { this._closeDialog(false); }
      else if (a === "confirm-yes") { this._closeDialog(true); }
      else if (a === "cur-ha") { const inp = this.shadowRoot.querySelector('form[data-form="tariff"] input[name="currency_code"]'); if (inp) { inp.value = arg; inp.focus(); inp.closest("form")?.requestSubmit(); } }
      else if (a === "ev-more") { this.s.evLimit = (this.s.evLimit || 50) + 50; this.render(); }
      else if (a === "price-pick") { this.s.pricePick = Number(arg); this.render(); }
      else if (a === "pins-edit") { this.s.pinsEdit = arg === "" ? null : Number(arg); this.render(); }
      else if (a === "tz-ha") { await this._call({ cmd: "set", section: "time", data: { timezone: arg } }); this.s.msg = this.t("tzSaved"); this._invalidate("time", "rules", "signal"); await this._loadTab(); }
      else if (a === "rule-add") { this.s.dialog = { kind: "rule", rule: { kind: "cheapest", periods: 8, from_h: 0, to_h: 24, consecutive: true, enabled: true } }; this.render(); }
      else if (a === "rule-edit") { const r = (this.s.data.rules?.rules || []).find((x) => String(x.id) === arg); if (r) { this.s.dialog = { kind: "rule", rule: JSON.parse(JSON.stringify(r)) }; this.render(); } }
      else if (a === "rule-del") { this.s.dialog = null; if (!(await this._confirm(this.t("confirmRuleDel", { name: el.dataset.name }), this.t("yesDelete")))) return; await this._saveRules(this._rulesPayload().filter((r) => String(r.id) !== arg)); }
      else if (a === "dlg-edit") { this.s.dialog = { kind: "edit", unit: this._unitList().find((u) => u.hex === arg) }; this.render(); }
      else if (a === "dlg-rebind") { this.s.dialog = { kind: "rebind", unit: this._unitList().find((u) => u.hex === arg) }; this.render(); }
      else if (a === "dlg-create") { this.s.dialog = { kind: "create" }; this.render(); }
      else if (a === "delete") { if (this.s.dialog) { this.s.dialog = null; } if (!(await this._confirm(this.t("confirmDelete", { name: el.dataset.name }), this.t("yesDelete")))) return; await this._call({ cmd: "unit", op: "delete", unit: arg }); this.s.msg = this.t("deleted"); this._invalidate("units", "sensors", "tele", "i2c"); await this._loadTab(); }
      else if (a === "scan") { const r = await this._call({ cmd: "set", section: "i2c", data: { op: "scan", bus: Number(arg) } }); const rep = r.data?.reply || r.reply || r; this.s.scan = { bus: Number(arg), found: rep.devices || rep.found || [], raw: r }; this.render(); }
      else if (a === "i2c-add") { await this._call({ cmd: "set", section: "i2c", data: { op: "add", bus: Number(el.dataset.bus), addr: Number(arg) } }); this.s.scan = null; this.s.msg = this.t("saved"); this._invalidate("i2c", "sensors", "units"); await this._loadTab(); }
      else if (a === "espnow") { const data = { action: arg }; if (arg === "pair") data.seconds = 180; if (el.dataset.mac) data.mac = el.dataset.mac; await this._call({ cmd: "set", section: "espnow", data }); this._invalidate("espnow"); await this._loadTab(); }
      else if (a === "espnow-remove") { if (!(await this._confirm(this.t("confirmRemove", { mac: el.dataset.mac }), this.t("yesDelete")))) return; await this._call({ cmd: "set", section: "espnow", data: { action: "remove", mac: el.dataset.mac } }); this._invalidate("espnow", "units", "sensors"); await this._loadTab(); }
      else if (a === "price-clear") { await this._call({ cmd: "set", section: "price", data: { clear: true } }); this.s.msg = this.t("extCleared"); this._invalidate("price", "tele"); await this._loadTab(); }
      else if (a === "hist-reload") { await this._loadSeries(); this.render(); }
      else if (a === "import-stats") { const r = await this._hass.callWS({ type: "rbgrid/import_statistics", entry_id: this.s.hub.entry_id }); const names = Object.fromEntries(this._unitList().map((u) => [u.hex, u.name])); this.s.msg = `${this.t("imported")}: ${Object.entries(r.units || {}).map(([u, k]) => `${names[u] || u}: ${k.energy_in ?? 0} ${this.t("hour")}`).join(", ")}${r.errors?.length ? ` · ${this.t("error")}: ${r.errors.map((x) => x.error).join("; ")}` : ""}`; this.render(); }
    } catch (err) { this.s.error = this.t("deviceSays") + this._friendlyErr(err.message); this.render(); }
  }

  async _onChange(e) {
    const el = e.target.closest("[data-change]"); if (!el) return;
    const c = el.dataset.change;
    try {
      if (c === "hub") { this.s.hub = this.s.hubs.find((h) => h.entry_id === el.value); localStorage.setItem("rbgrid.hub", el.value); await this._loadHub(); this.render(); await this._loadTab(); }
      else if (c === "showJson") { this.s.showJson = el.checked; this.render(); }
      else if (c === "hist-unit") { this.s.hist.unit = el.value; await this._loadSeries(); this.render(); }
      else if (c === "hist-period") { this.s.hist.period = el.value; await this._loadSeries(); this.render(); }
      else if (c === "hist-range") { this.s.hist.range = el.value; await this._loadSeries(); this.render(); }
      else if (c === "ev-filter") { this.s.evFilter = el.value; this.render(); }
      else if (c === "show-diag") { this.s.showDiag = el.checked; this.render(); }
      else if (c === "price-all") { this.s.priceAll = el.checked; this.render(); }
      else if (c === "dyn") { const d = this._dynDraft(); d[el.name] = el.type === "checkbox" ? el.checked : el.value; this.render(); }
      else if (c === "rule-kind") { if (this.s.dialog?.rule) { this.s.dialog.rule.kind = el.value; this.render(); } }
      else if (c === "reuse-toggle") { const pick = el.closest("form")?.querySelector(".reuse-pick"); if (pick) pick.hidden = !el.checked; }
      else if (c === "rule-enabled") { const list = this._rulesPayload().map((r) => (String(r.id) === el.dataset.id ? { ...r, enabled: el.checked } : r)); await this._saveRules(list); }
      else if (c === "node-ch") {
        const node = (this.s.data.espnow?.nodes || []).find((n) => n.mac === el.dataset.mac); if (!node) return;
        const channels = (node.config || node.channels || []).map((x) => ({ ch: x.ch, enabled: x.ch === Number(el.dataset.ch) ? el.checked : (node.config || []).find((y) => y.ch === x.ch)?.enabled !== false, ct_code: x.ct_code }));
        await this._call({ cmd: "set", section: "espnow", data: { action: "configure", mac: node.mac, channels } });
        this._invalidate("espnow", "units", "sensors", "tele"); this.s.msg = this.t("saved"); await this._loadTab();
      }
    } catch (err) { this.s.error = this.t("deviceSays") + err.message; this.render(); }
  }

  async _onSubmit(e) {
    const form = e.target.closest("form[data-form]"); if (!form) return; e.preventDefault();
    const kind = form.dataset.form, hex = form.dataset.arg; const fd = new FormData(form); const v = (k) => fd.get(k);
    try {
      if (kind === "edit") {
        const u = this.s.dialog.unit; const data = {};
        for (const k of ["name", "short_name", "role"]) if (v(k) !== null && v(k) !== (k === "short_name" ? u.short_name || "" : u[k])) data[k] = v(k);
        for (const k of ["rated_power_w", "max_current_a", "group_id", "phase"]) { const n = num(v(k)); if (n !== null && n !== Number(u[k])) data[k] = n; }
        const inv = fd.get("invert_sign") === "on"; if (inv !== Boolean(u.sources?.[0]?.invert_sign)) data.invert_sign = inv;
        const ctNow = (this.s.data.sensors?.sensors || []).find((x) => x.unit_id === u.hex)?.ct_code; const ctNew = v("ct_code"); if (ctNew !== null && ctNow !== undefined && Number(ctNew) !== Number(ctNow)) data.ct_code = Number(ctNew);
        if (Object.keys(data).length) {
          try { await this._call({ cmd: "unit", op: "patch", unit: hex, data }); }
          catch (err) { throw new Error(this._friendlyErr(err.message, (e) => (e.code === "POINT_TOMBSTONED" && data.reuse ? e.text : null))); }
          await new Promise((r) => setTimeout(r, 1500));
        }
        this.s.dialog = null; this.s.msg = this.t("saved"); this._invalidate("units", "tele", "sensors"); await this._loadTab();
      } else if (kind === "rebind") {
        const [module, ch] = String(v("sensor")).split(":").map(Number);
        await this._call({ cmd: "unit", op: "rebind", unit: hex, data: { module, ch } });
        this.s.dialog = null; this.s.msg = this.t("saved"); this._invalidate("units", "sensors", "tele"); await this._loadTab();
      } else if (kind === "create") {
        const [bus, module, ch] = String(v("sensor")).split(":").map(Number);
        const createData = { sensor: { iface: "i2c", bus, module, ch }, name: v("name"), role: v("role") };
        // "Reuse" reclaims a retired point: the device does that only for an explicit slug (an auto-slug always takes
        // the next free one, by design), and the slug is chosen from the device's own tombstone list, never derived.
        if (fd.get("reuse") === "on" && v("reuse_point")) { createData.reuse = true; createData.point = v("reuse_point"); }
        try { await this._call({ cmd: "unit", op: "create", data: createData }); }
        catch (err) { throw new Error(this._friendlyErr(err.message, (e) => (e.code === "POINT_TOMBSTONED" && createData.reuse ? e.text : null))); }
        this.s.dialog = null; this.s.msg = this.t("created"); await new Promise((r) => setTimeout(r, 1500)); this._invalidate("units", "sensors", "tele", "i2c"); await this._loadTab();
      } else if (kind === "pins") {
        const bus = Number(form.dataset.bus), sda = Number(v("sda")), scl = Number(v("scl"));
        if (sda === scl) throw new Error(this.t("pinsSame"));
        if (!(await this._confirm(this.t("pinsConfirm", { bus, sda, scl }).replace("{sda}", sda).replace("{scl}", scl)))) return;
        await this._call({ cmd: "set", section: "i2c", data: { op: "pins", bus, sda, scl } });
        this.s.pinsEdit = null; this.s.msg = this.t("saved"); this._invalidate("i2c"); await this._loadTab();
      } else if (kind === "dynprice") {
        const cur = this.s.data.dynprice || {}; const d = this._dynDraft(); const data = {};
        d.enabled = fd.get("enabled") === "on"; if (fd.has("has_zones_stack")) d.zones_stack = fd.get("zones_stack") === "on"; d.hourly_mean = fd.get("hourly_mean") === "on";
        for (const k of ["source", "backup_source", "zone", "ha_class", "sell_mode", "product", "export_product"]) if (v(k) !== null) d[k] = v(k);
        for (const k of ["factor", "markup", "k_sell", "feedin_fee"]) if (v(k) !== null) d[k] = num(v(k)) ?? d[k];
        for (const k of ["floor_buy", "floor_sell"]) if (v(k) !== null) d[k] = v(k) === "" ? null : num(v(k));
        for (const [k, val] of Object.entries(d)) if (JSON.stringify(val) !== JSON.stringify(cur[k])) data[k] = val;
        for (const k of ["token", "backup_token"]) if (v(k)) data[k] = v(k);
        this.s.dynError = null; this.s.dynErrorField = null;
        if (Object.keys(data).length) await this._call({ cmd: "set", section: "dynprice", data });
        this.s.dyn = null; this.s.msg = this.t("dynSaved"); this._invalidate("dynprice", "price", "signal", "rules"); await this._loadTab();
      } else if (kind === "time") {
        await this._call({ cmd: "set", section: "time", data: { timezone: v("timezone") } });
        this.s.msg = this.t("tzSaved"); this._invalidate("time", "rules", "signal"); await this._loadTab();
      } else if (kind === "signal") {
        const sig = { buy_cheap_below: v("buy_cheap_below") === "" ? null : num(v("buy_cheap_below")), sell_low_below: v("sell_low_below") === "" ? null : num(v("sell_low_below")) };
        await this._saveRules(this._rulesPayload(), sig);
      } else if (kind === "rule") {
        const r0 = this.s.dialog.rule; const list = this._rulesPayload();
        const r = { id: r0.id || (Math.max(0, ...list.map((x) => x.id)) + 1), name: v("name"), kind: v("kind"), enabled: fd.get("enabled") === "on" };
        if (r.kind === "threshold") { r.on_below = num(v("on_below")); r.off_above = num(v("off_above")); }
        else { r.periods = num(v("periods")); r.consecutive = fd.get("consecutive") === "on"; if (r.kind === "cheapest") { r.from_h = num(v("from_h")); r.to_h = num(v("to_h")); } else r.deadline_h = num(v("deadline_h")); }
        const i = list.findIndex((x) => x.id === r.id); if (i >= 0) list[i] = r; else list.push(r);
        await this._saveRules(list); this.s.dialog = null; this.render();
      } else if (kind === "tariff") {
        let plan;
        if (this.s.showJson && v("json")) { try { plan = JSON.parse(v("json")); } catch { throw new Error(this.t("invalidJson")); } }
        else {
          plan = JSON.parse(JSON.stringify(this.s.data.tariff.data.list[0]));
          for (const k of ["plan_name", "provider_name", "currency_code"]) plan[k] = v(k);
          plan.currency_code = String(plan.currency_code || "").toUpperCase();
          for (const k of ["vat_percent", "energy_tax_per_kwh", "grid_usage_fee_per_kwh", "renewable_levy_per_kwh"]) plan[k] = num(v(k)) ?? plan[k];
          plan.zones.forEach((z, i) => {
            z.zone_name = v(`z${i}.zone_name`) ?? z.zone_name; z.rate_buying_per_kwh = num(v(`z${i}.rate_buying_per_kwh`)) ?? z.rate_buying_per_kwh; z.rate_selling_per_kwh = num(v(`z${i}.rate_selling_per_kwh`)) ?? z.rate_selling_per_kwh; z.is_enabled = fd.get(`z${i}.is_enabled`) === "on";
            (z.conditions || []).forEach((c, j) => {
              if (c.condition_type !== "TIME_RANGE") return;
              const pick = (k) => (v(`z${i}.c${esc(j)}.${esc(k)}_h`) === null ? null : [num(v(`z${i}.c${esc(j)}.${esc(k)}_h`)), num(v(`z${i}.c${esc(j)}.${esc(k)}_m`)) ?? 0]);
              const a = pick("start"), b = pick("end"); c.params = c.params || {};
              if (a) { c.params.start_hour = a[0]; c.params.start_minute = a[1]; }
              if (b) { c.params.end_hour = b[0]; c.params.end_minute = b[1]; }
            });
          });
          plan.is_placeholder = false;
        }
        await this._call({ cmd: "set", section: "tariff", data: plan });
        this.s.msg = this.t("tariffSaved"); await this._load("tariff", "tariff", null, true).catch(() => null); this._invalidate("tele", "price"); await this._loadTab();
      }
    } catch (err) {
      if (this.s.dialog) { this.s.dialog.error = this._friendlyErr(err.message); this.render(); }
      else if (kind === "dynprice") { const e = this._devErr(err.message); this.s.dynErrorField = e.field; this.s.dynError = this.t("deviceSays") + e.text; this.render(); }
      else { this.s.error = this.t("deviceSays") + this._friendlyErr(err.message); this.render(); }
    }
  }

  async _saveRules(list, signal) {
    const data = { rules: list }; const sig = signal || this.s.data.rules?.signal; if (sig) data.signal = sig;
    await this._call({ cmd: "set", section: "rules", data });
    this.s.msg = this.t("rulesSaved"); this._invalidate("rules", "signal"); await this._loadTab();
  }
}

if (!customElements.get("rbgrid-panel")) customElements.define("rbgrid-panel", RbgridPanel);
