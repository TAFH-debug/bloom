import { useEffect, useState } from "react";
import { ActivityTrackingSettings } from "@/components/settings/activity-tracking-settings";
import { ReminderSettingsForm } from "@/components/settings/reminder-settings-form";
import { getPreferences } from "@/lib/preferences";
import { getMyStatus } from "@/lib/status";
import { StatusPicker } from "@/components/status/status-picker";
import type { UserPreferences } from "@/lib/reminder-constants";
import type { MyStatus } from "@/lib/status-types";

export function SettingsPage() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [status, setStatus] = useState<MyStatus | null>(null);

  useEffect(() => {
    void Promise.all([getPreferences(), getMyStatus()]).then(
      ([nextPrefs, nextStatus]) => {
        setPrefs(nextPrefs);
        setStatus(nextStatus);
      },
    );
  }, []);

  if (!prefs || !status) {
    return (
      <main className="flex min-h-screen items-center justify-center text-stone-500">
        Loading settings…
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 animate-gradient-shift bg-[radial-gradient(circle_at_20%_0%,rgba(247,196,212,0.35),transparent_35%),radial-gradient(circle_at_90%_20%,rgba(255,232,214,0.4),transparent_30%),linear-gradient(180deg,#f8f1ea_0%,#f3ebe3_40%,#efe6dc_100%)] bg-[length:140%_140%]" />
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10 md:px-10 md:py-14">
        <div>
          <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-stone-900">
            Settings
          </p>
          <p className="mt-2 text-stone-500">
            Reminders, tracking, and how friends see you.
          </p>
        </div>
        <StatusPicker initial={status} />
        <ReminderSettingsForm initial={prefs} />
        <ActivityTrackingSettings
          initialEnabled={prefs.activityTrackingEnabled}
        />
      </div>
    </main>
  );
}
