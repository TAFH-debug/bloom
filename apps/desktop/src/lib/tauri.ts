type TauriGlobals = {
  // Injected by src-tauri/src/lib.rs (initialization_script + on_page_load +
  // a direct eval). Needed because the desktop window loads an external URL,
  // for which Tauri does not expose its own __TAURI_INTERNALS__/__TAURI__.
  __BLOOM_DESKTOP__?: boolean;
  isTauri?: boolean;
  __TAURI_INTERNALS__?: unknown;
  __TAURI__?: unknown;
};

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as Window & TauriGlobals;
  return (
    w.__BLOOM_DESKTOP__ === true ||
    w.isTauri === true ||
    "__TAURI_INTERNALS__" in window ||
    "__TAURI__" in window ||
    navigator.userAgent.includes("Tauri")
  );
}

/**
 * The desktop flags above are eval'd from Rust and can land *after* React has
 * already hydrated and run its mount effects, so a single isTauri() check on
 * mount races the injection and often loses. Poll briefly until the flag shows
 * up, then fire `onReady` exactly once. Returns a cleanup that cancels the poll.
 */
export function whenTauri(onReady: () => void, timeoutMs = 3000): () => void {
  if (typeof window === "undefined") return () => {};
  if (isTauri()) {
    onReady();
    return () => {};
  }

  let cancelled = false;
  let timer = 0;
  const deadline = Date.now() + timeoutMs;

  const tick = () => {
    if (cancelled) return;
    if (isTauri()) {
      onReady();
      return;
    }
    if (Date.now() >= deadline) return;
    timer = window.setTimeout(tick, 30);
  };

  tick();

  return () => {
    cancelled = true;
    if (timer) window.clearTimeout(timer);
  };
}
