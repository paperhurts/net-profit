import { describe, expect, it } from 'vitest';
import {
  MER_TAKEOVER,
  MER_VOICE,
  padNotes,
  SIREN_CHORD,
  SIREN_NOTES,
} from '../../src/audio/ambience';
import type { World } from '../../src/entities/entity';
import {
  BREAK_FREE,
  CHARM_NEAR,
  COME_T,
  GO_T,
  PULL_SPEED,
  pullAt,
  SIREN_REACH,
  SIREN_STAGGER,
  Sirens,
} from '../../src/entities/sirens';
import { drawMerRock } from '../../src/render/mermaids';
import { drawSirens } from '../../src/render/sirens';
import { ISLE2 } from '../../src/world/isle2';
import {
  MER_ROCKS,
  MIDNIGHT,
  ROCKS,
  SEATS,
  SIREN_FROM,
  sirenHours,
} from '../../src/world/mermaids';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const LATE = SIREN_FROM + 0.02;

/** A world with the boat this far along the shore from the rocks, heading h, going v. */
function at(dist: number, v = 0, h = 0, over: Partial<World> = {}): World {
  const ox = MER_ROCKS.x - ISLE2.x;
  const oy = MER_ROCKS.y - ISLE2.y;
  const od = Math.hypot(ox, oy);
  return baseWorld({
    boat: { x: MER_ROCKS.x - (oy / od) * dist, y: MER_ROCKS.y + (ox / od) * dist, h, v },
    ...over,
  });
}

const run = (s: Sirens, w: World, secs: number) => {
  for (let t = 0; t < secs - 1e-9; t += 1 / 60) s.update(1 / 60, w);
};

/** The sirens after midnight, all three on their rocks, the boat far off. */
function perched(): Sirens {
  const s = new Sirens();
  s.clock = LATE;
  run(s, at(3000), SIREN_STAGGER * 2 + COME_T + 0.3);
  return s;
}

