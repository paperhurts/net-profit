/**
 * The Ninja Slalom (data/slalom.ts): down the ninjas' snow peak on the Endless Isle, seen from just behind the skier as
 * the run streams toward you, the drone's into-the-screen view on snow. The thumb carves left and right; pushed up it
 * tucks for speed, pulled down it slows. The run goes on by itself, downhill.
 *
 * Gates to go through between their two poles (round one instead costs time), pines, rocks and snowmen to miss, ice
 * that carries you on sideways, moguls that slow you, ramps that throw you into the air, where a tap turns a flip or a
 * spin for time off if it is landed, and paper lanterns, sliced by the skier's sword on the way past if you pass close.
 * A crash is a tumble in a puff of snow and two seconds or so lost, never the end of the run.
 *
 * The course is a strip along z (metres down the run), x across it (0 down its middle) and y up off the snow. It is laid
 * out from the run's seed, so it is the same every time, and it leaves a line through every gate clear of what stands
 * in the way.
 */

import { clamp, rng } from '../core/math';
import { GATE_MISS, type Run, TRICK_BONUS } from '../data/slalom';

/** Metres a second: on down the run by itself, tucked, and slowed right down; across at most, under the thumb. */
export const CRUISE = 12;
export const TUCK = 16.5;
export const BRAKE = 6;
export const SIDE = 7.5;
/** How quickly the speed comes, and goes, toward what the thumb asks (metres a second, each second). */
export const ACCEL = 3.5;
export const DECEL = 6;
/** A hard carve costs this much of the speed. */
export const CARVE = 2.5;
/** How quickly the skis answer the thumb (per second): on snow, on ice, and in the air. */
export const AGILITY = 5;
export const ICE_AGILITY = 1.1;
export const AIR_AGILITY = 1.5;
/** Moguls slow you to this much; pressing into the soft snow at the piste's edge, to this. */
export const MOGUL_SLOW = 0.75;
export const EDGE_SLOW = 0.6;
/** Off a ramp: up at this speed at the cruise, and down again under this gravity, about a second in the air. */
export const JUMP_UP = 7.5;
export const GRAVITY = 15;
/** How long a flip or a spin takes, in the air. */
export const TRICK_T = 0.55;
/** A tumble: how long it lasts, sliding to a stop, and how fast you set off again. */
export const TUMBLE_T = 1.5;
export const RESTART = 4;
/** How far round the skier is, for what it hits; how close a lantern must pass to be sliced. */
export const SKIER_R = 0.35;
export const LANTERN_REACH = 1.5;
/** No gates this near the top, for getting going. */
export const RUN_IN = 50;
/** The countdown before the start: three beats, then go. */
export const BEAT = 0.8;
export const READY_T = BEAT * 3;
/** Before it, on a first run, a moment to read how it goes; a tap on the trick button skips it. */
export const HOWTO_T = 4;
/** How high a lantern hangs, and how tall what stands on the run is, for flying over it. */
export const LANTERN_Y = 1.5;
export const RAMP_Y = 0.9;
export const RAMP_LEN = 3;
const TALL = { pine: 5, rock: 0.8, snowman: 1.7 } as const;

export type Hazard = 'pine' | 'rock' | 'snowman';
export type Feature =
  /** A gate: two poles w apart round x, the flags red or blue, alternately. */
  | { kind: 'gate'; z: number; x: number; w: number; red: boolean; made: boolean | null }
  /** Something to miss, this wide either side of x. */
  | { kind: Hazard; z: number; x: number; r: number }
  /** A paper lantern on a bamboo pole at x, and when it was sliced (the run's clock), or -1. */
  | { kind: 'lantern'; z: number; x: number; cut: number }
  /** A snow ramp from x0 to x1, its lip at z. */
  | { kind: 'jump'; z: number; x0: number; x1: number }
  /** A patch of ice, or a field of moguls, from z for len metres, from x0 to x1. */
  | { kind: 'ice' | 'moguls'; z: number; len: number; x0: number; x1: number };

/** Where the gates swing between: the racing line at depth z, through each gate's middle. */
export function lineAt(gates: readonly { z: number; x: number }[], z: number): number {
  let pz = 0;
  let px = 0;
  for (const g of gates) {
    if (z <= g.z) return px + ((g.x - px) * (z - pz)) / Math.max(1, g.z - pz);
    pz = g.z;
    px = g.x;
  }
  return px;
}

