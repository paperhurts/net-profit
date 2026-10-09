import { describe, expect, it } from 'vitest';
import {
  cellAt,
  decodeSailed,
  encodeSailed,
  isSailed,
  noSailed,
  SAILED_CELL,
  SAILED_N,
  SAILED_SIGHT,
  SEA_MIN,
  SEA_SPAN,
  sail,
  sailedCount,
  sailedShare,
  seedSailed,
} from '../../src/state/sailed';
import { DEEP, FAR, IX, IY, WS } from '../../src/world/island';
import { ISLE6 } from '../../src/world/isle6';

describe('the sea sailed, for the map', () => {
  it('covers the whole sea, the far deep included, in cells', () => {
    expect(SEA_MIN).toBe(-DEEP - FAR);
    expect(SEA_SPAN).toBe(WS + 2 * (DEEP + FAR));
    expect(SAILED_N * SAILED_CELL).toBeGreaterThanOrEqual(SEA_SPAN);
    expect(cellAt(SEA_MIN + 1, SEA_MIN + 1)).toEqual([0, 0]);
    expect(cellAt(SEA_MIN + SEA_SPAN - 1, SEA_MIN + SEA_SPAN - 1)).toEqual([
      SAILED_N - 1,
      SAILED_N - 1,
    ]);
    expect(cellAt(SEA_MIN - 10, IY)).toBeNull();
  });

  it('starts all fog, and opens the water round the boat as far as it can see', () => {
    const s = noSailed();
    expect(sailedCount(s)).toBe(0);
    const opened = sail(s, IX + 900, IY);
    expect(opened).toBeGreaterThan(10);
    const c = cellAt(IX + 900, IY) as [number, number];
    expect(isSailed(s, c[0], c[1])).toBe(true);
    const near = cellAt(IX + 900 + SAILED_SIGHT - 120, IY) as [number, number];
    expect(isSailed(s, near[0], near[1])).toBe(true);
    const far = cellAt(IX + 900 + SAILED_SIGHT + 300, IY) as [number, number];
    expect(isSailed(s, far[0], far[1])).toBe(false);
    // Sailing the same water again opens nothing new.
    expect(sail(s, IX + 900, IY)).toBe(0);
  });

  it('opens the sea a trip at a time: more of it the further the boat goes', () => {
    const s = noSailed();
    for (let x = 0; x <= WS; x += 50) sail(s, x, IY);
    const share = sailedShare(s);
    expect(share).toBeGreaterThan(0.02);
    expect(share).toBeLessThan(0.15);
  });

  it('keeps in the save as a short string, and a missing or broken one is all fog', () => {
    const s = noSailed();
    sail(s, IX, IY);
    sail(s, ISLE6.x, ISLE6.y);
    const text = encodeSailed(s);
    expect(text.length).toBeLessThan(600);
    expect(decodeSailed(text)).toEqual(s);
    for (const bad of [undefined, '', 'not base64!', 42, btoa('short')])
      expect(sailedCount(decodeSailed(bad))).toBe(0);
  });

  it('gives a save from before the map the sea round home and the islands found', () => {
    const s = noSailed();
    seedSailed(s, [ISLE6]);
    const home = cellAt(IX + 1500, IY - 1500) as [number, number];
    expect(isSailed(s, home[0], home[1])).toBe(true);
    const six = cellAt(ISLE6.x, ISLE6.y) as [number, number];
    expect(isSailed(s, six[0], six[1])).toBe(true);
    const deep = cellAt(-DEEP / 2, IY) as [number, number];
    expect(isSailed(s, deep[0], deep[1])).toBe(false);
  });
});
