import { describe, expect, it } from 'vitest';
import type { World } from '../../src/entities/entity';
import { HEEL, WalkingPet } from '../../src/entities/petwalk';

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
});
