"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const SakuraScene = dynamic(
  () =>
    import("@/components/sakura/sakura-scene").then((mod) => mod.SakuraScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_30%,#f8d9e4,transparent_45%),linear-gradient(160deg,#f7efe8,#efe4d8)]" />
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
