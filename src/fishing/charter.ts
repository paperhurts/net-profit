/**
 * Charters, the husband's: take people out on the boat for coins, and bring
 * back no fish. With island 6's charter office built, docked at its pier the
 * shop offers a charter: two or three passengers, each wanting to see one
 * thing, and the creatures are the destinations (the owner's mapping put
 * charters on the big island). The whales, a manta's leap, a sea turtle
 * swimming alongside, a ride with the dolphins, and the Cthuluviathan asleep,
 * from a safe distance. Each sight seen is added to the fare, every wish seen
 * adds a tip, and the fare is paid when the boat ties up at any dock; seeing
 * nothing they wanted, they pay nothing (or a hop out of the dock and back
 * would be a fare every few seconds). A fright
 * halves it, once: a shark charging close, or the boat being hurt. Being
 * swallowed ends the charter, unpaid: the passengers go home. Nothing is lost
 * but the fare.
 */

export type SightId = 'whales' | 'manta' | 'turtle' | 'dolphins' | 'cthulu';

export type Sight = {
  /** What the passengers call it, and what the shop says they want. */
  name: string;
  wish: string;
  /** What it adds to the fare. */
  fare: number;
};

export const SIGHTS: Readonly<Record<SightId, Sight>> = {
  whales: { name: 'the whales', wish: 'see the whales', fare: 300 },
  manta: { name: 'a manta leap', wish: 'see a manta leap', fare: 400 },
  turtle: { name: 'a sea turtle', wish: 'swim with a sea turtle', fare: 250 },
  dolphins: { name: 'the dolphins', wish: 'ride with the dolphins', fare: 250 },
  cthulu: {
    name: 'the Cthuluviathan asleep',
    wish: 'see the Cthuluviathan asleep, from a safe distance',
    fare: 500,
  },
};
export const SIGHT_IDS = Object.keys(SIGHTS) as SightId[];

/** What a charter pays for the trip once they have seen something; and the tip on top when every wish is seen. */
export const BASE_FARE = 100;
export const TIP = 0.5;

/** The passengers' shirts and hats, so each has their own look. */
export const SHIRTS = ['#E4572E', '#3DA5D9', '#F2C14E', '#8F6BD1', '#4FB477'] as const;

export type Charter = {
  /** What each passenger wants to see: one each. */
  wants: SightId[];
  /** What has been seen of it. */
  seen: SightId[];
  /** Each passenger's shirt, out of SHIRTS. */
  shirts: number[];
  /** They have had a fright: the fare is halved. */
  scared: boolean;
  /** The boat has left the dock with them: the next dock is the end of the trip. */
  left: boolean;
};

/** A new charter: two or three passengers, each wanting a different sight. */
export function newCharter(rnd: () => number): Charter {
  const n = rnd() < 0.5 ? 2 : 3;
  const pool = [...SIGHT_IDS];
  const wants: SightId[] = [];
  while (wants.length < n)
    wants.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0] as SightId);
  const shirts = wants.map(() => Math.floor(rnd() * SHIRTS.length));
  return { wants, seen: [], shirts, scared: false, left: false };
}

/** Something was seen: true the first time it is one the passengers wanted. */
export function see(c: Charter, id: SightId): boolean {
  if (!c.wants.includes(id) || c.seen.includes(id)) return false;
  c.seen.push(id);
  return true;
}

/** Everything they wanted has been seen. */
export function allSeen(c: Charter): boolean {
  return c.wants.every((w) => c.seen.includes(w));
}

/** What they pay at the dock: nothing if they saw nothing, else the trip, each sight seen, a tip if all were, halved after a fright; to the 5. */
export function fare(c: Charter): number {
  if (!c.seen.length) return 0;
  let f = BASE_FARE + c.seen.reduce((s, id) => s + SIGHTS[id].fare, 0);
  if (allSeen(c)) f *= 1 + TIP;
  if (c.scared) f /= 2;
  return Math.round(f / 5) * 5;
}

/** The wishes as the shop says them: "see the whales, see a manta leap and swim with a sea turtle". */
export function wishList(c: Charter): string {
  const w = c.wants.map((id) => SIGHTS[id].wish);
  return w.length < 2 ? (w[0] ?? '') : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`;
}

/** A charter from a save, or null: anything odd reads as no charter aboard. */
export function parseCharter(o: unknown): Charter | null {
  if (!o || typeof o !== 'object') return null;
  const r = o as Record<string, unknown>;
  const ids = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is SightId => SIGHT_IDS.includes(x as SightId)) : [];
  const wants = [...new Set(ids(r.wants))].slice(0, 3);
  if (wants.length < 1) return null;
  const seen = [...new Set(ids(r.seen))].filter((id) => wants.includes(id));
  const sh = Array.isArray(r.shirts) ? r.shirts : [];
  const shirts = wants.map((_, i) => {
    const v = sh[i];
    return typeof v === 'number' && v >= 0 && v < SHIRTS.length ? Math.floor(v) : i % SHIRTS.length;
  });
  return { wants, seen, shirts, scared: !!r.scared, left: !!r.left };
}
