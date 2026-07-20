"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const SakuraScene = dynamic(
  () =>
    import("@/components/sakura/sakura-scene").then((mod) => mod.SakuraScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_42%_28%,rgba(248,217,228,0.55),transparent_42%),radial-gradient(circle_at_70%_60%,rgba(255,232,214,0.35),transparent_40%)]" />
    ),
  },
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
      <SakuraScene score={score} />
    </div>
  );
}
