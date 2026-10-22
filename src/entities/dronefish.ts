/**
 * Fishing from the drone, part three of the owner's drone (2026-10-22: "to then fish via the drone", after a short of a
 * man fishing with one): out over island 11's black lagoon, where no boat can go, with a jewel beetle from the traps
 * on a line under the drone. Seen from behind it, as the flight through the jungle is: it flies on slowly by itself
 * down the lagoon, the thumb steering it left and right. Fish rise ahead, rings spreading on the black water.
 *
 * Drop the beetle with the drone over a rise and the line goes down; a moment later the fish strikes (an arowana
 * leaps right out of the water for it, an archerfish spits it down first) and there are nearly two seconds to reel it
 * in. Reeled in, it is caught and the beetle is gone; too slow, the fish lets go and the beetle is still on the line.
 * Dropped on empty water, the beetle is just wound back up. Nothing is lost but a little time: gentle, like the rest.
 */

import { clamp, rng } from '../core/math';
import { ARCHERFISH, AROWANA } from '../data/tuning';

/** Half the lagoon's width, and how far down it a pass goes, in metres. */
export const LAGOON_HALF = 7;
export const LAGOON_LEN = 220;
/** The drone's height over the water, and its slow cruise and sideways speed. */
export const FISH_Y = 2.4;
export const FISH_CRUISE = 6;
export const FISH_SIDE = 6;
/** How quickly it answers the thumb (per second). */
const AGILITY = 6;
/** No rises this near the start; then one every so far. */
export const RISE_FROM = 24;
export const RISE_GAP: readonly [number, number] = [14, 22];
/** Within this of a rise across, and from a little past it to a little short of it along, the beetle lands on it: a
 * generous moment, near a second at the cruise. */
export const RISE_REACH = 2;
export const RISE_ALONG: readonly [number, number] = [-2, 3.5];
/** Seconds the line takes going down, the fish to strike, and to reel it in once it has. */
export const DROP_T = 0.7;
export const STRIKE_T = 0.9;
export const REEL_T = 1.8;
/** Out of ten rises, how many are arowanas; the rest are archerfish. */
export const AROWANA_IN_TEN = 3;

export type Rise = { z: number; x: number; sp: number; taken: boolean };
/** Flying on; the line going down; the fish striking; its moment to be reeled in; over. */
export type FishState = 'fly' | 'drop' | 'strike' | 'reel' | 'done';
/** What happened: a fish striking at the beetle, caught, letting go, or a beetle dropped on empty water and wound up. */
export type FishEvent = 'strike' | 'caught' | 'letgo' | 'empty';

/** The rises down the lagoon: from its seed, the same every pass. */
export function layRises(seed: number, len = LAGOON_LEN): Rise[] {
  const R = rng(seed);
  const out: Rise[] = [];
  for (let z = RISE_FROM; z < len - 10; z += RISE_GAP[0] + R() * (RISE_GAP[1] - RISE_GAP[0])) {
    const x = (R() * 2 - 1) * (LAGOON_HALF - 1.5);
    out.push({ z, x, sp: R() * 10 < AROWANA_IN_TEN ? AROWANA : ARCHERFISH, taken: false });
  }
  return out;
}

export class DroneFishing {
  x = 0;
  readonly y = FISH_Y;
  z = 0;
  vx = 0;
  state: FishState = 'fly';
  /** Seconds into the state. */
  t = 0;
  /** The rise the beetle went down on, if any. */
  at: Rise | null = null;
  /** How far across a rise the beetle reaches: longer with the longer line. */
  reach = RISE_REACH;
  /** Beetles aboard, and the fish caught this pass by species. */
  beetles: number;
  readonly caught: number[] = [];
  readonly rises: Rise[];
  onEvent: ((what: FishEvent, sp: number) => void) | null = null;
  onEnd: (() => void) | null = null;

  constructor(
    beetles: number,
    readonly seed = 1171,
    readonly len = LAGOON_LEN,
  ) {
    this.beetles = beetles;
    this.rises = layRises(seed, len);
  }

  get progress(): number {
    return clamp(this.z / this.len, 0, 1);
  }

  /** The rise right under the drone now, if there is one still there. */
  riseUnder(): Rise | null {
    return (
      this.rises.find(
        (r) =>
          !r.taken &&
          Math.abs(r.x - this.x) < this.reach &&
          r.z - this.z > RISE_ALONG[0] &&
          r.z - this.z < RISE_ALONG[1],
      ) ?? null
    );
  }

  /** The button: down goes the beetle, flying; reeling it in when a fish has it. */
  press(): void {
    if (this.state === 'fly' && this.beetles > 0) {
      this.at = this.riseUnder();
      this.go('drop');
    } else if (this.state === 'reel') this.land();
  }

  step(dt: number, sx: number): void {
    if (this.state === 'done') return;
    this.t += dt;
    const k = Math.min(1, AGILITY * dt);
    // Hovering while the line is down; on down the lagoon otherwise.
    const hold = this.state !== 'fly';
    this.vx += ((hold ? 0 : clamp(sx, -1, 1) * FISH_SIDE) - this.vx) * k;
    this.x = clamp(this.x + this.vx * dt, -LAGOON_HALF + 0.6, LAGOON_HALF - 0.6);
    if (!hold) this.z += FISH_CRUISE * dt;
    if (this.state === 'drop' && this.t >= DROP_T) {
      if (this.at) {
        this.go('strike');
        this.onEvent?.('strike', this.at.sp);
      } else {
        this.onEvent?.('empty', -1);
        this.go('fly');
      }
    } else if (this.state === 'strike' && this.t >= STRIKE_T) this.go('reel');
    else if (this.state === 'reel' && this.t >= REEL_T) {
      const r = this.at;
      this.at = null;
      if (r) r.taken = true;
      this.onEvent?.('letgo', r ? r.sp : -1);
      this.go('fly');
    }
    if (this.state === 'fly' && this.z >= this.len) {
      this.state = 'done';
      this.onEnd?.();
    }
  }

  private land(): void {
    const r = this.at;
    this.at = null;
    if (r) {
      r.taken = true;
      this.beetles--;
      this.caught.push(r.sp);
      this.onEvent?.('caught', r.sp);
    }
    this.go('fly');
  }

  private go(s: FishState): void {
    this.state = s;
    this.t = 0;
  }
}
