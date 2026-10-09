/**
 * The Deep One below, as Cthulhu, the kid's: dragged under to its drowned
 * temple, the figure (in its diving helmet) finds it at the back of the hall,
 * an octopus for a head, a beard of tentacles, folded wings, ten spear hits. It
 * does not walk; it sends its tentacles. Every so often the floor ripples where
 * the figure is going (RIPPLE), and a tentacle bursts up there and goes for the
 * figure, fast, faster than the figure walks: so the counter is not to run but
 * to spear it, and one spear sinks one. No more than three at a time. A
 * tentacle that reaches the figure bonks it and sinks. Past half it sends them
 * quicker. Beaten, it crumbles into the deep, and the game pays out what it
 * hoarded. Leave the temple and it waits, whole, for next time.
 */

import { angDiff } from '../core/math';
import type { Room } from '../world/tower';
import { drawTentacle } from './deepone';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

export const CTHULHU_HP = 10;
/** Its tentacles: how fast they go for the figure (it walks at 85), and how many hits each takes. */
export const TENT_SPEED = 112;
export const TENT_HP = 1;
/** One every so often, three at most; the floor ripples this long first; one gives up after this long. */
export const SUMMON_EVERY = 2.4;
export const SUMMON_ANGRY = 1.6;
export const FIRST_SUMMON = 1.8;
export const MAX_TENTS = 3;
export const RIPPLE = 0.75;
export const CHASE_MAX = 5;
/** A tentacle this close bonks the figure. */
export const BONK_R = 16;
/** Seconds it crumbles, beaten. */
export const FALL = 2.2;
/** Its body, at the back of the hall: nothing walks through it. */
export const CTH_R = 44;

export type Tent = {
  x: number;
  y: number;
  /** Seconds in its state. */
  t: number;
  state: 'ripple' | 'chase' | 'sink';
  hp: number;
  h: number;
  /** Seconds left stuck with tar: it stops where it is. */
  stun?: number;
};

export type CthulhuState = 'wait' | 'fight' | 'fall' | 'gone';

export class Cthulhu implements Entity {
  state: CthulhuState = 'wait';
  hp = CTHULHU_HP;
  x: number;
  y: number;
  t = 0;
  flash = 0;
  readonly tents: Tent[] = [];
  private summonCd = FIRST_SUMMON;
  /** It has seen the figure come in. */
  onWake: (() => void) | null = null;
  /** A tentacle got the figure. */
  onBonk: ((by: 'tentacle') => void) | null = null;
  /** The floor ripples: a tentacle is coming. */
  onRipple: (() => void) | null = null;
  /** A tentacle was speared down. */
  onSink: ((x: number, y: number) => void) | null = null;
  /** It is beaten and has crumbled. */
  onBeaten: (() => void) | null = null;

  constructor(readonly room: Room) {
    this.x = room.x - room.r * 0.35;
    this.y = room.y - room.r * 0.35;
  }

  /** In the fight: there to be speared. */
  get up(): boolean {
    return this.state === 'fight';
  }

  get angry(): boolean {
    return this.hp <= CTHULHU_HP / 2;
  }

  /** Whole again and waiting, as when the figure leaves. */
  reset(): void {
    if (this.state === 'gone') return;
    this.state = 'wait';
    this.hp = CTHULHU_HP;
    this.t = 0;
    this.flash = 0;
    this.tents.length = 0;
    this.summonCd = FIRST_SUMMON;
  }

  /** Beaten for good, as a save remembers. */
  beaten(): void {
    this.state = 'gone';
    this.tents.length = 0;
  }

  /** A spear lands on it. */
  hit(power: number): void {
    if (!this.up) return;
    this.hp = Math.max(0, this.hp - power);
    this.flash = 1;
    if (this.hp <= 0) {
      this.state = 'fall';
      this.t = 0;
      for (const k of this.tents) k.state = 'sink';
    }
  }

  /** A spear lands on one of its tentacles. */
  /** Seconds left stuck with tar on its face: no tentacles come up. */
  stunT = 0;

