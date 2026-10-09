/**
 * Star, the meteor serpent: the kid's leviathan, named by him (his drawing: a head like a meteor with a glowing crater and a
 * mouthful of teeth, a long snake's body, two long wings, four legs with three claws each), which haunts
 * island 6. It flies in slow loops high over the island, its shadow sliding over the water. A flagship that
 * comes near is hunted: it circles over the boat, then its head lights up like a falling star and a ring
 * shows on the water where the boat will be (the warning), and it dives head-first into the ring. Steer out
 * of it. After a dive it thrashes in the water a moment before it takes off again, and that is when the
 * harpoon reaches it: four hits, as the kid wrote, and it is driven off for a good while, leaving a shard of
 * its head behind. It holds off while the Deep One is up, so the two never come at once.
 */

import { angDiff, clamp } from '../core/math';
import { AWAY, RESOLVE } from '../data/harpoon';
import { ISLE6 } from '../world/isle6';
import type { DrawView, Entity, Layer, World } from './entity';

/** Its loop over the island: how far out, how high, how fast round. */
export const HAUNT_R = 780;
export const HAUNT_Z = 230;
export const HAUNT_TURN = 0.16;
/** A boat this close to the island is hunted; this far off it gives up. */
export const NOTICE = 1500;
export const LEASH = 2100;
/** Circling over the boat, close enough to stay on a phone's screen and faster than a flagship: how far out, how
 * high, how fast, and for how long before a dive. */
export const CIRCLE_R = 150;
export const CIRCLE_Z = 110;
export const CIRCLE_SPEED = 430;
export const CIRCLE_T = 2.4;
export const CIRCLE_ANGRY = 1.6;
/** The dive: the warning (shorter once it is angry), the fall, the ring's size; then down in the water, then taking off. */
export const AIM_T = 1;
export const AIM_ANGRY = 0.75;
export const FALL_T = 0.45;
export const RING_R = 56;
export const DOWN_T = 2.6;
export const TAKEOFF_T = 1;
/** What a dive costs the boat, of its 100: the kid's six damage, its hardest hitter. */
export const DIVE_HIT = 35;
/** Sighted from this far: about a phone's screen. */
export const SIGHT = 650;
/** Its length, head to tail, how many pieces it is drawn in, and how big it is drawn. */
export const SERPENT_LEN = 300;
const SEGS = 16;
const SIZE = 1.8;

export type MeteorState = 'haunt' | 'hunt' | 'aim' | 'fall' | 'down' | 'takeoff' | 'away';

export class MeteorSerpent implements Entity {
  state: MeteorState = 'haunt';
  x = ISLE6.x + HAUNT_R;
  y = ISLE6.y;
  z = HAUNT_Z;
  h = Math.PI / 2;
  t = 0;
  resolve = RESOLVE.meteor;
  flash = 0;
  /** Where the dive will land, once aimed. */
  ring: { x: number; y: number } | null = null;
  private from = { x: 0, y: 0, z: 0 };
  private a = 0;
  private side = 1;
  private turn = 0;
  private lastH: number | null = null;
  private seen = false;
  private bit = false;
  /** Where its head has been, for its body to follow. */
  private readonly trail: { x: number; y: number; z: number }[] = [];
  /** Sighted the first time. */
  onSight: (() => void) | null = null;
  /** It has seen the boat and is coming. */
  onHunt: (() => void) | null = null;
  /** Its head lights up over a ring: the warning. */
  onWarn: (() => void) | null = null;
  /** The dive hit the boat. The game does the damage. */
  onHit: (() => void) | null = null;
  /** It hit the water, wherever. */
  onSplash: ((x: number, y: number) => void) | null = null;
  /** Whether it must hold off: the game says while the Deep One is up. */
  holdOff: (() => boolean) | null = null;

  get angry(): boolean {
    return this.resolve <= RESOLVE.meteor / 2;
  }

  /** How long its warning lasts now. */
  get aimT(): number {
    return this.angry ? AIM_ANGRY : AIM_T;
  }

  /** In the hunt, or diving. */
  get hunting(): boolean {
    return this.state !== 'haunt' && this.state !== 'away';
  }

