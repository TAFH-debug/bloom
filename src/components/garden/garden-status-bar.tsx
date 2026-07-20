"use client";

import Link from "next/link";
import { Flower2 } from "lucide-react";
import { GardenInviteBell } from "@/components/garden/garden-invite-bell";
import { useGardenStatusesLive } from "@/components/realtime/realtime-provider";
import type { GardenPerson } from "@/lib/garden-types";
import { formatStatusDisplay } from "@/lib/status-types";
import { cn } from "@/lib/utils";

function Avatar({
  name,
  isSelf,
  className,
}: {
  name: string;
  isSelf?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-200 to-amber-100 text-sm font-medium text-rose-800",
        isSelf && "ring-2 ring-rose-300/70",
        className,
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function MiniBloom({ score }: { score: number }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200/80"
      aria-hidden
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-rose-300 via-rose-400 to-amber-300"
        style={{ width: `${Math.round(score * 100)}%` }}
      />
    </div>
  );
}

export function GardenStatusBar({ people: initialPeople }: { people: GardenPerson[] }) {
  const people = useGardenStatusesLive(initialPeople);

  return (
    <aside
      className={cn(
        "group/garden app-chrome fixed inset-y-0 right-0 z-30 flex w-14 flex-col overflow-hidden",
        "border-l border-rose-200/40 bg-[linear-gradient(180deg,rgba(255,248,243,0.94)_0%,rgba(247,230,220,0.9)_50%,rgba(243,214,208,0.92)_100%)] backdrop-blur-xl",
        "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-72 focus-within:w-72",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-8 top-16 h-28 w-28 animate-orb rounded-full bg-rose-200/35 blur-2xl" />
        <div className="absolute -left-6 bottom-24 h-32 w-32 animate-orb-delayed rounded-full bg-amber-100/40 blur-2xl" />
      </div>

      <div className="relative flex h-full flex-col">
        <div className="flex items-center border-b border-rose-200/40 px-2.5 py-4 group-hover/garden:gap-2 group-focus-within/garden:gap-2">
          <div className="hidden min-w-0 flex-1 items-center gap-3 group-hover/garden:flex group-focus-within/garden:flex">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-300/80 to-amber-100 text-rose-800">
              <Flower2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-lg leading-none text-stone-900">
                Garden
              </p>
              <p className="mt-1 truncate text-xs text-stone-500">
                {people.length}/5 growing
              </p>
            </div>
          </div>
          <div className="mx-auto shrink-0 group-hover/garden:mx-0 group-focus-within/garden:mx-0">
            <GardenInviteBell />
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden px-2 py-3">
          <ul className="space-y-2">
            {people.map((person) => {
              const status = formatStatusDisplay(
                person.statusPreset,
                person.statusNote,
              );
              return (
                <li key={person.id}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-1.5 py-1.5 transition-colors",
                      "group-hover/garden:bg-white/55 group-focus-within/garden:bg-white/55",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar name={person.name} isSelf={person.isSelf} />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#f7efe8]",
                          status.isOffline ? "bg-stone-300" : "bg-emerald-400",
                        )}
                        title={status.label}
                      />
                    </div>
                    <div className="min-w-0 flex-1 opacity-0 transition-opacity duration-200 group-hover/garden:opacity-100 group-focus-within/garden:opacity-100">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-stone-800">
                          {person.isSelf ? "You" : person.name}
                        </p>
                        <p className="shrink-0 text-[11px] text-stone-500">
                          {person.streak}d
                        </p>
                      </div>
                      <p
                        className={cn(
                          "mt-0.5 truncate text-[11px]",
                          status.isOffline ? "text-stone-400" : "text-rose-600/90",
                        )}
                      >
                        {status.label}
                        {status.note ? ` · ${status.note}` : null}
                      </p>
                      <div className="mt-1.5">
                        <MiniBloom score={person.consistency} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative border-t border-rose-200/40 p-2">
          <Link
            href="/garden"
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-sm text-stone-600 transition-colors",
              "hover:bg-white/60 hover:text-stone-900",
            )}
          >
            <Flower2 className="size-4 shrink-0 text-rose-500" />
            <span className="hidden whitespace-nowrap group-hover/garden:inline group-focus-within/garden:inline">
              Open garden
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
