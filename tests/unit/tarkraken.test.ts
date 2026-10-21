import { describe, expect, it } from 'vitest';
import {
  ARM_BUBBLE,
  ARM_OFF,
  ARM_WINDUP,
  ARMS_TO_CHOP,
  ARMS_UP,
  EYE_BLINK,
  EYE_SHUT,
  KRAKEN_DMG,
  KRAKEN_HP,
  KRAKEN_PRIZE,
  LAIR,
  LAIR_LEASH,
  LAIR_R,
  RING_ARMS,
  RISE_T,
  SINK_T,
  SLAM_R,
  TarKraken,
} from '../../src/entities/tarkraken';
import {
  drawKrakenArm,
  drawKrakenArmMark,
  drawKrakenEye,
  drawKrakenPips,
  drawKrakenPrize,
} from '../../src/render/tarkraken';
import { ISLE_BERTH, TAR_ISLE } from '../../src/world/tarisle';
import { onTar, TAR_BERTH } from '../../src/world/tarsea';
import { fakeView } from './helpers/view';

type Boat = { x: number; y: number; h: number; v: number };
const run = (k: TarKraken, b: Boat | null, secs: number) => {
  for (let t = 0; t < secs - 1e-9; t += 1 / 60) k.step(1 / 60, b);
};
const awake = () => {
  const k = new TarKraken();
  k.on = true;
  const b: Boat = { x: LAIR.x, y: LAIR.y, h: 0, v: 0 };
  run(k, b, 1 / 60);
  return { k, b };
};
/** Every arm a harpoon can chop, chopped, until it has come up. */
const chopAll = (k: TarKraken, b: Boat) => {
  for (let t = 0; t < 120 && k.state === 'arms'; t += 1 / 60) {
    // Keep the boat whole and out of their slams: only the chopping counts here.
    for (const a of k.arms) if (TarKraken.choppable(a)) k.chop(a);
    k.step(1 / 60, b);
  }
};

