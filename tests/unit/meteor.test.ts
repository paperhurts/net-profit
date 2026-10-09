import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import {
  AWAY,
  HARPOON_POWER,
  HARPOON_RANGE,
  HARPOON_RELOAD,
  RESOLVE,
} from '../../src/data/harpoon';
import { SPEED } from '../../src/data/tuning';
import { steerBoat } from '../../src/entities/boat';
import type { World } from '../../src/entities/entity';
import {
  AIM_ANGRY,
  AIM_T,
  DIVE_HIT,
  FALL_T,
  HAUNT_R,
  LEASH,
  MeteorSerpent,
  NOTICE,
  RING_R,
} from '../../src/entities/meteor';
import { SPEAR_SPEED } from '../../src/entities/spears';
import { ISLE6 } from '../../src/world/isle6';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
/** The stick's screen vector for a world direction. */
const stick = (wx: number, wy: number): [number, number] => {
  const sx = wx - wy;
  const sy = (wx + wy) / 2;
  const n = Math.hypot(sx, sy) || 1;
  return [sx / n, sy / n];
};
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/** A flagship this far from island 6's middle, at this angle round it. */
function near(d: number, a = Math.PI / 2, v = 0): World {
  return baseWorld({
    hullScale: 1.6,
    boat: { x: ISLE6.x + Math.cos(a) * d, y: ISLE6.y + Math.sin(a) * d, h: a + Math.PI / 2, v },
  });
}

/** Run it until it has dived and is down in the water, or give up; returns the seconds it took. */
function untilDown(m: MeteorSerpent, w: World, max = 20): number {
  let t = 0;
  for (; t < max && m.state !== 'down'; t += DT) m.update(DT, w);
  return t;
}

