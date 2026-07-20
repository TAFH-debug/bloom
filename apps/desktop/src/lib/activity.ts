import { api } from "@/lib/api";
import type {
  ActivityDashboard,
  ActivitySegmentInput,
} from "@/lib/activity-types";

export async function ingestActivitySegments(segments: ActivitySegmentInput[]) {
  return api<{ inserted: number; updated: number }>("/activity/ingest", {
    method: "POST",
    body: JSON.stringify({ segments }),
  });
}

export async function getActivityDashboard(
  day?: string,
): Promise<ActivityDashboard> {
  const qs = day ? `?day=${encodeURIComponent(day)}` : "";
  return api<ActivityDashboard>(`/activity/dashboard${qs}`);
}
