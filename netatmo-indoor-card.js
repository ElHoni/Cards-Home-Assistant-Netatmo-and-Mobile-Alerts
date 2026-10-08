/*
 * Netatmo Innenstation – Lovelace Custom Card
 *
 * Installation:
 *   1. Datei nach /config/www/netatmo-indoor-card.js kopieren
 *   2. Einstellungen → Dashboards → ⋮ → Ressourcen → Hinzufügen
 *      URL: /local/netatmo-indoor-card.js   Typ: JavaScript-Modul
 *   3. Browser-Cache leeren, Karte als "Manuelle Karte" einfügen
 *
 * Konfiguration:
 *   type: custom:netatmo-indoor-card
 *   name: Wohnzimmer
 *   temperature: sensor.wohnzimmer_temperature
 *   humidity: sensor.wohnzimmer_humidity
 *   co2: sensor.wohnzimmer_carbon_dioxide
 *   wifi: sensor.wohnzimmer_wi_fi_strength       # optional
 *   battery: sensor.wohnzimmer_battery            # optional (Basisstation hat oft keine)
 *   variant: outdoor                              # optional: Außenmodul-Optik
 *   trend_hours: 3                                # optional, Zeitraum für den Trend (Standard 3)
 *   trend: false                                  # optional, Trend ausblenden
 *   decimals: 1                                   # optional
 *   temperature_colors:                           # optional, Standard siehe unten
 *     - { value: 10, color: "#3b82f6" }
 *     - { value: 21, color: "#4ade80" }
 *     - { value: 30, color: "#ef4444" }
 *
 * Ein Tipp auf eine Zeile oder den Zylinder öffnet den jeweiligen Verlauf.
 */

const DEFAULT_TEMP_COLORS = [
  { value: 10, color: "#3b82f6" },
  { value: 16, color: "#38bdf8" },
  { value: 19, color: "#2dd4bf" },
  { value: 21, color: "#4ade80" },
  { value: 23, color: "#a3e635" },
  { value: 25, color: "#facc15" },
  { value: 27, color: "#fb923c" },
  { value: 30, color: "#ef4444" },
];

const OUTDOOR_TEMP_COLORS = [
  { value: -15, color: "#a78bfa" },
  { value: -5, color: "#60a5fa" },
  { value: 2, color: "#38bdf8" },
  { value: 10, color: "#2dd4bf" },
  { value: 18, color: "#4ade80" },
  { value: 24, color: "#facc15" },
  { value: 30, color: "#fb923c" },
  { value: 37, color: "#ef4444" },
];

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

/* ---------- Helfer ---------- */
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

class NetatmoIndoorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
  }

  static getStubConfig() {
    return { name: "Innen", temperature: "", humidity: "", co2: "" };
  }

  setConfig(config) {
    if (!config || !config.temperature) throw new Error("Bitte mindestens „temperature“ (Entität) angeben");
    this._config = { name: "Innen", decimals: 1, ...config };
    this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 4; }

  /* ---------- Zustände lesen ---------- */
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
  _fmt(v, d = 0) {
    const lang = this._hass?.locale?.language || "de";
    return v.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  /* ---------- Temperaturtrend aus dem Verlauf ---------- */
  async _loadTrend() {
    const cfg = this._config;
    const now = Date.now();
    if (this._trendBusy || (this._trendTry && now - this._trendTry < 600000)) return;
    this._trendBusy = true;
    this._trendTry = now;
    try {
      const hrs = cfg.trend_hours || 3;
      const res = await this._hass.callWS({
        type: "history/history_during_period",
        start_time: new Date(now - hrs * 3600e3).toISOString(),
        end_time: new Date(now).toISOString(),
        entity_ids: [cfg.temperature],
        include_start_time_state: true,
        significant_changes_only: false,
        minimal_response: true,
        no_attributes: true,
      });
      const arr = res[cfg.temperature] || [];
      const pts = [];
      for (const i of arr) {
        const v = parseFloat(i.s ?? i.state);
        const ts = i.lu != null ? i.lu * 1000 : Date.parse(i.last_updated || "");
        if (Number.isFinite(v) && Number.isFinite(ts)) pts.push([ts / 3600e3, v]);
      }
      if (pts.length >= 3) {
        // lineare Regression: Steigung in Grad pro Stunde
        const n = pts.length, mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
        let num = 0, den = 0;
        for (const p of pts) { num += (p[0] - mx) * (p[1] - my); den += (p[0] - mx) ** 2; }
        const slope = den ? num / den : 0;
        const f = (this._s(cfg.temperature)?.attributes?.unit_of_measurement || "").includes("F") ? 1.8 : 1;
        const dir = slope >= 1 * f ? 2 : slope >= 0.3 * f ? 1 : slope <= -1 * f ? -2 : slope <= -0.3 * f ? -1 : 0;
        // Auf höchstens 60 Punkte reduzieren
        const step = Math.max(1, Math.ceil(pts.length / 60));
        this._trend = { pts: pts.filter((_, k) => k % step === 0 || k === pts.length - 1), slope, dir, at: now };
      } else {
        this._trend = null;
      }
    } catch (e) {
      this._trend = null;
    }
    this._trendBusy = false;
    this._sig = "";
    this._render();
  }

  /* ---------- Bewertungen ---------- */
  _co2(v) {
    if (v < 800) return { c: "#4ade80", t: "Sehr gut" };
    if (v < 1000) return { c: "#a3e635", t: "Gut" };
    if (v < 1500) return { c: "#facc15", t: "Mäßig" };
    if (v < 2000) return { c: "#fb923c", t: "Schlecht" };
    return { c: "#ef4444", t: "Kritisch" };
  }
  _hum(v) {
    if (v < 30) return { c: "#fb923c", t: "Zu trocken" };
    if (v < 40) return { c: "#a3e635", t: "Etwas trocken" };
    if (v <= 60) return { c: "#4ade80", t: "Angenehm" };
    if (v <= 70) return { c: "#a3e635", t: "Etwas feucht" };
    return { c: "#38bdf8", t: "Zu feucht" };
  }
  // liefert Stufe 0–4 und Text; versteht dBm, Prozent, Netatmo-Rohwert und Textstufen
  _wifi(id) {
    const s = this._s(id);
    if (!s) return null;
    const unit = s.attributes?.unit_of_measurement || "";
    const num = parseFloat(String(s.state).replace(",", "."));
    let lvl;
    let raw = null;
    if (Number.isFinite(num)) {
      raw = num + (unit ? " " + unit : "");
      if (unit === "dBm" || num < 0) lvl = num >= -55 ? 4 : num >= -65 ? 3 : num >= -75 ? 2 : num >= -85 ? 1 : 0;
      else if (unit === "%") lvl = num > 75 ? 4 : num > 50 ? 3 : num > 25 ? 2 : 1;
      else lvl = num <= 56 ? 4 : num <= 71 ? 3 : num <= 86 ? 2 : 1; // Netatmo-Rohwert: kleiner = besser
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
      pct = /very low|sehr niedrig|critical/.test(t) ? 8
        : /full|voll/.test(t) ? 100
        : /high|hoch/.test(t) ? 75
        : /medium|mittel/.test(t) ? 50
        : /low|niedrig/.test(t) ? 25 : null;
      if (pct === null) return null;
    }
    pct = clamp(pct, 0, 100);
    const col = pct > 40 ? "#4ade80" : pct > 20 ? "#fb923c" : "#ef4444";
    const txt = pct > 60 ? "Voll" : pct > 40 ? "Gut" : pct > 20 ? "Niedrig" : "Fast leer";
    return { pct, col, txt };
  }

  /* ---------- Zeichnen ---------- */
  _render() {
    const cfg = this._config;
    if (!cfg || !this._hass) return;
    const t = this._n(cfg.temperature);
    const h = this._n(cfg.humidity);
    const co = this._n(cfg.co2);
    const wf = this._wifi(cfg.wifi);
    const bt = this._bat(cfg.battery);
    if (cfg.trend !== false && t !== null) this._loadTrend();
    const unit = this._s(cfg.temperature)?.attributes?.unit_of_measurement || "°C";
    const sig = JSON.stringify([t, h, co, wf, bt, unit, cfg.name, cfg.variant, this._trend?.at]);
    if (sig === this._sig) return;
    this._sig = sig;

    const outdoor = cfg.variant === "outdoor";
    const stops = cfg.temperature_colors?.length ? cfg.temperature_colors : (outdoor ? OUTDOOR_TEMP_COLORS : DEFAULT_TEMP_COLORS);
    // Schwellen sind in °C definiert; bei °F wird umgerechnet
    const tc = t === null ? "#8a8e95" : colorScale(stops, unit.includes("F") ? (t - 32) * 5 / 9 : t);
    const co2i = co === null ? null : this._co2(co);
    const ring = co2i ? co2i.c : tc;
    const humi = h === null ? null : this._hum(h);

    const tTxt = t === null ? "–" : this._fmt(t, cfg.decimals);
    const [tInt, tDec] = tTxt.split(/[.,]/);
    const dsep = tTxt.includes(",") ? "," : ".";

    const font = "'Helvetica Neue',Helvetica,Arial,sans-serif";
    const tr = cfg.trend !== false ? this._trend : null;
    const arr = tr ? ["↓", "↘", "→", "↗", "↑"][tr.dir + 2] : "";
    const svgOutdoor = `
      <svg viewBox="0 0 200 330" role="img" aria-label="Außentemperatur ${tTxt} ${unit}">
        <defs>
          <linearGradient id="obody" x1="0" x2="1">
            <stop offset="0" stop-color="#17181a"/><stop offset=".18" stop-color="#34373c"/>
            <stop offset=".42" stop-color="#686c73"/><stop offset=".54" stop-color="#868a92"/>
            <stop offset=".76" stop-color="#34373c"/><stop offset="1" stop-color="#141517"/>
          </linearGradient>
          <linearGradient id="otop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a2a6ae"/><stop offset="1" stop-color="#50535a"/></linearGradient>
          <linearGradient id="ofade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
          <filter id="oblur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>
          <filter id="oglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <ellipse cx="100" cy="296" rx="46" ry="8" fill="#000" opacity=".3" filter="url(#oblur)"/>
        <path d="M64 70 V282 A36 10 0 0 0 136 282 V70 Z" fill="url(#obody)"/>
        <path d="M64 70 V282 A36 10 0 0 0 136 282 V70 Z" fill="url(#ofade)"/>
        <ellipse cx="100" cy="70" rx="36" ry="10" fill="url(#otop)"/>
        <ellipse cx="100" cy="70" rx="28" ry="6.5" fill="#2b2d31"/>
        <ellipse class="glow" cx="100" cy="70" rx="32" ry="8.2" fill="none" stroke="${tc}" stroke-width="1.6" opacity=".85" filter="url(#oglow)"/>
        <text x="100" y="168" text-anchor="middle" fill="${tc}" class="glow" filter="url(#oglow)"
          style="font:300 ${tTxt.length > 4 ? 26 : 32}px ${font};letter-spacing:-.5px">${tTxt}</text>
        <text x="100" y="190" text-anchor="middle" fill="${tc}" opacity=".85" style="font:400 13px ${font}">${unit}${arr ? "  " + arr : ""}</text>
        <text x="100" y="250" text-anchor="middle" fill="#c4c7cc" opacity=".75" style="font:400 10px ${font};letter-spacing:.14em">${this._esc(cfg.name)}</text>
      </svg>`;

    const svgIndoor = `
      <svg viewBox="0 0 200 330" role="img" aria-label="Innentemperatur ${tTxt} ${unit}">
        <defs>
          <linearGradient id="body" x1="0" x2="1">
            <stop offset="0" stop-color="#1b1c1f"/><stop offset=".16" stop-color="#383b40"/>
            <stop offset=".40" stop-color="#6d7178"/><stop offset=".52" stop-color="#8d9199"/>
            <stop offset=".74" stop-color="#383b40"/><stop offset="1" stop-color="#17181a"/>
          </linearGradient>
          <linearGradient id="topf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#9a9ea6"/><stop offset="1" stop-color="#4a4d53"/>
          </linearGradient>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/>
          </linearGradient>
          <filter id="blur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="5"/></filter>
          <filter id="tglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <ellipse cx="100" cy="300" rx="66" ry="10" fill="#000" opacity=".28" filter="url(#blur)"/>
        <ellipse class="glow" cx="100" cy="80" rx="62" ry="17" fill="${ring}" opacity=".55" filter="url(#blur)"/>
        <path d="M38 80 V282 A62 17 0 0 0 162 282 V80 Z" fill="url(#body)"/>
        <path d="M38 80 V282 A62 17 0 0 0 162 282 V80 Z" fill="url(#fade)"/>
        <path d="M38 266 A62 17 0 0 0 162 266" fill="none" stroke="#fff" stroke-opacity=".10"/>
        <ellipse cx="100" cy="80" rx="62" ry="17" fill="url(#topf)"/>
        <ellipse class="glow" cx="100" cy="80" rx="52" ry="13.5" fill="none" stroke="${ring}" stroke-width="5" filter="url(#tglow)"/>
        <ellipse cx="100" cy="80" rx="43" ry="10.5" fill="#2a2c30"/>
        <ellipse cx="100" cy="79" rx="43" ry="10.5" fill="none" stroke="#fff" stroke-opacity=".12"/>
        <text x="100" y="198" text-anchor="middle" fill="${tc}" class="glow" filter="url(#tglow)"
          style="font:300 54px 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:-1px">${tInt}${tDec !== undefined ? `<tspan style="font-size:28px" dx="1">${dsep}${tDec}</tspan>` : ""}</text>
        <text x="100" y="224" text-anchor="middle" fill="${tc}" opacity=".85" style="font:400 15px 'Helvetica Neue',Helvetica,Arial,sans-serif">${unit}${arr ? "  " + arr : ""}</text>
        <text x="100" y="262" text-anchor="middle" fill="#c4c7cc" opacity=".75" style="font:400 12px 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:.14em">${this._esc(cfg.name)}</text>
      </svg>`;

    const svg = outdoor ? svgOutdoor : svgIndoor;
    const iconDrop = (c) => `<svg viewBox="0 0 24 24"><path d="M12 3C12 3 5 11 5 15a7 7 0 0 0 14 0C19 11 12 3 12 3z" fill="${c}" opacity=".9"/></svg>`;
    const iconCo2 = (c) => `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="${c}" stroke-width="2"/><text x="12" y="15.5" text-anchor="middle" font-size="8.5" font-weight="700" fill="${c}" font-family="Helvetica,Arial,sans-serif">CO₂</text></svg>`;
    const iconWifi = (lvl, c) => {
      const bars = [0, 1, 2, 3].map((i) => `<rect x="${3 + i * 5.2}" y="${19 - (i + 1) * 4.2}" width="3.6" height="${(i + 1) * 4.2}" rx="1" fill="${i < lvl ? c : "currentColor"}" opacity="${i < lvl ? 1 : 0.2}"/>`).join("");
      return `<svg viewBox="0 0 24 24">${bars}</svg>`;
    };
    const iconBat = (p, c) => `<svg viewBox="0 0 24 24"><rect x="2" y="7" width="18" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-opacity=".6" stroke-width="1.6"/><rect x="21" y="10.5" width="2" height="3" rx="1" fill="currentColor" opacity=".6"/><rect x="4" y="9" width="${(14 * p) / 100}" height="6" rx="1.2" fill="${c}"/></svg>`;

    const row = (ent, ic, label, sub, val, unitTxt, pct, col) => `
      <div class="row ${val === null ? "na" : ""}" data-e="${ent || ""}">
        <div class="ic">${ic}</div>
        <div class="lab">${label}<small>${sub}</small></div>
        <div class="val${typeof val === "string" && /[^\d.,\s−+-]/.test(val) ? " t" : ""}">${val === null ? "–" : val}${val !== null && unitTxt ? `<span>${unitTxt}</span>` : ""}</div>
        <div class="bar"><i style="width:${pct}%;background:${col}"></i></div>
      </div>`;

    const hrs = cfg.trend_hours || 3;
    let trendRow = "";
    if (tr && tr.pts.length >= 3) {
      const tcol = tr.dir > 0 ? "#fb923c" : tr.dir < 0 ? "#38bdf8" : "#4ade80";
      const ang = [90, 45, 0, -45, -90][tr.dir + 2];
      const names = ["Fallend", "Leicht fallend", "Stabil", "Leicht steigend", "Steigend"];
      const icon = `<svg viewBox="0 0 24 24" style="transform:rotate(${ang}deg);transition:transform .6s"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="${tcol}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      const xs = tr.pts.map((p) => p[0]), ys = tr.pts.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), ymin = Math.min(...ys);
      const yr = Math.max(Math.max(...ys) - ymin, 1);
      const pts = tr.pts.map((p) => `${(((p[0] - x0) / (x1 - x0 || 1)) * 100).toFixed(1)},${(22 - ((p[1] - ymin) / yr) * 20).toFixed(1)}`).join(" ");
      const spark = `<svg viewBox="0 0 100 24" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible"><polygon points="0,24 ${pts} 100,24" fill="${tc}" opacity=".16"/><polyline points="${pts}" fill="none" stroke="${tc}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
      const sl = tr.slope;
      trendRow = `
      <div class="row" data-e="${cfg.temperature}">
        <div class="ic">${icon}</div>
        <div class="lab">Trend<small>${names[tr.dir + 2]} · ${hrs} h</small></div>
        <div class="val">${(sl > 0.05 ? "+" : sl < -0.05 ? "−" : "")}${this._fmt(Math.abs(sl), 1)}<span>${unit}/h</span></div>
        <div class="spark">${spark}</div>
      </div>`;
    }
    const rows = [trendRow,
      row(cfg.humidity, iconDrop(humi ? humi.c : "#8a8e95"), "Luftfeuchtigkeit", humi ? humi.t : "Nicht verfügbar",
        h === null ? null : this._fmt(h, 0), "%", h === null ? 0 : clamp(h, 0, 100), humi ? humi.c : "#8a8e95"),
    ];
    if (cfg.co2) rows.push(row(cfg.co2, iconCo2(co2i ? co2i.c : "#8a8e95"), "Luftqualität", co2i ? co2i.t : "Nicht verfügbar",
      co === null ? null : this._fmt(co, 0), "ppm", co === null ? 0 : clamp(((co - 400) / 1600) * 100, 3, 100), co2i ? co2i.c : "#8a8e95"));
    if (cfg.wifi) rows.push(row(cfg.wifi, iconWifi(wf ? wf.lvl : 0, wf ? wf.col : "#8a8e95"), (outdoor ? "Funksignal" : "WLAN"), wf ? (wf.raw ? wf.txt : "Signalstärke") : "Nicht verfügbar",
      wf ? (wf.raw ?? wf.txt) : null, "", wf ? (wf.lvl / 4) * 100 : 0, wf ? wf.col : "#8a8e95"));
    if (cfg.battery) rows.push(row(cfg.battery, iconBat(bt ? bt.pct : 0, bt ? bt.col : "#8a8e95"), "Batterie", bt ? bt.txt : "Nicht verfügbar",
      bt ? this._fmt(bt.pct, 0) : null, "%", bt ? bt.pct : 0, bt ? bt.col : "#8a8e95"));
    // WLAN-Zeile: Rohwert nicht doppeln, wenn identisch zum Text
    this.shadowRoot.innerHTML = `<style>${STYLE}</style>
      <ha-card><div class="wrap">
        <div class="dev" data-e="${cfg.temperature}">${svg}</div>
        <div class="rows">${rows.join("")}</div>
      </div></ha-card>`;

    this.shadowRoot.querySelectorAll("[data-e]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = el.dataset.e;
        if (!id) return;
        this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: id }, bubbles: true, composed: true }));
      });
    });
  }

  _esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
}

customElements.define("netatmo-indoor-card", NetatmoIndoorCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "netatmo-indoor-card",
  name: "Netatmo Innenstation",
  description: "Zylinder-Optik mit farbiger Temperatur, Luftfeuchtigkeit, CO₂, WLAN und Batterie",
});

console.info("%c NETATMO-INDOOR-CARD %c v3 · responsive + Trend ", "background:#1f2937;color:#4ade80;font-weight:700", "background:#4ade80;color:#111");
