import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import { OTTER_AHEAD, OTTER_SIDE } from '../../src/entities/otter';
import {
  BABY_AHEAD,
  BABY_SIDE,
  BONES_HP,
  drawNagaCage,
  drawSwimming,
  HAMSTER_EVERY,
  HEAL_DELAY,
  HEALS,
  LEAP_EVERY,
  LEAP_H,
  LEAP_T,
  MAX_HEALS,
  NECRO_HP,
  PAL_BLINK,
  PAL_HEEL,
  PAL_HP,
  PAL_INVULN,
  PARROT_Z,
  Pal,
  POOF_T,
  POWER,
  RAISE_EVERY,
  REACH,
  SHOULDER,
  STUCK_T,
  SWIM_SIDE,
  SWING_EVERY,
  swims,
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

  it('pop over beside the figure when they can make no way along its steps', () => {
    const p = new Pal('warrior');
    const f = figureAt(LANDING.x - 60, LANDING.y);
    const w: World = baseWorld({ figure: f });
    p.come(f.x + 10, f.y);
    for (let i = 0; i < 0.5 / DT; i++) p.update(DT, w);
    // Caught somewhere it cannot walk out of, as off the end of a pier.
    p.x = f.x + 120;
    p.y = f.y + 120;
    expect(walkable(p.x, p.y, 99)).toBe(false);
    for (let i = 0; i < (STUCK_T + 0.3) / DT; i++) p.update(DT, w);
    expect(Math.hypot(p.x - f.x, p.y - f.y)).toBeLessThan(40);
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

  it('fed a tuna, the cat heals a hurt companion too, until its heals run out', () => {
    const cat = new Pal('cat');
    cat.free = true;
    const w: World = baseWorld({ figure: figureAt(LANDING.x, LANDING.y) });
    cat.update(DT, w);
    const pal = { name: 'the warrior' };
    const healedPals: object[] = [];
    let healedFigure = 0;
    cat.onHealPal = (who) => healedPals.push(who);
    cat.onHeal = () => healedFigure++;
    const wait = () => {
      for (let i = 0; i < (HEAL_DELAY + 0.1) / DT; i++) cat.update(DT, w);
    };
    // No tuna: a hurt companion gets nothing.
    cat.noticePalHurt(pal);
    wait();
    expect(healedPals).toHaveLength(0);
    // A tuna, eaten even when full of other fish.
    while (cat.feed());
    expect(cat.feed(true)).toBe(true);
    expect(cat.tuna).toBe(true);
    expect(cat.feed(true)).toBe(false);
    cat.noticePalHurt(pal);
    wait();
    expect(healedPals).toEqual([pal]);
    // It still heals the figure, from the same heals.
    cat.noticeHurt();
    wait();
    expect(healedFigure).toBe(1);
    // Down to the last: once they are gone, so is the tuna.
    while (cat.heals > 0) {
      cat.noticePalHurt(pal);
      wait();
    }
    expect(cat.tuna).toBe(false);
    expect(healedPals.length).toBe(MAX_HEALS - 1);
    // The warrior can't eat tuna for anyone.
    const war = new Pal('warrior');
    expect(war.feed(true)).toBe(false);
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

describe('the naga, freed from the monkey camp', () => {
  it('fights ashore with the longest reach of them, for two', () => {
    const p = new Pal('naga');
    expect(p.hp).toBe(PAL_HP);
    expect(REACH.naga).toBeGreaterThan(Math.max(REACH.cat, REACH.warrior, REACH.bones));
    expect(POWER.naga).toBe(2);
    const f = figureAt(LANDING.x - 60, LANDING.y);
    const w: World = baseWorld({ figure: f });
    p.come(f.x + 10, f.y);
    expect(p.shown).toBe(true);
    let dealt = 0;
    // Just inside his reach: he strikes from where he stands.
    const foe = { x: p.x - (REACH.naga - 2), y: p.y, hit: (n: number) => (dealt += n) };
    p.findTarget = (x, y, r) => (Math.hypot(foe.x - x, foe.y - y) <= r ? foe : null);
    const at = [p.x, p.y];
    for (let i = 0; i < (SWING_EVERY.naga * 2 + 0.2) / DT; i++) p.update(DT, w);
    expect(dealt).toBeGreaterThanOrEqual(POWER.naga * 2);
    expect(Math.hypot(p.x - (at[0] ?? 0), p.y - (at[1] ?? 0))).toBeLessThan(1);
  });

  it('swims beside the boat at sea rather than riding it, keeping up at full speed', () => {
    const p = new Pal('naga');
    p.come(LANDING.x, LANDING.y);
    const w: World = baseWorld({ figure: null, hullScale: 1.6 });
    w.boat.v = 350;
    for (let i = 0; i < 6 / DT; i++) {
      w.boat.h += 0.2 * DT;
      w.boat.x += Math.cos(w.boat.h) * w.boat.v * DT;
      w.boat.y += Math.sin(w.boat.h) * w.boat.v * DT;
      p.update(DT, w);
      expect(swims(p)).toBe(true);
      if (i > 30) expect(Math.hypot(p.x - w.boat.x, p.y - w.boat.y)).toBeLessThan(70);
    }
    // Off the hull, not on it.
    expect(Math.hypot(p.x - w.boat.x, p.y - w.boat.y)).toBeGreaterThan(SWIM_SIDE);
    // Worn out, he rests in the water beside it too.
    p.state = 'resting';
    p.update(DT, w);
    expect(swims(p)).toBe(true);
  });

  it('keeps to the side of the boat nearer the viewer, so the hull never hides him', () => {
    const p = new Pal('naga');
    p.free = true;
    const w: World = baseWorld({ figure: null });
    for (const h of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.3, 2.2]) {
      w.boat.h = h;
      for (let i = 0; i < 3 / DT; i++) p.update(DT, w);
      // In front of the boat on screen: further down the screen's x+y.
      expect(p.x + p.y, `heading ${h}`).toBeGreaterThan(w.boat.x + w.boat.y);
    }
  });

  it('draws ashore, swimming, and in his cage open or shut', () => {
    const p = new Pal('naga');
    const f = fakeView();
    p.come(LANDING.x, LANDING.y);
    p.drawBody(f.v);
    const ashore = f.calls.fill ?? 0;
    expect(ashore).toBeGreaterThan(10);
    p.update(DT, baseWorld({ figure: null }));
    drawSwimming(f.v, p);
    expect(f.calls.fill ?? 0).toBeGreaterThan(ashore + 10);
    drawNagaCage(f.v, 0, 0, 11, 0, true);
    drawNagaCage(f.v, 0, 0, 11, 1, false);
    expect(f.calls.stroke ?? 0).toBeGreaterThan(20);
  });
});

describe('the necromancer, freed from the orb', () => {
  it('keeps back at the heel in a fight, never hits, and raises his hamster, again only once it has fallen', () => {
    const p = new Pal('necro');
    expect(p.hp).toBe(NECRO_HP);
    const f = figureAt(LANDING.x - 60, LANDING.y);
    const w: World = baseWorld({ figure: f });
    p.come(f.x + 10, f.y);
    let dealt = 0;
    const foe = { x: f.x - 80, y: f.y, hit: (n: number) => (dealt += n) };
    p.findTarget = (x, y, r) => (Math.hypot(foe.x - x, foe.y - y) <= r ? foe : null);
    const raised: [number, number][] = [];
    let up = 0;
    p.canRaise = () => up === 0;
    p.onRaise = (x, y) => {
      raised.push([x, y]);
      up = 1;
    };
    for (let i = 0; i < 4 / DT; i++) p.update(DT, w);
    expect(dealt).toBe(0);
    expect(POWER.necro).toBe(0);
    expect(raised).toHaveLength(1);
    // He stays by the figure, not out at the foe.
    expect(Math.hypot(p.x - f.x, p.y - f.y)).toBeLessThanOrEqual(PAL_HEEL.necro + 2);
    // While it stands, no other; once it falls, another after a while.
    for (let i = 0; i < (HAMSTER_EVERY + 1) / DT; i++) p.update(DT, w);
    expect(raised).toHaveLength(1);
    up = 0;
    for (let i = 0; i < 2 / DT; i++) p.update(DT, w);
    expect(raised).toHaveLength(2);
    for (let i = 0; i < NECRO_HP; i++) {
      p.invuln = 0;
      p.hurt();
    }
    expect(p.state).toBe('resting');
  });

  it('draws ashore, his arms up as he raises, and amidships aboard', () => {
    const p = new Pal('necro');
    p.come(LANDING.x, LANDING.y);
    const f = fakeView();
    p.drawBody(f.v);
    const fills = f.calls.fill ?? 0;
    expect(fills).toBeGreaterThanOrEqual(8);
    p.state = 'away';
    p.drawAboard(f.v, { x: 0, y: 0, h: 0 }, 1);
    expect(f.calls.fill ?? 0).toBeGreaterThan(fills + 5);
    const seat = p.seat({ x: 0, y: 0, h: 0 }, 1);
    expect(Math.hypot(seat.x, seat.y)).toBeLessThan(14);
    expect(seat.z).toBeGreaterThan(0);
  });
});

describe('the baby Reaper, out of the egg', () => {
  /** Where the otter swims, for a boat at the origin with this heading: off the bow on the side nearer the viewer. */
  const otterSpot = (h: number) => {
    const c = Math.cos(h);
    const s = Math.sin(h);
    const side = c - s >= 0 ? 1 : -1;
    return {
      x: c * OTTER_AHEAD - s * OTTER_SIDE * side,
      y: s * OTTER_AHEAD + c * OTTER_SIDE * side,
    };
  };

  it('hatches into the sea beside the boat, leaping out, and swims off the bow on the far side from the otter', () => {
    const p = new Pal('baby');
    const w: World = baseWorld({ figure: null });
    w.boat.x = 0;
    w.boat.y = 0;
    p.hatchAt(12, 0);
    expect(p.free).toBe(true);
    expect(swims(p)).toBe(true);
    expect(p.leapT).toBe(0);
    for (const h of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.3, 2.2]) {
      w.boat.h = h;
      for (let i = 0; i < 3 / DT; i++) p.update(DT, w);
      const c = Math.cos(h);
      const s = Math.sin(h);
      const ahead = p.x * c + p.y * s;
      const across = -p.x * s + p.y * c;
      const near = c - s;
      expect(ahead, `heading ${h}`).toBeCloseTo(BABY_AHEAD, 0);
      expect(Math.abs(across), `heading ${h}`).toBeCloseTo(BABY_SIDE, 0);
      // Away from the viewer where the otter is near it; clear of the otter either way.
      if (Math.abs(near) > 0.35) expect(Math.sign(across)).toBe(-Math.sign(near));
      const o = otterSpot(h);
      expect(Math.hypot(p.x - o.x, p.y - o.y), `heading ${h}`).toBeGreaterThan(20);
    }
  });

  it('keeps up at full speed, and leaps clear of the water every few seconds, splashing back in', () => {
    const p = new Pal('baby');
    p.hatchAt(0, 0);
    const w: World = baseWorld({ figure: null, hullScale: 1.6 });
    w.boat.x = 0;
    w.boat.y = 0;
    w.boat.v = 350;
    const splashes: number[] = [];
    p.onSplash = () => splashes.push(1);
    let top = 0;
    const T = 20;
    for (let i = 0; i < T / DT; i++) {
      w.boat.h += 0.2 * DT;
      w.boat.x += Math.cos(w.boat.h) * w.boat.v * DT;
      w.boat.y += Math.sin(w.boat.h) * w.boat.v * DT;
      p.update(DT, w);
      top = Math.max(top, p.leapZ);
      expect(swims(p)).toBe(true);
      if (i > 30) expect(Math.hypot(p.x - w.boat.x, p.y - w.boat.y)).toBeLessThan(90);
    }
    expect(top).toBeGreaterThan(LEAP_H * 0.95);
    // The one out of the egg, then one each LEAP_EVERY.
    expect(splashes.length).toBeGreaterThanOrEqual(Math.floor(T / (LEAP_EVERY + LEAP_T)));
    expect(splashes.length).toBeLessThanOrEqual(Math.ceil(T / LEAP_EVERY) + 1);
  });

  it('leaps when tapped, but not again mid-leap, and not ashore', () => {
    const p = new Pal('baby');
    p.hatchAt(0, 0);
    const w: World = baseWorld({ figure: null });
    for (let i = 0; i < (LEAP_T + 0.1) / DT; i++) p.update(DT, w);
    expect(p.leapT).toBe(-1);
    expect(p.leap()).toBe(true);
    expect(p.leap()).toBe(false);
    p.update(DT, baseWorld({ figure: figureAt(LANDING.x, LANDING.y) }));
    expect(p.shown).toBe(true);
    expect(p.leap()).toBe(false);
  });

  it('walks ashore at the heel and nips whatever the figure fights, for one', () => {
    const p = new Pal('baby');
    p.hatchAt(0, 0);
    const f = figureAt(LANDING.x - 60, LANDING.y);
    const w: World = baseWorld({ figure: f });
    p.update(DT, w);
    expect(p.shown).toBe(true);
    expect(p.hp).toBe(PAL_HP);
    expect(Math.hypot(p.x - f.x, p.y - f.y)).toBeLessThan(PAL_BLINK);
    let dealt = 0;
    const foe = { x: p.x - (REACH.baby - 2), y: p.y, hit: (n: number) => (dealt += n) };
    p.findTarget = (x, y, r) => (Math.hypot(foe.x - x, foe.y - y) <= r ? foe : null);
    for (let i = 0; i < (SWING_EVERY.baby * 3 + 0.2) / DT; i++) p.update(DT, w);
    expect(POWER.baby).toBe(1);
    expect(dealt).toBeGreaterThanOrEqual(3);
    expect(dealt).toBeLessThanOrEqual(4);
    // Worn out, he goes back to the water by the boat.
    for (let i = 0; i < PAL_HP; i++) {
      p.invuln = 0;
      p.hurt();
    }
    expect(p.state).toBe('resting');
    p.update(DT, baseWorld({ figure: null }));
    expect(swims(p)).toBe(true);
  });

  it('never rides the boat, and draws ashore, paddling, mid-leap and hatching out', () => {
    const p = new Pal('baby');
    const f = fakeView();
    p.hatchAt(0, 0);
    drawSwimming(f.v, p);
    const leaping = f.calls.fill ?? 0;
    expect(leaping).toBeGreaterThan(10);
    const w: World = baseWorld({ figure: null });
    for (let i = 0; i < (LEAP_T + 0.1) / DT; i++) p.update(DT, w);
    drawSwimming(f.v, p);
    expect(f.calls.clip ?? 0).toBeGreaterThan(0);
    expect(f.calls.fill ?? 0).toBeGreaterThan(leaping + 10);
    const before = f.calls.fill ?? 0;
    p.drawAboard(f.v, w.boat, 1);
    expect(f.calls.fill ?? 0).toBe(before);
    p.update(DT, baseWorld({ figure: figureAt(LANDING.x, LANDING.y) }));
    p.drawBody(f.v);
    expect(f.calls.fill ?? 0).toBeGreaterThan(before + 10);
  });
});

describe("Doom Island's minions", () => {
  it('Jacks Parrow rides the shoulder, flies off to peck what the figure fights and back, and nothing hurts him', () => {
    const p = new Pal('parrot');
    p.free = true;
    const f = figureAt(LANDING.x - 60, LANDING.y);
    const w: World = baseWorld({ figure: f });
    for (let i = 0; i < 1 / DT; i++) p.update(DT, w);
    expect(p.shown).toBe(true);
    expect(Math.hypot(p.x - f.x, p.y - f.y)).toBeLessThan(SHOULDER + 0.5);
    expect(p.z).toBeCloseTo(PARROT_Z, 0);
    expect(p.flying).toBe(false);
    let dealt = 0;
    const foe = { x: f.x - 40, y: f.y - 20, hit: (n: number) => (dealt += n) };
    p.findTarget = (x, y, r) => (Math.hypot(foe.x - x, foe.y - y) <= r ? foe : null);
    for (let i = 0; i < (SWING_EVERY.parrot * 3 + 1) / DT; i++) p.update(DT, w);
    expect(dealt).toBeGreaterThanOrEqual(POWER.parrot * 3);
    expect(p.hurt()).toBe(false);
    p.knockOut();
    expect(p.shown).toBe(true);
    p.findTarget = () => null;
    for (let i = 0; i < 2 / DT; i++) p.update(DT, w);
    expect(Math.hypot(p.x - f.x, p.y - f.y)).toBeLessThan(SHOULDER + 0.5);
    expect(p.flying).toBe(false);
    w.figure = null;
    p.update(DT, w);
    expect(p.shown).toBe(false);
  });

  it('Bun-San, hit, goes up in smoke and pops out behind the figure, so he is never worn out', () => {
    const p = new Pal('bun');
    p.free = true;
    const f = { ...figureAt(LANDING.x - 60, LANDING.y), vx: 40 };
    const w: World = baseWorld({ figure: f });
    for (let i = 0; i < 1 / DT; i++) p.update(DT, w);
    expect(p.shown).toBe(true);
    const puffs: boolean[] = [];
    p.onPoof = (_x, _y, back) => puffs.push(back);
    for (let n = 0; n < PAL_HP * 2; n++) {
      expect(p.hurt()).toBe(true);
      expect(p.hurt()).toBe(false);
      expect(p.poofT).toBeGreaterThanOrEqual(0);
      for (let i = 0; i < (Math.max(POOF_T, PAL_INVULN) + 0.1) / DT; i++) p.update(DT, w);
      expect(p.poofT).toBe(-1);
      expect(p.shown).toBe(true);
    }
    expect(p.hp).toBe(p.maxHp);
    expect(puffs).toEqual(Array.from({ length: PAL_HP * 4 }, (_, i) => i % 2 === 1));
    // The figure walking right: he came back out on its left, behind it.
    p.hurt();
    for (let i = 0; i < (POOF_T + 0.02) / DT; i++) p.update(DT, w);
    expect(p.x).toBeLessThan(f.x);
    p.knockOut();
    expect(p.shown).toBe(true);
  });

  it('ride the boat: the parrot up the mast, the bun on the bow', () => {
    for (const kind of ['parrot', 'bun'] as const) {
      const p = new Pal(kind);
      p.free = true;
      p.update(DT, baseWorld({ figure: null }));
      const f = fakeView();
      p.drawAboard(f.v, { x: 0, y: 0, h: 0 }, 1);
      expect(f.calls.fill ?? 0).toBeGreaterThan(4);
    }
  });
});
