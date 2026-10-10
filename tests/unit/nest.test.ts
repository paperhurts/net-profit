import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import { HERON9_HP, Heron } from '../../src/entities/heron';
import {
  drawChain,
  drawNecromancer,
  FIRST_RAISE,
  NECRO9_HP,
  Nest,
  RAISE_EVERY,
  RAISE_MAX,
  SNAP_T,
} from '../../src/entities/nest';
import { drawNestBack, drawNestFront } from '../../src/render/nest';
import { NEST9, ROOMS, type Room, TOWERS } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const R = ROOMS[NEST9] as Room;

function run(e: { update(dt: number, w: World): void }, w: World, s: number): void {
  for (let i = 0; i < s / DT; i++) e.update(DT, w);
}

/** The nest with the figure on it, awake, and a count of the skeletons it raised that still stand. */
function nest(): { n: Nest; w: World; raised: [number, number][] } {
  const n = new Nest(R);
  const raised: [number, number][] = [];
  n.onRaise = (x, y) => raised.push([x, y]);
  n.standing = () => raised.length;
  const w = baseWorld({ figure: { x: R.x + 70, y: R.y + 70, vx: 0, vy: 0 } });
  n.update(DT, w);
  return { n, w, raised };
}

describe("the Heron's nest", () => {
  it('is the top of island 9s tower: two floors of hired men, then the nest', () => {
    const t = TOWERS[4];
    expect(t?.roof).toBe(NEST9);
    expect(t?.first).toBe(NEST9 - 2);
    expect(R.kind).toBe('nest');
    expect(R.roof).toBe(true);
  });

  it('hangs the orb over the back and chains the necromancer at the right-hand edge, on the nest', () => {
    const n = new Nest(R);
    for (const p of [n.orb, n.necro])
      expect(Math.hypot(p.x - R.x, p.y - R.y)).toBeLessThan(R.r - 20);
    // The orb is toward the back, the necromancer off to the side.
    expect(n.orb.x + n.orb.y).toBeLessThan(R.x + R.y);
    expect(n.necro.x - n.necro.y).toBeGreaterThan(R.x - R.y + 60);
  });

  it('is lit and waits until the figure arrives, then the necromancer wakes, once', () => {
    const n = new Nest(R);
    let woke = 0;
    n.onWake = () => woke++;
    run(n, baseWorld({ figure: null }), 2);
    expect(n.state).toBe('wait');
    expect(n.lit).toBe(true);
    expect(n.up).toBe(false);
    run(n, baseWorld({ figure: { x: R.x, y: R.y + 50, vx: 0, vy: 0 } }), 1);
    expect(woke).toBe(1);
    expect(n.up).toBe(true);
    expect(n.lit).toBe(true);
  });

  it('raises skeletons between him and the figure, one at a time, never more than two standing', () => {
    const { n, w, raised } = nest();
    run(n, w, FIRST_RAISE - 0.1);
    expect(raised).toHaveLength(0);
    run(n, w, 0.2);
    expect(raised).toHaveLength(1);
    const [x, y] = raised[0] as [number, number];
    const f = w.figure as { x: number; y: number };
    expect(Math.hypot(x - f.x, y - f.y)).toBeLessThan(Math.hypot(n.x - f.x, n.y - f.y));
    run(n, w, RAISE_EVERY);
    expect(raised).toHaveLength(2);
    run(n, w, RAISE_EVERY * 3);
    expect(raised).toHaveLength(RAISE_MAX);
    // One falls, and another comes.
    raised.pop();
    run(n, w, RAISE_EVERY + 0.1);
    expect(raised).toHaveLength(RAISE_MAX);
  });

  it('raises nothing while stuck in tar', () => {
    const { n, w, raised } = nest();
    n.stun(FIRST_RAISE + 1);
    run(n, w, FIRST_RAISE + 0.5);
    expect(raised).toHaveLength(0);
  });

  it('beaten, his chain snaps: the orb goes dark, he is free, and the game is told once', () => {
    const { n, w } = nest();
    let freed = 0;
    let hurt = 0;
    n.onFree = () => freed++;
    n.onHurt = () => hurt++;
    n.hit(NECRO9_HP - 1);
    expect(n.up).toBe(true);
    expect(hurt).toBe(1);
    n.hit(1);
    expect(n.state).toBe('snap');
    expect(freed).toBe(1);
    expect(n.lit).toBe(false);
    expect(n.up).toBe(false);
    n.hit(5);
    expect(hurt).toBe(2);
    run(n, w, SNAP_T + 0.1);
    expect(n.state).toBe('free');
    expect(freed).toBe(1);
  });

  it('lets him go with the figure once the Heron is beaten for good', () => {
    const { n } = nest();
    n.hit(NECRO9_HP);
    n.join();
    expect(n.state).toBe('gone');
    expect(n.lit).toBe(false);
    expect(n.up).toBe(false);
    expect(n.solids(fakeView().v)).toHaveLength(1);
  });

  it('starts over when the figure leaves, and is empty once the Heron is beaten for good', () => {
    const { n, w } = nest();
    n.hit(3);
    w.figure = null;
    n.update(DT, w);
    expect(n.state).toBe('wait');
    expect(n.hp).toBe(NECRO9_HP);
    n.freed();
    expect(n.state).toBe('gone');
    // He has gone with the figure: the nest is left with the dark orb.
    expect(n.solids(fakeView().v)).toHaveLength(1);
    let woke = 0;
    n.onWake = () => woke++;
    run(n, baseWorld({ figure: { x: R.x, y: R.y, vx: 0, vy: 0 } }), 2);
    expect(woke).toBe(0);
    expect(n.lit).toBe(false);
  });

  it('draws the orb on its chains and the necromancer, lit and dark, and the nest itself', () => {
    const f = fakeView();
    const { n } = nest();
    const s = n.solids(f.v);
    expect(s).toHaveLength(2);
    for (const q of s) q.f();
    expect(f.calls.ellipse ?? 0).toBeGreaterThan(40);
    n.draw(f.v, 'air');
    expect(f.calls.glow).toBe(1);
    n.hit(NECRO9_HP);
    for (const q of n.solids(f.v)) q.f();
    n.draw(f.v, 'air');
    expect(f.calls.glow).toBe(1);
    drawNecromancer(f.v, 0, 0, 0, { raising: true, chained: true, flash: true });
    drawChain(f.v.ctx, 0, 0, 0, 0, 1);
    drawNestBack(f.v, R, 390, 780, true);
    drawNestFront(f.v, R);
    expect(f.calls.stroke ?? 0).toBeGreaterThan(150);
  });
});

