"use client";

/**
 * Tiny Web Audio sound effects — no audio files. Each effect is a short sequence
 * of oscillator "blips" with a quick volume envelope. Respects a persisted mute
 * setting and unlocks the audio context on the first user gesture (required by
 * browser autoplay policies).
 */

type Wave = OscillatorType;
interface Note {
  freq: number;
  /** Start offset in seconds, relative to the effect start. */
  start: number;
  /** Duration in seconds. */
  dur: number;
  type?: Wave;
  gain?: number;
}

const STORAGE_KEY = "banter:muted";

let ctx: AudioContext | null = null;
let muted = false;
let armed = false;

if (typeof window !== "undefined") {
  try {
    muted = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // localStorage may be unavailable; default to unmuted.
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

const SOUNDS: Record<string, Note[]> = {
  // Someone joined: a friendly little pop.
  join: [{ freq: 587, start: 0, dur: 0.12, type: "sine", gain: 0.18 }],
  // Submit / vote locked: short click.
  click: [{ freq: 880, start: 0, dur: 0.06, type: "square", gain: 0.1 }],
  // Game start: ascending arpeggio.
  start: [
    { freq: 523, start: 0, dur: 0.1 },
    { freq: 659, start: 0.1, dur: 0.1 },
    { freq: 784, start: 0.2, dur: 0.16 },
  ],
  // Reveal: a two-note "ding".
  reveal: [
    { freq: 392, start: 0, dur: 0.12 },
    { freq: 587, start: 0.12, dur: 0.2 },
  ],
  // You scored: coin-style chirp.
  points: [
    { freq: 784, start: 0, dur: 0.09, type: "square", gain: 0.14 },
    { freq: 1047, start: 0.09, dur: 0.14, type: "square", gain: 0.14 },
  ],
  // Final results: little fanfare.
  win: [
    { freq: 523, start: 0, dur: 0.12 },
    { freq: 659, start: 0.12, dur: 0.12 },
    { freq: 784, start: 0.24, dur: 0.12 },
    { freq: 1047, start: 0.36, dur: 0.26 },
  ],
};

export type SoundName = keyof typeof SOUNDS;

function playNotes(notes: Note[]): void {
  if (muted) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") void ac.resume();

  const now = ac.currentTime;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;

    const t0 = now + n.start;
    const peak = n.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);

    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + n.dur + 0.03);
  }
}

export function play(name: SoundName): void {
  const notes = SOUNDS[name];
  if (notes) playNotes(notes);
}

export function playDelayed(name: SoundName, delayMs: number): void {
  setTimeout(() => play(name), delayMs);
}

/** Attach a one-time gesture listener to unlock/resume the audio context. */
export function armAudio(): void {
  if (armed || typeof window === "undefined") return;
  armed = true;
  const resume = () => {
    const ac = getCtx();
    if (ac && ac.state === "suspended") void ac.resume();
  };
  window.addEventListener("pointerdown", resume);
  window.addEventListener("keydown", resume);
}

export function getMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore persistence failures
  }
}
