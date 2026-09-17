/**
 * How upgrades become a boat and the base gates the boat, moved verbatim from
 * the prototype script. See project.md, "Progression".
 */
import { MAXLV, PAINTS, RANGE, TIER_SCALE } from './tuning';

export type Levels = { net: number; hold: number; engine: number };

/** Boat tier 0..5: dinghy to flagship, from the three upgrade levels. */
export function tierOf(lv: Levels): number {
  return Math.min(5, Math.floor((lv.net + lv.hold + lv.engine) / 3));
}

/** Hull scale for a tier. Tiers are always 0..5, so the lookup cannot miss. */
export function hullScale(tier: number): number {
  return TIER_SCALE[tier] as number;
}

/** Sailing range from the island for a tier; the flagship's is effectively unlimited. */
export function rangeOf(tier: number): number {
  return RANGE[tier] as number;
}

/** How many hull paints a tier has unlocked. */
export function paintsUnlocked(tier: number): number {
  return Math.min(PAINTS.length, 2 + Math.ceil(tier * 1.6));
}

/** Highest upgrade level index the palace allows at a build stage. */
export function levelCap(build: number): number {
  return Math.min(MAXLV, 2 + build);
}