describe("the orb's shield on the Heron", () => {
  it('is tougher in his nest', () => {
    const b = new Heron(R, HERON9_HP);
    expect(b.hp).toBe(HERON9_HP);
    b.reset();
    expect(b.hp).toBe(HERON9_HP);
  });

  it('turns every spear and blow while it is on: him and his copies alike', () => {
    const b = new Heron(R, HERON9_HP);
    const w = baseWorld({ figure: { x: R.x + 60, y: R.y + 60, vx: 0, vy: 0 } });
    let blocks = 0;
    let pops = 0;
    b.onBlock = () => blocks++;
    b.onPop = () => pops++;
    b.shielded = true;
    for (let i = 0; i < 60 / DT && b.copies.length === 0; i++) b.update(DT, w);
    const c = b.copies[0];
    if (!c) throw new Error('no copy');
    b.hit(5);
    b.spear(b, 5);
    b.spear(c, 5);
    expect(blocks).toBe(3);
    expect(pops).toBe(0);
    expect(b.hp).toBe(HERON9_HP);
    // Down, and they land.
    b.shielded = false;
    b.spear(c, 5);
    b.spear(b, 5);
    expect(pops).toBe(1);
    expect(b.hp).toBe(HERON9_HP - 5);
    expect(blocks).toBe(3);
  });

  it('shows as a bubble round him', () => {
    const f = fakeView();
    const b = new Heron(R, HERON9_HP);
    for (const s of b.solids(f.v)) s.f();
    const plain = f.calls.ellipse ?? 0;
    b.shielded = true;
    const g = fakeView();
    for (const s of b.solids(g.v)) s.f();
    expect(g.calls.ellipse ?? 0).toBeGreaterThan(plain);
  });
});
