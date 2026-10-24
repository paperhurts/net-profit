/**
 * The Endless Isle, island 13, the kid's (2026-10-22, through the owner): past the white buoys, two islands that mirror
 * each other perfectly, pirates on one and ninjas on the other, forever at war (why? the kid: "to stimulate the economy").
 * He called it Doom Island; the owner renamed it the Endless Isle (2026-10-23), after the endless battles between the
 * pirates and the ninjas, and the name Doom Island goes to a separate island he will design next.
 * The ninjas have a snow-peaked mountain with a ski run, the pirates crazy treehouses to climb, and in time the two
 * sides fight battles you join, either side, with badges to earn. The owner took the whole plan as it stood
 * (2026-10-23); this is its first piece, the place: both halves, the channel between with its bridges, sandbar and
 * shallows, the piers, the forts, the bases, the peak and the great tree. It is peaceful for now.
 *
 * It lies in the far far sea's left corner (-x, +y), the one corner still empty. It is laid out in its own frame like
 * Skull Island's: u across the screen (+x -y, toward home), v down it (+x +y). The channel runs along v = 0, the ninjas'
 * half up the screen (v < 0) and the pirates' down it (v > 0), so on a tall phone screen a fight runs up and down it.
 * Everything on a half is laid out once, in a half's own frame (u, w), w being how far from the channel's middle, and
 * the other half is its reflection: the mirror is perfect by construction, and a test checks it.
 */

import { DEEP, FAR, FARFAR, type Point, WS } from './island';

/**
 * The middle of the channel, in the far far sea's left corner, a little in from its middle toward home: its piers face
 * home, and this leaves room to sail round its far side before the sea ends.
 */
export const ENDLESS = {
  x: -(DEEP + FAR) - FARFAR * 0.46,
  y: WS + DEEP + FAR + FARFAR * 0.46,
} as const;

const R2 = Math.SQRT1_2;
/** From the world to the Endless Isle's own frame, and back. */
export function toEndless(x: number, y: number): [number, number] {
  const dx = x - ENDLESS.x;
  const dy = y - ENDLESS.y;
  return [(dx - dy) * R2, (dx + dy) * R2];
}
export function fromEndless(u: number, v: number): Point {
  return [ENDLESS.x + (u + v) * R2, ENDLESS.y + (v - u) * R2];
}

/** The two sides, and which half each holds: the ninjas up the screen, the pirates down it. */
export type Side = 'pirate' | 'ninja';
export const SIDES: readonly Side[] = ['ninja', 'pirate'];
/** The other side. */
export function rival(s: Side): Side {
  return s === 'pirate' ? 'ninja' : 'pirate';
}
/** A point laid out on a half, (u, w), in the island's frame, on this side's half. */
export function onHalf(side: Side, u: number, w: number): [number, number] {
  return [u, side === 'pirate' ? w : -w];
}
/** And in the world. */
export function atHalf(side: Side, u: number, w: number): Point {
  const [hu, hv] = onHalf(side, u, w);
  return fromEndless(hu, hv);
}
/** Whose half a point in the world is on (the channel's middle line counts as the pirates'). */
export function sideAt(x: number, y: number): Side {
  return toEndless(x, y)[1] >= 0 ? 'pirate' : 'ninja';
}

/**
 * A half's land, in its own frame: a broad body along the channel, its corners rounded, and a rounded end away from
 * it where the fort stands. Its shore along the channel is straight, so the bridges and the shallows meet it square.
 */
export const CHANNEL = 130;
export const BODY = { w0: CHANNEL, w1: 720, half: 640, round: 210 } as const;
export const CAP = { w: 640, ru: 560, rw: 400 } as const;

/** Inside a rounded rectangle, w0 to w1 and half wide, its corners rounded. */
function inRounded(
  u: number,
  w: number,
  w0: number,
  w1: number,
  half: number,
  round: number,
): boolean {
  const cu = Math.max(0, Math.abs(u) - (half - round));
  const cw = Math.max(0, Math.max(w0 + round - w, w - (w1 - round)));
  return Math.abs(u) <= half && w >= w0 && w <= w1 && Math.hypot(cu, cw) <= round;
}

