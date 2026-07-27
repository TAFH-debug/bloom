"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Timer } from "lucide-react";
import type { ActivityDashboard } from "@/lib/activity-types";
import { setDesktopActivityEnabled } from "@/lib/desktop-activity";
import { formatDuration } from "@/lib/format-duration";
import { updateActivityTrackingEnabled } from "@/lib/preferences";
import { isTauri } from "@/lib/tauri";
import { cn } from "@/lib/utils";

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FocusClient({ initial }: { initial: ActivityDashboard }) {
  const [data, setData] = useState(initial);
  const [trackingEnabled, setTrackingEnabled] = useState(
    initial.trackingEnabled,
  );
  const [pending, startTransition] = useTransition();
  const [desktop, setDesktop] = useState(false);
  const maxApp = data.apps[0]?.durationMs || 1;

  useEffect(() => {
    setData(initial);
    setTrackingEnabled(initial.trackingEnabled);
  }, [initial]);

  useEffect(() => {
    setDesktop(isTauri());
  }, []);

  function onToggle(next: boolean) {
    setTrackingEnabled(next);
    startTransition(async () => {
      try {
        await updateActivityTrackingEnabled(next);
        await setDesktopActivityEnabled(next);
        toast.success(next ? "Tracking on" : "Tracking off");
      } catch {
        setTrackingEnabled(!next);
        toast.error("Could not update tracking");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl animate-fade-up flex-col gap-8 px-6 py-10 md:px-10 md:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-stone-900 md:text-5xl">
            Focus
          </p>
          <p className="max-w-xl text-stone-500">
            Where your attention went today — apps, processes, and quiet idle
            stretches.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-rose-200/50 bg-white/55 px-4 py-3 shadow-[0_10px_30px_-22px_rgba(80,40,40,0.4)] backdrop-blur-sm">
          <input
            type="checkbox"
            className="size-4 cursor-pointer accent-rose-500"
            checked={trackingEnabled}
            disabled={pending}
            onChange={(event) => onToggle(event.target.checked)}
          />
          <span className="text-sm text-stone-700">
            {trackingEnabled ? "Tracking on" : "Tracking off"}
          </span>
        </label>
      </div>

      {!desktop ? (
        <p className="rounded-2xl border border-dashed border-rose-200/70 bg-white/40 px-5 py-4 text-sm text-stone-500">
          Activity is collected on the Windows desktop app. You can still review
          synced history here when signed in.
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-rose-200/50 bg-gradient-to-br from-white/75 to-rose-50/45 p-5 shadow-[0_16px_40px_-28px_rgba(80,40,40,0.5)] backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
            Active
          </p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight text-stone-900">
            {formatDuration(data.activeMs)}
          </p>
          <p className="mt-2 text-sm text-stone-500">Time in apps today</p>
        </div>
        <div className="rounded-3xl border border-rose-200/50 bg-gradient-to-br from-white/75 to-rose-50/45 p-5 shadow-[0_16px_40px_-28px_rgba(80,40,40,0.5)] backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
            Idle
          </p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight text-stone-900">
            {formatDuration(data.idleMs)}
          </p>
          <p className="mt-2 text-sm text-stone-500">Away for 60s or more</p>
        </div>
      </section>

      <section className="rounded-3xl border border-rose-200/50 bg-white/55 p-6 shadow-[0_20px_50px_-36px_rgba(80,40,40,0.45)] backdrop-blur-md">
        <div className="mb-5 flex items-center gap-2">
          <Timer className="size-4 text-rose-500" />
          <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900">
            Apps
          </h2>
        </div>
        {data.apps.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300/70 px-4 py-8 text-center text-sm text-stone-400">
            {trackingEnabled
              ? "No app time yet today. Keep Bloom open on Windows while you work."
              : "Turn tracking on in the Windows app to start a breakdown."}
          </p>
        ) : (
          <ul className="space-y-3">
            {data.apps.map((app) => {
              const label = app.appName || app.processName || "Unknown";
              const width = Math.max(4, Math.round((app.durationMs / maxApp) * 100));
              return (
                <li key={app.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-stone-800">{label}</p>
                      {app.processName && app.processName !== label ? (
                        <p className="truncate text-[11px] text-stone-400">
                          {app.processName}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm text-stone-500">
                      {formatDuration(app.durationMs)}
                    </p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-stone-200/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-300 to-amber-300"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-rose-200/50 bg-white/55 p-6 shadow-[0_20px_50px_-36px_rgba(80,40,40,0.45)] backdrop-blur-md">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900">
          Today
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          A light trail of active and idle blocks.
        </p>
        {data.timeline.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-stone-300/70 px-4 py-8 text-center text-sm text-stone-400">
            Nothing recorded for this day yet.
          </p>
        ) : (
          <ul className="mt-5 max-h-80 space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {data.timeline.map((block) => (
              <li
                key={block.id}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5",
                  block.kind === "idle" ? "bg-stone-100/70" : "bg-rose-50/70",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-stone-800">
                    {block.kind === "idle"
                      ? "Idle"
                      : block.appName || block.processName || "App"}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    {formatClock(block.startedAt)} – {formatClock(block.endedAt)}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-stone-500">
                  {formatDuration(block.durationMs)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
