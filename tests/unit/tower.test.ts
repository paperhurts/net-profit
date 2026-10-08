import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { spearAt } from '../../src/data/spear';
import type { World } from '../../src/entities/entity';
import { BOSS_HP, FALL, NOVA_BOLTS, NOVA_EVERY, Sorcerer } from '../../src/entities/sorcerer';
import { Spears } from '../../src/entities/spears';
import { WALK_SPEED, walkable } from '../../src/entities/walker';
import { ISLE2, TOWER } from '../../src/world/isle2';
import {
  DOOR,
  entry,
  ROOF,
  ROOF3,
  ROOMS,
  type Room,
  roomAt,
  stairs,
  TOWERS,
} from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
const roof = ROOMS[ROOF] as { x: number; y: number; r: number };

describe('the tower', () => {
  it('has its door on island 2 by the tower, and rooms far from any sea', () => {
    expect(walkable(DOOR.x, DOOR.y, 0)).toBe(true);
    expect(Math.hypot(DOOR.x - TOWER.x, DOOR.y - TOWER.y)).toBeLessThan(TOWER.r + 30);
    expect(Math.hypot(DOOR.x - ISLE2.x, DOOR.y - ISLE2.y)).toBeLessThan(ISLE2.r);
    for (let i = 0; i < ROOMS.length; i++) {
      const r = ROOMS[i] as { x: number; y: number; r: number };
      expect(r.x).toBeLessThan(-4000);
      expect(walkable(entry(i).x, entry(i).y, 0)).toBe(true);
      if (!TOWERS.some((t) => t.roof === i))
        expect(walkable(stairs(i).x, stairs(i).y, 0)).toBe(true);
      expect(roomAt(r.x, r.y)).toBe(i);
      expect(walkable(r.x + r.r, r.y, 0)).toBe(false);
    }
  });
});

