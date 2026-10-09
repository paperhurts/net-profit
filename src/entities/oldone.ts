/**
 * The Old One, the kid's ("you see the old one rise, he wants you dead"): what sleeps under the black pool
 * in the ruins behind the Forgotten One's throne. He rises out of it, enormous, and stays in it from the
 * waist up: a hunched shape of black running with water, a long head crowned with branching horns, a ring of
 * pale eyes and a maw. He fights as the kid wrote, by summoning: five creatures climb out of the black water
 * (the game raises them; two hit points and a heart a claw each), and five more every few seconds while
 * fewer than four are standing. And his great hand reaches anywhere in the ruins: it rises over a ring on the
 * ground where the figure stands (the warning), then slams down there, a heart; the ring does not follow, so
 * step out of it. The spear reaches him from the shore. Beaten, he sinks back into the pool, and it goes still.
 */

import { clamp } from '../core/math';
import type { DrawView, Entity, Layer, World } from './entity';

export const OLD_HP = 50;
/** Seconds to rise out of the pool, and to sink back into it. */
export const OLD_RISE = 2.2;
export const OLD_SINK = 3;
/** How many he summons at a time, the seconds between, and he holds off while this many are standing. */
export const SUMMON_N = 5;
export const SUMMON_EVERY = 9;
export const SUMMON_BELOW = 4;
/** The slam: within this of the pool's middle he reaches (all the ruins); the ring's size; the warning; how often. */
export const SLAM_REACH = 260;
export const SLAM_R = 28;
export const SLAM_WARN = 1;
export const SLAM_EVERY = 3;
/** Seconds of his roar. */
export const ROAR_T = 1.4;

export type OldOneState = 'wait' | 'rise' | 'fight' | 'sink' | 'gone';

export class OldOne implements Entity {
  state: OldOneState = 'wait';
  hp = OLD_HP;
  t = 0;
  flash = 0;
  stunT = 0;
  /** Seconds left of a roar. */
  roarT = 0;
  /** Until he may summon again. */
  summonCd = 0;
  private slamCd = 1.5;
  /** A slam on its way down: where, and how far along. */
  slam: { x: number; y: number; t: number } | null = null;
  /** The pool boils before he rises. */
  boil = 0;
  /** He summons: where each comes out of the water. The game raises them. */
  onSummon: ((at: { x: number; y: number }[]) => void) | null = null;
  /** A slam landed on the figure. */
  onHit: (() => void) | null = null;
  /** His hand went up over a ring. */
  onSlamWarn: (() => void) | null = null;
  /** Beaten: he is sinking. */
  onBeaten: (() => void) | null = null;
  /** How many of what he summoned are standing; the game knows. */
  standing: (() => number) | null = null;

  constructor(readonly pool: { x: number; y: number; r: number }) {}

  get x(): number {
    return this.pool.x;
  }
  get y(): number {
    return this.pool.y;
  }

  /** Up out of the water and fighting: the spear and the helpers can reach him. */
  get up(): boolean {
    return this.state === 'fight';
  }

  reset(): void {
    this.state = 'wait';
    this.hp = OLD_HP;
    this.t = 0;
    this.flash = 0;
    this.stunT = 0;
    this.roarT = 0;
    this.summonCd = 0;
    this.slamCd = 1.5;
    this.slam = null;
    this.boil = 0;
  }

  /** Already beaten: gone, the pool still. */
  beaten(): void {
    this.reset();
    this.state = 'gone';
  }

  /** Up he comes. */
  rise(): void {
    if (this.state !== 'wait') return;
    this.state = 'rise';
    this.t = 0;
  }

  /** He roars. */
  roar(): void {
    this.roarT = ROAR_T;
  }

  /** The fight begins: he summons at once. */
  fight(): void {
    if (this.state === 'gone' || this.state === 'sink') return;
    this.state = 'fight';
    this.t = 0;
    this.summonCd = 0;
  }

