/**
 * The Tar Anchorer, the kid's island 4 boss: the tar monster the evil monkey
 * summoned, with a ship's anchor on a chain. It lives in the black water round
 * island 4 and never leaves it. Until the figure sets foot on the island's sand
 * it only watches, sunk to its eyes, turning them to follow; then it rises,
 * and the evil monkey vanishes in a puff.
 *
 * Awake, it wades round the shore to keep beside the figure, slower than the
 * figure walks. Every few seconds
 * it whirls the anchor over its head and throws it at where the figure will
 * be: a ring on the ground shows where it will land before it does, so the
 * counter is to change course when the ring appears. Then the chain drags it
 * back. Come too close and it swings the anchor round itself instead, low,
 * after it draws it back: step away. It takes a lot of spears, and the ring and
 * the swing are the whole fight; past half beaten it gets angry, its eyes go
 * red, and it throws twice as often. Beaten, it melts back into the tar and leaves
 * a tarling behind. Leave the island, or be bonked out, and it sinks back to
 * its eyes, healed. The game does the hearts, the monkey's puff, the prize and
 * the tarling as callbacks; the tests play it with a person's reaction.
 */

import { angDiff } from '../core/math';
import { drawMonster } from '../render/isle4';
import { ISLE4, inTar, MONSTER, onIsle4, SAND4, TAR_IN } from '../world/isle4';
import type { DrawView, Entity, Layer, World } from './entity';

export const ANCHORER_HP = 80;
/** It keeps this far out from island 4's centre, hugging the shore, and no further than this. */
export const SHORE_R = SAND4 + 46;
export const OUT_R = TAR_IN - 40;
/** Wading speed through the tar; the figure walks at 85 and swims at 51. */
export const WADE = 50;
/** How much of it is up, lurking, and how long it takes to rise. */
export const LURK = 0.3;
export const RISE = 1.2;
/** The throw: every so often, within this reach, a whirl over its head and then the throw. */
export const THROW_EVERY = 2.6;
export const FIRST_THROW = 3;
export const THROW_RANGE = 300;
export const WHIRL = 1;
/** Angry, at half its hits or fewer: a quicker whirl, and the next throw sooner. */
export const WHIRL_ANGRY = 0.75;
/** How high over its hand the anchor goes round. */
export const WHIRL_Z = 105;
export const THROW_ANGRY = 1.2;
/** The ring shows, and the aim is fixed, this long before the throw; the anchor flies this long. */
export const AIM = 0.45;
export const FLIGHT = 0.5;
/** It lands on a figure this close to where it was thrown. */
export const ANCHOR_HIT = 24;
/** On the ground this long, then dragged back this long. */
export const DOWN = 0.9;
export const REEL = 0.5;
/** The swing round itself, at a figure this close: its warning, the swing, and a rest after. */
export const SWEEP_R = 80;
export const SWEEP_UP = 0.7;
export const SWEEP = 0.3;
export const SWEEP_REST = 1.2;
/** Its body: nothing walks through it. */
export const BODY_R = 46;
/** Seconds it melts, beaten, before the game is told. */
export const MELT = 2.2;

export type AnchorerState =
  | 'lurk'
  | 'rise'
  | 'wade'
  | 'whirl'
  | 'throw'
  | 'down'
  | 'reel'
  | 'sweepUp'
  | 'sweep'
  | 'melt'
  | 'gone';

/** On island 4's sand, not in its tar: where the figure wakes it. */
export function onSand4(x: number, y: number): boolean {
  return onIsle4(x, y) && !inTar(x, y);
}

