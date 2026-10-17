import { describe, expect, it } from 'vitest';
import { guidePage } from '../../src/data/guide';
import { ABYSS_FISH, GIANT_SQUID, SPECIES } from '../../src/data/tuning';
import { DEEP_KINDS } from '../../src/render/deepfish';
import { drawSideFish, speciesLook } from '../../src/render/tank';
import { AD, abyssShoals, FLOOR_ROOM } from '../../src/world/abyss';
import { fakeView } from './helpers/view';

const NAMES = [
  'giant glow squid',
  'gloomer',
  'clown fish',
  'nibbler',
  'stoplight loosejaw',
  'viper fish',
  'owl fish',
  'chimaera',
  'coelacanth',
  'frilled shark',
];

describe("the kid's deep fish", () => {
  it('are his ten, all worth 91', () => {
    expect(ABYSS_FISH.map((sp) => SPECIES[sp]?.name)).toEqual(NAMES);
    for (const sp of ABYSS_FISH) expect(SPECIES[sp]?.v).toBe(91);
    expect(SPECIES[GIANT_SQUID]?.name).toBe('giant glow squid');
  });

  it('each swim over the abyss floor, where the diver out of the cage can spear them, drawn as themselves', () => {
    const shoals = abyssShoals();
    for (const sp of ABYSS_FISH) {
      const sh = shoals.find((s) => s.sp === sp);
      if (!sh) throw new Error(`no shoal of ${SPECIES[sp]?.name}`);
      expect(sh.cy - sh.ry - 64).toBeGreaterThanOrEqual(AD - FLOOR_ROOM);
      expect(sh.cy + sh.ry + 40).toBeLessThanOrEqual(AD);
      const name = SPECIES[sp]?.name ?? '';
      if (sp === GIANT_SQUID) expect(sh.kind).toBe('gsquid');
      else expect([sh.kind, sh.deep]).toEqual(['deep', DEEP_KINDS[name]]);
      // The ones that glow shine through the dark; the rest only show in the lamp.
      expect(sh.glow).toBe(!!SPECIES[sp]?.glow);
    }
  });

  it('have field guide pages that say where to find them', () => {
    for (const sp of ABYSS_FISH) {
      const p = guidePage(sp, 1, 3);
      expect(p.blurb.length).toBeGreaterThan(40);
      expect(p.where).toContain('abyss');
      expect(p.when).toContain('1,000 metres');
      expect(p.worth).toBe('91 coins');
    }
  });

  it('live in the aquarium, low down, drawn as themselves, at any size', () => {
    for (const sp of ABYSS_FISH) {
      const S = SPECIES[sp];
      if (!S) throw new Error('no species');
      const look = speciesLook(S, sp);
      expect(look.shape).toBe(sp === GIANT_SQUID ? 'squid' : 'deep');
      if (sp !== GIANT_SQUID) expect(look.deep).toBe(DEEP_KINDS[S.name]);
      expect(look.band[0]).toBeGreaterThan(0.5);
      for (const k of [0.3, 1, 2]) {
        const v = fakeView();
        drawSideFish(v.v.ctx, 50, 50, look, 1, 1.3, 0, 0, k, 2.5, 0);
        const drawn = (v.calls.fill ?? 0) + (v.calls.stroke ?? 0) + (v.calls.fillRect ?? 0);
        expect(drawn).toBeGreaterThan(4);
      }
    }
  });
});
