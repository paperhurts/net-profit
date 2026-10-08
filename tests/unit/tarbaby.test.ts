import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import {
  SPIT_EVERY,
  SPIT_POWER,
  SPIT_RANGE,
  Tarbaby,
  TB_BLINK,
  TB_HEEL,
} from '../../src/entities/tarbaby';
import { LANDING, WALK_SPEED, walkable } from '../../src/entities/walker';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const figureAt = (x: number, y: number) => ({ x, y, vx: 0, vy: 0 });

describe('the tarbaby', () => {
  it('is nowhere until it is freed, then pops up beside the figure ashore', () => {
    const b = new Tarbaby();
    const w: World = baseWorld({ figure: figureAt(LANDING.x, LANDING.y) });
    b.update(DT, w);
    expect(b.with).toBe(false);
    b.free = true;
    b.update(DT, w);
    expect(b.with).toBe(true);
    expect(Math.hypot(b.x - LANDING.x, b.y - LANDING.y)).toBeLessThan(25);
    expect(walkable(b.x, b.y, 99)).toBe(true);
    // Back aboard, it rides on the deck.
    w.figure = null;
    b.update(DT, w);
    expect(b.with).toBe(false);
  });

  it('hops along at the heel along the way the figure walked, and keeps up', () => {
    const b = new Tarbaby();
    b.free = true;
    const f = figureAt(LANDING.x, LANDING.y);
    const w: World = baseWorld({ figure: f });
    b.update(DT, w);
    let worst = 0;
    // Up the pier toward the island at a walk.
    for (let i = 0; i < 1.5 / DT; i++) {
      f.x -= WALK_SPEED * DT;
      b.update(DT, w);
      expect(walkable(b.x, b.y, 99)).toBe(true);
      worst = Math.max(worst, Math.hypot(f.x - b.x, f.y - b.y));
    }
    expect(worst).toBeLessThan(TB_BLINK);
    for (let i = 0; i < 2 / DT; i++) b.update(DT, w);
    expect(Math.hypot(f.x - b.x, f.y - b.y)).toBeLessThan(TB_HEEL + 2);
    // Left far behind, as through a door, it pops over.
    f.x -= 400;
    b.update(DT, w);
    expect(Math.hypot(f.x - b.x, f.y - b.y)).toBeLessThan(25);
  });

  it('spits at what is in reach every so often, and each spit lands', () => {
    const b = new Tarbaby();
    b.free = true;
    const w: World = baseWorld({ figure: figureAt(LANDING.x, LANDING.y) });
    b.update(DT, w);
    let hits = 0;
    let spat = 0;
    const foe = { x: LANDING.x - 60, y: LANDING.y, hit: (p: number) => (hits += p) };
    b.findTarget = (x, y, range) => {
      expect(range).toBe(SPIT_RANGE);
      return Math.hypot(foe.x - x, foe.y - y) <= range ? foe : null;
    };
    b.onSpit = () => spat++;
    // The first soon after landing, then every SPIT_EVERY; each lands a moment after it is spat.
    for (let i = 0; i < (SPIT_EVERY * 3 + 1.6) / DT; i++) b.update(DT, w);
    expect(spat).toBe(4);
    expect(hits).toBe(4 * SPIT_POWER);
    // Out of reach, nothing.
    foe.x -= 400;
    const before = spat;
    for (let i = 0; i < (SPIT_EVERY * 2) / DT; i++) b.update(DT, w);
    expect(spat).toBe(before);
  });

  it('draws ashore, on the deck aboard, and its spits in the air', () => {
    const b = new Tarbaby();
    const v = fakeView();
    b.drawBody(v.v);
    b.drawAboard(v.v, { x: 0, y: 0, h: 0 }, 1.6);
    expect(v.calls.fill ?? 0).toBe(0);
    b.free = true;
    b.drawAboard(v.v, { x: 0, y: 0, h: 0 }, 1.6);
    expect(v.calls.fill ?? 0).toBeGreaterThan(2);
    const w: World = baseWorld({ figure: figureAt(LANDING.x, LANDING.y) });
    b.findTarget = () => ({ x: LANDING.x - 50, y: LANDING.y, hit: () => {} });
    for (let i = 0; i < 1.1 / DT; i++) b.update(DT, w);
    const g = fakeView();
    b.drawBody(g.v);
    b.draw(g.v, 'air');
    expect(b.spits.length).toBe(1);
    // Its body, facing away toward what it spat at, and the spit with its shine.
    expect(g.calls.fill ?? 0).toBeGreaterThanOrEqual(3);
  });
});