export class Anchorer implements Entity {
  state: AnchorerState = 'lurk';
  hp = ANCHORER_HP;
  x: number = MONSTER.x;
  y: number = MONSTER.y;
  /** Facing, toward the figure. */
  h = Math.PI / 4;
  t = 0;
  /** How far up out of the tar, LURK to 1. */
  rise = LURK;
  /** Of a hit's flash. */
  flash = 0;
  /** Where the anchor will land, once aimed; where it is while it flies, lies or is reeled. */
  aim: { x: number; y: number } | null = null;
  anchor = { x: 0, y: 0, z: 0 };
  /** Where the figure is, for its eyes. */
  private look: { x: number; y: number } | null = null;
  private throwCd = FIRST_THROW;
  private sweepCd = 0;
  private from = { x: 0, y: 0 };
  /** The anchor hit the figure, or the swing did. */
  onHit: ((by: 'anchor' | 'sweep') => void) | null = null;
  /** It has seen the figure on its sand and is coming up. */
  onWake: (() => void) | null = null;
  /** The anchor hit the ground. */
  onThud: ((x: number, y: number) => void) | null = null;
  /** It swung the anchor round itself, whoever was in the way. */
  onSwing: (() => void) | null = null;
  /** It whirls the anchor, or draws it back to swing. */
  onWindup: (() => void) | null = null;
  /** It is beaten and has melted away. */
  onBeaten: (() => void) | null = null;

  /** Half beaten or more: it throws twice as often. */
  get angry(): boolean {
    return this.hp <= ANCHORER_HP / 2;
  }

  /** In the fight: there to be speared. */
  get up(): boolean {
    return this.state !== 'lurk' && this.state !== 'melt' && this.state !== 'gone';
  }

  /** Watching, before the fight: the evil monkey still stands on the beach. */
  get waiting(): boolean {
    return this.state === 'lurk';
  }

  /** Back to its eyes in the tar where it was summoned, healed. */
  reset(): void {
    if (this.state === 'gone') return;
    this.state = 'lurk';
    this.hp = ANCHORER_HP;
    this.x = MONSTER.x;
    this.y = MONSTER.y;
    this.t = 0;
    this.rise = LURK;
    this.flash = 0;
    this.aim = null;
    this.throwCd = FIRST_THROW;
    this.sweepCd = 0;
    this.stunT = 0;
  }

  /** Seconds left stuck with tar on its face. */
  stunT = 0;
  /**
   * Tar on its face: a whirl or a sweep it was winding up comes to nothing, and wading or waiting for
   * its anchor it stands still this many seconds. An anchor already in the air lands as it was going to.
   */
  stun(s: number): void {
    if (!this.up) return;
    if (this.state === 'whirl' || this.state === 'sweepUp') {
      this.state = 'wade';
      this.t = 0;
      this.aim = null;
    }
    if (this.state === 'wade' || this.state === 'down') this.stunT = Math.max(this.stunT, s);
  }

  /** Beaten for good, as a save remembers. */
  beaten(): void {
    this.state = 'gone';
    this.aim = null;
  }

  /** A spear or a bolt lands with this power. */
  hit(power: number): void {
    if (!this.up) return;
    this.hp = Math.max(0, this.hp - power);
    this.flash = 1;
    if (this.hp <= 0) {
      this.state = 'melt';
      this.t = 0;
      this.aim = null;
    }
  }

  /** Where its right hand is, in the world, for the chain: to its right on screen, as it is drawn. */
  private hand(): { x: number; y: number; z: number } {
    return { x: this.x + 58, y: this.y - 58, z: 25 * this.rise };
  }

