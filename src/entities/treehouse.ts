/**
 * The Treehouse Climb (data/treehouse.ts): up the pirates' great tree on the Endless Isle, side on, a stage a screen,
 * the way Donkey Kong is. The arrows walk you along the planks and up and down the rope ladders, and the jump button
 * hops a barrel. The gorilla at the top rolls barrels down: each zigzags down the planks, dropping off one's low end
 * onto the next, and now and then comes down a ladder instead. A barrel jumped is coins. One that bowls you over costs
 * a try, and with all three gone the stage starts again from the bottom: there is no game over. A belaying pin, picked
 * up, smashes the barrels it meets for a few seconds, though you cannot climb or jump while you swing it. Up on the
 * ledge at the top, the stage is climbed.
 *
 * Higher up the tree (the Rope Swings) the planks have gaps, with ropes swinging over them: jump at one to grab it, slide
 * up and down it with the arrows, and jump again to let go, flying on the way it swings. Rope bridges sag under you, and
 * coconuts hang under the planks above, each wobbling a moment before it drops. Higher still (the Bucket Lifts) buckets
 * on pulley ropes go up one side of the tree and down the other, to be ridden and stepped off, and levers walked into
 * let down drawbridges. At the very top (the Crow's Nest) there is no door: walk over each of the pegs holding up the
 * crow's nest to knock it out, leaving a hole, while the monkeys the gorilla tosses down scamper about the decks; with
 * every peg out, the crow's nest gives way and the gorilla goes into the sea.
 *
 * The stage's own frame: x across, y up, the climber's y their feet, a barrel's and a coconut's their middles.
 */

import { clamp, rng } from '../core/math';
import {
  BUCKET_W,
  HOLE,
  JUMP_COINS,
  type Ladder,
  LEVER_COINS,
  type Lift,
  LOWER_T,
  loadedY,
  PEG_COINS,
  type Plank,
  plankY,
  ROPE_COINS,
  SMASH_COINS,
  type Stage,
  TOP_COINS,
  TRIES,
} from '../data/treehouse';

/** Along a plank, units a second; up or down a rope ladder. */
export const WALK = 58;
export const CLIMB = 45;
/** A jump: up at this speed, and down under this gravity, over two barrels high and two thirds of a second in the air,
 * so that even a jump from standing still clears one with time to spare. */
export const JUMP_V = 160;
export const GRAVITY = 480;
/** Forgiving jumps: a jump still goes this long after walking off a plank's end, and one pressed this long before
 * landing goes as you land. */
export const COYOTE = 0.1;
export const BUFFER = 0.12;
/** How far either side of a ladder still takes it, when up or down is pressed. */
export const GRAB = 8;
/** The climber, how tall; and the tree's sides, which the climber does not go past. */
export const BODY = 16;
export const WALL = 6;
/** A barrel's size, round; how fast it rolls, at least and at most; down a ladder, and falling. */
export const BARREL_R = 6;
export const ROLL_MIN = 54;
export const ROLL_MAX = 62;
export const LADDER_FALL = 60;
/** The chance a barrel coming to the top of a ladder goes down it: more when you are somewhere below it, but less when
 * you are on that very ladder, climbing up toward it, where there is no getting out of its way. */
export const DOWN_BELOW = 0.25;
export const DOWN_ON = 0.08;
export const DOWN_ELSE = 0.06;
/** The first barrel, this long after the go. */
export const FIRST_ROLL = 1.2;
/** How close a barrel must come, across, to bowl you over; and to be smashed, with the pin; and how far under your
 * feet its top can be and still miss. Each a little kinder than how it looks. */
export const HIT_X = 7;
export const SMASH_X = 18;
export const CLEAR = 4;
/** Bowled over: a moment dazed, then a while blinking, when barrels go through you. */
export const STUN_T = 1;
export const SAFE_T = 2.5;
/** A belaying pin: how long it lasts, and how high over the plank it floats, a jump up, so walking under it leaves
 * it. */
export const PIN_T = 8;
export const PIN_Y = 28;
/** The beat before the go; how it goes, before that, on a first climb (the jump button skips it). */
export const READY_T = 1.6;
export const HOWTO_T = 5;
/** Out of tries: the tumble, before the stage starts again. */
export const DOWN_T = 1.8;
/** On a rope: hands this far over the feet, up over the head; grabbed within this of it, no higher up it than this much of its length;
 * slid along it at this; let go of, a little hop up, and not to be grabbed again until you have landed. */
export const HANDS = 19;
export const ROPE_GRAB = 8;
export const ROPE_TOP = 0.4;
export const ROPE_SLIDE = 40;
export const LET_GO = 70;
/** How quickly your weight comes on to a rope bridge, and off it. */
export const DIP_RATE = 4;
/** A coconut: how big, how long it wobbles before it drops, and how fast it falls. */
export const NUT_R = 5;
export const WOBBLE_T = 0.9;
export const NUT_FALL = 300;
/** A monkey: how tall; how fast along a deck, and up or down a ladder; the chance it takes a ladder it comes to; about
 * how often it thinks again which way to go, and the chance it then turns toward you, on your deck. */
export const MONKEY_H = 11;
export const MONKEY_V = 30;
export const MONKEY_CLIMB = 28;
export const MONKEY_LADDER = 0.35;
export const MONKEY_THINK = 2;
export const MONKEY_CHASE = 0.5;
/** Come down on a monkey's head from a jump: bounced up off it at this. */
export const BOUNCE = 110;
/** The gorilla in the crow's nest tosses the first monkey this long after the go, then another this often while there
 * are fewer than it may have about: two at first, the stage's most after this long. */
