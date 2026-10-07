import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { spearAt } from '../../src/data/spear';
import type { World } from '../../src/entities/entity';
import {
  CAMP,
  CLEAR_RETURN,
  LEASH,
  MONKEY_HP,
  MONKEYS,
  type Monkey,
  Monkeys,
} from '../../src/entities/monkeys';
import { Spears } from '../../src/entities/spears';
import { WALK_SPEED, walkable, walkStep } from '../../src/entities/walker';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
type Figure = { x: number; y: number; vx: number; vy: number };
const figure = (x: number, y: number): Figure => ({ x, y, vx: 0, vy: 0 });

/** Walk the figure toward a point at walking pace, as the game would. */
function walkTo(f: Figure, tx: number, ty: number): void {
  const dx = tx - f.x;
  const dy = ty - f.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) {
    f.vx = 0;
    f.vy = 0;
    return;
  }
  f.vx = (dx / d) * WALK_SPEED;
  f.vy = (dy / d) * WALK_SPEED;
  walkStep(f, f.vx * DT, f.vy * DT, 5);
}

describe('the monkey camp', () => {
  it('keeps its monkeys about their huts, on dry land, while nobody comes', () => {
    const e = new Monkeys();
    const w = baseWorld({ rng: rng(2) });
    for (let i = 0; i < 60 / DT; i++) {
      e.update(DT, w);
      for (const m of e.list) {
        expect(walkable(m.x, m.y, 5)).toBe(true);
        expect(Math.hypot(m.x - CAMP.x, m.y - CAMP.y)).toBeLessThan(80);
        expect(m.state).toBe('idle');
      }
    }
  });

  it('bonks a figure that stands in the camp, again and again', () => {
    const e = new Monkeys();
    const f = figure(CAMP.x + 30, CAMP.y);
    const w: World = baseWorld({ rng: rng(2), figure: f });
    let bonks = 0;
    let spotted = 0;
    e.onBonk = () => bonks++;
    e.onSpot = () => spotted++;
    for (let i = 0; i < 6 / DT; i++) e.update(DT, w);
    expect(spotted).toBeGreaterThan(0);
    expect(bonks).toBeGreaterThanOrEqual(3);
  });

  it('cannot catch a figure that walks away, and gives up past its leash', () => {
    const e = new Monkeys();
    const f = figure(CAMP.x + 60, CAMP.y - 60);
    const w: World = baseWorld({ rng: rng(2), figure: f });
    let bonks = 0;
    e.onBonk = (by) => {
      if (by === 'bonk') bonks++;
    };
    const away = { x: CAMP.x + 400, y: CAMP.y - 400 };
    for (let i = 0; i < 8 / DT; i++) {
      walkTo(f, away.x, away.y);
      e.update(DT, w);
    }
    expect(bonks).toBe(0);
    expect(Math.hypot(f.x - CAMP.x, f.y - CAMP.y)).toBeGreaterThan(LEASH);
    for (let i = 0; i < 1 / DT; i++) e.update(DT, w);
    for (const m of e.list) expect(m.state).toBe('idle');
  });

  it('takes two hits to beat a monkey, or one with a barbed spear; it drops its mask and runs', () => {
    const e = new Monkeys();
    const beaten: Monkey[] = [];
    e.onBeat = (m) => beaten.push(m);
    const [a, b] = e.list as [Monkey, Monkey];
    e.hit(a, 1, CAMP.x + 100, CAMP.y);
    expect(a.state).toBe('chase');
    expect(a.hp).toBe(MONKEY_HP - 1);
    e.hit(a, 1, CAMP.x + 100, CAMP.y);
    expect(a.state).toBe('flee');
    e.hit(b, 2, CAMP.x + 100, CAMP.y);
    expect(b.state).toBe('flee');
    expect(beaten).toEqual([a, b]);
  });

  it('opens its chest once when every monkey is beaten, and fills again later', () => {
    const e = new Monkeys();
    let clears = 0;
    e.onClear = () => clears++;
    for (const m of e.list) e.hit(m, 2, CAMP.x + 100, CAMP.y);
    expect(clears).toBe(1);
    expect(e.cleared).toBe(true);
    const w = baseWorld({ rng: rng(2) });
    for (let i = 0; i < (CLEAR_RETURN + 1) / DT; i++) e.update(DT, w);
    expect(e.cleared).toBe(false);
    expect(e.list.filter((m) => m.state === 'idle')).toHaveLength(MONKEYS);
  });

  it('is beaten by a person with the first spear who keeps moving and throws, without being bonked out', () => {
    const sp = spearAt(1);
    if (!sp) throw new Error('spear');
    let cleanWins = 0;
    for (let run = 0; run < 20; run++) {
      const e = new Monkeys();
      const spears = new Spears();
      const f = figure(CAMP.x + 150, CAMP.y - 60);
      const w: World = baseWorld({ rng: rng(run + 1), figure: f });
      let hurt = 0;
      let ready = 0;
      let t = 0;
      e.onBonk = () => {
        hurt++;
      };
      for (; t < 60 && !e.cleared; t += DT) {
        // Back off from the nearest monkey when it is close; otherwise edge toward the camp. Throw when ready.
        const near = e.nearest(f.x, f.y, 60);
        if (near) walkTo(f, f.x + (f.x - near.x), f.y + (f.y - near.y));
        else walkTo(f, CAMP.x + 90, CAMP.y - 40);
        const target = e.nearest(f.x, f.y, sp.range);
        if (target && t >= ready) {
          ready = t + sp.reload + 1 / 3;
          spears.launch(f.x, f.y, 20, target, 10, () => e.hit(target, sp.power, f.x, f.y));
        }
        e.update(DT, w);
        spears.update(DT, w);
      }
      if (e.cleared && hurt < 3) cleanWins++;
    }
    expect(cleanWins).toBeGreaterThanOrEqual(15);
  });

  it('draws coconuts in the air and each monkey on request', () => {
    const e = new Monkeys();
    e.nuts.push({ x0: 0, y0: 0, tx: 50, ty: 0, t: 0.1, dur: 0.4 });
    const fake = fakeView();
    e.draw(fake.v, 'air');
    expect(fake.calls.arc).toBe(1);
    e.drawMonkey(fake.v, e.list[0] as Monkey, 0);
    expect(fake.calls.isoEllipse).toBe(2);
  });
});
