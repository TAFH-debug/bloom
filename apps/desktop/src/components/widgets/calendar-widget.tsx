import { format, getDay, parseISO } from "date-fns";
import type { DayScore } from "@/lib/consistency";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function densityClass(score: number | null) {
  if (score === null) {
    return "border border-dashed border-stone-300/70 bg-transparent";
  }
  if (score <= 0) return "bg-stone-200/80";
  if (score < 0.25) return "bg-rose-100";
  if (score < 0.5) return "bg-rose-200";
  if (score < 0.75) return "bg-rose-300";
  if (score < 1) return "bg-rose-400";
  return "bg-rose-500";
}

function densityLabel(score: number | null) {
  if (score === null) return "nothing due";
  return `${Math.round(score * 100)}%`;
}

/** Align trailing window so columns are Mon→Sun weeks. */
function padToWeekStart(days: DayScore[]) {
  if (days.length === 0) return [] as Array<DayScore | null>;

  const first = parseISO(`${days[0].date}T12:00:00`);
  // getDay: 0=Sun … 6=Sat → Monday-based index 0–6
  const mondayIndex = (getDay(first) + 6) % 7;
  const leading: Array<DayScore | null> = Array.from(
    { length: mondayIndex },
    () => null,
  );
  return [...leading, ...days];
}

export function CalendarWidget({
  days,
  className,
  compact = false,
}: {
  days: DayScore[];
  className?: string;
  compact?: boolean;
}) {
  const cells = padToWeekStart(days);
  const weeks = Math.ceil(cells.length / 7) || 4;
  const gap = compact ? "gap-1" : "gap-1.5";
  const cellRound = compact ? "rounded-[3px]" : "rounded-[4px]";

  return (
    <section
      className={cn(
        compact
          ? "rounded-2xl bg-white/55 px-3 py-3"
          : "rounded-3xl border border-rose-200/50 bg-gradient-to-br from-white/75 to-rose-50/45 p-5 shadow-[0_16px_40px_-28px_rgba(80,40,40,0.5)] backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
            Calendar
          </p>
          {!compact ? (
            <p className="mt-1 text-sm text-stone-500">Last 4 weeks</p>
          ) : (
            <p className="mt-0.5 text-[10px] text-stone-400">4 weeks</p>
          )}
        </div>
        <div
          className={cn(
            "flex items-center text-stone-400",
            compact ? "gap-1 text-[9px]" : "gap-1.5 text-[10px]",
          )}
        >
          {!compact ? <span>Less</span> : null}
          <span className="size-2 rounded-[2px] bg-stone-200/80" />
          <span className="size-2 rounded-[2px] bg-rose-200" />
          <span className="size-2 rounded-[2px] bg-rose-300" />
          <span className="size-2 rounded-[2px] bg-rose-500" />
          {!compact ? <span>More</span> : null}
        </div>
      </div>

      <div className={cn("mt-3 flex", compact ? "gap-1.5" : "mt-4 gap-2")}>
        <div className={cn("grid grid-rows-7 pt-0.5", gap)}>
          {WEEKDAY_LABELS.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className={cn(
                "flex items-center text-stone-400",
                compact ? "h-2.5 text-[8px]" : "h-3.5 text-[9px]",
              )}
            >
              {label}
            </span>
          ))}
        </div>

        <div
          className={cn("grid flex-1", gap)}
          style={{
            gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`,
            gridTemplateRows: "repeat(7, minmax(0, 1fr))",
            gridAutoFlow: "column",
          }}
        >
          {cells.map((day, index) => {
            if (!day) {
              return (
                <span
                  key={`pad-${index}`}
                  className={cn("aspect-square", cellRound)}
                />
              );
            }

            const parsed = parseISO(`${day.date}T12:00:00`);
            const title = `${format(parsed, "MMM d")} · ${densityLabel(day.score)}`;

            return (
              <span
                key={day.date}
                title={title}
                className={cn(
                  "aspect-square transition-transform duration-200 hover:scale-110",
                  cellRound,
                  densityClass(day.score),
                )}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
