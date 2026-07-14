import Link from "next/link";
import { SakuraCanvas } from "@/components/sakura/sakura-canvas";
import { buttonVariants } from "@/components/ui/button";
import { getHabitsDashboard } from "@/lib/habits";

export default async function HomePage() {
  const { consistency, streak } = await getHabitsDashboard();

  return (
    <main className="relative min-h-screen overflow-hidden text-stone-900">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_30%_20%,rgba(247,196,212,0.5),transparent_42%),radial-gradient(circle_at_80%_15%,rgba(255,232,214,0.55),transparent_38%),radial-gradient(circle_at_60%_80%,rgba(232,200,190,0.35),transparent_40%),linear-gradient(165deg,#f8f1ea_0%,#efe3d8_55%,#e7d5cc_100%)] bg-[length:140%_140%]" />
      <div className="pointer-events-none absolute -left-20 top-24 h-64 w-64 animate-orb rounded-full bg-rose-200/30 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 animate-orb-delayed rounded-full bg-amber-100/40 blur-3xl" />

      <SakuraCanvas score={consistency} />

      <div className="relative z-10 flex min-h-screen flex-col justify-between px-6 pb-10 pt-10 md:px-12 md:pt-16">
        <div className="max-w-xl animate-fade-up space-y-5">
          <p className="font-[family-name:var(--font-display)] text-6xl leading-none tracking-tight text-stone-900 md:text-8xl">
            Bloom
          </p>
          <p className="max-w-md animate-fade-up-delayed text-lg text-stone-600 md:text-xl">
            Your streaks, growing.
          </p>
          <div className="flex animate-fade-up-slow items-center gap-3 pt-2">
            <Link
              href="/habits"
              className={buttonVariants({
                size: "lg",
                className:
                  "rounded-full bg-gradient-to-r from-rose-500/90 to-rose-400/90 px-6 text-white shadow-[0_12px_30px_-14px_rgba(190,80,100,0.7)] transition-transform duration-300 hover:scale-[1.03] hover:shadow-[0_16px_34px_-12px_rgba(190,80,100,0.75)]",
              })}
            >
              Open habits
            </Link>
            <p className="text-sm text-stone-500">
              {Math.round(consistency * 100)}% · {streak} day streak
            </p>
          </div>
        </div>

        <aside className="grid max-w-sm animate-fade-up-slow gap-3 self-end">
          <div className="rounded-2xl border border-rose-200/40 bg-gradient-to-br from-white/45 to-rose-50/30 px-4 py-3 text-sm text-stone-500 shadow-[0_10px_30px_-20px_rgba(80,40,40,0.35)] backdrop-blur-sm transition-transform duration-500 hover:-translate-y-0.5">
            Widgets soon
          </div>
          <div className="rounded-2xl border border-dashed border-stone-300/60 bg-white/15 px-4 py-6 text-sm text-stone-400 backdrop-blur-sm">
            Reserved slot
          </div>
        </aside>
      </div>
    </main>
  );
}
