import { describe, expect, it } from 'vitest';
import { screenX, screenY } from '../../src/core/iso';
import { GEAR, GEAR_IDS, noGear, refusal } from '../../src/data/gear';
import type { Blipper } from '../../src/entities/entity';
import { Leviathan } from '../../src/entities/leviathan';
import { Pirate } from '../../src/entities/pirate';
import { Rare } from '../../src/entities/rare';
import { Reaper } from '../../src/entities/reaper';
import { drawRadar } from '../../src/render/radar';
import type { BlipKind } from '../../src/world/radar';
import {
  BLIP_DIM,
  blipGlow,
  inRange,
  RADAR_RANGE,
  SWEEP_T,
  scopeAt,
  sweepAngle,
} from '../../src/world/radar';
import { fakeView } from './helpers/view';

/** What an entity puts on the radar. */
function blips(e: { radar?(b: Blipper): void }): { x: number; y: number; kind: BlipKind }[] {
  const out: { x: number; y: number; kind: BlipKind }[] = [];
  e.radar?.((x, y, kind) => out.push({ x, y, kind }));
  return out;
}

describe('the radar scope', () => {
  it('is turned the way the screen shows the sea, but round, so distance on it is true distance', () => {
    const view = {
      camX: 0,
      camY: 0,
      zoom: 1,
      width: 0,
      height: 0,
      shakeX: 0,
      shakeY: 0,
      viewDY: 0,
    };
    for (const [dx, dy] of [
      [600, 0],
      [0, 600],
      [-400, 300],
      [250, -900],
      [-700, -700],
    ] as const) {
      const [sx, sy] = scopeAt(dx, dy);
      // The same way round as on the screen.
      expect(Math.sign(sx)).toBe(Math.sign(Math.round(screenX(dx, dy, view))));
      expect(Math.sign(sy)).toBe(Math.sign(Math.round(screenY(dx, dy, 0, view))));
      expect(Math.hypot(sx, sy)).toBeCloseTo(Math.hypot(dx, dy) / RADAR_RANGE, 6);
    }
    expect(inRange(RADAR_RANGE - 1, 0)).toBe(true);
    expect(inRange(RADAR_RANGE, RADAR_RANGE)).toBe(false);
  });

  it('sweeps round once every few seconds, and a blip is brightest just after the line passes it', () => {
    expect(sweepAngle(0)).toBe(0);
    expect(sweepAngle(SWEEP_T / 4)).toBeCloseTo(Math.PI / 2, 6);
    expect(sweepAngle(SWEEP_T * 3)).toBeCloseTo(0, 6);
    // A blip straight up the scope: the line has just passed it at a hair past up, and comes round to it last.
    expect(blipGlow(0, -0.5, 0.01)).toBeGreaterThan(0.99);
    expect(blipGlow(0, -0.5, Math.PI * 2 - 0.01)).toBeCloseTo(BLIP_DIM, 2);
    expect(blipGlow(0, -0.5, Math.PI)).toBeLessThan(blipGlow(0, -0.5, Math.PI / 2));
  });

  it('is drawn with its islands, buoys and blips, without a fault, wherever the boat heads', () => {
    const v = fakeView();
    for (const h of [0, 1, 2.5, -2]) {
      drawRadar(v.v.ctx, 104, {
        boat: { x: 2400, y: 2400, h },
        blips: [
          { x: 2600, y: 2400, kind: 'fish' },
          { x: 2400, y: 1900, kind: 'threat' },
          { x: 2000, y: 2700, kind: 'other' },
        ],
        isles: [{ x: 2400, y: 2400, r: 210 }],
        lines: [{ lo: 0, hi: 4800, colour: 'red' }],
        T: h,
      });
    }
    expect(v.calls.arc ?? 0).toBeGreaterThan(4 * 8);
  });
});

describe('what goes on the radar', () => {
  it('shows the pirate only while it is about', () => {
    const p = new Pirate();
    expect(blips(p)).toEqual([]);
    p.ship.state = 'prowl';
    p.ship.x = 1000;
    p.ship.y = 1200;
    expect(blips(p)).toEqual([{ x: 1000, y: 1200, kind: 'threat' }]);
  });

  it('shows the Reaper while he is about, a leviathan only while it is up, and the rare as a fish', () => {
    const r = new Reaper();
    expect(blips(r).map((b) => b.kind)).toEqual(['threat']);
    r.state = 'away';
    expect(blips(r)).toEqual([]);
    const l = new Leviathan();
    l.lev.vis = 0;
    expect(blips(l)).toEqual([]);
    l.lev.vis = 0.5;
    expect(blips(l).map((b) => b.kind)).toEqual(['threat']);
    const f = new Rare();
    expect(blips(f)).toEqual([]);
    f.rare.on = true;
    expect(blips(f).map((b) => b.kind)).toEqual(['fish']);
  });
});

describe('the radar on the shelf', () => {
  it("is the shipwright's to sell, from the start of the shelf", () => {
    expect(GEAR_IDS).toContain('radar');
    expect(GEAR.radar.name).toBe('Radar');
    expect(noGear().radar).toBe(false);
    expect(refusal('radar', noGear(), GEAR.radar.cost)).toBeNull();
    expect(refusal('radar', { ...noGear(), radar: true }, 99999)).toBe('fitted');
  });
});
