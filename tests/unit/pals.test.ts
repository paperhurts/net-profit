import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import {
  BONES_HP,
  HEAL_DELAY,
  HEALS,
  MAX_HEALS,
  PAL_BLINK,
  PAL_HEEL,
  PAL_HP,
  Pal,
  POWER,
  RAISE_EVERY,
  SWING_EVERY,
} from '../../src/entities/pals';
import { LANDING, WALK_SPEED, walkable } from '../../src/entities/walker';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const figureAt = (x: number, y: number) => ({ x, y, vx: 0, vy: 0 });

describe('the healer cat and the Cthulhu warrior', () => {
  it('are nowhere until freed, then come beside the figure ashore and ride the boat aboard', () => {
    for (const kind of ['cat', 'warrior'] as const) {
      const p = new Pal(kind);
      const w: World = baseWorld({ figure: figureAt(LANDING.x, LANDING.y) });
      p.update(DT, w);
      expect(p.shown).toBe(false);
      p.free = true;
      p.update(DT, w);
      expect(p.shown).toBe(true);
      expect(Math.hypot(p.x - LANDING.x, p.y - LANDING.y)).toBeLessThan(30);
      expect(walkable(p.x, p.y, 99)).toBe(true);
      w.figure = null;
      p.update(DT, w);
      expect(p.shown).toBe(false);
    }
  });

  it('keep at the heel as the figure walks, and pop over when left far behind', () => {
    const p = new Pal('warrior');
    p.free = true;
    const f = figureAt(LANDING.x, LANDING.y);
    const w: World = baseWorld({ figure: f });
    p.update(DT, w);
    for (let i = 0; i < 1.5 / DT; i++) {
      f.x -= WALK_SPEED * DT;
      p.update(DT, w);
      expect(Math.hypot(f.x - p.x, f.y - p.y)).toBeLessThan(PAL_BLINK);
    }
    for (let i = 0; i < 2 / DT; i++) p.update(DT, w);
    expect(Math.hypot(f.x - p.x, f.y - p.y)).toBeLessThan(PAL_HEEL.warrior + 2);
    f.x -= 500;
    p.update(DT, w);
    expect(Math.hypot(f.x - p.x, f.y - p.y)).toBeLessThan(30);
  });

  it('go for what is near the figure and hit it up close: the warrior hard, the cat lightly', () => {
    for (const kind of ['cat', 'warrior'] as const) {
      const p = new Pal(kind);
      p.free = true;
      const f = figureAt(LANDING.x - 60, LANDING.y);
      const w: World = baseWorld({ figure: f });
      p.update(DT, w);
      let dealt = 0;
      const foe = { x: f.x - 40, y: f.y, hit: (n: number) => (dealt += n) };
      p.findTarget = (x, y, r) => (Math.hypot(foe.x - x, foe.y - y) <= r ? foe : null);
      for (let i = 0; i < (SWING_EVERY[kind] * 3 + 1.5) / DT; i++) p.update(DT, w);
      expect(dealt).toBeGreaterThanOrEqual(POWER[kind] * 3);
    }
    expect(POWER.warrior).toBe(2);
    expect(POWER.cat).toBe(1);
  });

  it('wear out after five hits, rest, and are back whole at the next landing', () => {
    const p = new Pal('cat');
    p.free = true;
    const w: World = baseWorld({ figure: figureAt(LANDING.x, LANDING.y) });
    p.update(DT, w);
    let out = 0;
    p.onHurt = (o) => {
      if (o) out++;
    };
    for (let i = 0; i < PAL_HP; i++) {
      expect(p.hurt()).toBe(true);
      expect(p.hurt()).toBe(false);
      p.invuln = 0;
    }
    expect(out).toBe(1);
    expect(p.shown).toBe(false);
    w.figure = null;
    p.update(DT, w);
    w.figure = figureAt(LANDING.x, LANDING.y);
    p.update(DT, w);
    p.update(DT, w);
    expect(p.shown).toBe(true);
    expect(p.hp).toBe(PAL_HP);
  });

  it('the cat heals twice a fight, a moment after a heart is lost, more when fed, and the warrior never', () => {
    const cat = new Pal('cat');
    cat.free = true;
    const w: World = baseWorld({ figure: figureAt(LANDING.x, LANDING.y) });
    cat.update(DT, w);
    let healed = 0;
    cat.onHeal = () => healed++;
    for (let k = 0; k < 3; k++) {
      cat.noticeHurt();
      for (let i = 0; i < (HEAL_DELAY + 0.1) / DT; i++) cat.update(DT, w);
    }
    expect(healed).toBe(HEALS);
    cat.newFight();
    expect(cat.heals).toBe(HEALS);
    while (cat.feed());
    expect(cat.heals).toBe(MAX_HEALS);
    const war = new Pal('warrior');
    war.free = true;
    war.update(DT, w);
    let wh = 0;
    war.onHeal = () => wh++;
    war.noticeHurt();
    for (let i = 0; i < 2 / DT; i++) war.update(DT, w);
    expect(wh).toBe(0);
    expect(war.feed()).toBe(false);
  });

  it('draw ashore, hurt and petted, and aboard', () => {
    for (const kind of ['cat', 'warrior'] as const) {
      const p = new Pal(kind);
      const v = fakeView();
      p.free = true;
      p.drawAboard(v.v, { x: 0, y: 0, h: 0.3 }, 1.6);
      const w: World = baseWorld({ figure: figureAt(LANDING.x, LANDING.y) });
      p.update(DT, w);
      p.hurt();
      p.invuln = 0;
      p.pet();
      p.drawBody(v.v);
      expect(v.calls.fill ?? 0).toBeGreaterThan(5);
    }
  });
});

