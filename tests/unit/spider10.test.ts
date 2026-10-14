import { describe, expect, it } from 'vitest';
import { BUG_SPRAY, parseSprays, SPRAY_MAX } from '../../src/data/snacks';
import {
  offWeb,
  SPIDER_HP,
  SPIDER_LEASH,
  SPIDER_SPEED,
  SPIDER_WAKE,
  Spider10,
  WEB,
} from '../../src/entities/spider10';
import { WALK_SPEED } from '../../src/entities/walker';
import { CYPRESS10, ISLE10, regionAt } from '../../src/world/isle10';
import { baseWorld } from './helpers/world';

type At = { x: number; y: number } | null;
const run = (s: Spider10, secs: number, at: () => At) => {
  for (let t = 0; t < secs; t += 1 / 60) {
    const f = at();
    s.update(1 / 60, baseWorld({ figure: f ? { ...f, vx: 0, vy: 0 } : null }));
  }
};
/** A spot off the web toward the island's middle, this far from it. */
const near = (d: number) => {
  const a = Math.atan2(ISLE10.y - WEB.y, ISLE10.x - WEB.x);
  return { x: WEB.x + Math.cos(a) * d, y: WEB.y + Math.sin(a) * d };
};

describe("island 10's giant spider", () => {
  it('hangs his web upright between two of the swamp cypresses, 45 to 65 apart', () => {
    expect(regionAt(WEB.x, WEB.y)).toBe('swamp');
    for (const p of [WEB.a, WEB.b])
      expect(CYPRESS10.some(([x, y]) => x === p[0] && y === p[1])).toBe(true);
    const gap = Math.hypot(WEB.a[0] - WEB.b[0], WEB.a[1] - WEB.b[1]);
    expect(gap).toBeGreaterThanOrEqual(45);
    expect(gap).toBeLessThanOrEqual(65);
    expect(offWeb(WEB.x, WEB.y)).toBeCloseTo(0);
    const off = near(30);
    expect(offWeb(off.x, off.y)).toBeGreaterThan(10);
  });

  it('waits at his hub, drops for the figure, and comes after it slower than it walks', () => {
    const s = new Spider10();
    let drops = 0;
    s.onDrop = () => drops++;
    run(s, 2, () => near(SPIDER_WAKE + 30));
    expect(s.state).toBe('web');
    expect(s.z).toBeGreaterThan(10);
    run(s, 0.1, () => near(SPIDER_WAKE - 20));
    expect(s.state).toBe('drop');
    expect(drops).toBe(1);
    run(s, 0.6, () => near(SPIDER_WAKE - 20));
    expect(s.state).toBe('chase');
    expect(s.z).toBe(0);
    expect(SPIDER_SPEED).toBeLessThan(WALK_SPEED);
  });

  it('catches a figure that stays, drags it back into his web, and climbs up as it hangs there', () => {
    const s = new Spider10();
    let grabs = 0;
    let hangs = 0;
    s.onGrab = () => grabs++;
    s.onHang = () => hangs++;
    const f = near(60);
    run(s, 4, () => (s.state === 'drag' || s.state === 'climb' ? null : f));
    expect(grabs).toBe(1);
    expect(hangs).toBe(1);
    expect(['climb', 'web']).toContain(s.state);
    expect(Math.hypot(s.x - WEB.x, s.y - WEB.y)).toBeLessThan(4);
    // Back up, he waits a while before he drops again.
    run(s, 1, () => f);
    expect(s.state).toBe('web');
  });

  it('pulls the figure along just behind him while he drags it', () => {
    const u = new Spider10();
    for (let k = 0; k < 600 && u.state !== 'drag'; k++)
      u.update(1 / 60, baseWorld({ figure: { ...near(60), vx: 0, vy: 0 } }));
    expect(u.state).toBe('drag');
    u.update(1 / 60, baseWorld({ figure: null }));
    const [tx, ty] = u.towed;
    expect(Math.hypot(WEB.x - tx, WEB.y - ty)).toBeGreaterThan(
      Math.hypot(WEB.x - u.x, WEB.y - u.y),
    );
    expect(Math.hypot(tx - u.x, ty - u.y)).toBeCloseTo(10);
  });

  it('gives up on a figure that gets far enough away, and goes back up', () => {
    const s = new Spider10();
    run(s, 0.8, () => near(SPIDER_WAKE - 20));
    expect(s.state).toBe('chase');
    run(s, 6, () => near(SPIDER_LEASH + 60));
    expect(s.state).toBe('web');
  });

  it('three sprays of bug spray beat him; up in his web, a spray brings him down', () => {
    const s = new Spider10();
    let beaten = 0;
    s.onBeaten = () => beaten++;
    expect(s.spray()).toBe(true);
    expect(s.state).toBe('drop');
    for (let i = 1; i < SPIDER_HP; i++) {
      run(s, 0.7, () => near(150));
      s.spray();
    }
    expect(s.state).toBe('fall');
    expect(beaten).toBe(1);
    expect(s.spray()).toBe(false);
    run(s, 2, () => null);
    expect(s.state).toBe('gone');
    expect(s.here).toBe(false);
    s.reset();
    expect(s.state).toBe('web');
    expect(s.hp).toBe(SPIDER_HP);
  });

  it('bug spray comes from the old man six sprays a can, and the save keeps a sensible count', () => {
    expect(BUG_SPRAY.sprays).toBe(6);
    expect(parseSprays(12)).toBe(12);
    expect(parseSprays(-3)).toBe(0);
    expect(parseSprays(999)).toBe(SPRAY_MAX);
    expect(parseSprays('lots')).toBe(0);
    expect(parseSprays(undefined)).toBe(0);
  });
});
