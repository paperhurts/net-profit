import { describe, expect, it } from 'vitest';
import { BONE_HOMES } from '../../src/entities/bonemen';
import {
  DISP_HOMES,
  DISP_LASH,
  DISP_LEASH,
  DISP_OFF,
  DISP_RECOVER,
  DISP_SEE,
  DISP_SHOWN,
  DISP_SPEED,
  DISP_SPOT,
  DISP_WINDUP,
  DISPLACER_DMG,
  DISPLACER_HP,
  type Displacer,
  DisplacerBeasts,
  LASH_FROM,
  LASH_REACH,
} from '../../src/entities/displacers';
import { walkable } from '../../src/entities/walker';
import { drawDisplacer, drawDisplacerMark } from '../../src/render/displacers';
import { LANDING12, onIsle12Ground, TOWER12_DOOR } from '../../src/world/isle12';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

type At = { x: number; y: number };
const tick = (b: DisplacerBeasts, at: At | null, s = 1 / 60) => {
  for (let t = 0; t < s - 1e-9; t += 1 / 60)
    b.update(1 / 60, baseWorld({ figure: at ? { ...at, vx: 0, vy: 0 } : null }));
};
const first = (b: DisplacerBeasts): Displacer => b.list[0] as Displacer;
const one = () => {
  const b = new DisplacerBeasts([DISP_HOMES[0] as [number, number]]);
  b.here = true;
  return b;
};

