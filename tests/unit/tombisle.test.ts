import { describe, expect, it } from 'vitest';
import { DEEP_WATER, ROUTE } from '../../src/entities/reaper';
import { DOCKS, onLand, TOMB_DOCK } from '../../src/entities/walker';
import { DEEP, FAR, FARFAR, IY, pastFarFar, WS } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { ISLE3 } from '../../src/world/isle3';
import { ISLE5 } from '../../src/world/isle5';
import { createDeepSchools } from '../../src/world/schools';
import {
  berth16,
  buildMaze,
  CASTLE16_DOOR,
  COFFINS16,
  DOCK16,
  FOG16,
  fromTomb,
  GRAVES16,
  inMaze16,
  inStone16,
  isMaze,
  LANDING16,
  LEVER_REACH,
  LEVER16,
  MAZE16,
  nearIsle16,
  onIsle16,
  pushOffIsle16,
  SIGHT_LAND16,
  SIGHT16,
  STONES16,
  shoreR16,
  stepsFromWayIn,
  TOMB_ISLE,
  WALLS16,
  WAY_IN16,
  WAY_OUT16,
} from '../../src/world/tombisle';

const from = (x: number, y: number) => Math.hypot(x - TOMB_ISLE.x, y - TOMB_ISLE.y);

/** Every spot the figure can walk to from a start, on a grid this fine: a flood over the ground. */
function reach(x0: number, y0: number, step = 4): Set<string> {
  const k = (i: number, j: number) => `${i},${j}`;
  const out = new Set<string>();
  const i0 = Math.round(x0 / step);
  const j0 = Math.round(y0 / step);
  const todo: [number, number][] = [[i0, j0]];
  out.add(k(i0, j0));
  while (todo.length) {
    const [i, j] = todo.pop() as [number, number];
    for (const [a, b] of [
      [i + 1, j],
      [i - 1, j],
      [i, j + 1],
      [i, j - 1],
    ] as [number, number][]) {
      if (out.has(k(a, b)) || !onLand(a * step, b * step)) continue;
      out.add(k(a, b));
      todo.push([a, b]);
    }
  }
  return out;
}
const has = (s: Set<string>, x: number, y: number, step = 4) =>
  [-1, 0, 1].some((a) =>
    [-1, 0, 1].some((b) => s.has(`${Math.round(x / step) + a},${Math.round(y / step) + b}`)),
  );

