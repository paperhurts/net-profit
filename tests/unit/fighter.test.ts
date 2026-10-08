import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { spearAt } from '../../src/data/spear';
import type { World } from '../../src/entities/entity';
import {
  BLUE,
  CROUCH,
  FALL,
  Fighter,
  type FighterSpec,
  GREEN,
  RED,
  SWORDSMAN,
} from '../../src/entities/fighter';
import { Monkeys } from '../../src/entities/monkeys';
import { Spears } from '../../src/entities/spears';
import { WALK_SPEED, walkable } from '../../src/entities/walker';
import { CAGE, DEMON, HALL, ROOMS, type Room } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
const hall = ROOMS[HALL] as Room;
const pit = ROOMS[DEMON] as Room;
const sword = () => new Fighter(SWORDSMAN, hall, { x: hall.x - 40, y: hall.y - 40 });
const figureAt = (x: number, y: number) => ({ x, y, vx: 0, vy: 0 });

describe('the swordsman', () => {
  it('waits until someone comes into his hall, then wakes once', () => {
    const f = sword();
    let woke = 0;
    f.onWake = () => woke++;
    const w: World = baseWorld({ figure: null });
    for (let i = 0; i < 30; i++) f.update(DT, w);
    expect(f.state).toBe('wait');
    w.figure = figureAt(hall.x + 60, hall.y + 60);
    for (let i = 0; i < 30; i++) f.update(DT, w);
    expect(woke).toBe(1);
    expect(f.up).toBe(true);
    // The figure leaves: he is back where he started, waiting.
    w.figure = null;
    f.update(DT, w);
    expect(f.state).toBe('wait');
  });

  it('walks at a figure slower than it walks, raises his sword, then slashes one that stands still', () => {
    expect(SWORDSMAN.speed).toBeLessThan(WALK_SPEED);
    const f = sword();
    const w: World = baseWorld({ figure: figureAt(hall.x + 10, hall.y + 10) });
    const states: string[] = [];
    let hits = 0;
    f.onHit = () => hits++;
    for (let i = 0; i < 8 / DT && hits === 0; i++) {
      f.update(DT, w);
      states.push(f.state);
    }
    expect(hits).toBe(1);
    // The warning came first, for long enough to step away.
    expect(states.filter((s) => s === 'windup').length * DT).toBeGreaterThanOrEqual(
      SWORDSMAN.windup - DT,
    );
  });

  it('misses a figure that steps away while his sword is up', () => {
    const f = sword();
    const fig = figureAt(hall.x + 10, hall.y + 10);
    const w: World = baseWorld({ figure: fig });
    let hits = 0;
    f.onHit = () => hits++;
    for (let i = 0; i < 6 / DT; i++) {
      if (f.state === 'windup') {
        const d = Math.hypot(fig.x - f.x, fig.y - f.y) || 1;
        const nx = fig.x + ((fig.x - f.x) / d) * WALK_SPEED * DT;
        const ny = fig.y + ((fig.y - f.y) / d) * WALK_SPEED * DT;
        if (walkable(nx, ny, 0)) {
          fig.x = nx;
          fig.y = ny;
        }
      }
      f.update(DT, w);
    }
    expect(hits).toBe(0);
  });

  it('blocks the first spear, once, and takes the rest', () => {
    const f = sword();
    let blocks = 0;
    f.onBlock = () => blocks++;
    f.update(DT, baseWorld({ figure: figureAt(hall.x, hall.y + 60) }));
    expect(f.hit(2)).toBe(true);
    expect(f.hp).toBe(SWORDSMAN.hp);
    expect(f.hit(2)).toBe(false);
    expect(f.hit(2)).toBe(false);
    expect(f.hp).toBe(SWORDSMAN.hp - 4);
    expect(blocks).toBe(1);
  });

  it('crouches and dashes at a figure that keeps its distance', () => {
    const f = sword();
    const w: World = baseWorld({ figure: figureAt(hall.x + 90, hall.y + 90) });
    f.x = hall.x - 80;
    f.y = hall.y - 80;
    const seen = new Set<string>();
    for (let i = 0; i < 3 / DT; i++) {
      f.update(DT, w);
      seen.add(f.state);
    }
    expect(seen.has('crouch')).toBe(true);
    expect(seen.has('dash')).toBe(true);
    expect(CROUCH).toBeGreaterThan(0.3);
  });

  it('falls when beaten and says so once', () => {
    const f = sword();
    let beaten = 0;
    f.onBeaten = () => beaten++;
    const w: World = baseWorld({ figure: figureAt(hall.x, hall.y + 60) });
    f.update(DT, w);
    f.hit(1);
    f.hit(99);
    expect(f.state).toBe('fall');
    for (let i = 0; i < (FALL + 0.5) / DT; i++) f.update(DT, w);
    expect(f.state).toBe('gone');
    expect(beaten).toBe(1);
    expect(f.hit(5)).toBe(false);
  });
});

