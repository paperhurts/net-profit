/**
 * The game's sounds: raw Web Audio oscillators, moved verbatim from the
 * prototype script and given names. Every cue's numbers are locked to the
 * legacy file by tests/unit/sfx.test.ts, because the cues are part of the
 * game's character and must not drift: the driftwood blip and the dolphin
 * whistle have fans. New sound (music, ambience) is a separate layer.
 */

export type Wave = 'sine' | 'square' | 'sawtooth' | 'triangle';

/** One scheduled oscillator: frequency, seconds, wave, volume, pitch slide, delay. */
export type Note = [f: number, d: number, type: Wave, vol: number, slide: number, delay: number];

let ac: AudioContext | null = null;
let muted = false;

/** Create the context on the first user gesture and wake it if the browser slept it. */
export function unlock(): void {
  if (!ac) {
    try {
      const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
      ac = new (window.AudioContext || w.webkitAudioContext || AudioContext)();
    } catch {
      // No audio on this device; the game is fine without it.
    }
  }
  if (ac && ac.state === 'suspended') ac.resume();
}

export function setMuted(m: boolean): void {
  muted = m;
}

export function isMuted(): boolean {
  return muted;
}

/** The context, once unlock() has created it; the ambience bus hangs off it. */
export function getContext(): AudioContext | null {
  return ac;
}

let onCue: (() => void) | null = null;

/** Called every time a cue actually plays, so ambience can duck under it. */
export function setCueListener(fn: (() => void) | null): void {
  onCue = fn;
}

function play(f: number, d: number, type: Wave, vol: number, slide: number, delay: number): void {
  if (!ac || muted) return;
  onCue?.();
  try {
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + d + 0.03);
  } catch {
    // A note that fails to schedule is not worth interrupting a frame for.
  }
}

let out: (...note: Note) => void = play;

/** Route notes somewhere else, for tests; null restores playback. */
export function captureNotes(fn: ((...note: Note) => void) | null): void {
  out = fn ?? play;
}

/** Play one note with the prototype's defaults. */
export function tone(
  f: number,
  d = 0.12,
  type: Wave = 'sine',
  vol = 0.1,
  slide = 0,
  delay = 0,
): void {
  out(f, d, type, vol, slide, delay);
}