describe('Tomb Island', () => {
  it('stands in the middle of a fog sea of its own, far from everything else, its way in a wall of fog past the white buoys', async () => {
    const { FOG_EXIT, FOG_GATE, FOG_IN, FOG_OUT, FOG_SEA, inFogSea } = await import(
      '../../src/world/fogsea'
    );
    const { ISLE6 } = await import('../../src/world/isle6');
    expect(inFogSea(TOMB_ISLE.x, TOMB_ISLE.y)).toBe(true);
    // The whole island and its fog inside the fog sea; the fog sea well past everything at sea.
    expect(TOMB_ISLE.x - TOMB_ISLE.r - FOG16).toBeGreaterThan(FOG_SEA.x0);
    expect(TOMB_ISLE.x + TOMB_ISLE.r + FOG16).toBeLessThan(FOG_SEA.x1);
    expect(FOG_SEA.x1).toBeLessThan(-(DEEP + FAR + FARFAR) - 1000);
    // Bigger than island 6 (the kid's ask), round a maze the size it was.
    expect(TOMB_ISLE.r).toBeGreaterThan(ISLE6.r);
    for (let a = 0; a < Math.PI * 2; a += 0.01)
      expect(shoreR16(a)).toBeLessThanOrEqual(TOMB_ISLE.r);
    // The way in: a wall of fog past the white buoys (the kid's word), due west of home, inside the sea's edge and in
    // open water, well clear of every island out there.
    expect(pastFarFar(FOG_GATE.x, FOG_GATE.y)).toBe(true);
    expect(FOG_GATE.x - FOG_GATE.r).toBeGreaterThan(-(DEEP + FAR + FARFAR) + 400);
    expect(FOG_GATE.y).toBe(IY);
    const { ISLE14 } = await import('../../src/world/garden');
    const { ENDLESS13 } = await import('../../src/world/endless');
    const { ICE_FLOE } = await import('../../src/world/icefloe');
    const { ISLE12 } = await import('../../src/world/isle12');
    for (const i of [ISLE2, ISLE3, ISLE5, ISLE14, ENDLESS13, ICE_FLOE, ISLE12])
      expect(Math.hypot(i.x - FOG_GATE.x, i.y - FOG_GATE.y)).toBeGreaterThan(i.r + 800);
    // Coming out of either wall lands clear of both walls, so nobody bounces straight back.
    expect(inFogSea(FOG_IN.x, FOG_IN.y)).toBe(true);
    expect(Math.hypot(FOG_IN.x - FOG_EXIT.x, FOG_IN.y - FOG_EXIT.y)).toBeGreaterThan(
      FOG_EXIT.r + 60,
    );
    expect(Math.hypot(FOG_OUT.x - FOG_GATE.x, FOG_OUT.y - FOG_GATE.y)).toBeGreaterThan(
      FOG_GATE.r + 60,
    );
    expect(pastFarFar(FOG_OUT.x, FOG_OUT.y)).toBe(true);
    expect(inFogSea(DOCK16.x, DOCK16.y)).toBe(true);
    expect(WS).toBe(4800);
  });

  it('is big: much bigger than Goat Isle, with a maze of over a hundred corridors', () => {
    let cells = 0;
    for (let i = 0; i < 15; i++) for (let j = 0; j < 15; j++) if (isMaze(i, j)) cells++;
    expect(cells).toBeGreaterThan(100);
    expect(TOMB_ISLE.r * 2).toBeGreaterThan(1700);
  });

  it('lays out the same maze every time, every corridor joined to every other one way only', () => {
    expect(buildMaze()).toEqual(MAZE16);
    // A tree: cells - 1 openings between corridor cells.
    let cells = 0;
    let open = 0;
    for (let i = 0; i < 15; i++)
      for (let j = 0; j < 15; j++) {
        if (!isMaze(i, j)) continue;
        cells++;
        if (isMaze(i + 1, j) && !MAZE16.vert[i + 1]?.[j]) open++;
        if (isMaze(i, j + 1) && !MAZE16.horz[i]?.[j + 1]) open++;
      }
    expect(open).toBe(cells - 1);
    expect(MAZE16.deadEnds.length).toBeGreaterThan(10);
  });

  it('can be walked from the jetty through the way in, through the maze to the castle door, and out the way out', () => {
    const ground = reach(LANDING16.x, LANDING16.y);
    const [ix, iy] = fromTomb(WAY_IN16.u, WAY_IN16.v - 20);
    const [ox, oy] = fromTomb(WAY_OUT16.u, WAY_OUT16.v + 20);
    expect(has(ground, ix, iy)).toBe(true);
    expect(has(ground, CASTLE16_DOOR.x, CASTLE16_DOOR.y)).toBe(true);
    expect(has(ground, ox, oy)).toBe(true);
    // And every coffin can be walked up to, at its open end.
    for (const c of COFFINS16) {
      const mx = (c.x0 + c.x1) / 2;
      const my = (c.y0 + c.y1) / 2;
      const near = [...ground].some((s) => {
        const [a, b] = s.split(',').map(Number) as [number, number];
        return Math.hypot(a * 4 - mx, b * 4 - my) < 26;
      });
      expect(near).toBe(true);
    }
  });

  it('puts the lever in the dead end furthest from the way in, where a coffin would be, and it can be walked up to', () => {
    const steps = stepsFromWayIn();
    for (const d of MAZE16.deadEnds)
      expect(steps.get(d.i * 15 + d.j) ?? 0).toBeLessThanOrEqual(LEVER16.steps);
    expect(LEVER16.steps).toBeGreaterThan(20);
    expect(COFFINS16.some((c) => c.i === LEVER16.i && c.j === LEVER16.j)).toBe(false);
    expect(onIsle16(LEVER16.x, LEVER16.y)).toBe(false);
    expect(onIsle16(LEVER16.front.x, LEVER16.front.y)).toBe(true);
    expect(Math.hypot(LEVER16.front.x - LEVER16.x, LEVER16.front.y - LEVER16.y)).toBeLessThan(
      LEVER_REACH,
    );
    const ground = reach(LANDING16.x, LANDING16.y);
    expect(has(ground, LEVER16.front.x, LEVER16.front.y)).toBe(true);
    // The fog ashore leaves about a corridor's width seen round the figure.
    expect(SIGHT_LAND16).toBeGreaterThan(56);
    expect(SIGHT_LAND16).toBeLessThan(112);
  });

  it('keeps the figure out of its walls, its castle, its coffins and its stones', () => {
    for (const w of WALLS16) expect(onIsle16((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2)).toBe(false);
    for (const c of COFFINS16) expect(onIsle16((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2)).toBe(false);
    for (const s of STONES16) expect(onIsle16(s.x, s.y)).toBe(false);
    for (const g of GRAVES16) expect(onIsle16(g.hx, g.hy)).toBe(false);
    expect(inStone16(TOMB_ISLE.x, TOMB_ISLE.y)).toBe(true);
    expect(onIsle16(LANDING16.x, LANDING16.y)).toBe(true);
    expect(onLand(LANDING16.x, LANDING16.y)).toBe(true);
  });

  it('ties the boat up at the jetty, bow in, clear of what pushes a hull off', () => {
    expect(DOCKS).toContain(TOMB_DOCK);
    for (const k of [0.8, 1, 1.5]) {
      const b = berth16(k);
      const s = { x: b.x, y: b.y, v: 1 };
      pushOffIsle16(s, 24 * k);
      expect(Math.hypot(s.x - b.x, s.y - b.y)).toBeLessThan(1);
      expect(Math.hypot(b.x - DOCK16.x, b.y - DOCK16.y)).toBeLessThan(DOCK16.r);
    }
  });

  it('is sighted inside its fog, before the boat could run into it', () => {
    expect(SIGHT16).toBeLessThan(FOG16);
    expect(SIGHT16).toBeGreaterThan(24 * 1.5 + 60);
    expect(nearIsle16(DOCK16.x, DOCK16.y, SIGHT16)).toBe(true);
    // Sighted before the boat can reach the jetty's dock ring, so the shop never opens over the first look at it.
    expect(TOMB_ISLE.r + SIGHT16).toBeGreaterThan(from(DOCK16.x, DOCK16.y) + DOCK16.r);
  });

  it('keeps the Reaper’s roaming route off it', () => {
    for (let i = 0; i < ROUTE.length; i++) {
      const a = ROUTE[i] as { x: number; y: number };
      const b = ROUTE[(i + 1) % ROUTE.length] as { x: number; y: number };
      for (let t = 0; t <= 1; t += 0.01)
        expect(from(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)).toBeGreaterThan(
          TOMB_ISLE.r + 60,
        );
    }
    const p = { x: TOMB_ISLE.x + 10, y: TOMB_ISLE.y };
    DEEP_WATER.keep(p);
    expect(from(p.x, p.y)).toBeGreaterThan(TOMB_ISLE.r);
  });

  it('keeps the deep’s fish schools out of the fog wall', async () => {
    const { FOG_GATE } = await import('../../src/world/fogsea');
    for (const s of createDeepSchools())
      expect(Math.hypot(s.ax - FOG_GATE.x, s.ay - FOG_GATE.y)).toBeGreaterThan(
        FOG_GATE.r * 2.4 + s.r + 60,
      );
  });

  it('knows the maze corridors, where companions walk single file: not the square, not outside', () => {
    expect(inMaze16(...fromTomb(WAY_IN16.u, WAY_IN16.v - 20))).toBe(true);
    expect(inMaze16(TOMB_ISLE.x, TOMB_ISLE.y)).toBe(false);
    expect(inMaze16(LANDING16.x, LANDING16.y)).toBe(false);
  });
});
