import { describe, expect, it } from 'vitest';
import { drawCapybara, drawPlatypus, drawTilcayo } from '../../src/render/keepers';
import { KEEPERS } from '../../src/ui/garden';
import { fakeView } from './helpers/view';

describe('the stall keepers', () => {
  it('a capybara at the seeds, a Tilcayo at the gear and a platypus at the sell stand, each with a name', () => {
    expect(KEEPERS.seeds.kind).toBe('capybara');
    expect(KEEPERS.gear.kind).toBe('Tilcayo');
    expect(KEEPERS.sell.kind).toBe('platypus');
    const names = Object.values(KEEPERS).map((k) => k.name);
    expect(new Set(names).size).toBe(3);
    for (const n of names) expect(n.length).toBeGreaterThan(3);
  });

  it('draws each, at any moment of its breathing, at any zoom', () => {
    for (const draw of [drawCapybara, drawPlatypus, drawTilcayo]) {
      for (const T of [0, 1.3, 77]) {
        const f = fakeView();
        f.v.T = T;
        f.v.zoom = 0.6;
        draw(f.v, 100, 100);
        expect(f.calls.fill ?? 0).toBeGreaterThan(3);
      }
    }
  });
});
