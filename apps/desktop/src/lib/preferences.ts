import { api, ApiError } from "@/lib/api";
import type { UserPreferences } from "@/lib/reminder-constants";

export async function getPreferences(): Promise<UserPreferences> {
  return api<UserPreferences>("/preferences");
}

export async function updateReminderWindow(input: {
  start: number;
  end: number;
}) {
  try {
    await api("/preferences/reminder", {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return { success: true as const };
  } catch (error) {
    return {
      error:
        error instanceof ApiError ? error.message : "Could not update reminders",
    };
  }
}

export async function updateActivityTrackingEnabled(enabled: boolean) {
  try {
    await api("/preferences/activity-tracking", {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
    return { success: true as const, enabled };
  } catch (error) {
    return {
      error:
        error instanceof ApiError ? error.message : "Could not update tracking",
    };
  }
}
