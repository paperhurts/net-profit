import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import {
  BOARD_REACH,
  berth,
  blocked,
  bridgeFrame,
  groundZ,
  HOP,
  LANDING,
  MOOR_TIME,
  onLand,
  PIER_WALK,
  PRINT_LIFE,
  PROPS,
  STRIDE,
  WALK_SPEED,
  Walker,
  walkable,
  walkerDepth,
} from '../../src/entities/walker';
import {
  BEACH,
  BRIDGE,
  BRIDGE_PARTS,
  BRIDGE_SOUTH,
  bridgeAt,
  bridgePartDepth,
  DOCK,
  IR,
  IX,
  IY,
  PIER_BUMPS,
  PX0,
  SMOKEHOUSE,
  STALL,
  TWX,
  TWY,
  TX,
  TY,
} from '../../src/world/island';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const SPAN = Math.hypot(BRIDGE.bx - BRIDGE.ax, BRIDGE.by - BRIDGE.ay);
const HULLS = [1, 1.1, 1.2, 1.32, 1.45, 1.6];

/** The stick's screen vector for a world direction, full deflection. */
function stick(wx: number, wy: number): [number, number] {
  const sx = wx - wy;
  const sy = (wx + wy) / 2;
  const n = Math.hypot(sx, sy) || 1;
  return [sx / n, sy / n];
}

/** A docked boat, a little off its berth and still moving, as a player leaves it. */
function docked(k = 1, over: Partial<World> = {}): World {
  return baseWorld({
    docked: true,
    hullScale: k,
    boat: { x: DOCK.x + 40, y: DOCK.y + 60, h: 0.8, v: 90 },
    ...over,
  });
}

/** Step ashore and run until the figure has landed. */
function ashore(w: World): Walker {
  const p = new Walker();
  p.stepAshore();
  for (let i = 0; i < (MOOR_TIME + HOP + 0.2) / DT; i++) p.update(DT, w);
  return p;
}

/** Hold the stick in a world direction for this many seconds, checking the figure stays on dry land. */
function walk(p: Walker, w: World, wx: number, wy: number, secs: number): void {
  const [ix, iy] = stick(wx, wy);
  for (let i = 0; i < secs / DT; i++) {
    p.intent(ix, iy);
    p.update(DT, w);
    expect(
      walkable(p.x, p.y, w.build),
      `off dry land at ${p.x.toFixed(1)}, ${p.y.toFixed(1)}`,
    ).toBe(true);
  }
}

/** Every grid cell reachable on foot from the landing, at this palace stage. */
function reachable(build: number, step = 3): Set<string> {
  const key = (i: number, j: number) => `${i},${j}`;
  const seen = new Set<string>();
  const i0 = Math.round(LANDING.x / step);
  const j0 = Math.round(LANDING.y / step);
  const queue: [number, number][] = [[i0, j0]];
  seen.add(key(i0, j0));
  while (queue.length) {
    const [i, j] = queue.pop() as [number, number];
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const ni = i + di;
      const nj = j + dj;
      const k = key(ni, nj);
      if (seen.has(k) || !walkable(ni * step, nj * step, build)) continue;
      seen.add(k);
      queue.push([ni, nj]);
    }
  }
  return seen;
}
const reaches = (cells: Set<string>, x: number, y: number, step = 3) =>
  [-1, 0, 1].some((a) =>
    [-1, 0, 1].some((b) => cells.has(`${Math.round(x / step) + a},${Math.round(y / step) + b}`)),
  );

