import { CalendarWidget } from "@/components/widgets/calendar-widget";
import { StreakWidget } from "@/components/widgets/streak-widget";
import { SakuraCanvas } from "@/components/sakura/sakura-canvas";
import { getUserProgress } from "@/lib/progress";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const session = await requireSession();
  const { consistency, streak, days } = await getUserProgress(session.user.id);

  return (
    <main className="relative min-h-screen overflow-hidden text-stone-900">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_30%_20%,rgba(247,196,212,0.5),transparent_42%),radial-gradient(circle_at_80%_15%,rgba(255,232,214,0.55),transparent_38%),radial-gradient(circle_at_60%_80%,rgba(232,200,190,0.35),transparent_40%),linear-gradient(165deg,#f8f1ea_0%,#efe3d8_55%,#e7d5cc_100%)] bg-[length:140%_140%]" />
      <div className="pointer-events-none absolute -left-20 top-24 h-64 w-64 animate-orb rounded-full bg-rose-200/30 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-10 h-72 w-72 animate-orb-delayed rounded-full bg-amber-100/40 blur-3xl" />

      <SakuraCanvas score={consistency} className="absolute inset-0" />

      <aside
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6",
          "md:inset-y-0 md:left-auto md:right-0 md:flex md:w-[22rem] md:flex-col md:justify-center md:p-8",
        )}
      >
        <div className="animate-fade-up mx-auto flex w-full max-w-md flex-col gap-3 md:max-w-none">
          <StreakWidget streak={streak} />
          <CalendarWidget days={days} />
        </div>
      </aside>
    </main>
  );
}
