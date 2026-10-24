/**
 * The Treehouse Climb, the Endless Isle's other mini-game, part eight of the owner's plan (2026-10-23: "All your
 * picks"): in at the foot of the pirates' great tree, and it turns side-on, one tall screen a stage, the way Donkey Kong
 * is (the kid's: gorillas roll the barrels down the treehouses). Here: the stages, what is where on them, and what a
 * climb gives. The Barrel Planks (part eight), the Rope Swings and the Bucket Lifts (part nine's first two); the Crow's
 * Nest comes after. Each stage's door at the top goes on up to the next.
 *
 * A stage is laid out in its own frame: x across (0 to its width), y up from the bottom (0 to its height), in units a
 * little bigger than a pixel on a phone.
 */

/**
 * A plank: from its left end to its right, at these heights; a sloped one rolls a barrel downhill. One with a sag is a
 * rope bridge, slats on ropes: it hangs this far below the line between its ends, and dips further where you stand.
 */
export type Plank = {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly sag?: number;
  /** A drawbridge: up on its hinge (its left end or its right) until this lever is pulled, then let down across. */
  readonly lever?: number;
  readonly hinge?: 'left' | 'right';
};
/**
 * A pulley lift up a column of the tree at x, from y0 to y1: buckets on a rope going round, going up (or down) at
 * speed, gap apart. Stand in one to ride it; at the end of its run it goes over the wheel, and you are tipped off.
 */
export type Lift = {
  readonly x: number;
  readonly y0: number;
  readonly y1: number;
  readonly up: boolean;
  readonly speed: number;
  readonly gap: number;
};
/** A lever on a plank, pulled by walking into it: it lets down the drawbridge with its number. */
export type Lever = { readonly x: number; readonly plank: number };
/** A swinging rope, tied to a branch at (x, y): this long, swinging this far either way (radians), once a period. */
export type Rope = {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly amp: number;
  readonly period: number;
  readonly phase: number;
};
/** A rope ladder: where across, and the plank at its foot (it goes up to the next). */
export type Ladder = { readonly x: number; readonly lo: number };
export type Stage = {
  readonly name: string;
  /** How it goes, a few short lines on the card before a first climb of it. */
  readonly howTo: readonly string[];
  readonly w: number;
  readonly h: number;
  /** Bottom to top; the last is the ledge with the door at the top. */
  readonly planks: readonly Plank[];
  readonly ladders: readonly Ladder[];
  /** Belaying pins, each floating over a plank. */
  readonly pins: readonly { readonly x: number; readonly plank: number }[];
  /** Where you start. */
  readonly start: { readonly x: number; readonly plank: number };
  /** The door to the next stage, on the top ledge. */
  readonly door: number;
  /** The gorilla at the top rolling its barrels down, and the gap between barrels, seconds, at least and at most. */
  readonly gorilla?: { readonly x: number; readonly plank: number };
  readonly rollMin?: number;
  readonly rollMax?: number;
  readonly ropes?: readonly Rope[];
  /** Bunches of coconuts, each hanging at (x, y), one dropping every so often (seconds, at least and at most). */
  readonly nuts?: readonly { readonly x: number; readonly y: number }[];
  readonly nutMin?: number;
  readonly nutMax?: number;
  readonly lifts?: readonly Lift[];
  readonly levers?: readonly Lever[];
};

/**
 * The Barrel Planks: six planks up the trunk, each sloping the other way to the one below, so a barrel zigzags down,
 * dropping off each one's low end onto the next, and rolls away out of the tree at the bottom. The rope ladders up are
 * at alternate ends, as Donkey Kong's are, so the way up walks the length of each plank into the barrels rolling at
 * you; two planks have a second ladder halfway along, a short cut the barrels take too. One up from the gorilla's to the
 * ledge with the door. A belaying pin low down and one high up, floating a jump up, so taking one is a choice.
 */
