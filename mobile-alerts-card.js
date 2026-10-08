/*
 * Mobile Alerts Temperaturmodul – Lovelace Custom Card
 * (MA10100 / MA10200 / MA10300 …, gleiche Optik wie die Netatmo-Karten)
 *
 * Installation:
 *   1. Datei nach /config/www/mobile-alerts-card.js kopieren
 *   2. Einstellungen → Dashboards → ⋮ → Ressourcen → Hinzufügen
 *      URL: /local/mobile-alerts-card.js   Typ: JavaScript-Modul
 *   3. Browser-/App-Cache leeren
 *
 * Konfiguration:
 *   type: custom:mobile-alerts-card
 *   name: Wohnzimmer
 *   temperature: sensor.ma_wohnzimmer_temperatur
 *   humidity: sensor.ma_wohnzimmer_luftfeuchtigkeit   # optional (MA10200)
 *   temperature_2: sensor.ma_wohnzimmer_kabelfuehler  # optional (MA10300 mit Kabelfühler)
 *   probe_label: Fühler                               # optional, Beschriftung des Kabelfühlers
 *   battery: binary_sensor.ma_wohnzimmer_batterie     # optional (Zahl, Text oder an/aus = schwach)
 *   signal: sensor.ma_wohnzimmer_signal               # optional
 *   scale: indoor                                     # indoor | outdoor | fridge | freezer
 *   decimals: 1
 *   trend_hours: 3                                    # optional
 *   trend: false                                      # Trend ausblenden
 *   show_updated: false                               # „Zuletzt gemessen“ ausblenden
 *   temperature_colors:                               # optional, überschreibt scale
 *     - { value: 10, color: "#3b82f6" }
 *     - { value: 21, color: "#4ade80" }
 *     - { value: 30, color: "#ef4444" }
 */