/** A run's course: from its seed, the same every time. */
export function layRun(run: Run): Feature[] {
  const R = rng(run.seed);
  const out: Feature[] = [];
  const gates: { z: number; x: number }[] = [];
  const edge = run.half - 0.8;
  for (
    let z = RUN_IN, i = 0;
    z < run.len - 40;
    z += run.gapMin + R() * (run.gapMax - run.gapMin), i++
  ) {
    const x = (i % 2 ? 1 : -1) * run.swing * (0.8 + R() * 0.4);
    gates.push({ z, x });
    out.push({ kind: 'gate', z, x, w: run.gateW, red: i % 2 === 0, made: null });
  }
  const line = (z: number) => lineAt(gates, z);
  // Off the line by at least this much, inside the piste: on whichever side has room.
  const off = (z: number, by: number): number => {
    const l = line(z);
    const side = R() < 0.5 ? -1 : 1;
    const x = l + side * by;
    return Math.abs(x) <= edge ? x : l - side * by;
  };
  // The gaps between the gates: a jump in a few of them, spread down the run, and something in each of the rest.
  const gaps = gates.length - 1;
  const jumpAt = new Set<number>();
  for (let k = 0; k < run.jumps; k++) jumpAt.add(Math.floor(((k + 1) * gaps) / (run.jumps + 1)));
  for (let i = 0; i < gaps; i++) {
    const a = gates[i] as { z: number; x: number };
    const b = gates[i + 1] as { z: number; x: number };
    const mid = (a.z + b.z) / 2;
    if (jumpAt.has(i)) {
      const l = line(mid);
      out.push({ kind: 'jump', z: mid, x0: l - run.rampW / 2, x1: l + run.rampW / 2 });
      continue;
    }
    const pick = R();
    if (pick < run.hazard) {
      const kind: Hazard = R() < 0.4 ? 'pine' : R() < 0.5 ? 'rock' : 'snowman';
      const r = kind === 'pine' ? 0.9 : kind === 'rock' ? 0.7 : 0.6;
      out.push({ kind, z: mid, x: off(mid, 2.6 + r + R() * 1.5), r });
    } else if (pick < run.hazard + run.ice) {
      const l = line(mid);
      out.push({ kind: 'ice', z: mid - 5, len: 10, x0: l - 3, x1: l + 3 });
    } else if (pick < run.hazard + run.ice + run.moguls) {
      const l = line(mid);
      out.push({ kind: 'moguls', z: mid - 6, len: 12, x0: l - 3.5, x1: l + 3.5 });
    } else {
      // A snowman and a rock either side of the line: through the middle.
      const l = line(mid);
      out.push({ kind: 'snowman', z: mid, x: l - 3.4, r: 0.6 });
      out.push({ kind: 'rock', z: mid + 0.5, x: l + 3.4, r: 0.7 });
    }
    // Most gaps have a lantern too, a nudge off the line, ahead of whatever is in the middle.
    if (R() < 0.75) {
      const z = mid - 9 + R() * 3;
      out.push({
        kind: 'lantern',
        z,
        x: line(z) + (R() < 0.5 ? -1 : 1) * (0.8 + R() * 1.2),
        cut: -1,
      });
    }
  }
  return out.sort((p, q) => p.z - q.z);
}

/** Whether a skier at (x, y) hits something standing on the run. */
export function hits(o: Feature, x: number, y: number): boolean {
  if (o.kind !== 'pine' && o.kind !== 'rock' && o.kind !== 'snowman') return false;
  return y < TALL[o.kind] && Math.abs(x - o.x) < o.r + SKIER_R;
}

export type SkiState = 'ready' | 'ski' | 'tumble' | 'done';
export type Trick = 'flip' | 'spin';
export type SkiEvent =
  | 'go'
  | 'gate'
  | 'miss'
  | 'crash'
  | 'up'
  | 'lantern'
  | 'jump'
  | 'trick'
  | 'landed'
  | 'finish';

