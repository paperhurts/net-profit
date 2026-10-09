import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { spearAt } from '../../src/data/spear';
import type { World } from '../../src/entities/entity';
import { Monkeys } from '../../src/entities/monkeys';
import {
  BOSS_HP,
  CALL_EVERY,
  CALL_N,
  FALL,
  NOVA_BOLTS,
  NOVA_EVERY,
  Sorcerer,
  THIRD_HP,
} from '../../src/entities/sorcerer';
import { Spears } from '../../src/entities/spears';
import { WALK_SPEED, walkable } from '../../src/entities/walker';
import { ISLE2, TOWER } from '../../src/world/isle2';
import {
  DOOR,
  entry,
  ROOF,
  ROOF3,
  ROOF7,
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
      if (TOWERS.some((t) => i >= t.first && i < t.roof))
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

  /**
   * A person who strafes across its line of fire, turning back every second or two and away from the
   * roof's edge, and throws when it is in reach a third of a second late. With calls, the sorcerer of
   * island 7: its monkeys come as the game sends them (two, one throwing, while fewer than two are up),
   * and the person throws at the nearest of them when the sorcerer is out of reach. heals is the healer
   * cat's: a heart back a moment after one is lost, this many times. Wins out of 30.
   */
  function fights(level: number, nova = false, calls = false, heals = 0): number {
    const sp = spearAt(level);
    if (!sp) throw new Error('spear');
    const r = rng(level * 7 + (calls ? 3 : 0));
    let wins = 0;
    for (let run = 0; run < 30; run++) {
      const b = new Sorcerer(roof, nova, calls, calls ? THIRD_HP : BOSS_HP);
      const camp = new Monkeys(roof, 0, 0, false);
      const spears = new Spears();
      const f = { x: roof.x + 20, y: roof.y + 40, vx: 0, vy: 0 };
      const w: World = baseWorld({ figure: f });
      let hearts = 3;
      let invuln = 0;
      let ready = 0;
      let t = 0;
      let side = run % 2 ? 1 : -1;
      let flip = 1.2 + r() * 0.8;
      let healsLeft = heals;
      let healAt = -1;
      const hurt = () => {
        if (invuln > 0) return;
        hearts--;
        invuln = 1.2;
        if (healsLeft > 0 && hearts > 0 && healAt < 0) healAt = t + 1.2;
      };
      b.onHit = hurt;
      camp.onBonk = hurt;
      b.onCall = (x, y) => {
        if (camp.list.filter((m) => m.state === 'chase').length >= CALL_N) return;
        camp.summon(x + 14, y + 10);
        camp.summon(x - 14, y + 10, true);
      };
      for (; t < 150 && b.state !== 'gone' && hearts > 0; t += DT) {
        invuln -= DT;
        if (healAt >= 0 && t >= healAt) {
          healAt = -1;
          if (hearts < 3) {
            hearts++;
            healsLeft--;
          }
        }
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
        if (t >= ready && b.up && d <= sp.range) {
          ready = t + sp.reload + 1 / 3;
          spears.launch(f.x, f.y, 20, b, 34, () => b.hit(sp.power));
        } else if (t >= ready) {
          const m = camp.nearest(f.x, f.y, sp.range);
          if (m) {
            ready = t + sp.reload + 1 / 3;
            spears.launch(f.x, f.y, 20, m, 10, () => camp.hit(m, sp.power, f.x, f.y));
          }
        }
        b.update(DT, w);
        camp.update(DT, w);
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

  it('comes back a third time to island 7, calling monkeys up once angry, at once and then every so often', () => {
    const roof7 = ROOMS[ROOF7] as Room;
    const b = new Sorcerer(roof7, true, true, THIRD_HP);
    let called = 0;
    b.onCall = (x, y) => {
      called++;
      expect(Math.hypot(x - roof7.x, y - roof7.y)).toBeLessThan(roof7.r - 12);
    };
    const w: World = baseWorld({ figure: { x: roof7.x, y: roof7.y + 40, vx: 0, vy: 0 } });
    b.update(DT, w);
    expect(b.state).toBe('fly');
    for (let i = 0; i < 20 / DT; i++) b.update(DT, w);
    expect(called).toBe(0);
    b.hit(THIRD_HP / 2 - 1);
    b.update(DT, w);
    expect(called).toBe(0);
    b.hit(1);
    b.bolts.length = 0;
    b.update(DT, w);
    expect(called).toBe(1);
    for (let i = 0; i < (CALL_EVERY - 0.5) / DT; i++) {
      b.bolts.length = 0;
      b.update(DT, w);
    }
    expect(called).toBe(1);
    for (let i = 0; i < 1 / DT; i++) {
      b.bolts.length = 0;
      b.update(DT, w);
    }
    expect(called).toBe(2);
    // Island 3's never learns it.
    const b3 = new Sorcerer(ROOMS[ROOF3] as Room, true);
    b3.onCall = () => called++;
    b3.update(DT, w);
    b3.hit(BOSS_HP / 2);
    for (let i = 0; i < 20 / DT; i++) b3.update(DT, w);
    expect(called).toBe(2);
  });

  it('is twice as tough there and a hard fight alone with its monkeys, and a sure one with the healer cat', () => {
    // Alone, even with the barbed spear or the harpoon, about two times in three.
    for (const level of [3, 4]) {
      const alone = fights(level, true, true);
      expect(alone).toBeGreaterThanOrEqual(12);
      expect(alone).toBeLessThanOrEqual(24);
    }
    // Harder than island 3's, which the barbed spear always wins.
    expect(fights(3, true)).toBe(30);
    // With the healer cat's two heals, which anyone this far has, every time.
    expect(fights(3, true, true, 2)).toBeGreaterThanOrEqual(28);
    expect(fights(4, true, true, 2)).toBeGreaterThanOrEqual(28);
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