const SCALES = {
  indoor: [
    { value: 10, color: "#3b82f6" }, { value: 16, color: "#38bdf8" }, { value: 19, color: "#2dd4bf" },
    { value: 21, color: "#4ade80" }, { value: 23, color: "#a3e635" }, { value: 25, color: "#facc15" },
    { value: 27, color: "#fb923c" }, { value: 30, color: "#ef4444" },
  ],
  outdoor: [
    { value: -15, color: "#a78bfa" }, { value: -5, color: "#60a5fa" }, { value: 2, color: "#38bdf8" },
    { value: 10, color: "#2dd4bf" }, { value: 18, color: "#4ade80" }, { value: 24, color: "#facc15" },
    { value: 30, color: "#fb923c" }, { value: 37, color: "#ef4444" },
  ],
  fridge: [
    { value: -2, color: "#60a5fa" }, { value: 1, color: "#38bdf8" }, { value: 3, color: "#4ade80" },
    { value: 5, color: "#4ade80" }, { value: 7, color: "#facc15" }, { value: 10, color: "#ef4444" },
  ],
  freezer: [
    { value: -30, color: "#60a5fa" }, { value: -22, color: "#38bdf8" }, { value: -18, color: "#4ade80" },
    { value: -15, color: "#facc15" }, { value: -10, color: "#fb923c" }, { value: -5, color: "#ef4444" },
  ],
};

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
.spark { grid-column:2 / 4; height:clamp(20px,6cqw,26px); margin-top:6px; }
.glow { transition:fill .6s ease, stroke .6s ease; }
@container (max-width:420px) { .wrap { grid-template-columns:minmax(0,34%) minmax(0,1fr); gap:10px; } }
@container (max-width:260px) { .wrap { grid-template-columns:1fr; } .dev { max-width:130px; margin:0 auto; } }
`;

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const GREY = "#8a8e95";
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
const svgI = (inner) => `<svg viewBox="0 0 24 24">${inner}</svg>`;

class MobileAlertsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._html = "";
  }

  static getStubConfig() { return { name: "Wohnzimmer", temperature: "", humidity: "" }; }

  setConfig(config) {
    if (!config || !config.temperature) throw new Error("Bitte mindestens „temperature“ (Entität) angeben");
    this._config = { name: "Temperatur", decimals: 1, scale: "indoor", show_updated: true, ...config };
    this._html = "";
    if (this._hass) this._render();
  }
  set hass(h) { this._hass = h; this._render(); }
  getCardSize() { return 4; }

  /* ---------- Zustände ---------- */
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
  _fmt(v, d = 0) { return v.toLocaleString(this._hass?.locale?.language || "de", { minimumFractionDigits: d, maximumFractionDigits: d }); }
  _esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  _hum(v) {
    if (v < 30) return { c: "#fb923c", t: "Zu trocken" };
    if (v < 40) return { c: "#a3e635", t: "Etwas trocken" };
    if (v <= 60) return { c: "#4ade80", t: "Angenehm" };
    if (v <= 70) return { c: "#a3e635", t: "Etwas feucht" };
    return { c: "#38bdf8", t: "Zu feucht" };
  }
  _sig(id) {
    const s = this._s(id);
    if (!s) return null;
    const unit = s.attributes?.unit_of_measurement || "";
    const num = parseFloat(String(s.state).replace(",", "."));
    let lvl, raw = null;
    if (Number.isFinite(num)) {
      raw = num + (unit ? " " + unit : "");
      if (unit === "dBm" || num < 0) lvl = num >= -60 ? 4 : num >= -75 ? 3 : num >= -85 ? 2 : num >= -95 ? 1 : 0;
      else if (unit === "%") lvl = num > 75 ? 4 : num > 50 ? 3 : num > 25 ? 2 : 1;
      else lvl = num >= 4 ? 4 : num >= 3 ? 3 : num >= 2 ? 2 : num >= 1 ? 1 : 0;
    } else {
      const t = String(s.state).toLowerCase();
      lvl = /(full|excellent|sehr gut|very good)/.test(t) ? 4 : /(high|good|gut)/.test(t) ? 3 : /(medium|average|mittel|ok)/.test(t) ? 2 : /(low|bad|poor|schlecht|schwach)/.test(t) ? 1 : 0;
    }
    return { lvl, raw, txt: ["Kein Signal", "Schwach", "Mittel", "Gut", "Sehr gut"][lvl], col: lvl >= 3 ? "#4ade80" : lvl === 2 ? "#facc15" : lvl === 1 ? "#fb923c" : "#ef4444" };
  }
  _bat(id) {
    const raw = id && this._hass?.states?.[id];
    if (!raw || ["unavailable", "unknown"].includes(raw.state)) return null;
    const st = String(raw.state).toLowerCase();
    let pct = parseFloat(st.replace(",", "."));
    if (!Number.isFinite(pct)) {
      if (["on", "true", "low", "niedrig", "schwach"].includes(st) || /very low|critical/.test(st)) pct = 10;       // Alarm-Sensor: an = schwach
      else if (["off", "false", "ok", "normal", "full", "voll"].includes(st)) pct = 100;
      else if (/high|hoch/.test(st)) pct = 75;
      else if (/medium|mittel/.test(st)) pct = 50;
      else return null;
      const low = pct <= 10;
      return { pct, binary: true, col: low ? "#ef4444" : "#4ade80", txt: low ? "Schwach – bitte tauschen" : "In Ordnung" };
    }
    pct = clamp(pct, 0, 100);
    return { pct, col: pct > 40 ? "#4ade80" : pct > 20 ? "#fb923c" : "#ef4444", txt: pct > 60 ? "Voll" : pct > 40 ? "Gut" : pct > 20 ? "Niedrig" : "Fast leer" };
  }
  _age(id) {
    const s = id && this._hass?.states?.[id];
    if (!s) return null;
    const m = Math.max(0, Math.floor((Date.now() - new Date(s.last_updated).getTime()) / 60000));
    const txt = m < 1 ? "gerade eben" : m < 60 ? `vor ${m} Min` : m < 2880 ? `vor ${Math.floor(m / 60)} Std` : `vor ${Math.floor(m / 1440)} Tagen`;
    return { m, txt, col: m <= 20 ? "#4ade80" : m <= 60 ? "#facc15" : "#ef4444" };
  }

  /* ---------- Trend aus dem Verlauf ---------- */
  async _loadTrend() {
    const cfg = this._config, now = Date.now();
    if (this._trendBusy || (this._trendTry && now - this._trendTry < 600000)) return;
    this._trendBusy = true;
    this._trendTry = now;
    try {
      const hrs = cfg.trend_hours || 3;
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(now - hrs * 3600e3).toISOString(), end_time: new Date(now).toISOString(),
        entity_ids: [cfg.temperature], include_start_time_state: true, significant_changes_only: false,
        minimal_response: true, no_attributes: true,
      });
      const pts = [];
      for (const i of res[cfg.temperature] || []) {
        const v = parseFloat(i.s ?? i.state);
        const ts = i.lu != null ? i.lu * 1000 : Date.parse(i.last_updated || "");
        if (Number.isFinite(v) && Number.isFinite(ts)) pts.push([ts / 3600e3, v]);
      }
      if (pts.length >= 3) {
        const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
        let num = 0, den = 0;
        for (const p of pts) { num += (p[0] - mx) * (p[1] - my); den += (p[0] - mx) ** 2; }
        const slope = den ? num / den : 0;
        const f = (this._s(cfg.temperature)?.attributes?.unit_of_measurement || "").includes("F") ? 1.8 : 1;
        const dir = slope >= f ? 2 : slope >= 0.3 * f ? 1 : slope <= -f ? -2 : slope <= -0.3 * f ? -1 : 0;
        const step = Math.max(1, Math.ceil(pts.length / 60));
        this._trend = { pts: pts.filter((_, k) => k % step === 0 || k === pts.length - 1), slope, dir, at: now };
      } else this._trend = null;
    } catch (e) { this._trend = null; }
    this._trendBusy = false;
    this._html = "";
    this._render();
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

  /* ---------- Zeichnen ---------- */
  _render() {
    const cfg = this._config;
    if (!cfg || !this._hass) return;
    if (cfg.trend !== false && this._n(cfg.temperature) !== null) this._loadTrend();

    const t = this._n(cfg.temperature), t2 = this._n(cfg.temperature_2), h = this._n(cfg.humidity);
    const unit = this._s(cfg.temperature)?.attributes?.unit_of_measurement || "°C";
    const f = unit.includes("F");
    const stops = cfg.temperature_colors?.length ? cfg.temperature_colors : (SCALES[cfg.scale] || SCALES.indoor);
    const colOf = (v) => (v === null ? GREY : colorScale(stops, f ? (v - 32) * 5 / 9 : v));
    const tc = colOf(t), tc2 = colOf(t2);
    const humi = h === null ? null : this._hum(h);
    const bt = cfg.battery ? this._bat(cfg.battery) : null;
    const sg = cfg.signal || cfg.wifi ? this._sig(cfg.signal || cfg.wifi) : null;
    const age = cfg.show_updated !== false ? this._age(cfg.temperature) : null;
    const tr = cfg.trend !== false ? this._trend : null;
    const arr = tr ? ["↓", "↘", "→", "↗", "↑"][tr.dir + 2] : "";
    const probe = cfg.temperature_2 !== undefined && cfg.temperature_2 !== "";

    const tTxt = t === null ? "–" : this._fmt(t, cfg.decimals);
    const t2Txt = t2 === null ? "–" : this._fmt(t2, cfg.decimals);
    const H = probe ? 318 : 252;
    const batFill = bt ? (bt.pct / 100) * 13 : 0;

    const svg = `
      <svg viewBox="0 0 200 ${H}" role="img" aria-label="Temperatur ${tTxt} ${unit}">
        <defs>
          <linearGradient id="mabody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbfbfc"/><stop offset=".55" stop-color="#e6e8eb"/><stop offset="1" stop-color="#c9ccd1"/></linearGradient>
          <linearGradient id="malcd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14222a"/><stop offset="1" stop-color="#091014"/></linearGradient>
          <linearGradient id="maglass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
          <linearGradient id="mametal" x1="0" x2="1"><stop offset="0" stop-color="#6b7077"/><stop offset=".4" stop-color="#e3e5e8"/><stop offset="1" stop-color="#7d828a"/></linearGradient>
          <filter id="mablur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>
          <filter id="maglow" x="-30%" y="-40%" width="160%" height="180%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <ellipse cx="100" cy="228" rx="62" ry="8" fill="#000" opacity=".22" filter="url(#mablur)"/>
        ${probe ? `<path d="M100 214 C100 252 62 238 62 276" fill="none" stroke="#2b2d31" stroke-width="3.2" stroke-linecap="round"/>
        <rect x="55" y="270" width="14" height="40" rx="7" fill="url(#mametal)"/>
        <rect x="55" y="270" width="14" height="40" rx="7" fill="none" stroke="#000" stroke-opacity=".25"/>
        <text x="80" y="285" fill="#9aa0a8" style="font:400 10px ${FONT};letter-spacing:.06em">${this._esc(cfg.probe_label || "FÜHLER")}</text>
        <text x="80" y="304" fill="${tc2}" class="glow" style="font:400 17px ${FONT}">${t2Txt} ${unit}</text>` : ""}
        <rect x="38" y="14" width="124" height="204" rx="28" fill="url(#mabody)" stroke="#b4b8be" stroke-width="1"/>
        <rect x="39" y="15" width="122" height="202" rx="27" fill="none" stroke="#fff" stroke-opacity=".7"/>
        <rect x="87" y="24" width="26" height="7" rx="3.5" fill="#9ca1a9"/><rect x="87" y="24" width="26" height="3" rx="1.5" fill="#000" opacity=".25"/>
        <rect x="50" y="42" width="100" height="124" rx="13" fill="#0b0f12"/>
        <rect x="54" y="46" width="92" height="116" rx="10" fill="url(#malcd)"/>
        <!-- Batterie / Pfeil -->
        <g transform="translate(60 53)"><rect x="0" y="0" width="16" height="9" rx="2" fill="none" stroke="${bt ? bt.col : GREY}" stroke-width="1.2" opacity="${bt ? 1 : 0.3}"/><rect x="2" y="2" width="${batFill}" height="5" rx="1" fill="${bt ? bt.col : GREY}"/><rect x="16.6" y="3" width="1.8" height="3" rx=".8" fill="${bt ? bt.col : GREY}" opacity="${bt ? 1 : 0.3}"/></g>
        <text x="138" y="63" text-anchor="end" fill="${tc}" class="glow" style="font:400 16px ${FONT}">${arr}</text>
        <text x="100" y="116" text-anchor="middle" fill="${tc}" class="glow" filter="url(#maglow)" style="font:300 ${tTxt.length > 4 ? 30 : 38}px ${FONT};letter-spacing:-.5px">${tTxt}</text>
        <text x="100" y="134" text-anchor="middle" fill="${tc}" opacity=".85" style="font:400 12px ${FONT}">${unit}</text>
        ${h !== null ? `<g transform="translate(70 142)"><path d="M5 0C5 0 0 6.2 0 9.2a5 5 0 0 0 10 0C10 6.2 5 0 5 0z" fill="${humi.c}"/><text x="16" y="10" fill="${humi.c}" style="font:500 13px ${FONT}">${this._fmt(h, 0)} %</text></g>` : ""}
        <rect x="54" y="46" width="92" height="116" rx="10" fill="url(#maglass)"/>
        <text x="100" y="192" text-anchor="middle" fill="#6b7076" style="font:500 10px ${FONT};letter-spacing:.16em">${this._esc(cfg.name).toUpperCase()}</text>
        <circle cx="100" cy="206" r="2.6" fill="${age ? age.col : GREY}" class="glow" filter="url(#maglow)"/>
      </svg>`;

    const rows = [];
    if (cfg.humidity) rows.push(this._row(cfg.humidity, svgI(`<path d="M12 3C12 3 5 11 5 15a7 7 0 0 0 14 0C19 11 12 3 12 3z" fill="${humi ? humi.c : GREY}" opacity=".9"/>`),
      "Luftfeuchtigkeit", humi ? humi.t : "Nicht verfügbar", h === null ? null : this._fmt(h, 0), "%", h === null ? 0 : clamp(h, 0, 100), humi ? humi.c : GREY));
    if (probe) rows.push(this._row(cfg.temperature_2, svgI(`<path d="M10 4a2 2 0 0 1 4 0v9.2a4 4 0 1 1-4 0z" fill="none" stroke="${tc2}" stroke-width="2"/><circle cx="12" cy="17" r="2" fill="${tc2}"/>`),
      this._esc(cfg.probe_label || "Fühler"), t2 === null ? "Nicht verfügbar" : "Kabelfühler", t2 === null ? null : this._fmt(t2, cfg.decimals), unit, 0, tc2, { nobar: true }));
    if (tr && tr.pts.length >= 3) {
      const hrs = cfg.trend_hours || 3, tcol = tr.dir > 0 ? "#fb923c" : tr.dir < 0 ? "#38bdf8" : "#4ade80";
      const names = ["Fallend", "Leicht fallend", "Stabil", "Leicht steigend", "Steigend"];
      const ang = [90, 45, 0, -45, -90][tr.dir + 2];
      const xs = tr.pts.map((p) => p[0]), ys = tr.pts.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), ymin = Math.min(...ys), yr = Math.max(Math.max(...ys) - ymin, 1);
      const pts = tr.pts.map((p) => `${(((p[0] - x0) / (x1 - x0 || 1)) * 100).toFixed(1)},${(22 - ((p[1] - ymin) / yr) * 20).toFixed(1)}`).join(" ");
      const sl = tr.slope;
      rows.push(`
      <div class="row" data-e="${cfg.temperature}">
        <div class="ic">${svgI(`<path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="${tcol}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(${ang}deg);transform-origin:12px 12px"/>`)}</div>
        <div class="lab">Trend<small>${names[tr.dir + 2]} · ${hrs} h</small></div>
        <div class="val">${sl > 0.05 ? "+" : sl < -0.05 ? "−" : ""}${this._fmt(Math.abs(sl), 1)}<span>${unit}/h</span></div>
        <div class="spark"><svg viewBox="0 0 100 24" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible"><polygon points="0,24 ${pts} 100,24" fill="${tc}" opacity=".16"/><polyline points="${pts}" fill="none" stroke="${tc}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></div>
      </div>`);
    }
    if (age) rows.push(this._row(cfg.temperature, svgI(`<circle cx="12" cy="12" r="9" fill="none" stroke="${age.col}" stroke-width="2"/><path d="M12 7v5l3.5 2" fill="none" stroke="${age.col}" stroke-width="2" stroke-linecap="round"/>`),
      "Zuletzt gemessen", age.m > 60 ? "Sensor meldet sich nicht" : "Sensor aktiv", age.txt, "", age.m > 60 ? 8 : clamp(100 - (age.m / 60) * 100, 8, 100), age.col, { small: true }));
    const sgId = cfg.signal || cfg.wifi;
    if (sgId) rows.push(this._row(sgId, svgI([0, 1, 2, 3].map((i) => `<rect x="${3 + i * 5.2}" y="${19 - (i + 1) * 4.2}" width="3.6" height="${(i + 1) * 4.2}" rx="1" fill="${sg && i < sg.lvl ? sg.col : "currentColor"}" opacity="${sg && i < sg.lvl ? 1 : 0.2}"/>`).join("")),
      "Funksignal", sg ? (sg.raw ? sg.txt : "Signalstärke") : "Nicht verfügbar", sg ? (sg.raw ?? sg.txt) : null, "", sg ? (sg.lvl / 4) * 100 : 0, sg ? sg.col : GREY, { small: true }));
    if (cfg.battery) rows.push(this._row(cfg.battery, svgI(`<rect x="2" y="7" width="18" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1.6"/><rect x="21" y="10.5" width="2" height="3" rx="1" fill="currentColor" opacity=".6"/><rect x="4" y="9" width="${bt ? (14 * bt.pct) / 100 : 0}" height="6" rx="1.2" fill="${bt ? bt.col : GREY}"/>`),
      "Batterie", bt ? bt.txt : "Nicht verfügbar", bt ? (bt.binary ? (bt.pct <= 10 ? "Schwach" : "OK") : this._fmt(bt.pct, 0)) : null, bt && !bt.binary ? "%" : "", bt ? bt.pct : 0, bt ? bt.col : GREY, { small: !!(bt && bt.binary) }));

    const html = svg + "|" + rows.join("");
    if (html === this._html) return;
    this._html = html;
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>
      <ha-card><div class="wrap">
        <div class="dev" data-e="${cfg.temperature}">${svg}</div>
        <div class="rows">${rows.join("")}</div>
      </div></ha-card>`;
    this.shadowRoot.querySelectorAll("[data-e]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.e;
        if (id) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true }));
      });
    });
  }
}

customElements.define("mobile-alerts-card", MobileAlertsCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "mobile-alerts-card",
  name: "Mobile Alerts Temperaturmodul",
  description: "Weißes Sensormodul mit farbiger Temperatur, Luftfeuchte, Kabelfühler, Trend, Signal und Batterie",
});
