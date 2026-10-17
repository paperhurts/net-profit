import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import {
  BARGE_MAX,
  defaultBarge,
  FRAME_H,
  FRAME_W,
  noSeaPick,
  parseBarge,
  SEA_ARENA,
  SEA_FOES,
  SEA_ISLE_GAP,
  SEA_ISLE_R,
  SEA_ISLE_REACH,
  SEA_ISLES_MAX,
  SEA_NAMES,
  SEA_RING,
  SEA_SHORE,
  SEA_ZOOM_MAX,
  SEA_ZOOM_MIN,
  seaAdd,
  seaBuoys,
  seaFrame,
  seaIsleNo,
  seaIsleTap,
  seaSpots,
  seaSpotsClear,
  seaStart,
  seaTotal,
} from '../../src/data/barge';
import {
  DEEP_WATER as ANGLER_DEEP,
  Anglerfish,
  seaWater as anglerRing,
} from '../../src/entities/anglerfish';
import { Cthuluviathan, DEEP_CITY, LAIR, seaCity } from '../../src/entities/cthuluviathan';
import { DeepOne, LAIR6, seaDeepHome } from '../../src/entities/deepone';
import { EAST_DEEP, Gulper, seaZone } from '../../src/entities/gulper';
import {
  BODY_R,
  BUOY_WATER,
  GUARD_NEAR,
  LEV_ORBIT,
  LEV_SPEED,
  Leviathan,
  levPos,
  seaWater as levRing,
  SEA_COOL,
  SEA_KEEP,
  SEA_PATH,
} from '../../src/entities/leviathan';
import { ISLE6_HAUNT, MeteorSerpent, seaHaunt } from '../../src/entities/meteor';
import { DEEP_WATER, Reaper, ROUTE, seaWater } from '../../src/entities/reaper';
import { ISLE5_REEF, SharkKing, seaReef } from '../../src/entities/sharkking';
import { DEEP, FAR, FARFAR, WS } from '../../src/world/island';
import { ROOMS } from '../../src/world/tower';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;

describe('the Battle Barge at sea: picking a fight', () => {
  it('starts on foot, with Star picked for the sea', () => {
    const b = defaultBarge();
    expect(b.where).toBe('foot');
    expect(b.sea).toEqual({
      meteor: 1,
      king: 0,
      deep: 0,
      reaper: 0,
      gulper: 0,
      angler: 0,
      cthulu: 0,
      guard: 0,
    });
  });

  it('keeps the sea pick to ten all told, and never below none', () => {
    let p = noSeaPick();
    p = seaAdd(p, 'king', 7);
    p = seaAdd(p, 'deep', 7);
    expect(seaTotal(p)).toBe(BARGE_MAX);
    expect(p.deep).toBe(3);
    p = seaAdd(p, 'meteor', -1);
    expect(p.meteor).toBe(0);
  });

  it('reads a setup saved before the sea back on foot, with the sea at its start; and keeps one saved at sea', () => {
    const old = parseBarge({ size: 'large', pick: { zombie: 2 } });
    expect(old.where).toBe('foot');
    expect(old.sea).toEqual(defaultBarge().sea);
    const sea = parseBarge({
      size: 'small',
      pick: {},
      where: 'sea',
      sea: { king: 2.6, deep: 30, kraken: 4, meteor: -1 },
    });
    expect(sea.where).toBe('sea');
    expect(sea.sea).toEqual({
      meteor: 0,
      king: 2,
      deep: BARGE_MAX - 2,
      reaper: 0,
      gulper: 0,
      angler: 0,
      cthulu: 0,
      guard: 0,
    });
    expect(parseBarge({ where: 'moon' }).where).toBe('foot');
  });

  it('names and tells how to beat each sea boss', () => {
    for (const k of SEA_FOES) {
      expect(SEA_NAMES[k][0].length).toBeGreaterThan(4);
      expect(SEA_NAMES[k][1]).toMatch(/\d+ hits\.$/);
    }
  });
});

