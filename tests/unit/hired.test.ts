import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { SPEED } from '../../src/data/tuning';
import {
  GIVE_UP,
  HIRED_BACK,
  HIRED_BOATS,
  HIRED_HP,
  HIRED_MAN_HP,
  HIRED_SIGHT,
  HIRED_SPEED,
  HiredBoats,
  PATROL_R,
  RAM_EVERY,
  TWINS,
} from '../../src/entities/hired';
import { AGGRO, MONKEY_HP, Monkeys } from '../../src/entities/monkeys';
import { walkable } from '../../src/entities/walker';
import { CAMP8, CAMP9, ISLE8, ISLE9, LANDING8, TENTS8 } from '../../src/world/isle8';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;

/** The hired boats with the player's boat somewhere, ready to run. */
function sea(x: number, y: number) {
  const h = new HiredBoats(rng(5));
  h.here = true;
  const w = baseWorld({ boat: { x, y, h: 0, v: 0 }, hullScale: 1.6, docked: false });
  return { h, w };
}

describe("the Heron's hired boats", () => {
  it('keep to their ring round the twins and leave a boat outside their water alone', () => {
    const { h, w } = sea(TWINS.x - PATROL_R - 600, TWINS.y);
    for (let i = 0; i < 30 / DT; i++) h.update(DT, w);
    expect(h.boats).toHaveLength(HIRED_BOATS);
    for (const s of h.boats) {
      expect(s.state).toBe('patrol');
      const d = Math.hypot(s.x - TWINS.x, s.y - TWINS.y);
      expect(d).toBeGreaterThan(ISLE8.r + 100);
      expect(d).toBeLessThan(PATROL_R);
      // Never on either twin.
      for (const isle of [ISLE8, ISLE9])
        expect(Math.hypot(s.x - isle.x, s.y - isle.y)).toBeGreaterThan(isle.r);
    }
  });

  it('chase a boat in their water, ram it now and then, and give up when it docks or runs', () => {
    const { h, w } = sea(TWINS.x, TWINS.y);
    let chases = 0;
    let rams = 0;
    h.onChase = () => chases++;
    h.onRam = () => rams++;
    const s = h.boats[0];
    if (!s) throw new Error('no boat');
    // Put the boat just inside one's sight.
    w.boat.x = s.x + HIRED_SIGHT - 40;
    w.boat.y = s.y;
    h.update(DT, w);
    expect(s.state).toBe('chase');
    expect(chases).toBe(1);
    // Sitting still, it is caught and rammed, no faster than every RAM_EVERY.
    for (let i = 0; i < 12 / DT; i++) h.update(DT, w);
    expect(rams).toBeGreaterThan(1);
    expect(rams).toBeLessThanOrEqual(Math.ceil(12 / RAM_EVERY) + HIRED_BOATS);
    // Tied up at a dock, it is left alone.
    w.docked = true;
    h.update(DT, w);
    expect(h.boats.every((b) => b.state === 'patrol')).toBe(true);
    w.docked = false;
    for (let i = 0; i < 2 / DT; i++) h.update(DT, w);
    expect(h.chasing).toBe(true);
    // Out of their water: they turn back.
    w.boat.x = TWINS.x - PATROL_R - GIVE_UP - 50;
    h.update(DT, w);
    expect(h.chasing).toBe(false);
  });

  it('are slower than the flagship, so running gets away', () => {
    expect(HIRED_SPEED).toBeLessThan(SPEED[SPEED.length - 1] ?? 0);
    const { h, w } = sea(TWINS.x - 700, TWINS.y - 200);
    let rams = 0;
    h.onRam = () => rams++;
    for (const s of h.boats) {
      s.x = w.boat.x + 150;
      s.y = w.boat.y;
      s.state = 'chase';
    }
    // Full speed west, away from the twins.
    w.boat.h = Math.PI;
    for (let i = 0; i < 8 / DT; i++) {
      w.boat.x -= 350 * DT;
      h.update(DT, w);
    }
    expect(rams).toBe(0);
    expect(h.chasing).toBe(false);
  });

  it('sink to the harpoon in three hits, pay, and are replaced a while later, away from the boat', () => {
    const { h, w } = sea(TWINS.x - 1000, TWINS.y);
    const s = h.mark(w.boat);
    if (!s) throw new Error('nothing marked');
    expect(h.resolve).toBe(HIRED_HP);
    const sunk: [number, number][] = [];
    h.onSink = (x, y) => sunk.push([x, y]);
    for (let i = 0; i < HIRED_HP - 1; i++) expect(h.harpoon(1, s)).toBe(false);
    expect(h.resolve).toBe(1);
    expect(h.harpoon(1, s)).toBe(true);
    expect(sunk).toHaveLength(1);
    expect(s.state).toBe('sunk');
    // It is no longer a target; the other is.
    expect(h.mark(w.boat)).not.toBe(s);
    for (let i = 0; i < (HIRED_BACK + 1) / DT; i++) h.update(DT, w);
    expect(s.state).not.toBe('sunk');
    expect(s.hp).toBe(HIRED_HP);
    expect(Math.hypot(s.x - w.boat.x, s.y - w.boat.y)).toBeGreaterThan(900);
  });

  it('are nowhere until the Heron has hired them', () => {
    const h = new HiredBoats();
    expect(h.mark({ x: TWINS.x, y: TWINS.y })).toBeNull();
    const f = fakeView();
    expect(h.solids(f.v)).toHaveLength(0);
    h.here = true;
    expect(h.solids(f.v)).toHaveLength(HIRED_BOATS);
    for (const s of h.solids(f.v)) s.f();
    expect(f.calls.ship).toBe(HIRED_BOATS);
    const first = h.boats[0];
    if (first) h.harpoon(HIRED_HP, first);
    h.draw(f.v, 'surface');
    h.draw(f.v, 'mask');
    expect(f.calls.light).toBe(HIRED_BOATS - 1);
  });
});

describe("the Heron's hired men ashore", () => {
  it('camp on both twins on dry land, well away from the landing, round tents that are in the way', () => {
    for (const c of [CAMP8, CAMP9]) expect(walkable(c.x, c.y, 0)).toBe(true);
    expect(Math.hypot(CAMP8.x - LANDING8.x, CAMP8.y - LANDING8.y)).toBeGreaterThan(AGGRO + 100);
    for (const [x, y] of TENTS8) expect(walkable(x, y, 0)).toBe(false);
  });

  it('are tougher than monkeys and look like men', () => {
    expect(HIRED_MAN_HP).toBeGreaterThan(MONKEY_HP);
    const camp = new Monkeys(CAMP8, 5, 2, true, 'hired', HIRED_MAN_HP);
    const m = camp.list[0];
    if (!m) throw new Error('no man');
    for (let i = 0; i < HIRED_MAN_HP - 1; i++) camp.hit(m, 1, CAMP8.x - 50, CAMP8.y);
    expect(m.state).toBe('chase');
    camp.hit(m, 1, CAMP8.x - 50, CAMP8.y);
    expect(m.state).toBe('flee');
    const f = fakeView();
    for (const q of camp.list) camp.drawMonkey(f.v, q, 0);
    expect(f.calls.fill ?? 0).toBeGreaterThan(camp.list.length * 3);
    // They stay on their island as they wander.
    const w = baseWorld({ figure: null });
    for (let i = 0; i < 20 / DT; i++) camp.update(DT, w);
    for (const q of camp.list) if (q.state !== 'gone') expect(walkable(q.x, q.y, 0)).toBe(true);
  });
});
