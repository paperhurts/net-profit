import { describe, expect, it } from 'vitest';
import {
  BARREL_PLANKS,
  climbed,
  JUMP_COINS,
  parseClimbs,
  plankY,
  SMASH_COINS,
  TOP_COINS,
  TRIES,
} from '../../src/data/treehouse';
import {
  BARREL_R,
  type Barrel,
  Climb,
  type ClimbEvent,
  DOWN_T,
  downhill,
  GRAVITY,
  HOWTO_T,
  JUMP_V,
  PIN_T,
  PIN_Y,
  READY_T,
  SAFE_T,
  STUN_T,
  WALK,
} from '../../src/entities/treehouse';

const DT = 1 / 60;
const S = BARREL_PLANKS;
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
    expect(downhill(plank(S.gorilla.plank))).toBe(S.gorilla.x < S.w / 2 ? 1 : -1);
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
      expect(ps[0]).toBe(S.gorilla.plank);
      for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeLessThan(ps[i - 1] as number);
    }
    const out = [...seen.keys()].filter((b) => !c.barrels.includes(b));
    expect(out.length).toBeGreaterThan(10);
    for (const b of out) expect(seen.get(b)?.at(-1)).toBe(0);
    // Some come down a ladder, missing out a plank's zigzag.
    expect([...seen.values()].some((ps) => ps.length < S.gorilla.plank + 1)).toBe(true);
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