describe('the Battle Barge at sea: its ring', () => {
  it('lies far out past the farthest buoys, and clear of the barge on foot and every room', () => {
    const edge = DEEP + FAR + FARFAR;
    for (const r of Object.values(SEA_RING)) {
      expect(SEA_ARENA.x + r).toBeLessThan(-edge - 3000);
      for (const room of ROOMS)
        expect(Math.hypot(room.x - SEA_ARENA.x, room.y - SEA_ARENA.y)).toBeGreaterThan(r + 3000);
    }
    expect(SEA_ARENA.y).toBeGreaterThan(0);
    expect(SEA_ARENA.y).toBeLessThan(WS);
  });

  it('rings itself with buoys, evenly round', () => {
    for (const r of Object.values(SEA_RING)) {
      const b = seaBuoys(r);
      expect(b.length).toBeGreaterThan(30);
      for (const p of b) expect(Math.hypot(p.x, p.y)).toBeCloseTo(r, 6);
    }
  });

  it('brings the boat in at the front heading in, and stands every boss round the back, apart, well away from it', () => {
    for (const r of Object.values(SEA_RING)) {
      const st = seaStart(r);
      expect(Math.hypot(st.x, st.y)).toBeLessThan(r - 100);
      // Heading for the middle.
      expect(Math.cos(st.h) * -st.x + Math.sin(st.h) * -st.y).toBeGreaterThan(
        0.99 * Math.hypot(st.x, st.y),
      );
      for (let n = 1; n <= BARGE_MAX; n++) {
        const s = seaSpots(n, r);
        expect(s.length).toBe(n);
        for (const p of s) {
          expect(Math.hypot(p.x, p.y)).toBeLessThan(r - 120);
          expect(Math.hypot(p.x - st.x, p.y - st.y)).toBeGreaterThan(r * 0.7);
        }
        for (let i = 0; i < s.length; i++)
          for (let j = i + 1; j < s.length; j++) {
            const a = s[i] as { x: number; y: number };
            const b = s[j] as { x: number; y: number };
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(150);
          }
      }
    }
  });
});

describe('the sea bosses, given a home', () => {
  const at = { x: SEA_ARENA.x - 300, y: SEA_ARENA.y - 300 };
  const ring = { ...SEA_ARENA, r: SEA_RING.medium };
  const boat = { x: SEA_ARENA.x + 600, y: SEA_ARENA.y + 600, h: 0, v: 0 };

  it('keep their own islands by default', () => {
    expect(new DeepOne().x).toBe(LAIR6.x);
    expect(new SharkKing().reef).toBe(ISLE5_REEF);
    expect(new MeteorSerpent().haunt).toBe(ISLE6_HAUNT);
    const r = new Reaper();
    expect(r.water).toBe(DEEP_WATER);
    expect([r.x, r.y]).toEqual([ROUTE[0]?.x, ROUTE[0]?.y]);
    expect(new Gulper().zone).toBe(EAST_DEEP);
  });

  it('set the Reaper and the gulper on the boat at once in the ring, never tiring of it, kept inside', () => {
    const w = baseWorld({ boat: { ...boat } });
    const r = new Reaper(seaWater(at, ring));
    const g = new Gulper(seaZone(ring), at);
    expect([g.x, g.y]).toEqual([at.x, at.y]);
    for (let i = 0; i < 60 * 30; i++) {
      // The boat runs round the ring's edge, and never gets far.
      const a = i * 0.004;
      w.boat.x = ring.x + Math.cos(a) * (ring.r - 100);
      w.boat.y = ring.y + Math.sin(a) * (ring.r - 100);
      r.update(DT, w);
      g.update(DT, w);
      expect(Math.hypot(r.x - ring.x, r.y - ring.y)).toBeLessThanOrEqual(ring.r - 60 + 1e-6);
      expect(Math.hypot(g.x - ring.x, g.y - ring.y)).toBeLessThanOrEqual(ring.r - 40 + 1e-6);
    }
    expect(r.hunting).toBe(true);
    // Thirty seconds and the gulper is still after it: at home it gives up after fourteen.
    expect(g.state).toBe('hunt');
  });

  it('drives the gulper off for good at sea, and back after a while at home', () => {
    const w = baseWorld({ boat: { ...boat } });
    const sea = new Gulper(seaZone(ring), at);
    for (let i = 0; i < 60 && sea.state !== 'hunt'; i++) sea.update(DT, w);
    expect(sea.state).toBe('hunt');
    sea.resolve = 1;
    expect(sea.harpoon(1)).toBe(true);
    expect(sea.state).toBe('away');
    expect(sea.mark()).toBeNull();
    sea.reset();
    for (let i = 0; i < 60 * 40; i++) sea.update(DT, w);
    expect(sea.state).toBe('away');
    const home = new Gulper();
    home.state = 'hunt';
    home.resolve = 1;
    expect(home.harpoon(1)).toBe(true);
    expect(home.state).toBe('rest');
  });

  it('wake at once at a spot on the open sea, however far off the boat is, and never give up', () => {
    const w = baseWorld({ boat: { ...boat } });
    const d = new DeepOne(seaDeepHome(at));
    const k = new SharkKing(seaReef(at, ring));
    const m = new MeteorSerpent(seaHaunt(at));
    for (let i = 0; i < 60 * 3; i++) {
      d.update(DT, w);
      k.update(DT, w);
      m.update(DT, w);
    }
    expect(d.state).toBe('fight');
    expect(k.fighting).toBe(true);
    expect(m.hunting).toBe(true);
    // Sail clean across the ring: none goes back home.
    w.boat.x = SEA_ARENA.x - 1000;
    for (let i = 0; i < 60 * 5; i++) {
      d.update(DT, w);
      k.update(DT, w);
      m.update(DT, w);
    }
    expect(d.state).toBe('fight');
    expect(k.fighting).toBe(true);
    expect(m.hunting || m.state === 'down' || m.state === 'takeoff').toBe(true);
  });

  it('do not wake before the game has started', () => {
    const w = baseWorld({ started: false, boat: { ...boat } });
    const d = new DeepOne(seaDeepHome(at));
    const k = new SharkKing(seaReef(at, ring));
    for (let i = 0; i < 60; i++) {
      d.update(DT, w);
      k.update(DT, w);
    }
    expect(d.state).toBe('sleep');
    expect(k.state).toBe('wait');
  });

  it('keeps the Shark King inside the ring', () => {
    const w = baseWorld({ boat: { x: SEA_ARENA.x + ring.r + 600, y: SEA_ARENA.y, h: 0, v: 0 } });
    const k = new SharkKing(seaReef(at, ring));
    for (let i = 0; i < 60 * 20; i++) {
      k.update(DT, w);
      expect(Math.hypot(k.x - ring.x, k.y - ring.y)).toBeLessThanOrEqual(ring.r - 40 + 1e-6);
    }
  });

  it('sinks the Deep One on its own when beaten at sea: it drags nothing under', () => {
    const w = baseWorld({ boat: { x: at.x + 200, y: at.y, h: 0, v: 0 } });
    const d = new DeepOne(seaDeepHome(at));
    let dragged = 0;
    let beaten = 0;
    d.onDragged = () => dragged++;
    d.onBeaten = () => beaten++;
    for (let i = 0; i < 60 * 60 && d.state !== 'sink'; i++) {
      d.update(DT, w);
      if (d.grab) d.grab = null;
      if (d.eye) d.harpoon(1);
    }
    expect(beaten).toBe(1);
    expect(d.state).toBe('sink');
    expect(d.holding).toBe(false);
    expect(d.mark()).toBeNull();
    for (let i = 0; i < 60 * 4; i++) d.update(DT, w);
    expect(d.state).toBe('down');
    expect(dragged).toBe(0);
    d.reset();
    expect(d.state).toBe('down');
  });
});

