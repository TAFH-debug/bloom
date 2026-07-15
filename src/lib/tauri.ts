type BloomWindow = Window & {
  isTauri?: boolean;
  __BLOOM_DESKTOP__?: boolean;
  __TAURI_INTERNALS__?: unknown;
  __TAURI__?: unknown;
};

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as BloomWindow;
  return Boolean(
    w.__BLOOM_DESKTOP__ ||
      w.isTauri ||
      w.__TAURI_INTERNALS__ ||
      w.__TAURI__,
  );
}

/** Enable desktop chrome as soon as the Tauri inject flag appears. */
export function whenTauri(onReady: () => void, attempts = 80): () => void {
  if (typeof window === "undefined") return () => {};

  let cancelled = false;
  let tries = 0;
  let timer = 0;

  const done = () => {
    if (cancelled) return;
    onReady();
  };

  const tick = () => {
    if (cancelled) return;
    if (isTauri()) {
      done();
      return;
    }
    tries += 1;
    if (tries >= attempts) return;
    timer = window.setTimeout(tick, 25);
  };

  tick();

  return () => {
    cancelled = true;
    if (timer) window.clearTimeout(timer);
  };
}
