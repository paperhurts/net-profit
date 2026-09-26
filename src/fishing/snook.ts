/**
 * The snook, for the owner's dad: the first fish taken on a line. It holds
 * in the shadow of the bridge's far abutment when the light goes, and a cast
 * from a boat tied up on the south side costs the toll.
 *
 * The honest part. Every cast decides, before the fish is even hooked, what
 * is on the end of the line: one cast in ten is a snook that can be landed,
 * and most of those are shorts that go back; one cast in fifty is inside the
 * slot and big enough to keep, and one in five of those is the giant, over
 * the slot, which goes back too after the photo. On every other cast the
 * snook makes a last run for the abutment that no rod could stop, because
 * that is what snook do. The fight is real all the same: ease off when it
 * runs or the line parts, pull when it sulks or it gets to the piling, and a
 * fish that could have been landed is lost by playing it badly. Every miss
 * ends the same way: the snook is still under the bridge. But the words over
 * the fish say which miss it was, and the last run says it was never coming
 * in, because a miss that looks like every other teaches nothing, and the
 * owner lost cast after cast without knowing whether it was her.
 *
 * It shakes its head before every run but the first, and that tell is what
 * makes it catchable by a person. Without it the rod had to ease on the very
 * frame the run began: a thumb a third of a second late pulled through the
 * start of every run, the line ratcheted tighter each time, and it parted
 * before the fish tired. And a thumb on glass is down or up, so the rod is
 * too: hold to pull, let go to ease off, and a full pull through a sulk wins
 * back more line than a run takes. The tests play it with that thumb.
 */
import type { Phase } from '../world/daycycle';

/** Coins per cast, which is how the bridge earns its name. */
export const TOLL = 10;
/** Of all casts: a fish that can be landed, one big enough to keep, and the giant. */
export const ODDS = { landed: 1 / 10, keeper: 1 / 50, giant: 1 / 250 } as const;
export const MISS_LINE = 'The snook is still under the bridge.';
/** Over the fish as it goes, on the last run no rod could stop, however the line ended. */
export const NEVER_LINE = 'Never coming in';
/** The boat must be this close to the spot, on the south side and all but stopped, to cast. */
export const CAST_RANGE = 170;
export const CAST_SPEED = 40;

/** What is on the end of the line: nothing that can be landed, a short, a keeper, or the giant. */
export type Catch = 'none' | 'short' | 'keeper' | 'giant';

/** The snook is home when the light is low: dusk, night and dawn. */
export function snookHome(phase: Phase): boolean {
  return phase !== 'Day';
}

export function rollCatch(r: number): Catch {
  if (r < ODDS.giant) return 'giant';
  if (r < ODDS.keeper) return 'keeper';
  if (r < ODDS.landed) return 'short';
  return 'none';
}

/** Inches, by what it is: shorts under the slot, keepers inside it, the giant well over. */
export const INCHES: Readonly<Record<Exclude<Catch, 'none'>, readonly [number, number]>> = {
  short: [18, 27],
  keeper: [28, 32],
  giant: [40, 46],
};

export function rollInches(kind: Catch, r: number): number {
  if (kind === 'none') return 0;
  const [lo, hi] = INCHES[kind];
  return lo + Math.floor(r * (hi - lo + 1));
}

export type FightState = 'waiting' | 'fight' | 'landed' | 'lost';

/** How far from the piling a hooked fish starts, and the most line it can be given. */
export const START_DISTANCE = 70;
export const MAX_DISTANCE = 120;
/**
 * Units a second: a full pull, a run, the drift of a sulking fish, and the run nothing stops. The
 * pull outpaces a run by half, so a hand that holds through every sulk and lets go for every run
 * gains line; at 34 it lost a little each time and the fish walked to the piling.
 */
