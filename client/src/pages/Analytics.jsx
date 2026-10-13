import { useEffect, useState } from "react";
import { get } from "../api";

function Bars({ rows, label, value, suffix = "" }) {
  const max = Math.max(...rows.map((r) => Number(r[value])), 1);
  return rows.map((r, i) => (
    <div className="bar-row" key={i}>
      <span className="bar-label" title={r[label]}>{r[label]}</span>
      <div className="bar-track"><div className="bar-fill" style={{ width: (Number(r[value]) / max) * 100 + "%" }} /></div>
      <span className="mono">{r[value]}{suffix}</span>
    </div>
  ));
}

const weekLabel = (wk) => `${String(wk).slice(0, 4)} W${String(wk).slice(4)}`;

export default function Analytics() {
  const [zoneRank, setZoneRank] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [analysts, setAnalysts] = useState([]);
  const [closest, setClosest] = useState([]);
  const [topN, setTopN] = useState(3);

  useEffect(() => {
    get("/analytics/zone-rank").then((r) => setZoneRank([...r].sort((a, b) => a.alert_rank - b.alert_rank)));
    get("/analytics/weekly").then(setWeekly);
    get("/analytics/analysts").then(setAnalysts);
  }, []);
  useEffect(() => { get("/analytics/closest", { top_n: topN }).then(setClosest); }, [topN]);

  // group closest-approach rows by zone for display
  const byZone = closest.reduce((acc, r) => ((acc[r.zone_name] ||= []).push(r), acc), {});

  return (
    <>
      <h1>Analytics</h1>
      <div className="grid2">
        <section className="panel">
          <h3>Alerts per zone</h3>
          <div className="sub">Zones ranked with <code>RANK() OVER (ORDER BY COUNT(*) DESC)</code></div>
          <Bars rows={zoneRank.map((r) => ({ ...r, name: `#${r.alert_rank} ${r.zone_name}` }))} label="name" value="alerts" />
        </section>

        <section className="panel">
          <h3>Analyst workload</h3>
          <div className="sub">Share of all status changes with <code>SUM(COUNT(*)) OVER ()</code></div>
          <Bars rows={analysts} label="analyst_name" value="pct_of_total" suffix="%" />
        </section>

        <section className="panel">
          <h3>Weekly status changes</h3>
          <div className="sub">Week-on-week with <code>LAG()</code>, cumulative with <code>SUM() OVER (ORDER BY wk)</code></div>
          <table>
            <thead><tr><th>Week</th><th>Changes</th><th>vs prev</th><th>Running total</th></tr></thead>
            <tbody>
              {weekly.map((w) => (
                <tr key={w.wk} style={{ cursor: "default" }}>
                  <td className="mono">{weekLabel(w.wk)}</td>
                  <td className="mono">{w.changes}</td>
                  <td className={"mono " + (w.change_vs_prev_week > 0 ? "up" : w.change_vs_prev_week < 0 ? "down" : "")}>
                    {w.change_vs_prev_week == null ? "—" : (w.change_vs_prev_week > 0 ? "+" : "") + w.change_vs_prev_week}
                  </td>
                  <td className="mono">{w.running_total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h3>Closest approaches per zone</h3>
          <div className="sub">
            Top
            <select value={topN} onChange={(e) => setTopN(Number(e.target.value))}
              style={{ margin: "0 6px", background: "var(--bg)", color: "var(--fg)", border: "1px solid var(--line)", borderRadius: 4 }}>
              {[1, 2, 3, 5, 10].map((n) => <option key={n}>{n}</option>)}
            </select>
            via <code>ROW_NUMBER() OVER (PARTITION BY zone ORDER BY miss_distance)</code>
          </div>
          {Object.entries(byZone).map(([zone, rows]) => (
            <div key={zone} style={{ marginBottom: 10 }}>
              <b>{zone}</b>
              {rows.map((r) => (
                <div key={r.alert_id} className="mono" style={{ color: "var(--fg-2)", fontSize: 13 }}>
                  #{r.alert_id} · {r.miss_distance_km} km · {r.severity}
                </div>
              ))}
            </div>
          ))}
        </section>
      </div>
    </>
  );
}