import { describe, expect, it } from 'vitest';
import { GEAR, GEAR_IDS, noGear, refusal } from '../../src/data/gear';
import { BODY, CHILLY, Diver, TOP } from '../../src/entities/diver';
import { drawDive } from '../../src/render/dive';
import {
  CAVES,
  COLD_T,
  ICE_LOOT,
  ICE_REACH,
  ICE_SITE,
  ICE_UNDER,
  IHOLE,
  IHOLE_R,
  IW,
  iceFloor,
  iceFound,
  iceLootNear,
  icePlants,
  iceShoals,
  iceTaken,
  iceUnder,
  inIceWater,
  keepUnderIce,
  RIDGES,
  swimmingSeals,
  underHole,
} from '../../src/world/icedive';
import { fishIn } from '../../src/world/trench';
import { fakeView } from './helpers/view';

const DT = 1 / 60;

/** Every point along a polyline, a step apart, is water with the diver's room round it. */
function swimmable(pts: readonly [number, number][]): boolean {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1] as [number, number];
    const [x1, y1] = pts[i] as [number, number];
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
    for (let k = 0; k <= n; k++)
      if (!inIceWater(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, BODY)) return false;
  }
  return true;
}

describe('the water under the ice', () => {
  it('has a roof of ice everywhere but the hole, which is the only way up', () => {
    for (let x = 0; x <= IW; x += 5) {
      expect(inIceWater(x, 8)).toBe(underHole(x));
      expect(iceUnder(x)).toBeGreaterThanOrEqual(ICE_UNDER - 3);
    }
    expect(inIceWater(IHOLE, TOP - 4, BODY * 0.5)).toBe(true);
    expect(ICE_SITE.entry).toBe(IHOLE);
    expect(ICE_SITE.ceiling).toBe(true);
    // The ridges hang well down; below them is open water above the floor.
    for (const r of RIDGES) {
      expect(iceUnder(r.x)).toBeCloseTo(r.deep, -1);
      expect(inIceWater(r.x, r.deep + 30, BODY)).toBe(true);
      expect(iceFloor(r.x) - r.deep).toBeGreaterThan(100);
    }
  });

  it('has a cave in the left ridge and a tunnel through the right, both joined to the open water', () => {
    const [cave, tunnel] = CAVES as [(typeof CAVES)[0], (typeof CAVES)[0]];
    const mid = (cave.y0 + cave.y1) / 2;
    // From the cave's back, out its mouth and down into the open water toward the hole.
    expect(
      swimmable([
        [cave.x0 + 20, mid],
        [cave.x1 - 14, mid],
        [cave.x1 - 14, cave.y1 - 14],
        [340, cave.y1 - 14],
      ]),
    ).toBe(true);
    // Its back and its floor are ice: shut in on three sides.
    expect(inIceWater(cave.x0 - 6, mid)).toBe(false);
    expect(inIceWater((cave.x0 + cave.x1) / 2, cave.y1 + 8)).toBe(false);
    // Right through the tunnel, from one side of the ridge to the other.
    const ty = (tunnel.y0 + tunnel.y1) / 2;
    expect(
      swimmable([
        [tunnel.x0 - 30, ty],
        [tunnel.x1 + 30, ty],
      ]),
    ).toBe(true);
    expect(inIceWater((tunnel.x0 + tunnel.x1) / 2, tunnel.y1 + 10)).toBe(false);
  });

  it('keeps a diver out of the ice the nearest way, and up the hole', () => {
    const p = { x: 60, y: 12 };
    keepUnderIce(p, BODY);
    expect(inIceWater(p.x, p.y, BODY - 0.01)).toBe(true);
    expect(p.y).toBeCloseTo(iceUnder(60) + BODY, 3);
    // In the cave, pushed up into its roof, it stays in the cave.
    const c = CAVES[0] as (typeof CAVES)[0];
    const q = { x: 200, y: c.y0 - 4 };
    keepUnderIce(q, BODY);
    expect(q.y).toBeCloseTo(c.y0 + BODY, 3);
    // Under the hole, nothing stops it going up.
    const h = { x: IHOLE, y: 2 };
    keepUnderIce(h, BODY);
    expect(h.y).toBeCloseTo(BODY * 0.5, 3);
    expect(Math.abs(h.x - IHOLE)).toBeLessThan(IHOLE_R);
  });

  it("has things frozen in the ice, out of the water but each in a diver's reach, found once", () => {
    expect(ICE_LOOT.length).toBe(5);
    for (const l of ICE_LOOT) {
      expect(inIceWater(l.x, l.y)).toBe(false);
      let near = Number.POSITIVE_INFINITY;
      for (let x = l.x - ICE_REACH; x <= l.x + ICE_REACH; x += 1)
        for (let y = l.y - ICE_REACH; y <= l.y + ICE_REACH; y += 1)
          if (inIceWater(x, y, BODY)) near = Math.min(near, Math.hypot(x - l.x, y - l.y));
      expect(near).toBeLessThan(ICE_REACH - 4);
    }
    // In reach of one, it is that one; once found, it is not again.
    const l = ICE_LOOT[3] as (typeof ICE_LOOT)[0];
    expect(iceLootNear(0, l.x, l.y + 18)).toBe(3);
    expect(iceLootNear(1 << 3, l.x, l.y + 18)).toBeNull();
    expect(iceTaken(1 << 3, 3)).toBe(true);
    expect(iceFound(0b10101)).toBe(3);
    expect(ICE_LOOT.reduce((a, x) => a + x.coins, 0)).toBe(2150);
  });

  it('has its fish and seals in the water, and plants on the floor', () => {
    let bad = 0;
    let all = 0;
    for (const sh of iceShoals())
      for (let T = 0; T < 120; T += 1.7)
        for (let i = 0; i < sh.n; i++) {
          const p = fishIn(sh, i, T);
          all++;
          if (!inIceWater(p.x, p.y)) bad++;
        }
    expect(bad / all).toBeLessThan(0.03);
    for (const sh of iceShoals()) expect(sh.sp).toBeDefined();
    for (let T = 0; T < 120; T += 0.5)
      for (const s of swimmingSeals(T)) expect(inIceWater(s.x, s.y, 6)).toBe(true);
    for (const p of icePlants()) expect(p.y).toBeCloseTo(iceFloor(p.x), 6);
  });
});

