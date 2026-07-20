import { ActivityTrackingSettings } from "@/components/settings/activity-tracking-settings";
import { ReminderSettingsForm } from "@/components/settings/reminder-settings-form";
import { StatusPicker } from "@/components/status/status-picker";
import { getPreferences } from "@/lib/preferences";
import { getMyStatus } from "@/lib/status";

export default async function SettingsPage() {
  const [prefs, status] = await Promise.all([getPreferences(), getMyStatus()]);

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-10 md:px-10">
      <div className="animate-fade-up">
        <p className="text-sm uppercase tracking-[0.16em] text-rose-500/80">
          Preferences
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-stone-900">
          Settings
        </h1>
        <p className="mt-2 max-w-md text-stone-500">
          Reminder window for the desktop app, activity tracking, and what you
          are doing right now.
        </p>
      </div>

      <section className="animate-fade-up-delayed rounded-3xl border border-rose-200/50 bg-white/55 p-6 shadow-[0_20px_50px_-36px_rgba(80,40,40,0.45)] backdrop-blur-md">
        <StatusPicker initial={status} />
      </section>

      <section className="animate-fade-up-slow rounded-3xl border border-rose-200/50 bg-white/55 p-6 shadow-[0_20px_50px_-36px_rgba(80,40,40,0.45)] backdrop-blur-md">
        <ReminderSettingsForm initial={prefs} />
      </section>

      <section className="animate-fade-up-slow rounded-3xl border border-rose-200/50 bg-white/55 p-6 shadow-[0_20px_50px_-36px_rgba(80,40,40,0.45)] backdrop-blur-md">
        <ActivityTrackingSettings
          initialEnabled={prefs.activityTrackingEnabled}
        />
      </section>
    </main>
  );
}