export const PULL_SPEED = 48;
export const RUN_SPEED = 32;
export const GIANT_RUN_SPEED = 36;
export const SULK_DRIFT = 6;
export const BOLT_SPEED = 95;
/** Seconds of head-shaking before each run: enough for a thumb that sees it to lift in time. */
export const TELL = 0.45;
/** How quickly the rod follows the stick, per second, so a flick is not a yank. */
export const PULL_EASE = 8;

/** The rod after dt seconds of the stick held at `stick` (0..1). */
export function smoothPull(rod: number, stick: number, dt: number): number {
  return rod + (Math.min(1, stick) - rod) * Math.min(1, dt * PULL_EASE);
}

export class Fight {
  state: FightState = 'waiting';
  readonly kind: Catch;
  readonly inches: number;
  /** Seconds until the strike. */
  wait: number;
  /** How far the fish is from the piling; at zero the line is cut. */
  d = START_DISTANCE;
  /** 0..1; at one the line parts. */
  tension = 0.2;
  /** What the fish has left; at zero it is landed. */
  stamina: number;
  /** Running for the abutment right now, or sulking. */
  running = true;
  /** Shaking its head at the end of a sulk: it runs next. It still pulls like a sulk. */
  telling = false;
  /** The last run, on a fish that was never going to be landed. */
  bolting = false;
  /** Why it was lost. */
  lost: 'snap' | 'piling' | null = null;
  private phaseT: number;
  private runs = 0;

  constructor(rng: () => number, forced?: Catch) {
    const r = rng();
    this.kind = forced ?? rollCatch(r);
    this.inches = rollInches(this.kind, rng());
    this.wait = 1.5 + rng() * 2.5;
    this.stamina = this.kind === 'giant' ? 1.3 : 1;
    this.phaseT = 0.7 + rng() * 0.5;
  }

  /** The words over the fish once it is lost: the run nothing stops, or how a fish was let go. */
  get lostWords(): string {
    if (this.bolting) return NEVER_LINE;
    return this.lost === 'snap' ? 'The line parted' : 'Into the piling';
  }

  /** pull is 0..1: how hard the rod is being worked this frame. */
  update(dt: number, pull: number, rng: () => number): void {
    if (this.state === 'waiting') {
      this.wait -= dt;
      if (this.wait <= 0) this.state = 'fight';
      return;
    }
    if (this.state !== 'fight') return;
    const p = Math.min(1, Math.max(0, pull));
    if (!this.bolting) {
      this.phaseT -= dt;
      if (this.phaseT <= 0) {
        if (this.running) {
          this.runs++;
          this.running = false;
          this.phaseT = 0.8 + rng() * 0.6;
        } else if (!this.telling) {
          this.telling = true;
          this.phaseT = TELL;
        } else {
          this.telling = false;
          this.running = true;
          this.phaseT = 0.9 + rng() * 0.6;
        }
      }
      // A fish that was never coming in shows it on its third run, or sooner if it is being beaten.
      if (this.kind === 'none' && ((this.running && this.runs >= 2) || this.stamina < 0.6)) {
        this.bolting = true;
        this.running = true;
        this.telling = false;
      }
    }
    const run = this.bolting
      ? BOLT_SPEED
      : this.running
        ? this.kind === 'giant'
          ? GIANT_RUN_SPEED
          : RUN_SPEED
        : SULK_DRIFT;
    this.d = Math.min(MAX_DISTANCE, this.d + (p * PULL_SPEED - run) * dt);
    this.tension = Math.max(
      0,
      this.tension + (p * (this.running ? 1.1 : 0.3) - (1 - p) * 0.55) * dt,
    );
    this.stamina -= p * (this.running ? 0.05 : 0.16) * dt;
    if (this.tension >= 1) {
      this.state = 'lost';
      this.lost = 'snap';
    } else if (this.d <= 0) {
      this.state = 'lost';
      this.lost = 'piling';
    } else if (this.stamina <= 0) {
      this.state = 'landed';
    }
  }
}
