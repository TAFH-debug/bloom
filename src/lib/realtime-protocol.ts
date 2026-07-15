import type { GardenInvitationView, GardenPersonStatus } from "@/lib/garden-types";

export type StatusRealtimePayload = {
  memberId: string;
} & GardenPersonStatus;

export type RealtimeMessage =
  | { type: "status"; payload: StatusRealtimePayload }
  | { type: "invite:incoming"; payload: GardenInvitationView }
  | { type: "invite:removed"; payload: { invitationId: string } }
  | { type: "garden:changed"; payload: { reason: string } };

export function parseRealtimeMessage(raw: string): RealtimeMessage | null {
  try {
    const data = JSON.parse(raw) as RealtimeMessage;
    if (!data || typeof data !== "object" || !("type" in data)) return null;
    return data;
  } catch {
    return null;
  }
}
