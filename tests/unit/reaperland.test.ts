import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { spearAt } from '../../src/data/spear';
import type { World } from '../../src/entities/entity';
import { inSwept } from '../../src/entities/reaper';
import {
  BEATEN_T,
  BITE_R,
  COIL_ANGRY,
  COIL_BACK,
  COIL_T,
  CROUCH_ANGRY,
  CROUCH_T,
  FIGURE_R,
  HUB,
  LAND_HP,
  LandReaper,
  LEASH_R,
  REACH,
  REAR_T,
  REST,
  RISE_T,
  SHY_T,
  SIGHT_R,
  SPAN,
  WAKE_R,
} from '../../src/entities/reaperland';
import { Spears } from '../../src/entities/spears';
import { WALK_SPEED, walkable, walkStep } from '../../src/entities/walker';
import { CAST_EVERY, CAST_RANGE } from '../../src/entities/warlock';
import {
  CHESTS6,
  HILL,
  ISLE6,
  LANDING6,
  NEST6,
  onIsle6Ground,
  PALMS6,
  ROCKS6,
  shoreR,
  TEMPLE,
} from '../../src/world/isle6';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const figureAt = (x: number, y: number) => ({ x, y, vx: 0, vy: 0 });
/** In from the nest toward the middle of the island, this far. */
const inland = (d: number) => {
  const a = Math.atan2(ISLE6.y - NEST6.y, ISLE6.x - NEST6.x);
  return figureAt(NEST6.x + Math.cos(a) * d, NEST6.y + Math.sin(a) * d);
};
const run = (r: LandReaper, w: World, secs: number, until?: () => boolean) => {
  for (let i = 0; i < secs / DT && !until?.(); i++) r.update(DT, w);
};
const awake = () => {
  const r = new LandReaper();
  const w = baseWorld({ figure: inland(WAKE_R - 30) });
  run(r, w, RISE_T + 0.1);
  return { r, w };
};
/** Up on his hind legs, a spear's chance. */
const reared = () => {
  const { r, w } = awake();
  run(r, w, 30, () => r.open);
  return { r, w };
};

