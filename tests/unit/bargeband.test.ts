import { describe, expect, it } from 'vitest';
import { arenaSpots } from '../../src/data/barge';
import { BLUE, Fighter, SWORDSMAN } from '../../src/entities/fighter';
import { GATOR_HP, GATOR_LEASH, Gators } from '../../src/entities/gators';
import { GORILLA_LEASH, GORILLA_WARN, Gorillas } from '../../src/entities/gorillas';
import { LANCER_HP, Lancers } from '../../src/entities/lancers';
import { ARENAS, entry, ROOMS, type Room } from '../../src/world/tower';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const big = ARENAS.large;
const R = ROOMS[big] as Room;
const spots = arenaSpots(3, R.r).map((s) => ({ x: R.x + s.x, y: R.y + s.y }));
const world = (at: { x: number; y: number }) => baseWorld({ figure: { ...at, vx: 0, vy: 0 } });
const mid = (ps: { x: number; y: number }[]) => ({
  x: ps.reduce((n, p) => n + p.x, 0) / ps.length,
  y: ps.reduce((n, p) => n + p.y, 0) / ps.length,
});
const far = (from: { x: number; y: number }, to: { x: number; y: number }) =>
  Math.hypot(from.x - to.x, from.y - to.y);

describe("the Battle Barge's own gorillas, gators and lancers", () => {
  it('start empty, and are placed afresh for a fight, at the spots it gives them', () => {
    const g = new Gorillas([], Infinity);
    expect(g.list).toHaveLength(0);
    g.place(spots.map((s) => [s.x, s.y]));
    expect(g.list.map((q) => [q.x, q.y])).toEqual(spots.map((s) => [s.x, s.y]));
    expect(g.list.filter((q) => q.silver)).toHaveLength(1);
    g.place([]);
    expect(g.list).toHaveLength(0);
    const l = new Lancers([], { x: 0, y: 0 });
    l.place(spots, R);
    expect(l.list).toHaveLength(3);
    expect(l.list.every((q) => q.state === 'guard' && q.hp === LANCER_HP)).toBe(true);
  });

  it('all come for the figure from the far side of the large arena, and never give up on it', () => {
    const e = entry(big);
    // Further off than any of them would chase on its island.
    expect(far(e, mid(spots))).toBeGreaterThan(Math.min(GORILLA_LEASH, GATOR_LEASH) - 60);
    const gor = new Gorillas([], Infinity);
    gor.place(spots.map((s) => [s.x, s.y]));
    let warns = 0;
    gor.onWarn = () => warns++;
    gor.wake();
    expect(warns).toBe(3);
    const gat = new Gators([], Infinity);
    gat.place(spots.map((s) => ({ ...s, r: 0 })));
    gat.loose();
    const lan = new Lancers([], { x: 0, y: 0 });
    lan.place(spots, R);
    lan.wake();
    expect(lan.roused).toBe(true);
    expect(gat.roused).toBe(true);
    const at = { x: e.x, y: e.y };
    const d0 = far(at, mid(gat.list));
    for (let t = 0; t < 4; t += DT) {
      const w = world(at);
      gor.update(DT, w);
      gat.update(DT, w);
      lan.update(DT, w);
    }
    expect(gor.list.every((q) => q.state !== 'back' && q.state !== 'sit')).toBe(true);
    expect(gat.list.every((q) => q.state !== 'back' && q.state !== 'sink')).toBe(true);
    expect(far(at, mid(gat.list))).toBeLessThan(d0 - 60);
    expect(far(at, mid(gor.list))).toBeLessThan(far(at, mid(spots)) - (4 - GORILLA_WARN) * 30);
    expect(far(at, mid(lan.list))).toBeLessThan(far(at, mid(spots)) - 60);
  });

  it('say when one is beaten, the lancers too', () => {
    const lan = new Lancers([], { x: 0, y: 0 });
    lan.place(spots, R);
    const beaten: unknown[] = [];
    lan.onBeaten = (q) => beaten.push(q);
    const q = lan.list[0];
    if (!q) throw new Error('lancer');
    for (let i = 0; i < LANCER_HP; i++) lan.hit(q, 1);
    expect(beaten).toEqual([q]);
    const gat = new Gators([], Infinity);
    gat.place(spots.map((s) => ({ ...s, r: 0 })));
    gat.loose();
    let down = 0;
    gat.onBeaten = () => down++;
    const g = gat.list[1];
    if (!g) throw new Error('gator');
    gat.hit(g, GATOR_HP);
    expect(down).toBe(1);
  });
});

describe("island 3's fighters on the Battle Barge", () => {
  it('wake as soon as the figure is on the deck, and the blue demon calls up its monkeys there', () => {
    const e = entry(big);
    const s = spots[0] as { x: number; y: number };
    const sw = new Fighter(SWORDSMAN, R, s);
    const blue = new Fighter(BLUE, R, s);
    const called: { x: number; y: number }[] = [];
    blue.onSummon = (x, y) => {
      called.push({ x, y });
      return [{ state: 'chase' }, { state: 'chase' }];
    };
    sw.update(DT, world(e));
    blue.update(DT, world(e));
    expect(sw.up).toBe(true);
    expect(blue.up).toBe(true);
    for (let t = 0; t < 2; t += DT) blue.update(DT, world(e));
    expect(called).toHaveLength(1);
  });
});
