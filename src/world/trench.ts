/**
 * The trench, the kid's "THE DEEP biome": "scuba diving and spear fishing,
 * bioluminescent fish and plants". A crack in the sea floor out in the deep, on
 * its north side between island 3 and the mahi-mahi, where the water goes
 * black-blue and bubbles come up. With the scuba gear from island 3's tower, a
 * boat stopped over it can dive: the view turns side on, the diver swims down
 * from under the hull, and the light goes as it goes deeper: sunlit water with
 * kelp and silver fish, then twilight with drifting jellies, then midnight,
 * where nothing shows but what glows. The owner's choices: side on, one trench
 * worth sailing to, and nothing dangerous yet (when the air runs out the diver
 * floats back up, no harm done).
 *
 * The dive scene has its own coordinates: x across the trench, y down from the
 * surface. Everything in it is laid out here from one seed, so every dive is
 * the same place.
 */

import { rng } from '../core/math';

/** Where it is in the sea, and how near the boat must be stopped to dive. */
export const TRENCH = { x: 1250, y: -620, r: 150 } as const;
/** How near the boat must come to see it and be told what it is. */
export const TRENCH_SIGHT = 650;

/** The dive scene: its width, and the depth of its floor. */
export const TW = 760;
export const TD = 1500;
/** Where sunlit water gives way to twilight, and twilight to midnight. */
export const SUNLIT = 360;
export const TWILIGHT = 820;
/** The diver goes in from under the boat, here across the scene. */
export const ENTRY = TW / 2;

/** The zone at a depth, for the light and what lives there. */
export type Zone = 'sunlit' | 'twilight' | 'midnight';
export function zoneAt(y: number): Zone {
  return y < SUNLIT ? 'sunlit' : y < TWILIGHT ? 'twilight' : 'midnight';
}

/**
 * The trench's walls: how far in from the scene's edges the rock comes at a depth. Wide open at the top,
 * narrowing as it goes down, with ledges; the same both sides but not mirrored.
 */
export function wallIn(y: number, side: -1 | 1): number {
  const k = Math.max(0, Math.min(1, y / TD));
  const base = 50 + k * k * 240;
  const ledge = Math.sin(y * 0.011 + (side > 0 ? 1.7 : 0)) * 26 + Math.sin(y * 0.031 + side) * 12;
  return base + ledge;
}

/** The floor's height off TD across the trench: a bumpy bottom. */
export function floorAt(x: number): number {
  return TD - 30 - Math.sin(x * 0.013) * 18 - Math.sin(x * 0.037 + 1) * 9;
}

/** Inside the water of the trench, with this much room round a body. */
export function inWater(x: number, y: number, pad = 0): boolean {
  if (y < pad || y > floorAt(x) - pad) return false;
  return x > wallIn(y, -1) + pad && x < TW - wallIn(y, 1) - pad;
}

/** Keep a point in the water: pushed off the walls, the floor and out of the sky. */
export function keepInWater(p: { x: number; y: number }, pad: number): void {
  // Twice round: off a wall can put it over a lower bit of floor, and off the floor by a different bit of wall.
  for (let i = 0; i < 2; i++) {
    p.y = Math.max(pad * 0.5, Math.min(floorAt(p.x) - pad, p.y));
    const l = wallIn(p.y, -1) + pad;
    const r = TW - wallIn(p.y, 1) - pad;
    p.x = Math.max(l, Math.min(r, p.x));
  }
}

export type PlantKind = 'kelp' | 'fan' | 'tube' | 'anemone' | 'pen' | 'strand';
/** A plant on a wall or the floor: where its foot is, which way it grows, how tall, its hue and sway. */
export type Plant = {
  kind: PlantKind;
  x: number;
  y: number;
  /** Which way it grows: up off the floor, or out from a wall (-1 left wall, 1 right wall). */
  from: 'floor' | -1 | 1;
  h: number;
  c: string;
  glow: boolean;
  ph: number;
};

/** The glowing ones' colours: cyan, magenta, green and violet, as the deep sea's are. */
export const GLOWS = ['#5FF3FF', '#FF6BD6', '#7CFF8A', '#B98AFF'] as const;

