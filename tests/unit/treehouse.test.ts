import { describe, expect, it } from 'vitest';
import {
  BARREL_PLANKS,
  BUCKET_LIFTS,
  climbed,
  JUMP_COINS,
  LEVER_COINS,
  LOWER_T,
  loadedY,
  parseClimbs,
  plankY,
  ROPE_COINS,
  ROPE_SWINGS,
  SMASH_COINS,
  STAGES_UP,
  TOP_COINS,
  TRIES,
  timed,
} from '../../src/data/treehouse';
import {
  BARREL_R,
  type Barrel,
  Climb,
  type ClimbEvent,
  DOWN_T,
  downhill,
  GRAVITY,
  HANDS,
  HOWTO_T,
  JUMP_V,
  NUT_R,
  PIN_T,
  PIN_Y,
  READY_T,
  ROPE_TOP,
  SAFE_T,
  STUN_T,
  WALK,
  WOBBLE_T,
} from '../../src/entities/treehouse';

const DT = 1 / 60;
const S = BARREL_PLANKS;
const G = S.gorilla as NonNullable<typeof S.gorilla>;
const plank = (i: number) => S.planks[i] as (typeof S.planks)[number];

/** A climb past the beat, nothing rolling yet. */
function ready(seed = 1): Climb {
  const c = new Climb(S, seed);
  c.step(READY_T + DT, 0, 0);
  return c;
}
/** A climb with the gorilla asleep: no barrels but those put there. */
function quiet(seed = 1): Climb {
  const c = ready(seed);
  c.nextRoll = 1e9;
  return c;
}
/** Runs so long, under a policy for the arrows (and the jump, when it says so), or until told to stop. */
function run(
  c: Climb,
  secs: number,
  policy: (c: Climb) => [number, number, boolean?],
  until = (_: Climb) => false,
): Climb {
  for (let i = 0; i < secs * 60 && !until(c); i++) {
    const [sx, sy, jump] = policy(c);
    if (jump) c.press();
    c.step(DT, sx, sy);
  }
  return c;
}
/** A barrel put down on a plank, rolling its way. */
function barrel(c: Climb, x: number, p: number, v = 56): Barrel {
  const b: Barrel = {
    x,
    y: plankY(plank(p), x) + BARREL_R,
    mode: 'roll',
    plank: p,
    ladder: null,
    v,
    dir: downhill(plank(p)),
    vx: 0,
    vy: 0,
    turn: 0,
    jumped: false,
    passed: [],
  };
  c.barrels.push(b);
  return b;
}
const events = (c: Climb) => {
  const out: ClimbEvent[] = [];
  c.onEvent = (w) => out.push(w);
  return out;
};

/** The long way up: the ladder at the far end of each plank, not the short cuts. */
const ROUTE = [196, 40, 198, 42, 196, 130];
/** A climber who goes up the route, and jumps a barrel rolling at them along their plank, as a careful kid would. */
const climber = (c: Climb): [number, number, boolean] => {
  if (c.ladder) return [0, -1, false];
  const want = ROUTE[c.plank] ?? c.x;
  const dx = want - c.x;
  const jump = c.barrels.some(
    (b) =>
      b.mode === 'roll' &&
      b.plank === c.plank &&
      Math.sign(c.x - b.x) === b.dir &&
      Math.abs(c.x - b.x) < 30 &&
      Math.abs(c.x - b.x) > 14,
  );
  if (Math.abs(dx) < 2) return [0, -1, jump];
  return [Math.sign(dx), 0, jump];
};