describe('the Reaper on land', () => {
  it('lies asleep by his nest on a beach of island 6, clear of its chests, its hill and its temple', () => {
    const a = Math.atan2(NEST6.y - ISLE6.y, NEST6.x - ISLE6.x);
    const r = Math.hypot(NEST6.x - ISLE6.x, NEST6.y - ISLE6.y);
    // On the sand, up from the water.
    expect(onIsle6Ground(NEST6.x, NEST6.y)).toBe(true);
    expect(r).toBeGreaterThan(shoreR(a) - 70);
    // Walking the island for its chests never wakes him.
    for (const [x, y] of CHESTS6)
      expect(Math.hypot(x - NEST6.x, y - NEST6.y)).toBeGreaterThan(WAKE_R + 60);
    for (const [x, y] of [...PALMS6, ...ROCKS6])
      expect(Math.hypot(x - NEST6.x, y - NEST6.y)).toBeGreaterThan(NEST6.r + 10);
    expect(Math.hypot(HILL.x - NEST6.x, HILL.y - NEST6.y)).toBeGreaterThan(LEASH_R);
    expect(Math.hypot(TEMPLE.x - NEST6.x, TEMPLE.y - NEST6.y)).toBeGreaterThan(LEASH_R + 300);
    expect(Math.hypot(LANDING6.x - NEST6.x, LANDING6.y - NEST6.y)).toBeGreaterThan(LEASH_R + 300);
    // A figure can walk up to the nest.
    expect(walkable(NEST6.x, NEST6.y, 0)).toBe(true);
    const s = new LandReaper();
    expect(s.state).toBe('sleep');
    expect([s.x, s.y]).toEqual([REST.x, REST.y]);
    expect(Math.hypot(REST.x - NEST6.x, REST.y - NEST6.y)).toBeLessThan(40);
  });

  it('is sighted from a way off, and wakes only for a figure near his nest', () => {
    const r = new LandReaper();
    let seen = 0;
    let woke = 0;
    r.onSight = () => seen++;
    r.onWake = () => woke++;
    const w = baseWorld({ figure: figureAt(LANDING6.x, LANDING6.y) });
    run(r, w, 2);
    expect(seen + woke).toBe(0);
    w.figure = inland(SIGHT_R - 20);
    run(r, w, 2);
    expect(seen).toBe(1);
    expect(r.state).toBe('sleep');
    expect(r.awake).toBe(false);
    w.figure = inland(WAKE_R - 10);
    r.update(DT, w);
    expect(woke).toBe(1);
    expect(r.state).toBe('rise');
    expect(r.awake).toBe(true);
    run(r, w, RISE_T + 0.05);
    expect(r.state).toBe('prowl');
  });

  it('goes back to his nest, whole, when the figure walks off, and is back on it at once when it leaves the island', () => {
    const { r, w } = reared();
    r.hit(4);
    expect(r.hp).toBe(LAND_HP - 4);
    let gave = 0;
    r.onGiveUp = () => gave++;
    // Wait out anything under way, then walk off.
    run(r, w, 3, () => r.state === 'prowl');
    w.figure = inland(LEASH_R + 40);
    run(r, w, 0.2);
    expect(gave).toBe(1);
    expect(r.state).toBe('home');
    expect(r.hp).toBe(LAND_HP);
    run(r, w, 20, () => r.state === 'sleep');
    expect(r.state).toBe('sleep');
    expect([r.x, r.y]).toEqual([REST.x, REST.y]);
    // Awake again, then aboard: straight back asleep at his nest.
    w.figure = inland(WAKE_R - 20);
    run(r, w, RISE_T + 2);
    expect(r.awake).toBe(true);
    w.figure = null;
    r.update(DT, w);
    expect(r.state).toBe('sleep');
    expect([r.x, r.y]).toEqual([REST.x, REST.y]);
  });

  it('turns a spear but when he is reared up, and counts one let go while he was', () => {
    const { r, w } = awake();
    expect(r.open).toBe(false);
    expect(r.hit(2)).toBe(false);
    expect(r.hp).toBe(LAND_HP);
    // Let go while he was up, it counts though he is down when it lands.
    expect(r.hit(2, true)).toBe(true);
    expect(r.hp).toBe(LAND_HP - 2);
    run(r, w, 30, () => r.open);
    expect(r.state).toBe('rear');
    let hurt = 0;
    r.onHurt = () => hurt++;
    expect(r.hit(2)).toBe(true);
    expect(hurt).toBe(1);
    expect(r.flash).toBe(1);
  });

  it('takes tar on his face only reared up, and it holds him up there longer', () => {
    const { r, w } = awake();
    r.stun(1);
    expect(r.stunT).toBe(0);
    run(r, w, 30, () => r.open);
    let t = 0;
    r.stun(1);
    for (; t < 10 && r.state === 'rear'; t += DT) r.update(DT, w);
    expect(t).toBeGreaterThan(REAR_T + 0.6);
  });

  it('warns long enough to step out of the fan, or off the line, a reaction time late', () => {
    const REACT = 0.33;
    // Out of the fan from the middle of it, where he puts a figure standing still: across it, the
    // quickest way, or straight away from him.
    const across = (HUB * Math.sin(SPAN) + FIGURE_R) / WALK_SPEED;
    const away = (REACH - HUB + FIGURE_R) / WALK_SPEED;
    for (const warn of [COIL_T, COIL_ANGRY, COIL_BACK])
      expect(warn - REACT).toBeGreaterThan(across);
    expect(COIL_T - REACT).toBeGreaterThan(away);
    for (const warn of [CROUCH_T, CROUCH_ANGRY])
      expect(warn - REACT).toBeGreaterThan((BITE_R + FIGURE_R) / WALK_SPEED + 0.05);
  });

  it('sweeps and charges in turn, and rears up after each', () => {
    const { r, w } = awake();
    const seen: string[] = [];
    r.onWarn = (what) => seen.push(what);
    let rears = 0;
    r.onRear = () => rears++;
    // A figure that keeps a little way off, walking slowly round him.
    const f = w.figure as { x: number; y: number; vx: number; vy: number };
    for (let i = 0; i < 30 / DT && seen.length < 4; i++) r.update(DT, w);
    expect(seen.slice(0, 4)).toEqual(['charge', 'sweep', 'charge', 'sweep']);
    expect(rears).toBeGreaterThanOrEqual(3);
    expect(onIsle6Ground(f.x, f.y)).toBe(true);
  });

  it('sweeps twice once he is angry, there and back', () => {
    const { r, w } = awake();
    r.hp = LAND_HP / 2;
    const seen: string[] = [];
    r.onWarn = (what) => seen.push(what);
    run(r, w, 30, () => seen.filter((s) => s === 'sweep').length >= 2);
    const i = seen.indexOf('sweep');
    expect(seen[i + 1]).toBe('sweep');
  });

  it('catches whoever is in his fan or on his line, and tells the game who else was', () => {
    const { r, w } = awake();
    let hits = 0;
    const blows: ((x: number, y: number, r: number) => boolean)[] = [];
    r.onHit = () => hits++;
    r.onBlow = (h) => blows.push(h);
    run(r, w, 30, () => blows.length >= 2);
    // A figure standing still is caught by both.
    expect(hits).toBe(2);
    const f = w.figure as { x: number; y: number };
    expect(blows.every((b) => b(f.x, f.y, 6))).toBe(true);
    expect(blows.every((b) => !b(f.x + 600, f.y + 600, 6))).toBe(true);
  });

  it('beaten, slumps, backs off into the sea and is gone, and stays gone', () => {
    const { r, w } = reared();
    let beaten = 0;
    r.onBeaten = () => beaten++;
    r.hit(LAND_HP);
    expect(r.state).toBe('beaten');
    expect(r.awake).toBe(false);
    run(r, w, BEATEN_T + 0.05);
    expect(beaten).toBe(1);
    expect(r.state).toBe('flee');
    run(r, w, 15, () => r.state === 'gone');
    expect(r.state).toBe('gone');
    const a = Math.atan2(r.y - ISLE6.y, r.x - ISLE6.x);
    expect(Math.hypot(r.x - ISLE6.x, r.y - ISLE6.y)).toBeGreaterThan(shoreR(a));
    r.reset();
    expect(r.state).toBe('gone');
    const g = new LandReaper();
    g.beatenForGood();
    run(g, baseWorld({ figure: inland(40) }), 2);
    expect(g.state).toBe('gone');
  });

  it('at a jar of honey stops dead and shakes, runs into the sea, and is back asleep when the figure leaves: no win', () => {
    const asleep = new LandReaper();
    expect(asleep.scare()).toBe(false);
    const { r, w } = awake();
    let beaten = 0;
    r.onBeaten = () => beaten++;
    r.hp = 3;
    expect(r.scare()).toBe(true);
    expect([r.state, r.awake, r.fan, r.dash]).toEqual(['shy', false, null, null]);
    run(r, w, SHY_T + 0.05);
    expect(r.state).toBe('run');
    run(r, w, 15, () => r.state === 'away');
    expect(r.state).toBe('away');
    const a = Math.atan2(r.y - ISLE6.y, r.x - ISLE6.x);
    expect(Math.hypot(r.x - ISLE6.x, r.y - ISLE6.y)).toBeGreaterThan(shoreR(a));
    // Away while the figure stays, whatever it does.
    w.figure = inland(10);
    run(r, w, 5);
    expect(r.state).toBe('away');
    expect(beaten).toBe(0);
    // The figure leaves his ground: he is back by his nest, asleep and whole.
    w.figure = null;
    run(r, w, 0.1);
    expect([r.state, r.hp, r.x, r.y]).toEqual(['sleep', LAND_HP, REST.x, REST.y]);
  });

  it('back for a rematch, from the tester panel: asleep by his nest again, whole, and he wakes as before', () => {
    const g = new LandReaper();
    g.beatenForGood();
    g.rematch();
    expect(g.state).toBe('sleep');
    expect([g.x, g.y]).toEqual([REST.x, REST.y]);
    expect(g.hp).toBe(LAND_HP);
    run(g, baseWorld({ figure: inland(WAKE_R - 30) }), 1);
    expect(g.awake).toBe(true);
  });

  it('draws in every state without a fault', () => {
    const r = new LandReaper();
    const w = baseWorld({ figure: inland(WAKE_R - 30) });
    const v = fakeView();
    const states = new Set<string>();
    const draw = () => {
      r.drawBody(v.v);
      r.draw(v.v, 'surface');
      states.add(r.state);
    };
    draw();
    for (let i = 0; i < 60 / DT && r.state !== 'gone'; i++) {
      r.update(DT, w);
      draw();
      if (r.state === 'prowl' && states.has('rear') && states.has('sweep')) r.hit(LAND_HP, true);
    }
    expect([...states].sort()).toEqual(
      [
        'beaten',
        'close',
        'coil',
        'crouch',
        'dash',
        'drop',
        'flee',
        'gone',
        'prowl',
        'rear',
        'rise',
        'sleep',
        'sweep',
      ].sort(),
    );
    expect(v.calls.fill ?? 0).toBeGreaterThan(100);
  });
});