export const FIRST_TOSS = 1;
export const TOSS_EVERY = 6;
export const ALL_MONKEYS_T = 30;
/** Every peg out: the crow's nest gives way, and the gorilla hits the sea this long after. */
export const SPLASH_T = 2.2;

export type ClimbPhase = 'ready' | 'climb' | 'down' | 'clear';
export type Pose = 'stand' | 'walk' | 'ladder' | 'jump' | 'stun' | 'rope';
/**
 * A monkey: along a deck, up or down a ladder, falling (tossed down, or through a hole), or knocked flying off the tree.
 * Its feet at (x, y).
 */
export type Monkey = {
  x: number;
  y: number;
  plank: number;
  ladder: Ladder | null;
  mode: 'walk' | 'climb' | 'fall' | 'fly';
  /** Which way along the deck; up (1) or down (-1) the ladder. */
  dir: number;
  climb: number;
  vx: number;
  vy: number;
  /** Till it next thinks which way to go; the ladder it last came to, not to be thought about again till past it. */
  think: number;
  near: Ladder | null;
  /** The jump of yours it was jumped on, for the coins once a jump. */
  jumped: number;
};
/** A coconut, wobbling where it hangs until it drops, then falling until it splats on a plank. */
export type Nut = { x: number; y: number; vy: number; wobble: number };
export type Barrel = {
  x: number;
  y: number;
  /** Rolling along a plank, falling off one's end, or coming down a ladder. */
  mode: 'roll' | 'fall' | 'ladder';
  /** The plank it rolls along, while it does; the ladder it comes down. */
  plank: number;
  ladder: Ladder | null;
  /** How fast it rolls, and which way, and how far round it has turned, for the drawing. */
  v: number;
  dir: number;
  vx: number;
  vy: number;
  turn: number;
  /** Already jumped, for the coins; the ladders it has come to the top of, and passed or gone down. */
  jumped: boolean;
  passed: Ladder[];
};
export type Pin = { x: number; plank: number; taken: boolean };
export type ClimbEvent =
  | 'go'
  | 'hop'
  | 'landed'
  | 'jumped'
  | 'smash'
  | 'hit'
  | 'over'
  | 'again'
  | 'pin'
  | 'pinGone'
  | 'roll'
  | 'swing'
  | 'grab'
  | 'lever'
  | 'ride'
  | 'tipped'
  | 'nut'
  | 'splat'
  | 'peg'
  | 'toss'
  | 'bonk'
  | 'splash'
  | 'top';

/** Which way a plank rolls a barrel: toward its low end. */
export const downhill = (p: Plank): number => (p.y1 < p.y0 ? 1 : -1);

export class Climb {
  /** Feet, across and up; on which plank (or -1, off one), or which ladder. */
  x: number;
  y: number;
  plank: number;
  ladder: Ladder | null = null;
  vx = 0;
  vy = 0;
  air = false;
  /** Facing right, or left. */
  face = 1;
  /** How far walked, and climbed, for the stride. */
  stride = 0;
  phase: ClimbPhase = 'ready';
  readyT = READY_T;
  downT = 0;
  /** The clock, from the go; and how long since getting to the top. */
  t = 0;
  clearT = 0;
  tries = TRIES;
  stunT = 0;
  safeT = 0;
  pinT = 0;
  /** The time since the gorilla last rolled one, and till it rolls the next. */
  rolledT = 9;
  nextRoll = FIRST_ROLL;
  /** The rope held (or -1), how far down it, and the one just let go of, not to be grabbed again before landing. */
  rope = -1;
  ropeD = 0;
  ropeLeft = -1;
  /** The ropes swung on this time up, for their coins. */
  private ropesUsed = new Set<number>();
  /** How far your weight is on the rope bridge you stand on, 0 to 1. */
  dip = 0;
  /** The coconuts hanging and falling, and how long till each bunch lets go of its next. */
  nuts: Nut[] = [];
  private nutNext: number[];
  /** A clock that runs from the start, the beat before the go too: the ropes swing by it, and the lifts run. */
  clock = 0;
  /** The bucket ridden: which lift, and which of its buckets. */
  bucket: { lift: number; k: number } | null = null;
  /** Each lever pulled, and how far down its drawbridge has come, 0 to 1. */
  pulled: boolean[];
  lowered: number[];
  /** The pegs, each knocked out at this time on the clock, or not yet (-1); the one whose hole you are walking over as
   * you knock it out, not to drop you through it. */
  pegs: { x: number; plank: number; out: number }[];
  private over = -1;
  /** The monkeys about, how long till the gorilla tosses the next and since it tossed the last; whether the gorilla has
   * hit the sea. */
  monkeys: Monkey[] = [];
  nextToss = FIRST_TOSS;
  tossedT = 9;
  private splashed = false;
  /** Each jump counted, so a monkey is jumped once a jump. */
  private hops = 0;
  private coyote = 0;
  private buffer = 0;
  barrels: Barrel[] = [];
  pins: Pin[];
  /** The coins so far, which stay, a restart or not; and what got them. */
  coins = 0;
  jumped = 0;
  smashed = 0;
  swung = 0;
  hits = 0;
  restarts = 0;
  onEvent: ((what: ClimbEvent, b?: Barrel) => void) | null = null;
  private readonly R: () => number;

