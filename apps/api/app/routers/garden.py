from datetime import date, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session as DbSession

from app import schemas as S
from app.deps import get_current_user, get_db
from app.domain.activity_stats import focus_summary_for_day
from app.domain.consistency import (
    CALENDAR_WINDOW,
    CONSISTENCY_WINDOW,
    compute_consistency,
    compute_daily_scores,
    compute_streak,
)
from app.domain.schedule import get_period_key
from app.models import (
    GardenInvitation,
    GardenMember,
    Habit,
    HabitCompletion,
    User,
)
from app.realtime.hub import hub

GARDEN_CAPACITY = 5
MAX_GUESTS = GARDEN_CAPACITY - 1

router = APIRouter(prefix="/garden", tags=["garden"])


def _date_keys(days: int, end: date | None = None) -> list[str]:
    end = end or date.today()
    return [(end - timedelta(days=days - 1 - i)).isoformat() for i in range(days)]


def _user_progress(db: DbSession, user_id: str) -> dict:
    fetch_days = max(CONSISTENCY_WINDOW, CALENDAR_WINDOW)
    window_start = _date_keys(fetch_days)[0]
    week_keys = _date_keys(7)
    consistency_start = _date_keys(CONSISTENCY_WINDOW)[0]

    active = (
        db.query(Habit)
        .filter(Habit.user_id == user_id, Habit.archived_at.is_(None))
        .order_by(Habit.created_at.desc())
        .all()
    )

    habit_ids = [h.id for h in active]
    completions = (
        db.query(HabitCompletion)
        .filter(
            HabitCompletion.user_id == user_id,
            HabitCompletion.habit_id.in_(habit_ids) if habit_ids else False,
            HabitCompletion.completed_on >= date.fromisoformat(window_start),
        )
        .all()
    ) if habit_ids else []

    comp_dicts = [
        {"habit_id": c.habit_id, "completed_on": c.completed_on.isoformat(), "slot": c.slot}
        for c in completions
    ]
    score_habits = [
        {
            "id": h.id,
            "frequency": h.frequency,
            "times_per_period": h.times_per_period,
            "custom_every_days": h.custom_every_days,
            "created_at": h.created_at,
        }
        for h in active
    ]

    today = date.today().isoformat()

    habit_stats = []
    for h in active:
        pk = get_period_key(h.frequency, h.times_per_period, h.custom_every_days, date.today(), h.created_at)
        times = max(1, h.times_per_period)
        period_slots = [c for c in completions if c.habit_id == h.id and c.completed_on.isoformat() == pk]
        week_done = len([c for c in completions if c.habit_id == h.id and c.completed_on.isoformat() >= week_keys[0]])
        window_done = len([c for c in completions if c.habit_id == h.id and c.completed_on.isoformat() >= consistency_start])
        habit_stats.append(S.GardenHabitStat(
            id=h.id, name=h.name,
            completedToday=len(period_slots) >= times,
            completedSlots=len(period_slots),
            timesPerPeriod=times,
            weekDone=min(week_done, 7 * times),
            windowRate=min(1.0, window_done / (CONSISTENCY_WINDOW * times)) if times else 0,
        ))

    completed_today = sum(1 for s in habit_stats if s.completedToday)
    focus = focus_summary_for_day(db, user_id)
    return {
        "habitCount": len(habit_ids),
        "completedToday": completed_today,
        "consistency": compute_consistency(score_habits, comp_dicts),
        "streak": compute_streak(score_habits, comp_dicts),
        "days": [S.DayScore(**d) for d in compute_daily_scores(score_habits, comp_dicts, CALENDAR_WINDOW)],
        "habits": habit_stats,
        **focus,
    }


def _status_from(u: User) -> dict:
    return {
        "statusPreset": u.status_preset,
        "statusNote": u.status_note,
        "statusUpdatedAt": u.status_updated_at.isoformat() if u.status_updated_at else None,
    }


def _guest_count(db: DbSession, owner_id: str) -> int:
    return db.query(func.count()).select_from(GardenMember).filter(GardenMember.owner_id == owner_id).scalar() or 0


def _ensure_membership(db: DbSession, owner_id: str, member_id: str) -> None:
    exists = db.query(GardenMember).filter(
        GardenMember.owner_id == owner_id, GardenMember.member_id == member_id,
    ).first()
    if not exists:
        db.add(GardenMember(id=uuid4().hex, owner_id=owner_id, member_id=member_id))


