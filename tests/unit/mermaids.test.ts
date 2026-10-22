import { describe, expect, it } from 'vitest';
import { MER_CHORD, MER_NOTES, MER_TAKEOVER, MER_VOICE, padNotes } from '../../src/audio/ambience';
import type { World } from '../../src/entities/entity';
import {
  GENTLE,
  HIDE_T,
  MER_EARSHOT,
  MER_SIGHT,
  Mermaids,
  merLevel,
  merPhrase,
  RISE_T,
  SPOOK,
  STAGGER,
} from '../../src/entities/mermaids';
import { drawMerInWater, drawMermaids, drawMerRock, merInWater } from '../../src/render/mermaids';
import { DAY_END, DUSK_END } from '../../src/world/daycycle';
import { DEEP, WS } from '../../src/world/island';
import { ISLE2 } from '../../src/world/isle2';
import { MER_ROCKS, MIDNIGHT, merHours, ROCKS, SEATS } from '../../src/world/mermaids';
import {
  createDeepSchools,
  createFarSchools,
  createIsle2Schools,
  createIsle3Schools,
  createSchools,
} from '../../src/world/schools';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DUSK = DAY_END + 0.01;
const NOON = 0.3;

/** A world with the boat this far out from the rocks, on their seaward side, going this fast. */
function at(dist: number, v = 0, over: Partial<World> = {}): World {
  const ox = MER_ROCKS.x - ISLE2.x;
  const oy = MER_ROCKS.y - ISLE2.y;
  const od = Math.hypot(ox, oy);
  // Along the shore, not out to sea: out to sea is the deep's end.
  const x = MER_ROCKS.x - (oy / od) * dist;
  const y = MER_ROCKS.y + (ox / od) * dist;
  return baseWorld({ boat: { x, y, h: 0, v }, ...over });
}

const run = (m: Mermaids, w: World, secs: number) => {
  for (let t = 0; t < secs - 1e-9; t += 1 / 60) m.update(1 / 60, w);
};

/** The mermaids at dusk with the boat far off, all three up on their rocks. */
function upOnTheRocks(): Mermaids {
  const m = new Mermaids();
  m.clock = DUSK;
  run(m, at(2000), STAGGER * 2 + RISE_T + 0.5);
  return m;
}

describe("the mermaids' rocks", () => {
  it('lie off island 2 on its far side, in the deep, with three seats among them', () => {
    expect(SEATS).toHaveLength(3);
    const home = Math.atan2(-1, 1);
    for (const r of ROCKS) {
      const d = Math.hypot(r.x - ISLE2.x, r.y - ISLE2.y);
      // Clear of the island and a flagship's hull pushed off it, and in its shallows.
      expect(d - r.r).toBeGreaterThan(ISLE2.r + 40);
      expect(d + r.r).toBeLessThan(ISLE2.r + 330);
      // Inside the deep, not past its end.
      expect(r.x - r.r).toBeGreaterThan(-DEEP + 100);
      expect(r.y + r.r).toBeLessThan(WS + DEEP - 100);
      // Not on the side facing home.
      const a = Math.atan2(r.y - ISLE2.y, r.x - ISLE2.x);
      expect(Math.abs(Math.atan2(Math.sin(a - home), Math.cos(a - home)))).toBeGreaterThan(
        Math.PI / 2,
      );
    }
    for (const [i, a] of ROCKS.entries())
      for (const b of ROCKS.slice(i + 1))
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
  });

  it('keep clear of every school of fish, so no sweep runs onto them', () => {
    const all = [
      ...createSchools(),
      ...createDeepSchools(),
      ...createIsle2Schools(),
      ...createIsle3Schools(),
      ...createFarSchools(),
    ];
    for (const s of all)
      for (const r of ROCKS)
        expect(Math.hypot(s.ax - r.x, s.ay - r.y)).toBeGreaterThan(s.r + r.r + 60);
  });

  it('have their mermaids from the start of dusk until midnight', () => {
    expect(merHours(NOON)).toBe(false);
    expect(merHours(DAY_END)).toBe(true);
    expect(merHours(DUSK_END + 0.05)).toBe(true);
    expect(merHours(MIDNIGHT - 0.001)).toBe(true);
    expect(merHours(MIDNIGHT)).toBe(false);
    expect(merHours(0.05)).toBe(false);
  });
});

