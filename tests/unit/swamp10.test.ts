import { describe, expect, it } from 'vitest';
import {
  CUB_CURIOUS,
  DEER_CLEAR,
  DEER_SHY,
  FROG_SHY,
  MONSTER_LEAVE,
  MONSTER_RISE,
  MONSTER_WAKE,
  onSwamp,
  PANTHER_SHY,
  SNAKE_SHY,
  Swamp10,
} from '../../src/entities/swamp10';
import { ISLE10, inWater10 } from '../../src/world/isle10';
import { baseWorld } from './helpers/world';

type At = { x: number; y: number };
const run = (s: Swamp10, secs: number, at: (t: number) => At) => {
  for (let t = 0; t < secs; t += 1 / 30)
    s.update(1 / 30, baseWorld({ T: t, figure: { ...at(t), vx: 0, vy: 0 } }));
};
const FAR: At = { x: ISLE10.x - 400, y: ISLE10.y + 300 };

describe("island 10's swamp creatures", () => {
  it('all live in the swamp: frogs round the small pools, on their pads and banks, the rest on the mud', () => {
    const s = new Swamp10();
    expect(s.frogs.length).toBeGreaterThanOrEqual(6);
    for (const f of s.frogs) {
      if (f.pad) expect(inWater10(f.x, f.y)).toBe(true);
      else expect(onSwamp(f.x, f.y)).toBe(true);
      expect(f.pool.r).toBeLessThan(35);
    }
    expect(s.snakes.length).toBe(3);
    expect(s.panthers.length).toBe(2);
    expect(s.cubs.length).toBe(3);
    expect(s.deer.length).toBe(4);
    for (const a of [...s.snakes, ...s.panthers, ...s.cubs, ...s.deer, s.monster])
      expect(onSwamp(a.x, a.y)).toBe(true);
  });

  it('keep to the swamp while the figure wanders about among them for a long while', () => {
    const s = new Swamp10();
    const m = s.monster;
    run(s, 120, (t) => ({
      x: m.x - 120 + Math.sin(t * 0.21) * 160,
      y: m.y + Math.cos(t * 0.17) * 160,
    }));
    for (const a of [...s.snakes, ...s.panthers, ...s.cubs, ...s.deer]) {
      expect(onSwamp(a.x, a.y)).toBe(true);
    }
    for (const f of s.frogs) if (f.state === 'sit') expect([f.x, f.y]).toEqual([...f.home]);
  });

  it('frogs croak now and then, plop into the water when the figure comes close, and climb back after', () => {
    const s = new Swamp10();
    const f = s.frogs[1];
    if (!f) throw new Error('no frog');
    let croaks = 0;
    let plops = 0;
    s.onCroak = () => croaks++;
    s.onPlop = () => plops++;
    const off = { x: f.x + 120, y: f.y + 60 };
    run(s, 16, () => off);
    expect(croaks).toBeGreaterThan(0);
    run(s, 0.6, () => ({ x: f.home[0] + FROG_SHY - 15, y: f.home[1] }));
    expect(f.state).toBe('under');
    expect(plops).toBeGreaterThan(0);
    expect(inWater10(f.x, f.y)).toBe(true);
    run(s, 8, () => FAR);
    expect(f.state).toBe('sit');
    expect([f.x, f.y]).toEqual([...f.home]);
  });

  it('a snake rears up and hisses at the figure, then slithers off the other way', () => {
    const s = new Swamp10();
    const sn = s.snakes[0];
    if (!sn) throw new Error('no snake');
    let hisses = 0;
    s.onHiss = () => hisses++;
    const at = { x: sn.x + SNAKE_SHY - 15, y: sn.y };
    run(s, 0.2, () => at);
    expect(sn.state).toBe('rear');
    expect(hisses).toBe(1);
    run(s, 2, () => at);
    expect(sn.state).toBe('flee');
    expect(Math.hypot(sn.x - at.x, sn.y - at.y)).toBeGreaterThan(SNAKE_SHY - 15);
  });

  it('a panther slinks away from the figure; a tap sits it down for a yawn', () => {
    const s = new Swamp10();
    const p = s.panthers[0];
    if (!p) throw new Error('no panther');
    const at = { x: p.x - PANTHER_SHY + 25, y: p.y };
    const d0 = Math.hypot(p.x - at.x, p.y - at.y);
    run(s, 0.2, () => at);
    expect(p.state).toBe('slink');
    run(s, 1.2, () => at);
    expect(Math.hypot(p.x - at.x, p.y - at.y)).toBeGreaterThan(d0);
    run(s, 4, () => FAR);
    s.poke('panther', 0);
    expect(p.state).toBe('sit');
    expect(p.yawn).toBeGreaterThan(0);
  });

  it('the cubs sit up and wave at the figure, and roll over when tapped', () => {
    const s = new Swamp10();
    const c = s.cubs[0];
    if (!c) throw new Error('no cub');
    run(s, 0.2, () => ({ x: c.x - CUB_CURIOUS + 20, y: c.y }));
    expect(c.state).toBe('wave');
    expect(c.face).toBe(-1);
    run(s, 2, () => FAR);
    expect(c.state).not.toBe('wave');
    s.poke('cub', 0);
    expect(c.state).toBe('roll');
  });

  it('a deer bounds away from the figure until it is well clear, then browses', () => {
    const s = new Swamp10();
    const d = s.deer[0];
    if (!d) throw new Error('no deer');
    const at = { x: d.x - DEER_SHY + 20, y: d.y };
    run(s, 0.1, () => at);
    expect(d.state).toBe('bound');
    run(s, 3, () => at);
    expect(Math.hypot(d.x - at.x, d.y - at.y)).toBeGreaterThan(DEER_SHY);
    run(s, 3, () => FAR);
    expect(d.state).not.toBe('bound');
    expect(Math.hypot(d.x - at.x, d.y - at.y)).toBeGreaterThan(DEER_CLEAR - 40);
  });

  it('the swamp monster sleeps until the figure comes near, rises, roars, waves, and sinks back once it goes', () => {
    const s = new Swamp10();
    const m = s.monster;
    let roars = 0;
    s.onRoar = () => roars++;
    run(s, 2, () => ({ x: m.x - MONSTER_WAKE - 40, y: m.y }));
    expect(m.state).toBe('sleep');
    expect(Swamp10.monsterUp(m)).toBe(0);
    run(s, MONSTER_RISE + 0.2, () => ({ x: m.x - MONSTER_WAKE + 20, y: m.y }));
    expect(m.state).toBe('roar');
    expect(roars).toBe(1);
    run(s, 2, () => ({ x: m.x - MONSTER_WAKE + 20, y: m.y }));
    expect(m.state).toBe('wave');
    expect(m.face).toBe(-1);
    s.poke('monster', 0);
    expect(m.state).toBe('roar');
    expect(roars).toBe(2);
    run(s, 6, () => ({ x: m.x - MONSTER_LEAVE - 40, y: m.y }));
    expect(m.state).toBe('sleep');
    s.poke('monster', 0);
    expect(m.state).toBe('rise');
  });

  it('everyone is back where they live on the next visit; frogs under the water cannot be tapped', () => {
    const s = new Swamp10();
    const f = s.frogs[0];
    if (!f) throw new Error('no frog');
    run(s, 0.6, () => ({ x: f.x + 20, y: f.y }));
    expect(f.state).toBe('under');
    expect(s.targets().some((t) => t.k === 'frog' && t.i === 0)).toBe(false);
    s.home();
    expect(f.state).toBe('sit');
    expect([f.x, f.y]).toEqual([...f.home]);
    for (const a of [...s.panthers, ...s.cubs, ...s.deer]) expect([a.x, a.y]).toEqual([...a.home]);
    expect(s.monster.state).toBe('sleep');
  });
});
