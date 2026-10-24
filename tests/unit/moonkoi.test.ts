import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import {
  ALL_CROP_IDS,
  baitOf,
  CROP_IDS,
  CROPS,
  type Fruit,
  type Garden,
  GUARD,
  isCrop,
  isKoiBait,
  koiRose,
  koiTonight,
  landKoi,
  noGarden,
  parseGarden,
  plant,
  rollStock,
  SEEDS_MAX,
  seedsOf,
  takeBait,
  untouchedGarden,
} from '../../src/data/garden';
import { guidePage, KOI_SP } from '../../src/data/guide';
import { MOONKOI, SPECIES } from '../../src/data/tuning';
import { KOI_KIND, koiFight, koiLostWords, koiSpot } from '../../src/fishing/moonkoi';
import { type Fight, MAX_DISTANCE, smoothPull } from '../../src/fishing/snook';
import { drawKoiShadow, drawMoonkoi } from '../../src/render/garden';
import { seedShelfHtml, seedTrayHtml } from '../../src/ui/garden';
import { LILY_POND } from '../../src/world/garden';
import { fakeView } from './helpers/view';

const NIGHT = { phase: 'Night' } as const;
const DAY = { phase: 'Day' } as const;
const moonlit = (c: Fruit['c'], m = 1): Fruit => ({ c, m, mu: ['moonlit'] });

describe('the Moonkoi: its bait and its night', () => {
  it('rises only to a Moonlit fruit of mythic tier or above', () => {
    expect(isKoiBait(moonlit('dragonfruit'))).toBe(true);
    expect(isKoiBait(moonlit('coconut'))).toBe(true);
    expect(isKoiBait(moonlit('lantern'))).toBe(true);
    expect(isKoiBait(moonlit('moonpetal'))).toBe(true);
    expect(isKoiBait(moonlit('pineapple'))).toBe(false);
    expect(isKoiBait(moonlit('tomato'))).toBe(false);
    expect(isKoiBait({ c: 'dragonfruit', m: 1 })).toBe(false);
    expect(isKoiBait({ c: 'dragonfruit', m: 1, mu: ['wet', 'twilight'] })).toBe(false);
  });

  it('a carp is never baited with the Moonkoi bait, and the Moonkoi takes the cheapest of it', () => {
    const g: Garden = {
      seen: true,
      bag: [moonlit('lantern'), moonlit('dragonfruit'), { c: 'strawberry', m: 1 }],
    };
    expect(baitOf(g)?.c).toBe('strawberry');
    expect(baitOf(g, true)?.c).toBe('dragonfruit');
    expect(takeBait(g)?.c).toBe('strawberry');
    // No carp bait left: the Moonlit fruit stay put.
    expect(takeBait(g)).toBeNull();
    expect(g.bag).toHaveLength(2);
    expect(takeBait(g, true)?.c).toBe('dragonfruit');
    expect(g.bag?.map((f) => f.c)).toEqual(['lantern']);
  });

  it('rises after dark, once a night, caught or lost', () => {
    const g = noGarden();
    expect(koiTonight(g, 4, DAY)).toBe(false);
    expect(koiTonight(g, 4, { phase: 'Dusk' })).toBe(false);
    expect(koiTonight(g, 4, NIGHT)).toBe(true);
    koiRose(g, 4);
    expect(koiTonight(g, 4, NIGHT)).toBe(false);
    expect(koiTonight(g, 5, NIGHT)).toBe(true);
    expect(g.koi).toEqual({ night: 4, n: 0 });
  });

  it('landed, it counts, and drops a moonpetal vine seed', () => {
    const g = noGarden();
    koiRose(g, 2);
    landKoi(g);
    landKoi(g);
    expect(g.koi).toEqual({ night: 2, n: 2 });
    expect(seedsOf(g, 'moonpetal')).toBe(2);
    g.seeds = { moonpetal: SEEDS_MAX };
    landKoi(g);
    expect(seedsOf(g, 'moonpetal')).toBe(SEEDS_MAX);
  });

  it('is worth 5,000, and has a guide page saying when and with what', () => {
    expect(SPECIES[MOONKOI]?.name).toBe('Moonkoi');
    expect(SPECIES[MOONKOI]?.v).toBe(5000);
    expect(KOI_SP).toBe(MOONKOI);
    const p = guidePage(MOONKOI, 1, 9);
    expect(p.where).toMatch(/Moonlit/);
    expect(p.when).toMatch(/once a night/);
  });
});

