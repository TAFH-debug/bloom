"""Aggregate activity segments for a calendar day."""

from datetime import date, datetime, timedelta

from sqlalchemy import asc
from sqlalchemy.orm import Session as DbSession

from app.models import ActivitySegment


def day_bounds(day: str) -> tuple[datetime, datetime]:
    start = datetime.fromisoformat(f"{day}T00:00:00")
    return start, start + timedelta(days=1)


def summarize_activity_day(db: DbSession, user_id: str, day: str) -> dict:
    start, end = day_bounds(day)
    rows = (
        db.query(ActivitySegment)
        .filter(
            ActivitySegment.user_id == user_id,
            ActivitySegment.started_at >= start,
            ActivitySegment.started_at < end,
        )
        .order_by(asc(ActivitySegment.started_at))
        .all()
    )

    active_ms = idle_ms = 0
    app_map: dict[str, dict] = {}
    timeline: list[dict] = []

    for r in rows:
        duration = max(0, int((r.ended_at - r.started_at).total_seconds() * 1000))
        kind = "idle" if r.kind == "idle" else "app"
        if kind == "idle":
            idle_ms += duration
        else:
            active_ms += duration
            key = r.exe_path or r.process_name or r.app_name or "Unknown"
            if key in app_map:
                app_map[key]["durationMs"] += duration
            else:
                app_map[key] = {
                    "key": key,
                    "processName": r.process_name,
                    "appName": r.app_name,
                    "exePath": r.exe_path,
                    "durationMs": duration,
                }

        timeline.append({
            "id": r.id,
            "kind": kind,
            "startedAt": r.started_at.isoformat(),
            "endedAt": r.ended_at.isoformat(),
            "durationMs": duration,
            "processName": r.process_name,
            "appName": r.app_name,
        })

    apps = sorted(app_map.values(), key=lambda a: a["durationMs"], reverse=True)
    return {
        "day": day,
        "activeMs": active_ms,
        "idleMs": idle_ms,
        "apps": apps,
        "timeline": timeline,
    }


def focus_summary_for_day(db: DbSession, user_id: str, day: str | None = None) -> dict:
    """Compact focus stats for garden cards."""
    day = day or date.today().isoformat()
    full = summarize_activity_day(db, user_id, day)
    top = []
    for app in full["apps"][:3]:
        process = (app.get("processName") or "").replace(".exe", "").replace(".EXE", "")
        name = app.get("appName") or process or "App"
        if process and app.get("appName") and process.lower() != str(app["appName"]).lower():
            label = f"{process} · {app['appName']}"
        else:
            label = name if name else process or "App"
        top.append({"label": label[:80], "durationMs": app["durationMs"]})
    return {
        "focusActiveMs": full["activeMs"],
        "focusIdleMs": full["idleMs"],
        "focusTopApps": top,
    }
