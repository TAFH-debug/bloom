from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from app import schemas as S
from app.deps import get_current_user, get_db
from app.models import GardenMember, User
from app.realtime.hub import hub

STATUS_PRESETS = {"focusing", "working", "reading", "exercising", "resting", "away", "offline"}
STATUS_NOTE_MAX = 80

router = APIRouter(prefix="/status", tags=["status"])


def _watchers_of(db: DbSession, member_id: str) -> list[str]:
    rows = db.query(GardenMember.owner_id).filter(GardenMember.member_id == member_id).all()
    return [member_id, *(r.owner_id for r in rows)]


@router.get("/me", response_model=S.StatusOut)
def get_status(db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    preset = user.status_preset if user.status_preset in STATUS_PRESETS else None
    return S.StatusOut(
        statusPreset=preset,
        statusNote=user.status_note,
        statusUpdatedAt=user.status_updated_at.isoformat() if user.status_updated_at else None,
    )


@router.put("", response_model=S.MsgOut)
async def set_status(body: S.StatusUpdate, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    preset = None
    if body.preset and body.preset != "offline":
        if body.preset not in STATUS_PRESETS:
            raise HTTPException(400, "Invalid status")
        preset = body.preset

    note_raw = (body.note or "").strip()[:STATUS_NOTE_MAX]
    note = note_raw if preset and note_raw else None
    now = datetime.utcnow()

    user.status_preset = preset
    user.status_note = note
    user.status_updated_at = now
    user.updated_at = now
    watchers = _watchers_of(db, user.id)
    # Release the DB transaction before awaiting websocket I/O.
    db.commit()

    await hub.publish_all(watchers, {
        "type": "status",
        "data": {
            "memberId": user.id,
            "statusPreset": preset,
            "statusNote": note,
            "statusUpdatedAt": now.isoformat(),
        },
    })
    return S.MsgOut()
