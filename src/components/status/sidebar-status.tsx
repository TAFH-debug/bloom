"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getMyStatus } from "@/lib/status";
import { formatStatusDisplay, type StatusPreset } from "@/lib/status-types";
import { cn } from "@/lib/utils";

export function SidebarStatus() {
  const [preset, setPreset] = useState<StatusPreset | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const status = await getMyStatus();
        setPreset(status.statusPreset);
        setNote(status.statusNote);
      } catch {
        // not signed in / transient
      }
    });
  }, []);

  const display = formatStatusDisplay(preset, note);

  return (
    <Link
      href="/settings"
      className={cn(
        "hidden rounded-xl px-2.5 py-2 transition-colors hover:bg-white/45 md:block",
      )}
    >
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
    </Link>
  );
}
