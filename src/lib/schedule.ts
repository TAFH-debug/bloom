import {
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  differenceInCalendarDays,
} from "date-fns";

export const HABIT_FREQUENCIES = [
  "daily",
  "weekly",
  "monthly",
  "custom",
] as const;

export type HabitFrequency = (typeof HABIT_FREQUENCIES)[number];

export type HabitSchedule = {
  frequency: HabitFrequency;
  timesPerPeriod: number;
  customEveryDays: number | null;
};

export function clampTimesPerPeriod(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(12, Math.max(1, Math.round(value)));
}

export function clampCustomEveryDays(value: number) {
  if (!Number.isFinite(value)) return 2;
  return Math.min(365, Math.max(2, Math.round(value)));
}

export function periodLabel(frequency: HabitFrequency) {
  switch (frequency) {
    case "daily":
      return "day";
    case "weekly":
      return "week";
    case "monthly":
      return "month";
    case "custom":
      return "period";
  }
}

export function frequencyLabel(frequency: HabitFrequency) {
  switch (frequency) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "custom":
      return "Custom";
  }
}

export function getPeriodKey(
  schedule: HabitSchedule,
  date: Date = new Date(),
  habitCreatedAt?: Date | null,
): string {
  switch (schedule.frequency) {
    case "weekly":
      return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    case "monthly":
      return format(startOfMonth(date), "yyyy-MM-dd");
    case "custom": {
      const every = schedule.customEveryDays ?? 2;
      const origin = habitCreatedAt ?? date;
      const originDay = new Date(
        origin.getFullYear(),
        origin.getMonth(),
        origin.getDate(),
      );
      const currentDay = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const diff = Math.max(0, differenceInCalendarDays(currentDay, originDay));
      const offset = diff % every;
      return format(subDays(currentDay, offset), "yyyy-MM-dd");
    }
    case "daily":
    default:
      return format(date, "yyyy-MM-dd");
  }
}

export function isHabitDueOn(
  schedule: HabitSchedule,
  date: Date = new Date(),
  habitCreatedAt?: Date | null,
): boolean {
  if (schedule.frequency === "custom") {
    const every = schedule.customEveryDays ?? 2;
    const periodStart = getPeriodKey(schedule, date, habitCreatedAt);
    const start = new Date(`${periodStart}T12:00:00`);
    const end = subDays(start, -(every - 1));
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return day >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
      day <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
  }

  return true;
}

export function currentPeriodBounds(
  schedule: HabitSchedule,
  date: Date = new Date(),
  habitCreatedAt?: Date | null,
) {
  const key = getPeriodKey(schedule, date, habitCreatedAt);
  const start = new Date(`${key}T00:00:00`);
  switch (schedule.frequency) {
    case "weekly":
      return {
        start,
        end: subDays(
          startOfWeek(subDays(start, -6), { weekStartsOn: 1 }),
          0,
        ),
      };
    case "monthly":
      return { start, end: endOfMonth(start) };
    case "custom": {
      const every = schedule.customEveryDays ?? 2;
      return { start, end: subDays(start, -(every - 1)) };
    }
    case "daily":
    default:
      return { start, end: start };
  }
}
