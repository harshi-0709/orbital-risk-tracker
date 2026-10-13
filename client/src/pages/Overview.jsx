import { useEffect, useState } from "react";
import { get } from "../api";

export default function Overview({ onOpenObjects }) {
  const [stats, setStats] = useState(null);
  const [zones, setZones] = useState([]);
  const [sites, setSites] = useState([]);

  useEffect(() => {
    get("/stats").then(setStats);
    get("/zones").then(setZones);
    get("/launch-sites").then((s) => setSites(s.slice(0, 8)));
  }, []);

  if (!stats) return <p>Loading…</p>;

  return (
    <>
      <h1>Overview</h1>
      <div className="cards">
        <div className="card"><div className="k">Objects</div><div className="v mono">{stats.total_objects}</div></div>
        <div className="card"><div className="k">Payloads</div><div className="v mono">{stats.payloads}</div></div>
        <div className="card"><div className="k">Debris</div><div className="v mono">{stats.debris}</div></div>
        <div className="card"><div className="k">Open alerts</div><div className="v mono">{stats.open_alerts}</div></div>
      </div>

      <h2>Orbital zones <small style={{ color: "var(--fg-3)" }}>click one to list its objects</small></h2>
      <table style={{ margin: "10px 0 24px" }}>
        <thead><tr><th>Zone</th><th>Altitude (km)</th><th>Objects</th><th>Capacity</th><th>Congestion</th></tr></thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.zone_id} onClick={() => onOpenObjects({ zone_id: z.zone_id })}>
              <td>{z.zone_name}</td>
              <td className="mono">{z.altitude_min_km}–{z.altitude_max_km}</td>
              <td className="mono">{z.objects}</td>
              <td className="mono">{z.zone_capacity}</td>
              <td>{z.congestion_level}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Busiest launch sites</h2>
      <table style={{ marginTop: 10 }}>
        <thead><tr><th>Site</th><th>Launches</th><th>Objects</th></tr></thead>
        <tbody>
          {sites.map((s) => (
            <tr key={s.site_code} onClick={() => onOpenObjects({ site_code: s.site_code })}>
              <td>{s.site_name} <span className="mono" style={{ color: "var(--fg-3)" }}>{s.site_code}</span></td>
              <td className="mono">{s.launches}</td>
              <td className="mono">{s.objects}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}