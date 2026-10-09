/**
 * The kid's undead of Gigantis, the castle through island 7's portal: a room
 * of them at a time, fought on foot like the monkeys. Five kinds.
 *
 * A skeleton comes at the figure with a rusty sword and a little round shield:
 * it raises the sword (the warning), then slashes; its shield takes the first
 * spear, once, and breaks. An archer skeleton keeps its distance and shoots a
 * bone arrow at where the figure will be if it keeps going, so the counter is
 * to turn when it looses; it cannot block. A zombie shambles in, slow and hard to put down, and swings both arms.
 * A ghost floats at a distance and sends a slow wisp that drifts after the
 * figure: slower than it walks, so walk away from it. A necromancer keeps well
 * back and raises a skeleton out of the floor, one at a time, and another a
 * while after the last is beaten. Every hit is one heart, as the kid wrote.
 *
 * They wake when the figure comes into their room. The game does the hearts,
 * the companions and what the room opens as callbacks.
 */

import { rgba } from '../core/color';
import { angDiff, clamp } from '../core/math';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

export type UndeadKind = 'skeleton' | 'archer' | 'zombie' | 'ghost' | 'necro';

export type UndeadSpec = {
  hp: number;
  /** Walking speed; the figure walks at 85. */
  speed: number;
  /** How far its swing reaches; 0 for one that does not swing. */
  reach: number;
  /** How long its warning lasts before the swing. */
  windup: number;
  /** Keeps about this far off the figure; 0 to close in. */
  keep: number;
  /** Seconds between shots; 0 for one that does not shoot. */
  shoot: number;
  /** Blocks the first spear, once. */
  block: boolean;
  /** Seconds between raising skeletons, once the last is beaten; 0 never. */
  summon: number;
  /** Its size against the figure's. */
  scale: number;
};

export const UNDEAD: Readonly<Record<UndeadKind, UndeadSpec>> = {
  skeleton: {
    hp: 4,
    speed: 56,
    reach: 22,
    windup: 0.5,
    keep: 0,
    shoot: 0,
    block: true,
    summon: 0,
    scale: 1,
  },
  archer: {
    hp: 3,
    speed: 50,
    reach: 0,
    windup: 0,
    keep: 115,
    shoot: 2.8,
    block: false,
    summon: 0,
    scale: 1,
  },
  zombie: {
    hp: 8,
    speed: 32,
    reach: 22,
    windup: 0.7,
    keep: 0,
    shoot: 0,
    block: false,
    summon: 0,
    scale: 1.1,
  },
  ghost: {
    hp: 3,
    speed: 55,
    reach: 0,
    windup: 0,
    keep: 100,
    shoot: 3,
    block: false,
    summon: 0,
    scale: 1,
  },
  necro: {
    hp: 6,
    speed: 46,
    reach: 0,
    windup: 0,
    keep: 120,
    shoot: 0,
    block: false,
    summon: 7,
    scale: 1.1,
  },
};

/** The swing: how long it lands for after the warning, then how long it is open before it moves again. */
export const SWING = 0.2;
export const RECOVER = 0.9;
/** A swing lands on a figure this much past its reach, inside this angle either side of where it faces. */
export const SLASH_SLACK = 6;
export const SLASH_ARC = 1.2;
/** An arrow: how fast and how long; a wisp: how fast, how long and how hard it turns after the figure. */
export const ARROW_SPEED = 190;
export const ARROW_LIFE = 1.6;
export const WISP_SPEED = 70;
export const WISP_LIFE = 3.2;
export const WISP_TURN = 1.1;
/** A shot within this of the figure hits it. */
export const SHOT_HIT = 10;
/** The first shot or raised skeleton comes this soon after it wakes. */
export const FIRST = 1.4;
/** Seconds it falls once beaten. */
export const FALL = 1.2;

export type UndeadState =
  | 'wait'
  | 'walk'
  | 'windup'
  | 'swing'
  | 'recover'
  | 'rise'
  | 'fall'
  | 'gone';

