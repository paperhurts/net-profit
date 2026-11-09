/**
 * The classes in New Dimensions (data/dimension.ts), the kid's: pick one going in, and change between rounds ("both").
 * One level for them all (my pick, hers to change). The rest of his list comes a piece at a time.
 */
export type ClassId = 'warrior' | 'wizard' | 'paladin' | 'assassin';
export const CLASSES: readonly ClassId[] = ['warrior', 'wizard', 'paladin', 'assassin'];
export const CLASS_NAMES: Readonly<Record<ClassId, string>> = {
  warrior: 'Warrior',
  wizard: 'Wizard',
  paladin: 'Paladin',
  assassin: 'Assassin',
};
export const CLASS_BLURBS: Readonly<Record<ClassId, string>> = {
  warrior: 'Sword and shield, rage, Charge, Slam and Leap.',
  wizard: 'Fireball, grease, misty step, mage armor, and magic missile from level 7.',
  paladin:
    'A mace, a holy sword, holy light, healing light, and two blessings. Tough on the undead.',
  assassin:
    'Quick daggers, Vanish and a sneak attack, throwing knives, a smoke bomb and shadow step.',
};
export function parseClass(v: unknown): ClassId {
  return (CLASSES as readonly unknown[]).includes(v) ? (v as ClassId) : 'warrior';
}
