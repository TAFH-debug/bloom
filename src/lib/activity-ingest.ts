import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activitySegments, userPreferences } from "@/db/schema";
import type {
  ActivityKind,
  ActivitySegmentInput,
} from "@/lib/activity-types";

function newId() {
  return crypto.randomUUID();
}

function asKind(value: string): ActivityKind {
  return value === "idle" ? "idle" : "app";
}

function parseIso(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function segmentKey(row: {
  kind: string;
  processName?: string | null;
  exePath?: string | null;
}) {
  if (row.kind === "idle") return "idle";
  return `${row.exePath ?? ""}|${row.processName ?? ""}`;
}

/** Merge contiguous same-app / idle slices so we don't persist tiny fragments. */
export function coalesceSegments(
  segments: ActivitySegmentInput[],
): ActivitySegmentInput[] {
  const sorted = [...segments].sort(
    (a, b) =>
      new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );
  const merged: ActivitySegmentInput[] = [];

  for (const segment of sorted) {
    const startedAt = parseIso(segment.startedAt);
    const endedAt = parseIso(segment.endedAt);
    if (!startedAt || !endedAt || endedAt <= startedAt) continue;

    const kind = asKind(segment.kind);
    const next: ActivitySegmentInput = {
      id: segment.id?.trim() || newId(),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      kind,
      processName: kind === "app" ? (segment.processName ?? null) : null,
      appName: kind === "app" ? (segment.appName ?? null) : null,
      exePath: kind === "app" ? (segment.exePath ?? null) : null,
    };

    const prev = merged[merged.length - 1];
    if (
      prev &&
      segmentKey(prev) === segmentKey(next) &&
      new Date(next.startedAt).getTime() - new Date(prev.endedAt).getTime() <=
        5_000
    ) {
      prev.endedAt =
        new Date(next.endedAt) > new Date(prev.endedAt)
          ? next.endedAt
          : prev.endedAt;
      if (!prev.appName && next.appName) prev.appName = next.appName;
      continue;
    }

    merged.push(next);
  }

  return merged;
}

export async function getActivityTrackingEnabled(
  userId: string,
): Promise<boolean> {
  const row = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
    columns: { activityTrackingEnabled: true },
  });
  return row?.activityTrackingEnabled ?? false;
}

/**
 * Persist coalesced segments for a user. Extends the latest matching row
 * when the new slice continues the same app/idle streak.
 */
export async function ingestActivitySegmentsForUser(
  userId: string,
  segments: ActivitySegmentInput[],
) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  const coalesced = coalesceSegments(segments.slice(0, 200));
  if (coalesced.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  const latest = await db
    .select()
    .from(activitySegments)
    .where(eq(activitySegments.userId, userId))
    .orderBy(desc(activitySegments.endedAt))
    .limit(1);

  const rows = [];
  let updated = 0;
  let cursor = latest[0] ?? null;

  for (const segment of coalesced) {
    const startedAt = parseIso(segment.startedAt)!;
    const endedAt = parseIso(segment.endedAt)!;
    const kind = asKind(segment.kind);
    const segmentId = segment.id?.trim() || newId();

    // Same open-session id → always extend (live flush snapshots).
    if (cursor && cursor.id === segmentId) {
      if (endedAt > cursor.endedAt) {
        await db
          .update(activitySegments)
          .set({
            endedAt,
            appName:
              kind === "app"
                ? (segment.appName ?? cursor.appName)
                : cursor.appName,
          })
          .where(eq(activitySegments.id, cursor.id));
        cursor = {
          ...cursor,
          endedAt,
          appName: segment.appName ?? cursor.appName,
        };
        updated += 1;
      }
      continue;
    }

    if (
      cursor &&
      segmentKey(cursor) ===
        segmentKey({
          kind,
          processName: segment.processName,
          exePath: segment.exePath,
        }) &&
      startedAt.getTime() - cursor.endedAt.getTime() <= 5_000
    ) {
      if (endedAt > cursor.endedAt) {
        await db
          .update(activitySegments)
          .set({
            endedAt,
            appName:
              kind === "app"
                ? (segment.appName ?? cursor.appName)
                : cursor.appName,
          })
          .where(eq(activitySegments.id, cursor.id));
        cursor = {
          ...cursor,
          endedAt,
          appName: segment.appName ?? cursor.appName,
        };
        updated += 1;
      }
      continue;
    }

    const row = {
      id: segmentId,
      userId,
      startedAt,
      endedAt,
      kind,
      processName:
        kind === "app" ? (segment.processName?.slice(0, 256) ?? null) : null,
      appName: kind === "app" ? (segment.appName?.slice(0, 512) ?? null) : null,
      exePath: kind === "app" ? (segment.exePath?.slice(0, 1024) ?? null) : null,
    };
    rows.push(row);
    cursor = {
      ...row,
      createdAt: new Date(),
    };
  }

  if (rows.length > 0) {
    for (const row of rows) {
      await db
        .insert(activitySegments)
        .values(row)
        .onConflictDoUpdate({
          target: activitySegments.id,
          set: {
            endedAt: row.endedAt,
            appName: row.appName,
          },
        });
    }
  }

  return { inserted: rows.length, updated };
}
