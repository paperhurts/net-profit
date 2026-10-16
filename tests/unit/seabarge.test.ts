import { describe, expect, it } from 'vitest';
import {
  BARGE_MAX,
  defaultBarge,
  FRAME_H,
  FRAME_W,
  noSeaPick,
  parseBarge,
  SEA_ARENA,
  SEA_FOES,
  SEA_NAMES,
  SEA_RING,
  SEA_ZOOM_MAX,
  SEA_ZOOM_MIN,
  seaAdd,
  seaBuoys,
  seaFrame,
  seaSpots,
  seaStart,
  seaTotal,
} from '../../src/data/barge';
import { DeepOne, LAIR6, seaDeepHome } from '../../src/entities/deepone';
import { EAST_DEEP, Gulper, seaZone } from '../../src/entities/gulper';
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
    expect(b.sea).toEqual({ meteor: 1, king: 0, deep: 0, reaper: 0, gulper: 0 });
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
    expect(sea.sea).toEqual({ meteor: 0, king: 2, deep: BARGE_MAX - 2, reaper: 0, gulper: 0 });
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
