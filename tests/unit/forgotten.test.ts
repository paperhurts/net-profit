import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { spearAt } from '../../src/data/spear';
import type { World } from '../../src/entities/entity';
import {
  AIM,
  ANGRY_FAN,
  FALL,
  FAN,
  FIRST_ATTACK,
  FORGOTTEN_HP,
  Forgotten,
  RAY_HIT,
  REACH,
  SKULL_SPEED,
  WINDUP,
} from '../../src/entities/forgotten';
import { MERLOCK_HP, MERLOCK_RISE, Merlocks } from '../../src/entities/merlocks';
import { Spears } from '../../src/entities/spears';
import { Horde, RISE, type Spawn, UNDEAD, type Undead } from '../../src/entities/undead';
import { WALK_SPEED, walkable } from '../../src/entities/walker';
import {
  CASTLE_SPAWNS,
  FORGOTTEN_START,
  LOCKED,
  LOCKED_REACH,
  SEAT,
} from '../../src/world/gigantis';
import { entry, ROOMS, type Room, THRONE } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
const room = ROOMS[THRONE] as Room;
const at = (dx: number, dy: number) => ({ x: room.x + dx, y: room.y + dy, vx: 0, vy: 0 });

describe('the throne room', () => {
  it('has the throne at its back, the Forgotten One before it, and the locked door behind it within reach', () => {
    expect(walkable(SEAT.x, SEAT.y, 0)).toBe(false);
    expect(walkable(FORGOTTEN_START.x, FORGOTTEN_START.y, 0)).toBe(true);
    expect(walkable(entry(THRONE).x, entry(THRONE).y, 0)).toBe(true);
    // A spot by the locked door can be stood on, round the throne.
    let near = false;
    for (let a = 0; a < 32 && !near; a++) {
      const x = LOCKED.x + Math.cos((a / 32) * Math.PI * 2) * (LOCKED_REACH - 8);
      const y = LOCKED.y + Math.sin((a / 32) * Math.PI * 2) * (LOCKED_REACH - 8);
      near = walkable(x, y, 0);
    }
    expect(near).toBe(true);
    expect(
      (CASTLE_SPAWNS[THRONE] as readonly Spawn[]).filter((s) => s.kind === 'necro'),
    ).toHaveLength(3);
  });
});

