/**
 * Skull Island, island 12, the kid's (his sixth list: Skull Island, Skrill's island, its men in skeleton armour, the
 * displacer beasts, Skrill's tower with the orb, five monkeys and a portal; his answers in his tab "skull island for
 * rowan": "at bottom of white buyes", "Shaped like skull its SUPER SUPER DUPER GINORMAS", reached "both" by sailing to
 * its dock and by something taking you there). The owner: shape it like a skull, about twice island 11 across.
 *
 * It lies in the far far sea's bottom corner (+x, +y), out where the white buoys meet at the bottom of the map, a whole
 * island of bone-white rock in the shape of a giant skull looking up out of the sea at you: its great round cranium at
 * the top of the screen with Skrill's tower on its crown, two deep black eye sockets and the hole of its nose, a row of
 * huge teeth across its face, and its jaw below them at the bottom of the screen, a pier out off its chin where the boat
 * ties up. It is laid out in its own frame: u across the screen (+x -y), v down it (+x +y), from the middle of the
 * cranium.
 */

import { DEEP, FAR, FARFAR, type Point, WS } from './island';

/** The middle of the cranium, in the far far sea's bottom corner. */
export const SKULL = {
  x: WS + DEEP + FAR + FARFAR * 0.35,
  y: WS + DEEP + FAR + FARFAR * 0.35,
} as const;

const R2 = Math.SQRT1_2;
/** From the world to the skull's own frame, and back. */
export function toSkull(x: number, y: number): [number, number] {
  const dx = x - SKULL.x;
  const dy = y - SKULL.y;
  return [(dx - dy) * R2, (dx + dy) * R2];
}
export function fromSkull(u: number, v: number): Point {
  return [SKULL.x + (u + v) * R2, SKULL.y + (v - u) * R2];
}

/**
 * Its parts, in its own frame: the cranium, the face under it, the jaw under that. The view halves what runs down the
 * screen, so what should look round on it is twice as long in v as it is wide in u.
 */
export const CRANIUM = { ru: 950, rv: 800 } as const;
export const FACE = { v0: 280, v1: 950, half: 695, round: 225 } as const;
export const JAW = { v0: 980, v1: 1370, half: 540, round: 245 } as const;
/** The eye sockets and the nose: deep black holes in the face, no way down them. */
export const EYES: readonly { u: number; v: number; ru: number; rv: number }[] = [
  { u: -360, v: 330, ru: 195, rv: 290 },
  { u: 360, v: 330, ru: 195, rv: 290 },
];
export const NOSE = { v0: 660, v1: 860, half: 100 } as const;
/**
 * The teeth: a row of huge ones across the face, and the jaw's under them. Its front teeth are gone from both rows, a
 * gap-toothed grin, and the gap is the way up from the pier to the face.
 */
export const TEETH: readonly { u: number; v: number; w: number; lower: boolean }[] = [
  ...[-350, -260, -170, -80, 80, 170, 260, 350].map((u) => ({ u, v: 920, w: 70, lower: false })),
  ...[-260, -170, -80, 80, 170, 260].map((u) => ({ u, v: 1000, w: 65, lower: true })),
];
/** The pier out off its chin, its half width, its planks' height, and where the boat ties up past its end. */
export const PIER12 = { v0: JAW.v1 - 70, v1: JAW.v1 + 190, half: 13 } as const;
export const PIER12_Z = 7;
const [DX, DY] = fromSkull(0, PIER12.v1 + 72);
export const DOCK12 = { x: DX, y: DY, r: 125 } as const;
/** Bow in at the pier's end, for a hull of this scale. */
export function berth12(k: number): { x: number; y: number; h: number } {
  const [x, y] = fromSkull(0, PIER12.v1 + 6 + 34 * k);
  return { x, y, h: (-3 * Math.PI) / 4 };
}
const [LX, LY] = fromSkull(0, PIER12.v1 - 12);
/** Where the figure lands, at the pier's end. */
export const LANDING12 = { x: LX, y: LY } as const;
const [CX, CY] = fromSkull(-40, PIER12.v0 + 10);
/** The crates the hold is sold into, by the pier's root. */
export const CRATES12 = { x: CX, y: CY } as const;
/** Skrill's tower, on the crown of the cranium; its door toward the viewer. */
export const TOWER12 = { u: 0, v: -480, r: 70, h: 260 } as const;
const [TX, TY] = fromSkull(TOWER12.u, TOWER12.v + TOWER12.r + 18);
export const TOWER12_DOOR = { x: TX, y: TY } as const;

