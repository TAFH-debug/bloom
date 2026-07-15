"use server";

import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { gardenInvitations, gardenMembers, user } from "@/db/schema";
import { GARDEN_CAPACITY, type GardenPersonStatus } from "@/lib/garden-types";
import type { GardenInvitationView } from "@/lib/garden-types";
import { getUserProgress } from "@/lib/progress";
import {
  publishGardenChanged,
  publishInviteIncoming,
  publishInviteRemoved,
} from "@/lib/realtime-publish";
import { requireSession } from "@/lib/session";

function newId() {
  return crypto.randomUUID();
}

const MAX_GUESTS = GARDEN_CAPACITY - 1;

function revalidateGarden() {
  revalidatePath("/garden");
  revalidatePath("/");
  revalidatePath("/habits");
}

function statusFromUser(row: {
  statusPreset: string | null;
  statusNote: string | null;
  statusUpdatedAt: Date | null;
}): GardenPersonStatus {
  return {
    statusPreset: row.statusPreset,
    statusNote: row.statusNote,
    statusUpdatedAt: row.statusUpdatedAt
      ? row.statusUpdatedAt.toISOString()
      : null,
  };
}

async function guestCountFor(ownerId: string) {
  const [{ value }] = await db
    .select({ value: count() })
    .from(gardenMembers)
    .where(eq(gardenMembers.ownerId, ownerId));
  return value;
}

async function ensureMembership(ownerId: string, memberId: string) {
  const existing = await db.query.gardenMembers.findFirst({
    where: and(
      eq(gardenMembers.ownerId, ownerId),
      eq(gardenMembers.memberId, memberId),
    ),
  });
  if (existing) return;
  await db.insert(gardenMembers).values({
    id: newId(),
    ownerId,
    memberId,
  });
}

export async function getGardenDashboard() {
  const session = await requireSession();
  const ownerId = session.user.id;

  const selfRow = await db.query.user.findFirst({
    where: eq(user.id, ownerId),
    columns: {
      statusPreset: true,
      statusNote: true,
      statusUpdatedAt: true,
    },
  });

  const selfProgress = await getUserProgress(ownerId);
  const self = {
    id: `self-${ownerId}`,
    memberId: ownerId,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
    isSelf: true,
    ...selfProgress,
    ...statusFromUser({
      statusPreset: selfRow?.statusPreset ?? null,
      statusNote: selfRow?.statusNote ?? null,
      statusUpdatedAt: selfRow?.statusUpdatedAt ?? null,
    }),
  };

  const rows = await db
    .select({
      id: gardenMembers.id,
      memberId: gardenMembers.memberId,
      createdAt: gardenMembers.createdAt,
      name: user.name,
      email: user.email,
      image: user.image,
      statusPreset: user.statusPreset,
      statusNote: user.statusNote,
      statusUpdatedAt: user.statusUpdatedAt,
    })
    .from(gardenMembers)
    .innerJoin(user, eq(gardenMembers.memberId, user.id))
    .where(eq(gardenMembers.ownerId, ownerId))
    .orderBy(desc(gardenMembers.createdAt))
    .limit(MAX_GUESTS);

  const guests = await Promise.all(
    rows.map(async (row) => {
      const progress = await getUserProgress(row.memberId);
      return {
        id: row.id,
        memberId: row.memberId,
        name: row.name,
        email: row.email,
        image: row.image,
        isSelf: false,
        ...progress,
        ...statusFromUser(row),
      };
    }),
  );

  const [incoming, outgoing] = await Promise.all([
    getIncomingInvitations(),
    getOutgoingInvitations(),
  ]);

  return {
    people: [self, ...guests],
    guestCount: guests.length,
    maxGuests: MAX_GUESTS,
    capacity: GARDEN_CAPACITY,
    incomingInvites: incoming,
    outgoingInvites: outgoing,
  };
}

export async function getGardenStatuses(): Promise<
  Array<{ memberId: string } & GardenPersonStatus>
> {
  const session = await requireSession();
  const ownerId = session.user.id;

  const memberships = await db
    .select({ memberId: gardenMembers.memberId })
    .from(gardenMembers)
    .where(eq(gardenMembers.ownerId, ownerId))
    .limit(MAX_GUESTS);

  const ids = [ownerId, ...memberships.map((m) => m.memberId)];

  const rows = await db
    .select({
      id: user.id,
      statusPreset: user.statusPreset,
      statusNote: user.statusNote,
      statusUpdatedAt: user.statusUpdatedAt,
    })
    .from(user)
    .where(inArray(user.id, ids));

  return rows.map((row) => ({
    memberId: row.id,
    ...statusFromUser(row),
  }));
}