  /** Tar on its face: no tentacles come up for this many seconds. */
  stun(s: number): void {
    if (this.state === 'fight') this.stunT = Math.max(this.stunT, s);
  }

  /** Tar on a tentacle: it stops where it is for this many seconds. */
  stunTent(k: Tent, s: number): void {
    if (k.state === 'chase') k.stun = Math.max(k.stun ?? 0, s);
  }

  hitTent(k: Tent, power: number): void {
    if (k.state !== 'chase') return;
    k.hp -= power;
    if (k.hp <= 0) {
      k.state = 'sink';
      k.t = 0;
      this.onSink?.(k.x, k.y);
    }
  }

  /** The nearest tentacle up and going for the figure, within reach of a point. */
  nearestTent(x: number, y: number, reach: number): Tent | null {
    let best: Tent | null = null;
    let bd = reach;
    for (const k of this.tents) {
      if (k.state !== 'chase') continue;
      const d = Math.hypot(k.x - x, k.y - y);
      if (d <= bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  }

  update(dt: number, w: World): void {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    const f = w.figure;
    const inRoom = !!f && Math.hypot(f.x - this.room.x, f.y - this.room.y) < this.room.r + 60;
    for (let i = this.tents.length - 1; i >= 0; i--) {
      const k = this.tents[i] as Tent;
      k.t += dt;
      if (k.state === 'sink' && k.t > 0.6) this.tents.splice(i, 1);
    }
    if (this.state === 'gone') return;
    if (this.state === 'fall') {
      if (this.t >= FALL) {
        this.state = 'gone';
        this.onBeaten?.();
      }
      return;
    }
    if (!inRoom || !f) {
      if (this.state !== 'wait') this.reset();
      return;
    }
    if (this.state === 'wait') {
      this.state = 'fight';
      this.t = 0;
      this.onWake?.();
      return;
    }
    // Send a tentacle up where the figure is going, unless there is tar on its face.
    if (this.stunT > 0) this.stunT -= dt;
    else this.summonCd -= dt;
    const live = this.tents.filter((k) => k.state !== 'sink').length;
    if (this.summonCd <= 0 && live < MAX_TENTS) {
      this.summonCd = this.angry ? SUMMON_ANGRY : SUMMON_EVERY;
      let x = f.x + f.vx * RIPPLE;
      let y = f.y + f.vy * RIPPLE;
      // On the floor, off the walls.
      const d = Math.hypot(x - this.room.x, y - this.room.y);
      const max = this.room.r - 24;
      if (d > max) {
        x = this.room.x + ((x - this.room.x) / d) * max;
        y = this.room.y + ((y - this.room.y) / d) * max;
      }
      this.tents.push({ x, y, t: 0, state: 'ripple', hp: TENT_HP, h: 0 });
      this.onRipple?.();
    }
    for (const k of this.tents) {
      if (k.state === 'ripple' && k.t >= RIPPLE) {
        k.state = 'chase';
        k.t = 0;
        if (Math.hypot(f.x - k.x, f.y - k.y) < BONK_R + 6) {
          this.onBonk?.('tentacle');
          k.state = 'sink';
        }
        continue;
      }
      if (k.state !== 'chase') continue;
      if ((k.stun ?? 0) > 0) {
        k.stun = (k.stun ?? 0) - dt;
        continue;
      }
      const dx = f.x - k.x;
      const dy = f.y - k.y;
      const d = Math.hypot(dx, dy) || 1;
      k.h += angDiff(Math.atan2(dy, dx), k.h) * Math.min(1, dt * 8);
      walkStep(k, (dx / d) * TENT_SPEED * dt, (dy / d) * TENT_SPEED * dt, 99);
      if (d < BONK_R) {
        this.onBonk?.('tentacle');
        k.state = 'sink';
        k.t = 0;
      } else if (k.t > CHASE_MAX) {
        k.state = 'sink';
        k.t = 0;
      }
    }
  }

  /** The ripples where tentacles are coming, on the floor. */
  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'surface') return;
    const { ctx } = v;
    const Z = v.zoom;
    for (const k of this.tents) {
      if (k.state !== 'ripple') continue;
      for (let i = 0; i < 3; i++) {
        const t = ((k.t / RIPPLE) * 1.5 + i / 3) % 1;
        v.isoEllipse(k.x, k.y, 6 + t * 18);
        ctx.strokeStyle = `rgba(120,255,190,${0.7 * (1 - t)})`;
        ctx.lineWidth = 2 * Z;
        ctx.stroke();
      }
    }
  }