export class Slalom {
  /** Across the run, up off the snow, and how far down it. */
  x = 0;
  y = 0;
  z = 0;
  vx = 0;
  vy = 0;
  /** Down the run, metres a second. */
  v = 0;
  state: SkiState = 'ready';
  /** The countdown, then the run's clock; what has been added for gates missed, and taken off for tricks. */
  readyT = READY_T;
  t = 0;
  penalty = 0;
  bonus = 0;
  /** In the air off a ramp, and the trick turning, if one is, and how far round. */
  air = false;
  trick: Trick | null = null;
  trickT = 0;
  /** The tumble's time left; the sword's swing, after a lantern; how tucked down, 0 to 1, for the drawing. */
  tumbleT = 0;
  slashT = 0;
  tuck = 0;
  /** On ice, or in moguls, now. */
  onIce = false;
  inMoguls = false;
  gatesMade = 0;
  gatesMissed = 0;
  lanterns = 0;
  tricks = 0;
  crashes = 0;
  readonly course: Feature[];
  onEvent: ((what: SkiEvent, f?: Feature) => void) | null = null;

  constructor(readonly run: Run) {
    this.course = layRun(run);
  }

  /** The time the run would stand at now: the clock, the gates missed, the tricks landed. */
  get time(): number {
    return Math.max(0, this.t + this.penalty - this.bonus);
  }
  /** How many gates the run has. */
  get gatesOut(): number {
    return this.course.filter((f) => f.kind === 'gate').length;
  }
  get lanternsOut(): number {
    return this.course.filter((f) => f.kind === 'lantern').length;
  }
  /** How far down, 0 to 1. */
  get progress(): number {
    return clamp(this.z / this.run.len, 0, 1);
  }
  /** The beat of the countdown, 3, 2, 1, or 0 once it is go. */
  get count(): number {
    return this.state === 'ready' ? clamp(Math.ceil(this.readyT / BEAT - 1e-6), 1, 3) : 0;
  }
  /** Still on how it goes, before the countdown. */
  get howTo(): boolean {
    return this.state === 'ready' && this.readyT > READY_T;
  }
  /** How it goes, first, before the countdown. */
  showHowTo(): void {
    if (this.state === 'ready') this.readyT = READY_T + HOWTO_T;
  }

  /** The trick button: a flip, or a spin if you are steering, once a jump; nothing on the snow. Before the
   * countdown, it skips how it goes. */
  press(sx = 0): boolean {
    if (this.howTo) this.readyT = READY_T;
    if (this.state !== 'ski' || !this.air || this.trick) return false;
    this.trick = Math.abs(sx) > 0.4 ? 'spin' : 'flip';
    this.trickT = 0;
    this.onEvent?.('trick');
    return true;
  }

  /** A step, the thumb's stick at (sx, sy): right and down positive, as on the screen. */
  step(dt: number, sx: number, sy: number): void {
    this.slashT = Math.max(0, this.slashT - dt);
    if (this.state === 'ready') {
      this.readyT -= dt;
      if (this.readyT <= 0) {
        this.state = 'ski';
        this.onEvent?.('go');
      }
      return;
    }
    if (this.state === 'done') return;
    this.t += dt;
    sx = clamp(sx, -1, 1);
    sy = clamp(sy, -1, 1);
    const half = this.run.half - SKIER_R;
    if (this.state === 'tumble') {
      // Sliding to a stop in a cloud of snow, then up and off again.
      this.v *= Math.exp(-3 * dt);
      this.vx *= Math.exp(-4 * dt);
      this.tumbleT -= dt;
      if (this.tumbleT <= 0) {
        this.state = 'ski';
        this.v = Math.max(this.v, RESTART * this.run.steep);
        this.onEvent?.('up');
      }
    } else {
      this.onIce = this.over('ice');
      this.inMoguls = !this.air && this.over('moguls');
      const k = Math.min(1, (this.air ? AIR_AGILITY : this.onIce ? ICE_AGILITY : AGILITY) * dt);
      // A steeper run is quicker every way: down it, and across it as you carve.
      const st = this.run.steep;
      const side = SIDE * st;
      this.vx += (sx * side - this.vx) * k;
      this.tuck += ((sy < -0.3 ? 1 : 0) - this.tuck) * Math.min(1, 8 * dt);
      if (!this.air) {
        let want =
          st *
          (sy < -0.3
            ? CRUISE + (TUCK - CRUISE) * Math.min(1, (-sy - 0.3) / 0.6)
            : sy > 0.3
              ? CRUISE - (CRUISE - BRAKE) * Math.min(1, (sy - 0.3) / 0.6)
              : CRUISE);
        want -= (CARVE * st * Math.abs(this.vx)) / side;
        if (this.inMoguls) want *= MOGUL_SLOW;
        if (Math.abs(this.x) >= half - 0.01 && Math.sign(sx) === Math.sign(this.x))
          want *= EDGE_SLOW;
        this.v += clamp(want - this.v, -DECEL * dt, ACCEL * dt);
      }
    }
    this.x = clamp(this.x + this.vx * dt, -half, half);
    if (this.air) {
      this.y += this.vy * dt;
      this.vy -= GRAVITY * dt;
      if (this.trick) this.trickT += dt;
      if (this.y <= 0) this.land();
    }
    const was = this.z;
    this.z += this.v * dt;
    for (const o of this.course) {
      if (o.z <= was || o.z > this.z) continue;
      this.pass(o);
    }
    if (this.z >= this.run.len) {
      this.state = 'done';
      this.air = false;
      this.y = 0;
      this.onEvent?.('finish');
    }
  }

