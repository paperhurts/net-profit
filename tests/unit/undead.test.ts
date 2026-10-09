import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { spearAt } from '../../src/data/spear';
import type { World } from '../../src/entities/entity';
import { Spears } from '../../src/entities/spears';
import {
  ARROW_SPEED,
  FALL,
  FIRST,
  Horde,
  intercept,
  RISE,
  type Spawn,
  UNDEAD,
  type Undead,
  type UndeadKind,
  WISP_LIFE,
  WISP_SPEED,
} from '../../src/entities/undead';
import { WALK_SPEED, walkable } from '../../src/entities/walker';
import { CASTLE_SPAWNS, PORTAL_OUT } from '../../src/world/gigantis';
import { entry, GATE, HALL_A, HALL_B, ROOMS, type Room, stairs } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
/** The courtyard and the two halls: the throne room has its own fight (forgotten.test.ts). */
const HALLS = [GATE, HALL_A, HALL_B] as const;
const room = ROOMS[HALL_A] as Room;
const one = (kind: UndeadKind, dx = -40, dy = -40): Horde =>
  new Horde(room, [{ kind, x: room.x + dx, y: room.y + dy }]);
const figure = (dx = 40, dy = 40) => ({ x: room.x + dx, y: room.y + dy, vx: 0, vy: 0 });
const run = (h: Horde, w: World, s: number) => {
  for (let i = 0; i < s / DT; i++) h.update(DT, w);
};

describe("Gigantis's rooms", () => {
  it('are walkable from the way in to the door at the back, with everyone standing on the floor', () => {
    for (const i of HALLS) {
      expect(walkable(entry(i).x, entry(i).y, 0)).toBe(true);
      expect(walkable(stairs(i).x, stairs(i).y, 0)).toBe(true);
      const spawns = CASTLE_SPAWNS[i] as readonly Spawn[];
      expect(spawns.length).toBeGreaterThanOrEqual(3);
      const r = ROOMS[i] as Room;
      for (const s of spawns) {
        expect(Math.hypot(s.x - r.x, s.y - r.y)).toBeLessThan(r.r - 20);
        // A fair way off the way in.
        expect(Math.hypot(s.x - entry(i).x, s.y - entry(i).y)).toBeGreaterThan(110);
      }
    }
    expect(walkable(PORTAL_OUT.x, PORTAL_OUT.y, 0)).toBe(true);
  });
});