export async function getIncomingInvitations(): Promise<GardenInvitationView[]> {
  const session = await requireSession();
  const rows = await db
    .select({
      id: gardenInvitations.id,
      fromUserId: gardenInvitations.fromUserId,
      toUserId: gardenInvitations.toUserId,
      createdAt: gardenInvitations.createdAt,
      fromName: user.name,
      fromEmail: user.email,
    })
    .from(gardenInvitations)
    .innerJoin(user, eq(gardenInvitations.fromUserId, user.id))
    .where(
      and(
        eq(gardenInvitations.toUserId, session.user.id),
        eq(gardenInvitations.status, "pending"),
      ),
    )
    .orderBy(desc(gardenInvitations.createdAt));

  return rows.map((row) => ({
    id: row.id,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    toName: session.user.name,
    toEmail: session.user.email,
    createdAt: row.createdAt.toISOString(),
    direction: "incoming" as const,
  }));
}

export async function getOutgoingInvitations(): Promise<GardenInvitationView[]> {
  const session = await requireSession();
  const rows = await db
    .select({
      id: gardenInvitations.id,
      fromUserId: gardenInvitations.fromUserId,
      toUserId: gardenInvitations.toUserId,
      createdAt: gardenInvitations.createdAt,
      toName: user.name,
      toEmail: user.email,
    })
    .from(gardenInvitations)
    .innerJoin(user, eq(gardenInvitations.toUserId, user.id))
    .where(
      and(
        eq(gardenInvitations.fromUserId, session.user.id),
        eq(gardenInvitations.status, "pending"),
      ),
    )
    .orderBy(desc(gardenInvitations.createdAt));

  return rows.map((row) => ({
    id: row.id,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    fromName: session.user.name,
    fromEmail: session.user.email,
    toName: row.toName,
    toEmail: row.toEmail,
    createdAt: row.createdAt.toISOString(),
    direction: "outgoing" as const,
  }));
}

export async function getPendingInviteCount() {
  const session = await requireSession();
  const [{ value }] = await db
    .select({ value: count() })
    .from(gardenInvitations)
    .where(
      and(
        eq(gardenInvitations.toUserId, session.user.id),
        eq(gardenInvitations.status, "pending"),
      ),
    );
  return value;
}

/** Send a garden invitation (does not add membership until accepted). */
export async function inviteGardenMember(email: string) {
  const session = await requireSession();
  const trimmed = email.trim().toLowerCase();

  if (!trimmed || !trimmed.includes("@")) {
    return { error: "Enter a valid email" };
  }

  if (trimmed === session.user.email.toLowerCase()) {
    return { error: "You are already growing in your own garden" };
  }

  const myGuests = await guestCountFor(session.user.id);
  if (myGuests >= MAX_GUESTS) {
    return {
      error: `Garden is full (${GARDEN_CAPACITY} people including you)`,
    };
  }

  const found = await db.query.user.findFirst({
    where: sql`lower(${user.email}) = ${trimmed}`,
  });

  if (!found) {
    return { error: "No Bloom account with that email yet" };
  }

  const alreadyMember = await db.query.gardenMembers.findFirst({
    where: and(
      eq(gardenMembers.ownerId, session.user.id),
      eq(gardenMembers.memberId, found.id),
    ),
  });

  if (alreadyMember) {
    return { error: "They are already in your garden" };
  }

  const existingInvite = await db.query.gardenInvitations.findFirst({
    where: and(
      eq(gardenInvitations.fromUserId, session.user.id),
      eq(gardenInvitations.toUserId, found.id),
    ),
  });

  if (existingInvite?.status === "pending") {
    return { error: "Invitation already sent" };
  }

  const reversePending = await db.query.gardenInvitations.findFirst({
    where: and(
      eq(gardenInvitations.fromUserId, found.id),
      eq(gardenInvitations.toUserId, session.user.id),
      eq(gardenInvitations.status, "pending"),
    ),
  });

  if (reversePending) {
    return { error: "They already invited you — check your invitations" };
  }

  const invitationId = existingInvite?.id ?? newId();

  if (existingInvite) {
    await db
      .update(gardenInvitations)
      .set({
        status: "pending",
        createdAt: new Date(),
        respondedAt: null,
      })
      .where(eq(gardenInvitations.id, existingInvite.id));
  } else {
    await db.insert(gardenInvitations).values({
      id: invitationId,
      fromUserId: session.user.id,
      toUserId: found.id,
      status: "pending",
    });
  }

  publishInviteIncoming(found.id, {
    id: invitationId,
    fromUserId: session.user.id,
    toUserId: found.id,
    fromName: session.user.name,
    fromEmail: session.user.email,
    toName: found.name,
    toEmail: found.email,
    createdAt: new Date().toISOString(),
    direction: "incoming",
  });

  revalidateGarden();
  return { success: true as const, invitedName: found.name };
}

