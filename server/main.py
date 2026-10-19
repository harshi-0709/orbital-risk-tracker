from typing import Literal
import pymysql
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from db import run_query, run_call
import window_queries as wq

app = FastAPI(title="Orbital Risk Tracker API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])

# ---------- overview ----------
@app.get("/api/stats")
def stats():
    return run_query("""
        SELECT COUNT(*) AS total_objects,
               SUM(object_type='PAY') AS payloads,
               SUM(object_type='DEB') AS debris,
               SUM(object_type='R/B') AS rocket_bodies,
               (SELECT COUNT(*) FROM ProximityAlert WHERE status='OPEN') AS open_alerts
        FROM SpaceObject""")[0]

@app.get("/api/zones")
def zones():
    return run_query("""
        SELECT z.zone_id, z.zone_name, z.altitude_min_km, z.altitude_max_km,
               z.zone_capacity, z.congestion_level, COUNT(s.object_id) AS objects
        FROM OrbitalZone z
        LEFT JOIN SpaceObject s ON s.zone_id = z.zone_id AND s.decay_date IS NULL
        GROUP BY z.zone_id ORDER BY z.altitude_min_km""")

# ---------- objects: every filter is optional and combinable ----------
@app.get("/api/objects")
def objects(q: str = None, zone_id: int = None, object_type: str = None,
            owner_code: str = None, site_code: str = None, year: int = None,
            launch_code: str = None, limit: int = Query(50, le=200), offset: int = 0):
    where, params = [], []
    if q:           where.append("s.object_name LIKE %s");        params.append(f"%{q}%")
    if zone_id:     where.append("s.zone_id = %s");               params.append(zone_id)
    if object_type: where.append("s.object_type = %s");           params.append(object_type)
    if owner_code:  where.append("s.owner_code = %s");            params.append(owner_code)
    if site_code:   where.append("l.site_code = %s");             params.append(site_code)
    if year:        where.append("YEAR(l.launch_date) = %s");     params.append(year)
    if launch_code: where.append("l.launch_code = %s");           params.append(launch_code)
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    return run_query(f"""
        SELECT s.object_id, s.norad_cat_id, s.object_name, s.object_type,
               z.zone_name, o.owner_name, l.launch_code, l.launch_date, ls.site_name
        FROM SpaceObject s
        LEFT JOIN OrbitalZone z ON z.zone_id = s.zone_id
        LEFT JOIN Owner o       ON o.owner_code = s.owner_code
        LEFT JOIN Launch l      ON l.launch_id = s.launch_id
        LEFT JOIN LaunchSite ls ON ls.site_code = l.site_code
        {clause}
        ORDER BY s.object_name LIMIT %s OFFSET %s""", (*params, limit, offset))

@app.get("/api/objects/{object_id}")
def object_detail(object_id: str):
    rows = run_query("""
        SELECT s.*, z.zone_name, o.owner_name, l.launch_code, l.launch_date,
               ls.site_name, d.size_category, fe.event_name
        FROM SpaceObject s
        LEFT JOIN OrbitalZone z ON z.zone_id = s.zone_id
        LEFT JOIN Owner o ON o.owner_code = s.owner_code
        LEFT JOIN Launch l ON l.launch_id = s.launch_id
        LEFT JOIN LaunchSite ls ON ls.site_code = l.site_code
        LEFT JOIN DebrisDetail d ON d.object_id = s.object_id
        LEFT JOIN FragmentationEvent fe ON fe.event_id = d.event_id
        WHERE s.object_id = %s""", (object_id,))
    if not rows: raise HTTPException(404, "Object not found")
    alerts = run_query("""
        SELECT alert_id, tca, miss_distance_km, severity, status
        FROM ProximityAlert
        WHERE primary_object_id = %s OR secondary_object_id = %s
        ORDER BY tca""", (object_id, object_id))
    return {**rows[0], "alerts": alerts}

# ---------- drill-down lists: clicking a row feeds /api/objects ----------
@app.get("/api/launch-sites")
def launch_sites():
    return run_query("""
        SELECT ls.site_code, ls.site_name, COUNT(DISTINCT l.launch_id) AS launches,
               COUNT(s.object_id) AS objects
        FROM LaunchSite ls
        LEFT JOIN Launch l ON l.site_code = ls.site_code
        LEFT JOIN SpaceObject s ON s.launch_id = l.launch_id
        GROUP BY ls.site_code, ls.site_name ORDER BY objects DESC""")

@app.get("/api/launches-by-year")
def launches_by_year(site_code: str = None):
    return run_query("""
        SELECT YEAR(launch_date) AS yr, COUNT(*) AS launches
        FROM Launch WHERE (%s IS NULL OR site_code = %s)
        GROUP BY yr ORDER BY yr""", (site_code, site_code))

@app.get("/api/objects-by-year")
def objects_by_year():
    # objects put into orbit per launch year + running total (window function)
    return run_query("""
        SELECT yr, objects, SUM(objects) OVER (ORDER BY yr) AS cumulative
        FROM (SELECT YEAR(l.launch_date) AS yr, COUNT(*) AS objects
              FROM SpaceObject s JOIN Launch l ON l.launch_id = s.launch_id
              WHERE l.launch_date IS NOT NULL
              GROUP BY YEAR(l.launch_date)) t
        ORDER BY yr""")

@app.get("/api/owners")
def owners(limit: int = 15):
    return run_query("""
        SELECT o.owner_code, o.owner_name, COUNT(*) AS objects
        FROM SpaceObject s JOIN Owner o ON o.owner_code = s.owner_code
        GROUP BY o.owner_code, o.owner_name ORDER BY objects DESC LIMIT %s""", (limit,))

# ---------- alerts ----------
@app.get("/api/alerts")
def alerts(status: str = None, severity: str = None, zone_id: int = None,
           limit: int = Query(100, le=500)):
    where, params = [], []
    if status:   where.append("pa.status = %s");   params.append(status)
    if severity: where.append("pa.severity = %s"); params.append(severity)
    if zone_id:  where.append("pa.zone_id = %s");  params.append(zone_id)
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    return run_query(f"""
        SELECT pa.alert_id, pa.tca, pa.miss_distance_km, pa.relative_velocity_kmps,
               pa.severity, pa.status, z.zone_name,
               p.object_name AS primary_name, s.object_name AS secondary_name
        FROM ProximityAlert pa
        JOIN OrbitalZone z ON z.zone_id = pa.zone_id
        JOIN SpaceObject p ON p.object_id = pa.primary_object_id
        JOIN SpaceObject s ON s.object_id = pa.secondary_object_id
        {clause} ORDER BY pa.tca LIMIT %s""", (*params, limit))

# ---------- alert graphs for the Overview page (3 small aggregate queries, one response) ----------
@app.get("/api/alerts/overview")
def alerts_overview():
    by_severity = run_query("""
        SELECT severity, COUNT(*) AS n FROM ProximityAlert GROUP BY severity""")
    by_status = run_query("""
        SELECT status, COUNT(*) AS n FROM ProximityAlert GROUP BY status""")
    open_by_zone = run_query("""
        SELECT zone_id, severity, COUNT(*) AS n
        FROM ProximityAlert WHERE status = 'OPEN' GROUP BY zone_id, severity""")
    return {"by_severity": by_severity, "by_status": by_status,
            "open_by_zone": open_by_zone}

@app.get("/api/alerts/{alert_id}/history")
def alert_history(alert_id: int):
    return run_query("""
        SELECT h.changed_at, h.old_status, h.new_status, a.analyst_name, h.note
        FROM AlertStatusHistory h LEFT JOIN Analyst a ON a.analyst_id = h.analyst_id
        WHERE h.alert_id = %s ORDER BY h.changed_at""", (alert_id,))

# ---------- analytics (window functions, now driven by parameters) ----------
@app.get("/api/analytics/zone-rank")
def zone_rank(): return wq.zone_alert_rank()

@app.get("/api/analytics/weekly")
def weekly(): return wq.weekly_status_changes()

@app.get("/api/analytics/closest")
def closest(top_n: int = Query(3, ge=1, le=20)): return wq.closest_approaches(top_n)

@app.get("/api/analytics/analysts")
def analysts(): return wq.analyst_leaderboard()
@app.get("/api/analysts")
def analysts_list():
    return run_query("SELECT analyst_id, analyst_name, role FROM Analyst ORDER BY analyst_name")

class StatusChange(BaseModel):
    new_status: Literal["ACKNOWLEDGED", "RESOLVED", "CLOSED"]
    analyst_id: int
    note: str = ""

@app.post("/api/alerts/{alert_id}/status")
def change_status(alert_id: int, body: StatusChange):
    try:
        run_call("CALL resolve_alert(%s, %s, %s, %s)",
                 (alert_id, body.analyst_id, body.new_status, body.note[:255]))
    except pymysql.MySQLError as e:
        # errors raised with SIGNAL SQLSTATE '45000' arrive as error 1644
        if e.args and e.args[0] == 1644:
            raise HTTPException(400, e.args[1])
        raise
    return run_query("SELECT alert_id, status FROM ProximityAlert WHERE alert_id = %s", (alert_id,))[0]