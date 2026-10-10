/**
 * The seine, the husband's and the owner's: "drop a buoy, drive a loop around a
 * school, come back to the buoy, and everything inside is yours", opened by
 * island 2's gear shed. The buoy goes over at the stern and the seine pays out
 * behind the boat as a line of corks, wherever it goes. Bring the stern back to
 * the buoy and the loop closes: every fish inside it is hauled aboard. Skill,
 * not volume: a tight loop round a school keeps every fish in it, and a lazy
 * wide one lets some slip out under the loose net; and the seine is only so
 * long, so a loop that wanders runs out before it closes. While the seine is
 * out the towed net is lifted and catches nothing, as no boat does both at once:
 * otherwise circling a school would sweep it up with the towed net before the
 * loop could close round it.
 */

/** How much seine there is: a loop must close inside this length. */
export const SEINE_LEN = 1500;
/** At least this much paid out before coming back to the buoy closes it, so dropping it does not. */
export const SEINE_MIN = 400;
/** The stern this near the buoy closes the loop. */
export const CLOSE_R = 60;
/** A cork every this much along the way. */
export const CORK_GAP = 16;
/** A loop up to this many times the area of the schools in it keeps every fish; wider keeps fewer. */
export const LOOSE = 3;
/** The least share a loop with fish in it keeps, however wide. */
export const KEEP_MIN = 0.4;
/** Seconds between fish coming aboard as the seine is hauled. */
export const HAUL_GAP = 0.05;

type Point = { x: number; y: number };

/** What paying out came to this step: the loop closed, the seine ran out, or neither. */
export type SeineEvent = 'closed' | 'spent' | null;

export class Seine {
  state: 'stowed' | 'out' = 'stowed';
  /** The buoy, where the seine starts and where it closes. */
  buoy: Point = { x: 0, y: 0 };
  /** The corks, from the buoy along the boat's way; the first is the buoy. */
  pts: Point[] = [];
  /** How much is paid out. */
  paid = 0;

  get out(): boolean {
    return this.state === 'out';
  }

  /** How much is left on the boat, 0..1. */
  get left(): number {
    return this.out ? Math.max(0, 1 - this.paid / SEINE_LEN) : 1;
  }

  /** Paid out far enough that coming back to the buoy closes it. */
  get armed(): boolean {
    return this.out && this.paid >= SEINE_MIN;
  }

  /** Over the side at the stern. */
  drop(x: number, y: number): void {
    this.state = 'out';
    this.buoy = { x, y };
    this.pts = [{ x, y }];
    this.paid = 0;
  }

  /** Back aboard, empty or after a haul. */
  stow(): void {
    this.state = 'stowed';
    this.pts = [];
    this.paid = 0;
  }

  /**
   * Pay out after the stern, now at (x, y): a cork every CORK_GAP. Back at the buoy with enough out, the
   * loop closes; out of seine first, it is spent. Either way the game hauls it and stows it.
   */
  follow(x: number, y: number): SeineEvent {
    if (!this.out) return null;
    const last = this.pts[this.pts.length - 1] as Point;
    const d = Math.hypot(x - last.x, y - last.y);
    if (d >= CORK_GAP) {
      this.paid += d;
      this.pts.push({ x, y });
    }
    if (this.paid >= SEINE_MIN && Math.hypot(x - this.buoy.x, y - this.buoy.y) < CLOSE_R)
      return 'closed';
    if (this.paid >= SEINE_LEN) return 'spent';
    return null;
  }

  /** Whether a point is inside the loop, closed back to the buoy. */
  inside(x: number, y: number): boolean {
    const p = this.pts;
    let inn = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i] as Point;
      const b = p[j] as Point;
      if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inn = !inn;
    }
    return inn;
  }

  /** The loop's area, closed back to the buoy. */
  area(): number {
    const p = this.pts;
    let s = 0;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i] as Point;
      const b = p[j] as Point;
      s += b.x * a.y - a.x * b.y;
    }
    return Math.abs(s) / 2;
  }
}

/** The share of the fish in a loop that it keeps, from its area and the area of the schools in it. */
export function keepShare(loopArea: number, schoolArea: number): number {
  if (loopArea <= 0) return 1;
  return Math.max(KEEP_MIN, Math.min(1, (LOOSE * schoolArea) / loopArea));
}
