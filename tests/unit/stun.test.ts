import { describe, expect, it } from 'vitest';
import { Anchorer } from '../../src/entities/anchorer';
import { Cthulhu } from '../../src/entities/cthulhu';
import type { World } from '../../src/entities/entity';
import { Fighter, SWORDSMAN } from '../../src/entities/fighter';
import { AIM, Forgotten } from '../../src/entities/forgotten';
import { Monkeys } from '../../src/entities/monkeys';
import { Sorcerer } from '../../src/entities/sorcerer';
import { SPIT_POWER, STUN, Tarling } from '../../src/entities/tarling';
import { Horde } from '../../src/entities/undead';
import { LANDING } from '../../src/entities/walker';
import { FORGOTTEN_START } from '../../src/world/gigantis';
import { ISLE4 } from '../../src/world/isle4';
import { HALL, HALL_A, ROOF, ROOMS, type Room, TEMPLE6, THRONE } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const fig = (x: number, y: number) => ({ x, y, vx: 0, vy: 0 });
const run = (e: { update(dt: number, w: World): void }, w: World, s: number) => {
  for (let i = 0; i < s / DT; i++) e.update(DT, w);
};

describe("the tarling's tar", () => {
  it('hits for one and sticks whatever it lands on for about a second, with tar on its face', () => {
    const tb = new Tarling();
    tb.free = true;
    const f = fig(LANDING.x, LANDING.y);
    const w: World = baseWorld({ figure: f });
    tb.update(DT, w);
    const got: { hit: number; stun: number } = { hit: 0, stun: 0 };
    const foe = {
      x: f.x - 60,
      y: f.y,
      hit: (p: number) => (got.hit += p),
      stun: (s: number) => (got.stun = s),
      head: 20,
    };
    tb.findTarget = () => foe;
    run(tb, w, 1.6);
    expect(got.hit).toBe(SPIT_POWER);
    expect(got.stun).toBe(STUN);
    expect(STUN).toBeGreaterThanOrEqual(0.8);
    expect(STUN).toBeLessThanOrEqual(1.5);
    expect(tb.stuck).toHaveLength(1);
    const v = fakeView();
    tb.draw(v.v, 'air');
    expect(v.calls.star ?? 0).toBeGreaterThan(0);
    // It wears off.
    tb.findTarget = () => null;
    run(tb, w, STUN + 0.1);
    expect(tb.stuck).toHaveLength(0);
    // Something that cannot be stuck is only hit.
    const plain = { x: f.x - 60, y: f.y, hit: (p: number) => (got.hit += p) };
    tb.findTarget = () => plain;
    run(tb, w, 3);
    expect(tb.stuck).toHaveLength(0);
  });
});

