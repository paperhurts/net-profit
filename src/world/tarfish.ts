/**
 * The tar ocean's fish, the kid's (his tab 17: "tar fish 250 coins and can only be sold at the facility", and his
 * answers in his tab "tar ocean for rowan"): black fish ("black fish"), caught on a rod from the chemistry boat
 * ("spear of fishing rod"), and only the scientist on the bridge buys them ("scientest"). A dozen a day, in four small
 * schools scattered across the tar, a new four each morning, the first never far from the tar dock. Caught, they keep
 * in the chemistry boat's tar bucket until the scientist has them.
 */

import { TAR_BERTH, TAR_SEA } from './tarsea';

/** Coins the scientist pays for each tar fish. */
export const TAR_FISH_PRICE = 250;
export const TAR_SCHOOLS = 4;
export const PER_SCHOOL = 3;
export const TAR_PER_DAY = TAR_SCHOOLS * PER_SCHOOL;
/** How far out from a school's middle its fish swim round. */
export const SCHOOL_R = 46;

/** Schools keep this far inside the tar's edges, this far from the dock and from each other. */
const EDGE_IN = 600;
const DOCK_CLEAR = 1400;
const APART = 2600;
/** The day's first school is no further than this from the dock, so there is always one to find. */
export const NEAR_MAX = 3200;

export interface TarSchool {
  x: number;
  y: number;
}

/** A small seeded random, so a day's schools are where they were after a reload. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inTar(x: number, y: number): boolean {
  return (
    x > TAR_SEA.x0 + EDGE_IN &&
    x < TAR_SEA.x1 - EDGE_IN &&
    y > TAR_SEA.y0 + EDGE_IN &&
    y < TAR_SEA.y1 - EDGE_IN
  );
}

/** Where the day's schools are: the first near the dock, the rest anywhere on the tar, well apart. */
export function tarSchools(day: number): TarSchool[] {
  const r = rng(day * 7919 + 17);
  const out: TarSchool[] = [];
  for (let i = 0; i < TAR_SCHOOLS; i++) {
    let at: TarSchool = { x: TAR_BERTH.x, y: TAR_BERTH.y - DOCK_CLEAR };
    for (let tries = 0; tries < 300; tries++) {
      let x: number;
      let y: number;
      if (i === 0) {
        // North of the dock, out over the tar.
        const a = Math.PI + r() * Math.PI;
        const d = DOCK_CLEAR + r() * (NEAR_MAX - DOCK_CLEAR);
        x = TAR_BERTH.x + Math.cos(a) * d;
        y = TAR_BERTH.y + Math.sin(a) * d;
      } else {
        x = TAR_SEA.x0 + EDGE_IN + r() * (TAR_SEA.x1 - TAR_SEA.x0 - 2 * EDGE_IN);
        y = TAR_SEA.y0 + EDGE_IN + r() * (TAR_SEA.y1 - TAR_SEA.y0 - 2 * EDGE_IN);
      }
      const ok =
        inTar(x, y) &&
        Math.hypot(x - TAR_BERTH.x, y - TAR_BERTH.y) >= DOCK_CLEAR &&
        out.every((s) => Math.hypot(s.x - x, s.y - y) >= APART);
      if (ok) {
        at = { x, y };
        break;
      }
    }
    out.push(at);
  }
  return out;
}

/** What has been taken today, as the save has it: nothing, once the day it was taken on has gone. */
export function takenToday(tarDay: number, tarTaken: number, day: number): number {
  return tarDay === day ? tarTaken : 0;
}

function bit(s: number, k: number): number {
  return 1 << (s * PER_SCHOOL + k);
}

/** Whether fish k of school s has been taken. */
export function isTaken(taken: number, s: number, k: number): boolean {
  return (taken & bit(s, k)) !== 0;
}

/** Fish k of school s taken. */
export function take(taken: number, s: number, k: number): number {
  return taken | bit(s, k);
}

/** How many of a school are left. */
export function leftIn(taken: number, s: number): number {
  let n = 0;
  for (let k = 0; k < PER_SCHOOL; k++) if (!isTaken(taken, s, k)) n++;
  return n;
}

/** How many of the day's dozen are left. */
export function leftToday(taken: number): number {
  let n = 0;
  for (let s = 0; s < TAR_SCHOOLS; s++) n += leftIn(taken, s);
  return n;
}

/** Where fish k of school s is at time T, and which way it swims: round and round its school's middle. */
export function fishAt(
  school: TarSchool,
  s: number,
  k: number,
  T: number,
): { x: number; y: number; a: number } {
  const dir = s % 2 ? 1 : -1;
  const ang = T * 0.45 * dir + (k * Math.PI * 2) / PER_SCHOOL + s;
  const r = SCHOOL_R * (0.8 + 0.2 * Math.sin(T * 0.7 + k));
  return {
    x: school.x + Math.cos(ang) * r,
    y: school.y + Math.sin(ang) * r,
    a: ang + (dir * Math.PI) / 2,
  };
}

/** The nearest fish not yet taken within range of (x, y), at time T. */
export function nearestTarFish(
  schools: readonly TarSchool[],
  taken: number,
  x: number,
  y: number,
  range: number,
  T: number,
): { s: number; k: number; x: number; y: number } | null {
  let best: { s: number; k: number; x: number; y: number } | null = null;
  let bd = range;
  for (let s = 0; s < schools.length; s++) {
    const sc = schools[s];
    if (!sc) continue;
    for (let k = 0; k < PER_SCHOOL; k++) {
      if (isTaken(taken, s, k)) continue;
      const f = fishAt(sc, s, k, T);
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < bd) {
        bd = d;
        best = { s, k, x: f.x, y: f.y };
      }
    }
  }
  return best;
}

/** The nearest school with fish left in it, for the arrow at the screen's edge. */
export function nearestSchool(
  schools: readonly TarSchool[],
  taken: number,
  x: number,
  y: number,
): TarSchool | null {
  let best: TarSchool | null = null;
  let bd = Number.POSITIVE_INFINITY;
  for (let s = 0; s < schools.length; s++) {
    const sc = schools[s];
    if (!sc || !leftIn(taken, s)) continue;
    const d = Math.hypot(sc.x - x, sc.y - y);
    if (d < bd) {
      bd = d;
      best = sc;
    }
  }
  return best;
}

/** What the scientist says, buying a bucket of them: the first time, and after. */
export function scientistBuys(n: number, first: boolean): string {
  const pay = n * TAR_FISH_PRICE;
  const fish = n === 1 ? 'a tar fish' : `${n} tar fish`;
  return first
    ? `The scientist: "Tar fish! Black as the tar itself, and still wriggling! I have wanted these for my research for years. ${TAR_FISH_PRICE} coins each, as promised." You sell ${fish} for ${pay} coins.`
    : `The scientist: "More tar fish! Splendid, splendid." You sell ${fish} for ${pay} coins.`;
}
