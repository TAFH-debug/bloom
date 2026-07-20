"use server";

import { and, asc, eq, gte, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { activitySegments } from "@/db/schema";
import { ingestActivitySegmentsForUser } from "@/lib/activity-ingest";
import type {
  ActivityDashboard,
  ActivityKind,
  ActivitySegmentInput,
  AppBreakdownRow,
  ActivityTimelineBlock,
} from "@/lib/activity-types";
import { toDateKey } from "@/lib/consistency";
import { getPreferences } from "@/lib/preferences";
import { requireSession } from "@/lib/session";

function dayBounds(day: string) {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function asKind(value: string): ActivityKind {
  return value === "idle" ? "idle" : "app";
}

/** HTTP fallback; desktop path prefers the WebSocket ingest. */
export async function ingestActivitySegments(segments: ActivitySegmentInput[]) {
  const session = await requireSession();
  const { inserted, updated } = await ingestActivitySegmentsForUser(
    session.user.id,
    segments,
  );
  if (inserted + updated > 0) revalidatePath("/focus");
  return { success: true as const, inserted, updated };
}

export async function getActivityDashboard(
  day: string = toDateKey(),
): Promise<ActivityDashboard> {
  const session = await requireSession();
  const prefs = await getPreferences();
  const { start, end } = dayBounds(day);

  const rows = await db
    .select()
    .from(activitySegments)
    .where(
      and(
        eq(activitySegments.userId, session.user.id),
        gte(activitySegments.startedAt, start),
        lt(activitySegments.startedAt, end),
      ),
    )
    .orderBy(asc(activitySegments.startedAt));

  let activeMs = 0;
  let idleMs = 0;
  const appMap = new Map<string, AppBreakdownRow>();
  const timeline: ActivityTimelineBlock[] = [];

  for (const row of rows) {
    const durationMs = Math.max(
      0,
      row.endedAt.getTime() - row.startedAt.getTime(),
    );
    const kind = asKind(row.kind);
    if (kind === "idle") {
      idleMs += durationMs;
    } else {
      activeMs += durationMs;
      const key = row.exePath || row.processName || row.appName || "Unknown";
      const existing = appMap.get(key);
      if (existing) {
        existing.durationMs += durationMs;
      } else {
        appMap.set(key, {
          key,
          processName: row.processName,
          appName: row.appName,
          exePath: row.exePath,
          durationMs,
        });
      }
    }

    timeline.push({
      id: row.id,
      kind,
      startedAt: row.startedAt.toISOString(),
      endedAt: row.endedAt.toISOString(),
      durationMs,
      processName: row.processName,
      appName: row.appName,
    });
  }

  const apps = [...appMap.values()].sort(
    (a, b) => b.durationMs - a.durationMs,
  );

  return {
    day,
    activeMs,
    idleMs,
    apps,
    timeline,
    trackingEnabled: prefs.activityTrackingEnabled,
  };
}
