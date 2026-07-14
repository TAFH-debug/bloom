import { format, subDays } from "date-fns";

export const CONSISTENCY_WINDOW_DAYS = 14;
export const STREAK_THRESHOLD = 1;

export function toDateKey(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function dateKeysForWindow(
  days: number = CONSISTENCY_WINDOW_DAYS,
  end: Date = new Date(),
): string[] {
  return Array.from({ length: days }, (_, index) =>
    toDateKey(subDays(end, days - 1 - index)),
  );
}

export function computeConsistencyScore(params: {
  activeHabitIds: string[];
  completions: { habitId: string; completedOn: string }[];
  windowDays?: number;
  end?: Date;
}): number {
  const {
    activeHabitIds,
    completions,
    windowDays = CONSISTENCY_WINDOW_DAYS,
    end = new Date(),
  } = params;

  if (activeHabitIds.length === 0) {
    return 0;
  }

  const keys = dateKeysForWindow(windowDays, end);
  const habitSet = new Set(activeHabitIds);
  const byDay = new Map<string, Set<string>>();

  for (const key of keys) {
    byDay.set(key, new Set());
  }

  for (const completion of completions) {
    if (!habitSet.has(completion.habitId)) continue;
    const daySet = byDay.get(completion.completedOn);
    if (daySet) {
      daySet.add(completion.habitId);
    }
  }

  const total = keys.reduce((sum, key) => {
    const completed = byDay.get(key)?.size ?? 0;
    return sum + completed / activeHabitIds.length;
  }, 0);

  return total / keys.length;
}

export function computeStreak(params: {
  activeHabitIds: string[];
  completions: { habitId: string; completedOn: string }[];
  threshold?: number;
  end?: Date;
}): number {
  const {
    activeHabitIds,
    completions,
    threshold = STREAK_THRESHOLD,
    end = new Date(),
  } = params;

  if (activeHabitIds.length === 0) {
    return 0;
  }

  const habitSet = new Set(activeHabitIds);
  const byDay = new Map<string, Set<string>>();

  for (const completion of completions) {
    if (!habitSet.has(completion.habitId)) continue;
    const existing = byDay.get(completion.completedOn) ?? new Set();
    existing.add(completion.habitId);
    byDay.set(completion.completedOn, existing);
  }

  let streak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const key = toDateKey(subDays(end, offset));
    const ratio = (byDay.get(key)?.size ?? 0) / activeHabitIds.length;
    if (ratio >= threshold) {
      streak += 1;
    } else if (offset === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}
