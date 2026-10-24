/**
 * Choose your character, the kid's (his sixth list, 2026-10-15, and his drawing of the pick screen): three people to
 * pick from, or your own, made from colours, a cap or a fishing hat, hair and faces. He said the people are only
 * looks, nothing else about them is different, and that we should name them ourselves (they look like people he
 * knows, and the game uses no real names). The Honor Guard armour is a look to pick here too, only a look: the
 * hearts come from the armour the shipwright sells.
 *
 * Skipper is the figure as it has always been, in the yellow sou'wester, so a game from before this keeps its look.
 * And whatever is picked, the armour bought from the shipwright can be hidden, so the pick is what is seen.
 *
 * Outfits are won on the Endless Isle (data/rewards.ts) and worn over whoever is picked: a captain's coat and tricorn,
 * ninja garb and mask, and a snow ninja's in white.
 */

import type { Side } from '../world/endless';
import { ROLE_NAME, type Role } from './battle';

export type HatKind = 'souwester' | 'cap' | 'fishing' | 'cowboy' | 'none';
export type HairKind = 'none' | 'short' | 'spiky' | 'long' | 'pigtails';
export type FaceKind = 'dots' | 'smile' | 'grin' | 'freckles' | 'glasses';
export type OutfitKind = 'none' | 'captain' | 'ninja' | 'snow';
/** A title won on the Endless Isle, shown under your name: for all nine of a side's badges, or of both sides', or a
 * place's gold badge. */
export type GoldTitle = `gold-${Side}-${Role}`;
export type TitleKind = 'none' | 'lord' | 'master' | 'endless' | GoldTitle;

export type Look = {
  skin: number;
  hair: HairKind;
  hairColour: number;
  hat: HatKind;
  hatColour: number;
  face: FaceKind;
  /** The Honor Guard armour, worn as a look: gold, the red plume and the cape. */
  honorGuard: boolean;
  /**
   * The armour bought from the shipwright, hidden, so the figure is seen as picked here and not inside it: the
   * owner's report (2026-10-16), the space armour's helmet covering every bit of the face, hair and hat. Its hearts
   * stay. Not part of who a preset is: picking one keeps it as it was.
   */
  hideArmour: boolean;
  /** An outfit won on the Endless Isle, over the look: like the armour shown or hidden, not part of who a preset is. */
  outfit: OutfitKind;
  /** The title shown under your name, won there too; nor is it. */
  title: TitleKind;
};

export const SKINS = ['#F3CDA9', '#E2AE84', '#C68B5E', '#9A6440', '#6B4228'] as const;
export const HAIR_COLOURS = [
  '#2A1A08',
  '#6B3E1E',
  '#C98A3A',
  '#EBCB74',
  '#B5452C',
  '#9AA0A8',
] as const;
/** The hat's colour, and its brim's, a shade darker. */
export const HAT_COLOURS = [
  ['#F5C531', '#D9A21C'],
  ['#D9473C', '#A9322A'],
  ['#3C74D9', '#2A55A6'],
  ['#3E9E5C', '#2C7543'],
  ['#F2EDE2', '#CFC6B4'],
  ['#8A5A32', '#644023'],
] as const;

export const HATS: readonly [HatKind, string][] = [
  ['souwester', "Sou'wester"],
  ['cap', 'Cap'],
  ['fishing', 'Fishing hat'],
  ['cowboy', 'Cowboy hat'],
  ['none', 'No hat'],
];
export const HAIRS: readonly [HairKind, string][] = [
  ['none', 'Tucked in'],
  ['short', 'Short'],
  ['spiky', 'Spiky'],
  ['long', 'Long'],
  ['pigtails', 'Pigtails'],
];
export const FACES: readonly [FaceKind, string][] = [
  ['dots', 'Eyes'],
  ['smile', 'Smile'],
  ['grin', 'Big grin'],
  ['freckles', 'Freckles'],
  ['glasses', 'Glasses'],
];
export const TITLES: readonly [TitleKind, string][] = [
  ['none', 'No title'],
  ['lord', 'Pirate Lord'],
  ['master', 'Grand Master'],
  ['endless', 'Master of the Endless Isle'],
  ...(['pirate', 'ninja'] as const).flatMap((side) =>
    (['tank', 'damage', 'healer'] as const).map((role): [TitleKind, string] => [
      `gold-${side}-${role}`,
      `Golden ${ROLE_NAME[side][role]}`,
    ]),
  ),
];
export const OUTFITS: readonly [OutfitKind, string][] = [
  ['none', 'Your own clothes'],
  ['captain', "Captain's coat"],
  ['ninja', 'Ninja garb'],
  ['snow', 'Snow ninja'],
];
/**
 * What an outfit is made of: the coat or suit, the trousers, its trim (the coat's gold, the ninjas' sash), and the
 * ninjas' hood, over the hair and all of the face but the eyes, with its headband; the captain wears a tricorn instead.
 */
