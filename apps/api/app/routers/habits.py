from datetime import date, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func
from sqlalchemy.orm import Session as DbSession

from app import schemas as S
from app.deps import get_current_user, get_db
from app.domain.consistency import (
    CONSISTENCY_WINDOW,
    compute_consistency,
    compute_streak,
)
from app.domain.schedule import (
    HABIT_FREQUENCIES,
    clamp_custom_days,
    clamp_times,
    get_period_key,
)
from app.models import Habit, HabitCompletion, User

router = APIRouter(prefix="/habits", tags=["habits"])


def _date_keys(days: int, end: date | None = None) -> list[str]:
    end = end or date.today()
    return [(end - timedelta(days=days - 1 - i)).isoformat() for i in range(days)]


def _as_freq(v: str) -> str:
    return v if v in HABIT_FREQUENCIES else "daily"


def _schedule_dict(h: Habit) -> dict:
    return {
        "id": h.id,
        "frequency": _as_freq(h.frequency),
        "times_per_period": h.times_per_period,
        "custom_every_days": h.custom_every_days,
        "created_at": h.created_at,
    }


@router.get("/dashboard", response_model=S.HabitsDashboard)
def dashboard(db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    window_start = _date_keys(CONSISTENCY_WINDOW)[0]
    week_keys = _date_keys(7)

    active = (
        db.query(Habit)
        .filter(Habit.user_id == user.id, Habit.archived_at.is_(None))
        .order_by(Habit.created_at.desc())
        .all()
    )

    habit_ids = [h.id for h in active]

    completions = (
        db.query(HabitCompletion)
        .filter(
            HabitCompletion.user_id == user.id,
            HabitCompletion.habit_id.in_(habit_ids) if habit_ids else False,
            HabitCompletion.completed_on >= date.fromisoformat(window_start),
        )
        .all()
    ) if habit_ids else []

    comp_dicts = [
        {"habit_id": c.habit_id, "completed_on": c.completed_on.isoformat(), "slot": c.slot}
        for c in completions
    ]
    score_habits = [_schedule_dict(h) for h in active]

    consistency = compute_consistency(score_habits, comp_dicts)
    streak = compute_streak(score_habits, comp_dicts)

    items = []
    for h in active:
        freq = _as_freq(h.frequency)
        pk = get_period_key(freq, h.times_per_period, h.custom_every_days, date.today(), h.created_at)
        times = max(1, h.times_per_period)
        slots = [
            any(
                c.habit_id == h.id and c.completed_on.isoformat() == pk and c.slot == s
                for c in completions
            )
            for s in range(times)
        ]
        week = [
            any(
                c.habit_id == h.id and c.completed_on.isoformat() == day
                for c in completions
            )
            for day in week_keys
        ]
        items.append(S.HabitSlotView(
            id=h.id, name=h.name, frequency=freq,
            timesPerPeriod=times, customEveryDays=h.custom_every_days,
            periodKey=pk, slots=slots, completedSlots=sum(slots), week=week,
        ))

    return S.HabitsDashboard(
        habits=items, weekKeys=week_keys,
        consistency=consistency, streak=streak, today=date.today().isoformat(),
    )


@router.post("", response_model=S.MsgOut)
def create(body: S.HabitCreate, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "Name is required")

    freq = _as_freq(body.frequency)
    tpp = clamp_times(body.timesPerPeriod)
    ced = clamp_custom_days(body.customEveryDays or 2) if freq == "custom" else None

    db.add(Habit(
        id=uuid4().hex, user_id=user.id, name=name,
        frequency=freq, times_per_period=tpp, custom_every_days=ced,
    ))
    return S.MsgOut()


@router.patch("/{habit_id}", response_model=S.MsgOut)
def update(habit_id: str, body: S.HabitUpdate, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    h = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not h:
        raise HTTPException(404, "Habit not found")

    if body.name is not None:
        trimmed = body.name.strip()
        if not trimmed:
            raise HTTPException(400, "Name is required")
        h.name = trimmed

    if body.frequency is not None:
        h.frequency = _as_freq(body.frequency)
    if body.timesPerPeriod is not None:
        h.times_per_period = clamp_times(body.timesPerPeriod)
    if body.customEveryDays is not None:
        h.custom_every_days = clamp_custom_days(body.customEveryDays) if h.frequency == "custom" else None

    return S.MsgOut()


@router.post("/{habit_id}/archive", response_model=S.MsgOut)
def archive(habit_id: str, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    h = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not h:
        raise HTTPException(404, "Habit not found")
    h.archived_at = datetime.utcnow()
    return S.MsgOut()


@router.get("/reminder-candidate")
def reminder_candidate(
    db: DbSession = Depends(get_db), user: User = Depends(get_current_user)
):
    today = date.today()
    active = (
        db.query(Habit)
        .filter(Habit.user_id == user.id, Habit.archived_at.is_(None))
        .order_by(Habit.created_at.desc())
        .all()
    )
    for h in active:
        freq = _as_freq(h.frequency)
        period = get_period_key(
            freq, h.times_per_period, h.custom_every_days, today, h.created_at
        )
        done = (
            db.query(func.count(HabitCompletion.id))
            .filter(
                HabitCompletion.habit_id == h.id,
                HabitCompletion.completed_on == date.fromisoformat(period),
            )
            .scalar()
            or 0
        )
        if done < h.times_per_period:
            return {"name": h.name}
    return None


@router.post("/{habit_id}/toggle", response_model=S.MsgOut)
def toggle(habit_id: str, body: S.ToggleRequest, db: DbSession = Depends(get_db), user: User = Depends(get_current_user)):
    h = (
        db.query(Habit)
        .filter(Habit.id == habit_id, Habit.user_id == user.id, Habit.archived_at.is_(None))
        .first()
    )
    if not h:
        raise HTTPException(404, "Habit not found")

    times = max(1, h.times_per_period)
    safe_slot = min(times - 1, max(0, body.slot))
    freq = _as_freq(h.frequency)
    completed_on_str = body.completedOn or get_period_key(
        freq, h.times_per_period, h.custom_every_days, date.today(), h.created_at,
    )
    completed_on = date.fromisoformat(completed_on_str)

    existing = (
        db.query(HabitCompletion)
        .filter(
            HabitCompletion.habit_id == habit_id,
            HabitCompletion.completed_on == completed_on,
            HabitCompletion.slot == safe_slot,
        )
        .first()
    )

    if existing:
        db.delete(existing)
    else:
        db.add(HabitCompletion(
            id=uuid4().hex, habit_id=habit_id,
            user_id=user.id, completed_on=completed_on, slot=safe_slot,
        ))
    return S.MsgOut()
