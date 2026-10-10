import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import {
  AIM_T,
  ANGRY_COPIES,
  CAST_T,
  COPIES,
  COPY_T,
  FIRST_ZAP,
  FLEE_T,
  HERON_HP,
  Heron,
  type HeronState,
  KEEP,
  segDist,
  ZAP_HIT,
  ZAP_LEN,
} from '../../src/entities/heron';
import { ROOF8, ROOMS, type Room, TOWERS } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const R = ROOMS[ROOF8] as Room;

/** The Heron on his roof with the figure standing at its front, awake. */
function fight(): { b: Heron; w: World; fig: { x: number; y: number; vx: number; vy: number } } {
  const b = new Heron(R);
  const fig = { x: R.x + 60, y: R.y + 60, vx: 0, vy: 0 };
  const w = baseWorld({ figure: fig });
  b.update(DT, w);
  return { b, w, fig };
}

function run(b: Heron, w: World, s: number): void {
  for (let i = 0; i < s / DT; i++) b.update(DT, w);
}

/** On until he is in this state, within a minute. */
function until(b: Heron, w: World, state: HeronState): void {
  for (let i = 0; i < 60 / DT && b.state !== state; i++) b.update(DT, w);
  expect(b.state).toBe(state);
}

describe("the Heron's tower", () => {
  it('is island 8s: two floors and a roof, after the others', () => {
    const t = TOWERS[3];
    expect(t?.roof).toBe(ROOF8);
    expect(t?.first).toBe(ROOF8 - 2);
    expect(R.roof).toBe(true);
  });
});

