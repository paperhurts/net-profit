import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { spearAt } from '../../src/data/spear';
import type { World } from '../../src/entities/entity';
import {
  OLD_HP,
  OLD_RISE,
  OLD_SINK,
  OldOne,
  SLAM_R,
  SLAM_REACH,
  SLAM_WARN,
  SUMMON_BELOW,
  SUMMON_EVERY,
  SUMMON_N,
} from '../../src/entities/oldone';
import { Spears } from '../../src/entities/spears';
import { Horde, UNDEAD, type Undead } from '../../src/entities/undead';
import { WALK_SPEED, walkable } from '../../src/entities/walker';
import { POOL } from '../../src/world/gigantis';
import { entry, ROOMS, type Room, RUINS } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
const room = ROOMS[RUINS] as Room;
const fig = (x: number, y: number) => ({ x, y, vx: 0, vy: 0 });
/** A spot on the floor this far from the pool's middle, toward the way in. */
const fromPool = (d: number) => {
  const a = Math.PI / 4;
  return fig(POOL.x + Math.cos(a) * d, POOL.y + Math.sin(a) * d);
};

describe('the Old One', () => {
  it('waits under the pool, rises, and once the fight is on summons five lagoon creatures at the edge', () => {
    const o = new OldOne(POOL);
    const w: World = baseWorld({ figure: fromPool(170) });
    const at: { x: number; y: number }[][] = [];
    o.onSummon = (p) => at.push(p);
    o.standing = () => 0;
    for (let i = 0; i < 2 / DT; i++) o.update(DT, w);
    expect(o.state).toBe('wait');
    expect(o.up).toBe(false);
    o.rise();
    for (let i = 0; i < (OLD_RISE + 0.5) / DT; i++) o.update(DT, w);
    expect(o.state).toBe('rise');
    expect(o.height).toBe(1);
    expect(at).toHaveLength(0);
    o.fight();
    o.update(DT, w);
    expect(o.up).toBe(true);
    expect(at).toHaveLength(1);
    expect(at[0]).toHaveLength(SUMMON_N);
    expect(SUMMON_N).toBe(5);
    for (const p of at[0] ?? []) expect(walkable(p.x, p.y, 0)).toBe(true);
    expect(UNDEAD.lagoon.hp).toBe(2);
    expect(UNDEAD.lagoon.damage).toBe(1);
  });

  it('summons five more every few seconds while fewer than six are standing', () => {
    const o = new OldOne(POOL);
    const w: World = baseWorld({ figure: fromPool(170) });
    let calls = 0;
    let standing = SUMMON_BELOW;
    o.onSummon = () => calls++;
    o.standing = () => standing;
    o.fight();
    for (let i = 0; i < 3 / DT; i++) o.update(DT, w);
    expect(calls).toBe(0);
    standing = SUMMON_BELOW - 1;
    o.update(DT, w);
    expect(calls).toBe(1);
    for (let i = 0; i < (SUMMON_EVERY - 1) / DT; i++) o.update(DT, w);
    expect(calls).toBe(1);
    for (let i = 0; i < 2 / DT; i++) o.update(DT, w);
    expect(calls).toBe(2);
  });

  it('brings his hand down where the figure stood at the pool edge; step out of the ring and it misses', () => {
    const o = new OldOne(POOL);
    const f = fromPool(SLAM_REACH - 30);
    const w: World = baseWorld({ figure: f });
    o.standing = () => 5;
    let hits = 0;
    o.onHit = () => hits++;
    o.fight();
    for (let i = 0; i < 4 / DT && !o.slam; i++) o.update(DT, w);
    expect(o.slam).not.toBeNull();
    for (let i = 0; i < (SLAM_WARN + 0.1) / DT; i++) o.update(DT, w);
    expect(hits).toBe(1);
    for (let i = 0; i < 4 / DT && !o.slam; i++) o.update(DT, w);
    expect(o.slam).not.toBeNull();
    f.x += SLAM_R * 1.5;
    for (let i = 0; i < (SLAM_WARN + 0.1) / DT; i++) o.update(DT, w);
    expect(hits).toBe(1);
    // Far from the pool he cannot reach.
    const far = fromPool(SLAM_REACH + 40);
    const o2 = new OldOne(POOL);
    o2.standing = () => 5;
    o2.fight();
    for (let i = 0; i < 6 / DT; i++) o2.update(DT, baseWorld({ figure: far }));
    expect(o2.slam).toBeNull();
  });

  it('is beaten in thirty, sinks and is gone; tar holds his hand', () => {
    const o = new OldOne(POOL);
    const w: World = baseWorld({ figure: fromPool(SLAM_REACH - 30) });
    o.standing = () => 5;
    let beaten = 0;
    o.onBeaten = () => beaten++;
    expect(o.hit(1)).toBe(false);
    o.fight();
    for (let i = 0; i < 4 / DT && !o.slam; i++) o.update(DT, w);
    o.stun(1);
    expect(o.slam).toBeNull();
    for (let i = 1; i < OLD_HP; i++) o.hit(1);
    expect(o.up).toBe(true);
    o.hit(1);
    expect(beaten).toBe(1);
    expect(o.state).toBe('sink');
    for (let i = 0; i < (OLD_SINK + 0.1) / DT; i++) o.update(DT, w);
    expect(o.state).toBe('gone');
    o.reset();
    expect(o.state).toBe('wait');
    o.beaten();
    expect(o.state).toBe('gone');
  });

  it('draws boiling, rising, fighting with a slam on its way, and sinking; and the lagoon creatures', () => {
    const o = new OldOne(POOL);
    const f = fakeView();
    o.boil = 1;
    o.drawBody(f.v);
    o.rise();
    o.t = 1;
    o.drawBody(f.v);
    o.fight();
    o.slam = { x: POOL.x + 90, y: POOL.y + 90, t: 0.5 };
    o.roar();
    o.drawBody(f.v);
    o.draw(f.v, 'air');
    o.hit(OLD_HP);
    o.drawBody(f.v);
    expect(f.calls.fill ?? 0).toBeGreaterThan(20);
    const h = new Horde(room, []);
    const u = h.raise(POOL.x + 70, POOL.y + 70, 'lagoon');
    for (const st of ['rise', 'walk', 'windup', 'swing', 'fall'] as const) {
      u.state = st;
      h.drawUnit(f.v, u);
    }
    expect(f.calls.restore).toBe(f.calls.save);
  });
});

