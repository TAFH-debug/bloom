"""Calendar day digests: habits + focus for a single past (or today) day."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DbSession

from app import schemas as S
from app.deps import get_current_user, get_db
from app.domain.activity_stats import summarize_activity_day
from app.domain.consistency import CALENDAR_WINDOW, compute_daily_scores
from app.domain.schedule import get_period_key, is_habit_due_on
from app.models import Habit, HabitCompletion, User, UserPreferences

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _as_freq(v: str) -> str:
    return v if v in ("daily", "weekly", "monthly", "custom") else "daily"


@router.get("/day", response_model=S.CalendarDayDigest)
def day_digest(
    day: str = Query(...),
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        day_date = date.fromisoformat(day)
    except ValueError as exc:
        raise HTTPException(400, "Invalid day (use YYYY-MM-DD)") from exc

    if day_date > date.today():
        raise HTTPException(400, "Day is in the future")

    active = (
        db.query(Habit)
        .filter(Habit.user_id == user.id, Habit.archived_at.is_(None))
        .order_by(Habit.created_at.desc())
        .all()
    )
    habit_ids = [h.id for h in active]

    window_start = day_date - timedelta(days=CALENDAR_WINDOW - 1)
    completions = (
        db.query(HabitCompletion)
        .filter(
            HabitCompletion.user_id == user.id,
            HabitCompletion.habit_id.in_(habit_ids) if habit_ids else False,
            HabitCompletion.completed_on >= window_start,
            HabitCompletion.completed_on <= day_date,
        )
        .all()
    ) if habit_ids else []

    score_habits = [
        {
            "id": h.id,
            "frequency": _as_freq(h.frequency),
            "times_per_period": h.times_per_period,
            "custom_every_days": h.custom_every_days,
            "created_at": h.created_at,
        }
        for h in active
    ]
    comp_dicts = [
        {"habit_id": c.habit_id, "completed_on": c.completed_on.isoformat(), "slot": c.slot}
        for c in completions
    ]
    days = [
        S.DayScore(**d)
        for d in compute_daily_scores(score_habits, comp_dicts, CALENDAR_WINDOW, end=day_date)
    ]
    day_score = next((d.score for d in days if d.date == day), None)

    habit_rows: list[S.CalendarHabitDay] = []
    for h in active:
        freq = _as_freq(h.frequency)
        due = is_habit_due_on(freq, h.custom_every_days, day_date, h.created_at)
        times = max(1, h.times_per_period)
        pk = get_period_key(freq, h.times_per_period, h.custom_every_days, day_date, h.created_at)
        slots = [
            any(
                c.habit_id == h.id and c.completed_on.isoformat() == pk and c.slot == s
                for c in completions
            )
            for s in range(times)
        ]
        habit_rows.append(S.CalendarHabitDay(
            id=h.id,
            name=h.name,
            frequency=freq,
            timesPerPeriod=times,
            due=due,
            periodKey=pk,
            slots=slots,
            completedSlots=sum(slots),
        ))

    focus = summarize_activity_day(db, user.id, day)
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user.id).first()

    return S.CalendarDayDigest(
        day=day,
        habitScore=day_score,
        habits=habit_rows,
        days=days,
        focus=S.ActivityDashboard(
            day=day,
            activeMs=focus["activeMs"],
            idleMs=focus["idleMs"],
            apps=[S.AppBreakdownRow(**a) for a in focus["apps"]],
            timeline=[S.TimelineBlock(**t) for t in focus["timeline"]],
            trackingEnabled=prefs.activity_tracking_enabled if prefs else False,
        ),
    )
