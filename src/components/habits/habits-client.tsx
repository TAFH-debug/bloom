"use client";

import { FormEvent, useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  archiveHabit,
  createHabit,
  renameHabit,
  toggleHabitCompletion,
} from "@/lib/habits";

type HabitRow = {
  id: string;
  name: string;
  completedToday: boolean;
  week: boolean[];
};

export function HabitsClient({
  habits,
  weekKeys,
  consistency,
  streak,
}: {
  habits: HabitRow[];
  weekKeys: string[];
  consistency: number;
  streak: number;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  function onCreate(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      await createHabit(name);
      setName("");
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl animate-fade-up flex-col gap-10 px-6 py-10 md:px-10 md:py-14">
      <div className="space-y-3">
        <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-stone-900 md:text-5xl">
          Habits
        </p>
        <p className="max-w-xl text-stone-500">
          Track daily practices. Consistency grows your sakura — currently{" "}
          <span className="text-stone-800">{Math.round(consistency * 100)}%</span>{" "}
          over 14 days, streak {streak}.
        </p>
      </div>

      <form onSubmit={onCreate} className="flex gap-3">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New habit"
          className="bg-white/70"
        />
        <Button type="submit" disabled={pending || !name.trim()}>
          Add
        </Button>
      </form>

      <div className="space-y-3">
        {habits.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300/80 bg-white/40 px-5 py-10 text-center text-stone-500">
            Add your first habit to start blooming.
          </p>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className="flex flex-col gap-4 rounded-2xl border border-rose-200/50 bg-gradient-to-br from-white/70 to-rose-50/40 px-5 py-4 shadow-[0_10px_30px_-22px_rgba(80,40,40,0.4)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-20px_rgba(80,40,40,0.45)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Checkbox
                  checked={habit.completedToday}
                  onCheckedChange={() => {
                    startTransition(async () => {
                      await toggleHabitCompletion(habit.id);
                    });
                  }}
                  aria-label={`Mark ${habit.name} complete for today`}
                />
                {editingId === habit.id ? (
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      startTransition(async () => {
                        await renameHabit(habit.id, editName);
                        setEditingId(null);
                      });
                    }}
                  >
                    <Input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      autoFocus
                    />
                    <Button type="submit" size="sm">
                      Save
                    </Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="truncate text-left text-base text-stone-800"
                    onClick={() => {
                      setEditingId(habit.id);
                      setEditName(habit.name);
                    }}
                  >
                    {habit.name}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex gap-1.5" aria-label="Last 7 days">
                  {habit.week.map((done, index) => (
                    <span
                      key={`${habit.id}-${weekKeys[index]}`}
                      title={weekKeys[index]}
                      className={`h-2.5 w-2.5 rounded-full ${
                        done ? "bg-rose-300" : "bg-stone-200"
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    startTransition(async () => {
                      await archiveHabit(habit.id);
                    });
                  }}
                >
                  Archive
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
