import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import { CATCH_UP, FISH_EVERY, FISH_REACH, WarlockBoat } from '../../src/entities/warlockboat';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
const at = (over: Partial<World> = {}) =>
  baseWorld({ hullScale: 1.6, boat: { x: 1000, y: 1000, h: 0, v: 0 }, ...over });

describe("the warlock's boat", () => {
  it('is not on the water until he is free, and comes alongside only once the figure is aboard', () => {
    const b = new WarlockBoat();
    let came = 0;
    b.onArrive = () => came++;
    const w = at({ figure: { x: 0, y: 0, vx: 0, vy: 0 } as World['figure'] });
    b.update(DT, w);
    expect(came).toBe(0);
    b.free = true;
    b.update(DT, w);
    expect(came).toBe(0);
    w.figure = null;
    b.update(DT, w);
    expect(came).toBe(1);
    const st = b.station(w.boat, 1.6);
    expect(Math.hypot(b.x - st.x, b.y - st.y)).toBeLessThan(1);
  });

  it('keeps station off your boat as you sail, and holds off when you tie up', () => {
    const b = new WarlockBoat();
    b.free = true;
    const w = at();
    b.update(DT, w);
    let worst = 0;
    for (let i = 0; i < 20 / DT; i++) {
      // A boat sailing a slow curve at a good speed.
      w.boat.h += 0.15 * DT;
      w.boat.v = 220;
      w.boat.x += Math.cos(w.boat.h) * w.boat.v * DT;
      w.boat.y += Math.sin(w.boat.h) * w.boat.v * DT;
      b.update(DT, w);
      const st = b.station(w.boat, 1.6);
      if (i > 3 / DT) worst = Math.max(worst, Math.hypot(b.x - st.x, b.y - st.y));
    }
    expect(worst).toBeLessThan(90);
    w.boat.v = 0;
    w.docked = true;
    for (let i = 0; i < 6 / DT; i++) b.update(DT, w);
    expect(Math.abs(b.v)).toBeLessThan(60);
  });

  it('catches up at once when you are far away, as after being spat out at home', () => {
    const b = new WarlockBoat();
    b.free = true;
    const w = at();
    b.update(DT, w);
    w.boat.x += CATCH_UP * 2;
    b.update(DT, w);
    const st = b.station(w.boat, 1.6);
    expect(Math.hypot(b.x - st.x, b.y - st.y)).toBeLessThan(1);
  });

  it('nets a fish for you every so often while he is aboard and you are at sea, and not otherwise', () => {
    const b = new WarlockBoat();
    b.free = true;
    const w = at();
    b.update(DT, w);
    let caught = 0;
    b.findFish = (x, y, reach) => {
      expect(reach).toBe(FISH_REACH);
      return { x: x + 50, y };
    };
    b.onFish = () => caught++;
    for (let i = 0; i < (FISH_EVERY * 3 + 0.2) / DT; i++) b.update(DT, w);
    expect(caught).toBe(3);
    expect(b.catches).toBe(3);
    // Ashore with the figure, he does not fish.
    b.crewed = false;
    for (let i = 0; i < (FISH_EVERY * 2) / DT; i++) b.update(DT, w);
    expect(caught).toBe(3);
    // Nor while the figure is ashore.
    b.crewed = true;
    w.figure = { x: 0, y: 0, vx: 0, vy: 0 } as World['figure'];
    for (let i = 0; i < (FISH_EVERY * 2) / DT; i++) b.update(DT, w);
    expect(caught).toBe(3);
  });

  it('draws his ship and him on it, and the flash to a fish', () => {
    const b = new WarlockBoat();
    const shapes: unknown[] = [];
    const v = fakeView();
    v.v.ship = (s) => shapes.push(s);
    b.draw(v.v, 'solids');
    expect(shapes).toHaveLength(0);
    b.free = true;
    b.update(DT, at());
    b.draw(v.v, 'solids');
    expect(shapes).toHaveLength(1);
    expect(v.calls.fill ?? 0).toBeGreaterThan(5);
    b.zap = { x: b.x + 40, y: b.y, t: 0.2 };
    const air = fakeView();
    b.draw(air.v, 'air');
    expect(air.calls.stroke ?? 0).toBeGreaterThan(0);
  });
});
