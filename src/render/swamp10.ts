/**
 * Island 10's swamp creatures (entities/swamp10.ts), drawn side on like the prairie's and big enough to read from the
 * zoom a big island is seen at, except the snakes, which lie along the ground. Frogs, squat and goggle-eyed, a
 * throat that puffs out when they croak, and one kind with red eyes; under the water, a ring of ripples and, before
 * they climb out, two eyes. Snakes in banded colours, S-curving as they go, rearing with a flickering tongue. Panthers,
 * long, low and black with green eyes, a tail that swishes and curls. Bear cubs, round and brown, that sit, wave and
 * roll. Deer, small and fawn-spotted, heads down to browse and white tails up when they bound. And the swamp
 * monster: a mossy mound with weed hanging off it that rises into a dripping hulk with glowing eyes and its arms up.
 */

import type { DrawView } from '../entities/entity';
import {
  CROAK_FOR,
  type Cub,
  DEER_BOUND_T,
  type Deer,
  FROG_HOP,
  type Frog,
  MONSTER_ROAR,
  type Monster,
  type Panther,
  ROLL_FOR,
  type Snake,
  Swamp10,
} from '../entities/swamp10';

const INK = '#1D2B3A';
/** How big each is drawn, against the zoom. */
const FROG_K = 2.1;
const PANTHER_K = 3;
const CUB_K = 2.5;
const DEER_K = 2.6;
const MONSTER_K = 3.2;

const FROGS: readonly { body: string; belly: string; eye: string }[] = [
  { body: '#5FAE4A', belly: '#D9E8A6', eye: '#F2D24A' },
  { body: '#8A7A45', belly: '#E2D6A2', eye: '#E8C060' },
  { body: '#6CCB5E', belly: '#F4F0C8', eye: '#E5402E' },
];
const SNAKES: readonly { body: string; band: string; belly: string }[] = [
  { body: '#5E9E3A', band: '#E3D35A', belly: '#E8E2A0' },
  { body: '#8C6A3E', band: '#4A3520', belly: '#D9C394' },
  { body: '#2B2B30', band: '#E07A2A', belly: '#D8B070' },
];

