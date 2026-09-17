import { describe, expect, it } from 'vitest';
import { baseZoom, dirToWorld, K, onScreen, screenX, screenY, type View } from '../../src/core/iso';

/** A phone-sized view with the camera on the island and no shake. */
const view: View = {
  camX: 2400,
  camY: 2400,
  zoom: 1,
  width: 390,
  height: 780,
  shakeX: 0,
  shakeY: 0,
  viewDY: 0,
};

describe('projection', () => {
  it('draws the camera point at the centre of the screen', () => {
    expect(screenX(2400, 2400, view)).toBe(195);
    expect(screenY(2400, 2400, 0, view)).toBe(390);
  });

  it('moves +x in the world right and down, +y left and down', () => {
    const cx = screenX(2400, 2400, view);
    const cy = screenY(2400, 2400, 0, view);
    expect(screenX(2500, 2400, view) - cx).toBeCloseTo(100 * K);
    expect(screenY(2500, 2400, 0, view) - cy).toBeCloseTo((100 * K) / 2);
    expect(screenX(2400, 2500, view) - cx).toBeCloseTo(-100 * K);
    expect(screenY(2400, 2500, 0, view) - cy).toBeCloseTo((100 * K) / 2);
  });

  it('squashes a world circle into an ellipse twice as wide as it is tall', () => {
    const r = 100;
    // The circle's widest screen extent is along the world diagonal x = -y.
    const halfWidth = screenX(2400 + r / Math.SQRT2, 2400 - r / Math.SQRT2, view) - 195;
    // Its tallest extent is along x = y.
    const halfHeight = screenY(2400 + r / Math.SQRT2, 2400 + r / Math.SQRT2, 0, view) - 390;
    expect(halfWidth).toBeCloseTo(r);
    expect(halfHeight).toBeCloseTo(r / 2);
  });

  it('lifts a point by its height times the zoom', () => {
    const z2 = { ...view, zoom: 1.2 };
    expect(screenY(2400, 2400, 0, z2) - screenY(2400, 2400, 25, z2)).toBeCloseTo(25 * 1.2);
  });

  it('applies shake and the dock offset last, unscaled', () => {
    const shaken = { ...view, zoom: 1.3, shakeX: 4, shakeY: -3, viewDY: 60 };
    expect(screenX(2400, 2400, shaken)).toBe(199);
    expect(screenY(2400, 2400, 0, shaken)).toBe(447);
  });
});

describe('dirToWorld', () => {
  it('inverts the projection for any direction', () => {
    for (const [wx, wy] of [
      [1, 0],
      [0, 1],
      [3, -4],
      [-2.5, -2.5],
    ] as const) {
      const sx = (wx - wy) * K;
      const sy = ((wx + wy) * K) / 2;
      const [bx, by] = dirToWorld(sx, sy);
      expect(bx).toBeCloseTo(wx);
      expect(by).toBeCloseTo(wy);
    }
  });
});

describe('onScreen', () => {
  it('keeps the camera point and rejects a point far off the edge', () => {
    expect(onScreen(2400, 2400, 0, view)).toBe(true);
    expect(onScreen(2400 + 5000, 2400 - 5000, 0, view)).toBe(false);
  });

  it('lets the margin pull a just-offscreen point back in', () => {
    // 300 world units along x = -y is 300 screen pixels right of centre: past 390 wide.
    const wx = 2400 + 300 / Math.SQRT2;
    const wy = 2400 - 300 / Math.SQRT2;
    expect(onScreen(wx, wy, 0, view)).toBe(false);
    expect(onScreen(wx, wy, 120, view)).toBe(true);
  });
});

describe('baseZoom', () => {
  it('is the short side over 500, clamped', () => {
    expect(baseZoom(390, 780)).toBeCloseTo(0.78);
    expect(baseZoom(300, 300)).toBe(0.62);
    expect(baseZoom(1000, 1000)).toBe(1.35);
  });
});