/** A half's land in its own frame, ignoring what stands on it. */
function halfRock(u: number, w: number): boolean {
  return (
    inRounded(u, w, BODY.w0, BODY.w1, BODY.half, BODY.round) ||
    (u / CAP.ru) ** 2 + ((w - CAP.w) / CAP.rw) ** 2 <= 1
  );
}

/**
 * A half's shore, as a radius at each angle round its middle, worked out once from its shape: for drawing it, keeping
 * hulls off it and knowing where its land ends. One table serves both halves.
 */
export const HALF_C = { u: 0, w: 560 } as const;
const N = 240;
const SHORE: number[] = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2;
  let lo = 0;
  let hi = 1200;
  for (let s = 0; s < 28; s++) {
    const m = (lo + hi) / 2;
    if (halfRock(HALF_C.u + Math.cos(a) * m, HALF_C.w + Math.sin(a) * m)) lo = m;
    else hi = m;
  }
  SHORE.push(lo);
}
function lerpTable(t: readonly number[], a: number): number {
  const n = t.length;
  const f = ((((a / (Math.PI * 2)) * n) % n) + n) % n;
  const i = Math.floor(f);
  const k = f - i;
  return (t[i] as number) * (1 - k) + (t[(i + 1) % n] as number) * k;
}
/** How far a half's shore is from its middle, at an angle round it in the half's own frame (w away from the channel). */
export function halfShore(a: number): number {
  return lerpTable(SHORE, a);
}
/** The angle round its half's middle, and how far out, of a point in the island's frame. */
function halfPolar(u: number, v: number): [number, number] {
  const w = Math.abs(v);
  return [Math.atan2(w - HALF_C.w, u - HALF_C.u), Math.hypot(u - HALF_C.u, w - HALF_C.w)];
}

/** The channel between the halves, which hulls are kept out of: this far either side of the middle line. */
const BAND = { half: 560, w: CHANNEL + 12 } as const;

/**
 * The whole island's outer edge, both halves and the channel between, as a radius at each angle round the channel's
 * middle: the farthest land along each ray. For keeping hulls off, the shallows round it, sighting it and the map.
 */
const ENV: number[] = [];
for (let i = 0; i < N; i++) {
  const a = (i / N) * Math.PI * 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const solid = (r: number) => {
    const u = c * r;
    const v = s * r;
    return halfRock(u, Math.abs(v)) || (Math.abs(u) <= BAND.half && Math.abs(v) <= BAND.w);
  };
  let r = 1500;
  while (r > 0 && !solid(r)) r -= 8;
  let lo = r;
  let hi = r + 8;
  for (let k = 0; k < 12; k++) {
    const m = (lo + hi) / 2;
    if (solid(m)) lo = m;
    else hi = m;
  }
  ENV.push(lo);
}
/** How far the island's outer edge is from the channel's middle, at an angle round it in the island's frame. */
export function endlessEdge(a: number): number {
  return lerpTable(ENV, a);
}
function polar(x: number, y: number): [number, number] {
  const [u, v] = toEndless(x, y);
  return [Math.atan2(v, u), Math.hypot(u, v)];
}

/** As a round island, for what only needs one: where to clear the sea map's fog, and how big to think of it. */
export const ENDLESS13 = { x: ENDLESS.x, y: ENDLESS.y, r: Math.round(Math.max(...ENV)) } as const;

/** A half's shoreline in the world, n points round: for the sea map. */
export function halfOutline(side: Side, n: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = halfShore(a);
    out.push(atHalf(side, HALF_C.u + Math.cos(a) * r, HALF_C.w + Math.sin(a) * r));
  }
  return out;
}

