/**
 * The flotilla's craft and who may ride them, the kid's (entities/flotilla.ts): the five craft, the companions with
 * nothing to do at sea, who rides which to start, and reading a saved crew back. One rider to a seat, or nobody, and
 * one seat to a craft, but the swan paddle boat, which is for two (the kid's: "two friends pedal it together"); the
 * kid moves them about in the shop's Boats card.
 */

export type CraftKind = 'airboat' | 'catamaran' | 'windsurf' | 'banana' | 'swan';
export type Rider = 'warrior' | 'bones' | 'necro' | 'tarling' | 'caterman';
/** A seat: each craft has one, and the swan a second, beside the first. */
export type Seat = CraftKind | 'swan2';
export type Crew = Record<Seat, Rider | null>;

/** The craft, in the order they take stations; the airboat first, since it tows the banana. */
export const CRAFTS: readonly CraftKind[] = ['airboat', 'catamaran', 'windsurf', 'banana', 'swan'];
export const SEATS: readonly Seat[] = [...CRAFTS, 'swan2'];
export const RIDERS: readonly Rider[] = ['warrior', 'bones', 'necro', 'tarling', 'caterman'];
/** Who rides which until the kid says otherwise: Caterman pedals the swan, the seat beside him empty. */
export const DEFAULT_CREW: Readonly<Crew> = {
  airboat: 'warrior',
  catamaran: 'necro',
  windsurf: 'bones',
  banana: 'tarling',
  swan: 'caterman',
  swan2: null,
};

/** The craft a seat is on. */
export function craftOfSeat(s: Seat): CraftKind {
  return s === 'swan2' ? 'swan' : s;
}

/** A craft's seats: the swan's two, or the one. */
export function seatsOf(k: CraftKind): Seat[] {
  return k === 'swan' ? ['swan', 'swan2'] : [k];
}

/**
 * A saved crew, read back: unknown riders dropped, a rider on two seats kept on the first; missing, the start. A seat
 * missing from the save (one from before the swan) gets its starting rider, if he is not on another.
 */
export function parseCrew(o: unknown): Crew {
  if (!o || typeof o !== 'object') return { ...DEFAULT_CREW };
  const src = o as Record<string, unknown>;
  const out = {} as Crew;
  const seen = new Set<Rider>();
  const ok = (r: unknown): r is Rider =>
    typeof r === 'string' && (RIDERS as readonly string[]).includes(r) && !seen.has(r as Rider);
  for (const k of SEATS) {
    const r = src[k];
    if (ok(r)) {
      out[k] = r;
      seen.add(r);
    } else out[k] = null;
  }
  for (const k of SEATS) {
    const r = DEFAULT_CREW[k];
    if (!(k in src) && ok(r)) {
      out[k] = r;
      seen.add(r);
    }
  }
  return out;
}