  constructor(
    readonly stage: Stage,
    seed = 1,
  ) {
    this.R = rng(seed);
    this.x = stage.start.x;
    this.plank = stage.start.plank;
    this.y = plankY(this.plankOf(this.plank), this.x);
    this.pins = stage.pins.map((p) => ({ ...p, taken: false }));
    this.pulled = (stage.levers ?? []).map(() => false);
    this.lowered = (stage.levers ?? []).map(() => 0);
    this.pegs = (stage.pegs ?? []).map((p) => ({ ...p, out: -1 }));
    this.nutNext = (stage.nuts ?? []).map(() => this.nutGap() * (0.3 + this.R() * 0.7));
  }

  private nutGap(): number {
    const lo = this.stage.nutMin ?? 3;
    return lo + this.R() * ((this.stage.nutMax ?? lo) - lo);
  }
  /** How many pegs are knocked out. */
  get knocked(): number {
    return this.pegs.filter((p) => p.out >= 0).length;
  }
  /** Whether plank i has a hole at x, a peg knocked out there; but not the one you are knocking out as you walk over. */
  hole(i: number, x: number, me = false): boolean {
    return this.pegs.some(
      (p, j) =>
        p.plank === i && p.out >= 0 && Math.abs(x - p.x) < HOLE / 2 && !(me && j === this.over),
    );
  }
  /** Whether a plank can be stood on: a drawbridge only once it is all the way down. */
  standable(i: number): boolean {
    const p = this.plankOf(i);
    return p.lever === undefined || (this.lowered[p.lever] ?? 0) >= 1;
  }
  /** How many buckets a lift has, round its whole rope. */
  buckets(L: Lift): number {
    return Math.ceil((L.y1 - L.y0) / L.gap);
  }
  /** Where a lift's bucket is round its rope, at a time: how far along its run, or null while it is round the back. */
  private along(L: Lift, k: number, at: number): number | null {
    const loop = this.buckets(L) * L.gap;
    const d = (((at * L.speed + k * L.gap) % loop) + loop) % loop;
    return d <= L.y1 - L.y0 ? d : null;
  }
  /** A bucket's rim, the height you stand at in it, now (or a moment ago); null while it is round the back. */
  rimY(i: number, k: number, ago = 0): number | null {
    const L = this.stage.lifts?.[i];
    if (!L) return null;
    const d = this.along(L, k, this.clock - ago);
    if (d === null) return null;
    return L.up ? L.y0 + d : L.y1 - d;
  }
  /** A plank's height at x as it is now: a rope bridge dipping where you stand on it. */
  surfaceY(i: number, x: number): number {
    const p = this.plankOf(i);
    return p.sag && i === this.plank && !this.air && !this.ladder
      ? loadedY(p, x, this.x, this.dip)
      : plankY(p, x);
  }
  /** How far round a rope has swung (radians from straight down, positive to the right), and how fast it is swinging. */
  ropeAngle(i: number): number {
    const r = this.stage.ropes?.[i];
    return r ? r.amp * Math.sin((2 * Math.PI * this.clock) / r.period + r.phase) : 0;
  }
  ropeRate(i: number): number {
    const r = this.stage.ropes?.[i];
    if (!r) return 0;
    const w = (2 * Math.PI) / r.period;
    return r.amp * w * Math.cos(w * this.clock + r.phase);
  }
  /** The point d along a rope from where it is tied. */
  ropeAt(i: number, d: number): [number, number] {
    const r = this.stage.ropes?.[i];
    if (!r) return [0, 0];
    const a = this.ropeAngle(i);
    return [r.x + d * Math.sin(a), r.y - d * Math.cos(a)];
  }

  private plankOf(i: number): Plank {
    return this.stage.planks[i] as Plank;
  }
  /** The ledge at the top, with the door. */
  get topPlank(): number {
    return this.stage.planks.length - 1;
  }
  /** Still on how it goes, before the beat. */
  get howTo(): boolean {
    return this.phase === 'ready' && this.readyT > READY_T;
  }
  showHowTo(): void {
    if (this.phase === 'ready') this.readyT = READY_T + HOWTO_T;
  }
  get pose(): Pose {
    if (this.stunT > 0 || this.phase === 'down') return 'stun';
    if (this.rope >= 0) return 'rope';
    if (this.ladder) return 'ladder';
    if (this.air) return 'jump';
    return Math.abs(this.vx) > 1 ? 'walk' : 'stand';
  }
  /** How high up the tree, 0 to 1. */
  get height(): number {
    return clamp(this.y / (this.stage.h - 30), 0, 1);
  }

  /** The jump button: a jump, now or as you land; before the beat, it skips how it goes. */
  press(): void {
    if (this.howTo) {
      this.readyT = READY_T;
      return;
    }
    this.buffer = BUFFER;
  }

