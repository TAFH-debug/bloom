"use client";

import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendDesktopNotification } from "@/lib/desktop-notification";
import { updateReminderWindow } from "@/lib/preferences";
import {
  REMINDER_INTERVAL_HOURS,
  type UserPreferences,
} from "@/lib/reminder-constants";
import { isTauri } from "@/lib/tauri";
import { cn } from "@/lib/utils";

const HOUR_ITEMS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, "0")}:00`,
}));

const selectTriggerClassName =
  "h-10 w-full rounded-xl border border-rose-200/60 bg-white/70 px-3 text-sm text-stone-800 shadow-none";
const selectContentClassName =
  "rounded-xl border border-rose-200/60 bg-[#fffaf6] shadow-lg";
const selectItemClassName = "rounded-lg text-sm";

export function ReminderSettingsForm({
  initial,
}: {
  initial: UserPreferences;
}) {
  const [start, setStart] = useState(String(initial.reminderWindowStart));
  const [end, setEnd] = useState(String(initial.reminderWindowEnd));
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState(false);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateReminderWindow({
        start: Number(start),
        end: Number(end),
      });
      if ("error" in result && result.error) {
        toast.error(String(result.error));
        return;
      }
      toast.success("Reminder window saved");
    });
  }

  async function onTestNotification() {
    if (!isTauri()) {
      toast.error("Test notifications are only available in the desktop app");
      return;
    }
    setTesting(true);
    try {
      const sent = await sendDesktopNotification({
        title: "Bloom",
        body: "Test notification — reminders are working.",
      });
      if (sent) {
        toast.success("Notification sent");
      } else {
        toast.error("Notification permission was denied");
      }
    } catch {
      toast.error("Could not send notification");
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900">
          Habit reminders
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Desktop notifications every {REMINDER_INTERVAL_HOURS} hours while you
          are inside the window below. Interval is fixed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="font-normal text-stone-500">Window start</Label>
          <Select
            value={start}
            items={HOUR_ITEMS}
            onValueChange={(value) => {
              if (value) setStart(value);
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
              {HOUR_ITEMS.map((item) => (
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
          <Label className="font-normal text-stone-500">Window end</Label>
          <Select
            value={end}
            items={HOUR_ITEMS}
            onValueChange={(value) => {
              if (value) setEnd(value);
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
              {HOUR_ITEMS.map((item) => (
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
          <p className="text-xs text-stone-400">
            Use 00:00 for end-of-day (active through 23:59).
          </p>
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl border border-rose-200/50 bg-white/55 px-4 py-3 text-sm text-stone-600",
        )}
      >
        Every {REMINDER_INTERVAL_HOURS} hours ·{" "}
        {HOUR_ITEMS.find((h) => h.value === start)?.label} –{" "}
        {HOUR_ITEMS.find((h) => h.value === end)?.label}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="rounded-xl">
          {pending ? "Saving…" : "Save window"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={testing}
          className="rounded-xl"
          onClick={() => void onTestNotification()}
        >
          {testing ? "Sending…" : "Test notification"}
        </Button>
      </div>
    </form>
  );
}
