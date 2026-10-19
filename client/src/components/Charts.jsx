// Hand-built SVG charts (no chart library). Colours come from the CSS tokens in index.css.
import { useState } from "react";

export const SEV = ["CRITICAL", "HIGH", "MODERATE", "LOW"];
const SEV_COLOR = { CRITICAL: "var(--crit)", HIGH: "var(--high)", MODERATE: "var(--mod)", LOW: "var(--low)" };

// congestion text from the DB -> a colour (case-insensitive, unknown values stay neutral)
function congestionColor(level) {
  const v = String(level || "").toLowerCase();
  if (/crit|sever|extreme|very/.test(v)) return SEV_COLOR.CRITICAL;
  if (/high|congest/.test(v)) return SEV_COLOR.HIGH;
  if (/mod|med/.test(v)) return SEV_COLOR.MODERATE;
  if (/low|sparse|light/.test(v)) return SEV_COLOR.LOW;
  return "var(--fg-3)";
}
const short = (s, n = 16) => (String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s));
const fmt = (n) => Number(n).toLocaleString();

/* ---------------------------------------------------------------- zone rings */
// One ring per orbital zone (inner = lowest altitude). Grey dots = how crowded the zone is,
// coloured dots = open alerts in that zone. Click a ring (or a row) to open Objects for that zone.
export function ZoneRings({ zones, openByZone, onPick }) {
  const [hover, setHover] = useState(null);
  const n = zones.length;
  const C = 180, R0 = 50, R1 = 168;
  const maxObj = Math.max(1, ...zones.map((z) => Number(z.objects)));
  const alertsFor = (id) => openByZone.filter((a) => a.zone_id === id);
  const info = hover != null ? zones.find((z) => z.zone_id === hover) : null;

  return (
    <div className="rings">
      <svg viewBox="0 0 360 360" role="img" aria-label="Orbital zones as concentric rings">
        <defs>
          <radialGradient id="earthg" cx="38%" cy="35%" r="75%">
            <stop offset="0" stopColor="#6d5bd0" stopOpacity=".95" />
            <stop offset=".6" stopColor="#2a1c5c" />
            <stop offset="1" stopColor="#0b0618" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r="32" fill="url(#earthg)" stroke="rgba(255,255,255,.25)" />
        <text x={C} y={C + 3} textAnchor="middle" className="ring-earth">EARTH</text>

        {zones.map((z, i) => {
          const r = n > 1 ? R0 + (i * (R1 - R0)) / (n - 1) : R0;
          const color = congestionColor(z.congestion_level);
          const dots = Math.max(3, Math.round(28 * (Number(z.objects) / maxObj)));
          const al = alertsFor(z.zone_id);
          let ai = 0;
          const on = hover === z.zone_id;
          return (
            <g key={z.zone_id} className={"ring" + (on ? " on" : "")}
               onMouseEnter={() => setHover(z.zone_id)} onMouseLeave={() => setHover(null)}
               onClick={() => onPick(z)}>
              <circle cx={C} cy={C} r={r} fill="none" stroke="rgba(255,255,255,.12)" />
              <circle cx={C} cy={C} r={r} fill="none" stroke={color} strokeWidth={on ? 3.4 : 2.2} opacity={on ? 1 : 0.7} />
              <circle cx={C} cy={C} r={r} fill="none" stroke="transparent" strokeWidth="12" className="ring-hit" />
              {Array.from({ length: dots }, (_, k) => {
                const a = ((k * 137.5 + i * 53) * Math.PI) / 180;
                return <circle key={k} cx={C + r * Math.cos(a)} cy={C + r * Math.sin(a)} r="1.3" fill="var(--fg-3)" />;
              })}
              {al.flatMap((row) =>
                Array.from({ length: Math.min(Number(row.n), 6) }, () => {
                  const a = ((ai++ * 61 + i * 29 + 20) * Math.PI) / 180;
                  const x = C + r * Math.cos(a), y = C + r * Math.sin(a);
                  const col = SEV_COLOR[row.severity] || "var(--fg)";
                  return (
                    <g key={ai}>
                      <circle cx={x} cy={y} r="6" fill={col} opacity=".22" className={row.severity === "CRITICAL" ? "pulse" : ""} />
                      <circle cx={x} cy={y} r="2.8" fill={col} />
                    </g>
                  );
                })
              )}
              <text x={C} y={C - r - 2.5} textAnchor="middle" className="ring-label">{short(z.zone_name)}</text>
            </g>
          );
        })}
      </svg>

      <div className="ring-info">
        {info ? (
          <>
            <b>{info.zone_name}</b>
            <span className="mono">{info.altitude_min_km}–{info.altitude_max_km} km</span>
            <span>{fmt(info.objects)} objects · capacity {fmt(info.zone_capacity)}</span>
            <span style={{ color: congestionColor(info.congestion_level) }}>● {info.congestion_level}</span>
          </>
        ) : (
          <span style={{ color: "var(--fg-3)" }}>Hover a ring for details · click to list its objects</span>
        )}
      </div>
      <div className="ring-key">
        <span><i style={{ background: "var(--fg-3)" }} />tracked objects</span>
        {SEV.map((s) => <span key={s}><i style={{ background: SEV_COLOR[s] }} />{s.toLowerCase()} open alert</span>)}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- severity donut */
export function SeverityDonut({ data }) {
  const count = Object.fromEntries(data.map((d) => [d.severity, Number(d.n)]));
  const total = SEV.reduce((s, k) => s + (count[k] || 0), 0);
  const R = 52, CIRC = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="Alerts by severity">
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="16" />
        {SEV.map((k) => {
          const len = total ? ((count[k] || 0) / total) * CIRC : 0;
          const el = (
            <circle key={k} cx="70" cy="70" r={R} fill="none" stroke={SEV_COLOR[k]} strokeWidth="16"
              strokeDasharray={`${Math.max(len - 1.5, 0)} ${CIRC}`} strokeDashoffset={-acc}
              transform="rotate(-90 70 70)"><title>{k}: {count[k] || 0}</title></circle>
          );
          acc += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" className="donut-n">{total}</text>
        <text x="70" y="84" textAnchor="middle" className="donut-k">ALERTS</text>
      </svg>
      <ul className="legend">
        {SEV.map((k) => (
          <li key={k}>
            <i style={{ background: SEV_COLOR[k] }} />
            <span>{k.charAt(0) + k.slice(1).toLowerCase()}</span>
            <b className="mono">{count[k] || 0}</b>
            <em className="mono">{total ? Math.round(((count[k] || 0) / total) * 100) : 0}%</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- launch growth */
// Line chart of objects launched per year. Toggle between the running total (the gradual increase) and per-year.
export function LaunchGrowth({ rows }) {
  const [mode, setMode] = useState("cumulative");
  if (!rows.length) return <p style={{ color: "var(--fg-3)" }}>No launch data.</p>;
  const pts = rows.map((r) => ({ yr: Number(r.yr), v: Number(mode === "cumulative" ? r.cumulative : r.objects), objects: Number(r.objects), total: Number(r.cumulative) }));
  const W = 1000, H = 280, L = 46, Rt = 20, T = 16, B = 28;
  const iw = W - L - Rt, ih = H - T - B;
  const x0 = pts[0].yr, x1 = pts[pts.length - 1].yr;
  const maxV = Math.max(...pts.map((p) => p.v));
  const mag = Math.pow(10, Math.floor(Math.log10(maxV || 1)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((st) => maxV / st <= 5) || mag;
  const top = step * Math.ceil(maxV / step);
  const X = (yr) => L + (x1 === x0 ? iw / 2 : ((yr - x0) / (x1 - x0)) * iw);
  const Y = (v) => T + ih - (v / top) * ih;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(p.yr).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${X(x1)},${Y(0)} L${X(x0)},${Y(0)} Z`;
  const yearStep = Math.max(1, Math.ceil((x1 - x0) / 8 / 5) * 5);
  const ticks = []; for (let y = Math.ceil(x0 / yearStep) * yearStep; y <= x1; y += yearStep) ticks.push(y);
  const k = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "k" : String(n));
  const last = pts[pts.length - 1];

  return (
    <div>
      <div className="seg">
        {[["cumulative", "Cumulative total"], ["yearly", "Per year"]].map(([m, l]) => (
          <button key={m} className={"btn" + (mode === m ? " primary" : "")} onClick={() => setMode(m)}>{l}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Objects launched by year" className="timeline-svg">
        <defs>
          <linearGradient id="growg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9a6ff" stopOpacity=".45" /><stop offset="1" stopColor="#c9a6ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step).map((g) => (
          <g key={g}>
            <line x1={L} x2={W - Rt} y1={Y(g)} y2={Y(g)} stroke="rgba(255,255,255,.08)" />
            <text x={L - 6} y={Y(g) + 3} textAnchor="end" className="axis">{k(g)}</text>
          </g>
        ))}
        {ticks.map((y) => <text key={y} x={X(y)} y={H - 9} textAnchor="middle" className="axis">{y}</text>)}
        <path d={area} fill="url(#growg)" />
        <path d={line} fill="none" stroke="#e4d2ff" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((p) => (
          <circle key={p.yr} cx={X(p.yr)} cy={Y(p.v)} r="2.6" fill="#fff" opacity={pts.length > 40 ? 0 : 0.9} className="pt">
            <title>{p.yr}: {fmt(p.objects)} launched · {fmt(p.total)} total</title>
          </circle>
        ))}
        <circle cx={X(last.yr)} cy={Y(last.v)} r="4" fill="#fff" />
        <text x={X(last.yr) - 8} y={Y(last.v) - 9} textAnchor="end" className="axis" style={{ fill: "#fff" }}>{fmt(last.v)}</text>
      </svg>
      <div className="ring-key"><span style={{ marginLeft: "auto" }}>objects by launch year · hover a point for details</span></div>
    </div>
  );
}

/* ---------------------------------------------------------------- status pipeline */
const STAGES = [["OPEN", "var(--crit)"], ["ACKNOWLEDGED", "var(--mod)"], ["RESOLVED", "var(--low)"], ["CLOSED", "var(--fg-3)"]];
export function StatusPipeline({ data }) {
  const count = Object.fromEntries(data.map((d) => [d.status, Number(d.n)]));
  const total = STAGES.reduce((s, [k]) => s + (count[k] || 0), 0) || 1;
  return (
    <div className="pipe">
      {STAGES.map(([k, col], i) => {
        const v = count[k] || 0;
        return (
          <div key={k} className="pipe-row">
            <span className="pipe-k">{k.charAt(0) + k.slice(1).toLowerCase()}</span>
            <div className="bar-track" style={{ height: 22 }}>
              <div className="bar-fill" style={{ width: `${(v / total) * 100}%`, background: col, minWidth: v ? 4 : 0 }} />
            </div>
            <b className="mono">{v}</b>
            {i < STAGES.length - 1 && <span className="pipe-arrow" aria-hidden>↓</span>}
          </div>
        );
      })}
      <div className="sub" style={{ margin: "10px 0 0" }}>
        Moves through <code>resolve_alert()</code>; resolve one in the Alerts tab and this updates.
      </div>
    </div>
  );
}