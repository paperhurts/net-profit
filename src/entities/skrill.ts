/**
 * Skrill, the kid's boss of Skull Island (his sixth list's first drawing: horned and winged, crowing "The spell
 * worked!", the same orb as island 9, the monkeys again; his answers: 20 hits, 3 damage, "hehe ha ha mwa ha ha", and
 * he fights with "all and sword": his wings, spells from his orb, and a sword; the owner's rule that every blow is
 * wound up so it can be dodged). He waits on the open top of his tower, the fifth floor, past his own black door, with
 * his orb in one hand, a bone-white sword in the other, and his five monkeys. Come in and he laughs and comes for you,
 * and round and round:
 *
 *  - on foot he walks at you and draws his sword back while a red fan shows where it will sweep: out of the fan;
 *  - then up on his wings, out of a spear's reach, he raises the orb while three red rings show where its bolts will
 *    fall: out of the rings;
 *  - and hanging up there he points his sword down a red lane through where you stand, then swoops down it and lands
 *    at its end: off the lane. Down on the floor after a swoop, he gets his breath, open to the spear.
 *
 * A spear reaches him only down low: on his feet, or landed. Each blow is three hearts, and when one lands he laughs.
 * Beaten, he crashes down onto his own floor, and one of his horns snaps off. He stays beaten.
 */

import type { Room } from '../world/tower';
import type { DrawView, Entity, Layer, World } from './entity';
import { type Fan, inSwept } from './reaper';
import { walkStep } from './walker';

export const SKRILL_HP = 20;
/** Hearts his sword, a bolt or his swoop takes. */
export const SKRILL_DMG = 3;
/** Coins he leaves. */
export const SKRILL_PRIZE = 8000;
/** He walks at this; the figure at 85. */
export const SKRILL_SPEED = 46;
/** He wakes for the figure this far into his floor from its front. */
export const SKRILL_WAKE = 40;
/** Seconds of laughing as he wakes. */
export const LAUGH_T = 1.6;
/** The sword: from this near, a fan this far out and this wide; the warning, the swing, the time he is open after. */
export const SLASH_FROM = 48;
export const SLASH_REACH = 62;
export const SLASH_HALF = 1.1;
export const SLASH_WINDUP = 0.9;
export const SLASH_T = 0.3;
export const SLASH_RECOVER = 1;
/** On his feet this long, or after this many swings, he takes to his wings. */
export const FOOT_T = 6;
export const FOOT_SWINGS = 2;
/** Up on his wings: how high (a spear reaches under LOW_Z), the climb, hanging about this far off the figure. */
export const SKRILL_HIGH = 100;
export const LOW_Z = 34;
export const TAKEOFF_T = 0.7;
export const HOVER_T = 1;
export const HOVER_OFF = 120;
export const SKRILL_FLY = 80;
/** The orb's bolts: the warning, their fall, the ring each lands in, the three this far apart round the figure. */
export const SPELL_WINDUP = 1;
export const BOLT_T = 0.45;
export const BOLT_R = 30;
export const BOLT_GAP = 62;
/** The swoop: the warning; the dive along the lane, on past the figure by this; the lane's half width. */
export const AIM_T = 0.9;
export const SWOOP_T = 0.6;
export const SWOOP_PAST = 70;
export const SWOOP_W = 24;
/** Down on the floor after a swoop, open. */
export const LANDED_T = 2;
/** Seconds he takes to crash down, beaten. */
export const FALL_T = 1.4;

export type SkrillState =
  | 'wait'
  | 'laugh'
  | 'chase'
  | 'windup'
  | 'slash'
  | 'recover'
  | 'rise'
  | 'hover'
  | 'spell'
  | 'bolts'
  | 'aim'
  | 'swoop'
  | 'landed'
  | 'fall'
  | 'down'
  | 'gone';

type Pt = { x: number; y: number };

const D = Math.SQRT1_2;