  /** Back to its loop over the island, whole, as when the boat sails off or is eaten. */
  reset(): void {
    if (this.state === 'away') return;
    this.state = 'haunt';
    this.t = 0;
    this.ring = null;
    this.resolve = RESOLVE.meteor;
  }

  /** Where a harpoon would strike it: only while it is down in the water, or just taking off. */
  mark(): { x: number; y: number } | null {
    return this.state === 'down' || (this.state === 'takeoff' && this.z < 50) ? this : null;
  }

  /** A harpoon struck it. Returns whether that drove it off. */
  harpoon(power: number): boolean {
    if (!this.mark()) return false;
    this.resolve = Math.max(0, this.resolve - power);
    this.flash = 1;
    if (this.resolve > 0) return false;
    this.state = 'away';
    this.t = 0;
    this.ring = null;
    return true;
  }

  private go(s: MeteorState): void {
    this.state = s;
    this.t = 0;
  }

  /** Where the boat will be in t seconds, as it is turning now. */
  private ahead(
    b: { x: number; y: number; h: number; v: number },
    t: number,
  ): { x: number; y: number } {
    let x = b.x;
    let y = b.y;
    let h = b.h;
    const n = 12;
    const st = t / n;
    for (let i = 0; i < n; i++) {
      h += this.turn * st;
      x += Math.cos(h) * b.v * st;
      y += Math.sin(h) * b.v * st;
    }
    return { x, y };
  }

  /** Fly toward a point at a height, turning as a flier does. */
  private fly(tx: number, ty: number, tz: number, sp: number, dt: number): void {
    const want = Math.atan2(ty - this.y, tx - this.x);
    this.h += clamp(angDiff(want, this.h), -3.2 * dt, 3.2 * dt);
    this.x += Math.cos(this.h) * sp * dt;
    this.y += Math.sin(this.h) * sp * dt;
    this.z += (tz - this.z) * Math.min(1, dt * 2);
  }