  /** A step, the arrows at (sx, sy): right and down positive, as on the screen. */
  step(dt: number, sx: number, sy: number): void {
    this.rolledT += dt;
    this.clock += dt;
    if (this.phase === 'ready') {
      this.readyT -= dt;
      if (this.readyT <= 0) {
        this.phase = 'climb';
        this.onEvent?.('go');
      }
      return;
    }
    if (this.phase === 'down') {
      this.downT -= dt;
      this.fall(dt);
      this.roll(dt);
      this.drop(dt);
      this.scamper(dt);
      if (this.downT <= 0) this.again();
      return;
    }
    if (this.phase === 'clear') {
      this.clearT += dt;
      this.roll(dt);
      this.drop(dt);
      this.scamper(dt);
      if (this.pegs.length && !this.splashed && this.clearT >= SPLASH_T) {
        this.splashed = true;
        this.onEvent?.('splash');
      }
      // Down from a last jump, then in at the door, if there is one.
      if (this.air) {
        this.fall(dt);
        return;
      }
      const door = this.stage.door;
      if (door === undefined) {
        // On across the hole the last peg left, then still.
        this.vx = this.hole(this.plank, this.x) ? this.face * WALK * 0.6 : 0;
        this.x += this.vx * dt;
        this.stride += Math.abs(this.vx) * dt;
        return;
      }
      const d = door - this.x;
      this.vx = Math.abs(d) > 1 ? Math.sign(d) * WALK * 0.6 : 0;
      if (this.vx) this.face = Math.sign(this.vx);
      this.x += clamp(this.vx * dt, -Math.abs(d), Math.abs(d));
      this.stride += Math.abs(this.vx) * dt;
      return;
    }
    this.t += dt;
    sx = clamp(sx, -1, 1);
    sy = clamp(sy, -1, 1);
    this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.safeT = Math.max(0, this.safeT - dt);
    if (this.pinT > 0) {
      this.pinT -= dt;
      if (this.pinT <= 0) {
        this.pinT = 0;
        this.onEvent?.('pinGone');
      }
    }
    if (this.stunT > 0) {
      this.stunT -= dt;
      sx = 0;
      sy = 0;
      this.buffer = 0;
    }
    this.lowered = this.lowered.map((l, i) => (this.pulled[i] ? Math.min(1, l + dt / LOWER_T) : l));
    this.move(dt, sx, sy);
    const onBridge = !this.air && !this.ladder && this.plank >= 0 && !!this.plankOf(this.plank).sag;
    this.dip = clamp(this.dip + (onBridge ? 1 : -1) * DIP_RATE * dt, 0, 1);
    this.gorilla(dt);
    this.toss(dt);
    this.roll(dt);
    this.drop(dt);
    this.scamper(dt);
    this.meet();
    if (this.phase !== 'climb') return;
    if (this.pegs.length) this.knock();
    else if (!this.air && !this.ladder && this.plank === this.topPlank) this.top();
  }

  /** Up: the clock stops, the coins for it. At the very top, the monkeys leap off the tree. */
  private top(): void {
    this.phase = 'clear';
    this.coins += TOP_COINS;
    this.pinT = 0;
    for (const m of this.monkeys) {
      m.mode = 'fly';
      m.vx = (m.x < this.stage.w / 2 ? -1 : 1) * (40 + this.R() * 30);
      m.vy = 90 + this.R() * 40;
    }
    this.onEvent?.('top');
  }

  /** Walked over (or jumped low over), a peg is knocked out; with the last of them out, the stage is climbed. */
  private knock(): void {
    this.pegs.forEach((p, j) => {
      if (p.out >= 0) return;
      const s = plankY(this.plankOf(p.plank), p.x);
      const on = !this.air && this.plank === p.plank && Math.abs(this.x - p.x) < 3;
      const above = this.air && Math.abs(this.x - p.x) < 4 && this.y >= s && this.y < s + 30;
      if (!on && !above) return;
      p.out = this.clock;
      if (on) this.over = j;
      this.coins += PEG_COINS;
      this.onEvent?.('peg');
    });
    if (this.pegs.every((p) => p.out >= 0)) this.top();
  }

  private move(dt: number, sx: number, sy: number): void {
    const want = Math.abs(sx) > 0.2 ? Math.sign(sx) * WALK : 0;
    if (this.rope >= 0) {
      this.swing(dt, sy);
      return;
    }
    if (this.ladder) {
      const L = this.ladder;
      const lo = this.surfaceY(L.lo, L.x);
      const hi = this.surfaceY(L.lo + 1, L.x);
      const dy = Math.abs(sy) > 0.3 ? -Math.sign(sy) * CLIMB * dt : 0;
      this.y = clamp(this.y + dy, lo, hi);
      this.stride += Math.abs(dy);
      if (dy > 0 && this.y >= hi) this.stand(L.lo + 1);
      else if (dy < 0 && this.y <= lo) this.stand(L.lo);
      return;
    }
    const canAct = this.pinT <= 0;
    if (this.bucket) this.inBucket(dt, want);
    else if (!this.air) {
      // Up or down a ladder, if one is in reach (not with a pin in hand).
      if (canAct && Math.abs(sy) > 0.5) {
        const L =
          sy < 0
            ? this.stage.ladders.find((l) => l.lo === this.plank && Math.abs(l.x - this.x) < GRAB)
            : this.stage.ladders.find(
                (l) => l.lo === this.plank - 1 && Math.abs(l.x - this.x) < GRAB,
              );
        if (L) {
          this.ladder = L;
          this.x = L.x;
          this.vx = 0;
          this.plank = -1;
          return;
        }
      }
      this.vx = want;
      if (want) this.face = Math.sign(want);
      this.x = clamp(this.x + this.vx * dt, WALL, this.stage.w - WALL);
      this.stride += Math.abs(this.vx) * dt;
      const p = this.plankOf(this.plank);
      const o = this.pegs[this.over];
      if (o && (this.plank !== o.plank || Math.abs(this.x - o.x) >= HOLE / 2)) this.over = -1;
      if (this.x < p.x0 || this.x > p.x1 || this.hole(this.plank, this.x, true)) {
        // Off the end, or into a hole: down to the plank below, unhurt (or straight on, onto the next, end to end).
        this.air = true;
        this.vy = 0;
        this.plank = -1;
        this.coyote = COYOTE;
      } else {
        this.y = this.surfaceY(this.plank, this.x);
        this.scoop(dt);
      }
    }
    if (canAct && this.buffer > 0 && (!this.air || this.coyote > 0)) {
      this.buffer = 0;
      this.coyote = 0;
      this.air = true;
      this.plank = -1;
      this.bucket = null;
      this.over = -1;
      this.hops++;
      this.vy = JUMP_V;
      this.onEvent?.('hop');
    }
    if (this.air) {
      this.vx = want || this.vx * Math.exp(-6 * dt);
      if (want) this.face = Math.sign(want);
      this.fall(dt);
    }
  }

