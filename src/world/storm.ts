/**
 * Storms, from the dinner list and the owner's first plan, and the owner's
 * call: past the buoys only, so the home water stays cosy. Every six to ten
 * minutes out in the deep, dark cloud comes over: a warning first (the sky
 * darkens, the gulls go quiet, the swell builds under the pad as it fades),
 * then the storm, a minute to a minute and a half of rain and lightning, when
 * the boat goes slower and turns wider and the fish out there go deep. Nothing
 * is lost; inside the buoys, or tied up, it is calm. Then the reward: when it
 * passes the fish boil up, and for a minute every fish caught past the buoys
 * counts double. The shipwright's ballast steadies the boat in one.
 */

export type StormPhase = 'calm' | 'warn' | 'storm' | 'boil';

/** Seconds out past the buoys between storms, least and most. */
export const EVERY_MIN = 360;
export const EVERY_MAX = 600;
/** How long the warning lasts, the storm (least and most), and the boil after. */
export const WARN = 15;
export const STORM_MIN = 60;
export const STORM_MAX = 90;
export const BOIL = 60;
/** In a storm the boat's top speed and turn rate are this much of themselves; with ballast, these. */
export const SPEED_K = 0.72;
export const TURN_K = 0.6;
export const BALLAST_SPEED_K = 0.92;
export const BALLAST_TURN_K = 0.85;
/** Lightning in a storm: seconds between flashes, least and most. */
export const FLASH_MIN = 5;
export const FLASH_MAX = 12;

export class Storm {
  phase: StormPhase = 'calm';
  /** Seconds left in this phase; while calm, the time out past the buoys until the next. */
  t: number;
  /** Seconds until the next flash of lightning. */
  flash = FLASH_MIN;

  constructor(rnd: () => number = Math.random) {
    this.t = EVERY_MIN + rnd() * (EVERY_MAX - EVERY_MIN);
  }

  /** How strong it is now, 0 to 1: building through the warning, full in the storm, gone a few seconds into the boil. */
  get k(): number {
    if (this.phase === 'warn') return 0.5 * (1 - this.t / WARN);
    if (this.phase === 'storm') return 1;
    if (this.phase === 'boil') return Math.max(0, (this.t - (BOIL - 5)) / 5);
    return 0;
  }

  /**
   * One step. out: the boat is out past the buoys (only then does the wait for the next storm run down).
   * What began this step, if anything: the warning, the storm, the boil, or calm again; or a flash of lightning.
   */
  update(dt: number, out: boolean, rnd: () => number = Math.random): StormPhase | 'flash' | null {
    if (this.phase === 'calm' && !out) return null;
    this.t -= dt;
    if (this.phase === 'storm') {
      this.flash -= dt;
      if (this.flash <= 0 && this.t > 2) {
        this.flash = FLASH_MIN + rnd() * (FLASH_MAX - FLASH_MIN);
        return 'flash';
      }
    }
    if (this.t > 0) return null;
    switch (this.phase) {
      case 'calm':
        this.phase = 'warn';
        this.t = WARN;
        return 'warn';
      case 'warn':
        this.phase = 'storm';
        this.t = STORM_MIN + rnd() * (STORM_MAX - STORM_MIN);
        this.flash = 2 + rnd() * 3;
        return 'storm';
      case 'storm':
        this.phase = 'boil';
        this.t = BOIL;
        return 'boil';
      case 'boil':
        this.phase = 'calm';
        this.t = EVERY_MIN + rnd() * (EVERY_MAX - EVERY_MIN);
        return 'calm';
    }
  }

  /** Bring one on: its warning comes the next step the boat is out past the buoys. */
  bring(): void {
    this.phase = 'calm';
    this.t = 0;
  }
}

/** The boat's top speed and turn rate, as shares of themselves, in a storm this strong, with or without ballast. */
export function stormHandling(k: number, ballast: boolean): { speed: number; turn: number } {
  const s = ballast ? BALLAST_SPEED_K : SPEED_K;
  const t = ballast ? BALLAST_TURN_K : TURN_K;
  const kk = Math.max(0, Math.min(1, k));
  return { speed: 1 - (1 - s) * kk, turn: 1 - (1 - t) * kk };
}
