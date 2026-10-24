import { describe, expect, it } from 'vitest';
import {
  clockOf,
  GATE_MISS,
  medalBetter,
  medalOf,
  parseSlalom,
  RUN_ORDER,
  RUNS,
  type Run,
  skied,
  TRICK_BONUS,
} from '../../src/data/slalom';
import {
  CRUISE,
  type Feature,
  HOWTO_T,
  hits,
  layRun,
  lineAt,
  READY_T,
  SKIER_R,
  Slalom,
  TUCK,
  YETI_GROWL,
  YETI_REACH,
  YETI_ROAR_T,
  YETI_START,
  YETI_WAIT,
} from '../../src/entities/slalom';

const DT = 1 / 60;
type Gate = Feature & { kind: 'gate' };
const gatesOf = (s: Slalom) => s.course.filter((f): f is Gate => f.kind === 'gate');

/** Skis a run to its end, or for so long, under a policy for the thumb. */
function ski(s: Slalom, policy: (s: Slalom) => [number, number], until = (_: Slalom) => false) {
  for (let i = 0; i < 60 * 200 && s.state !== 'done' && !until(s); i++) {
    const [sx, sy] = policy(s);
    s.step(DT, sx, sy);
  }
  return s;
}
/** Down the racing line, looking a little ahead, tucked or not. */
const theLine =
  (sy = 0) =>
  (s: Slalom): [number, number] => {
    const want = lineAt(gatesOf(s), s.z + Math.max(4, s.v * 0.6));
    return [Math.max(-1, Math.min(1, (want - s.x) * 0.9 - s.vx * 0.08)), sy];
  };
/** A run with nothing on it but what is given, past the countdown: the Bunny Slope, or the Doom Drop and its yeti. */
function bare(...fs: Feature[]): Slalom {
  return bareOf(RUNS.bunny, ...fs);
}
function chased(...fs: Feature[]): Slalom {
  return bareOf(RUNS.doom, ...fs);
}
function bareOf(run: Run, ...fs: Feature[]): Slalom {
  const s = new Slalom(run);
  s.course.splice(0, s.course.length, ...fs);
  s.step(READY_T + DT, 0, 0);
  return s;
}

