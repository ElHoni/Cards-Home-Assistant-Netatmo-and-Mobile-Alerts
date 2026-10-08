/*
 * Netatmo Regenmesser & Windmesser – Lovelace Custom Cards
 * (passend zur netatmo-indoor-card.js, gleiche Optik)
 *
 * Installation:
 *   1. Datei nach /config/www/netatmo-gauge-cards.js kopieren
 *   2. Einstellungen → Dashboards → ⋮ → Ressourcen → Hinzufügen
 *      URL: /local/netatmo-gauge-cards.js   Typ: JavaScript-Modul
 *   3. Browser-/App-Cache leeren
 *
 * ── Regenmesser ──────────────────────────────────────────
 *   type: custom:netatmo-rain-card
 *   name: Garten
 *   rain: sensor.regenmesser_niederschlag          # aktuell (optional)
 *   rain_1h: sensor.regenmesser_niederschlag_1h    # letzte Stunde (optional)
 *   rain_24h: sensor.regenmesser_niederschlag_24h  # letzte 24 h (optional)
 *   wifi: sensor.regenmesser_funksignal            # optional
 *   battery: sensor.regenmesser_batterie           # optional
 *   rain_max: 30                                   # mm für „Glas voll“ (Standard 30)
 *
 * ── Windmesser ───────────────────────────────────────────
 *   type: custom:netatmo-wind-card
 *   name: Dach
 *   wind_speed: sensor.windmesser_windgeschwindigkeit
 *   wind_direction: sensor.windmesser_windrichtung   # Grad oder Text (N, SW …)
 *   gust_speed: sensor.windmesser_boen               # optional
 *   gust_direction: sensor.windmesser_boenrichtung   # optional
 *   wifi: sensor.windmesser_funksignal               # optional
 *   battery: sensor.windmesser_batterie              # optional
 *   direction_mode: from                             # from = „Wind kommt aus …“ (Standard), to = „weht nach …“
 *
 * Ein Tipp auf eine Zeile oder das Gerät öffnet den Verlauf.
 */

