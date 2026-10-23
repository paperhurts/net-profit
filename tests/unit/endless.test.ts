import { describe, expect, it } from 'vitest';
import {
  dockAt,
  ENDLESS_N_DOCK,
  ENDLESS_P_DOCK,
  groundZ,
  onLand,
  WADE_PACE,
  WALK_SPEED,
  walkable,
} from '../../src/entities/walker';
import {
  drawEndlessFlat,
  drawEndlessSea,
  endlessSolids,
  landmarkFade,
} from '../../src/render/endless';
import {
  atHalf,
  BASE,
  BODY,
  BRIDGE13,
  BRIDGES13,
  berth13,
  CAP,
  CHANNEL,
  CRATES13,
  DOCK13,
  ENDLESS,
  ENDLESS13,
  endlessEdge,
  FORT,
  fromEndless,
  GRAVE,
  groundZ13,
  halfOutline,
  inEndlessShallows,
  insideEndless,
  LANDING13,
  nearEndless,
  onEndless,
  PEAK,
  PIER13,
  PIER13_Z,
  pushOffEndless,
  revealZoom13,
  rival,
  SANDBAR,
  SIDES,
  SIGHT13,
  sideAt,
  TREES13,
  toEndless,
} from '../../src/world/endless';
import { DEEP, FAR, FARFAR, IX, IY, pastFarFar, WS } from '../../src/world/island';
import { fakeView } from './helpers/view';

/** How far a point is outside the far deep (inside the white buoys); negative inside it. */
function pastWhite(x: number, y: number): number {
  const e = DEEP + FAR;
  return Math.max(-e - x, x - (WS + e), -e - y, y - (WS + e));
}
/** How far a point is inside the far far sea's own end. */
function insideEnd(x: number, y: number): number {
  const e = DEEP + FAR + FARFAR;
  return Math.min(x + e, WS + e - x, y + e, WS + e - y);
}

const edge = Array.from({ length: 360 }, (_, i) => {
  const a = (i / 360) * Math.PI * 2;
  return fromEndless(Math.cos(a) * endlessEdge(a), Math.sin(a) * endlessEdge(a));
});