describe('the three demons', () => {
  it('are little: a couple of barbed hits each, the red and green with one block, the blue with none', () => {
    const barbed = spearAt(3)?.power ?? 0;
    for (const sp of [RED, BLUE, GREEN]) {
      expect(sp.hp / barbed).toBeLessThanOrEqual(2);
      expect(sp.scale).toBeLessThan(1);
    }
    expect(RED.block && GREEN.block && !BLUE.block).toBe(true);
    expect(RED.reach > 0 && GREEN.reach > 0 && BLUE.reach === 0).toBe(true);
    expect(BLUE.summon > 0 && GREEN.summon > 0 && RED.summon === 0).toBe(true);
  });

  it('the blue one keeps its distance and calls up two monkeys, and two more only once those are beaten', () => {
    const camp = new Monkeys(pit, 0, 0, false);
    const blue = new Fighter(BLUE, pit, { x: pit.x + 30, y: pit.y - 30 });
    blue.onSummon = (x, y) => [camp.summon(x + 10, y), camp.summon(x - 10, y)];
    const fig = figureAt(pit.x + 40, pit.y + 40);
    const w: World = baseWorld({ figure: fig });
    let near = Infinity;
    for (let i = 0; i < 8 / DT; i++) {
      blue.update(DT, w);
      if (i > 2 / DT) near = Math.min(near, Math.hypot(blue.x - fig.x, blue.y - fig.y));
    }
    expect(near).toBeGreaterThan(BLUE.keep * 0.6);
    expect(camp.list).toHaveLength(2);
    // Beat the pair, and after a while there is another.
    const first = [...camp.list];
    for (const m of first) camp.hit(m, 9, m.x + 20, m.y);
    for (let i = 0; i < (BLUE.summon + 1) / DT; i++) {
      blue.update(DT, w);
      camp.update(DT, w);
    }
    expect(camp.list.filter((m) => m.state === 'chase' || m.state === 'idle')).toHaveLength(2);
    // The beaten pair, gone, never comes back on its own.
    for (let i = 0; i < 100 / DT; i++) camp.update(DT, baseWorld({ figure: null }));
    for (const m of first) expect(m.state).toBe('gone');
  });

  it('keep the cage out of reach: it stands in the way at the back of their dimension', () => {
    expect(walkable(CAGE.x, CAGE.y, 0)).toBe(false);
    expect(Math.hypot(CAGE.x - pit.x, CAGE.y - pit.y)).toBeLessThan(pit.r - CAGE.r - 20);
  });
});

/** How long a person takes to see a sword go up, or a crouch, and move. */
const REACT = 0.3;

/**
 * A person who keeps away and throws: backs off whoever is nearest when it gets close, steps
 * away a reaction time after a sword goes up or a crouch starts, drifts round otherwise, keeps off the walls, and
 * throws at the nearest thing in reach a third of a second late. Wins out of 30, and the hearts
 * a fight costs on average.
 */
