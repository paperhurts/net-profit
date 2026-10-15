import { describe, expect, it } from 'vitest';
import { HERON_HP, HERON9_HP } from '../../src/entities/heron';
import {
  CAST_START,
  DIVE_END,
  ESCAPE_AT,
  ESCAPE_CAPTIONS,
  ESCAPE_IN,
  ESCAPE_LEN,
  ESCAPE_OUT,
  escapeAt,
  FALL_FROM,
  FALL_START,
  PORTAL_OPEN,
  PORTAL_SHUT,
  REAPER_FROM,
  REAPER_SHOWS,
  SINK_END,
  SINK_START,
  SNAP_T,
  SPLASH_T,
} from '../../src/world/heronescape';
import { ISLE8, ISLE9 } from '../../src/world/isle8';
import { subWater } from '../../src/world/subsea';

const at = (p: { x: number; y: number }) => Math.hypot(p.x - ESCAPE_AT.x, p.y - ESCAPE_AT.y);

describe("the Heron's escape", () => {
  it('is out in open water off island 9, and the Reaper comes in over the sea too', () => {
    expect(Math.hypot(ESCAPE_AT.x - ISLE9.x, ESCAPE_AT.y - ISLE9.y)).toBeGreaterThan(ISLE9.r + 150);
    expect(Math.hypot(ESCAPE_AT.x - ISLE8.x, ESCAPE_AT.y - ISLE8.y)).toBeGreaterThan(ISLE8.r + 150);
    expect(subWater(ESCAPE_AT.x, ESCAPE_AT.y)).toBe(true);
    const r = escapeAt(REAPER_SHOWS).reaper;
    expect(subWater(r.x, r.y)).toBe(true);
  });

  it("island 9 is no harder than island 8 now, the kid's 14", () => {
    expect(HERON9_HP).toBe(14);
    expect(HERON9_HP).toBe(HERON_HP);
  });

  it('he flies in high, falls, and hits the water where the splash is', () => {
    const a = escapeAt(0).heron;
    expect(a.fly).toBe(true);
    expect(a.z).toBe(FALL_FROM);
    expect(at(a)).toBeGreaterThan(100);
    expect(at(escapeAt(FALL_START).heron)).toBeLessThan(1);
    let z = FALL_FROM;
    for (let t = FALL_START; t <= SPLASH_T; t += 0.1) {
      const h = escapeAt(t).heron;
      expect(h.z).toBeLessThanOrEqual(z);
      z = h.z;
    }
    expect(escapeAt(SPLASH_T).heron.z).toBeCloseTo(0, 5);
    expect(escapeAt(SPLASH_T).heron.fly).toBe(false);
    expect(escapeAt(SPLASH_T - 0.05).splash).toBe(0);
    expect(escapeAt(SPLASH_T + 0.5).splash).toBeGreaterThan(0);
    expect(escapeAt(SPLASH_T + 3).splash).toBe(0);
  });

  it('the Reaper comes for him from far off, but the portal takes him first', () => {
    expect(escapeAt(REAPER_SHOWS - 0.1).reaper.up).toBe(0);
    const r0 = escapeAt(REAPER_SHOWS + 0.6).reaper;
    expect(r0.up).toBeCloseTo(1, 5);
    expect(at(r0)).toBeGreaterThan(REAPER_FROM * 0.8);
    let d = Infinity;
    for (let t = REAPER_SHOWS; t <= SNAP_T; t += 0.2) {
      const r = escapeAt(t).reaper;
      expect(at(r)).toBeLessThanOrEqual(d + 1e-6);
      d = at(r);
    }
    expect(at(escapeAt(SNAP_T).reaper)).toBeLessThan(1);
    // His staff is up, the portal open and him sinking into it, and gone, all before the jaws close.
    expect(escapeAt(CAST_START + 0.5).heron.cast).toBeGreaterThan(0.5);
    expect(escapeAt(PORTAL_OPEN).portal).toBeCloseTo(1, 5);
    expect(escapeAt(SINK_START + 0.3).heron.sink).toBeGreaterThan(0);
    expect(SINK_END).toBeLessThan(SNAP_T);
    expect(escapeAt(SNAP_T).heron.shown).toBe(false);
    expect(escapeAt(SNAP_T).portal).toBeGreaterThan(0.5);
  });

  it('then the portal shuts, the Reaper circles and goes down, and the camera is home before it ends', () => {
    expect(escapeAt(PORTAL_SHUT).portal).toBe(0);
    const c = escapeAt(SNAP_T + 1).reaper;
    expect(at(c)).toBeGreaterThan(40);
    expect(at(c)).toBeLessThan(70);
    expect(escapeAt(DIVE_END).reaper.up).toBe(0);
    expect(ESCAPE_IN).toBeLessThan(FALL_START + 1);
    expect(DIVE_END).toBeLessThanOrEqual(ESCAPE_OUT);
    expect(ESCAPE_OUT).toBeLessThan(ESCAPE_LEN);
  });

  it('says what happens in order, "The spell worked!" when he goes', () => {
    const ts = ESCAPE_CAPTIONS.map(([t]) => t);
    expect(ts[0]).toBe(0);
    for (let i = 1; i < ts.length; i++)
      expect(ts[i] as number).toBeGreaterThan(ts[i - 1] as number);
    expect(ts[ts.length - 1] as number).toBeLessThan(ESCAPE_LEN - 2);
    const spell = ESCAPE_CAPTIONS.find(([, c]) => c.includes('The spell worked!'));
    expect(spell?.[0]).toBe(SINK_START);
  });
});
