/**
 * The warlock, the kid's companion, freed from the demons' cage: part man,
 * part bird. Once he is free he comes ashore with the figure wherever it goes,
 * every island and every room, following its steps a little behind; left far
 * behind (a door, the stairs, a portal) he vanishes in a puff of green and
 * appears at its side. He helps in a fight: every so often he points his staff
 * at the nearest enemy in reach and a green bolt flies, always landing, as the
 * spear does. He has three hearts, like the figure, and gets them back the same
 * way, out of a fight. Run out and he is worn out: he flies back to his boat to
 * rest and comes back the next time the figure steps ashore, or after a while.
 * The game finds his targets and decides what hurts him.
 */

import { drawWarlock } from '../render/warlock';
import { inTar } from '../world/isle4';
import type { DrawView, Entity, Layer, World } from './entity';
import { STUCK_T } from './pals';
import { walkable, walkStep } from './walker';

export const WARLOCK_HEARTS = 3;
/** He keeps this far behind the figure, and walks up to this fast to stay there. */
export const HEEL = 28;
export const WARLOCK_SPEED = 105;
/** Further than this from the figure and he blinks to its side. */
export const BLINK = 200;
/** His bolts: how often, how far he can reach, how fast they fly, and how hard they hit. */
export const CAST_EVERY = 1.6;
export const CAST_RANGE = 150;
export const BOLT_SPEED = 260;
export const BOLT_POWER = 1;
/** After a hit he cannot be hurt again for this long. */
export const WARLOCK_INVULN = 1.2;
/** Out of a fight, a heart back this often. */
export const MEND = 6;
/** Worn out, he rests on his boat this long before he comes back on his own. */
export const REST = 40;

/** Something he can cast at: where it is, and what a bolt does when it lands. */
export type Target = { x: number; y: number; hit(power: number): void };
export type Bolt = { x0: number; y0: number; t: number; dur: number; to: Target };
/** A puff of green smoke where he vanished or appeared. */
export type Puff = { x: number; y: number; t: number };

export class Warlock implements Entity {
  /** Free of the cage: whether he exists at all. */
  free = false;
  /** With the figure ashore, or resting on his boat. */
  state: 'away' | 'with' | 'resting' = 'away';
  x = 0;
  y = 0;
  h = Math.PI / 4;
  ph = 0;
  gait = 0;
  hearts = WARLOCK_HEARTS;
  readonly bolts: Bolt[] = [];
  readonly puffs: Puff[] = [];
  /** Seconds since he last cast, to the next cast, of invulnerability, to the next heart, and of rest. */
  cast = 9;
  private castCd = 1;
  invuln = 0;
  private mend = 0;
  private rest = 0;
  private readonly trail: { x: number; y: number }[] = [];
  /** Seconds it has wanted to follow and not moved. */
  private blockedT = 0;
  private hadFigure = false;
  /** The nearest thing in reach to cast at, which the game finds. */
  findTarget: ((x: number, y: number, range: number) => Target | null) | null = null;
  /** Whether a fight is on, for mending; the game knows. */
  fighting: (() => boolean) | null = null;
  /** He cast a bolt. */
  onCast: (() => void) | null = null;
  /** He was hurt; out says he is worn out. */
  onHurt: ((out: boolean) => void) | null = null;
  /** He has come ashore beside the figure. */
  onArrive: (() => void) | null = null;

  /** Beside the figure, now: off his boat as it lands, or blinking over when left behind. */
  private arrive(f: { x: number; y: number; h?: number }): void {
    const h = f.h ?? Math.PI / 4;
    // Behind and to one side, on the ground the figure stands on.
    for (const [a, r] of [
      [Math.PI * 0.75, 22],
      [-Math.PI * 0.75, 22],
      [Math.PI, 18],
      [Math.PI / 2, 16],
      [-Math.PI / 2, 16],
    ] as const) {
      const x = f.x + Math.cos(h + a) * r;
      const y = f.y + Math.sin(h + a) * r;
      this.x = f.x;
      this.y = f.y;
      if (walkable(x, y, 99)) {
        this.x = x;
        this.y = y;
        break;
      }
    }
    this.trail.length = 0;
    this.puffs.push({ x: this.x, y: this.y, t: 0 });
    this.onArrive?.();
  }

  /** Out of the cage, now, at a point: free, with the figure, hearts full. */
  come(x: number, y: number): void {
    this.free = true;
    this.state = 'with';
    this.hearts = WARLOCK_HEARTS;
    this.x = x;
    this.y = y;
    this.trail.length = 0;
    this.hadFigure = true;
    this.puffs.push({ x, y, t: 0 });
  }

  /** A hit on him. Returns whether it hurt. */
  hurt(): boolean {
    if (this.state !== 'with' || this.invuln > 0) return false;
    this.hearts--;
    this.invuln = WARLOCK_INVULN;
    this.mend = 0;
    if (this.hearts <= 0) {
      this.state = 'resting';
      this.rest = REST;
      this.bolts.length = 0;
      this.puffs.push({ x: this.x, y: this.y, t: 0 });
      this.onHurt?.(true);
    } else this.onHurt?.(false);
    return true;
  }

  /** Back to how he is between landings: off with his boat, hearts full. */
  goAboard(): void {
    if (this.state === 'with') this.state = 'away';
    this.bolts.length = 0;
    this.trail.length = 0;
  }

