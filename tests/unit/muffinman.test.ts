import { describe, expect, it } from 'vitest';
import {
  BAKER,
  BAKERY,
  DRURY_LANE,
  HAIL_REACH,
  MUFFIN_LINES,
  MuffinMan,
  SAY_FOR,
  TALK_REACH,
} from '../../src/entities/muffinman';
import { LANDING, onLand, onPier, walkable } from '../../src/entities/walker';
import { IY, PX0 } from '../../src/world/island';
import { baseWorld } from './helpers/world';

describe('the muffin man', () => {
  it("goes round the owner's three lines for ever, never resolving", () => {
    const m = new MuffinMan();
    expect(MUFFIN_LINES).toEqual([
      'Do you know the muffin man?',
      'I AM the muffin man.',
      'Do you know him?',
    ]);
    const said = Array.from({ length: 7 }, () => m.say());
    expect(said).toEqual([...MUFFIN_LINES, ...MUFFIN_LINES, MUFFIN_LINES[0]]);
  });

  it('says nothing until asked, and each line stays up a while, then goes', () => {
    const m = new MuffinMan();
    const w = baseWorld({});
    expect(m.saying()).toBeNull();
    m.say();
    m.update(SAY_FOR - 0.1, w);
    expect(m.saying()).toBe(MUFFIN_LINES[0]);
    m.update(0.2, w);
    expect(m.saying()).toBeNull();
    // He hops as a line starts, and has settled by the time it is read.
    m.say();
    m.update(0.25, w);
    expect(m.bounce()).toBeGreaterThan(0.9);
    m.update(0.5, w);
    expect(m.bounce()).toBe(0);
  });

  it('knows when the figure is near enough to hail, and only ashore', () => {
    const m = new MuffinMan();
    m.update(0.1, baseWorld({ ashore: { x: BAKER.x, y: BAKER.y + HAIL_REACH - 5 } }));
    expect(m.near).toBe(true);
    m.update(0.1, baseWorld({ ashore: { x: BAKER.x, y: BAKER.y + HAIL_REACH + 5 } }));
    expect(m.near).toBe(false);
    m.update(0.1, baseWorld({ ashore: null }));
    expect(m.near).toBe(false);
  });

  it('can be talked to from in front of his counter, but not from the end of the pier', () => {
    expect(MuffinMan.reaches(BAKER.x, IY + 4)).toBe(true);
    expect(MuffinMan.reaches(BAKER.x + TALK_REACH, IY + 4)).toBe(false);
    expect(MuffinMan.reaches(LANDING.x, LANDING.y)).toBe(false);
  });
});

describe('his stall and Drury Lane', () => {
  it('stands on the pier, between its root and the crates, and nobody walks through it', () => {
    expect(onPier(BAKER.x, BAKER.y)).toBe(true);
    expect(BAKERY.x0).toBeGreaterThan(PX0);
    expect(BAKERY.x1).toBeLessThan(PX0 + 93);
    expect(walkable((BAKERY.x0 + BAKERY.x1) / 2, (BAKERY.y0 + BAKERY.y1) / 2, 0)).toBe(false);
    // The way along the pier in front of it stays open.
    for (let x = BAKERY.x0; x <= BAKERY.x1; x += 2) {
      expect(walkable(x, IY - 6, 0)).toBe(true);
      expect(walkable(x, LANDING.y, 0)).toBe(true);
    }
  });

  it('has its street sign on the sand by the pier root, which the figure walks round', () => {
    expect(onLand(DRURY_LANE.x, DRURY_LANE.y)).toBe(true);
    expect(onPier(DRURY_LANE.x, DRURY_LANE.y)).toBe(false);
    expect(walkable(DRURY_LANE.x, DRURY_LANE.y, 0)).toBe(false);
    expect(walkable(DRURY_LANE.x + 6, DRURY_LANE.y, 0)).toBe(true);
  });
});