describe('the Forgotten One', () => {
  it('waits until the figure comes in, then flings three skulls at it, then shows a line and burns along it', () => {
    const b = new Forgotten(room, FORGOTTEN_START);
    let woke = 0;
    let aims = 0;
    b.onWake = () => woke++;
    b.onAim = () => aims++;
    const w: World = baseWorld({ figure: null });
    b.update(DT, w);
    expect(b.state).toBe('wait');
    w.figure = at(80, 80);
    b.update(DT, w);
    expect(woke).toBe(1);
    for (let i = 0; i < (FIRST_ATTACK + 0.1) / DT; i++) b.update(DT, w);
    expect(b.skulls.length + 0).toBeGreaterThanOrEqual(FAN.length - 1);
    b.skulls.length = 0;
    // The ray next, aimed where the figure stood; a figure on the line when it burns is hit.
    let hits: string[] = [];
    b.onHit = (by) => hits.push(by);
    for (let i = 0; i < 4 / DT && b.state !== 'beam'; i++) {
      // Held where he stands, so he stays out of a sword's reach.
      b.x = FORGOTTEN_START.x;
      b.y = FORGOTTEN_START.y;
      b.update(DT, w);
    }
    expect(aims).toBe(1);
    expect(b.state).toBe('beam');
    b.update(DT, w);
    expect(hits).toContain('ray');
    // One that stepped off the line in time is not.
    const b2 = new Forgotten(room, FORGOTTEN_START);
    b2.rayNext = true;
    const f2 = at(80, 80);
    const w2: World = baseWorld({ figure: f2 });
    hits = [];
    b2.onHit = (by) => hits.push(by);
    for (let i = 0; i < 4 / DT && b2.state !== 'aim'; i++) {
      b2.x = FORGOTTEN_START.x;
      b2.y = FORGOTTEN_START.y;
      b2.update(DT, w2);
    }
    expect(b2.state).toBe('aim');
    const h = b2.ray.h;
    // A step to the side, well inside the warning.
    for (let i = 0; i < (AIM * 0.6) / DT; i++) {
      f2.x += -Math.sin(h) * WALK_SPEED * DT;
      f2.y += Math.cos(h) * WALK_SPEED * DT;
      b2.update(DT, w2);
    }
    expect(b2.offRay(f2.x, f2.y)).toBeGreaterThan(RAY_HIT);
    for (let i = 0; i < 1 / DT; i++) b2.update(DT, w2);
    expect(hits).not.toContain('ray');
    expect(SKULL_SPEED).toBeGreaterThan(WALK_SPEED);
  });

  it('raises his sword close in and sweeps it; step back while it is up and it misses', () => {
    for (const stepBack of [false, true]) {
      const b = new Forgotten(room, FORGOTTEN_START);
      const f = { x: FORGOTTEN_START.x + REACH * 0.6, y: FORGOTTEN_START.y, vx: 0, vy: 0 };
      const w: World = baseWorld({ figure: f });
      const hits: string[] = [];
      b.onHit = (by) => hits.push(by);
      b.update(DT, w);
      for (let i = 0; i < (WINDUP + 0.4) / DT; i++) {
        if (stepBack && b.state === 'windup' && b.t > 0.2) f.x += WALK_SPEED * DT;
        b.update(DT, w);
      }
      expect(hits.includes('sword')).toBe(!stepBack);
    }
  });

  it('flings five once hurt to half; beaten, he falls apart and says where', () => {
    const b = new Forgotten(room, FORGOTTEN_START);
    const w: World = baseWorld({ figure: at(90, 90) });
    b.update(DT, w);
    b.hit(FORGOTTEN_HP / 2);
    expect(b.angry).toBe(true);
    b.cd = 0;
    b.rayNext = false;
    b.update(DT, w);
    expect(b.skulls).toHaveLength(ANGRY_FAN.length);
    let fell: { x: number; y: number } | null = null;
    b.onBeaten = (x, y) => {
      fell = { x, y };
    };
    b.hit(99);
    expect(b.state).toBe('fall');
    for (let i = 0; i < (FALL + 0.1) / DT; i++) b.update(DT, w);
    expect(b.state).toBe('gone');
    expect(fell).not.toBeNull();
  });

  it('leaves his bones, which hit for two and call up a ghost and a skeleton', () => {
    const h = new Horde(room, []);
    const w: World = baseWorld({ figure: at(60, 60) });
    const bones = h.raise(room.x, room.y, 'bones');
    expect(bones.spec.damage).toBe(2);
    expect(bones.hp).toBe(4);
    const raised: Undead[] = [];
    h.onRaise = (u) => raised.push(u);
    const hits: number[] = [];
    h.onHit = (_by, n) => hits.push(n);
    for (let i = 0; i < (RISE + UNDEAD.bones.windup + 2) / DT; i++) h.update(DT, w);
    expect(raised.map((u) => u.kind).sort()).toEqual(['ghost', 'skeleton']);
    // Beaten, what it called falls with it.
    h.hit(bones, 99, room.x + 50, room.y);
    expect(raised.every((u) => u.state === 'fall')).toBe(true);
    // Its swing takes two hearts.
    const h2 = new Horde(room, []);
    const hits2: number[] = [];
    h2.onHit = (_by, n) => hits2.push(n);
    h2.raise(room.x, room.y, 'bones');
    const w2: World = baseWorld({ figure: at(12, 12) });
    for (let i = 0; i < 4 / DT; i++) h2.update(DT, w2);
    expect(hits2).toContain(2);
    void hits;
  });

  it('draws in every state, with his skulls and his ray', () => {
    const f = fakeView();
    const b = new Forgotten(room, FORGOTTEN_START);
    for (const st of ['wait', 'walk', 'windup', 'swing', 'aim', 'beam', 'fall'] as const) {
      b.state = st;
      b.t = 0.1;
      b.skulls.push({ x: room.x, y: room.y, h: 0, t: 0 });
      b.drawBody(f.v);
      b.draw(f.v, 'air');
    }
    expect(f.calls.arc ?? 0).toBeGreaterThan(20);
    expect(f.calls.stroke ?? 0).toBeGreaterThan(10);
  });
});

