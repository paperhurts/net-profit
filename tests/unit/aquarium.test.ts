import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { SPECIES } from '../../src/data/tuning';
import { blocked, LANDING, walkable } from '../../src/entities/walker';
import {
  keepOf,
  LABEL_T,
  LIONFISH_LOOK,
  PINCH,
  PUFF_T,
  SNOOK_LOOK,
  speciesLook,
  TANK_W,
  Tank,
  tankKinds,
} from '../../src/render/tank';
import {
  AQUARIUM,
  AQUARIUM_COST,
  AQUARIUM_FROM,
  AQUARIUM_MID,
  nearAquarium,
} from '../../src/world/aquarium';
import { IR, IX, IY } from '../../src/world/island';

const DT = 1 / 60;
const { x0, y0, x1, y1 } = AQUARIUM;

/** Every grid cell reachable on foot from the landing, at this palace stage. */
function reachable(build: number, step = 3): Set<string> {
  const key = (i: number, j: number) => `${i},${j}`;
  const seen = new Set<string>([key(Math.round(LANDING.x / step), Math.round(LANDING.y / step))]);
  const queue: [number, number][] = [[Math.round(LANDING.x / step), Math.round(LANDING.y / step)]];
  while (queue.length) {
    const [i, j] = queue.pop() as [number, number];
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const k = key(i + di, j + dj);
      if (seen.has(k) || !walkable((i + di) * step, (j + dj) * step, build)) continue;
      seen.add(k);
      queue.push([i + di, j + dj]);
    }
  }
  return seen;
}

/** Everything caught once, the way a save's log counts it. */
const ALL = SPECIES.map(() => 50);

function stocked(log: readonly number[] = ALL, seed = 3): Tank {
  const t = new Tank(rng(seed));
  t.resize(260);
  t.stock(tankKinds(SPECIES, log, 1, 1));
  return t;
}

describe('the aquarium on the home island', () => {
  it('has its plot on dry land, staked out with the tree platform and in the way from then on', () => {
    for (const [x, y] of [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ] as const)
      expect(Math.hypot(x - IX, y - IY), 'a corner off the island').toBeLessThan(IR - 14);
    expect(blocked(AQUARIUM_MID.x, AQUARIUM_MID.y, AQUARIUM_FROM - 1)).toBe(false);
    expect(blocked(AQUARIUM_MID.x, AQUARIUM_MID.y, AQUARIUM_FROM)).toBe(true);
    expect(AQUARIUM_COST.wood).toBeGreaterThan(0);
    expect(AQUARIUM_COST.coins).toBeGreaterThan(0);
  });

  it('can be walked up to from the landing, and looked into from in front of its glass', () => {
    for (const build of [AQUARIUM_FROM, 5]) {
      const cells = reachable(build);
      // In front of each face the viewer sees: the south one and the east one.
      for (const [x, y] of [
        [AQUARIUM_MID.x, y1 + 10],
        [x1 + 10, AQUARIUM_MID.y],
      ] as const) {
        expect(
          cells.has(`${Math.round(x / 3)},${Math.round(y / 3)}`),
          `cannot reach ${x}, ${y}`,
        ).toBe(true);
        expect(nearAquarium(x, y)).toBe(true);
      }
    }
    expect(nearAquarium(LANDING.x, LANDING.y)).toBe(false);
    expect(nearAquarium(AQUARIUM_MID.x, y1 + 40)).toBe(false);
  });
});

describe('who lives in the tank', () => {
  it('is every species caught, a few of the little ones and one of the big', () => {
    const log = SPECIES.map(() => 0);
    log[0] = 40; // sardines: little, so three
    log[4] = 9; // tuna: big, so one
    log[5] = 1; // a single goldfin: only the one caught
    const kinds = tankKinds(SPECIES, log, 0, 0);
    expect(kinds.map((k) => k.look.name)).toEqual(['Sardine', 'Tuna', 'Goldfin']);
    expect(kinds.map((k) => k.n)).toEqual([3, 1, 1]);
    const tuna = SPECIES[4];
    if (!tuna) throw new Error('no tuna');
    expect(keepOf(speciesLook(tuna, 4).len)).toBe(1);
    expect(
      tankKinds(
        SPECIES,
        SPECIES.map(() => 0),
        0,
        0,
      ),
    ).toEqual([]);
  });

  it('takes the lionfish once one is caught, and the snook once one is landed', () => {
    const none = SPECIES.map(() => 0);
    expect(tankKinds(SPECIES, none, 0, 0)).toHaveLength(0);
    expect(tankKinds(SPECIES, none, 3, 0).map((k) => k.look)).toEqual([LIONFISH_LOOK]);
    expect(tankKinds(SPECIES, none, 0, 1).map((k) => k.look)).toEqual([SNOOK_LOOK]);
  });

  it('keeps the fish it has when stocked again, and drops a new kind in from the top with its name', () => {
    const log = SPECIES.map(() => 0);
    log[0] = 5;
    const t = new Tank(rng(1));
    t.resize(260);
    t.stock(tankKinds(SPECIES, log, 0, 0));
    const first = [...t.fish];
    expect(first.every((f) => f.label === 0)).toBe(true);
    log[15] = 1; // a marlin
    t.stock(tankKinds(SPECIES, log, 0, 0));
    expect(t.fish).toHaveLength(first.length + 1);
    for (const f of first) expect(t.fish).toContain(f);
    const marlin = t.fish.find((f) => f.look.name === 'Marlin');
    expect(marlin?.label).toBeGreaterThan(LABEL_T);
    expect(marlin?.y).toBeLessThan(t.h * 0.2);
  });
});

