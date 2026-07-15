import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { gardenMembers } from "@/db/schema";
import { getRealtimeHub } from "@/lib/realtime-hub";
import type { RealtimeMessage } from "@/lib/realtime-protocol";
import type { GardenInvitationView, GardenPersonStatus } from "@/lib/garden-types";

export async function publishStatusUpdate(
  memberId: string,
  status: GardenPersonStatus,
) {
  const watchers = await db
    .select({ ownerId: gardenMembers.ownerId })
    .from(gardenMembers)
    .where(eq(gardenMembers.memberId, memberId));

  const targets = [memberId, ...watchers.map((row) => row.ownerId)];
  getRealtimeHub().sendToMany(targets, {
    type: "status",
    payload: { memberId, ...status },
  });
}

export function publishInviteIncoming(
  toUserId: string,
  invite: GardenInvitationView,
) {
  getRealtimeHub().sendTo(toUserId, {
    type: "invite:incoming",
    payload: invite,
  });
}

export function publishInviteRemoved(userIds: string[], invitationId: string) {
  getRealtimeHub().sendToMany(userIds, {
    type: "invite:removed",
    payload: { invitationId },
  });
}

export function publishGardenChanged(userIds: string[], reason: string) {
  const message: RealtimeMessage = {
    type: "garden:changed",
    payload: { reason },
  };
  getRealtimeHub().sendToMany(userIds, message);
}
