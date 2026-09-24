import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import {
  type Catch,
  Fight,
  INCHES,
  MISS_LINE,
  ODDS,
  rollCatch,
  rollInches,
  smoothPull,
  snookHome,
  TELL,
  TOLL,
} from '../../src/fishing/snook';

/** How a player works the stick, frame by frame: 0 is hands off, 1 is heaving. */
type Hand = (f: Fight, dt: number) => number;
const yank: Hand = () => 1;
const slack: Hand = () => 0;

/**
 * A person on the rod, doing what the word over the tension bar says. A thumb on glass is down or
 * up, so they hold on a sulk and let go when it shakes its head or runs (or, not reading the tell,
 * only once it runs), and let go of a hot line. Everything reaches the thumb `late` seconds after it
 * happens, give or take a tenth on each change of the fish. No partial pressure and no saving it
 * from the piling: the words alone have to be enough. Seeded, so every run plays the same hands.
 */
function person(seed: number, late = 1 / 3, readsTell = true): Hand {
  const own = rng(seed);
  const seen: { at: number; tension: number }[] = [];
  const due: { at: number; ease: boolean }[] = [];
  let t = 0;
  let shown: boolean | null = null;
  let cue: boolean | null = null;
  return (f, dt) => {
    t += dt;
    seen.push({ at: t, tension: f.tension });
    while (seen.length > 1 && (seen[1] as (typeof seen)[number]).at <= t - late) seen.shift();
    if (f.state === 'fight') {
      const ease = f.running || (readsTell && f.telling);
      if (ease !== shown) {
        shown = ease;
        due.push({ at: t + Math.max(0.1, late + (own() * 2 - 1) * 0.1), ease });
      }
    }
    for (let next = due[0]; next && next.at <= t; next = due[0]) {
      due.shift();
      cue = next.ease;
    }
    if (cue === null || cue) return 0;
    return (seen[0] as (typeof seen)[number]).tension > 0.8 ? 0 : 1;
  };
}

/** Play a cast to the end at sixty frames a second, the rod following the stick as in the game. */
function play(f: Fight, hand: Hand, r: () => number): Fight {
  const dt = 1 / 60;
  let rod = 0;
  for (let i = 0; i < 60 * 60 && (f.state === 'waiting' || f.state === 'fight'); i++) {
    rod = smoothPull(rod, hand(f, dt), dt);
    f.update(dt, rod, r);
  }
  return f;
}

/** Of 200 seeded casts of this kind, how many this hand lands. */
function landings(kind: Catch, hand: (seed: number) => Hand): number {
  let landed = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const r = rng(seed);
    if (play(new Fight(r, kind), hand(seed * 7919 + 13), r).state === 'landed') landed++;
  }
  return landed;
}

describe('the cast', () => {
  it('costs the toll, and every miss ends with the line', () => {
    expect(TOLL).toBe(10);
    expect(MISS_LINE).toBe('The snook is still under the bridge.');
  });

  it('finds the snook home when the light is low', () => {
    expect(snookHome('Day')).toBe(false);
    expect([snookHome('Dusk'), snookHome('Night'), snookHome('Dawn')]).toEqual([true, true, true]);
  });

  it('lands one in ten, keeps one in fifty, and one keeper in five is the giant', () => {
    expect(ODDS).toEqual({ landed: 1 / 10, keeper: 1 / 50, giant: 1 / 250 });
    expect(rollCatch(0)).toBe('giant');
    expect(rollCatch(1 / 250)).toBe('keeper');
    expect(rollCatch(1 / 50 - 1e-9)).toBe('keeper');
    expect(rollCatch(1 / 50)).toBe('short');
    expect(rollCatch(1 / 10 - 1e-9)).toBe('short');
    expect(rollCatch(1 / 10)).toBe('none');
    expect(rollCatch(0.999)).toBe('none');
  });

  it('measures shorts under the slot, keepers inside it and the giant well over', () => {
    for (const kind of ['short', 'keeper', 'giant'] as const) {
      const [lo, hi] = INCHES[kind];
      expect(rollInches(kind, 0)).toBe(lo);
      expect(rollInches(kind, 0.9999)).toBe(hi);
    }
    expect(INCHES.short[1]).toBeLessThan(INCHES.keeper[0]);
    expect(INCHES.giant[0]).toBeGreaterThan(INCHES.keeper[1]);
    expect(rollInches('none', 0.5)).toBe(0);
  });
});

