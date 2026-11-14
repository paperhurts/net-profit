import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import { FAINT_T, HEEL, LOVE_T, WalkingPet } from '../../src/entities/petwalk';

const DT = 1 / 60;
const world = (x: number, y: number) => ({ figure: { x, y } }) as unknown as World;

describe('the walking pet', () => {
  it('trots at the heel, strolls off to wait at a lead, and strolls back when it is cleared', () => {
    const p = new WalkingPet();
    p.on = true;
    for (let i = 0; i < 120; i++) p.update(DT, world(0, 0));
    expect(Math.hypot(p.x, p.y)).toBeLessThan(HEEL);
    // A lead 100 away: it walks there, not in one hop.
    p.lead = { x: 100, y: 0 };
    p.update(DT, world(0, 0));
    expect(p.x).toBeLessThan(5);
    for (let i = 0; i < 240; i++) p.update(DT, world(0, 0));
    expect(Math.hypot(p.x - 100, p.y)).toBeLessThan(3);
    expect(p.walk).toBeLessThan(0.5);
    // Cleared: back to the figure, walking, and at its heel again after.
    p.lead = null;
    p.update(DT, world(0, 0));
    expect(p.x).toBeGreaterThan(90);
    for (let i = 0; i < 300; i++) p.update(DT, world(0, 0));
    expect(Math.hypot(p.x, p.y)).toBeLessThan(HEEL);
  });

  it('a pet that faints (the pygmy goat) keels over at a pat or a fright, lies stiff where it fell, and gets up again', () => {
    const p = new WalkingPet();
    p.on = true;
    p.faints = true;
    for (let i = 0; i < 60; i++) p.update(DT, world(0, 0));
    // A pat: no hearts, over it goes.
    p.pet();
    expect(p.love).toBe(0);
    expect(p.faint).toBe(FAINT_T);
    expect(p.tipped()).toBe(0);
    const at = { x: p.x, y: p.y };
    for (let i = 0; i < 30; i++) p.update(DT, world(i * 2, 0));
    expect(p.tipped()).toBe(1);
    // Lying stiff, it stays put while the figure walks off, and another fright does not knock it over again.
    expect([p.x, p.y]).toEqual([at.x, at.y]);
    expect(p.startle()).toBe(false);
    for (let i = 0; i < FAINT_T * 60; i++) p.update(DT, world(60, 0));
    expect(p.faint).toBe(0);
    expect(p.tipped()).toBe(0);
    // Up again, it is back with the figure.
    for (let i = 0; i < 120; i++) p.update(DT, world(60, 0));
    expect(Math.hypot(p.x - 60, p.y)).toBeLessThan(HEEL);
    expect(p.startle()).toBe(true);
  });

  it('any other pet hops with hearts at a pat and never faints', () => {
    const p = new WalkingPet();
    p.on = true;
    p.pet();
    expect(p.love).toBe(LOVE_T);
    expect(p.startle()).toBe(false);
    expect(p.faint).toBe(0);
  });
});
