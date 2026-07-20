"use client";

import { useCallback, useEffect, useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { BloomLogo } from "@/components/bloom-logo";
import { cn } from "@/lib/utils";

// Only ever mounted by DesktopShell once the desktop context is confirmed, so
// no second isTauri() gate here — that just re-raced the flag and hid the bar.
export function DesktopTitlebar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const win = getCurrentWindow();
        const isMax = await win.isMaximized();
        if (!cancelled) setMaximized(isMax);
      } catch {
        // ignore — web or API unavailable
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const minimize = useCallback(async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  }, []);

  const toggleMaximize = useCallback(async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    const isMax = await win.isMaximized();
    if (isMax) {
      await win.unmaximize();
      setMaximized(false);
    } else {
      await win.maximize();
      setMaximized(true);
    }
  }, []);

  const close = useCallback(async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  }, []);

  return (
    <header
      data-tauri-drag-region
      className="desktop-titlebar relative z-50 flex h-9 shrink-0 items-center justify-between border-b border-rose-200/40 bg-[linear-gradient(90deg,rgba(255,248,243,0.96)_0%,rgba(247,230,220,0.92)_100%)] select-none"
    >
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 pl-3 pointer-events-none"
      >
        <BloomLogo size={18} />
        <span className="font-[family-name:var(--font-display)] text-sm text-stone-800">
          Bloom
        </span>
      </div>

      <div className="flex h-full items-stretch">
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => void minimize()}
          className="flex w-11 items-center justify-center text-stone-500 transition-colors hover:bg-stone-900/5 hover:text-stone-800"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={maximized ? "Restore" : "Maximize"}
          onClick={() => void toggleMaximize()}
          className="flex w-11 items-center justify-center text-stone-500 transition-colors hover:bg-stone-900/5 hover:text-stone-800"
        >
          {maximized ? (
            <Copy className="size-3 rotate-90" />
          ) : (
            <Square className="size-3" />
          )}
        </button>
        <button
          type="button"
          aria-label="Hide to tray"
          title="Hide to tray"
          onClick={() => void close()}
          className={cn(
            "flex w-11 items-center justify-center text-stone-500 transition-colors",
            "hover:bg-rose-500 hover:text-white",
          )}
        >
          <X className="size-3.5" />
        </button>
      </div>
    </header>
  );
}
