"use client";

import { FormEvent, useState, useTransition } from "react";
import { Check, Plus, Timer, UserMinus } from "lucide-react";
import { SakuraCanvas } from "@/components/sakura/sakura-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarWidget } from "@/components/widgets/calendar-widget";
import { StreakWidget } from "@/components/widgets/streak-widget";
import { useGardenStatusesLive } from "@/components/realtime/realtime-provider";
import {
  inviteGardenMember,
  removeGardenMember,
} from "@/lib/garden";
import type { GardenInvitationView, GardenPerson } from "@/lib/garden-types";
import { formatDuration } from "@/lib/format-duration";
import { formatStatusDisplay } from "@/lib/status-types";
import { cn } from "@/lib/utils";
import { GardenInvitesPanel } from "@/components/garden/garden-invites-panel";
import { toast } from "sonner";

function StatusLine({ person }: { person: GardenPerson }) {
  const status = formatStatusDisplay(person.statusPreset, person.statusNote);
  return (
    <p
      className={cn(
        "mt-1 truncate text-xs",
        status.isOffline ? "text-stone-400" : "text-rose-600/90",
      )}
    >
      {status.label}
      {status.note ? ` · ${status.note}` : null}
    </p>
  );
}

function GardenColumn({
  person,
  onRemove,
  pending,
}: {
  person: GardenPerson;
  onRemove?: () => void;
  pending?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex w-[17.5rem] shrink-0 flex-col rounded-3xl border border-rose-200/50 bg-gradient-to-b from-white/75 to-rose-50/40 shadow-[0_16px_40px_-28px_rgba(80,40,40,0.5)] backdrop-blur-md",
        person.isSelf && "ring-1 ring-rose-300/60",
      )}
    >
      <div className="relative h-44 overflow-hidden rounded-t-3xl">
        <SakuraCanvas score={person.consistency} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-stone-900">
              {person.isSelf ? "You" : person.name}
            </p>
            <p className="truncate text-xs text-stone-500">
              {person.isSelf ? person.name : person.email}
            </p>
            <StatusLine person={person} />
          </div>
          {!person.isSelf && onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              aria-label={`Remove ${person.name} from garden`}
              className="shrink-0 text-stone-400 hover:text-rose-700"
              onClick={onRemove}
            >
              <UserMinus className="size-4" />
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/50 px-2 py-2 text-center">
          <div>
            <p className="text-sm font-medium text-stone-800">
              {Math.round(person.consistency * 100)}%
            </p>
            <p className="text-[10px] text-stone-500">bloom</p>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800">
              {person.completedToday}/{person.habitCount || 0}
            </p>
            <p className="text-[10px] text-stone-500">today</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/55 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
            <Timer className="size-3 text-rose-400" />
            Focus
          </div>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-lg tracking-tight text-stone-900">
            {formatDuration(person.focusActiveMs ?? 0)}
          </p>
          <p className="text-[10px] text-stone-500">
            active
            {(person.focusIdleMs ?? 0) > 0
              ? ` · ${formatDuration(person.focusIdleMs ?? 0)} idle`
              : ""}
          </p>
          {(person.focusTopApps?.length ?? 0) > 0 ? (
            <ul className="mt-2 space-y-1 border-t border-rose-100/70 pt-2">
              {(person.focusTopApps ?? []).slice(0, 2).map((app) => (
                <li
                  key={`${app.label}-${app.durationMs}`}
                  className="flex items-baseline justify-between gap-2 text-[11px]"
                >
                  <span className="min-w-0 truncate text-stone-600">
                    {app.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-stone-400">
                    {formatDuration(app.durationMs)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[10px] text-stone-400">No activity yet</p>
          )}
        </div>

        <StreakWidget streak={person.streak} compact />
        <CalendarWidget days={person.days ?? []} compact />

        <div className="min-h-0 flex-1 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone-400">
            Habits
          </p>
          {person.habits.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-300/70 px-3 py-4 text-center text-xs text-stone-400">
              No habits yet
            </p>
          ) : (
            <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {person.habits.map((habit) => (
                <li
                  key={habit.id}
                  className="rounded-xl bg-white/55 px-2.5 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-md border",
                        habit.completedToday
                          ? "border-rose-400 bg-rose-400 text-white"
                          : "border-stone-300 bg-white text-transparent",
                      )}
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm text-stone-800">
                      {habit.name}
                    </p>
                    <span className="shrink-0 text-[10px] text-stone-500">
                      {habit.completedSlots}/{habit.timesPerPeriod}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-stone-500">
                    <span>{habit.weekDone} checks / week</span>
                    <span>{Math.round(habit.windowRate * 100)}% / 14d</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-200/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-300 to-amber-300"
                      style={{
                        width: `${Math.round(habit.windowRate * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

export function GardenClient({
  people: initialPeople,
  guestCount,
  maxGuests,
  capacity,
  incomingInvites,
  outgoingInvites,
}: {
  people: GardenPerson[];
  guestCount: number;
  maxGuests: number;
  capacity: number;
  incomingInvites: GardenInvitationView[];
  outgoingInvites: GardenInvitationView[];
}) {
  const people = useGardenStatusesLive(initialPeople);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canAdd = guestCount < maxGuests;

  function onAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteGardenMember(email);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setEmail("");
      const invitedName =
        "invitedName" in result ? result.invitedName : undefined;
      toast.success(
        invitedName ? `Invitation sent to ${invitedName}` : "Invitation sent",
      );
    });
  }

  return (
    <div className="animate-fade-up px-6 py-10 md:px-10 md:py-14">
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-stone-900 md:text-5xl">
            Garden
          </p>
          <p className="max-w-xl text-stone-500">
            Invite friends by email. After they accept, you both appear in each
            other’s gardens. {people.length}/{capacity} growing here.
          </p>
        </div>

        <form onSubmit={onAdd} className="w-full max-w-md space-y-2">
          <div className="flex gap-3">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="friend@email.com"
              className="bg-white/70"
              required
              disabled={!canAdd || pending}
            />
            <Button
              type="submit"
              disabled={pending || !email.trim() || !canAdd}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              Invite
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {!canAdd ? (
            <p className="text-xs text-stone-500">
              Garden is full ({capacity} including you).
            </p>
          ) : null}
        </form>
      </div>

      <GardenInvitesPanel
        incoming={incomingInvites}
        outgoing={outgoingInvites}
      />

      <div className="-mx-2 overflow-x-auto pb-4">
        <div className="flex min-w-min gap-4 px-2">
          {people.map((person) => (
            <GardenColumn
              key={person.id}
              person={person}
              pending={pending}
              onRemove={
                person.isSelf
                  ? undefined
                  : () => {
                      startTransition(async () => {
                        await removeGardenMember(person.id);
                      });
                    }
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
