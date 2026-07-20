import { useEffect, useState } from "react";
import { HabitsClient } from "@/components/habits/habits-client";
import { getHabitsDashboard } from "@/lib/habits";
import { onRefresh } from "@/lib/refresh";

export function HabitsPage() {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getHabitsDashboard>
  > | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => onRefresh(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    let cancelled = false;
    void getHabitsDashboard()
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        /* keep showing prior data / loading */
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center text-stone-500">
        Loading habits…
      </main>
    );
  }

  const dash = data as {
    habits: never[];
    weekKeys: string[];
    consistency: number;
    streak: number;
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_20%_0%,rgba(247,196,212,0.35),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(255,232,214,0.4),transparent_30%),linear-gradient(180deg,#f8f1ea_0%,#f3ebe3_40%,#efe6dc_100%)] bg-[length:140%_140%]" />
      <div className="relative z-10">
        <HabitsClient
          habits={dash.habits}
          weekKeys={dash.weekKeys}
          consistency={dash.consistency}
          streak={dash.streak}
        />
      </div>
    </main>
  );
}
