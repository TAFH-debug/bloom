"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSuccessSound } from "@/lib/success-sound";

const COLORS = [
  "#f43f5e",
  "#fb7185",
  "#fbbf24",
  "#34d399",
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#f97316",
  "#2dd4bf",
  "#e879f9",
];

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  width: number;
  height: number;
  shape: "rect" | "circle" | "strip";
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

    const count = 22;
    const next: Particle[] = Array.from({ length: count }, (_, index) => {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.4;
      const distance = 28 + Math.random() * 48;
      const shapeRoll = Math.random();
      const shape: Particle["shape"] =
        shapeRoll < 0.35 ? "circle" : shapeRoll < 0.7 ? "rect" : "strip";
      const base = 5 + Math.random() * 5;
      return {
        id: Date.now() + index,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 8,
        color: COLORS[index % COLORS.length],
        rotation: Math.random() * 720 - 360,
        width: shape === "strip" ? base * 0.45 : base,
        height: shape === "strip" ? base * 2.2 : shape === "circle" ? base : base * 1.35,
        shape,
      };
    });

    setParticles(next);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(() => setParticles([]), 720);
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
          "relative z-10 flex size-7 cursor-pointer items-center justify-center rounded-lg border-2 outline-none transition-all duration-200",
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
          "pointer-events-none absolute inset-0 rounded-full bg-rose-300/40 transition-opacity duration-300",
          popping ? "animate-check-ring opacity-100" : "opacity-0",
        )}
      />

      {particles.map((particle) => (
        <span
          key={particle.id}
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 z-20 animate-confetti-burst shadow-sm",
            particle.shape === "circle" ? "rounded-full" : "rounded-[1.5px]",
          )}
          style={
            {
              width: particle.width,
              height: particle.height,
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
