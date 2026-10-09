import { describe, expect, it } from 'vitest';
import { GEAR, GEAR_IDS } from '../../src/data/gear';
import { LION_BACK, Lionfishes, lionAt } from '../../src/entities/lionfish';
import { BITE_T, BITE_WAIT, LION_BOUNTY, Rod } from '../../src/fishing/rod';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;

/** Cast, then wait out the float until something happens; what it was, and when. */
function waitFor(rod: Rod, r: number): { ev: string | null; t: number } {
  rod.cast(r);
  let t = 0;
  for (; t < 10; t += DT) {
    const ev = rod.update(DT);
    if (ev) return { ev, t };
  }
  return { ev: null, t };
}

describe('the fishing rod', () => {
  it('gets a bite a moment after the cast, never at once', () => {
    for (const r of [0, 0.5, 1]) {
      const rod = new Rod();
      const { ev, t } = waitFor(rod, r);
      expect(ev).toBe('bite');
      expect(t).toBeGreaterThanOrEqual(BITE_WAIT[0] - DT);
      expect(t).toBeLessThanOrEqual(BITE_WAIT[1] + DT);
      expect(rod.state).toBe('bite');
    }
  });

  it('lands the lionfish reeled in while the float is under', () => {
    const rod = new Rod();
    waitFor(rod, 0.3);
    for (let i = 0; i < (BITE_T * 0.5) / DT; i++) rod.update(DT);
    expect(rod.reel()).toBe('caught');
    expect(rod.state).toBe('idle');
  });

  it('loses it to a reel too soon, and to one too late', () => {
    const early = new Rod();
    early.cast(0.5);
    early.update(0.2);
    expect(early.reel()).toBe('early');
    const late = new Rod();
    waitFor(late, 0.5);
    let ev = null;
    for (let i = 0; i < (BITE_T + 0.1) / DT && !ev; i++) ev = late.update(DT);
    expect(ev).toBe('late');
    expect(late.reel()).toBeNull();
  });

  it('gives a person a fair second to see the float go under and tap', () => {
    expect(BITE_T).toBeGreaterThanOrEqual(0.8);
    expect(LION_BOUNTY).toBeGreaterThan(0);
  });

  it('is sold by the shipwright', () => {
    expect(GEAR_IDS).toContain('rod');
    expect(GEAR.rod.cost).toBeGreaterThan(0);
  });
});

describe('a lionfish caught', () => {
  it('leaves its group for a while, and cannot cut a net or be caught again until it is back', () => {
    const l = new Lionfishes();
    l.here = true;
    const g = l.groups[0];
    if (!g) throw new Error('group');
    const n = l.nearestFish(g.x, g.y, 200);
    if (!n) throw new Error('fish');
    expect(n.g).toBe(g);
    const [fx, fy] = lionAt(g, n.f);
    expect(Math.hypot(n.x - fx, n.y - fy)).toBeLessThan(1);
    l.take(n.f);
    const next = l.nearestFish(g.x, g.y, 200);
    expect(next?.f).not.toBe(n.f);
    // Every fish in the group caught: nothing left here to cut a net.
    for (const f of g.fish) l.take(f);
    expect(l.nearestFish(g.x, g.y, 120)).toBeNull();
    let cuts = 0;
    l.onCut = () => cuts++;
    const w = baseWorld({ net: { x: g.x, y: g.y, speed: 120, torn: 0 }, netWidth: 112 });
    for (let i = 0; i < 2 / DT; i++) l.update(DT, w);
    expect(cuts).toBe(0);
    for (let i = 0; i < LION_BACK / DT; i++) l.update(DT, w);
    expect(l.nearestFish(g.x, g.y, 200)).not.toBeNull();
  });
});