const STYLE = `
:host { display:block; }
ha-card { padding:14px; overflow:hidden; }
.wrap { container-type:inline-size; display:grid; grid-template-columns:minmax(0,38%) minmax(0,1fr); gap:12px 14px; align-items:center; }
.dev { position:relative; cursor:pointer; min-width:0; }
.dev svg { width:100%; height:auto; display:block; overflow:visible; }
.rows { display:flex; flex-direction:column; min-width:0; }
.row { display:grid; grid-template-columns:clamp(22px,6.5cqw,30px) minmax(0,1fr) auto; column-gap:clamp(6px,2.4cqw,10px); align-items:center;
  padding:clamp(7px,2.6cqw,11px) 0 clamp(6px,2.2cqw,9px); border-bottom:1px solid var(--divider-color, rgba(127,127,127,.25)); cursor:pointer; }
.row:last-child { border-bottom:0; }
.row.na { opacity:.4; }
.ic { display:flex; align-items:center; justify-content:center; }
.ic svg { width:clamp(20px,5.8cqw,26px); height:clamp(20px,5.8cqw,26px); }
.lab { color:var(--primary-text-color); font-size:clamp(11.5px,3.5cqw,15px); line-height:1.2; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lab small { display:block; color:var(--secondary-text-color); font-size:clamp(10.5px,2.9cqw,12.5px); margin-top:2px; overflow:hidden; text-overflow:ellipsis; }
.val { font-size:clamp(15px,5cqw,24px); font-weight:500; color:var(--primary-text-color); font-variant-numeric:tabular-nums; white-space:nowrap; text-align:right; }
.val.t { font-size:clamp(12.5px,3.6cqw,16px); }
.val span { font-size:.58em; font-weight:400; color:var(--secondary-text-color); margin-left:2px; }
.bar { grid-column:2 / 4; height:clamp(3px,.9cqw,4px); border-radius:2px; margin-top:clamp(4px,1.8cqw,7px); background:var(--divider-color, rgba(127,127,127,.25)); overflow:hidden; }
.bar i { display:block; height:100%; border-radius:2px; transition:width .6s ease, background .6s ease; }
.glow { transition:fill .6s ease, stroke .6s ease; }
.rot { transition:transform .8s cubic-bezier(.3,1.3,.5,1); }
@container (max-width:420px) { .wrap { grid-template-columns:minmax(0,34%) minmax(0,1fr); gap:10px; } }
@container (max-width:260px) { .wrap { grid-template-columns:1fr; } .dev { max-width:130px; margin:0 auto; } }
`;

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const hex2rgb = (h) => {
  h = String(h).replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgb2hex = (r) => "#" + r.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
function colorScale(stops, v) {
  const s = [...stops].sort((a, b) => a.value - b.value);
  if (v <= s[0].value) return s[0].color;
  if (v >= s[s.length - 1].value) return s[s.length - 1].color;
  for (let i = 0; i < s.length - 1; i++) {
    if (v >= s[i].value && v <= s[i + 1].value) {
      const t = (v - s[i].value) / (s[i + 1].value - s[i].value);
      const a = hex2rgb(s[i].color), b = hex2rgb(s[i + 1].color);
      return rgb2hex(a.map((x, k) => x + (b[k] - x) * t));
    }
  }
  return s[0].color;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GREY = "#8a8e95";

/* ---------- Symbole ---------- */
const svgI = (inner) => `<svg viewBox="0 0 24 24">${inner}</svg>`;
const icon = {
  drop: (c) => svgI(`<path d="M12 3C12 3 5 11 5 15a7 7 0 0 0 14 0C19 11 12 3 12 3z" fill="${c}" opacity=".9"/>`),
  clock: (c) => svgI(`<circle cx="12" cy="12" r="9" fill="none" stroke="${c}" stroke-width="2"/><path d="M12 7v5l3.5 2" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`),
  day: (c) => svgI(`<circle cx="12" cy="12" r="10" fill="none" stroke="${c}" stroke-width="2"/><text x="12" y="15.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="${c}" font-family="Helvetica,Arial,sans-serif">24h</text>`),
  wind: (c) => svgI(`<path d="M3 9h10.5a2.7 2.7 0 1 0-2.7-2.7M3 13h14.5a2.9 2.9 0 1 1-2.9 2.9M3 17h7" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`),
  gust: (c) => svgI(`<path d="M3 9h10.5a2.7 2.7 0 1 0-2.7-2.7M3 13h14.5a2.9 2.9 0 1 1-2.9 2.9M3 17h7" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 3.2"/>`),
  compass: (c, a) => svgI(`<circle cx="12" cy="12" r="10" fill="none" stroke="${c}" stroke-width="1.8" opacity=".6"/><g style="transform:rotate(${a}deg);transform-origin:12px 12px;transition:transform .8s"><path d="M12 3.5l3.2 8.5h-6.4z" fill="${c}"/><path d="M12 20.5l-3.2-8.5h6.4z" fill="${c}" opacity=".3"/></g>`),
  wifi: (lvl, c) => svgI([0, 1, 2, 3].map((i) => `<rect x="${3 + i * 5.2}" y="${19 - (i + 1) * 4.2}" width="3.6" height="${(i + 1) * 4.2}" rx="1" fill="${i < lvl ? c : "currentColor"}" opacity="${i < lvl ? 1 : 0.2}"/>`).join("")),
  bat: (p, c) => svgI(`<rect x="2" y="7" width="18" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1.6"/><rect x="21" y="10.5" width="2" height="3" rx="1" fill="currentColor" opacity=".6"/><rect x="4" y="9" width="${(14 * p) / 100}" height="6" rx="1.2" fill="${c}"/>`),
};

/* ---------- Basisklasse ---------- */
class NetatmoGaugeBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._html = "";
  }
  setConfig(config) {
    if (!config) throw new Error("Ungültige Konfiguration");
    this._validate(config);
    this._config = { name: this._defaultName, ...config };
    this._html = "";
    if (this._hass) this._render();
  }
  set hass(hass) { this._hass = hass; this._render(); }
  getCardSize() { return 4; }

  _s(id) {
    const s = id && this._hass?.states?.[id];
    if (!s || ["unavailable", "unknown", "none", ""].includes(String(s.state).toLowerCase())) return null;
    return s;
  }
  _n(id) {
    const s = this._s(id);
    if (!s) return null;
    const v = parseFloat(String(s.state).replace(",", "."));
    return Number.isFinite(v) ? v : null;
  }
  _unit(id, fallback = "") { return this._s(id)?.attributes?.unit_of_measurement || fallback; }
  _fmt(v, d = 0) {
    return v.toLocaleString(this._hass?.locale?.language || "de", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  _esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  _wifi(id) {
    const s = this._s(id);
    if (!s) return null;
    const unit = s.attributes?.unit_of_measurement || "";
    const num = parseFloat(String(s.state).replace(",", "."));
    let lvl, raw = null;
    if (Number.isFinite(num)) {
      raw = num + (unit ? " " + unit : "");
      if (unit === "dBm" || num < 0) lvl = num >= -55 ? 4 : num >= -65 ? 3 : num >= -75 ? 2 : num >= -85 ? 1 : 0;
      else if (unit === "%") lvl = num > 75 ? 4 : num > 50 ? 3 : num > 25 ? 2 : 1;
      else lvl = num <= 56 ? 4 : num <= 71 ? 3 : num <= 86 ? 2 : 1;
    } else {
      const t = String(s.state).toLowerCase();
      if (/(full|excellent|sehr gut|very good)/.test(t)) lvl = 4;
      else if (/(high|good|gut)/.test(t)) lvl = 3;
      else if (/(medium|average|mittel|ok)/.test(t)) lvl = 2;
      else if (/(low|bad|poor|schlecht|schwach)/.test(t)) lvl = 1;
      else lvl = 0;
    }
    const txt = ["Kein Signal", "Schwach", "Mittel", "Gut", "Sehr gut"][lvl];
    const col = lvl >= 3 ? "#4ade80" : lvl === 2 ? "#facc15" : lvl === 1 ? "#fb923c" : "#ef4444";
    return { lvl, txt, col, raw };
  }
  _bat(id) {
    const s = this._s(id);
    if (!s) return null;
    let pct = parseFloat(String(s.state).replace(",", "."));
    if (!Number.isFinite(pct)) {
      const t = String(s.state).toLowerCase().replace(/_/g, " ");
      pct = /very low|sehr niedrig|critical/.test(t) ? 8 : /full|voll/.test(t) ? 100 : /high|hoch/.test(t) ? 75
        : /medium|mittel/.test(t) ? 50 : /low|niedrig/.test(t) ? 25 : null;
      if (pct === null) return null;
    }
    pct = clamp(pct, 0, 100);
    return { pct, col: pct > 40 ? "#4ade80" : pct > 20 ? "#fb923c" : "#ef4444", txt: pct > 60 ? "Voll" : pct > 40 ? "Gut" : pct > 20 ? "Niedrig" : "Fast leer" };
  }

  _row(ent, ic, label, sub, val, unit, pct, col, o = {}) {
    const na = val === null;
    return `
      <div class="row ${na ? "na" : ""}" data-e="${ent || ""}">
        <div class="ic">${ic}</div>
        <div class="lab">${label}<small>${sub}</small></div>
        <div class="val${o.small ? " t" : ""}">${na ? "–" : val}${!na && unit ? `<span>${unit}</span>` : ""}</div>
        ${o.nobar ? "" : `<div class="bar"><i style="width:${na ? 0 : pct}%;background:${col}"></i></div>`}
      </div>`;
  }
  _radioRows() {
    const cfg = this._config, out = [];
    if (cfg.wifi) {
      const wf = this._wifi(cfg.wifi);
      out.push(this._row(cfg.wifi, icon.wifi(wf ? wf.lvl : 0, wf ? wf.col : GREY), "Funksignal",
        wf ? (wf.raw ? wf.txt : "Signalstärke") : "Nicht verfügbar", wf ? (wf.raw ?? wf.txt) : null, "",
        wf ? (wf.lvl / 4) * 100 : 0, wf ? wf.col : GREY, { small: true }));
    }
    if (cfg.battery) {
      const bt = this._bat(cfg.battery);
      out.push(this._row(cfg.battery, icon.bat(bt ? bt.pct : 0, bt ? bt.col : GREY), "Batterie", bt ? bt.txt : "Nicht verfügbar",
        bt ? this._fmt(bt.pct, 0) : null, "%", bt ? bt.pct : 0, bt ? bt.col : GREY));
    }
    return out;
  }

  _render() {
    if (!this._config || !this._hass) return;
    const d = this._draw();
    const html = d.svg + "|" + d.rows;
    if (html === this._html) return;
    this._html = html;
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>
      <ha-card><div class="wrap">
        <div class="dev" data-e="${d.main || ""}">${d.svg}</div>
        <div class="rows">${d.rows}</div>
      </div></ha-card>`;
    this.shadowRoot.querySelectorAll("[data-e]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.e;
        if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true }));
      });
    });
  }
}

/* ======================================================================
 *  REGENMESSER
 * ==================================================================== */
const RAIN_COLORS = [
  { value: 0, color: "#7dd3fc" }, { value: 5, color: "#38bdf8" }, { value: 15, color: "#3b82f6" },
  { value: 30, color: "#6366f1" }, { value: 60, color: "#a855f7" },
];

class NetatmoRainCard extends NetatmoGaugeBase {
  get _defaultName() { return "Regen"; }
  static getStubConfig() { return { name: "Regen", rain_24h: "" }; }
  _validate(c) {
    if (!c.rain && !c.rain_1h && !c.rain_24h) throw new Error("Bitte mindestens „rain“, „rain_1h“ oder „rain_24h“ angeben");
  }

  _draw() {
    const cfg = this._config;
    const cur = this._n(cfg.rain), h1 = this._n(cfg.rain_1h), h24 = this._n(cfg.rain_24h);
    const max = cfg.rain_max || 30;
    // Hauptwert: 24 h > 1 h > aktuell
    let main, mainLbl, mainEnt;
    if (cfg.rain_24h) { main = h24; mainLbl = "24 h"; mainEnt = cfg.rain_24h; }
    else if (cfg.rain_1h) { main = h1; mainLbl = "1 h"; mainEnt = cfg.rain_1h; }
    else { main = cur; mainLbl = "aktuell"; mainEnt = cfg.rain; }
    const unit = this._unit(mainEnt, "mm");
    const col = main === null ? GREY : colorScale(RAIN_COLORS, main);
    const pct = main === null ? 0 : main > 0 ? clamp(main / max, 0.04, 1) : 0;
    const top = 282 - 160 * pct;
    const raining = cur !== null && cur > 0;
    const txt = main === null ? "–" : this._fmt(main, main < 10 ? 1 : 0);

    const ticks = [0.25, 0.5, 0.75, 1].map((k) => `<line x1="56" x2="${k === 1 ? 70 : 64}" y1="${282 - 160 * k}" y2="${282 - 160 * k}" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/>`).join("");
    const drops = raining ? [0, 1, 2].map((i) => `<circle cx="${88 + i * 12}" r="2.4" fill="#7dd3fc"><animate attributeName="cy" from="-6" to="44" dur="${0.9 + i * 0.15}s" begin="${i * 0.3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0" dur="${0.9 + i * 0.15}s" begin="${i * 0.3}s" repeatCount="indefinite"/></circle>`).join("") : "";

    const svg = `
      <svg viewBox="0 0 200 335" role="img" aria-label="Niederschlag ${txt} ${unit}">
        <defs>
          <clipPath id="tube"><path d="M56 120 V282 A44 10 0 0 0 144 282 V120 Z"/></clipPath>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".95"/><stop offset="1" stop-color="${col}" stop-opacity=".6"/></linearGradient>
          <linearGradient id="glass" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".25" stop-color="#fff" stop-opacity=".05"/><stop offset=".8" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>
          <linearGradient id="basef" x1="0" x2="1"><stop offset="0" stop-color="#17181a"/><stop offset=".4" stop-color="#5c6068"/><stop offset=".55" stop-color="#7b7f87"/><stop offset="1" stop-color="#141517"/></linearGradient>
          <filter id="blur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>
        </defs>
        <ellipse cx="100" cy="310" rx="62" ry="9" fill="#000" opacity=".3" filter="url(#blur)"/>
        <!-- Auffangtrichter -->
        <path d="M22 46 L56 120 H144 L178 46 Z" fill="url(#glass)" stroke="#fff" stroke-opacity=".38"/>
        <ellipse cx="100" cy="46" rx="78" ry="14" fill="#0b1318" fill-opacity=".55" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>
        <ellipse cx="100" cy="46" rx="70" ry="10.5" fill="none" stroke="${col}" stroke-opacity=".7" stroke-width="1.4" class="glow"/>
        ${drops}
        <!-- Messröhre -->
        <path d="M56 120 V282 A44 10 0 0 0 144 282 V120 Z" fill="#9fc3e6" fill-opacity=".07"/>
        <g clip-path="url(#tube)">
          <rect x="50" y="${top}" width="100" height="${300 - top}" fill="url(#water)" class="glow"/>
          <ellipse cx="100" cy="${top}" rx="44" ry="6" fill="${col}" opacity=".9" class="glow"/>
        </g>
        <path d="M56 120 V282 A44 10 0 0 0 144 282 V120 Z" fill="url(#glass)" stroke="#fff" stroke-opacity=".45"/>
        ${ticks}
        <text x="100" y="196" text-anchor="middle" fill="#fff" style="font:300 ${txt.length > 4 ? 26 : 32}px ${FONT};paint-order:stroke;stroke:rgba(0,0,0,.5);stroke-width:3px;stroke-linejoin:round">${txt}</text>
        <text x="100" y="216" text-anchor="middle" fill="#fff" style="font:400 12px ${FONT};paint-order:stroke;stroke:rgba(0,0,0,.5);stroke-width:3px">${unit} · ${mainLbl}</text>
        <!-- Sockel -->
        <path d="M52 282 V298 A48 11 0 0 0 148 298 V282 A48 11 0 0 1 52 282 Z" fill="url(#basef)"/>
        <ellipse cx="100" cy="282" rx="48" ry="11" fill="none" stroke="#fff" stroke-opacity=".18"/>
        <text x="100" y="328" text-anchor="middle" fill="#c4c7cc" opacity=".75" style="font:400 12px ${FONT};letter-spacing:.14em">${this._esc(this._config.name)}</text>
      </svg>`;

    // Intensität nach mm/h (nur wenn die Einheit pro Stunde ist)
    const curUnit = this._unit(cfg.rain, "mm");
    let curSub = "Aktuelle Messung";
    if (cur !== null && /h/.test(curUnit)) {
      curSub = cur <= 0 ? "Kein Regen" : cur < 2.5 ? "Leichter Regen" : cur < 7.6 ? "Mäßiger Regen" : cur < 50 ? "Starker Regen" : "Extremer Regen";
    } else if (cur !== null) curSub = cur > 0 ? "Es regnet" : "Kein Regen";

    const rows = [];
    if (cfg.rain) rows.push(this._row(cfg.rain, icon.drop(cur === null ? GREY : colorScale(RAIN_COLORS, cur * 3)), "Aktuell", cur === null ? "Nicht verfügbar" : curSub,
      cur === null ? null : this._fmt(cur, 1), curUnit, cur === null ? 0 : clamp((cur / (cfg.rain_rate_max || 10)) * 100, cur > 0 ? 3 : 0, 100), cur === null ? GREY : colorScale(RAIN_COLORS, cur * 3)));
    if (cfg.rain_1h) rows.push(this._row(cfg.rain_1h, icon.clock(h1 === null ? GREY : colorScale(RAIN_COLORS, h1 * 2)), "Letzte Stunde", h1 === null ? "Nicht verfügbar" : h1 > 0 ? "Niederschlag" : "Trocken",
      h1 === null ? null : this._fmt(h1, 1), this._unit(cfg.rain_1h, "mm"), h1 === null ? 0 : clamp((h1 / 20) * 100, h1 > 0 ? 3 : 0, 100), h1 === null ? GREY : colorScale(RAIN_COLORS, h1 * 2)));
    if (cfg.rain_24h) rows.push(this._row(cfg.rain_24h, icon.day(h24 === null ? GREY : col), "Letzte 24 Stunden", h24 === null ? "Nicht verfügbar" : h24 > 0 ? `${this._fmt(clamp((h24 / max) * 100, 0, 100), 0)} % vom Maximum` : "Trocken",
      h24 === null ? null : this._fmt(h24, 1), this._unit(cfg.rain_24h, "mm"), pct * 100, col));
    rows.push(...this._radioRows());
    return { svg, rows: rows.join(""), main: mainEnt };
  }
}

/* ======================================================================
 *  WINDMESSER
 * ==================================================================== */
const WIND_COLORS = [
  { value: 0, color: "#94a3b8" }, { value: 6, color: "#2dd4bf" }, { value: 20, color: "#4ade80" },
  { value: 39, color: "#facc15" }, { value: 62, color: "#fb923c" }, { value: 89, color: "#ef4444" }, { value: 118, color: "#c026d3" },
];
const BFT_LIMITS = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
const BFT_NAMES = ["Windstille", "Leiser Zug", "Leichte Brise", "Schwache Brise", "Mäßige Brise", "Frische Brise", "Starker Wind",
  "Steifer Wind", "Stürmischer Wind", "Sturm", "Schwerer Sturm", "Orkanartiger Sturm", "Orkan"];
const COMPASS = ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
const COMPASS_EN = { N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5 };

class NetatmoWindCard extends NetatmoGaugeBase {
  get _defaultName() { return "Wind"; }
  static getStubConfig() { return { name: "Wind", wind_speed: "", wind_direction: "" }; }
  _validate(c) { if (!c.wind_speed) throw new Error("Bitte „wind_speed“ (Entität) angeben"); }

  // Geschwindigkeit in km/h für Farben und Beaufort, Anzeige in der Original-Einheit
  _spd(id) {
    const v = this._n(id);
    if (v === null) return null;
    const unit = this._unit(id, "km/h");
    const f = /m\/s/.test(unit) ? 3.6 : /mph/.test(unit) ? 1.609 : /(kn|kt)/.test(unit) ? 1.852 : 1;
    return { v, kmh: v * f, unit };
  }
  _deg(id) {
    const s = this._s(id);
    if (!s) return null;
    const n = parseFloat(String(s.state).replace(",", "."));
    if (Number.isFinite(n)) return ((n % 360) + 360) % 360;
    const t = String(s.state).trim().toUpperCase().replace(/O/g, "E");
    return t in COMPASS_EN ? COMPASS_EN[t] : null;
  }
  _bft(kmh) { const i = BFT_LIMITS.findIndex((l) => kmh < l); return i === -1 ? 12 : i; }
  _label(deg) { return COMPASS[Math.round(deg / 22.5) % 16]; }

  _draw() {
    const cfg = this._config;
    const sp = this._spd(cfg.wind_speed), gu = this._spd(cfg.gust_speed);
    const dir = this._deg(cfg.wind_direction), gdir = this._deg(cfg.gust_direction);
    const col = sp ? colorScale(WIND_COLORS, sp.kmh) : GREY;
    const bft = sp ? this._bft(sp.kmh) : null;
    const to = cfg.direction_mode === "to";
    const txt = sp ? this._fmt(sp.v, sp.v < 10 ? 1 : 0) : "–";

    let ticks = "";
    for (let a = 0; a < 360; a += 5) {
      const big = a % 90 === 0, mid = a % 30 === 0;
      const len = big ? 11 : mid ? 8 : 4.5;
      ticks += `<line x1="100" x2="100" y1="23" y2="${23 + len}" stroke="${big ? "#e5e7eb" : "#9aa0a8"}" stroke-width="${big ? 2 : 1}" stroke-opacity="${big ? 0.95 : 0.6}" transform="rotate(${a} 100 100)"/>`;
    }
    const L = (x, y, t, c = "#c9ccd2") => `<text x="${x}" y="${y}" text-anchor="middle" fill="${c}" style="font:600 13px ${FONT}">${t}</text>`;
    const arrow = dir === null ? "" : `
      <g class="rot" style="transform:rotate(${dir}deg);transform-origin:100px 100px">
        <line x1="100" y1="${to ? 100 : 100}" x2="100" y2="${to ? 30 : 40}" stroke="${col}" stroke-width="2" stroke-opacity=".35" stroke-dasharray="3 4"/>
        ${to ? `<path d="M100 17 L91 38 H109 Z" fill="${col}" class="glow"/>` : `<path d="M100 40 L91 19 H109 Z" fill="${col}" class="glow"/>`}
      </g>`;
    const gust = gdir === null ? "" : `<g class="rot" style="transform:rotate(${gdir}deg);transform-origin:100px 100px"><circle cx="100" cy="11" r="3.6" fill="#fff" fill-opacity=".9" stroke="${col}" stroke-width="1.5"/></g>`;

    const svg = `
      <svg viewBox="0 0 200 215" role="img" aria-label="Wind ${txt} ${sp ? sp.unit : ""}">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d9199"/><stop offset=".5" stop-color="#3a3d42"/><stop offset="1" stop-color="#1b1c1f"/></linearGradient>
          <radialGradient id="face" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#2b2e33"/><stop offset="1" stop-color="#17181b"/></radialGradient>
          <filter id="blur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>
          <filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <ellipse cx="100" cy="205" rx="70" ry="7" fill="#000" opacity=".25" filter="url(#blur)"/>
        <circle cx="100" cy="100" r="97" fill="url(#ring)"/>
        <circle cx="100" cy="100" r="85" fill="url(#face)" stroke="#000" stroke-opacity=".5"/>
        ${ticks}
        ${L(100, 52, "N", "#f87171")}${L(100, 156, "S")}${L(152, 105, "O")}${L(48, 105, "W")}
        ${gust}${arrow}
        <text x="100" y="107" text-anchor="middle" fill="${col}" class="glow" filter="url(#g)" style="font:300 ${txt.length > 3 ? 30 : 38}px ${FONT};letter-spacing:-.5px">${txt}</text>
        <text x="100" y="123" text-anchor="middle" fill="${col}" opacity=".85" style="font:400 11px ${FONT}">${sp ? sp.unit : ""}</text>
        <text x="100" y="140" text-anchor="middle" fill="#c9ccd2" opacity=".85" style="font:500 12px ${FONT};letter-spacing:.08em">${dir === null ? "" : this._label(dir)}</text>
        <text x="100" y="212" text-anchor="middle" fill="#c4c7cc" opacity=".75" style="font:400 11px ${FONT};letter-spacing:.14em">${this._esc(cfg.name)}</text>
      </svg>`;

    const rows = [];
    rows.push(this._row(cfg.wind_speed, icon.wind(col), "Windgeschwindigkeit", sp ? `Bft ${bft} · ${BFT_NAMES[bft]}` : "Nicht verfügbar",
      sp ? this._fmt(sp.v, sp.v < 10 ? 1 : 0) : null, sp ? sp.unit : "", sp ? clamp((sp.kmh / 120) * 100, sp.kmh > 0 ? 3 : 0, 100) : 0, col));
    if (cfg.wind_direction) rows.push(this._row(cfg.wind_direction, icon.compass(dir === null ? GREY : col, dir === null ? 0 : (to ? dir : dir + 180)),
      "Windrichtung", dir === null ? "Nicht verfügbar" : to ? "Weht nach" : "Wind aus",
      dir === null ? null : `${this._label(dir)} ${this._fmt(dir, 0)}°`, "", 0, col, { nobar: true, small: true }));
    if (cfg.gust_speed) {
      const gb = gu ? this._bft(gu.kmh) : null, gc = gu ? colorScale(WIND_COLORS, gu.kmh) : GREY;
      rows.push(this._row(cfg.gust_speed, icon.gust(gc), "Böen", gu ? `Bft ${gb} · ${BFT_NAMES[gb]}${gdir !== null ? " · " + this._label(gdir) : ""}` : "Nicht verfügbar",
        gu ? this._fmt(gu.v, gu.v < 10 ? 1 : 0) : null, gu ? gu.unit : "", gu ? clamp((gu.kmh / 120) * 100, gu.kmh > 0 ? 3 : 0, 100) : 0, gc));
    }
    rows.push(...this._radioRows());
    return { svg, rows: rows.join(""), main: cfg.wind_speed };
  }
}

customElements.define("netatmo-rain-card", NetatmoRainCard);
customElements.define("netatmo-wind-card", NetatmoWindCard);
window.customCards = window.customCards || [];
window.customCards.push(
  { type: "netatmo-rain-card", name: "Netatmo Regenmesser", description: "Regenmesser mit Füllstand, Stunden- und Tageswerten" },
  { type: "netatmo-wind-card", name: "Netatmo Windmesser", description: "Kompass mit Windrichtung, Geschwindigkeit, Böen und Beaufort" },
);