/** Every plant in the trench, from one seed: kelp up top, sea fans in the twilight, and glowing things below. */
export function trenchPlants(seed = 31): Plant[] {
  const r = rng(seed);
  const out: Plant[] = [];
  const onWall = (y: number, side: -1 | 1) => (side < 0 ? wallIn(y, -1) : TW - wallIn(y, 1));
  // Up the walls, every so often, what grows at that depth.
  for (let y = 60; y < TD - 80; y += 34 + r() * 30) {
    const side: -1 | 1 = r() < 0.5 ? -1 : 1;
    const zone = zoneAt(y);
    const kind: PlantKind =
      zone === 'sunlit'
        ? 'kelp'
        : zone === 'twilight'
          ? r() < 0.7
            ? 'fan'
            : 'strand'
          : ((['tube', 'anemone', 'strand', 'pen'] as const)[Math.floor(r() * 4)] as PlantKind);
    const glow = zone === 'midnight' || (zone === 'twilight' && kind === 'strand');
    out.push({
      kind,
      x: onWall(y, side),
      y,
      from: side,
      h: kind === 'kelp' ? 60 + r() * 70 : 18 + r() * 26,
      c: glow
        ? (GLOWS[Math.floor(r() * GLOWS.length)] as string)
        : kind === 'kelp'
          ? '#3E9E5C'
          : '#C46A7E',
      glow,
      ph: r() * 6,
    });
  }
  // Across the floor, a glowing garden.
  for (let x = wallIn(TD - 40, -1) + 20; x < TW - wallIn(TD - 40, 1) - 20; x += 22 + r() * 26) {
    const kind = (['tube', 'anemone', 'pen', 'tube'] as const)[Math.floor(r() * 4)] as PlantKind;
    out.push({
      kind,
      x,
      y: floorAt(x),
      from: 'floor',
      h: 16 + r() * 30,
      c: GLOWS[Math.floor(r() * GLOWS.length)] as string,
      glow: true,
      ph: r() * 6,
    });
  }
  return out;
}

export type DiveFishKind = 'silver' | 'jelly' | 'lantern' | 'squid';
/** A shoal in the trench: what kind, how many, where it ranges, and how big each is. */
export type Shoal = {
  kind: DiveFishKind;
  n: number;
  /** The middle of where it goes, and how far either way, across and down. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  size: number;
  c: string;
  glow: boolean;
  /** Its own phase and pace round its range. */
  ph: number;
  pace: number;
};

/** What swims in the trench: silver fish in the sunlit water, jellies in the twilight, lanternfish and glowing squid below. */
export function trenchShoals(): Shoal[] {
  return [
    {
      kind: 'silver',
      n: 14,
      cx: TW * 0.42,
      cy: 170,
      rx: 200,
      ry: 90,
      size: 7,
      c: '#CFE3EA',
      glow: false,
      ph: 0,
      pace: 0.11,
    },
    {
      kind: 'silver',
      n: 10,
      cx: TW * 0.6,
      cy: 290,
      rx: 160,
      ry: 60,
      size: 6,
      c: '#E6D27A',
      glow: false,
      ph: 2,
      pace: 0.14,
    },
    {
      kind: 'jelly',
      n: 6,
      cx: TW * 0.5,
      cy: 590,
      rx: 190,
      ry: 150,
      size: 11,
      c: '#FF9ED8',
      glow: true,
      ph: 1,
      pace: 0.05,
    },
    {
      kind: 'lantern',
      n: 12,
      cx: TW * 0.45,
      cy: 1000,
      rx: 150,
      ry: 110,
      size: 6,
      c: '#5FF3FF',
      glow: true,
      ph: 3,
      pace: 0.09,
    },
    {
      kind: 'squid',
      n: 3,
      cx: TW * 0.5,
      cy: 1260,
      rx: 90,
      ry: 90,
      size: 13,
      c: '#B98AFF',
      glow: true,
      ph: 4,
      pace: 0.07,
    },
  ];
}

/** Where a shoal's middle is at time T: round its range on a slow loop. */
export function shoalAt(s: Shoal, T: number): { x: number; y: number } {
  const a = s.ph + T * s.pace;
  return { x: s.cx + Math.sin(a) * s.rx, y: s.cy + Math.sin(a * 1.7 + 1) * s.ry };
}
