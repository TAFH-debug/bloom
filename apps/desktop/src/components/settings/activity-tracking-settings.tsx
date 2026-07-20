"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { setDesktopActivityEnabled } from "@/lib/desktop-activity";
import { updateActivityTrackingEnabled } from "@/lib/preferences";
import { isTauri } from "@/lib/tauri";

export function ActivityTrackingSettings({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(isTauri());
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-stone-900">
          Activity tracking
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          On Windows, Bloom can record which apps you use and when you go idle
          (60s without input). No keystrokes or screenshots — only process names
          and time ranges, while the desktop app is open.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-rose-200/50 bg-white/60 px-4 py-3">
        <input
          type="checkbox"
          className="size-4 cursor-pointer accent-rose-500"
          checked={enabled}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.checked;
            setEnabled(next);
            startTransition(async () => {
              await updateActivityTrackingEnabled(next);
              await setDesktopActivityEnabled(next);
              toast.success(next ? "Tracking enabled" : "Tracking disabled");
            });
          }}
        />
        <span className="text-sm text-stone-700">
          {enabled ? "Tracking enabled" : "Tracking disabled"}
        </span>
      </label>

      <p className="text-xs text-stone-400">
        {desktop
          ? "This Windows app will sample activity while Bloom is running."
          : "Open the Windows desktop app for live sampling. History still syncs here when you are signed in."}
      </p>
    </div>
  );
}
