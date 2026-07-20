import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gardenMembers } from "@/db/schema";
import type {
  GardenInvitationView,
  GardenPersonStatus,
} from "@/lib/garden-types";
import { getRealtimeHub } from "@/lib/realtime/hub";

/**
 * Users who should hear about `memberId`'s changes: the member themselves plus
 * every garden owner who has them as a guest.
 */
async function watchersOf(memberId: string): Promise<string[]> {
  const rows = await db
    .select({ ownerId: gardenMembers.ownerId })
    .from(gardenMembers)
    .where(eq(gardenMembers.memberId, memberId));
  return [memberId, ...rows.map((row) => row.ownerId)];
}

export async function publishStatusUpdate(
  memberId: string,
  status: GardenPersonStatus,
) {
  getRealtimeHub().publishAll(await watchersOf(memberId), {
    type: "status",
    data: { memberId, ...status },
  });
}

export function publishInviteAdded(
  toUserId: string,
  invite: GardenInvitationView,
) {
  getRealtimeHub().publish(toUserId, { type: "invite-added", data: invite });
}

export function publishInviteRemoved(userIds: string[], invitationId: string) {
  getRealtimeHub().publishAll(userIds, {
    type: "invite-removed",
    data: { invitationId },
  });
}

export function publishGardenChanged(userIds: string[], reason: string) {
  getRealtimeHub().publishAll(userIds, {
    type: "garden-changed",
    data: { reason },
  });
}

export function publishPreferences(
  userId: string,
  data: { activityTrackingEnabled: boolean },
) {
  getRealtimeHub().publish(userId, { type: "preferences", data });
}