export type OutfitLook = { coat: string; legs: string; trim: string; hood: string | null };
export const OUTFIT_LOOK: Readonly<Record<Exclude<OutfitKind, 'none'>, OutfitLook>> = {
  captain: { coat: '#A3262A', legs: '#2B2522', trim: '#E2B33C', hood: null },
  ninja: { coat: '#262A33', legs: '#1C1F26', trim: '#C8352B', hood: '#262A33' },
  snow: { coat: '#EEF3F8', legs: '#D5DFEA', trim: '#4F9FD8', hood: '#EEF3F8' },
};
/** The tricorn's black felt and gold edge. */
export const TRICORN = ['#1F1B1C', '#E2B33C'] as const;
export function outfitOf(l: Look): OutfitLook | null {
  return l.outfit === 'none' ? null : OUTFIT_LOOK[l.outfit];
}

/** The figure as it has always been. */
export const SKIPPER: Look = {
  skin: 1,
  hair: 'none',
  hairColour: 0,
  hat: 'souwester',
  hatColour: 0,
  face: 'dots',
  honorGuard: false,
  hideArmour: false,
  outfit: 'none',
  title: 'none',
};

/** The people on the pick screen: the old figure first, then the kid's three, named by us. */
export const PRESETS: readonly { id: string; name: string; look: Look }[] = [
  { id: 'skipper', name: 'Skipper', look: SKIPPER },
  {
    id: 'finn',
    name: 'Finn',
    look: {
      skin: 0,
      hair: 'spiky',
      hairColour: 2,
      hat: 'none',
      hatColour: 1,
      face: 'grin',
      honorGuard: false,
      hideArmour: false,
      outfit: 'none',
      title: 'none',
    },
  },
  {
    id: 'coral',
    name: 'Coral',
    look: {
      skin: 2,
      hair: 'long',
      hairColour: 0,
      hat: 'none',
      hatColour: 2,
      face: 'smile',
      honorGuard: false,
      hideArmour: false,
      outfit: 'none',
      title: 'none',
    },
  },
  {
    id: 'hank',
    name: 'Hank',
    look: {
      skin: 1,
      hair: 'short',
      hairColour: 1,
      hat: 'cowboy',
      hatColour: 5,
      face: 'smile',
      honorGuard: false,
      hideArmour: false,
      outfit: 'none',
      title: 'none',
    },
  },
];

/** Which preset a look is, or null when it is its own. */
export function presetOf(l: Look): string | null {
  const same = (a: Look, b: Look) =>
    a.skin === b.skin &&
    a.hair === b.hair &&
    a.hairColour === b.hairColour &&
    a.hat === b.hat &&
    a.hatColour === b.hatColour &&
    a.face === b.face &&
    a.honorGuard === b.honorGuard;
  // Whether the bought armour shows, the outfit over it all and the title are not part of who a preset is.
  return PRESETS.find((p) => same(p.look, l))?.id ?? null;
}

const pick = <T extends string>(v: unknown, all: readonly [T, string][], fallback: T): T =>
  all.some(([k]) => k === v) ? (v as T) : fallback;
const index = (v: unknown, n: number, fallback: number): number => {
  const i = Math.floor(Number(v));
  return Number.isFinite(i) && i >= 0 && i < n ? i : fallback;
};

/** A save's look, kept within what there is: Skipper for a save from before, or for anything not understood. */
export function parseLook(o: unknown): Look {
  if (!o || typeof o !== 'object') return { ...SKIPPER };
  const r = o as Record<string, unknown>;
  return {
    skin: index(r.skin, SKINS.length, SKIPPER.skin),
    hair: pick(r.hair, HAIRS, SKIPPER.hair),
    hairColour: index(r.hairColour, HAIR_COLOURS.length, SKIPPER.hairColour),
    hat: pick(r.hat, HATS, SKIPPER.hat),
    hatColour: index(r.hatColour, HAT_COLOURS.length, SKIPPER.hatColour),
    face: pick(r.face, FACES, SKIPPER.face),
    honorGuard: r.honorGuard === true,
    hideArmour: r.hideArmour === true,
    outfit: pick(r.outfit, OUTFITS, SKIPPER.outfit),
    title: pick(r.title, TITLES, SKIPPER.title),
  };
}

/** What the figure wears over its look: the Honor Guard look if picked, else the bought armour unless hidden. */
export function wornArmour<A>(l: Look, honorGuard: A, bought: A | null): A | null {
  if (l.honorGuard) return honorGuard;
  return l.hideArmour ? null : bought;
}
