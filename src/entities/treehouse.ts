/**
 * The Treehouse Climb (data/treehouse.ts): up the pirates' great tree on the Endless Isle, side on, a stage a screen,
 * the way Donkey Kong is. The arrows walk you along the planks and up and down the rope ladders, and the jump button
 * hops a barrel. The gorilla at the top rolls barrels down: each zigzags down the planks, dropping off one's low end
 * onto the next, and now and then comes down a ladder instead. A barrel jumped is coins. One that bowls you over costs
 * a try, and with all three gone the stage starts again from the bottom: there is no game over. A belaying pin, picked
 * up, smashes the barrels it meets for a few seconds, though you cannot climb or jump while you swing it. Up on the
 * ledge at the top, the stage is climbed.
 *
 * The stage's own frame: x across, y up, the climber's y their feet, a barrel's its middle.
 */

import { clamp, rng } from '../core/math';
import {
  JUMP_COINS,
  type Ladder,
  type Plank,
  plankY,
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

export type ClimbPhase = 'ready' | 'climb' | 'down' | 'clear';
export type Pose = 'stand' | 'walk' | 'ladder' | 'jump' | 'stun';
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
  private coyote = 0;
  private buffer = 0;
  barrels: Barrel[] = [];
  pins: Pin[];
  /** The coins so far, which stay, a restart or not; and what got them. */
  coins = 0;
  jumped = 0;
  smashed = 0;
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
      if (this.downT <= 0) this.again();
      return;
    }
    if (this.phase === 'clear') {
      this.clearT += dt;
      this.roll(dt);
      // In at the door.
      const d = this.stage.door - this.x;
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
    this.move(dt, sx, sy);
    this.gorilla(dt);
    this.roll(dt);
    this.meet();
    if (!this.air && !this.ladder && this.plank === this.topPlank) {
      this.phase = 'clear';
      this.coins += TOP_COINS;
      this.onEvent?.('top');
    }
  }

  private move(dt: number, sx: number, sy: number): void {
    const want = Math.abs(sx) > 0.2 ? Math.sign(sx) * WALK : 0;
    if (this.ladder) {
      const L = this.ladder;
      const lo = plankY(this.plankOf(L.lo), L.x);
      const hi = plankY(this.plankOf(L.lo + 1), L.x);
      const dy = Math.abs(sy) > 0.3 ? -Math.sign(sy) * CLIMB * dt : 0;
      this.y = clamp(this.y + dy, lo, hi);
      this.stride += Math.abs(dy);
      if (dy > 0 && this.y >= hi) this.stand(L.lo + 1);
      else if (dy < 0 && this.y <= lo) this.stand(L.lo);
      return;
    }
    const canAct = this.pinT <= 0;
    if (!this.air) {
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
      if (this.x < p.x0 || this.x > p.x1) {
        // Off the end: down to the plank below, unhurt.
        this.air = true;
        this.vy = 0;
        this.plank = -1;
        this.coyote = COYOTE;
      } else this.y = plankY(p, this.x);
    }
    if (canAct && this.buffer > 0 && (!this.air || this.coyote > 0)) {
      this.buffer = 0;
      this.coyote = 0;
      this.air = true;
      this.plank = -1;
      this.vy = JUMP_V;
      this.onEvent?.('hop');
    }
    if (this.air) {
      this.vx = want || this.vx * Math.exp(-6 * dt);
      if (want) this.face = Math.sign(want);
      this.fall(dt);
    }
  }

  /** Through the air, landing on the first plank under you. */
  private fall(dt: number): void {
    if (!this.air) return;
    const was = this.y;
    this.x = clamp(this.x + this.vx * dt, WALL, this.stage.w - WALL);
    this.vy -= GRAVITY * dt;
    this.y += this.vy * dt;
    if (this.vy > 0) return;
    let best = -1;
    let at = -Infinity;
    this.stage.planks.forEach((p, i) => {
      if (this.x < p.x0 || this.x > p.x1) return;
      const s = plankY(p, this.x);
      if (was >= s - 0.01 && this.y <= s && s > at) {
        best = i;
        at = s;
      }
    });
    if (best >= 0) {
      this.stand(best);
      if (this.phase === 'climb') this.onEvent?.('landed');
    }
  }

  private stand(i: number): void {
    this.plank = i;
    this.ladder = null;
    this.air = false;
    this.vy = 0;
    this.y = plankY(this.plankOf(i), this.x);
  }

  /** The gorilla at the top, rolling the next barrel down. */
  private gorilla(dt: number): void {
    this.nextRoll -= dt;
    if (this.nextRoll > 0) return;
    const g = this.stage.gorilla;
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
    this.nextRoll = this.stage.rollMin + this.R() * (this.stage.rollMax - this.stage.rollMin);
    this.onEvent?.('roll');
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

  /** The climber and the barrels: smashed with a pin, jumped for coins, or a try lost. And a pin picked up. */
  private meet(): void {
    const top = this.y + BODY;
    for (const p of this.pins) {
      if (p.taken || this.pinT > 0 || this.ladder) continue;
      const py = plankY(this.plankOf(p.plank), p.x) + PIN_Y;
      if (Math.abs(p.x - this.x) < 10 && py > this.y && py < top + 8) {
        p.taken = true;
        this.pinT = PIN_T;
        this.onEvent?.('pin');
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

  private hit(b: Barrel): void {
    this.hits++;
    this.tries--;
    this.onEvent?.('hit', b);
    if (this.tries <= 0) {
      this.phase = 'down';
      this.downT = DOWN_T;
      this.ladder = null;
      this.pinT = 0;
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
    this.restarts++;
    this.onEvent?.('again');
  }
}