describe("the warlock's merlocks", () => {
  it('climb out of the water, go for the nearest of the dead and jab it, and splash back when beaten', () => {
    const m = new Merlocks();
    const w: World = baseWorld({ figure: at(60, 60) });
    let dealt = 0;
    const foe = { x: room.x, y: room.y, hit: (n: number) => (dealt += n) };
    m.findTarget = (x, y, r) => (Math.hypot(foe.x - x, foe.y - y) <= r ? foe : null);
    const one = m.call(room.x + 60, room.y + 40);
    expect(one.state).toBe('rise');
    for (let i = 0; i < (MERLOCK_RISE + 4) / DT; i++) m.update(DT, w);
    expect(dealt).toBeGreaterThanOrEqual(2);
    expect(m.standing).toBe(1);
    for (let i = 0; i < MERLOCK_HP; i++) {
      one.invuln = 0;
      expect(m.hurt(one)).toBe(true);
    }
    expect(one.state).toBe('sink');
    for (let i = 0; i < 1 / DT; i++) m.update(DT, w);
    expect(m.list).toHaveLength(0);
    const f = fakeView();
    m.call(room.x, room.y);
    for (const st of ['rise', 'fight', 'sink'] as const) {
      const q = m.list[0];
      if (q) q.state = st;
      if (q) m.drawBody(f.v, q);
    }
    expect(f.calls.restore).toBe(f.calls.save);
  });
});

/**
 * A person in the throne room against the three necromancers and the Forgotten One, then his bones: they
 * circle the nearest at a walk, walking in on one out of reach and keeping off the throne; they turn when
 * skulls or arrows fly, step back from a raised sword, and step aside off the red line, each react
 * seconds later (give or take a tenth); they throw at what the spear goes for, lag seconds late. heals is
 * the healer cat's. Wins out of 30, the hearts lost on average, and the seconds.
 */
