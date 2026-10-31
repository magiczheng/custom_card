/**
 * Battery Monitor Card
 * ---------------------------------------------------------------------------
 * A configurable battery monitor card for Home Assistant.
 *
 * Features
 *  - Monitor any number of battery entities (configured via YAML or the UI).
 *  - Remaining charge shown as a percentage.
 *  - Battery icon changes with the charge level.
 *  - Icon and percentage color follow configurable threshold bands.
 *  - A slim progress bar visualises the remaining percentage.
 *  - Summary line with average / lowest level and low-battery count.
 *  - Rows can be sorted, laid out in 1-3 columns and act on tap ("more-info").
 *
 * Repository: https://github.com/magiczheng/custom_card
 * License: MIT
 */

const CARD_VERSION = "1.0.0";
const CARD_TYPE = "battery-monitor-card";
const EDITOR_TYPE = "battery-monitor-card-editor";

/* ------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* ------------------------------------------------------------------------- */

/** Color bands, evaluated from the highest matching `level` downwards. */
const DEFAULT_THRESHOLDS = [
  { level: 0, color: "#e53935" }, // 0-9   red
  { level: 10, color: "#fb8c00" }, // 10-29 orange
  { level: 30, color: "#f9a825" }, // 30-59 amber
  { level: 60, color: "#43a047" }, // 60+   green
];

/** Battery icon steps: [minimum level, mdi icon]. */
const ICON_STEPS = [
  [95, "mdi:battery"],
  [85, "mdi:battery-90"],
  [75, "mdi:battery-80"],
  [65, "mdi:battery-70"],
  [55, "mdi:battery-60"],
  [45, "mdi:battery-50"],
  [35, "mdi:battery-40"],
  [25, "mdi:battery-30"],
  [15, "mdi:battery-20"],
  [5, "mdi:battery-10"],
];

const DEFAULTS = {
  title: "电池监控",
  show_header: true,
  show_summary: true,
  show_area: false,
  show_icon: true,
  show_name: true,
  show_percentage: true,
  show_bar: true,
  bar_height: 8,
  rounded: true,
  min: 0,
  max: 100,
  low_battery_level: 20,
  sort: "none", // none | asc | desc | name
  columns: "auto", // auto | 1 | 2 | 3
  tap_action: { action: "more-info" },
  hold_action: { action: "none" },
};

/* ------------------------------------------------------------------------- */
/* Localization                                                               */
/* ------------------------------------------------------------------------- */

const STRINGS = {
  zh: {
    card_name: "电池监控卡片",
    card_description:
      "可配置的电池监控卡片：百分比、随电量变化的图标与颜色、剩余电量进度条",
    battery_monitor: "电池监控",
    average: "平均",
    lowest: "最低",
    low_count: "{count} 个低电量",
    unavailable: "不可用",
    unknown: "未知",
    charging: "充电中",
    empty: "还没有配置电池实体",
    empty_hint: "点击编辑，在“实体”里添加要监控的电池（可添加多个）。",
    editor_title: "标题",
    editor_entities: "实体",
    editor_show_header: "显示标题栏",
    editor_show_summary: "显示汇总（平均/最低/低电量）",
    editor_show_area: "显示区域",
    editor_show_icon: "显示图标",
    editor_show_name: "显示名称",
    editor_show_percentage: "显示百分比",
    editor_show_bar: "显示进度条",
    editor_bar_height: "进度条高度 (px)",
    editor_rounded: "圆角进度条",
    editor_min: "最小值",
    editor_max: "最大值",
    editor_low_battery_level: "低电量阈值 (%)",
    editor_sort: "排序",
    editor_columns: "列数",
    editor_tap_action: "点击动作",
    editor_hold_action: "长按动作",
    editor_sort_none: "保持配置顺序",
    editor_sort_asc: "电量从低到高",
    editor_sort_desc: "电量从高到低",
    editor_sort_name: "按名称",
    editor_columns_auto: "自动",
    editor_columns_1: "1 列",
    editor_columns_2: "2 列",
    editor_columns_3: "3 列",
  },
  en: {
    card_name: "Battery Monitor Card",
    card_description:
      "Configurable battery monitor: percentage, level-aware icon/color and a remaining-charge bar",
    battery_monitor: "Batteries",
    average: "Avg",
    lowest: "Min",
    low_count: "{count} low",
    unavailable: "Unavailable",
    unknown: "Unknown",
    charging: "Charging",
    empty: "No battery entities configured yet",
    empty_hint: "Edit the card and add one or more battery entities.",
    editor_title: "Title",
    editor_entities: "Entities",
    editor_show_header: "Show header",
    editor_show_summary: "Show summary (avg / min / low)",
    editor_show_area: "Show area",
    editor_show_icon: "Show icon",
    editor_show_name: "Show name",
    editor_show_percentage: "Show percentage",
    editor_show_bar: "Show bar",
    editor_bar_height: "Bar height (px)",
    editor_rounded: "Rounded bar",
    editor_min: "Minimum value",
    editor_max: "Maximum value",
    editor_low_battery_level: "Low battery threshold (%)",
    editor_sort: "Sort",
    editor_columns: "Columns",
    editor_tap_action: "Tap action",
    editor_hold_action: "Hold action",
    editor_sort_none: "Configuration order",
    editor_sort_asc: "Lowest first",
    editor_sort_desc: "Highest first",
    editor_sort_name: "By name",
    editor_columns_auto: "Auto",
    editor_columns_1: "1 column",
    editor_columns_2: "2 columns",
    editor_columns_3: "3 columns",
  },
};