/**
 * A person in the ruins against the Old One, from when his first five come out of the water: they circle the
 * pool at a walk about 150 out, keeping off its edge; they step back from a raised claw and out of a slam's ring,
 * each react seconds later (give or take a tenth); and they throw at what the spear goes for (a creature that
 * has come within 80, else him), lag seconds late. soul is soul armour: every third hit gives a heart back. heals is the cat's.
 * Wins out of 30, the hearts lost on average, and the seconds.
 */
function oldFight(level: number, soul: boolean, heals: number, react = 0.25, lag = 1 / 3) {
  const sp = spearAt(level);
  if (!sp) throw new Error('spear');
  const r = rng(level * 7 + heals + (soul ? 100 : 0) + Math.round(react * 100));
  let wins = 0;
  let lost = 0;
  let secs = 0;
  for (let run = 0; run < 30; run++) {
    const h = new Horde(room, []);
    const o = new OldOne(POOL);
    o.standing = () => h.list.filter((u) => Horde.up(u) || u.state === 'rise').length;
    o.onSummon = (at) => {
      for (const p of at) h.raise(p.x, p.y, 'lagoon');
    };
    const spears = new Spears();
    const e = entry(RUINS);
    const f = { x: e.x, y: e.y, vx: 0, vy: 0 };
    const w: World = baseWorld({ figure: f });
    let hearts = 3;
    let invuln = 0;
    let ready = 0;
    let t = 0;
    let side = run % 2 ? 1 : -1;
    let flip = 1.5 + r() * 1;
    let healsLeft = heals;
    let healAt = -1;
    let soulN = 0;
    let slamSeen = -1;
    const later = () => t + react + (r() - 0.5) * 0.2;
    const seen = new Map<object, number>();
    const hurt = (n: number) => {
      if (invuln > 0) return;
      hearts -= n;
      invuln = 1.2;
      if (healsLeft > 0 && hearts > 0 && healAt < 0) healAt = t + 1.2;
    };
    const landed = () => {
      if (!soul) return;
      soulN++;
      if (soulN >= 3) {
        soulN = 0;
        hearts = Math.min(3, hearts + 1);
      }
    };
    h.onHit = (_by, n) => hurt(n);
    o.onHit = () => hurt(1);
    o.fight();
    for (; t < 240 && o.state !== 'sink' && o.state !== 'gone' && hearts > 0; t += DT) {
      invuln -= DT;
      flip -= DT;
      if (healAt >= 0 && t >= healAt) {
        healAt = -1;
        if (hearts < 3) {
          hearts++;
          healsLeft--;
        }
      }
      if (flip <= 0) {
        side = -side;
        flip = 1.5 + r() * 1;
      }
      // Round the pool, about 150 out.
      const px = f.x - POOL.x;
      const py = f.y - POOL.y;
      const pd = Math.hypot(px, py) || 1;
      let vx = (-py / pd) * side + (px / pd) * Math.max(-1, Math.min(1, (150 - pd) / 30));
      let vy = (px / pd) * side + (py / pd) * Math.max(-1, Math.min(1, (150 - pd) / 30));
      // Back from a raised claw.
      const swingers = h.list.filter((u) => u.state === 'windup');
      for (const k of [...seen.keys()]) if (!swingers.includes(k as Undead)) seen.delete(k);
      for (const u of swingers) if (!seen.has(u)) seen.set(u, later());
      const raised = swingers.find(
        (u) => t >= (seen.get(u) ?? 99) && Math.hypot(u.x - f.x, u.y - f.y) < u.spec.reach + 18,
      );
      if (raised) {
        const d = Math.hypot(f.x - raised.x, f.y - raised.y) || 1;
        vx = (f.x - raised.x) / d;
        vy = (f.y - raised.y) / d;
      }
      // Out of a slam's ring.
      if (o.slam) {
        if (slamSeen < 0) slamSeen = later();
        if (t >= slamSeen && Math.hypot(f.x - o.slam.x, f.y - o.slam.y) < SLAM_R + 6) {
          vx = px / pd;
          vy = py / pd;
        }
      } else slamSeen = -1;
      const ex = f.x - room.x;
      const ey = f.y - room.y;
      const el = Math.hypot(ex, ey);
      if (el > room.r - 40) {
        vx -= ex / el;
        vy -= ey / el;
      }
      const n = Math.hypot(vx, vy) || 1;
      const nx = f.x + (vx / n) * WALK_SPEED * DT;
      const ny = f.y + (vy / n) * WALK_SPEED * DT;
      if (walkable(nx, ny, 0)) {
        f.x = nx;
        f.y = ny;
      } else side = -side;
      if (t >= ready) {
        const u = h.target(f.x, f.y, sp.range);
        const od = Math.hypot(o.x - f.x, o.y - f.y) - 40;
        if (o.up && od <= sp.range && (!u || Math.hypot(u.x - f.x, u.y - f.y) > 80)) {
          ready = t + sp.reload + lag;
          spears.launch(f.x, f.y, 20, o, 90, () => {
            if (o.hit(sp.power)) landed();
          });
        } else if (u) {
          ready = t + sp.reload + lag;
          const q = u as Undead;
          spears.launch(f.x, f.y, 20, q, 18, () => {
            if (Horde.up(q)) {
              h.hit(q, sp.power, f.x, f.y);
              landed();
            }
          });
        }
      }
      h.update(DT, w);
      o.update(DT, w);
      spears.update(DT, w);
    }
    if ((o.state === 'sink' || o.state === 'gone') && hearts > 0) wins++;
    lost += 3 - Math.max(0, hearts);
    secs += t;
  }
  return { wins, lost: lost / 30, secs: secs / 30 };
}

describe('the fight with the Old One', () => {
  it('is won by a sharp person in about forty seconds, by a slow one in soul armour in under two minutes, and soul armour matters', () => {
    const sharp = oldFight(4, true, 0);
    const slow = oldFight(4, true, 0, 0.45, 0.7);
    const slowBare = oldFight(4, false, 0, 0.45, 0.7);
    expect(sharp.wins).toBeGreaterThanOrEqual(27);
    expect(slow.wins).toBeGreaterThanOrEqual(24);
    expect(slowBare.wins).toBeLessThan(slow.wins);
    expect(slowBare.lost).toBeGreaterThan(slow.lost);
    expect(sharp.secs).toBeGreaterThan(30);
    expect(sharp.secs).toBeLessThan(90);
    expect(slow.secs).toBeLessThan(120);
  });
});
