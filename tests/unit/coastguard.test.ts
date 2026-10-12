import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { GEAR, GEAR_IDS, noGear, refusal } from '../../src/data/gear';
import { PIRATE_UNLOCK } from '../../src/data/tuning';
import { CoastGuard, ESCORT_T } from '../../src/entities/coastguard';
import type { World } from '../../src/entities/entity';
import { Pirate, type PirateWorld } from '../../src/entities/pirate';
import { DOCK, IX, IY, WS } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;

/** Out at sea in home water, south-east of the island, a hold worth taking. */
const world = (over: Partial<PirateWorld> = {}): PirateWorld =>
  baseWorld({
    boat: { x: IX + 900, y: IY + 900, h: 0, v: 0 },
    rng: rng(5),
    earned: PIRATE_UNLOCK,
    holdTotal: 8,
    ...over,
  });

function run(g: CoastGuard, w: World, seconds: number, p?: Pirate): void {
  for (let t = 0; t < seconds; t += DT) {
    if (p) {
      p.held = g.out;
      p.update(DT, w as PirateWorld);
    }
    g.update(DT, w);
  }
}

describe('the coast guard', () => {
  it('stays at the dock until called, and comes out once a call', () => {
    const g = new CoastGuard();
    run(g, world(), 5);
    expect(g.ship.state).toBe('home');
    expect(g.out).toBe(false);
    expect(g.call()).toBe(true);
    expect(g.out).toBe(true);
    expect(Math.hypot(g.ship.x - DOCK.x, g.ship.y - DOCK.y)).toBeLessThan(100);
    // A second call while it is out does nothing.
    expect(g.call()).toBe(false);
  });

  it('races out to the boat, sails beside it for its minute, then heads home', () => {
    const g = new CoastGuard();
    const w = world();
    let arrived = 0;
    let left = 0;
    g.onArrive = () => arrived++;
    g.onLeave = () => left++;
    g.call();
    run(g, w, 10);
    expect(g.ship.state).toBe('escort');
    expect(arrived).toBe(1);
    // Beside the boat while the boat sails on, north, in home water.
    w.boat.h = -Math.PI / 2;
    w.boat.v = 200;
    for (let t = 0; t < 6; t += DT) {
      w.boat.y += Math.sin(w.boat.h) * w.boat.v * DT;
      g.update(DT, w);
    }
    expect(Math.hypot(g.ship.x - w.boat.x, g.ship.y - w.boat.y)).toBeLessThan(260);
    w.boat.v = 0;
    run(g, w, ESCORT_T);
    expect(left).toBe(1);
    expect(g.out).toBe(false);
    run(g, w, 30);
    expect(g.ship.state).toBe('home');
  });

  it('heads home when the boat ties up or goes out past the buoys', () => {
    const g = new CoastGuard();
    g.call();
    run(g, world(), 10);
    expect(g.ship.state).toBe('escort');
    run(g, world({ docked: true }), DT * 2);
    expect(g.ship.state).toBe('back');
    // On its way out, the boat leaves home water: it turns back.
    const h = new CoastGuard();
    h.call();
    run(h, world(), 1);
    expect(h.ship.state).toBe('out');
    run(h, world({ boat: { x: WS + 300, y: IY, h: 0, v: 0 } }), DT * 2);
    expect(h.ship.state).toBe('back');
  });

  it('turns a chasing pirate tail, and keeps it away while it is out', () => {
    const p = new Pirate();
    const g = new CoastGuard();
    const w = world();
    let fled = 0;
    p.onFlee = () => fled++;
    p.ship.state = 'chase';
    p.ship.x = w.boat.x + 500;
    p.ship.y = w.boat.y;
    g.call();
    run(g, w, DT * 2, p);
    expect(p.ship.state).toBe('leave');
    expect(fled).toBe(1);
    // Gone over the edge, it does not come back while the coast guard is out.
    run(g, w, 40, p);
    expect(p.ship.state).toBe('away');
    expect(g.out).toBe(true);
  });

  it('is drawn without a fault, its light flashing', () => {
    const v = fakeView();
    const g = new CoastGuard();
    g.call();
    for (const layer of ['solids', 'mask', 'glow', 'air'] as const) g.draw(v.v, layer);
    g.reset();
    expect(g.ship.state).toBe('home');
  });
});

describe('the coast guard radio on the shelf', () => {
  it("is the shipwright's to sell", () => {
    expect(GEAR_IDS).toContain('radio');
    expect(GEAR.radio.name).toBe('Coast guard radio');
    expect(noGear().radio).toBe(false);
    expect(refusal('radio', noGear(), GEAR.radio.cost)).toBeNull();
    expect(refusal('radio', { ...noGear(), radio: true }, 99999)).toBe('fitted');
  });
});