describe('the meteor serpent', () => {
  it('flies its loop high over island 6 while nobody comes near', () => {
    const m = new MeteorSerpent();
    const w = near(LEASH + 400);
    for (let i = 0; i < 60 / DT; i++) {
      m.update(DT, w);
      const d = Math.hypot(m.x - ISLE6.x, m.y - ISLE6.y);
      expect(d).toBeGreaterThan(HAUNT_R - 200);
      expect(d).toBeLessThan(HAUNT_R + 200);
    }
    expect(m.state).toBe('haunt');
    expect(m.z).toBeGreaterThan(150);
    expect(m.mark()).toBeNull();
  });

  it('hunts a flagship that comes near the island, but not a boat tied up', () => {
    const m = new MeteorSerpent();
    let hunts = 0;
    m.onHunt = () => hunts++;
    const w = near(NOTICE - 100);
    w.docked = true;
    for (let i = 0; i < 5 / DT; i++) m.update(DT, w);
    expect(m.state).toBe('haunt');
    w.docked = false;
    m.update(DT, w);
    expect(m.state).toBe('hunt');
    expect(hunts).toBe(1);
  });

  it('shows the ring where the boat will be before it dives, and hits a boat that sails on into it', () => {
    const m = new MeteorSerpent();
    const w = near(1100);
    let hits = 0;
    let warned = -1;
    let landed = -1;
    let t = 0;
    m.onWarn = () => {
      warned = t;
    };
    m.onHit = () => hits++;
    m.onSplash = () => {
      landed = t;
    };
    for (; t < 20 && landed < 0; t += DT) {
      // Sailing straight round the island and minding nothing.
      steerBoat(w.boat, ...stick(Math.cos(w.boat.h), Math.sin(w.boat.h)), SPEED[5], DT);
      m.update(DT, w);
    }
    expect(warned).toBeGreaterThan(0);
    expect(landed - warned).toBeCloseTo(AIM_T + FALL_T, 1);
    expect(hits).toBe(1);
    expect(m.state).toBe('down');
  });

  it('hits a boat that sits still', () => {
    const m = new MeteorSerpent();
    const w = near(1100);
    let hits = 0;
    m.onHit = () => hits++;
    untilDown(m, w);
    expect(hits).toBe(1);
  });

  it('misses a boat that steers out of its ring', () => {
    const m = new MeteorSerpent();
    const w = near(1100, Math.PI / 2, SPEED[5]);
    let hits = 0;
    m.onHit = () => hits++;
    for (let t = 0; t < 20 && m.state !== 'down'; t += DT) {
      // Sails on, and when the ring shows turns away from it.
      const r = m.ring;
      const [dx, dy] = r
        ? [w.boat.x - r.x, w.boat.y - r.y]
        : [Math.cos(w.boat.h), Math.sin(w.boat.h)];
      steerBoat(w.boat, ...stick(dx, dy), SPEED[5], DT);
      m.update(DT, w);
    }
    expect(m.state).toBe('down');
    expect(hits).toBe(0);
  });

  it('can be harpooned only while it is down in the water', () => {
    const m = new MeteorSerpent();
    const w = near(1100);
    expect(m.harpoon(1)).toBe(false);
    expect(m.resolve).toBe(RESOLVE.meteor);
    untilDown(m, w);
    expect(m.mark()).not.toBeNull();
    expect(m.harpoon(1)).toBe(false);
    expect(m.resolve).toBe(RESOLVE.meteor - 1);
    for (let i = 0; i < 6 / DT; i++) m.update(DT, w);
    expect(m.mark()).toBeNull();
  });

  it('is driven off by four harpoons, stays away a good while, and comes back whole', () => {
    expect(RESOLVE.meteor).toBe(4);
    const m = new MeteorSerpent();
    const w = near(1100);
    untilDown(m, w);
    expect(m.harpoon(1)).toBe(false);
    expect(m.harpoon(1)).toBe(false);
    for (let i = 0; i < 6 / DT && m.state !== 'hunt'; i++) m.update(DT, w);
    expect(m.state).toBe('hunt');
    untilDown(m, w);
    expect(m.harpoon(1)).toBe(false);
    expect(m.harpoon(1)).toBe(true);
    expect(m.state).toBe('away');
    expect(m.hunting).toBe(false);
    for (let i = 0; i < (AWAY - 1) / DT; i++) m.update(DT, w);
    expect(m.state).toBe('away');
    for (let i = 0; i < 2 / DT; i++) m.update(DT, w);
    expect(m.resolve).toBe(RESOLVE.meteor);
    expect(m.state).not.toBe('away');
  });

  it('dives faster once it is down to half', () => {
    const m = new MeteorSerpent();
    const w = near(1100);
    const first = untilDown(m, w);
    m.harpoon(1);
    m.harpoon(1);
    expect(m.angry).toBe(true);
    for (let i = 0; i < 5 / DT && m.state !== 'hunt'; i++) m.update(DT, w);
    expect(untilDown(m, w)).toBeLessThan(first);
  });

  it('gives up a boat that sails away, and is whole again', () => {
    const m = new MeteorSerpent();
    const w = near(1100);
    untilDown(m, w);
    m.harpoon(1);
    w.boat.y = ISLE6.y + LEASH + 50;
    m.update(DT, w);
    expect(m.state).toBe('haunt');
    expect(m.resolve).toBe(RESOLVE.meteor);
  });

  it('holds off while the Deep One is up, and comes on once it is not', () => {
    const m = new MeteorSerpent();
    let deep = true;
    m.holdOff = () => deep;
    const w = near(1100);
    for (let i = 0; i < 10 / DT; i++) m.update(DT, w);
    expect(m.state).toBe('haunt');
    deep = false;
    expect(untilDown(m, w)).toBeLessThan(10);
    // Up again mid-hunt: back to its loop.
    for (let i = 0; i < 5 / DT && m.state !== 'hunt'; i++) m.update(DT, w);
    deep = true;
    m.update(DT, w);
    expect(m.state).toBe('haunt');
  });

  it('is sighted once, when it comes over, even from ashore', () => {
    const m = new MeteorSerpent();
    let seen = 0;
    m.onSight = () => seen++;
    const w = near(HAUNT_R + 200);
    w.docked = true;
    for (let i = 0; i < 90 / DT; i++) m.update(DT, w);
    expect(seen).toBe(1);
    expect(m.state).toBe('haunt');
  });

  it('draws in the air and on the water without throwing', () => {
    const m = new MeteorSerpent();
    const w = near(1100);
    const { v, calls } = fakeView();
    for (let i = 0; i < 12 / DT; i++) {
      m.update(DT, w);
      if (i % 20 === 0) for (const l of ['surface', 'air', 'overlay'] as const) m.draw(v, l);
    }
    expect(calls.fill).toBeGreaterThan(0);
    expect(calls.indicator).toBeGreaterThan(0);
  });
});

/** How long a person takes to see the ring and turn. */
const REACT = 0.35;