  /** Stood where a lift's bucket comes up out of the ground: scooped up in it. */
  private scoop(dt: number): void {
    (this.stage.lifts ?? []).forEach((L, i) => {
      if (this.bucket || Math.abs(this.x - L.x) > BUCKET_W / 2) return;
      for (let k = 0; k < this.buckets(L); k++) {
        const now = this.rimY(i, k);
        // One just come round the wheel at the bottom was at the bottom a moment ago.
        const then = this.rimY(i, k, dt) ?? (L.up ? L.y0 - 1 : null);
        if (now === null || then === null || then > this.y + 0.5 || now < this.y) continue;
        this.bucket = { lift: i, k };
        this.plank = -1;
        this.y = now;
        this.onEvent?.('ride');
        return;
      }
    });
  }

  /** In a bucket: carried with it, walking about in it and off its edge; tipped out at the end of its run. */
  private inBucket(dt: number, want: number): void {
    const b = this.bucket;
    const L = b && this.stage.lifts?.[b.lift];
    if (!b || !L) {
      this.bucket = null;
      this.air = true;
      return;
    }
    const y = this.rimY(b.lift, b.k);
    const was = this.rimY(b.lift, b.k, dt);
    // Over the wheel at the end of its run: out you come.
    if (y === null || was === null || (L.up ? y < was : y > was)) {
      this.bucket = null;
      this.air = true;
      this.vy = 0;
      this.onEvent?.('tipped');
      return;
    }
    this.vx = want;
    if (want) this.face = Math.sign(want);
    this.x = clamp(this.x + this.vx * dt, WALL, this.stage.w - WALL);
    this.stride += Math.abs(this.vx) * dt;
    if (Math.abs(this.x - L.x) > BUCKET_W / 2) {
      this.bucket = null;
      this.air = true;
      this.vy = 0;
      this.coyote = COYOTE;
      return;
    }
    this.y = y;
  }

  /** On a rope: carried round as it swings, sliding along it with the arrows, and let go of with the jump button,
   * flying on the way it was swinging. */
  private swing(dt: number, sy: number): void {
    const i = this.rope;
    const r = this.stage.ropes?.[i];
    if (!r) {
      this.rope = -1;
      return;
    }
    if (Math.abs(sy) > 0.3)
      this.ropeD = clamp(this.ropeD + Math.sign(sy) * ROPE_SLIDE * dt, r.len * ROPE_TOP, r.len);
    const [hx, hy] = this.ropeAt(i, this.ropeD);
    this.x = clamp(hx, WALL, this.stage.w - WALL);
    this.y = hy - HANDS;
    const w = this.ropeRate(i);
    if (Math.abs(w) > 0.05) this.face = Math.sign(w);
    if (this.buffer > 0 && this.pinT <= 0) {
      const a = this.ropeAngle(i);
      this.buffer = 0;
      this.rope = -1;
      this.ropeLeft = i;
      this.air = true;
      this.vx = w * this.ropeD * Math.cos(a);
      this.vy = w * this.ropeD * Math.sin(a) + LET_GO;
      this.onEvent?.('hop');
    }
  }

  /** A rope within reach of your hands, in the air: grabbed. */
  private grab(): boolean {
    if (this.stunT > 0 || this.pinT > 0 || this.phase !== 'climb') return false;
    const ropes = this.stage.ropes ?? [];
    for (let i = 0; i < ropes.length; i++) {
      const r = ropes[i] as (typeof ropes)[number];
      if (i === this.ropeLeft) continue;
      const [ex, ey] = this.ropeAt(i, r.len);
      const ux = (ex - r.x) / r.len;
      const uy = (ey - r.y) / r.len;
      const hx = this.x - r.x;
      const hy = this.y + HANDS - r.y;
      const d = clamp(hx * ux + hy * uy, 0, r.len);
      if (d < r.len * ROPE_TOP || Math.hypot(hx - ux * d, hy - uy * d) > ROPE_GRAB) continue;
      this.rope = i;
      this.ropeD = d;
      this.air = false;
      this.plank = -1;
      this.vx = 0;
      this.vy = 0;
      const [gx, gy] = this.ropeAt(i, d);
      this.x = clamp(gx, WALL, this.stage.w - WALL);
      this.y = gy - HANDS;
      if (!this.ropesUsed.has(i)) {
        this.ropesUsed.add(i);
        this.swung++;
        this.coins += ROPE_COINS;
        this.onEvent?.('swing');
      } else this.onEvent?.('grab');
      return true;
    }
    return false;
  }

  /** Through the air, catching a rope in reach, or landing on the first plank under you. */
  private fall(dt: number): void {
    if (!this.air) return;
    const was = this.y;
    this.x = clamp(this.x + this.vx * dt, WALL, this.stage.w - WALL);
    this.vy -= GRAVITY * dt;
    this.y += this.vy * dt;
    if (this.grab()) return;
    if (this.vy > 0) return;
    let best = -1;
    let at = -Infinity;
    this.stage.planks.forEach((p, i) => {
      if (this.x < p.x0 || this.x > p.x1 || !this.standable(i) || this.hole(i, this.x)) return;
      const s = plankY(p, this.x);
      if (was >= s - 0.01 && this.y <= s && s > at) {
        best = i;
        at = s;
      }
    });
    // Into a bucket going by, the rim crossed between then and now.
    let into: { lift: number; k: number } | null = null;
    (this.stage.lifts ?? []).forEach((L, i) => {
      if (Math.abs(this.x - L.x) > BUCKET_W / 2) return;
      for (let k = 0; k < this.buckets(L); k++) {
        const now = this.rimY(i, k);
        const then = this.rimY(i, k, dt);
        if (now === null || then === null) continue;
        if (was >= then - 0.01 && this.y <= now + 0.01 && now > at) {
          into = { lift: i, k };
          at = now;
        }
      }
    });
    if (into) {
      this.bucket = into;
      this.plank = -1;
      this.air = false;
      this.vy = 0;
      this.y = at;
      this.onEvent?.('ride');
      return;
    }
    if (best >= 0) {
      this.stand(best);
      if (this.phase === 'climb') this.onEvent?.('landed');
    }
  }

