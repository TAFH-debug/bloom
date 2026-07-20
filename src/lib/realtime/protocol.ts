import type {
  GardenInvitationView,
  GardenPersonStatus,
} from "@/lib/garden-types";
import type { ActivitySegmentInput } from "@/lib/activity-types";

/** A member's status, tagged with whose it is, for fan-out to watchers. */
export type StatusUpdate = { memberId: string } & GardenPersonStatus;

/** Messages the server pushes down the socket. */
export type ServerMessage =
  | { type: "hello"; data: { userId: string } }
  | { type: "status"; data: StatusUpdate }
  | { type: "invite-added"; data: GardenInvitationView }
  | { type: "invite-removed"; data: { invitationId: string } }
  | { type: "garden-changed"; data: { reason: string } }
  | {
      type: "preferences";
      data: { activityTrackingEnabled: boolean };
    }
  | { type: "activity-ingested"; data: { inserted: number } };

/** Messages the client sends up the socket. */
export type ClientMessage = {
  type: "activity-ingest";
  data: { segments: ActivitySegmentInput[] };
};

export function decodeServerMessage(raw: string): ServerMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { type?: unknown }).type === "string"
    ) {
      return parsed as ServerMessage;
    }
    return null;
  } catch {
    return null;
  }
}

export function decodeClientMessage(raw: string): ClientMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { type?: unknown }).type !== "activity-ingest"
    ) {
      return null;
    }
    const data = (parsed as { data?: unknown }).data;
    if (!data || typeof data !== "object") return null;
    const segments = (data as { segments?: unknown }).segments;
    if (!Array.isArray(segments)) return null;
    return { type: "activity-ingest", data: { segments: segments as ActivitySegmentInput[] } };
  } catch {
    return null;
  }
}