describe('the sirens', () => {
  it('keep the rocks from a little after midnight until dawn', () => {
    expect(sirenHours(MIDNIGHT - 0.01)).toBe(false);
    expect(sirenHours(SIREN_FROM)).toBe(true);
    expect(sirenHours(0.99)).toBe(true);
    expect(sirenHours(0.02)).toBe(false);
  });

  it("fly in one after another and perch on the mermaids' rocks, and fly off at dawn", () => {
    const s = new Sirens();
    s.clock = LATE;
    run(s, at(3000), 0.1);
    expect(s.list.map((x) => x.state)).toEqual(['come', 'away', 'away']);
    run(s, at(3000), SIREN_STAGGER * 2 + COME_T);
    expect(s.perched).toHaveLength(3);
    expect(SEATS.every((r) => s.on(r) !== null)).toBe(true);
    s.clock = 0.03;
    run(s, at(3000), 0.1);
    expect(s.list.every((x) => x.state === 'go')).toBe(true);
    run(s, at(3000), GO_T + 0.1);
    expect(s.list.every((x) => x.state === 'away')).toBe(true);
  });

  it('pull a boat in reach toward their rocks, harder the nearer, and keep it moving', () => {
    const s = perched();
    let pulled = 0;
    s.onPull = () => pulled++;
    run(s, at(SIREN_REACH + 50), 0.5);
    expect([s.pull, pulled]).toEqual([0, 0]);
    const w = at(350, 0, 0);
    run(s, w, 0.1);
    expect(s.pull).toBeCloseTo(pullAt(350), 5);
    expect(pulled).toBe(1);
    expect(s.pullTo).not.toBe(null);
    const r = s.pullTo as (typeof ROCKS)[number];
    const b = { ...w.boat };
    const before = Math.abs(Math.atan2(r.y - b.y, r.x - b.x) - b.h);
    for (let i = 0; i < 30; i++) s.steer(b, 1 / 60);
    const after = Math.abs(Math.atan2(r.y - b.y, r.x - b.x) - b.h);
    expect(after).toBeLessThan(before);
    expect(b.v).toBeGreaterThanOrEqual(PULL_SPEED * s.pull - 1e-6);
    expect(pullAt(150)).toBe(1);
  });

  it('pull a boat racing away at full speed only half as hard, and never one tied up or left ashore', () => {
    const s = perched();
    run(s, at(350, 0, 0), 0.1);
    const full = s.pull;
    const away = Math.atan2(
      -(s.pullTo?.y ?? 0) + at(350).boat.y,
      -(s.pullTo?.x ?? 0) + at(350).boat.x,
    );
    run(s, at(350, BREAK_FREE * s.topSpeed + 1, away), 0.1);
    expect(s.pull).toBeCloseTo(full / 2, 5);
    run(s, at(350, 0, 0, { figure: { x: 0, y: 0, vx: 0, vy: 0 } }), 0.1);
    expect(s.pull).toBe(0);
    run(s, at(350, 0, 0, { docked: true }), 0.1);
    expect(s.pull).toBe(0);
  });

  it('cannot pull a boat wearing the charm, and shriek off for the night when it comes near', () => {
    const s = perched();
    s.charm = true;
    let foiled = 0;
    s.onFoiled = () => foiled++;
    run(s, at(400), 1);
    expect([s.pull, foiled, s.perched.length]).toEqual([0, 0, 3]);
    run(s, at(CHARM_NEAR - 40), 0.1);
    expect(foiled).toBe(1);
    expect(s.list.every((x) => x.state === 'go')).toBe(true);
    run(s, at(3000), GO_T + 5);
    expect(s.list.every((x) => x.state === 'away')).toBe(true);
    // Not back that night; back the next.
    s.clock = 0.3;
    run(s, at(3000), 0.1);
    s.clock = LATE;
    run(s, at(3000), SIREN_STAGGER * 2 + COME_T + 0.3);
    expect(s.perched).toHaveLength(3);
  });

  it('sing in earshot, each note drifting off toward the boat', () => {
    const s = perched();
    const notes: number[] = [];
    s.onNote = (n) => notes.push(n);
    run(s, at(SIREN_REACH + 400), 4);
    expect(notes).toHaveLength(0);
    run(s, at(400), 6);
    expect(notes.length).toBeGreaterThan(3);
    expect(notes.every((n) => n >= 0 && n <= 3)).toBe(true);
    const n = s.notes.at(-1);
    expect(n && Math.hypot(n.tx - at(400).boat.x, n.ty - at(400).boat.y)).toBeLessThan(1);
  });

  it('sing in a minor key under the dolphin whistle, and their chord takes the pad', () => {
    expect(Math.max(...SIREN_NOTES) * Math.max(...MER_VOICE.map((o) => o[0]))).toBeLessThan(1400);
    expect(padNotes('Night', 0, MER_TAKEOVER + 0.1)).toEqual([...SIREN_CHORD]);
    expect(padNotes('Night', MER_TAKEOVER + 0.1, MER_TAKEOVER + 0.1)).toEqual([...SIREN_CHORD]);
  });

  it('are drawn: perched on their rocks, flying in, their notes, and their eyes at night', () => {
    const { v, calls } = fakeView();
    const s = perched();
    run(s, at(400), 3);
    for (const [i, r] of ROCKS.entries()) drawMerRock(v, r, i, null, s.on(r));
    const one = s.list[0];
    if (!one) throw new Error('no sirens');
    one.sing = 0.5;
    drawMerRock(v, one.seat, 0, null, one);
    Object.assign(s.list[1] ?? {}, { state: 'come', t: 1 });
    v.dark = 1;
    for (const layer of ['air', 'mask', 'glow'] as const) drawSirens(v, layer, s);
    expect(calls.light).toBe(2);
    expect(calls.glow).toBe(2);
    expect(calls.fill ?? 0).toBeGreaterThan(40);
  });
});