describe('the camera at sea', () => {
  const K = Math.SQRT1_2;
  const sx = (dx: number, dy: number) => (dx - dy) * K;
  const sy = (dx: number, dy: number, z = 0) => (dx + dy) * K * 0.5 - z;

  it('looks at the middle of the boat and a boss, and stands back to fit both into the band', () => {
    const W = 390;
    const H = 780;
    const pts = [
      { dx: 0, dy: 0, r: 110, tall: 50 },
      { dx: -400, dy: -400, r: 170, tall: 110 },
    ];
    const f = seaFrame(pts, W, H);
    // Between the two, up the screen toward the boss.
    expect(f.dx).toBeLessThan(0);
    expect(f.dy).toBeLessThan(0);
    expect(f.dx).toBeGreaterThan(-400);
    // Every padded point lands inside the band at that zoom, round its middle.
    for (const p of pts) {
      const x = (sx(p.dx, p.dy) - sx(f.dx, f.dy)) * f.zoom;
      const y = (sy(p.dx, p.dy) - sy(f.dx, f.dy)) * f.zoom;
      expect(Math.abs(x) + p.r * K * f.zoom).toBeLessThanOrEqual((W * FRAME_W) / 2 + 1e-6);
      expect(y + p.r * K * 0.5 * f.zoom).toBeLessThanOrEqual((H * FRAME_H) / 2 + 1e-6);
      expect(y - (p.r * K * 0.5 + (p.tall ?? 0)) * f.zoom).toBeGreaterThanOrEqual(
        -(H * FRAME_H) / 2 - 1e-6,
      );
    }
  });

  it('takes in a boss flying high above the water', () => {
    const low = seaFrame(
      [
        { dx: 0, dy: 0, r: 100 },
        { dx: -200, dy: -200, r: 100 },
      ],
      390,
      780,
    );
    const high = seaFrame(
      [
        { dx: 0, dy: 0, r: 100 },
        { dx: -200, dy: -200, z: 300, r: 100 },
      ],
      390,
      780,
    );
    expect(high.zoom).toBeLessThan(low.zoom);
  });

  it('with only the boat, looks at the boat', () => {
    const f = seaFrame([{ dx: 0, dy: 0, r: 110 }], 390, 780);
    expect(f.dx).toBeCloseTo(0, 6);
    expect(f.dy).toBeCloseTo(0, 6);
    expect(f.zoom).toBeGreaterThan(1);
    expect(SEA_ZOOM_MIN).toBeLessThan(SEA_ZOOM_MAX);
  });
});

