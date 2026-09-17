import { describe, expect, it } from 'vitest';
import {
  advanceClock,
  DAWN_END,
  DAY_END,
  DUSK_END,
  dayState,
  PHASE_COLOR,
} from '../../src/world/daycycle';

describe('the day', () => {
  it('splits as project.md says: dawn 12%, day 43%, dusk 12%, night 33%', () => {
    expect(DAWN_END).toBeCloseTo(0.12);
    expect(DAY_END - DAWN_END).toBeCloseTo(0.43);
    expect(DUSK_END - DAY_END).toBeCloseTo(0.12);
    expect(1 - DUSK_END).toBeCloseTo(0.33);
  });

  it('names the phase at every boundary', () => {
    const phases = [0, 0.1199, 0.12, 0.5499, 0.55, 0.6699, 0.67, 0.999].map(
      (c) => dayState(c).phase,
    );
    expect(phases).toEqual(['Dawn', 'Dawn', 'Day', 'Day', 'Dusk', 'Dusk', 'Night', 'Night']);
  });

  it('lifts the dark at dawn and lowers it at dusk', () => {
    expect(dayState(0).dark).toBe(1);
    expect(dayState(0.1199).dark).toBeLessThan(0.01);
    expect(dayState(0.3).dark).toBe(0);
    expect(dayState(0.55).dark).toBe(0);
    expect(dayState(0.6699).dark).toBeGreaterThan(0.99);
    expect(dayState(0.8).dark).toBe(1);
  });

  it('warms mid dawn and mid dusk and nowhere else', () => {
    expect(dayState(0).warm).toBe(0);
    expect(dayState(0.06).warm).toBeCloseTo(1);
    expect(dayState(0.3).warm).toBe(0);
    expect(dayState(0.61).warm).toBeCloseTo(1);
    expect(dayState(0.8).warm).toBe(0);
  });

  it('has a swatch for every phase', () => {
    expect(Object.keys(PHASE_COLOR).sort()).toEqual(['Dawn', 'Day', 'Dusk', 'Night']);
  });
});

describe('advanceClock', () => {
  it('advances by dt over the day length and wraps', () => {
    expect(advanceClock(0.5, 3, 300)).toBeCloseTo(0.51);
    expect(advanceClock(0.999, 0.6, 300)).toBeCloseTo(0.001);
  });
});
