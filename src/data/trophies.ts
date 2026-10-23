/**
 * Your trophy hall, the kid's: at your headquarters "you keep things there", and what you keep is "all" of what
 * he was asked: trophies from the bosses you beat first. The second hall of Gigantis, the way through to the throne
 * room, keeps one for each boss, on a stone stand round its wall: something each left behind, the sorcerer's staff,
 * the Shark King's jaws, the Heron's feather. A stand stays empty until its boss is beaten, and says where to go.
 */

import type { Driven } from './harpoon';

export const TROPHY_KINDS = [
  'staff',
  'sword',
  'horns',
  'anchor',
  'jaws',
  'eye',
  'idol',
  'book',
  'crown',
  'pearl',
  'feather',
  'egg',
  'claw',
  'blade',
  'hat',
  'tarsword',
  'skrillhorn',
  'krakenarm',
  'krakeneye',
  'spine',
  'shard',
  'lure',
  'light',
  'meteor',
  'tooth',
] as const;
export type TrophyKind = (typeof TROPHY_KINDS)[number];

/** How far through the game, as the save has it: what says each boss is beaten. */
export interface Beaten {
  towerTaken: boolean;
  isle3Stage: number;
  isle4Stage: number;
  isle5Stage: number;
  isle6Stage: number;
  isle7Stage: number;
  heronStage: number;
  pelicanBeaten: boolean;
  reaperEgg: number;
  cryptWon: boolean;
  stealth1: boolean;
  /** The tar leader beaten on the tar island. */
  tarLeader: boolean;
  /** Skrill beaten at the top of his tower on Skull Island. */
  skrill: boolean;
  /** The tar kraken beaten, under the middle of the tar ocean. */
  kraken: boolean;
  /** And again, round two, on foot on the tar island. */
  krakenFoot: boolean;
  driven: Driven;
}

export interface Trophy {
  /** For the climb button: Look at ... */
  name: string;
  /** Looked at. */
  story: string;
  /** Its stand, empty: who to beat, and where. */
  hint: string;
  won(b: Beaten): boolean;
}

