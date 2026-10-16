import { describe, expect, it } from 'vitest';
import { arenaSpots } from '../../src/data/barge';
import { Anchorer, ISLE4_MOAT, seaMoat, THROW_RANGE } from '../../src/entities/anchorer';
import { Cthulhu } from '../../src/entities/cthulhu';
import { BLUE, Fighter, SWORDSMAN } from '../../src/entities/fighter';
import { Forgotten } from '../../src/entities/forgotten';
import { GATOR_HP, GATOR_LEASH, Gators } from '../../src/entities/gators';
import { GORILLA_LEASH, GORILLA_WARN, Gorillas } from '../../src/entities/gorillas';
import { Heron } from '../../src/entities/heron';
import { LANCER_HP, Lancers } from '../../src/entities/lancers';
import { Pelican } from '../../src/entities/pelican';
import { deckLair, ISLE6_LAIR, LAND_LEN, LandReaper, LEASH_R } from '../../src/entities/reaperland';
import { RING, Sorcerer } from '../../src/entities/sorcerer';
import { offWeb, Spider10, WEB, webBetween } from '../../src/entities/spider10';
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

describe('the bosses on the Battle Barge', () => {
  it('start each at its own spot, two sorcerers apart round their ring', () => {
    const [a, b] = spots as [{ x: number; y: number }, { x: number; y: number }];
    const s1 = new Sorcerer(R);
    const s2 = new Sorcerer(R);
    for (const [s, at] of [
      [s1, a],
      [s2, b],
    ] as const) {
      s.field = R.r + 80;
      s.a0 = Math.atan2(at.y - R.y, at.x - R.x);
      s.reset();
    }
    expect(Math.hypot(s1.x - R.x, s1.y - R.y)).toBeCloseTo(RING);
    expect(Math.hypot(s1.x - s2.x, s1.y - s2.y)).toBeGreaterThan(20);
    const h = new Heron(R, 14, a);
    expect([h.x, h.y]).toEqual([a.x, a.y]);
    h.x += 50;
    h.reset();
    expect([h.x, h.y]).toEqual([a.x, a.y]);
    const p = new Pelican(R, b);
    expect(p.nest).toEqual(b);
    expect([p.x, p.y]).toEqual([b.x, b.y]);
    const f = new Forgotten(R, a);
    expect([f.x, f.y]).toEqual([a.x, a.y]);
    const c = new Cthulhu(R, b);
    expect([c.x, c.y]).toEqual([b.x, b.y]);
    // Without a spot, at the back of its temple, as before.
    const home = new Cthulhu(R);
    expect(home.x).toBeCloseTo(R.x - R.r * 0.35);
  });

  it('the sorcerer fights a figure anywhere on the large deck, and keeps its hurt when the figure runs to the edge', () => {
    const s = new Sorcerer(R);
    s.field = R.r + 80;
    s.reset();
    const e = entry(big);
    s.update(DT, world(e));
    expect(s.up).toBe(true);
    s.hit(3);
    for (let t = 0; t < 1; t += DT) s.update(DT, world({ x: R.x + R.r * 0.7, y: R.y + R.r * 0.7 }));
    expect(s.up).toBe(true);
    expect(s.hp).toBe(s.hpMax - 3);
    // On its own roof, the figure that far off is gone, and it waits again, whole.
    const roof = new Sorcerer(R);
    roof.update(DT, world({ x: R.x + 40, y: R.y }));
    expect(roof.up).toBe(true);
    roof.hit(3);
    roof.update(DT, world({ x: R.x + R.r * 0.7, y: R.y + R.r * 0.7 }));
    expect(roof.state).toBe('wait');
    expect(roof.hp).toBe(roof.hpMax);
  });
});

describe('the Reaper on land, on the Battle Barge', () => {
  it('lies at his spot, wakes at once, never gives up, and keeps to the deck', () => {
    const at = spots[0] as { x: number; y: number };
    const r = new LandReaper(deckLair(R, at));
    expect([r.x, r.y]).toEqual([at.x, at.y]);
    // Island 6's keeps his cove, as before.
    expect(new LandReaper().lair).toBe(ISLE6_LAIR);
    const e = entry(big);
    r.update(DT, world(e));
    expect(r.state).toBe('rise');
    // Further than his island leash from the middle of the deck: still after the figure, and on the deck (his tail may
    // swing out over the side in a sweep, about his head, which stays on it).
    expect(R.r).toBeLessThan(LEASH_R);
    for (let t = 0; t < 8; t += DT) {
      r.update(DT, world(e));
      expect(Math.hypot(r.x - R.x, r.y - R.y)).toBeLessThan(R.r + LAND_LEN / 2);
    }
    expect(r.awake).toBe(true);
  });
});

describe('the Tar Anchorer, on the Battle Barge', () => {
  it('rises in the sea off the deck, and from across the barge wades round the rail toward the figure', () => {
    const at = spots[0] as { x: number; y: number };
    const a = new Anchorer(seaMoat(R, at));
    expect(Math.hypot(a.x - R.x, a.y - R.y)).toBeGreaterThan(R.r);
    // Island 4's keeps its tar, as before.
    expect(new Anchorer().moat).toBe(ISLE4_MOAT);
    // The figure straight across the deck from it: it still comes round, never cutting over the deck.
    const across = { x: R.x - (at.x - R.x) * 0.8, y: R.y - (at.y - R.y) * 0.8 };
    const d0 = Math.hypot(a.x - across.x, a.y - across.y);
    let whirled = false;
    for (let t = 0; t < 20 && !whirled; t += DT) {
      a.update(DT, world(across));
      expect(Math.hypot(a.x - R.x, a.y - R.y)).toBeGreaterThan(R.r);
      whirled = a.state === 'whirl';
    }
    expect(d0).toBeGreaterThan(THROW_RANGE);
    expect(whirled).toBe(true);
  });
});

describe('the giant spider, on the Battle Barge', () => {
  it('hangs in a web between two posts on the deck, comes down at once, and only spray beats him', () => {
    const at = spots[1] as { x: number; y: number };
    const web = webBetween([at.x + 26, at.y - 26], [at.x - 26, at.y + 26]);
    expect([web.x, web.y]).toEqual([at.x, at.y]);
    expect(web.z).toBe(WEB.z);
    expect(offWeb(at.x, at.y, web)).toBeLessThan(1);
    const sd = new Spider10(web, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    expect([sd.x, sd.y]).toEqual([web.x, web.y]);
    // Island 10's keeps his swamp web.
    expect(new Spider10().web).toBe(WEB);
    // From the far side of the deck, he drops and comes, and never goes back for being too far.
    const e = entry(big);
    for (let t = 0; t < 3; t += DT) sd.update(DT, world(e));
    expect(sd.state).toBe('chase');
    expect(sd.awake).toBe(true);
    for (let i = 0; i < 3; i++) sd.spray();
    expect(sd.state).toBe('fall');
  });
});
