import { describe, expect, it } from 'vitest';
import {
  ARM_BUBBLE,
  ARM_OFF,
  ARM_WINDUP,
  ARMS_TO_CHOP,
  ARMS_UP,
  ASHORE,
  EYE_BLINK,
  EYE_SHUT,
  ISLE_GROUND,
  ISLE_LAIR,
  KRAKEN_DMG,
  KRAKEN_HEARTS,
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
import {
  ISLE_BERTH,
  JETTY,
  onIsleRock,
  onTarIsle,
  shoreR,
  TAR_ISLE,
} from '../../src/world/tarisle';
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

  it('on the Battle Barge, given a home of its own: awake at once wherever the boat is, and never giving up on it', () => {
    const k = new TarKraken(7320, {
      x: -30000,
      y: -14000,
      wake: Number.POSITIVE_INFINITY,
      leash: Number.POSITIVE_INFINITY,
    });
    k.on = true;
    const b: Boat = { x: -30000 + 900, y: -14000 + 900, h: 0, v: 0 };
    run(k, b, 1 / 60);
    expect(k.state).toBe('arms');
    b.x += 5000;
    run(k, b, 3);
    expect(k.up).toBe(true);
    // And the tar ocean's own still lies under its middle.
    expect(new TarKraken().home).toMatchObject({
      x: LAIR.x,
      y: LAIR.y,
      wake: LAIR_R,
      leash: LAIR_LEASH,
    });
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

describe('round two: the tar kraken on foot, on the tar island', () => {
  // The figure on the beach, at this angle round the island, just inside the shore.
  const onBeach = (a: number): Boat => {
    const r = shoreR(a) - 20;
    return { x: TAR_ISLE.x + Math.cos(a) * r, y: TAR_ISLE.y + Math.sin(a) * r, h: a, v: 0 };
  };
  const ashore = () => {
    const k = new TarKraken(7333, ISLE_LAIR, ISLE_GROUND);
    k.on = true;
    return k;
  };

  it('stands on the island: you are on its rock, and it is round it', () => {
    for (const a of [0, 1, 2, 3, 4, 5]) {
      const f = onBeach(a);
      expect(onTarIsle(f.x, f.y)).toBe(true);
      expect(Math.hypot(f.x - ISLE_LAIR.x, f.y - ISLE_LAIR.y)).toBeLessThan(ISLE_LAIR.wake);
    }
    expect(KRAKEN_HEARTS).toBe(3);
  });

  it('brings its arms up on the tar off the shore nearest you, in reach of you and clear of the jetty', () => {
    for (const a of [0, 0.8, 1.57, 2.4, 3.3, 4.2, 5.2]) {
      const f = onBeach(a);
      for (const r of [0, 0.25, 0.5, 0.75, 1]) {
        const p = ISLE_GROUND.arm(f, r);
        expect(onIsleRock(p.x, p.y)).toBe(false);
        expect(onTar(p.x, p.y)).toBe(true);
        // Nowhere over the jetty, or the boat tied up beside it.
        expect(Math.abs(p.x - JETTY.x) > JETTY.half + 30 || p.y < JETTY.y0 - 20).toBe(true);
        expect(Math.hypot(p.x - ISLE_BERTH.x, p.y - ISLE_BERTH.y)).toBeGreaterThan(70);
      }
      // Away from the jetty, the middle one comes up within a throw, and slams the beach where you stand.
      if (Math.abs(a - Math.PI / 2) > 0.6) {
        const p = ISLE_GROUND.arm(f, 0.5);
        expect(Math.hypot(p.x - f.x, p.y - f.y)).toBeLessThan(ASHORE.reach);
        const eye = ISLE_GROUND.eye(f);
        expect(onIsleRock(eye.x, eye.y)).toBe(false);
        // The first spear's throw (95), from the beach.
        expect(Math.hypot(eye.x - f.x, eye.y - f.y)).toBeLessThan(95 + 30);
      }
    }
  });

  it('slams the beach where you stood, a ring a figure can step out of', () => {
    const k = ashore();
    const f = onBeach(0);
    let hits = 0;
    let slams = 0;
    k.onSlam = (_a, hit) => {
      slams++;
      if (hit) hits++;
    };
    run(k, f, 8);
    expect(k.state).toBe('arms');
    expect(slams).toBeGreaterThan(0);
    expect(hits).toBe(slams);
    // Stepped out of the ring as it rears back: missed.
    const k2 = ashore();
    let missed = 0;
    k2.onWindup = () => {
      f.x -= Math.cos(0) * (ASHORE.slam + 10);
    };
    k2.onSlam = (_a, hit) => {
      if (!hit) missed++;
    };
    run(k2, onBeach(0), 0.01);
    run(k2, f, 8);
    expect(missed).toBeGreaterThan(0);
  });

  it('comes up after six chopped, its eye off the shore and five arms along it; nine in the eye beat it', () => {
    const k = ashore();
    const f = onBeach(5.5);
    let beaten = 0;
    k.onBeaten = () => beaten++;
    for (let t = 0; t < 60 && k.state !== 'rise'; t += 0.1) {
      run(k, f, 0.1);
      for (const a of k.arms) if (TarKraken.choppable(a)) k.chop(a);
    }
    expect(k.chopped).toBe(ASHORE.chop);
    expect(k.state).toBe('rise');
    expect(onIsleRock(k.eye.x, k.eye.y)).toBe(false);
    run(k, f, RISE_T + 0.1);
    expect(k.state).toBe('eye');
    expect(k.arms.filter((a) => a.ring)).toHaveLength(ASHORE.ringArms);
    for (const a of k.arms.filter((q) => q.ring)) expect(onIsleRock(a.x, a.y)).toBe(false);
    for (let i = 0; i < KRAKEN_HP; i++) {
      k.eye.state = 'open';
      expect(k.harpoonEye(1)).toBe(true);
    }
    expect(beaten).toBe(1);
    run(k, f, SINK_T + 0.1);
    expect(k.state).toBe('gone');
  });

  it('sinks back down whole once you are back aboard', () => {
    const k = ashore();
    const f = onBeach(0.3);
    run(k, f, 4);
    expect(k.up).toBe(true);
    run(k, null, SINK_T + 0.1);
    expect(k.state).toBe('sleep');
    expect(k.chopped).toBe(0);
  });

  it('draws its slam ring a figure wide', () => {
    const f = fakeView();
    const a = {
      x: 0,
      y: 0,
      state: 'windup' as const,
      t: 0.5,
      life: 1,
      at: { x: 0, y: 0 },
      flash: 0,
      seed: 1,
      ring: false,
    };
    drawKrakenArmMark(f.v, a, ASHORE.slam);
    expect(f.calls.isoEllipse).toBe(1);
  });
});
