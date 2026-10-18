/**
 * Your armoury at your headquarters, the kid's ("you keep things there": spare weapons and armour among them). In the
 * throne room of Gigantis, round its left side, a wooden stand for each armour, wearing it once it is yours: the
 * shipwright's five, leather to Honor Guard, and the soul armour from the ruins; round its right, a rack for each
 * weapon, holding it once it is yours: the four spears, the harpoon last, and the survival knife. Only to look at:
 * you still wear and carry the best you have.
 */

import { ARMOURS, hasKnife } from './armour';
import { SPEARS } from './spear';

/** The armour stands, the shipwright's in his order and then the soul armour. */
export const ARMOUR_STANDS = ['leather', 'diamond', 'gold', 'space', 'honor', 'soul'] as const;
export type ArmourStand = (typeof ARMOUR_STANDS)[number];
/** The weapon racks, the spears in the shipwright's order and then the knife. */
export const WEAPON_RACKS = ['fishing', 'long', 'barbed', 'harpoon', 'knife'] as const;
export type WeaponRack = (typeof WEAPON_RACKS)[number];

/** What you have, as the save has it. */
export interface Kit {
  armour: number;
  soulArmour: boolean;
  spear: number;
}

export function hasArmour(k: ArmourStand, kit: Kit): boolean {
  return k === 'soul' ? kit.soulArmour : kit.armour > ARMOUR_STANDS.indexOf(k);
}

export function hasWeapon(k: WeaponRack, kit: Kit): boolean {
  return k === 'knife' ? hasKnife(kit.armour) : kit.spear > WEAPON_RACKS.indexOf(k);
}

/** The armour's name, as the shipwright sells it. */
export function armourName(k: ArmourStand): string {
  return k === 'soul' ? 'Soul armour' : (ARMOURS[ARMOUR_STANDS.indexOf(k)]?.name ?? '');
}

export function weaponName(k: WeaponRack): string {
  return k === 'knife' ? 'Survival knife' : (SPEARS[WEAPON_RACKS.indexOf(k)]?.name ?? '');
}

/** Looked at: what it is and what it does; or, its stand empty, where it is had. */
export function armourStory(k: ArmourStand, kit: Kit): string {
  const i = ARMOUR_STANDS.indexOf(k);
  if (k === 'soul')
    return kit.soulArmour
      ? "Soul armour, from the Old One's ruins: every third hit you land gives you back a heart."
      : 'An empty stand. Something to wear waits in the ruins behind this throne room.';
  const A = ARMOURS[i];
  if (!A) return '';
  if (!hasArmour(k, kit))
    return `An empty stand, for the ${A.name.toLowerCase()}. ${A.blurb} The shipwright sells it.`;
  return kit.armour === i + 1
    ? `${A.name}. ${A.blurb} It's the best you have: you're wearing one just like it.`
    : `${A.name}. ${A.blurb} You've got better now, so it waits here.`;
}

export function weaponStory(k: WeaponRack, kit: Kit): string {
  if (k === 'knife')
    return hasKnife(kit.armour)
      ? 'A survival knife, a spare. Up close it stabs, a little further off it is thrown, and it hits for 4.'
      : 'An empty rack, for the survival knife. It comes with the Honor Guard armour, from the shipwright.';
  const i = WEAPON_RACKS.indexOf(k);
  const S = SPEARS[i];
  if (!S) return '';
  if (!hasWeapon(k, kit))
    return `An empty rack, for the ${S.name.toLowerCase()}. ${S.blurb} The shipwright sells it.`;
  return k === 'harpoon'
    ? `A spare harpoon. ${S.blurb}`
    : kit.spear === i + 1
      ? `${S.name}. ${S.blurb} It's the best you have: you're carrying one just like it.`
      : `${S.name}. ${S.blurb} You've got better now, so it waits here.`;
}

/** The throne room's middle, to its stands: the armour round its left side and the weapons round its right. */
export const STAND_R = 150;
const ARMOUR_FROM = Math.PI * 0.8;
const WEAPONS_FROM = Math.PI * 1.36;
const STEP = 0.21;
/** How near a stand to look at it. */
export const ARMOURY_REACH = 22;

export function armourStandAt(i: number): { dx: number; dy: number } {
  const a = ARMOUR_FROM + i * STEP;
  return { dx: Math.cos(a) * STAND_R, dy: Math.sin(a) * STAND_R };
}

export function weaponRackAt(i: number): { dx: number; dy: number } {
  const a = WEAPONS_FROM + i * STEP;
  return { dx: Math.cos(a) * STAND_R, dy: Math.sin(a) * STAND_R };
}

/** The stand nearest a point in the room within reach, as 'a3' or 'w1', or null. */
export function nearArmoury(dx: number, dy: number): string | null {
  let best: string | null = null;
  let bestD = ARMOURY_REACH;
  const look = (id: string, p: { dx: number; dy: number }) => {
    const d = Math.hypot(dx - p.dx, dy - p.dy);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  };
  ARMOUR_STANDS.forEach((_, i) => {
    look(`a${i}`, armourStandAt(i));
  });
  WEAPON_RACKS.forEach((_, i) => {
    look(`w${i}`, weaponRackAt(i));
  });
  return best;
}
