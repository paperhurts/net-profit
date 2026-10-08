import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { HARPOON_POWER, HARPOON_RANGE, HARPOON_RELOAD } from '../../src/data/harpoon';
import { SPEED } from '../../src/data/tuning';
import { steerBoat } from '../../src/entities/boat';
import type { World } from '../../src/entities/entity';
import {
  AIM,
  BITE,
  CHARGE_UP,
  CHARGE_UP_ANGRY,
  DIE_T,
  KING_RESOLVE,
  LEASH,
  NOTICE,
  RAISE_T,
  SharkKing,
  TRIDENT,
  TRIDENT_FLIGHT,
} from '../../src/entities/sharkking';
import { ISLE5 } from '../../src/world/isle5';
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

/** A flagship sailing up to the reef from home's side. */
const near = (d = NOTICE - 50) =>
  baseWorld({
    hullScale: 1.6,
    boat: { x: ISLE5.x + d, y: ISLE5.y + 40, h: Math.PI, v: 200 },
  });

describe('the Skeleton Shark King', () => {
  it('waits round his reef until a boat comes near, then rises', () => {
    const k = new SharkKing();
    let rose = 0;
    k.onRise = () => rose++;
    const w = near(NOTICE + 300);
    for (let i = 0; i < 3 / DT; i++) k.update(DT, w);
    expect(k.state).toBe('wait');
    expect(k.fighting).toBe(false);
    w.boat.x = ISLE5.x + NOTICE - 50;
    k.update(DT, w);
    expect(rose).toBe(1);
    expect(k.fighting).toBe(true);
    // Only out of the water can the harpoon reach him.
    for (let i = 0; i < 2 / DT; i++) {
      k.update(DT, w);
      if (k.state === 'stalk') expect(k.mark()).toBeNull();
    }
  });

  it('warns before each attack, and comes out of the water for each, where the harpoon can reach him', () => {
    const k = new SharkKing();
    const w = near();
    const warned: string[] = [];
    k.onWarn = (what) => warned.push(what);
    const seen = new Set<string>();
    let marked = 0;
    for (let i = 0; i < 30 / DT; i++) {
      // The boat sails slowly round the reef.
      const a = Math.atan2(w.boat.y - ISLE5.y, w.boat.x - ISLE5.x) + 0.2 * DT;
      w.boat.x = ISLE5.x + Math.cos(a) * 500;
      w.boat.y = ISLE5.y + Math.sin(a) * 500;
      w.boat.h = a + Math.PI / 2;
      w.boat.v = 100;
      k.update(DT, w);
      seen.add(k.state);
      if (k.mark()) marked++;
    }
    for (const s of ['rise', 'stalk', 'aim', 'charge', 'leap', 'raise', 'throw'])
      expect(seen).toContain(s);
    expect(warned).toContain('charge');
    expect(warned).toContain('trident');
    expect(marked).toBeGreaterThan(0);
    // The ring shows before the trident flies.
    expect(RAISE_T).toBeGreaterThan(AIM);
    expect(AIM + TRIDENT_FLIGHT).toBeGreaterThan(0.9);
    expect(CHARGE_UP_ANGRY).toBeGreaterThan(0.6);
  });

  it('bites a boat that holds its course through a charge', () => {
    const k = new SharkKing();
    const w = near();
    let bites = 0;
    k.onBite = () => bites++;
    // Round the reef at a steady 300, never turning off.
    for (let i = 0; i < 30 / DT && bites === 0; i++) {
      const a = Math.atan2(w.boat.y - ISLE5.y, w.boat.x - ISLE5.x) + (300 / 500) * DT;
      w.boat.x = ISLE5.x + Math.cos(a) * 500;
      w.boat.y = ISLE5.y + Math.sin(a) * 500;
      w.boat.h = a + Math.PI / 2;
      w.boat.v = 300;
      k.update(DT, w);
    }
    expect(bites).toBeGreaterThan(0);
  });

  it('dies, beaten, rolled over at the surface for his speech, and stays dead', () => {
    const k = new SharkKing();
    const w = near();
    let beaten = 0;
    let dead = 0;
    k.onBeaten = () => beaten++;
    k.onDead = () => dead++;
    let hits = 0;
    for (let i = 0; i < 120 / DT && k.state !== 'dying'; i++) {
      k.update(DT, w);
      if (k.mark() && i % 40 === 0) {
        k.harpoon(1);
        hits++;
      }
    }
    expect(hits).toBe(KING_RESOLVE);
    expect(beaten).toBe(1);
    expect(k.fighting).toBe(false);
    expect(k.harpoon(1)).toBe(false);
    for (let i = 0; i < (DIE_T + 0.1) / DT; i++) k.update(DT, w);
    expect(dead).toBe(1);
    expect(k.state).toBe('dead');
    k.reset();
    expect(k.state).toBe('dead');
  });

  it('sinks back to his reef, whole, when the boat sails off', () => {
    const k = new SharkKing();
    const w = near();
    for (let i = 0; i < 2 / DT; i++) k.update(DT, w);
    k.resolve = 3;
    w.boat.x = ISLE5.x + LEASH + 100;
    k.update(DT, w);
    expect(k.state).toBe('wait');
    expect(k.resolve).toBe(KING_RESOLVE);
  });

  it('keeps off his reef', () => {
    const k = new SharkKing();
    const w = near();
    w.boat.x = ISLE5.x + ISLE5.r + 60;
    for (let i = 0; i < 20 / DT; i++) {
      k.update(DT, w);
      expect(Math.hypot(k.x - ISLE5.x, k.y - ISLE5.y)).toBeGreaterThanOrEqual(ISLE5.r + 39);
    }
  });

  it('draws in every state without a negative size', () => {
    const k = new SharkKing();
    const w = near();
    const v = fakeView();
    v.v.onScreen = () => true;
    for (let i = 0; i < 40 / DT; i++) {
      k.update(DT, w);
      if (k.mark() && i % 50 === 0) k.harpoon(1);
      v.v.T = i * DT;
      k.draw(v.v, 'surface');
      k.draw(v.v, 'air');
    }
    expect(v.calls.fill ?? 0).toBeGreaterThan(200);
  });
});