describe('the anglerfish and the Cthuluviathan, given a home', () => {
  const ring = { ...SEA_ARENA, r: SEA_RING.medium };
  const at = { x: SEA_ARENA.x - 300, y: SEA_ARENA.y - 300 };

  it('keep their own water by default', () => {
    const a = new Anglerfish();
    expect(a.water).toBe(ANGLER_DEEP);
    expect(a.state).toBe('gone');
    expect(new Cthuluviathan().lair).toBe(DEEP_CITY);
    expect(DEEP_CITY.x).toBe(LAIR.x);
  });

  it('brings the anglerfish up by day in the ring, keeps its light inside it, and once driven off it is gone', () => {
    const w = baseWorld({
      dark: 0,
      boat: { x: SEA_ARENA.x + 500, y: SEA_ARENA.y + 500, h: 0, v: 0 },
    });
    const a = new Anglerfish(anglerRing(ring), at);
    expect(a.state).toBe('lurking');
    for (let i = 0; i < 60 * 3; i++) a.update(DT, w);
    // Up by day, its light shining.
    expect(a.state).toBe('lurking');
    expect(a.mark()).not.toBeNull();
    for (let i = 0; i < 60 * 20; i++) {
      a.update(DT, w);
      expect(Math.hypot(a.x - ring.x, a.y - ring.y)).toBeLessThan(ring.r - 99);
    }
    a.resolve = 1;
    expect(a.harpoon(1)).toBe(true);
    expect(a.done).toBe(true);
    for (let i = 0; i < 60 * 30; i++) a.update(DT, w);
    expect(a.state).toBe('gone');
    // At home, by day, it never comes up; driven off, it comes back in time.
    const home = new Anglerfish();
    for (let i = 0; i < 60 * 5; i++) home.update(DT, w);
    expect(home.state).toBe('gone');
  });

  it('wakes the Cthuluviathan at once at sea, keeps it awake, and beaten it sleeps for good', () => {
    const w = baseWorld({ boat: { x: at.x + 1500, y: at.y, h: 0, v: 0 } });
    const c = new Cthuluviathan(seaCity(at));
    c.update(DT, w);
    expect(c.state).toBe('awake');
    // Out of its reach a long while, and it stays awake: at home it would sleep after five seconds.
    for (let i = 0; i < 60 * 40; i++) c.update(DT, w);
    expect(c.state).toBe('awake');
    // Within reach, its tentacles come up where the boat is.
    w.boat.x = at.x + 300;
    for (let i = 0; i < 60 * 3; i++) c.update(DT, w);
    expect(c.tentacles.length).toBeGreaterThan(0);
    c.resolve = 1;
    expect(c.harpoon(1, null)).toBe(true);
    expect(c.done).toBe(true);
    for (let i = 0; i < 60 * 60; i++) c.update(DT, w);
    expect(c.state).toBe('asleep');
    // At home the same boat out of reach wakes nothing.
    const home = new Cthuluviathan();
    home.update(DT, baseWorld());
    expect(home.state).toBe('asleep');
  });
});

