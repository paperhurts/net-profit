import { describe, expect, it } from 'vitest';
import {
  BUILDS,
  type Build,
  HEART,
  KIND_FIGHT,
  petStats,
  recolour,
  SPECIALS,
  type Special,
  TRAINERS,
  type Trainer,
  trainerOpen,
} from '../../src/data/petfight';
import {
  BITE_REACH,
  CHARGE_W,
  laneLen,
  PetFight,
  READY_T,
  RING_R,
  ROAR_R,
  SLAM_R,
} from '../../src/entities/petfight';

const DT = 1 / 60;
const first = TRAINERS[0] as Trainer;

function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function start(
  build: Build = 'strong',
  special: Special = 'pounce',
  tr: Trainer = first,
  lv = 1,
): PetFight {
  const f = new PetFight(petStats(build, special, lv), tr);
  for (let t = 0; t < READY_T + DT; t += DT) f.step(DT, 0, 0);
  expect(f.phase).toBe('fight');
  return f;
}

/** Where a pet at x, y ends up going `len` along a way, stopped at the rope. */
function along(x: number, y: number, ux: number, uy: number, len: number): [number, number] {
  let px = x + ux * len;
  let py = y + uy * len;
  const d = Math.hypot(px, py);
  const edge = RING_R - 8;
  if (d > edge) {
    px *= edge / d;
    py *= edge / d;
  }
  return [px, py];
}

/**
 * The way out a person takes, looking at the ring: of sixteen ways, the one that ends up furthest out of the red (or
 * off the lane), stopped at the rope and not through the other pet. Picked once, when they react, and held.
 */
function wayOut(f: PetFight): [number, number] {
  const y = f.you;
  const o = f.foe;
  let best: [number, number] = [1, 0];
  let score = -Infinity;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const [px, py] = along(y.x, y.y, ux, uy, 34);
    const clear =
      f.move === 'slam'
        ? Math.hypot(px - f.at.x, py - f.at.y)
        : Math.abs((px - f.at.x) * -f.dir.y + (py - f.at.y) * f.dir.x);
    const through = Math.hypot(px - o.x, py - o.y) < 18 && f.move === 'slam' ? 30 : 0;
    if (clear - through > score) {
      score = clear - through;
      best = [ux, uy];
    }
  }
  return best;
}

/**
 * A person's hand: a reaction time after the red shows (a third of a second, quicker or slower each time) it picks
 * the way out of the slam's ring or off the charge's lane and goes; otherwise it walks up to the other pet, bites when
 * in reach and uses its special whenever it is ready. Never perfect: it reacts late, and keeps biting through nips.
 */
function play(f: PetFight, r: () => number, react = 0.33): boolean {
  let warnAt = -1;
  let late = 0;
  let out: [number, number] | null = null;
  for (let t = 0; t < 120 && f.phase === 'fight'; t += DT) {
    const y = f.you;
    const o = f.foe;
    let mx = 0;
    let my = 0;
    if (f.foeState === 'wind' && f.move) {
      if (warnAt < 0) {
        warnAt = t;
        late = react + (r() - 0.5) * 0.16;
        out = null;
      }
      if (t - warnAt >= late) {
        // A curler curls up in the red when its curl is ready and lets it land on the spikes; a curl that will not
        // last till then is no use, so it runs.
        const lands = f.trainer.wind - f.foeT + (f.move === 'charge' ? 0.5 : 0.1);
        if (f.stats.special === 'curl' && (y.spCd <= 0 || y.curl > lands)) {
          if (y.curl <= 0) f.special();
        } else {
          out ??= wayOut(f);
          [mx, my] = out;
        }
      }
    } else {
      warnAt = -1;
      const d = Math.hypot(o.x - y.x, o.y - y.y);
      if (d > BITE_REACH - 6) {
        mx = (o.x - y.x) / d;
        my = (o.y - y.y) / d;
      }
      if (d <= BITE_REACH) f.bite();
      // Curl is kept for the red.
      if (f.stats.special !== 'curl' && d <= 120) f.special();
    }
    f.step(DT, mx, my);
  }
  return f.won;
}