describe('dry land', () => {
  it('is the island, the pier, the bridge deck and the beach, and not the sea', () => {
    expect(onLand(IX, IY)).toBe(true);
    expect(onLand(IX + IR - 14, IY + 4)).toBe(true);
    // Not at the very edge, where a figure on the far side would seem to stand in the water.
    expect(onLand(IX - IR + 6, IY)).toBe(false);
    expect(onLand(IX - IR - 2, IY)).toBe(false);
    expect(onLand(LANDING.x, LANDING.y)).toBe(true);
    expect(onLand(PIER_WALK.x1 + 4, IY)).toBe(false);
    expect(onLand(PX0 + 60, IY + 22)).toBe(false);
    const mid = bridgeAt(SPAN / 2);
    expect(onLand(mid[0], mid[1])).toBe(true);
    // Off the side of the deck is the sea, under the rails.
    expect(onLand(mid[0] + BRIDGE_SOUTH[0] * 12, mid[1] + BRIDGE_SOUTH[1] * 12)).toBe(false);
    expect(onLand(BEACH.x, BEACH.y)).toBe(true);
    expect(onLand(BEACH.x + BEACH.r, BEACH.y)).toBe(false);
  });

  it('stands on the planks at their height and steps up onto them', () => {
    expect(groundZ(IX, IY)).toBe(0);
    expect(groundZ(LANDING.x, LANDING.y)).toBe(7);
    expect(groundZ(PX0 + 3, IY)).toBeGreaterThan(0);
    expect(groundZ(PX0 + 3, IY)).toBeLessThan(7);
    const mid = bridgeAt(SPAN / 2);
    expect(groundZ(mid[0], mid[1])).toBe(BRIDGE.z + 4);
    const end = bridgeAt(4);
    expect(groundZ(end[0], end[1])).toBeLessThan(BRIDGE.z + 4);
  });

  it('is in the way where things stand, and the later buildings only once they are built', () => {
    expect(blocked(IX + 50, IY - 95, 0)).toBe(true); // the hut
    expect(blocked(TX, TY, 0)).toBe(true); // the palace tree
    expect(blocked(TWX + 9, TWY + 9, 0)).toBe(false);
    expect(blocked(TWX + 9, TWY + 9, 4)).toBe(true);
    expect(blocked(STALL.x, STALL.y, 3)).toBe(false);
    expect(blocked(STALL.x, STALL.y, 4)).toBe(true);
    expect(blocked(SMOKEHOUSE.x, SMOKEHOUSE.y, 4)).toBe(false);
    expect(blocked(SMOKEHOUSE.x, SMOKEHOUSE.y, 5)).toBe(true);
    expect(blocked(LANDING.x, LANDING.y, 5)).toBe(false);
  });

  it('reaches every part of the island from the landing, built up or not', () => {
    for (const build of [0, 5]) {
      const cells = reachable(build);
      // Past the crates and down the pier, round the island, over the bridge to the beach.
      expect(reaches(cells, PX0 + 20, IY), `pier root, build ${build}`).toBe(true);
      expect(reaches(cells, IX, IY + 60), `island, build ${build}`).toBe(true);
      expect(reaches(cells, IX + 50, IY - 60), `the hut's front, build ${build}`).toBe(true);
      expect(reaches(cells, IX - 120, IY + 120), `the far shore, build ${build}`).toBe(true);
      expect(reaches(cells, BEACH.x, BEACH.y), `the beach, build ${build}`).toBe(true);
      const mid = bridgeAt(SPAN / 2);
      expect(reaches(cells, mid[0], mid[1]), `the bridge, build ${build}`).toBe(true);
    }
  });
});

describe('the berth', () => {
  it('is in the dock ring, bow in at the pier end, clear of everything that pushes a hull', () => {
    for (const k of HULLS) {
      const b = berth(k);
      expect(Math.hypot(b.x - DOCK.x, b.y - DOCK.y)).toBeLessThan(DOCK.r - 20);
      const bow = b.x - 34 * k;
      expect(bow - (PX0 + 155)).toBeGreaterThanOrEqual(4);
      expect(bow - (PX0 + 155)).toBeLessThan(10);
      for (const p of PIER_BUMPS)
        expect(Math.hypot(b.x - p[0], b.y - p[1])).toBeGreaterThan(20 + 20 * k);
      expect(Math.hypot(b.x - IX, b.y - IY)).toBeGreaterThan(IR + 24 * k);
    }
  });
});

describe('stepping ashore', () => {
  it('brings the boat round to its berth, stops it, then hops the figure onto the planks', () => {
    for (const k of [1, 1.6]) {
      const w = docked(k);
      const p = new Walker();
      let landed = 0;
      let hops = 0;
      p.onLand = () => landed++;
      p.onHop = () => hops++;
      expect(p.stepAshore()).toBe(true);
      expect(p.stepAshore()).toBe(false);
      p.update(DT, w);
      expect(p.state).toBe('mooring');
      expect(w.boat.v).toBe(0);
      expect(p.shown).toBe(false);
      for (let i = 0; i < MOOR_TIME / DT + 2; i++) p.update(DT, w);
      const b = berth(k);
      expect(w.boat.x).toBeCloseTo(b.x, 6);
      expect(w.boat.y).toBeCloseTo(b.y, 6);
      expect(w.boat.h).toBeCloseTo(b.h, 6);
      expect(p.state).toBe('off');
      expect(p.shown).toBe(true);
      for (let i = 0; i < HOP / DT + 2; i++) p.update(DT, w);
      expect(p.state).toBe('ashore');
      expect(p.x).toBeCloseTo(LANDING.x, 6);
      expect(p.y).toBeCloseTo(LANDING.y, 6);
      expect(p.z).toBe(7);
      expect(landed).toBe(1);
      expect(hops).toBe(1);
      // The way back is offered after a walk, not under the thumb that lands to start one.
      expect(p.nearBoat).toBe(false);
    }
  });

  it('only from aboard', () => {
    const p = ashore(docked());
    expect(p.stepAshore()).toBe(false);
  });
});