function getLanguage(hass) {
  const raw =
    (hass && (hass.language || (hass.locale && hass.locale.language))) || "en";
  return String(raw).toLowerCase().startsWith("zh") ? "zh" : "en";
}

function t(lang, key, vars) {
  let value =
    (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || String(key);
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.split(`{${name}}`).join(String(replacement));
    }
  }
  return value;
}

/* ------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* ------------------------------------------------------------------------- */

const escapeHtml = (value) =>
  String(value == null ? "" : value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]
  );

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function formatValue(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Allow only plain CSS color values (hex / rgb / hsl / named / var(--token)).
 * Keeps configuration-provided colors out of the surrounding inline style.
 */
const CSS_COLOR_PATTERN =
  /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(\s*[0-9.,%\s]+\)|var\(--[\w-]+(\s*,\s*[^()]+)?\)|[a-z]{3,24})$/i;

function safeColor(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return CSS_COLOR_PATTERN.test(trimmed) ? trimmed : fallback;
}

/** Domains where a "toggle" action makes sense (sensors/buttons would error). */
const TOGGLE_DOMAINS = new Set([
  "automation",
  "cover",
  "fan",
  "humidifier",
  "input_boolean",
  "light",
  "media_player",
  "remote",
  "script",
  "siren",
  "switch",
  "vacuum",
]);

function batteryIcon(level) {
  if (level == null || !Number.isFinite(level)) return "mdi:battery-unknown";
  for (const [minimum, icon] of ICON_STEPS) {
    if (level >= minimum) return icon;
  }
  return "mdi:battery-outline";
}

function isCharging(stateObject) {
  if (!stateObject) return false;
  const attributes = stateObject.attributes || {};
  return (
    attributes.battery_charging === true ||
    attributes.charging === true ||
    attributes.is_charging === true
  );
}

function levelColor(level, thresholds) {
  if (level == null || !Number.isFinite(level)) {
    return "var(--disabled-text-color, #9e9e9e)";
  }
  let color = thresholds[0].color;
  for (const band of thresholds) {
    if (level >= band.level) color = band.color;
  }
  return color;
}

function resolveAreaName(hass, entityId) {
  try {
    const entity = hass.entities && hass.entities[entityId];
    let areaId = entity && entity.area_id;
    if (!areaId && entity && entity.device_id) {
      const device = hass.devices && hass.devices[entity.device_id];
      areaId = device && device.area_id;
    }
    if (!areaId) return null;
    const area = hass.areas && hass.areas[areaId];
    return (area && area.name) || null;
  } catch (_error) {
    return null;
  }
}

/* ------------------------------------------------------------------------- */
/* Configuration                                                              */
/* ------------------------------------------------------------------------- */

function normalizeEntity(entry) {
  if (typeof entry === "string") {
    const entity = entry.trim();
    return entity ? { entity } : null;
  }
  if (entry && typeof entry === "object" && typeof entry.entity === "string") {
    return {
      ...entry,
      entity: entry.entity.trim(),
      color: safeColor(entry.color, undefined),
    };
  }
  return null;
}