/** How long a person takes to see a fan or a line, and move; and how much that varies, each way. */
const REACT = 0.33;
const SPREAD = 0.25;

function inFan(r: LandReaper, x: number, y: number): boolean {
  const f = r.fan;
  return !!f && inSwept(f, f.a1, x, y, FIGURE_R + 3, REACH);
}
function offLine(x: number, y: number, d: { x0: number; y0: number; x1: number; y1: number }) {
  const vx = d.x1 - d.x0;
  const vy = d.y1 - d.y0;
  const l2 = vx * vx + vy * vy || 1;
  const k = Math.max(0, Math.min(1, ((x - d.x0) * vx + (y - d.y0) * vy) / l2));
  return Math.hypot(x - (d.x0 + vx * k), y - (d.y0 + vy * k));
}

/**
 * A person who walks up to his nest and fights him on foot: keeps about a throw from him and otherwise
 * stands. A reaction time after a fan shows (quicker or slower each time, or never, with none) it walks the
 * quickest way out of it that stays on the sand, or, with away, straight away from his head, as a child
 * might; a reaction time after a line shows it steps off it to the side it is on. It throws whenever he is
 * reared up and in reach, a third of a second after he goes up. With the warlock, a bolt every so often
 * while he is up and in the warlock's reach. Wins out of 30, the hearts a fight costs, and how long a win takes.
 */
