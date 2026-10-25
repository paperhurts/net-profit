import { describe, expect, it } from 'vitest';
import { BIG_HAUL, chatter, greeting, KEEPER_LINES, soldLine } from '../../src/data/keepers';
import {
  birdOn,
  coinUp,
  dozing,
  drawCapybara,
  drawPlatypus,
  drawTilcayo,
} from '../../src/render/keepers';
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

describe('the keepers have ways of their own', () => {
  it('each has hellos, dawn and night words, and never says the same thing twice running', () => {
    for (const k of ['seeds', 'sell', 'gear'] as const) {
      const L = KEEPER_LINES[k];
      expect(L.hello.length).toBeGreaterThanOrEqual(3);
      expect(L.dawn.length).toBeGreaterThanOrEqual(2);
      expect(L.night.length).toBeGreaterThanOrEqual(2);
      for (const phase of ['Day', 'Dawn', 'Night'])
        for (let n = 0; n < 12; n++) {
          const a = greeting(k, phase, n);
          expect(a.length).toBeGreaterThan(5);
          expect(a.length).toBeLessThan(110);
          expect(greeting(k, phase, n + 1)).not.toBe(a);
        }
    }
    expect(KEEPER_LINES.seeds.dawn).toContain(greeting('seeds', 'Dawn', 0));
    expect(KEEPER_LINES.gear.night).toContain(greeting('gear', 'Night', 2));
    // The seed stall and the gear shed have something to say over their cards, turning over too.
    for (const k of ['seeds', 'gear'] as const) {
      expect(chatter(k, 0)).not.toBe(chatter(k, 1));
      expect(chatter(k, 0)).toBe(chatter(k, KEEPER_LINES[k].card.length));
    }
  });

  it('Penny has an opinion on every basket: shiny first, then giants, then how much', () => {
    const h = { n: 5, coins: 200, gold: 0, rainbow: 0, giants: 0 };
    expect(soldLine({ ...h, n: 0 })).toMatch(/air|Nothing/);
    expect(soldLine({ ...h, rainbow: 1, gold: 2, giants: 1 })).toMatch(/[Rr]ainbow|RAINBOW/);
    expect(soldLine({ ...h, gold: 1, giants: 1 })).toMatch(/GOLD|shiny/);
    expect(soldLine({ ...h, giants: 1 })).toMatch(/giant|size/);
    expect(soldLine({ ...h, n: BIG_HAUL.n })).toMatch(/basket|scales/);
    expect(soldLine({ ...h, coins: BIG_HAUL.coins })).toMatch(/basket|scales/);
    expect(soldLine(h, 0)).not.toBe(soldLine(h, 1));
  });

  it('are a little alive: Capy dozes, a bird visits his hat, Penny flips her coin', () => {
    expect(dozing(1)).toBe(false);
    expect(dozing(6)).toBe(true);
    expect(birdOn(3)).toBe(true);
    expect(birdOn(12)).toBe(false);
    expect(coinUp(0.4)).toBeGreaterThan(0.9);
    expect(coinUp(2)).toBe(0);
    // Drawn with the bird and the coin up, and with neither.
    for (const T of [0.4, 6, 12, 40.1]) {
      for (const draw of [drawCapybara, drawPlatypus, drawTilcayo]) {
        const f = fakeView();
        f.v.T = T;
        draw(f.v, 100, 100);
        expect(f.calls.fill ?? 0).toBeGreaterThan(3);
      }
    }
  });
});
