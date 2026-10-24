/**
 * Eggs, the pet system's (data/petsys.ts), and the Garden Isle's way in to it: the garden's coop sells eggs and calls
 * layEgg; everything after (keeping the egg, hatching, the reveal, the new pet) is the pet system's. The owner's call
 * (2026-10-24): eggs hatch in real time, the app closed or not, so an egg keeps when it was laid and when it is due as
 * timestamps, never a countdown, and whether it has hatched is worked out from them.
 *
 * What hatches is rolled when the egg is laid and kept hidden, so reloading cannot roll it again. A clock that has gone
 * backwards counts as no time passed and never un-hatches anything; one wound forward hatches eggs early, which in a
 * one-player game is not worth fighting. Up to three eggs are kept at once, in a nest crate aboard.
 *
 * What hatches are stand-ins until the kid designs the garden's egg pets (his questions are in his doc's pets tab).
 */

/** How rare an egg is: the coop's three. */
export type EggKind = 'common' | 'rare' | 'mythic';
export const EGG_KINDS: readonly EggKind[] = ['common', 'rare', 'mythic'];

/** How long each takes to hatch, the owner's call: inside an evening. */
export const EGG_HATCH_MS: Readonly<Record<EggKind, number>> = {
  common: 10 * 60_000,
  rare: 60 * 60_000,
  mythic: 4 * 60 * 60_000,
};

/** What can come out of each, all as likely as each other. Stand-ins until the kid's. */
export const EGG_HATCHES: Readonly<Record<EggKind, readonly string[]>> = {
  common: ['bunny', 'frog', 'ladybird'],
  rare: ['hedgehog', 'fox'],
  mythic: ['moth'],
};

/** The most eggs kept at once: the nest crate aboard holds three. */
export const EGG_ROOM = 3;

/** Where an egg came from: the Garden Isle's coop, or a gift (the pet house's, when it opens). */
export type EggFrom = 'garden' | 'gift';

/** One egg: what kind, what will come out (hidden until it does), where from, and when it was laid and is due. */
export type Egg = { k: EggKind; sp: string; from: EggFrom; at: number; due: number };

/** Anything that keeps eggs: the pet system's part of the save. */
export type EggKeeper = { eggs: Egg[] };

/** Free places in the nest crate, 0 to EGG_ROOM. */
export function eggRoom(p: EggKeeper): number {
  return Math.max(0, EGG_ROOM - p.eggs.length);
}

/**
 * An egg laid: the garden's coop calls this once it has taken the coins. None if the crate is full, so the coop
 * checks eggRoom first and says so. `now` is real time in milliseconds; `rng` picks what will hatch.
 */
export function layEgg(
  p: EggKeeper,
  k: EggKind,
  from: EggFrom,
  now = Date.now(),
  rng: () => number = Math.random,
): Egg | null {
  if (eggRoom(p) <= 0 || !EGG_KINDS.includes(k)) return null;
  const pool = EGG_HATCHES[k];
  const sp = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))] ?? pool[0] ?? 'bunny';
  const at = Math.max(0, Math.floor(now));
  const egg: Egg = { k, sp, from, at, due: at + EGG_HATCH_MS[k] };
  p.eggs.push(egg);
  return egg;
}

/** Whether an egg has hatched by now. A clock gone back before it was laid counts as no time passed. */
export function eggDue(e: Egg, now: number): boolean {
  return now >= e.due && now >= e.at;
}

/** How long until it hatches, in milliseconds: 0 once it has. */
export function eggLeft(e: Egg, now: number): number {
  if (eggDue(e, now)) return 0;
  return Math.max(0, e.due - Math.max(now, e.at));
}

/** The eggs in a save, read back: odd ones dropped, three at most, each due no later than its kind allows. */
export function parseEggs(v: unknown): Egg[] {
  if (!Array.isArray(v)) return [];
  const out: Egg[] = [];
  for (const o of v) {
    if (out.length >= EGG_ROOM) break;
    if (!o || typeof o !== 'object') continue;
    const r = o as Record<string, unknown>;
    const k = r.k as EggKind;
    if (!EGG_KINDS.includes(k)) continue;
    const sp = EGG_HATCHES[k].includes(r.sp as string)
      ? (r.sp as string)
      : (EGG_HATCHES[k][0] ?? '');
    const at =
      typeof r.at === 'number' && Number.isFinite(r.at) ? Math.max(0, Math.floor(r.at)) : 0;
    const due0 = typeof r.due === 'number' && Number.isFinite(r.due) ? Math.floor(r.due) : at;
    const due = Math.min(Math.max(due0, at), at + EGG_HATCH_MS[k]);
    out.push({ k, sp, from: r.from === 'gift' ? 'gift' : 'garden', at, due });
  }
  return out;
}
