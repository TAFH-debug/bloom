"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setMyStatus } from "@/lib/status";
import {
  STATUS_LABELS,
  STATUS_NOTE_MAX,
  STATUS_PRESETS,
  type MyStatus,
  type StatusPreset,
} from "@/lib/status-types";
import { cn } from "@/lib/utils";

const PICKABLE = STATUS_PRESETS.filter((p) => p !== "offline");

export function StatusPicker({
  initial,
  showIntro = true,
  onChange,
}: {
  initial: MyStatus;
  showIntro?: boolean;
  onChange?: (next: {
    preset: StatusPreset | null;
    note: string | null;
  }) => void;
}) {
  const [preset, setPreset] = useState<StatusPreset | null>(
    initial.statusPreset,
  );
  const [note, setNote] = useState(initial.statusNote ?? "");
  const [pending, startTransition] = useTransition();

  function save(nextPreset: StatusPreset | null, nextNote: string) {
    startTransition(async () => {
      const result = await setMyStatus({
        preset: nextPreset,
        note: nextNote,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      onChange?.({
        preset: nextPreset,
        note: nextNote.trim() ? nextNote.trim() : null,
      });
      toast.success(nextPreset ? "Status updated" : "Status cleared");
    });
  }

  return (
    <div className="space-y-5">
      {showIntro ? (
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900">
            Your status
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Friends in your garden see what you are doing right now.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {PICKABLE.map((value) => {
          const active = preset === value;
          return (
            <button
              key={value}
              type="button"
              disabled={pending}
              onClick={() => {
                setPreset(value);
                save(value, note);
              }}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-sm transition-all",
                active
                  ? "bg-gradient-to-r from-rose-400 to-amber-300 text-white shadow-sm"
                  : "bg-white/70 text-stone-600 ring-1 ring-rose-200/60 hover:bg-white",
              )}
            >
              {STATUS_LABELS[value]}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label className="font-normal text-stone-500">Optional note</Label>
        <Input
          value={note}
          maxLength={STATUS_NOTE_MAX}
          placeholder="e.g. Deep work on the thesis"
          disabled={pending || !preset}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if (preset) save(preset, note);
          }}
          className="rounded-xl border-rose-200/60 bg-white/70"
        />
        <p className="text-xs text-stone-400">
          {note.length}/{STATUS_NOTE_MAX}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        disabled={pending || !preset}
        className="cursor-pointer rounded-xl text-stone-500"
        onClick={() => {
          setPreset(null);
          setNote("");
          save(null, "");
        }}
      >
        Clear status
      </Button>
    </div>
  );
}
