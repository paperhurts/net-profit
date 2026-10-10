import { describe, expect, it } from 'vitest';
import { BITE, BoneShark, NOTICE, type SharkEvent, TELL } from '../../src/entities/boneshark';
import { AIR_MAX, BODY, Diver } from '../../src/entities/diver';
import { diveCamera, drawDive } from '../../src/render/dive';
import { drawBoneShark, drawWreckScene } from '../../src/render/wreck';
import { TRENCH_SITE } from '../../src/world/divesite';
import { ISLE5, WRECK } from '../../src/world/isle5';
import { LOOT_REACH, lootNear } from '../../src/world/loot';
import { fishIn, shoalAt } from '../../src/world/trench';
import {
  DECK_END,
  HULL,
  inHold,
  inWreckWater,
  keepInWreck,
  WD,
  WRECK_CHEST,
  WRECK_ENTRY,
  WRECK_SITE,
  WW,
  wreckPlants,
  wreckShoals,
} from '../../src/world/wreck';
import { fakeView } from './helpers/view';

const DT = 1 / 60;

/** Swim a diver toward a point with the stick, for a while; where it got to. */
function swimTo(d: Diver, x: number, y: number, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) {
    const dx = x - d.x;
    const dy = y - d.y;
    const l = Math.hypot(dx, dy);
    if (l < 4) break;
    d.air = AIR_MAX;
    d.update(DT, dx / l, dy / l);
  }
  return d;
}

describe('the wreck off island 5', () => {
  it('lies on its rocks, on the far side from home', () => {
    expect(Math.hypot(WRECK.x - ISLE5.x, WRECK.y - ISLE5.y)).toBeLessThan(ISLE5.r);
    expect(WRECK.x).toBeLessThan(ISLE5.x);
  });

  it('is open water above, with the boat on the sand and its hold open over the bow half', () => {
    expect(inWreckWater(WRECK_ENTRY, 20, BODY)).toBe(true);
    expect(inWreckWater(WRECK_ENTRY, WD + 10)).toBe(false);
    expect(inWreckWater(10, 150)).toBe(false);
    // The hull's timbers are solid; the hold inside and the hole over it are water.
    expect(inWreckWater(HULL.x0 + 5, HULL.top + 30)).toBe(false);
    expect(inWreckWater((HULL.x0 + DECK_END) / 2, HULL.top + 4)).toBe(false);
    expect(inWreckWater((DECK_END + HULL.x1) / 2, HULL.top + 4)).toBe(true);
    expect(inHold(HULL.x0 + 60, HULL.keel - 12)).toBe(true);
    expect(inHold(HULL.x0 + 60, HULL.top - 20)).toBe(false);
    const p = { x: HULL.x0 + 5, y: HULL.top + 40 };
    keepInWreck(p, 10);
    expect(inWreckWater(p.x, p.y, 9)).toBe(true);
  });

  it('keeps its chest at the back of the hold, under the deck, where a diver can swim in to it', () => {
    expect(inHold(WRECK_CHEST.x, WRECK_CHEST.y)).toBe(true);
    expect(WRECK_CHEST.x).toBeLessThan(DECK_END);
    expect(WRECK_CHEST.coins).toBeGreaterThan(600);
    // Down through the hole, along the hold under the deck, to the chest.
    const d = new Diver();
    d.reset(AIR_MAX, WRECK_SITE);
    expect(d.x).toBe(WRECK_ENTRY);
    swimTo(d, (DECK_END + HULL.x1) / 2, HULL.keel - 16, 6);
    expect(inHold(d.x, d.y)).toBe(true);
    swimTo(d, WRECK_CHEST.x, WRECK_CHEST.y - 4, 6);
    expect(lootNear([WRECK_CHEST], 0, d.x, d.y, false)).toBe(0);
    expect(Math.hypot(d.x - WRECK_CHEST.x, d.y - WRECK_CHEST.y)).toBeLessThan(LOOT_REACH);
    // Swimming straight at it from outside the stern, the hull's side is in the way.
    const e = new Diver();
    e.reset(AIR_MAX, WRECK_SITE);
    e.x = HULL.x0 - 40;
    e.y = WRECK_CHEST.y;
    swimTo(e, WRECK_CHEST.x, WRECK_CHEST.y, 3);
    expect(e.x).toBeLessThan(HULL.x0);
  });

  it('has weed and fish about it, and groupers to spear, all in the water', () => {
    expect(wreckPlants().length).toBeGreaterThan(8);
    const shoals = wreckShoals();
    expect(shoals.some((s) => s.kind === 'grouper' && s.sp !== undefined)).toBe(true);
    for (const s of shoals)
      for (let t = 0; t < 120; t += 5) {
        const c = shoalAt(s, t);
        expect(inWreckWater(c.x, c.y), `${s.kind} at ${t}`).toBe(true);
        for (let i = 0; i < s.n; i++) expect(fishIn(s, i, t).y).toBeLessThan(WD);
      }
  });

  it('is seen closer than the trench, with the sand at the bottom of the screen', () => {
    const cam = diveCamera({ x: WRECK_ENTRY, y: 200 }, 390, 780, WRECK_SITE);
    expect(cam.s).toBeGreaterThan(diveCamera({ x: 380, y: 200 }, 390, 780, TRENCH_SITE).s);
    expect(cam.x + 390 / 2 / cam.s).toBeLessThanOrEqual(WW);
  });
});