  update(dt: number, w: World): void {
    const b = w.boat;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.lastH !== null && dt > 0)
      this.turn += (clamp(angDiff(b.h, this.lastH) / dt, -3, 3) - this.turn) * Math.min(1, dt * 6);
    this.lastH = b.h;
    const fromIsle = Math.hypot(b.x - ISLE6.x, b.y - ISLE6.y);
    if (!this.seen && w.started && Math.hypot(b.x - this.x, b.y - this.y) < SIGHT) {
      this.seen = true;
      this.onSight?.();
    }
    const hold = this.holdOff?.() ?? false;
    switch (this.state) {
      case 'haunt': {
        this.a += HAUNT_TURN * dt;
        const tx = ISLE6.x + Math.cos(this.a) * HAUNT_R;
        const ty = ISLE6.y + Math.sin(this.a) * HAUNT_R;
        this.fly(tx, ty, HAUNT_Z, clamp(Math.hypot(tx - this.x, ty - this.y) * 1.5, 120, 420), dt);
        if (w.started && !w.docked && fromIsle < NOTICE && !hold) {
          this.go('hunt');
          this.onHunt?.();
        }
        break;
      }
      case 'away': {
        // Up and away over the island, out of sight, and back to its loop after a good while.
        this.fly(ISLE6.x, ISLE6.y - 600, HAUNT_Z * 2, 220, dt);
        if (this.t >= AWAY) {
          this.resolve = RESOLVE.meteor;
          this.go('haunt');
        }
        break;
      }
      default:
        if (fromIsle > LEASH || w.docked) {
          this.ring = null;
          this.resolve = RESOLVE.meteor;
          this.go('haunt');
          break;
        }
        // The Deep One is up: back to its loop until it is done, hurt as it was.
        if (hold && this.state === 'hunt') {
          this.go('haunt');
          break;
        }
        this.fight(dt, b, w.hullScale, hold);
    }
    this.follow();
  }

  private fight(
    dt: number,
    b: { x: number; y: number; h: number; v: number },
    hullScale: number,
    hold: boolean,
  ): void {
    switch (this.state) {
      case 'hunt': {
        // Round and round over the boat.
        const a = Math.atan2(this.y - b.y, this.x - b.x) + this.side * 0.7;
        this.fly(
          b.x + Math.cos(a) * CIRCLE_R,
          b.y + Math.sin(a) * CIRCLE_R,
          CIRCLE_Z,
          CIRCLE_SPEED,
          dt,
        );
        if (this.t >= (this.angry ? CIRCLE_ANGRY : CIRCLE_T) && !hold) {
          this.ring = this.ahead(b, this.aimT + FALL_T);
          this.go('aim');
          this.onWarn?.();
        }
        break;
      }
      case 'aim': {
        // Hanging over its ring, rearing up, its head lighting up.
        const r = this.ring ?? { x: b.x, y: b.y };
        this.h += clamp(angDiff(Math.atan2(r.y - this.y, r.x - this.x), this.h), -4 * dt, 4 * dt);
        this.z += (CIRCLE_Z + 40 - this.z) * Math.min(1, dt * 2);
        this.x += Math.cos(this.h) * 40 * dt;
        this.y += Math.sin(this.h) * 40 * dt;
        if (this.t >= this.aimT) {
          this.from = { x: this.x, y: this.y, z: this.z };
          this.bit = false;
          this.go('fall');
        }
        break;
      }
      case 'fall': {
        const r = this.ring ?? { x: b.x, y: b.y };
        const k = clamp(this.t / FALL_T, 0, 1);
        const e = k * k;
        this.x = this.from.x + (r.x - this.from.x) * e;
        this.y = this.from.y + (r.y - this.from.y) * e;
        this.z = this.from.z * (1 - e);
        this.h = Math.atan2(r.y - this.from.y, r.x - this.from.x);
        if (k >= 1) {
          if (!this.bit && Math.hypot(b.x - r.x, b.y - r.y) < RING_R + 24 * hullScale) {
            this.bit = true;
            this.onHit?.();
          }
          this.onSplash?.(r.x, r.y);
          this.ring = null;
          this.z = 0;
          this.go('down');
        }
        break;
      }
      case 'down':
        // Thrashing in the water: the harpoon's chance.
        this.z = 0;
        this.h += Math.sin(this.t * 9) * dt * 2;
        if (this.t >= DOWN_T) this.go('takeoff');
        break;
      case 'takeoff':
        this.x += Math.cos(this.h) * 160 * dt;
        this.y += Math.sin(this.h) * 160 * dt;
        this.z = CIRCLE_Z * clamp(this.t / TAKEOFF_T, 0, 1);
        if (this.t >= TAKEOFF_T) {
          this.side = -this.side;
          this.go('hunt');
        }
        break;
    }
  }

  /** Its body follows where its head has been. */
  private follow(): void {
    const last = this.trail[0];
    if (!last || Math.hypot(this.x - last.x, this.y - last.y, this.z - last.z) >= 6) {
      this.trail.unshift({ x: this.x, y: this.y, z: this.z });
      if (this.trail.length > 60) this.trail.pop();
    }
  }

  /** Its body, from the head back along where it has been, SEGS pieces SERPENT_LEN long. */
  body(): { x: number; y: number; z: number }[] {
    const out: { x: number; y: number; z: number }[] = [{ x: this.x, y: this.y, z: this.z }];
    const step = SERPENT_LEN / SEGS;
    let px = this.x;
    let py = this.y;
    let pz = this.z;
    let i = 0;
    for (let s = 1; s < SEGS; s++) {
      let need = step;
      let q = { x: px - Math.cos(this.h) * step, y: py - Math.sin(this.h) * step, z: pz };
      while (i < this.trail.length) {
        const c = this.trail[i] as { x: number; y: number; z: number };
        const d = Math.hypot(c.x - px, c.y - py, c.z - pz);
        if (d >= need) {
          const k = need / d;
          q = { x: px + (c.x - px) * k, y: py + (c.y - py) * k, z: pz + (c.z - pz) * k };
          break;
        }
        need -= d;
        px = c.x;
        py = c.y;
        pz = c.z;
        i++;
      }
      if (i >= this.trail.length) {
        const prev = out[out.length - 1] as { x: number; y: number; z: number };
        q = { x: prev.x - Math.cos(this.h) * step, y: prev.y - Math.sin(this.h) * step, z: prev.z };
      }
      out.push(q);
      px = q.x;
      py = q.y;
      pz = q.z;
    }
    return out;
  }

  draw(v: DrawView, layer: Layer): void {
    // Hunting from off the screen: a marker at its edge, pulsing as it aims.
    if (layer === 'overlay') {
      if (this.hunting) v.indicator(this.x, this.y, '#7A3A1E', 'pirate', this.state === 'aim');
      return;
    }
    if (!v.onScreen(this.x, this.y, 500)) return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    if (layer === 'surface') {
      // Its shadow on the water, fainter the higher it is; and the ring where it will land.
      for (const p of this.body()) {
        ctx.fillStyle = `rgba(4,20,26,${0.28 * clamp(1 - p.z / 400, 0.25, 1)})`;
        v.isoEllipse(p.x, p.y, 15 * (1 - Math.min(0.5, p.z / 500)));
        ctx.fill();
      }
      if (this.ring) {
        const k = this.state === 'aim' ? clamp(this.t / this.aimT, 0, 1) : 1;
        ctx.strokeStyle = `rgba(255,170,70,${0.6 + 0.4 * k})`;
        ctx.lineWidth = (3.4 + Math.sin(T * 14) * 0.8) * Z;
        v.isoEllipse(this.ring.x, this.ring.y, RING_R);
        ctx.stroke();
        ctx.fillStyle = `rgba(255,120,40,${0.15 + 0.25 * k})`;
        v.isoEllipse(this.ring.x, this.ring.y, RING_R * k);
        ctx.fill();
      }
      return;
    }
    if (layer !== 'air') return;
    const pts = this.body();
    const sp = pts.map((p) => ({ x: px(p.x, p.y), y: py(p.x, p.y, p.z + 6) }));
    const W = (c: string) => (this.flash > 0 ? '#FFFFFF' : c);
    const S = Z * SIZE;
    const glow =
      this.state === 'aim' ? clamp(this.t / this.aimT, 0, 1) : this.state === 'fall' ? 1 : 0;
    const hot = Math.min(1, glow * 2.5);
    // A trail of fire behind the head as it falls.
    if (this.state === 'fall' || (this.state === 'aim' && glow > 0.5)) {
      for (let i = 1; i < 6; i++) {
        const q = sp[i] as { x: number; y: number };
        ctx.fillStyle = `rgba(255,${120 + i * 20},40,${0.45 - i * 0.07})`;
        ctx.beginPath();
        ctx.arc(q.x, q.y, (12 - i) * S, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Two long wings like a bat's, from the front third of the body, beating: three long fingers each, and the
    // skin between them scalloped.
    const root = sp[3] as { x: number; y: number };
    const beat = Math.sin(T * (this.state === 'haunt' ? 3 : 6)) * (this.state === 'down' ? 0.2 : 1);
    const hx = Math.cos(this.h) - Math.sin(this.h);
    const hy = (Math.cos(this.h) + Math.sin(this.h)) / 2;
    const hl = Math.hypot(hx, hy) || 1;
    const side = { x: -hy / hl, y: hx / hl };
    for (const s of [-1, 1]) {
      const span = 64 * S;
      const lift = (16 + beat * 14) * S;
      const tip = (k: number, back: number) => ({
        x: root.x + side.x * s * span * k - (hx / hl) * back * S,
        y: root.y + side.y * s * span * k * 0.6 - lift * k - (hy / hl) * back * S,
      });
      const f0 = tip(1, -6);
      const fingers = [f0, tip(0.95, 14), tip(0.7, 30)];
      const tail = sp[7] as { x: number; y: number };
      ctx.fillStyle = W('rgba(74,82,104,.9)');
      ctx.beginPath();
      ctx.moveTo(root.x, root.y);
      ctx.lineTo(f0.x, f0.y);
      let prev = f0;
      for (const q of [...fingers.slice(1), tail]) {
        const mx = (prev.x + q.x) / 2;
        const my = (prev.y + q.y) / 2;
        ctx.quadraticCurveTo(
          mx + (root.x - mx) * 0.18,
          my + (root.y - my) * 0.18 + 3 * S,
          q.x,
          q.y,
        );
        prev = q;
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = W('#2A3040');
      ctx.lineWidth = 1.4 * S;
      ctx.beginPath();
      for (const q of fingers) {
        ctx.moveTo(root.x, root.y);
        ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }
    // Four legs with three claws each, under the body.
    ctx.lineCap = 'round';
    for (const i of [5, 10]) {
      const q = sp[i] as { x: number; y: number };
      for (const s of [-1, 1]) {
        const kx = q.x + s * 6 * S;
        const ky = q.y + 6 * S;
        const fx = q.x + s * 8 * S;
        const fy = q.y + 13 * S;
        ctx.strokeStyle = W('#2E3444');
        ctx.lineWidth = 3 * S;
        ctx.beginPath();
        ctx.moveTo(q.x + s * 2 * S, q.y);
        ctx.lineTo(kx, ky);
        ctx.lineTo(fx, fy);
        ctx.stroke();
        ctx.strokeStyle = W('#E8E2D0');
        ctx.lineWidth = 1.1 * S;
        for (const c of [-1, 0, 1]) {
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + c * 2.6 * S + s * 1.2 * S, fy + 3.6 * S);
          ctx.stroke();
        }
      }
    }
    // The snake's body, tapering to the tail.
    for (let i = sp.length - 1; i >= 1; i--) {
      const q = sp[i] as { x: number; y: number };
      const r = (11 - (i / sp.length) * 8) * S;
      ctx.fillStyle = W(i % 2 ? '#3A4256' : '#434C62');
      ctx.beginPath();
      ctx.arc(q.x, q.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // The head: a lumpy meteor with craters, one of them glowing, and a mouthful of teeth.
    const hd = sp[0] as { x: number; y: number };
    const dir = hx >= 0 ? 1 : -1;
    if (glow > 0) {
      ctx.fillStyle = `rgba(255,150,60,${0.55 * hot})`;
      ctx.beginPath();
      ctx.arc(hd.x, hd.y, 26 * S, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rock grey, lighting up red-hot as it aims.
    ctx.fillStyle = W(
      `rgb(${Math.round(94 + 150 * hot)},${Math.round(85 + 45 * hot)},${Math.round(76 - 30 * hot)})`,
    );
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = (15 + ((i * 7) % 3) * 1.6) * S;
      ctx.lineTo(hd.x + Math.cos(a) * r, hd.y + Math.sin(a) * r * 0.9);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(30,24,20,.45)';
    for (const [cx, cy, cr] of [
      [-6, -5, 3.2],
      [5, -7, 2.4],
      [-8, 5, 2],
    ] as const) {
      ctx.beginPath();
      ctx.arc(hd.x + cx * S * dir, hd.y + cy * S, cr * S, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = hot > 0.5 ? '#FFE9A0' : '#FF9A30';
    ctx.beginPath();
    ctx.arc(hd.x + 5 * S * dir, hd.y - 1 * S, 3.4 * S, 0, Math.PI * 2);
    ctx.fill();
    // The mouth, at the front, open and full of teeth.
    const mx = hd.x + 12 * S * dir;
    const my = hd.y + 5 * S;
    ctx.fillStyle = '#1A0E0C';
    ctx.beginPath();
    ctx.moveTo(mx - 6 * S * dir, my - 3 * S);
    ctx.lineTo(mx + 6 * S * dir, my - 5 * S);
    ctx.lineTo(mx + 6 * S * dir, my + 5 * S);
    ctx.lineTo(mx - 6 * S * dir, my + 3 * S);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#F2EEE2';
    for (let i = 0; i < 4; i++) {
      const tx = mx - 4 * S * dir + i * 3 * S * dir;
      ctx.beginPath();
      ctx.moveTo(tx - 1.2 * S, my - 3.6 * S);
      ctx.lineTo(tx, my - 0.6 * S);
      ctx.lineTo(tx + 1.2 * S, my - 3.6 * S);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx - 1.2 * S, my + 3.6 * S);
      ctx.lineTo(tx, my + 0.6 * S);
      ctx.lineTo(tx + 1.2 * S, my + 3.6 * S);
      ctx.fill();
    }
    // Spray as it thrashes in the water.
    if (this.state === 'down') {
      ctx.strokeStyle = 'rgba(232,246,250,.7)';
      ctx.lineWidth = 2 * Z;
      v.isoEllipse(this.x, this.y, 44 + Math.sin(T * 9) * 5);
      ctx.stroke();
    }
  }
}