describe('the mermaids', () => {
  it('come up one after another at dusk and climb onto their rocks; at midnight they slip back in', () => {
    const m = new Mermaids();
    m.clock = NOON;
    run(m, at(2000), 5);
    expect(m.list.every((x) => x.state === 'away')).toBe(true);
    m.clock = DUSK;
    run(m, at(2000), 0.2);
    expect(m.list.map((x) => x.state)).toEqual(['rise', 'away', 'away']);
    run(m, at(2000), STAGGER * 2 + RISE_T);
    expect(m.list.every((x) => x.state === 'sit')).toBe(true);
    expect(SEATS.every((s) => m.on(s) !== null)).toBe(true);
    m.clock = MIDNIGHT + 0.01;
    run(m, at(2000), 0.2);
    expect(m.list[0]?.state).toBe('dive');
    run(m, at(2000), STAGGER * 2 + 1);
    expect(m.list.every((x) => x.state === 'away')).toBe(true);
  });

  it('are heard, then seen, once each, and sing their four notes only in earshot', () => {
    const m = upOnTheRocks();
    const said: string[] = [];
    const notes: number[] = [];
    m.onHear = () => said.push('hear');
    m.onSight = () => said.push('sight');
    m.onNote = (n) => notes.push(n);
    run(m, at(MER_EARSHOT + 100), 20);
    expect([said, notes]).toEqual([[], []]);
    run(m, at(MER_EARSHOT - 100), 20);
    expect(said).toEqual(['hear']);
    expect(notes.length).toBeGreaterThan(8);
    expect(notes.every((n) => n >= 0 && n <= 3)).toBe(true);
    expect(new Set(notes).size).toBeGreaterThan(2);
    run(m, at(MER_SIGHT - 40), 2);
    run(m, at(MER_EARSHOT - 100), 2);
    run(m, at(MER_SIGHT - 40), 2);
    expect(said).toEqual(['hear', 'sight']);
    // Their song fills the sea near them and is gone far off.
    expect(m.presence).toBe(1);
    run(m, at(MER_EARSHOT + 100), 1);
    expect(m.presence).toBe(0);
  });

  it('go under from a boat coming on fast, and come back up a while after it has slowed', () => {
    const m = upOnTheRocks();
    let spooked = 0;
    m.onSpook = () => spooked++;
    run(m, at(200, SPOOK + 30), 0.1);
    expect([spooked, m.list.every((x) => x.state === 'dive')]).toEqual([1, true]);
    run(m, at(200, GENTLE + 20), HIDE_T + 2);
    expect(m.list.every((x) => x.state === 'away')).toBe(true);
    run(m, at(200, GENTLE - 30), STAGGER * 2 + RISE_T + 0.5);
    expect(m.list.every((x) => x.state === 'sit')).toBe(true);
    // A gentle boat right up close never frightens them.
    run(m, at(MER_SIGHT - 100, GENTLE), 5);
    expect([spooked, m.list.every((x) => x.state === 'sit')]).toEqual([1, true]);
  });

  it('are seen and heard from the figure ashore, and a figure ashore never frightens them', () => {
    const m = upOnTheRocks();
    let seen = 0;
    m.onSight = () => seen++;
    const figure = { x: MER_ROCKS.x - 150, y: MER_ROCKS.y - 150, vx: 0, vy: 0 };
    run(m, at(2000, SPOOK + 50, { figure }), 1);
    expect([seen, m.list.every((x) => x.state === 'sit')]).toEqual([1, true]);
  });

  it('are not there by day, and the rocks say so once', () => {
    const m = new Mermaids();
    m.clock = NOON;
    let empty = 0;
    m.onEmpty = () => empty++;
    run(m, at(MER_SIGHT - 50), 3);
    run(m, at(2000), 1);
    run(m, at(MER_SIGHT - 50), 3);
    expect([empty, m.out.length]).toEqual([1, 0]);
  });

  it('sing phrases of four to six notes, stepping among the four, the last one held', () => {
    let seed = 7;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 50; i++) {
      const p = merPhrase(r);
      expect(p.length).toBeGreaterThanOrEqual(4);
      expect(p.length).toBeLessThanOrEqual(6);
      for (const [k, [n]] of p.entries()) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(3);
        if (k)
          expect(Math.abs(n - (p[k - 1] as readonly [number, number])[0])).toBeLessThanOrEqual(2);
      }
      const last = p[p.length - 1] as readonly [number, number];
      expect(last[1]).toBeGreaterThan((p[0] as readonly [number, number])[1]);
    }
    expect(merLevel(0)).toBe(1);
    expect(merLevel(MER_EARSHOT)).toBe(0);
  });

  it('take over the pad with their own chord, and sing under the dolphin whistle', () => {
    expect(padNotes('Night', MER_TAKEOVER + 0.1)).toEqual([...MER_CHORD]);
    expect(padNotes('Night', 0)).not.toEqual([...MER_CHORD]);
    const top = Math.max(...MER_NOTES) * Math.max(...MER_VOICE.map((o) => o[0]));
    expect(top).toBeLessThan(1400);
    expect(Math.max(...MER_CHORD)).toBeLessThan(1400);
    expect(MER_NOTES).toHaveLength(4);
  });

  it('are drawn: the rocks, a mermaid on hers singing, swimming in, diving, her notes and her light', () => {
    const { v, calls } = fakeView();
    const m = upOnTheRocks();
    m.onNote = () => undefined;
    run(m, at(MER_SIGHT - 50), 6);
    const singer = m.list.find((x) => x.sing > 0) ?? m.list[0];
    if (singer) singer.sing = 1;
    for (const [i, r] of ROCKS.entries()) drawMerRock(v, r, i, m.on(r));
    v.dark = 1;
    for (const layer of ['air', 'mask', 'glow'] as const) drawMermaids(v, layer, m);
    expect(calls.light).toBe(3);
    expect(calls.glow).toBe(3);
    expect(calls.extrude).toBe(ROCKS.length * 2);
    const one = m.list[0];
    if (!one) throw new Error('no mermaids');
    expect(merInWater(one)).toBe(null);
    Object.assign(one, { state: 'rise', up: 0.4 });
    expect(merInWater(one)).not.toBe(null);
    drawMerInWater(v, one);
    Object.assign(one, { state: 'dive', up: 0.5 });
    drawMerInWater(v, one);
    expect(calls.fill ?? 0).toBeGreaterThan(40);
    expect(calls.stroke ?? 0).toBeGreaterThan(20);
  });
});
