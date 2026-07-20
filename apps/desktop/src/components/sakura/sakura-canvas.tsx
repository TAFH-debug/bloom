import { lazy, Suspense } from "react";
import { cn } from "@/lib/utils";

const SakuraScene = lazy(() =>
  import("@/components/sakura/sakura-scene").then((mod) => ({
    default: mod.SakuraScene,
  })),
);

export function SakuraCanvas({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Suspense
        fallback={
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_28%,rgba(248,217,228,0.55),transparent_42%),radial-gradient(circle_at_70%_60%,rgba(255,232,214,0.35),transparent_40%)]" />
        }
      >
        <SakuraScene score={score} />
      </Suspense>
    </div>
  );
}