/** Each half's pier, out toward home off the side of its body, its planks' height, and its dock past the end. */
export const PIER13 = { u0: 600, u1: 880, w: 430, half: 13 } as const;
export const PIER13_Z = 7;
function dockOf(side: Side) {
  const [x, y] = atHalf(side, PIER13.u1 + 72, PIER13.w);
  return { x, y, r: 125 } as const;
}
export const DOCK13 = { pirate: dockOf('pirate'), ninja: dockOf('ninja') } as const;
/** Bow in at a pier's end, for a hull of this scale. */
export function berth13(side: Side, k: number): { x: number; y: number; h: number } {
  const [x, y] = atHalf(side, PIER13.u1 + 6 + 34 * k, PIER13.w);
  return { x, y, h: (3 * Math.PI) / 4 };
}
function landingOf(side: Side) {
  const [x, y] = atHalf(side, PIER13.u1 - 12, PIER13.w);
  return { x, y } as const;
}
/** Where the figure lands, at a pier's end. */
export const LANDING13 = { pirate: landingOf('pirate'), ninja: landingOf('ninja') } as const;
function cratesOf(side: Side) {
  const [x, y] = atHalf(side, PIER13.u0 + 5, PIER13.w + 42);
  return { x, y } as const;
}
/** The crates at a pier's root, where the catch goes. */
export const CRATES13 = { pirate: cratesOf('pirate'), ninja: cratesOf('ninja') } as const;

/**
 * Each side's leader, the pirates' Captain and the ninjas' Master: ashore at the root of the pier, to its channel
 * side, so you walk past him stepping off it; how near to talk to him, and how wide he stands.
 */
export const LEADER13_AT = { u: 560, w: 395 } as const;
export const LEADER13_REACH = 46;
export const LEADER13_R = 8;
function leaderOf(side: Side) {
  const [x, y] = atHalf(side, LEADER13_AT.u, LEADER13_AT.w);
  return { x, y } as const;
}
export const LEADER13 = { pirate: leaderOf('pirate'), ninja: leaderOf('ninja') } as const;
/** The leader within talking reach of a point, if either is. */
export function leaderNear(x: number, y: number): Side | null {
  for (const side of SIDES) {
    const p = LEADER13[side];
    if (Math.hypot(x - p.x, y - p.y) < LEADER13_REACH) return side;
  }
  return null;
}

/** Each side's fort at the far end of its half: a ring of wall with its gate toward the channel, the flag inside. */
export const FORT = { u: 0, w: 860, r: 95, wall: 7, gate: 0.4 } as const;
/** Each side's graveyard, where the beaten will get up again: the pirates' beached ship, the ninjas' shrine. */
export const GRAVE = { u: -360, w: 780, r: 34 } as const;
/** The bases fought over in Hold the Forts: one on each half (the Cannon Battery, the Bell Tower) and the Shipwreck. */
export const BASE = { u: -380, w: 380, r: 48, core: 16 } as const;
/** The Shipwreck's ring, wider than a half's for the wreck lying in its middle. */
export const WRECK_RING = 66;
/**
 * The three, in the island's frame: the pirates' Cannon Battery on their half, the Shipwreck on the sandbar in the
 * middle, the ninjas' Bell Tower on theirs, the two halves' the mirror of each other.
 */
export const HOLDS13: readonly {
  readonly key: 'battery' | 'wreck' | 'bell';
  readonly half: Side | null;
  readonly u: number;
  readonly v: number;
  readonly r: number;
}[] = [
  { key: 'battery', half: 'pirate', u: BASE.u, v: BASE.w, r: BASE.r },
  { key: 'wreck', half: null, u: 0, v: 0, r: WRECK_RING },
  { key: 'bell', half: 'ninja', u: BASE.u, v: -BASE.w, r: BASE.r },
];
/** Each half's landmark, the same ground on each: the ninjas' snow peak, the pirates' great tree. */
export const PEAK = { u: 340, w: 760, r: 110 } as const;
/**
 * The ninjas' chairlift up their peak, the Ninja Slalom's way up: its station at the peak's foot on the channel side,
 * and how near to ride it. The pirates' great tree has its ladder there instead, so this one is not mirrored.
 */