function throne(level: number, heals: number, react = 0.25, lag = 1 / 3) {
  const sp = spearAt(level);
  if (!sp) throw new Error('spear');
  const r = rng(level * 13 + heals);
  let wins = 0;
  let lost = 0;
  let secs = 0;
  for (let run = 0; run < 30; run++) {
    const h = new Horde(room, CASTLE_SPAWNS[THRONE] as readonly Spawn[]);
    const b = new Forgotten(room, FORGOTTEN_START);
    b.onBeaten = (x, y) => h.raise(x, y, 'bones');
    const spears = new Spears();
    const e = entry(THRONE);
    const f = { x: e.x, y: e.y, vx: 0, vy: 0 };
    const w: World = baseWorld({ figure: f });
    let hearts = 3;
    let invuln = 0;
    let ready = 0;
    let t = 0;
    let side = run % 2 ? 1 : -1;
    let flip = 1.2 + r() * 0.8;
    let healsLeft = heals;
    let healAt = -1;
    let turnAt = -1;
    let dodge = -1;
    const later = () => t + react + (r() - 0.5) * 0.2;
    const seen = new Map<object, number>();
    const hurt = (n: number) => {
      if (invuln > 0) return;
      hearts -= n;
      invuln = 1.2;
      if (healsLeft > 0 && hearts > 0 && healAt < 0) healAt = t + 1.2;
    };
    h.onHit = (_by, n) => hurt(n);
    b.onHit = () => hurt(1);
    h.onShoot = () => {
      if (turnAt < 0) turnAt = later();
    };
    b.onSkulls = () => {
      if (turnAt < 0) turnAt = later();
    };
    b.onAim = () => {
      dodge = later();
    };
    const done = () => b.state === 'gone' && h.cleared;
    for (; t < 180 && !done() && hearts > 0; t += DT) {
      invuln -= DT;
      flip -= DT;
      if (healAt >= 0 && t >= healAt) {
        healAt = -1;
        if (hearts < 3) {
          hearts = Math.min(3, hearts + 1);
          healsLeft--;
        }
      }
      if (flip <= 0 || (turnAt >= 0 && t >= turnAt)) {
        side = -side;
        flip = 1.2 + r() * 0.8;
        turnAt = -1;
      }
      const foes: { x: number; y: number; reach: number }[] = h.list
        .filter((u) => Horde.up(u))
        .map((u) => ({ x: u.x, y: u.y, reach: u.spec.reach }));
      if (b.up) foes.push({ x: b.x, y: b.y, reach: REACH });
      let near = foes[0];
      for (const q of foes)
        if (near && Math.hypot(q.x - f.x, q.y - f.y) < Math.hypot(near.x - f.x, near.y - f.y))
          near = q;
      let vx = 0;
      let vy = 0;
      const swingers: { x: number; y: number; reach: number; key: object }[] = h.list
        .filter((u) => u.state === 'windup')
        .map((u) => ({ x: u.x, y: u.y, reach: u.spec.reach, key: u }));
      if (b.state === 'windup') swingers.push({ x: b.x, y: b.y, reach: REACH, key: b });
      for (const k of [...seen.keys()]) if (!swingers.some((q) => q.key === k)) seen.delete(k);
      for (const q of swingers) if (!seen.has(q.key)) seen.set(q.key, later());
      const raised = swingers.find(
        (q) => t >= (seen.get(q.key) ?? 99) && Math.hypot(q.x - f.x, q.y - f.y) < q.reach + 18,
      );
      if (
        (b.state === 'aim' || b.state === 'beam') &&
        dodge >= 0 &&
        t >= dodge &&
        b.offRay(f.x, f.y) < 40
      ) {
        // Off the red line, sideways.
        const s =
          -Math.sin(b.ray.h) * (f.x - b.ray.x) + Math.cos(b.ray.h) * (f.y - b.ray.y) >= 0 ? 1 : -1;
        vx = -Math.sin(b.ray.h) * s;
        vy = Math.cos(b.ray.h) * s;
      } else if (raised) {
        const d = Math.hypot(f.x - raised.x, f.y - raised.y) || 1;
        vx = (f.x - raised.x) / d;
        vy = (f.y - raised.y) / d;
      } else if (near) {
        const d = Math.hypot(near.x - f.x, near.y - f.y) || 1;
        vx = (-(near.y - f.y) / d) * side;
        vy = ((near.x - f.x) / d) * side;
        if (near.reach > 0 && d < 55) {
          vx -= ((near.x - f.x) / d) * 0.8;
          vy -= ((near.y - f.y) / d) * 0.8;
        }
        if (d > sp.range - 10) {
          vx += ((near.x - f.x) / d) * 1.5;
          vy += ((near.y - f.y) / d) * 1.5;
        }
      }
      const ex = f.x - room.x;
      const ey = f.y - room.y;
      const el = Math.hypot(ex, ey);
      if (el > room.r - 40) {
        vx -= ex / el;
        vy -= ey / el;
      }
      const n = Math.hypot(vx, vy) || 1;
      f.vx = (vx / n) * WALK_SPEED;
      f.vy = (vy / n) * WALK_SPEED;
      const nx = f.x + f.vx * DT;
      const ny = f.y + f.vy * DT;
      if (walkable(nx, ny, 0)) {
        f.x = nx;
        f.y = ny;
      } else side = -side;
      if (t >= ready) {
        let u: { x: number; y: number } | null = h.target(f.x, f.y, sp.range);
        let fire: () => void = () => {};
        if (u) {
          const q = u as Undead;
          fire = () => h.hit(q, sp.power, f.x, f.y);
        }
        const fd = Math.hypot(b.x - f.x, b.y - f.y);
        if (
          b.up &&
          fd <= sp.range &&
          (!u || ((u as Undead).kind !== 'necro' && fd < Math.hypot(u.x - f.x, u.y - f.y)))
        ) {
          u = b;
          fire = () => b.hit(sp.power);
        }
        if (u) {
          ready = t + sp.reload + lag;
          spears.launch(f.x, f.y, 20, u, 30, fire);
        }
      }
      h.update(DT, w);
      b.update(DT, w);
      spears.update(DT, w);
    }
    if (done() && hearts > 0) wins++;
    lost += 3 - Math.max(0, hearts);
    secs += t;
  }
  return { wins, lost: lost / 30, secs: secs / 30 };
}

describe('the fight for the throne', () => {
  it('is won by a sharp person, alone or not, and most times by a slow one with the cat; alone, a slow one loses half', () => {
    const sharpCat = throne(4, 2);
    const sharpAlone = throne(4, 0);
    const slowCat = throne(4, 2, 0.45, 0.7);
    const slowAlone = throne(4, 0, 0.45, 0.7);
    expect(sharpCat.wins).toBeGreaterThanOrEqual(27);
    expect(sharpAlone.wins).toBeGreaterThanOrEqual(22);
    expect(slowCat.wins).toBeGreaterThanOrEqual(20);
    expect(slowAlone.wins).toBeGreaterThanOrEqual(9);
    expect(slowAlone.wins).toBeLessThanOrEqual(22);
    // The longest fight in the game: about half a minute.
    expect(sharpAlone.secs).toBeGreaterThan(18);
    expect(slowAlone.lost).toBeGreaterThan(1.5);
  });
});