/** In the order you meet them: the bosses on the islands, then the leviathans driven off with the harpoon. */
export const TROPHIES: Readonly<Record<TrophyKind, Trophy>> = {
  staff: {
    name: "the sorcerer's staff",
    story:
      "The sorcerer's staff, its orb gone dark. You knocked it out of his hand at the top of island 2's tower.",
    hint: "Beat the sorcerer at the top of island 2's tower.",
    won: (b) => b.towerTaken,
  },
  sword: {
    name: "the swordsman's sword",
    story:
      "The swordsman's great sword, from under the sunken tower on island 3. It took both hands to carry it home.",
    hint: 'Beat the swordsman, down under the sunken tower on island 3.',
    won: (b) => b.isle3Stage >= 2,
  },
  horns: {
    name: "a demon's horns",
    story:
      "A demon's horns, still warm. The three demons guarded the warlock's cage, and now he's your friend.",
    hint: "Beat the three demons that guard the warlock's cage, under island 3.",
    won: (b) => b.isle3Stage >= 3,
  },
  anchor: {
    name: "the Tar Anchorer's anchor",
    story:
      "The Tar Anchorer's anchor, dripping tar on the stand. It melted away on island 4 and left this behind.",
    hint: 'Beat the Tar Anchorer in the tar on island 4.',
    won: (b) => b.isle4Stage >= 1,
  },
  jaws: {
    name: "the Shark King's jaws",
    story:
      "The Skeleton Shark King's jaws, every tooth still sharp. From his reef at island 5, out in the far deep.",
    hint: 'Beat the Skeleton Shark King at island 5, out in the far deep.',
    won: (b) => b.isle5Stage >= 1,
  },
  eye: {
    name: "the Deep One's eye",
    story:
      "The Deep One's eye, in a jar. It still looks at you sometimes. From the sea off island 6.",
    hint: 'Beat the Deep One in the sea off island 6.',
    won: (b) => b.isle6Stage >= 1,
  },
  idol: {
    name: 'the little Cthulhu',
    story:
      "A little green Cthulhu, carved in stone. He crumbled in his temple under island 6, and this is what's left.",
    hint: 'Beat Cthulhu in his temple, down under island 6.',
    won: (b) => b.isle6Stage >= 2,
  },
  book: {
    name: "the sorcerer's spellbook",
    story:
      "The sorcerer's spellbook, from the top of island 7's tower. The pages are all in purple squiggles.",
    hint: "Beat the sorcerer again at the top of island 7's tower.",
    won: (b) => b.isle7Stage >= 1,
  },
  crown: {
    name: "the Forgotten One's crown",
    story:
      'The Forgotten One\'s crown, from his throne room. "I sat on it so long that the world forgot me."',
    hint: 'Beat the Forgotten One in his throne room, here in Gigantis.',
    won: (b) => b.isle7Stage >= 2,
  },
  pearl: {
    name: "the Old One's black pearl",
    story:
      "The Old One's black pearl, from the bottom of his pool in the ruins. It shines like lagoon water.",
    hint: 'Beat the Old One in the ruins behind the throne room.',
    won: (b) => b.isle7Stage >= 4,
  },
  feather: {
    name: "the Heron's feather",
    story:
      "One of the Heron's white feathers. It floated down off island 9's tower when you beat him for good.",
    hint: 'Beat the Heron for good, at the top of island 9.',
    won: (b) => b.heronStage >= 2,
  },
  egg: {
    name: "the pelican's golden egg",
    story: "A golden egg from the giant pelican's nest, on top of island 10's tower.",
    hint: "Beat the giant pelican on top of island 10's tower.",
    won: (b) => b.pelicanBeaten,
  },
  claw: {
    name: "the Reaper's claw",
    story:
      'A claw from the Reaper on land, from by his nest on island 6. He doesn\'t answer to "the Reaper".',
    hint: 'Beat the Reaper on land, by his nest on island 6.',
    won: (b) => b.reaperEgg >= 1,
  },
  blade: {
    name: "the Forgotten One's sword",
    story:
      'The Forgotten One\'s sword. He laid it down in his crypt on island 11 and said, "You win."',
    hint: 'Beat the Forgotten One again, in his crypt on island 11.',
    won: (b) => b.cryptWon,
  },
  hat: {
    name: "the sorcerer's hat",
    story:
      'The sorcerer\'s hat. It came off when you kicked him off his tower on the tar ocean. "Come on!"',
    hint: 'Win stealth mission 1, from the missions room in the metal bridge.',
    won: (b) => b.stealth1,
  },
  tarsword: {
    name: "the tar leader's sword",
    story:
      "The tar leader's long black sword, a purple gleam along its edge. He left it on the high ground of the tar island when he melted away.",
    hint: 'Beat the tar leader, up on the high ground of the tar island.',
    won: (b) => b.tarLeader,
  },
  skrillhorn: {
    name: "Skrill's horn",
    story:
      "One of Skrill's horns, snapped clean off when he crashed down on top of his own tower on Skull Island. It still curls up as if it were laughing.",
    hint: 'Beat Skrill, at the very top of his tower on Skull Island.',
    won: (b) => b.skrill,
  },
  krakenarm: {
    name: "the tar kraken's arm",
    story:
      "One of the tar kraken's arms, left floating when it sank under the middle of the tar ocean. Its suckers still twitch now and then.",
    hint: 'Beat the tar kraken, under the very middle of the tar ocean, once the tar eel is beaten.',
    won: (b) => b.kraken,
  },
  krakeneye: {
    name: "the tar kraken's eye",
    story:
      "The tar kraken's own eye, shut for good when you beat it on foot off the tar island's shore. Every now and then its lid twitches, and a sliver of yellow shows.",
    hint: 'Beat the tar kraken at sea, then go ashore on the tar island: it comes back for you there.',
    won: (b) => b.krakenFoot,
  },
  spine: {
    name: "the leviathan's spine",
    story:
      'A spine off the leviathan, with a cyan light still glowing in it. From out by the buoys.',
    hint: 'Drive off the leviathan by the buoys with your harpoon.',
    won: (b) => b.driven.guard >= 1,
  },
  shard: {
    name: "a piece of the Cthuluviathan's dome",
    story:
      "A piece of the Cthuluviathan's green dome. It's Cthulhu's pet, from the sunken city in the deep.",
    hint: 'Drive off the Cthuluviathan with your harpoon, out in the deep.',
    won: (b) => b.driven.cthulu >= 1,
  },
  lure: {
    name: "the anglerfish's lure",
    story: "The anglerfish's lure. It still glows a little in the dark. From the deep, at night.",
    hint: 'Drive off the anglerfish with your harpoon, out in the deep at night.',
    won: (b) => b.driven.angler >= 1,
  },
  light: {
    name: "the gulper's tail light",
    story: "The pink light off a gulper's tail. It blinks on and off, all by itself.",
    hint: 'Drive off the gulper with your harpoon.',
    won: (b) => b.driven.gulper >= 1,
  },
  meteor: {
    name: 'a piece of Star',
    story:
      'A piece of Star, the meteor serpent, still warm from flying through space. From over island 6.',
    hint: 'Drive off Star, the meteor serpent, with your harpoon.',
    won: (b) => b.driven.meteor >= 1,
  },
  tooth: {
    name: "the Reaper's tooth",
    story: "A tooth from the Reaper in the sea. It's nearly as long as your arm.",
    hint: 'Drive off the Reaper in the sea with your harpoon.',
    won: (b) => b.driven.reaper >= 1,
  },
};

/** How many of the stands have their trophy. */
export function trophiesWon(b: Beaten): number {
  return TROPHY_KINDS.filter((k) => TROPHIES[k].won(b)).length;
}

/**
 * The stands, round the hall's wall at this radius, clear of the way up to the throne room at its back and of where
 * you come in at its front: the first ten up its left side from the way in to the way up, the rest down its right.
 */
export const STAND_RING = 126;
/** How wide each gap is, either side of the way up (angle 1.25 pi) and the way in (0.25 pi). */
export const GAP_UP = 0.27;
export const GAP_IN = 0.28;
export const LEFT_STANDS = 11;
/** How near a stand to look at it. */
export const STAND_REACH = 20;

/** Where a stand is, from the hall's middle. */
export function standAt(i: number): { dx: number; dy: number } {
  const arc = Math.PI - GAP_IN - GAP_UP;
  const left = i < LEFT_STANDS;
  const a0 = left ? Math.PI * 0.25 + GAP_IN : Math.PI * 1.25 + GAP_UP;
  const k = left ? i : i - LEFT_STANDS;
  const m = left ? LEFT_STANDS : TROPHY_KINDS.length - LEFT_STANDS;
  const a = a0 + (arc * (k + 0.5)) / m;
  return { dx: Math.cos(a) * STAND_RING, dy: Math.sin(a) * STAND_RING };
}

/** The stand nearest a point in the hall within reach, or -1. */
export function nearStand(dx: number, dy: number): number {
  let best = -1;
  let bestD = STAND_REACH;
  TROPHY_KINDS.forEach((_, i) => {
    const s = standAt(i);
    const d = Math.hypot(dx - s.dx, dy - s.dy);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}