  /** One tentacle, for the game's sorted solids. */
  drawTent(v: DrawView, k: Tent): void {
    const up =
      k.state === 'chase'
        ? Math.min(1, k.t * 5)
        : k.state === 'sink'
          ? Math.max(0, 1 - k.t / 0.6)
          : 0;
    if (up <= 0) return;
    drawTentacle(v, k.x, k.y, 42 * up, k.x * 0.01, 0.75);
  }

  /** It, at the back of its temple, for the game's sorted solids. */
  drawBody(v: DrawView): void {
    if (this.state === 'gone') return;
    const sink = this.state === 'fall' ? Math.min(1, this.t / FALL) : 0;
    drawCthulhu(v, this.x, this.y, this.t, this.flash, this.angry, sink);
  }
}

/** Cthulhu: folded wings, a hunched body, an octopus head with glowing eyes and a beard of tentacles. */
export function drawCthulhu(
  v: DrawView,
  x: number,
  y: number,
  t: number,
  flash: number,
  angry: boolean,
  sink: number,
): void {
  const { ctx, px, py } = v;
  const Z = v.zoom * 1.5;
  const sx = px(x, y);
  const sy = py(x, y) + sink * 60 * Z;
  const skin = flash > 0 ? '#7FB89A' : '#3E6B57';
  ctx.save();
  ctx.globalAlpha = 1 - sink * 0.8;
  // Wings behind, bat-like, half open.
  ctx.fillStyle = '#2C4C3F';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx + s * 12 * Z, sy - 50 * Z);
    ctx.lineTo(sx + s * 52 * Z, sy - 80 * Z - Math.sin(t * 1.5) * 4 * Z);
    ctx.lineTo(sx + s * 44 * Z, sy - 52 * Z);
    ctx.lineTo(sx + s * 56 * Z, sy - 46 * Z);
    ctx.lineTo(sx + s * 40 * Z, sy - 34 * Z);
    ctx.lineTo(sx + s * 14 * Z, sy - 30 * Z);
    ctx.closePath();
    ctx.fill();
  }
  // Body, hunched.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 26 * Z, 24 * Z, 28 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // Arms with claws, resting.
  ctx.strokeStyle = skin;
  ctx.lineWidth = 7 * Z;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx + s * 18 * Z, sy - 36 * Z);
    ctx.quadraticCurveTo(sx + s * 34 * Z, sy - 22 * Z, sx + s * 28 * Z, sy - 4 * Z);
    ctx.stroke();
  }
  // The head: a great octopus dome.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(sx, sy - 70 * Z, 22 * Z, 26 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // The beard of tentacles, writhing.
  ctx.strokeStyle = '#335C4A';
  ctx.lineWidth = 3.5 * Z;
  for (let i = 0; i < 6; i++) {
    const bx = sx + (-12 + i * 5) * Z;
    const sw = Math.sin(t * 3 + i) * 4 * Z;
    ctx.beginPath();
    ctx.moveTo(bx, sy - 54 * Z);
    ctx.quadraticCurveTo(bx + sw, sy - 42 * Z, bx - sw * 0.5, sy - 32 * Z);
    ctx.stroke();
  }
  // Eyes.
  ctx.fillStyle = angry ? '#FF5A3C' : '#B8FF7A';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx + s * 8 * Z, sy - 70 * Z, 4 * Z, 2.6 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
