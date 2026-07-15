import {
  isWithinReminderWindow,
  LAST_REMINDER_STORAGE_KEY,
  REMINDER_INTERVAL_MS,
} from "@/lib/reminder-constants";

export function readLastReminderAt(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LAST_REMINDER_STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function writeLastReminderAt(timestamp: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_REMINDER_STORAGE_KEY, String(timestamp));
}

export function shouldFireReminder(now: Date, lastFiredAt: number | null) {
  if (lastFiredAt == null) return true;
  return now.getTime() - lastFiredAt >= REMINDER_INTERVAL_MS;
}

export function canRemindNow(
  now: Date,
  windowStart: number,
  windowEnd: number,
  lastFiredAt: number | null,
) {
  if (!isWithinReminderWindow(now.getHours(), windowStart, windowEnd)) {
    return false;
  }
  return shouldFireReminder(now, lastFiredAt);
}
