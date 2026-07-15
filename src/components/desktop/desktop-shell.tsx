"use client";

import { useLayoutEffect, useState } from "react";
import { DesktopTitlebar } from "@/components/desktop/titlebar";
import { HabitReminders } from "@/components/desktop/habit-reminders";
import { isTauri, whenTauri } from "@/lib/tauri";

function enableDesktopChrome() {
  document.documentElement.classList.add("tauri-desktop");
}

export function DesktopShell({ children }: { children: React.ReactNode }) {
  const [desktop, setDesktop] = useState(false);

  useLayoutEffect(() => {
    const activate = () => {
      enableDesktopChrome();
      setDesktop(true);
    };

    if (isTauri()) {
      activate();
      return;
    }

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