describe('the Moonkoi: the fight', () => {
  /** A person on the button, as in the snook's tests: holds on a sulk, lets go late on a tell or a run. */
  function person(seed: number, late = 1 / 3): (f: Fight, dt: number) => number {
    const own = rng(seed);
    let t = 0;
    let shown: boolean | null = null;
    let cue: boolean | null = null;
    const due: { at: number; ease: boolean }[] = [];
    return (f, dt) => {
      t += dt;
      if (f.state === 'fight') {
        const ease = f.running || f.telling;
        if (ease !== shown) {
          shown = ease;
          due.push({ at: t + Math.max(0.1, late + (own() * 2 - 1) * 0.1), ease });
        }
      }
      for (let next = due[0]; next && next.at <= t; next = due[0]) {
        due.shift();
        cue = next.ease;
      }
      return cue === null || cue || f.tension > 0.8 ? 0 : 1;
    };
  }
  function play(f: Fight, hand: (f: Fight, dt: number) => number, r: () => number): Fight {
    const dt = 1 / 60;
    let rod = 0;
    for (let i = 0; i < 3600 && (f.state === 'waiting' || f.state === 'fight'); i++) {
      rod = smoothPull(rod, hand(f, dt), dt);
      f.update(dt, rod, r);
    }
    return f;
  }

  it("is a keeper snook's: a person with a third of a second's lag lands it nearly every time", () => {
    expect(KOI_KIND).toBe('keeper');
    let landed = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const r = rng(seed);
      if (play(koiFight(r), person(seed * 31 + 7), r).state === 'landed') landed++;
    }
    expect(landed).toBeGreaterThanOrEqual(95);
  });

  it('is lost by holding on through every run, or by never pulling', () => {
    for (const hand of [() => 1, () => 0]) {
      let landed = 0;
      for (let seed = 1; seed <= 50; seed++) {
        const r = rng(seed);
        if (play(koiFight(r), hand, r).state === 'landed') landed++;
      }
      expect(landed).toBe(0);
    }
    expect(koiLostWords('snap')).toBe('The line parted');
    expect(koiLostWords('piling')).toBe('Into the reeds');
  });

  it('runs for the reeds across the pond, and is drawn in toward the figure', () => {
    const fx = LILY_POND.x + LILY_POND.r + 10;
    const fy = LILY_POND.y;
    const reeds = koiSpot(LILY_POND, fx, fy, 0);
    const near = koiSpot(LILY_POND, fx, fy, MAX_DISTANCE);
    expect(reeds.x).toBeLessThan(LILY_POND.x - LILY_POND.r * 0.8);
    expect(near.x).toBeGreaterThan(LILY_POND.x + LILY_POND.r * 0.6);
    for (const p of [reeds, near])
      expect(Math.hypot(p.x - LILY_POND.x, p.y - LILY_POND.y)).toBeLessThan(LILY_POND.r);
  });
});

describe('the moonpetal vine: the Moonkoi seed', () => {
  it('is never at the stall, but is a crop: planted, held in the tray, kept in the save', () => {
    expect(CROP_IDS).not.toContain('moonpetal');
    expect(ALL_CROP_IDS).toContain('moonpetal');
    expect(isCrop('moonpetal')).toBe(true);
    for (let d = 0; d < 300; d++) expect(rollStock(d, () => 0).n.moonpetal).toBeUndefined();
    const g: Garden = { seen: true, seeds: { moonpetal: 1 } };
    expect(seedShelfHtml(g, 1e6)).not.toContain('data-seed="moonpetal"');
    expect(seedTrayHtml(g, 'moonpetal')).toContain('data-pick="moonpetal"');
    expect(plant(g, 0, 'moonpetal', 0)).toBe(true);
    g.koi = { night: 7, n: 1 };
    g.seeds = { moonpetal: 2 };
    const back = parseGarden(JSON.parse(JSON.stringify(g)));
    expect(back.seeds).toEqual({ moonpetal: 2 });
    expect(back.koi).toEqual({ night: 7, n: 1 });
    expect(back.beds?.[0]?.crop).toBe('moonpetal');
    expect(parseGarden({ koi: { night: 'x', n: -3 } }).koi).toEqual({ night: -1, n: 0 });
    expect(untouchedGarden({ seen: false, koi: { night: 1, n: 0 } })).toBe(false);
  });

  it('is the best crop that keeps fruiting, bed for bed, and still inside the guardrails at one seed a night', () => {
    const rate = (k: keyof typeof CROPS) => {
      const c = CROPS[k];
      return c.sell / (c.regrow ?? c.grow);
    };
    for (const k of CROP_IDS.filter((k) => CROPS[k].regrow))
      expect(rate('moonpetal')).toBeGreaterThan(rate(k));
    // Six open beds of it, tended by hand at the guardrail test's most generous allowance for size, Gold and the night.
    const c = CROPS.moonpetal;
    expect((6 * c.sell * 1.56) / ((c.regrow ?? 1) / 60)).toBeLessThan(GUARD.perMinuteMax);
    expect(6 * c.holds * c.sell * 1.3).toBeLessThan(GUARD.overnightMin);
  });

  it('draws the Moonkoi, its shadow under the pads, and the vine', () => {
    const f = fakeView();
    drawMoonkoi(f.v, 100, 100, 14, 0.4, 0.2, 1);
    expect(f.calls.ellipse ?? 0).toBeGreaterThan(5);
    const s = fakeView();
    drawKoiShadow(s.v);
    expect(s.calls.ellipse ?? 0).toBeGreaterThan(3);
  });
});
