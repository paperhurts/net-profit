import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import { FORGOTTEN_HP, Forgotten, KNEEL } from '../../src/entities/forgotten';
import { walkable } from '../../src/entities/walker';
import {
  CASTLE_SPAWNS,
  COLUMNS,
  CRYPT_FORGOTTEN,
  POOL,
  SKULL_DOOR,
  SKULL_REACH,
} from '../../src/world/gigantis';
import { PORTAL11, PORTAL11_FRONT } from '../../src/world/isle11';
import { CRYPT, entry, ROOMS, type Room, RUINS, roomAt } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
const crypt = ROOMS[CRYPT] as Room;
const ruins = ROOMS[RUINS] as Room;

describe("island 11's old portal, and the way through the Old One's ruins", () => {
  it('is walked into from just in front of it, on the plaza, clear of the portal itself', () => {
    expect(walkable(PORTAL11_FRONT.x, PORTAL11_FRONT.y, 0)).toBe(true);
    expect(walkable(PORTAL11.x, PORTAL11.y, 0)).toBe(false);
    expect(Math.hypot(PORTAL11_FRONT.x - PORTAL11.x, PORTAL11_FRONT.y - PORTAL11.y)).toBeLessThan(
      60,
    );
  });

  it("has a skull door in the ruins' back wall, reached on foot, past the pool and the columns", () => {
    expect(roomAt(SKULL_DOOR.x, SKULL_DOOR.y)).toBe(RUINS);
    expect(Math.hypot(SKULL_DOOR.x - ruins.x, SKULL_DOOR.y - ruins.y)).toBeGreaterThan(
      ruins.r - 20,
    );
    // Somewhere within reach of it is floor to stand on, off the pool.
    let stand = false;
    for (let a = 0; a < Math.PI * 2 && !stand; a += 0.2)
      for (const d of [10, 20, 30]) {
        const x = SKULL_DOOR.x + Math.cos(a) * d;
        const y = SKULL_DOOR.y + Math.sin(a) * d;
        if (d < SKULL_REACH && walkable(x, y, 0)) stand = true;
      }
    expect(stand).toBe(true);
    expect(Math.hypot(SKULL_DOOR.x - POOL.x, SKULL_DOOR.y - POOL.y)).toBeGreaterThan(POOL.r + 40);
    for (const c of COLUMNS)
      expect(Math.hypot(SKULL_DOOR.x - c.x, SKULL_DOOR.y - c.y)).toBeGreaterThan(c.r + 30);
  });
});

describe('the crypt behind the skull door', () => {
  it('holds five skeletons, six zombies and four ghosts, all on its floor and well back from the way in', () => {
    const spawns = CASTLE_SPAWNS[CRYPT] ?? [];
    const n = (k: string) => spawns.filter((s) => s.kind === k).length;
    expect([n('skeleton'), n('zombie'), n('ghost')]).toEqual([5, 6, 4]);
    expect(spawns).toHaveLength(15);
    const e = entry(CRYPT);
    for (const s of spawns) {
      expect(walkable(s.x, s.y, 0)).toBe(true);
      expect(Math.hypot(s.x - e.x, s.y - e.y)).toBeGreaterThan(120);
    }
    for (let i = 0; i < spawns.length; i++)
      for (let j = i + 1; j < spawns.length; j++) {
        const a = spawns[i] as { x: number; y: number };
        const b = spawns[j] as { x: number; y: number };
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(24);
      }
    expect(walkable(CRYPT_FORGOTTEN.x, CRYPT_FORGOTTEN.y, 0)).toBe(true);
    expect(roomAt(crypt.x, crypt.y)).toBe(CRYPT);
  });
});

describe('the Forgotten One again', () => {
  const at = (dx: number, dy: number) => ({ x: crypt.x + dx, y: crypt.y + dy, vx: 0, vy: 0 });

  it('has nine hit points there, and is angry at half of them; the first is as he was', () => {
    const b = new Forgotten(crypt, CRYPT_FORGOTTEN, 9);
    expect(b.hp).toBe(9);
    b.reset();
    expect(b.hp).toBe(9);
    expect(new Forgotten(crypt, CRYPT_FORGOTTEN).hp).toBe(FORGOTTEN_HP);
    const w: World = baseWorld({ figure: at(60, 60) });
    b.update(DT, w);
    b.hit(4);
    expect(b.angry).toBe(false);
    b.hit(1);
    expect(b.angry).toBe(true);
  });

  it('beaten, yields on his knees, alive, and says so once he is down; kneels again on a later visit', () => {
    const b = new Forgotten(crypt, CRYPT_FORGOTTEN, 9);
    b.yields = true;
    const w: World = baseWorld({ figure: at(60, 60) });
    b.update(DT, w);
    expect(b.up).toBe(true);
    let said = 0;
    b.onBeaten = () => said++;
    b.hit(9);
    expect(b.state).toBe('yield');
    expect(b.up).toBe(false);
    for (let i = 0; i < (KNEEL + 0.2) / DT; i++) b.update(DT, w);
    expect(b.state).toBe('yield');
    expect(said).toBe(1);
    for (let i = 0; i < 2 / DT; i++) b.update(DT, w);
    expect(said).toBe(1);
    // A spear does nothing to him now.
    b.hit(5);
    expect(b.hp).toBe(0);
    b.reset();
    expect(b.state).toBe('wait');
    b.kneel();
    expect(b.state).toBe('yield');
    b.update(DT, w);
    expect(said).toBe(1);
  });

  it('draws kneeling, his sword point down', () => {
    const f = fakeView();
    const b = new Forgotten(crypt, CRYPT_FORGOTTEN, 9);
    b.kneel();
    b.drawBody(f.v);
    b.draw(f.v, 'air');
    expect(f.calls.stroke ?? 0).toBeGreaterThan(3);
  });
});
