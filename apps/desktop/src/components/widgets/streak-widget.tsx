import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function StreakWidget({
  streak,
  className,
  compact = false,
}: {
  streak: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        compact
          ? "rounded-2xl bg-white/55 px-3 py-3"
          : "rounded-3xl border border-rose-200/50 bg-gradient-to-br from-white/75 to-rose-50/45 p-5 shadow-[0_16px_40px_-28px_rgba(80,40,40,0.5)] backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">
          Streak
        </p>
        <span
          className={cn(
            "flex items-center justify-center rounded-2xl bg-rose-400/15 text-rose-500",
            compact ? "size-7" : "size-8",
          )}
        >
          <Flame
            className={cn(
              "fill-rose-400/40",
              compact ? "size-3.5" : "size-4",
            )}
          />
        </span>
      </div>
      <p
        className={cn(
          "mt-2 font-[family-name:var(--font-display)] leading-none tracking-tight text-stone-900",
          compact ? "text-3xl" : "mt-3 text-5xl",
        )}
      >
        {streak}
      </p>
      <p className={cn("text-stone-500", compact ? "mt-1 text-xs" : "mt-2 text-sm")}>
        {streak === 0
          ? "No streak yet"
          : streak === 1
            ? "day growing"
            : "days growing"}
      </p>
    </section>
  );
}