describe('the Endless Isle, in the far far sea', () => {
  it("lies in the far far sea's left corner, past the white buoys, with water all round it", () => {
    for (const [x, y] of [...edge, ...halfOutline('pirate', 120), ...halfOutline('ninja', 120)]) {
      expect(pastFarFar(x, y)).toBe(true);
      expect(pastWhite(x, y)).toBeGreaterThan(250);
      // Room to sail round its far side before the sea ends.
      expect(insideEnd(x, y)).toBeGreaterThan(250);
    }
    // Its docks too, rings and all, inside the sea and past the buoys.
    for (const d of [DOCK13.pirate, DOCK13.ninja]) {
      expect(pastWhite(d.x, d.y)).toBeGreaterThan(d.r + 150);
      expect(insideEnd(d.x, d.y)).toBeGreaterThan(d.r + 150);
    }
    // Straight left along the screen from home: its middle on the line through home and the sea's left corner.
    expect(ENDLESS.x - IX).toBeCloseTo(-(ENDLESS.y - IY), 5);
    expect(ENDLESS.x).toBeLessThan(-(DEEP + FAR));
    expect(ENDLESS.y).toBeGreaterThan(WS + DEEP + FAR);
  });

  it('faces home: its piers point toward home, across the screen from its far side', () => {
    const [hu, hv] = toEndless(IX, IY);
    expect(hu).toBeGreaterThan(9000);
    expect(Math.abs(hv)).toBeLessThan(1);
    for (const side of SIDES) {
      const [du] = toEndless(DOCK13[side].x, DOCK13[side].y);
      expect(du).toBeGreaterThan(BODY.half);
    }
  });

  it('is two halves, the ninjas up the screen and the pirates down it, a mirror of each other', () => {
    const [nx, ny] = atHalf('ninja', 0, FORT.w);
    const [px, py] = atHalf('pirate', 0, FORT.w);
    // Up the screen is smaller x + y.
    expect(nx + ny).toBeLessThan(px + py);
    expect(sideAt(nx, ny)).toBe('ninja');
    expect(sideAt(px, py)).toBe('pirate');
    expect(rival('ninja')).toBe('pirate');
    expect(rival('pirate')).toBe('ninja');
    // Every point of one half has its twin on the other: land where the other has land, the same height, the same
    // obstacles. The mirror is perfect.
    let land = 0;
    for (let u = -1100; u <= 1100; u += 23)
      for (let w = 0; w <= 1200; w += 19) {
        const [ax, ay] = atHalf('pirate', u, w);
        const [bx, by] = atHalf('ninja', u, w);
        const a = onLand(ax, ay);
        expect(onLand(bx, by)).toBe(a);
        expect(groundZ(bx, by)).toBeCloseTo(groundZ(ax, ay), 6);
        expect(inEndlessShallows(bx, by)).toBe(inEndlessShallows(ax, ay));
        if (a) land++;
      }
    expect(land).toBeGreaterThan(1000);
  });

  it('is big: each half wider across than it is long, as long as island 11 is wide', () => {
    expect(BODY.half * 2).toBeGreaterThan(1200);
    expect(CAP.w + CAP.rw - CHANNEL).toBeGreaterThan(800);
    expect(ENDLESS13.r).toBeGreaterThanOrEqual(CAP.w + CAP.rw - 1);
  });

  it('puts each fort at the far end of its half, its gate toward the channel, its flag inside', () => {
    for (const side of SIDES) {
      // In through the gate, from the channel side, to the flag.
      for (let w = FORT.w - FORT.r - 30; w < FORT.w - 10; w += 4) {
        const [x, y] = atHalf(side, 0, w);
        expect(walkable(x, y, 0)).toBe(true);
      }
      // The wall all round but the gate.
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 4, (-3 * Math.PI) / 4]) {
        const [x, y] = atHalf(side, FORT.u + Math.cos(a) * FORT.r, FORT.w + Math.sin(a) * FORT.r);
        expect(onLand(x, y)).toBe(false);
      }
      // The flagpole.
      const [fx, fy] = atHalf(side, FORT.u, FORT.w);
      expect(onLand(fx, fy)).toBe(false);
      // Inside, round the flag: room to stand.
      const [ix, iy] = atHalf(side, FORT.u + 40, FORT.w);
      expect(onLand(ix, iy)).toBe(true);
    }
  });

  it('keeps the graveyard, the base, the peak and the great tree, and the trees, solid', () => {
    for (const side of SIDES) {
      for (const [u, w] of [
        [GRAVE.u, GRAVE.w],
        [BASE.u, BASE.w],
        [PEAK.u, PEAK.w],
        ...TREES13,
      ] as const) {
        const [x, y] = atHalf(side, u, w);
        expect(onLand(x, y)).toBe(false);
      }
      // A base's ring round its middle can be stood in.
      const [bx, by] = atHalf(side, BASE.u + BASE.r - 8, BASE.w);
      expect(onLand(bx, by)).toBe(true);
    }
  });

  it('joins the halves with two rope bridges and the sandbar; the rest of the channel is deep water', () => {
    for (const b of BRIDGES13) {
      for (let v = -CHANNEL - 20; v <= CHANNEL + 20; v += 10) {
        const [x, y] = fromEndless(b, v);
        expect(onLand(x, y)).toBe(true);
        expect(inEndlessShallows(x, y)).toBe(false);
      }
      // Up on its deck over the middle, ramped down at the ends.
      const [mx, my] = fromEndless(b, 0);
      expect(groundZ(mx, my)).toBeCloseTo(BRIDGE13.z, 5);
      const [ex, ey] = fromEndless(b, BRIDGE13.w - 2);
      expect(groundZ13(ex, ey)).toBeLessThan(1);
      // Off its side into the water.
      const [ox, oy] = fromEndless(b + BRIDGE13.half + 10, 0);
      expect(onLand(ox, oy)).toBe(false);
    }
    // The channel between the bridges and the shallows, and out beyond the bridges: deep.
    for (const u of [-500, -450, 450, 500]) {
      const [x, y] = fromEndless(u, 0);
      expect(onLand(x, y)).toBe(false);
    }
    // The sandbar can be walked, all but the wreck on it.
    const [sx, sy] = fromEndless(SANDBAR.ru - 20, 0);
    expect(onLand(sx, sy)).toBe(true);
    expect(inEndlessShallows(sx, sy)).toBe(false);
    const [wx, wy] = fromEndless(0, 0);
    expect(onLand(wx, wy)).toBe(false);
  });

  it('lets the shallows round the sandbar be waded, from one shore all the way to the other', () => {
    // Straight across, either side of the sandbar and over it beside the wreck: every step walkable, from the ninjas'
    // land to the pirates'.
    for (const u of [-200, -100, -70, 70, 100, 200]) {
      const [x0, y0] = atHalf('ninja', u, CHANNEL + 60);
      const [x1, y1] = atHalf('pirate', u, CHANNEL + 60);
      expect(onLand(x0, y0) && onLand(x1, y1)).toBe(true);
      let wet = 0;
      for (let v = -CHANNEL - 60; v <= CHANNEL + 60; v += 4) {
        const [x, y] = fromEndless(u, v);
        expect(walkable(x, y, 0)).toBe(true);
        if (inEndlessShallows(x, y)) wet++;
      }
      expect(wet).toBeGreaterThan(20);
    }
    // On the beach either side it is dry going, not wading.
    const [bx, by] = atHalf('pirate', 0, CHANNEL + 40);
    expect(onLand(bx, by)).toBe(true);
    expect(inEndlessShallows(bx, by)).toBe(false);
  });

  it('wades the shallows at half pace', () => {
    for (let v = -CHANNEL + 10; v <= CHANNEL - 10; v += 8) {
      const [x, y] = fromEndless(0, v);
      if (Math.abs(v) <= SANDBAR.rv) continue;
      expect(onLand(x, y)).toBe(true);
      expect(inEndlessShallows(x, y)).toBe(true);
    }
    expect(WADE_PACE).toBe(0.5);
    expect(WALK_SPEED * WADE_PACE).toBeLessThan(WALK_SPEED);
  });

  it('runs a pier off each half toward home, its dock past the end, the figure landing on the planks', () => {
    expect(ENDLESS_P_DOCK.x).toBe(DOCK13.pirate.x);
    expect(ENDLESS_N_DOCK.y).toBe(DOCK13.ninja.y);
    for (const [side, dock] of [
      ['pirate', ENDLESS_P_DOCK],
      ['ninja', ENDLESS_N_DOCK],
    ] as const) {
      expect(dockAt(dock.x, dock.y)).toBe(dock);
      const land = LANDING13[side];
      expect(walkable(land.x, land.y, 0)).toBe(true);
      expect(groundZ(land.x, land.y)).toBe(PIER13_Z);
      // The boat ties up in the water at the pier's end, inside the dock's ring.
      const b = berth13(side, 1);
      expect(onLand(b.x, b.y)).toBe(false);
      expect(Math.hypot(b.x - dock.x, b.y - dock.y)).toBeLessThan(dock.r);
      expect(Math.hypot(b.x - land.x, b.y - land.y)).toBeLessThan(60);
      // Bow in toward the pier: heading toward the island, against home.
      const [u0] = toEndless(b.x, b.y);
      const [u1] = toEndless(b.x + Math.cos(b.h) * 10, b.y + Math.sin(b.h) * 10);
      expect(u1).toBeLessThan(u0);
      // The pier's root is on the land, and the crates by it.
      const [rx, ry] = atHalf(side, PIER13.u0 + 20, PIER13.w);
      expect(onEndless(rx, ry)).toBe(true);
      const c = CRATES13[side];
      expect(insideEndless(c.x, c.y, 0)).toBe(true);
    }
  });

  it('keeps a hull off its shores, out of the channel and off its piers', () => {
    const k = 24;
    // From inside the channel.
    const s = { x: 0, y: 0, v: 10 };
    [s.x, s.y] = fromEndless(-450, 10);
    pushOffEndless(s, k);
    expect(insideEndless(s.x, s.y, k - 1)).toBe(false);
    // From up on a half.
    [s.x, s.y] = atHalf('ninja', 100, 600);
    pushOffEndless(s, k);
    expect(insideEndless(s.x, s.y, k - 1)).toBe(false);
    // Into the side of a pier.
    [s.x, s.y] = atHalf('pirate', PIER13.u0 + 140, PIER13.w + 4);
    pushOffEndless(s, k);
    const [, v] = toEndless(s.x, s.y);
    expect(Math.abs(Math.abs(v) - PIER13.w)).toBeGreaterThanOrEqual(PIER13.half + k - 0.01);
    // Out in open water, nothing moves.
    const far = { x: ENDLESS.x + 3000, y: ENDLESS.y, v: 10 };
    pushOffEndless(far, k);
    expect(far.x).toBe(ENDLESS.x + 3000);
  });

  it('is sighted from out at sea, and nothing far off needs to know it is there', () => {
    const [x, y] = fromEndless(endlessEdge(0) + SIGHT13 - 10, 0);
    expect(nearEndless(x, y, SIGHT13)).toBe(true);
    const [fx, fy] = fromEndless(endlessEdge(0) + SIGHT13 + 200, 0);
    expect(nearEndless(fx, fy, SIGHT13)).toBe(false);
    expect(onEndless(ENDLESS.x + 3000, ENDLESS.y)).toBe(false);
  });

  it('pulls the camera back far enough on a phone to see both halves when first sighted', () => {
    const z = 1;
    const k = revealZoom13(390, 780, z);
    expect(k).toBeGreaterThan(0.08);
    expect(k).toBeLessThan(1);
    // Both halves across the screen, and both down it.
    expect(2 * BODY.half * z * k).toBeLessThanOrEqual(390 - 36 + 0.01);
    expect((CAP.w + CAP.rw) * z * k).toBeLessThanOrEqual(780 * 0.72 + 0.01);
  });

  it('draws the shallows and channel, both halves, and everything standing on them', () => {
    const f = fakeView();
    drawEndlessSea(f.v);
    drawEndlessFlat(f.v);
    const solids = endlessSolids(f.v);
    // Each half: its wall in segments (the gate leaves out a few) and two gateposts, the flag, the graveyard, the base,
    // the landmark, its trees and its crates; and the wreck.
    expect(solids.length).toBeGreaterThan(2 * (15 + 2 + 4 + TREES13.length + 1));
    for (const s of solids) s.f();
    expect(f.calls.fill ?? 0).toBeGreaterThan(100);
  });

  it('fades the great tree, or the peak, to a ghost while the figure or boat is behind it, and back after', () => {
    const f = fakeView();
    const [tx, ty] = atHalf('pirate', PEAK.u, PEAK.w);
    const [nx, ny] = atHalf('ninja', PEAK.u, PEAK.w);
    // Up the screen from the tree, straight above its trunk, under its crown.
    const hid = { x: tx - 100, y: ty - 100 };
    let T = 0;
    for (let i = 0; i < 40; i++) {
      f.v.T = T += 1 / 30;
      endlessSolids(f.v, hid);
    }
    expect(landmarkFade('pirate')).toBeLessThan(0.4);
    expect(landmarkFade('ninja')).toBeGreaterThan(0.95);
    // In front of it, it comes back solid.
    for (let i = 0; i < 60; i++) {
      f.v.T = T += 1 / 30;
      endlessSolids(f.v, { x: tx + 60, y: ty + 60 });
    }
    expect(landmarkFade('pirate')).toBeGreaterThan(0.95);
    // Behind the peak, out at sea past the ninjas' end.
    for (let i = 0; i < 40; i++) {
      f.v.T = T += 1 / 30;
      endlessSolids(f.v, { x: nx - 80, y: ny - 80 });
    }
    expect(landmarkFade('ninja')).toBeLessThan(0.4);
  });

  it('draws nothing when it is far off the screen', () => {
    const f = fakeView();
    f.onScreen = false;
    drawEndlessSea(f.v);
    drawEndlessFlat(f.v);
    expect(endlessSolids(f.v)).toHaveLength(0);
    expect(f.calls.fill ?? 0).toBe(0);
  });
});
