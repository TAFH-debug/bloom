"use client";

import { useEffect, useState, useTransition } from "react";
import { CircleDot } from "lucide-react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { StatusPicker } from "@/components/status/status-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMyStatus } from "@/lib/status";
import {
  formatStatusDisplay,
  isStatusPreset,
  type MyStatus,
} from "@/lib/status-types";
import { cn } from "@/lib/utils";

export function SidebarStatus({ collapsed }: { collapsed: boolean }) {
  const { userId, statuses } = useRealtime();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<MyStatus | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const next = await getMyStatus();
        setStatus(next);
      } catch {
        // not signed in / transient
      }
    });
  }, []);

  const live = userId ? statuses[userId] : null;
  const effective: MyStatus | null = live
    ? {
        statusPreset:
          live.statusPreset && isStatusPreset(live.statusPreset)
            ? live.statusPreset
            : null,
        statusNote: live.statusNote,
        statusUpdatedAt: live.statusUpdatedAt
          ? new Date(live.statusUpdatedAt)
          : status?.statusUpdatedAt ?? null,
      }
    : status;

  const display = formatStatusDisplay(
    effective?.statusPreset ?? null,
    effective?.statusNote ?? null,
  );

  return (
    <>
      <button
        type="button"
        title="Change status"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full cursor-pointer rounded-xl text-left transition-colors hover:bg-white/45",
          collapsed
            ? "flex items-center justify-center px-2.5 py-2.5"
            : "hidden px-2.5 py-2 md:block",
        )}
      >
        {collapsed ? (
          <CircleDot
            className={cn(
              "size-4",
              display.isOffline ? "text-stone-400" : "text-rose-500",
            )}
          />
        ) : (
          <>
            <p className="text-[10px] uppercase tracking-[0.14em] text-stone-400">
              Status
            </p>
            <p
              className={cn(
                "mt-0.5 truncate text-sm",
                display.isOffline ? "text-stone-500" : "text-stone-800",
              )}
            >
              {display.label}
              {display.note ? ` · ${display.note}` : null}
            </p>
          </>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-0 overflow-hidden rounded-3xl border-0 bg-[linear-gradient(180deg,rgba(255,252,249,0.98),rgba(255,245,240,0.96))] p-0 text-stone-900 shadow-[0_30px_80px_-40px_rgba(80,40,40,0.55)] ring-1 ring-rose-200/60 sm:max-w-md">
          <DialogHeader className="space-y-2 border-b border-rose-100/80 px-6 py-5">
            <DialogTitle className="font-[family-name:var(--font-display)] text-2xl font-normal tracking-tight">
              Your status
            </DialogTitle>
            <DialogDescription className="text-stone-500">
              Friends in your garden see what you are doing right now. With
              tracking on, this follows your open app.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            {effective ? (
              <StatusPicker
                key={`${effective.statusPreset ?? ""}:${effective.statusNote ?? ""}`}
                initial={effective}
                showIntro={false}
                onChange={(next) => {
                  setStatus({
                    statusPreset: next.preset,
                    statusNote: next.note,
                    statusUpdatedAt: new Date(),
                  });
                }}
              />
            ) : (
              <p className="text-sm text-stone-500">Loading status…</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
