/**
 * The Paladin in New Dimensions (data/dimension.ts), the kid's (his lists of 2026-11-07: "holy light, 1 more against
 * the dead; a holy sword, 3 at level 1 and 8 at 10"), with three more through the owner (2026-11-08): Healing Light,
 * a Blessing of Protection and his Blessing of Disagreements, talked through with her before building.
 *
 * Her calls: Holy Light blinds what is round him, hits it for 1 (2 against the dead) and gives him a heart back; the
 * Reaper is not dead; Healing Light heals 2, every 20 s (so the Healer, to come, stays the big healer); five buttons,
 * not the two blessings on one. My picks, hers to change: the holy sword is a big strike every 4 s, not his everyday
 * blow (3 at level 1 would make the Warrior pointless), with 5 at level 5 and 10 at 16 filled in round his 3 and 8;
 * his everyday blow is a mace up close, the Warrior's damage and 1 more against the dead; Holy Light every 8 s, its
 * blind 1.5 s (a boss on the Warrior's stun limit); Protection 2 more hearts for 10 s, every 25 s; Disagreements 1
 * more on each of his next 3 blows within 8 s, every 10 s. "Allies" are only him while the companions stay home.
 *
 * Here: the numbers, free of the game. His waits live in the Warrior's bag (warrior.ts Fury), so the pepper works.
 */
import { basicPower, type Fury, peppered } from './warrior';

export type Prayer = 'sword' | 'light' | 'heal' | 'protect' | 'disagree';
/** In the order of his five buttons. */
export const PRAYERS: readonly Prayer[] = ['sword', 'light', 'heal', 'protect', 'disagree'];
export const PRAYER_SPECS: Readonly<Record<Prayer, { name: string; every: number }>> = {
  sword: { name: 'Holy sword', every: 4 },
  light: { name: 'Holy light', every: 8 },
  heal: { name: 'Healing light', every: 20 },
  protect: { name: 'Blessing of Protection', every: 25 },
  disagree: { name: 'Blessing of Disagreements', every: 10 },
};

/** His mace: the Warrior's reach and damage, and 1 more against the dead. */
export const MACE_REACH = 52;
export const MACE_RELOAD = 0.45;
export const DEAD_MORE = 1;
export function macePower(lv: number, dead: boolean): number {
  return basicPower(lv) + (dead ? DEAD_MORE : 0);
}

/** His holy sword: 3 at level 1, 8 at 10 (his); 5 at 5 and 10 at 16 (mine). Up close, a little further than the mace. */
export const SWORD_REACH = 64;
export function holySwordPower(lv: number): number {
  if (lv >= 16) return 10;
  if (lv >= 10) return 8;
  if (lv >= 5) return 5;
  return 3;
}

/** Holy Light: all round him, 1 (2 against the dead), blinding them, and a heart back to him. */
export const LIGHT_R = 90;
export function lightPower(dead: boolean): number {
  return dead ? 2 : 1;
}
export const BLIND = 1.5;
export const LIGHT_HEAL = 1;

/** Healing Light: 2 hearts back. */
export const HEAL = 2;

/** Blessing of Protection: 2 more hearts while it lasts. */
export const PROTECT_HEARTS = 2;
export const PROTECT_TIME = 10;

/** Blessing of Disagreements: 1 more on each of his next 3 blows, within 8 s. */
export const DISAGREE_MORE = 1;
export const DISAGREE_BLOWS = 3;
export const DISAGREE_TIME = 8;

export function noPrayer(f: Fury, p: Prayer): 'wait' | null {
  return (f.cd[p] ?? 0) > 0 && !peppered(f) ? 'wait' : null;
}
export function pray(f: Fury, p: Prayer): boolean {
  if (noPrayer(f, p)) return false;
  if (peppered(f)) {
    f.skips--;
    f.cd[p] = 0;
  } else f.cd[p] = PRAYER_SPECS[p].every;
  return true;
}

/** His blessings while they last. */
export type Blessings = { protectT: number; disagree: number; disagreeT: number };
export function noBlessings(): Blessings {
  return { protectT: 0, disagree: 0, disagreeT: 0 };
}
export function tickBlessings(b: Blessings, dt: number): void {
  b.protectT = Math.max(0, b.protectT - dt);
  b.disagreeT = Math.max(0, b.disagreeT - dt);
  if (b.disagreeT <= 0) b.disagree = 0;
}
/** One of his blows: its extra from Disagreements, a charge spent. */
export function blowMore(b: Blessings): number {
  if (b.disagree <= 0) return 0;
  b.disagree--;
  return DISAGREE_MORE;
}
/** Hearts on top while Protection lasts. */
export function protectHearts(b: Blessings): number {
  return b.protectT > 0 ? PROTECT_HEARTS : 0;
}
