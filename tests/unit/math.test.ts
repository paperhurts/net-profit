import { describe, expect, it } from 'vitest';
import { angDiff, clamp, rng, smoothstep } from '../../src/core/math';

describe('clamp', () => {
  it('holds a value between the bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe('angDiff', () => {
  it('is the signed short way round', () => {
    expect(angDiff(0.1, -0.1)).toBeCloseTo(0.2);
    expect(angDiff(-0.1, 0.1)).toBeCloseTo(-0.2);
    expect(angDiff(3.1, -3.1)).toBeCloseTo(6.2 - Math.PI * 2);
    expect(angDiff(-3.1, 3.1)).toBeCloseTo(Math.PI * 2 - 6.2);
  });
  it('stays within a half turn either way', () => {
    for (let a = -10; a <= 10; a += 0.7) {
      for (let b = -10; b <= 10; b += 0.9) {
        const d = angDiff(a, b);
        expect(d).toBeGreaterThanOrEqual(-Math.PI);
        expect(d).toBeLessThanOrEqual(Math.PI);
      }
    }
  });
});

describe('smoothstep', () => {
  it('eases from 0 to 1 through the midpoint', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.25)).toBeLessThan(0.25);
    expect(smoothstep(0.75)).toBeGreaterThan(0.75);
  });
});

describe('rng', () => {
  it('reproduces the prototype sequence for the school seed, bit for bit', () => {
    const r = rng(11);
    expect([r(), r(), r(), r(), r()]).toEqual([
      0.5115870486479253, 0.5299464082345366, 0.6081185641232878, 0.5901576359756291,
      0.8507766961120069,
    ]);
    const z = rng(0);
    expect([z(), z()]).toEqual([0.26642920868471265, 0.0003297457005828619]);
  });
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = rng(42);
    const b = rng(42);
    for (let i = 0; i < 1000; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(rng(1)()).not.toBe(rng(2)());
  });
});
