"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ActivityTracker } from "@/components/desktop/activity-tracker";
import { GardenStatusBar } from "@/components/garden/garden-status-bar";
import type { GardenPerson } from "@/lib/garden-types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "bloom-sidebar-collapsed";

export function AppFrame({
  children,
  people,
}: {
  children: ReactNode;
  people: GardenPerson[];
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="app-frame relative flex min-h-screen flex-1 flex-col">
      <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      <div
        className={cn(
          "app-main min-h-screen flex-1 overflow-y-auto overflow-x-hidden mr-14 transition-[margin] duration-300",
          "ml-[4.5rem]",
          collapsed ? "md:ml-[4.5rem]" : "md:ml-56",
        )}
      >
        {children}
      </div>
      <GardenStatusBar people={people} />
      <ActivityTracker />
    </div>
  );
}
