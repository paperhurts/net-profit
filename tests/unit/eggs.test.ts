import { describe, expect, it } from 'vitest';
import {
  EGG_HATCH_MS,
  EGG_HATCHES,
  EGG_ROOM,
  eggDue,
  eggLeft,
  eggRoom,
  layEgg,
  parseEggs,
} from '../../src/data/eggs';
import { noPets, parsePets, petsForSave } from '../../src/data/petsys';

const T = 1_761_300_000_000;

describe("eggs, the Garden Isle's way into the pet system", () => {
  it('lays an egg with what will hatch rolled now, and fills the crate at three', () => {
    const p = noPets();
    expect(eggRoom(p)).toBe(EGG_ROOM);
    const e = layEgg(p, 'rare', 'garden', T, () => 0.99);
    expect(e).toEqual({ k: 'rare', sp: 'fox', from: 'garden', at: T, due: T + EGG_HATCH_MS.rare });
    expect(layEgg(p, 'common', 'garden', T, () => 0)?.sp).toBe('bunny');
    expect(layEgg(p, 'mythic', 'gift', T)?.sp).toBe('moth');
    expect(eggRoom(p)).toBe(0);
    expect(layEgg(p, 'common', 'garden', T)).toBeNull();
    expect(p.eggs).toHaveLength(EGG_ROOM);
  });

  it('hatches in real time: closed or not, it is only the clock that counts', () => {
    const p = noPets();
    const e = layEgg(p, 'common', 'garden', T);
    if (!e) throw new Error('no egg');
    expect(eggDue(e, T + EGG_HATCH_MS.common - 1)).toBe(false);
    expect(eggLeft(e, T + 60_000)).toBe(EGG_HATCH_MS.common - 60_000);
    // A day later, the app closed all the while.
    expect(eggDue(e, T + 24 * 3600_000)).toBe(true);
    expect(eggLeft(e, T + 24 * 3600_000)).toBe(0);
    // A clock gone back counts as no time passed, never as hatched.
    expect(eggDue(e, T - 3600_000)).toBe(false);
    expect(eggLeft(e, T - 3600_000)).toBe(EGG_HATCH_MS.common);
  });

  it('every kind hatches inside an evening, into something', () => {
    expect(EGG_HATCH_MS.common).toBe(10 * 60_000);
    expect(EGG_HATCH_MS.rare).toBe(3600_000);
    expect(EGG_HATCH_MS.mythic).toBe(4 * 3600_000);
    for (const pool of Object.values(EGG_HATCHES)) expect(pool.length).toBeGreaterThan(0);
  });

  it('goes through the save and back, and reads nothing odd', () => {
    const p = noPets();
    layEgg(p, 'rare', 'garden', T, () => 0);
    expect(parsePets(JSON.parse(JSON.stringify(petsForSave(p))))).toEqual(p);
    // Odd ones: an unknown kind, a hatchling it could not hold, a due date past its kind's wait, a fourth.
    const got = parseEggs([
      { k: 'dragon', sp: 'x', at: T, due: T },
      { k: 'common', sp: 'dragon', at: T, due: T + 1 },
      { k: 'common', sp: 'frog', at: T, due: T + 99 * 3600_000 },
      'egg',
      { k: 'rare', sp: 'fox', from: 'gift', at: T, due: T + 5 },
      { k: 'mythic', sp: 'moth', at: T, due: T },
    ]);
    expect(got).toEqual([
      { k: 'common', sp: 'bunny', from: 'garden', at: T, due: T + 1 },
      { k: 'common', sp: 'frog', from: 'garden', at: T, due: T + EGG_HATCH_MS.common },
      { k: 'rare', sp: 'fox', from: 'gift', at: T, due: T + 5 },
    ]);
    expect(parseEggs('eggs')).toEqual([]);
  });
});
