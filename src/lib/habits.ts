"use server";

import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { habitCompletions, habits } from "@/db/schema";
import {
  CONSISTENCY_WINDOW_DAYS,
  computeConsistencyScore,
  computeStreak,
  dateKeysForWindow,
  toDateKey,
} from "@/lib/consistency";
import {
  clampCustomEveryDays,
  clampTimesPerPeriod,
  getPeriodKey,
  HABIT_FREQUENCIES,
  isHabitDueOn,
  type HabitFrequency,
} from "@/lib/schedule";
import { requireSession } from "@/lib/session";

function newId() {
  return crypto.randomUUID();
}

function revalidateHabitPaths() {
  revalidatePath("/");
  revalidatePath("/habits");
  revalidatePath("/garden");
}

function asFrequency(value: string): HabitFrequency {
  return HABIT_FREQUENCIES.includes(value as HabitFrequency)
    ? (value as HabitFrequency)
    : "daily";
}

function habitSchedule(habit: {
  frequency: string;
  timesPerPeriod: number;
  customEveryDays: number | null;
  createdAt: Date;
}) {
  return {
    frequency: asFrequency(habit.frequency),
    timesPerPeriod: habit.timesPerPeriod,
    customEveryDays: habit.customEveryDays,
    createdAt: habit.createdAt,
  };
}

export async function getHabitsDashboard() {
  const session = await requireSession();
  const userId = session.user.id;
  const windowStart = dateKeysForWindow(CONSISTENCY_WINDOW_DAYS)[0];
  const weekKeys = dateKeysForWindow(7);
  const weekStart = weekKeys[0];

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
          .select()
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
    ...habitSchedule(habit),
  }));

  const consistency = computeConsistencyScore({
    habits: scoreHabits,
    completions,
  });

  const streak = computeStreak({
    habits: scoreHabits,
    completions,
  });

  return {
    habits: activeHabits.map((habit) => {
      const schedule = habitSchedule(habit);
      const periodKey = getPeriodKey(
        schedule,
        new Date(),
        habit.createdAt,
      );
      const times = Math.max(1, habit.timesPerPeriod);
      const slots = Array.from({ length: times }, (_, slot) =>
        completions.some(
          (completion) =>
            completion.habitId === habit.id &&
            completion.completedOn === periodKey &&
            completion.slot === slot,
        ),
      );

      return {
        id: habit.id,
        name: habit.name,
        frequency: schedule.frequency,
        timesPerPeriod: times,
        customEveryDays: habit.customEveryDays,
        periodKey,
        slots,
        completedSlots: slots.filter(Boolean).length,
        week: weekKeys.map((day) =>
          completions.some(
            (completion) =>
              completion.habitId === habit.id &&
              completion.completedOn >= weekStart &&
              completion.completedOn === day,
          ),
        ),
      };
    }),
    weekKeys,
    consistency,
    streak,
    today: toDateKey(),
  };
}

export async function createHabit(input: {
  name: string;
  frequency: string;
  timesPerPeriod: number;
  customEveryDays?: number | null;
}) {
  const session = await requireSession();
  const trimmed = input.name.trim();
  if (!trimmed) {
    return { error: "Name is required" };
  }

  const frequency = asFrequency(input.frequency);
  const timesPerPeriod = clampTimesPerPeriod(input.timesPerPeriod);
  const customEveryDays =
    frequency === "custom"
      ? clampCustomEveryDays(input.customEveryDays ?? 2)
      : null;

  await db.insert(habits).values({
    id: newId(),
    userId: session.user.id,
    name: trimmed,
    frequency,
    timesPerPeriod,
    customEveryDays,
  });

  revalidateHabitPaths();
  return { success: true };
}

export async function renameHabit(habitId: string, name: string) {
  const session = await requireSession();
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Name is required" };
  }

  await db
    .update(habits)
    .set({ name: trimmed })
    .where(and(eq(habits.id, habitId), eq(habits.userId, session.user.id)));

  revalidateHabitPaths();
  return { success: true };
}

export async function updateHabitSchedule(
  habitId: string,
  input: {
    frequency: string;
    timesPerPeriod: number;
    customEveryDays?: number | null;
  },
) {
  const session = await requireSession();
  const frequency = asFrequency(input.frequency);
  const timesPerPeriod = clampTimesPerPeriod(input.timesPerPeriod);
  const customEveryDays =
    frequency === "custom"
      ? clampCustomEveryDays(input.customEveryDays ?? 2)
      : null;

  await db
    .update(habits)
    .set({ frequency, timesPerPeriod, customEveryDays })
    .where(and(eq(habits.id, habitId), eq(habits.userId, session.user.id)));

  revalidateHabitPaths();
  return { success: true };
}

export async function archiveHabit(habitId: string) {
  const session = await requireSession();

  await db
    .update(habits)
    .set({ archivedAt: new Date() })
    .where(and(eq(habits.id, habitId), eq(habits.userId, session.user.id)));

  revalidateHabitPaths();
  return { success: true };
}

export async function toggleHabitCompletion(habitId: string, slot: number) {
  const session = await requireSession();

  const habit = await db.query.habits.findFirst({
    where: and(
      eq(habits.id, habitId),
      eq(habits.userId, session.user.id),
      isNull(habits.archivedAt),
    ),
  });

  if (!habit) {
    return { error: "Habit not found" };
  }

  const times = Math.max(1, habit.timesPerPeriod);
  const safeSlot = Math.min(times - 1, Math.max(0, Math.round(slot)));
  const schedule = habitSchedule(habit);
  const completedOn = getPeriodKey(schedule, new Date(), habit.createdAt);

  const existing = await db.query.habitCompletions.findFirst({
    where: and(
      eq(habitCompletions.habitId, habitId),
      eq(habitCompletions.completedOn, completedOn),
      eq(habitCompletions.slot, safeSlot),
    ),
  });

  if (existing) {
    await db
      .delete(habitCompletions)
      .where(eq(habitCompletions.id, existing.id));
  } else {
    await db.insert(habitCompletions).values({
      id: newId(),
      habitId,
      userId: session.user.id,
      completedOn,
      slot: safeSlot,
    });
  }

  revalidateHabitPaths();
  return { success: true };
}

export async function getReminderHabitCandidate(): Promise<{
  id: string;
  name: string;
} | null> {
  const session = await requireSession();
  const userId = session.user.id;
  const now = new Date();

  const activeHabits = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
    .orderBy(desc(habits.createdAt));

  if (activeHabits.length === 0) return null;

  const habitIds = activeHabits.map((habit) => habit.id);
  const periodKeys = activeHabits.map((habit) =>
    getPeriodKey(habitSchedule(habit), now, habit.createdAt),
  );
  const oldestKey = [...periodKeys].sort()[0];

  const completions = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.userId, userId),
        inArray(habitCompletions.habitId, habitIds),
        gte(habitCompletions.completedOn, oldestKey),
      ),
    );

  const pending = activeHabits.filter((habit) => {
    const schedule = habitSchedule(habit);
    if (!isHabitDueOn(schedule, now, habit.createdAt)) return false;
    const periodKey = getPeriodKey(schedule, now, habit.createdAt);
    const times = Math.max(1, habit.timesPerPeriod);
    const done = completions.filter(
      (c) => c.habitId === habit.id && c.completedOn === periodKey,
    ).length;
    return done < times;
  });

  if (pending.length === 0) return null;

  const pick = pending[Math.floor(Math.random() * pending.length)];
  return { id: pick.id, name: pick.name };
}