  /** Over the finish, the moment after: the skier turns side on and stops in a spray of snow. */
  drift(dt: number): void {
    if (this.state !== 'done') return;
    this.slashT = Math.max(0, this.slashT - dt);
    this.v *= Math.exp(-2.5 * dt);
    this.vx *= Math.exp(-3 * dt);
    this.z += this.v * dt;
  }

  /** Whether the skier is over a patch of this, now. */
  private over(kind: 'ice' | 'moguls'): boolean {
    return this.course.some(
      (f) =>
        f.kind === kind &&
        this.z >= f.z &&
        this.z <= f.z + f.len &&
        this.x >= f.x0 &&
        this.x <= f.x1,
    );
  }

  /** Something just passed: a gate gone through or round, a lantern within reach, a ramp, or what is in the way. */
  private pass(o: Feature): void {
    if (o.kind === 'gate') {
      o.made = Math.abs(this.x - o.x) < o.w / 2;
      if (o.made) this.gatesMade++;
      else {
        this.gatesMissed++;
        this.penalty += GATE_MISS;
      }
      this.onEvent?.(o.made ? 'gate' : 'miss', o);
      return;
    }
    if (this.state !== 'ski') return;
    if (o.kind === 'lantern') {
      if (o.cut < 0 && Math.abs(this.x - o.x) < LANTERN_REACH && this.y < LANTERN_Y + 1) {
        o.cut = this.t;
        this.lanterns++;
        this.slashT = 0.3;
        this.onEvent?.('lantern', o);
      }
    } else if (o.kind === 'jump') {
      if (!this.air && this.x >= o.x0 && this.x <= o.x1) {
        this.air = true;
        this.y = RAMP_Y * 0.5;
        this.vy = JUMP_UP * clamp(this.v / (CRUISE * this.run.steep), 0.6, 1.2);
        this.trick = null;
        this.onEvent?.('jump', o);
      }
    } else if (hits(o, this.x, this.y)) this.crash(o);
  }

  /** Down on the snow again: a trick finished counts, one still turning is a tumble. */
  private land(): void {
    this.y = 0;
    this.vy = 0;
    this.air = false;
    if (this.trick && this.trickT < TRICK_T) {
      this.crash();
      return;
    }
    if (this.trick) {
      this.tricks++;
      this.bonus += TRICK_BONUS;
    }
    this.onEvent?.('landed');
    this.trick = null;
  }

  /** A tumble, knocked clear of what was hit. */
  private crash(o?: Feature): void {
    this.state = 'tumble';
    this.tumbleT = TUMBLE_T;
    this.crashes++;
    this.trick = null;
    this.air = false;
    this.y = 0;
    this.vy = 0;
    if (o && 'r' in o) this.vx = Math.sign(this.x - o.x || 1) * SIDE * this.run.steep * 0.5;
    this.onEvent?.('crash', o);
  }
}
