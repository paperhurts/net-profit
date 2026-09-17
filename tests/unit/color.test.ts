import { describe, expect, it } from 'vitest';
import { rgba, shade } from '../../src/core/color';

describe('rgba', () => {
  it('expands a hex colour with an alpha', () => {
    expect(rgba('#FFC53D', 0.5)).toBe('rgba(255,197,61,0.5)');
    expect(rgba('#12303A', 1)).toBe('rgba(18,48,58,1)');
  });
});

describe('shade', () => {
  it('matches the prototype for darkening and lightening', () => {
    expect(shade('#808080', 0.5)).toBe('rgb(64,64,64)');
    expect(shade('#808080', 1.5)).toBe('rgb(191,191,191)');
    expect(shade('#E4572E', 0.8)).toBe('rgb(182,69,36)');
    expect(shade('#E4572E', 1.13)).toBe('rgb(231,108,73)');
  });
  it('leaves a colour alone at factor 1', () => {
    expect(shade('#E4572E', 1)).toBe('rgb(228,87,46)');
  });
  it('caches by colour and factor', () => {
    const a = shade('#2B8A99', 0.93);
    expect(shade('#2B8A99', 0.93)).toBe(a);
    expect(shade('#2B8A99', 0.931)).toBe(a);
  });
});