export class Skrill implements Entity {
  x: number;
  y: number;
  /** How high he is off the floor. */
  z = 0;
  h = Math.PI * 0.25;
  hp = SKRILL_HP;
  state: SkrillState = 'wait';
  t = 0;
  flash = 0;
  stunT = 0;
  /** Beaten for good: the game says so from the save. */
  beaten = false;
  /** Where he waits, at the back of his floor. */
  readonly home: Pt;
  /** The sword's fan; where the orb's bolts will fall; the swoop's lane. */
  fan: Fan | null = null;
  bolts: Pt[] = [];
  /** The bolts that fell this frame, for whoever else they catch. */
  fell: Pt[] = [];
  from: Pt = { x: 0, y: 0 };
  to: Pt = { x: 0, y: 0 };
  /** The blow landing this frame: the sword, the bolts, or the swoop going by low. */
  blow: 'slash' | 'bolts' | 'swoop' | null = null;
  /** Seconds on his feet since he last landed, and swings since; whether his swoop has caught the figure yet. */
  private onFoot = 0;
  private swings = 0;
  private figCaught = false;
  private swept = new Set<object>();
  onWake: (() => void) | null = null;
  onWindup: (() => void) | null = null;
  onRise: (() => void) | null = null;
  onSpell: (() => void) | null = null;
  onAim: (() => void) | null = null;
  onStrike: ((blow: 'slash' | 'bolts' | 'swoop', hit: boolean) => void) | null = null;
  onLand: (() => void) | null = null;
  onHit: ((n: number) => void) | null = null;
  onBeaten: (() => void) | null = null;

  /** On the top of his tower: his room. */
  constructor(readonly room: Room) {
    this.home = { x: room.x - room.r * 0.45 * D, y: room.y - room.r * 0.45 * D };
    this.x = this.home.x;
    this.y = this.home.y;
  }

  /** Back by his throne, whole, each time the figure comes up; gone once beaten. */
  reset(): void {
    this.x = this.home.x;
    this.y = this.home.y;
    this.z = 0;
    this.h = Math.PI * 0.25;
    this.hp = SKRILL_HP;
    this.state = this.beaten ? 'gone' : 'wait';
    this.t = 0;
    this.flash = 0;
    this.stunT = 0;
    this.fan = null;
    this.bolts = [];
    this.fell = [];
    this.blow = null;
    this.onFoot = 0;
    this.swings = 0;
    this.swept.clear();
  }

  /** Awake and fighting. */
  get up(): boolean {
    return (
      this.state !== 'wait' &&
      this.state !== 'fall' &&
      this.state !== 'down' &&
      this.state !== 'gone'
    );
  }

  /** Down where a spear can reach him. */
  get low(): boolean {
    return this.up && this.state !== 'laugh' && this.z < LOW_Z;
  }

