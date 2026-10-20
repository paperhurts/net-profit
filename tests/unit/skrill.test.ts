import { describe, expect, it } from 'vitest';
import {
  AIM_T,
  BOLT_R,
  BOLT_T,
  FALL_T,
  FOOT_SWINGS,
  LANDED_T,
  LAUGH_T,
  LOW_Z,
  SKRILL_DMG,
  SKRILL_HP,
  SKRILL_SPEED,
  Skrill,
  type SkrillState,
  SLASH_REACH,
  SLASH_WINDUP,
  SPELL_WINDUP,
  SWOOP_T,
  TAKEOFF_T,
} from '../../src/entities/skrill';
import { walkable } from '../../src/entities/walker';
import { drawSkrill, drawSkrillMark, drawSkrillRail, drawSkrillTop } from '../../src/render/skrill';
import { entry, ROOMS, type Room, roomAt, SKRILL_TOP } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const R = ROOMS[SKRILL_TOP] as Room;
type At = { x: number; y: number };
const tick = (s: Skrill, at: At | null, secs = 1 / 60) => {
  for (let t = 0; t < secs - 1e-9; t += 1 / 60)
    s.update(1 / 60, baseWorld({ figure: at ? { ...at, vx: 0, vy: 0 } : null }));
};
/** Woken, laughed out, and on his feet: the figure a little way into his floor. */
const awake = (at?: At) => {
  const s = new Skrill(R);
  const here = at ?? { x: R.x + 10, y: R.y + 10 };
  tick(s, here);
  tick(s, here, LAUGH_T + 0.05);
  return s;
};
/** Run him until he is in state st, the figure at at; how long it took. */
const until = (s: Skrill, st: SkrillState, at: At, max = 20) => {
  let t = 0;
  while (s.state !== st && t < max) {
    tick(s, at);
    t += 1 / 60;
  }
  return t;
};

