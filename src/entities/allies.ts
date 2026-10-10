/**
 * Allies called up to fight beside the figure, the kid's: in Gigantis's throne
 * room the warlock calls merlocks, fish-men with great bone blades, up out of a
 * puddle of sea; and once the Forgotten One's bones are yours, they raise a
 * ghost and a skeleton of their own out of the ground in any fight; and the
 * necromancer, freed from the Heron's orb, raises his skeleton hamster, little
 * and quick and very hard to put down. Each goes for the nearest foe and hits it
 * for 1: a merlock chops, the skeleton slashes and the hamster bites close in,
 * the ghost keeps off and sends a wisp. With nothing to fight they
 * keep near the figure; the raised ones crumble back after a few quiet seconds.
 * Hurt to none, one goes back where it came from. The game finds what they
 * fight, and says what hurts them.
 */

import { clamp } from '../core/math';
import type { DrawView, Entity, Layer, World } from './entity';
import type { PalTarget } from './pals';
import { walkStep } from './walker';

export type AllyKind = 'merlock' | 'ghost' | 'skeleton' | 'hamster';

/** Hit points, walking speed, reach and how often it hits, and how far off a ranged one keeps. */
export type AllySpec = { hp: number; speed: number; reach: number; every: number; keep: number };

export const ALLY: Readonly<Record<AllyKind, AllySpec>> = {
  merlock: { hp: 3, speed: 80, reach: 22, every: 1.2, keep: 0 },
  skeleton: { hp: 3, speed: 72, reach: 24, every: 1.3, keep: 0 },
  ghost: { hp: 2, speed: 60, reach: 110, every: 2.4, keep: 80 },
  // The kid's skeleton hamster: only 1 a bite, but it takes twelve hits to put down.
  hamster: { hp: 12, speed: 96, reach: 16, every: 1, keep: 0 },
};
/** It goes for foes this near it, and each hit is this hard. */
export const ALLY_SEEK = 240;
export const ALLY_HIT = 1;
/** Seconds to come up, and to go back. */
export const ALLY_RISE = 0.7;
export const ALLY_SINK = 0.6;
/** Blinking this long after a hit. */
export const ALLY_INVULN = 1;
/** A raised ghost or skeleton with nothing to fight this long crumbles back. */
export const ALLY_IDLE = 6;
/** Seconds a ghost's wisp takes to reach what it was sent at. */
export const WISP_T = 0.3;

export type Ally = {
  kind: AllyKind;
  x: number;
  y: number;
  h: number;
  hp: number;
  state: 'rise' | 'fight' | 'sink' | 'gone';
  t: number;
  cd: number;
  invuln: number;
  ph: number;
  /** Seconds since its last hit began, for the hit's look. */
  hitT: number;
  /** Seconds with nothing to fight. */
  idle: number;
  /** A ghost's wisp on its way: from where to where, and how far along. */
  wisp: { x: number; y: number; tx: number; ty: number; t: number } | null;
};

export class Allies implements Entity {
  readonly list: Ally[] = [];
  /** What it can fight, nearest, within reach of a point; the game knows. */
  findTarget: ((x: number, y: number, range: number) => PalTarget | null) | null = null;
  /** It hit something. */
  onHit: ((a: Ally) => void) | null = null;
  /** It was hurt; out says it went back where it came from. */
  onHurt: ((a: Ally, out: boolean) => void) | null = null;

  /** One called up out of the floor at a point. */
  call(x: number, y: number, kind: AllyKind = 'merlock'): Ally {
    const a: Ally = {
      kind,
      x,
      y,
      h: Math.PI / 4,
      hp: ALLY[kind].hp,
      state: 'rise',
      t: 0,
      cd: 0.4,
      invuln: 0,
      ph: this.list.length * 1.7,
      hitT: 9,
      idle: 0,
      wisp: null,
    };
    this.list.push(a);
    return a;
  }

  /** How many are up and fighting, or on their way, of one kind or of any. */
  count(kind?: AllyKind): number {
    return this.list.filter(
      (a) => (a.state === 'rise' || a.state === 'fight') && (!kind || a.kind === kind),
    ).length;
  }

  /** Every one gone at once, as a fight ends or the figure leaves. */
  clear(): void {
    this.list.length = 0;
  }

