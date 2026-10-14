import { describe, expect, it } from 'vitest';
import {
  DAMAGE_K,
  HEAL_EVERY,
  noBadges,
  owned,
  parseBadges,
  pin,
  SHIELD_HITS,
  Worn,
  wornBy,
} from '../../src/data/badges';
import type { World } from '../../src/entities/entity';
import { PAL_HP, PAL_INVULN, Pal, POWER, SWING_EVERY } from '../../src/entities/pals';
import { LANDING } from '../../src/entities/walker';
import { WARLOCK_HEARTS, Warlock } from '../../src/entities/warlock';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const figureAt = (x: number, y: number) => ({ x, y, vx: 0, vy: 0 });

describe("the companions' badges", () => {
  it('a badge is pinned on one companion, one badge to a companion, only once bought', () => {
    const b = noBadges();
    pin(b, 'damage', 'warrior');
    expect(b.on.damage).toBe(null);
    b.damage = true;
    b.shield = 1;
    pin(b, 'damage', 'warrior');
    expect(wornBy(b, 'warrior')).toBe('damage');
    // The shield on the warrior takes the damage badge off him.
    pin(b, 'shield', 'warrior');
    expect([b.on.shield, b.on.damage]).toEqual(['warrior', null]);
    // Moved to the cat.
    pin(b, 'shield', 'cat');
    expect([wornBy(b, 'cat'), wornBy(b, 'warrior')]).toEqual(['shield', null]);
    pin(b, 'shield', null);
    expect(wornBy(b, 'cat')).toBe(null);
    expect(owned(b, 'heal')).toBe(false);
  });

  it('a save keeps them, and never a badge on two or on one not bought', () => {
    expect(parseBadges(undefined)).toEqual(noBadges());
    const b = parseBadges({
      shield: 2,
      damage: true,
      heal: false,
      on: { shield: 'naga', damage: 'naga', heal: 'cat' },
    });
    expect(b.shield).toBe(2);
    expect(b.on).toEqual({ shield: null, damage: 'naga', heal: null });
    expect(parseBadges({ shield: 9, on: { shield: 'kraken' } })).toEqual({
      ...noBadges(),
      shield: 2,
    });
  });

  it('the shield takes hits until it is spent, and is full again each landing', () => {
    const w = new Worn();
    w.wear('shield', 1);
    expect(w.shield).toBe(SHIELD_HITS[1]);
    for (let i = 0; i < SHIELD_HITS[1]; i++) expect(w.absorb()).toBe(true);
    expect(w.absorb()).toBe(false);
    w.refill();
    expect(w.shield).toBe(3);
    w.wear('shield', 2);
    expect(w.shield).toBe(6);
    w.wear('heal', 2);
    expect([w.shield, w.absorb()]).toEqual([0, false]);
  });

  it('damage doubles the hits; healing gives a point back every few seconds while hurt', () => {
    const w = new Worn();
    expect(w.power(2)).toBe(2);
    w.wear('damage', 0);
    expect(w.power(2)).toBe(2 * DAMAGE_K);
    w.wear('heal', 0);
    let back = 0;
    for (let t = 0; t < HEAL_EVERY * 3 + 0.1; t += DT) if (w.tick(DT, true)) back++;
    expect(back).toBe(3);
    for (let t = 0; t < HEAL_EVERY * 2; t += DT) if (w.tick(DT, false)) back++;
    expect(back).toBe(3);
  });

  it('a companion with the shield badge is not hurt until the shield is spent', () => {
    const p = new Pal('warrior');
    p.free = true;
    p.worn.wear('shield', 1);
    const w: World = baseWorld({ figure: figureAt(LANDING.x - 60, LANDING.y) });
    p.update(DT, w);
    for (let i = 0; i < SHIELD_HITS[1]; i++) {
      expect(p.hurt()).toBe(true);
      expect(p.hp).toBe(PAL_HP);
      for (let t = 0; t < PAL_INVULN + 0.05; t += DT) p.update(DT, w);
    }
    expect(p.hurt()).toBe(true);
    expect(p.hp).toBe(PAL_HP - 1);
  });

  it('a companion with the damage badge hits twice as hard', () => {
    const p = new Pal('warrior');
    p.free = true;
    p.worn.wear('damage', 0);
    const f = figureAt(LANDING.x - 60, LANDING.y);
    const w: World = baseWorld({ figure: f });
    p.update(DT, w);
    const hits: number[] = [];
    const foe = { x: f.x - 40, y: f.y, hit: (n: number) => hits.push(n) };
    p.findTarget = (x, y, r) => (Math.hypot(foe.x - x, foe.y - y) <= r ? foe : null);
    for (let i = 0; i < (SWING_EVERY.warrior * 2 + 1.5) / DT; i++) p.update(DT, w);
    expect(hits.length).toBeGreaterThan(0);
    for (const n of hits) expect(n).toBe(POWER.warrior * DAMAGE_K);
  });

  it('the warlock, healing badge on, gets his hearts back even in a fight', () => {
    const k = new Warlock();
    k.free = true;
    k.worn.wear('heal', 0);
    k.fighting = () => true;
    const w: World = baseWorld({ figure: figureAt(LANDING.x - 60, LANDING.y) });
    k.update(DT, w);
    k.hurt();
    expect(k.hearts).toBe(WARLOCK_HEARTS - 1);
    for (let t = 0; t < HEAL_EVERY + 0.2; t += DT) k.update(DT, w);
    expect(k.hearts).toBe(WARLOCK_HEARTS);
  });
});
