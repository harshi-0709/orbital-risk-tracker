import { useEffect, useState } from "react";
import { get } from "../api";
import { ZoneRings, SeverityDonut, LaunchGrowth, StatusPipeline } from "../components/Charts";

export default function Overview({ onOpenObjects }) {
  const [stats, setStats] = useState(null);
  const [zones, setZones] = useState([]);
  const [sites, setSites] = useState([]);
  const [ov, setOv] = useState(null);       // alert aggregates for the graphs
  const [growth, setGrowth] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fail = (e) => setError(e.message);
    get("/stats").then(setStats).catch(fail);
    get("/zones").then(setZones).catch(fail);
    get("/launch-sites").then((s) => setSites(s.slice(0, 8))).catch(fail);
    get("/alerts/overview").then(setOv).catch(fail);
    get("/objects-by-year").then(setGrowth).catch(fail);
  }, []);

  if (error) return <p className="err">Could not load the overview: {error}. Is the API running (and restarted after editing main.py)?</p>;
  if (!stats) return <p>Loading…</p>;

  return (
    <>
      <h1>Overview</h1>
      <div className="cards">
        <div className="card"><div className="k">Tracked objects</div><div className="v mono">{Number(stats.total_objects).toLocaleString()}</div></div>
        <div className="card"><div className="k">Payloads</div><div className="v mono">{Number(stats.payloads).toLocaleString()}</div></div>
        <div className="card"><div className="k">Debris</div><div className="v mono">{Number(stats.debris).toLocaleString()}</div></div>
        <div className="card"><div className="k">Open alerts</div><div className="v mono">{Number(stats.open_alerts).toLocaleString()}</div></div>
      </div>

      <div className="grid2">
        <section className="panel">
          <h3>Orbital zones</h3>
          <div className="sub">Rings run from the lowest altitude (inner) outwards. Click a ring to list its objects.</div>
          <ZoneRings zones={zones} openByZone={ov?.open_by_zone ?? []}
                     onPick={(z) => onOpenObjects({ zone_id: z.zone_id })} />
        </section>

        <section className="panel">
          <h3>Zones in detail</h3>
          <div className="sub">Live object counts per zone · click a row to list its objects</div>
          <div className="scroll">
            <table>
              <thead><tr><th>Zone</th><th>Altitude (km)</th><th>Objects</th><th>Capacity</th><th>Congestion</th></tr></thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.zone_id} onClick={() => onOpenObjects({ zone_id: z.zone_id })}>
                    <td>{z.zone_name}</td>
                    <td className="mono">{z.altitude_min_km}–{z.altitude_max_km}</td>
                    <td className="mono">{Number(z.objects).toLocaleString()}</td>
                    <td className="mono">{Number(z.zone_capacity).toLocaleString()}</td>
                    <td>{z.congestion_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="grid2">
        <section className="panel">
          <h3>Alerts by severity</h3>
          <div className="sub">All modelled conjunction alerts</div>
          {ov ? <SeverityDonut data={ov.by_severity} /> : <p>Loading…</p>}
        </section>
        <section className="panel">
          <h3>Alert status pipeline</h3>
          <div className="sub">Open → Acknowledged → Resolved → Closed</div>
          {ov ? <StatusPipeline data={ov.by_status} /> : <p>Loading…</p>}
        </section>
      </div>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>Growth of tracked objects</h3>
        <div className="sub">Objects launched per year and the running total, from the Launch table</div>
        <LaunchGrowth rows={growth} />
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>Busiest launch sites</h3>
        <div className="sub">Click a site to list the objects launched from it</div>
        <div className="scroll"><table>
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
        </table></div>
      </section>
    </>
  );
}