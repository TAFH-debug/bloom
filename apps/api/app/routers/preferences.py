from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DbSession

from app import schemas as S
from app.deps import get_current_user, get_db
from app.models import User, UserPreferences
from app.realtime.hub import hub

DEFAULT_START = 9
DEFAULT_END = 0
INTERVAL_HOURS = 4

router = APIRouter(prefix="/preferences", tags=["preferences"])


def _clamp_hour(v: int) -> int:
    return max(0, min(23, v))


def _ensure_row(db: DbSession, user_id: str) -> UserPreferences:
    row = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    if not row:
        row = UserPreferences(user_id=user_id, updated_at=datetime.utcnow())
        db.add(row)
        db.flush()
    return row


@router.get("", response_model=S.PreferencesOut)
def get_prefs(db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(UserPreferences).filter(UserPreferences.user_id == user.id).first()
    return S.PreferencesOut(
        reminderWindowStart=row.reminder_window_start if row else DEFAULT_START,
        reminderWindowEnd=row.reminder_window_end if row else DEFAULT_END,
        intervalHours=INTERVAL_HOURS,
        activityTrackingEnabled=row.activity_tracking_enabled if row else False,
    )


@router.put("/reminder", response_model=S.MsgOut)
def update_reminder(body: S.ReminderWindowUpdate, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = _ensure_row(db, user.id)
    row.reminder_window_start = _clamp_hour(body.start)
    row.reminder_window_end = _clamp_hour(body.end)
    row.updated_at = datetime.utcnow()
    return S.MsgOut()


@router.put("/activity-tracking", response_model=S.MsgOut)
async def update_tracking(body: S.ActivityTrackingUpdate, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = _ensure_row(db, user.id)
    row.activity_tracking_enabled = body.enabled
    row.updated_at = datetime.utcnow()
    db.commit()
    await hub.publish(user.id, {"type": "preferences", "data": {"activityTrackingEnabled": body.enabled}})
    return S.MsgOut()
