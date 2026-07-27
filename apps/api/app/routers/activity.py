from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DbSession

from app import schemas as S
from app.deps import get_current_user, get_db
from app.domain.activity_ingest import ingest_for_user
from app.domain.activity_stats import summarize_activity_day
from app.models import User, UserPreferences

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("/dashboard", response_model=S.ActivityDashboard)
def dashboard(
    day: str = Query(default=None),
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    day = day or date.today().isoformat()
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user.id).first()
    focus = summarize_activity_day(db, user.id, day)

    return S.ActivityDashboard(
        day=day,
        activeMs=focus["activeMs"],
        idleMs=focus["idleMs"],
        apps=[S.AppBreakdownRow(**a) for a in focus["apps"]],
        timeline=[S.TimelineBlock(**t) for t in focus["timeline"]],
        trackingEnabled=prefs.activity_tracking_enabled if prefs else False,
    )


@router.post("/ingest", response_model=S.MsgOut)
def ingest(body: S.IngestRequest, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    segs = [s.model_dump() for s in body.segments]
    ingest_for_user(db, user.id, segs)
    return S.MsgOut(success=True)
