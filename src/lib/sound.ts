// Små lydsignaler syntetiseret med Web Audio. Én delt AudioContext genbruges,
// så hurtige svar ikke løber tør for lydkanaler i browseren.

export type Cue =
  "tap" | "select" | "correct" | "wrong" | "streak" | "tick" | "win" | "done";

type Note = {
  /** Frekvens i hertz. */
  f: number;
  /** Starttid i sekunder efter signalets begyndelse. */
  at: number;
  /** Varighed i sekunder. */
  len: number;
  /** Lydstyrke 0-1. */
  gain?: number;
  type?: OscillatorType;
  /** Valgfri glidning mod en anden frekvens. */
  to?: number;
};

const CUES: Record<Cue, Note[]> = {
  tap: [{ f: 420, at: 0, len: 0.05, gain: 0.035, type: "triangle" }],
  select: [{ f: 520, at: 0, len: 0.06, gain: 0.04, type: "triangle" }],
  correct: [
    { f: 660, at: 0, len: 0.11, gain: 0.07, type: "triangle" },
    { f: 990, at: 0.085, len: 0.2, gain: 0.07, type: "triangle" },
  ],
  streak: [
    { f: 660, at: 0, len: 0.09, gain: 0.065, type: "triangle" },
    { f: 880, at: 0.07, len: 0.09, gain: 0.065, type: "triangle" },
    { f: 1320, at: 0.14, len: 0.26, gain: 0.07, type: "triangle" },
  ],
  wrong: [
    { f: 233, at: 0, len: 0.13, gain: 0.06, type: "sine", to: 196 },
    { f: 175, at: 0.11, len: 0.22, gain: 0.06, type: "sine", to: 147 },
  ],
  tick: [{ f: 880, at: 0, len: 0.03, gain: 0.025, type: "square" }],
  win: [
    { f: 523, at: 0, len: 0.12, gain: 0.07, type: "triangle" },
    { f: 659, at: 0.1, len: 0.12, gain: 0.07, type: "triangle" },
    { f: 784, at: 0.2, len: 0.12, gain: 0.07, type: "triangle" },
    { f: 1047, at: 0.3, len: 0.42, gain: 0.08, type: "triangle" },
  ],
  done: [
    { f: 440, at: 0, len: 0.14, gain: 0.06, type: "triangle" },
    { f: 554, at: 0.12, len: 0.3, gain: 0.06, type: "triangle" },
  ],
};

let context: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  if (context) return context;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

export function playCue(cue: Cue, enabled: boolean) {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    // Browsere sætter lyd på pause, indtil brugeren har rørt siden.
    if (ctx.state === "suspended") void ctx.resume();
    const start = ctx.currentTime + 0.005;
    for (const note of CUES[cue]) {
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      const from = start + note.at;
      const peak = note.gain ?? 0.05;
      oscillator.type = note.type ?? "sine";
      oscillator.frequency.setValueAtTime(note.f, from);
      if (note.to)
        oscillator.frequency.exponentialRampToValueAtTime(
          note.to,
          from + note.len,
        );
      envelope.gain.setValueAtTime(0.0001, from);
      envelope.gain.exponentialRampToValueAtTime(peak, from + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, from + note.len);
      oscillator.connect(envelope).connect(ctx.destination);
      oscillator.start(from);
      oscillator.stop(from + note.len + 0.02);
    }
  } catch {
    // Lyd er aldrig vigtig nok til at afbryde spillet.
  }
}
