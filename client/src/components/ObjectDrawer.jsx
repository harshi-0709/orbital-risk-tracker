import { useEffect, useState } from "react";
import { get } from "../api";

export default function ObjectDrawer({ id, onClose }) {
  const [o, setO] = useState(null);

  useEffect(() => {
    get(`/objects/${encodeURIComponent(id)}`).then(setO);
  }, [id]);

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer">
        <button className="btn" onClick={onClose} style={{ float: "right" }}>Close</button>
        {!o ? <p>Loading…</p> : (
          <>
            <h2>{o.object_name}</h2>
            <p className="mono" style={{ color: "var(--fg-3)" }}>{o.object_id} · NORAD {o.norad_cat_id}</p>
            <dl>
              <dt>Type</dt><dd>{o.object_type}</dd>
              <dt>Zone</dt><dd>{o.zone_name ?? "—"}</dd>
              <dt>Owner</dt><dd>{o.owner_name ?? "—"}</dd>
              <dt>Launch</dt><dd>{o.launch_code} · {o.launch_date}</dd>
              <dt>Launch site</dt><dd>{o.site_name ?? "—"}</dd>
              <dt>Apogee / perigee</dt><dd className="mono">{o.apogee_km} / {o.perigee_km} km</dd>
              <dt>Inclination</dt><dd className="mono">{o.inclination}°</dd>
              <dt>Period</dt><dd className="mono">{o.period_min} min</dd>
              {o.event_name && (<><dt>Fragmentation</dt><dd>{o.event_name} ({o.size_category})</dd></>)}
              {o.decay_date && (<><dt>Decayed</dt><dd>{o.decay_date}</dd></>)}
            </dl>
            <h3 style={{ marginTop: 20 }}>Alerts involving this object ({o.alerts.length})</h3>
            {o.alerts.map((a) => (
              <p key={a.alert_id} className="mono">
                #{a.alert_id} · {a.severity} · {a.miss_distance_km} km · {a.status}
              </p>
            ))}
          </>
        )}
      </aside>
    </>
  );
}