  /** A hit, only down low; at none he crashes down. Whether it hurt. */
  hit(power: number): boolean {
    if (!this.low) return false;
    this.hp -= power;
    this.flash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.beaten = true;
      this.fan = null;
      this.bolts = [];
      this.set('fall');
      this.onBeaten?.();
    }
    return true;
  }

  /** A stun stops his sword being drawn back, and holds him on the floor a moment longer once he has landed. */
  stun(s: number): void {
    if (this.state === 'windup') {
      this.fan = null;
      this.stunT = Math.max(this.stunT, s);
      this.set('chase');
    } else if (this.state === 'chase') this.stunT = Math.max(this.stunT, s);
    else if (this.state === 'landed') this.t = Math.max(0, this.t - Math.min(s, 1));
  }

  update(dt: number, w: World): void {
    this.blow = null;
    if (this.state === 'gone' || this.state === 'down') return;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.state === 'fall') {
      this.z = Math.max(0, this.z - 200 * dt);
      if (this.t >= FALL_T) this.set('down');
      return;
    }
    const fig = w.figure;
    const inRoom = !!fig && Math.hypot(fig.x - this.room.x, fig.y - this.room.y) < this.room.r + 40;
    if (this.state === 'wait') {
      // Up from the front of his floor: he has seen you come up.
      const front = {
        x: this.room.x + this.room.r * 0.55 * D,
        y: this.room.y + this.room.r * 0.55 * D,
      };
      if (fig && inRoom && Math.hypot(fig.x - front.x, fig.y - front.y) > SKRILL_WAKE) {
        this.h = Math.atan2(fig.y - this.y, fig.x - this.x);
        this.set('laugh');
        this.onWake?.();
      }
      return;
    }
    if (!fig || !inRoom) return;
    if (this.state === 'laugh') {
      this.h = Math.atan2(fig.y - this.y, fig.x - this.x);
      if (this.t >= LAUGH_T) this.set('chase');
      return;
    }
    if (this.state === 'windup') {
      if (this.t >= SLASH_WINDUP) {
        this.set('slash');
        this.blow = 'slash';
        this.swings++;
        const hit = !!this.fan && Skrill.inFan(this.fan, fig.x, fig.y);
        this.onStrike?.('slash', hit);
        if (hit) this.onHit?.(SKRILL_DMG);
      }
      return;
    }
    if (this.state === 'slash') {
      if (this.t >= SLASH_T) {
        this.fan = null;
        this.set('recover');
      }
      return;
    }
    if (this.state === 'recover') {
      if (this.t >= SLASH_RECOVER) this.set('chase');
      return;
    }
    if (this.state === 'rise') {
      this.z = Math.min(SKRILL_HIGH, (SKRILL_HIGH * this.t) / TAKEOFF_T);
      if (this.t >= TAKEOFF_T) this.set('hover');
      return;
    }
    if (this.state === 'spell') {
      const mid = this.bolts[0];
      if (mid) this.h = Math.atan2(mid.y - this.y, mid.x - this.x);
      if (this.t >= SPELL_WINDUP) this.set('bolts');
      return;
    }
    if (this.state === 'bolts') {
      if (this.t >= BOLT_T) {
        this.blow = 'bolts';
        this.fell = this.bolts;
        this.bolts = [];
        const hit = this.catches(fig.x, fig.y);
        this.onStrike?.('bolts', hit);
        if (hit) this.onHit?.(SKRILL_DMG);
        this.aimAt(fig);
      }
      return;
    }
    if (this.state === 'aim') {
      if (this.t >= AIM_T) {
        this.swept.clear();
        this.figCaught = false;
        this.set('swoop');
      }
      return;
    }
    if (this.state === 'swoop') {
      const k = Math.min(1, this.t / SWOOP_T);
      this.x = this.from.x + (this.to.x - this.from.x) * k;
      this.y = this.from.y + (this.to.y - this.from.y) * k;
      this.z = SKRILL_HIGH * (1 - k) ** 1.5;
      if (this.z < LOW_Z) {
        this.blow = 'swoop';
        if (!this.figCaught && Math.hypot(fig.x - this.x, fig.y - this.y) < SWOOP_W) {
          this.figCaught = true;
          this.onStrike?.('swoop', true);
          this.onHit?.(SKRILL_DMG);
        }
      }
      if (k >= 1) {
        this.z = 0;
        this.set('landed');
        this.onLand?.();
      }
      return;
    }
    if (this.state === 'landed') {
      if (this.t >= LANDED_T) {
        this.onFoot = 0;
        this.swings = 0;
        this.set('chase');
      }
      return;
    }
    if (this.state === 'hover') {
      // Hang about off the figure, on the far side from the viewer, then raise the orb.
      const dx = this.x - fig.x;
      const dy = this.y - fig.y;
      const d = Math.hypot(dx, dy) || 1;
      const sx = dx / d - 1;
      const sy = dy / d - 1;
      const s = Math.hypot(sx, sy) || 1;
      this.fly(fig.x + (sx / s) * HOVER_OFF, fig.y + (sy / s) * HOVER_OFF, dt);
      this.h = Math.atan2(-dy, -dx);
      if (this.t < HOVER_T) return;
      const a = Math.atan2(fig.y - this.y, fig.x - this.x);
      this.bolts = [0, 1, 2].map((i) =>
        i === 0
          ? { x: fig.x, y: fig.y }
          : {
              x: fig.x + Math.cos(a + (i === 1 ? 2.1 : -2.1)) * BOLT_GAP,
              y: fig.y + Math.sin(a + (i === 1 ? 2.1 : -2.1)) * BOLT_GAP,
            },
      );
      this.set('spell');
      this.onSpell?.();
      return;
    }
    // On his feet: close in and swing; after a while, or a couple of swings, up on his wings.
    if (this.stunT > 0) {
      this.stunT -= dt;
      return;
    }
    this.onFoot += dt;
    if (this.onFoot >= FOOT_T || this.swings >= FOOT_SWINGS) {
      this.fan = null;
      this.set('rise');
      this.onRise?.();
      return;
    }
    const dx = fig.x - this.x;
    const dy = fig.y - this.y;
    const d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx);
    if (d <= SLASH_FROM) {
      this.h = a;
      this.fan = { x: this.x, y: this.y, a0: a - SLASH_HALF, a1: a + SLASH_HALF };
      this.set('windup');
      this.onWindup?.();
      return;
    }
    this.walk(fig.x, fig.y, dt);
  }

  /** Whether the sword's fan catches whoever is at (x, y). */
  static inFan(f: Fan, x: number, y: number): boolean {
    return inSwept(f, f.a1, x, y, 6, SLASH_REACH);
  }

  /** Whether the blow landing this frame catches whoever is at (x, y): the sword's fan, or a bolt's ring. */
  catches(x: number, y: number): boolean {
    if (this.blow === 'slash' && this.fan) return Skrill.inFan(this.fan, x, y);
    if (this.blow === 'bolts') return this.fell.some((b) => Math.hypot(x - b.x, y - b.y) < BOLT_R);
    return false;
  }

  /** Whether his swoop, going by low this frame, catches whoever is at (x, y), someone it has not caught this swoop. */
  sweeps(x: number, y: number, who: object): boolean {
    if (this.blow !== 'swoop' || this.swept.has(who)) return false;
    if (Math.hypot(x - this.x, y - this.y) >= SWOOP_W) return false;
    this.swept.add(who);
    return true;
  }

  /** Whether (x, y) is in the swoop's lane, for the drawing and for the tests. */
  inLane(x: number, y: number): boolean {
    const vx = this.to.x - this.from.x;
    const vy = this.to.y - this.from.y;
    const l2 = vx * vx + vy * vy || 1;
    const k = Math.max(0, Math.min(1, ((x - this.from.x) * vx + (y - this.from.y) * vy) / l2));
    return Math.hypot(x - this.from.x - vx * k, y - this.from.y - vy * k) < SWOOP_W;
  }

  /** How far through the sword's swing, for the drawing: drawn back, then across. */
  get swing(): number {
    if (this.state === 'windup') return -Math.min(1, this.t / SLASH_WINDUP);
    if (this.state === 'slash') return Math.min(1, this.t / SLASH_T);
    return 0;
  }

  /** How far a bolt has fallen, 0 to 1, while they fall; for the drawing. */
  get boltFall(): number {
    return this.state === 'bolts' ? Math.min(1, this.t / BOLT_T) : 0;
  }

  /** The swoop's lane: from where he hangs, through the figure, to a landing on his floor past it. */
  private aimAt(fig: Pt): void {
    const ad = Math.hypot(fig.x - this.x, fig.y - this.y) || 1;
    const ux = (fig.x - this.x) / ad;
    const uy = (fig.y - this.y) / ad;
    this.from = { x: this.x, y: this.y };
    this.to = { x: fig.x, y: fig.y };
    for (const past of [SWOOP_PAST, 40, 15]) {
      const p = { x: fig.x + ux * past, y: fig.y + uy * past };
      if (Math.hypot(p.x - this.room.x, p.y - this.room.y) < this.room.r - 20) {
        this.to = p;
        break;
      }
    }
    this.h = Math.atan2(uy, ux);
    this.set('aim');
    this.onAim?.();
  }

  private set(s: SkrillState): void {
    this.state = s;
    this.t = 0;
  }

  /** A stretch of flying toward (x, y), kept over his floor. */
  private fly(x: number, y: number, dt: number): void {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return;
    const s = Math.min(d, SKRILL_FLY * dt);
    this.x += (dx / d) * s;
    this.y += (dy / d) * s;
    const rd = Math.hypot(this.x - this.room.x, this.y - this.room.y);
    const max = this.room.r - 20;
    if (rd > max) {
      this.x = this.room.x + ((this.x - this.room.x) / rd) * max;
      this.y = this.room.y + ((this.y - this.room.y) / rd) * max;
    }
  }

  /** A step toward (x, y) across his floor. */
  private walk(x: number, y: number, dt: number): void {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return;
    const s = Math.min(d, SKRILL_SPEED * dt);
    walkStep(this, (dx / d) * s, (dy / d) * s, 99);
    this.h = Math.atan2(dy, dx);
  }

  /** The game draws him among his floor's solids, or over them up high (render/skrill.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
