import { describe, expect, it } from 'vitest';
import { angDiff } from '../../src/core/math';
import { HARPOON_RANGE, HARPOON_RELOAD } from '../../src/data/harpoon';
import { ACCEL, DECEL, MIN_THROTTLE, TURN_BASE, TURN_SLOW_BONUS } from '../../src/entities/boat';
import { BODY_HALF } from '../../src/entities/leviathan';
import {
  BITE_R,
  BITE_WINDUP,
  EEL_AWAY,
  EEL_BITE,
  EEL_FIND,
  EEL_HP,
  EEL_LEN,
  EEL_RISE_T,
  EEL_SINK,
  TarEel,
  WRAP_R0,
  WRAP_T,
} from '../../src/entities/tareel';
import { drawEelMark, eelSolids } from '../../src/render/tareel';
import { CHEM_SPEED } from '../../src/world/tarsea';
import { fakeView } from './helpers/view';

type Boat = { x: number; y: number; h: number; v: number };
const DT = 1 / 60;

/** The chemistry boat steered toward a world direction, as steerBoat steers it toward a screen one. */
function sail(b: Boat, dx: number, dy: number, dt: number, k = 1): void {
  let targetV = 0;
  if (dx || dy) {
    const diff = angDiff(Math.atan2(dy, dx), b.h);
    const turn = (TURN_BASE + TURN_SLOW_BONUS * (1 - b.v / CHEM_SPEED)) * dt;
    b.h += Math.max(-turn, Math.min(turn, diff));
    targetV = CHEM_SPEED * k * Math.max(MIN_THROTTLE, Math.cos(diff));
  }
  b.v += (targetV - b.v) * Math.min(1, dt * (targetV > b.v ? ACCEL : DECEL));
  b.x += Math.cos(b.h) * b.v * dt;
  b.y += Math.sin(b.h) * b.v * dt;
}

const hunting = () => {
  const E = new TarEel();
  E.on = true;
  return E;
};
/** On until it is up and round the boat. */
const upBy = (E: TarEel, b: Boat) => {
  for (let t = 0; t < EEL_FIND + EEL_RISE_T + 0.2 && E.state !== 'circle'; t += DT)
    E.step(DT, b, false);
};
const until = (E: TarEel, b: Boat, state: string, s: number) => {
  for (let t = 0; t < s && E.state !== state; t += DT) E.step(DT, b, false);
};

