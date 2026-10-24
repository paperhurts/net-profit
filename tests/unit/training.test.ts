import { describe, expect, it } from 'vitest';
import { noPets, type PetSave, parsePets, petsForSave } from '../../src/data/petsys';
import {
  cleanXp,
  LEVEL_MAX,
  levelOf,
  levelUpLine,
  TRAIN_CAP_MS,
  train,
  XP_MAX,
} from '../../src/data/training';

const MIN = 60_000;
const T0 = 1_800_000_000_000;

function withPets(house: boolean): PetSave {
  const p = noPets();
  p.drawn.push({ id: 1, nm: 'Wiggles', d: 'AUUsU', got: 0 });
  p.hatched.push({ id: 1, sp: 'frog', nm: 'Hoppy', got: 0, from: 'garden' });
  p.house = house;
  return p;
}

describe('pet levels', () => {
  it('go from 1 to 10, each a little longer than the last', () => {
    expect(levelOf(0)).toEqual({ lv: 1, into: 0, need: 100 });
    expect(levelOf(99).lv).toBe(1);
    expect(levelOf(100)).toEqual({ lv: 2, into: 0, need: 200 });
    expect(levelOf(350)).toEqual({ lv: 3, into: 50, need: 300 });
    expect(XP_MAX).toBe(4500);
    expect(levelOf(XP_MAX)).toEqual({ lv: LEVEL_MAX, into: 0, need: 0 });
    expect(levelOf(XP_MAX * 9).lv).toBe(LEVEL_MAX);
    expect(levelOf(-5).lv).toBe(1);
    expect(levelOf(Number.NaN).lv).toBe(1);
  });

  it('read back from a save as whole numbers in range', () => {
    expect(cleanXp(12.7)).toBe(12);
    expect(cleanXp(-3)).toBe(0);
    expect(cleanXp('lots')).toBe(0);
    expect(cleanXp(1e9)).toBe(XP_MAX);
  });
});

describe('training at the pet house', () => {
  it('starts the clock the moment the house is there, and counts whole minutes', () => {
    const p = withPets(true);
    expect(train(p, T0)).toEqual([]);
    expect(p.tr).toBe(T0);
    train(p, T0 + 90_000);
    expect(p.drawn[0]?.xp).toBe(1);
    // The half minute over is kept for next time.
    expect(p.tr).toBe(T0 + MIN);
    train(p, T0 + 2 * MIN);
    expect(p.drawn[0]?.xp).toBe(2);
  });

  it('only trains pets at the house: none without one, and never the one walking with you', () => {
    const none = withPets(false);
    train(none, T0);
    train(none, T0 + 60 * MIN);
    expect(none.drawn[0]?.xp).toBeUndefined();
    expect(none.tr).toBe(0);
    const p = withPets(true);
    p.walk = 'h1';
    train(p, T0);
    train(p, T0 + 30 * MIN);
    expect(p.drawn[0]?.xp).toBe(30);
    expect(p.hatched[0]?.xp).toBeUndefined();
  });

  it('counts a long time away as a day at most, so a week away is the same as a day', () => {
    const day = withPets(true);
    train(day, T0);
    train(day, T0 + TRAIN_CAP_MS);
    const week = withPets(true);
    train(week, T0);
    train(week, T0 + 7 * TRAIN_CAP_MS);
    expect(week.drawn[0]?.xp).toBe(day.drawn[0]?.xp);
    expect(week.drawn[0]?.xp).toBe(24 * 60);
    expect(week.tr).toBe(T0 + 7 * TRAIN_CAP_MS);
  });

  it('counts a clock gone backwards as no time passed, and never takes a level away', () => {
    const p = withPets(true);
    train(p, T0);
    train(p, T0 + 10 * MIN);
    train(p, T0 - 5 * TRAIN_CAP_MS);
    expect(p.drawn[0]?.xp).toBe(10);
    train(p, T0 - 5 * TRAIN_CAP_MS + 3 * MIN);
    expect(p.drawn[0]?.xp).toBe(13);
  });

  it('says who went up a level, and stops at level 10', () => {
    const p = withPets(true);
    train(p, T0);
    const ups = train(p, T0 + 100 * MIN);
    expect(ups).toEqual([
      { key: 'd1', name: 'Wiggles', lv: 2 },
      { key: 'h1', name: 'Hoppy', lv: 2 },
    ]);
    const d = p.drawn[0];
    if (d) d.xp = XP_MAX - 1;
    train(p, T0 + 200 * MIN);
    expect(p.drawn[0]?.xp).toBe(XP_MAX);
    expect(levelUpLine(ups, true)).toBe(
      'While you were away, Wiggles and Hoppy trained up a level at the pet house!',
    );
    expect(levelUpLine(ups.slice(0, 1), false)).toBe('Wiggles is now level 2!');
    expect(levelUpLine([], false)).toBe('');
  });

  it('is kept in the save, and a save from before training reads as none', () => {
    const p = withPets(true);
    train(p, T0);
    train(p, T0 + 42 * MIN);
    const back = parsePets(JSON.parse(JSON.stringify(petsForSave(p))));
    expect(back.tr).toBe(p.tr);
    expect(back.drawn[0]?.xp).toBe(42);
    expect(back.hatched[0]?.xp).toBe(42);
    const old = parsePets({ drawn: [{ id: 1, nm: 'Wiggles', d: 'AUUsU', got: 0 }], house: true });
    expect(old.tr).toBe(0);
    expect(old.drawn[0]?.xp).toBeUndefined();
    // No house, no clock kept.
    expect(parsePets({ tr: T0 }).tr).toBe(0);
  });
});