  private stand(i: number): void {
    this.plank = i;
    this.bucket = null;
    this.ladder = null;
    this.rope = -1;
    this.ropeLeft = -1;
    this.air = false;
    this.vy = 0;
    this.dip = 0;
    this.y = this.surfaceY(i, this.x);
  }

  /** The gorilla at the top, rolling the next barrel down. */
  private gorilla(dt: number): void {
    const g = this.stage.gorilla;
    if (!g) return;
    this.nextRoll -= dt;
    if (this.nextRoll > 0) return;
    const p = this.plankOf(g.plank);
    const dir = downhill(p);
    const x = g.x + dir * 14;
    this.barrels.push({
      x,
      y: plankY(p, x) + BARREL_R,
      mode: 'roll',
      plank: g.plank,
      ladder: null,
      v: ROLL_MIN + this.R() * (ROLL_MAX - ROLL_MIN),
      dir,
      vx: 0,
      vy: 0,
      turn: 0,
      jumped: false,
      passed: [],
    });
    this.rolledT = 0;
    const lo = this.stage.rollMin ?? 3;
    this.nextRoll = lo + this.R() * ((this.stage.rollMax ?? lo) - lo);
    this.onEvent?.('roll');
  }

  /** The gorilla in the crow's nest, tossing the next monkey down, while there are fewer about than it may have. */
  private toss(dt: number): void {
    const n = this.stage.nest;
    if (!n) return;
    this.tossedT += dt;
    this.nextToss -= dt;
    if (this.nextToss > 0) return;
    const all = this.stage.monkeys ?? 2;
    const most = this.t < ALL_MONKEYS_T ? Math.min(2, all) : all;
    if (this.monkeys.filter((m) => m.mode !== 'fly').length >= most) {
      this.nextToss = 1;
      return;
    }
    const side = this.R() < 0.5 ? -1 : 1;
    this.monkeys.push({
      x: n.x + side * 8,
      y: plankY(this.plankOf(n.plank), n.x) + 22,
      plank: -1,
      ladder: null,
      mode: 'fall',
      dir: side,
      climb: 0,
      vx: side * (24 + this.R() * 30),
      vy: 70,
      think: MONKEY_THINK,
      near: null,
      jumped: -1,
    });
    this.tossedT = 0;
    this.nextToss = TOSS_EVERY;
    this.onEvent?.('toss');
  }

  /** The monkeys: along the decks, turning at an end or a hole, and now and then toward you; up or down a ladder they
   * come to, now and then; falling till they land (never back in the crow's nest); gone once out of the tree. */
  private scamper(dt: number): void {
    const s = this.stage;
    for (const m of this.monkeys) {
      if (m.mode === 'walk') {
        const p = this.plankOf(m.plank);
        if (this.hole(m.plank, m.x)) {
          m.mode = 'fall';
          m.vx = 0;
          m.vy = 0;
          continue;
        }
        m.think -= dt;
        if (m.think <= 0) {
          m.think = MONKEY_THINK * (0.6 + this.R() * 0.8);
          if (this.plank === m.plank && this.R() < MONKEY_CHASE)
            m.dir = Math.sign(this.x - m.x) || m.dir;
          else if (this.R() < 0.3) m.dir = -m.dir;
        }
        const was = m.x;
        const next = m.x + m.dir * MONKEY_V * dt;
        if (next < p.x0 + 4 || next > p.x1 - 4 || this.hole(m.plank, next + m.dir * 5)) {
          m.dir = -m.dir;
          continue;
        }
        m.x = next;
        m.y = plankY(p, m.x);
        if (m.near && Math.abs(m.x - m.near.x) > 6) m.near = null;
        for (const L of s.ladders) {
          if (L === m.near || (L.lo !== m.plank && L.lo + 1 !== m.plank)) continue;
          if ((was - L.x) * (m.x - L.x) > 0) continue;
          m.near = L;
          if (this.R() < MONKEY_LADDER) {
            m.mode = 'climb';
            m.ladder = L;
            m.climb = L.lo === m.plank ? 1 : -1;
            m.x = L.x;
            m.plank = -1;
          }
          break;
        }
      } else if (m.mode === 'climb') {
        const L = m.ladder as Ladder;
        const to = m.climb > 0 ? L.lo + 1 : L.lo;
        const end = plankY(this.plankOf(to), L.x);
        m.y += m.climb * MONKEY_CLIMB * dt;
        if (m.climb > 0 ? m.y >= end : m.y <= end) {
          m.y = end;
          m.mode = 'walk';
          m.plank = to;
          m.ladder = null;
          m.near = L;
          m.think = MONKEY_THINK;
          m.dir =
            this.plank === to && this.R() < MONKEY_CHASE
              ? Math.sign(this.x - m.x) || 1
              : this.R() < 0.5
                ? -1
                : 1;
        }
      } else {
        const was = m.y;
        m.x += m.vx * dt;
        m.vy -= GRAVITY * dt;
        m.y += m.vy * dt;
        if (m.mode === 'fly') continue;
        if (m.x < WALL || m.x > s.w - WALL) {
          m.x = clamp(m.x, WALL, s.w - WALL);
          m.vx = -m.vx;
        }
        if (m.vy > 0) continue;
        let best = -1;
        let at = -Infinity;
        s.planks.forEach((p, i) => {
          if (i === s.nest?.plank || m.x < p.x0 + 2 || m.x > p.x1 - 2 || this.hole(i, m.x)) return;
          const y = plankY(p, m.x);
          if (was >= y - 0.01 && m.y <= y && y > at) {
            best = i;
            at = y;
          }
        });
        if (best >= 0) {
          m.mode = 'walk';
          m.plank = best;
          m.y = at;
          m.vx = 0;
          m.vy = 0;
          m.think = 0.6;
          m.near = null;
        }
      }
    }
    this.monkeys = this.monkeys.filter((m) => m.y > -30);
  }

