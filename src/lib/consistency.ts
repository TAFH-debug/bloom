import { format, subDays } from "date-fns";
import {
  getPeriodKey,
  isHabitDueOn,
  type HabitSchedule,
} from "@/lib/schedule";

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

function parseDateKey(key: string) {
  return new Date(`${key}T12:00:00`);
}

export type HabitForScore = HabitSchedule & {
  id: string;
  createdAt?: Date | null;
};

export type CompletionForScore = {
  habitId: string;
  completedOn: string;
  slot?: number;
};

function habitRatioOnDay(
  habit: HabitForScore,
  dayKey: string,
  completions: CompletionForScore[],
) {
  const day = parseDateKey(dayKey);
  if (!isHabitDueOn(habit, day, habit.createdAt ?? null)) {
    return null;
  }

  const periodKey = getPeriodKey(habit, day, habit.createdAt ?? null);
  const times = Math.max(1, habit.timesPerPeriod);
  const slots = new Set(
    completions
      .filter(
        (completion) =>
          completion.habitId === habit.id &&
          completion.completedOn === periodKey,
      )
      .map((completion) => completion.slot ?? 0),
  );

  return Math.min(1, slots.size / times);
}

export function computeConsistencyScore(params: {
  habits: HabitForScore[];
  completions: CompletionForScore[];
  windowDays?: number;
  end?: Date;
}): number {
  const {
    habits,
    completions,
    windowDays = CONSISTENCY_WINDOW_DAYS,
    end = new Date(),
  } = params;

  if (habits.length === 0) {
    return 0;
  }

  const keys = dateKeysForWindow(windowDays, end);
  let total = 0;
  let counted = 0;

  for (const key of keys) {
    const ratios = habits
      .map((habit) => habitRatioOnDay(habit, key, completions))
      .filter((value): value is number => value !== null);

    if (ratios.length === 0) continue;
    total += ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
    counted += 1;
  }

  return counted === 0 ? 0 : total / counted;
}

export function computeStreak(params: {
  habits: HabitForScore[];
  completions: CompletionForScore[];
  threshold?: number;
  end?: Date;
}): number {
  const {
    habits,
    completions,
    threshold = STREAK_THRESHOLD,
    end = new Date(),
  } = params;

  if (habits.length === 0) {
    return 0;
  }

  let streak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const key = toDateKey(subDays(end, offset));
    const ratios = habits
      .map((habit) => habitRatioOnDay(habit, key, completions))
      .filter((value): value is number => value !== null);

    if (ratios.length === 0) {
      if (offset === 0) continue;
      break;
    }

    const dayScore =
      ratios.reduce((sum, value) => sum + value, 0) / ratios.length;

    if (dayScore >= threshold) {
      streak += 1;
    } else if (offset === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}
