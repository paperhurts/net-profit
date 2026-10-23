import { describe, expect, it } from 'vitest';
import { BIG_TOWER_DOOR, FORGE_AT, GARDEN_AT, PLANS_AT } from '../../src/data/hq';
import { SCOPE_AT, SCOPE_REACH } from '../../src/data/observatory';
import {
  COMPANION_BLURBS,
  COMPANION_NAMES,
  COMPANIONS,
  parseStay,
  ROSTER_AT,
  ROSTER_REACH,
  WAIT_AT,
} from '../../src/data/stay';
import { drawRoster } from '../../src/render/hq';
import { GATE, ROOMS } from '../../src/world/tower';
import { fakeView } from './helpers/view';

const court = ROOMS[GATE];
if (!court) throw new Error('no courtyard');
// What already stands in the courtyard: the flag, the telescope, the stairs up, the way in, the portal, the plans,
// the forge, the garden and the bigger tower's door.
const TAKEN = [
  { dx: -70, dy: 10 },
  SCOPE_AT,
  { dx: -72, dy: -72 },
  { dx: 66, dy: 66 },
  { dx: 75, dy: -75 },
  PLANS_AT,
  FORGE_AT,
  ...Object.values(GARDEN_AT),
  BIG_TOWER_DOOR,
];
const apart = (a: { dx: number; dy: number }, b: { dx: number; dy: number }) =>
  Math.hypot(a.dx - b.dx, a.dy - b.dy);
// On the screen: across it, and up it (the nearer, the lower).
const col = (p: { dx: number; dy: number }) => p.dx - p.dy;
const depth = (p: { dx: number; dy: number }) => p.dx + p.dy;

describe('who comes with you', () => {
  it('names each friend and says what it does', () => {
    expect(COMPANIONS).toHaveLength(11);
    for (const k of COMPANIONS) {
      expect(COMPANION_NAMES[k].length).toBeGreaterThan(2);
      expect(COMPANION_BLURBS[k]).toMatch(/\.$/);
    }
  });

  it('reads who stays from a save: nobody from an old one, each friend once, nothing it does not know', () => {
    expect(parseStay(undefined)).toEqual([]);
    expect(parseStay('cat')).toEqual([]);
    expect(parseStay(['cat', 'cat', 'otter', 7, 'baby'])).toEqual(['cat', 'baby']);
  });

  it('puts the roll-call board on the courtyard floor, clear of everything and used on its own', () => {
    expect(Math.hypot(ROSTER_AT.dx, ROSTER_AT.dy)).toBeLessThan(court.r - 12 - ROSTER_REACH / 2);
    for (const t of TAKEN) expect(apart(ROSTER_AT, t)).toBeGreaterThan(40);
    // Next to the telescope, the two are mostly used apart.
    expect(apart(ROSTER_AT, SCOPE_AT)).toBeGreaterThan(SCOPE_REACH + ROSTER_REACH - 10);
    // Not behind the portal's ring on the screen.
    expect(depth(ROSTER_AT) > 40 || Math.abs(col(ROSTER_AT) - 150) > 80).toBe(true);
  });

  it('has those left at the castle wait about the courtyard, each in sight and clear of the rest', () => {
    const spots = COMPANIONS.map((k) => WAIT_AT[k]);
    for (const p of spots) {
      expect(Math.hypot(p.dx, p.dy)).toBeLessThan(court.r - 40);
      for (const t of [...TAKEN, ROSTER_AT]) expect(apart(p, t)).toBeGreaterThan(40);
      // Not behind the portal's ring, where it could not be seen.
      expect(depth(p) > 40 || col(p) < 70).toBe(true);
    }
    // No two stand one on another on the screen.
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i] as { dx: number; dy: number };
        const b = spots[j] as { dx: number; dy: number };
        expect(Math.abs(col(a) - col(b)) >= 44 || Math.abs(depth(a) - depth(b)) >= 90).toBe(true);
      }
  });

  it('draws the board with a line and a mark for each friend', () => {
    const none = fakeView();
    drawRoster(none.v, 0, 0, []);
    const three = fakeView();
    drawRoster(three.v, 0, 0, [true, false, true]);
    expect(none.calls.fill ?? 0).toBeGreaterThan(6);
    // A line each, and a tick (one stroke) or a cross (one stroke of two marks).
    expect((three.calls.stroke ?? 0) - (none.calls.stroke ?? 0)).toBe(6);
  });
});
