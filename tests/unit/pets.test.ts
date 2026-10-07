import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import type { World } from '../../src/entities/entity';
import {
  BARK_SECONDS,
  DECK,
  DOG_STAGE,
  HEEL,
  LOVE_SECONDS,
  type Pet,
  Pets,
} from '../../src/entities/pets';
import { HOP, MOOR_TIME, Walker, walkable } from '../../src/entities/walker';
import { DOCK, IX, IY } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const world = (over: Partial<World> = {}) => baseWorld({ rng: rng(6), build: DOG_STAGE, ...over });
const docked = (): Partial<World> => ({
  docked: true,
  boat: { x: DOCK.x + 40, y: DOCK.y + 60, h: 0.8, v: 0 },
});
const run = (e: Pets, w: World, seconds: number) => {
  for (let i = 0; i < seconds * 30; i++) e.update(1 / 30, w);
};
const onDeck = (p: Pet) =>
  p.x >= DECK.x0 - 1 && p.x <= DECK.x1 + 1 && p.y >= DECK.y0 - 1 && p.y <= DECK.y1 + 1;

describe('Pets', () => {
  it('starts with the dog only once the tree platform is built, and quietly', () => {
    expect(new Pets(0).pets).toEqual([]);
    const e = new Pets(DOG_STAGE);
    expect(e.dog?.kind).toBe('dog');
    expect(e.has('dog')).toBe(true);
  });

  it('earns the dog when the stage is built, announcing it once', () => {
    const e = new Pets(0);
    const earned: string[] = [];
    e.onEarn = (k) => earned.push(k);
    run(e, world({ build: 0 }), 1);
    expect(e.pets).toEqual([]);
    run(e, world(), 2);
    expect(earned).toEqual(['dog']);
    expect(e.pets).toHaveLength(1);
  });

  it('potters about the planks and never leaves them', () => {
    const e = new Pets(DOG_STAGE);
    const d = e.dog as Pet;
    const w = world();
    let moved = 0;
    for (let i = 0; i < 60 * 30; i++) {
      const x = d.x;
      const y = d.y;
      e.update(1 / 30, w);
      moved += Math.hypot(d.x - x, d.y - y);
      expect(onDeck(d)).toBe(true);
    }
    expect(moved).toBeGreaterThan(200);
  });

  it('runs to the end of the pier and barks for four seconds when alerted, and the game hears once', () => {
    const e = new Pets(DOG_STAGE);
    const d = e.dog as Pet;
    let barks = 0;
    e.onBark = () => barks++;
    e.alert();
    expect(barks).toBe(1);
    expect(d.bark).toBe(BARK_SECONDS);
    const w = world();
    run(e, w, 2.5);
    expect(Math.abs(d.x - DECK.x1)).toBeLessThanOrEqual(1);
    expect(d.bark).toBeGreaterThan(0);
    expect(d.h).toBe(0);
    run(e, w, 2);
    expect(d.bark).toBe(0);
    expect(barks).toBe(1);
  });

  it('has nothing to say without a dog', () => {
    const e = new Pets(0);
    let barks = 0;
    e.onBark = () => barks++;
    e.alert();
    expect(barks).toBe(0);
  });

  it('sits just above the boat in the depth order, and reset sends everyone home', () => {
    const e = new Pets(DOG_STAGE);
    const w = world({ boat: { x: 1000, y: 2000, h: 0, v: 0 } });
    e.update(1 / 30, w);
    expect(e.depth()).toBe(3002);
    e.reset();
    expect(e.pets).toEqual([]);
  });

  it('draws the dog on the solids layer, with bark marks while barking', () => {
    const e = new Pets(DOG_STAGE);
    const fake = fakeView();
    e.draw(fake.v, 'surface');
    expect(fake.calls).toEqual({});
    e.draw(fake.v, 'solids');
    expect(fake.calls.isoEllipse).toBe(8);
    expect(fake.calls.arc).toBeUndefined();
    e.alert();
    e.draw(fake.v, 'solids');
    expect(fake.calls.isoEllipse).toBe(16);
    expect(fake.calls.arc).toBe(3);
  });
});