export type Undead = {
  kind: UndeadKind;
  spec: UndeadSpec;
  x: number;
  y: number;
  h: number;
  hp: number;
  state: UndeadState;
  t: number;
  /** Until it shoots or raises again. */
  cd: number;
  /** Its shield is still whole. */
  guard: boolean;
  flash: number;
  blockT: number;
  /** For its walk and its float. */
  ph: number;
  /** A necromancer's skeleton, while it stands. */
  raised: Undead | null;
  /** Raised by a necromancer, not standing in the room when the figure came in. */
  summoned: boolean;
};

export type Shot = { kind: 'arrow' | 'wisp'; x: number; y: number; h: number; t: number };
export type Spawn = { kind: UndeadKind; x: number; y: number };

/**
 * Seconds until a shot at this speed meets something this far off (dx, dy) going at (vx, vy) in a
 * straight line: the smaller root of |d + v t| = s t. Something faster than the shot is led as far
 * as it would get in the time the shot takes to reach where it is now.
 */
export function intercept(dx: number, dy: number, vx: number, vy: number, s: number): number {
  const a = vx * vx + vy * vy - s * s;
  const b = 2 * (dx * vx + dy * vy);
  const c = dx * dx + dy * dy;
  const near = Math.sqrt(c) / s;
  if (a >= 0) return near;
  const disc = b * b - 4 * a * c;
  return disc < 0 ? near : (-b - Math.sqrt(disc)) / (2 * a);
}

/** Seconds a raised skeleton takes to climb out of the floor. */
export const RISE = 0.8;

export class Horde implements Entity {
  readonly list: Undead[] = [];
  readonly shots: Shot[] = [];
  /** Everyone in it is beaten. */
  cleared = false;
  /** A swing or a shot hit the figure. */
  onHit: ((by: 'slash' | 'arrow' | 'wisp') => void) | null = null;
  /** A shield took a spear. */
  onBlock: ((u: Undead) => void) | null = null;
  /** One of them is beaten. */
  onBeat: ((u: Undead) => void) | null = null;
  /** The whole room is beaten. */
  onClear: (() => void) | null = null;
  /** It has noticed the figure. */
  onWake: (() => void) | null = null;
  /** A warning, a shot, or a skeleton called up: for a sound. */
  onWindup: (() => void) | null = null;
  onShoot: (() => void) | null = null;
  onRaise: ((u: Undead) => void) | null = null;

  private awake = false;

  constructor(
    readonly room: { x: number; y: number; r: number },
    readonly spawns: readonly Spawn[],
  ) {
    this.reset();
  }

  private make(kind: UndeadKind, x: number, y: number, summoned: boolean): Undead {
    const spec = UNDEAD[kind];
    return {
      kind,
      spec,
      x,
      y,
      h: Math.PI * 1.25,
      hp: spec.hp,
      state: summoned ? 'rise' : 'wait',
      t: 0,
      cd: FIRST,
      guard: spec.block,
      flash: 0,
      blockT: 0,
      ph: this.list.length,
      raised: null,
      summoned,
    };
  }

  /** Everyone back where they stood, as when the figure first comes in. */
  reset(): void {
    this.list.length = 0;
    for (const s of this.spawns) this.list.push(this.make(s.kind, s.x, s.y, false));
    this.shots.length = 0;
    this.cleared = false;
    this.awake = false;
  }

  /** In the fight: there to be speared. */
  static up(u: Undead): boolean {
    return u.state !== 'wait' && u.state !== 'fall' && u.state !== 'gone' && u.state !== 'rise';
  }

  /** The nearest one in the fight within reach of a point. */
  nearest(x: number, y: number, reach: number): Undead | null {
    let best: Undead | null = null;
    let bd = reach;
    for (const u of this.list) {
      if (!Horde.up(u)) continue;
      const d = Math.hypot(u.x - x, u.y - y);
      if (d <= bd) {
        bd = d;
        best = u;
      }
    }
    return best;
  }