describe('the guard leviathan, given a home', () => {
  const ring = { ...SEA_ARENA, r: SEA_RING.small };
  const at = { x: SEA_ARENA.x - 300, y: SEA_ARENA.y - 300 };
  /** A small boat (no flagship) at the ring's east side, under way across it to the west. */
  const under = () =>
    baseWorld({
      tier: 0,
      boat: { x: ring.x + ring.r * 0.7, y: ring.y, h: Math.PI, v: 120 },
    });

  it('keeps the buoys by default', () => {
    const e = new Leviathan(rng(1));
    expect(e.water).toBe(BUOY_WATER);
    expect(e.lev.trail[0]).toEqual(levPos(e.lev.th));
  });

  it("crawls round inside the ring from its spot's side, as fast along as at the buoys", () => {
    const e = new Leviathan(rng(1), levRing(at, ring));
    const R = ring.r * SEA_PATH;
    expect(Math.atan2(e.lev.y - ring.y, e.lev.x - ring.x)).toBeCloseTo(
      Math.atan2(at.y - ring.y, at.x - ring.x),
      6,
    );
    for (const p of e.lev.trail) expect(Math.hypot(p[0] - ring.x, p[1] - ring.y)).toBeCloseTo(R, 6);
    const w = baseWorld({ started: false, boat: { x: ring.x, y: ring.y, h: 0, v: 0 } });
    const x0 = e.lev.x;
    const y0 = e.lev.y;
    for (let i = 0; i < 60; i++) e.update(DT, w);
    expect(Math.hypot(e.lev.x - x0, e.lev.y - y0)).toBeCloseTo(LEV_SPEED * LEV_ORBIT, 0);
  });

  it('rises across the way of any boat under way, with room inside the ring, and again soon after', () => {
    const e = new Leviathan(rng(1), levRing(at, ring));
    let rises = 0;
    e.onRise = () => rises++;
    const w = under();
    e.update(DT, w);
    const r = e.lev.rise;
    if (!r) throw new Error('it should have risen');
    expect(r.d).toBeGreaterThanOrEqual(GUARD_NEAR);
    expect(Math.hypot(r.x - ring.x, r.y - ring.y)).toBeLessThanOrEqual(ring.r - SEA_KEEP);
    // Stopped, the boat lets it sink, and it is up again a few seconds after.
    w.boat.v = 0;
    let down = 0;
    for (let i = 0; i < 60 * 15 && !(down && e.lev.rise); i++) {
      e.update(DT, w);
      if (!e.lev.rise && !down) {
        down = i;
        w.boat.v = 120;
      }
    }
    expect(rises).toBe(2);
    expect(e.lev.cool).toBe(0);
  });

  it('waits while the boat heads out at the buoys, with no room to rise', () => {
    const e = new Leviathan(rng(1), levRing(at, ring));
    const w = baseWorld({ boat: { x: ring.x + ring.r - 60, y: ring.y, h: 0, v: 120 } });
    for (let i = 0; i < 60; i++) e.update(DT, w);
    expect(e.lev.rise).toBeNull();
  });

  it('keeps its hits from rise to rise, and driven off it is gone for good', () => {
    const e = new Leviathan(rng(1), levRing(at, ring));
    const w = under();
    const upNow = () => {
      for (let i = 0; i < 60 * 15 && !e.mark(w.boat); i++) e.update(DT, w);
      expect(e.mark(w.boat)).not.toBeNull();
    };
    upNow();
    expect(e.harpoon(1)).toBe(false);
    expect(e.resolve).toBe(2);
    // Let it sink, then up again: still two to go.
    w.boat.v = 0;
    for (let i = 0; i < 60 * 15 && e.lev.rise; i++) e.update(DT, w);
    w.boat.v = 120;
    for (let i = 0; i < 60 * (SEA_COOL + 1) && !e.lev.rise; i++) e.update(DT, w);
    upNow();
    expect(e.resolve).toBe(2);
    e.harpoon(1);
    expect(e.harpoon(1)).toBe(true);
    expect(e.done).toBe(true);
    for (let i = 0; i < 60 * 30; i++) e.update(DT, w);
    expect(e.lev.rise).toBeNull();
    expect(e.gone).toBe(true);
  });

  it('shoves a boat that runs into it back to its own side', () => {
    const e = new Leviathan(rng(1), levRing(at, ring));
    let hits = 0;
    e.onHit = () => hits++;
    const w = under();
    e.update(DT, w);
    const r = e.lev.rise;
    if (!r) throw new Error('it should have risen');
    // Straight on into it until it has risen enough to stand.
    for (let i = 0; i < 60 * 3 && !hits; i++) {
      w.boat.x += Math.cos(w.boat.h) * w.boat.v * DT;
      w.boat.y += Math.sin(w.boat.h) * w.boat.v * DT;
      e.update(DT, w);
    }
    expect(hits).toBe(1);
    expect(w.boat.v).toBe(0);
    expect((w.boat.x - r.x) * r.nx + (w.boat.y - r.y) * r.ny).toBeLessThan(-BODY_R);
  });
});