export const LIFT13_AT = { u: PEAK.u, w: PEAK.w - PEAK.r - 26 } as const;
export const LIFT13_REACH = 34;
export const LIFT13 = (() => {
  const [x, y] = atHalf('ninja', LIFT13_AT.u, LIFT13_AT.w);
  return { x, y } as const;
})();
/** Whether a point is at the chairlift's station, near enough to ride it up. */
export function atLift(x: number, y: number): boolean {
  return Math.hypot(x - LIFT13.x, y - LIFT13.y) < LIFT13_REACH;
}
/** The two rope bridges over the channel, the same on both halves by their nature. */
export const BRIDGES13: readonly number[] = [-330, 330];
export const BRIDGE13 = { w: CHANNEL + 45, half: 18, walk: 14, z: 6, ramp: 24 } as const;
/** The sandbar in the middle of the channel, with the wreck on it, and the shallows round it that can be waded. */
export const SANDBAR = { ru: 170, rv: 62 } as const;
export const WRECK = { ru: 46, rv: 16 } as const;
/** They run up under the beach on both sides, so they can be waded into from either shore. */
export const SHALLOWS13 = { ru: 300, rv: CHANNEL + 70 } as const;

/** Trees on each half, the same places on both: palms on the pirates', pines and blossom on the ninjas'. */
export const TREES13: readonly (readonly [number, number])[] = [
  [-520, 300],
  [-470, 560],
  [-500, 690],
  [-200, 560],
  [-120, 980],
  [140, 990],
  [200, 600],
  [480, 300],
  [520, 560],
  [90, 300],
  [-300, 250],
  [450, 640],
  [-250, 900],
  [250, 900],
];
export const TRUNK = 10;

/** Dry land stops this far in from the waterline. */
export const SHORE_IN13 = 14;

/** On a half's pier, and which. */
function pierAt(u: number, v: number): boolean {
  return Math.abs(Math.abs(v) - PIER13.w) <= PIER13.half - 3 && u >= PIER13.u0 && u <= PIER13.u1;
}

/** On a bridge's deck, between its rails. */
function bridgeAt(u: number, v: number, pad = 0): boolean {
  if (Math.abs(v) > BRIDGE13.w) return false;
  return BRIDGES13.some((b) => Math.abs(u - b) <= BRIDGE13.walk + pad);
}

/** On the sandbar, the wreck aside. */
function sandbarAt(u: number, v: number): boolean {
  if ((u / SANDBAR.ru) ** 2 + (v / SANDBAR.rv) ** 2 > 1) return false;
  return (u / (WRECK.ru + 6)) ** 2 + (v / (WRECK.rv + 6)) ** 2 > 1;
}

/** In the shallows round the sandbar, deep enough to wade. */
function wadeAt(u: number, v: number): boolean {
  return (
    (u / SHALLOWS13.ru) ** 2 + (v / SHALLOWS13.rv) ** 2 <= 1 &&
    (u / SANDBAR.ru) ** 2 + (v / SANDBAR.rv) ** 2 > 1
  );
}

/** Whether something on a half stands in the way of a point, in the half's own frame. */
export function blockedHalf(u: number, w: number): boolean {
  // The fort's wall, all but its gate toward the channel, and the flagpole in the middle.
  const fd = Math.hypot(u - FORT.u, w - FORT.w);
  if (Math.abs(fd - FORT.r) <= FORT.wall) {
    const a = Math.atan2(w - FORT.w, u - FORT.u);
    // The gate faces the channel: straight down w, the angle -pi/2 in the half's frame.
    if (Math.abs(a + Math.PI / 2) > FORT.gate) return true;
  }
  if (fd <= 6) return true;
  if (Math.hypot(u - GRAVE.u, w - GRAVE.w) <= GRAVE.r) return true;
  if (Math.hypot(u - BASE.u, w - BASE.w) <= BASE.core) return true;
  if (Math.hypot(u - PEAK.u, w - PEAK.w) <= PEAK.r) return true;
  if (Math.hypot(u - LEADER13_AT.u, w - LEADER13_AT.w) <= LEADER13_R) return true;
  return TREES13.some(([tu, tw]) => Math.hypot(u - tu, w - tw) <= TRUNK);
}

/** A half's own ground underfoot, in the island's frame, ignoring what stands on it. */
function halfGround(u: number, v: number): boolean {
  const [a, d] = halfPolar(u, v);
  return d < halfShore(a) - SHORE_IN13;
}

