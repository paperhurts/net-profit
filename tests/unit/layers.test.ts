import { describe, expect, it } from 'vitest';
import type { DrawView, Entity, Layer, World } from '../../src/entities/entity';
import { LAYERS, Scene } from '../../src/render/layers';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

/** An entity that logs what happens to it. */
const spy = (name: string, log: string[], layers: Layer[], depth?: number): Entity => ({
  update: (dt) => log.push(`${name}:update:${dt}`),
  draw: (_v: DrawView, layer) => {
    if (layers.includes(layer)) log.push(`${name}:${layer}`);
  },
  ...(depth === undefined ? {} : { depth: () => depth }),
});

describe('Scene', () => {
  it('lists every layer in the order the frame is painted', () => {
    expect(LAYERS).toEqual([
      'underwater',
      'surface',
      'afloat',
      'solids',
      'air',
      'mask',
      'glow',
      'overlay',
    ]);
  });

  it('hands back what is added, and updates everything in that order', () => {
    const log: string[] = [];
    const scene = new Scene();
    const a = scene.add(spy('a', log, []));
    const b = scene.add(spy('b', log, []));
    expect(scene.entities).toEqual([a, b]);
    scene.update(0.5, baseWorld());
    expect(log).toEqual(['a:update:0.5', 'b:update:0.5']);
  });

  it('paints a layer through every entity in order; those not on it stay quiet', () => {
    const log: string[] = [];
    const scene = new Scene();
    scene.add(spy('fish', log, ['surface', 'glow']));
    scene.add(spy('bird', log, ['air']));
    scene.add(spy('crate', log, ['afloat', 'surface']));
    const { v } = fakeView();
    for (const layer of LAYERS) scene.draw(v, layer);
    expect(log).toEqual(['fish:surface', 'crate:surface', 'crate:afloat', 'bird:air', 'fish:glow']);
  });

  it('offers one depth-sorted solid per entity that has a depth, drawn on the solids layer', () => {
    const log: string[] = [];
    const scene = new Scene();
    scene.add(spy('flat', log, ['solids']));
    scene.add(spy('ship', log, ['solids'], 300));
    scene.add(spy('rock', log, ['solids'], 120));
    const { v } = fakeView();
    const solids = scene.solids(v);
    expect(solids.map((s) => s.d)).toEqual([300, 120]);
    for (const s of solids.sort((p, q) => p.d - q.d)) s.f();
    expect(log).toEqual(['rock:solids', 'ship:solids']);
  });

  it('passes the same world object to every entity', () => {
    const seen: World[] = [];
    const scene = new Scene();
    scene.add({ update: (_dt, w) => seen.push(w), draw: () => {} });
    scene.add({ update: (_dt, w) => seen.push(w), draw: () => {} });
    const w = baseWorld();
    scene.update(1 / 60, w);
    expect(seen).toEqual([w, w]);
    expect(seen[0]).toBe(w);
  });
});
