"""Pure scheduling logic ported from src/lib/schedule.ts."""

from datetime import date, datetime, timedelta

HABIT_FREQUENCIES = ("daily", "weekly", "monthly", "custom")


def clamp_times(value: int) -> int:
    return max(1, min(12, value))


def clamp_custom_days(value: int) -> int:
    return max(2, min(365, value))


def _as_date(d: date | datetime) -> date:
    return d.date() if isinstance(d, datetime) else d


def _monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _start_of_month(d: date) -> date:
    return d.replace(day=1)


def get_period_key(
    frequency: str,
    times_per_period: int,
    custom_every_days: int | None,
    d: date | None = None,
    created_at: date | datetime | None = None,
) -> str:
    day = _as_date(d or date.today())

    if frequency == "weekly":
        return _monday_of(day).isoformat()
    if frequency == "monthly":
        return _start_of_month(day).isoformat()
    if frequency == "custom":
        every = custom_every_days or 2
        origin = _as_date(created_at) if created_at else day
        diff = max(0, (day - origin).days)
        offset = diff % every
        return (day - timedelta(days=offset)).isoformat()
    return day.isoformat()


def is_habit_due_on(
    frequency: str,
    custom_every_days: int | None,
    d: date | None = None,
    created_at: date | datetime | None = None,
) -> bool:
    if frequency != "custom":
        return True
    day = _as_date(d or date.today())
    every = custom_every_days or 2
    pk = get_period_key(frequency, 1, custom_every_days, day, created_at)
    start = date.fromisoformat(pk)
    end = start + timedelta(days=every - 1)
    return start <= day <= end
