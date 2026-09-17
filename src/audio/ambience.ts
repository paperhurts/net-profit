/**
 * Ambience: waves, gulls, a calm pad, wind chimes near shore, and dolphins
 * chirping when a pod is close. All procedural, on one bus that ducks under
 * every cue so nothing cute gets stepped on. Designed with the cues in mind:
 * the dolphin whistle lives around 1.4 to 2.4 kHz and ends on C7 and D7, so
 * the pad is rooted on F and nothing here sits in that band for long.
 *
 * The pure helpers at the top are unit-tested; the Ambience class owns the
 * Web Audio graph and is exercised by the browser smoke run.
 */
import type { Phase } from '../world/daycycle';

/* ---------- pure helpers ---------- */

/** Cues push the ambience down by this much, recovering over DUCK_TIME seconds. */
export const DUCK_DEPTH = 0.4;
export const DUCK_TIME = 0.5;

/** Bus gain multiplier given seconds since the last cue. */
export function duckGain(sinceCue: number): number {
  return 1 - DUCK_DEPTH * Math.max(0, 1 - sinceCue / DUCK_TIME);
}

export type WaveMix = {
  /** Level of the low swell, 0..1. */
  swell: number;
  /** Level of the bright wake hiss, 0..1. */
  hiss: number;
  /** Low-pass cutoff for the swell in Hz. */
  cutoff: number;
  /** Seconds per swell; short and shallow inside the dock ring. */
  period: number;
  /** How deep the swell breathes, 0..1. */
  depth: number;
};

/** speedRatio is boat speed over top speed; dockness 0..1 is the dock view; dark 0..1 is night. */
export function waveMix(speedRatio: number, dockness: number, dark: number): WaveMix {
  const s = Math.min(1, Math.max(0, speedRatio));
  const k = Math.min(1, Math.max(0, dockness));
  const n = Math.min(1, Math.max(0, dark));
  return {
    swell: (1 - k * 0.6) * (1 - n * 0.4),
    hiss: s ** 1.5 * 0.8 * (1 - k),
    cutoff: 400 * (1 - n * 0.35),
    period: 7 - 4 * k,
    depth: 0.6 - 0.3 * k,
  };
}

/** Where the swell is in its breath, 0..1, for a time and period. */
export function swellPhase(t: number, period: number): number {
  return 0.5 + 0.5 * Math.sin((Math.PI * 2 * t) / period);
}

/** Wind chimes fade in over the last CHIME_RANGE units to the shore or pier. */
export const CHIME_RANGE = 400;

export function chimeLevel(distToShore: number): number {
  return Math.min(1, Math.max(0, 1 - distToShore / CHIME_RANGE));
}

/** F pentatonic, three octaves up, for the chimes. */
export const CHIME_NOTES = [1396.9, 1568, 1760, 2093, 2349.3, 2793.8] as const;

/** The pad's notes per phase: F2, C3, F3, with an A3 at dawn and dusk and two notes at night. */
export function padNotes(phase: Phase): number[] {
  const F2 = 87.31;
  const C3 = 130.81;
  const F3 = 174.61;
  const A3 = 220;
  if (phase === 'Night') return [F2, C3];
  if (phase === 'Dawn' || phase === 'Dusk') return [F2, C3, F3, A3];
  return [F2, C3, F3];
}

/** Stereo position for something dx, dy from the boat in world units: screen-x leaning. */
export function panFor(dx: number, dy: number): number {
  return Math.min(1, Math.max(-1, (dx - dy) / 400));
}

/** Seconds until the next gull cry: five to twelve. */
export function nextGullCry(r: () => number): number {
  return 5 + r() * 7;
}

/** Seconds until the next dolphin chirp: four to ten. */
export function nextChirp(r: () => number): number {
  return 4 + r() * 6;
}

/** Dolphins chirp when a pod is within this many units. */
export const CHIRP_RANGE = 350;
/** No chirps this long after the escort whistle; that moment is the whistle's. */
export const CHIRP_HOLD_AFTER_WHISTLE = 2;

/* ---------- the bus ---------- */