describe('walking', () => {
  it('goes where the stick points at the same speed every way, and the boat stays put', () => {
    const w = docked();
    const p = ashore(w);
    const boat = { ...w.boat };
    const x0 = p.x;
    walk(p, w, -1, 0, 1);
    // Up the pier: past the crates along the front edge and on toward the island.
    expect(x0 - p.x).toBeGreaterThan(WALK_SPEED * 0.75);
    expect(w.boat).toEqual(boat);
    // Across the island, north and then south-west, once into its stride: the same pace on screen-up as screen-sideways.
    walk(p, w, -1, 0, 1);
    const pace = (wx: number, wy: number) => {
      walk(p, w, wx, wy, 0.3);
      const a = { x: p.x, y: p.y };
      walk(p, w, wx, wy, 0.4);
      return Math.hypot(p.x - a.x, p.y - a.y) / 0.4;
    };
    expect(pace(0, -1)).toBeCloseTo(WALK_SPEED, 0);
    expect(pace(-1, 1)).toBeCloseTo(WALK_SPEED, 0);
    expect(p.h).toBeCloseTo((3 * Math.PI) / 4, 1);
  });

  it('cannot walk off the end of the pier, off the shore or through the hut', () => {
    const w = docked();
    const p = ashore(w);
    walk(p, w, 1, 0, 2);
    expect(p.x).toBeLessThanOrEqual(PIER_WALK.x1);
    walk(p, w, 0, 1, 1);
    expect(p.y).toBeLessThanOrEqual(PIER_WALK.y1);
    // Down the pier and straight at the hut from the south.
    walk(p, w, -1, 0, 2.2);
    p.x = IX + 50;
    p.y = IY - 30;
    walk(p, w, 0, -1, 2);
    expect(p.y).toBeGreaterThan(IY - 70);
    // And out to sea from the middle of the island.
    p.x = IX;
    p.y = IY + 40;
    walk(p, w, 0.2, 1, 4);
    expect(Math.hypot(p.x - IX, p.y - IY)).toBeLessThanOrEqual(IR);
  });

  it('slides along the shore when it walks at it on a slant', () => {
    const w = docked();
    const p = ashore(w);
    p.x = IX;
    p.y = IY + 150;
    walk(p, w, 1, 1, 1.5);
    const a = Math.atan2(p.y - IY, p.x - IX);
    walk(p, w, 1, 1, 1);
    // Pushed into the shore at forty-five degrees, it keeps going round it.
    expect(Math.atan2(p.y - IY, p.x - IX)).not.toBeCloseTo(a, 1);
  });

  it('crosses the bridge to the beach with the stick held off its line either way', () => {
    for (const off of [-0.26, 0.26]) {
      const w = docked();
      const p = ashore(w);
      const start = bridgeAt(-12);
      p.x = start[0];
      p.y = start[1];
      const a = Math.atan2(BRIDGE.by - BRIDGE.ay, BRIDGE.bx - BRIDGE.ax) + off;
      const [ix, iy] = stick(Math.cos(a), Math.sin(a));
      let t = 0;
      while (Math.hypot(p.x - BEACH.x, p.y - BEACH.y) > BEACH.r - 20 && t < 10) {
        p.intent(ix, iy);
        p.update(DT, w);
        t += DT;
      }
      expect(t, `stuck on the bridge, off ${off}`).toBeLessThan((SPAN / WALK_SPEED) * 1.6);
      expect(bridgeFrame(p.x, p.y)[0]).toBeGreaterThan(SPAN);
    }
  });

  it('leaves footprints in the sand, not on the planks, and they fade', () => {
    const w = docked();
    const p = ashore(w);
    walk(p, w, -1, 0, 0.8);
    expect(p.prints.length).toBe(0);
    walk(p, w, -1, 0, 1.4);
    walk(p, w, -1, 1, 1);
    const n = p.prints.length;
    expect(n).toBeGreaterThan((WALK_SPEED * 0.8) / STRIDE);
    for (const q of p.prints) expect(groundZ(q.x, q.y)).toBe(0);
    for (let i = 0; i < 60; i++) {
      w.T += PRINT_LIFE / 30;
      p.intent(0, 0);
      p.update(DT, w);
    }
    expect(p.prints.length).toBe(0);
  });
});

describe('going back aboard', () => {
  it('only from the end of the pier, then hops onto the bow and hands back the wheel', () => {
    const w = docked();
    const p = ashore(w);
    let boarded = 0;
    p.onBoard = () => boarded++;
    walk(p, w, -1, 0, 1);
    expect(p.nearBoat).toBe(false);
    expect(p.goAboard()).toBe(false);
    walk(p, w, 1, 0, 1.2);
    expect(Math.hypot(p.x - LANDING.x, p.y - LANDING.y)).toBeLessThan(BOARD_REACH);
    expect(p.goAboard()).toBe(true);
    expect(p.state).toBe('on');
    for (let i = 0; i < HOP / DT + 2; i++) p.update(DT, w);
    expect(p.state).toBe('aboard');
    expect(p.aboard).toBe(true);
    expect(p.shown).toBe(false);
    expect(boarded).toBe(1);
  });

  it('starts over aboard, with the sand smoothed', () => {
    const w = docked();
    const p = ashore(w);
    walk(p, w, -1, 0, 2.5);
    p.reset();
    expect(p.state).toBe('aboard');
    expect(p.prints.length).toBe(0);
  });
});

