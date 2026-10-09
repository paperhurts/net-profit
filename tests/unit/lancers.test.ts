import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import {
  LANCE_HIT,
  LANCE_REACH,
  LANCE_WINDUP,
  LANCER_HP,
  Lancers,
} from '../../src/entities/lancers';
import { walkable } from '../../src/entities/walker';
import { COLUMNS, LANCER_POSTS, LOCKED, POOL } from '../../src/world/gigantis';
import { entry, ROOMS, type Room, RUINS, THRONE } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const room = ROOMS[RUINS] as Room;
const fig = (x: number, y: number) => ({ x, y, vx: 0, vy: 0 });
const first = (ls: Lancers) => {
  const l = ls.list[0];
  if (!l) throw new Error('lancer');
  return l;
};

describe('the ruins behind the throne', () => {
  it('are a room of their own, with the black pool and the broken columns in the way and the posts and the way in clear', () => {
    expect(RUINS).toBe(THRONE + 1);
    expect(room.kind).toBe('ruins');
    expect(walkable(entry(RUINS).x, entry(RUINS).y, 0)).toBe(true);
    expect(walkable(POOL.x, POOL.y, 0)).toBe(false);
    expect(walkable(POOL.x + POOL.r + 10, POOL.y + POOL.r + 10, 0)).toBe(true);
    for (const c of COLUMNS) expect(walkable(c.x, c.y, 0)).toBe(false);
    for (const p of LANCER_POSTS) expect(walkable(p.x, p.y, 0)).toBe(true);
    // The door behind the throne is in the throne room, not here.
    expect(Math.hypot(LOCKED.x - room.x, LOCKED.y - room.y)).toBeGreaterThan(room.r);
  });
});

describe('the lancers', () => {
  it('stand guard and leave the figure alone, however close it comes', () => {
    const ls = new Lancers(LANCER_POSTS, room);
    const l = first(ls);
    let hits = 0;
    ls.onHit = () => hits++;
    const w: World = baseWorld({ figure: fig(l.x + 20, l.y + 10) });
    for (let i = 0; i < 10 / DT; i++) ls.update(DT, w);
    expect(hits).toBe(0);
    expect(l.state).toBe('guard');
    expect(Math.hypot(l.x - l.post.x, l.y - l.post.y)).toBe(0);
    expect(ls.roused).toBe(false);
    expect(ls.nearest(l.x, l.y, 100)).toBeNull();
    expect(ls.nearest(l.x, l.y, 100, true)).toBe(l);
  });

  it('once hit, come on slowly, draw the lance back and stab for two; step back while it is drawn and it misses', () => {
    const ls = new Lancers(LANCER_POSTS, room);
    const l = first(ls);
    const hits: number[] = [];
    ls.onHit = (n) => hits.push(n);
    let roused = 0;
    ls.onRouse = () => roused++;
    const f = fig(l.x + 90, l.y + 30);
    const w: World = baseWorld({ figure: f });
    ls.hit(l, 1);
    expect(roused).toBe(1);
    expect(l.hp).toBe(LANCER_HP - 1);
    expect(ls.roused).toBe(true);
    for (let i = 0; i < 6 / DT && l.state !== 'windup'; i++) ls.update(DT, w);
    expect(l.state).toBe('windup');
    for (let i = 0; i < (LANCE_WINDUP + 0.3) / DT; i++) ls.update(DT, w);
    expect(hits).toEqual([LANCE_HIT]);
    expect(LANCE_HIT).toBe(2);
    // Again, but this time step back out of reach while the lance is drawn.
    for (let i = 0; i < 6 / DT && l.state !== 'windup'; i++) ls.update(DT, w);
    expect(l.state).toBe('windup');
    f.x += (f.x - l.x) * 2;
    f.y += (f.y - l.y) * 2;
    for (let i = 0; i < (LANCE_WINDUP + 0.1) / DT; i++) ls.update(DT, w);
    expect(hits).toHaveLength(1);
    expect(Math.hypot(f.x - l.x, f.y - l.y)).toBeGreaterThan(LANCE_REACH);
  });

  it('fall after ten hits, lose a lance they were drawing to tar, and are back at their posts after a reset', () => {
    const ls = new Lancers(LANCER_POSTS, room);
    const l = first(ls);
    const w: World = baseWorld({ figure: fig(l.x + 30, l.y) });
    ls.hit(l, 1);
    for (let i = 0; i < 6 / DT && l.state !== 'windup'; i++) ls.update(DT, w);
    ls.stun(l, 1);
    expect(l.state).toBe('walk');
    for (let i = 1; i < LANCER_HP; i++) ls.hit(l, 1);
    expect(l.state).toBe('fall');
    for (let i = 0; i < 2 / DT; i++) ls.update(DT, w);
    expect(l.state).toBe('gone');
    ls.reset();
    expect(l.state).toBe('guard');
    expect(l.hp).toBe(LANCER_HP);
    expect(l.x).toBe(l.post.x);
  });

  it('draws on guard, roused, stabbing and falling', () => {
    const ls = new Lancers(LANCER_POSTS, room);
    const l = first(ls);
    const f = fakeView();
    for (const st of ['guard', 'walk', 'windup', 'thrust', 'fall'] as const) {
      l.state = st;
      l.t = 0.1;
      ls.drawBody(f.v, l);
    }
    expect(f.calls.fill ?? 0).toBeGreaterThan(10);
    expect(f.calls.stroke ?? 0).toBeGreaterThan(5);
  });
});
