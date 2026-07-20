export const DEFAULT_REMINDER_WINDOW_START = 9;
export const DEFAULT_REMINDER_WINDOW_END = 0;
export const REMINDER_INTERVAL_HOURS = 4;
export const REMINDER_INTERVAL_MS = REMINDER_INTERVAL_HOURS * 60 * 60 * 1000;
export const LAST_REMINDER_STORAGE_KEY = "bloom:last-habit-reminder";

export type UserPreferences = {
  reminderWindowStart: number;
  reminderWindowEnd: number;
  intervalHours: number;
  activityTrackingEnabled: boolean;
};

/** Whether local hour is inside [start, end) with end=0 meaning through end of day. */
export function isWithinReminderWindow(
  hour: number,
  start: number,
  end: number,
) {
  const h = ((hour % 24) + 24) % 24;
  const s = ((start % 24) + 24) % 24;
  const e = ((end % 24) + 24) % 24;

  if (s === e) {
    // Full day when start === end
    return true;
  }

  if (s < e) {
    // e.g. 9 → 17
    return h >= s && h < e;
  }

  // Crosses midnight, e.g. 9 → 0 means 9..23
  return h >= s || h < e;
}