describe('pet stats', () => {
  it('are 5 to 8 hearts, a heart at levels 4, 7 and 10, and the build does what it says', () => {
    expect(petStats('speedy', 'spit', 1).hp).toBe(5 * HEART);
    expect(petStats('speedy', 'spit', 4).hp).toBe(6 * HEART);
    expect(petStats('speedy', 'spit', 10).hp).toBe(8 * HEART);
    expect(petStats('tough', 'spit', 10).hp).toBe(8 * HEART);
    expect(petStats('tough', 'spit', 1).hp).toBe(6 * HEART);
    expect(petStats('strong', 'spit', 1).bite).toBeGreaterThan(petStats('tough', 'spit', 1).bite);
    expect(petStats('speedy', 'spit', 1).speed).toBeGreaterThan(
      petStats('strong', 'spit', 1).speed,
    );
    expect(petStats('strong', 'spit', 10).speed).toBeGreaterThan(
      petStats('strong', 'spit', 1).speed,
    );
  });

  it('give every hatched kind a build and a special', () => {
    for (const k of ['bunny', 'frog', 'ladybird', 'hedgehog', 'fox', 'moth']) {
      const kf = KIND_FIGHT[k];
      expect(kf && BUILDS.includes(kf.build) && SPECIALS.includes(kf.special)).toBe(true);
    }
  });

  it('open the ladder one trainer at a time, ending with the champion and her cup', () => {
    expect(trainerOpen(0, [])).toBe(true);
    expect(trainerOpen(1, [])).toBe(false);
    expect(trainerOpen(1, ['t1'])).toBe(true);
    expect(trainerOpen(2, ['t1'])).toBe(false);
    expect(TRAINERS.length).toBe(6);
    expect(TRAINERS.map((t) => t.lv)).toEqual([...TRAINERS.map((t) => t.lv)].sort((a, b) => a - b));
    expect(TRAINERS.filter((t) => t.cup).map((t) => t.id)).toEqual(['champ']);
    expect(new Set(TRAINERS.map((t) => t.id)).size).toBe(TRAINERS.length);
  });

  it("draw the trainer's pet in other colours", () => {
    expect(recolour('Babc.Cdef.Bxyz', 'B', 'E')).toBe('Eabc.Cdef.Exyz');
  });
});

