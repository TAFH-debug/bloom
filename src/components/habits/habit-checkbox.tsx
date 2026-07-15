"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSuccessSound } from "@/lib/success-sound";

const COLORS = ["#f7a8be", "#ffd4a8", "#f4c2d4", "#e8b4a0", "#ffecb8", "#f093a8"];

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  size: number;
};

export function HabitCheckbox({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [popping, setPopping] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

  const burst = useCallback(() => {
    if (prefersReducedMotion.current) return;

    const next: Particle[] = Array.from({ length: 14 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 14 + Math.random() * 0.35;
      const distance = 18 + Math.random() * 28;
      return {
        id: Date.now() + index,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        color: COLORS[index % COLORS.length],
        rotation: Math.random() * 360,
        size: 3 + Math.random() * 4,
      };
    });

    setParticles(next);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setParticles([]), 520);
  }, []);

  return (
    <div className="relative flex size-9 shrink-0 items-center justify-center">
      <button
        type="button"
        aria-label={label}
        aria-pressed={checked}
        onClick={() => {
          const willComplete = !checked;
          if (willComplete) {
            setPopping(true);
            burst();
            void playSuccessSound();
            window.setTimeout(() => setPopping(false), 320);
          }
          onToggle();
        }}
        className={cn(
          "relative z-10 flex size-7 items-center justify-center rounded-lg border-2 outline-none transition-all duration-200",
          "focus-visible:ring-3 focus-visible:ring-rose-300/50",
          "active:scale-90",
          checked
            ? "border-rose-400 bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-[0_6px_16px_-6px_rgba(190,80,110,0.75)]"
            : "border-rose-200/90 bg-white/80 text-transparent shadow-sm hover:border-rose-300 hover:bg-rose-50/80 hover:shadow-md",
          popping && "animate-check-pop",
        )}
      >
        <Check
          className={cn(
            "size-4 stroke-[2.75] transition-all duration-200",
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
      </button>

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full bg-rose-300/30 transition-opacity duration-300",
          popping ? "animate-check-ring opacity-100" : "opacity-0",
        )}
      />

      {particles.map((particle) => (
        <span
          key={particle.id}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 animate-confetti-burst rounded-[1px]"
          style={
            {
              width: particle.size,
              height: particle.size * 1.4,
              backgroundColor: particle.color,
              "--tx": `${particle.x}px`,
              "--ty": `${particle.y}px`,
              "--rot": `${particle.rotation}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