describe('the tar kraken', () => {
  it("is the kid's: 9 hits, 10 off the boat a slam, 900 coins, and ten arms to chop first", () => {
    expect(KRAKEN_HP).toBe(9);
    expect(KRAKEN_DMG).toBe(10);
    expect(KRAKEN_PRIZE).toBe(900);
    expect(ARMS_TO_CHOP).toBe(10);
  });

  it('lies under the middle of the tar ocean, far from the dock and the tar island', () => {
    expect(onTar(LAIR.x, LAIR.y)).toBe(true);
    expect(Math.hypot(LAIR.x - TAR_BERTH.x, LAIR.y - TAR_BERTH.y)).toBeGreaterThan(LAIR_LEASH * 2);
    expect(Math.hypot(LAIR.x - TAR_ISLE.x, LAIR.y - TAR_ISLE.y)).toBeGreaterThan(
      LAIR_LEASH + TAR_ISLE.r,
    );
    expect(Math.hypot(LAIR.x - ISLE_BERTH.x, LAIR.y - ISLE_BERTH.y)).toBeGreaterThan(LAIR_LEASH);
  });

  it('sleeps until the eel is beaten and a boat sails in over it', () => {
    const k = new TarKraken();
    let woke = 0;
    k.onWake = () => woke++;
    run(k, { x: LAIR.x, y: LAIR.y, h: 0, v: 0 }, 2);
    expect(k.state).toBe('sleep');
    k.on = true;
    run(k, { x: LAIR.x + LAIR_R + 50, y: LAIR.y, h: 0, v: 0 }, 2);
    expect(k.state).toBe('sleep');
    run(k, { x: LAIR.x + LAIR_R - 50, y: LAIR.y, h: 0, v: 0 }, 1 / 60);
    expect(k.state).toBe('arms');
    expect(woke).toBe(1);
  });

  it('sends its arms up round the boat, two at a time, bubbling first', () => {
    const { k, b } = awake();
    run(k, b, 0.7);
    expect(k.arms.length).toBeGreaterThan(0);
    const a = k.arms[0];
    if (!a) throw new Error('no arm');
    expect(a.state).toBe('bubble');
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(ARM_OFF, 0);
    // Not yet choppable while it bubbles.
    expect(k.chop(a)).toBe(false);
    run(k, b, 10);
    expect(
      k.arms.filter((x) => x.state !== 'sink' && x.state !== 'gone').length,
    ).toBeLessThanOrEqual(ARMS_UP);
  });

  it('slams a red ring where the boat is: ten off a boat still in it, nothing off one that sails out', () => {
    const { k, b } = awake();
    const hits: boolean[] = [];
    k.onSlam = (_a, hit) => hits.push(hit);
    run(k, b, 0.6 + ARM_BUBBLE + 0.2);
    const a = k.arms.find((x) => x.state === 'windup');
    if (!a) throw new Error('no arm wound up');
    expect(Math.hypot(a.at.x - b.x, a.at.y - b.y)).toBeLessThan(1);
    run(k, b, ARM_WINDUP);
    expect(hits[0]).toBe(true);
    // Out of the ring.
    const k2 = awake().k;
    const b2: Boat = { x: LAIR.x, y: LAIR.y, h: 0, v: 0 };
    const hits2: boolean[] = [];
    k2.onSlam = (_a, hit) => hits2.push(hit);
    for (let t = 0; t < 4 && !k2.arms.some((x) => x.state === 'windup'); t += 1 / 60)
      k2.step(1 / 60, b2);
    b2.x += SLAM_R + 10;
    run(k2, b2, ARM_WINDUP);
    expect(hits2[0]).toBe(false);
  });

  it('comes up itself after ten arms are chopped: a giant eye ahead of the boat, and eight arms all round it', () => {
    const { k, b } = awake();
    let rose = 0;
    const left: number[] = [];
    k.onRise = () => rose++;
    k.onChop = (_a, n) => left.push(n);
    chopAll(k, b);
    expect(left.at(-1)).toBe(0);
    expect(k.state).toBe('rise');
    expect(rose).toBe(1);
    run(k, b, RISE_T + 0.05);
    expect(k.state).toBe('eye');
    expect(k.arms.filter((a) => a.ring)).toHaveLength(RING_ARMS);
    // Not to be chopped: only the eye counts now.
    expect(k.nearestArm(b.x, b.y, 1e4)).toBe(null);
  });

  it('takes a harpoon in the eye only while it is open, and is beaten by nine, leaving an arm floating', () => {
    const { k, b } = awake();
    chopAll(k, b);
    run(k, b, RISE_T + 0.05);
    expect(k.eyeOpen).toBe(false);
    expect(k.harpoonEye(1)).toBe(false);
    let beaten = 0;
    k.onBeaten = () => beaten++;
    for (let i = 0; i < KRAKEN_HP; i++) {
      for (let t = 0; t < 10 && !k.eyeOpen; t += 1 / 60) k.step(1 / 60, b);
      expect(k.harpoonEye(1)).toBe(true);
    }
    expect(beaten).toBe(1);
    expect(k.state).toBe('down');
    expect(k.prize).not.toBe(null);
    run(k, b, SINK_T + 0.1);
    expect(k.state).toBe('gone');
  });

  it('shuts its eye between openings', () => {
    const { k, b } = awake();
    chopAll(k, b);
    run(k, b, RISE_T + 0.05);
    run(k, b, EYE_SHUT + EYE_BLINK + 0.05);
    expect(k.eyeOpen).toBe(true);
  });

  it('sinks back down whole when the boat sails off out of its reach, to start over', () => {
    const { k, b } = awake();
    chopAll(k, b);
    let gave = 0;
    k.onGiveUp = () => gave++;
    b.x = LAIR.x + LAIR_LEASH + 10;
    run(k, b, 1 / 60);
    expect(gave).toBe(1);
    run(k, b, SINK_T + 0.1);
    expect(k.state).toBe('sleep');
    expect(k.chopped).toBe(0);
    expect(k.hp).toBe(KRAKEN_HP);
  });

  it('once beaten for good, never comes up again', () => {
    const k = new TarKraken();
    k.on = true;
    k.beatenForGood();
    run(k, { x: LAIR.x, y: LAIR.y, h: 0, v: 0 }, 3);
    expect(k.state).toBe('gone');
    expect(k.arms).toHaveLength(0);
  });

  it('is drawn: its arms in every state, their marks, its eye, its pips, and the arm it leaves', () => {
    const { k, b } = awake();
    run(k, b, 0.7);
    for (const st of ['bubble', 'up', 'windup', 'slam', 'recover', 'sink'] as const) {
      const a = k.arms[0];
      if (!a) throw new Error('no arm');
      a.state = st;
      a.t = 0.2;
      a.life = 1;
      const f = fakeView();
      drawKrakenArm(f.v, a);
      drawKrakenArmMark(f.v, a);
      expect(f.calls.stroke ?? 0).toBeGreaterThan(0);
    }
    chopAll(k, b);
    run(k, b, RISE_T + EYE_SHUT + EYE_BLINK + 0.1);
    const g = fakeView();
    drawKrakenEye(g.v, k, b);
    drawKrakenPips(g.v, k, true);
    expect(g.calls.fill ?? 0).toBeGreaterThan(5);
    k.prize = { x: k.eye.x, y: k.eye.y };
    const h = fakeView();
    drawKrakenPrize(h.v, k);
    expect(h.calls.stroke ?? 0).toBeGreaterThan(0);
  });
});