describe('playing with the fish', () => {
  it('keeps every fish in the water, under the surface and over the sand, as they wander', () => {
    const t = stocked();
    for (let i = 0; i < 60 / DT; i++) t.update(DT);
    for (const f of t.fish) {
      expect(f.x).toBeGreaterThan(0);
      expect(f.x).toBeLessThan(TANK_W);
      expect(f.y).toBeGreaterThan(t.top);
      expect(f.y).toBeLessThan(t.floor);
    }
    // They move about rather than sit.
    const at = t.fish.map((f) => [f.x, f.y]);
    for (let i = 0; i < 6 / DT; i++) t.update(DT);
    const moved = t.fish.filter(
      (f, i) => Math.hypot(f.x - (at[i]?.[0] ?? 0), f.y - (at[i]?.[1] ?? 0)) > 10,
    );
    expect(moved.length).toBeGreaterThan(t.fish.length * 0.6);
  });

  it('drops food where the water is tapped, and the fish eat it', () => {
    const t = stocked();
    expect(t.tap(TANK_W * 0.5, t.top + 2)).toBeNull();
    expect(t.flakes).toHaveLength(PINCH);
    t.feed(TANK_W * 0.2);
    for (let i = 0; i < 12 / DT && t.flakes.length; i++) t.update(DT);
    expect(t.eaten).toBe(PINCH * 2);
    expect(t.flakes).toHaveLength(0);
  });

  it('brings the fish to a finger held in the tank', () => {
    const t = stocked();
    const finger = { x: TANK_W * 0.8, y: t.h * 0.6 };
    const far = () =>
      t.fish.reduce((s, f) => s + Math.hypot(f.x - finger.x, f.y - finger.y), 0) / t.fish.length;
    const before = far();
    t.finger = finger;
    for (let i = 0; i < 6 / DT; i++) t.update(DT);
    expect(far()).toBeLessThan(Math.min(before * 0.5, 70));
    // Let go, and they go back to wandering.
    t.finger = null;
    for (let i = 0; i < 20 / DT; i++) t.update(DT);
    expect(far()).toBeGreaterThan(70);
  });

  it('shows a tapped fish its name, and a tapped pufferfish puffs up', () => {
    const t = stocked();
    const fish = t.fish.find((f) => f.look.name === 'Tuna');
    if (!fish) throw new Error('no tuna');
    expect(t.tap(fish.x, fish.y)).toBe(fish);
    expect(fish.label).toBe(LABEL_T);
    expect(t.flakes).toHaveLength(0);
    const puffer = t.fish.find((f) => f.look.shape === 'puffer');
    if (!puffer) throw new Error('no pufferfish');
    // Tap it where nothing nearer the glass covers it.
    const others = t.fish.filter((f) => f !== puffer);
    for (const f of others) f.x = puffer.x > TANK_W / 2 ? 10 : TANK_W - 10;
    expect(t.tap(puffer.x, puffer.y)).toBe(puffer);
    expect(puffer.puff).toBe(PUFF_T);
    for (let i = 0; i < (PUFF_T + 0.1) / DT; i++) t.update(DT);
    expect(puffer.puff).toBe(0);
  });

  it('draws every kind without a bad shape', () => {
    const t = stocked();
    for (const f of t.fish) f.label = 1;
    t.tap(100, t.top + 2);
    for (let i = 0; i < 30; i++) t.update(DT);
    const calls: Record<string, number> = {};
    const count =
      (k: string) =>
      (..._a: unknown[]) => {
        calls[k] = (calls[k] ?? 0) + 1;
      };
    const gradient = { addColorStop: count('stop') };
    const ctx = new Proxy(
      {
        ellipse: (_x: number, _y: number, rx: number, ry: number) => {
          if (rx < 0 || ry < 0) throw new Error(`negative ellipse ${rx} ${ry}`);
          count('ellipse')();
        },
        arc: (_x: number, _y: number, r: number) => {
          if (r < 0) throw new Error(`negative arc ${r}`);
          count('arc')();
        },
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        measureText: (s: string) => ({ width: s.length * 6 }),
      } as Record<string, unknown>,
      { get: (o, k: string) => (k in o ? o[k] : count(k)), set: () => true },
    ) as unknown as CanvasRenderingContext2D;
    t.draw(ctx, 600);
    expect(calls.fillText).toBe(t.fish.length);
    expect(calls.ellipse ?? 0).toBeGreaterThan(t.fish.length);
  });
});
