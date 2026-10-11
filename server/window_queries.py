from db import run_query

def zone_alert_rank():
    return run_query("""
        SELECT z.zone_name,
               COUNT(*) AS alerts,
               RANK() OVER (ORDER BY COUNT(*) DESC) AS alert_rank
        FROM ProximityAlert pa
        JOIN OrbitalZone z ON z.zone_id = pa.zone_id
        GROUP BY z.zone_id, z.zone_name
    """)

def weekly_status_changes():
    return run_query("""
        SELECT wk, changes,
               changes - LAG(changes) OVER (ORDER BY wk) AS change_vs_prev_week,
               SUM(changes) OVER (ORDER BY wk)           AS running_total
        FROM (
            SELECT YEARWEEK(changed_at) AS wk, COUNT(*) AS changes
            FROM AlertStatusHistory
            GROUP BY YEARWEEK(changed_at)
        ) w
    """)

def closest_approaches(top_n=3):
    return run_query("""
        SELECT zone_name, alert_id, miss_distance_km, severity
        FROM (
            SELECT z.zone_name, pa.alert_id, pa.miss_distance_km, pa.severity,
                   ROW_NUMBER() OVER (PARTITION BY pa.zone_id
                                      ORDER BY pa.miss_distance_km) AS rn
            FROM ProximityAlert pa
            JOIN OrbitalZone z ON z.zone_id = pa.zone_id
        ) t
        WHERE rn <= %s
    """, (top_n,))

def analyst_leaderboard():
    return run_query("""
        SELECT a.analyst_name, COUNT(*) AS changes,
               ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct_of_total
        FROM AlertStatusHistory h
        JOIN Analyst a ON a.analyst_id = h.analyst_id
        GROUP BY a.analyst_id, a.analyst_name
        ORDER BY changes DESC
    """)

if __name__ == "__main__":
    for fn in (zone_alert_rank, weekly_status_changes, closest_approaches, analyst_leaderboard):
        print(f"\n== {fn.__name__} ==")
        for row in fn():
            print(row)