function normalizeThresholds(input) {
  if (!Array.isArray(input) || !input.length) return DEFAULT_THRESHOLDS.slice();
  const cleaned = input
    .filter(
      (band) =>
        band &&
        typeof band === "object" &&
        Number.isFinite(Number(band.level)) &&
        typeof band.color === "string" &&
        band.color.trim()
    )
    .map((band) => ({
      level: Number(band.level),
      color: safeColor(band.color, DEFAULT_THRESHOLDS[0].color),
    }))
    .sort((a, b) => a.level - b.level);
  return cleaned.length ? cleaned : DEFAULT_THRESHOLDS.slice();
}

function normalizeConfig(config) {
  const source = config && typeof config === "object" ? config : {};
  const parsedMin = Number.isFinite(Number(source.min))
    ? Number(source.min)
    : DEFAULTS.min;
  const parsedMax = Number.isFinite(Number(source.max))
    ? Number(source.max)
    : DEFAULTS.max;
  // Keep a sane, ordered interval: swap reversed values, never a zero span.
  const min = Math.min(parsedMin, parsedMax);
  const max = Math.max(parsedMin, parsedMax);
  const lowBatteryLevel = Number.isFinite(Number(source.low_battery_level))
    ? Number(source.low_battery_level)
    : DEFAULTS.low_battery_level;
  const columns = ["auto", "1", "2", "3"].includes(String(source.columns))
    ? String(source.columns)
    : DEFAULTS.columns;
  const sort = ["none", "asc", "desc", "name"].includes(source.sort)
    ? source.sort
    : DEFAULTS.sort;

  return {
    ...DEFAULTS,
    ...source,
    min,
    max: max > min ? max : min + 1,
    low_battery_level: lowBatteryLevel,
    columns,
    sort,
    bar_height: clamp(
      Number.isFinite(Number(source.bar_height))
        ? Number(source.bar_height)
        : DEFAULTS.bar_height,
      4,
      24
    ),
    entities: (Array.isArray(source.entities) ? source.entities : [])
      .map(normalizeEntity)
      .filter(Boolean),
    thresholds: normalizeThresholds(source.thresholds),
  };
}

/* ------------------------------------------------------------------------- */
/* Card                                                                       */
/* ------------------------------------------------------------------------- */

class BatteryMonitorCard extends HTMLElement {
  static getStubConfig(hass) {
    const entities = Object.keys((hass && hass.states) || {})
      .filter((entityId) => {
        const attributes = hass.states[entityId].attributes || {};
        return attributes.device_class === "battery";
      })
      .slice(0, 6);
    const lang = getLanguage(hass);
    return {
      title: lang === "zh" ? "电池监控" : "Batteries",
      entities,
    };
  }

  static getConfigElement() {
    return document.createElement(EDITOR_TYPE);
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._signature = null;
    this._longPressTimer = null;
    this._suppressClick = false;
    this._suppressClickRow = null;
    this._suppressClickUntil = 0;
    this._bindEvents();
  }

