import type { ActivitySegmentInput } from "@/lib/activity-types";
import { isTauri } from "@/lib/tauri";

export type DesktopActivityCurrent = {
  idle: boolean;
  processName?: string | null;
  appName?: string | null;
  exePath?: string | null;
};

export type DesktopActivityStatus = {
  supported: boolean;
  enabled: boolean;
  pendingCount: number;
  current?: DesktopActivityCurrent | null;
};

type RawSegment = {
  id: string;
  startedAt: string;
  endedAt: string;
  kind: string;
  processName?: string | null;
  appName?: string | null;
  exePath?: string | null;
};

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(cmd, args);
}

/** Status line: process name + app/window name (no exe path). */
export function desktopAppLabel(current: DesktopActivityCurrent): string {
  const process =
    current.processName?.trim().replace(/\.exe$/i, "") || null;
  const app = current.appName?.trim() || null;

  if (process && app) {
    if (process.toLowerCase() === app.toLowerCase()) return process;
    return `${process} · ${app}`;
  }
  return process || app || "App";
}

export async function getDesktopActivityStatus(): Promise<DesktopActivityStatus | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<DesktopActivityStatus>("activity_status");
  } catch {
    return null;
  }
}

export async function setDesktopActivityEnabled(enabled: boolean) {
  if (!isTauri()) return;
  try {
    await invoke("activity_set_enabled", { enabled });
  } catch {
    // unsupported platform / ACL
  }
}

export async function takeDesktopActivitySegments(): Promise<
  ActivitySegmentInput[]
> {
  if (!isTauri()) return [];
  try {
    const raw = await invoke<RawSegment[]>("activity_take_segments");
    return (raw ?? []).map((segment) => ({
      id: segment.id,
      startedAt: segment.startedAt,
      endedAt: segment.endedAt,
      kind: segment.kind === "idle" ? "idle" : "app",
      processName: segment.processName ?? null,
      appName: segment.appName ?? null,
      exePath: segment.exePath ?? null,
    }));
  } catch {
    return [];
  }
}
