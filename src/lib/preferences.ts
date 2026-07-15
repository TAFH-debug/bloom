"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import {
  DEFAULT_REMINDER_WINDOW_END,
  DEFAULT_REMINDER_WINDOW_START,
  REMINDER_INTERVAL_HOURS,
  type UserPreferences,
} from "@/lib/reminder-constants";
import { requireSession } from "@/lib/session";

function clampHour(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(23, Math.max(0, Math.round(value)));
}

export async function getPreferences(): Promise<UserPreferences> {
  const session = await requireSession();
  const row = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, session.user.id),
  });

  return {
    reminderWindowStart:
      row?.reminderWindowStart ?? DEFAULT_REMINDER_WINDOW_START,
    reminderWindowEnd: row?.reminderWindowEnd ?? DEFAULT_REMINDER_WINDOW_END,
    intervalHours: REMINDER_INTERVAL_HOURS,
  };
}

export async function updateReminderWindow(input: {
  start: number;
  end: number;
}) {
  const session = await requireSession();
  const reminderWindowStart = clampHour(input.start);
  const reminderWindowEnd = clampHour(input.end);

  await db
    .insert(userPreferences)
    .values({
      userId: session.user.id,
      reminderWindowStart,
      reminderWindowEnd,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: {
        reminderWindowStart,
        reminderWindowEnd,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/settings");
  return { success: true as const };
}