describe('stuck with tar', () => {
  it('a monkey stands still and bonks nobody, then comes on again', () => {
    const room = ROOMS[0] as Room;
    const camp = new Monkeys(room, 1, 0);
    const m = camp.list[0];
    if (!m) throw new Error('monkey');
    let bonks = 0;
    camp.onBonk = () => bonks++;
    const w: World = baseWorld({ figure: fig(m.x + 10, m.y) });
    camp.update(DT, w);
    expect(m.state).toBe('chase');
    camp.stun(m, STUN);
    bonks = 0;
    m.cd = 0;
    const at = { x: m.x, y: m.y };
    run(camp, w, STUN - 0.05);
    expect(bonks).toBe(0);
    expect(m.x).toBeCloseTo(at.x, 6);
    run(camp, w, 1.5);
    expect(bonks).toBeGreaterThan(0);
  });

  it('a sword going up comes down unswung, the swordsman and the undead alike', () => {
    const hall = ROOMS[HALL] as Room;
    const sw = new Fighter(SWORDSMAN, hall, { x: hall.x, y: hall.y });
    let slashes = 0;
    sw.onHit = () => slashes++;
    const w: World = baseWorld({ figure: fig(hall.x + 20, hall.y) });
    for (let i = 0; i < 300 && sw.state !== 'windup'; i++) sw.update(DT, w);
    expect(sw.state).toBe('windup');
    sw.stun(STUN);
    expect(sw.state).toBe('walk');
    run(sw, w, STUN - 0.05);
    expect(slashes).toBe(0);

    const room = ROOMS[HALL_A] as Room;
    const h = new Horde(room, [{ kind: 'skeleton', x: room.x, y: room.y }]);
    let hits = 0;
    h.onHit = () => hits++;
    const w2: World = baseWorld({ figure: fig(room.x + 15, room.y) });
    const u = h.list[0];
    if (!u) throw new Error('skeleton');
    for (let i = 0; i < 300 && u.state !== 'windup'; i++) h.update(DT, w2);
    expect(u.state).toBe('windup');
    h.stun(u, STUN);
    run(h, w2, STUN - 0.05);
    expect(hits).toBe(0);
    run(h, w2, 2);
    expect(hits).toBeGreaterThan(0);
  });

  it('the Forgotten One loses the ray he was aiming, and the sorcerer casts nothing while stuck', () => {
    const throne = ROOMS[THRONE] as Room;
    const b = new Forgotten(throne, FORGOTTEN_START);
    b.rayNext = true;
    const w: World = baseWorld({ figure: fig(throne.x + 90, throne.y + 90) });
    for (let i = 0; i < 600 && b.state !== 'aim'; i++) {
      b.x = FORGOTTEN_START.x;
      b.y = FORGOTTEN_START.y;
      b.update(DT, w);
    }
    expect(b.state).toBe('aim');
    let rays = 0;
    b.onHit = () => rays++;
    b.stun(STUN);
    expect(b.state).toBe('walk');
    run(b, w, AIM + 0.4);
    expect(rays).toBe(0);

    const roof = ROOMS[ROOF] as Room;
    const s = new Sorcerer(roof);
    let casts = 0;
    s.onCast = () => casts++;
    const w2: World = baseWorld({ figure: fig(roof.x, roof.y + 40) });
    s.update(DT, w2);
    s.cast = 0.05;
    s.stun(STUN);
    run(s, w2, STUN - 0.1);
    expect(casts).toBe(0);
    run(s, w2, 0.3);
    expect(casts).toBe(1);
  });

  it('the Tar Anchorer drops a whirl it was winding up, and Cthulhu sends no tentacles while stuck', () => {
    const a = new Anchorer();
    const sand = fig(ISLE4.x - 120, ISLE4.y - 90);
    const w: World = baseWorld({ figure: sand });
    for (let i = 0; i < 1200 && a.state !== 'whirl'; i++) a.update(DT, w);
    expect(a.state).toBe('whirl');
    a.stun(STUN);
    expect(a.state).toBe('wade');
    let thrown = false;
    for (let i = 0; i < (STUN - 0.05) / DT; i++) {
      a.update(DT, w);
      if (a.state === 'throw') thrown = true;
    }
    expect(thrown).toBe(false);

    const temple = ROOMS[TEMPLE6] as Room;
    const c = new Cthulhu(temple);
    let ripples = 0;
    c.onRipple = () => ripples++;
    const w2: World = baseWorld({ figure: fig(temple.x + 60, temple.y + 60) });
    c.update(DT, w2);
    c.stun(4);
    run(c, w2, 3.5);
    expect(ripples).toBe(0);
    let k = c.tents[0];
    for (let i = 0; i < 6 / DT && !k; i++) {
      c.update(DT, w2);
      k = c.tents[0];
    }
    expect(ripples).toBeGreaterThan(0);
    if (!k) throw new Error('tentacle');
    for (let i = 0; i < 200 && k.state !== 'chase'; i++) c.update(DT, w2);
    c.stunTent(k, STUN);
    const at = { x: k.x, y: k.y };
    run(c, w2, STUN - 0.05);
    expect(Math.hypot(k.x - at.x, k.y - at.y)).toBeLessThan(1);
  });
});
