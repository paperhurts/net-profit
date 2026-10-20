import { describe, expect, it } from 'vitest';
import {
  GRAB_T,
  HAULERS,
  KNOCK_T,
  OPEN_T,
  PARTY_EVERY,
  PARTY_MAX,
  PrisonParty,
} from '../../src/entities/prisonparty';
import { FALL_T, LAUGH_T, SKRILL_HIGH, Skrill } from '../../src/entities/skrill';
import { drawSpellPortal } from '../../src/render/prisonparty';
import { ROOMS, type Room, SKRILL_TOP } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const R = ROOMS[SKRILL_TOP] as Room;
type At = { x: number; y: number };
/** Skrill and his spell's party, ticked together as the game does, the figure at at. */
const tick = (s: Skrill, p: PrisonParty, at: At | null, secs = 1 / 60) => {
  for (let t = 0; t < secs - 1e-9; t += 1 / 60) {
    const w = baseWorld({ figure: at ? { ...at, vx: 0, vy: 0 } : null });
    s.update(1 / 60, w);
    p.update(1 / 60, w);
  }
};
/** Skrill woken, his portal opening, as the game wakes them. */
const fight = (at: At = { x: R.x + 20, y: R.y + 20 }) => {
  const s = new Skrill(R);
  const p = new PrisonParty(R, s);
  s.onWake = () => p.openNow();
  tick(s, p, at);
  return { s, p };
};

describe("Skrill's spell: the portal, and the Heron's men", () => {
  it('opens when he wakes, on the left of his floor away from the way in and his throne', () => {
    const { s, p } = fight();
    expect(p.opening).toBe(true);
    expect(Math.hypot(p.portal.x - R.x, p.portal.y - R.y)).toBeLessThan(R.r);
    expect(Math.hypot(p.portal.x - s.home.x, p.portal.y - s.home.y)).toBeGreaterThan(R.r * 0.6);
    tick(s, p, { x: R.x + 20, y: R.y + 20 }, OPEN_T + 0.05);
    expect(p.open).toBe(1);
  });

  it("lets the Heron's men out one at a time, the first shouting, never more than four at once", () => {
    const { s, p } = fight();
    const shouts: boolean[] = [];
    p.onOut = (_m, first) => shouts.push(first);
    // Skrill kept laughing in place, so nobody is knocked about.
    const at = { x: R.x + 20, y: R.y + 20 };
    tick(s, p, at, OPEN_T + 0.05);
    expect(p.men).toHaveLength(1);
    expect(shouts).toEqual([true]);
    for (let i = 0; i < 8; i++) {
      s.state = 'laugh';
      s.t = 0;
      tick(s, p, at, PARTY_EVERY);
    }
    expect(p.men.length).toBe(PARTY_MAX);
    expect(shouts.slice(1).every((f) => !f)).toBe(true);
  });

  it('run at him and grab him when he is down on his floor, holding him a moment, until he throws them off', () => {
    const { s, p } = fight();
    tick(s, p, { x: R.x + 20, y: R.y + 20 }, OPEN_T + 0.05);
    const m = p.men[0];
    if (!m) throw new Error('nobody came out');
    let grabbed = 0;
    p.onGrab = () => grabbed++;
    // Him on his feet, near the portal, walking nowhere for a moment.
    s.state = 'recover';
    s.t = 0;
    s.x = p.portal.x + 30;
    s.y = p.portal.y - 30;
    for (let t = 0; t < 3 && m.job !== 'grab'; t += 1 / 60) {
      if (s.state !== 'recover') {
        s.state = 'recover';
        s.t = 0;
      }
      p.update(1 / 60, baseWorld({ figure: null }));
    }
    expect(m.job).toBe('grab');
    expect(grabbed).toBe(1);
    p.update(GRAB_T + 0.05, baseWorld({ figure: null }));
    expect(m.job).toBe('knocked');
  });

  it('only wait under him while he is up on his wings, out of reach', () => {
    const { s, p } = fight();
    tick(s, p, { x: R.x + 20, y: R.y + 20 }, OPEN_T + 0.05);
    const m = p.men[0];
    if (!m) throw new Error('nobody came out');
    s.state = 'hover';
    s.t = 0;
    s.z = SKRILL_HIGH;
    for (let t = 0; t < 4; t += 1 / 60) p.update(1 / 60, baseWorld({ figure: null }));
    expect(m.job).toBe('run');
    expect(Math.hypot(m.x - s.x, m.y - s.y)).toBeGreaterThan(20);
    expect(Math.hypot(m.x - s.x, m.y - s.y)).toBeLessThan(40);
  });

  it('are knocked flat by his blows, and up again after a moment', () => {
    const { s, p } = fight();
    tick(s, p, { x: R.x + 20, y: R.y + 20 }, OPEN_T + 0.05);
    const m = p.men[0];
    if (!m) throw new Error('nobody came out');
    let knocked = 0;
    p.onKnock = () => knocked++;
    // His orb's bolts falling on the man.
    s.blow = 'bolts';
    s.fell = [{ x: m.x, y: m.y }];
    s.state = 'aim';
    p.update(1 / 60, baseWorld({ figure: null }));
    expect(m.job).toBe('knocked');
    expect(knocked).toBe(1);
    s.blow = null;
    s.fell = [];
    p.update(KNOCK_T + 0.05, baseWorld({ figure: null }));
    expect(m.job).toBe('run');
  });

  it('beaten, two of them take him and drag him through the portal to prison, and it shuts behind them', () => {
    const { s, p } = fight();
    const at = { x: R.x + 20, y: R.y + 20 };
    tick(s, p, at, LAUGH_T + 0.1);
    let hauled = 0;
    let taken = 0;
    p.onHaul = () => hauled++;
    p.onTaken = () => taken++;
    s.state = 'landed';
    s.t = 0;
    s.hit(99);
    expect(s.hornAt).not.toBe(null);
    tick(s, p, at, FALL_T + 0.1);
    expect(s.state).toBe('down');
    for (let t = 0; t < 30 && (s.state as string) !== 'gone'; t += 1 / 60) tick(s, p, at);
    expect(hauled).toBe(1);
    expect(p.men.length === 0).toBe(true);
    expect(taken).toBe(1);
    expect(s.state).toBe('gone');
    expect(HAULERS).toBe(2);
    // His horn stays where he fell; the portal shuts.
    expect(s.hornAt).not.toBe(null);
    tick(s, p, at, OPEN_T + 0.05);
    expect(p.open).toBe(0);
    // Up there again: all shut and empty.
    p.reset();
    s.reset();
    expect([p.open, p.men.length, s.state, s.hornAt]).toEqual([0, 0, 'gone', null]);
  });

  it('draws the portal only while it is open at all', () => {
    const s = new Skrill(R);
    const p = new PrisonParty(R, s);
    const f = fakeView();
    drawSpellPortal(f.v, p);
    expect(f.calls.fill ?? 0).toBe(0);
    p.open = 0.5;
    const g = fakeView();
    drawSpellPortal(g.v, p);
    expect(g.calls.fill ?? 0).toBeGreaterThan(2);
  });
});