  update(dt: number, w: World): void {
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    if (this.state === 'gone') return;
    const f = w.figure && onIsle4(w.figure.x, w.figure.y) ? w.figure : null;
    if (f) {
      const d = Math.hypot(f.x - this.x, f.y - this.y) || 1;
      this.look = { x: (f.x - this.x) / d, y: (f.y - this.y) / d };
    } else this.look = null;
    if (this.state === 'melt') {
      this.rise = Math.max(0, 1 - this.t / MELT);
      if (this.t >= MELT) {
        this.state = 'gone';
        this.onBeaten?.();
      }
      return;
    }
    if (this.state === 'lurk') {
      if (f && onSand4(f.x, f.y)) {
        this.state = 'rise';
        this.t = 0;
        this.onWake?.();
      }
      return;
    }
    if (!f) {
      this.reset();
      return;
    }
    if (this.state === 'rise') {
      this.rise = LURK + (1 - LURK) * Math.min(1, this.t / RISE);
      if (this.t >= RISE) {
        this.state = 'wade';
        this.t = 0;
      }
      return;
    }
    const dx = f.x - this.x;
    const dy = f.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    if (this.stunT > 0) {
      this.stunT -= dt;
      return;
    }
    this.throwCd -= dt;
    this.sweepCd -= dt;
    switch (this.state) {
      case 'wade': {
        this.h = Math.atan2(dy, dx);
        this.wade(f, dt);
        if (d < SWEEP_R * 0.9 && this.sweepCd <= 0) {
          this.state = 'sweepUp';
          this.t = 0;
          this.onWindup?.();
        } else if (d < THROW_RANGE && this.throwCd <= 0) {
          this.state = 'whirl';
          this.t = 0;
          this.onWindup?.();
        }
        break;
      }
      case 'whirl': {
        this.h = Math.atan2(dy, dx);
        // It keeps wading while the anchor goes round.
        this.wade(f, dt);
        const whirl = this.angry ? WHIRL_ANGRY : WHIRL;
        // The aim is fixed AIM before the throw, at where the figure will be when the anchor lands.
        if (!this.aim && this.t >= whirl - AIM) {
          const lead = AIM + FLIGHT;
          this.aim = { x: f.x + f.vx * lead, y: f.y + f.vy * lead };
        }
        if (this.t >= whirl) {
          this.state = 'throw';
          this.t = 0;
          const hd = this.hand();
          this.from = { x: hd.x, y: hd.y };
        }
        break;
      }
      case 'throw': {
        const a = this.aim ?? { x: f.x, y: f.y };
        const k = Math.min(1, this.t / FLIGHT);
        this.anchor = {
          x: this.from.x + (a.x - this.from.x) * k,
          y: this.from.y + (a.y - this.from.y) * k,
          z: 100 * (1 - k) + Math.sin(Math.PI * k) * 60,
        };
        if (this.t >= FLIGHT) {
          this.anchor = { x: a.x, y: a.y, z: 0 };
          if (Math.hypot(f.x - a.x, f.y - a.y) < ANCHOR_HIT) this.onHit?.('anchor');
          this.onThud?.(a.x, a.y);
          this.state = 'down';
          this.t = 0;
        }
        break;
      }
      case 'down':
        this.h = Math.atan2(dy, dx);
        if (this.t >= DOWN) {
          this.state = 'reel';
          this.t = 0;
          this.from = { x: this.anchor.x, y: this.anchor.y };
        }
        break;
      case 'reel': {
        const hd = this.hand();
        const k = Math.min(1, this.t / REEL);
        this.anchor = {
          x: this.from.x + (hd.x - this.from.x) * k,
          y: this.from.y + (hd.y - this.from.y) * k,
          z: hd.z * k,
        };
        if (this.t >= REEL) {
          this.aim = null;
          this.throwCd = this.angry ? THROW_ANGRY : THROW_EVERY;
          this.state = 'wade';
          this.t = 0;
        }
        break;
      }
      case 'sweepUp':
        if (this.t >= SWEEP_UP) {
          this.state = 'sweep';
          this.t = 0;
          // A full swing round itself, low: anything inside it is hit.
          if (d < SWEEP_R + 6) this.onHit?.('sweep');
          this.onSwing?.();
        }
        break;
      case 'sweep':
        if (this.t >= SWEEP) {
          this.sweepCd = SWEEP_REST;
          this.throwCd = Math.max(this.throwCd, 0.8);
          this.state = 'wade';
          this.t = 0;
        }
        break;
    }
  }

  /**
   * Keep beside the figure, in the tar: at the shore nearest it when it is on the sand, and along the
   * ring from it, a good way off, when it is out in the tar too.
   */
  private wade(f: { x: number; y: number }, dt: number): void {
    const fa = Math.atan2(f.y - ISLE4.y, f.x - ISLE4.x);
    const fr = Math.hypot(f.x - ISLE4.x, f.y - ISLE4.y);
    let ta = fa;
    let tr = SHORE_R;
    if (fr > SAND4) {
      tr = Math.max(SHORE_R, Math.min(OUT_R, fr));
      const ma = Math.atan2(this.y - ISLE4.y, this.x - ISLE4.x);
      ta = fa + Math.sign(angDiff(ma, fa) || 1) * (100 / tr);
    }
    const tx = ISLE4.x + Math.cos(ta) * tr;
    const ty = ISLE4.y + Math.sin(ta) * tr;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dl = Math.hypot(dx, dy);
    if (dl > 1) {
      const st = Math.min(dl, WADE * dt);
      this.x += (dx / dl) * st;
      this.y += (dy / dl) * st;
    }
    // Always in the tar, never on the sand.
    const r = Math.hypot(this.x - ISLE4.x, this.y - ISLE4.y) || 1;
    const cr = Math.max(SHORE_R, Math.min(OUT_R, r));
    this.x = ISLE4.x + ((this.x - ISLE4.x) / r) * cr;
    this.y = ISLE4.y + ((this.y - ISLE4.y) / r) * cr;
  }

