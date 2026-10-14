/**
 * Sunken treasure, the kid's: "a radar upgrade that shows treasure", sold at island 10's store. Treasure lies on the
 * sea floor all over the sea, from home water out to the far deep: a chest, a pouch of gold coins, an anchor with a
 * strongbox lashed to it, a golden goblet. With the treasure finder fitted to the radar, each shows on the scope as a
 * gold blip and as a glint under the water close by; tow the net over one and it snags it. A fresh lot sinks every
 * day (placed from the day, so the same day always has the same treasure), each found once a day.
 *
 * Without the finder there is nothing to snag: a few hundred coins is a fortune to a boat filling sardine orders, so
 * the treasure waits until the finder can show it.
 */

import { rng } from '../core/math';
import { DEEP, FAR, IX, IY, pastBuoys, pastFar, WS } from './island';

export type SunkenKind = 'chest' | 'pouch' | 'anchor' | 'goblet';

/** A treasure on the sea floor: what it is, where, and what it is worth. */
export type Sunk = { kind: SunkenKind; name: string; x: number; y: number; coins: number };

/** What each is called, and what it pays. */
export const SUNKEN: Readonly<Record<SunkenKind, { name: string; coins: number }>> = {
  chest: { name: 'a sunken treasure chest', coins: 400 },
  anchor: { name: 'an old anchor with a strongbox lashed to it', coins: 250 },
  goblet: { name: 'a golden goblet', coins: 200 },
  pouch: { name: 'a pouch of gold coins', coins: 150 },
};
const KINDS: readonly SunkenKind[] = ['chest', 'anchor', 'goblet', 'pouch', 'pouch', 'goblet'];

/** How many lie in home water, out in the deep, and in the far deep, each day. */
export const SUNKEN_HOME = 3;
export const SUNKEN_DEEP = 3;
export const SUNKEN_FAR = 2;
export const SUNKEN_COUNT = SUNKEN_HOME + SUNKEN_DEEP + SUNKEN_FAR;
/** The net snags one this much past the reach of its own half width. */
export const SNAG_REACH = 10;
/** Kept this far in from the edges of the sea, and this far apart. */
const EDGE = 150;
const APART = 400;

/** Which part of the sea a point is in. */
export function seaPart(x: number, y: number): 'home' | 'deep' | 'far' {
  return pastFar(x, y) ? 'far' : pastBuoys(x, y) ? 'deep' : 'home';
}

/**
 * The day's treasure: so many in each part of the sea, each where `clear` says the sea is open (away from islands,
 * docks and the floe), apart from the others. The same day always gives the same.
 */
export function sunkenFor(day: number, clear: (x: number, y: number) => boolean): Sunk[] {
  const R = rng(day * 7919 + 101);
  const out: Sunk[] = [];
  const lo = -DEEP - FAR + EDGE;
  const hi = WS + DEEP + FAR - EDGE;
  const want: [ReturnType<typeof seaPart>, number][] = [
    ['home', SUNKEN_HOME],
    ['deep', SUNKEN_DEEP],
    ['far', SUNKEN_FAR],
  ];
  for (const [part, n] of want) {
    let got = 0;
    for (let tries = 0; got < n && tries < 4000; tries++) {
      // Home water is small; draw its points from it, and the rest from the whole sea.
      const x = part === 'home' ? EDGE + R() * (WS - EDGE * 2) : lo + R() * (hi - lo);
      const y = part === 'home' ? EDGE + R() * (WS - EDGE * 2) : lo + R() * (hi - lo);
      if (seaPart(x, y) !== part) continue;
      if (Math.hypot(x - IX, y - IY) < 420) continue;
      if (!clear(x, y)) continue;
      if (!out.every((s) => Math.hypot(s.x - x, s.y - y) > APART)) continue;
      const kind = KINDS[Math.floor(R() * KINDS.length)] as SunkenKind;
      out.push({ kind, name: SUNKEN[kind].name, x, y, coins: SUNKEN[kind].coins });
      got++;
    }
  }
  return out;
}

/** The treasure finder, on the old man's shelf: it fits the shipwright's radar. */
export const FINDER = {
  name: 'Treasure finder',
  price: 2000,
  blurb:
    'Fits your radar. Sunken treasure shows gold on it; tow your net over it to haul it up. New treasure sinks every day.',
} as const;