/**
 * A person at the wheel of a flagship: sails round island 6 a little off its shore; a reaction time after
 * the ring shows, steers away from it (or minds nothing, with no reaction); whenever the serpent is down in
 * the water, heads for it, and fires the harpoon a third of a second after it is in reach. Wins out of 30,
 * the boat's health it costs on average, and how long a win takes. Sunk is a loss.
 */
function fights(react: number | null): { wins: number; lost: number; secs: number } {
  const r = rng(61 + (react ?? 9) * 100);
  let wins = 0;
  let lost = 0;
  let time = 0;
  for (let run = 0; run < 30; run++) {
    const m = new MeteorSerpent();
    const a0 = r() * Math.PI * 2;
    const w = near(1300, a0, 200);
    w.boat.h = a0 + Math.PI;
    let hp = 100;
    let ready = 0;
    let ringAt = -1;
    const pending: { at: number }[] = [];
    m.onHit = () => {
      hp -= DIVE_HIT;
    };
    let t = 0;
    const way = run % 2 ? 1 : -1;
    for (; t < 240 && hp > 0 && m.state !== 'away'; t += DT) {
      w.T = t;
      const b = w.boat;
      if (m.ring && ringAt < 0) ringAt = t;
      if (!m.ring) ringAt = -1;
      // Round the island at about 1000 from its middle.
      const ra = Math.atan2(b.y - ISLE6.y, b.x - ISLE6.x);
      const rd = Math.hypot(b.x - ISLE6.x, b.y - ISLE6.y);
      let dx = -Math.sin(ra) * way + Math.cos(ra) * clamp1((1000 - rd) / 150);
      let dy = Math.cos(ra) * way + Math.sin(ra) * clamp1((1000 - rd) / 150);
      const mk = m.mark();
      if (mk) {
        const gx = mk.x - b.x;
        const gy = mk.y - b.y;
        const gl = Math.hypot(gx, gy) || 1;
        dx = gx / gl;
        dy = gy / gl;
      }
      if (react !== null && m.ring && ringAt >= 0 && t - ringAt >= react) {
        // Swerve: hard left or right, whichever side of the ring the boat is already on.
        const fx = Math.cos(b.h);
        const fy = Math.sin(b.h);
        const s = fx * (b.y - m.ring.y) - fy * (b.x - m.ring.x) >= 0 ? 1 : -1;
        dx = -fy * s;
        dy = fx * s;
      }
      steerBoat(b, ...stick(dx, dy), SPEED[5], DT);
      const bow = { x: b.x + Math.cos(b.h) * 38, y: b.y + Math.sin(b.h) * 38 };
      const d = mk ? Math.hypot(mk.x - bow.x, mk.y - bow.y) : Infinity;
      if (mk && t >= ready && d < HARPOON_RANGE) {
        ready = t + HARPOON_RELOAD + 1 / 3;
        pending.push({ at: t + 1 / 3 + Math.max(0.12, d / SPEAR_SPEED) });
      }
      for (let i = pending.length - 1; i >= 0; i--) {
        if (t >= (pending[i] as { at: number }).at) {
          pending.splice(i, 1);
          m.harpoon(HARPOON_POWER);
        }
      }
      m.update(DT, w);
    }
    if (m.state === 'away') {
      wins++;
      time += t;
    }
    lost += 100 - Math.max(0, hp);
  }
  return { wins, lost: lost / 30, secs: wins ? time / wins : 0 };
}

describe('fighting the meteor serpent', () => {
  it('is won by steering out of its rings and harpooning it in the water', () => {
    const f = fights(REACT);
    expect(f.wins).toBeGreaterThanOrEqual(27);
    expect(f.lost).toBeLessThan(25);
    expect(f.secs).toBeGreaterThan(15);
    expect(f.secs).toBeLessThan(90);
  });

  it('costs a slow one some of the boat, and one who never minds the rings most of it', () => {
    const quick = fights(REACT).lost;
    expect(fights(0.9).lost).toBeGreaterThan(quick);
    expect(fights(null).lost).toBeGreaterThan(60);
  });

  it('warns longer than it takes to turn, even angry', () => {
    expect(AIM_ANGRY).toBeLessThan(AIM_T);
    expect(AIM_ANGRY + FALL_T).toBeGreaterThan(REACT + 0.8);
    expect(RING_R).toBeGreaterThan(30);
  });
});
