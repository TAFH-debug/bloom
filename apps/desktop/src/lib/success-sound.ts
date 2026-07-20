let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  destination: AudioNode,
  {
    freq,
    start,
    duration,
    type = "sine",
    peak = 0.85,
  }: {
    freq: number;
    start: number;
    duration: number;
    type?: OscillatorType;
    peak?: number;
  },
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

/** Bright major-arpeggio success chime (no external audio file). */
export async function playSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
  master.connect(ctx.destination);

  // C5 → E5 → G5 → C6 major flourish
  const notes: Array<{
    freq: number;
    start: number;
    duration: number;
    type: OscillatorType;
    peak: number;
  }> = [
    { freq: 523.25, start: 0, duration: 0.16, type: "triangle", peak: 0.7 },
    { freq: 659.25, start: 0.07, duration: 0.18, type: "sine", peak: 0.85 },
    { freq: 783.99, start: 0.14, duration: 0.22, type: "triangle", peak: 0.75 },
    { freq: 1046.5, start: 0.22, duration: 0.35, type: "sine", peak: 0.95 },
  ];

  for (const note of notes) {
    playTone(ctx, master, {
      freq: note.freq,
      start: now + note.start,
      duration: note.duration,
      type: note.type,
      peak: note.peak,
    });
  }

  // Soft harmonic sparkle on the final note
  playTone(ctx, master, {
    freq: 1568,
    start: now + 0.24,
    duration: 0.28,
    type: "sine",
    peak: 0.28,
  });
}