/** How long a person takes to see the churn or the ring, and turn; and how long they hold the turn. */
const REACT = 0.35;
const DODGE = 0.9;

/**
 * A person at the wheel of a flagship: sails round the reef, a little off it, and makes for him
 * whenever he is up out of the water; a reaction time after the water churns, turns hard off his line; a reaction time after a ring shows, steers out of it
 * (or minds neither, with no reaction); fires the harpoon whenever he is out of the water in reach,
 * a third of a second late. Wins out of 30, the boat's health it costs on average, and how long a
 * win takes. Eaten is a loss.
 */
function fights(react: number | null): { wins: number; lost: number; secs: number } {
  const r = rng(31 + (react ?? 9) * 100);
  let wins = 0;
  let lost = 0;
  let time = 0;
  for (let run = 0; run < 30; run++) {
    const k = new SharkKing();
    const a0 = r() * Math.PI * 2;
    const w: World = baseWorld({
      hullScale: 1.6,
      boat: {
        x: ISLE5.x + Math.cos(a0) * 650,
        y: ISLE5.y + Math.sin(a0) * 650,
        h: a0 + Math.PI,
        v: 200,
      },
    });
    let hp = 100;
    let ready = 0;
    let warnAt = -1;
    let ringAt = -1;
    let dodge: { x: number; y: number } | null = null;
    const pending: { at: number }[] = [];
    k.onBite = () => {
      hp -= BITE;
    };
    k.onTrident = () => {
      hp -= TRIDENT;
    };
    let t = 0;
    const way = run % 2 ? 1 : -1;
    for (; t < 240 && hp > 0 && k.state !== 'dying' && k.state !== 'dead'; t += DT) {
      w.T = t;
      const b = w.boat;
      if (k.state === 'aim' && warnAt < 0) warnAt = t;
      if (k.state !== 'aim' && k.state !== 'charge') {
        warnAt = -1;
        if (!k.aim) dodge = null;
      }
      if (k.aim && ringAt < 0) ringAt = t;
      if (!k.aim) ringAt = -1;
      // Round the reef at about 480.
      const ra = Math.atan2(b.y - ISLE5.y, b.x - ISLE5.x);
      const rd = Math.hypot(b.x - ISLE5.x, b.y - ISLE5.y);
      let dx = -Math.sin(ra) * way + Math.cos(ra) * clamp1((480 - rd) / 150);
      let dy = Math.cos(ra) * way + Math.sin(ra) * clamp1((480 - rd) / 150);
      // He is up out of the water: go at him, to keep him in reach of the harpoon.
      if (k.mark()) {
        const gx = k.x - b.x;
        const gy = k.y - b.y;
        const gl = Math.hypot(gx, gy) || 1;
        dx = gx / gl;
        dy = gy / gl;
      }
      if (react !== null && warnAt >= 0 && t - warnAt >= react && t - warnAt < react + DODGE) {
        // Hard off the line on the water, on the side the boat is already on.
        if (!dodge) {
          const to = k.to ?? { x: b.x, y: b.y };
          const l = Math.hypot(to.x - k.x, to.y - k.y) || 1;
          const fx = (to.x - k.x) / l;
          const fy = (to.y - k.y) / l;
          const s = fx * (b.y - k.y) - fy * (b.x - k.x) >= 0 ? 1 : -1;
          dodge = { x: -fy * s, y: fx * s };
        }
        dx = dodge.x;
        dy = dodge.y;
      }
      if (react !== null && ringAt >= 0 && t - ringAt >= react && k.aim) {
        const ax = b.x - k.aim.x;
        const ay = b.y - k.aim.y;
        const ad = Math.hypot(ax, ay) || 1;
        if (ad < 110) {
          dx = ax / ad;
          dy = ay / ad;
        }
      }
      steerBoat(b, ...stick(dx, dy), SPEED[5], DT);
      // Fire when he is up and in reach of the bow.
      const m = k.mark();
      const bow = { x: b.x + Math.cos(b.h) * 38, y: b.y + Math.sin(b.h) * 38 };
      if (m && t >= ready && Math.hypot(m.x - bow.x, m.y - bow.y) < HARPOON_RANGE) {
        ready = t + HARPOON_RELOAD + 1 / 3;
        pending.push({ at: t + 0.25 });
      }
      for (let i = pending.length - 1; i >= 0; i--) {
        if (t >= (pending[i] as { at: number }).at) {
          pending.splice(i, 1);
          k.harpoon(HARPOON_POWER);
        }
      }
      k.update(DT, w);
    }
    if (k.state === 'dying' || k.state === 'dead') {
      wins++;
      time += t;
    }
    lost += 100 - Math.max(0, hp);
  }
  return { wins, lost: lost / 30, secs: wins ? time / wins : 0 };
}
const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

describe('fighting the Skeleton Shark King', () => {
  it('is won by turning off his charges and out of the rings, in a long fight', () => {
    const f = fights(REACT);
    expect(f.wins).toBeGreaterThanOrEqual(27);
    expect(f.lost).toBeLessThan(25);
    expect(f.secs).toBeGreaterThan(30);
    expect(f.secs).toBeLessThan(100);
  });

  it('costs a slower one more of the boat, and one who never minds his warnings most of it', () => {
    const quick = fights(REACT).lost;
    expect(fights(0.6).lost).toBeGreaterThan(quick);
    expect(fights(null).lost).toBeGreaterThan(50);
  });

  it('warns longer than it takes to turn', () => {
    expect(CHARGE_UP).toBeGreaterThan(REACT + 0.4);
  });
});
