"use client";

import { useEffect, useRef } from "react";
import { sendDesktopNotification } from "@/lib/desktop-notification";
import { getReminderHabitCandidate } from "@/lib/habits";
import { getPreferences } from "@/lib/preferences";
import {
  canRemindNow,
  readLastReminderAt,
  writeLastReminderAt,
} from "@/lib/reminder-scheduler";
import { isTauri } from "@/lib/tauri";

const CHECK_EVERY_MS = 60_000;

export function HabitReminders() {
  const running = useRef(false);

  useEffect(() => {
    if (!isTauri()) return;

    let cancelled = false;

    async function tick() {
      if (cancelled || running.current) return;
      running.current = true;
      try {
        const prefs = await getPreferences();
        const now = new Date();
        const last = readLastReminderAt();
        if (
          !canRemindNow(
            now,
            prefs.reminderWindowStart,
            prefs.reminderWindowEnd,
            last,
          )
        ) {
          return;
        }

        const candidate = await getReminderHabitCandidate();
        if (!candidate) return;

        const sent = await sendDesktopNotification({
          title: "Bloom",
          body: `Did you do “${candidate.name}”?`,
        });
        if (sent) writeLastReminderAt(now.getTime());
      } catch {
        // Swallow — reminders are best-effort
      } finally {
        running.current = false;
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), CHECK_EVERY_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return null;
}