describe("the kid's map at sea", () => {
  const st = seaStart(1);

  it('starts with open water, and an old save has open water too', () => {
    expect(defaultBarge().isles).toEqual([]);
    expect(parseBarge({ size: 'small', where: 'sea', sea: { king: 1 } }).isles).toEqual([]);
  });

  it('puts an island where the water is tapped, and takes it away when it is tapped', () => {
    let m = seaIsleTap([], { x: -0.3, y: -0.2 });
    expect(m).toEqual([{ x: -0.3, y: -0.2 }]);
    m = seaIsleTap(m, { x: -0.3 + SEA_ISLE_R * 0.8, y: -0.2 });
    expect(m).toEqual([]);
  });

  it('keeps each island inside the buoys with a way round, off the boat, apart, and five at most', () => {
    expect(seaIsleNo([], { x: SEA_ISLE_REACH + 0.05, y: 0 })).toBe('edge');
    expect(SEA_ISLE_REACH + SEA_ISLE_R).toBeLessThan(0.9);
    expect(seaIsleNo([], { x: st.x - 0.1, y: st.y - 0.1 })).toBe('boat');
    const one = [{ x: -0.3, y: -0.3 }];
    expect(seaIsleNo(one, { x: -0.3 + SEA_ISLE_R * 2, y: -0.3 })).toBe('near');
    expect(seaIsleNo(one, { x: -0.3 + SEA_ISLE_R * 2 + SEA_ISLE_GAP + 0.01, y: -0.3 })).toBeNull();
    const full = [
      { x: -0.6, y: 0 },
      { x: 0, y: -0.6 },
      { x: -0.25, y: -0.25 },
      { x: 0.6, y: -0.2 },
      { x: -0.2, y: 0.6 },
    ];
    expect(full).toHaveLength(SEA_ISLES_MAX);
    for (const [k, i] of full.entries()) expect(seaIsleNo(full.slice(0, k), i)).toBeNull();
    expect(seaIsleNo(full, { x: 0.25, y: 0.3 })).toBe('full');
    expect(seaIsleTap(full, { x: 0.25, y: 0.3 })).toEqual(full);
  });

  it('reads a saved map back, dropping islands that cannot be where they are and any past the most', () => {
    const m = parseBarge({
      where: 'sea',
      isles: [
        { x: -0.3, y: -0.3 },
        { x: -0.32, y: -0.3 },
        { x: 0.95, y: 0 },
        { x: 'a', y: 0 },
        null,
        { x: 0.5, y: -0.3 },
      ],
    });
    expect(m.isles).toEqual([
      { x: -0.3, y: -0.3 },
      { x: 0.5, y: -0.3 },
    ]);
  });

  it("keeps the bosses' spots off the islands, in clear water inside the ring", () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      const r = SEA_RING[size];
      const spots = seaSpots(BARGE_MAX, r);
      // An island right on the first spot, and one on a spot of the back row.
      const on = (p: { x: number; y: number }) => ({ x: p.x / r, y: p.y / r });
      const isles = [
        on(spots[0] as { x: number; y: number }),
        on(spots[8] as { x: number; y: number }),
      ];
      for (const p of seaSpotsClear(spots, isles, r)) {
        for (const i of isles)
          expect(Math.hypot(p.x - i.x * r, p.y - i.y * r)).toBeGreaterThanOrEqual(
            SEA_ISLE_R * r + SEA_SHORE - 1e-6,
          );
        expect(Math.hypot(p.x, p.y)).toBeLessThan(r);
      }
      // With no islands they are where they were.
      expect(seaSpotsClear(spots, [], r)).toEqual(spots);
    }
  });

  it('has the leviathan rise only off the land', () => {
    const ring = { ...SEA_ARENA, r: SEA_RING.small };
    const land = (x: number, y: number) => Math.hypot(x - ring.x, y - ring.y) < 200;
    const water = levRing({ x: ring.x - 300, y: ring.y }, ring, land);
    // Heading through the middle, the first room ahead is past the island.
    const k = water.room(ring.x + 500, ring.y, Math.PI, 700);
    expect(k).toBeGreaterThan(0);
    expect(Math.abs(ring.x + 500 - k - ring.x)).toBeGreaterThanOrEqual(200);
    expect(
      levRing({ x: ring.x - 300, y: ring.y }, ring).room(ring.x + 500, ring.y, Math.PI, 500),
    ).toBe(500);
  });
});