  /** A hit on one. Returns whether it hurt. */
  hurt(a: Ally): boolean {
    if (a.state !== 'fight' || a.invuln > 0) return false;
    a.hp--;
    a.invuln = ALLY_INVULN;
    if (a.hp <= 0) {
      a.state = 'sink';
      a.t = 0;
    }
    this.onHurt?.(a, a.hp <= 0);
    return true;
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const a = this.list[i] as Ally;
      a.t += dt;
      a.ph += dt;
      a.hitT += dt;
      a.invuln = Math.max(0, a.invuln - dt);
      if (a.wisp) {
        a.wisp.t += dt;
        if (a.wisp.t >= WISP_T) a.wisp = null;
      }
      if (a.state === 'rise') {
        if (a.t >= ALLY_RISE) {
          a.state = 'fight';
          a.t = 0;
        }
        continue;
      }
      if (a.state === 'sink') {
        if (a.t >= ALLY_SINK) this.list.splice(i, 1);
        continue;
      }
      if (a.state !== 'fight') continue;
      const s = ALLY[a.kind];
      a.cd -= dt;
      const tg = this.findTarget?.(a.x, a.y, ALLY_SEEK) ?? null;
      if (tg) a.idle = 0;
      else {
        a.idle += dt;
        if (a.kind !== 'merlock' && a.idle >= ALLY_IDLE) {
          a.state = 'sink';
          a.t = 0;
          continue;
        }
      }
      const tx = tg ? tg.x : f ? f.x : a.x;
      const ty = tg ? tg.y : f ? f.y : a.y;
      const want = tg ? s.keep || s.reach * 0.8 : 36;
      const dx = tx - a.x;
      const dy = ty - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.5) a.h = Math.atan2(dy, dx);
      if (d > want) {
        const st = Math.min(d - want, s.speed * dt);
        walkStep(a, (dx / d) * st, (dy / d) * st, 99);
      }
      if (tg && d <= s.reach && a.cd <= 0) {
        a.cd = s.every;
        a.hitT = 0;
        tg.hit(ALLY_HIT);
        if (s.keep > 0) a.wisp = { x: a.x, y: a.y, tx: tg.x, ty: tg.y, t: 0 };
        this.onHit?.(a);
      }
    }
  }

  /** The ghosts' wisps, over everyone. */
  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'air') return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const a of this.list) {
      const q = a.wisp;
      if (!q) continue;
      const k = clamp(q.t / WISP_T, 0, 1);
      const x = q.x + (q.tx - q.x) * k;
      const y = q.y + (q.ty - q.y) * k;
      ctx.fillStyle = 'rgba(150,255,190,.35)';
      ctx.beginPath();
      ctx.arc(px(x, y), py(x, y, 16), 7 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D8FFE6';
      ctx.beginPath();
      ctx.arc(px(x, y), py(x, y, 16), 3 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** One ally, at its feet, for the game's sorted actors. */
  drawBody(v: DrawView, a: Ally): void {
    const { ctx, px, py, T } = v;
    const k = v.zoom;
    const sx = px(a.x, a.y);
    let base = py(a.x, a.y);
    const up =
      a.state === 'rise'
        ? clamp(a.t / ALLY_RISE, 0, 1)
        : a.state === 'sink'
          ? 1 - clamp(a.t / ALLY_SINK, 0, 1)
          : 1;
    // The puddle a merlock stands in, or the green-lit crack the raised come out of, as they come and go.
    const clip = up < 1 && a.kind !== 'ghost';
    if (up < 1) {
      ctx.fillStyle = a.kind === 'merlock' ? 'rgba(80,170,200,.55)' : 'rgba(110,240,160,.45)';
      v.isoEllipse(a.x, a.y, 12);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      v.isoEllipse(a.x, a.y, 7);
      ctx.fill();
    }
    if (clip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sx - 30 * k, base - 50 * k, 60 * k, 50 * k);
      ctx.clip();
      base += (1 - up) * 26 * k;
    }
    if (a.kind !== 'merlock') {
      // A green ring at its feet: it is on your side.
      ctx.strokeStyle = 'rgba(124,240,168,.7)';
      ctx.lineWidth = 1.4 * k;
      v.isoEllipse(a.x, a.y, 9);
      ctx.stroke();
    }
    if (a.invuln > 0 && Math.sin(T * 30) > 0) ctx.globalAlpha = 0.5;
    if (a.kind === 'ghost') ctx.globalAlpha *= up;
    const face = Math.cos(a.h) - Math.sin(a.h) >= 0 ? 1 : -1;
    const stride = a.state === 'fight' ? Math.sin(a.ph * 9) * 2 * k : 0;
    if (a.kind === 'merlock') drawMerlock(v, a, sx, base, k, face, stride);
    else if (a.kind === 'skeleton') drawSkeleton(v, a, sx, base, k, face, stride);
    else if (a.kind === 'hamster') drawHamster(v, a, sx, base, k, face, stride);
    else drawGhost(v, a, sx, base, k, face);
    ctx.globalAlpha = 1;
    if (clip) ctx.restore();
  }
}

/**
 * A merlock, as the kid's picture of one: a hunched green fish-man, yellow down the front, with a huge round head
 * that is mostly mouth (rows of teeth, a red tongue), one big red eye, long red spines fanning back off its crown,
 * red hands and feet, and a great serrated blade of bone held up over its head, which it brings down as it hits.
 */
function drawMerlock(
  v: DrawView,
  a: Ally,
  sx: number,
  base: number,
  k: number,
  face: number,
  stride: number,
): void {
  const { ctx, T } = v;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Legs, bent, with red feet.
  for (const side of [-1, 1]) {
    const fx = sx + side * 2.6 * k + stride * side;
    ctx.strokeStyle = '#C8D24A';
    ctx.lineWidth = 2.4 * k;
    ctx.beginPath();
    ctx.moveTo(sx + side * 1.6 * k, base - 8 * k);
    ctx.lineTo(sx + side * 3.4 * k, base - 4 * k);
    ctx.lineTo(fx, base - 0.8 * k);
    ctx.stroke();
    ctx.fillStyle = '#D8322A';
    ctx.beginPath();
    ctx.ellipse(fx + face * 0.8 * k, base - 0.4 * k, 1.9 * k, 1 * k, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The body, hunched forward, green with a yellow front.
  const bx = sx + face * 0.6 * k;
  ctx.fillStyle = '#5FAE3A';
  ctx.beginPath();
  ctx.ellipse(bx, base - 12 * k, 4.6 * k, 5.4 * k, face * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#D9DE5C';
  ctx.beginPath();
  ctx.ellipse(bx + face * 1.4 * k, base - 11.4 * k, 2.4 * k, 4 * k, face * 0.25, 0, Math.PI * 2);
  ctx.fill();
  // The back arm, with a red hand.
  ctx.strokeStyle = '#5FAE3A';
  ctx.lineWidth = 1.8 * k;
  ctx.beginPath();
  ctx.moveTo(bx - face * 2.6 * k, base - 14 * k);
  ctx.lineTo(bx - face * 3.6 * k, base - 8.6 * k);
  ctx.stroke();
  ctx.fillStyle = '#D8322A';
  ctx.beginPath();
  ctx.arc(bx - face * 3.8 * k, base - 8 * k, 1.3 * k, 0, Math.PI * 2);
  ctx.fill();
  // Red spines fanning back off the crown, swaying.
  const hx = sx + face * 2.4 * k;
  const hy = base - 22 * k;
  const sway = Math.sin(T * 5 + a.ph) * 0.6 * k;
  ctx.strokeStyle = '#D8442E';
  ctx.lineWidth = 1.3 * k;
  for (const [ox, oy, len] of [
    [-3, -3, 7],
    [-1, -4.4, 8.5],
    [1.2, -4.6, 8],
    [3, -3.8, 6.5],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(hx + face * ox * k, hy + oy * k);
    ctx.lineTo(hx + face * (ox - 3.2) * k + sway, hy + (oy - len) * k);
    ctx.stroke();
  }
  // The head: big and round, yellow-green, mostly mouth.
  ctx.fillStyle = '#B9D046';
  ctx.beginPath();
  ctx.ellipse(hx, hy, 6 * k, 5.4 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5FAE3A';
  ctx.beginPath();
  ctx.ellipse(hx - face * 2.2 * k, hy - 2.4 * k, 3 * k, 2.2 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  const open = a.hitT < 0.3 ? 1.2 : 0.6 + Math.sin(T * 3 + a.ph) * 0.15;
  const mx = hx + face * 2.4 * k;
  const my = hy + 1.6 * k;
  ctx.fillStyle = '#7A1A1E';
  ctx.beginPath();
  ctx.ellipse(mx, my, 3.6 * k, 2.4 * k * open, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E2544E';
  ctx.beginPath();
  ctx.ellipse(mx - face * 0.6 * k, my + 1 * k * open, 1.8 * k, 1 * k * open, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  for (let i = -3; i <= 3; i++) {
    const tx = mx + i * 0.95 * k;
    const ty = my - 2.4 * k * open;
    const by = my + 2.4 * k * open;
    ctx.beginPath();
    ctx.moveTo(tx - 0.5 * k, ty);
    ctx.lineTo(tx, ty + 1.3 * k);
    ctx.lineTo(tx + 0.5 * k, ty);
    ctx.moveTo(tx - 0.5 * k, by);
    ctx.lineTo(tx, by - 1.2 * k);
    ctx.lineTo(tx + 0.5 * k, by);
    ctx.fill();
  }
  // One big red eye.
  const ex = hx + face * 0.6 * k;
  const ey = hy - 2.6 * k;
  ctx.fillStyle = '#FFF4D6';
  ctx.beginPath();
  ctx.arc(ex, ey, 2 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#D8322A';
  ctx.beginPath();
  ctx.arc(ex + face * 0.3 * k, ey, 1.35 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1E2227';
  ctx.beginPath();
  ctx.arc(ex + face * 0.5 * k, ey, 0.55 * k, 0, Math.PI * 2);
  ctx.fill();
  // The great bone blade, held up over its head and brought down as it hits.
  const swing = a.hitT < 0.25 ? Math.sin((a.hitT / 0.25) * Math.PI) : 0;
  const gx = bx + face * 4 * k;
  const gy = base - 15 * k;
  const ang = -Math.PI / 2 + face * (0.35 + swing * 1.5);
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const nx = -uy * face;
  const ny = ux * face;
  ctx.strokeStyle = '#3A3026';
  ctx.lineWidth = 1.5 * k;
  ctx.beginPath();
  ctx.moveTo(gx, gy);
  ctx.lineTo(gx + ux * 9 * k, gy + uy * 9 * k);
  ctx.stroke();
  ctx.fillStyle = '#D8322A';
  ctx.beginPath();
  ctx.arc(gx, gy, 1.4 * k, 0, Math.PI * 2);
  ctx.fill();
  const b0x = gx + ux * 8 * k;
  const b0y = gy + uy * 8 * k;
  const len = 16 * k;
  const wide = 5.2 * k;
  ctx.fillStyle = '#9DB4C4';
  ctx.strokeStyle = '#4E6474';
  ctx.lineWidth = 0.8 * k;
  ctx.beginPath();
  ctx.moveTo(b0x, b0y);
  ctx.lineTo(b0x + ux * len, b0y + uy * len);
  ctx.quadraticCurveTo(
    b0x + ux * len * 1.05 + nx * wide,
    b0y + uy * len * 1.05 + ny * wide,
    b0x + ux * len * 0.7 + nx * wide,
    b0y + uy * len * 0.7 + ny * wide,
  );
  // Its toothed edge, back down to the grip.
  for (let i = 6; i >= 0; i--) {
    const f = (i / 6) * 0.7;
    const tooth = i % 2 ? 2 * k : 0;
    ctx.lineTo(b0x + ux * len * f + nx * (wide + tooth), b0y + uy * len * f + ny * (wide + tooth));
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** A raised skeleton on your side: pale bones with a green glint in its eyes, and a sword it swings down. */
/**
 * The skeleton hamster: a little round ribcage on four short legs, a big round skull with two round ears, green
 * light in its eye and two long front teeth, and a thin tail of bones. It lunges forward as it bites.
 */
function drawHamster(
  v: DrawView,
  a: Ally,
  sx: number,
  base: number,
  k0: number,
  face: number,
  stride: number,
): void {
  const { ctx, T } = v;
  const k = k0 * 1.45;
  const bone = '#EDE8DA';
  const line = '#9E9684';
  const x = sx + (a.hitT < 0.25 ? face * 3 * k : 0);
  const hop = Math.abs(stride) * 0.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // The tail, a curl of little bones behind.
  ctx.fillStyle = bone;
  for (let i = 0; i < 5; i++) {
    const tx = x - face * (8 + i * 2.2) * k;
    const ty = base - (5 + Math.sin(T * 6 + i) * 0.8 + i * 0.6) * k;
    ctx.beginPath();
    ctx.arc(tx, ty, (1.2 - i * 0.12) * k, 0, Math.PI * 2);
    ctx.fill();
  }
  // Four short legs, scurrying.
  ctx.strokeStyle = bone;
  ctx.lineWidth = 1.3 * k;
  for (const [lx, s] of [
    [-4, 1],
    [-2, -1],
    [3, 1],
    [5, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x + face * lx * k, base - 4 * k);
    ctx.lineTo(x + face * (lx + s * stride * 0.4) * k, base);
    ctx.stroke();
  }
  // The ribcage: a round body, ribs across it.
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.ellipse(x, base - 7 * k - hop, 7 * k, 5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.8 * k;
  for (const r of [-3, 0, 3]) {
    ctx.beginPath();
    ctx.moveTo(x + r * k, base - 11 * k - hop);
    ctx.lineTo(x + r * k, base - 3 * k - hop);
    ctx.stroke();
  }
  // The skull, ears, eye and teeth.
  const hx = x + face * 7 * k;
  const hy = base - 10 * k - hop;
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.arc(hx, hy, 4.4 * k, 0, Math.PI * 2);
  ctx.fill();
  for (const e of [-1.6, 1.6]) {
    ctx.beginPath();
    ctx.arc(hx + e * k - face * 0.8 * k, hy - 4.4 * k, 1.8 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1E2A22';
  ctx.beginPath();
  ctx.arc(hx + face * 1.2 * k, hy - 0.8 * k, 1.5 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8CFFA8';
  ctx.beginPath();
  ctx.arc(hx + face * 1.2 * k, hy - 0.8 * k, 0.7 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.5 * k;
  for (const t of [0, 1.3]) {
    ctx.beginPath();
    ctx.rect(hx + face * (3 + t) * k - 0.6 * k, hy + 2.4 * k, 1.2 * k, 2.8 * k);
    ctx.fill();
    ctx.stroke();
  }
}

function drawSkeleton(
  v: DrawView,
  a: Ally,
  sx: number,
  base: number,
  k: number,
  face: number,
  stride: number,
): void {
  const { ctx } = v;
  const bone = '#DDEFE0';
  ctx.strokeStyle = bone;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.8 * k;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx + side * 2 * k, base - 10 * k);
    ctx.lineTo(sx + side * 2 * k + stride * side, base);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(sx, base - 10 * k);
  ctx.lineTo(sx, base - 20 * k);
  ctx.stroke();
  ctx.lineWidth = 1.3 * k;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(
      sx,
      base - 13.5 * k - i * 2.3 * k,
      (3.8 - i * 0.4) * k,
      1.1 * k,
      0,
      Math.PI,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  const hy = base - 24 * k;
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.arc(sx, hy, 4 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(sx - 2.3 * k, hy + 2.5 * k, 4.6 * k, 2.2 * k);
  ctx.fillStyle = '#5BE08E';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + face * 0.8 * k + e * 1.5 * k, hy - 0.2 * k, 1 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  // Its sword: up, then down as it slashes.
  const sw = a.hitT < 0.3 ? 0.2 : -1.1;
  const hx = sx + face * 4.5 * k;
  const hyy = base - 15 * k;
  ctx.strokeStyle = '#B9C2C8';
  ctx.lineWidth = 1.8 * k;
  ctx.beginPath();
  ctx.moveTo(hx, hyy);
  ctx.lineTo(hx + Math.cos(sw) * 12 * k * face, hyy + Math.sin(sw) * 12 * k);
  ctx.stroke();
}

/** A raised ghost on your side: a pale green sheet with a wavy hem, bobbing, with green eyes. */
function drawGhost(v: DrawView, a: Ally, sx: number, base: number, k: number, face: number): void {
  const { ctx, T } = v;
  const bob = Math.sin(T * 3 + a.ph) * 2 * k;
  const top = base - 30 * k + bob;
  const bottom = base - 8 * k + bob;
  ctx.fillStyle = 'rgba(214,255,228,.85)';
  ctx.beginPath();
  ctx.moveTo(sx - 7 * k, bottom);
  ctx.lineTo(sx - 7 * k, top + 7 * k);
  ctx.arc(sx, top + 7 * k, 7 * k, Math.PI, 0);
  ctx.lineTo(sx + 7 * k, bottom);
  for (let i = 1; i <= 4; i++) {
    const hx = sx + 7 * k - i * 3.5 * k;
    ctx.lineTo(hx, bottom + (i % 2 ? -3 : 0) * k + Math.sin(T * 6 + i) * k);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2E9A5E';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      sx + face * 1.5 * k + e * 2.4 * k,
      top + 7 * k,
      1.2 * k,
      1.8 * k,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
