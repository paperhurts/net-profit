/**
 * Junk, and the muffin man's fish muffins (the owner's, 2026-10-13: junk, not sardines; a muffin gives back a heart).
 * Every so often the net brings up junk with the fish: an old boot, a tin can, a clump of seaweed, a soggy sock. It
 * goes in a bucket on deck, not the hold, and the dock will not buy it; the muffin man will. Tap him with junk aboard
 * and he takes it, a piece for each muffin, and bakes it into fish muffins, deeply questionable, a box of six at most.
 * Eaten, a fish muffin gives back a heart: a snack for the middle of a fight, since hearts come back on their own
 * once it is over. Each muffin keeps the time it was baked, for what happens to one left uneaten.
 */

export type JunkKind = 'boot' | 'can' | 'weed' | 'sock';
export const JUNK_KINDS: readonly JunkKind[] = ['boot', 'can', 'weed', 'sock'];
/** What each is called when it comes up. */
export const JUNK_NAMES: Readonly<Record<JunkKind, string>> = {
  boot: 'An old boot!',
  can: 'A tin can!',
  weed: 'Seaweed!',
  sock: 'A soggy sock!',
};
/** The chance each fish the net takes brings a piece of junk up with it. */
export const JUNK_CHANCE = 0.05;
/** The bucket holds this much; past it, junk goes back over the side. */
export const JUNK_MAX = 12;
/** The muffin box holds a half dozen. */
export const MUFFIN_BOX = 6;

/** Whether a fish the net takes brings junk with it, and which: none once the bucket is full. */
export function junkWith(rng: () => number, carried: number): JunkKind | null {
  if (carried >= JUNK_MAX || rng() >= JUNK_CHANCE) return null;
  return JUNK_KINDS[Math.floor(rng() * JUNK_KINDS.length)] ?? 'boot';
}

/** How much junk the muffin man takes: a piece for each muffin there is room for in the box. */
export function bakeable(junk: number, muffins: number): number {
  return Math.max(0, Math.min(junk, MUFFIN_BOX - muffins));
}

/** A saved box of muffins, read back: the times they were baked, in game days, at most a box; missing, none. */
export function parseMuffins(o: unknown): number[] {
  if (!Array.isArray(o)) return [];
  return o
    .filter((t): t is number => typeof t === 'number' && Number.isFinite(t) && t >= 0)
    .slice(0, MUFFIN_BOX);
}
