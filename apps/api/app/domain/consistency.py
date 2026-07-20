"""14-day consistency score + streak, ported from src/lib/consistency.ts."""

from datetime import date, datetime, timedelta

from app.domain.schedule import get_period_key, is_habit_due_on

CONSISTENCY_WINDOW = 14
CALENDAR_WINDOW = 28
STREAK_THRESHOLD = 1.0


def _date_keys(days: int, end: date | None = None) -> list[str]:
    end = end or date.today()
    return [(end - timedelta(days=days - 1 - i)).isoformat() for i in range(days)]


def _habit_ratio(
    habit: dict,
    day_key: str,
    completions: list[dict],
) -> float | None:
    d = date.fromisoformat(day_key)
    freq = habit["frequency"]
    custom = habit.get("custom_every_days")
    created = habit.get("created_at")

    if not is_habit_due_on(freq, custom, d, created):
        return None

    pk = get_period_key(freq, habit.get("times_per_period", 1), custom, d, created)
    times = max(1, habit.get("times_per_period", 1))
    slots = {
        c["slot"]
        for c in completions
        if c["habit_id"] == habit["id"] and c["completed_on"] == pk
    }
    return min(1.0, len(slots) / times)


def compute_consistency(
    habits: list[dict],
    completions: list[dict],
    window: int = CONSISTENCY_WINDOW,
    end: date | None = None,
) -> float:
    if not habits:
        return 0.0
    keys = _date_keys(window, end)
    total = counted = 0.0
    for key in keys:
        ratios = [r for h in habits if (r := _habit_ratio(h, key, completions)) is not None]
        if not ratios:
            continue
        total += sum(ratios) / len(ratios)
        counted += 1
    return total / counted if counted else 0.0


def compute_streak(
    habits: list[dict],
    completions: list[dict],
    threshold: float = STREAK_THRESHOLD,
    end: date | None = None,
) -> int:
    if not habits:
        return 0
    end = end or date.today()
    streak = 0
    for offset in range(365):
        key = (end - timedelta(days=offset)).isoformat()
        ratios = [r for h in habits if (r := _habit_ratio(h, key, completions)) is not None]
        if not ratios:
            if offset == 0:
                continue
            break
        day_score = sum(ratios) / len(ratios)
        if day_score >= threshold:
            streak += 1
        elif offset == 0:
            continue
        else:
            break
    return streak


def compute_daily_scores(
    habits: list[dict],
    completions: list[dict],
    window: int = CALENDAR_WINDOW,
    end: date | None = None,
) -> list[dict]:
    keys = _date_keys(window, end)
    result = []
    for key in keys:
        if not habits:
            result.append({"date": key, "score": None})
            continue
        ratios = [r for h in habits if (r := _habit_ratio(h, key, completions)) is not None]
        if not ratios:
            result.append({"date": key, "score": None})
        else:
            result.append({"date": key, "score": sum(ratios) / len(ratios)})
    return result
