import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import type { World } from '../../src/entities/entity';
import {
  CRATES,
  DRIFTWOOD,
  Flotsam,
  type Piece,
  placeFlotsam,
  SALVAGE,
} from '../../src/entities/flotsam';
import { IX, IY, WS } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const world = (over: Partial<World> = {}) => baseWorld({ rng: rng(4), range: 2000, ...over });
const piece = (): Piece => ({ x: 0, y: 0, alive: true, resp: 0, ph: 0, rot: 0 });
const dist = (f: Piece) => Math.hypot(f.x - IX, f.y - IY);
const inWorld = (f: Piece) => f.x >= 160 && f.x <= WS - 160 && f.y >= 160 && f.y <= WS - 160;

describe('placeFlotsam', () => {
  it('on the ring, lands 560 to the range edge from the island', () => {
    const w = world();
    for (let i = 0; i < 100; i++) {
      const f = piece();
      placeFlotsam(f, 1, w);
      expect(dist(f)).toBeGreaterThanOrEqual(560 - 1e-6);
      expect(dist(f)).toBeLessThanOrEqual(w.range - 60 + 1e-6);
      expect(inWorld(f)).toBe(true);
    }
  });

  it('off the ring, lands anywhere past the shallows and off the rim', () => {
    const w = world();
    let far = 0;
    for (let i = 0; i < 100; i++) {
      const f = piece();
      placeFlotsam(f, 0, w);
      expect(dist(f)).toBeGreaterThanOrEqual(560);
      expect(inWorld(f)).toBe(true);
      if (dist(f) > 2300) far++;
    }
    expect(far).toBeGreaterThan(0);
  });

  it('never rings out past 2,300 however far the boat can sail', () => {
    const w = world({ range: 1e9 });
    for (let i = 0; i < 100; i++) {
      const f = piece();
      placeFlotsam(f, 1, w);
      expect(dist(f)).toBeLessThanOrEqual(2300 + 1e-6);
    }
  });
});

describe('kinds', () => {
  it('a crate pays a salvage amount, doubled from tier two and tripled from tier four', () => {
    const r = rng(7);
    for (let i = 0; i < 60; i++) expect(SALVAGE).toContain(CRATES.reward(r, 0));
    expect(CRATES.reward(() => 0.99, 0)).toBe(35);
    expect(CRATES.reward(() => 0.99, 1)).toBe(35);
    expect(CRATES.reward(() => 0.99, 2)).toBe(70);
    expect(CRATES.reward(() => 0, 4)).toBe(15);
  });

  it('driftwood pays one to three pieces plus the tier', () => {
    expect(DRIFTWOOD.reward(() => 0, 0)).toBe(1);
    expect(DRIFTWOOD.reward(() => 0.99, 0)).toBe(3);
    expect(DRIFTWOOD.reward(() => 0.5, 3)).toBe(5);
  });

  it('crates and driftwood come in tens and twenty-twos, biased to the ring', () => {
    expect([CRATES.count, DRIFTWOOD.count]).toEqual([10, 22]);
    expect([CRATES.near, DRIFTWOOD.near]).toEqual([0.5, 0.65]);
    expect(new Flotsam(CRATES, world()).pieces).toHaveLength(10);
    expect(new Flotsam(DRIFTWOOD, world()).pieces).toHaveLength(22);
  });
});

describe('Flotsam', () => {
  it('is picked up by the net or the hull once the game has started, and pays out', () => {
    const w = world({ started: false });
    const e = new Flotsam(DRIFTWOOD, w);
    const f = e.pieces[0] as Piece;
    const picked: [Piece, number][] = [];
    e.onPick = (p, n) => picked.push([p, n]);
    w.net = { x: f.x, y: f.y, speed: 0, torn: 0 };
    e.update(1 / 30, w);
    expect(picked).toEqual([]);
    w.started = true;
    e.update(1 / 30, w);
    expect(picked).toHaveLength(1);
    expect(picked[0]?.[0]).toBe(f);
    expect(picked[0]?.[1]).toBeGreaterThanOrEqual(1);
    expect(f.alive).toBe(false);
    expect(f.resp).toBeGreaterThanOrEqual(w.T + 18);
    expect(f.resp).toBeLessThan(w.T + 40);

    const g = e.pieces[1] as Piece;
    w.net = { x: -9999, y: -9999, speed: 0, torn: 0 };
    w.boat = { x: g.x + 25, y: g.y, h: 0, v: 0 };
    e.update(1 / 30, w);
    expect(g.alive).toBe(false);
    const h = e.pieces[2] as Piece;
    w.boat = { x: h.x + 35, y: h.y, h: 0, v: 0 };
    e.update(1 / 30, w);
    expect(h.alive).toBe(true);
  });

  it('reaches a little further with a wider net', () => {
    const w = world({ netWidth: 100 });
    const e = new Flotsam(CRATES, w);
    const f = e.pieces[0] as Piece;
    w.net = { x: f.x + 58, y: f.y, speed: 0, torn: 0 };
    e.update(1 / 30, w);
    expect(f.alive).toBe(false);
    const g = e.pieces[1] as Piece;
    w.net = { x: g.x + 62, y: g.y, speed: 0, torn: 0 };
    e.update(1 / 30, w);
    expect(g.alive).toBe(true);
  });

  it('comes back somewhere new when its time is up', () => {
    const w = world();
    const e = new Flotsam(CRATES, w);
    const f = e.pieces[0] as Piece;
    const was = { x: f.x, y: f.y };
    w.net = { x: f.x, y: f.y, speed: 0, torn: 0 };
    e.update(1 / 30, w);
    expect(f.alive).toBe(false);
    w.net = { x: -9999, y: -9999, speed: 0, torn: 0 };
    w.T = f.resp - 0.01;
    e.update(1 / 30, w);
    expect(f.alive).toBe(false);
    w.T = f.resp;
    e.update(1 / 30, w);
    expect(f.alive).toBe(true);
    expect(f.x === was.x && f.y === was.y).toBe(false);
    expect(inWorld(f)).toBe(true);
  });

  it('draws a ringed crate with a coin, or a ringed plank, and a light for each in the mask', () => {
    const w = world();
    const crates = new Flotsam(CRATES, w);
    const wood = new Flotsam(DRIFTWOOD, w);
    for (const p of crates.pieces.slice(1)) p.alive = false;
    for (const p of wood.pieces.slice(2)) p.alive = false;
    const fake = fakeView();
    crates.draw(fake.v, 'afloat');
    expect(fake.calls).toEqual({ isoEllipse: 2, stroke: 1, box: 1, fill: 1 });
    wood.draw(fake.v, 'afloat');
    expect(fake.calls).toEqual({ isoEllipse: 6, stroke: 3, box: 1, extrude: 2, fill: 3 });
    crates.draw(fake.v, 'mask');
    wood.draw(fake.v, 'mask');
    expect(fake.calls.light).toBe(3);
    fake.onScreen = false;
    crates.draw(fake.v, 'afloat');
    wood.draw(fake.v, 'mask');
    expect(fake.calls).toEqual({ isoEllipse: 6, stroke: 3, box: 1, extrude: 2, fill: 3, light: 3 });
  });
});