describe("the Forgotten One's bones, on your side", () => {
  it('come where he fell, hit for two, raise a ghost and a skeleton once a fight is on, and not again while those stand', () => {
    const p = new Pal('bones');
    expect(p.hp).toBe(BONES_HP);
    const f = figureAt(LANDING.x - 60, LANDING.y);
    const w: World = baseWorld({ figure: f });
    p.come(f.x + 10, f.y);
    expect(p.free).toBe(true);
    expect(p.shown).toBe(true);
    let dealt = 0;
    const foe = { x: f.x - 40, y: f.y, hit: (n: number) => (dealt += n) };
    p.findTarget = (x, y, r) => (Math.hypot(foe.x - x, foe.y - y) <= r ? foe : null);
    const raised: [number, number][] = [];
    let up = 0;
    p.canRaise = () => up === 0;
    p.onRaise = (x, y) => {
      raised.push([x, y]);
      up = 2;
    };
    for (let i = 0; i < (SWING_EVERY.bones * 2 + 1) / DT; i++) p.update(DT, w);
    expect(dealt).toBeGreaterThanOrEqual(POWER.bones * 2);
    expect(POWER.bones).toBe(2);
    expect(raised).toHaveLength(1);
    // While its two stand it raises no more; once they are gone, again after a while.
    for (let i = 0; i < (RAISE_EVERY + 1) / DT; i++) p.update(DT, w);
    expect(raised).toHaveLength(1);
    up = 0;
    for (let i = 0; i < 2 / DT; i++) p.update(DT, w);
    expect(raised).toHaveLength(2);
    // Worn out after four hits.
    for (let i = 0; i < BONES_HP; i++) {
      p.invuln = 0;
      p.hurt();
    }
    expect(p.state).toBe('resting');
  });

  it('draws ashore and at the bow aboard', () => {
    const p = new Pal('bones');
    p.come(LANDING.x, LANDING.y);
    const f = fakeView();
    p.drawBody(f.v);
    p.state = 'away';
    p.drawAboard(f.v, { x: 0, y: 0, h: 0 }, 1);
    expect(f.calls.fill ?? 0).toBeGreaterThan(4);
    expect(f.calls.stroke ?? 0).toBeGreaterThan(6);
  });
});