describe('the bone sharks', () => {
  function run(b: BoneShark, d: { x: number; y: number }, seconds: number, up = false) {
    const evs: SharkEvent[] = [];
    for (let i = 0; i < seconds * 60; i++) {
      const ev = b.update(DT, d, up);
      if (ev) evs.push(ev);
    }
    return evs;
  }

  it('cruise over the wreck, warn when a diver in the open comes near, and bite one who stays put', () => {
    const b = new BoneShark(0);
    const d = { x: b.x - NOTICE + 30, y: b.y };
    const evs = run(b, d, 3);
    expect(evs[0]).toBe('tell');
    expect(evs).toContain('bite');
    expect(BITE).toBeGreaterThan(0);
  });

  it('never bite a diver in the hold, and cannot get in', () => {
    const b = new BoneShark(0);
    const d = { x: HULL.x0 + 80, y: HULL.keel - 14 };
    for (let i = 0; i < 30 * 60; i++) {
      expect(b.update(DT, d, false)).not.toBe('bite');
      expect(inHold(b.x, b.y)).toBe(false);
    }
  });

  it('miss a diver who swims aside in the warning, a third of a second late', () => {
    for (const late of [0.23, 0.33, 0.43]) {
      const b = new BoneShark(1);
      const d = new Diver();
      d.reset(AIR_MAX, WRECK_SITE);
      d.x = 450;
      d.y = 120;
      let since = -1;
      let dir: [number, number] = [0, 0];
      const evs: SharkEvent[] = [];
      for (let i = 0; i < 40 * 60; i++) {
        const ev = b.update(DT, d, false);
        if (ev) evs.push(ev);
        if (ev === 'tell') {
          since = 0;
          const ax = d.x - b.x;
          const ay = d.y - b.y;
          const n = Math.hypot(ax, ay) || 1;
          const a: [number, number] = [-ay / n, ax / n];
          const c: [number, number] = [ay / n, -ax / n];
          const room = (v: [number, number]) => inWreckWater(d.x + v[0] * 70, d.y + v[1] * 70, 14);
          dir = room(a) && !room(c) ? a : room(c) && !room(a) ? c : a[1] < c[1] ? a : c;
        }
        let ix = 0;
        let iy = 0;
        if (since >= 0) {
          since += DT;
          if (since >= late && since < late + TELL + 1) [ix, iy] = dir;
          if (since >= late + TELL + 1) since = -1;
        }
        if (since < 0) {
          ix = Math.max(-1, Math.min(1, (450 - d.x) / 60));
          iy = Math.max(-1, Math.min(1, (120 - d.y) / 60));
        }
        d.air = AIR_MAX;
        d.update(DT, ix, iy);
      }
      expect(evs.filter((e) => e === 'tell').length, `${late} s late`).toBeGreaterThan(2);
      expect(evs, `${late} s late`).not.toContain('bite');
    }
  });

  it('flee a spear out of the scene and stay away a while, then come back round', () => {
    const b = new BoneShark(0);
    expect(b.hitBy(b.x - 30, b.y, b.x + 30, b.y)).toBe(true);
    b.sting();
    expect(b.state).toBe('stung');
    expect(b.hitBy(b.x - 30, b.y, b.x + 30, b.y)).toBe(false);
    const d = { x: 450, y: 120 };
    run(b, d, 8);
    expect(b.x).toBeGreaterThan(WW);
    expect(run(b, d, 10)).not.toContain('bite');
    run(b, d, 20);
    expect(b.state).not.toBe('stung');
  });

  it('let a diver go on the way back up', () => {
    const b = new BoneShark(0);
    const d = { x: b.x - 80, y: b.y };
    expect(run(b, d, 5, true)).toEqual([]);
  });

  it('are drawn, and so is the wreck, without a fault', () => {
    const v = fakeView();
    const X = (n: number) => n;
    drawWreckScene(v.v.ctx, X, X, 1, 2);
    drawBoneShark(v.v.ctx, X, X, 1, new BoneShark(0), 2, 70);
    expect(v.calls.fill ?? 0).toBeGreaterThan(8);
    const w = fakeView();
    const d = new Diver();
    d.reset(AIR_MAX, WRECK_SITE);
    drawDive(w.v.ctx, 390, 780, 3, {
      diver: d,
      plants: wreckPlants(),
      shoals: wreckShoals(),
      hull: '#E4572E',
      trim: '#FFF6E5',
      bubbles: [],
      site: WRECK_SITE,
      loot: [WRECK_CHEST],
      found: () => false,
      under: (c, x, y, s) => drawBoneShark(c, x, y, s, new BoneShark(1), 3, 70),
    });
    expect(w.calls.fill ?? 0).toBeGreaterThan(20);
  });
});
