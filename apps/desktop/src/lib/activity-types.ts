export type ActivityKind = "app" | "idle";

export type ActivitySegmentInput = {
  id: string;
  startedAt: string;
  endedAt: string;
  kind: ActivityKind;
  processName?: string | null;
  appName?: string | null;
  exePath?: string | null;
};

export type AppBreakdownRow = {
  key: string;
  processName: string | null;
  appName: string | null;
  exePath: string | null;
  durationMs: number;
};

export type ActivityTimelineBlock = {
  id: string;
  kind: ActivityKind;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  processName: string | null;
  appName: string | null;
};

export type ActivityDashboard = {
  day: string;
  activeMs: number;
  idleMs: number;
  apps: AppBreakdownRow[];
  timeline: ActivityTimelineBlock[];
  trackingEnabled: boolean;
};
