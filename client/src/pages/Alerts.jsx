import { useEffect, useState } from "react";
import { get } from "../api";

export default function Alerts() {
  const [filters, setFilters] = useState({ status: "", severity: "", zone_id: "" });
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tick, setTick] = useState(0);
useEffect(() => { get("/alerts", filters).then(setRows); }, [filters, tick]);

  useEffect(() => { get("/zones").then(setZones); }, []);
  

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <>
      <h1>Alerts</h1>
      <div className="filters">
        <select value={filters.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">All statuses</option>
          {["OPEN", "ACKNOWLEDGED", "RESOLVED", "CLOSED"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.severity} onChange={(e) => set("severity", e.target.value)}>
          <option value="">All severities</option>
          {["CRITICAL", "HIGH", "MODERATE", "LOW"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.zone_id} onChange={(e) => set("zone_id", e.target.value)}>
          <option value="">All zones</option>
          {zones.map((z) => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
        </select>
      </div>

      <table>
        <thead>
          <tr><th>#</th><th>Objects</th><th>Zone</th><th>TCA</th><th>Miss (km)</th><th>Severity</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.alert_id} onClick={() => setSelected(a)}>
              <td className="mono">{a.alert_id}</td>
              <td>{a.primary_name} × {a.secondary_name}</td>
              <td>{a.zone_name}</td>
              <td className="mono">{String(a.tca).replace("T", " ")}</td>
              <td className="mono">{a.miss_distance_km}</td>
              <td><span className={"sev " + String(a.severity).toLowerCase()}>{a.severity}</span></td>
              <td><span className={"st " + a.status}>{a.status}</span></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} style={{ color: "var(--fg-3)" }}>No alerts match.</td></tr>}
        </tbody>
      </table>

      {selected && <AlertDrawer key={selected.alert_id} alert={selected}
   onClose={() => setSelected(null)} onChanged={() => setTick((t) => t + 1)} />}
    </>
  );
}

const NEXT = {
  OPEN: ["ACKNOWLEDGED", "RESOLVED"],
  ACKNOWLEDGED: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

function AlertDrawer({ alert, onClose, onChanged }) {
  const [status, setStatus] = useState(alert.status);
  const [history, setHistory] = useState(null);
  const [analysts, setAnalysts] = useState([]);
  const [analystId, setAnalystId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadHistory = () => get(`/alerts/${alert.alert_id}/history`).then(setHistory);
  useEffect(() => { loadHistory(); }, [alert.alert_id]);
  useEffect(() => {
    get("/analysts").then((a) => { setAnalysts(a); if (a.length) setAnalystId(String(a[0].analyst_id)); });
  }, []);

  async function change(newStatus) {
    setBusy(true); setError("");
    try {
      const res = await fetch(`http://localhost:8000/api/alerts/${alert.alert_id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_status: newStatus, analyst_id: Number(analystId), note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      setStatus(data.status); setNote("");
      await loadHistory();
      onChanged();                       // refresh the list behind the drawer
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer">
        <button className="btn" onClick={onClose} style={{ float: "right" }}>Close</button>
        <h2>Alert #{alert.alert_id}</h2>
        <p>{alert.primary_name} × {alert.secondary_name}</p>
        <dl>
          <dt>Zone</dt><dd>{alert.zone_name}</dd>
          <dt>Closest approach</dt><dd className="mono">{String(alert.tca).replace("T", " ")}</dd>
          <dt>Miss distance</dt><dd className="mono">{alert.miss_distance_km} km</dd>
          <dt>Relative speed</dt><dd className="mono">{alert.relative_velocity_kmps} km/s</dd>
          <dt>Severity</dt><dd>{alert.severity}</dd>
          <dt>Status</dt><dd><span className={"st " + status}>{status}</span></dd>
        </dl>

        {NEXT[status].length > 0 && (
          <div className="actions">
            <select value={analystId} onChange={(e) => setAnalystId(e.target.value)}>
              {analysts.map((a) => <option key={a.analyst_id} value={a.analyst_id}>Acting as {a.analyst_name} ({a.role})</option>)}
            </select>
            <input placeholder="Note (optional)" value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} />
            <div className="row">
              {NEXT[status].map((s) => (
                <button key={s} className="btn primary" disabled={busy || !analystId} onClick={() => change(s)}>
                  {s === "ACKNOWLEDGED" ? "Acknowledge" : s === "RESOLVED" ? "Resolve" : "Close"}
                </button>
              ))}
            </div>
            {error && <div className="err">{error}</div>}
          </div>
        )}

        <h3 style={{ marginTop: 20 }}>Status history</h3>
        {!history ? <p>Loading…</p> : history.length === 0 ? <p style={{ color: "var(--fg-3)" }}>No changes recorded.</p> : (
          <div className="timeline">
            {history.map((h, i) => (
              <div key={i}>
                <div>{h.old_status ?? "—"} → <b>{h.new_status}</b></div>
                <div className="mono" style={{ color: "var(--fg-3)" }}>
                  {String(h.changed_at).replace("T", " ")} · {h.analyst_name ?? "system"}
                </div>
                {h.note && <div style={{ color: "var(--fg-2)" }}>{h.note}</div>}
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}