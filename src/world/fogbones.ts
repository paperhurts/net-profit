/**
 * The fog sea's skeletons (Tomb Island, part eight): the bones of every leviathan, one of each, each roaming its own
 * stretch of the fog sea round Tomb Island and fighting just as the living one does at home, drawn in old bone
 * (render/bone.ts). The kid's "skeleton versions of every leviathan". The skull leviathan, his new one, is its own piece.
 *
 * Each has a spot well out from the island and its fog, clear of both fog walls and of the others. It wakes when a boat
 * comes within BONE_NOTICE of it, which is further than the fog lets you see (SIGHT_SEA): you hear it before you see it.
 * It chases no further than BONE_LEASH from its spot, and gives up there. Beaten, it falls to pieces, and is back,
 * whole, the next time the boat comes in through the fog wall. The first time each is beaten pays BONE_COINS (saved).
 *
 * Where they lie, how near they wake and what they pay are my picks, hers to change.
 */
import type { SeaFoe } from '../data/barge';
import { FOG_EXIT, FOG_IN, FOG_MID, FOG_SEA, inFogSea } from './fogsea';
import { FOG16, TOMB_ISLE } from './tombisle';

/** How near a boat wakes one, and how far from its spot it chases before it gives up. */
export const BONE_NOTICE = 420;
export const BONE_LEASH = 720;
/** Its own water: a ring this big round its spot, which the ones that keep to a ring keep to. */
export const BONE_RING = 420;
/** How far out from the island's middle they lie. */
export const BONE_OUT = 1700;
/** Coins, the first time each is beaten. */
export const BONE_COINS = 150;

/** In turn round the island, from the north: the kid's eight, every leviathan there is. */
export const BONE_KINDS: readonly SeaFoe[] = [
  'guard',
  'reaper',
  'gulper',
  'meteor',
  'cthulu',
  'angler',
  'king',
  'deep',
];

export type BoneSpot = { k: SeaFoe; x: number; y: number };

/**
 * Where each lies: round the island at BONE_OUT, spread evenly but for the east, where the fog wall out is, which is
 * left open water so a boat can always run for it.
 */
export const BONE_SPOTS: readonly BoneSpot[] = BONE_KINDS.map((k, i) => {
  // From a little past east round to a little before it, the long way: the east (the wall out) is kept clear.
  const a0 = 0.62;
  const a = a0 + (i / (BONE_KINDS.length - 1)) * (Math.PI * 2 - 2 * a0);
  return { k, x: FOG_MID.x + Math.cos(a) * BONE_OUT, y: FOG_MID.y + Math.sin(a) * BONE_OUT };
});

/** The ring of water a skeleton keeps to round its spot. */
export const boneRing = (s: BoneSpot) => ({ x: s.x, y: s.y, r: BONE_RING });

/** Held inside its ring, inside the fog sea and off the island and its fog. */
export function keepBone(s: BoneSpot, p: { x: number; y: number }, pad = 40): void {
  const dx = p.x - s.x;
  const dy = p.y - s.y;
  const d = Math.hypot(dx, dy);
  const max = BONE_RING - pad;
  if (d > max) {
    p.x = s.x + (dx / d) * max;
    p.y = s.y + (dy / d) * max;
  }
  p.x = Math.max(FOG_SEA.x0 + pad, Math.min(FOG_SEA.x1 - pad, p.x));
  p.y = Math.max(FOG_SEA.y0 + pad, Math.min(FOG_SEA.y1 - pad, p.y));
  const ix = p.x - TOMB_ISLE.x;
  const iy = p.y - TOMB_ISLE.y;
  const id = Math.hypot(ix, iy);
  const near = TOMB_ISLE.r + FOG16 * 0.5;
  if (id < near && id > 0) {
    p.x = TOMB_ISLE.x + (ix / id) * near;
    p.y = TOMB_ISLE.y + (iy / id) * near;
  }
}

/** Whether every spot sits as it should: in the fog sea with its ring, clear of the island and the walls. */
export function spotsClear(): boolean {
  return BONE_SPOTS.every(
    (s) =>
      inFogSea(s.x, s.y, BONE_RING) &&
      Math.hypot(s.x - TOMB_ISLE.x, s.y - TOMB_ISLE.y) > TOMB_ISLE.r + FOG16 * 0.5 + BONE_RING &&
      Math.hypot(s.x - FOG_EXIT.x, s.y - FOG_EXIT.y) > BONE_RING + BONE_NOTICE &&
      Math.hypot(s.x - FOG_IN.x, s.y - FOG_IN.y) > BONE_RING + BONE_NOTICE,
  );
}