function fights(
  level: number,
  room: Room,
  make: () => { fighters: Fighter[]; camp: Monkeys | null },
): { wins: number; hearts: number } {
  const sp = spearAt(level);
  if (!sp) throw new Error('spear');
  const r = rng(level * 13 + room.x);
  let wins = 0;
  let lost = 0;
  for (let run = 0; run < 30; run++) {
    const { fighters, camp } = make();
    const spears = new Spears();
    const fig = figureAt(room.x + room.r * 0.4, room.y + room.r * 0.4);
    const w: World = baseWorld({ figure: fig });
    let hearts = 3;
    let invuln = 0;
    let ready = 0;
    let side = run % 2 ? 1 : -1;
    let flip = 1.5 + r() * 1;
    const hurt = () => {
      if (invuln > 0) return;
      hearts--;
      invuln = 1.2;
    };
    for (const f of fighters) f.onHit = hurt;
    if (camp) camp.onBonk = hurt;
    let t = 0;
    for (; t < 180 && hearts > 0 && fighters.some((f) => f.state !== 'gone'); t += DT) {
      invuln -= DT;
      flip -= DT;
      if (flip <= 0) {
        side = -side;
        flip = 1.5 + r();
      }
      const threats: { x: number; y: number; f?: Fighter }[] = [
        ...fighters.filter((f) => f.up).map((f) => ({ x: f.x, y: f.y, f })),
        ...(camp?.list.filter((m) => m.state === 'chase') ?? []),
      ];
      let near = threats[0];
      let nd = Infinity;
      for (const q of threats) {
        const d = Math.hypot(q.x - fig.x, q.y - fig.y);
        if (d < nd) {
          nd = d;
          near = q;
        }
      }
      let vx = 0;
      let vy = 0;
      if (near) {
        const dx = fig.x - near.x;
        const dy = fig.y - near.y;
        const d = Math.hypot(dx, dy) || 1;
        // A sword going up, or a crouch, is seen a reaction time after it starts.
        const danger =
          near.f && (near.f.state === 'windup' || near.f.state === 'crouch') && near.f.t >= REACT;
        if (d < 70 || danger) {
          vx = dx / d + (-dy / d) * side * 0.6;
          vy = dy / d + (dx / d) * side * 0.6;
        } else {
          vx = (-dy / d) * side;
          vy = (dx / d) * side;
        }
      }
      const ex = fig.x - room.x;
      const ey = fig.y - room.y;
      const e = Math.hypot(ex, ey);
      if (e > room.r - 45) {
        vx -= (ex / e) * 1.5;
        vy -= (ey / e) * 1.5;
      }
      const n = Math.hypot(vx, vy) || 1;
      const nx = fig.x + (vx / n) * WALK_SPEED * DT;
      const ny = fig.y + (vy / n) * WALK_SPEED * DT;
      fig.vx = 0;
      fig.vy = 0;
      if (walkable(nx, ny, 0)) {
        fig.vx = (nx - fig.x) / DT;
        fig.vy = (ny - fig.y) / DT;
        fig.x = nx;
        fig.y = ny;
      }
      // Throw at the nearest thing in reach.
      if (t >= ready) {
        let tgt: { x: number; y: number } | null = null;
        let td = sp.range;
        for (const f of fighters) {
          if (!f.up) continue;
          const d = Math.hypot(f.x - fig.x, f.y - fig.y);
          if (d <= td) {
            td = d;
            tgt = f;
          }
        }
        const m = camp?.nearest(fig.x, fig.y, sp.range);
        if (m && Math.hypot(m.x - fig.x, m.y - fig.y) < td) tgt = m;
        if (tgt) {
          ready = t + sp.reload + 1 / 3;
          const target = tgt;
          spears.launch(fig.x, fig.y, 20, target, 12, () => {
            if (target instanceof Fighter) target.hit(sp.power);
            else if (camp) camp.hit(target as never, sp.power, fig.x, fig.y);
          });
        }
      }
      for (const f of fighters) f.update(DT, w);
      camp?.update(DT, w);
      spears.update(DT, w);
    }
    if (hearts > 0 && fighters.every((f) => f.state === 'gone')) wins++;
    lost += 3 - Math.max(0, hearts);
  }
  return { wins, hearts: lost / 30 };
}

const theSwordsman = () => ({ fighters: [sword()], camp: null });
const theDemons = () => {
  const camp = new Monkeys(pit, 0, 0, false);
  const fighters = (
    [
      [RED, -10, 5],
      [BLUE, 35, -35],
      [GREEN, -45, -15],
    ] as [FighterSpec, number, number][]
  ).map(([spec, dx, dy]) => {
    const f = new Fighter(spec, pit, { x: pit.x + dx, y: pit.y + dy });
    f.onSummon = (x, y) => [camp.summon(x + 14, y + 10), camp.summon(x - 14, y + 10)];
    return f;
  });
  return { fighters, camp };
};

describe('the fights, for a person who keeps away and throws', () => {
  it('the swordsman costs a good player hearts with any spear, and beats some with the first', () => {
    const first = fights(1, hall, theSwordsman);
    const barbed = fights(3, hall, theSwordsman);
    expect(first.wins).toBeGreaterThanOrEqual(20);
    expect(first.wins).toBeLessThanOrEqual(29);
    expect(first.hearts).toBeGreaterThan(1);
    expect(barbed.wins).toBeGreaterThanOrEqual(28);
    expect(barbed.hearts).toBeGreaterThan(0.25);
  });

  it('the three demons and their monkeys want the barbed spear', () => {
    expect(fights(1, pit, theDemons).wins).toBeLessThanOrEqual(12);
    expect(fights(2, pit, theDemons).wins).toBeGreaterThanOrEqual(8);
    expect(fights(3, pit, theDemons).wins).toBeGreaterThanOrEqual(26);
  });
});

describe('drawing', () => {
  it('draws every look, standing, raising a sword and blocking, and nothing once gone', () => {
    for (const spec of [SWORDSMAN, RED, BLUE, GREEN]) {
      const f = new Fighter(spec, hall, { x: hall.x, y: hall.y });
      const v = fakeView();
      f.drawBody(v.v);
      expect(v.calls.fill ?? 0).toBeGreaterThan(5);
      f.state = 'windup';
      f.blockT = 0.3;
      f.drawBody(v.v);
      f.state = 'gone';
      const after = fakeView();
      f.drawBody(after.v);
      expect((after.calls.fill ?? 0) + (after.calls.stroke ?? 0)).toBe(0);
    }
  });
});
