export const STATUS_PRESETS = [
  "focusing",
  "working",
  "reading",
  "exercising",
  "resting",
  "away",
  "offline",
] as const;

export type StatusPreset = (typeof STATUS_PRESETS)[number];

export const STATUS_LABELS: Record<StatusPreset, string> = {
  focusing: "Focusing",
  working: "Working",
  reading: "Reading",
  exercising: "Exercising",
  resting: "Resting",
  away: "Away",
  offline: "Offline",
};

export const STATUS_NOTE_MAX = 80;

export type MyStatus = {
  statusPreset: StatusPreset | null;
  statusNote: string | null;
  statusUpdatedAt: Date | null;
};

export function isStatusPreset(value: string): value is StatusPreset {
  return (STATUS_PRESETS as readonly string[]).includes(value);
}

export function formatStatusDisplay(
  preset: string | null | undefined,
  note: string | null | undefined,
): { label: string; note: string | null; isOffline: boolean } {
  if (!preset || preset === "offline" || !isStatusPreset(preset)) {
    return { label: "Offline", note: null, isOffline: true };
  }
  const trimmed = note?.trim() || null;
  return {
    label: STATUS_LABELS[preset],
    note: trimmed,
    isOffline: false,
  };
}
