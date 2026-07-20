import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { habitCompletions, habits } from "@/db/schema";
import {
  CALENDAR_WINDOW_DAYS,
  CONSISTENCY_WINDOW_DAYS,
  computeConsistencyScore,
  computeDailyScores,
  computeStreak,
  dateKeysForWindow,
  toDateKey,
} from "@/lib/consistency";
import type { GardenHabitStat } from "@/lib/garden-types";
import {
  getPeriodKey,
  HABIT_FREQUENCIES,
  type HabitFrequency,
} from "@/lib/schedule";

function asFrequency(value: string): HabitFrequency {
  return HABIT_FREQUENCIES.includes(value as HabitFrequency)
    ? (value as HabitFrequency)
    : "daily";
}

export async function getUserProgress(userId: string) {
  const fetchDays = Math.max(CONSISTENCY_WINDOW_DAYS, CALENDAR_WINDOW_DAYS);
  const windowStart = dateKeysForWindow(fetchDays)[0];
  const weekKeys = dateKeysForWindow(7);
  const weekStart = weekKeys[0];
  const consistencyStart = dateKeysForWindow(CONSISTENCY_WINDOW_DAYS)[0];

  const activeHabits = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
    .orderBy(desc(habits.createdAt));

  const habitIds = activeHabits.map((habit) => habit.id);

  const completions =
    habitIds.length === 0
      ? []
      : await db
          .select({
            habitId: habitCompletions.habitId,
            completedOn: habitCompletions.completedOn,
            slot: habitCompletions.slot,
          })
          .from(habitCompletions)
          .where(
            and(
              eq(habitCompletions.userId, userId),
              inArray(habitCompletions.habitId, habitIds),
              gte(habitCompletions.completedOn, windowStart),
            ),
          );

  const scoreHabits = activeHabits.map((habit) => ({
    id: habit.id,
    frequency: asFrequency(habit.frequency),
    timesPerPeriod: habit.timesPerPeriod,
    customEveryDays: habit.customEveryDays,
    createdAt: habit.createdAt,
  }));

  const today = toDateKey();
  const windowDays = CONSISTENCY_WINDOW_DAYS;

  const habitStats: GardenHabitStat[] = activeHabits.map((habit) => {
    const schedule = {
      frequency: asFrequency(habit.frequency),
      timesPerPeriod: habit.timesPerPeriod,
      customEveryDays: habit.customEveryDays,
    };
    const periodKey = getPeriodKey(schedule, new Date(), habit.createdAt);
    const times = Math.max(1, habit.timesPerPeriod);
    const periodSlots = completions.filter(
      (completion) =>
        completion.habitId === habit.id &&
        completion.completedOn === periodKey,
    );
    const weekDone = completions.filter(
      (completion) =>
        completion.habitId === habit.id &&
        completion.completedOn >= weekStart,
    ).length;
    const windowDone = completions.filter(
      (completion) =>
        completion.habitId === habit.id &&
        completion.completedOn >= consistencyStart,
    ).length;

    return {
      id: habit.id,
      name: habit.name,
      completedToday: periodSlots.length >= times,
      completedSlots: periodSlots.length,
      timesPerPeriod: times,
      weekDone: Math.min(weekDone, 7 * times),
      windowRate: Math.min(1, windowDone / (windowDays * times)),
    };
  });

  const completedToday = habitStats.filter((habit) => habit.completedToday)
    .length;

  return {
    habitCount: habitIds.length,
    completedToday,
    consistency: computeConsistencyScore({
      habits: scoreHabits,
      completions,
    }),
    streak: computeStreak({
      habits: scoreHabits,
      completions,
    }),
    days: computeDailyScores({
      habits: scoreHabits,
      completions,
      windowDays: CALENDAR_WINDOW_DAYS,
    }),
    habits: habitStats,
    today,
  };
}
