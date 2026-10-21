import { describe, expect, it } from 'vitest';
import {
  SLAP_R,
  TarTentacles,
  TENT_AHEAD,
  TENT_BUBBLE,
  TENT_DMG,
  TENT_EVERY,
  TENT_HP,
  TENT_LIFE,
  TENT_MAX,
  TENT_REACH,
  TENT_SINK,
  TENT_WINDUP,
  type Tentacle,
} from '../../src/entities/tartentacles';
import { drawTentacle, drawTentacleMark, drawTentaclePips } from '../../src/render/tartentacles';
import { CHEM_SPEED } from '../../src/world/tarsea';
import { fakeView } from './helpers/view';

type Boat = { x: number; y: number; h: number; v: number };
const run = (g: TarTentacles, boat: Boat | null, s: number, may = () => true, sail = false) => {
  for (let t = 0; t < s - 1e-9; t += 1 / 60) {
    if (boat && sail) {
      boat.x += Math.cos(boat.h) * boat.v * (1 / 60);
      boat.y += Math.sin(boat.h) * boat.v * (1 / 60);
    }
    g.step(1 / 60, boat, may);
  }
};
/** One up, right where we want it, without waiting for a rising. */
const upAt = (g: TarTentacles, x: number, y: number): Tentacle => {
  const boat = { x: x - TENT_AHEAD, y, h: 0, v: 100 };
  g.on = true;
  run(g, boat, TENT_EVERY);
  const t = g.list[0] as Tentacle;
  t.x = x;
  t.y = y;
  run(g, null, TENT_BUBBLE + 0.1);
  return t;
};

describe('the red tar tentacles', () => {
  it("are the kid's: two hits, and four off the boat's health", () => {
    expect(TENT_HP).toBe(2);
    expect(TENT_DMG).toBe(4);
  });

  it('come up ahead of a boat under way, in its way, a few at most, and never for a boat sitting still', () => {
    const g = new TarTentacles();
    g.on = true;
    const still = { x: 0, y: 0, h: 0, v: 0 };
    run(g, still, TENT_EVERY * 4);
    expect(g.list.length).toBe(0);
    const boat = { x: 0, y: 0, h: 0, v: CHEM_SPEED };
    for (let k = 0; k < TENT_EVERY * 60 && g.list.length === 0; k++) run(g, boat, 1 / 60);
    expect(g.list.length).toBe(1);
    const t = g.list[0] as Tentacle;
    expect(t.state).toBe('bubble');
    // Ahead of where the boat was going, not behind it.
    expect(t.x).toBeGreaterThan(boat.x + TENT_AHEAD * 0.6);
    run(g, boat, TENT_EVERY * 5);
    expect(g.list.length).toBeLessThanOrEqual(TENT_MAX);
    // Not where it may not come up (by the docks), and not at all while off.
    const h = new TarTentacles();
    h.on = true;
    run(h, { x: 0, y: 0, h: 0, v: CHEM_SPEED }, TENT_EVERY * 3, () => false);
    expect(h.list.length).toBe(0);
    const off = new TarTentacles();
    run(off, { x: 0, y: 0, h: 0, v: CHEM_SPEED }, TENT_EVERY * 3);
    expect(off.list.length).toBe(0);
  });

  it('bubbles in a ring first, then rises', () => {
    const g = new TarTentacles();
    let rose = 0;
    g.onRise = () => rose++;
    const t = upAt(g, 500, 0);
    expect(rose).toBe(1);
    expect(TarTentacles.up(t)).toBe(true);
  });

  it('slaps a boat that comes near where it was, four off, and misses a boat that sails out of the ring', () => {
    const g = new TarTentacles();
    const slaps: boolean[] = [];
    g.onSlap = (_t, hit) => slaps.push(hit);
    const t = upAt(g, 500, 0);
    // A boat stopped beside it: wound up, then slapped.
    const boat = { x: 500 + TENT_REACH - 20, y: 0, h: 0, v: 0 };
    run(g, boat, 1 / 60);
    expect(t.state).toBe('windup');
    run(g, boat, TENT_WINDUP);
    expect(slaps).toEqual([true]);
    // Again, and this time the boat sails on through, a third of a second after the ring shows.
    for (let s = 0; s < 4 && t.state !== 'windup'; s += 1 / 60) run(g, boat, 1 / 60);
    expect(t.state).toBe('windup');
    const moving = { ...boat, h: 0, v: CHEM_SPEED * 0.7 };
    run(g, moving, 1 / 3);
    run(g, moving, TENT_WINDUP, () => true, true);
    expect(Math.hypot(moving.x - t.at.x, moving.y - t.at.y)).toBeGreaterThan(SLAP_R);
    expect(slaps).toEqual([true, false]);
  });

  it('sinks for good after two harpoons, and sinks back by itself after a while', () => {
    const g = new TarTentacles();
    let beaten = 0;
    g.onBeaten = () => beaten++;
    const t = upAt(g, 500, 0);
    expect(g.harpoon(t, 1)).toBe(true);
    expect(TarTentacles.up(t)).toBe(true);
    g.harpoon(t, 1);
    expect(t.state).toBe('sink');
    expect(beaten).toBe(1);
    expect(g.harpoon(t, 1)).toBe(false);
    run(g, null, TENT_SINK + 0.1);
    expect(g.list.length).toBe(0);
    // Left alone, it sinks back on its own, not beaten.
    const h = new TarTentacles();
    const u = upAt(h, 500, 0);
    run(h, null, TENT_LIFE + 0.2);
    expect(u.state === 'sink' || u.state === 'gone').toBe(true);
    expect(u.beaten).toBe(false);
  });

  it('on the Battle Barge come quicker, as many as were picked, until each has been harpooned to nothing', () => {
    const g = new TarTentacles(4021, 3);
    g.on = true;
    g.left = 1;
    const boat = { x: 0, y: 0, h: 0, v: CHEM_SPEED };
    // Up within the quicker pace, not the tar ocean's.
    for (let k = 0; k < 3 * 60 && g.list.length === 0; k++) run(g, boat, 1 / 60);
    expect(g.list.length).toBe(1);
    // One picked: never a second while it is up.
    run(g, boat, 6, () => true, true);
    expect(g.list.filter((t) => t.state !== 'gone').length).toBeLessThanOrEqual(1);
    // Harpooned to nothing, none left to come, and no more do.
    const t = g.list.find((x) => TarTentacles.up(x)) ?? (g.list[0] as Tentacle);
    t.state = 'up';
    for (let i = 0; i < TENT_HP; i++) g.harpoon(t, 1);
    expect(g.left).toBe(0);
    run(g, boat, 10, () => true, true);
    expect(g.list.length).toBe(0);
  });

  it('is drawn bubbling, up, rearing, slapping and sinking, its ring only while a slap comes', () => {
    const g = new TarTentacles();
    const t = upAt(g, 500, 0);
    for (const s of ['bubble', 'up', 'windup', 'slap', 'recover', 'sink'] as const) {
      const f = fakeView();
      t.state = s;
      t.t = 0.2;
      drawTentacle(f.v, t);
      drawTentacleMark(f.v, t);
      drawTentaclePips(f.v, t, TENT_HP);
      expect(f.calls.stroke ?? 0).toBeGreaterThan(0);
      const m = fakeView();
      drawTentacleMark(m.v, t);
      expect((m.calls.fill ?? 0) + (m.calls.stroke ?? 0) > 0).toBe(
        s === 'bubble' || s === 'windup' || s === 'slap',
      );
    }
  });
});
