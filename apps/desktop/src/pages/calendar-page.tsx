import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addDays, format, parseISO } from "date-fns";
import { Check, ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { CalendarWidget } from "@/components/widgets/calendar-widget";
import { getCalendarDay, type CalendarDayDigest } from "@/lib/calendar";
import { formatDuration } from "@/lib/format-duration";
import { toDateKey } from "@/lib/consistency";
import { cn } from "@/lib/utils";

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CalendarPage() {
  const { day: dayParam } = useParams<{ day?: string }>();
  const navigate = useNavigate();
  const today = toDateKey();
  const day = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : today;
  const [data, setData] = useState<CalendarDayDigest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void getCalendarDay(day)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this day");
      });
    return () => {
      cancelled = true;
    };
  }, [day]);

  const parsed = parseISO(`${day}T12:00:00`);
  const isToday = day === today;
  const canNext = day < today;

  function go(offset: number) {
    const next = format(addDays(parsed, offset), "yyyy-MM-dd");
    if (next > today) return;
    navigate(`/calendar/${next}`);
  }

  const habitsDue = data?.habits.filter((h) => h.due) ?? [];
  const habitsDone = habitsDue.filter(
    (h) => h.completedSlots >= h.timesPerPeriod,
  ).length;
  const maxApp = data?.focus.apps[0]?.durationMs || 1;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_18%_0%,rgba(247,196,212,0.4),transparent_36%),radial-gradient(circle_at_88%_12%,rgba(255,232,214,0.45),transparent_32%),linear-gradient(180deg,#f8f1ea_0%,#f3ebe3_42%,#efe6dc_100%)] bg-[length:140%_140%]" />
      <div className="pointer-events-none absolute left-1/4 top-8 h-48 w-48 animate-orb rounded-full bg-rose-200/20 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 md:px-10 md:py-14">
        <header className="animate-fade-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">
              Day book
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-stone-900 md:text-5xl">
              {format(parsed, "MMMM d")}
            </h1>
            <p className="mt-2 text-stone-500">
              {format(parsed, "EEEE")}
              {isToday ? " · today" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => go(-1)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-rose-200/60 bg-white/60 text-stone-600 transition hover:bg-white"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next day"
              disabled={!canNext}
              onClick={() => go(1)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-rose-200/60 bg-white/60 text-stone-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
            {!isToday ? (
              <Link
                to={`/calendar/${today}`}
                className="ml-1 rounded-full border border-rose-200/60 bg-white/60 px-3 py-2 text-xs text-stone-600 transition hover:bg-white"
              >
                Today
              </Link>
            ) : null}
          </div>
        </header>

        {error ? (
          <p className="rounded-2xl border border-dashed border-rose-200/70 bg-white/40 px-5 py-4 text-sm text-stone-500">
            {error}
          </p>
        ) : null}

        {!data && !error ? (
          <p className="text-stone-500">Loading day…</p>
        ) : null}

        {data ? (
          <>
            <section className="animate-fade-up grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-rose-200/50 bg-gradient-to-br from-white/75 to-rose-50/45 p-5 shadow-[0_16px_40px_-28px_rgba(80,40,40,0.5)] backdrop-blur-md">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
                  Habits
                </p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight text-stone-900">
                  {habitsDue.length
                    ? `${habitsDone}/${habitsDue.length}`
                    : "—"}
                </p>
                <p className="mt-2 text-sm text-stone-500">
                  {data.habitScore === null
                    ? "Nothing due"
                    : `${Math.round(data.habitScore * 100)}% complete`}
                </p>
              </div>
              <div className="rounded-3xl border border-rose-200/50 bg-gradient-to-br from-white/75 to-rose-50/45 p-5 shadow-[0_16px_40px_-28px_rgba(80,40,40,0.5)] backdrop-blur-md">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
                  Active
                </p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight text-stone-900">
                  {formatDuration(data.focus.activeMs)}
                </p>
                <p className="mt-2 text-sm text-stone-500">Time in apps</p>
              </div>
              <div className="rounded-3xl border border-rose-200/50 bg-gradient-to-br from-white/75 to-rose-50/45 p-5 shadow-[0_16px_40px_-28px_rgba(80,40,40,0.5)] backdrop-blur-md">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
                  Idle
                </p>
                <p className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight text-stone-900">
                  {formatDuration(data.focus.idleMs)}
                </p>
                <p className="mt-2 text-sm text-stone-500">Away stretches</p>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
              <div className="flex flex-col gap-6">
                <section className="rounded-3xl border border-rose-200/50 bg-white/55 p-6 shadow-[0_20px_50px_-36px_rgba(80,40,40,0.45)] backdrop-blur-md">
                  <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900">
                    Habits
                  </h2>
                  {data.habits.length === 0 ? (
                    <p className="mt-4 text-sm text-stone-500">No habits yet.</p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {data.habits.map((habit) => {
                        const done =
                          habit.due &&
                          habit.completedSlots >= habit.timesPerPeriod;
                        return (
                          <li
                            key={habit.id}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5",
                              habit.due ? "bg-white/70" : "bg-stone-100/40",
                            )}
                          >
                            <div className="min-w-0">
                              <p
                                className={cn(
                                  "truncate text-sm",
                                  habit.due
                                    ? "text-stone-800"
                                    : "text-stone-400",
                                )}
                              >
                                {habit.name}
                              </p>
                              <p className="text-[11px] text-stone-400">
                                {habit.due
                                  ? `${habit.completedSlots}/${habit.timesPerPeriod} · ${habit.frequency}`
                                  : "Not due"}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-lg border",
                                done
                                  ? "border-rose-300 bg-rose-100 text-rose-700"
                                  : "border-stone-200 text-stone-300",
                              )}
                            >
                              <Check className="size-3.5" />
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="rounded-3xl border border-rose-200/50 bg-white/55 p-6 shadow-[0_20px_50px_-36px_rgba(80,40,40,0.45)] backdrop-blur-md">
                  <div className="mb-5 flex items-center gap-2">
                    <Timer className="size-4 text-rose-500" />
                    <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900">
                      Focus
                    </h2>
                  </div>

                  {data.focus.apps.length === 0 ? (
                    <p className="text-sm text-stone-500">
                      No app activity recorded this day.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {data.focus.apps.slice(0, 8).map((app) => {
                        const process = (app.processName || "").replace(
                          /\.exe$/i,
                          "",
                        );
                        const label =
                          process &&
                          app.appName &&
                          process.toLowerCase() !== app.appName.toLowerCase()
                            ? `${process} · ${app.appName}`
                            : app.appName || process || "App";
                        return (
                          <li key={app.key} className="space-y-1.5">
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="truncate text-stone-700">
                                {label}
                              </span>
                              <span className="shrink-0 tabular-nums text-stone-500">
                                {formatDuration(app.durationMs)}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-rose-100/80">
                              <div
                                className="h-full rounded-full bg-rose-400/90 transition-[width] duration-500"
                                style={{
                                  width: `${Math.max(4, (app.durationMs / maxApp) * 100)}%`,
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {data.focus.timeline.length > 0 ? (
                    <div className="mt-6 border-t border-rose-100/80 pt-5">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
                        Timeline
                      </p>
                      <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                        {data.focus.timeline.map((block) => (
                          <li
                            key={block.id}
                            className="flex items-center justify-between gap-3 text-xs text-stone-500"
                          >
                            <span className="min-w-0 truncate">
                              {formatClock(block.startedAt)}–
                              {formatClock(block.endedAt)}{" "}
                              {block.kind === "idle"
                                ? "Idle"
                                : block.appName ||
                                  block.processName?.replace(/\.exe$/i, "") ||
                                  "App"}
                            </span>
                            <span className="shrink-0 tabular-nums">
                              {formatDuration(block.durationMs)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              </div>

              <CalendarWidget
                days={data.days}
                selectedDay={day}
                onDayClick={(next) => navigate(`/calendar/${next}`)}
              />
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