  /** A spear or a helper's blow. Returns whether it hurt. */
  hit(power: number): boolean {
    if (!this.up) return false;
    this.hp -= power;
    this.flash = 0.15;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'sink';
      this.t = 0;
      this.slam = null;
      this.onBeaten?.();
    }
    return true;
  }

  /** Tar on one of his eyes: a slam he was about to bring down comes to nothing, and he holds a while. */
  stun(s: number): void {
    if (!this.up) return;
    this.stunT = Math.max(this.stunT, s);
    this.slam = null;
  }

  update(dt: number, w: World): void {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.roarT = Math.max(0, this.roarT - dt);
    if (this.state === 'wait' || this.state === 'gone') return;
    if (this.state === 'rise') {
      if (this.t >= OLD_RISE) this.t = OLD_RISE;
      return;
    }
    if (this.state === 'sink') {
      if (this.t >= OLD_SINK) this.state = 'gone';
      return;
    }
    if (this.stunT > 0) {
      this.stunT -= dt;
      return;
    }
    const f = w.figure;
    // Summoning: five at once, again once few are left and a while has passed.
    this.summonCd -= dt;
    if (this.summonCd <= 0 && (this.standing?.() ?? 0) < SUMMON_BELOW) {
      this.summonCd = SUMMON_EVERY;
      const a0 = f ? Math.atan2(f.y - this.y, f.x - this.x) : Math.PI / 4;
      const at: { x: number; y: number }[] = [];
      for (let i = 0; i < SUMMON_N; i++) {
        const a = a0 + (i - (SUMMON_N - 1) / 2) * 0.45;
        at.push({
          x: this.x + Math.cos(a) * (this.pool.r + 10),
          y: this.y + Math.sin(a) * (this.pool.r + 10),
        });
      }
      this.onSummon?.(at);
    }
    // The slam, at anyone close to the pool's edge.
    if (this.slam) {
      this.slam.t += dt;
      if (this.slam.t >= SLAM_WARN) {
        if (f && Math.hypot(f.x - this.slam.x, f.y - this.slam.y) < SLAM_R) this.onHit?.();
        this.slam = null;
        this.slamCd = SLAM_EVERY;
      }
    } else {
      this.slamCd -= dt;
      if (f && this.slamCd <= 0 && Math.hypot(f.x - this.x, f.y - this.y) < SLAM_REACH) {
        this.slam = { x: f.x, y: f.y, t: 0 };
        this.onSlamWarn?.();
      }
    }
  }

  /** The ring where his hand will land, on the floor under everyone. */
  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air' || !this.slam) return;
    const { ctx } = v;
    const k = clamp(this.slam.t / SLAM_WARN, 0, 1);
    ctx.strokeStyle = `rgba(160,255,190,${0.4 + 0.5 * k})`;
    ctx.lineWidth = 2.4 * v.zoom;
    v.isoEllipse(this.slam.x, this.slam.y, SLAM_R * (1.15 - 0.15 * k));
    ctx.stroke();
    ctx.fillStyle = `rgba(0,0,0,${0.12 + 0.25 * k})`;
    v.isoEllipse(this.slam.x, this.slam.y, SLAM_R * k);
    ctx.fill();
  }

  /** How far up out of the water he is, 0 to 1. */
  get height(): number {
    if (this.state === 'wait' || this.state === 'gone') return 0;
    if (this.state === 'rise') return clamp(this.t / OLD_RISE, 0, 1);
    if (this.state === 'sink') return 1 - clamp(this.t / OLD_SINK, 0, 1);
    return 1;
  }

  /** The pool boiling, and him in it, for the room's sorted actors at the pool's middle. */
  drawBody(v: DrawView): void {
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const sx = px(this.x, this.y);
    const water = py(this.x, this.y);
    // The water boils before he rises, and churns while he is up.
    const churn = Math.max(this.boil, this.state === 'rise' || this.state === 'sink' ? 1 : 0);
    if (churn > 0) {
      ctx.fillStyle = `rgba(120,200,150,${0.35 * churn})`;
      for (let i = 0; i < 12; i++) {
        const a = i * 2.39 + T * 2;
        const r = this.pool.r * (0.2 + ((i * 37) % 10) / 13);
        const x = this.x + Math.cos(a) * r;
        const y = this.y + Math.sin(a) * r;
        ctx.beginPath();
        ctx.arc(
          px(x, y),
          py(x, y) - Math.abs(Math.sin(T * 7 + i)) * 4 * Z,
          (2 + (i % 3)) * Z,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    const up = this.height;
    if (up <= 0) return;
    const W = (c: string) => (this.flash > 0 ? '#FFFFFF' : c);
    const H = 150 * Z * up;
    ctx.save();
    // Clipped at the waterline: he is in the pool.
    ctx.beginPath();
    ctx.rect(sx - 200 * Z, water - 260 * Z, 400 * Z, 260 * Z);
    ctx.clip();
    const base = water + (1 - up) * 20 * Z;
    const sway = Math.sin(T * 0.8) * 3 * Z;
    // Arms: long, down into the water either side, one raised over the ring when he slams.
    const slamUp = this.slam ? clamp(this.slam.t / SLAM_WARN, 0, 1) : 0;
    ctx.strokeStyle = W('#0E1C17');
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const raise = s === 1 ? slamUp : 0;
      ctx.lineWidth = 14 * Z;
      ctx.beginPath();
      ctx.moveTo(sx + s * 34 * Z + sway, base - H * 0.78);
      ctx.quadraticCurveTo(
        sx + s * (70 + raise * 20) * Z,
        base - H * (0.55 + raise * 0.6),
        sx + s * (62 + raise * 10) * Z,
        base - H * raise * 0.9 + 6 * Z,
      );
      ctx.stroke();
    }
    // The body: hunched, running with water.
    ctx.fillStyle = W('#0B1512');
    ctx.beginPath();
    ctx.moveTo(sx - 48 * Z, base + 4 * Z);
    ctx.quadraticCurveTo(sx - 56 * Z + sway, base - H * 0.55, sx - 30 * Z + sway, base - H * 0.86);
    ctx.quadraticCurveTo(sx + sway, base - H * 0.95, sx + 30 * Z + sway, base - H * 0.86);
    ctx.quadraticCurveTo(sx + 56 * Z + sway, base - H * 0.55, sx + 48 * Z, base + 4 * Z);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,220,180,.18)';
    ctx.lineWidth = 1.4 * Z;
    for (let i = 0; i < 5; i++) {
      const x = sx + (-30 + i * 15) * Z + sway;
      const drip = ((T * 0.6 + i * 0.37) % 1) * H * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, base - H * 0.8 + drip * 0.3);
      ctx.lineTo(x, base - H * 0.8 + drip);
      ctx.stroke();
    }
    // The long head, crowned with branching horns.
    const hx = sx + sway;
    const hy = base - H * 0.98;
    ctx.fillStyle = W('#13221C');
    ctx.beginPath();
    ctx.ellipse(hx, hy, 22 * Z, 30 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = W('#1E2E27');
    ctx.lineWidth = 4 * Z;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + s * 14 * Z, hy - 20 * Z);
      ctx.lineTo(hx + s * 34 * Z, hy - 52 * Z);
      ctx.moveTo(hx + s * 25 * Z, hy - 36 * Z);
      ctx.lineTo(hx + s * 44 * Z, hy - 40 * Z);
      ctx.moveTo(hx + s * 30 * Z, hy - 45 * Z);
      ctx.lineTo(hx + s * 24 * Z, hy - 66 * Z);
      ctx.stroke();
    }
    // A ring of pale eyes, and a maw that opens wide when he roars.
    const glare = this.state === 'fight' || this.roarT > 0 ? 1 : 0.5;
    ctx.fillStyle = `rgba(230,255,190,${glare})`;
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (1.15 + i * 0.14);
      ctx.beginPath();
      ctx.arc(hx + Math.cos(a) * 13 * Z, hy - 4 * Z + Math.sin(a) * 9 * Z, 2.4 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    const maw = this.roarT > 0 ? 1 : 0.35 + 0.1 * Math.sin(T * 2);
    ctx.fillStyle = '#020403';
    ctx.beginPath();
    ctx.ellipse(hx, hy + 12 * Z, 9 * Z, 4 * Z + maw * 8 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C9D8C0';
    for (let i = 0; i < 5; i++) {
      const tx = hx + (i - 2) * 3.4 * Z;
      ctx.beginPath();
      ctx.moveTo(tx - 1.2 * Z, hy + 12 * Z - maw * 6 * Z);
      ctx.lineTo(tx, hy + 12 * Z - maw * 6 * Z + 4 * Z);
      ctx.lineTo(tx + 1.2 * Z, hy + 12 * Z - maw * 6 * Z);
      ctx.fill();
    }
    ctx.restore();
    // Where he meets the water: a ring of foam.
    ctx.strokeStyle = 'rgba(170,230,200,.4)';
    ctx.lineWidth = 2 * Z;
    v.isoEllipse(this.x, this.y, 50 + Math.sin(T * 3) * 2);
    ctx.stroke();
  }
}
