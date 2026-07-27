import { api } from "@/lib/api";
import type { ActivityDashboard } from "@/lib/activity-types";
import type { DayScore } from "@/lib/consistency";

export type CalendarHabitDay = {
  id: string;
  name: string;
  frequency: string;
  timesPerPeriod: number;
  due: boolean;
  periodKey: string;
  slots: boolean[];
  completedSlots: number;
};

export type CalendarDayDigest = {
  day: string;
  habitScore: number | null;
  habits: CalendarHabitDay[];
  days: DayScore[];
  focus: ActivityDashboard;
};

export async function getCalendarDay(day: string) {
  return api<CalendarDayDigest>(
    `/calendar/day?day=${encodeURIComponent(day)}`,
  );
}
