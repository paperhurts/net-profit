import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import { LANDING, walkable } from '../../src/entities/walker';
import {
  BLINK,
  CAST_EVERY,
  CAST_RANGE,
  HEEL,
  MEND,
  type Target,
  WARLOCK_HEARTS,
  WARLOCK_INVULN,
  Warlock,
} from '../../src/entities/warlock';
import { IX, IY } from '../../src/world/island';
import { HALL, ROOMS, type Room } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
const ashore = (x: number, y: number): World =>
  baseWorld({ figure: { x, y, vx: 0, vy: 0 } as World['figure'] });

describe('the warlock', () => {
  it('stays away until he is free', () => {
    const k = new Warlock();
    const w = ashore(LANDING.x, LANDING.y);
    for (let i = 0; i < 30; i++) k.update(DT, w);
    expect(k.shown).toBe(false);
  });

  it('comes ashore beside the figure, on dry land, and follows its steps', () => {
    const k = new Warlock();
    k.free = true;
    let arrived = 0;
    k.onArrive = () => arrived++;
    const f = { x: IX - 60, y: IY - 20, vx: 0, vy: 0 };
    const w = baseWorld({ figure: f as World['figure'] });
    k.update(DT, w);
    expect(k.shown).toBe(true);
    expect(arrived).toBe(1);
    expect(walkable(k.x, k.y, 99)).toBe(true);
    expect(Math.hypot(k.x - f.x, k.y - f.y)).toBeLessThan(30);
    // The figure walks off across the island; he keeps up behind.
    let far = 0;
    for (let i = 0; i < 4 / DT; i++) {
      f.x += 60 * DT;
      k.update(DT, w);
      far = Math.max(far, Math.hypot(k.x - f.x, k.y - f.y));
    }
    expect(far).toBeLessThan(HEEL + 40);
  });

  it('blinks to the figure when left far behind, as by a door or a portal', () => {
    const k = new Warlock();
    k.free = true;
    const f = { x: IX - 60, y: IY - 20, vx: 0, vy: 0 };
    const w = baseWorld({ figure: f as World['figure'] });
    k.update(DT, w);
    const hall = ROOMS[HALL] as Room;
    f.x = hall.x + 40;
    f.y = hall.y + 40;
    expect(Math.hypot(k.x - f.x, k.y - f.y)).toBeGreaterThan(BLINK);
    k.update(DT, w);
    expect(Math.hypot(k.x - f.x, k.y - f.y)).toBeLessThan(30);
    expect(k.puffs.length).toBeGreaterThanOrEqual(2);
  });

  it('casts at the nearest enemy in reach, and every bolt lands', () => {
    const k = new Warlock();
    k.free = true;
    const w = ashore(IX - 60, IY - 20);
    k.update(DT, w);
    let hits = 0;
    const foe: Target = { x: k.x + CAST_RANGE * 0.6, y: k.y, hit: () => hits++ };
    k.findTarget = (x, y, range) => (Math.hypot(foe.x - x, foe.y - y) <= range ? foe : null);
    for (let i = 0; i < (CAST_EVERY * 3 + 1.5) / DT; i++) k.update(DT, w);
    expect(hits).toBeGreaterThanOrEqual(3);
    expect(hits).toBeLessThanOrEqual(4);
    // Nothing in reach, nothing cast.
    const quiet = hits;
    foe.x = k.x + CAST_RANGE * 3;
    for (let i = 0; i < 4 / DT; i++) k.update(DT, w);
    expect(hits).toBe(quiet);
  });

  it('has three hearts, cannot be hurt twice at once, and worn out rests until the next landing', () => {
    const k = new Warlock();
    k.free = true;
    const w = ashore(IX - 60, IY - 20);
    k.update(DT, w);
    let out = 0;
    k.onHurt = (o) => {
      if (o) out++;
    };
    expect(k.hurt()).toBe(true);
    expect(k.hurt()).toBe(false);
    for (let i = 0; i < (WARLOCK_INVULN + 0.1) / DT; i++) k.update(DT, w);
    k.hurt();
    for (let i = 0; i < (WARLOCK_INVULN + 0.1) / DT; i++) k.update(DT, w);
    k.hurt();
    expect(out).toBe(1);
    expect(k.state).toBe('resting');
    expect(k.shown).toBe(false);
    for (let i = 0; i < 2 / DT; i++) k.update(DT, w);
    expect(k.shown).toBe(false);
    // Back aboard, then ashore again: he is back, hearts full.
    w.figure = null;
    k.update(DT, w);
    w.figure = { x: IX - 60, y: IY - 20, vx: 0, vy: 0 } as World['figure'];
    k.update(DT, w);
    k.update(DT, w);
    expect(k.shown).toBe(true);
    expect(k.hearts).toBe(WARLOCK_HEARTS);
  });

  it('mends a heart out of a fight, and not in one', () => {
    const k = new Warlock();
    k.free = true;
    const w = ashore(IX - 60, IY - 20);
    k.update(DT, w);
    let fight = true;
    k.fighting = () => fight;
    k.hurt();
    for (let i = 0; i < (MEND + 1) / DT; i++) k.update(DT, w);
    expect(k.hearts).toBe(WARLOCK_HEARTS - 1);
    fight = false;
    for (let i = 0; i < (MEND + 1) / DT; i++) k.update(DT, w);
    expect(k.hearts).toBe(WARLOCK_HEARTS);
  });

  it('steps out of the cage where he is told, free and with the figure', () => {
    const k = new Warlock();
    k.come(100, 200);
    expect(k.free).toBe(true);
    expect(k.shown).toBe(true);
    expect([k.x, k.y]).toEqual([100, 200]);
  });

  it('draws himself, his bolts and his puffs, and nothing when away', () => {
    const k = new Warlock();
    const off = fakeView();
    k.drawBody(off.v);
    k.draw(off.v, 'air');
    expect((off.calls.fill ?? 0) + (off.calls.stroke ?? 0)).toBe(0);
    k.free = true;
    const w = ashore(IX - 60, IY - 20);
    k.update(DT, w);
    k.findTarget = () => ({ x: k.x + 50, y: k.y, hit: () => {} });
    for (let i = 0; i < 1.2 / DT; i++) k.update(DT, w);
    const v = fakeView();
    k.drawBody(v.v);
    k.draw(v.v, 'air');
    expect(v.calls.fill ?? 0).toBeGreaterThan(10);
  });
});
