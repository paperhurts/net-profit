import { describe, expect, it } from 'vitest';
import { drawTarIsleGround, tarIsleSolids } from '../../src/render/tarisle';
import { METAL_BRIDGE, NORTH_EDGE } from '../../src/world/metalbridge';
import {
  atIsleBerth,
  HILL_H,
  ISLE_BERTH,
  JETTY,
  JETTY_END,
  keepOffIsle,
  onIsleRock,
  onTarIsle,
  SHORE_OFF,
  shoreR,
  TAR_ISLE,
  TAR_ROCKS,
  TAR_TOWER,
  TAR_TREES,
  TOWER_DOOR,
  tarIsleAction,
  tarIsleZ,
} from '../../src/world/tarisle';
import { TAR_BERTH, TAR_SEA } from '../../src/world/tarsea';
import { fakeView } from './helpers/view';

describe('the tar island', () => {
  it('lies out on the tar north of the bridge, near enough to see from it', () => {
    expect(TAR_ISLE.x - TAR_ISLE.r).toBeGreaterThan(TAR_SEA.x0 + 500);
    expect(TAR_ISLE.x + TAR_ISLE.r).toBeLessThan(TAR_SEA.x1 - 500);
    expect(TAR_ISLE.y + TAR_ISLE.r + 500).toBeLessThan(NORTH_EDGE);
    expect(TAR_ISLE.y - TAR_ISLE.r).toBeGreaterThan(TAR_SEA.y0 + 500);
    const far = Math.hypot(TAR_ISLE.x - METAL_BRIDGE.x, TAR_ISLE.y - NORTH_EDGE);
    expect(far).toBeLessThan(5000);
    expect(Math.hypot(TAR_ISLE.x - TAR_BERTH.x, TAR_ISLE.y - TAR_BERTH.y)).toBeGreaterThan(2000);
  });

  it('is walked on its rock and its jetty, not into the tower, a rock, a tree or the tar', () => {
    expect(onTarIsle(JETTY_END.x, JETTY_END.y)).toBe(true);
    expect(onTarIsle(TOWER_DOOR.x, TOWER_DOOR.y)).toBe(true);
    expect(onTarIsle(TAR_ISLE.x + 150, TAR_ISLE.y - 100)).toBe(true);
    expect(onTarIsle(TAR_TOWER.x, TAR_TOWER.y)).toBe(false);
    for (const r of TAR_ROCKS) expect(onTarIsle(r.x, r.y)).toBe(false);
    for (const t of TAR_TREES) {
      expect(onIsleRock(t.x, t.y)).toBe(true);
      expect(onTarIsle(t.x, t.y)).toBe(false);
    }
    expect(onTarIsle(TAR_ISLE.x + TAR_ISLE.r + 60, TAR_ISLE.y)).toBe(false);
    expect(onTarIsle(JETTY.x + JETTY.half + 10, JETTY.y1 - 10)).toBe(false);
  });

  it('can be walked from the jetty end, up the jetty and the hill, to the tower door', () => {
    const top = { x: JETTY.x, y: JETTY.y0 + 10 };
    const legs = [
      [JETTY_END, top],
      [top, TOWER_DOOR],
    ] as const;
    for (const [a, b] of legs)
      for (let k = 0; k <= 40; k++) {
        const x = a.x + (b.x - a.x) * (k / 40);
        const y = a.y + (b.y - a.y) * (k / 40);
        expect(onTarIsle(x, y)).toBe(true);
      }
  });

  it('rises to a hill in its middle, flat at its shore, the jetty just over the tar', () => {
    expect(tarIsleZ(TAR_ISLE.x, TAR_ISLE.y)).toBeCloseTo(HILL_H);
    expect(tarIsleZ(TOWER_DOOR.x, TOWER_DOOR.y)).toBeGreaterThan(HILL_H * 0.6);
    expect(tarIsleZ(TAR_ISLE.x - 380, TAR_ISLE.y)).toBe(0);
    expect(tarIsleZ(JETTY_END.x, JETTY_END.y)).toBe(4);
    expect(shoreR(1)).toBeGreaterThan(TAR_ISLE.r * 0.85);
  });

  it('ties the chemistry boat up alongside the jetty, stopped, and keeps it off the rock', () => {
    expect(atIsleBerth({ x: ISLE_BERTH.x, y: ISLE_BERTH.y + 40, v: 0 })).toBe(true);
    expect(atIsleBerth({ x: ISLE_BERTH.x, y: ISLE_BERTH.y, v: 100 })).toBe(false);
    expect(atIsleBerth({ x: ISLE_BERTH.x, y: ISLE_BERTH.y + 400, v: 0 })).toBe(false);
    const b = { x: TAR_ISLE.x - 100, y: TAR_ISLE.y, v: 200 };
    keepOffIsle(b);
    expect(Math.hypot(b.x - TAR_ISLE.x, b.y - TAR_ISLE.y)).toBeGreaterThanOrEqual(
      shoreR(Math.PI) + SHORE_OFF - 0.01,
    );
    expect(b.v).toBe(100);
    const at = { ...ISLE_BERTH, v: 30 };
    keepOffIsle(at);
    expect(at).toEqual({ ...ISLE_BERTH, v: 30 });
  });

  it('is left at the jetty end, and its tower tried at the door', () => {
    expect(tarIsleAction(JETTY_END.x, JETTY_END.y)).toBe('tarboard');
    expect(tarIsleAction(TOWER_DOOR.x, TOWER_DOOR.y)).toBe('tartower');
    expect(tarIsleAction(TAR_ISLE.x - 200, TAR_ISLE.y)).toBeNull();
  });

  it('is drawn: its rock and jetty, and the tower, trees and boulders standing on it', () => {
    const f = fakeView();
    drawTarIsleGround(f.v);
    expect(f.calls.fill ?? 0).toBeGreaterThan(10);
    const solids = tarIsleSolids(f.v);
    expect(solids).toHaveLength(1 + TAR_TREES.length + TAR_ROCKS.length);
    for (const o of solids) o.f();
    expect(f.calls.extrude ?? 0).toBe(1);
    f.onScreen = false;
    expect(tarIsleSolids(f.v)).toEqual([]);
  });
});
