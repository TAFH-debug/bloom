import type { DayScore } from "@/lib/consistency";

export const GARDEN_CAPACITY = 5;

export type GardenHabitStat = {
  id: string;
  name: string;
  completedToday: boolean;
  completedSlots: number;
  timesPerPeriod: number;
  weekDone: number;
  windowRate: number;
};

export type GardenPersonStatus = {
  statusPreset: string | null;
  statusNote: string | null;
  statusUpdatedAt: string | null;
};

export type GardenPerson = {
  id: string;
  memberId: string;
  name: string;
  email: string;
  image: string | null;
  isSelf: boolean;
  habitCount: number;
  completedToday: number;
  consistency: number;
  streak: number;
  days: DayScore[];
  habits: GardenHabitStat[];
} & GardenPersonStatus;

export type GardenInvitationView = {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  createdAt: string;
  direction: "incoming" | "outgoing";
};