/** @deprecated use inviteGardenMember */
export async function addGardenMember(email: string) {
  return inviteGardenMember(email);
}

export async function acceptGardenInvitation(invitationId: string) {
  const session = await requireSession();

  const invite = await db.query.gardenInvitations.findFirst({
    where: and(
      eq(gardenInvitations.id, invitationId),
      eq(gardenInvitations.toUserId, session.user.id),
      eq(gardenInvitations.status, "pending"),
    ),
  });

  if (!invite) {
    return { error: "Invitation not found" };
  }

  const fromId = invite.fromUserId;
  const toId = invite.toUserId;

  const [fromGuests, toGuests] = await Promise.all([
    guestCountFor(fromId),
    guestCountFor(toId),
  ]);

  if (fromGuests >= MAX_GUESTS) {
    return { error: "Their garden is full" };
  }
  if (toGuests >= MAX_GUESTS) {
    return {
      error: `Your garden is full (${GARDEN_CAPACITY} people including you)`,
    };
  }

  await ensureMembership(fromId, toId);
  await ensureMembership(toId, fromId);

  await db
    .update(gardenInvitations)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(gardenInvitations.id, invitationId));

  // Clear any reverse pending invite between the same pair
  await db
    .delete(gardenInvitations)
    .where(
      and(
        eq(gardenInvitations.status, "pending"),
        or(
          and(
            eq(gardenInvitations.fromUserId, fromId),
            eq(gardenInvitations.toUserId, toId),
          ),
          and(
            eq(gardenInvitations.fromUserId, toId),
            eq(gardenInvitations.toUserId, fromId),
          ),
        ),
      ),
    );

  publishInviteRemoved([fromId, toId], invitationId);
  publishGardenChanged([fromId, toId], "invite-accepted");

  revalidateGarden();
  return { success: true as const };
}

export async function declineGardenInvitation(invitationId: string) {
  const session = await requireSession();

  const invite = await db.query.gardenInvitations.findFirst({
    where: and(
      eq(gardenInvitations.id, invitationId),
      eq(gardenInvitations.toUserId, session.user.id),
      eq(gardenInvitations.status, "pending"),
    ),
  });

  if (!invite) {
    return { error: "Invitation not found" };
  }

  await db
    .update(gardenInvitations)
    .set({ status: "declined", respondedAt: new Date() })
    .where(eq(gardenInvitations.id, invitationId));

  publishInviteRemoved(
    [session.user.id, invite.fromUserId],
    invitationId,
  );
  publishGardenChanged([invite.fromUserId], "invite-declined");

  revalidateGarden();
  return { success: true as const };
}

export async function cancelGardenInvitation(invitationId: string) {
  const session = await requireSession();

  const invite = await db.query.gardenInvitations.findFirst({
    where: and(
      eq(gardenInvitations.id, invitationId),
      eq(gardenInvitations.fromUserId, session.user.id),
      eq(gardenInvitations.status, "pending"),
    ),
  });

  if (!invite) {
    return { error: "Invitation not found" };
  }

  await db
    .delete(gardenInvitations)
    .where(eq(gardenInvitations.id, invitationId));

  publishInviteRemoved([session.user.id, invite.toUserId], invitationId);

  revalidateGarden();
  return { success: true as const };
}

export async function removeGardenMember(memberRowId: string) {
  const session = await requireSession();

  const row = await db.query.gardenMembers.findFirst({
    where: and(
      eq(gardenMembers.id, memberRowId),
      eq(gardenMembers.ownerId, session.user.id),
    ),
  });

  if (!row) {
    return { error: "Member not found" };
  }

  // Mutual remove — drop both directions
  await db
    .delete(gardenMembers)
    .where(
      or(
        and(
          eq(gardenMembers.ownerId, session.user.id),
          eq(gardenMembers.memberId, row.memberId),
        ),
        and(
          eq(gardenMembers.ownerId, row.memberId),
          eq(gardenMembers.memberId, session.user.id),
        ),
      ),
    );

  publishGardenChanged(
    [session.user.id, row.memberId],
    "member-removed",
  );

  revalidateGarden();
  return { success: true as const };
}