describe('Skrill', () => {
  it("is the kid's: 20 hits and 3 hearts a blow, slower on his feet than the figure walks", () => {
    expect(SKRILL_HP).toBe(20);
    expect(SKRILL_DMG).toBe(3);
    expect(SKRILL_SPEED).toBeLessThan(85);
  });

  it('waits at the back of his own floor, the open top of his tower, up past the fourth', () => {
    expect(R.kind).toBe('skrill');
    expect(R.roof).toBe(true);
    expect(roomAt(R.x, R.y)).toBe(SKRILL_TOP);
    expect(walkable(entry(SKRILL_TOP).x, entry(SKRILL_TOP).y, 0)).toBe(true);
    const s = new Skrill(R);
    expect(walkable(s.home.x, s.home.y, 0)).toBe(true);
    // At the back, away from where the figure comes in.
    expect(
      Math.hypot(s.home.x - entry(SKRILL_TOP).x, s.home.y - entry(SKRILL_TOP).y),
    ).toBeGreaterThan(R.r * 0.8);
  });

  it('waits while nobody is there, or the figure is still on the top step, then laughs and comes for it', () => {
    const s = new Skrill(R);
    let woke = 0;
    s.onWake = () => woke++;
    tick(s, null, 2);
    tick(s, entry(SKRILL_TOP), 2);
    expect(s.state).toBe('wait');
    expect(s.up).toBe(false);
    tick(s, { x: R.x + 20, y: R.y + 20 });
    expect(s.state).toBe('laugh');
    expect(woke).toBe(1);
    // Laughing, not to be hit yet.
    expect(s.hit(1)).toBe(false);
    tick(s, { x: R.x + 20, y: R.y + 20 }, LAUGH_T + 0.05);
    expect(s.state).toBe('chase');
  });

  it('swings his sword through a red fan: three hearts in it, none for a figure behind him or out of reach', () => {
    const at = { x: R.x, y: R.y };
    const s = awake(at);
    const hits: number[] = [];
    s.onHit = (n) => hits.push(n);
    until(s, 'windup', at);
    expect(s.fan).not.toBe(null);
    expect(s.low).toBe(true);
    tick(s, at, SLASH_WINDUP + 0.05);
    expect(hits).toEqual([SKRILL_DMG]);
    const f = s.fan ?? { x: 0, y: 0, a0: 0, a1: 0 };
    const mid = (f.a0 + f.a1) / 2;
    expect(Skrill.inFan(f, f.x - Math.cos(mid) * 30, f.y - Math.sin(mid) * 30)).toBe(false);
    expect(
      Skrill.inFan(
        f,
        f.x + Math.cos(mid) * (SLASH_REACH + 8),
        f.y + Math.sin(mid) * (SLASH_REACH + 8),
      ),
    ).toBe(false);
  });

  it("takes to his wings after a couple of swings, out of a spear's reach", () => {
    const at = { x: R.x, y: R.y };
    const s = awake(at);
    let rose = 0;
    s.onRise = () => rose++;
    for (let i = 0; i < FOOT_SWINGS; i++) {
      until(s, 'windup', at);
      until(s, 'recover', at);
    }
    until(s, 'rise', at);
    expect(rose).toBe(1);
    tick(s, at, TAKEOFF_T + 0.05);
    expect(s.state).toBe('hover');
    expect(s.z).toBeGreaterThan(LOW_Z);
    expect(s.low).toBe(false);
    expect(s.hit(1)).toBe(false);
    expect(s.hp).toBe(SKRILL_HP);
  });

  it('raises his orb while three red rings show where its bolts will fall: three hearts in one, none outside them', () => {
    const at = { x: R.x, y: R.y };
    const s = awake(at);
    until(s, 'spell', at);
    expect(s.bolts).toHaveLength(3);
    // One under the figure, the other two round it, apart.
    expect(s.bolts.some((b) => Math.hypot(b.x - at.x, b.y - at.y) < 1)).toBe(true);
    const hits: number[] = [];
    s.onHit = (n) => hits.push(n);
    tick(s, at, SPELL_WINDUP + BOLT_T + 0.05);
    expect(hits).toEqual([SKRILL_DMG]);
    // Again, and this time step out of the rings while they warn.
    const s2 = awake(at);
    until(s2, 'spell', at);
    const safe = { x: at.x + BOLT_R * 1.5, y: at.y - BOLT_R * 1.5 };
    const missed: number[] = [];
    s2.onHit = (n) => missed.push(n);
    expect(s2.bolts.every((b) => Math.hypot(b.x - safe.x, b.y - safe.y) >= BOLT_R)).toBe(true);
    tick(s2, safe, SPELL_WINDUP + BOLT_T + 0.05);
    expect(missed).toEqual([]);
  });

  it('swoops down a red lane through the figure, lands, and is open to the spear while he gets his breath', () => {
    const at = { x: R.x, y: R.y };
    const s = awake(at);
    until(s, 'aim', at);
    expect(s.inLane(at.x, at.y)).toBe(true);
    const hits: number[] = [];
    s.onHit = (n) => hits.push(n);
    tick(s, at, AIM_T + SWOOP_T + 0.05);
    expect(hits).toEqual([SKRILL_DMG]);
    expect(s.state).toBe('landed');
    expect(s.low).toBe(true);
    expect(s.hit(1)).toBe(true);
    expect(s.hp).toBe(SKRILL_HP - 1);
    // Off the lane, sideways: nothing.
    const s2 = awake(at);
    until(s2, 'aim', at);
    const side = { x: at.x + 50, y: at.y - 50 };
    const none: number[] = [];
    s2.onHit = (n) => none.push(n);
    expect(s2.inLane(side.x, side.y)).toBe(false);
    tick(s2, side, AIM_T + SWOOP_T + 0.05);
    expect(none).toEqual([]);
    tick(s2, side, LANDED_T + 0.1);
    expect(s2.state).toBe('chase');
  });

  it('keeps to his floor in the air, and his swoop lands on it', () => {
    const at = { x: R.x + R.r * 0.6, y: R.y + R.r * 0.6 };
    const s = awake(at);
    for (let t = 0; t < 30; t += 1 / 60) {
      tick(s, at);
      expect(Math.hypot(s.x - R.x, s.y - R.y)).toBeLessThan(R.r);
    }
  });

  it('crashes down after twenty hits, and stays beaten: gone when the figure comes up again', () => {
    const s = awake();
    let beaten = 0;
    s.onBeaten = () => beaten++;
    for (let i = 0; i < SKRILL_HP - 1; i++) {
      s.state = 'landed';
      s.t = 0;
      expect(s.hit(1)).toBe(true);
    }
    expect(beaten).toBe(0);
    s.state = 'landed';
    s.hit(1);
    expect(beaten).toBe(1);
    expect(s.beaten).toBe(true);
    expect(s.state).toBe('fall');
    tick(s, { x: R.x, y: R.y }, FALL_T + 0.1);
    expect(s.state).toBe('down');
    expect(s.hit(5)).toBe(false);
    s.reset();
    expect(s.state).toBe('gone');
  });

  it('a stun stops his sword being drawn back', () => {
    const at = { x: R.x, y: R.y };
    const s = awake(at);
    until(s, 'windup', at);
    s.stun(1);
    expect(s.state).toBe('chase');
    expect(s.fan).toBe(null);
  });

  it('is drawn in every state, with his marks only while a blow is coming, and his floor', () => {
    const s = new Skrill(R);
    for (const st of [
      'wait',
      'laugh',
      'chase',
      'windup',
      'slash',
      'recover',
      'rise',
      'hover',
      'spell',
      'bolts',
      'aim',
      'swoop',
      'landed',
      'fall',
      'down',
      'gone',
    ] as const) {
      s.state = st;
      s.t = 0.3;
      s.fan = st === 'windup' || st === 'slash' ? { x: s.x, y: s.y, a0: 0, a1: 1 } : null;
      s.bolts = st === 'spell' || st === 'bolts' ? [{ x: R.x, y: R.y }] : [];
      s.beaten = st === 'down';
      const f = fakeView();
      drawSkrill(f.v, s);
      expect((f.calls.fill ?? 0) > 0).toBe(st !== 'gone');
      const g = fakeView();
      drawSkrillMark(g.v, s);
      const marked = ['windup', 'slash', 'spell', 'bolts', 'aim', 'swoop'].includes(st);
      expect((g.calls.fill ?? 0) > 0).toBe(marked);
    }
    const t = fakeView();
    drawSkrillTop(t.v, R, 390, 780);
    drawSkrillRail(t.v, R);
    expect(t.calls.fill ?? 0).toBeGreaterThan(10);
  });
});
