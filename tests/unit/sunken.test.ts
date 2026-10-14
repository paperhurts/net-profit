import { describe, expect, it } from 'vitest';
import { Sunken } from '../../src/entities/sunken';
import { IX, IY } from '../../src/world/island';
import {
  SNAG_REACH,
  SUNKEN,
  SUNKEN_COUNT,
  SUNKEN_DEEP,
  SUNKEN_FAR,
  SUNKEN_HOME,
  seaPart,
  sunkenFor,
} from '../../src/world/sunken';
import { baseWorld } from './helpers/world';

const open = () => true;

describe('the sunken treasure', () => {
  it('a day has so many in home water, the deep and the far deep, apart, and away from home', () => {
    for (const day of [1, 2, 7, 30]) {
      const list = sunkenFor(day, open);
      expect(list).toHaveLength(SUNKEN_COUNT);
      const parts = list.map((s) => seaPart(s.x, s.y));
      expect(parts.filter((p) => p === 'home')).toHaveLength(SUNKEN_HOME);
      expect(parts.filter((p) => p === 'deep')).toHaveLength(SUNKEN_DEEP);
      expect(parts.filter((p) => p === 'far')).toHaveLength(SUNKEN_FAR);
      for (const s of list) {
        expect(Math.hypot(s.x - IX, s.y - IY)).toBeGreaterThan(400);
        expect(s.coins).toBe(SUNKEN[s.kind].coins);
        expect(s.name).toBe(SUNKEN[s.kind].name);
        for (const o of list)
          if (o !== s) expect(Math.hypot(o.x - s.x, o.y - s.y)).toBeGreaterThan(400);
      }
    }
  });

  it('the same day always sinks the same treasure, and the next day somewhere else', () => {
    expect(sunkenFor(5, open)).toEqual(sunkenFor(5, open));
    expect(sunkenFor(6, open)[0]).not.toEqual(sunkenFor(5, open)[0]);
  });

  it('only where the sea is clear', () => {
    const clear = (x: number, _y: number) => x > IX;
    for (const s of sunkenFor(3, clear)) expect(s.x).toBeGreaterThan(IX);
  });

  it('the net snags one it is towed over, once, only with the finder fitted, and not docked', () => {
    const t = new Sunken();
    const list = sunkenFor(4, open);
    t.set(list, 0);
    const s = list[2];
    if (!s) throw new Error('no treasure');
    const snags: number[] = [];
    t.onSnag = (_s, i) => snags.push(i);
    const over = baseWorld({ net: { x: s.x + 10, y: s.y, speed: 40, torn: 0 } });
    t.update(1 / 60, over);
    expect(snags).toEqual([]);
    t.on = true;
    t.update(1 / 60, { ...over, docked: true });
    expect(snags).toEqual([]);
    t.update(1 / 60, over);
    t.update(1 / 60, over);
    expect(snags).toEqual([2]);
    expect(t.left(2)).toBe(false);
    expect(t.found).toBe(1 << 2);
    // Just out of reach of the net's half width and a bit, nothing.
    const s3 = list[3];
    if (!s3) throw new Error('no treasure');
    const reach = over.netWidth * 0.5 + SNAG_REACH;
    t.update(1 / 60, baseWorld({ net: { x: s3.x + reach + 1, y: s3.y, speed: 40, torn: 0 } }));
    expect(snags).toEqual([2]);
  });

  it('shows gold on the radar, each still down there, only with the finder', () => {
    const t = new Sunken();
    t.set(sunkenFor(9, open), 0b101);
    const kinds: string[] = [];
    t.radar((_x, _y, k) => kinds.push(k));
    expect(kinds).toEqual([]);
    t.on = true;
    t.radar((_x, _y, k) => kinds.push(k));
    expect(kinds).toHaveLength(SUNKEN_COUNT - 2);
    expect(new Set(kinds)).toEqual(new Set(['treasure']));
  });
});
