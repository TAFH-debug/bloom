import { api, ApiError } from "@/lib/api";
import type { MyStatus, StatusPreset } from "@/lib/status-types";
import { isStatusPreset } from "@/lib/status-types";

export async function getMyStatus(): Promise<MyStatus> {
  const data = await api<{
    statusPreset: string | null;
    statusNote: string | null;
    statusUpdatedAt: string | null;
  }>("/status/me");
  return {
    statusPreset:
      data.statusPreset && isStatusPreset(data.statusPreset)
        ? (data.statusPreset as StatusPreset)
        : null,
    statusNote: data.statusNote,
    statusUpdatedAt: data.statusUpdatedAt
      ? new Date(data.statusUpdatedAt)
      : null,
  };
}

export async function setMyStatus(input: {
  preset: string | null;
  note?: string | null;
}) {
  try {
    await api("/status", {
      method: "PUT",
      body: JSON.stringify({
        preset: input.preset,
        note: input.note ?? null,
      }),
    });
    return { success: true as const };
  } catch (error) {
    return {
      error: error instanceof ApiError ? error.message : "Could not update status",
    };
  }
}