@router.get("/dashboard", response_model=S.GardenDashboard)
def dashboard(db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    self_progress = _user_progress(db, user.id)
    self_person = S.GardenPerson(
        id=f"self-{user.id}", memberId=user.id, name=user.name,
        email=user.email, image=user.image, isSelf=True,
        **self_progress, **_status_from(user),
    )

    rows = (
        db.query(GardenMember, User)
        .join(User, GardenMember.member_id == User.id)
        .filter(GardenMember.owner_id == user.id)
        .order_by(GardenMember.created_at.desc())
        .limit(MAX_GUESTS)
        .all()
    )

    guests = []
    for gm, member in rows:
        progress = _user_progress(db, member.id)
        guests.append(S.GardenPerson(
            id=gm.id, memberId=member.id, name=member.name,
            email=member.email, image=member.image, isSelf=False,
            **progress, **_status_from(member),
        ))

    incoming = _incoming(db, user)
    outgoing = _outgoing(db, user)

    return S.GardenDashboard(
        people=[self_person, *guests],
        guestCount=len(guests), maxGuests=MAX_GUESTS, capacity=GARDEN_CAPACITY,
        incomingInvites=incoming, outgoingInvites=outgoing,
    )


def _incoming(db: DbSession, user: User) -> list[S.GardenInvitationView]:
    rows = (
        db.query(GardenInvitation, User)
        .join(User, GardenInvitation.from_user_id == User.id)
        .filter(GardenInvitation.to_user_id == user.id, GardenInvitation.status == "pending")
        .order_by(GardenInvitation.created_at.desc())
        .all()
    )
    return [
        S.GardenInvitationView(
            id=inv.id, fromUserId=inv.from_user_id, toUserId=inv.to_user_id,
            fromName=u.name, fromEmail=u.email, toName=user.name, toEmail=user.email,
            createdAt=inv.created_at.isoformat(), direction="incoming",
        )
        for inv, u in rows
    ]


def _outgoing(db: DbSession, user: User) -> list[S.GardenInvitationView]:
    rows = (
        db.query(GardenInvitation, User)
        .join(User, GardenInvitation.to_user_id == User.id)
        .filter(GardenInvitation.from_user_id == user.id, GardenInvitation.status == "pending")
        .order_by(GardenInvitation.created_at.desc())
        .all()
    )
    return [
        S.GardenInvitationView(
            id=inv.id, fromUserId=inv.from_user_id, toUserId=inv.to_user_id,
            fromName=user.name, fromEmail=user.email, toName=u.name, toEmail=u.email,
            createdAt=inv.created_at.isoformat(), direction="outgoing",
        )
        for inv, u in rows
    ]


@router.get("/invites")
def invites(db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    return {"incoming": _incoming(db, user), "outgoing": _outgoing(db, user)}


@router.post("/invite", response_model=S.MsgOut)
async def invite(body: S.InviteRequest, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    email = body.email.strip().lower()
    if email == user.email.lower():
        raise HTTPException(400, "You are already growing in your own garden")

    if _guest_count(db, user.id) >= MAX_GUESTS:
        raise HTTPException(400, f"Garden is full ({GARDEN_CAPACITY} people including you)")

    target = db.query(User).filter(func.lower(User.email) == email).first()
    if not target:
        raise HTTPException(404, "No Bloom account with that email yet")

    already = db.query(GardenMember).filter(
        GardenMember.owner_id == user.id, GardenMember.member_id == target.id,
    ).first()
    if already:
        raise HTTPException(400, "They are already in your garden")

    existing = db.query(GardenInvitation).filter(
        GardenInvitation.from_user_id == user.id, GardenInvitation.to_user_id == target.id,
    ).first()
    if existing and existing.status == "pending":
        raise HTTPException(400, "Invitation already sent")

    reverse = db.query(GardenInvitation).filter(
        GardenInvitation.from_user_id == target.id,
        GardenInvitation.to_user_id == user.id,
        GardenInvitation.status == "pending",
    ).first()
    if reverse:
        raise HTTPException(400, "They already invited you — check your invitations")

    inv_id = existing.id if existing else uuid4().hex
    if existing:
        existing.status = "pending"
        existing.created_at = datetime.utcnow()
        existing.responded_at = None
    else:
        db.add(GardenInvitation(
            id=inv_id, from_user_id=user.id, to_user_id=target.id, status="pending",
        ))

    db.commit()
    await hub.publish(target.id, {
        "type": "invite-added",
        "data": {
            "id": inv_id, "fromUserId": user.id, "toUserId": target.id,
            "fromName": user.name, "fromEmail": user.email,
            "toName": target.name, "toEmail": target.email,
            "createdAt": datetime.utcnow().isoformat(), "direction": "incoming",
        },
    })
    return S.MsgOut()


@router.post("/invites/{invite_id}/accept", response_model=S.MsgOut)
async def accept(invite_id: str, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    inv = db.query(GardenInvitation).filter(
        GardenInvitation.id == invite_id,
        GardenInvitation.to_user_id == user.id,
        GardenInvitation.status == "pending",
    ).first()
    if not inv:
        raise HTTPException(404, "Invitation not found")

    from_id, to_id = inv.from_user_id, inv.to_user_id
    if _guest_count(db, from_id) >= MAX_GUESTS:
        raise HTTPException(400, "Their garden is full")
    if _guest_count(db, to_id) >= MAX_GUESTS:
        raise HTTPException(400, f"Your garden is full ({GARDEN_CAPACITY} people including you)")

    _ensure_membership(db, from_id, to_id)
    _ensure_membership(db, to_id, from_id)

    inv.status = "accepted"
    inv.responded_at = datetime.utcnow()

    db.query(GardenInvitation).filter(
        GardenInvitation.status == "pending",
        or_(
            and_(GardenInvitation.from_user_id == from_id, GardenInvitation.to_user_id == to_id),
            and_(GardenInvitation.from_user_id == to_id, GardenInvitation.to_user_id == from_id),
        ),
    ).delete(synchronize_session="fetch")

    db.commit()
    for uid in [from_id, to_id]:
        await hub.publish(uid, {"type": "invite-removed", "data": {"invitationId": invite_id}})
        await hub.publish(uid, {"type": "garden-changed", "data": {"reason": "invite-accepted"}})
    return S.MsgOut()


@router.post("/invites/{invite_id}/decline", response_model=S.MsgOut)
async def decline(invite_id: str, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    inv = db.query(GardenInvitation).filter(
        GardenInvitation.id == invite_id,
        GardenInvitation.to_user_id == user.id,
        GardenInvitation.status == "pending",
    ).first()
    if not inv:
        raise HTTPException(404, "Invitation not found")

    inv.status = "declined"
    inv.responded_at = datetime.utcnow()
    from_id = inv.from_user_id
    db.commit()

    for uid in [user.id, from_id]:
        await hub.publish(uid, {"type": "invite-removed", "data": {"invitationId": invite_id}})
    await hub.publish(from_id, {"type": "garden-changed", "data": {"reason": "invite-declined"}})
    return S.MsgOut()


@router.post("/invites/{invite_id}/cancel", response_model=S.MsgOut)
async def cancel(invite_id: str, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    inv = db.query(GardenInvitation).filter(
        GardenInvitation.id == invite_id,
        GardenInvitation.from_user_id == user.id,
        GardenInvitation.status == "pending",
    ).first()
    if not inv:
        raise HTTPException(404, "Invitation not found")

    to_id = inv.to_user_id
    db.delete(inv)
    db.commit()

    for uid in [user.id, to_id]:
        await hub.publish(uid, {"type": "invite-removed", "data": {"invitationId": invite_id}})
    return S.MsgOut()


@router.delete("/members/{member_id}", response_model=S.MsgOut)
async def remove_member(member_id: str, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(GardenMember).filter(
        GardenMember.id == member_id, GardenMember.owner_id == user.id,
    ).first()
    if not row:
        raise HTTPException(404, "Member not found")

    other_id = row.member_id
    db.query(GardenMember).filter(
        or_(
            and_(GardenMember.owner_id == user.id, GardenMember.member_id == other_id),
            and_(GardenMember.owner_id == other_id, GardenMember.member_id == user.id),
        ),
    ).delete(synchronize_session="fetch")
    db.commit()

    for uid in [user.id, other_id]:
        await hub.publish(uid, {"type": "garden-changed", "data": {"reason": "member-removed"}})
    return S.MsgOut()