function shadow(v: DrawView, x: number, y: number, rx: number, ry: number, a = 0.16): void {
  const { ctx } = v;
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath();
  ctx.ellipse(v.px(x, y), v.py(x, y, 0), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot = 0,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}

/* ---------- frogs ---------- */

export function drawFrog(v: DrawView, f: Frog): void {
  const { ctx } = v;
  const Z = v.zoom * FROG_K;
  const F = FROGS[f.kind % FROGS.length] ?? FROGS[0];
  if (!F) return;
  const sx = v.px(f.x, f.y);
  if (f.state === 'under') {
    // Ripples where it went in, and its eyes, peeking, before it climbs out.
    const sy = v.py(f.x, f.y, 0);
    const r = ((f.t * 0.9) % 1) * 5 + 2;
    ctx.strokeStyle = `rgba(210,230,210,${0.45 * (1 - (r - 2) / 5)})`;
    ctx.lineWidth = 0.35 * Z;
    blob(ctx, sx, sy, r * Z, r * Z * 0.45);
    ctx.stroke();
    if (f.wait < 1.8) {
      for (const o of [-0.7, 0.7]) {
        ctx.fillStyle = F.body;
        blob(ctx, sx + o * Z, sy - 0.2 * Z, 0.65 * Z, 0.5 * Z);
        ctx.fill();
        ctx.fillStyle = F.eye;
        blob(ctx, sx + o * Z, sy - 0.35 * Z, 0.42 * Z, 0.34 * Z);
        ctx.fill();
        ctx.fillStyle = INK;
        blob(ctx, sx + o * Z, sy - 0.35 * Z, 0.13 * Z, 0.24 * Z);
        ctx.fill();
      }
    }
    return;
  }
  const hop = f.state === 'dive' || f.state === 'climb';
  const k = hop ? Math.min(1, f.t / FROG_HOP) : 0;
  const lift = hop ? Math.sin(k * Math.PI) * 7 : 0;
  // A frog going under sinks into the water at the end of its hop.
  if (f.state === 'dive' && k > 0.85) ctx.globalAlpha = Math.max(0, (1 - k) / 0.15);
  if (!hop) shadow(v, f.x, f.y, 2.6 * Z, 0.9 * Z);
  ctx.save();
  ctx.translate(sx, v.py(f.x, f.y, (f.pad ? 0.6 : 0) + lift));
  ctx.scale(f.face, 1);
  ctx.lineWidth = 0.32 * Z;
  ctx.strokeStyle = INK;
  if (hop) {
    // Stretched out, back legs trailing.
    ctx.fillStyle = F.body;
    ctx.beginPath();
    ctx.moveTo(-1.6 * Z, -1.2 * Z);
    ctx.lineTo(-4.2 * Z, -0.2 * Z);
    ctx.lineTo(-4 * Z, 0.4 * Z);
    ctx.lineTo(-1.2 * Z, -0.4 * Z);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    blob(ctx, 0, -1.5 * Z, 2.3 * Z, 1.1 * Z, -0.2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Folded back leg, then the squat body.
    ctx.fillStyle = F.body;
    blob(ctx, -1.2 * Z, -0.7 * Z, 1.4 * Z, 0.8 * Z, -0.3);
    ctx.fill();
    ctx.stroke();
    blob(ctx, 0, -1.4 * Z, 2 * Z, 1.35 * Z);
    ctx.fill();
    ctx.stroke();
    // Front leg.
    ctx.strokeStyle = F.body;
    ctx.lineWidth = 0.55 * Z;
    ctx.beginPath();
    ctx.moveTo(1.1 * Z, -0.9 * Z);
    ctx.lineTo(1.5 * Z, 0);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.32 * Z;
  }
  // Its throat puffs out as it croaks.
  const puff = f.croak > 0 ? Math.sin((1 - f.croak / CROAK_FOR) * Math.PI * 2) ** 2 : 0;
  if (puff > 0.05) {
    ctx.fillStyle = F.belly;
    blob(ctx, 1.7 * Z, -0.8 * Z, (0.5 + puff * 0.9) * Z, (0.4 + puff * 0.7) * Z);
    ctx.fill();
    ctx.stroke();
  }
  // A goggle eye on top, and a wide mouth.
  ctx.fillStyle = F.body;
  blob(ctx, 1.1 * Z, -2.6 * Z, 0.75 * Z, 0.7 * Z);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = F.eye;
  blob(ctx, 1.25 * Z, -2.7 * Z, 0.45 * Z, 0.42 * Z);
  ctx.fill();
  ctx.fillStyle = INK;
  blob(ctx, 1.35 * Z, -2.7 * Z, 0.14 * Z, 0.28 * Z);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.6 * Z, -1.3 * Z);
  ctx.quadraticCurveTo(1.4 * Z, -1.05 * Z, 2 * Z, -1.45 * Z);
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

/* ---------- snakes ---------- */

export function drawSnake(v: DrawView, s: Snake): void {
  const { ctx } = v;
  const C = SNAKES[s.kind % SNAKES.length] ?? SNAKES[0];
  if (!C) return;
  const Z = v.zoom;
  const rear = s.state === 'rear' ? Math.min(1, s.t / 0.25) : 0;
  // The body, head first: where it has been, swung side to side in an S that runs down it.
  const pts: [number, number, number][] = [];
  const all: (readonly [number, number])[] = [[s.x, s.y], ...s.trail];
  for (let i = 0; i < all.length; i++) {
    const [x, y] = all[i] as readonly [number, number];
    const [nx, ny] = all[i + 1] ?? all[i - 1] ?? [x - 1, y];
    const dx = i + 1 < all.length ? x - nx : nx - x;
    const dy = i + 1 < all.length ? y - ny : ny - y;
    const d = Math.hypot(dx, dy) || 1;
    const sway = Math.sin(i * 0.9 - s.wig * 5) * 1.8 * Math.min(1, i / 3) * (1 - rear * 0.6);
    const ox = (-dy / d) * sway;
    const oy = (dx / d) * sway;
    // Reared, the front of it stands up in a curve.
    const z = rear > 0 && i < 5 ? ((5 - i) / 5) ** 1.3 * 15 * rear : 0;
    pts.push([x + ox, y + oy, z]);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.18)';
  ctx.lineWidth = 2.6 * Z;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(v.px(x, y), v.py(x, y, 0) + 0.8 * Z);
    else ctx.lineTo(v.px(x, y), v.py(x, y, 0) + 0.8 * Z);
  });
  ctx.stroke();
  // Tail to head, so the head is on top; thinner toward the tail, banded.
  for (let i = pts.length - 1; i > 0; i--) {
    const [ax, ay, az] = pts[i] as [number, number, number];
    const [bx, by, bz] = pts[i - 1] as [number, number, number];
    const w = 0.7 + 1.9 * (1 - i / pts.length);
    ctx.strokeStyle = i % 3 === 1 ? C.band : C.body;
    ctx.lineWidth = w * Z;
    ctx.beginPath();
    ctx.moveTo(v.px(ax, ay), v.py(ax, ay, az + 0.8));
    ctx.lineTo(v.px(bx, by), v.py(bx, by, bz + 0.8));
    ctx.stroke();
  }
  // The head: a little wider than the neck, with an eye, and a forked tongue flicking out.
  const [hx, hy, hz] = pts[0] as [number, number, number];
  const sx = v.px(hx, hy);
  const sy = v.py(hx, hy, hz + 1.2);
  const fx = Math.cos(s.h) - Math.sin(s.h);
  const face = Math.abs(fx) > 0.05 ? Math.sign(fx) : 1;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.scale(face, 1);
  if (rear > 0.5 || Math.sin(s.wig * 3) > 0.8) {
    ctx.strokeStyle = '#D8343A';
    ctx.lineWidth = 0.4 * Z;
    ctx.beginPath();
    ctx.moveTo(2 * Z, 0);
    ctx.lineTo(3.6 * Z, 0);
    ctx.lineTo(4.3 * Z, -0.5 * Z);
    ctx.moveTo(3.6 * Z, 0);
    ctx.lineTo(4.3 * Z, 0.5 * Z);
    ctx.stroke();
  }
  ctx.fillStyle = C.body;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.3 * Z;
  blob(ctx, 0.6 * Z, 0, 1.9 * Z, 1.3 * Z);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#F4E36A';
  blob(ctx, 1.1 * Z, -0.45 * Z, 0.45 * Z, 0.4 * Z);
  ctx.fill();
  ctx.fillStyle = INK;
  blob(ctx, 1.2 * Z, -0.45 * Z, 0.13 * Z, 0.3 * Z);
  ctx.fill();
  ctx.restore();
}

