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
import { requireSession } from "@/lib/session";

function newId() {
  return crypto.randomUUID();
}

export async function getHabitsDashboard() {
  const session = await requireSession();
  const userId = session.user.id;
  const windowStart = dateKeysForWindow(CONSISTENCY_WINDOW_DAYS)[0];
  const weekStart = dateKeysForWindow(7)[0];

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

  const weekCompletions = completions.filter(
    (completion) => completion.completedOn >= weekStart,
  );

  const today = toDateKey();
  const completedToday = new Set(
    completions
      .filter((completion) => completion.completedOn === today)
      .map((completion) => completion.habitId),
  );

  const consistency = computeConsistencyScore({
    activeHabitIds: habitIds,
    completions,
  });

  const streak = computeStreak({
    activeHabitIds: habitIds,
    completions,
  });

  const weekKeys = dateKeysForWindow(7);

  return {
    habits: activeHabits.map((habit) => ({
      ...habit,
      completedToday: completedToday.has(habit.id),
      week: weekKeys.map((day) =>
        weekCompletions.some(
          (completion) =>
            completion.habitId === habit.id && completion.completedOn === day,
        ),
      ),
    })),
    weekKeys,
    consistency,
    streak,
    today,
  };
}

export async function createHabit(name: string) {
  const session = await requireSession();
  const trimmed = name.trim();
  if (!trimmed) {
    return { error: "Name is required" };
  }

  await db.insert(habits).values({
    id: newId(),
    userId: session.user.id,
    name: trimmed,
  });

  revalidatePath("/");
  revalidatePath("/habits");
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

  revalidatePath("/");
  revalidatePath("/habits");
  return { success: true };
}

export async function archiveHabit(habitId: string) {
  const session = await requireSession();

  await db
    .update(habits)
    .set({ archivedAt: new Date() })
    .where(and(eq(habits.id, habitId), eq(habits.userId, session.user.id)));

  revalidatePath("/");
  revalidatePath("/habits");
  return { success: true };
}

export async function toggleHabitCompletion(habitId: string, dateKey?: string) {
  const session = await requireSession();
  const completedOn = dateKey ?? toDateKey();

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

  const existing = await db.query.habitCompletions.findFirst({
    where: and(
      eq(habitCompletions.habitId, habitId),
      eq(habitCompletions.completedOn, completedOn),
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
    });
  }

  revalidatePath("/");
  revalidatePath("/habits");
  return { success: true };
}
