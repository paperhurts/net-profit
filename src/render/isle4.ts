/**
 * Drawing island 4, from a plain little island to tar. Everything takes how
 * far along the change is, so the cutscene can play it and the game can hold
 * it finished: tar (the island's colours going black, its palms dying),
 * spread (the black water reaching out over the sea), rise (the tar monster
 * coming up out of it) and summon (the evil monkey's spell, a purple swirl on
 * the water), and whether the evil monkey still stands on the beach. The
 * monster is the kid's: a great black dome of tar with glowing yellow eyes and
 * dripping arms. Once the tar has spread the game hands the monster to its
 * entity, the Tar Anchorer, which draws it with drawMonster. Stand-in shapes
 * until he draws it.
 */
import type { DrawView } from '../entities/entity';
import { ISLE4, MONSTER, PALMS4, ROCKS4, SUMMONER, TAR_R } from '../world/isle4';
import type { Solid } from './layers';

export type Isle4Look = {
  tar: number;
  spread: number;
  rise: number;
  summon: number;
  /** The evil monkey on the beach: there, or gone for now. */
  monkey: boolean;
};

const channels = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];
/** Between two #rrggbb colours, t of the way, as #rrggbb, which the extruder's shading reads. */
export function mix(a: string, b: string, t: number): string {
  const p = channels(a);
  const q = channels(b);
  const k = Math.max(0, Math.min(1, t));
  return `#${p
    .map((v, i) =>
      Math.round(v + ((q[i] ?? 0) - v) * k)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

const TAR = '#1C1719';

/** Its shallows, and the black water once it spreads. */
export function drawIsle4Sea(v: DrawView, look: Isle4Look): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE4.x, ISLE4.y, (TAR_R + 120) * Z)) return;
  const { x, y, r } = ISLE4;
  v.isoEllipse(x, y, r + 300);
  ctx.fillStyle = '#20808B';
  ctx.fill();
  v.isoEllipse(x, y, r + 150);
  ctx.fillStyle = mix('#5FC4C2', '#2A3436', look.tar);
  ctx.fill();
  v.isoEllipse(x, y, r + 60);
  ctx.fillStyle = mix('#8FE0D6', '#232A2C', look.tar);
  ctx.fill();
  if (look.spread <= 0) return;
  const R = TAR_R * look.spread;
  v.isoEllipse(x, y, R);
  ctx.fillStyle = 'rgba(18,14,18,.93)';
  ctx.fill();
  // An oily sheen on the black, sliding round.
  ctx.lineWidth = 3 * Z;
  for (let i = 0; i < 5; i++) {
    const rr = Math.max(1, R * (0.35 + i * 0.13) + Math.sin(T * 0.5 + i) * 8 * look.spread);
    ctx.strokeStyle = i % 2 ? 'rgba(120,80,160,.22)' : 'rgba(70,140,110,.18)';
    ctx.beginPath();
    ctx.ellipse(px(x, y), py(x, y), rr * Z, rr * 0.5 * Z, 0, T * 0.2 + i, T * 0.2 + i + 1.6);
    ctx.stroke();
  }
  // Bubbles coming up through it and popping.
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4 + 0.3;
    const d = R * (0.45 + ((i * 37) % 50) / 100);
    const t = (T * 0.6 + i * 0.37) % 1;
    const bx = x + Math.cos(a) * d;
    const by = y + Math.sin(a) * d;
    ctx.fillStyle = `rgba(40,34,40,${1 - t})`;
    ctx.beginPath();
    ctx.arc(px(bx, by), py(bx, by), (1.5 + t * 4) * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Its sand and grass, going black. */
export function drawIsle4Flat(v: DrawView, look: Isle4Look): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  if (!v.onScreen(ISLE4.x, ISLE4.y, (ISLE4.r + 60) * Z)) return;
  const { x, y, r } = ISLE4;
  v.isoEllipse(x, y, r + 9 + Math.sin(T * 1.3 + 5) * 3);
  ctx.strokeStyle = mix('#FFFFFF', '#3A3438', look.tar);
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 4 * Z;
  ctx.stroke();
  ctx.globalAlpha = 1;
  v.isoEllipse(x, y, r);
  ctx.fillStyle = mix('#F2D9A0', '#2B2522', look.tar);
  ctx.fill();
  v.isoEllipse(x + 15, y + 25, r * 0.65);
  ctx.fillStyle = mix('#6FB062', TAR, look.tar);
  ctx.fill();
  if (look.tar > 0.3) {
    // Puddles of tar on it, shining.
    for (const [dx, dy, rr] of [
      [-60, 40, 26],
      [50, -30, 20],
      [10, 90, 18],
    ] as const) {
      v.isoEllipse(x + dx, y + dy, rr * look.tar);
      ctx.fillStyle = 'rgba(8,6,8,.85)';
      ctx.fill();
    }
  }
}

function drawPalm4(v: DrawView, p: readonly [number, number], tar: number, i: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const [x, y] = p;
  const top = 46 + i * 4;
  const lean = (i % 2 ? 1 : -1) * 6;
  ctx.strokeStyle = mix('#8A6A43', '#2A2224', tar);
  ctx.lineWidth = 3.4 * Z;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px(x, y), py(x, y, 0));
  ctx.quadraticCurveTo(
    px(x, y) + lean * 0.5 * Z,
    py(x, y, top * 0.5),
    px(x, y) + lean * Z,
    py(x, y, top),
  );
  ctx.stroke();
  const tx = px(x, y) + lean * Z;
  const ty = py(x, y, top);
  // Fronds: green and lively, or, as the tar takes it, drooping black strands, fewer.
  const n = Math.round(6 - tar * 3);
  ctx.strokeStyle = mix('#3E9A4A', '#151113', tar);
  ctx.lineWidth = (3 - tar * 1.4) * Z;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.sin(T * 0.8 + i) * 0.1 * (1 - tar);
    const len = (18 - tar * 6) * Z;
    const droop = (6 + tar * 14) * Z;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * len * 0.6,
      ty - 4 * Z,
      tx + Math.cos(a) * len,
      ty + droop,
    );
    ctx.stroke();
  }
}

/** The evil monkey on the beach, in its skull mask, arms up while it summons. */
function drawSummoner(v: DrawView, summon: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom * 1.7;
  const { x, y } = SUMMONER;
  const sx = px(x, y);
  const sy = py(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  v.isoEllipse(x, y, 6);
  ctx.fill();
  const up = summon > 0 && summon < 1 ? 1 : 0.2;
  const wave = Math.sin(T * 10) * 2 * Z * up;
  ctx.strokeStyle = '#6B4A2C';
  ctx.lineWidth = 2.2 * Z;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx + side * 3 * Z, sy - 10 * Z);
    ctx.lineTo(sx + side * (6 + up * 2) * Z + wave * side, sy - (10 + up * 10) * Z);
    ctx.stroke();
  }
  ctx.fillStyle = '#7A5634';
  ctx.beginPath();
  ctx.ellipse(sx, sy - 8 * Z, 4 * Z, 5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F4F1E6';
  ctx.beginPath();
  ctx.arc(sx, sy - 16 * Z, 3.6 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1E2227';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx + e * 1.4 * Z, sy - 16.5 * Z, 0.9 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** How it stands: where its eyes look and its right hand reaches, and a hit's flash. */
export type MonsterPose = {
  /** A world direction its eyes look, toward the figure; ahead without one. */
  look?: { x: number; y: number };
  /** A screen point its right hand reaches for: the anchor's chain. */
  hand?: { x: number; y: number };
  /** Of a hit's flash, 0 to 1. */
  flash?: number;
  /** Angry: its eyes burn red. */
  angry?: boolean;
};

/** The tar monster at a point, rise of the way up out of the black water. */
export function drawMonster(
  v: DrawView,
  x: number,
  y: number,
  rise: number,
  pose: MonsterPose = {},
): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const sx = px(x, y);
  const sy = py(x, y);
  const w = 72 * Z;
  const h = 124 * Z * rise;
  const sway = Math.sin(T * 0.9) * 3 * Z;
  const body = pose.flash ? mix(TAR, '#B9A4D8', pose.flash * 0.7) : TAR;
  // Arms first, reaching out and dripping; the right one to the anchor's chain when it has one.
  ctx.strokeStyle = body;
  ctx.lineWidth = 14 * Z;
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const hand =
      side > 0 && pose.hand ? pose.hand : { x: sx + side * w * 1.6 + sway * side, y: sy - h * 0.2 };
    ctx.beginPath();
    ctx.moveTo(sx + side * w * 0.6, sy - h * 0.55);
    ctx.quadraticCurveTo(sx + side * w * 1.4 + sway, sy - h * 0.9, hand.x, hand.y);
    ctx.stroke();
    if (side > 0 && pose.hand) continue;
    // Drips falling off the hand.
    const t = (T * 0.8 + (side > 0 ? 0.5 : 0)) % 1;
    ctx.fillStyle = TAR;
    ctx.beginPath();
    ctx.ellipse(
      sx + side * w * 1.6 + sway * side,
      sy - h * 0.2 + t * 18 * Z,
      2.5 * Z,
      (3 + t * 2) * Z,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // The body: a dome of tar standing out of the water.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(sx - w, sy);
  ctx.bezierCurveTo(sx - w, sy - h * 1.1, sx + w, sy - h * 1.1, sx + w, sy);
  ctx.closePath();
  ctx.fill();
  // A purple sheen round its edge, so it stands out against the black water.
  ctx.strokeStyle = 'rgba(170,130,230,.45)';
  ctx.lineWidth = 2.5 * Z;
  ctx.stroke();
  // A glossy streak down it.
  ctx.strokeStyle = 'rgba(160,140,200,.25)';
  ctx.lineWidth = 3 * Z;
  ctx.beginPath();
  ctx.moveTo(sx - w * 0.4, sy - h * 0.75);
  ctx.quadraticCurveTo(sx - w * 0.55, sy - h * 0.4, sx - w * 0.45, sy - h * 0.1);
  ctx.stroke();
  // Glowing yellow eyes, which follow the figure once there is one to follow.
  if (rise > 0.15) {
    const glow = 0.7 + 0.3 * Math.sin(T * 3);
    const lx = pose.look ? (pose.look.x - pose.look.y) * 2.4 * Z : 0;
    const ly = pose.look ? (pose.look.x + pose.look.y) * 1.2 * Z : 0;
    for (const e of [-1, 1]) {
      const ex = sx + e * w * 0.32;
      const ey = sy - h * 0.62 - (rise < 0.5 ? 8 * Z : 0);
      ctx.fillStyle = pose.angry
        ? `rgba(255,70,40,${0.4 * glow})`
        : `rgba(255,220,60,${0.35 * glow})`;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 14 * Z, 9 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pose.angry ? `rgba(255,140,90,${glow})` : `rgba(255,236,120,${glow})`;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 7 * Z, 4.5 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
      if (pose.look) {
        ctx.fillStyle = '#2A1606';
        ctx.beginPath();
        ctx.ellipse(ex + lx, ey + ly, 2.2 * Z, 3 * Z, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Where it meets the water, a ring of ripples.
  v.isoEllipse(x, y, 80 + Math.sin(T * 2) * 5);
  ctx.strokeStyle = 'rgba(60,50,60,.6)';
  ctx.lineWidth = 2 * Z;
  ctx.stroke();
}

/** The purple swirl of the summoning, on the water where the monster comes up. */
function drawSwirl(v: DrawView, summon: number): void {
  const { ctx, px, py, T } = v;
  const Z = v.zoom;
  const { x, y } = MONSTER;
  const a = Math.sin(Math.PI * Math.min(1, summon));
  for (let i = 0; i < 4; i++) {
    const r = (20 + i * 14) * Z * (0.4 + summon * 0.8);
    ctx.strokeStyle = `rgba(185,138,255,${0.6 * a - i * 0.1})`;
    ctx.lineWidth = (4 - i * 0.6) * Z;
    ctx.beginPath();
    ctx.ellipse(
      px(x, y),
      py(x, y),
      r,
      r * 0.5,
      0,
      T * (3 - i * 0.5),
      T * (3 - i * 0.5) + Math.PI * 1.3,
    );
    ctx.stroke();
  }
}

/** What stands up on island 4, for the game's depth-sorted solids. */
export function isle4Solids(v: DrawView, look: Isle4Look): Solid[] {
  if (!v.onScreen(ISLE4.x, ISLE4.y, (TAR_R + 160) * v.zoom)) return [];
  const out: Solid[] = [];
  PALMS4.forEach((p, i) => {
    out.push({ d: p[0] + p[1], f: () => drawPalm4(v, p, look.tar, i) });
  });
  for (const p of ROCKS4)
    out.push({
      d: p[0] + p[1],
      f: () =>
        v.box(
          p[0] - 8,
          p[1] - 6,
          16,
          12,
          0,
          9,
          mix('#8E989E', '#2A2526', look.tar),
          mix('#A9B2B7', '#353032', look.tar),
        ),
    });
  if (look.monkey) out.push({ d: SUMMONER.x + SUMMONER.y, f: () => drawSummoner(v, look.summon) });
  if (look.summon > 0 && look.rise < 1)
    out.push({ d: MONSTER.x + MONSTER.y - 1, f: () => drawSwirl(v, look.summon) });
  if (look.rise > 0)
    out.push({
      d: MONSTER.x + MONSTER.y,
      f: () => drawMonster(v, MONSTER.x, MONSTER.y, look.rise),
    });
  return out;
}