  /**
   * What a thrown spear goes for: a necromancer in reach first, since what it raises keeps coming while
   * it stands, then the nearest.
   */
  target(x: number, y: number, reach: number): Undead | null {
    let best: Undead | null = null;
    let bd = reach;
    for (const u of this.list) {
      if (u.kind !== 'necro' || !Horde.up(u)) continue;
      const d = Math.hypot(u.x - x, u.y - y);
      if (d <= bd) {
        bd = d;
        best = u;
      }
    }
    return best ?? this.nearest(x, y, reach);
  }

  /** A skeleton raised out of the floor at a point, as a necromancer does. */
  raise(x: number, y: number): Undead {
    const u = this.make('skeleton', x, y, true);
    this.list.push(u);
    this.cleared = false;
    return u;
  }

  /** A spear lands on one with this power, from (fx, fy). Returns whether its shield took it. */
  hit(u: Undead, power: number, fx: number, fy: number): boolean {
    if (!Horde.up(u)) return false;
    if (u.guard) {
      u.guard = false;
      u.blockT = 0.5;
      this.onBlock?.(u);
      return true;
    }
    u.hp = Math.max(0, u.hp - power);
    u.flash = 0.2;
    const d = Math.hypot(u.x - fx, u.y - fy) || 1;
    walkStep(u, ((u.x - fx) / d) * 8, ((u.y - fy) / d) * 8, 99);
    if (u.hp <= 0) {
      u.state = 'fall';
      u.t = 0;
      this.onBeat?.(u);
      // A necromancer's skeleton falls with it.
      if (u.raised && u.raised.state !== 'fall' && u.raised.state !== 'gone') {
        u.raised.state = 'fall';
        u.raised.t = 0;
      }
      this.checkClear();
    } else if (u.state === 'windup') {
      // Hit as it raises its sword, it flinches and starts over.
      u.state = 'walk';
      u.t = 0;
    }
    return false;
  }