describe('the dog ashore', () => {
  /** A docked boat, the figure landed on the pier, and the dog pottering on its planks. */
  const landed = () => {
    const w = world(docked());
    const walker = new Walker();
    walker.stepAshore();
    for (let i = 0; i < (MOOR_TIME + HOP + 0.2) * 30; i++) walker.update(1 / 30, w);
    const e = new Pets(DOG_STAGE);
    e.update(1 / 30, w);
    w.ashore = walker;
    return { w, walker, e, d: e.dog as Pet };
  };
  /** Walk the figure toward a world point, with the dog following, for this long. */
  const go = (s: ReturnType<typeof landed>, tx: number, ty: number, secs: number) => {
    for (let i = 0; i < secs * 30; i++) {
      const sx = tx - s.walker.x - (ty - s.walker.y);
      const sy = (tx - s.walker.x + (ty - s.walker.y)) / 2;
      const n = Math.hypot(sx, sy);
      s.walker.intent(n > 4 ? sx / n : 0, n > 4 ? sy / n : 0);
      s.walker.update(1 / 30, s.w);
      s.e.update(1 / 30, s.w);
      expect(walkable(s.d.x, s.d.y, s.w.build), 'the dog left dry land').toBe(true);
    }
  };

  it('comes to sit by the figure and says hello once', () => {
    const s = landed();
    let greets = 0;
    s.e.onGreet = () => greets++;
    run(s.e, s.w, 4);
    expect(Math.hypot(s.d.x - s.walker.x, s.d.y - s.walker.y)).toBeLessThanOrEqual(HEEL + 0.5);
    expect(s.d.sit).toBe(true);
    expect(greets).toBe(1);
  });

  it('follows the way the figure walked, round the hut and back, and never through anything', () => {
    const s = landed();
    // Up the pier, round the hut's east end to its back, then across to the far shore.
    go(s, IX + 120, IY - 10, 3);
    go(s, IX + 95, IY - 140, 2.5);
    go(s, IX + 20, IY - 150, 1.5);
    go(s, IX - 120, IY + 60, 3);
    go(s, IX - 120, IY + 60, 2);
    expect(Math.hypot(s.d.x - s.walker.x, s.d.y - s.walker.y)).toBeLessThanOrEqual(HEEL + 1);
  });

  it('barks where it stands when the pirate prowls', () => {
    const s = landed();
    run(s.e, s.w, 4);
    const at = { x: s.d.x, y: s.d.y };
    s.e.alert();
    run(s.e, s.w, 1);
    expect(Math.hypot(s.d.x - at.x, s.d.y - at.y)).toBeLessThan(1);
    expect(s.d.h).toBe(0);
  });

  it('is patted: hearts rise, and the game hears', () => {
    const s = landed();
    let pats = 0;
    s.e.onPet = () => pats++;
    run(s.e, s.w, 4);
    const fake = fakeView();
    s.e.hint = true;
    s.e.draw(fake.v, 'air');
    expect(fake.calls.bezierCurveTo).toBe(2);
    expect(s.e.pet()).toBe(true);
    expect(pats).toBe(1);
    expect(s.d.love).toBe(LOVE_SECONDS);
    run(s.e, s.w, LOVE_SECONDS / 2);
    const fake2 = fakeView();
    s.e.draw(fake2.v, 'air');
    expect(fake2.calls.bezierCurveTo).toBeGreaterThanOrEqual(4);
    expect(new Pets(0).pet()).toBe(false);
  });

  it('sorts among the island solids off the planks, and goes home to them when the figure boards', () => {
    const s = landed();
    go(s, IX + 120, IY - 10, 3);
    go(s, IX + 90, IY - 30, 1.5);
    expect(s.e.depth()).not.toBe(s.w.boat.x + s.w.boat.y + 2);
    s.w.ashore = null;
    run(s.e, s.w, 6);
    expect(onDeck(s.d)).toBe(true);
    expect(s.e.depth()).toBe(s.w.boat.x + s.w.boat.y + 2);
  });
});