  /** The barrels down the planks, off their ends and now and then down a ladder; gone once out of the tree. */
  private roll(dt: number): void {
    const planks = this.stage.planks;
    for (const b of this.barrels) {
      if (b.mode === 'roll') {
        const p = this.plankOf(b.plank);
        const was = b.x;
        b.x += b.dir * b.v * dt;
        b.turn += (b.dir * b.v * dt) / BARREL_R;
        for (const L of this.stage.ladders) {
          if (L.lo !== b.plank - 1 || b.passed.includes(L)) continue;
          if ((was - L.x) * (b.x - L.x) > 0) continue;
          b.passed.push(L);
          const chance = this.ladder === L ? DOWN_ON : this.y < b.y - BODY ? DOWN_BELOW : DOWN_ELSE;
          if (this.R() < chance) {
            b.mode = 'ladder';
            b.ladder = L;
            b.x = L.x;
            break;
          }
        }
        if (b.mode !== 'roll') continue;
        if (b.x < p.x0 || b.x > p.x1) {
          b.mode = 'fall';
          b.vx = b.dir * b.v * 0.5;
          b.vy = 0;
        } else b.y = plankY(p, b.x) + BARREL_R;
      } else if (b.mode === 'ladder') {
        const L = b.ladder as Ladder;
        const foot = plankY(this.plankOf(L.lo), L.x) + BARREL_R;
        b.y -= LADDER_FALL * dt;
        if (b.y <= foot) {
          b.y = foot;
          b.mode = 'roll';
          b.plank = L.lo;
          b.ladder = null;
          b.dir = downhill(this.plankOf(L.lo));
        }
      } else {
        const was = b.y;
        b.x += b.vx * dt;
        b.vy -= GRAVITY * dt;
        b.y += b.vy * dt;
        b.turn += (b.vx * dt) / BARREL_R;
        planks.forEach((p, i) => {
          if (b.mode !== 'fall' || b.x < p.x0 || b.x > p.x1) return;
          const s = plankY(p, b.x) + BARREL_R;
          if (was >= s - 0.01 && b.y <= s) {
            b.y = s;
            b.mode = 'roll';
            b.plank = i;
            b.dir = downhill(p);
          }
        });
      }
    }
    this.barrels = this.barrels.filter((b) => b.y > -20 && b.x > -30 && b.x < this.stage.w + 30);
  }

  /** The coconuts: each bunch letting one go every so often, which wobbles, then drops, and splats on the first plank
   * it meets. */
  private drop(dt: number): void {
    const spots = this.stage.nuts ?? [];
    if (this.phase === 'climb')
      spots.forEach((n, i) => {
        const left = (this.nutNext[i] ?? 0) - dt;
        if (left > 0) {
          this.nutNext[i] = left;
          return;
        }
        this.nutNext[i] = this.nutGap();
        this.nuts.push({ x: n.x, y: n.y - NUT_R, vy: 0, wobble: WOBBLE_T });
        this.onEvent?.('nut');
      });
    for (const n of this.nuts) {
      if (n.wobble > 0) {
        n.wobble -= dt;
        continue;
      }
      const was = n.y;
      n.vy -= NUT_FALL * dt;
      n.y += n.vy * dt;
      for (let i = 0; i < this.stage.planks.length; i++) {
        const p = this.plankOf(i);
        if (n.x < p.x0 || n.x > p.x1 || !this.standable(i)) continue;
        const s = this.surfaceY(i, n.x) + NUT_R;
        if (was >= s - 0.01 && n.y <= s) {
          n.y = -999;
          this.onEvent?.('splat');
          break;
        }
      }
    }
    this.nuts = this.nuts.filter((n) => n.y > -20);
  }

