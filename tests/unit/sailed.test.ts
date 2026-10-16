import { describe, expect, it } from 'vitest';
import {
  cellAt,
  decodeSailed,
  encodeSailed,
  isSailed,
  noSailed,
  OLD_AT,
  OLD_N,
  SAILED_CELL,
  SAILED_N,
  SAILED_SIGHT,
  SEA_MIN,
  SEA_SPAN,
  sail,
  sailAll,
  sailedCount,
  sailedShare,
  seedSailed,
} from '../../src/state/sailed';
import { DEEP, FAR, FARFAR, IX, IY, WS } from '../../src/world/island';
import { ISLE6 } from '../../src/world/isle6';

describe('the sea sailed, for the map', () => {
  it('covers the whole sea, the far far sea included, in cells', () => {
    expect(SEA_MIN).toBe(-DEEP - FAR - FARFAR);
    expect(SEA_SPAN).toBe(WS + 2 * (DEEP + FAR + FARFAR));
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
    // Of the sea out to the far deep's edge, which is what the map shows until the far far sea is open.
    const share = sailedShare(s, false);
    expect(share).toBeGreaterThan(0.02);
    expect(share).toBeLessThan(0.15);
    expect(sailedShare(s)).toBeLessThan(share);
  });

  it('keeps in the save as a short string, and a missing or broken one is all fog', () => {
    const s = noSailed();
    sail(s, IX, IY);
    sail(s, ISLE6.x, ISLE6.y);
    const text = encodeSailed(s);
    expect(text.length).toBeLessThan(1100);
    expect(decodeSailed(text)).toEqual(s);
    for (const bad of [undefined, '', 'not base64!', 42, btoa('short')])
      expect(sailedCount(decodeSailed(bad))).toBe(0);
  });

  it('keeps every cell a save from before the far far sea had sailed, moved in to where it now is', () => {
    // The old map: a square out to the far deep's edge, its cells counted from that corner.
    const oldMin = -DEEP - FAR;
    const old = new Uint8Array(Math.ceil((OLD_N * OLD_N) / 8));
    const mark = (x: number, y: number) => {
      const n =
        Math.floor((y - oldMin) / SAILED_CELL) * OLD_N + Math.floor((x - oldMin) / SAILED_CELL);
      old[n >> 3] = (old[n >> 3] ?? 0) | (1 << (n & 7));
    };
    const places: [number, number][] = [
      [IX, IY],
      [ISLE6.x, ISLE6.y],
      [oldMin + 1, oldMin + 1],
      [WS + DEEP + FAR - 1, WS + DEEP + FAR - 1],
    ];
    for (const [x, y] of places) mark(x, y);
    let bin = '';
    for (const b of old) bin += String.fromCharCode(b);
    const s = decodeSailed(btoa(bin));
    expect(sailedCount(s)).toBe(places.length);
    for (const [x, y] of places) {
      const c = cellAt(x, y) as [number, number];
      expect(isSailed(s, c[0], c[1])).toBe(true);
    }
    expect(OLD_AT * SAILED_CELL).toBe(FARFAR);
    // The far far sea is all fog still.
    const out = cellAt(WS + DEEP + FAR + 100, IY) as [number, number];
    expect(isSailed(s, out[0], out[1])).toBe(false);
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

  it('opens the whole sea for the tester, every cell and no more, and it still saves', () => {
    const s = noSailed();
    sail(s, IX, IY);
    sailAll(s);
    expect(sailedShare(s)).toBe(1);
    expect(sailedShare(s, false)).toBe(1);
    expect(isSailed(s, 0, 0)).toBe(true);
    expect(isSailed(s, SAILED_N - 1, SAILED_N - 1)).toBe(true);
    expect(decodeSailed(encodeSailed(s))).toEqual(s);
  });
});