describe('sorting the figure among the solids', () => {
  const k = 1;
  const b = berth(k);
  const boatD = b.x + b.y;
  const pierD = boatD - 1;
  const dog = { x: PX0 + 40, y: IY, d: boatD + 2 };
  const hutD = IX + 80 + (IY - 70);

  it('stands on the pier over the planks and the boat, and before or behind the dog', () => {
    expect(walkerDepth(LANDING.x, LANDING.y, 0, pierD, null)).toBeGreaterThan(boatD);
    expect(walkerDepth(dog.x + 10, IY + 10, 1, pierD, dog)).toBeGreaterThan(dog.d);
    expect(walkerDepth(dog.x - 10, IY - 8, 1, pierD, dog)).toBeLessThan(dog.d);
    expect(walkerDepth(dog.x - 10, IY - 8, 1, pierD, dog)).toBeGreaterThan(boatD);
    // In the air between the bow and the planks, over both.
    expect(walkerDepth(b.x - 30, IY, 0, pierD, null, true)).toBeGreaterThan(boatD);
  });

  it('stands in front of the pier from the sand beside it, and in front of the dog', () => {
    const near = { x: PX0 + 15, y: IY + 5, d: dog.d };
    expect(walkerDepth(PX0 + 15, IY + 24, 1, pierD, near)).toBeGreaterThan(near.d);
    expect(walkerDepth(PX0 + 12, IY + 24, 0, pierD, null)).toBeGreaterThan(pierD);
    expect(walkerDepth(PX0 + 8, IY - 26, 0, pierD, null)).toBeLessThan(pierD);
  });

  it('goes in front of the hut past its east and south walls, and behind it past the others', () => {
    expect(walkerDepth(IX + 88, IY - 110, 0, pierD, null)).toBeGreaterThan(hutD);
    expect(walkerDepth(IX + 30, IY - 62, 0, pierD, null)).toBeGreaterThan(hutD);
    expect(walkerDepth(IX + 12, IY - 80, 0, pierD, null)).toBeLessThan(hutD);
    expect(walkerDepth(IX + 70, IY - 128, 0, pierD, null)).toBeLessThan(hutD);
  });

  it('goes in front of the palace tree south of its trunk and behind it to the north', () => {
    const treeD = TX + TY + 30;
    expect(walkerDepth(TX + 2, TY + 16, 3, pierD, null)).toBeGreaterThan(treeD);
    expect(walkerDepth(TX - 2, TY - 16, 3, pierD, null)).toBeLessThan(treeD);
  });

  it('stands on its part of the bridge, under the part nearer and over the part beyond', () => {
    const seg = SPAN / BRIDGE_PARTS;
    for (let i = 1; i < BRIDGE_PARTS - 1; i++) {
      const q = bridgeAt(seg * (i + 0.5) + 6, 3);
      const d = walkerDepth(q[0], q[1], 0, pierD, null);
      expect(d).toBeGreaterThan(bridgePartDepth(i));
      expect(d).toBeLessThan(bridgePartDepth(i - 1));
      expect(d).toBeGreaterThan(bridgePartDepth(i + 1));
    }
    // On the beach south of the bridge's end it stands in front of it, and behind it to the north.
    const s = bridgeAt(SPAN - 6, -24);
    expect(walkerDepth(s[0], s[1], 0, pierD, null)).toBeGreaterThan(
      bridgePartDepth(BRIDGE_PARTS - 1),
    );
    const n = bridgeAt(SPAN - 6, 24);
    expect(walkerDepth(n[0], n[1], 0, pierD, null)).toBeLessThan(bridgePartDepth(BRIDGE_PARTS - 1));
  });

  it('always has a depth, wherever it can stand', () => {
    for (const build of [0, 5])
      for (const d of [null, dog])
        for (let x = IX - 600; x <= PX0 + 160; x += 6)
          for (let y = IY - 320; y <= IY + 220; y += 6)
            if (walkable(x, y, build))
              expect(Number.isFinite(walkerDepth(x, y, build, pierD, d))).toBe(true);
  });

  it('sorts against everything that stands in the way, built when the game builds it', () => {
    expect(PROPS.filter((p) => p.from === 4).length).toBe(2);
    expect(PROPS.filter((p) => p.from === 5).length).toBe(1);
  });
});