  private checkClear(): void {
    if (this.cleared || !this.list.every((q) => q.state === 'fall' || q.state === 'gone')) return;
    this.cleared = true;
    this.shots.length = 0;
    this.onClear?.();
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    const inRoom =
      f !== null && Math.hypot(f.x - this.room.x, f.y - this.room.y) < this.room.r + 60;
    if (!this.awake && inRoom && !this.cleared) {
      this.awake = true;
      for (const u of this.list) if (u.state === 'wait') u.state = 'walk';
      this.onWake?.();
    }
    for (const u of this.list) {
      u.t += dt;
      u.ph += dt;
      u.flash = Math.max(0, u.flash - dt);
      u.blockT = Math.max(0, u.blockT - dt);
      if (u.state === 'gone' || u.state === 'wait') continue;
      if (u.state === 'fall') {
        if (u.t >= FALL) u.state = 'gone';
        continue;
      }
      if (u.state === 'rise') {
        if (u.t >= RISE) {
          u.state = 'walk';
          u.t = 0;
        }
        continue;
      }
      if (!inRoom || !f) continue;
      this.act(u, f, dt);
    }
    // Shots: arrows fly straight; wisps drift round after the figure.
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i] as Shot;
      s.t += dt;
      if (s.kind === 'wisp' && f) {
        const want = Math.atan2(f.y - s.y, f.x - s.x);
        s.h += clamp(angDiff(s.h, want), -WISP_TURN * dt, WISP_TURN * dt);
      }
      const sp = s.kind === 'arrow' ? ARROW_SPEED : WISP_SPEED;
      s.x += Math.cos(s.h) * sp * dt;
      s.y += Math.sin(s.h) * sp * dt;
      const life = s.kind === 'arrow' ? ARROW_LIFE : WISP_LIFE;
      if (f && inRoom && Math.hypot(s.x - f.x, s.y - f.y) < SHOT_HIT) {
        this.shots.splice(i, 1);
        this.onHit?.(s.kind);
      } else if (s.t > life || Math.hypot(s.x - this.room.x, s.y - this.room.y) > this.room.r + 20)
        this.shots.splice(i, 1);
    }
  }

  private act(u: Undead, f: { x: number; y: number; vx: number; vy: number }, dt: number): void {
    const sp = u.spec;
    const dx = f.x - u.x;
    const dy = f.y - u.y;
    const d = Math.hypot(dx, dy) || 1;
    // A necromancer raises a skeleton while it has none standing.
    if (sp.summon > 0) {
      const standing = u.raised && u.raised.state !== 'fall' && u.raised.state !== 'gone';
      if (!standing) {
        u.cd -= dt;
        if (u.cd <= 0) {
          u.cd = sp.summon;
          // Out of the floor between it and the figure.
          u.raised = this.raise(u.x + (dx / d) * 30, u.y + (dy / d) * 30);
          this.onRaise?.(u.raised);
        }
      }
    } else if (sp.shoot > 0) {
      u.cd -= dt;
      if (u.cd <= 0 && d < sp.keep * 1.6) {
        u.cd = sp.shoot;
        // An arrow at where the figure will be if it keeps going, so one that turns is not there; a
        // wisp straight at it, since it follows anyway.
        const arrow = u.kind !== 'ghost';
        const lead = arrow ? intercept(dx, dy, f.vx, f.vy, ARROW_SPEED) : 0;
        this.shots.push({
          kind: arrow ? 'arrow' : 'wisp',
          x: u.x,
          y: u.y,
          h: Math.atan2(f.y + f.vy * lead - u.y, f.x + f.vx * lead - u.x),
          t: 0,
        });
        this.onShoot?.();
      }
    }
    switch (u.state) {
      case 'walk': {
        u.h = Math.atan2(dy, dx);
        if (sp.keep > 0) {
          // Keep off: back away if close, come on if far, and drift round between.
          let mx = -dy / d;
          let my = dx / d;
          if (d < sp.keep * 0.8) {
            mx = -dx / d;
            my = -dy / d;
          } else if (d > sp.keep * 1.25) {
            mx = dx / d;
            my = dy / d;
          }
          this.step(u, mx * sp.speed * dt, my * sp.speed * dt);
          break;
        }
        if (d < sp.reach * 0.85) {
          u.state = 'windup';
          u.t = 0;
          this.onWindup?.();
          break;
        }
        this.step(u, (dx / d) * sp.speed * dt, (dy / d) * sp.speed * dt);
        break;
      }
      case 'windup':
        if (u.t >= sp.windup) {
          u.state = 'swing';
          u.t = 0;
          if (d < sp.reach + SLASH_SLACK && Math.abs(angDiff(u.h, Math.atan2(dy, dx))) < SLASH_ARC)
            this.onHit?.('slash');
        }
        break;
      case 'swing':
        if (u.t >= SWING) {
          u.state = 'recover';
          u.t = 0;
        }
        break;
      case 'recover':
        if (u.t >= RECOVER) {
          u.state = 'walk';
          u.t = 0;
        }
        break;
    }
  }

  /** A step, kept inside the room; a ghost floats, so nothing else stops it. */
  private step(u: Undead, mx: number, my: number): void {
    const nx = u.x + mx;
    const ny = u.y + my;
    if (Math.hypot(nx - this.room.x, ny - this.room.y) > this.room.r - 16) return;
    if (u.kind === 'ghost') {
      u.x = nx;
      u.y = ny;
    } else walkStep(u, mx, my, 99);
  }

  /** The shots, in the air over everyone. */
  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air' || !this.shots.length || !v.onScreen(this.room.x, this.room.y, 400)) return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    for (const s of this.shots) {
      const sx = px(s.x, s.y);
      const sy = py(s.x, s.y, 16);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      v.isoEllipse(s.x, s.y, 4);
      ctx.fill();
      if (s.kind === 'arrow') {
        const ex = px(s.x - Math.cos(s.h) * 12, s.y - Math.sin(s.h) * 12);
        const ey = py(s.x - Math.cos(s.h) * 12, s.y - Math.sin(s.h) * 12, 16);
        ctx.strokeStyle = '#E8E1CC';
        ctx.lineWidth = 2 * Z;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(sx, sy);
        ctx.stroke();
        ctx.fillStyle = '#8E8A80';
        ctx.beginPath();
        ctx.arc(sx, sy, 2 * Z, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = rgba('#B8FFD8', 0.3);
        ctx.beginPath();
        ctx.arc(sx, sy, (8 + Math.sin(T * 8) * 1.5) * Z, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#E4FFF0';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.4 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** One of them, at its feet, for the room's sorted actors. */
  drawUnit(v: DrawView, u: Undead): void {
    if (u.state === 'gone') return;
    const { ctx, px, py } = v;
    const k = u.spec.scale * v.zoom;
    const fall = u.state === 'fall' ? clamp(u.t / FALL, 0, 1) : 0;
    const rise = u.state === 'rise' ? clamp(u.t / RISE, 0, 1) : 1;
    const sx = px(u.x, u.y);
    let base = py(u.x, u.y);
    ctx.globalAlpha = 1 - fall * 0.85;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    v.isoEllipse(u.x, u.y, 8 * u.spec.scale);
    ctx.fill();
    if (u.state === 'rise') {
      // Climbing out of a green-lit crack in the floor.
      ctx.fillStyle = rgba('#7CFF9A', 0.5 * (1 - rise));
      v.isoEllipse(u.x, u.y, 14);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx - 30 * k, base - 60 * k, 60 * k, 60 * k);
      ctx.clip();
      base += (1 - rise) * 28 * k;
    }
    const face = Math.cos(u.h) - Math.sin(u.h) >= 0 ? 1 : -1;
    const hurt = u.flash > 0;
    const W = (c: string) => (hurt ? '#FFFFFF' : c);
    const moving = u.state === 'walk';
    const stride = moving ? Math.sin(u.ph * 9) * 3 * k : 0;
    if (u.kind === 'ghost') this.drawGhost(v, u, sx, base, k, W);
    else if (u.kind === 'necro') this.drawNecro(v, u, sx, base, k, W, face);
    else if (u.kind === 'zombie') this.drawZombie(v, u, sx, base, k, W, face, stride);
    else this.drawSkeleton(v, u, sx, base, k, W, face, stride);
    if (u.state === 'rise') ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawSkeleton(
    v: DrawView,
    u: Undead,
    sx: number,
    base: number,
    k: number,
    W: (c: string) => string,
    face: number,
    stride: number,
  ): void {
    const { ctx, T } = v;
    const bone = W('#EDE8DA');
    ctx.strokeStyle = bone;
    ctx.lineCap = 'round';
    // Legs and the spine.
    ctx.lineWidth = 1.8 * k;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx + side * 2 * k, base - 10 * k);
      ctx.lineTo(sx + side * 2 * k + stride * side, base);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(sx, base - 10 * k);
    ctx.lineTo(sx, base - 21 * k);
    ctx.stroke();
    // The hips and the ribs.
    ctx.lineWidth = 1.4 * k;
    ctx.beginPath();
    ctx.moveTo(sx - 3 * k, base - 10 * k);
    ctx.lineTo(sx + 3 * k, base - 10 * k);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const y = base - 14 * k - i * 2.4 * k;
      ctx.beginPath();
      ctx.ellipse(sx, y, (4 - i * 0.4) * k, 1.2 * k, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    // The skull: round, with dark sockets and a jaw.
    const hy = base - 25 * k;
    ctx.fillStyle = bone;
    ctx.beginPath();
    ctx.arc(sx, hy, 4.2 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(sx - 2.4 * k, hy + 2.6 * k, 4.8 * k, 2.4 * k);
    ctx.fillStyle = '#1E2227';
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx + face * 0.8 * k + e * 1.6 * k, hy - 0.2 * k, 1.1 * k, 0, Math.PI * 2);
      ctx.fill();
    }
    const hx = sx + face * 5 * k;
    const hyy = base - 16 * k;
    if (u.kind === 'archer') {
      // A bow, drawn back as the next arrow nears.
      const pull = clamp(1 - u.cd / 0.6, 0, 1);
      ctx.strokeStyle = W('#8A6A43');
      ctx.lineWidth = 1.6 * k;
      ctx.beginPath();
      ctx.arc(hx, hyy, 7 * k, face > 0 ? -1.2 : Math.PI - 1.2, face > 0 ? 1.2 : Math.PI + 1.2);
      ctx.stroke();
      ctx.strokeStyle = W('#D9D2BE');
      ctx.lineWidth = 0.8 * k;
      ctx.beginPath();
      ctx.moveTo(hx + face * Math.cos(1.2) * 7 * k, hyy - Math.sin(1.2) * 7 * k);
      ctx.lineTo(hx - face * pull * 4 * k, hyy);
      ctx.lineTo(hx + face * Math.cos(1.2) * 7 * k, hyy + Math.sin(1.2) * 7 * k);
      ctx.stroke();
      return;
    }
    // A rusty sword: raised for the warning, swept across in the swing.
    let a = -face * 0.5;
    if (u.state === 'windup') a = -face * (1.2 + Math.sin(T * 30) * 0.05);
    else if (u.state === 'swing') a = face * (0.6 + (u.t / SWING) * 1.4);
    const len = 13 * k;
    ctx.strokeStyle = W('#A8826A');
    ctx.lineWidth = 1.8 * k;
    ctx.beginPath();
    ctx.moveTo(hx, hyy);
    ctx.lineTo(hx + Math.sin(a) * len * face, hyy - Math.cos(a) * len);
    ctx.stroke();
    // The shield on the other arm, while it holds.
    if (u.guard || u.blockT > 0) {
      ctx.fillStyle = W(u.blockT > 0 ? '#FFE9A8' : '#7A5A3A');
      ctx.beginPath();
      ctx.arc(sx - face * 5 * k, base - 15 * k, 4 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = W('#B8A070');
      ctx.beginPath();
      ctx.arc(sx - face * 5 * k, base - 15 * k, 1.2 * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawZombie(
    v: DrawView,
    u: Undead,
    sx: number,
    base: number,
    k: number,
    W: (c: string) => string,
    face: number,
    stride: number,
  ): void {
    const { ctx, T } = v;
    const sway = Math.sin(u.ph * 3) * 1.5 * k;
    ctx.lineCap = 'round';
    ctx.strokeStyle = W('#4A3E30');
    ctx.lineWidth = 2.6 * k;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx + side * 2 * k, base - 9 * k);
      ctx.lineTo(sx + side * 2 * k + stride * 0.6 * side, base);
      ctx.stroke();
    }
    // Torn clothes.
    ctx.fillStyle = W('#5B6B4A');
    ctx.beginPath();
    ctx.moveTo(sx - 5 * k + sway, base - 21 * k);
    ctx.lineTo(sx + 5 * k + sway, base - 21 * k);
    ctx.lineTo(sx + 5.5 * k, base - 8 * k);
    ctx.lineTo(sx + 2 * k, base - 10 * k);
    ctx.lineTo(sx - 1 * k, base - 7.5 * k);
    ctx.lineTo(sx - 5.5 * k, base - 9 * k);
    ctx.closePath();
    ctx.fill();
    // Arms out in front, raised high for the swing.
    const up = u.state === 'windup' ? 7 : u.state === 'swing' ? -2 : 2;
    ctx.strokeStyle = W('#8FB06A');
    ctx.lineWidth = 2.2 * k;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx + side * 3.5 * k + sway, base - 18 * k);
      ctx.lineTo(sx + face * 9 * k + side * 1.5 * k + sway, base - (17 + up) * k);
      ctx.stroke();
    }
    // A lolling green head with dark eyes.
    const hx = sx + sway + Math.sin(T * 2 + u.ph) * 0.8 * k;
    const hy = base - 25 * k;
    ctx.fillStyle = W('#8FB06A');
    ctx.beginPath();
    ctx.arc(hx, hy, 4.4 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#26301C';
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + face * 0.8 * k + e * 1.6 * k, hy - 0.3 * k, 0.9 * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(hx + face * 0.5 * k - 1.4 * k, hy + 2 * k, 2.8 * k, 0.8 * k);
  }

  private drawGhost(
    v: DrawView,
    u: Undead,
    sx: number,
    base: number,
    k: number,
    W: (c: string) => string,
  ): void {
    const { ctx, T } = v;
    const lift = (8 + Math.sin(u.ph * 2.4) * 3) * k;
    const top = base - lift - 26 * k;
    const bot = base - lift;
    ctx.globalAlpha *= 0.82;
    ctx.fillStyle = W('#EEF6F2');
    ctx.beginPath();
    ctx.moveTo(sx - 7 * k, bot);
    ctx.lineTo(sx - 7 * k, top + 8 * k);
    ctx.arc(sx, top + 8 * k, 7 * k, Math.PI, Math.PI * 2);
    ctx.lineTo(sx + 7 * k, bot);
    // A wavy hem, moving.
    for (let i = 3; i >= 0; i--) {
      const x = sx - 7 * k + (i * 14 * k) / 4;
      ctx.quadraticCurveTo(x + 1.75 * k, bot + (3 + Math.sin(T * 6 + i) * 1.5) * k, x, bot);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha /= 0.82;
    ctx.fillStyle = '#1E2227';
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx + e * 2.6 * k, top + 8 * k, 1.3 * k, 2 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(sx, top + 13 * k, 1.4 * k, 1.8 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawNecro(
    v: DrawView,
    u: Undead,
    sx: number,
    base: number,
    k: number,
    W: (c: string) => string,
    face: number,
  ): void {
    const { ctx, T } = v;
    // A dark robe to the floor, and a hood.
    ctx.fillStyle = W('#3B2550');
    ctx.beginPath();
    ctx.moveTo(sx - 7 * k, base);
    ctx.lineTo(sx - 4 * k, base - 22 * k);
    ctx.lineTo(sx + 4 * k, base - 22 * k);
    ctx.lineTo(sx + 7 * k, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = W('#2A1A3A');
    ctx.beginPath();
    ctx.arc(sx, base - 25 * k, 5 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7CFF9A';
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx + face * 1 * k + e * 1.6 * k, base - 24.5 * k, 0.9 * k, 0, Math.PI * 2);
      ctx.fill();
    }
    // A staff with a little skull on it, glowing as it raises the dead.
    const raising =
      u.cd < 0.8 && !(u.raised && u.raised.state !== 'fall' && u.raised.state !== 'gone');
    const gx = sx + face * 8 * k;
    ctx.strokeStyle = W('#5E3D1C');
    ctx.lineWidth = 1.6 * k;
    ctx.beginPath();
    ctx.moveTo(gx, base);
    ctx.lineTo(gx, base - 30 * k);
    ctx.stroke();
    ctx.fillStyle = rgba('#7CFF9A', raising ? 0.6 + 0.3 * Math.sin(T * 12) : 0.25);
    ctx.beginPath();
    ctx.arc(gx, base - 32 * k, 5 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = W('#EDE8DA');
    ctx.beginPath();
    ctx.arc(gx, base - 32 * k, 2.4 * k, 0, Math.PI * 2);
    ctx.fill();
  }
}
