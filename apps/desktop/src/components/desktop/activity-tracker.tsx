"use client";

import { useEffect, useRef } from "react";
import { useRealtime } from "@/components/realtime/realtime-provider";
import { ingestActivitySegments } from "@/lib/activity";
import {
  desktopAppLabel,
  getDesktopActivityStatus,
  setDesktopActivityEnabled,
  takeDesktopActivitySegments,
} from "@/lib/desktop-activity";
import { setMyStatus } from "@/lib/status";
import { STATUS_NOTE_MAX } from "@/lib/status-types";
import { requestActivityRefresh } from "@/lib/refresh";
import { isTauri, whenTauri } from "@/lib/tauri";

/** How often to drain Rust segments onto the socket. */
const FLUSH_EVERY_MS = 15_000;
/**
 * How often to mirror the foreground app into garden status. The Rust sampler
 * only advances every couple of seconds, so polling faster than this just
 * burned IPC round-trips while the app sat in the tray.
 */
const STATUS_EVERY_MS = 10_000;

export function ActivityTracker() {
    const { connected, send, activityTrackingEnabled } = useRealtime();
  const flushing = useRef(false);
  const enabledRef = useRef(false);
  const connectedRef = useRef(connected);
    const lastStatusKey = useRef<string | null>(null);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    if (activityTrackingEnabled === null) return;
    enabledRef.current = activityTrackingEnabled;
    void setDesktopActivityEnabled(activityTrackingEnabled);
    if (!activityTrackingEnabled) {
      lastStatusKey.current = null;
    }
  }, [activityTrackingEnabled]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let started = false;

    async function flush() {
      if (cancelled || flushing.current || !enabledRef.current) return;
      if (!connectedRef.current) return;
      flushing.current = true;
      try {
        const segments = await takeDesktopActivitySegments();
        if (segments.length === 0 || cancelled) return;

        const sent = send({ type: "activity-ingest", data: { segments } });
        if (!sent) {
          await ingestActivitySegments(segments);
          requestActivityRefresh();
        }
      } catch {
        // best-effort
      } finally {
        flushing.current = false;
      }
    }

    function start() {
      if (started || cancelled) return;
      started = true;
      void flush();
      timer = window.setInterval(() => void flush(), FLUSH_EVERY_MS);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") {
        void flush();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);

    let stopWatch: (() => void) | undefined;
    if (isTauri()) {
      start();
    } else {
      stopWatch = whenTauri(() => {
        if (!cancelled) start();
      });
    }

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stopWatch?.();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [send]);

  // Kick a flush when tracking turns on or the socket reconnects.
  useEffect(() => {
    if (!connected || activityTrackingEnabled !== true) return;
    if (!isTauri()) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled || flushing.current || !enabledRef.current) return;
      flushing.current = true;
      void (async () => {
        try {
          const segments = await takeDesktopActivitySegments();
          if (segments.length === 0 || cancelled) return;
          const sent = send({ type: "activity-ingest", data: { segments } });
          if (!sent) {
            await ingestActivitySegments(segments);
            requestActivityRefresh();
          }
        } catch {
          // best-effort
        } finally {
          flushing.current = false;
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [connected, activityTrackingEnabled, send]);

  // Mirror the foreground app into presence status for the garden.
  useEffect(() => {
    if (activityTrackingEnabled !== true) return;

    let cancelled = false;
    let timer = 0;

    async function syncStatus() {
      if (cancelled || !enabledRef.current) return;
      try {
        const status = await getDesktopActivityStatus();
        const current = status?.current;
        if (!current) return;

        const key = current.idle
          ? "idle"
          : `${current.processName ?? ""}|${current.appName ?? ""}`;
        if (key === lastStatusKey.current) return;
        lastStatusKey.current = key;

        if (current.idle) {
          await setMyStatus({ preset: "away", note: null });
          return;
        }

        const note = desktopAppLabel(current).slice(0, STATUS_NOTE_MAX);
        await setMyStatus({ preset: "working", note });
      } catch {
        // best-effort
      }
    }

    function start() {
      void syncStatus();
      timer = window.setInterval(() => void syncStatus(), STATUS_EVERY_MS);
    }

    let stopWatch: (() => void) | undefined;
    if (isTauri()) {
      start();
    } else {
      stopWatch = whenTauri(() => {
        if (!cancelled) start();
      });
    }

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stopWatch?.();
    };
  }, [activityTrackingEnabled]);

  return null;
}