/** Inside a rounded rectangle across the frame, v0 to v1 and half wide, its corners rounded. */
function inRounded(
  u: number,
  v: number,
  v0: number,
  v1: number,
  half: number,
  round: number,
): boolean {
  const cu = Math.max(0, Math.abs(u) - (half - round));
  const cv = Math.max(0, Math.max(v0 + round - v, v - (v1 - round)));
  return Math.abs(u) <= half && v >= v0 && v <= v1 && Math.hypot(cu, cv) <= round;
}

/** The skull's rock in its own frame, holes and all: the cranium, the face and the jaw. */
function solidRock(u: number, v: number): boolean {
  return (
    (u / CRANIUM.ru) ** 2 + (v / CRANIUM.rv) ** 2 <= 1 ||
    inRounded(u, v, FACE.v0, FACE.v1 + 80, FACE.half, FACE.round) ||
    inRounded(u, v, JAW.v0 - 40, JAW.v1, JAW.half, JAW.round)
  );
}

/** In an eye socket or the nose, give or take pad. */
export function inHole12(u: number, v: number, pad = 0): boolean {
  for (const e of EYES)
    if (((u - e.u) / (e.ru + pad)) ** 2 + ((v - e.v) / (e.rv + pad)) ** 2 <= 1) return true;
  // The nose: an upside-down heart of a hole, as a triangle point down.
  if (v >= NOSE.v0 - pad && v <= NOSE.v1 + pad) {
    const k = (v - NOSE.v0) / (NOSE.v1 - NOSE.v0);
    if (Math.abs(u) <= NOSE.half * (1 - k * 0.85) + pad) return true;
  }
  return false;
}

/** On one of its teeth, give or take pad. */
export function onTooth12(u: number, v: number, pad = 0): boolean {
  return TEETH.some((t) => Math.abs(u - t.u) <= t.w / 2 + pad && Math.abs(v - t.v) <= 24 + pad);
}

/**
 * The shore, as a radius at each angle round the middle of the face (where it can be seen whole from), worked out once
 * from its shape: for drawing it, keeping boats off it, and knowing where its rock ends.
 */
export const SHORE_C = { u: 0, v: 335 } as const;
const N = 240;
const SHORE: number[] = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2;
  let lo = 0;
  let hi = 1800;
  for (let s = 0; s < 28; s++) {
    const m = (lo + hi) / 2;
    if (solidRock(SHORE_C.u + Math.cos(a) * m, SHORE_C.v + Math.sin(a) * m)) lo = m;
    else hi = m;
  }
  SHORE.push(lo);
}
/** How far its shore is from the middle of the face, at an angle round it in its own frame. */
export function shoreR12(a: number): number {
  const t = ((((a / (Math.PI * 2)) * N) % N) + N) % N;
  const i = Math.floor(t);
  const k = t - i;
  return (SHORE[i] as number) * (1 - k) + (SHORE[(i + 1) % N] as number) * k;
}
/** The angle round the middle of its face, and how far out, of a point in the world. */
export function polar12(x: number, y: number): [number, number] {
  const [u, v] = toSkull(x, y);
  return [Math.atan2(v - SHORE_C.v, u - SHORE_C.u), Math.hypot(u - SHORE_C.u, v - SHORE_C.v)];
}

const [MX, MY] = fromSkull(SHORE_C.u, SHORE_C.v);
/** As a round island, for what only needs one: where to clear the sea map's fog, and how big to think of it. */
export const ISLE12 = { x: MX, y: MY, r: Math.round(Math.max(...SHORE)) } as const;

