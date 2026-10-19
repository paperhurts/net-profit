import { describe, expect, it } from 'vitest';
import {
  BONE_CALL,
  BONE_FALL,
  BONE_HOMES,
  BONE_LEASH,
  BONE_REACH,
  BONE_RISE,
  BONE_SPEED,
  BONE_WAKE,
  BONE_WINDUP,
  BONEMAN_DMG,
  BONEMAN_HP,
  type BoneMan,
  BoneMen,
  SWEEP_R,
} from '../../src/entities/bonemen';
import { walkable } from '../../src/entities/walker';
import { drawBoneMan, drawBoneMark } from '../../src/render/bonemen';
import { LANDING12, onIsle12Ground, TOWER12_DOOR } from '../../src/world/isle12';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

type At = { x: number; y: number };
const tick = (b: BoneMen, at: At | null, s = 1 / 60) => {
  for (let t = 0; t < s - 1e-9; t += 1 / 60)
    b.update(1 / 60, baseWorld({ figure: at ? { ...at, vx: 0, vy: 0 } : null }));
};
const first = (b: BoneMen): BoneMan => b.list[0] as BoneMan;

describe("Skrill's men", () => {
  it("are the kid's: men in skeleton armour, 18 hits and 2 damage, slower than the figure walks", () => {
    expect(BONEMAN_HP).toBe(18);
    expect(BONEMAN_DMG).toBe(2);
    expect(BONE_SPEED).toBeLessThan(85);
  });

  it('stand guard in pairs on Skull Island, on its ground, none near the landing', () => {
    expect(BONE_HOMES.length).toBe(8);
    for (const [x, y] of BONE_HOMES) {
      expect(onIsle12Ground(x, y)).toBe(true);
      expect(walkable(x, y, 0)).toBe(true);
      expect(Math.hypot(x - LANDING12.x, y - LANDING12.y)).toBeGreaterThan(BONE_WAKE + 150);
    }
    // Each has a partner near enough to come with him, and the pairs are far enough apart to be met one at a time.
    for (let i = 0; i < BONE_HOMES.length; i++) {
      const [x, y] = BONE_HOMES[i] as [number, number];
      const near = BONE_HOMES.filter(
        (o, j) => j !== i && Math.hypot(o[0] - x, o[1] - y) <= BONE_CALL,
      );
      expect(near.length).toBe(1);
    }
    // Two of them guard Skrill's tower door.
    expect(
      BONE_HOMES.filter(([x, y]) => Math.hypot(x - TOWER12_DOOR.x, y - TOWER12_DOOR.y) < 120)
        .length,
    ).toBe(2);
  });

  it('do nothing while the figure is not ashore there', () => {
    const b = new BoneMen();
    const m = first(b);
    tick(b, { x: m.x + 10, y: m.y }, 2);
    expect(m.state).toBe('guard');
    expect(b.roused).toBe(false);
  });

  it('raise their jawblades for the figure near, his partner with him, then come on', () => {
    const b = new BoneMen();
    b.here = true;
    const risen: BoneMan[] = [];
    b.onRise = (m) => risen.push(m);
    const m = first(b);
    const mate = b.list[1] as BoneMan;
    // From the side away from his partner.
    const d = Math.hypot(m.x - mate.x, m.y - mate.y);
    const ux = (m.x - mate.x) / d;
    const uy = (m.y - mate.y) / d;
    tick(b, { x: m.x + ux * (BONE_WAKE + 30), y: m.y + uy * (BONE_WAKE + 30) });
    expect(m.state).toBe('guard');
    const at = { x: m.x + ux * (BONE_WAKE - 10), y: m.y + uy * (BONE_WAKE - 10) };
    tick(b, at);
    expect(risen.length).toBe(2);
    expect(b.list.filter((o) => o.state === 'rise').length).toBe(2);
    expect(b.roused).toBe(true);
    const [x0, y0] = [m.x, m.y];
    tick(b, at, BONE_RISE + 0.5);
    expect(m.state).toBe('chase');
    expect(Math.hypot(m.x - at.x, m.y - at.y)).toBeLessThan(Math.hypot(x0 - at.x, y0 - at.y));
  });

  it('sweep a fan in front: two hearts in it, none behind him or for a figure that steps back out', () => {
    const b = new BoneMen([BONE_HOMES[0] as [number, number]]);
    b.here = true;
    const hits: number[] = [];
    b.onHit = (n) => hits.push(n);
    const m = first(b);
    const at = { x: m.x + BONE_REACH - 10, y: m.y };
    tick(b, at, BONE_RISE + 0.1);
    tick(b, at, 0.1);
    expect(m.state).toBe('windup');
    tick(b, at, BONE_WINDUP);
    expect(hits).toEqual([BONEMAN_DMG]);
    expect(BoneMen.catches(m, m.x - 30, m.y)).toBe(false);
    expect(BoneMen.catches(m, m.x + SWEEP_R + 4, m.y)).toBe(false);
    // Again, and this time step straight back once the fan shows, a third of a second late, at a walk.
    hits.length = 0;
    for (let t = 0; t < 3 && m.state !== 'windup'; t += 1 / 60) tick(b, at);
    expect(m.state).toBe('windup');
    expect(m.t).toBeLessThan(0.05);
    const me = { ...at };
    const away = Math.atan2(me.y - m.y, me.x - m.x);
    tick(b, me, 1 / 3);
    for (let t = 0; t < BONE_WINDUP; t += 1 / 60) {
      me.x += Math.cos(away) * 85 * (1 / 60);
      me.y += Math.sin(away) * 85 * (1 / 60);
      tick(b, me);
    }
    expect(hits).toEqual([]);
  });

  it('fall apart into a heap of bones after eighteen hits, and stay down', () => {
    const b = new BoneMen();
    b.here = true;
    let beaten = 0;
    b.onBeaten = () => beaten++;
    const m = first(b);
    for (let i = 0; i < 17; i++) expect(b.hit(m, 1)).toBe(true);
    expect(m.state).not.toBe('fall');
    b.hit(m, 1);
    expect(m.state).toBe('fall');
    expect(beaten).toBe(1);
    tick(b, { x: m.x + 20, y: m.y }, BONE_FALL + 0.1);
    expect(m.state).toBe('gone');
    expect(b.hit(m, 4)).toBe(false);
    expect(b.nearest(m.x, m.y, 50, true)).not.toBe(m);
  });

  it('a stun stops a sweep being drawn back', () => {
    const b = new BoneMen([BONE_HOMES[0] as [number, number]]);
    b.here = true;
    const m = first(b);
    const at = { x: m.x + BONE_REACH - 10, y: m.y };
    tick(b, at, BONE_RISE + 0.2);
    expect(m.state).toBe('windup');
    b.stun(m, 1);
    expect(m.state).toBe('chase');
  });

  it('go back to their posts when led too far off, or when the figure goes, and are all back whole each landing', () => {
    const b = new BoneMen();
    b.here = true;
    const m = first(b);
    b.hit(m, 5);
    m.x += BONE_LEASH + 10;
    tick(b, { x: m.x + 10, y: m.y });
    expect(m.state).toBe('back');
    b.reset();
    expect(m.state).toBe('guard');
    expect(m.hp).toBe(BONEMAN_HP);
    expect([m.x, m.y]).toEqual(m.home);
    b.hit(m, 1);
    expect(BoneMen.up(m)).toBe(true);
    tick(b, null);
    expect(BoneMen.up(m)).toBe(false);
  });

  it('are drawn in every state, the fan only while a sweep is coming or going', () => {
    const b = new BoneMen();
    const m = first(b);
    for (const s of [
      'guard',
      'rise',
      'chase',
      'windup',
      'sweep',
      'recover',
      'back',
      'fall',
      'gone',
    ] as const) {
      const f = fakeView();
      m.state = s;
      m.t = 0.3;
      drawBoneMan(f.v, m);
      drawBoneMark(f.v, m);
      expect(f.calls.fill ?? 0).toBeGreaterThan(0);
      const marked = s === 'windup' || s === 'sweep';
      const g = fakeView();
      drawBoneMark(g.v, m);
      expect((g.calls.fill ?? 0) > 0).toBe(marked);
    }
  });

  it('can be put anywhere and all woken at once, as on the Battle Barge', () => {
    const b = new BoneMen([]);
    expect(b.list).toHaveLength(0);
    b.place([
      [0, 0],
      [400, 0],
    ]);
    let risen = 0;
    b.onRise = () => risen++;
    b.wake();
    expect(risen).toBe(2);
    expect(b.list.every((m) => m.state === 'rise')).toBe(true);
    b.place([]);
    expect(b.list).toHaveLength(0);
  });
});