/* ---------- panthers ---------- */

export function drawPanther(v: DrawView, p: Panther): void {
  const { ctx } = v;
  const Z = v.zoom * PANTHER_K;
  const T = v.T;
  const body = '#24252C';
  const sheen = '#3D4050';
  const slink = p.state === 'slink';
  const sit = p.state === 'sit';
  const low = slink ? 1.4 : 0;
  shadow(v, p.x, p.y, 5.5 * Z, 1.4 * Z, 0.2);
  ctx.save();
  ctx.translate(v.px(p.x, p.y), v.py(p.x, p.y, 0));
  ctx.scale(p.face, 1);
  ctx.lineCap = 'round';
  const stride = p.state === 'sit' ? 0 : Math.sin(p.step) * 1.4;
  // The tail: long, swishing, curling up at its end.
  const swish = Math.sin(T * (slink ? 6 : 1.8) + p.home[0]) * 1.2;
  ctx.strokeStyle = body;
  ctx.lineWidth = 0.75 * Z;
  ctx.beginPath();
  if (sit) {
    // Sat, its tail curls round on the ground in front of its feet, the tip flicking.
    ctx.moveTo(-3 * Z, -0.8 * Z);
    ctx.bezierCurveTo(-4 * Z, 0.4 * Z, 0 * Z, 0.9 * Z, 2.8 * Z, (0.2 - swish * 0.3) * Z);
  } else {
    const tx = -4.6 * Z;
    const ty = -3.6 * Z + low * Z;
    ctx.moveTo(tx, ty);
    ctx.bezierCurveTo(
      tx - 3 * Z,
      ty + 1.5 * Z,
      tx - 4.4 * Z,
      ty - (2 + swish) * Z,
      tx - 3.4 * Z,
      ty - (3.4 + swish) * Z,
    );
  }
  ctx.stroke();
  // Legs, far pair darker.
  for (const [lx, far] of [
    [-3, true],
    [2.6, true],
    [-3.4, false],
    [2.2, false],
  ] as const) {
    ctx.strokeStyle = far ? '#16171C' : body;
    ctx.lineWidth = 0.85 * Z;
    const s = (far ? -stride : stride) * (lx < 0 ? -1 : 1);
    // Sat, its back legs are folded into its haunch (below) and its front legs stand straight.
    if (sit && lx < 0) continue;
    ctx.beginPath();
    if (sit) {
      ctx.moveTo((lx - 1.2) * Z, -3.4 * Z);
      ctx.lineTo((lx - 1) * Z, 0);
    } else {
      ctx.moveTo(lx * Z, (-3.4 + low) * Z);
      ctx.lineTo((lx + s * 0.4) * Z, 0);
    }
    ctx.stroke();
  }
  // The body: long and low, or sat up.
  ctx.fillStyle = body;
  if (sit) {
    // A haunch on the ground, a back paw in front of it, and the chest sat up straight.
    blob(ctx, -1.5 * Z, -1.7 * Z, 2.2 * Z, 1.8 * Z);
    ctx.fill();
    blob(ctx, -0.2 * Z, -0.25 * Z, 1.3 * Z, 0.45 * Z);
    ctx.fill();
    blob(ctx, 0.3 * Z, -3.8 * Z, 1.8 * Z, 2.9 * Z, 0.3);
    ctx.fill();
  } else {
    blob(ctx, -0.4 * Z, (-4 + low) * Z, 4.8 * Z, 1.7 * Z);
    ctx.fill();
  }
  ctx.fillStyle = sheen;
  if (sit) blob(ctx, -1.8 * Z, -2.6 * Z, 1.2 * Z, 0.6 * Z, -0.4);
  else blob(ctx, -0.6 * Z, (-5 + low) * Z, 3 * Z, 0.5 * Z);
  ctx.fill();
  // The head, with little round ears (flat when it slinks), green eyes, and its mouth open in a yawn.
  const hx = sit ? 1.2 * Z : 4.6 * Z;
  const hy = sit ? -7.2 * Z : (-5.2 + low * 1.2) * Z;
  ctx.fillStyle = body;
  for (const ex of [-0.9, 0.5]) {
    blob(ctx, hx + ex * Z, hy - (slink ? 1 : 1.5) * Z, 0.6 * Z, slink ? 0.35 * Z : 0.6 * Z);
    ctx.fill();
  }
  blob(ctx, hx, hy, 1.9 * Z, 1.6 * Z);
  ctx.fill();
  blob(ctx, hx + 1.4 * Z, hy + 0.5 * Z, 1 * Z, 0.75 * Z);
  ctx.fill();
  ctx.fillStyle = '#9BE36A';
  blob(ctx, hx + 0.7 * Z, hy - 0.5 * Z, 0.5 * Z, slink ? 0.22 * Z : 0.4 * Z);
  ctx.fill();
  ctx.fillStyle = '#0E1210';
  blob(ctx, hx + 0.8 * Z, hy - 0.5 * Z, 0.13 * Z, slink ? 0.18 * Z : 0.32 * Z);
  ctx.fill();
  ctx.fillStyle = '#C9708A';
  blob(ctx, hx + 2.2 * Z, hy + 0.2 * Z, 0.3 * Z, 0.22 * Z);
  ctx.fill();
  if (p.yawn > 0) {
    const o = Math.sin((p.yawn / 1.2) * Math.PI);
    ctx.fillStyle = '#B5485E';
    blob(ctx, hx + 1.6 * Z, hy + 1.1 * Z, 0.8 * Z, 0.7 * o * Z);
    ctx.fill();
    ctx.fillStyle = '#F4F1E6';
    for (const fx of [1.1, 2]) {
      ctx.beginPath();
      ctx.moveTo((fx - 0.15) * Z + hx, hy + 0.6 * Z);
      ctx.lineTo((fx + 0.15) * Z + hx, hy + 0.6 * Z);
      ctx.lineTo(fx * Z + hx, hy + 1.1 * Z);
      ctx.fill();
    }
  }
  // Washing a paw while it sits: the front paw up to its mouth now and then.
  if (sit && p.yawn <= 0 && Math.sin(T * 0.9 + p.home[1]) > 0.3) {
    ctx.strokeStyle = body;
    ctx.lineWidth = 0.85 * Z;
    ctx.beginPath();
    ctx.moveTo(1.2 * Z, -4.2 * Z);
    ctx.lineTo(hx + 1.2 * Z, hy + 1.3 * Z + Math.sin(T * 9) * 0.25 * Z);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- tiny bears ---------- */

export function drawCub(v: DrawView, c: Cub): void {
  const { ctx } = v;
  const Z = v.zoom * CUB_K;
  const fur = '#7A5232';
  const belly = '#A97E54';
  const up = c.state === 'sit' || c.state === 'wave';
  shadow(v, c.x, c.y, 2.8 * Z, 1 * Z);
  ctx.save();
  ctx.translate(v.px(c.x, c.y), v.py(c.x, c.y, 0));
  if (c.state === 'roll') {
    // A tumble on the spot, round its middle.
    ctx.translate(0, -2 * Z);
    ctx.rotate((c.t / ROLL_FOR) * Math.PI * 2 * c.face);
    ctx.translate(0, 2 * Z);
  }
  ctx.scale(c.face, 1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.35 * Z;
  ctx.fillStyle = fur;
  const step = c.state === 'toddle' ? Math.sin(c.step) * 0.6 : 0;
  if (up) {
    // Sat up: round body, legs out in front, a paw up when it waves.
    blob(ctx, 0.9 * Z, -0.3 * Z, 0.9 * Z, 0.55 * Z);
    ctx.fill();
    ctx.stroke();
    blob(ctx, 0, -2.2 * Z, 1.9 * Z, 2.2 * Z);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = belly;
    blob(ctx, 0.5 * Z, -1.9 * Z, 1.1 * Z, 1.4 * Z);
    ctx.fill();
    ctx.strokeStyle = fur;
    ctx.lineWidth = 0.8 * Z;
    ctx.beginPath();
    if (c.state === 'wave') {
      const a = Math.sin(c.t * 9) * 0.5;
      ctx.moveTo(0.9 * Z, -3 * Z);
      ctx.lineTo((1.6 + a) * Z, -5 * Z);
    } else {
      ctx.moveTo(0.9 * Z, -3 * Z);
      ctx.lineTo(1.7 * Z, -1.8 * Z);
    }
    ctx.stroke();
  } else {
    // On all fours.
    ctx.strokeStyle = '#5E3E24';
    ctx.lineWidth = 0.75 * Z;
    for (const [lx, s] of [
      [-1.2, step],
      [1.2, -step],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(lx * Z, -1.2 * Z);
      ctx.lineTo((lx + s) * Z, 0);
      ctx.stroke();
    }
    ctx.fillStyle = fur;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.35 * Z;
    blob(ctx, 0, -1.8 * Z, 2.3 * Z, 1.5 * Z);
    ctx.fill();
    ctx.stroke();
  }
  // The head: round ears, a tan muzzle and a black nose.
  const hx = up ? 0.5 * Z : 2.1 * Z;
  const hy = up ? -4.8 * Z : -2.9 * Z;
  ctx.fillStyle = fur;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.35 * Z;
  for (const ex of [-0.9, 0.8]) {
    blob(ctx, hx + ex * Z, hy - 1.1 * Z, 0.55 * Z, 0.55 * Z);
    ctx.fill();
    ctx.stroke();
  }
  blob(ctx, hx, hy, 1.4 * Z, 1.25 * Z);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#C9A06E';
  blob(ctx, hx + 0.8 * Z, hy + 0.35 * Z, 0.75 * Z, 0.55 * Z);
  ctx.fill();
  ctx.fillStyle = INK;
  blob(ctx, hx + 1.35 * Z, hy + 0.15 * Z, 0.28 * Z, 0.22 * Z);
  ctx.fill();
  blob(ctx, hx + 0.35 * Z, hy - 0.4 * Z, 0.2 * Z, 0.22 * Z);
  ctx.fill();
  ctx.restore();
}

/* ---------- tiny deer ---------- */

export function drawDeer(v: DrawView, d: Deer): void {
  const { ctx } = v;
  const Z = v.zoom * DEER_K;
  const coat = '#B9874E';
  const bound = d.state === 'bound';
  const k = bound ? Math.min(1, d.t / DEER_BOUND_T) : 0;
  const lift = bound ? Math.sin(k * Math.PI) * 6 : 0;
  shadow(v, d.x, d.y, 2.8 * Z, 0.9 * Z);
  ctx.save();
  ctx.translate(v.px(d.x, d.y), v.py(d.x, d.y, lift));
  ctx.scale(d.face, 1);
  ctx.lineCap = 'round';
  // Slim legs: tucked mid-bound, stepping when it walks.
  const step = d.state === 'walk' ? Math.sin(d.step) * 0.6 : 0;
  ctx.strokeStyle = '#8A6238';
  ctx.lineWidth = 0.45 * Z;
  for (const [lx, s] of [
    [-1.6, step],
    [-1.2, -step],
    [1.5, -step],
    [1.9, step],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(lx * Z, -2.6 * Z);
    if (bound) ctx.lineTo((lx + (lx < 0 ? -1.4 : 1.4)) * Z, -1 * Z);
    else ctx.lineTo((lx + s) * Z, 0);
    ctx.stroke();
  }
  // The body, spotted, and a white tail flagged up as it bounds.
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.3 * Z;
  blob(
    ctx,
    -2.4 * Z,
    (bound ? -4.4 : -3.6) * Z,
    0.45 * Z,
    (bound ? 0.9 : 0.5) * Z,
    bound ? -0.5 : 0.4,
  );
  ctx.fill();
  ctx.fillStyle = coat;
  blob(ctx, 0, -3.3 * Z, 2.6 * Z, 1.25 * Z);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (const [sx, sy] of [
    [-1.4, -3.7],
    [-0.4, -4],
    [0.6, -3.7],
    [-0.9, -3.1],
    [0.2, -3.2],
  ] as const) {
    ctx.beginPath();
    ctx.arc(sx * Z, sy * Z, 0.2 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // The neck and head: down to browse, up to look about; big ears, a black nose.
  const up = d.head;
  const hx = (2.6 + up * 0.4) * Z;
  const hy = (-1.4 - up * 4) * Z;
  ctx.strokeStyle = coat;
  ctx.lineWidth = 1.1 * Z;
  ctx.beginPath();
  ctx.moveTo(1.8 * Z, -3.6 * Z);
  ctx.lineTo(hx - 0.4 * Z, hy + 0.3 * Z);
  ctx.stroke();
  ctx.fillStyle = coat;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.3 * Z;
  for (const ex of [-0.7, -0.1]) {
    blob(ctx, hx + ex * Z, hy - 1 * Z, 0.4 * Z, 0.85 * Z, -0.6);
    ctx.fill();
    ctx.stroke();
  }
  blob(ctx, hx + 0.4 * Z, hy, 1.2 * Z, 0.8 * Z, 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  blob(ctx, hx + 1.45 * Z, hy + 0.35 * Z, 0.24 * Z, 0.2 * Z);
  ctx.fill();
  blob(ctx, hx + 0.4 * Z, hy - 0.2 * Z, 0.17 * Z, 0.2 * Z);
  ctx.fill();
  ctx.restore();
}

/* ---------- the swamp monster ---------- */

export function drawMonster(v: DrawView, m: Monster): void {
  const { ctx } = v;
  const Z = v.zoom * MONSTER_K;
  const T = v.T;
  const up = Swamp10.monsterUp(m);
  const roar = m.state === 'roar';
  const moss = '#4F6B2E';
  const moss2 = '#5E7D36';
  const weed = '#7E9A4A';
  shadow(v, m.x, m.y, 5.5 * Z, 1.8 * Z, 0.22);
  ctx.save();
  ctx.translate(v.px(m.x, m.y), v.py(m.x, m.y, 0));
  ctx.scale(m.face, 1);
  const H = 3 + up * 13;
  const shake = roar ? Math.sin(m.t * 40) * 0.3 * Z : 0;
  ctx.translate(shake, 0);
  // Arms: up and shaking in the roar, one waving after.
  if (up > 0.6) {
    ctx.strokeStyle = moss;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.7 * Z;
    const lift = roar
      ? Math.min(1, m.t / 0.25) * (1 - Math.max(0, m.t - MONSTER_ROAR + 0.3) / 0.3)
      : 0;
    const wave = m.state === 'wave' ? Math.sin(m.t * 5) * 0.8 : 0;
    for (const side of [-1, 1]) {
      const sxA = side * 3.4 * Z;
      const syA = -H * 0.62 * Z;
      const raise = roar ? lift : side > 0 && m.state === 'wave' ? 0.8 : 0;
      const ex = side * (4.8 + raise * 0.6 + (side > 0 ? wave : 0)) * Z;
      const ey = (-H * 0.3 - raise * H * 0.75) * Z;
      ctx.beginPath();
      ctx.moveTo(sxA, syA);
      ctx.quadraticCurveTo(side * 5.4 * Z, syA + 1 * Z, ex, ey);
      ctx.stroke();
      // Weed hanging off the arm.
      ctx.strokeStyle = weed;
      ctx.lineWidth = 0.35 * Z;
      for (let i = 0; i < 3; i++) {
        const wx = sxA + (ex - sxA) * (0.3 + i * 0.25);
        const wy = syA + (ey - syA) * (0.3 + i * 0.25);
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + Math.sin(T * 2 + i) * 0.4 * Z, wy + (1.6 + i * 0.3) * Z);
        ctx.stroke();
      }
      ctx.strokeStyle = moss;
      ctx.lineWidth = 1.7 * Z;
    }
  }
  // The body: a heap of moss, tall when it stands, a mound when it sleeps.
  ctx.fillStyle = moss;
  blob(ctx, 0, -H * 0.42 * Z, 4.4 * Z, H * 0.5 * Z);
  ctx.fill();
  blob(ctx, 0, -H * 0.86 * Z, 3.2 * Z, Math.min(3.2, H * 0.3) * Z);
  ctx.fill();
  ctx.fillStyle = moss2;
  for (const [bx, by, br] of [
    [-2.4, 0.25, 1.6],
    [2.2, 0.35, 1.5],
    [-1, 0.6, 1.3],
    [1.4, 0.75, 1.2],
    [-0.3, 0.92, 1.1],
  ] as const) {
    blob(ctx, bx * Z, -H * by * Z, br * Z, br * 0.8 * Z);
    ctx.fill();
  }
  // Weed hanging down its front, swaying.
  ctx.strokeStyle = weed;
  ctx.lineWidth = 0.4 * Z;
  for (let i = 0; i < 6; i++) {
    const wx = (-3 + i * 1.2) * Z;
    const wy = -H * (0.55 + (i % 3) * 0.12) * Z;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.quadraticCurveTo(
      wx + Math.sin(T * 1.5 + i) * 0.6 * Z,
      wy + 1.6 * Z,
      wx + Math.sin(T * 1.5 + i + 1) * 0.4 * Z,
      wy + (2.8 + (i % 2)) * Z,
    );
    ctx.stroke();
  }
  // The face: shut eyes asleep (a glint now and then), glowing ones awake, and a great mouth when it roars.
  const fy = -H * 0.8 * Z;
  if (up < 0.3) {
    ctx.strokeStyle = '#2C3A1A';
    ctx.lineWidth = 0.3 * Z;
    for (const ex of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo((ex - 0.5) * Z + 0.6 * Z, fy);
      ctx.lineTo((ex + 0.5) * Z + 0.6 * Z, fy);
      ctx.stroke();
    }
    if (Math.sin(T * 0.7) > 0.96) {
      ctx.fillStyle = '#F4E36A';
      blob(ctx, 1.6 * Z, fy, 0.35 * Z, 0.25 * Z);
      ctx.fill();
    }
  } else {
    ctx.globalAlpha = Math.min(1, (up - 0.3) / 0.4);
    ctx.fillStyle = 'rgba(244,227,106,.25)';
    for (const ex of [-0.4, 1.8]) {
      blob(ctx, ex * Z, fy, 1.2 * Z, 1 * Z);
      ctx.fill();
    }
    ctx.fillStyle = '#F4E36A';
    for (const ex of [-0.4, 1.8]) {
      blob(ctx, ex * Z, fy, 0.65 * Z, 0.55 * Z);
      ctx.fill();
    }
    ctx.fillStyle = '#20240F';
    for (const ex of [-0.4, 1.8]) {
      blob(ctx, ex * Z + 0.15 * Z, fy, 0.22 * Z, 0.35 * Z);
      ctx.fill();
    }
    const open = roar ? 1 : 0.25;
    ctx.fillStyle = '#20240F';
    blob(ctx, 0.8 * Z, fy + 2 * Z, 1.5 * Z, (0.25 + open * 0.9) * Z);
    ctx.fill();
    if (roar) {
      ctx.fillStyle = '#E8E0B0';
      for (const tx of [-0.2, 0.8, 1.8]) {
        ctx.beginPath();
        ctx.moveTo((tx - 0.2) * Z, fy + 1.1 * Z);
        ctx.lineTo((tx + 0.2) * Z, fy + 1.1 * Z);
        ctx.lineTo(tx * Z, fy + 1.6 * Z);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  // Drips falling off it as it rises.
  if (m.state === 'rise') {
    ctx.fillStyle = 'rgba(190,220,230,.8)';
    for (let i = 0; i < 4; i++) {
      const dy = ((m.t * 2 + i * 0.27) % 1) * H * 0.6;
      blob(ctx, (-3 + i * 2) * Z, (-H * 0.7 + dy) * Z, 0.2 * Z, 0.32 * Z);
      ctx.fill();
    }
  }
  ctx.restore();
}
