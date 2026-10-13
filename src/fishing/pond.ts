/**
 * Fishing at island 10's pond, the kid's: "Can fish at the pond and it's peaceful with bird song". Stand at the
 * pond's edge and cast: the float lands out on the still water and sits, bobbing. After a while it twitches (a
 * nibble), then goes under: that is the moment to reel in, and a little over a second and a half to do it in. A
 * fish that is missed just swims off, and another comes along to the same float; reeling in too soon changes
 * nothing. Nothing here goes wrong, on purpose: the pond is for sitting by. Four fish live in it, the commoner
 * the smaller: bluegills, yellow perch, largemouth bass and the odd channel catfish.
 */

import { BASS, BLUEGILL, CATFISH, PERCH } from '../data/tuning';

/** Within this of the pond's edge, ashore, there is a cast to be had. */
export const POND_REACH = 30;
/** The float lands this far in from the edge, toward the middle. */
export const FLOAT_IN = 30;
/** Seconds the float sits before a fish comes, at least and at most. */
export const POND_WAIT: readonly [number, number] = [2.2, 5];
/** The nibble before a bite: the float twitches this long. */
export const NIBBLE_T = 0.9;
/** The float is under this long: reel in then. Generous, for a peaceful pond. */
export const POND_BITE_T = 1.8;
/** The pond's fish and how often each bites, out of ten. */
export const POND_FISH: readonly { sp: number; w: number }[] = [
  { sp: BLUEGILL, w: 4 },
  { sp: PERCH, w: 3 },
  { sp: BASS, w: 2 },
  { sp: CATFISH, w: 1 },
];

/** Which fish takes the bait, from r in 0..1. */
export function pondFish(r: number): number {
  const total = POND_FISH.reduce((s, f) => s + f.w, 0);
  let at = r * total;
  for (const f of POND_FISH) {
    if (at < f.w) return f.sp;
    at -= f.w;
  }
  return BLUEGILL;
}

/** Where the float lands from a figure at x, y by a round pond, or null if the figure is not at its edge. */
export function castSpot(
  pond: { x: number; y: number; r: number },
  x: number,
  y: number,
): { x: number; y: number } | null {
  const d = Math.hypot(x - pond.x, y - pond.y);
  if (d < 1 || d - pond.r > POND_REACH) return null;
  const k = Math.max(0, pond.r - FLOAT_IN) / d;
  return { x: pond.x + (x - pond.x) * k, y: pond.y + (y - pond.y) * k };
}

export type PondState = 'idle' | 'wait' | 'nibble' | 'bite';

export class PondLine {
  state: PondState = 'idle';
  /** Seconds into the state. */
  t = 0;
  /** The fish on the bait, from the nibble on. */
  sp = BLUEGILL;
  private wait = 0;

  /** Cast the float out; r in 0..1 is how long until a fish comes. */
  cast(r: number): void {
    this.state = 'wait';
    this.t = 0;
    this.wait = POND_WAIT[0] + r * (POND_WAIT[1] - POND_WAIT[0]);
  }

  /**
   * Reel in: the fish if the float is under, and the line is in again. Any sooner and nothing happens at all; the
   * game says to wait for it.
   */
  reel(): 'caught' | 'early' | null {
    if (this.state === 'idle') return null;
    if (this.state !== 'bite') return 'early';
    this.state = 'idle';
    return 'caught';
  }

  /** Give up the line, as when the figure walks off. */
  stop(): void {
    this.state = 'idle';
  }

  /**
   * Time passing, with r1 for which fish comes and r2 for the wait after one swims off: 'nibble' as the float
   * starts to twitch, 'bite' as it goes under, 'away' when a fish that was not reeled in swims off (and the float
   * sits waiting again for the next).
   */
  update(dt: number, r1: number, r2: number): 'nibble' | 'bite' | 'away' | null {
    if (this.state === 'idle') return null;
    this.t += dt;
    if (this.state === 'wait' && this.t >= this.wait) {
      this.state = 'nibble';
      this.t = 0;
      this.sp = pondFish(r1);
      return 'nibble';
    }
    if (this.state === 'nibble' && this.t >= NIBBLE_T) {
      this.state = 'bite';
      this.t = 0;
      return 'bite';
    }
    if (this.state === 'bite' && this.t >= POND_BITE_T) {
      this.cast(r2);
      return 'away';
    }
    return null;
  }
}