export const BARREL_PLANKS: Stage = {
  name: 'Barrel Planks',
  howTo: [
    'Arrows walk you, and climb ladders',
    'Jump the barrels for coins',
    'Jump up for a pin, and smash them!',
    'Get to the door at the top',
  ],
  w: 240,
  h: 420,
  planks: [
    { x0: 0, x1: 240, y0: 10, y1: 18 },
    { x0: 0, x1: 214, y0: 78, y1: 70 },
    { x0: 26, x1: 240, y0: 134, y1: 142 },
    { x0: 0, x1: 214, y0: 206, y1: 198 },
    { x0: 26, x1: 240, y0: 262, y1: 270 },
    { x0: 0, x1: 214, y0: 334, y1: 326 },
    { x0: 96, x1: 156, y0: 392, y1: 392 },
  ],
  ladders: [
    { x: 196, lo: 0 },
    { x: 40, lo: 1 },
    { x: 198, lo: 2 },
    { x: 118, lo: 2 },
    { x: 42, lo: 3 },
    { x: 196, lo: 4 },
    { x: 100, lo: 4 },
    { x: 130, lo: 5 },
  ],
  pins: [
    { x: 118, plank: 1 },
    { x: 160, plank: 4 },
  ],
  start: { x: 24, plank: 0 },
  gorilla: { x: 30, plank: 5 },
  door: 126,
  rollMin: 2.4,
  rollMax: 3.6,
};

/**
 * The Rope Swings: up from the ground to a platform on one side of a gap, a rope swinging over the gap to the other,
 * a rope bridge across the tree with coconuts dropping on it, then the same again higher up, the gap wider and its rope
 * longer, the bridge saggier, and a ladder to the ledge with the door. A fall is only down to the level below.
 */
export const ROPE_SWINGS: Stage = {
  name: 'Rope Swings',
  howTo: [
    'Jump at a rope to grab it',
    'Up and down slide you on it',
    'Jump again to let go',
    'Watch for falling coconuts!',
  ],
  w: 240,
  h: 420,
  planks: [
    { x0: 0, x1: 240, y0: 10, y1: 10 },
    { x0: 140, x1: 240, y0: 80, y1: 80 },
    { x0: 0, x1: 95, y0: 80, y1: 80 },
    { x0: 10, x1: 230, y0: 150, y1: 150, sag: 6 },
    { x0: 150, x1: 240, y0: 220, y1: 220 },
    { x0: 0, x1: 82, y0: 220, y1: 220 },
    { x0: 10, x1: 230, y0: 290, y1: 290, sag: 9 },
    { x0: 120, x1: 230, y0: 360, y1: 360 },
  ],
  ladders: [
    { x: 210, lo: 0 },
    { x: 30, lo: 2 },
    { x: 215, lo: 3 },
    { x: 24, lo: 5 },
    { x: 216, lo: 6 },
  ],
  pins: [],
  ropes: [
    { x: 118, y: 148, len: 52, amp: 0.62, period: 2.6, phase: 0 },
    { x: 110, y: 292, len: 64, amp: 0.74, period: 3, phase: 1.3 },
  ],
  nuts: [
    { x: 45, y: 212 },
    { x: 110, y: 284 },
    { x: 178, y: 212 },
    { x: 62, y: 396 },
    { x: 150, y: 352 },
    { x: 196, y: 352 },
  ],
  nutMin: 2.6,
  nutMax: 4.6,
  start: { x: 20, plank: 0 },
  door: 190,
};

/**
 * The Bucket Lifts, the puzzle: a lift up the trunk's left side and one down its right, and two levers, each letting
 * down a drawbridge. Up the left lift to a ledge, its lever lets down the bridge to the ladder on up to the next; that
 * one's lever lets down the bridge at the very top. Then down the right lift, up the left one all the way, and over.
 */
export const BUCKET_LIFTS: Stage = {
  name: 'Bucket Lifts',
  howTo: [
    'Stand in a bucket to ride it',
    'Step off where you want to get off',
    'Walk into a lever to pull it',
    'Each one lets a bridge down',
  ],
  w: 240,
  h: 420,
  planks: [
    { x0: 0, x1: 240, y0: 10, y1: 10 },
    { x0: 50, x1: 104, y0: 120, y1: 120 },
    { x0: 104, x1: 164, y0: 120, y1: 120, lever: 0, hinge: 'left' },
    { x0: 164, x1: 188, y0: 120, y1: 120 },
    { x0: 120, x1: 188, y0: 200, y1: 200 },
    { x0: 50, x1: 100, y0: 290, y1: 290 },
    { x0: 100, x1: 150, y0: 290, y1: 290, lever: 1, hinge: 'left' },
    { x0: 150, x1: 190, y0: 290, y1: 290 },
  ],
  ladders: [{ x: 176, lo: 3 }],
  pins: [],
  lifts: [
    { x: 36, y0: 10, y1: 312, up: true, speed: 22, gap: 72 },
    { x: 204, y0: 10, y1: 300, up: false, speed: 22, gap: 72 },
  ],
  levers: [
    { x: 94, plank: 1 },
    { x: 130, plank: 4 },
  ],
  nuts: [
    { x: 76, y: 282 },
    { x: 150, y: 192 },
    { x: 160, y: 282 },
  ],
  nutMin: 3,
  nutMax: 5.5,
  start: { x: 120, plank: 0 },
  door: 170,
};

