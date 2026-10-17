import { describe, expect, it } from 'vitest';
import { AIR_MAX, ASCEND, Diver, TOP } from '../../src/entities/diver';
import {
  ABYSS,
  ABYSS_ENTRY,
  ABYSS_SHELF_R,
  ABYSS_SIGHT,
  ABYSS_SITE,
  AD,
  AW,
  abyssFloor,
  abyssPlants,
  abyssShoals,
  CAGE_REST,
  FLOOR_ROOM,
  HOLE,
  inAbyssWater,
  METRES,
  overAbyss,
  SHELF_BOT,
  SHELF_TOP,
  WALL_END,
} from '../../src/world/abyss';
import { DEEP, FAR, pastFarFar, WS } from '../../src/world/island';
import { ISLE11 } from '../../src/world/isle11';

const DT = 1 / 60;

/** Ride the cage all the way down; how long it took. */
function rideDown(d: Diver): number {
  let t = 0;
  for (; t < 60; t += DT) if (d.update(DT, 0, 0) === 'floor') break;
  return t;
}

describe('the abyss', () => {
  it('lies out past the white buoys, too far out to be seen from behind them, off island 11, and goes down 1,000 metres', () => {
    expect(pastFarFar(ABYSS.x, ABYSS.y)).toBe(true);
    expect(Math.hypot(ABYSS.x - ISLE11.x, ABYSS.y - ISLE11.y)).toBeGreaterThan(ISLE11.r + 400);
    // Every point within sight of it is out past the white buoys, in the far far sea.
    const sight = ABYSS_SHELF_R + ABYSS_SIGHT;
    expect(-ABYSS.y - (DEEP + FAR)).toBeGreaterThan(sight);
    for (let a = 0; a < Math.PI * 2; a += 0.1)
      expect(pastFarFar(ABYSS.x + Math.cos(a) * sight, ABYSS.y + Math.sin(a) * sight)).toBe(true);
    // And well off where a boat crosses into it on the way to island 11, the far deep's corner.
    expect(Math.hypot(ABYSS.x - (WS + DEEP + FAR), ABYSS.y + DEEP + FAR)).toBeGreaterThan(
      sight + 300,
    );
    expect(Math.round(AD / METRES)).toBe(1000);
    expect(overAbyss(ABYSS.x, ABYSS.y)).toBe(true);
    expect(overAbyss(ABYSS.x + 400, ABYSS.y)).toBe(false);
  });

  it('is small on top: a hole through the shelf barely wider than the cage, opening into the dark below', () => {
    expect(inAbyssWater(ABYSS_ENTRY, (SHELF_TOP + SHELF_BOT) / 2, 12)).toBe(true);
    expect(inAbyssWater(ABYSS_ENTRY + HOLE + 20, (SHELF_TOP + SHELF_BOT) / 2)).toBe(false);
    expect(inAbyssWater(40, SHELF_TOP - 40)).toBe(true);
    expect(inAbyssWater(40, WALL_END + 20)).toBe(true);
    expect(inAbyssWater(AW / 2, abyssFloor(AW / 2) + 5)).toBe(false);
  });

  it('grows coral on the shelf, glows on the floor, and has lanternfish over it for the spear', () => {
    const pl = abyssPlants();
    expect(pl.some((p) => p.y === SHELF_TOP && !p.glow)).toBe(true);
    expect(pl.filter((p) => p.glow && p.y > AD - 100).length).toBeGreaterThan(10);
    for (const p of pl)
      if (p.y === SHELF_TOP) expect(Math.abs(p.x - ABYSS_ENTRY)).toBeGreaterThan(HOLE);
    const near = abyssShoals().filter((s) => s.sp !== undefined);
    expect(near.length).toBeGreaterThan(0);
    for (const s of near) expect(s.cy).toBeGreaterThan(AD - FLOOR_ROOM);
  });
});

describe('the dive cage', () => {
  it('rides the diver down to the floor in a quarter of a minute or so, breathing from the boat all the way', () => {
    const d = new Diver();
    d.reset(AIR_MAX, ABYSS_SITE);
    expect(d.cage?.go).toBe('down');
    expect(d.riding).toBe(true);
    // Pushing the stick does nothing in the cage.
    d.update(DT, 1, 1);
    expect(d.x).toBe(ABYSS_ENTRY);
    const t = rideDown(d);
    expect(t).toBeGreaterThan(10);
    expect(t).toBeLessThan(22);
    expect(d.cage?.go).toBe('wait');
    expect(d.y).toBeCloseTo(CAGE_REST, 3);
    expect(d.air).toBe(AIR_MAX);
    expect(Math.round(d.deepest / METRES)).toBeGreaterThan(970);
  });

  it('lets the diver swim out over the floor, where the air runs, and fills the tank again back in the cage', () => {
    const d = new Diver();
    d.reset(AIR_MAX, ABYSS_SITE);
    rideDown(d);
    for (let t = 0; t < 3; t += DT) d.update(DT, 1, 0);
    expect(d.inCage).toBe(false);
    expect(d.air).toBeLessThan(AIR_MAX - 1);
    // It cannot swim up the dark: the cage is the way home.
    for (let t = 0; t < 10; t += DT) d.update(DT, 0, -1);
    expect(d.y).toBeGreaterThanOrEqual(AD - FLOOR_ROOM - 1e-6);
    const low = d.air;
    // Back to the cage and in.
    for (let t = 0; t < 12 && !d.inCage; t += DT) {
      const c = d.cage as { x: number; y: number };
      const dx = c.x - d.x;
      const dy = c.y - d.y;
      const l = Math.hypot(dx, dy) || 1;
      d.update(DT, dx / l, dy / l);
    }
    expect(d.inCage).toBe(true);
    for (let t = 0; t < 1; t += DT) d.update(DT, 0, 0);
    expect(d.air).toBeGreaterThan(low);
  });

  it('pulls the diver back into the cage when the air runs out, then takes it up to the boat', () => {
    const d = new Diver();
    d.reset(AIR_MAX, ABYSS_SITE);
    rideDown(d);
    for (let t = 0; t < 2; t += DT) d.update(DT, -1, 0);
    d.air = 0.01;
    const evs = new Set<string>();
    for (let t = 0; t < 40; t += DT) {
      const ev = d.update(DT, 0, 0);
      if (ev) evs.add(ev);
      if (ev === 'surfaced') break;
    }
    expect([...evs]).toEqual(['out', 'cage', 'surfaced']);
    expect(d.y).toBeLessThanOrEqual(TOP);
    expect(ASCEND).toBeGreaterThan(0);
  });

  it('turns straight back up if the diver asks on the way down', () => {
    const d = new Diver();
    d.reset(AIR_MAX, ABYSS_SITE);
    for (let t = 0; t < 4; t += DT) d.update(DT, 0, 0);
    const y = d.y;
    expect(y).toBeGreaterThan(200);
    d.surface();
    expect(d.cage?.go).toBe('up');
    let ev = null;
    for (let t = 0; t < 30 && ev !== 'surfaced'; t += DT) ev = d.update(DT, 0, 0);
    expect(ev).toBe('surfaced');
  });

  it('is not there on the other dives', () => {
    const d = new Diver();
    d.reset();
    expect(d.cage).toBeNull();
    expect(d.riding).toBe(false);
  });
});
