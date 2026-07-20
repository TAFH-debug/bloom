"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Archive, Check, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { HabitCheckbox } from "@/components/habits/habit-checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  archiveHabit,
  createHabit,
  renameHabit,
  toggleHabitCompletion,
  updateHabitSchedule,
} from "@/lib/habits";
import {
  frequencyLabel,
  HABIT_FREQUENCIES,
  periodLabel,
  type HabitFrequency,
} from "@/lib/schedule";
import { cn } from "@/lib/utils";

type HabitRow = {
  id: string;
  name: string;
  frequency: HabitFrequency;
  timesPerPeriod: number;
  customEveryDays: number | null;
  periodKey: string;
  slots: boolean[];
  completedSlots: number;
  week: boolean[];
};

type TimesMode = "1" | "2" | "3" | "custom";

const FLOW_OUT_MS = 480;
const UNDO_TOAST_ID = "habit-undo";
const UNDO_TOAST_MS = 5000;

const FREQUENCY_ITEMS = HABIT_FREQUENCIES.map((value) => ({
  value,
  label: frequencyLabel(value),
}));

const TIMES_ITEMS = [
  { value: "1", label: "Once" },
  { value: "2", label: "Twice" },
  { value: "3", label: "Thrice" },
  { value: "custom", label: "Custom" },
] as const;

const selectTriggerClassName =
  "h-10 w-full min-w-0 justify-between rounded-xl border-rose-200/80 bg-white/90 px-3 text-stone-800 shadow-none hover:bg-white focus-visible:border-rose-300 focus-visible:ring-rose-300/40";

const selectContentClassName =
  "z-[60] rounded-xl border-0 bg-white text-stone-800 shadow-[0_18px_40px_-24px_rgba(80,40,40,0.45)] ring-1 ring-rose-200/70";

const selectItemClassName =
  "rounded-lg py-2 pr-8 pl-2.5 focus:bg-rose-50 focus:text-stone-900 data-highlighted:bg-rose-50";

