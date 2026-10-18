import { describe, expect, it } from 'vitest';
import {
  CHEM_LOOK,
  drawBerth,
  drawChemTop,
  drawTarSea,
  tarEdgeBuoys,
  tarJetty,
} from '../../src/render/tarsea';
import { DEEP, FAR, FARFAR, WS } from '../../src/world/island';
import { METAL_BRIDGE, NORTH_EDGE } from '../../src/world/metalbridge';
import {
  atBerth,
  BERTH_REACH,
  BERTH_STOP,
  CHEM_SPEED,
  keepOnTar,
  onTar,
  SEA_SPAN,
  TAR_BERTH,
  TAR_MARGIN,
  TAR_SEA,
} from '../../src/world/tarsea';
import { fakeView } from './helpers/view';

describe('the tar ocean', () => {
  it('is as big as the whole sea, out to the white buoys, north of the bridge', () => {
    const out = DEEP + FAR + FARFAR;
    expect(SEA_SPAN).toBe(WS + 2 * out);
    expect(TAR_SEA.x1 - TAR_SEA.x0).toBe(SEA_SPAN);
    expect(TAR_SEA.y1 - TAR_SEA.y0).toBe(SEA_SPAN);
    expect(TAR_SEA.y1).toBe(NORTH_EDGE);
    // The bridge stands across it, on the sea's side of the edge.
    expect(METAL_BRIDGE.x - METAL_BRIDGE.len / 2).toBeGreaterThan(TAR_SEA.x0);
    expect(METAL_BRIDGE.x + METAL_BRIDGE.len / 2).toBeLessThan(TAR_SEA.x1);
    expect(onTar(TAR_BERTH.x, TAR_BERTH.y)).toBe(true);
    expect(onTar(METAL_BRIDGE.x, METAL_BRIDGE.face)).toBe(false);
  });

  it('keeps the chemistry boat on the tar, slowed where it runs into an edge', () => {
    const b = { x: TAR_SEA.x0 - 100, y: TAR_SEA.y1 + 50, v: 200 };
    keepOnTar(b);
    expect(b.x).toBe(TAR_SEA.x0 + TAR_MARGIN);
    expect(b.y).toBe(TAR_SEA.y1 - TAR_MARGIN);
    expect(b.v).toBeLessThan(200);
    const free = { x: TAR_BERTH.x, y: TAR_BERTH.y - 500, v: 200 };
    keepOnTar(free);
    expect(free).toEqual({ x: TAR_BERTH.x, y: TAR_BERTH.y - 500, v: 200 });
    expect(CHEM_SPEED).toBeGreaterThan(150);
  });

  it('takes the boat in at its berth only stopped there, out past the bridge where it is seen', () => {
    expect(atBerth({ ...TAR_BERTH, v: 0 })).toBe(true);
    expect(atBerth({ ...TAR_BERTH, v: BERTH_STOP + 5 })).toBe(false);
    expect(atBerth({ x: TAR_BERTH.x, y: TAR_BERTH.y - BERTH_REACH - 10, v: 0 })).toBe(false);
    // Out from the bridge's back far enough that the building does not hide a boat there.
    expect(METAL_BRIDGE.face - METAL_BRIDGE.depth - TAR_BERTH.y).toBeGreaterThan(150);
    // And inside where the boat is kept.
    expect(TAR_BERTH.y).toBeLessThan(TAR_SEA.y1 - TAR_MARGIN);
  });

  it('draws the tar, its edge buoys near them and none out in the middle, the berth, the jetty and the boat', () => {
    const f = fakeView();
    drawTarSea(f.v, 390, 780, TAR_BERTH.x, TAR_BERTH.y);
    expect(f.calls.fillRect).toBe(1);
    expect(f.calls.fill ?? 0).toBeGreaterThan(3);
    expect(
      tarEdgeBuoys(f.v, TAR_SEA.x0 + 100, (TAR_SEA.y0 + TAR_SEA.y1) / 2).length,
    ).toBeGreaterThan(3);
    expect(tarEdgeBuoys(f.v, (TAR_SEA.x0 + TAR_SEA.x1) / 2, (TAR_SEA.y0 + TAR_SEA.y1) / 2)).toEqual(
      [],
    );
    const buoy = tarEdgeBuoys(f.v, (TAR_SEA.x0 + TAR_SEA.x1) / 2, TAR_SEA.y0 + 100)[0];
    expect(buoy).toBeDefined();
    buoy?.f();
    drawBerth(f.v);
    tarJetty(f.v).f();
    expect(f.calls.box ?? 0).toBeGreaterThan(5);
    const top = fakeView();
    drawChemTop(top.v, { x: 0, y: 0, h: 1 });
    expect(top.calls.arc ?? 0).toBeGreaterThan(3);
    expect(CHEM_LOOK.hull).not.toBe(CHEM_LOOK.trim);
  });
});
