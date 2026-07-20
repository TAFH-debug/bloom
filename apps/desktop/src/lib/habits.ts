import { api } from "@/lib/api";

export async function getHabitsDashboard() {
  return api<Record<string, unknown>>("/habits/dashboard");
}

export async function createHabit(input: {
  name: string;
  frequency?: string;
  timesPerPeriod?: number;
  customEveryDays?: number | null;
}) {
  return api("/habits", { method: "POST", body: JSON.stringify(input) });
}

export async function renameHabit(id: string, name: string) {
  return api(`/habits/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function updateHabitSchedule(
  id: string,
  input: {
    frequency: string;
    timesPerPeriod: number;
    customEveryDays?: number | null;
  },
) {
  return api(`/habits/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function archiveHabit(id: string) {
  return api(`/habits/${id}/archive`, { method: "POST" });
}

export async function toggleHabitCompletion(
  habitId: string,
  input?: number | { completedOn?: string; slot?: number },
) {
  const body =
    typeof input === "number" ? { slot: input } : (input ?? {});
  return api(`/habits/${habitId}/toggle`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getReminderHabitCandidate() {
  return api<{ name: string } | null>("/habits/reminder-candidate");
}