function ScheduleFields({
  frequency,
  setFrequency,
  timesMode,
  setTimesMode,
  customTimes,
  setCustomTimes,
  customEveryDays,
  setCustomEveryDays,
}: {
  frequency: HabitFrequency;
  setFrequency: (value: HabitFrequency) => void;
  timesMode: TimesMode;
  setTimesMode: (value: TimesMode) => void;
  customTimes: number;
  setCustomTimes: (value: number) => void;
  customEveryDays: number;
  setCustomEveryDays: (value: number) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label className="font-normal text-stone-500">Schedule</Label>
        <Select
          value={frequency}
          items={FREQUENCY_ITEMS}
          onValueChange={(value) => {
            if (value) setFrequency(value as HabitFrequency);
          }}
        >
          <SelectTrigger className={selectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            className={selectContentClassName}
            alignItemWithTrigger={false}
            align="start"
          >
            {FREQUENCY_ITEMS.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className={selectItemClassName}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="font-normal text-stone-500">
          Times per {periodLabel(frequency)}
        </Label>
        <Select
          value={timesMode}
          items={[...TIMES_ITEMS]}
          onValueChange={(value) => {
            if (value) setTimesMode(value as TimesMode);
          }}
        >
          <SelectTrigger className={selectTriggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            className={selectContentClassName}
            alignItemWithTrigger={false}
            align="start"
          >
            {TIMES_ITEMS.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                className={selectItemClassName}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {timesMode === "custom" ? (
        <div className="space-y-2 sm:col-span-2">
          <Label className="font-normal text-stone-500">Custom times</Label>
          <Input
            type="number"
            min={1}
            max={12}
            value={customTimes}
            onChange={(event) => setCustomTimes(Number(event.target.value))}
            className="h-10 rounded-xl border-rose-200/80 bg-white/90"
          />
        </div>
      ) : null}

      {frequency === "custom" ? (
        <div className="space-y-2 sm:col-span-2">
          <Label className="font-normal text-stone-500">Every N days</Label>
          <Input
            type="number"
            min={2}
            max={365}
            value={customEveryDays}
            onChange={(event) => setCustomEveryDays(Number(event.target.value))}
            className="h-10 rounded-xl border-rose-200/80 bg-white/90"
          />
        </div>
      ) : null}
    </div>
  );
}

function resolveTimes(timesMode: TimesMode, customTimes: number) {
  if (timesMode === "custom") return customTimes;
  return Number(timesMode);
}

function resetCreateState(
  setName: (value: string) => void,
  setFrequency: (value: HabitFrequency) => void,
  setTimesMode: (value: TimesMode) => void,
  setCustomTimes: (value: number) => void,
  setCustomEveryDays: (value: number) => void,
) {
  setName("");
  setFrequency("daily");
  setTimesMode("1");
  setCustomTimes(4);
  setCustomEveryDays(3);
}

function withSlots(habit: HabitRow, slots: boolean[]): HabitRow {
  return {
    ...habit,
    slots,
    completedSlots: slots.filter(Boolean).length,
  };
}

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
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [timesMode, setTimesMode] = useState<TimesMode>("1");
  const [customTimes, setCustomTimes] = useState(4);
  const [customEveryDays, setCustomEveryDays] = useState(3);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFrequency, setEditFrequency] = useState<HabitFrequency>("daily");
  const [editTimesMode, setEditTimesMode] = useState<TimesMode>("1");
  const [editCustomTimes, setEditCustomTimes] = useState(4);
  const [editCustomEveryDays, setEditCustomEveryDays] = useState(3);
  const [slotOverrides, setSlotOverrides] = useState<Record<string, boolean[]>>(
    {},
  );
  const [exitingIds, setExitingIds] = useState<string[]>([]);
  const [restoringIds, setRestoringIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const lastActionRef = useRef<{ habitId: string; slot: number } | null>(null);
  const flowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const habitsRef = useRef(habits);
  habitsRef.current = habits;

  useEffect(() => {
    return () => {
      if (flowTimer.current) clearTimeout(flowTimer.current);
    };
  }, []);

  // Drop optimistic slot overrides once the server view catches up.
  useEffect(() => {
    setSlotOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const habit of habits) {
        const override = next[habit.id];
        if (
          override &&
          override.length === habit.slots.length &&
          override.every((value, index) => value === habit.slots[index])
        ) {
          delete next[habit.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [habits]);

  const displayHabits = useMemo(() => {
    return habits
      .map((habit) => {
        const slots = slotOverrides[habit.id] ?? habit.slots;
        return withSlots(habit, slots);
      })
      .filter((habit) => {
        if (exitingIds.includes(habit.id)) return true;
        if (dismissedIds.includes(habit.id)) return false;
        if (restoringIds.includes(habit.id)) return true;
        return habit.completedSlots < habit.timesPerPeriod;
      });
  }, [habits, slotOverrides, exitingIds, dismissedIds, restoringIds]);

  function undoLastCompletion() {
    const action = lastActionRef.current;
    if (!action) return;
    lastActionRef.current = null;

    const { habitId, slot } = action;
    setDismissedIds((ids) => ids.filter((id) => id !== habitId));
    setExitingIds((ids) => ids.filter((id) => id !== habitId));
    setRestoringIds((ids) =>
      ids.includes(habitId) ? ids : [...ids, habitId],
    );

    setSlotOverrides((prev) => {
      const habit = habitsRef.current.find((row) => row.id === habitId);
      const baseSlots = prev[habitId] ?? habit?.slots;
      if (!baseSlots) return prev;
      const nextSlots = [...baseSlots];
      nextSlots[slot] = false;
      return { ...prev, [habitId]: nextSlots };
    });

    window.setTimeout(() => {
      setRestoringIds((ids) => ids.filter((id) => id !== habitId));
    }, 420);

    startTransition(async () => {
      await toggleHabitCompletion(habitId, slot);
    });
  }

  function showUndoToast() {
    toast.custom(
      (id) => (
        <div className="relative isolate">
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-[2px] rounded-full animate-undo-timer-ring"
          />
          <button
            type="button"
            className="relative z-10 flex w-full min-w-[16rem] cursor-pointer items-center justify-center rounded-full border border-rose-200/40 bg-[linear-gradient(180deg,rgba(255,252,249,0.98),rgba(255,245,240,0.96))] px-5 py-3 text-sm font-medium text-stone-700 shadow-[0_18px_40px_-24px_rgba(80,40,40,0.55)] backdrop-blur-md transition hover:text-stone-900 hover:shadow-[0_20px_44px_-22px_rgba(80,40,40,0.6)]"
            onClick={() => {
              toast.dismiss(id);
              undoLastCompletion();
            }}
          >
            Cancel last action
          </button>
        </div>
      ),
      {
        id: UNDO_TOAST_ID,
        duration: UNDO_TOAST_MS,
        position: "bottom-center",
        unstyled: true,
        className: "w-auto",
      },
    );
  }

  function onToggleSlot(habit: HabitRow, slot: number) {
    const currentSlots = slotOverrides[habit.id] ?? habit.slots;
    const willComplete = !currentSlots[slot];
    const nextSlots = [...currentSlots];
    nextSlots[slot] = willComplete;
    const willFinishHabit =
      willComplete && nextSlots.every(Boolean) && nextSlots.length > 0;

    setSlotOverrides((prev) => ({ ...prev, [habit.id]: nextSlots }));

    if (willFinishHabit) {
      lastActionRef.current = { habitId: habit.id, slot };
      setExitingIds((ids) =>
        ids.includes(habit.id) ? ids : [...ids, habit.id],
      );
      if (flowTimer.current) clearTimeout(flowTimer.current);
      flowTimer.current = setTimeout(() => {
        setExitingIds((ids) => ids.filter((id) => id !== habit.id));
        setDismissedIds((ids) =>
          ids.includes(habit.id) ? ids : [...ids, habit.id],
        );
        showUndoToast();
      }, FLOW_OUT_MS);
    } else if (!willComplete) {
      setDismissedIds((ids) => ids.filter((id) => id !== habit.id));
      setExitingIds((ids) => ids.filter((id) => id !== habit.id));
      if (lastActionRef.current?.habitId === habit.id) {
        lastActionRef.current = null;
        toast.dismiss(UNDO_TOAST_ID);
      }
    }

    startTransition(async () => {
      await toggleHabitCompletion(habit.id, slot);
    });
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      await createHabit({
        name,
        frequency,
        timesPerPeriod: resolveTimes(timesMode, customTimes),
        customEveryDays: frequency === "custom" ? customEveryDays : null,
      });
      resetCreateState(
        setName,
        setFrequency,
        setTimesMode,
        setCustomTimes,
        setCustomEveryDays,
      );
      setCreateOpen(false);
    });
  }

  function beginEdit(habit: HabitRow) {
    setEditingId(habit.id);
    setEditName(habit.name);
    setEditFrequency(habit.frequency);
    if (habit.timesPerPeriod <= 3) {
      setEditTimesMode(String(habit.timesPerPeriod) as TimesMode);
    } else {
      setEditTimesMode("custom");
      setEditCustomTimes(habit.timesPerPeriod);
    }
    setEditCustomEveryDays(habit.customEveryDays ?? 3);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl animate-fade-up flex-col gap-10 px-6 py-10 md:px-10 md:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-stone-900 md:text-5xl">
            Habits
          </p>
          <p className="max-w-xl text-stone-500">
            Schedule each practice and how often it should bloom — currently{" "}
            <span className="text-stone-800">
              {Math.round(consistency * 100)}%
            </span>{" "}
            over 14 days, streak {streak}.
          </p>
        </div>

        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) {
              resetCreateState(
                setName,
                setFrequency,
                setTimesMode,
                setCustomTimes,
                setCustomEveryDays,
              );
            }
          }}
        >
          <DialogTrigger
            render={
              <Button className="gap-1.5 rounded-full px-5 shadow-[0_12px_28px_-16px_rgba(190,80,100,0.55)]" />
            }
          >
            <Plus className="size-4" />
            New habit
          </DialogTrigger>
          <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-3xl border-0 bg-[linear-gradient(180deg,rgba(255,252,249,0.98),rgba(255,245,240,0.96))] p-0 text-stone-900 shadow-[0_30px_80px_-40px_rgba(80,40,40,0.55)] ring-1 ring-rose-200/60 sm:max-w-lg">
            <form onSubmit={onCreate}>
              <DialogHeader className="space-y-2 border-b border-rose-100/80 px-6 py-5">
                <DialogTitle className="font-[family-name:var(--font-display)] text-2xl font-normal tracking-tight">
                  New habit
                </DialogTitle>
                <DialogDescription className="text-stone-500">
                  Choose a schedule and how many checkboxes you want each
                  period.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="habit-name" className="text-stone-500">
                    Name
                  </Label>
                  <Input
                    id="habit-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Morning stretch"
                    className="h-10 rounded-xl border-rose-200/70 bg-white/80"
                    autoFocus
                    required
                  />
                </div>
                <ScheduleFields
                  frequency={frequency}
                  setFrequency={setFrequency}
                  timesMode={timesMode}
                  setTimesMode={setTimesMode}
                  customTimes={customTimes}
                  setCustomTimes={setCustomTimes}
                  customEveryDays={customEveryDays}
                  setCustomEveryDays={setCustomEveryDays}
                />
              </div>

              <DialogFooter className="m-0 rounded-b-3xl border-t border-rose-100/80 bg-rose-50/50 px-6 py-5 sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full text-stone-500 hover:bg-white/70 hover:text-stone-800"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={pending || !name.trim()}
                  className="gap-1.5 rounded-full px-5"
                >
                  <Plus className="size-4" />
                  {pending ? "Creating…" : "Create habit"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {displayHabits.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300/80 bg-white/40 px-5 py-10 text-center text-stone-500">
            {habits.length === 0
              ? "Add your first habit to start blooming."
              : "All done for now — nice work."}
          </p>
        ) : (
          displayHabits.map((habit) => (
            <div
              key={habit.id}
              className={cn(
                "flex flex-col gap-4 rounded-2xl border border-rose-200/50 bg-gradient-to-br from-white/70 to-rose-50/40 px-5 py-4 shadow-[0_10px_30px_-22px_rgba(80,40,40,0.4)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-20px_rgba(80,40,40,0.45)]",
                exitingIds.includes(habit.id) && "animate-habit-flow-out",
                restoringIds.includes(habit.id) && "animate-habit-flow-in",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {habit.slots.map((checked, slot) => (
                      <HabitCheckbox
                        key={`${habit.id}-${slot}`}
                        checked={checked}
                        label={`Mark ${habit.name} slot ${slot + 1} of ${habit.timesPerPeriod}`}
                        onToggle={() => onToggleSlot(habit, slot)}
                      />
                    ))}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    {editingId === habit.id ? (
                      <form
                        className="space-y-3"
                        onSubmit={(event) => {
                          event.preventDefault();
                          startTransition(async () => {
                            await renameHabit(habit.id, editName);
                            await updateHabitSchedule(habit.id, {
                              frequency: editFrequency,
                              timesPerPeriod: resolveTimes(
                                editTimesMode,
                                editCustomTimes,
                              ),
                              customEveryDays:
                                editFrequency === "custom"
                                  ? editCustomEveryDays
                                  : null,
                            });
                            setEditingId(null);
                          });
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <Input
                            value={editName}
                            onChange={(event) =>
                              setEditName(event.target.value)
                            }
                            autoFocus
                            className="min-w-0 flex-1 rounded-xl border-rose-200/70 bg-white/80"
                          />
                          <Button
                            type="submit"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Save habit"
                            disabled={pending || !editName.trim()}
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Cancel editing"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                        <ScheduleFields
                          frequency={editFrequency}
                          setFrequency={setEditFrequency}
                          timesMode={editTimesMode}
                          setTimesMode={setEditTimesMode}
                          customTimes={editCustomTimes}
                          setCustomTimes={setEditCustomTimes}
                          customEveryDays={editCustomEveryDays}
                          setCustomEveryDays={setEditCustomEveryDays}
                        />
                      </form>
                    ) : (
                      <>
                        <p className="truncate text-base text-stone-800">
                          {habit.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span className="rounded-full bg-white/70 px-2 py-0.5">
                            {frequencyLabel(habit.frequency)}
                            {habit.frequency === "custom" &&
                            habit.customEveryDays
                              ? ` · every ${habit.customEveryDays}d`
                              : ""}
                          </span>
                          <span className="rounded-full bg-white/70 px-2 py-0.5">
                            {habit.completedSlots}/{habit.timesPerPeriod} this{" "}
                            {periodLabel(habit.frequency)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start">
                  <div className="mr-1 flex gap-1.5" aria-label="Last 7 days">
                    {habit.week.map((done, index) => (
                      <span
                        key={`${habit.id}-${weekKeys[index]}`}
                        title={weekKeys[index]}
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          done ? "bg-rose-300" : "bg-stone-200",
                        )}
                      />
                    ))}
                  </div>
                  {editingId !== habit.id ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${habit.name}`}
                      className="text-stone-400 hover:text-stone-800"
                      onClick={() => beginEdit(habit)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Archive ${habit.name}`}
                    className="text-stone-400 hover:text-rose-700"
                    onClick={() => {
                      startTransition(async () => {
                        await archiveHabit(habit.id);
                      });
                    }}
                  >
                    <Archive className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