  /** The climber and the barrels: smashed with a pin, jumped for coins, or a try lost. And a pin picked up. */
  private meet(): void {
    const top = this.y + BODY;
    (this.stage.levers ?? []).forEach((v, i) => {
      if (this.pulled[i] || this.air || this.plank !== v.plank || Math.abs(this.x - v.x) > 8)
        return;
      this.pulled[i] = true;
      this.coins += LEVER_COINS;
      this.onEvent?.('lever');
    });
    for (const p of this.pins) {
      if (p.taken || this.pinT > 0 || this.ladder) continue;
      const py = plankY(this.plankOf(p.plank), p.x) + PIN_Y;
      if (Math.abs(p.x - this.x) < 10 && py > this.y && py < top + 8) {
        p.taken = true;
        this.pinT = PIN_T;
        this.onEvent?.('pin');
      }
    }
    for (const n of [...this.nuts]) {
      if (n.wobble > 0 || Math.abs(n.x - this.x) > HIT_X) continue;
      if (n.y - NUT_R > top - 2 || n.y + NUT_R < this.y + 2) continue;
      if (this.safeT > 0 || this.stunT > 0) continue;
      this.nuts.splice(this.nuts.indexOf(n), 1);
      this.hit();
      if (this.phase !== 'climb') return;
    }
    for (const m of this.monkeys) {
      if (m.mode === 'fly') continue;
      const dx = Math.abs(m.x - this.x);
      if (this.pinT > 0 && dx < SMASH_X && m.y < top + 6 && m.y + MONKEY_H > this.y - 2) {
        // Bonked with the pin: off the tree it flies.
        m.mode = 'fly';
        m.plank = -1;
        m.ladder = null;
        m.vx = (m.x < this.x ? -1 : 1) * 70;
        m.vy = 150;
        this.smashed++;
        this.coins += SMASH_COINS;
        this.onEvent?.('bonk');
        continue;
      }
      // Come down on one from a jump: a bounce off its head, and it runs the other way. Forgiving, as the jumps are.
      if (
        this.air &&
        this.vy < 0 &&
        m.mode === 'walk' &&
        dx < HIT_X &&
        this.y <= m.y + MONKEY_H + 2 &&
        this.y > m.y + MONKEY_H - CLEAR - 4
      ) {
        this.vy = BOUNCE;
        m.dir = Math.sign(m.x - this.x) || -m.dir;
        m.think = MONKEY_THINK;
        if (m.jumped !== this.hops && this.stunT <= 0) {
          m.jumped = this.hops;
          this.jumped++;
          this.coins += JUMP_COINS;
          this.onEvent?.('jumped');
        } else this.onEvent?.('hop');
        continue;
      }
      if (dx < HIT_X && m.y + MONKEY_H - CLEAR > this.y && m.y < top - 4) {
        if (this.safeT > 0 || this.stunT > 0) continue;
        this.hit();
        if (this.phase !== 'climb') return;
        continue;
      }
      if (
        this.air &&
        m.jumped !== this.hops &&
        m.mode === 'walk' &&
        dx < HIT_X &&
        this.y >= m.y + MONKEY_H - CLEAR &&
        this.y < m.y + MONKEY_H + 34 &&
        this.stunT <= 0
      ) {
        m.jumped = this.hops;
        this.jumped++;
        this.coins += JUMP_COINS;
        this.onEvent?.('jumped');
      }
    }
    for (const b of [...this.barrels]) {
      const dx = Math.abs(b.x - this.x);
      const over = b.y - BARREL_R < top - 4 && b.y + BARREL_R - CLEAR > this.y;
      if (
        this.pinT > 0 &&
        dx < SMASH_X &&
        b.y - BARREL_R < top + 6 &&
        b.y + BARREL_R > this.y - 2
      ) {
        this.barrels.splice(this.barrels.indexOf(b), 1);
        this.smashed++;
        this.coins += SMASH_COINS;
        this.onEvent?.('smash', b);
        continue;
      }
      if (dx < HIT_X && over) {
        if (this.safeT > 0 || this.stunT > 0) continue;
        this.barrels.splice(this.barrels.indexOf(b), 1);
        this.hit(b);
        if (this.phase !== 'climb') return;
        continue;
      }
      if (
        this.air &&
        !b.jumped &&
        b.mode === 'roll' &&
        dx < HIT_X &&
        this.y >= b.y + BARREL_R - CLEAR
      ) {
        if (this.y < b.y + BARREL_R + 34 && this.stunT <= 0) {
          b.jumped = true;
          this.jumped++;
          this.coins += JUMP_COINS;
          this.onEvent?.('jumped', b);
        }
      }
    }
  }

  private hit(b?: Barrel): void {
    this.hits++;
    this.tries--;
    this.onEvent?.('hit', b);
    if (this.tries <= 0) {
      this.phase = 'down';
      this.downT = DOWN_T;
      this.ladder = null;
      this.pinT = 0;
      this.bucket = null;
      if (this.rope >= 0) {
        this.rope = -1;
        this.air = true;
        this.vy = 0;
      }
      if (!this.air) {
        this.air = true;
        this.vy = 120;
        this.plank = -1;
      }
      this.vx = 0;
      this.onEvent?.('over');
      return;
    }
    this.stunT = STUN_T;
    this.safeT = SAFE_T;
  }

  /** Out of tries: the stage again, from the bottom, with the three back and the pins where they were. The coins
   * stay. */
  private again(): void {
    const s = this.stage;
    this.phase = 'ready';
    this.readyT = READY_T;
    this.x = s.start.x;
    this.stand(s.start.plank);
    this.vx = 0;
    this.face = 1;
    this.t = 0;
    this.tries = TRIES;
    this.stunT = 0;
    this.safeT = 0;
    this.pinT = 0;
    this.barrels = [];
    this.nextRoll = FIRST_ROLL;
    for (const p of this.pins) p.taken = false;
    this.rope = -1;
    this.ropeLeft = -1;
    this.ropesUsed.clear();
    this.bucket = null;
    this.pulled = this.pulled.map(() => false);
    this.lowered = this.lowered.map(() => 0);
    for (const p of this.pegs) p.out = -1;
    this.over = -1;
    this.monkeys = [];
    this.nextToss = FIRST_TOSS;
    this.nuts = [];
    this.nutNext = this.nutNext.map(() => this.nutGap() * (0.3 + this.R() * 0.7));
    this.restarts++;
    this.onEvent?.('again');
  }
}
