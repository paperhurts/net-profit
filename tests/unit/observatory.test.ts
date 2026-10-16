import { describe, expect, it } from 'vitest';
import { LEVIATHANS, nextSeen, SCOPE_AT, SCOPE_REACH, seaZone } from '../../src/data/observatory';
import { isScanKind, SCANS } from '../../src/data/scans';
import { DEEP, FAR, IX, IY, WS } from '../../src/world/island';
import { entry, GATE, ROOMS, stairs } from '../../src/world/tower';

describe('the observatory', () => {
  it("watches every leviathan, by the scanner's names, each once", () => {
    expect(new Set(LEVIATHANS.map((l) => l.k)).size).toBe(LEVIATHANS.length);
    for (const l of LEVIATHANS) {
      expect(isScanKind(l.k)).toBe(true);
      expect(l.name).toBe(SCANS[l.k].name);
      expect(l.short.length).toBeLessThan(14);
    }
  });

  it('says which part of the sea one is in', () => {
    expect(seaZone(IX, IY)).toBe('in home water');
    expect(seaZone(WS + DEEP / 2, IY)).toBe('out in the deep');
    expect(seaZone(IX, -DEEP - FAR / 2)).toBe('in the far deep');
    expect(seaZone(WS + DEEP + FAR + 300, IY)).toBe('in the far far sea');
  });

  it('turns round the list both ways', () => {
    expect([nextSeen(0, 1, 8), nextSeen(7, 1, 8), nextSeen(0, -1, 8), nextSeen(3, -1, 8)]).toEqual([
      1, 0, 7, 2,
    ]);
    expect(nextSeen(0, 1, 0)).toBe(0);
  });

  it('stands in the courtyard clear of the way in and the stairs', () => {
    const R = ROOMS[GATE];
    if (!R) throw new Error('no courtyard');
    const at = { x: R.x + SCOPE_AT.dx, y: R.y + SCOPE_AT.dy };
    expect(Math.hypot(at.x - R.x, at.y - R.y)).toBeLessThan(R.r - 30);
    for (const p of [entry(GATE), stairs(GATE)])
      expect(Math.hypot(at.x - p.x, at.y - p.y)).toBeGreaterThan(SCOPE_REACH + 20);
  });
});
