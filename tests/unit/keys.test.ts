import { describe, expect, it } from 'vitest';
import {
  bindKeys,
  type KeyLike,
  type KeyTarget,
  keyControls,
  keyVector,
  SMOOTH_TAU,
  smoothVector,
} from '../../src/input/keys';

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

describe('keyControls (relative candidate)', () => {
  it('turns with A and D, throttles with W, brakes with S', () => {
    expect(keyControls(new Set(['a']))).toEqual({ turn: -1, throttle: 0, brake: false });
    expect(keyControls(new Set(['d']))).toEqual({ turn: 1, throttle: 0, brake: false });
    expect(keyControls(new Set(['a', 'd']))).toEqual({ turn: 0, throttle: 0, brake: false });
    expect(keyControls(new Set(['w']))).toEqual({ turn: 0, throttle: 1, brake: false });
    expect(keyControls(new Set(['w', 's']))).toEqual({ turn: 0, throttle: 0, brake: true });
    expect(keyControls(new Set(['arrowup', 'arrowright']))).toEqual({
      turn: 1,
      throttle: 1,
      brake: false,
    });
    expect(keyControls(new Set())).toEqual({ turn: 0, throttle: 0, brake: false });
  });
});

describe('smoothVector (smoothed candidate)', () => {
  it('eases toward the target over about tau seconds and settles', () => {
    const s = { x: 0, y: 0 };
    for (let t = 0; t < SMOOTH_TAU; t += 1 / 60) smoothVector(s, 1, 0, 1 / 60);
    expect(s.x).toBeGreaterThan(0.55);
    expect(s.x).toBeLessThan(0.75);
    for (let i = 0; i < 120; i++) smoothVector(s, 1, 0, 1 / 60);
    expect(s.x).toBeCloseTo(1, 2);
  });

  it('turns through the middle when the key flips, and snaps to rest when released', () => {
    const s = { x: 1, y: 0 };
    smoothVector(s, -1, 0, 1 / 60);
    expect(s.x).toBeLessThan(1);
    expect(s.x).toBeGreaterThan(-1);
    for (let i = 0; i < 120; i++) smoothVector(s, 0, 0, 1 / 60);
    expect(s).toEqual({ x: 0, y: 0 });
  });
});