describe('the Treehouse Climb', () => {
  it('lays the Barrel Planks out so a barrel zigzags down, and there is always a ladder on up', () => {
    const top = S.planks.length - 1;
    for (const L of S.ladders) {
      for (const p of [plank(L.lo), plank(L.lo + 1)]) {
        expect(L.x).toBeGreaterThan(p.x0 + 4);
        expect(L.x).toBeLessThan(p.x1 - 4);
      }
    }
    for (let i = 0; i < top; i++) expect(S.ladders.some((L) => L.lo === i)).toBe(true);
    // Each plank but the bottom one rolls the other way to the one under it, and its low end is over that one.
    for (let i = 1; i < top; i++) {
      const p = plank(i);
      const q = plank(i - 1);
      expect(downhill(p)).toBe(-downhill(q));
      const end = downhill(p) > 0 ? p.x1 + 4 : p.x0 - 4;
      expect(end).toBeGreaterThan(q.x0);
      expect(end).toBeLessThan(q.x1);
    }
    // The gorilla's plank rolls them away from it, and the bottom one out of the tree.
    expect(downhill(plank(G.plank))).toBe(G.x < S.w / 2 ? 1 : -1);
    expect(plank(0).x0).toBe(0);
    for (const p of S.pins) expect(p.x).toBeGreaterThan(plank(p.plank).x0);
  });

  it('shows how it goes first, until the time is up or the jump button is tapped, then a beat, then go', () => {
    const c = new Climb(S);
    c.showHowTo();
    const ev = events(c);
    run(c, HOWTO_T - 0.5, () => [1, 0]);
    expect(c.howTo).toBe(true);
    expect(c.x).toBe(S.start.x);
    c.press();
    expect(c.howTo).toBe(false);
    run(c, READY_T - 0.1, () => [0, 0]);
    expect(c.phase).toBe('ready');
    run(c, 0.2, () => [0, 0]);
    expect(c.phase).toBe('climb');
    expect(ev).toEqual(['go']);
    expect(c.t).toBeLessThan(0.15);
  });

  it('walks along a plank on its slope, and off its end down onto the one below, unhurt', () => {
    const c = quiet();
    run(c, 1, () => [1, 0]);
    expect(c.x).toBeCloseTo(S.start.x + WALK, -1);
    expect(c.y).toBeCloseTo(plankY(plank(0), c.x), 5);
    // Up to plank 1, then right past its low end.
    c.x = 200;
    c.plank = 1;
    c.y = plankY(plank(1), 200);
    run(c, 1.5, () => [1, 0]);
    expect(c.plank).toBe(0);
    expect(c.tries).toBe(TRIES);
    expect(c.x).toBeLessThanOrEqual(S.w);
  });

  it('goes up a ladder only at one, and down one from its top', () => {
    const c = quiet();
    run(c, 1, () => [0, -1]);
    expect(c.plank).toBe(0);
    expect(c.ladder).toBe(null);
    run(c, 6, climber, (c) => c.plank === 1);
    expect(c.plank).toBe(1);
    expect(c.x).toBe(196);
    run(
      c,
      3,
      () => [0, 1],
      (c) => c.plank === 0,
    );
    expect(c.plank).toBe(0);
    // Six units off is still near enough; twenty is not.
    c.x = 196 - 6;
    run(c, 0.1, () => [0, -1]);
    expect(c.ladder?.x).toBe(196);
    run(
      c,
      3,
      () => [0, 1],
      (c) => !c.ladder,
    );
    c.x = 196 - 20;
    run(c, 0.5, () => [0, -1]);
    expect(c.ladder).toBe(null);
  });

  it('jumps over two barrels high, two thirds of a second, and lands back on the plank', () => {
    const c = quiet();
    const ev = events(c);
    c.press();
    let high = 0;
    let air = 0;
    run(
      c,
      2,
      () => [0, 0],
      (c) => {
        high = Math.max(high, c.y - plankY(plank(0), c.x));
        if (c.air) air += DT;
        return air > 0 && !c.air;
      },
    );
    expect(Math.abs(high - (JUMP_V * JUMP_V) / (2 * GRAVITY))).toBeLessThan(2);
    expect(high).toBeGreaterThan(BARREL_R * 4);
    expect(air).toBeCloseTo((2 * JUMP_V) / GRAVITY, 1);
    expect(c.plank).toBe(0);
    expect(ev).toEqual(['hop', 'landed']);
  });

  it('is forgiving: a jump pressed just before landing goes, and so does one just after walking off an end', () => {
    const c = quiet();
    c.press();
    run(
      c,
      2,
      () => [0, 0],
      (c) => c.air && c.vy < 0 && c.y - plankY(plank(0), c.x) < 4,
    );
    c.press();
    run(c, 0.15, () => [0, 0]);
    expect(c.air).toBe(true);
    expect(c.vy).toBeGreaterThan(0);
    // Off plank 1's end, then the jump a moment late.
    const d = quiet();
    d.x = 210;
    d.plank = 1;
    d.y = plankY(plank(1), 210);
    run(
      d,
      1,
      () => [1, 0],
      (d) => d.air,
    );
    run(d, 0.05, () => [1, 0]);
    d.press();
    run(d, DT, () => [1, 0]);
    expect(d.vy).toBeGreaterThan(JUMP_V * 0.9);
  });

  it('rolls each barrel down the planks from the gorilla, never up, and out of the tree at the bottom', () => {
    const c = ready(7);
    c.safeT = 1e9;
    c.x = 230;
    c.y = plankY(plank(0), 230);
    const seen = new Map<Barrel, number[]>();
    let most = 0;
    let rolled = 0;
    c.onEvent = (w) => {
      if (w === 'roll') rolled++;
    };
    run(
      c,
      90,
      () => [0, 0],
      () => {
        for (const b of c.barrels) {
          if (b.mode !== 'roll') continue;
          const ps = seen.get(b) ?? [];
          if (ps[ps.length - 1] !== b.plank) ps.push(b.plank);
          seen.set(b, ps);
        }
        most = Math.max(most, c.barrels.length);
        return false;
      },
    );
    expect(rolled).toBeGreaterThan(20);
    for (const ps of seen.values()) {
      expect(ps[0]).toBe(G.plank);
      for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeLessThan(ps[i - 1] as number);
    }
    const out = [...seen.keys()].filter((b) => !c.barrels.includes(b));
    expect(out.length).toBeGreaterThan(10);
    for (const b of out) expect(seen.get(b)?.at(-1)).toBe(0);
    // Some come down a ladder, missing out a plank's zigzag.
    expect([...seen.values()].some((ps) => ps.length < G.plank + 1)).toBe(true);
    expect(most).toBeLessThanOrEqual(10);
  });

  it('a barrel that reaches you costs a try: dazed a moment, then blinking while barrels go through you', () => {
    const c = quiet();
    const ev = events(c);
    c.x = 100;
    c.y = plankY(plank(0), 100);
    barrel(c, 130, 0);
    run(
      c,
      1,
      () => [0, 0],
      (c) => c.tries < TRIES,
    );
    expect(c.tries).toBe(TRIES - 1);
    expect(c.pose).toBe('stun');
    expect(c.barrels.length).toBe(0);
    expect(ev).toContain('hit');
    run(c, STUN_T * 0.5, () => [1, 0]);
    expect(c.x).toBe(100);
    run(c, STUN_T * 0.6, () => [0, 0]);
    expect(c.pose).toBe('stand');
    barrel(c, c.x + 20, 0);
    run(c, 0.8, () => [0, 0]);
    expect(c.tries).toBe(TRIES - 1);
    expect(c.safeT).toBeGreaterThan(0);
    expect(c.safeT).toBeLessThan(SAFE_T);
  });

  it('with all three tries gone, the stage starts again from the bottom, the coins kept', () => {
    const c = quiet();
    const ev = events(c);
    c.coins = 25;
    c.x = 150;
    c.plank = 2;
    c.y = plankY(plank(2), 150);
    for (let i = 0; i < TRIES; i++) {
      c.safeT = 0;
      c.stunT = 0;
      barrel(c, c.x + 16, c.plank === -1 ? 2 : c.plank);
      run(
        c,
        1,
        () => [0, 0],
        (c) => c.tries < TRIES - i,
      );
    }
    expect(c.phase).toBe('down');
    expect(ev).toContain('over');
    run(c, DOWN_T + 0.1, () => [0, 0]);
    expect(c.phase).toBe('ready');
    expect(c.tries).toBe(TRIES);
    expect(c.plank).toBe(S.start.plank);
    expect(c.x).toBe(S.start.x);
    expect(c.t).toBe(0);
    expect(c.coins).toBe(25);
    expect(c.restarts).toBe(1);
    expect(ev.at(-1)).toBe('again');
    run(c, READY_T + 0.1, () => [0, 0]);
    expect(c.phase).toBe('climb');
  });

  it('pays for a barrel jumped, once', () => {
    const c = quiet();
    const ev = events(c);
    c.x = 100;
    c.y = plankY(plank(0), 100);
    barrel(c, 128, 0);
    run(c, 1.5, (c) => {
      const b = c.barrels[0];
      return [0, 0, !!b && b.x - c.x < 24 && !c.air];
    });
    expect(c.tries).toBe(TRIES);
    expect(c.jumped).toBe(1);
    expect(c.coins).toBe(JUMP_COINS);
    expect(ev.filter((w) => w === 'jumped').length).toBe(1);
  });

  it('a belaying pin, a jump up, smashes barrels for a while, and with it in hand you neither climb nor jump', () => {
    const c = quiet();
    const ev = events(c);
    const pin = S.pins[0] as (typeof S.pins)[number];
    c.plank = pin.plank;
    c.x = pin.x - 30;
    c.y = plankY(plank(pin.plank), c.x);
    // Walked under, it stays; jumped at, it is yours.
    run(c, 1, () => [1, 0]);
    expect(c.x).toBeGreaterThan(pin.x + 20);
    expect(c.pins[0]?.taken).toBe(false);
    expect(PIN_Y).toBeGreaterThan(20);
    run(
      c,
      2,
      (c) => [Math.sign(pin.x - c.x), 0, Math.abs(pin.x - c.x) < 12],
      (c) => c.pinT > 0,
    );
    expect(ev).toContain('pin');
    expect(c.pins[0]?.taken).toBe(true);
    run(
      c,
      1,
      () => [0, 0],
      (c) => !c.air,
    );
    c.press();
    run(c, 0.3, () => [0, 0]);
    expect(c.air).toBe(false);
    barrel(c, c.x - 40, c.plank);
    run(c, 1.5, () => [0, 0]);
    expect(c.smashed).toBe(1);
    expect(c.coins).toBe(SMASH_COINS);
    expect(c.tries).toBe(TRIES);
    // Over to the ladder: up does nothing until it is gone.
    const L = S.ladders.find((l) => l.lo === pin.plank) as (typeof S.ladders)[number];
    run(
      c,
      3,
      () => [Math.sign(L.x - c.x), 0],
      (c) => Math.abs(L.x - c.x) < 1,
    );
    run(c, 0.5, () => [0, -1]);
    expect(c.ladder).toBe(null);
    run(
      c,
      PIN_T,
      () => [0, 0],
      (c) => c.pinT <= 0,
    );
    expect(ev).toContain('pinGone');
    run(c, 0.2, () => [0, -1]);
    expect(c.ladder).not.toBe(null);
  });

  it('up on the ledge at the top, the stage is climbed: the coins for the top, and in at the door', () => {
    const c = quiet();
    const ev = events(c);
    run(c, 60, climber, (c) => c.phase === 'clear');
    expect(c.phase).toBe('clear');
    expect(ev).toContain('top');
    expect(c.coins).toBe(TOP_COINS);
    expect(c.t).toBeGreaterThan(18);
    expect(c.t).toBeLessThan(30);
    const t = c.t;
    run(c, 2, climber);
    expect(c.t).toBe(t);
    expect(Math.abs(c.x - S.door)).toBeLessThan(1.5);
  });

  it('can be climbed with the barrels rolling, by jumping the ones that come at you', () => {
    let tops = 0;
    let lost = 0;
    let time = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const c = ready(seed);
      run(c, 240, climber, (c) => c.phase === 'clear');
      if (c.phase === 'clear') {
        tops++;
        time += c.t;
      }
      lost += c.hits;
    }
    expect(tops).toBeGreaterThanOrEqual(27);
    expect(time / tops).toBeLessThan(60);
    expect(lost / 30).toBeLessThan(3);
  });

  it('keeps the climbs, the highest stage climbed and each stage best time, reading only what makes sense', () => {
    expect(parseClimbs(undefined)).toBe(undefined);
    expect(parseClimbs({ climbs: 0 })).toBe(undefined);
    let c = climbed(undefined, 1, null);
    expect(c).toEqual({ climbs: 1, top: 0, best: {} });
    c = climbed(c, 1, 41.27);
    expect(c).toEqual({ climbs: 2, top: 1, best: { 1: 41.3 } });
    c = climbed(c, 1, 52);
    expect(c.best[1]).toBe(41.3);
    c = climbed(c, 1, 38.04);
    expect(c.best[1]).toBe(38);
    expect(parseClimbs(JSON.parse(JSON.stringify(c)))).toEqual(c);
    expect(parseClimbs({ climbs: '3', top: 9, best: { 1: -2, 2: 'x', 3: 1e9, 4: 12.34 } })).toEqual(
      {
        climbs: 3,
        top: 4,
        best: { 4: 12.3 },
      },
    );
  });
});