describe("Skrill's displacer beasts", () => {
  it("are the kid's: 4 hits and 3 damage, slower than the figure walks", () => {
    expect(DISPLACER_HP).toBe(4);
    expect(DISPLACER_DMG).toBe(3);
    expect(DISP_SPEED).toBeLessThan(85);
  });

  it("prowl all over Skull Island, on its ground, none near the landing or a post of Skrill's men", () => {
    expect(DISP_HOMES.length).toBe(8);
    for (const [x, y] of DISP_HOMES) {
      expect(onIsle12Ground(x, y)).toBe(true);
      // Their prowl round the den, too.
      for (let a = 0; a < Math.PI * 2; a += 0.5)
        expect(walkable(x + Math.cos(a) * 46, y + Math.sin(a) * 46, 0)).toBe(true);
      expect(Math.hypot(x - LANDING12.x, y - LANDING12.y)).toBeGreaterThan(DISP_SEE + 150);
      for (const [bx, by] of BONE_HOMES) expect(Math.hypot(x - bx, y - by)).toBeGreaterThan(200);
      expect(Math.hypot(x - TOWER12_DOOR.x, y - TOWER12_DOOR.y)).toBeGreaterThan(DISP_SEE);
    }
    // Spread out: from any one, the next is further off than it sees.
    for (const [i, [x, y]] of DISP_HOMES.entries())
      for (const [j, [ox, oy]] of DISP_HOMES.entries())
        if (i !== j) expect(Math.hypot(x - ox, y - oy)).toBeGreaterThan(DISP_SEE * 2);
  });

  it('are never where they look to be: the picture stands a little to one side', () => {
    const b = one();
    const m = first(b);
    tick(b, null, 1);
    expect(Math.hypot(m.ix - m.x, m.iy - m.y)).toBeCloseTo(DISP_OFF, 3);
  });

  it('do nothing while the figure is not ashore there', () => {
    const b = new DisplacerBeasts();
    const m = first(b);
    tick(b, { x: m.x + 10, y: m.y }, 2);
    expect(m.state).toBe('prowl');
    expect(b.roused).toBe(false);
  });

  it('see the figure near, snarl, and stalk after it', () => {
    const b = one();
    let spotted = 0;
    b.onSpot = () => spotted++;
    const m = first(b);
    tick(b, { x: m.x + DISP_SEE + 80, y: m.y });
    expect(m.state).toBe('prowl');
    const at = { x: m.x + DISP_SEE - 20, y: m.y };
    tick(b, at);
    expect(m.state).toBe('spot');
    expect(spotted).toBe(1);
    expect(b.roused).toBe(true);
    const d0 = Math.hypot(m.x - at.x, m.y - at.y);
    tick(b, at, DISP_SPOT + 0.5);
    expect(m.state).toBe('stalk');
    expect(Math.hypot(m.x - at.x, m.y - at.y)).toBeLessThan(d0);
  });

  it('lash a wedge out from where they really are: three hearts in it, none behind or for a figure that steps back', () => {
    const b = one();
    const hits: number[] = [];
    b.onHit = (n) => hits.push(n);
    const m = first(b);
    const at = { x: m.x + LASH_FROM - 10, y: m.y };
    tick(b, at, DISP_SPOT + 0.1);
    tick(b, at, 0.1);
    expect(m.state).toBe('windup');
    tick(b, at, DISP_WINDUP);
    expect(hits).toEqual([DISPLACER_DMG]);
    expect(DisplacerBeasts.catches(m, m.x - 30, m.y)).toBe(false);
    expect(DisplacerBeasts.catches(m, m.x + LASH_REACH + 4, m.y)).toBe(false);
    // Again, and this time step straight back once the wedge shows, a third of a second late, at a walk.
    hits.length = 0;
    for (let t = 0; t < 4 && m.state !== 'windup'; t += 1 / 60) tick(b, at);
    expect(m.state).toBe('windup');
    expect(m.t).toBeLessThan(0.05);
    const me = { ...at };
    const away = Math.atan2(me.y - m.y, me.x - m.x);
    tick(b, me, 1 / 3);
    for (let t = 0; t < DISP_WINDUP; t += 1 / 60) {
      me.x += Math.cos(away) * 85 * (1 / 60);
      me.y += Math.sin(away) * 85 * (1 / 60);
      tick(b, me);
    }
    expect(hits).toEqual([]);
  });

  it('take no hurt while their picture stands off to the side, only just after a lash, and a hit shows them a while', () => {
    const b = one();
    let missed = 0;
    b.onMiss = () => missed++;
    const m = first(b);
    const at = { x: m.x + LASH_FROM - 10, y: m.y };
    tick(b, at, DISP_SPOT + 0.2);
    expect(m.state).toBe('windup');
    expect(DisplacerBeasts.shown(m)).toBe(false);
    expect(b.hit(m, 1)).toBe(false);
    expect(missed).toBe(1);
    expect(m.hp).toBe(DISPLACER_HP);
    // Lashed: now it shows where it really is, its picture drawn in onto it.
    tick(b, at, DISP_WINDUP + DISP_LASH + 0.3);
    expect(m.state).toBe('recover');
    expect(DisplacerBeasts.shown(m)).toBe(true);
    expect(Math.hypot(m.ix - m.x, m.iy - m.y)).toBeLessThan(2);
    expect(b.hit(m, 1)).toBe(true);
    expect(m.hp).toBe(DISPLACER_HP - 1);
    // The hit keeps it showing past the end of its recovery, then its picture goes back out.
    const off = { x: m.x + 300, y: m.y };
    tick(b, off, DISP_RECOVER);
    expect(m.state).not.toBe('recover');
    expect(DisplacerBeasts.shown(m)).toBe(true);
    tick(b, off, DISP_SHOWN);
    expect(m.state).toBe('stalk');
    expect(DisplacerBeasts.shown(m)).toBe(false);
  });

  it('go down after four hits, and stay down', () => {
    const b = one();
    let beaten = 0;
    b.onBeaten = () => beaten++;
    const m = first(b);
    m.shownT = 99;
    for (let i = 0; i < 3; i++) expect(b.hit(m, 1)).toBe(true);
    expect(m.state).not.toBe('fall');
    b.hit(m, 1);
    expect(m.state).toBe('fall');
    expect(beaten).toBe(1);
    tick(b, { x: m.x + 20, y: m.y }, 1.2);
    expect(m.state).toBe('gone');
    expect(b.hit(m, 4)).toBe(false);
    expect(b.nearest(m.ix, m.iy, 50, true)).toBe(null);
  });

  it('are found by where they look to be', () => {
    const b = one();
    const m = first(b);
    tick(b, null, 0.5);
    expect(b.nearest(m.ix, m.iy, 5, true)).toBe(m);
    expect(b.nearest(m.ix, m.iy, 5)).toBe(null);
  });

  it('a stun stops a lash being reared back', () => {
    const b = one();
    const m = first(b);
    const at = { x: m.x + LASH_FROM - 10, y: m.y };
    tick(b, at, DISP_SPOT + 0.2);
    expect(m.state).toBe('windup');
    b.stun(m, 1);
    expect(m.state).toBe('stalk');
  });

  it('go back to their dens when led too far off, or when the figure goes, and are all back whole each landing', () => {
    const b = new DisplacerBeasts();
    b.here = true;
    const m = first(b);
    m.shownT = 1;
    b.hit(m, 2);
    m.x += DISP_LEASH + 10;
    tick(b, { x: m.x + 10, y: m.y });
    expect(m.state).toBe('back');
    b.reset();
    expect(m.state).toBe('prowl');
    expect(m.hp).toBe(DISPLACER_HP);
    expect([m.x, m.y]).toEqual(m.home);
    expect(DisplacerBeasts.shown(m)).toBe(false);
    m.shownT = 0;
    b.hit(m, 1);
    expect(DisplacerBeasts.up(m)).toBe(true);
    tick(b, null);
    expect(DisplacerBeasts.up(m)).toBe(false);
  });

  it('are drawn in every state, the wedge only while a lash is coming or going', () => {
    const b = new DisplacerBeasts();
    const m = first(b);
    for (const s of [
      'prowl',
      'spot',
      'stalk',
      'windup',
      'lash',
      'recover',
      'back',
      'fall',
      'gone',
    ] as const) {
      const f = fakeView();
      m.state = s;
      m.t = 0.3;
      drawDisplacer(f.v, m);
      expect((f.calls.fill ?? 0) > 0).toBe(s !== 'gone');
      const marked = s === 'windup' || s === 'lash';
      const g = fakeView();
      drawDisplacerMark(g.v, m);
      expect((g.calls.fill ?? 0) > 0).toBe(marked);
    }
  });
});
