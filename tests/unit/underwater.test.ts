import { describe, expect, it } from 'vitest';
import { guidePage } from '../../src/data/guide';
import { DRAGONFISH, GLOW_SQUID, SPECIES } from '../../src/data/tuning';
import {
  aimAt,
  here,
  noneGone,
  RESPAWN,
  SPEAR_SPEED,
  spear,
  stepSpear,
  throwSpear,
} from '../../src/fishing/underwater';
import { drawSideFish, speciesLook } from '../../src/render/tank';
import { fishIn, LANTERN, trenchShoals, zoneAt } from '../../src/world/trench';
import { fakeView } from './helpers/view';

const shoals = trenchShoals();
const T = 12;
const idx = (kind: string) => shoals.findIndex((s) => s.kind === kind);

describe("the trench's catches", () => {
  it('are the lanternfish, the glow squid and the neon dragonfish, all in the midnight water; the rest are left be', () => {
    const sp = shoals.filter((s) => s.sp !== undefined);
    expect(sp.map((s) => s.sp).sort()).toEqual([LANTERN, GLOW_SQUID, DRAGONFISH].sort());
    for (const s of sp) expect(zoneAt(s.cy)).toBe('midnight');
    expect(SPECIES[LANTERN]?.name).toBe('lanternfish');
    expect(SPECIES[GLOW_SQUID]?.name).toBe('glow squid');
    expect(SPECIES[DRAGONFISH]?.name).toBe('neon dragonfish');
    expect(SPECIES[DRAGONFISH]?.v).toBeGreaterThan(SPECIES[GLOW_SQUID]?.v ?? 0);
    for (const s of [GLOW_SQUID, DRAGONFISH]) {
      expect(SPECIES[s]?.glow).toBe(true);
      expect(guidePage(s, 0, 0).where).toContain('trench');
      expect(guidePage(s, 0, 0).when).toContain('Glows');
    }
  });

  it('live in the aquarium as themselves: a squid, and a dark dragonfish that glows blue', () => {
    const squid = speciesLook(SPECIES[GLOW_SQUID] as never, GLOW_SQUID);
    const dragon = speciesLook(SPECIES[DRAGONFISH] as never, DRAGONFISH);
    expect(squid.shape).toBe('squid');
    expect(dragon.shape).toBe('dragon');
    expect(dragon.glowC).toBe('#4FC3FF');
    for (const look of [squid, dragon]) {
      const v = fakeView();
      drawSideFish(v.v.ctx, 50, 50, look, 1, 0, 0, 0, 1, 0, 0);
      expect(v.calls.fill ?? 0).toBeGreaterThan(3);
    }
  });
});

describe('spearfishing', () => {
  it('aims at the nearest catch ahead and in reach, never at one behind, gone, or not worth spearing', () => {
    const gone = noneGone(shoals);
    const si = idx('squid');
    const s = shoals[si];
    if (!s) throw new Error('no squid');
    const p = fishIn(s, 0, T);
    const from = { x: p.x - 60, y: p.y, face: 1 };
    const a = aimAt(shoals, gone, T, from, 200);
    expect(a?.si).toBe(si);
    // Facing away, nothing.
    expect(aimAt(shoals, gone, T, { ...from, x: p.x + 160, face: 1 }, 100)).toBeNull();
    // Out of reach, nothing.
    expect(aimAt(shoals, gone, T, from, 10)).toBeNull();
    // All of that shoal gone, then the aim moves on or finds nothing.
    for (let i = 0; i < s.n; i++) spear(gone, { si, i, x: 0, y: 0 }, T);
    const b = aimAt(shoals, gone, T, from, 200);
    expect(b?.si === si).toBe(false);
    // The silver fish are never aimed at, however close.
    const silver = shoals[idx('silver')];
    if (!silver) throw new Error('no silver');
    const q = fishIn(silver, 0, T);
    expect(aimAt(shoals, noneGone(shoals), T, { x: q.x - 5, y: q.y, face: 1 }, 40)).toBeNull();
  });

  it('flies at what it was aimed at and takes it; and empty, flies its reach and is spent', () => {
    const gone = noneGone(shoals);
    const si = idx('dragon');
    const s = shoals[si];
    if (!s) throw new Error('no dragonfish');
    const p = fishIn(s, 1, T);
    const from = { x: p.x - 100, y: p.y - 10, face: 1 };
    const sp = throwSpear(from, p, 180);
    expect(Math.hypot(sp.vx, sp.vy)).toBeCloseTo(SPEAR_SPEED, 6);
    let hit = null;
    for (let i = 0; i < 60 && !hit; i++) {
      const r = stepSpear(sp, 1 / 60, shoals, gone, T);
      if (r && r !== 'spent') hit = r;
    }
    expect(hit?.si).toBe(si);
    // Straight ahead into empty water.
    const miss = throwSpear({ x: 380, y: 700, face: -1 }, null, 120);
    expect(miss.vx).toBeLessThan(0);
    let last: ReturnType<typeof stepSpear> = null;
    for (let i = 0; i < 60 && last !== 'spent'; i++)
      last = stepSpear(miss, 1 / 60, shoals, gone, T);
    expect(last).toBe('spent');
  });

  it("leaves a speared fish's place empty a while, then fills it again", () => {
    const gone = noneGone(shoals);
    const si = idx('lantern');
    expect(here(gone, si, 3, T)).toBe(true);
    spear(gone, { si, i: 3, x: 0, y: 0 }, T);
    expect(here(gone, si, 3, T + 1)).toBe(false);
    expect(here(gone, si, 3, T + RESPAWN)).toBe(true);
  });
});