describe('the Heron', () => {
  it('measures how far a point is from a line', () => {
    expect(segDist(5, 3, 0, 0, 10, 0)).toBeCloseTo(3, 6);
    expect(segDist(-4, 3, 0, 0, 10, 0)).toBeCloseTo(5, 6);
    expect(segDist(1, 1, 0, 0, 0, 0)).toBeCloseTo(Math.SQRT2, 6);
  });

  it('waits until the figure is on his roof, then wakes, once', () => {
    const b = new Heron(R);
    let woke = 0;
    b.onWake = () => woke++;
    run(b, baseWorld({ figure: null }), 2);
    expect(b.state).toBe('wait');
    expect(b.up).toBe(false);
    expect(b.targets()).toHaveLength(0);
    const w = baseWorld({ figure: { x: R.x, y: R.y + 40, vx: 0, vy: 0 } });
    run(b, w, 1);
    expect(woke).toBe(1);
    expect(b.up).toBe(true);
  });

  it('gives the warning time to be read before his first aim', () => {
    const { b, w } = fight();
    run(b, w, FIRST_ZAP - 0.1);
    expect(b.state).toBe('stalk');
    run(b, w, 0.2);
    expect(b.state).toBe('aim');
  });

  it('keeps his distance on his roof', () => {
    const { b, w } = fight();
    run(b, w, 1.4);
    const f = w.figure as { x: number; y: number };
    expect(Math.hypot(b.x - f.x, b.y - f.y)).toBeGreaterThan(KEEP * 0.6);
    expect(Math.hypot(b.x - R.x, b.y - R.y)).toBeLessThan(R.r);
  });

  it('shows a line where he aims, then zaps down it: standing on it hurts, stepping off does not', () => {
    const { b, w } = fight();
    let hits = 0;
    let zaps = 0;
    b.onHit = (by) => {
      expect(by).toBe('ray');
      hits++;
    };
    b.onZap = () => zaps++;
    until(b, w, 'aim');
    expect(b.aim).not.toBeNull();
    run(b, w, AIM_T + 0.05);
    expect(zaps).toBe(1);
    expect(hits).toBe(1);
    const z = b.zaps[0];
    if (!z) throw new Error('no zap');
    expect(Math.hypot(z.x1 - z.x0, z.y1 - z.y0)).toBeCloseTo(ZAP_LEN, 3);
    // The next one: the figure steps off the line while it shows.
    until(b, w, 'aim');
    const fig = w.figure as { x: number; y: number };
    const [mx, my] = b.muzzle();
    const a = Math.atan2(fig.y - my, fig.x - mx);
    fig.x += -Math.sin(a) * (ZAP_HIT + 30);
    fig.y += Math.cos(a) * (ZAP_HIT + 30);
    run(b, w, AIM_T + 0.05);
    expect(zaps).toBe(2);
    expect(hits).toBe(1);
  });

  it('raises his staff and splits into copies; a spear pops a copy, and only the real one is hurt', () => {
    const { b, w } = fight();
    let pops = 0;
    let casts = 0;
    b.onPop = () => pops++;
    b.onCast = () => casts++;
    until(b, w, 'cast');
    expect(casts).toBe(1);
    run(b, w, CAST_T + 0.05);
    expect(b.copies).toHaveLength(COPIES);
    expect(b.targets()).toHaveLength(COPIES + 1);
    // Each stands somewhere different.
    for (const c of b.copies) expect(Math.hypot(c.x - b.x, c.y - b.y)).toBeGreaterThan(20);
    const c = b.copies[0];
    if (!c) throw new Error('no copy');
    b.spear(c, 1);
    expect(pops).toBe(1);
    expect(b.hp).toBe(HERON_HP);
    expect(b.targets()).toHaveLength(COPIES);
    // Popping it again does nothing.
    b.spear(c, 1);
    expect(pops).toBe(1);
    b.spear(b, 1);
    expect(b.hp).toBe(HERON_HP - 1);
    // The copies go on their own after a while, and he can cast again.
    run(b, w, COPY_T + 0.5);
    expect(b.copies.every((q) => q.pop > 0) || b.copies.length === 0).toBe(true);
  });

  it('fires only from the real one: every zap starts at his gun', () => {
    const { b, w } = fight();
    let bad = 0;
    let zaps = 0;
    b.onZap = () => {
      zaps++;
      const z = b.zaps[b.zaps.length - 1];
      const [mx, my] = b.muzzle();
      if (!z || Math.hypot(z.x0 - mx, z.y0 - my) > 1) bad++;
    };
    run(b, w, 20);
    expect(zaps).toBeGreaterThan(3);
    expect(bad).toBe(0);
  });

  it('angry at half, zaps twice in a row and makes more copies', () => {
    const { b, w } = fight();
    b.hit(Math.ceil(HERON_HP / 2));
    expect(b.angry).toBe(true);
    let zaps = 0;
    b.onZap = () => zaps++;
    until(b, w, 'aim');
    run(b, w, AIM_T + 0.7);
    expect(zaps).toBe(2);
    until(b, w, 'cast');
    run(b, w, CAST_T + 0.05);
    expect(b.copies).toHaveLength(ANGRY_COPIES);
  });

  it('beaten, does not fall but flies off, and the game is told at once', () => {
    const { b, w } = fight();
    let beaten = 0;
    b.onBeaten = () => beaten++;
    until(b, w, 'cast');
    run(b, w, CAST_T + 0.05);
    b.hit(HERON_HP);
    expect(b.state).toBe('flee');
    expect(beaten).toBe(1);
    expect(b.up).toBe(false);
    expect(b.targets()).toHaveLength(0);
    b.hit(5);
    expect(b.hp).toBe(0);
    run(b, w, FLEE_T + 0.1);
    expect(b.state).toBe('gone');
    expect(beaten).toBe(1);
    expect(b.copies).toHaveLength(0);
    run(b, w, 2);
    expect(beaten).toBe(1);
  });

  it('stands still while stuck in tar, copies and all', () => {
    const { b, w } = fight();
    until(b, w, 'cast');
    run(b, w, CAST_T + 0.05);
    const fig = w.figure as { x: number; y: number };
    fig.x -= 80;
    b.stun(1);
    const at = [b.x, b.y, ...b.copies.flatMap((c) => [c.x, c.y])];
    let zaps = 0;
    b.onZap = () => zaps++;
    run(b, w, 0.9);
    expect([b.x, b.y, ...b.copies.flatMap((c) => [c.x, c.y])]).toEqual(at);
    expect(zaps).toBe(0);
  });

  it('starts over when the figure leaves his roof, and stays away once flown to island 9', () => {
    const { b, w } = fight();
    b.hit(3);
    w.figure = null;
    b.update(DT, w);
    expect(b.state).toBe('wait');
    expect(b.hp).toBe(HERON_HP);
    b.away();
    let woke = 0;
    b.onWake = () => woke++;
    run(b, baseWorld({ figure: { x: R.x, y: R.y, vx: 0, vy: 0 } }), 2);
    expect(woke).toBe(0);
    expect(b.state).toBe('gone');
  });

  it('draws: waiting, fighting with copies and his aim and zaps, flying off, and nothing once gone', () => {
    const f = fakeView();
    const b = new Heron(R);
    expect(b.solids(f.v)).toHaveLength(1);
    const { b: c, w } = fight();
    until(c, w, 'cast');
    run(c, w, CAST_T + 0.05);
    const s = c.solids(f.v);
    expect(s).toHaveLength(1 + COPIES);
    for (const q of s) q.f();
    expect(f.calls.fill ?? 0).toBeGreaterThan(10 * s.length);
    until(c, w, 'aim');
    c.draw(f.v, 'air');
    expect(f.calls.setLineDash ?? 0).toBeGreaterThan(0);
    run(c, w, AIM_T + 0.02);
    const strokes = f.calls.stroke ?? 0;
    c.draw(f.v, 'air');
    expect(f.calls.stroke ?? 0).toBeGreaterThan(strokes);
    c.hit(HERON_HP);
    c.update(DT, w);
    const fl = c.solids(f.v);
    expect(fl).toHaveLength(1);
    for (const q of fl) q.f();
    run(c, w, FLEE_T + 0.1);
    expect(c.solids(f.v)).toHaveLength(0);
  });
});
