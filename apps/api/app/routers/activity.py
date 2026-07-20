from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc
from sqlalchemy.orm import Session as DbSession

from app import schemas as S
from app.deps import get_current_user, get_db
from app.domain.activity_ingest import ingest_for_user
from app.models import ActivitySegment, User, UserPreferences

router = APIRouter(prefix="/activity", tags=["activity"])


def _day_bounds(day: str) -> tuple[datetime, datetime]:
    start = datetime.fromisoformat(f"{day}T00:00:00")
    end = start + timedelta(days=1)
    return start, end


@router.get("/dashboard", response_model=S.ActivityDashboard)
def dashboard(
    day: str = Query(default=None),
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    day = day or date.today().isoformat()
    start, end = _day_bounds(day)

    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user.id).first()

    rows = (
        db.query(ActivitySegment)
        .filter(
            ActivitySegment.user_id == user.id,
            ActivitySegment.started_at >= start,
            ActivitySegment.started_at < end,
        )
        .order_by(asc(ActivitySegment.started_at))
        .all()
    )

    active_ms = idle_ms = 0
    app_map: dict[str, S.AppBreakdownRow] = {}
    timeline: list[S.TimelineBlock] = []

    for r in rows:
        duration = max(0, int((r.ended_at - r.started_at).total_seconds() * 1000))
        kind = "idle" if r.kind == "idle" else "app"
        if kind == "idle":
            idle_ms += duration
        else:
            active_ms += duration
            key = r.exe_path or r.process_name or r.app_name or "Unknown"
            if key in app_map:
                existing = app_map[key]
                app_map[key] = S.AppBreakdownRow(
                    key=existing.key, processName=existing.processName,
                    appName=existing.appName, exePath=existing.exePath,
                    durationMs=existing.durationMs + duration,
                )
            else:
                app_map[key] = S.AppBreakdownRow(
                    key=key, processName=r.process_name,
                    appName=r.app_name, exePath=r.exe_path, durationMs=duration,
                )

        timeline.append(S.TimelineBlock(
            id=r.id, kind=kind,
            startedAt=r.started_at.isoformat(), endedAt=r.ended_at.isoformat(),
            durationMs=duration, processName=r.process_name, appName=r.app_name,
        ))

    apps = sorted(app_map.values(), key=lambda a: a.durationMs, reverse=True)

    return S.ActivityDashboard(
        day=day, activeMs=active_ms, idleMs=idle_ms,
        apps=apps, timeline=timeline,
        trackingEnabled=prefs.activity_tracking_enabled if prefs else False,
    )


@router.post("/ingest", response_model=S.MsgOut)
def ingest(body: S.IngestRequest, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    segs = [s.model_dump() for s in body.segments]
    result = ingest_for_user(db, user.id, segs)
    return S.MsgOut(success=True)