/** The stages, bottom to top of the tree. */
export const STAGES_UP: readonly Stage[] = [BARREL_PLANKS, ROPE_SWINGS, BUCKET_LIFTS];

/** A bucket's rim width, and how long a drawbridge takes to come down. */
export const BUCKET_W = 24;
export const LOWER_T = 1.2;

/** How much deeper a rope bridge dips where you stand on it than it hangs at rest, once your weight is on it. */
export const BRIDGE_DIP = 1.2;

/** A plank's height at x along it, at rest: a rope bridge hanging in its curve. */
export function plankY(p: Plank, x: number): number {
  const t = (x - p.x0) / (p.x1 - p.x0);
  return p.y0 + t * (p.y1 - p.y0) - (p.sag ? p.sag * Math.sin(Math.PI * clamp01(t)) : 0);
}
/**
 * A rope bridge's height at x with someone standing at at, their weight on it as far as dip (0 just landed, 1 all of
 * it): straight from each end down to them, as a weighted rope hangs, deepest in the middle and hardly at all by an end.
 * Any other plank is as at rest.
 */
export function loadedY(p: Plank, x: number, at: number, dip: number): number {
  if (!p.sag) return plankY(p, x);
  const line = (u: number) => p.y0 + u * (p.y1 - p.y0);
  const ta = clamp01((at - p.x0) / (p.x1 - p.x0));
  const ya = line(ta) - p.sag * (1 + BRIDGE_DIP * dip) * Math.sin(Math.PI * ta);
  const t = clamp01((x - p.x0) / (p.x1 - p.x0));
  if (t <= ta) return ta <= 0 ? line(t) : line(0) + (t / ta) * (ya - line(0));
  return ta >= 1 ? line(t) : ya + ((t - ta) / (1 - ta)) * (line(1) - ya);
}
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Coins for each barrel jumped, each smashed with a belaying pin, each rope swung on, each lever pulled, and for
 * getting to the top. */
export const JUMP_COINS = 5;
export const ROPE_COINS = 5;
export const LEVER_COINS = 10;
export const SMASH_COINS = 10;
export const TOP_COINS = 100;
/** Tries a stage: a barrel costs one, and with none left the stage starts again from the bottom. */
export const TRIES = 3;

/** The climbs made, the highest stage got to the top of, and each stage's best time, in seconds. */
export type Climbs = { climbs: number; top: number; best: Partial<Record<number, number>> };
const CLIMBS_MAX = 99999;
const STAGES = 4;
const TIME_MAX = 3600;
/** A save's climbs, anything that is not a count or a time read as none; undefined when there has been no climb. */
export function parseClimbs(v: unknown): Climbs | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const n = Math.floor(Number(o.climbs));
  const climbs = Number.isFinite(n) ? Math.max(0, Math.min(CLIMBS_MAX, n)) : 0;
  if (!climbs) return undefined;
  const t = Math.floor(Number(o.top));
  const top = Number.isFinite(t) ? Math.max(0, Math.min(STAGES, t)) : 0;
  const best: Partial<Record<number, number>> = {};
  const b = o.best && typeof o.best === 'object' ? (o.best as Record<string, unknown>) : {};
  for (let s = 1; s <= STAGES; s++) {
    const x = Number(b[s]);
    if (Number.isFinite(x) && x > 0 && x < TIME_MAX) best[s] = Math.round(x * 10) / 10;
  }
  return { climbs, top, best };
}
/** A climb made: one more, and if it got to the top of a stage, that stage's time, and the highest stage so far. */
export function climbed(c: Climbs | undefined, stage: number, time: number | null): Climbs {
  const was = c ?? { climbs: 0, top: 0, best: {} };
  const out = timed(was, stage, time);
  return { ...out, climbs: Math.min(CLIMBS_MAX, was.climbs + 1) };
}
/** A stage got to the top of on the way up, in this time (or not, null): its best kept, and the highest stage so far,
 * the climbs as they were. */
export function timed(c: Climbs | undefined, stage: number, time: number | null): Climbs {
  const was = c ?? { climbs: 0, top: 0, best: {} };
  const out: Climbs = { climbs: was.climbs, top: was.top, best: { ...was.best } };
  if (time === null) return out;
  const t = Math.round(time * 10) / 10;
  const old = was.best[stage];
  out.best[stage] = old === undefined ? t : Math.min(old, t);
  out.top = Math.max(was.top, stage);
  return out;
}