describe('the fight', () => {
  it('waits for the strike, then begins with a run', () => {
    const f = new Fight(rng(1), 'short');
    expect(f.state).toBe('waiting');
    const w = f.wait;
    expect(w).toBeGreaterThanOrEqual(1.5);
    expect(w).toBeLessThanOrEqual(4);
    for (let i = 0; i < w * 30 + 2; i++) f.update(1 / 30, 0, rng(2));
    expect(f.state).toBe('fight');
    expect(f.running).toBe(true);
  });

  it('shakes its head before every run but the first, for as long as TELL', () => {
    const r = rng(3);
    const f = new Fight(r, 'keeper');
    const hand = person(3);
    const dt = 1 / 60;
    let rod = 0;
    const phases: { kind: 'sulk' | 'tell' | 'run'; t: number }[] = [];
    while (f.state === 'waiting' || f.state === 'fight') {
      rod = smoothPull(rod, hand(f, dt), dt);
      f.update(dt, rod, r);
      if (f.state !== 'fight') continue;
      const kind = f.telling ? 'tell' : f.running ? 'run' : 'sulk';
      const last = phases[phases.length - 1];
      if (last && last.kind === kind) last.t += dt;
      else phases.push({ kind, t: dt });
    }
    expect(f.state).toBe('landed');
    const runs = phases.filter((p) => p.kind === 'run').length;
    expect(runs).toBeGreaterThanOrEqual(4);
    phases.forEach((p, i) => {
      if (p.kind !== 'run' || i === 0) return;
      const before = phases[i - 1] as (typeof phases)[number];
      expect(before.kind).toBe('tell');
      expect(before.t).toBeCloseTo(TELL, 1);
    });
    expect(TELL).toBeGreaterThanOrEqual(0.4);
  });

  it('is landed by a person a third of a second late, whenever the fish could be landed at all', () => {
    expect(landings('short', (s) => person(s))).toBeGreaterThanOrEqual(196);
    expect(landings('keeper', (s) => person(s))).toBeGreaterThanOrEqual(196);
    const giant = landings('giant', (s) => person(s));
    expect(giant).toBeGreaterThanOrEqual(145);
    expect(giant).toBeLessThan(196);
  });

  it('still comes in for a slow hand, half a second late, and the giant is the one that gets away', () => {
    const slow = (s: number) => person(s, 1 / 2);
    const short = landings('short', slow);
    const giant = landings('giant', slow);
    expect(short).toBeGreaterThanOrEqual(190);
    expect(landings('keeper', slow)).toBeGreaterThanOrEqual(190);
    expect(giant).toBeGreaterThanOrEqual(140);
    expect(giant).toBeLessThan(short);
  });

  it('is the tell that makes it: the same person waiting for the run loses most of them', () => {
    expect(landings('short', (s) => person(s, 1 / 3, false))).toBeLessThan(50);
  });

  it('parts the line for a player who only ever heaves, and gives the fish the piling for one who never pulls', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const a = rng(seed);
      const heaved = play(new Fight(a, 'keeper'), yank, a);
      expect([heaved.state, heaved.lost]).toEqual(['lost', 'snap']);
      const b = rng(seed);
      const idle = play(new Fight(b, 'keeper'), slack, b);
      expect([idle.state, idle.lost]).toEqual(['lost', 'piling']);
    }
  });

  it('cannot be won, however it is played, when the snook was never coming in', () => {
    const hands: ((seed: number) => Hand)[] = [
      (s) => person(s, 0.1),
      (s) => person(s),
      (s) => person(s, 1 / 2),
      () => yank,
      () => slack,
    ];
    for (const hand of hands) expect(landings('none', hand)).toBe(0);
  });

  it('shows its hand on the third run: a bolt no rod could stop', () => {
    const r = rng(7);
    const f = new Fight(r, 'none');
    const hand = person(7);
    const dt = 1 / 60;
    let rod = 0;
    let bolted = false;
    for (let i = 0; i < 40 * 60 && f.state !== 'lost'; i++) {
      rod = smoothPull(rod, hand(f, dt), dt);
      f.update(dt, rod, r);
      bolted = bolted || f.bolting;
    }
    expect(bolted).toBe(true);
    expect(f.state).toBe('lost');
  });

  it('comes to one landing in ten casts and one keeper in fifty for a person, over twenty thousand casts', () => {
    const master = rng(2026);
    const tally: Record<Catch | 'lostLandable', number> = {
      none: 0,
      short: 0,
      keeper: 0,
      giant: 0,
      lostLandable: 0,
    };
    const casts = 20000;
    for (let i = 0; i < casts; i++) {
      const seed = Math.floor(master() * 1e9);
      const r = rng(seed);
      const f = play(new Fight(r), person(seed + 1), r);
      if (f.state === 'landed') tally[f.kind]++;
      else if (f.kind !== 'none') tally.lostLandable++;
    }
    const landed = (tally.short + tally.keeper + tally.giant) / casts;
    const kept = (tally.keeper + tally.giant) / casts;
    expect(landed).toBeGreaterThan(0.08);
    expect(landed).toBeLessThanOrEqual(0.11);
    expect(kept).toBeGreaterThan(0.013);
    expect(kept).toBeLessThanOrEqual(0.024);
    expect(tally.giant).toBeGreaterThan(40);
    expect(tally.giant).toBeLessThan(130);
  });
});