export type PodSound = { dx: number; dy: number; dist: number; escort: boolean };

export type Snapshot = {
  /** Play at all: the trip has started and sound is on. */
  on: boolean;
  /** Game time in seconds. */
  t: number;
  speedRatio: number;
  dockness: number;
  dark: number;
  phase: Phase;
  /** Distance from the boat to the nearest bit of shore or pier. */
  shoreDist: number;
  /** Awake gulls near enough to be heard, as (dx, dy) from the boat. */
  gulls: { dx: number; dy: number }[];
  pods: PodSound[];
  /** Seconds since the escort whistle last played. */
  sinceWhistle: number;
};

function brownNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buf;
}

export class Ambience {
  private readonly ctx: AudioContext;
  private readonly master: GainNode;
  private readonly swellGain: GainNode;
  private readonly swellFilter: BiquadFilterNode;
  private readonly hissGain: GainNode;
  private readonly padGain: GainNode;
  private readonly padOscs: OscillatorNode[] = [];
  private padTarget: number[] = [];
  private readonly r: () => number;
  private sinceCue = 10;
  private gullTimer: number;
  private chirpTimer: number;
  private level = 0;

  constructor(ctx: AudioContext, destination: AudioNode, r: () => number = Math.random) {
    this.ctx = ctx;
    this.r = r;
    this.gullTimer = nextGullCry(r);
    this.chirpTimer = nextChirp(r);

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(destination);

    // Waves: one brown-noise loop through two paths, the low swell and the bright hiss.
    const noise = ctx.createBufferSource();
    noise.buffer = brownNoise(ctx, 3);
    noise.loop = true;
    this.swellFilter = ctx.createBiquadFilter();
    this.swellFilter.type = 'lowpass';
    this.swellFilter.frequency.value = 400;
    this.swellGain = ctx.createGain();
    this.swellGain.gain.value = 0;
    noise.connect(this.swellFilter).connect(this.swellGain).connect(this.master);
    const hissFilter = ctx.createBiquadFilter();
    hissFilter.type = 'bandpass';
    hissFilter.frequency.value = 1500;
    hissFilter.Q.value = 0.7;
    this.hissGain = ctx.createGain();
    this.hissGain.gain.value = 0;
    noise.connect(hissFilter).connect(this.hissGain).connect(this.master);
    noise.start();

    // The pad: four detuned triangles under a low-pass; notes come from padNotes.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 500;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    padFilter.connect(this.padGain).connect(this.master);
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 87.31;
      o.detune.value = (i - 1.5) * 6;
      const g = ctx.createGain();
      g.gain.value = 0;
      o.connect(g).connect(padFilter);
      o.start();
      this.padOscs.push(o);
      this.padVoiceGains.push(g);
    }
  }

  private readonly padVoiceGains: GainNode[] = [];

  /** Called by the sound module whenever a cue plays. */
  duck(): void {
    this.sinceCue = 0;
  }

  update(dt: number, s: Snapshot): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.sinceCue += dt;
    const target = s.on ? 0.22 * duckGain(this.sinceCue) : 0;
    this.level += (target - this.level) * Math.min(1, dt * 4);
    this.master.gain.setTargetAtTime(this.level, now, 0.05);

    // Waves.
    const w = waveMix(s.speedRatio, s.dockness, s.dark);
    const breath = 1 - w.depth + w.depth * swellPhase(s.t, w.period);
    this.swellGain.gain.setTargetAtTime(0.55 * w.swell * breath, now, 0.1);
    this.swellFilter.frequency.setTargetAtTime(w.cutoff * (0.8 + 0.4 * breath), now, 0.2);
    this.hissGain.gain.setTargetAtTime(0.35 * w.hiss, now, 0.15);

    // The pad: fade voices to the chord for the phase, with a slow chorus.
    const notes = padNotes(s.phase);
    this.padGain.gain.setTargetAtTime(0.16 * (1 - s.dark * 0.3), now, 0.5);
    this.padOscs.forEach((o, i) => {
      const f = notes[i];
      const g = this.padVoiceGains[i];
      if (!g) return;
      if (f !== undefined) {
        if (this.padTarget[i] !== f) {
          o.frequency.setTargetAtTime(f, now, 1.5);
          this.padTarget[i] = f;
        }
        g.gain.setTargetAtTime(0.25, now, 1.2);
        o.detune.setTargetAtTime((i - 1.5) * 6 + Math.sin(s.t * 0.37 + i) * 4, now, 0.3);
      } else {
        g.gain.setTargetAtTime(0, now, 1.2);
      }
    });

    if (!s.on) return;

    // Wind chimes near shore: sparse, quiet, panned toward the island.
    const chime = chimeLevel(s.shoreDist);
    if (chime > 0 && this.r() < dt * 0.5 * chime) {
      const note = CHIME_NOTES[Math.floor(this.r() * CHIME_NOTES.length)] ?? 1396.9;
      this.chime(note, 0.05 * chime, (this.r() - 0.5) * 0.8);
    }

    // Gulls: one cry at a time, only from birds that are around and awake.
    this.gullTimer -= dt;
    if (this.gullTimer <= 0) {
      this.gullTimer = nextGullCry(this.r);
      if (s.gulls.length > 0 && s.dark < 0.5 && s.sinceWhistle > CHIRP_HOLD_AFTER_WHISTLE) {
        const g = s.gulls[Math.floor(this.r() * s.gulls.length)];
        if (g) this.gullCry(panFor(g.dx, g.dy), 1 + Math.floor(this.r() * 3));
      }
    }

    // Dolphins: a soft chirp now and then from a pod that is close.
    this.chirpTimer -= dt;
    if (this.chirpTimer <= 0) {
      this.chirpTimer = nextChirp(this.r);
      const near = s.pods.filter((p) => p.dist < CHIRP_RANGE);
      if (near.length > 0 && s.sinceWhistle > CHIRP_HOLD_AFTER_WHISTLE) {
        const p = near[Math.floor(this.r() * near.length)];
        if (p) this.chirp(panFor(p.dx, p.dy), p.escort && this.r() < 0.4);
      }
    }
  }

  private voice(pan: number): { g: GainNode; t: number } {
    const g = this.ctx.createGain();
    g.gain.value = 0.0001;
    const p = this.ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(this.master);
    return { g, t: this.ctx.currentTime };
  }

  /** A bell: a sine with one bright partial, long decay. */
  private chime(f: number, vol: number, pan: number): void {
    const { g, t } = this.voice(pan);
    for (const [mult, amp, dur] of [
      [1, 1, 1.8],
      [2.76, 0.35, 0.9],
    ] as const) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mult;
      const og = this.ctx.createGain();
      og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  }

  /** A gull: a triangle sliding 1.1 kHz to 700 Hz with a fast tremolo, one to three syllables. */
  private gullCry(pan: number, syllables: number): void {
    const { g, t } = this.voice(pan);
    let at = t;
    for (let i = 0; i < syllables; i++) {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(1100, at);
      o.frequency.exponentialRampToValueAtTime(700, at + 0.25);
      const og = this.ctx.createGain();
      og.gain.value = 0.5;
      o.connect(og).connect(g);
      o.start(at);
      o.stop(at + 0.28);
      // Tremolo as a few quick steps.
      for (let k = 0; k < 5; k++) og.gain.setValueAtTime(k % 2 ? 0.25 : 0.5, at + k * 0.05);
      at += 0.32;
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.setValueAtTime(0.05, at - 0.32 + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, at);
  }

  /** A dolphin: the whistle's rising sine, shorter and softer, sometimes twice. */
  private chirp(pan: number, double: boolean): void {
    const { g, t } = this.voice(pan);
    const one = (at: number, f: number) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, at);
      o.frequency.exponentialRampToValueAtTime(f * 1.4, at + 0.08);
      o.connect(g);
      o.start(at);
      o.stop(at + 0.1);
    };
    one(t, 1400);
    if (double) one(t + 0.14, 1600);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (double ? 0.26 : 0.12));
  }
}
