"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { user } from "@/db/schema";
import { publishStatusUpdate } from "@/lib/realtime/publish";
import { requireSession } from "@/lib/session";
import {
  isStatusPreset,
  STATUS_NOTE_MAX,
  type MyStatus,
} from "@/lib/status-types";

export async function getMyStatus(): Promise<MyStatus> {
  const session = await requireSession();
  const row = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
    columns: {
      statusPreset: true,
      statusNote: true,
      statusUpdatedAt: true,
    },
  });

  const preset =
    row?.statusPreset && isStatusPreset(row.statusPreset)
      ? row.statusPreset
      : null;

  return {
    statusPreset: preset,
    statusNote: row?.statusNote ?? null,
    statusUpdatedAt: row?.statusUpdatedAt ?? null,
  };
}

export async function setMyStatus(input: {
  preset: string | null;
  note?: string | null;
}) {
  const session = await requireSession();

  let statusPreset: string | null = null;
  if (input.preset && input.preset !== "offline") {
    if (!isStatusPreset(input.preset)) {
      return { error: "Invalid status" };
    }
    statusPreset = input.preset;
  }

  const note = (input.note ?? "").trim().slice(0, STATUS_NOTE_MAX);
  const statusNote = statusPreset && note ? note : null;
  const statusUpdatedAt = new Date();

  await db
    .update(user)
    .set({
      statusPreset,
      statusNote,
      statusUpdatedAt,
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  await publishStatusUpdate(session.user.id, {
    statusPreset,
    statusNote,
    statusUpdatedAt: statusUpdatedAt.toISOString(),
  });

  revalidatePath("/");
  revalidatePath("/garden");
  revalidatePath("/habits");
  revalidatePath("/settings");
  return { success: true as const };
}
