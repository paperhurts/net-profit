import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import type { World } from '../../src/entities/entity';
import { BARK_SECONDS, DECK, DOG_STAGE, type Pet, Pets } from '../../src/entities/pets';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const world = (over: Partial<World> = {}) => baseWorld({ rng: rng(6), build: DOG_STAGE, ...over });
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
    expect(d.x).toBeCloseTo(DECK.x1, 0);
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
    expect(fake.calls.isoEllipse).toBe(5);
    expect(fake.calls.arc).toBeUndefined();
    e.alert();
    e.draw(fake.v, 'solids');
    expect(fake.calls.isoEllipse).toBe(10);
    expect(fake.calls.arc).toBe(3);
  });
});