  /** It, for the game's sorted solids: sunk, rising, fighting or melting. */
  drawBody(v: DrawView): void {
    if (this.state === 'gone' || !v.onScreen(this.x, this.y, 260 * v.zoom)) return;
    const { px, py } = v;
    let hand: { x: number; y: number } | undefined;
    const Z = v.zoom;
    if (this.state === 'whirl') {
      const hd = this.hand();
      hand = { x: px(hd.x, hd.y), y: py(hd.x, hd.y, WHIRL_Z * this.rise) };
    } else if (this.state === 'sweepUp') {
      // Drawn back behind it, low.
      const c = Math.cos(this.h);
      const s = Math.sin(this.h);
      const bx = this.x - c * 60 + s * 50;
      const by = this.y - s * 60 - c * 50;
      hand = { x: px(bx, by), y: py(bx, by, 30) };
    } else if (this.state === 'throw' || this.state === 'down' || this.state === 'reel') {
      const hd = this.hand();
      hand = { x: px(hd.x, hd.y) + 6 * Z, y: py(hd.x, hd.y, hd.z) };
    }
    drawMonster(v, this.x, this.y, this.rise, {
      ...(this.look ? { look: this.look } : {}),
      ...(hand ? { hand } : {}),
      flash: this.flash,
      angry: this.up && this.angry,
    });
    if (this.up) this.drawLife(v);
  }

  /** What is left of it, as a bar over its head. */
  private drawLife(v: DrawView): void {
    const { ctx, px, py } = v;
    const Z = v.zoom;
    const x = px(this.x, this.y);
    const y = py(this.x, this.y, 150 * this.rise + 20);
    const w = 70 * Z;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(x - w / 2 - 2 * Z, y - 4 * Z, w + 4 * Z, 8 * Z);
    ctx.fillStyle = '#E4572E';
    ctx.fillRect(x - w / 2, y - 2 * Z, (w * this.hp) / ANCHORER_HP, 4 * Z);
  }

  /** The ring where the anchor will land, on the ground; the anchor and its chain, in the air. */
  draw(v: DrawView, layer: Layer): void {
    if (this.state === 'gone') return;
    if (layer === 'surface') this.drawRing(v);
    else if (layer === 'air') this.drawAnchor(v);
  }

