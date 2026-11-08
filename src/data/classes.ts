/**
 * The classes in New Dimensions (data/dimension.ts), the kid's: pick one going in, and change between rounds ("both").
 * One level for them all (my pick, hers to change). The rest of his list comes a piece at a time.
 */
export type ClassId = 'warrior' | 'wizard';
export const CLASSES: readonly ClassId[] = ['warrior', 'wizard'];
export const CLASS_NAMES: Readonly<Record<ClassId, string>> = {
  warrior: 'Warrior',
  wizard: 'Wizard',
};
export const CLASS_BLURBS: Readonly<Record<ClassId, string>> = {
  warrior: 'Sword and shield, rage, Charge, Slam and Leap.',
  wizard: 'Fireball, grease, misty step, mage armor, and magic missile from level 7.',
};
export function parseClass(v: unknown): ClassId {
  return (CLASSES as readonly unknown[]).includes(v) ? (v as ClassId) : 'warrior';
}
