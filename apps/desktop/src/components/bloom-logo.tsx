import { cn } from "@/lib/utils";

export function BloomLogo({
  className,
  size = 36,
}: {
  className?: string;
  size?: number;
  priority?: boolean;
}) {
  return (
    <img
      src="/favicon.png"
      alt="Bloom"
      width={size}
      height={size}
      className={cn(
        "rounded-xl object-cover shadow-[0_8px_24px_-12px_rgba(190,100,120,0.55)]",
        className,
      )}
    />
  );
}
