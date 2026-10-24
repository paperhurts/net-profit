/**
 * The Treehouse Climb, the Endless Isle's other mini-game, part eight of the owner's plan (2026-10-23: "All your
 * picks"): in at the foot of the pirates' great tree, and it turns side-on, one tall screen a stage, the way Donkey Kong
 * is (the kid's: gorillas roll the barrels down the treehouses). Here: the stages, what is where on them, and what a
 * climb gives. One stage so far, the Barrel Planks; the Rope Swings, the Bucket Lifts and the Crow's Nest come with part
 * nine.
 *
 * A stage is laid out in its own frame: x across (0 to its width), y up from the bottom (0 to its height), in units a
 * little bigger than a pixel on a phone.
 */

/** A plank: from its left end to its right, at these heights; a sloped one rolls a barrel downhill. */
export type Plank = {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
};
/** A rope ladder: where across, and the plank at its foot (it goes up to the next). */
export type Ladder = { readonly x: number; readonly lo: number };
export type Stage = {
  readonly name: string;
  readonly w: number;
  readonly h: number;
  /** Bottom to top; the last is the ledge with the door at the top. */
  readonly planks: readonly Plank[];
  readonly ladders: readonly Ladder[];
  /** Belaying pins, each floating over a plank. */
  readonly pins: readonly { readonly x: number; readonly plank: number }[];
  /** Where you start, and where the gorilla stands rolling its barrels down. */
  readonly start: { readonly x: number; readonly plank: number };
  readonly gorilla: { readonly x: number; readonly plank: number };
  /** The door to the next stage, on the top ledge. */
  readonly door: number;
  /** The gap between barrels, seconds, at least and at most. */
  readonly rollMin: number;
  readonly rollMax: number;
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

/** A plank's height at x along it. */
export function plankY(p: Plank, x: number): number {
  return p.y0 + ((x - p.x0) / (p.x1 - p.x0)) * (p.y1 - p.y0);
}

/** Coins for each barrel jumped, each smashed with a belaying pin, and for getting to the top. */
export const JUMP_COINS = 5;
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
  const out: Climbs = {
    climbs: Math.min(CLIMBS_MAX, was.climbs + 1),
    top: was.top,
    best: { ...was.best },
  };
  if (time === null) return out;
  const t = Math.round(time * 10) / 10;
  const old = was.best[stage];
  out.best[stage] = old === undefined ? t : Math.min(old, t);
  out.top = Math.max(was.top, stage);
  return out;
}