describe('the leviathan sorcerer', () => {
  it('waits until someone is on its roof, then wakes', () => {
    const b = new Sorcerer(roof);
    let woke = 0;
    b.onWake = () => woke++;
    const w: World = baseWorld({ figure: null });
    for (let i = 0; i < 30; i++) b.update(DT, w);
    expect(b.state).toBe('wait');
    w.figure = { x: roof.x, y: roof.y + 40, vx: 0, vy: 0 };
    b.update(DT, w);
    expect(b.state).toBe('fly');
    expect(woke).toBe(1);
  });

  it('hits a figure that stands still, again and again', () => {
    const b = new Sorcerer(roof);
    const w: World = baseWorld({ figure: { x: roof.x + 20, y: roof.y + 20, vx: 0, vy: 0 } });
    let hits = 0;
    b.onHit = () => hits++;
    for (let i = 0; i < 12 / DT; i++) b.update(DT, w);
    expect(hits).toBeGreaterThanOrEqual(4);
  });

  it('gets angry at half its health and throws three at a time; beaten, it falls and says so', () => {
    const b = new Sorcerer(roof);
    const w: World = baseWorld({ figure: { x: roof.x, y: roof.y + 40, vx: 0, vy: 0 } });
    b.update(DT, w);
    b.hit(BOSS_HP / 2);
    expect(b.angry).toBe(true);
    b.cast = 0;
    b.update(DT, w);
    expect(b.bolts.length).toBe(3);
    let beaten = 0;
    b.onBeaten = () => beaten++;
    b.hit(BOSS_HP);
    expect(b.state).toBe('fall');
    for (let i = 0; i < (FALL + 0.2) / DT; i++) b.update(DT, w);
    expect(beaten).toBe(1);
    expect(b.state).toBe('gone');
  });

  /** A person who strafes across its line of fire, turning back every second or two and away from the roof's edge, and throws when it is in reach a third of a second late. Wins out of 30. */
  function fights(level: number, nova = false): number {
    const sp = spearAt(level);
    if (!sp) throw new Error('spear');
    const r = rng(level * 7);
    let wins = 0;
    for (let run = 0; run < 30; run++) {
      const b = new Sorcerer(roof, nova);
      const spears = new Spears();
      const f = { x: roof.x + 20, y: roof.y + 40, vx: 0, vy: 0 };
      const w: World = baseWorld({ figure: f });
      let hearts = 3;
      let invuln = 0;
      let ready = 0;
      let t = 0;
      let side = run % 2 ? 1 : -1;
      let flip = 1.2 + r() * 0.8;
      b.onHit = () => {
        if (invuln > 0) return;
        hearts--;
        invuln = 1.2;
      };
      for (; t < 150 && b.state !== 'gone' && hearts > 0; t += DT) {
        invuln -= DT;
        flip -= DT;
        const dx = b.x - f.x;
        const dy = b.y - f.y;
        const d = Math.hypot(dx, dy) || 1;
        let vx = (-dy / d) * side;
        let vy = (dx / d) * side;
        const ex = f.x - roof.x;
        const ey = f.y - roof.y;
        const e = Math.hypot(ex, ey);
        if (e > roof.r - 45) {
          vx -= ex / e;
          vy -= ey / e;
        }
        if (flip <= 0) {
          side = -side;
          flip = 1.2 + r() * 0.8;
        }
        const n = Math.hypot(vx, vy) || 1;
        f.vx = (vx / n) * WALK_SPEED;
        f.vy = (vy / n) * WALK_SPEED;
        f.x += f.vx * DT;
        f.y += f.vy * DT;
        if (b.up && t >= ready && d <= sp.range) {
          ready = t + sp.reload + 1 / 3;
          spears.launch(f.x, f.y, 20, b, 34, () => b.hit(sp.power));
        }
        b.update(DT, w);
        spears.update(DT, w);
      }
      if (b.state === 'gone' && hearts > 0) wins++;
    }
    return wins;
  }

  it('is a real fight with the first spear and a fair one with the next, for a person who strafes and throws', () => {
    expect(fights(1)).toBeGreaterThanOrEqual(8);
    expect(fights(1)).toBeLessThanOrEqual(24);
    expect(fights(2)).toBeGreaterThanOrEqual(20);
    expect(fights(3)).toBe(30);
  });

  it('comes back to island 3 with a ring of bolts, every third cast once angry', () => {
    const b = new Sorcerer(ROOMS[ROOF3] as Room, true);
    const w: World = baseWorld({ figure: { x: b.home.x, y: b.home.y + 40, vx: 0, vy: 0 } });
    b.update(DT, w);
    const sizes: number[] = [];
    for (let i = 0; i < NOVA_EVERY * 2; i++) {
      b.cast = 0;
      b.bolts.length = 0;
      if (i === 1) b.hit(BOSS_HP / 2);
      b.update(DT, w);
      sizes.push(b.bolts.length);
    }
    // One while calm, then angry: three, three, a ring, three, three.
    expect(sizes).toEqual([1, 3, 3, NOVA_BOLTS, 3, 3]);
    // The first bolt of a ring is aimed at the figure.
    for (let i = 0; i < NOVA_EVERY && b.bolts.length !== NOVA_BOLTS; i++) {
      b.cast = 0;
      b.bolts.length = 0;
      b.update(DT, w);
    }
    expect(b.bolts).toHaveLength(NOVA_BOLTS);
    const bolt = b.bolts[0] as { vx: number; vy: number };
    const f = w.figure as { x: number; y: number };
    expect(Math.abs(Math.atan2(bolt.vy, bolt.vx) - Math.atan2(f.y - b.y, f.x - b.x))).toBeLessThan(
      0.1,
    );
    // Island 2's never learns it.
    const plain = new Sorcerer(roof);
    const w2: World = baseWorld({ figure: { x: roof.x, y: roof.y + 40, vx: 0, vy: 0 } });
    plain.update(DT, w2);
    plain.hit(BOSS_HP / 2);
    for (let i = 0; i < NOVA_EVERY * 2; i++) {
      plain.cast = 0;
      plain.bolts.length = 0;
      plain.update(DT, w2);
      expect(plain.bolts.length).toBe(3);
    }
  });

  it('is still a fair fight with the ring, with the long spear, and a sure one with the barbed', () => {
    expect(fights(2, true)).toBeGreaterThanOrEqual(15);
    expect(fights(3, true)).toBeGreaterThanOrEqual(26);
  });

  it('draws its bolts and its body in the air, and nothing once it is gone', () => {
    const b = new Sorcerer(roof);
    const w: World = baseWorld({ figure: { x: roof.x, y: roof.y + 40, vx: 0, vy: 0 } });
    b.update(DT, w);
    b.cast = 0;
    b.update(DT, w);
    const fake = fakeView();
    b.draw(fake.v, 'air');
    expect(fake.calls.arc).toBeGreaterThanOrEqual(2);
    b.state = 'gone';
    const after = fakeView();
    b.draw(after.v, 'air');
    expect(after.calls.arc).toBeUndefined();
  });
});

describe('the way in', () => {
  it('is clear of the monkey camp: standing at the tower door does not wake it', async () => {
    const { AGGRO, CAMP } = await import('../../src/entities/monkeys');
    expect(Math.hypot(DOOR.x - CAMP.x, DOOR.y - CAMP.y)).toBeGreaterThan(AGGRO + 10);
  });
});