/** Its shoreline in the world, n points round, and its eye sockets and nose as round pits: for the sea map. */
export function isle12Outline(n: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = shoreR12(a);
    out.push(fromSkull(SHORE_C.u + Math.cos(a) * r, SHORE_C.v + Math.sin(a) * r));
  }
  return out;
}
export const PITS12: readonly { x: number; y: number; r: number }[] = [
  ...EYES.map((e) => {
    const [x, y] = fromSkull(e.u, e.v);
    return { x, y, r: (e.ru + e.rv) / 2 };
  }),
  (() => {
    const [x, y] = fromSkull(0, (NOSE.v0 + NOSE.v1) / 2);
    return { x, y, r: NOSE.half * 0.8 };
  })(),
];

/**
 * Sighted the first time, the camera pulls back this long to take in the whole skull, then comes back to the boat:
 * close up, from the boat, only a stretch of its shore ever shows. It looks at the middle of the skull, tower and all.
 */
export const REVEAL12_T = 5.5;
const [RX, RY] = fromSkull(0, 300);
export const REVEAL12 = { x: RX, y: RY } as const;
/** How far the camera pulls back for it, as a share of the zoom it was at: the skull's width across the screen. */
export function revealZoom12(width: number, zoom: number): number {
  return Math.min(1, Math.max(0.08, (width - 36) / (2 * CRANIUM.ru * zoom)));
}

/** Dry land stops this far in from the waterline. */
export const SHORE_IN12 = 14;

/** On the pier off its chin. */
export function onPier12(x: number, y: number): boolean {
  const [u, v] = toSkull(x, y);
  return Math.abs(u) <= PIER12.half - 3 && v >= PIER12.v0 && v <= PIER12.v1;
}

/** Its rock underfoot, not down a hole, on a tooth or into the tower. */
export function onIsle12Ground(x: number, y: number): boolean {
  const [a, d] = polar12(x, y);
  if (d >= shoreR12(a) - SHORE_IN12) return false;
  const [u, v] = toSkull(x, y);
  if (inHole12(u, v, 6) || onTooth12(u, v, 6)) return false;
  return Math.hypot(u - TOWER12.u, v - TOWER12.v) > TOWER12.r + 8;
}

/** Skull Island underfoot: its rock or its pier. */
export function onIsle12(x: number, y: number): boolean {
  return onIsle12Ground(x, y) || onPier12(x, y);
}

/** The height of what is underfoot: the pier's planks, or the rock. */
export function groundZ12(x: number, y: number): number {
  return onPier12(x, y) && !onIsle12Ground(x, y) ? PIER12_Z : 0;
}

/** Sighted from this far off its shore. */
export const SIGHT12 = 900;

/** Further out than this from it, nothing needs to know it is there. */
export function nearIsle12(x: number, y: number, pad: number): boolean {
  const [a, d] = polar12(x, y);
  return d < shoreR12(a) + 90 + pad;
}

/** Keep a hull off its shore, wherever it is round it, and off the pier. */
export function pushOffIsle12(s: { x: number; y: number; v: number }, pad: number): void {
  const [a, d] = polar12(s.x, s.y);
  const r = shoreR12(a) + pad;
  if (d < r && d > 0) {
    const [x, y] = fromSkull(SHORE_C.u + Math.cos(a) * r, SHORE_C.v + Math.sin(a) * r);
    s.x = x;
    s.y = y;
    s.v *= 0.6;
  }
  const [u, v] = toSkull(s.x, s.y);
  if (v > PIER12.v0 && v < PIER12.v1 + pad * 0.3 && Math.abs(u) < PIER12.half + pad) {
    const [x, y] = fromSkull(Math.sign(u || 1) * (PIER12.half + pad), v);
    s.x = x;
    s.y = y;
    s.v *= 0.6;
  }
}

/** Inside its shore, give or take pad. */
export function insideIsle12(x: number, y: number, pad: number): boolean {
  const [a, d] = polar12(x, y);
  return d < shoreR12(a) + pad;
}

/** Close by the rim of an eye socket. */
export function nearEye12(x: number, y: number): boolean {
  const [u, v] = toSkull(x, y);
  return EYES.some((e) => ((u - e.u) / (e.ru + 45)) ** 2 + ((v - e.v) / (e.rv + 45)) ** 2 <= 1);
}

/** Up at Skrill's tower's door. */
export function atTower12(x: number, y: number): boolean {
  return Math.hypot(x - TOWER12_DOOR.x, y - TOWER12_DOOR.y) < 30;
}