function fights(
  level: number,
  warlock: boolean,
  react: number | null = REACT,
  away = false,
): { wins: number; hearts: number; secs: number } {
  const sp = spearAt(level);
  if (!sp) throw new Error('spear');
  const r = rng(level * 7 + (warlock ? 1 : 0) + (away ? 3 : 0));
  const keep = Math.min(sp.range - 15, 90);
  let wins = 0;
  let lost = 0;
  let time = 0;
  for (let n = 0; n < 30; n++) {
    const a = new LandReaper();
    const spears = new Spears();
    const fig = inland(150);
    fig.x += r() * 20;
    fig.y += r() * 20;
    const w: World = baseWorld({ figure: fig });
    let hearts = 3;
    let invuln = 0;
    let ready = 0;
    let cast = CAST_EVERY;
    let warnAt = -1;
    let late = 0;
    let dodge: { x: number; y: number } | null = null;
    let upAt = -1;
    a.onHit = () => {
      if (invuln > 0) return;
      hearts--;
      invuln = 1.2;
    };
    // Close enough to the nest that he wakes at once.
    a.update(DT, w);
    let t = 0;
    for (; t < 300 && hearts > 0 && a.awake; t += DT) {
      invuln -= DT;
      const warning = a.state === 'coil' || a.state === 'crouch';
      if (warning && warnAt < 0) {
        warnAt = t;
        dodge = null;
        late = react === null ? 0 : react + (r() - 0.5) * 2 * SPREAD;
      }
      if (!warning && a.state !== 'sweep' && a.state !== 'dash') warnAt = -1;
      const dx = fig.x - a.x;
      const dy = fig.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      let vx = 0;
      let vy = 0;
      if (d > keep + 12 || d < keep - 12) {
        const k = d > keep ? -1 : 1;
        vx = (dx / d) * k;
        vy = (dy / d) * k;
      }
      if (react !== null && warnAt >= 0 && t - warnAt >= late) {
        if (a.fan && inFan(a, fig.x, fig.y)) {
          if (!dodge) {
            const f = a.fan;
            const mid = Math.atan2(
              Math.sin(f.a0) + Math.sin(f.a1),
              Math.cos(f.a0) + Math.cos(f.a1),
            );
            const ways = away
              ? [Math.atan2(fig.y - f.y, fig.x - f.x)]
              : [mid, mid + Math.PI / 2, mid - Math.PI / 2, mid + Math.PI];
            let best = Number.POSITIVE_INFINITY;
            for (const ang of ways) {
              const u = { x: Math.cos(ang), y: Math.sin(ang) };
              for (let s = 0; s < 220; s += 2) {
                if (!walkable(fig.x + u.x * s, fig.y + u.y * s, 0)) break;
                if (!inFan(a, fig.x + u.x * s, fig.y + u.y * s)) {
                  if (s < best) {
                    best = s;
                    dodge = u;
                  }
                  break;
                }
              }
            }
          }
          if (dodge) {
            vx = dodge.x;
            vy = dodge.y;
          }
        } else if (a.dash && offLine(fig.x, fig.y, a.dash) < BITE_R + FIGURE_R + 8) {
          if (!dodge) {
            const ln = a.dash;
            const al = Math.hypot(ln.x1 - ln.x0, ln.y1 - ln.y0) || 1;
            let s1 = { x: -(ln.y1 - ln.y0) / al, y: (ln.x1 - ln.x0) / al };
            if (s1.x * (fig.x - ln.x0) + s1.y * (fig.y - ln.y0) < 0) s1 = { x: -s1.x, y: -s1.y };
            if (!walkable(fig.x + s1.x * 30, fig.y + s1.y * 30, 0)) s1 = { x: -s1.x, y: -s1.y };
            dodge = s1;
          }
          vx = dodge.x;
          vy = dodge.y;
        } else if (a.fan || a.dash) {
          vx = 0;
          vy = 0;
        }
      }
      const nn = Math.hypot(vx, vy);
      const before = { x: fig.x, y: fig.y };
      if (nn > 0.01) walkStep(fig, (vx / nn) * WALK_SPEED * DT, (vy / nn) * WALK_SPEED * DT, 0);
      fig.vx = (fig.x - before.x) / DT;
      fig.vy = (fig.y - before.y) / DT;
      if (!walkable(fig.x, fig.y, 0)) throw new Error('off the ground');
      if (a.open && upAt < 0) upAt = t;
      if (!a.open) upAt = -1;
      if (a.open && t - upAt >= 1 / 3 && t >= ready && d <= sp.range) {
        ready = t + sp.reload;
        spears.launch(fig.x, fig.y, 20, a, 55, () => a.hit(sp.power, true));
      }
      if (warlock) {
        cast -= DT;
        if (cast <= 0 && a.open && d < CAST_RANGE + 20) {
          cast = CAST_EVERY;
          a.hit(1, true);
        }
      }
      a.update(DT, w);
      spears.update(DT, w);
    }
    if (a.state === 'beaten' || a.state === 'flee' || a.state === 'gone') {
      wins++;
      time += t;
    }
    lost += 3 - Math.max(0, hearts);
  }
  return { wins, hearts: lost / 30, secs: wins ? time / wins : 0 };
}

describe('fighting the Reaper on land', () => {
  it('is won every time by stepping out of the fans and off the lines, at a fifth of a heart, with the barbed spear and the warlock', () => {
    const f = fights(3, true);
    expect(f.wins).toBe(30);
    expect(f.hearts).toBeLessThan(0.4);
    expect(f.secs).toBeGreaterThan(20);
    expect(f.secs).toBeLessThan(40);
    // A child who just runs straight away from him does as well.
    expect(fights(3, true, REACT, true).wins).toBe(30);
  });

  it('costs a slower one under a heart, and beats one who never minds the warnings', () => {
    const slow = fights(3, true, 0.5);
    expect(slow.wins).toBeGreaterThanOrEqual(28);
    expect(slow.hearts).toBeLessThan(1.2);
    expect(fights(3, true, null).wins).toBeLessThanOrEqual(2);
  });

  it('is won alone, with the harpoon thrown as a spear, and with the long spear more slowly', () => {
    expect(fights(3, false).wins).toBe(30);
    expect(fights(4, true).wins).toBe(30);
    const long = fights(2, true);
    expect(long.wins).toBeGreaterThanOrEqual(24);
    expect(long.secs).toBeGreaterThan(fights(3, true).secs);
  });
});