/** Every cue in the game, by what happened. */
export const cues = {
  /** A setting or paint chosen. */
  click(): void {
    tone(700, 0.08, 'triangle', 0.08);
  },
  /** Cannot afford it, or the palace has not unlocked it. */
  denied(): void {
    tone(180, 0.12, 'square', 0.05);
  },
  /** The sound toggle itself. */
  toggleSound(): void {
    tone(660, 0.08, 'triangle', 0.08);
  },
  /** Cast off from the intro. */
  castOff(): void {
    tone(392, 0.12, 'triangle', 0.1);
    tone(587, 0.2, 'triangle', 0.1, 0, 0.1);
  },
  /** An upgrade bought. */
  upgrade(): void {
    tone(523, 0.1, 'triangle', 0.1);
    tone(659, 0.1, 'triangle', 0.1, 0, 0.08);
    tone(784, 0.16, 'triangle', 0.1, 0, 0.16);
  },
  /** The boat grew a tier. */
  tierUp(): void {
    tone(392, 0.12, 'triangle', 0.1, 0, 0.25);
    tone(523, 0.12, 'triangle', 0.1, 0, 0.35);
    tone(784, 0.3, 'triangle', 0.1, 0, 0.45);
  },
  /** A palace stage built. */
  build(): void {
    [523, 659, 784, 1047].forEach((f, i) => {
      tone(f, 0.16, 'triangle', 0.1, 0, i * 0.11);
    });
  },
  /** A fish in the net; pitch climbs with the combo and the species. */
  fish(combo: number, sp: number): void {
    tone(500 + combo * 34 + sp * 60, 0.08, 'sine', 0.07);
  },
  holdFull(): void {
    tone(330, 0.18, 'triangle', 0.1);
    tone(262, 0.25, 'triangle', 0.1, 0, 0.15);
  },
  /** One fish sold at the dock; pitch climbs through the sale. */
  sale(saleN: number, sp: number): void {
    tone(620 + Math.min(saleN, 30) * 16 + sp * 40, 0.07, 'triangle', 0.07);
  },
  orderFilled(): void {
    tone(659, 0.1, 'triangle', 0.1, 0, 0.1);
    tone(880, 0.1, 'triangle', 0.1, 0, 0.2);
    tone(1319, 0.3, 'triangle', 0.1, 0, 0.3);
  },
  /** The whole hold sold. */
  sold(): void {
    tone(880, 0.1, 'triangle', 0.1);
    tone(1175, 0.22, 'triangle', 0.1, 0, 0.09);
  },
  pirateChase(): void {
    tone(196, 0.2, 'sawtooth', 0.06);
    tone(185, 0.3, 'sawtooth', 0.06, 0, 0.2);
  },
  pirateSteal(): void {
    tone(220, 0.35, 'sawtooth', 0.09, 0.4);
    tone(110, 0.4, 'square', 0.06, 0.5, 0.1);
  },
  sharkWarning(): void {
    tone(150, 0.25, 'sawtooth', 0.05);
    tone(140, 0.25, 'sawtooth', 0.05, 0, 0.3);
  },
  sharkCaught(): void {
    tone(330, 0.12, 'triangle', 0.1);
    tone(494, 0.12, 'triangle', 0.1, 0, 0.1);
    tone(740, 0.25, 'triangle', 0.1, 0, 0.2);
  },
  netTorn(): void {
    tone(200, 0.3, 'sawtooth', 0.08, 0.35);
  },
  salvage(): void {
    tone(784, 0.09, 'triangle', 0.09);
    tone(1047, 0.16, 'triangle', 0.09, 0, 0.08);
  },
  /** Dawn, dusk or night arriving. */
  phaseChange(): void {
    tone(660, 0.2, 'sine', 0.06);
    tone(990, 0.35, 'sine', 0.05, 0, 0.18);
  },
  rareCaught(): void {
    [784, 988, 1175, 1568].forEach((f, i) => {
      tone(f, 0.18, 'triangle', 0.1, 0, i * 0.09);
    });
  },
  /** The leviathan passing close. */
  leviathan(): void {
    tone(55, 1.4, 'sine', 0.14);
    tone(41, 1.8, 'sine', 0.12, 0, 0.3);
  },
  /** Driftwood picked up. The kid's favourite; do not touch. */
  driftwood(): void {
    tone(233, 0.07, 'square', 0.05);
    tone(349, 0.1, 'square', 0.05, 0, 0.07);
  },
  /** Dolphins joining as escort. The whistle; also do not touch. */
  dolphins(): void {
    tone(1400, 0.09, 'sine', 0.05, 1.5);
    tone(1800, 0.12, 'sine', 0.05, 1.3, 0.1);
  },
  /** Pushed back at the edge of the boat's range. */
  rangeEdge(): void {
    tone(160, 0.2, 'triangle', 0.06);
  },
  /** The net has scooped its first jellyfish: a soft, wobbly squelch. */
  jellies(): void {
    tone(300, 0.18, 'sine', 0.06, 0.7);
    tone(220, 0.22, 'sine', 0.06, 0.8, 0.12);
  },
  /** The jellyfish shaken out at the dock: three quick shakes. */
  jelliesOut(): void {
    tone(520, 0.05, 'triangle', 0.05);
    tone(440, 0.05, 'triangle', 0.05, 1, 0.07);
    tone(360, 0.07, 'triangle', 0.05, 1, 0.14);
  },
  /** The cast: the whirr of line going out, and the plop. */
  cast(): void {
    tone(520, 0.1, 'sine', 0.05, 1.9);
    tone(880, 0.08, 'sine', 0.04, 0.5, 0.14);
  },
  /** The snook shakes its head and the reel ticks: it runs next, so ease off. */
  headShake(): void {
    tone(660, 0.04, 'square', 0.04);
    tone(660, 0.04, 'square', 0.04, 1, 0.09);
    tone(620, 0.05, 'square', 0.04, 1, 0.18);
  },
  /** Fish on. */
  strike(): void {
    tone(740, 0.07, 'square', 0.06);
    tone(988, 0.14, 'square', 0.06, 1, 0.08);
  },
  /** The line parts, or finds the piling. */
  lineSnap(): void {
    tone(900, 0.05, 'square', 0.07, 0.4);
    tone(180, 0.24, 'triangle', 0.07, 0.6, 0.05);
  },
  /** A snook on the deck: two notes for a short, the whole run for one worth keeping. */
  snookLanded(keeper: boolean): void {
    const notes = keeper ? [523, 659, 784, 1047, 1319] : [523, 784];
    notes.forEach((f, i) => {
      tone(f, 0.16, 'triangle', 0.07, 1, i * 0.1);
    });
  },
  /** A manta coming down: a low whump, with an octave on top for speakers that cannot play the bottom. */
  whump(): void {
    tone(110, 0.32, 'sine', 0.12, 0.45);
    tone(220, 0.2, 'triangle', 0.05, 0.5);
    tone(70, 0.4, 'triangle', 0.07, 0.6, 0.03);
  },
  /** The dog on the pier, barking at the horizon: two short yaps. */
  bark(): void {
    tone(520, 0.06, 'square', 0.05, 1.3);
    tone(430, 0.08, 'square', 0.05, 1.25, 0.11);
  },
};

export type Cue = keyof typeof cues;
