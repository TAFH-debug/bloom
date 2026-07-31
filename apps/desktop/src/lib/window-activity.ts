import { useSyncExternalStore } from "react";
import { whenTauri } from "@/lib/tauri";

/**
 * How much render budget the window deserves right now.
 *
 * - `active`    — visible and focused; run animations at full rate.
 * - `background`— visible but not focused; drip-feed frames.
 * - `hidden`    — minimised or parked in the tray; stop rendering entirely.
 *
 * WebView2 does not reliably flip `document.visibilityState` when Tauri hides
 * the native window, so `src-tauri/src/lib.rs` emits the real state and the DOM
 * events act as a fallback for `npm run dev` in a browser.
 */
export type WindowActivity = "active" | "background" | "hidden";

const HIDDEN_CLASS = "app-hidden";

let visible = true;
let focused = true;
let current: WindowActivity = "active";
let started = false;

const listeners = new Set<() => void>();

function compute(): WindowActivity {
  if (!visible) return "hidden";
  return focused ? "active" : "background";
}

function publish() {
  document.documentElement.classList.toggle(HIDDEN_CLASS, !visible);

  const next = compute();
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

function setVisible(next: boolean) {
  if (visible === next) return;
  visible = next;
  publish();
}

function setFocused(next: boolean) {
  if (focused === next) return;
  focused = next;
  publish();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  visible = document.visibilityState === "visible";
  focused = document.hasFocus();
  current = compute();

  document.addEventListener("visibilitychange", () => {
    setVisible(document.visibilityState === "visible");
  });
  window.addEventListener("focus", () => setFocused(true));
  window.addEventListener("blur", () => setFocused(false));

  whenTauri(() => {
    void (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        await listen<boolean>("bloom://visible", (event) => {
          setVisible(event.payload !== false);
        });
        await listen<boolean>("bloom://focused", (event) => {
          setFocused(event.payload !== false);
        });
      } catch {
        // Web build / missing IPC — DOM events already cover us.
      }
    })();
  });
}

export function getWindowActivity(): WindowActivity {
  start();
  return current;
}

export function subscribeWindowActivity(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWindowActivity(): WindowActivity {
  return useSyncExternalStore(
    subscribeWindowActivity,
    getWindowActivity,
    () => "active" as const,
  );
}