describe('the diver under the ice', () => {
  /** Run the diver until it surfaces, or the time is up; whether it did. */
  function surfaces(d: Diver, seconds: number): boolean {
    for (let i = 0; i < seconds / DT; i++) if (d.update(DT, 0, 0) === 'surfaced') return true;
    return false;
  }

  it('is pulled back along the rope to the hole and up through it, from anywhere', () => {
    const c = CAVES[0] as (typeof CAVES)[0];
    const t = CAVES[1] as (typeof CAVES)[0];
    for (const [x, y] of [
      [c.x0 + 20, (c.y0 + c.y1) / 2],
      [(t.x0 + t.x1) / 2, (t.y0 + t.y1) / 2],
      [20, 300],
      [IW - 20, 350],
      [IHOLE, 360],
    ] as const) {
      const d = new Diver();
      d.reset(75, ICE_SITE);
      d.x = x;
      d.y = y;
      d.surface();
      expect(surfaces(d, 6), `not back up from ${x}, ${y}`).toBe(true);
      expect(Math.abs(d.x - IHOLE)).toBeLessThan(IHOLE_R);
    }
  });

  it('cannot swim up through the ice, only out of the hole', () => {
    const d = new Diver();
    d.reset(75, ICE_SITE);
    d.x = 40;
    d.y = 90;
    for (let i = 0; i < 4 / DT; i++) expect(d.update(DT, 0, -1)).not.toBe('surfaced');
    expect(d.y).toBeGreaterThan(iceUnder(d.x));
    d.x = IHOLE;
    d.y = 60;
    let up = false;
    for (let i = 0; i < 4 / DT && !up; i++) up = d.update(DT, 0, -1) === 'surfaced';
    expect(up).toBe(true);
  });

  it('gets cold fast without the white suit: a warning, then too cold and up the rope; warm again at the hole', () => {
    const d = new Diver();
    d.reset(120, ICE_SITE, 1 / COLD_T);
    d.x = IHOLE;
    d.y = 200;
    const evs: { e: string; t: number }[] = [];
    for (let i = 0; i < 20 / DT; i++) {
      // Holding still down there: a little push down against the drift up.
      const e = d.update(DT, 0, 0.12);
      if (e) evs.push({ e, t: i * DT });
      if (e === 'surfaced') break;
    }
    const at = (e: string) => evs.find((x) => x.e === e)?.t ?? -1;
    expect(at('chilly')).toBeCloseTo(COLD_T * CHILLY, 0);
    expect(at('frozen')).toBeCloseTo(COLD_T, 0);
    expect(at('surfaced')).toBeGreaterThan(at('frozen'));
    // Back down another time, cold still, and up at the hole for a breath: it warms.
    d.reset(120, ICE_SITE, 1 / COLD_T);
    d.cold = 0.5;
    for (let i = 0; i < 1 / DT; i++) d.update(DT, 0, 0);
    expect(d.y).toBeLessThanOrEqual(TOP);
    expect(d.cold).toBeLessThan(0.5);
  });

  it('stays warm in the white suit, and not cold at all in the other dives', () => {
    const d = new Diver();
    d.reset(120, ICE_SITE, 0);
    d.x = IHOLE;
    d.y = 200;
    for (let i = 0; i < 40 / DT; i++) {
      const e = d.update(DT, 0, 0.12);
      expect(e === 'chilly' || e === 'frozen').toBe(false);
    }
    expect(d.cold).toBe(0);
    d.reset();
    expect([d.chill, d.cold]).toEqual([0, 0]);
  });

  it('is drawn there, in the white suit or out of it with the cold showing, without a fault', () => {
    const v = fakeView();
    const d = new Diver();
    for (const [chill, white] of [
      [1 / COLD_T, false],
      [0, true],
    ] as const) {
      d.reset(75, ICE_SITE, chill);
      d.cold = chill ? 0.7 : 0;
      for (const y of [20, 130, 300]) {
        d.y = y;
        drawDive(v.v.ctx, 390, 780, 3, {
          diver: d,
          plants: icePlants(),
          shoals: iceShoals(),
          hull: '#C0392B',
          trim: '#FFFFFF',
          bubbles: [],
          site: ICE_SITE,
          loot: ICE_LOOT,
          found: (i) => i === 0,
          white,
        });
      }
    }
    expect(v.calls.fill ?? 0).toBeGreaterThan(400);
  });
});

describe('the white scuba suit', () => {
  it("is on the shipwright's shelf, and the last thing on it", () => {
    expect(GEAR_IDS[GEAR_IDS.length - 1]).toBe('white');
    expect(GEAR.white.name).toBe('White scuba suit');
    expect(noGear().white).toBe(false);
    expect(refusal('white', noGear(), GEAR.white.cost)).toBeNull();
    expect(refusal('white', noGear(), GEAR.white.cost - 1)).toBe('coins');
    expect(refusal('white', { ...noGear(), white: true }, 99999)).toBe('fitted');
  });
});
