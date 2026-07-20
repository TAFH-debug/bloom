import { useEffect, useState } from "react";
import { FocusClient } from "@/components/focus/focus-client";
import { getActivityDashboard } from "@/lib/activity";
import type { ActivityDashboard } from "@/lib/activity-types";
import { onActivityRefresh, onRefresh } from "@/lib/refresh";

export function FocusPage() {
  const [data, setData] = useState<ActivityDashboard | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => onRefresh(() => setTick((n) => n + 1)), []);
  useEffect(() => onActivityRefresh(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    let cancelled = false;
    void getActivityDashboard().then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center text-stone-500">
        Loading focus…
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_20%_0%,rgba(247,196,212,0.35),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(255,232,214,0.4),transparent_30%),linear-gradient(180deg,#f8f1ea_0%,#f3ebe3_40%,#efe6dc_100%)] bg-[length:140%_140%]" />
      <div className="pointer-events-none absolute left-1/3 top-0 h-56 w-56 animate-orb rounded-full bg-rose-200/25 blur-3xl" />
      <div className="relative z-10">
        <FocusClient initial={data} />
      </div>
    </main>
  );
}
