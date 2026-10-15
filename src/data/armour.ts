/**
 * Armour, the kid's: leather, diamond, gold and space armour, in his order,
 * each one more heart ashore than the last. The shipwright sells it a level
 * at a time, like the spear, once there is a spear to fight with. Space armour
 * is the one the kid kept when he gave up on going to space: it comes through
 * island 7's portal, so the shipwright only has it once the portal is awake.
 * Each level has its look on the figure: a chest plate, and above leather a
 * helmet in place of the sou'wester.
 *
 * Last, his Honor Guard armour (his sixth list, 2026-10-15, and his drawing): gold, with a red plume on the helmet
 * and a red cape, nine hearts, and a survival knife that comes with it. The shipwright has it once the Heron is
 * beaten on island 9. The knife hits for 4 and does both, the kid said: up close it stabs, a little further off it is
 * thrown, and past that the spear is thrown as before.
 */

export type ArmourLevel = {
  name: string;
  /** What it does, for the shop card. */
  blurb: string;
  /** The toast when it is bought. */
  bought: string;
  cost: number;
  /** Hearts ashore wearing it. */
  hearts: number;
  /** How the figure wears it: the plate, its edge and shine, and the helmet. */
  look: ArmourLook;
};

export type ArmourLook = {
  plate: string;
  edge: string;
  shine: string;
  helm: 'none' | 'helm' | 'space' | 'plume';
  /** A cape down the back, in this colour. */
  cape?: string;
};

/** Hearts ashore with no armour. */
export const BASE_HEARTS = 3;

export const ARMOURS: readonly ArmourLevel[] = [
  {
    name: 'Leather armour',
    blurb: 'Four hearts ashore instead of three.',
    bought: 'Leather armour. You have four hearts ashore now.',
    cost: 1200,
    hearts: 4,
    look: { plate: '#8A5A32', edge: '#5E3B1E', shine: '#B07A4A', helm: 'none' },
  },
  {
    name: 'Diamond armour',
    blurb: 'Five hearts ashore.',
    bought: 'Diamond armour, and a helmet to match. You have five hearts ashore now.',
    cost: 3500,
    hearts: 5,
    look: { plate: '#5ED8E0', edge: '#2A8C9A', shine: '#D8FBFF', helm: 'helm' },
  },
  {
    name: 'Gold armour',
    blurb: 'Six hearts ashore.',
    bought: 'Gold armour, shining. You have six hearts ashore now.',
    cost: 7000,
    hearts: 6,
    look: { plate: '#F0C544', edge: '#A87A1E', shine: '#FFF3C4', helm: 'helm' },
  },
  {
    name: 'Space armour',
    blurb: 'Seven hearts ashore. From the far side of the portal.',
    bought: 'Space armour, from the far side of the portal. You have seven hearts ashore now.',
    cost: 12000,
    hearts: 7,
    look: { plate: '#EEF2F6', edge: '#8A96A8', shine: '#7FE8FF', helm: 'space' },
  },
  {
    name: 'Honor Guard armour',
    blurb: 'Nine hearts ashore, and a survival knife: stab up close, or throw it.',
    bought:
      'Honor Guard armour, gold, with a red plume and a cape, and a survival knife at your belt. You have nine hearts ashore now. Up close, Throw stabs with the knife; a little further off, it throws it.',
    cost: 15000,
    hearts: 9,
    look: { plate: '#E8B53A', edge: '#94650F', shine: '#FFF4C2', helm: 'plume', cape: '#C42F2A' },
  },
];

/** The best armour there is, as a level: levels run 0 (none) to this. */
export const ARMOUR_MAX = ARMOURS.length;

/** The level of space armour, which waits for island 7's portal. */
export const SPACE_ARMOUR = 4;

/** The level of Honor Guard armour, which waits for the Heron to be beaten on island 9; the knife comes with it. */
export const HONOR_GUARD = 5;

/** The survival knife: how hard it hits; how near it stabs, and how soon again; how far it is thrown, and how soon again. */
export const KNIFE = { power: 4, reach: 34, stabReload: 0.45, range: 100, reload: 0.8 } as const;

/** Whether the figure has the knife: it comes with the Honor Guard armour. */
export function hasKnife(level: number): boolean {
  return level >= HONOR_GUARD;
}

/** How the knife is used on a foe this far off: stabbed, thrown, or not at all (the spear's, if any). */
export function knifeUse(level: number, dist: number): 'stab' | 'throw' | null {
  if (!hasKnife(level)) return null;
  return dist <= KNIFE.reach ? 'stab' : dist <= KNIFE.range ? 'throw' : null;
}

/** The armour you wear at a level, or null with none. */
export function armourAt(level: number): ArmourLevel | null {
  return level > 0 ? (ARMOURS[Math.min(level, ARMOUR_MAX) - 1] ?? null) : null;
}

/** Hearts ashore at a level. */
export function heartsFor(level: number): number {
  return armourAt(level)?.hearts ?? BASE_HEARTS;
}

/** The next armour the shipwright sells, or null: once you have the best, space armour before the portal wakes, or
 * Honor Guard before the Heron is beaten on island 9. */
export function nextArmour(
  level: number,
  portalAwake: boolean,
  heronBeaten = false,
): ArmourLevel | null {
  if (level + 1 === SPACE_ARMOUR && !portalAwake) return null;
  if (level + 1 === HONOR_GUARD && !heronBeaten) return null;
  return ARMOURS[level] ?? null;
}
