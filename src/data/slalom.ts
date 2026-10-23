/**
 * The Ninja Slalom, the Endless Isle's ski run down the ninjas' snow peak, part five of the owner's plan (2026-10-23:
 * "All your picks"): up the chairlift, then down a run seen from just behind the skier (entities/slalom.ts). Here: the
 * runs, what they are like, and what the run gives and takes. One run so far, the Bunny Slope; the Fox Run and the Doom
 * Drop, with the medals and the snow monster, come with part ten.
 */

/** The runs, each marked as ski runs are, green the easiest. */
export type RunKey = 'bunny';
export type Run = {
  name: string;
  mark: 'green' | 'blue' | 'black';
  /** The course is laid out from this, the same every time it is skied. */
  seed: number;
  /** Metres from the start gate to the finish. */
  len: number;
  /** Half the piste's width in metres: past this, soft snow banks and the pines. */
  half: number;
  /** How wide each gate is, between its two poles, and the gaps between gates. */
  gateW: number;
  gapMin: number;
  gapMax: number;
  /** How far the gates swing either side of the middle. */
  swing: number;
  /** Jumps along the way, and how wide each ramp is. */
  jumps: number;
  rampW: number;
};
export const RUNS: Readonly<Record<RunKey, Run>> = {
  bunny: {
    name: 'Bunny Slope',
    mark: 'green',
    seed: 1301,
    len: 620,
    half: 8,
    gateW: 5,
    gapMin: 30,
    gapMax: 38,
    swing: 2.8,
    jumps: 3,
    rampW: 5,
  },
};

/** Seconds added for a gate gone round, not through; taken off for a trick landed. */
export const GATE_MISS = 2;
export const TRICK_BONUS = 1;
/** Coins for each paper lantern sliced on the way down. */
export const LANTERN_COINS = 10;

/** A run's best times, by run, in seconds, and how many runs have been skied. */
export type Slalom = { runs: number; best: Partial<Record<RunKey, number>> };
/** More runs than anyone will ski; a time no run takes. */
const RUNS_MAX = 99999;
const TIME_MAX = 3600;
/** A save's slalom, anything that is not a count or a time read as none; undefined when no run has been skied. */
export function parseSlalom(v: unknown): Slalom | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const n = Math.floor(Number(o.runs));
  const runs = Number.isFinite(n) ? Math.max(0, Math.min(RUNS_MAX, n)) : 0;
  if (!runs) return undefined;
  const best: Partial<Record<RunKey, number>> = {};
  const b = o.best && typeof o.best === 'object' ? (o.best as Record<string, unknown>) : {};
  for (const k of Object.keys(RUNS) as RunKey[]) {
    const t = Number(b[k]);
    if (Number.isFinite(t) && t > 0 && t < TIME_MAX) best[k] = Math.round(t * 10) / 10;
  }
  return { runs, best };
}
/** A run skied, in this time: one more run, and the best kept. */
export function skied(s: Slalom | undefined, run: RunKey, time: number): Slalom {
  const was = s ?? { runs: 0, best: {} };
  const t = Math.round(time * 10) / 10;
  const old = was.best[run];
  return {
    runs: Math.min(RUNS_MAX, was.runs + 1),
    best: { ...was.best, [run]: old === undefined ? t : Math.min(old, t) },
  };
}
/** A time as the clock shows it: 47.2, or 1:03.5. */
export function clockOf(t: number): string {
  const tenths = Math.max(0, Math.round(t * 10));
  const m = Math.floor(tenths / 600);
  const s = (tenths % 600) / 10;
  return m ? `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}` : s.toFixed(1);
}