describe('the Rope Swings', () => {
  const R = ROPE_SWINGS;
  const ropes = R.ropes ?? [];
  const rp = (i: number) => R.planks[i] as (typeof R.planks)[number];
  const amp = (i: number) => ropes[i]?.amp ?? 0;
  /** A climb of the Rope Swings past the beat. */
  function swings(seed = 1): Climb {
    const c = new Climb(R, seed);
    c.step(READY_T + DT, 0, 0);
    return c;
  }
  /** Stood on a plank at x. */
  function at(c: Climb, p: number, x: number): void {
    c.x = x;
    c.plank = p;
    c.air = false;
    c.ladder = null;
    c.rope = -1;
    c.y = plankY(rp(p), x);
  }
  // The way up: on each plank where to go, and the rope to be caught there.
  const PLAN: Record<number, { to: number; rope?: number }> = {
    0: { to: 210 },
    1: { to: 144, rope: 0 },
    2: { to: 30 },
    3: { to: 215 },
    4: { to: 154, rope: 1 },
    5: { to: 24 },
    6: { to: 216 },
  };
  /** A careful kid: to each ladder, the rope caught at the near end of its swing and let go at the far end, and a
   * wait for a coconut just ahead. */
  const swinger = (c: Climb): [number, number, boolean] => {
    if (c.rope >= 0) return [0, 1, c.ropeAngle(c.rope) < -amp(c.rope) * 0.9];
    if (c.ladder) return [0, -1, false];
    if (c.air) return [0, 0, false];
    const p = PLAN[c.plank];
    if (!p) return [0, 0, false];
    const dx = p.to - c.x;
    const ahead = Math.sign(dx);
    if (c.nuts.some((n) => n.y > c.y && Math.abs(n.x - (c.x + ahead * 12)) < 16))
      return [0, 0, false];
    if (Math.abs(dx) > 2) return [ahead, 0, false];
    if (p.rope !== undefined) return [0, 0, c.ropeAngle(p.rope) > amp(p.rope) * 0.88];
    return [0, -1, false];
  };
  /** Up to the rope off plank 1 and caught. */
  const catchFirst = (c: Climb) => {
    at(c, 1, 144);
    run(
      c,
      6,
      (c) => [0, 0, c.ropeAngle(0) > amp(0) * 0.88],
      (c) => c.rope >= 0,
    );
  };

  it('has a rope over each gap reaching both sides, and gaps too wide to jump', () => {
    const gaps: [number, number, number][] = [
      [2, 1, 0],
      [5, 4, 1],
    ];
    for (const [left, right, i] of gaps) {
      const r = ropes[i] as (typeof ropes)[number];
      const reach = r.len * Math.sin(r.amp);
      expect(r.x - reach).toBeLessThan(rp(left).x1 - 2);
      expect(r.x + reach).toBeGreaterThan(rp(right).x0 + 2);
      // A running jump covers this much: not enough.
      expect(rp(right).x0 - rp(left).x1).toBeGreaterThan(WALK * ((2 * JUMP_V) / GRAVITY));
    }
    for (const L of R.ladders) {
      for (const p of [rp(L.lo), rp(L.lo + 1)]) {
        expect(L.x).toBeGreaterThan(p.x0 + 4);
        expect(L.x).toBeLessThan(p.x1 - 4);
      }
    }
    expect(STAGES_UP.slice(0, 2)).toEqual([BARREL_PLANKS, ROPE_SWINGS]);
  });

  it('a rope jumped at is caught for coins, slid along with the arrows, and let go of, flying on with its swing', () => {
    const c = swings();
    const ev = events(c);
    catchFirst(c);
    expect(c.rope).toBe(0);
    expect(ev).toContain('swing');
    expect(c.coins).toBe(ROPE_COINS);
    expect(c.pose).toBe('rope');
    // Hands on the rope.
    const [hx, hy] = c.ropeAt(0, c.ropeD);
    expect(Math.hypot(c.x - hx, c.y + HANDS - hy)).toBeLessThan(0.5);
    // Up the rope only so far; down to its end.
    run(c, 3, () => [0, -1]);
    expect(c.ropeD).toBeCloseTo((ropes[0]?.len ?? 0) * ROPE_TOP, 5);
    run(c, 3, () => [0, 1]);
    expect(c.ropeD).toBeCloseTo(ropes[0]?.len ?? 0, 5);
    // Let go at the far end of the swing: over the left platform, and down onto it.
    run(
      c,
      6,
      (c) => [0, 0, c.ropeAngle(0) < -amp(0) * 0.9],
      (c) => c.rope < 0,
    );
    run(
      c,
      2,
      () => [0, 0],
      (c) => !c.air,
    );
    expect(c.plank).toBe(2);
    // The same rope again pays nothing more.
    catchFirst(c);
    expect(c.rope).toBe(0);
    expect(c.coins).toBe(ROPE_COINS);
    expect(ev.filter((w) => w === 'swing').length).toBe(1);
  });

  it('let go of over a gap, you fall to the level below, not out of the climb', () => {
    const c = swings();
    catchFirst(c);
    run(
      c,
      6,
      (c) => [0, 0, Math.abs(c.ropeAngle(0)) < 0.05],
      (c) => c.rope < 0,
    );
    run(
      c,
      3,
      () => [0, 0],
      (c) => !c.air,
    );
    expect(c.plank).toBe(0);
    expect(c.tries).toBe(TRIES);
    expect(c.phase).toBe('climb');
  });

  it('a rope bridge dips where you stand, most in the middle, and hangs back when you are gone', () => {
    const c = swings();
    const b = rp(3);
    const mid = (b.x0 + b.x1) / 2;
    expect(plankY(b, mid)).toBeCloseTo(b.y0 - (b.sag ?? 0), 5);
    expect(loadedY(b, b.x0, mid, 1)).toBeCloseTo(b.y0, 5);
    expect(loadedY(b, mid, mid, 1)).toBeLessThan(plankY(b, mid) - 3);
    const near = b.x0 + 20;
    expect(plankY(b, mid) - loadedY(b, mid, mid, 1)).toBeGreaterThan(
      plankY(b, near) - loadedY(b, near, near, 1),
    );
    at(c, 3, mid);
    run(c, 1, () => [0, 0]);
    expect(c.dip).toBe(1);
    expect(c.y).toBeCloseTo(loadedY(b, mid, mid, 1), 5);
    // Walking along it, the dip goes with you.
    run(c, 0.5, () => [1, 0]);
    expect(c.y).toBeCloseTo(loadedY(b, c.x, c.x, 1), 5);
    at(c, 4, 200);
    run(c, 1, () => [0, 0]);
    expect(c.dip).toBe(0);
    expect(c.surfaceY(3, mid)).toBeCloseTo(plankY(b, mid), 5);
  });

  it('a coconut wobbles a moment, drops, and costs a try if it lands on you; otherwise it splats on the plank', () => {
    const c = swings();
    const ev = events(c);
    const n = R.nuts?.[0] as { x: number; y: number };
    at(c, 3, n.x);
    c.nuts.push({ x: n.x, y: n.y - NUT_R, vy: 0, wobble: WOBBLE_T });
    run(c, WOBBLE_T * 0.9, () => [0, 0]);
    expect(c.tries).toBe(TRIES);
    run(
      c,
      2,
      () => [0, 0],
      (c) => c.tries < TRIES,
    );
    expect(c.tries).toBe(TRIES - 1);
    expect(ev).toContain('hit');
    // Out of the way, the next one splats.
    at(c, 3, n.x + 40);
    c.safeT = 0;
    c.stunT = 0;
    c.nuts.length = 0;
    c.nuts.push({ x: n.x, y: n.y - NUT_R, vy: 0, wobble: WOBBLE_T });
    run(
      c,
      3,
      () => [0, 0],
      (c) => !c.nuts.some((m) => m.x === n.x && m.y < n.y),
    );
    expect(ev).toContain('splat');
    expect(c.tries).toBe(TRIES - 1);
  });

  it('can be climbed by swinging over the gaps and waiting for the coconuts', () => {
    let tops = 0;
    let time = 0;
    let swung = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const c = swings(seed);
      run(c, 240, swinger, (c) => c.phase === 'clear');
      if (c.phase === 'clear') {
        tops++;
        time += c.t;
        swung += c.swung;
        expect(c.coins).toBe(TOP_COINS + ROPE_COINS * c.swung);
      }
    }
    expect(tops).toBeGreaterThanOrEqual(18);
    expect(time / tops).toBeLessThan(120);
    expect(swung / tops).toBeGreaterThanOrEqual(ropes.length);
  });

  it('keeps a stage got to on the way up without counting another climb', () => {
    const c = climbed(undefined, 1, 40);
    const t = timed(c, 2, 63.27);
    expect(t).toEqual({ climbs: 1, top: 2, best: { 1: 40, 2: 63.3 } });
    expect(timed(t, 2, null)).toEqual(t);
  });
});

