"use client";

import { useEffect, useState } from "react";
import { DesktopTitlebar } from "@/components/desktop/titlebar";
import { HabitReminders } from "@/components/desktop/habit-reminders";
import { isTauri, whenTauri } from "@/lib/tauri";

export function DesktopShell({ children }: { children: React.ReactNode }) {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const activate = () => {
      setDesktop(true);
      document.documentElement.classList.add("tauri-desktop");
    };

    if (isTauri()) {
      activate();
      return;
    }

    // Flag may not be injected yet on first mount — keep watching for it.
    return whenTauri(activate);
  }, []);

  if (!desktop) {
    return <>{children}</>;
  }

  return (
    <div className="desktop-shell flex h-screen flex-col overflow-hidden">
      <DesktopTitlebar />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
      <HabitReminders />
    </div>
  );
}