  setConfig(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new Error("battery-monitor-card: configuration must be an object");
    }
    this._config = normalizeConfig(config);
    this._signature = null;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const signature = this._stateSignature();
    if (signature === this._signature) return;
    this._signature = signature;
    this._render();
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    const config = this._config || DEFAULTS;
    const columns =
      config.columns === "auto"
        ? typeof window !== "undefined" && window.innerWidth >= 900
          ? 2
          : 1
        : Number(config.columns) || 1;
    const rows = Math.ceil((config.entities || []).length / columns);
    return Math.max(2, rows + (config.show_header ? 1 : 0));
  }

  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 3, min_rows: 2 };
  }

  /* ----------------------------- state -------------------------------- */

  _stateSignature() {
    if (!this._config) return "";
    const hass = this._hass;
    const parts = [getLanguage(hass)];
    for (const item of this._config.entities) {
      const stateObject = hass && hass.states && hass.states[item.entity];
      if (!stateObject) {
        parts.push(`${item.entity}|missing`);
        continue;
      }
      const attributes = stateObject.attributes || {};
      parts.push(
        [
          item.entity,
          stateObject.state,
          attributes.unit_of_measurement || "",
          attributes.friendly_name || "",
          isCharging(stateObject) ? "1" : "0",
          resolveAreaName(hass, item.entity) || "",
        ].join("|")
      );
    }
    return parts.join(";");
  }

  _collectItems(lang) {
    const config = this._config;
    const hass = this._hass;
    const items = [];

    for (const entry of config.entities) {
      const stateObject =
        hass && hass.states ? hass.states[entry.entity] : undefined;
      const attributes = (stateObject && stateObject.attributes) || {};
      const rawState = stateObject ? stateObject.state : undefined;
      const unit = attributes.unit_of_measurement || "";
      const numeric = Number.parseFloat(rawState);
      const rawLevel = Number.isFinite(numeric)
        ? numeric
        : Number.parseFloat(attributes.battery_level);
      const available = Boolean(stateObject) && Number.isFinite(rawLevel);
      const level = available ? clamp(rawLevel, config.min, config.max) : null;
      const charging = isCharging(stateObject);
      const missing = !stateObject || rawState === "unavailable";
      const name = entry.name || attributes.friendly_name || entry.entity;

      items.push({
        entity: entry.entity,
        name,
        area: entry.area || resolveAreaName(hass, entry.entity),
        level,
        charging,
        icon:
          entry.icon ||
          (available
            ? charging
              ? "mdi:battery-charging"
              : batteryIcon(level)
            : "mdi:battery-off"),
        color:
          entry.color ||
          (available
            ? levelColor(level, config.thresholds)
            : "var(--disabled-text-color, #9e9e9e)"),
        unavailable: !available,
        percentageText: available
          ? unit && unit !== "%"
            ? `${formatValue(rawLevel)} ${unit}`
            : `${Math.round(level)}%`
          : t(lang, missing ? "unavailable" : "unknown"),
      });
    }

    return this._sortItems(items);
  }

  _sortItems(items) {
    const sort = this._config.sort;
    if (sort === "none") return items;
    const sorted = items.slice();
    if (sort === "name") {
      sorted.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), getLanguage(this._hass))
      );
      return sorted;
    }
    // Unavailable entities always go last, whatever the direction.
    sorted.sort((a, b) => {
      if (a.level == null && b.level == null) return 0;
      if (a.level == null) return 1;
      if (b.level == null) return -1;
      return sort === "asc" ? a.level - b.level : b.level - a.level;
    });
    return sorted;
  }

  _summary(items, lang) {
    const config = this._config;
    if (!config.show_summary) return "";
    const levels = items
      .map((item) => item.level)
      .filter((level) => level != null);
    if (!levels.length) return "";
    const average = Math.round(
      levels.reduce((total, level) => total + level, 0) / levels.length
    );
    const lowest = Math.min(...levels);
    const lowCount = levels.filter(
      (level) => level <= config.low_battery_level
    ).length;
    let summary = `${t(lang, "average")} ${average}% · ${t(
      lang,
      "lowest"
    )} ${lowest}%`;
    if (lowCount) {
      summary += ` · ${t(lang, "low_count", { count: lowCount })}`;
    }
    return summary;
  }

  /* ----------------------------- render ------------------------------- */

  _render() {
    if (!this.shadowRoot || !this._config) return;
    const config = this._config;
    const hass = this._hass;
    const lang = getLanguage(hass);
    const items = this._collectItems(lang);
    const summary = this._summary(items, lang);
    const showHeader = config.show_header;

    let body;
    if (!items.length) {
      body = `
        <div class="empty" role="status">
          <ha-icon icon="mdi:battery-outline"></ha-icon>
          <div class="empty-title">${escapeHtml(t(lang, "empty"))}</div>
          <div class="empty-hint">${escapeHtml(t(lang, "empty_hint"))}</div>
        </div>`;
    } else {
      const gridClass = config.columns === "auto" ? "auto" : "fixed";
      const gridStyle =
        config.columns === "auto"
          ? `--bmc-bar-height:${config.bar_height}px;`
          : `--bmc-cols:${Number(config.columns)};--bmc-bar-height:${config.bar_height}px;`;
      body = `
        <div class="grid ${gridClass}" style="${gridStyle}">
          ${items.map((item) => this._rowTemplate(item, lang)).join("")}
        </div>`;
    }

    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        <div class="card-content">
          ${
            showHeader
              ? `<div class="card-header">
                   <ha-icon class="header-icon" icon="mdi:battery-heart-variant"></ha-icon>
                   <span class="card-title">${escapeHtml(
                     config.title || t(lang, "battery_monitor")
                   )}</span>
                   ${summary ? `<span class="card-summary">${escapeHtml(summary)}</span>` : ""}
                 </div>`
              : ""
          }
          ${body}
        </div>
      </ha-card>`;
  }

  _rowTemplate(item, lang) {
    const config = this._config;
    const pct = item.percentageText;
    const width =
      item.level == null
        ? 0
        : clamp(
            ((item.level - config.min) / (config.max - config.min)) * 100,
            0,
            100
          );
    const ariaLabel = `${item.name} ${pct}`;
    const roundedClass = config.rounded ? "" : " square";
    const subtitleParts = [];
    if (config.show_area && item.area) subtitleParts.push(item.area);
    if (item.charging) subtitleParts.push(t(lang, "charging"));

    return `
      <div class="battery-row${roundedClass}${item.unavailable ? " unavailable" : ""}"
           role="button" tabindex="0"
           data-entity="${escapeHtml(item.entity)}"
           aria-label="${escapeHtml(ariaLabel)}"
           style="--bmc-color:${escapeHtml(item.color)}">
        ${config.show_icon ? `<ha-icon class="icon" icon="${escapeHtml(item.icon)}"></ha-icon>` : ""}
        <div class="content">
          <div class="line">
            ${config.show_name ? `<span class="name">${escapeHtml(item.name)}</span>` : ""}
            ${config.show_percentage ? `<span class="pct">${escapeHtml(pct)}</span>` : ""}
          </div>
          ${
            config.show_bar
              ? `<div class="bar" role="progressbar"
                     aria-valuemin="${config.min}" aria-valuemax="${config.max}"
                     aria-valuenow="${item.level == null ? 0 : Math.round(item.level)}"
                     aria-label="${escapeHtml(ariaLabel)}">
                   <div class="fill" style="width:${width}%"></div>
                 </div>`
              : ""
          }
          ${subtitleParts.length ? `<div class="sub">${escapeHtml(subtitleParts.join(" · "))}</div>` : ""}
        </div>
      </div>`;
  }

  /* ----------------------------- events ------------------------------- */

  _rowFromEvent(event) {
    const path =
      typeof event.composedPath === "function"
        ? event.composedPath()
        : [event.target];
    for (const node of path) {
      if (
        node &&
        node.classList &&
        node.classList.contains("battery-row")
      ) {
        return node;
      }
    }
    return null;
  }

  _bindEvents() {
    this.shadowRoot.addEventListener("click", (event) => {
      const row = this._rowFromEvent(event);
      if (row && this._suppressClick) {
        const sameRow = row.dataset.entity === this._suppressClickRow;
        const recent = Date.now() < this._suppressClickUntil;
        this._suppressClick = false;
        this._suppressClickRow = null;
        if (sameRow && recent) return;
      }
      if (row) this._handleAction(this._config.tap_action, row.dataset.entity);
    });

    this.shadowRoot.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      const row = this._rowFromEvent(event);
      if (!row) return;
      event.preventDefault();
      this._handleAction(this._config.tap_action, row.dataset.entity);
    });

    this.shadowRoot.addEventListener("pointerdown", (event) => {
      const row = this._rowFromEvent(event);
      if (!row || !this._config.hold_action) return;
      if (this._config.hold_action.action === "none") return;
      this._longPressTimer = window.setTimeout(() => {
        this._longPressTimer = null;
        this._suppressClick = true;
        this._suppressClickRow = row.dataset.entity;
        this._suppressClickUntil = Date.now() + 700;
        this._handleAction(this._config.hold_action, row.dataset.entity);
      }, 500);
    });

    const cancelLongPress = () => {
      if (this._longPressTimer) {
        window.clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
      }
    };
    this.shadowRoot.addEventListener("pointerup", cancelLongPress);
    this.shadowRoot.addEventListener("pointercancel", cancelLongPress);
    this.shadowRoot.addEventListener("pointerleave", cancelLongPress);
  }

  disconnectedCallback() {
    if (this._longPressTimer) {
      window.clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  _handleAction(action, entityId) {
    if (!action || action.action === "none" || !entityId) return;
    const hass = this._hass;
    switch (action.action) {
      case "more-info":
        this.dispatchEvent(
          new CustomEvent("hass-more-info", {
            detail: { entityId },
            bubbles: true,
            composed: true,
          })
        );
        break;
      case "toggle": {
        if (!hass) break;
        const domain = entityId.split(".")[0];
        if (TOGGLE_DOMAINS.has(domain)) {
          hass.callService(domain, "toggle", { entity_id: entityId });
        } else {
          // e.g. a battery sensor cannot be toggled: fall back to more-info.
          this.dispatchEvent(
            new CustomEvent("hass-more-info", {
              detail: { entityId },
              bubbles: true,
              composed: true,
            })
          );
        }
        break;
      }
      case "navigate":
        if (action.navigation_path) {
          window.history.pushState(null, "", action.navigation_path);
          window.dispatchEvent(new Event("location-changed"));
        }
        break;
      case "url":
        if (action.url_path) {
          window.open(action.url_path, action.target || "_blank");
        }
        break;
      case "fire-dom-event":
        this.dispatchEvent(
          new CustomEvent("ll-custom", {
            detail: action,
            bubbles: true,
            composed: true,
          })
        );
        break;
      default:
        break;
    }
  }
}

/* ------------------------------------------------------------------------- */
/* Visual editor                                                              */
/* ------------------------------------------------------------------------- */

class BatteryMonitorCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._form = null;
  }

  setConfig(config) {
    this._config = config || {};
    if (this._form) this._form.data = this._formData();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _formData() {
    const config = this._config || {};
    return {
      ...config,
      entities: (config.entities || [])
        .map((entry) =>
          typeof entry === "string" ? entry : entry && entry.entity
        )
        .filter(Boolean),
    };
  }

  _schema(lang) {
    return [
      { name: "title", selector: { text: {} } },
      { name: "entities", selector: { entity: { multiple: true } } },
      { name: "show_header", selector: { boolean: {} } },
      { name: "show_summary", selector: { boolean: {} } },
      { name: "show_area", selector: { boolean: {} } },
      { name: "show_icon", selector: { boolean: {} } },
      { name: "show_name", selector: { boolean: {} } },
      { name: "show_percentage", selector: { boolean: {} } },
      { name: "show_bar", selector: { boolean: {} } },
      {
        name: "bar_height",
        selector: { number: { min: 4, max: 24, step: 1, mode: "box" } },
      },
      { name: "rounded", selector: { boolean: {} } },
      {
        name: "min",
        selector: { number: { min: 0, max: 100, step: 1, mode: "box" } },
      },
      {
        name: "max",
        selector: { number: { min: 1, max: 100, step: 1, mode: "box" } },
      },
      {
        name: "low_battery_level",
        selector: { number: { min: 0, max: 100, step: 1, mode: "box" } },
      },
      {
        name: "sort",
        selector: {
          select: {
            options: [
              { value: "none", label: t(lang, "editor_sort_none") },
              { value: "asc", label: t(lang, "editor_sort_asc") },
              { value: "desc", label: t(lang, "editor_sort_desc") },
              { value: "name", label: t(lang, "editor_sort_name") },
            ],
          },
        },
      },
      {
        name: "columns",
        selector: {
          select: {
            options: [
              { value: "auto", label: t(lang, "editor_columns_auto") },
              { value: "1", label: t(lang, "editor_columns_1") },
              { value: "2", label: t(lang, "editor_columns_2") },
              { value: "3", label: t(lang, "editor_columns_3") },
            ],
          },
        },
      },
      { name: "tap_action", selector: { action: {} } },
      { name: "hold_action", selector: { action: {} } },
    ];
  }

  _labels(lang) {
    const keys = {
      title: "editor_title",
      entities: "editor_entities",
      show_header: "editor_show_header",
      show_summary: "editor_show_summary",
      show_area: "editor_show_area",
      show_icon: "editor_show_icon",
      show_name: "editor_show_name",
      show_percentage: "editor_show_percentage",
      show_bar: "editor_show_bar",
      bar_height: "editor_bar_height",
      rounded: "editor_rounded",
      min: "editor_min",
      max: "editor_max",
      low_battery_level: "editor_low_battery_level",
      sort: "editor_sort",
      columns: "editor_columns",
      tap_action: "editor_tap_action",
      hold_action: "editor_hold_action",
    };
    const labels = {};
    for (const [field, key] of Object.entries(keys)) {
      labels[field] = t(lang, key);
    }
    return labels;
  }

  _render() {
    if (!this._hass) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (event) =>
        this._valueChanged(event)
      );
      this.shadowRoot.appendChild(this._form);
    }
    const lang = getLanguage(this._hass);
    this._form.hass = this._hass;
    this._form.schema = this._schema(lang);
    this._form.data = this._formData();
    this._form.computeLabel = (schema) => this._labels(lang)[schema.name] || schema.name;
  }

  _valueChanged(event) {
    const value = event.detail.value;
    const previous = new Map();
    for (const entry of (this._config && this._config.entities) || []) {
      if (entry && typeof entry === "object" && entry.entity) {
        previous.set(entry.entity, entry);
      }
    }
    const entities = (value.entities || [])
      .map((entityId) => previous.get(entityId) || entityId)
      .filter(Boolean);
    const config = { ...value, entities };
    this._config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

/* ------------------------------------------------------------------------- */
/* Styles                                                                     */
/* ------------------------------------------------------------------------- */

const CARD_STYLES = `
  :host {
    display: block;
  }

  ha-card {
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px 16px;
    box-sizing: border-box;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 24px;
  }

  .card-header .header-icon {
    color: var(--primary-color);
    --mdc-icon-size: 20px;
    flex: 0 0 auto;
  }

  .card-title {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
    font-weight: 500;
    line-height: 1.2;
    color: var(--primary-text-color);
  }

  .card-summary {
    flex: 0 0 auto;
    font-size: 12px;
    color: var(--secondary-text-color);
    white-space: nowrap;
  }

  .grid {
    display: grid;
    gap: 6px 16px;
    align-content: start;
  }

  .grid.auto {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .grid.fixed {
    grid-template-columns: repeat(var(--bmc-cols, 1), minmax(0, 1fr));
  }

  .battery-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px;
    margin: 0 -8px;
    border-radius: 10px;
    cursor: pointer;
    outline: none;
    transition: background-color 0.2s ease;
  }

  .battery-row:hover {
    background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
  }

  .battery-row:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 1px;
  }

  ha-icon.icon {
    color: var(--bmc-color);
    --mdc-icon-size: 24px;
    flex: 0 0 auto;
  }

  .content {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  .name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    line-height: 1.2;
    color: var(--primary-text-color);
  }

  .pct {
    flex: 0 0 auto;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--bmc-color);
    font-variant-numeric: tabular-nums;
  }

  .bar {
    height: var(--bmc-bar-height, 8px);
    border-radius: 999px;
    background: var(--divider-color, rgba(127, 127, 127, 0.25));
    overflow: hidden;
  }

  .battery-row.square .bar,
  .battery-row.square .fill {
    border-radius: 2px;
  }

  .fill {
    height: 100%;
    border-radius: inherit;
    background: var(--bmc-color);
    transition: width 0.4s ease, background-color 0.4s ease;
  }

  .sub {
    font-size: 11px;
    line-height: 1.2;
    color: var(--secondary-text-color);
  }

  .unavailable .name,
  .unavailable .pct {
    color: var(--disabled-text-color, #9e9e9e);
  }

  .unavailable .icon {
    color: var(--disabled-text-color, #9e9e9e);
  }

  .unavailable .fill {
    background: var(--disabled-text-color, #9e9e9e);
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 18px 8px 10px;
    text-align: center;
    color: var(--secondary-text-color);
  }

  .empty ha-icon {
    --mdc-icon-size: 32px;
    opacity: 0.6;
  }

  .empty-title {
    font-size: 14px;
    color: var(--primary-text-color);
  }

  .empty-hint {
    font-size: 12px;
    max-width: 320px;
  }
`;

/* ------------------------------------------------------------------------- */
/* Registration                                                               */
/* ------------------------------------------------------------------------- */

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, BatteryMonitorCard);
}
if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, BatteryMonitorCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "Battery Monitor Card",
    description:
      "Battery monitor: percentage, level-aware icon & color, remaining-charge bar / 电池监控：百分比、随电量变化的图标与颜色、剩余电量进度条",
    preview: true,
    documentationURL: "https://github.com/magiczheng/custom_card",
  });
}

console.info(
  `%c BATTERY-MONITOR-CARD %c v${CARD_VERSION} `,
  "color: white; background: #43a047; font-weight: 700; border-radius: 3px 0 0 3px;",
  "color: #43a047; background: #e8f5e9; font-weight: 700; border-radius: 0 3px 3px 0;"
);
