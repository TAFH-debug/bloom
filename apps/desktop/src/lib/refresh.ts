/** Lightweight refresh bus to replace Next.js router.refresh(). */

const EVENT = "bloom:refresh";
const ACTIVITY_EVENT = "bloom:activity-refresh";

export function requestRefresh() {
  window.dispatchEvent(new Event(EVENT));
}

export function onRefresh(handler: () => void) {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/** Activity ingest only — do not reload habits/garden shells. */
export function requestActivityRefresh() {
  window.dispatchEvent(new Event(ACTIVITY_EVENT));
}

export function onActivityRefresh(handler: () => void) {
  window.addEventListener(ACTIVITY_EVENT, handler);
  return () => window.removeEventListener(ACTIVITY_EVENT, handler);
}