  private drawRing(v: DrawView): void {
    const a = this.aim;
    if (!a || !(this.state === 'whirl' || this.state === 'throw')) return;
    const { ctx } = v;
    const Z = v.zoom;
    const k = this.state === 'throw' ? Math.min(1, this.t / FLIGHT) : 0;
    v.isoEllipse(a.x, a.y, ANCHOR_HIT);
    ctx.fillStyle = `rgba(228,87,46,${0.18 + 0.2 * k})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,120,90,.9)';
    ctx.lineWidth = 2.4 * Z;
    ctx.stroke();
    // Closing in as it falls.
    v.isoEllipse(a.x, a.y, ANCHOR_HIT * (1.8 - 0.8 * k));
    ctx.strokeStyle = 'rgba(255,120,90,.45)';
    ctx.lineWidth = 1.4 * Z;
    ctx.stroke();
  }

  private drawAnchor(v: DrawView): void {
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const s = this.state;
    let ax: number;
    let ay: number;
    let tilt = 0;
    const hd = this.hand();
    if (s === 'whirl') {
      // Round and round over its head, faster as the throw comes.
      const sp = 6 + (this.t / (this.angry ? WHIRL_ANGRY : WHIRL)) * 8;
      const a = T * sp;
      const hx = px(hd.x, hd.y);
      const hy = py(hd.x, hd.y, WHIRL_Z * this.rise);
      ax = hx + Math.cos(a) * 34 * Z;
      ay = hy + Math.sin(a) * 12 * Z;
      tilt = a;
      this.drawChain(v, hx, hy, ax, ay);
    } else if (s === 'sweep' || s === 'sweepUp') {
      const c = Math.cos(this.h);
      const sn = Math.sin(this.h);
      const sw = s === 'sweep' ? Math.min(1, this.t / SWEEP) * Math.PI * 2 : 0;
      const a = this.h + Math.PI * 0.75 + sw;
      const r = SWEEP_R - 10;
      const wx = this.x + Math.cos(a) * r;
      const wy = this.y + Math.sin(a) * r;
      ax = px(wx, wy);
      ay = py(wx, wy, 14);
      tilt = a;
      const bx = this.x - c * 20 + sn * 30;
      const by = this.y - sn * 20 - c * 30;
      this.drawChain(v, px(bx, by), py(bx, by, 50), ax, ay);
      if (s === 'sweep') {
        // The swing's sweep, a pale arc on the ground round it.
        v.isoEllipse(this.x, this.y, SWEEP_R);
        ctx.strokeStyle = `rgba(255,220,180,${0.5 * (1 - this.t / SWEEP)})`;
        ctx.lineWidth = 6 * Z;
        ctx.stroke();
      }
    } else if (s === 'throw' || s === 'down' || s === 'reel') {
      ax = px(this.anchor.x, this.anchor.y);
      ay = py(this.anchor.x, this.anchor.y, this.anchor.z);
      tilt = s === 'down' ? 0.3 : this.t * 12;
      this.drawChain(v, px(hd.x, hd.y) + 6 * Z, py(hd.x, hd.y, hd.z), ax, ay);
    } else return;
    drawAnchorShape(v, ax, ay, tilt);
  }

  private drawChain(v: DrawView, x0: number, y0: number, x1: number, y1: number): void {
    const { ctx } = v;
    const Z = v.zoom;
    ctx.strokeStyle = '#4A4F55';
    ctx.lineWidth = 2.2 * Z;
    ctx.setLineDash?.([3 * Z, 2 * Z]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + 10 * Z, x1, y1);
    ctx.stroke();
    ctx.setLineDash?.([]);
  }
}

/** A ship's anchor, dripping tar, at a screen point, turned a little. */
export function drawAnchorShape(v: DrawView, x: number, y: number, tilt: number): void {
  const { ctx } = v;
  const Z = v.zoom;
  const r = Math.sin(tilt) * 0.5;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const at = (dx: number, dy: number): [number, number] => [
    x + (dx * c - dy * s) * Z,
    y + (dx * s + dy * c) * Z,
  ];
  ctx.strokeStyle = '#5C636B';
  ctx.lineCap = 'round';
  ctx.lineWidth = 4 * Z;
  // The shank and its stock.
  ctx.beginPath();
  ctx.moveTo(...at(0, -14));
  ctx.lineTo(...at(0, 16));
  ctx.moveTo(...at(-9, -8));
  ctx.lineTo(...at(9, -8));
  ctx.stroke();
  // The crown, its arms curving up into the flukes.
  ctx.beginPath();
  ctx.moveTo(...at(-14, 6));
  ctx.quadraticCurveTo(...at(-12, 18), ...at(0, 17));
  ctx.quadraticCurveTo(...at(12, 18), ...at(14, 6));
  ctx.stroke();
  ctx.fillStyle = '#5C636B';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(...at(e * 14, 1));
    ctx.lineTo(...at(e * 18, 8));
    ctx.lineTo(...at(e * 10, 8));
    ctx.closePath();
    ctx.fill();
  }
  // The ring at the top.
  ctx.lineWidth = 2.2 * Z;
  ctx.beginPath();
  ctx.arc(...at(0, -17), 3 * Z, 0, Math.PI * 2);
  ctx.stroke();
  // Tar on it, dripping.
  ctx.fillStyle = '#1C1719';
  ctx.beginPath();
  ctx.ellipse(...at(0, 10), 3.5 * Z, 5 * Z, r, 0, Math.PI * 2);
  ctx.fill();
}
