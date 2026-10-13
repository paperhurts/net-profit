/**
 * The flotilla's craft and who may ride them, the kid's (entities/flotilla.ts): the four craft, the four companions
 * with nothing to do at sea, who rides which to start, and reading a saved crew back. One rider to a craft, or
 * nobody; the kid moves them about in the shop's Boats card.
 */

export type CraftKind = 'airboat' | 'catamaran' | 'windsurf' | 'banana';
export type Rider = 'warrior' | 'bones' | 'necro' | 'tarling';
export type Crew = Record<CraftKind, Rider | null>;

/** The craft, in the order they take stations; the airboat first, since it tows the banana. */
export const CRAFTS: readonly CraftKind[] = ['airboat', 'catamaran', 'windsurf', 'banana'];
export const RIDERS: readonly Rider[] = ['warrior', 'bones', 'necro', 'tarling'];
/** Who rides which until the kid says otherwise. */
export const DEFAULT_CREW: Readonly<Crew> = {
  airboat: 'warrior',
  catamaran: 'necro',
  windsurf: 'bones',
  banana: 'tarling',
};

/** A saved crew, read back: unknown riders dropped, a rider on two craft kept on the first; missing, the start. */
export function parseCrew(o: unknown): Crew {
  if (!o || typeof o !== 'object') return { ...DEFAULT_CREW };
  const src = o as Record<string, unknown>;
  const out = {} as Crew;
  const seen = new Set<Rider>();
  for (const k of CRAFTS) {
    const r = src[k];
    if (
      typeof r === 'string' &&
      (RIDERS as readonly string[]).includes(r) &&
      !seen.has(r as Rider)
    ) {
      out[k] = r as Rider;
      seen.add(r as Rider);
    } else out[k] = null;
  }
  return out;
}