/** Further out than this from it, nothing needs to know it is there. */
export function nearEndless(x: number, y: number, pad: number): boolean {
  const [a, d] = polar(x, y);
  return d < endlessEdge(a) + 90 + pad;
}

/** Inside its outer edge, give or take pad. */
export function insideEndless(x: number, y: number, pad: number): boolean {
  const [a, d] = polar(x, y);
  return d < endlessEdge(a) + pad;
}

/** The Endless Isle underfoot: either half's ground, a pier, a bridge, the sandbar or the shallows. */
export function onEndless(x: number, y: number): boolean {
  const [u, v] = toEndless(x, y);
  return onEndlessAt(u, v);
}
/**
 * The same, for a point in the island's own frame: what the battles' ways are worked out from, without going through
 * the world and back, whose rounding put a point exactly on a bridge's edge on it on one side and off it on the other.
 */
export function onEndlessAt(u: number, v: number): boolean {
  if (Math.hypot(u, v) >= endlessEdge(Math.atan2(v, u)) + 400) return false;
  if (pierAt(u, v) || bridgeAt(u, v) || sandbarAt(u, v) || wadeAt(u, v)) return true;
  return halfGround(u, v) && !blockedHalf(u, Math.abs(v));
}

/** In the shallows, wading: slower, and in up to the knees. */
export function inEndlessShallows(x: number, y: number): boolean {
  if (!insideEndless(x, y, 0)) return false;
  const [u, v] = toEndless(x, y);
  return wadeAt(u, v) && !bridgeAt(u, v) && !halfGround(u, v);
}
/** The same, in the island's own frame. */
export function inShallowsAt(u: number, v: number): boolean {
  return wadeAt(u, v) && !bridgeAt(u, v) && !halfGround(u, v);
}

/** The height of what is underfoot: a pier's planks, a bridge's deck (ramped up from each shore), or the ground. */
export function groundZ13(x: number, y: number): number {
  const [u, v] = toEndless(x, y);
  if (bridgeAt(u, v)) {
    const fromEnd = BRIDGE13.w - Math.abs(v);
    return BRIDGE13.z * Math.min(1, Math.max(0, fromEnd / BRIDGE13.ramp));
  }
  if (pierAt(u, v) && !halfGround(u, v)) return PIER13_Z;
  return 0;
}

/** Sighted from this far off its edge. */
export const SIGHT13 = 900;

/** Keep a hull off its edge and the channel, wherever it is round it, and off both piers. */
export function pushOffEndless(s: { x: number; y: number; v: number }, pad: number): void {
  const [a, d] = polar(s.x, s.y);
  const r = endlessEdge(a) + pad;
  if (d < r && d > 0) {
    const [x, y] = fromEndless(Math.cos(a) * r, Math.sin(a) * r);
    s.x = x;
    s.y = y;
    s.v *= 0.6;
  }
  const [u, v] = toEndless(s.x, s.y);
  const off = Math.abs(v) - PIER13.w;
  if (u > PIER13.u0 && u < PIER13.u1 + pad * 0.3 && Math.abs(off) < PIER13.half + pad) {
    const [x, y] = fromEndless(
      u,
      Math.sign(v) * (PIER13.w + Math.sign(off || 1) * (PIER13.half + pad)),
    );
    s.x = x;
    s.y = y;
    s.v *= 0.6;
  }
}

/**
 * Sighted the first time, the camera pulls back this long to take in both halves and the mirror between them, then
 * comes back to the boat. It looks at the channel's middle.
 */
export const REVEAL13_T = 6;
export const REVEAL13 = { x: ENDLESS.x, y: ENDLESS.y } as const;
/** How far the camera pulls back for it, as a share of the zoom it was at: both halves on the screen. */
export function revealZoom13(width: number, height: number, zoom: number): number {
  const across = (width - 36) / (2 * BODY.half * zoom);
  const down = (height * 0.72) / ((CAP.w + CAP.rw) * zoom);
  return Math.min(1, Math.max(0.08, Math.min(across, down)));
}
