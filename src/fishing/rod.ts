/**
 * The fishing rod, the kid's way to catch lionfish: "catch them with a fishing
 * rod". Stop the boat near a group and cast; the float sits a moment, then a
 * lionfish takes it and the float goes under, and that is the moment to reel
 * in. Too soon and it swims off; too late and it lets go. Each one caught pays
 * a bounty, as real ones do in places that want them gone, and leaves its
 * group a fish smaller for a while. Simpler than the snook on purpose: these
 * fish want the bait, and the trick is only to wait for it.
 */

/** The boat must be this near a lionfish, and all but stopped, to cast. */
export const ROD_RANGE = 240;
export const ROD_SPEED = 40;
/** Seconds the float sits before a bite, at least and at most. */
export const BITE_WAIT: readonly [number, number] = [0.9, 2.2];
/** Seconds the float is under: reel in then. */
export const BITE_T = 1;
/** Coins for each lionfish caught. */
export const LION_BOUNTY = 40;

export type RodState = 'idle' | 'wait' | 'bite';
/** What reeling in, or waiting too long, came to. */
export type RodResult = 'caught' | 'early' | 'late';

export class Rod {
  state: RodState = 'idle';
  t = 0;
  private wait = 0;

  /** Cast the float out; r in 0..1 decides how long until a bite. */
  cast(r: number): void {
    this.state = 'wait';
    this.t = 0;
    this.wait = BITE_WAIT[0] + r * (BITE_WAIT[1] - BITE_WAIT[0]);
  }

  /** Reel in: a fish if it has the bait, or nothing if it is too soon. */
  reel(): RodResult | null {
    if (this.state === 'idle') return null;
    const caught = this.state === 'bite';
    this.state = 'idle';
    return caught ? 'caught' : 'early';
  }

  /** Give up the line, as when the boat moves off. */
  stop(): void {
    this.state = 'idle';
  }

  /** Time passing: 'bite' the moment the float goes under, 'late' if nobody reels in while it is. */
  update(dt: number): 'bite' | RodResult | null {
    if (this.state === 'idle') return null;
    this.t += dt;
    if (this.state === 'wait' && this.t >= this.wait) {
      this.state = 'bite';
      this.t = 0;
      return 'bite';
    }
    if (this.state === 'bite' && this.t >= BITE_T) {
      this.state = 'idle';
      return 'late';
    }
    return null;
  }
}
