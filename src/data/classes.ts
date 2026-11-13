/**
 * The classes in New Dimensions (data/dimension.ts), the kid's: pick one going in, and change between rounds ("both").
 * One level for them all (my pick, hers to change). The rest of his list comes a piece at a time.
 */
export type ClassId =
  | 'warrior'
  | 'wizard'
  | 'paladin'
  | 'assassin'
  | 'necromancer'
  | 'witchdoctor'
  | 'mage'
  | 'healer';
export const CLASSES: readonly ClassId[] = [
  'warrior',
  'wizard',
  'paladin',
  'assassin',
  'necromancer',
  'witchdoctor',
  'mage',
  'healer',
];
export const CLASS_NAMES: Readonly<Record<ClassId, string>> = {
  warrior: 'Warrior',
  wizard: 'Wizard',
  paladin: 'Paladin',
  assassin: 'Assassin',
  necromancer: 'Necromancer',
  witchdoctor: 'Witch Doctor',
  mage: 'Mage',
  healer: 'Cosmedic',
};
export const CLASS_BLURBS: Readonly<Record<ClassId, string>> = {
  warrior: 'Sword and shield, rage, Charge, Slam and Leap.',
  wizard: 'Fireball, grease, misty step, mage armor, and magic missile from level 7.',
  paladin:
    'A mace, a holy sword, holy light, healing light, and two blessings. Tough on the undead.',
  assassin:
    'Quick daggers, Vanish and a sneak attack, throwing knives, a smoke bomb and shadow step.',
  necromancer:
    'A bouncing death ball that steals life, the scythe of doom, skeletons, Grave Burst and the Gorebeast.',
  witchdoctor:
    'Her Skull Familiar zaps; Bloodrot Terriers, Patches the patchwork bear, frost spiders and Toad Rain.',
  mage: 'The trickster: a quick bolt, Blink and its decoys, Polymorph (baa!), Slow Time and mage armor.',
  healer:
    'She heals by hurting: Shooting Stars, Moonbeams, Sunshine once a round, and Saturn’s Rings.',
};
/** What each class is, at a glance, as badges on the class card (the owner's: so "Cosmedic" does not read as cosmetic). */
export type Role = 'fighter' | 'caster' | 'healer' | 'sneak' | 'summoner' | 'trickster';
export const ROLE_NAMES: Readonly<Record<Role, string>> = {
  fighter: 'Fighter',
  caster: 'Caster',
  healer: 'Healer',
  sneak: 'Sneak',
  summoner: 'Summoner',
  trickster: 'Trickster',
};
export const CLASS_ROLES: Readonly<Record<ClassId, readonly Role[]>> = {
  warrior: ['fighter'],
  wizard: ['caster'],
  paladin: ['fighter', 'healer'],
  assassin: ['sneak'],
  necromancer: ['summoner'],
  witchdoctor: ['summoner'],
  mage: ['trickster'],
  healer: ['healer', 'caster'],
};
export function parseClass(v: unknown): ClassId {
  return (CLASSES as readonly unknown[]).includes(v) ? (v as ClassId) : 'warrior';
}