describe('the Bucket Lifts', () => {
  const B = BUCKET_LIFTS;
  const bp = (i: number) => B.planks[i] as (typeof B.planks)[number];
  const lifts = B.lifts ?? [];
  function lifts1(seed = 1): Climb {
    const c = new Climb(B, seed);
    c.step(READY_T + DT, 0, 0);
    return c;
  }
  function at(c: Climb, p: number, x: number): void {
    c.x = x;
    c.plank = p;
    c.air = false;
    c.ladder = null;
    c.bucket = null;
    c.y = plankY(bp(p), x);
  }
  /** A kid who knows the way: up the left lift to the first lever, over its bridge and up the ladder to the second,
   * down the right lift, up the left one to the top, and over; waiting for a coconut just ahead. */
  const lifter = (c: Climb): [number, number, boolean] => {
    if (c.ladder) return [0, -1, false];
    if (c.air) return [0, 0, false];
    if (c.bucket) {
      if (c.bucket.lift !== 0) return [0, 0, false];
      if (!c.pulled[0] && c.y >= 121) return [1, 0, false];
      if (c.pulled[1] && c.y >= 292) return [1, 0, false];
      return [0, 0, false];
    }
    const go = (to: number): [number, number, boolean] => {
      const d = to - c.x;
      if (Math.abs(d) < 2) return [0, 0, false];
      const ahead = c.nuts.some((n) => n.y > c.y && Math.abs(n.x - (c.x + Math.sign(d) * 12)) < 14);
      return ahead ? [0, 0, false] : [Math.sign(d), 0, false];
    };
    switch (c.plank) {
      case 0:
        return go(36);
      case 1:
        if (!c.pulled[0]) return go(94);
        return (c.lowered[0] ?? 0) < 1 ? [0, 0, false] : go(200);
      case 2:
        return go(200);
      case 3: {
        const g = go(176);
        return g[0] ? g : [0, -1, false];
      }
      case 4: {
        if (!c.pulled[1]) return go(130);
        if (c.x < 184) return go(187);
        const near = [0, 1, 2, 3, 4].some((k) => {
          const r = c.rimY(1, k);
          return r !== null && r < 200 && r > 186;
        });
        return near ? [1, 0, false] : [0, 0, false];
      }
      default:
        return go(170);
    }
  };

  it('has a lift up and a lift down, and two drawbridges up until their levers are pulled', () => {
    expect(lifts.map((L) => L.up)).toEqual([true, false]);
    const bridges = B.planks.map((p, i) => [p, i] as const).filter(([p]) => p.lever !== undefined);
    expect(bridges.map(([p]) => p.lever)).toEqual([0, 1]);
    const c = lifts1();
    for (const [, i] of bridges) expect(c.standable(i)).toBe(false);
    // The door's ledge is only reached over the second bridge.
    expect(bp(B.planks.length - 1).x0).toBe(bp(6).x1);
    // Up, each bridge leaves a gap a running jump does not cover.
    for (const [, i] of bridges)
      expect(bp(i + 1).x0 - bp(i - 1).x1).toBeGreaterThan(WALK * ((2 * JUMP_V) / GRAVITY));
  });

  it('a bucket coming up out of the ground scoops you up; step off onto a ledge; ride on and you are tipped out', () => {
    const c = lifts1();
    const ev = events(c);
    at(c, 0, lifts[0]?.x ?? 0);
    run(
      c,
      6,
      () => [0, 0],
      (c) => !!c.bucket,
    );
    expect(c.bucket?.lift).toBe(0);
    expect(ev).toContain('ride');
    run(
      c,
      10,
      () => [0, 0],
      (c) => c.y >= 125,
    );
    run(
      c,
      1,
      () => [1, 0],
      (c) => c.plank === 1,
    );
    expect(c.plank).toBe(1);
    // Again, all the way up: over the wheel, and out.
    at(c, 0, lifts[0]?.x ?? 0);
    run(
      c,
      6,
      () => [0, 0],
      (c) => !!c.bucket,
    );
    run(
      c,
      30,
      () => [0, 0],
      () => ev.includes('tipped'),
    );
    expect(ev).toContain('tipped');
    expect(c.bucket).toBe(null);
  });

  it('a lever walked into is pulled for coins, and its bridge comes down to walk on', () => {
    const c = lifts1();
    const ev = events(c);
    const v = B.levers?.[0] as { x: number; plank: number };
    at(c, 1, v.x - 20);
    run(
      c,
      1,
      () => [1, 0],
      (c) => c.pulled[0] === true,
    );
    expect(ev).toContain('lever');
    expect(c.coins).toBe(LEVER_COINS);
    expect(c.standable(2)).toBe(false);
    run(c, LOWER_T + 0.1, () => [0, 0]);
    expect(c.standable(2)).toBe(true);
    run(
      c,
      2,
      () => [1, 0],
      (c) => c.plank === 3,
    );
    expect(c.plank).toBe(3);
    // Pulled once only.
    expect(ev.filter((w) => w === 'lever').length).toBe(1);
  });

  it('a raised drawbridge is no floor: walk off its hinge and you drop', () => {
    const c = lifts1();
    at(c, 1, 100);
    c.pulled[0] = false;
    run(
      c,
      2,
      () => [1, 0],
      (c) => c.plank === 0,
    );
    expect(c.plank).toBe(0);
  });

  it('can be climbed by the way up the levers make, the lifts ridden both ways', () => {
    let tops = 0;
    let time = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const c = lifts1(seed);
      run(c, 240, lifter, (c) => c.phase === 'clear');
      if (c.phase === 'clear') {
        tops++;
        time += c.t;
        expect(c.pulled).toEqual([true, true]);
      }
    }
    expect(tops).toBeGreaterThanOrEqual(19);
    expect(time / tops).toBeLessThan(90);
  });

  it('out of tries, the levers are back as they were', () => {
    const c = lifts1();
    c.pulled[0] = true;
    c.lowered[0] = 1;
    c.tries = 1;
    at(c, 1, 76);
    c.nuts.push({ x: 76, y: 160, vy: 0, wobble: 0 });
    run(
      c,
      DOWN_T + 1,
      () => [0, 0],
      (c) => c.phase === 'ready',
    );
    expect(c.pulled).toEqual([false, false]);
    expect(c.lowered).toEqual([0, 0]);
  });
});