describe('the tar eel', () => {
  it("is the kid's: twice the leviathan, six hits, a bite of 20, every blow wound up", () => {
    expect(EEL_LEN).toBe(BODY_HALF * 4);
    expect(EEL_HP).toBe(6);
    expect(EEL_BITE).toBe(20);
    expect(BITE_WINDUP).toBeGreaterThanOrEqual(0.9);
    expect(WRAP_T).toBeGreaterThanOrEqual(2);
  });

  it('leaves the boat alone until mission 2 is taken, and near a dock', () => {
    const b = { x: 0, y: 0, h: 0, v: 0 };
    const off = new TarEel();
    for (let t = 0; t < 30; t += DT) off.step(DT, b, false);
    expect(off.state).toBe('away');
    const E = hunting();
    for (let t = 0; t < 30; t += DT) E.step(DT, b, true);
    expect(E.state).toBe('away');
    for (let t = 0; t < 30; t += DT) E.step(DT, null, false);
    expect(E.state).toBe('away');
  });

  it('finds the boat out on the open tar, comes up beside it, and swims round it, the harpoon reaching its head', () => {
    const b = { x: 0, y: 0, h: 0, v: 0 };
    const E = hunting();
    let rose = 0;
    E.onRise = () => rose++;
    for (let t = 0; t < EEL_FIND - 0.5; t += DT) E.step(DT, b, false);
    expect(E.state).toBe('away');
    expect(E.mark()).toBeNull();
    upBy(E, b);
    expect(rose).toBe(1);
    expect(E.state).toBe('circle');
    const m = E.mark();
    expect(m).not.toBeNull();
    expect(Math.hypot((m?.x ?? 0) - b.x, (m?.y ?? 0) - b.y)).toBeLessThan(HARPOON_RANGE);
    expect(E.trail.length).toBeGreaterThan(5);
  });

  it('bites in its ring: 20 for a boat still in it, nothing for a boat that sails out', () => {
    const b = { x: 0, y: 0, h: 0, v: 0 };
    const E = hunting();
    const bites: boolean[] = [];
    E.onBite = (hit) => bites.push(hit);
    upBy(E, b);
    until(E, b, 'aim', 5);
    expect(E.state).toBe('aim');
    expect(Math.hypot(E.ring.x - b.x, E.ring.y - b.y)).toBeLessThan(1);
    until(E, b, 'circle', BITE_WINDUP + 1);
    expect(bites).toEqual([true]);
    // A fresh one, and this time away out of the ring once it shows.
    const F = hunting();
    const c = { x: 0, y: 0, h: 0, v: 0 };
    F.onBite = (hit) => bites.push(hit);
    upBy(F, c);
    until(F, c, 'aim', 5);
    for (let t = 0; t < BITE_WINDUP + 1 && F.state !== 'circle'; t += DT) {
      if (F.state === 'aim' && F.t > 0.33) sail(c, c.x - F.ring.x || 1, c.y - F.ring.y, DT);
      else if (F.state === 'strike') sail(c, c.x - F.ring.x || 1, c.y - F.ring.y, DT);
      F.step(DT, c, false);
    }
    expect(bites).toEqual([true, false]);
    expect(Math.hypot(c.x - F.ring.x, c.y - F.ring.y)).toBeGreaterThan(BITE_R);
  });

  it('wraps a boat that stays and pulls it under, then stays away; a boat out through the ring gets away', () => {
    const b = { x: 0, y: 0, h: 0, v: 0 };
    const E = hunting();
    let pulled = 0;
    let freed = 0;
    E.onPull = () => pulled++;
    E.onFree = () => freed++;
    upBy(E, b);
    until(E, b, 'aim', 5);
    until(E, b, 'wrap', 8);
    expect(E.state).toBe('wrap');
    expect(E.wrapR).toBeCloseTo(WRAP_R0, 0);
    until(E, b, 'dive', WRAP_T + 0.2);
    expect(pulled).toBe(1);
    for (let t = 0; t < EEL_AWAY - 1; t += DT) E.step(DT, b, false);
    expect(E.state).toBe('away');
    // Another, and out through its coils this time.
    const F = hunting();
    const c = { x: 0, y: 0, h: 0, v: 0 };
    F.onPull = () => pulled++;
    F.onFree = () => freed++;
    upBy(F, c);
    until(F, c, 'aim', 5);
    until(F, c, 'wrap', 8);
    for (let t = 0; t < WRAP_T + 0.5 && F.state === 'wrap'; t += DT) {
      if (F.t > 0.33) sail(c, c.x - F.ring.x || 1, c.y - F.ring.y, DT);
      F.step(DT, c, false);
    }
    expect([pulled, freed]).toEqual([1, 1]);
    expect(F.state).toBe('circle');
  });

  it('takes six harpoons only while its head is up; each sends it under, and it comes back with its next blow', () => {
    const b = { x: 0, y: 0, h: 0, v: 0 };
    const E = hunting();
    let beaten = 0;
    let wraps = 0;
    E.onBeaten = () => beaten++;
    E.onWrap = () => wraps++;
    expect(E.harpoon(1)).toBe(false);
    upBy(E, b);
    /** On until its head is up again, the boat hopping clear of any blow. */
    const untilUp = () => {
      for (let t = 0; t < 20 && !E.up; t += DT) {
        if (E.state === 'wrap') b.x = E.ring.x + WRAP_R0 + 40;
        E.step(DT, b, false);
      }
    };
    for (let i = 0; i < EEL_HP - 1; i++) {
      untilUp();
      expect(E.harpoon(1)).toBe(true);
      expect(E.state).toBe('dive');
      expect(E.harpoon(1)).toBe(false);
    }
    // Every other time it came back up, it came up coiled round the boat.
    expect(wraps).toBeGreaterThanOrEqual(2);
    untilUp();
    E.harpoon(1);
    expect(E.state).toBe('sink');
    expect(beaten).toBe(1);
    for (let t = 0; t < EEL_SINK + 0.1; t += DT) E.step(DT, b, false);
    expect(E.state).toBe('gone');
    E.reset();
    expect(E.state).toBe('gone');
  });

  it('lets go and goes off under when the boat gets near a dock', () => {
    const b = { x: 0, y: 0, h: 0, v: 0 };
    const E = hunting();
    let freed = 0;
    E.onFree = () => freed++;
    upBy(E, b);
    until(E, b, 'aim', 5);
    until(E, b, 'wrap', 8);
    E.step(DT, b, true);
    expect(freed).toBe(1);
    expect(E.state).toBe('dive');
  });

  it('is beaten by a sailor who keeps moving, dodges a third of a second late and fires the harpoon when it is up', () => {
    let pulls = 0;
    let bit = 0;
    let won = 0;
    for (let trial = 0; trial < 6; trial++) {
      const b: Boat = { x: 0, y: 0, h: trial * 1.1, v: 0 };
      const E = hunting();
      E.onPull = () => pulls++;
      E.onBite = (hit) => {
        if (hit) bit++;
      };
      let reload = 0;
      for (let t = 0; t < 240 && E.state !== 'sink' && E.state !== 'gone'; t += DT) {
        E.step(DT, b, false);
        reload -= DT;
        const warned =
          (E.state === 'aim' || E.state === 'strike' || E.state === 'wrap') && E.t > 0.33;
        if (warned) sail(b, b.x - E.ring.x || 1, b.y - E.ring.y, DT);
        else sail(b, Math.cos(t * 0.3 + trial), Math.sin(t * 0.3 + trial), DT, 0.4);
        const m = E.mark();
        if (m && reload <= 0 && Math.hypot(m.x - b.x, m.y - b.y) < HARPOON_RANGE) {
          E.harpoon(1);
          reload = HARPOON_RELOAD;
        }
      }
      if (E.state === 'sink' || E.state === 'gone') won++;
    }
    expect(won).toBe(6);
    expect(pulls).toBe(0);
    expect(bit).toBeLessThanOrEqual(1);
  });

  it('is drawn: its shadow coming up, its back in humps and its head, the rings on the tar', () => {
    const b = { x: 0, y: 0, h: 0, v: 0 };
    const E = hunting();
    const f = fakeView();
    expect(eelSolids(f.v, E)).toHaveLength(0);
    for (let t = 0; t < EEL_FIND + 0.5; t += DT) E.step(DT, b, false);
    expect(E.state).toBe('rise');
    for (const s of eelSolids(f.v, E)) s.f();
    expect(f.calls.fill ?? 0).toBeGreaterThan(3);
    upBy(E, b);
    for (let t = 0; t < 2; t += DT) E.step(DT, b, false);
    const up = eelSolids(f.v, E);
    expect(up.length).toBeGreaterThan(3);
    const before = f.calls.fill ?? 0;
    for (const s of up) s.f();
    expect(f.calls.fill ?? 0).toBeGreaterThan(before + 10);
    until(E, b, 'aim', 5);
    const mark = f.calls.fill ?? 0;
    drawEelMark(f.v, E);
    expect(f.calls.fill ?? 0).toBe(mark + 1);
  });
});
