import { useEffect, useState } from "react";
import { get } from "../api";
import ObjectDrawer from "../components/ObjectDrawer";

const LIMIT = 50;

export default function Objects({ initial = {} }) {
  const [filters, setFilters] = useState({
    q: "", zone_id: "", object_type: "", site_code: "", year: "", ...initial,
  });
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);
  const [sites, setSites] = useState([]);
  const [years, setYears] = useState([]);
  const [selected, setSelected] = useState(null);

  // dropdown options come from the database too
  useEffect(() => {
    get("/zones").then(setZones);
    get("/launch-sites").then(setSites);
  }, []);

  // the year list narrows to the selected launch site
  useEffect(() => {
    get("/launches-by-year", { site_code: filters.site_code }).then(setYears);
  }, [filters.site_code]);

  // refetch whenever a filter or the page changes (search is debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      get("/objects", { ...filters, limit: LIMIT, offset: page * LIMIT }).then(setRows);
    }, 250);
    return () => clearTimeout(t);
  }, [filters, page]);

  function set(key, value) {
    setPage(0);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <>
      <h1>Objects</h1>
      <div className="filters">
        <input placeholder="Search name…" value={filters.q} onChange={(e) => set("q", e.target.value)} />
        <select value={filters.zone_id} onChange={(e) => set("zone_id", e.target.value)}>
          <option value="">All zones</option>
          {zones.map((z) => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
        </select>
        <select value={filters.object_type} onChange={(e) => set("object_type", e.target.value)}>
          <option value="">All types</option>
          <option value="PAY">Payload</option>
          <option value="DEB">Debris</option>
          <option value="R/B">Rocket body</option>
          <option value="UNK">Unknown</option>
        </select>
        <select value={filters.site_code} onChange={(e) => set("site_code", e.target.value)}>
          <option value="">All launch sites</option>
          {sites.map((s) => <option key={s.site_code} value={s.site_code}>{s.site_name}</option>)}
        </select>
        <select value={filters.year} onChange={(e) => set("year", e.target.value)}>
          <option value="">All years</option>
          {years.map((y) => <option key={y.yr} value={y.yr}>{y.yr} ({y.launches})</option>)}
        </select>
        <button className="btn" onClick={() => { setPage(0); setFilters({ q: "", zone_id: "", object_type: "", site_code: "", year: "" }); }}>
          Clear
        </button>
      </div>

      <table>
        <thead><tr><th>Name</th><th>NORAD</th><th>Type</th><th>Zone</th><th>Owner</th><th>Launched</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.object_id} onClick={() => setSelected(r.object_id)}>
              <td>{r.object_name}</td>
              <td className="mono">{r.norad_cat_id}</td>
              <td><span className={"pill " + r.object_type}>{r.object_type}</span></td>
              <td>{r.zone_name ?? "—"}</td>
              <td>{r.owner_name ?? "—"}</td>
              <td className="mono">{r.launch_date ?? "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} style={{ color: "var(--fg-3)" }}>No objects match these filters.</td></tr>}
        </tbody>
      </table>

      <div className="pager">
        <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
        <span>Page {page + 1}</span>
        <button className="btn" disabled={rows.length < LIMIT} onClick={() => setPage(page + 1)}>Next →</button>
      </div>

      {selected && <ObjectDrawer id={selected} onClose={() => setSelected(null)} />}
    </>
  );
}