describe('the Ninja Slalom', () => {
  for (const key of RUN_ORDER)
    it(`lays the ${RUNS[key].name} out the same every time, its gates swinging side to side inside the piste`, () => {
      const run = RUNS[key];
      const a = layRun(run);
      expect(layRun(run)).toEqual(a);
      const gates = a.filter((f): f is Gate => f.kind === 'gate');
      expect(gates.length).toBeGreaterThanOrEqual(12);
      gates.forEach((g, i) => {
        if (i) expect(Math.sign(g.x)).toBe(-Math.sign((gates[i - 1] as Gate).x));
        expect(Math.abs(g.x) + g.w / 2).toBeLessThan(run.half);
        expect(g.red).toBe(i % 2 === 0);
      });
      expect(a.filter((f) => f.kind === 'jump')).toHaveLength(run.jumps);
      expect(a.filter((f) => f.kind === 'lantern').length).toBeGreaterThanOrEqual(6);
      for (const f of a) {
        expect(f.z).toBeGreaterThan(0);
        expect(f.z).toBeLessThan(run.len);
        if ('x' in f) expect(Math.abs(f.x)).toBeLessThan(run.half);
      }
    });

  for (const key of RUN_ORDER)
    it(`leaves a clear line through every gate of the ${RUNS[key].name}: nothing stands within reach of it`, () => {
      const a = layRun(RUNS[key]);
      const gates = a.filter((f): f is Gate => f.kind === 'gate');
      for (const f of a)
        if (f.kind === 'pine' || f.kind === 'rock' || f.kind === 'snowman')
          expect(hits(f, lineAt(gates, f.z), 0)).toBe(false);
    });

  it('counts down before it goes, and the clock starts at go', () => {
    const s = new Slalom(RUNS.bunny);
    const said: string[] = [];
    s.onEvent = (w) => said.push(w);
    expect(s.count).toBe(3);
    for (let t = 0; t < READY_T - 0.1; t += DT) s.step(DT, 1, -1);
    expect(s.state).toBe('ready');
    expect(s.count).toBe(1);
    expect(s.z).toBe(0);
    expect(s.x).toBe(0);
    expect(s.t).toBe(0);
    for (let t = 0; t < 0.2; t += DT) s.step(DT, 0, 0);
    expect(s.state).toBe('ski');
    expect(said).toEqual(['go']);
  });

  it('shows how it goes first, on a first run, until the time is up or the trick button is tapped', () => {
    const s = new Slalom(RUNS.bunny);
    s.showHowTo();
    expect(s.howTo).toBe(true);
    expect(s.count).toBe(3);
    for (let t = 0; t < HOWTO_T - 0.1; t += DT) s.step(DT, 0, 0);
    expect(s.howTo).toBe(true);
    for (let t = 0; t < 0.2; t += DT) s.step(DT, 0, 0);
    expect(s.howTo).toBe(false);
    expect(s.state).toBe('ready');
    const tap = new Slalom(RUNS.bunny);
    tap.showHowTo();
    expect(tap.press()).toBe(false);
    expect(tap.howTo).toBe(false);
    expect(tap.readyT).toBe(READY_T);
  });

  it('down the line makes every gate without a fall, in under a minute, quicker tucked', () => {
    const easy = ski(new Slalom(RUNS.bunny), theLine());
    expect(easy.state).toBe('done');
    expect(easy.gatesMade).toBe(easy.gatesOut);
    expect(easy.gatesMissed).toBe(0);
    expect(easy.crashes).toBe(0);
    expect(easy.time).toBeGreaterThan(40);
    expect(easy.time).toBeLessThan(60);
    const fast = ski(new Slalom(RUNS.bunny), theLine(-1));
    expect(fast.gatesMade).toBe(fast.gatesOut);
    expect(fast.crashes).toBe(0);
    expect(fast.time).toBeLessThan(easy.time - 8);
    // Pulled back, it slows right down.
    const slow = ski(new Slalom(RUNS.bunny), theLine(1));
    expect(slow.time).toBeGreaterThan(easy.time + 20);
  });

  it('adds time for every gate gone round, so straight down is slower than the line', () => {
    const s = ski(new Slalom(RUNS.bunny), () => [0, -1]);
    const line = ski(new Slalom(RUNS.bunny), theLine(-1));
    expect(s.gatesMissed).toBeGreaterThan(s.gatesOut / 2);
    expect(s.penalty).toBeCloseTo(s.gatesMissed * GATE_MISS, 6);
    expect(s.time).toBeGreaterThan(line.time + 10);
  });

  it('a crash is a tumble in the snow and about two seconds lost, never the end of the run', () => {
    const clear = ski(
      bare(),
      () => [0, 0],
      (s) => s.z >= 150,
    );
    const pine: Feature = { kind: 'pine', z: 60, x: 0, r: 0.9 };
    const said: string[] = [];
    const hit = bare(pine);
    hit.onEvent = (w) => said.push(w);
    ski(
      hit,
      () => [0, 0],
      (s) => s.state === 'tumble',
    );
    expect(said).toEqual(['crash']);
    expect(hit.crashes).toBe(1);
    ski(
      hit,
      () => [0, 0],
      (s) => s.z >= 150,
    );
    expect(said).toEqual(['crash', 'up']);
    expect(hit.state).toBe('ski');
    const lost = hit.t - clear.t;
    expect(lost).toBeGreaterThan(1.5);
    expect(lost).toBeLessThan(2.6);
    // Passing it by a hair is no crash.
    const by = bare({ kind: 'pine', z: 60, x: 0.9 + SKIER_R + 0.05, r: 0.9 });
    ski(
      by,
      () => [0, 0],
      (s) => s.z >= 150,
    );
    expect(by.crashes).toBe(0);
  });

  it('throws you off a ramp; a trick landed takes time off, one still turning as you land is a tumble', () => {
    const ramp: Feature = { kind: 'jump', z: 60, x0: -2.5, x1: 2.5 };
    // On the snow, the button does nothing.
    const s = bare(ramp);
    expect(s.press()).toBe(false);
    ski(
      s,
      () => [0, 0],
      (q) => q.air,
    );
    expect(s.y).toBeGreaterThan(0);
    expect(s.press(0)).toBe(true);
    expect(s.trick).toBe('flip');
    expect(s.press(0)).toBe(false);
    ski(
      s,
      () => [0, 0],
      (q) => !q.air,
    );
    expect(s.state).toBe('ski');
    expect(s.tricks).toBe(1);
    expect(s.bonus).toBe(TRICK_BONUS);
    expect(s.time).toBeCloseTo(s.t - TRICK_BONUS, 6);
    // Steering as you tap, a spin; tapped too late, still turning on landing: a tumble, and no time off.
    const late = bare(ramp);
    ski(
      late,
      () => [0, 0],
      (q) => q.air && q.vy < -5,
    );
    expect(late.press(1)).toBe(true);
    expect(late.trick).toBe('spin');
    ski(
      late,
      () => [0, 0],
      (q) => !q.air,
    );
    expect(late.state).toBe('tumble');
    expect(late.tricks).toBe(0);
    expect(late.bonus).toBe(0);
    // Round the ramp, no jump at all.
    const round = bare(ramp);
    round.x = 4;
    ski(
      round,
      () => [0, 0],
      (q) => q.z > 70,
    );
    expect(round.air).toBe(false);
  });

  it('slices a lantern passed close by, not one passed wide', () => {
    const s = bare(
      { kind: 'lantern', z: 40, x: 1, cut: -1 },
      { kind: 'lantern', z: 60, x: 3, cut: -1 },
    );
    const said: string[] = [];
    s.onEvent = (w) => said.push(w);
    ski(
      s,
      () => [0, 0],
      (q) => q.z > 80,
    );
    expect(s.lanterns).toBe(1);
    expect(said).toEqual(['lantern']);
    expect((s.course[0] as Feature & { kind: 'lantern' }).cut).toBeGreaterThan(0);
    expect((s.course[1] as Feature & { kind: 'lantern' }).cut).toBe(-1);
    expect(s.slashT).toBeGreaterThanOrEqual(0);
  });

  it('carries you on sideways on ice, and slows you in moguls', () => {
    const turn = (s: Slalom) => {
      ski(
        s,
        () => [0, 0],
        (q) => q.z > 30,
      );
      for (let i = 0; i < 12; i++) s.step(DT, 1, 0);
      return s.vx;
    };
    const snow = turn(bare());
    const ice = turn(bare({ kind: 'ice', z: 20, len: 40, x0: -8, x1: 8 }));
    expect(ice).toBeLessThan(snow * 0.5);
    const flat = ski(
      bare(),
      () => [0, 0],
      (q) => q.z > 100,
    );
    const bumps = ski(
      bare({ kind: 'moguls', z: 10, len: 90, x0: -8, x1: 8 }),
      () => [0, 0],
      (q) => q.z > 100,
    );
    expect(bumps.t).toBeGreaterThan(flat.t + 1);
    expect(bumps.v).toBeLessThan(CRUISE);
  });

  it('is never faster than the tuck, and keeps to the piste', () => {
    const s = ski(new Slalom(RUNS.bunny), (q) => [q.z % 80 < 40 ? 1 : -1, -1]);
    expect(s.v).toBeLessThanOrEqual(TUCK + 1e-6);
    expect(Math.abs(s.x)).toBeLessThan(RUNS.bunny.half);
  });

  it('keeps the best time for each run, in tenths, and reads only what makes sense from a save', () => {
    expect(parseSlalom(undefined)).toBeUndefined();
    expect(parseSlalom({ runs: 0, best: { bunny: 40 } })).toBeUndefined();
    let s = skied(undefined, 'bunny', 52.34);
    expect(s).toEqual({ runs: 1, best: { bunny: 52.3 } });
    s = skied(s, 'bunny', 58);
    expect(s).toEqual({ runs: 2, best: { bunny: 52.3 } });
    s = skied(s, 'bunny', 47.06);
    expect(s.best.bunny).toBe(47.1);
    expect(parseSlalom(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(parseSlalom({ runs: 'x', best: {} })).toBeUndefined();
    expect(parseSlalom({ runs: 3, best: { bunny: -2, moon: 30 } })).toEqual({ runs: 3, best: {} });
    expect(parseSlalom({ runs: 3, best: { bunny: 47.1, fox: 61.24 } })).toEqual({
      runs: 3,
      best: { bunny: 47.1, fox: 61.2 },
    });
    expect(parseSlalom({ runs: 3, best: 'fast' })).toEqual({ runs: 3, best: {} });
    expect(clockOf(47.06)).toBe('47.1');
    expect(clockOf(63.5)).toBe('1:03.5');
    expect(clockOf(9)).toBe('9.0');
  });

  it('has the Fox Run longer, narrower and steeper than the Bunny Slope, its gates tighter and swinging further', () => {
    const b = RUNS.bunny;
    const f = RUNS.fox;
    expect(f.mark).toBe('blue');
    expect(f.len).toBeGreaterThan(b.len);
    expect(f.half).toBeLessThan(b.half);
    expect(f.gateW).toBeLessThan(b.gateW);
    expect(f.swing).toBeGreaterThan(b.swing);
    expect(f.steep).toBeGreaterThan(b.steep);
    expect(new Slalom(f).gatesOut).toBeGreaterThan(new Slalom(b).gatesOut);
    // Down the line it makes every gate without a fall, and goes quicker than the Bunny Slope a metre.
    const fox = ski(new Slalom(f), theLine());
    expect(fox.state).toBe('done');
    expect(fox.gatesMissed).toBe(0);
    expect(fox.crashes).toBe(0);
    const bunny = ski(new Slalom(b), theLine());
    expect(fox.time / f.len).toBeLessThan(bunny.time / b.len);
  });

  it('has the Doom Drop longer, narrower and steeper again, and the line down it clean, cruising or tucked', () => {
    const f = RUNS.fox;
    const d = RUNS.doom;
    expect(d.mark).toBe('black');
    expect(d.len).toBeGreaterThan(f.len);
    expect(d.half).toBeLessThan(f.half);
    expect(d.gateW).toBeLessThan(f.gateW);
    expect(d.swing).toBeGreaterThan(f.swing);
    expect(d.steep).toBeGreaterThan(f.steep);
    expect(d.yeti).toBe(true);
    expect(f.yeti).toBeFalsy();
    const doom = ski(new Slalom(d), theLine());
    expect(doom.state).toBe('done');
    expect(doom.gatesMissed).toBe(0);
    expect(doom.crashes).toBe(0);
    expect(doom.swiped).toBe(0);
    // Tucked all the way, a gate or two goes by too quick to make, but nothing is hit and the yeti never gets near.
    const tucked = ski(new Slalom(d), theLine(-1));
    expect(tucked.crashes).toBe(0);
    expect(tucked.gatesMissed).toBeLessThanOrEqual(3);
    expect(tucked.swiped).toBe(0);
  });

  it('sets the yeti off behind you at the go, after a roar, and leaves you clear of it down a clean run', () => {
    const s = new Slalom(RUNS.doom);
    expect(s.yetiGap).toBe(YETI_START);
    s.step(READY_T + DT, 0, 0);
    expect(s.state).toBe('ski');
    for (let t = 0; t < YETI_WAIT - 0.1; t += DT) s.step(DT, 0, 0);
    expect(s.yetiZ).toBe(-YETI_START);
    for (let t = 0; t < 1; t += DT) s.step(DT, 0, 0);
    expect(s.yetiZ).toBeGreaterThan(-YETI_START);
    // Down the line, it comes close as you get going, then you pull away from it; tucked, further.
    let least = Infinity;
    ski(s, theLine(), (q) => {
      least = Math.min(least, q.yetiGap);
      return false;
    });
    expect(s.state).toBe('done');
    expect(s.swiped).toBe(0);
    expect(least).toBeGreaterThan(YETI_REACH * 3);
    expect(least).toBeLessThan(YETI_GROWL);
    expect(s.yetiGap).toBeGreaterThan(least * 3);
    const tuck = ski(new Slalom(RUNS.doom), theLine(-1));
    expect(tuck.swiped).toBe(0);
    expect(tuck.yetiGap).toBeGreaterThan(s.yetiGap * 3);
  });

  it('catches you braking: a swipe into a tumble, then it stops to roar, and comes on again', () => {
    const s = chased();
    const said: string[] = [];
    s.onEvent = (w) => said.push(w);
    ski(
      s,
      () => [0, 1],
      (q) => q.state === 'tumble',
    );
    expect(said).toEqual(['growl', 'yeti']);
    expect(s.state).toBe('tumble');
    expect(s.swiped).toBe(1);
    expect(s.crashes).toBe(1);
    expect(s.yetiGap).toBeCloseTo(YETI_REACH, 6);
    expect(s.yetiRoar).toBe(YETI_ROAR_T);
    // Roaring, it stays put while you get up and go.
    const z = s.yetiZ;
    for (let t = 0; t < YETI_ROAR_T - 0.1; t += DT) s.step(DT, 0, -1);
    expect(s.yetiZ).toBe(z);
    expect(s.state).toBe('ski');
    // Braking again, it catches you again.
    ski(
      s,
      () => [0, 1],
      (q) => q.swiped > 1 || q.z > 400,
    );
    expect(s.swiped).toBe(2);
  });

  it('never swipes you while you are tumbling already, or in the air: it only roars', () => {
    const fall = chased({ kind: 'pine', z: 30, x: 0, r: 0.9 });
    ski(
      fall,
      () => [0, 0],
      (q) => q.state === 'tumble',
    );
    const said: string[] = [];
    fall.onEvent = (w) => said.push(w);
    fall.yetiRoar = 0;
    fall.yetiZ = fall.z - 0.5;
    fall.step(DT, 0, 0);
    expect(fall.state).toBe('tumble');
    expect(fall.swiped).toBe(0);
    expect(fall.crashes).toBe(1);
    expect(fall.yetiRoar).toBe(YETI_ROAR_T);
    expect(said).not.toContain('yeti');
    const jump = chased({ kind: 'jump', z: 40, x0: -3, x1: 3 });
    ski(
      jump,
      () => [0, 0],
      (q) => q.air,
    );
    jump.yetiRoar = 0;
    jump.yetiZ = jump.z - 0.5;
    jump.step(DT, 0, 0);
    expect(jump.air).toBe(true);
    expect(jump.swiped).toBe(0);
    expect(jump.yetiRoar).toBe(YETI_ROAR_T);
  });

  it('growls once as it comes close, again only once it has been left well behind', () => {
    const s = ski(
      chased(),
      () => [0, 0],
      (q) => q.z > 60,
    );
    const said: string[] = [];
    s.onEvent = (w) => said.push(w);
    const at = (gap: number) => {
      s.yetiRoar = 0;
      s.yetiZ = s.z - gap;
      s.step(DT, 0, 0);
    };
    at(YETI_GROWL * 2 + 2);
    at(YETI_GROWL + 1);
    expect(said).toEqual([]);
    at(YETI_GROWL - 1);
    at(YETI_GROWL - 3);
    at(YETI_GROWL + 4);
    expect(said).toEqual(['growl']);
    at(YETI_GROWL * 2 + 2);
    at(YETI_GROWL - 1);
    expect(said).toEqual(['growl', 'growl']);
  });

  it('has no yeti on the Bunny Slope or the Fox Run', () => {
    for (const key of ['bunny', 'fox'] as const) {
      const s = ski(new Slalom(RUNS[key]), () => [0, 1]);
      expect(s.state).toBe('done');
      expect(s.swiped).toBe(0);
      expect(s.yetiZ).toBe(-YETI_START);
    }
  });

  it('gives gold, silver or bronze for a time, or none: gold tucked all the way down, bronze cruising', () => {
    for (const key of RUN_ORDER) {
      const run = RUNS[key];
      const [g, s, b] = run.medals;
      expect(g).toBeLessThan(s);
      expect(s).toBeLessThan(b);
      expect(medalOf(run, g)).toBe('gold');
      expect(medalOf(run, g + 0.04)).toBe('gold');
      expect(medalOf(run, g + 0.1)).toBe('silver');
      expect(medalOf(run, b)).toBe('bronze');
      expect(medalOf(run, b + 0.1)).toBeNull();
      expect(medalOf(run, ski(new Slalom(run), theLine(-1)).time)).toBe('gold');
      expect(medalOf(run, ski(new Slalom(run), theLine(-0.6)).time)).toBe('silver');
      expect(medalOf(run, ski(new Slalom(run), theLine()).time)).toBe('bronze');
      // Braking all the way down wins nothing.
      expect(medalOf(run, ski(new Slalom(run), theLine(1)).time)).toBeNull();
    }
    expect(medalBetter('gold', 'silver')).toBe(true);
    expect(medalBetter('bronze', null)).toBe(true);
    expect(medalBetter('silver', 'silver')).toBe(false);
    expect(medalBetter('bronze', 'gold')).toBe(false);
    expect(medalBetter(null, null)).toBe(false);
  });
});
