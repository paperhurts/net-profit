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
  snookHome,
  TOLL,
} from '../../src/fishing/snook';

/** How a player works the rod, given the fight in front of them. */
type Policy = (f: Fight) => number;
/** Pulls when it sulks, eases when it runs, gives a little more when the piling is close, backs off a hot line. */
const good: Policy = (f) => {
  if (f.tension > 0.8) return 0.1;
  if (f.running) return f.d < 40 ? 0.45 : 0.2;
  return 1;
};
const yank: Policy = () => 1;
const slack: Policy = () => 0;

function play(f: Fight, policy: Policy, r: () => number): Fight {
  for (let i = 0; i < 60 * 30 && (f.state === 'waiting' || f.state === 'fight'); i++) {
    f.update(1 / 30, policy(f), r);
  }
  return f;
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

  it('can be won, played well, whenever the fish could be landed at all', () => {
    for (const kind of ['short', 'keeper', 'giant'] as const) {
      let landed = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const r = rng(seed);
        if (play(new Fight(r, kind), good, r).state === 'landed') landed++;
      }
      expect(landed, kind).toBeGreaterThanOrEqual(kind === 'giant' ? 150 : 180);
    }
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
    for (const policy of [good, yank, slack]) {
      for (let seed = 1; seed <= 100; seed++) {
        const r = rng(seed);
        const f = play(new Fight(r, 'none'), policy, r);
        expect(f.state).toBe('lost');
      }
    }
  });

  it('shows its hand on the third run: a bolt no rod could stop', () => {
    const r = rng(7);
    const f = new Fight(r, 'none');
    let bolted = false;
    for (let i = 0; i < 40 * 30 && f.state !== 'lost'; i++) {
      f.update(1 / 30, good(f), r);
      bolted = bolted || f.bolting;
    }
    expect(bolted).toBe(true);
    expect(f.state).toBe('lost');
  });

  it('comes to one landing in ten casts and one keeper in fifty for a good hand, over twenty thousand casts', () => {
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
      const r = rng(Math.floor(master() * 1e9));
      const f = play(new Fight(r), good, r);
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
