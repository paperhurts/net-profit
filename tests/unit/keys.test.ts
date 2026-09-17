import { describe, expect, it } from 'vitest';
import { bindKeys, type KeyLike, type KeyTarget, keyVector } from '../../src/input/keys';

const H = Math.SQRT1_2;

describe('keyVector', () => {
  it('maps each key to its screen direction, arrows and WASD alike', () => {
    expect(keyVector(new Set(['w']))).toEqual([0, -1]);
    expect(keyVector(new Set(['arrowup']))).toEqual([0, -1]);
    expect(keyVector(new Set(['s']))).toEqual([0, 1]);
    expect(keyVector(new Set(['a']))).toEqual([-1, 0]);
    expect(keyVector(new Set(['arrowright']))).toEqual([1, 0]);
  });

  it('normalises diagonals so they are no faster than straights', () => {
    const [x, y] = keyVector(new Set(['d', 's']));
    expect(x).toBeCloseTo(H);
    expect(y).toBeCloseTo(H);
    const [ax, ay] = keyVector(new Set(['w', 'a']));
    expect(ax).toBeCloseTo(-H);
    expect(ay).toBeCloseTo(-H);
  });

  it('cancels opposing keys and is zero with nothing held', () => {
    expect(keyVector(new Set(['a', 'd']))).toEqual([0, 0]);
    expect(keyVector(new Set())).toEqual([0, 0]);
    expect(keyVector(new Set(['x', 'shift']))).toEqual([0, 0]);
  });
});

class FakeTarget implements KeyTarget {
  listeners = new Map<string, ((e: KeyLike) => void)[]>();
  addEventListener(type: string, listener: (e: KeyLike) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  fire(type: string, key: string): { prevented: boolean } {
    const out = { prevented: false };
    for (const l of this.listeners.get(type) ?? []) {
      l({
        key,
        preventDefault: () => {
          out.prevented = true;
        },
      });
    }
    return out;
  }
}

describe('bindKeys', () => {
  it('tracks steering keys case-insensitively and ignores the rest', () => {
    const target = new FakeTarget();
    const keys = new Set<string>();
    let presses = 0;
    bindKeys(target, keys, () => presses++);

    target.fire('keydown', 'W');
    target.fire('keydown', 'ArrowLeft');
    target.fire('keydown', 'x');
    expect([...keys].sort()).toEqual(['arrowleft', 'w']);
    expect(presses).toBe(2);

    target.fire('keyup', 'w');
    expect([...keys]).toEqual(['arrowleft']);
  });

  it('stops arrows from scrolling the page but leaves letters alone', () => {
    const target = new FakeTarget();
    bindKeys(target, new Set(), () => {});
    expect(target.fire('keydown', 'ArrowDown').prevented).toBe(true);
    expect(target.fire('keydown', 'd').prevented).toBe(false);
    expect(target.fire('keydown', 'x').prevented).toBe(false);
  });
});