describe('a pet battle', () => {
  it('waits a moment, then begins', () => {
    const f = new PetFight(petStats('strong', 'pounce', 1), first);
    f.bite();
    f.step(0.5, 1, 0);
    expect(f.phase).toBe('ready');
    expect(f.you.biteCd).toBe(0);
    for (let t = 0; t < READY_T; t += DT) f.step(DT, 0, 0);
    expect(f.take().some((e) => e.k === 'go')).toBe(true);
  });

  it('bites what is in reach and misses what is not', () => {
    const f = start();
    f.you.x = 0;
    f.you.y = 0;
    f.foe.x = BITE_REACH + 10;
    f.foe.y = 0;
    f.bite();
    expect(f.foe.hp).toBe(f.foe.max);
    f.step(1, 0, 0);
    f.foe.x = BITE_REACH - 4;
    f.foe.hurt = 0;
    f.bite();
    expect(f.foe.hp).toBe(f.foe.max - petStats('strong', 'pounce', 1).bite);
  });

  it('shows the slam in red first, long enough to step out a reaction time late', () => {
    const f = start('strong', 'pounce');
    f.nextBig = 0;
    f.step(DT, 0, 0);
    expect(f.foeState).toBe('wind');
    expect(f.move).toBe('slam');
    // Out of a ring this wide, from its middle, at a level-1 pet's slowest walk, with a third of a second lost.
    const out = (SLAM_R + 8) / petStats('strong', 'pounce', 1).speed;
    expect(first.wind - 0.33).toBeGreaterThan(out + 0.1);
  });

  it('lets the specials do what they say', () => {
    // Spit: from across the ring.
    const s = start('speedy', 'spit');
    s.you.x = -30;
    s.you.y = 0;
    s.foe.x = 40;
    s.foe.y = 0;
    s.special();
    for (let t = 0; t < 0.6; t += DT) s.step(DT, 0, 0);
    expect(s.foe.hp).toBeLessThan(s.foe.max);
    // Roar: dazes it and loses it its slam.
    const r = start('strong', 'roar');
    r.you.x = 0;
    r.you.y = 0;
    r.foe.x = ROAR_R - 10;
    r.foe.y = 0;
    r.nextBig = 0;
    r.step(DT, 0, 0);
    expect(r.foeState).toBe('wind');
    r.special();
    expect(r.foe.daze).toBeGreaterThan(0);
    expect(r.move).toBeNull();
    // Curl: the slam lands on it and nothing gets through.
    const c = start('tough', 'curl');
    c.nextBig = 0;
    c.step(DT, 0, 0);
    c.special();
    for (let t = 0; t < first.wind + 0.1; t += DT) c.step(DT, 0, 0);
    expect(c.you.hp).toBe(c.you.max);
    expect(c.take().some((e) => e.k === 'blocked')).toBe(true);
    // Pounce: a leap that lands.
    const p = start('strong', 'pounce');
    p.you.x = -30;
    p.you.y = 0;
    p.foe.x = 20;
    p.foe.y = 0;
    p.special();
    for (let t = 0; t < 0.4; t += DT) p.step(DT, 0, 0);
    expect(p.foe.hp).toBeLessThan(p.foe.max);
  });

  it("shows a charge's red lane only as far as the rope", () => {
    expect(laneLen({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(RING_R - 8);
    expect(laneLen({ x: -30, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(RING_R - 8 + 30);
    expect(laneLen({ x: 39, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(1);
  });

  it('keeps both pets in the ring', () => {
    const f = start();
    for (let t = 0; t < 3; t += DT) f.step(DT, 1, 1);
    expect(Math.hypot(f.you.x, f.you.y)).toBeLessThanOrEqual(RING_R);
    expect(Math.hypot(f.foe.x, f.foe.y)).toBeLessThanOrEqual(RING_R);
  });

  it('is lost by a pet that does nothing, and costs nothing', () => {
    const f = start();
    for (let t = 0; t < 120 && f.phase === 'fight'; t += DT) f.step(DT, 0, 0);
    expect(f.phase).toBe('over');
    expect(f.won).toBe(false);
  });

  it("is won by a person's hand every time against the first trainer, with every build and special", () => {
    for (const b of BUILDS)
      for (const s of SPECIALS)
        for (let seed = 1; seed <= 12; seed++) {
          const f = start(b, s);
          expect(play(f, seeded(seed * 97 + b.length + s.length)), `${b} ${s} ${seed}`).toBe(true);
        }
  });

  it('is lost by a hand that never steps out of the red, so dodging matters', () => {
    for (const s of ['spit', 'curl'] as const) {
      const f = start('speedy', s);
      expect(play(f, seeded(1), 99)).toBe(false);
    }
  });

  it('dodges a charge, a reaction time late, off its line', () => {
    const charger: Trainer = { ...first, moves: ['charge'] };
    for (let seed = 1; seed <= 12; seed++) {
      const f = start('strong', 'pounce', charger);
      expect(play(f, seeded(seed))).toBe(true);
    }
    expect(CHARGE_W).toBeLessThan(SLAM_R);
  });

  it("is won by a person's hand every time against every trainer on the ladder at the level it is meant for", () => {
    for (const tr of TRAINERS)
      for (const b of BUILDS)
        for (const s of SPECIALS)
          for (let seed = 1; seed <= 4; seed++) {
            const f = start(b, s, tr, tr.lv);
            expect(play(f, seeded(seed * 31 + 7)), `${tr.id} ${b} ${s} ${seed}`).toBe(true);
          }
  });

  it('is lost, up the ladder, by a hand that never steps out of the red', () => {
    let wins = 0;
    for (const b of BUILDS)
      for (const s of SPECIALS)
        if (play(start(b, s, TRAINERS[4] as Trainer, 5), seeded(3), 99)) wins++;
    expect(wins).toBe(0);
  });

  it('takes some levels for the champion', () => {
    const champ = TRAINERS[TRAINERS.length - 1] as Trainer;
    let wins = 0;
    let n = 0;
    for (const b of BUILDS)
      for (const s of SPECIALS)
        for (let seed = 1; seed <= 4; seed++) {
          n++;
          if (play(start(b, s, champ, 1), seeded(seed * 31 + 7))) wins++;
        }
    expect(wins).toBeLessThan(n);
  });

  it('has a trainer with two big moves do them in turn', () => {
    const f = start('strong', 'pounce', TRAINERS[2] as Trainer, 3);
    const moves: string[] = [];
    for (let t = 0; t < 30 && f.phase === 'fight'; t += DT) {
      f.step(DT, 0, 0);
      f.you.hp = f.you.max;
      for (const e of f.take()) if (e.k === 'wind' && e.move !== 'nip') moves.push(e.move);
    }
    expect(moves.slice(0, 4)).toEqual(['slam', 'charge', 'slam', 'charge']);
  });
});