describe('the undead', () => {
  it('stand still until the figure comes into their room, then wake, once', () => {
    const h = one('skeleton');
    let woke = 0;
    h.onWake = () => woke++;
    const w: World = baseWorld({ figure: null });
    run(h, w, 2);
    expect(h.list[0]?.state).toBe('wait');
    w.figure = figure();
    run(h, w, 0.5);
    expect(woke).toBe(1);
    expect(h.list[0]?.state).not.toBe('wait');
  });

  it('a skeleton raises its sword, then slashes a figure that stands still; its shield takes one spear, once', () => {
    const h = one('skeleton');
    const hits: string[] = [];
    let warned = 0;
    h.onHit = (by) => hits.push(by);
    h.onWindup = () => warned++;
    const w: World = baseWorld({ figure: figure() });
    run(h, w, 4);
    expect(warned).toBeGreaterThan(0);
    expect(hits).toContain('slash');
    const u = h.list[0] as Undead;
    expect(h.hit(u, 2, room.x, room.y)).toBe(true);
    expect(u.hp).toBe(UNDEAD.skeleton.hp);
    expect(h.hit(u, 2, room.x, room.y)).toBe(false);
    expect(u.hp).toBe(UNDEAD.skeleton.hp - 2);
  });

  it('a figure that steps back while the sword is up is not hit', () => {
    const h = one('skeleton');
    let hits = 0;
    h.onHit = () => hits++;
    const f = figure();
    const w: World = baseWorld({ figure: f });
    for (let i = 0; i < 12 / DT; i++) {
      const u = h.list[0] as Undead;
      if (u.state === 'windup') {
        const d = Math.hypot(f.x - u.x, f.y - u.y) || 1;
        f.x += ((f.x - u.x) / d) * WALK_SPEED * DT;
        f.y += ((f.y - u.y) / d) * WALK_SPEED * DT;
        if (Math.hypot(f.x - room.x, f.y - room.y) > room.r - 20) {
          f.x = room.x + 40;
          f.y = room.y + 40;
        }
      }
      h.update(DT, w);
    }
    expect(hits).toBe(0);
  });

  it('an archer keeps off and hits a figure that stands still or walks straight on, and misses one that turns when it looses', () => {
    const still = one('archer', -20, -20);
    let hitStill = 0;
    still.onHit = () => hitStill++;
    run(still, baseWorld({ figure: figure() }), 8);
    expect(hitStill).toBeGreaterThanOrEqual(2);
    const u = still.list[0] as Undead;
    expect(Math.hypot(u.x - (room.x + 40), u.y - (room.y + 40))).toBeGreaterThan(80);
    expect(u.guard).toBe(false);
    // One arrow at a figure walking across the room: straight on, it lands; turned back a quarter of a
    // second after it is loosed, it misses.
    for (const turns of [false, true]) {
      const h = one('archer', -60, -60);
      let hits = 0;
      let shotAt = -1;
      h.onHit = () => hits++;
      const f = figure(-110, 30);
      const w: World = baseWorld({ figure: f });
      for (let t = 0; t < 5; t += DT) {
        if (shotAt < 0 && h.shots.length) shotAt = t;
        const back = turns && shotAt >= 0 && t >= shotAt + 0.25;
        f.vx = back ? -WALK_SPEED : WALK_SPEED;
        f.vy = 0;
        f.x += f.vx * DT;
        h.update(DT, w);
        if (shotAt >= 0 && !h.shots.length) break;
      }
      expect(shotAt).toBeGreaterThan(0);
      expect(hits).toBe(turns ? 0 : 1);
    }
    expect(ARROW_SPEED).toBeGreaterThan(WALK_SPEED);
  });

  it("a ghost's wisp is slower than a walk: walk away and it never lands", () => {
    expect(WISP_SPEED).toBeLessThan(WALK_SPEED);
    const h = one('ghost', -60, -60);
    let hits = 0;
    h.onHit = () => hits++;
    const f = figure(20, 20);
    const w: World = baseWorld({ figure: f });
    run(h, w, FIRST + 0.1);
    expect(h.shots.length).toBe(1);
    // Straight away from it, along the room, then round.
    for (let i = 0; i < WISP_LIFE / DT; i++) {
      const s = h.shots[0];
      if (s) {
        const d = Math.hypot(f.x - s.x, f.y - s.y) || 1;
        let vx = (f.x - s.x) / d;
        let vy = (f.y - s.y) / d;
        const e = Math.hypot(f.x - room.x, f.y - room.y);
        if (e > room.r - 40) {
          vx = -vy;
          vy = vx;
        }
        f.x += vx * WALK_SPEED * DT;
        f.y += vy * WALK_SPEED * DT;
      }
      h.update(DT, w);
    }
    expect(hits).toBe(0);
    // But it does follow: one that stands still is found.
    const g = one('ghost', -60, -60);
    let stood = 0;
    g.onHit = () => stood++;
    run(g, baseWorld({ figure: figure(30, 30) }), FIRST + WISP_LIFE);
    expect(stood).toBe(1);
  });

  it('aim an arrow where it meets a figure walking straight on', () => {
    for (const [dx, dy, vx, vy] of [
      [100, 0, 0, 85],
      [80, -60, -85, 0],
      [0, 120, 60, 60],
    ] as const) {
      const t = intercept(dx, dy, vx, vy, ARROW_SPEED);
      expect(t).toBeGreaterThan(0);
      expect(Math.hypot(dx + vx * t, dy + vy * t)).toBeCloseTo(ARROW_SPEED * t, 6);
    }
  });

  it('a zombie is slow and takes four spears to put down', () => {
    expect(UNDEAD.zombie.speed).toBeLessThan(WALK_SPEED / 2);
    const h = one('zombie');
    const w: World = baseWorld({ figure: figure() });
    run(h, w, 0.2);
    const u = h.list[0] as Undead;
    for (let i = 0; i < 3; i++) h.hit(u, 2, room.x, room.y);
    expect(u.state).not.toBe('fall');
    h.hit(u, 2, room.x, room.y);
    expect(u.state).toBe('fall');
  });

  it('a necromancer raises a skeleton between it and the figure, one at a time, and it falls with it', () => {
    const h = one('necro', -80, -80);
    const raised: Undead[] = [];
    h.onRaise = (u) => raised.push(u);
    const w: World = baseWorld({ figure: figure(50, 50) });
    run(h, w, FIRST + 0.1);
    expect(raised).toHaveLength(1);
    const sk = raised[0] as Undead;
    expect(sk.state).toBe('rise');
    expect(sk.kind).toBe('skeleton');
    const n = h.list[0] as Undead;
    expect(Math.hypot(sk.x - (room.x + 50), sk.y - (room.y + 50))).toBeLessThan(
      Math.hypot(n.x - (room.x + 50), n.y - (room.y + 50)),
    );
    run(h, w, RISE + UNDEAD.necro.summon);
    expect(raised).toHaveLength(1);
    // Beaten, another comes a while later.
    sk.guard = false;
    h.hit(sk, 9, n.x, n.y);
    run(h, w, UNDEAD.necro.summon + 0.2);
    expect(raised).toHaveLength(2);
    // The necromancer down, its skeleton goes too, and the room is clear.
    let cleared = 0;
    h.onClear = () => cleared++;
    h.hit(n, 9, room.x, room.y);
    expect(raised[1]?.state).toBe('fall');
    expect(cleared).toBe(1);
    run(h, w, FALL + 0.1);
    expect(h.list.every((u) => u.state === 'gone')).toBe(true);
    expect(h.cleared).toBe(true);
  });

  it('come back whole at the next visit', () => {
    const h = new Horde(room, CASTLE_SPAWNS[HALL_A] as readonly Spawn[]);
    const w: World = baseWorld({ figure: figure() });
    run(h, w, 0.2);
    for (const u of h.list) h.hit(u, 99, room.x, room.y);
    expect(h.cleared).toBe(true);
    h.reset();
    expect(h.cleared).toBe(false);
    expect(h.list.every((u) => u.state === 'wait' && u.hp === u.spec.hp)).toBe(true);
  });

  /**
   * A person in one of the castle's rooms: they circle the nearest of the undead at a walk, turning
   * back every second or two and away from the walls, walking in on one out of reach; they turn when a
   * shot is loosed and step straight back from a sword that goes up near them, each react seconds
   * later (give or take a tenth); and they throw at what the spear goes for, lag seconds late. heals is
   * the healer cat's. Wins out of 30, and the hearts lost on average.
   */
  function fights(
    roomIndex: number,
    level: number,
    heals = 0,
    react = 0.25,
    lag = 1 / 3,
  ): { wins: number; lost: number } {
    const sp = spearAt(level);
    if (!sp) throw new Error('spear');
    const R = ROOMS[roomIndex] as Room;
    const r = rng(roomIndex * 11 + level);
    let wins = 0;
    let lost = 0;
    for (let run = 0; run < 30; run++) {
      const h = new Horde(R, CASTLE_SPAWNS[roomIndex] as readonly Spawn[]);
      const spears = new Spears();
      const e = entry(roomIndex);
      const f = { x: e.x, y: e.y, vx: 0, vy: 0 };
      const w: World = baseWorld({ figure: f });
      let hearts = 3;
      let invuln = 0;
      let ready = 0;
      let t = 0;
      let side = run % 2 ? 1 : -1;
      let flip = 1.2 + r() * 0.8;
      let healsLeft = heals;
      let healAt = -1;
      let turnAt = -1;
      const seen = new Map<Undead, number>();
      const later = () => t + react + (r() - 0.5) * 0.2;
      h.onHit = () => {
        if (invuln > 0) return;
        hearts--;
        invuln = 1.2;
        if (healsLeft > 0 && hearts > 0 && healAt < 0) healAt = t + 1.2;
      };
      h.onShoot = () => {
        if (turnAt < 0) turnAt = later();
      };
      for (; t < 120 && !h.cleared && hearts > 0; t += DT) {
        invuln -= DT;
        flip -= DT;
        if (healAt >= 0 && t >= healAt) {
          healAt = -1;
          if (hearts < 3) {
            hearts++;
            healsLeft--;
          }
        }
        if (flip <= 0 || (turnAt >= 0 && t >= turnAt)) {
          side = -side;
          flip = 1.2 + r() * 0.8;
          turnAt = -1;
        }
        const near = h.nearest(f.x, f.y, 999);
        let vx = 0;
        let vy = 0;
        for (const u of h.list) {
          if (u.state !== 'windup') seen.delete(u);
          else if (!seen.has(u)) seen.set(u, later());
        }
        const raised = h.list.find(
          (u) =>
            u.state === 'windup' &&
            t >= (seen.get(u) ?? 99) &&
            Math.hypot(u.x - f.x, u.y - f.y) < u.spec.reach + 18,
        );
        if (raised) {
          const d = Math.hypot(f.x - raised.x, f.y - raised.y) || 1;
          vx = (f.x - raised.x) / d;
          vy = (f.y - raised.y) / d;
        } else if (near) {
          const d = Math.hypot(near.x - f.x, near.y - f.y) || 1;
          vx = (-(near.y - f.y) / d) * side;
          vy = ((near.x - f.x) / d) * side;
          // Not too close to anything that swings.
          if (near.spec.reach > 0 && d < 50) {
            vx -= ((near.x - f.x) / d) * 0.8;
            vy -= ((near.y - f.y) / d) * 0.8;
          }
          if (d > sp.range - 10) {
            vx += ((near.x - f.x) / d) * 1.5;
            vy += ((near.y - f.y) / d) * 1.5;
          }
        }
        const ex = f.x - R.x;
        const ey = f.y - R.y;
        const el = Math.hypot(ex, ey);
        if (el > R.r - 40) {
          vx -= ex / el;
          vy -= ey / el;
        }
        const n = Math.hypot(vx, vy) || 1;
        f.vx = (vx / n) * WALK_SPEED;
        f.vy = (vy / n) * WALK_SPEED;
        f.x += f.vx * DT;
        f.y += f.vy * DT;
        if (t >= ready) {
          const u = h.target(f.x, f.y, sp.range);
          if (u) {
            ready = t + sp.reload + lag;
            spears.launch(f.x, f.y, 20, u, 18, () => h.hit(u, sp.power, f.x, f.y));
          }
        }
        h.update(DT, w);
        spears.update(DT, w);
      }
      if (h.cleared && hearts > 0) wins++;
      lost += 3 - Math.max(0, hearts);
    }
    return { wins, lost: lost / 30 };
  }

  it('make each room a fair fight: won alone for a heart or so, even a beat slow, and surely with the cat', () => {
    for (const i of HALLS) {
      for (const level of [3, 4]) {
        const sharp = fights(i, level);
        expect(sharp.wins).toBeGreaterThanOrEqual(28);
        expect(sharp.lost).toBeGreaterThan(0.1);
        // A beat slow, the last hall, with two necromancers and two archers, is about a coin toss alone.
        const slow = fights(i, level, 0, 0.45, 0.7);
        expect(slow.wins).toBeGreaterThanOrEqual(16);
        expect(slow.lost).toBeLessThan(2.2);
        expect(fights(i, level, 2, 0.45, 0.7).wins).toBeGreaterThanOrEqual(27);
      }
    }
  });

  it('send the spear at a necromancer in reach before anything nearer', () => {
    const h = new Horde(room, [
      { kind: 'necro', x: room.x - 80, y: room.y - 80 },
      { kind: 'zombie', x: room.x + 10, y: room.y + 10 },
    ]);
    run(h, baseWorld({ figure: figure() }), 0.1);
    expect(h.target(room.x + 40, room.y + 40, 200)?.kind).toBe('necro');
    expect(h.target(room.x + 40, room.y + 40, 60)?.kind).toBe('zombie');
    expect(h.nearest(room.x + 40, room.y + 40, 200)?.kind).toBe('zombie');
  });

  it('draw every kind, waiting, walking, swinging, rising and falling, and their shots', () => {
    const f = fakeView();
    const spawns: Spawn[] = (['skeleton', 'archer', 'zombie', 'ghost', 'necro'] as const).map(
      (kind, i) => ({ kind, x: room.x - 60 + i * 20, y: room.y - 40 }),
    );
    const h = new Horde(room, spawns);
    for (const u of h.list) h.drawUnit(f.v, u);
    const w: World = baseWorld({ figure: figure() });
    run(h, w, 3);
    h.raise(room.x, room.y);
    for (const u of h.list) {
      for (const st of ['walk', 'windup', 'swing', 'rise', 'fall'] as const) {
        u.state = st;
        u.t = 0.1;
        h.drawUnit(f.v, u);
      }
    }
    h.draw(f.v, 'air');
    expect(f.calls.arc ?? 0).toBeGreaterThan(30);
    expect(f.calls.restore).toBe(f.calls.save);
  });
});
