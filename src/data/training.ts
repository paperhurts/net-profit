/**
 * Training, the pet system's sixth piece (data/petsys.ts). The owner's call (2026-10-24): pets train only at the pet
 * house, never while walking with you. Every pet of your own living there gains experience in real time, the game
 * closed or not, toward levels 1 to 10; the pet battles to come fill the same bar. Nothing is ever lost: no hunger,
 * no sadness, no level going down.
 *
 * Kept as a timestamp, as the eggs are: when training was last counted (`tr`), and each pet's experience. A long time
 * away counts as a day at most, so a week away is the same as a day and nobody has to leave the game shut to catch up.
 * A clock gone backwards counts as no time passed.
 */
import type { EntryKey, PetSave } from './petsys';

export const LEVEL_MAX = 10;
/** Experience a minute at the pet house. */
export const TRAIN_PER_MIN = 1;
/** The most time away that counts at once: a day. */
export const TRAIN_CAP_MS = 24 * 60 * 60_000;
const MIN = 60_000;

/** Experience from level lv to the next: 100 for level 2, 200 more for 3, and so on. */
export function toNext(lv: number): number {
  return lv * 100;
}

/** All the experience there is: level 10. */
export const XP_MAX = Array.from({ length: LEVEL_MAX - 1 }, (_, i) => toNext(i + 1)).reduce(
  (a, b) => a + b,
  0,
);

/** A level, how far into it, and how much it takes; at level 10, need is 0. */
export type Level = { lv: number; into: number; need: number };

export function levelOf(xp: number): Level {
  let left = Math.max(0, Math.min(XP_MAX, Math.floor(xp) || 0));
  let lv = 1;
  while (lv < LEVEL_MAX && left >= toNext(lv)) {
    left -= toNext(lv);
    lv++;
  }
  return lv === LEVEL_MAX ? { lv, into: 0, need: 0 } : { lv, into: left, need: toNext(lv) };
}

/** A pet's experience, as read from a save: a whole number, 0 to XP_MAX. */
export function cleanXp(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.max(0, Math.min(XP_MAX, Math.floor(v)))
    : 0;
}

/** One who went up a level while training. */
export type LevelUp = { key: EntryKey; name: string; lv: number };

/**
 * Count the training done since it was last counted: every pet of your own at the pet house, not walking with you,
 * gains experience for the whole minutes passed (a day at most). The game calls this as it loads, now and then while
 * playing, and before a pet starts or stops walking, so walking time never counts and house time always does. Says
 * who went up a level.
 */
export function train(p: PetSave, now: number): LevelUp[] {
  const t = Math.floor(now);
  if (!p.house || !p.tr || t < p.tr) {
    p.tr = p.house ? t : 0;
    return [];
  }
  const passed = t - p.tr;
  const mins = Math.floor(Math.min(passed, TRAIN_CAP_MS) / MIN);
  if (mins < 1) return [];
  // The part of a minute left over is kept for next time; anything over the day is let go.
  p.tr = passed > TRAIN_CAP_MS ? t : p.tr + mins * MIN;
  const gain = mins * TRAIN_PER_MIN;
  const ups: LevelUp[] = [];
  const pets: [EntryKey, { nm: string; xp?: number }][] = [
    ...p.drawn.map((d): [EntryKey, typeof d] => [`d${d.id}`, d]),
    ...p.hatched.map((h): [EntryKey, typeof h] => [`h${h.id}`, h]),
  ];
  for (const [key, pet] of pets) {
    if (key === p.walk) continue;
    const was = levelOf(pet.xp ?? 0).lv;
    pet.xp = Math.min(XP_MAX, (pet.xp ?? 0) + gain);
    const lv = levelOf(pet.xp).lv;
    if (lv > was) ups.push({ key, name: pet.nm, lv });
  }
  return ups;
}

/** What the game says about level-ups: one line, for a toast. */
export function levelUpLine(ups: readonly LevelUp[], away: boolean): string {
  const [first] = ups;
  if (!first) return '';
  const lead = away ? 'While you were away, ' : '';
  if (ups.length === 1)
    return `${lead}${first.name} ${away ? 'trained up to' : 'is now'} level ${first.lv}!`;
  const names = ups.map((u) => u.name);
  const list = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${lead}${list} ${away ? 'trained up a level' : 'went up a level'} at the pet house!`;
}
