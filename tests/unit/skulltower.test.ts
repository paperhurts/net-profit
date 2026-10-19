import { describe, expect, it } from 'vitest';
import { BONE_WAKE, BoneMen } from '../../src/entities/bonemen';
import { DisplacerBeasts } from '../../src/entities/displacers';
import { walkable } from '../../src/entities/walker';
import { drawSkrillDoor, drawSkullRoom } from '../../src/render/skulltower';
import { SKULL_HOLD, skullBeastsAt, skullFloor, skullMenAt } from '../../src/world/skulltower';
import { entry, ROOMS, type Room, roomAt, SKULL_FLOORS, stairs } from '../../src/world/tower';
import { fakeView } from './helpers/view';

describe("Skrill's tower", () => {
  it("has four floors of black stone, each its own room, bigger than the other towers' floors", () => {
    expect(SKULL_FLOORS).toHaveLength(4);
    for (const [k, i] of SKULL_FLOORS.entries()) {
      const R = ROOMS[i] as Room;
      expect(R.kind).toBe('skull');
      expect(R.roof).toBe(false);
      expect(R.r).toBeGreaterThan((ROOMS[0] as Room).r);
      expect(skullFloor(i)).toBe(k);
      expect(roomAt(R.x, R.y)).toBe(i);
    }
    expect(skullFloor(0)).toBe(-1);
  });

  it("is held on every floor by Skrill's men and his displacer beasts, beasts on every one", () => {
    expect(SKULL_HOLD).toHaveLength(SKULL_FLOORS.length);
    for (const h of SKULL_HOLD) expect(h.beasts.length).toBeGreaterThan(0);
    expect(SKULL_HOLD.some((h) => h.men.length === 0)).toBe(true);
    expect(SKULL_HOLD.reduce((n, h) => n + h.men.length + h.beasts.length, 0)).toBeGreaterThan(12);
  });

  it('puts each of them on its floor, the beasts prowling inside the walls, the men back by the stairs', () => {
    for (const [k, i] of SKULL_FLOORS.entries()) {
      const R = ROOMS[i] as Room;
      const e = entry(i);
      const st = stairs(i);
      for (const [x, y] of skullBeastsAt(k))
        for (let a = 0; a < Math.PI * 2; a += 0.5)
          expect(walkable(x + Math.cos(a) * 46, y + Math.sin(a) * 46, 0)).toBe(true);
      for (const [x, y] of skullMenAt(k)) {
        expect(walkable(x, y, 0)).toBe(true);
        expect(Math.hypot(x - st.x, y - st.y)).toBeLessThan(Math.hypot(x - e.x, y - e.y));
        // Not on the figure as it comes in: a step or two to take in the room first.
        expect(Math.hypot(x - e.x, y - e.y)).toBeGreaterThan(BONE_WAKE - 40);
      }
      for (const [x, y] of [...skullMenAt(k), ...skullBeastsAt(k)])
        expect(Math.hypot(x - R.x, y - R.y)).toBeLessThan(R.r - 40);
    }
  });

  it('makes a lot of them for each floor, the second floor all beasts', () => {
    const men = SKULL_FLOORS.map((_, k) => new BoneMen(skullMenAt(k)));
    const beasts = SKULL_FLOORS.map((_, k) => new DisplacerBeasts(skullBeastsAt(k)));
    expect(men[1]?.list).toHaveLength(0);
    expect(beasts[3]?.list).toHaveLength(3);
  });

  it("draws its carved skull and its bones, and Skrill's shut door", () => {
    const f = fakeView();
    drawSkullRoom(f.v, ROOMS[SKULL_FLOORS[0] as number] as Room);
    expect(f.calls.fill ?? 0).toBeGreaterThan(3);
    expect(f.calls.stroke ?? 0).toBeGreaterThan(3);
    const g = fakeView();
    const st = stairs(SKULL_FLOORS[3] as number);
    drawSkrillDoor(g.v, st.x, st.y);
    expect(g.calls.fill ?? 0).toBeGreaterThan(5);
  });
});