  update(dt: number, w: World): void {
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i] as Puff;
      p.t += dt;
      if (p.t > 0.8) this.puffs.splice(i, 1);
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i] as Bolt;
      b.t += dt;
      if (b.t >= b.dur) {
        this.bolts.splice(i, 1);
        b.to.hit(BOLT_POWER);
      }
    }
    if (!this.free) return;
    const f = w.figure;
    const landed = !!f && !this.hadFigure;
    this.hadFigure = !!f;
    this.invuln = Math.max(0, this.invuln - dt);
    // Worn out, he is back the next time the figure steps ashore.
    if (this.state === 'resting' && landed) this.rest = 0;
    if (this.state === 'resting') {
      this.rest -= dt;
      if (this.rest > 0) return;
      this.state = 'away';
      this.hearts = WARLOCK_HEARTS;
    }
    if (!f) {
      if (this.state === 'with') this.goAboard();
      // Ashore he heals up again between landings.
      this.hearts = WARLOCK_HEARTS;
      return;
    }
    if (this.state === 'away') {
      this.state = 'with';
      this.hearts = WARLOCK_HEARTS;
      this.castCd = 1;
      this.arrive(f);
      return;
    }
    const d = Math.hypot(f.x - this.x, f.y - this.y);
    if (d > BLINK) {
      this.puffs.push({ x: this.x, y: this.y, t: 0 });
      this.arrive(f);
      return;
    }
    // Follow the figure's steps.
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(f.x - last.x, f.y - last.y) >= 6) {
      this.trail.push({ x: f.x, y: f.y });
      if (this.trail.length > 80) this.trail.shift();
    }
    this.gait = Math.max(0, this.gait - dt * 4);
    if (d > HEEL) {
      while (this.trail.length > 1) {
        const c = this.trail[0] as { x: number; y: number };
        if (Math.hypot(c.x - this.x, c.y - this.y) >= 5) break;
        this.trail.shift();
      }
      const t = this.trail[0] ?? f;
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const dl = Math.hypot(dx, dy);
      if (dl > 0.5) {
        const sp = Math.min(WARLOCK_SPEED, 30 + (d - HEEL) * 4);
        const moved = walkStep(this, (dx / dl) * sp * dt, (dy / dl) * sp * dt, 99);
        // No way along the steps at all for a while: pop over beside the figure.
        this.blockedT = moved > 0 ? 0 : this.blockedT + dt;
        if (this.blockedT >= STUCK_T) {
          this.blockedT = 0;
          this.arrive(f);
        }
        if (moved > 0) {
          this.h = Math.atan2(dy, dx);
          this.ph += moved * 0.12;
          this.gait = 1;
        }
      }
    } else this.h = Math.atan2(f.y - this.y, f.x - this.x);
    // Mend out of a fight.
    const fight = this.fighting?.() ?? false;
    if (!fight && this.hearts < WARLOCK_HEARTS) {
      this.mend += dt;
      if (this.mend >= MEND) {
        this.mend = 0;
        this.hearts++;
      }
    }
    // Cast at the nearest enemy in reach.
    this.cast += dt;
    this.castCd -= dt;
    if (this.castCd <= 0) {
      const to = this.findTarget?.(this.x, this.y, CAST_RANGE) ?? null;
      if (to) {
        this.castCd = CAST_EVERY;
        this.cast = 0;
        this.h = Math.atan2(to.y - this.y, to.x - this.x);
        const dur = Math.max(0.12, Math.hypot(to.x - this.x, to.y - this.y) / BOLT_SPEED);
        this.bolts.push({ x0: this.x, y0: this.y, t: 0, dur, to });
        this.onCast?.();
      }
    }
  }

  /** With the figure ashore: there to be drawn among the solids. */
  get shown(): boolean {
    return this.free && this.state === 'with';
  }

  /** Him, at his feet, for the game's sorted solids. */
  drawBody(v: DrawView): void {
    if (!this.shown) return;
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2) return;
    // Over island 4's tar he does not swim: he floats a hand above it on a green shimmer.
    let z = 0;
    if (inTar(this.x, this.y)) {
      z = 7 + Math.sin(v.T * 2.2) * 1.5;
      v.isoEllipse(this.x, this.y, 9 + Math.sin(v.T * 3) * 1.5);
      v.ctx.strokeStyle = 'rgba(120,255,150,.45)';
      v.ctx.lineWidth = 1.5 * v.zoom;
      v.ctx.stroke();
    }
    drawWarlock(v, this.x, this.y, z, {
      h: this.h,
      ph: this.ph,
      gait: this.gait,
      cast: this.cast,
      hurt: this.invuln > WARLOCK_INVULN - 0.15,
    });
  }

  /** His bolts and the puffs, in the air. */
  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air') return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const b of this.bolts) {
      const k = b.t / b.dur;
      const x = b.x0 + (b.to.x - b.x0) * k;
      const y = b.y0 + (b.to.y - b.y0) * k;
      const z = 30 + Math.sin(Math.PI * k) * 14 - k * 16;
      ctx.fillStyle = 'rgba(120,255,150,.35)';
      ctx.beginPath();
      ctx.arc(px(x, y), py(x, y, z), 6 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E2FFD6';
      ctx.beginPath();
      ctx.arc(px(x, y), py(x, y, z), 2.6 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of this.puffs) {
      const a = 1 - p.t / 0.8;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const r = (6 + p.t * 30) * Z;
        ctx.fillStyle = `rgba(140,235,160,${0.45 * a})`;
        ctx.beginPath();
        ctx.arc(
          px(p.x, p.y) + Math.cos(ang) * r,
          py(p.x, p.y, 14) + Math.sin(ang) * r * 0.6,
          (5 - p.t * 3) * Z,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }
}
