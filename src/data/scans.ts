/**
 * The portable scanner, the kid's (the Forgotten One's gift, island 11): point it at a creature and it tells you how to
 * beat it, and what it is afraid of. "Yes, and tells weakness of it, like Star: he is afraid of bigger stuff, or the
 * Reaper: afraid of honey." What it says of each, here, is what the game does: the warning to watch for, when it can be
 * hit, and with what. The two weaknesses the kid gave are his, and both are in the game: honey (data/snacks.ts HONEY),
 * and Star off to space when something bigger is near (entities/meteor.ts).
 */

/** Everything the scanner knows: the sea's beasts by the harpoon's names for them, then those met on foot. */
export const SCAN_KINDS = [
  'guard',
  'cthulu',
  'angler',
  'gulper',
  'meteor',
  'reaper',
  'king',
  'deep',
  'hired',
  'monkey',
  'hiredman',
  'gorilla',
  'gator',
  'tarhuman',
  'tarbeast',
  'spider',
  'pelican',
  'sorcerer',
  'heron',
  'orb',
  'swordsman',
  'red',
  'blue',
  'green',
  'anchorer',
  'cthulhu',
  'reaperland',
  'skeleton',
  'archer',
  'zombie',
  'ghost',
  'necro',
  'lagoon',
  'lancer',
  'forgotten',
  'oldone',
  'brother',
  'egg',
] as const;
export type ScanKind = (typeof SCAN_KINDS)[number];

export type Scan = {
  /** What it is called. */
  name: string;
  /** How to beat it. */
  beat: string;
  /** What it is afraid of, or weak to, when there is something. */
  weak?: string;
};

export const isScanKind = (k: unknown): k is ScanKind =>
  typeof k === 'string' && (SCAN_KINDS as readonly string[]).includes(k);

/** How long a scan takes, its beam out to the creature and back. */
export const SCAN_TIME = 0.9;
/** How far the scanner reaches from the boat. On foot it reaches as far as the spear. */
export const SCAN_SEA = 260;

/**
 * What a better scanner does, the kid's ("all": further, eggs, hit points): by how many kinds it has scanned. At 5 it
 * reaches further, at 10 it scans eggs (which glow blue until it has), at 18 it shows how much fight is left in what it
 * scans. What it says, the time it gets better.
 */
export const SCANNER_LEVELS: readonly { at: number; said: string }[] = [
  { at: 0, said: '' },
  { at: 5, said: 'Your scanner got better: it reaches further now!' },
  { at: 10, said: 'Your scanner got better: it can scan eggs now. They glow blue.' },
  { at: 18, said: 'Your scanner got better: it shows hit points now!' },
];
/** The scanner's level for so many kinds scanned, from 1. */
export function scannerLevel(kinds: number): number {
  return SCANNER_LEVELS.filter((l) => kinds >= l.at).length;
}
/** Reaching further: on foot, this many times as far as the spear; at sea, this far from the boat. */
export const SCAN_REACH = 1.5;
export const SCAN_SEA_FAR = 420;
/** It scans eggs from this level, and shows hit points from this one. */
export const SCAN_EGGS = 3;
export const SCAN_HP = 4;

/** What the scanner says of each: what the game does, the warning to watch for, when it can be hit, and with what. */
export const SCANS: Record<ScanKind, Scan> = {
  guard: {
    name: 'The leviathan at the buoys',
    beat: "It rises across your way at the buoys. Turn away and it sinks: cross while it's down. While it's up, harpoon it three times before it goes under. Don't ram it: that costs 30 hull.",
    weak: "It can only be hit while it's up out of the water.",
  },
  cthulu: {
    name: 'The Cthuluviathan',
    beat: "It sleeps in its sunken city: sail past slowly, and not too close. Awake, it sends tentacles up where you're going: steer off the bubbles. Harpoon a tentacle while it stands.",
    weak: 'Get far away for five seconds and it goes back to sleep.',
  },
  angler: {
    name: 'The anglerfish',
    beat: 'At night in the deep, a light with glowing fish round it is a trap. Sail at it fast and its jaws open ahead of you: turn away! Three harpoon hits on the light drive it off.',
    weak: 'A harpoon while its jaws are open snaps them shut and sends it down.',
  },
  gulper: {
    name: 'The gulper',
    beat: 'It hunts you in the deep, nearly as fast as you. Run, and turn hard when it gets close: it turns slower than you. Four harpoon hits drive it off; three bites eat the boat.',
    weak: 'Every harpoon hit slows it right down. Crossing the buoys home ends the hunt.',
  },
  meteor: {
    name: 'Star, the meteor serpent',
    beat: "Its head glows red-hot and an orange ring shows on the water where you'll be: steer out before it dives. Harpoon it while it thrashes in the water. Four hits drive it off.",
    weak: 'Afraid of anything bigger than it: when the Deep One rises, Star flies off to space until it has gone.',
  },
  reaper: {
    name: 'The Reaper',
    beat: 'Faster than any boat. A red fan on the water means his tail is coming: turn hard out of it. After a sweep he rears up roaring, the only time the harpoon reaches him. Five hits.',
    weak: 'Afraid of honey: hold up a jar and he runs off. The old man sells it, and the forest bees make it.',
  },
  king: {
    name: 'The Skeleton Shark King',
    beat: "A dashed red line shows where he'll charge: turn off it, then harpoon him as he leaps. When he raises his trident, harpoon him and steer out of the gold ring. Six hits finish him.",
    weak: 'Open while he leaps, and while his trident is up.',
  },
  deep: {
    name: 'The Deep One',
    beat: "Only its eye can be hurt, while it's open: ten harpoon hits. Steer out of the rings where its logs land. If a tentacle grabs the boat, harpoon the tentacle and it lets go.",
    weak: 'Its eye, open two seconds at a time.',
  },
  hired: {
    name: 'A hired boat',
    beat: "The Heron's men ram you for 14 hull. Three harpoon hits sink a boat, for 60 coins. They're slower than you, so you can outrun them, and tying up at a dock ends the chase.",
  },
  monkey: {
    name: 'A monkey',
    beat: "Two hits. They bonk you up close, and throwers lob coconuts: step out from under the shadow. They're slower than you, so keep moving and throw.",
    weak: 'Tar sticks them still.',
  },
  hiredman: {
    name: 'A hired man',
    beat: 'Three hits. They fight like monkeys, with slingers instead of coconut throwers: keep moving and throw. Each one you beat drops 25 coins.',
    weak: 'Tar sticks them still.',
  },
  gorilla: {
    name: 'A gorilla',
    beat: "Seven hits. When it raises both fists, a red ring shows where they'll land: get out of it! A slam takes three hearts. It's open for a moment after.",
    weak: 'Tar makes raised fists come down on nothing.',
  },
  gator: {
    name: 'A gator',
    beat: "Ten hits. It surges out of its pool when you come near. When its jaws open wide, step back or to the side: it only bites straight ahead. It's open just after a snap.",
    weak: 'Tar on its snout shuts its jaws.',
  },
  tarhuman: {
    name: 'A tar human',
    beat: "Fifteen hits. When it raises its arms over its head, a red ring shows where it will slam them down: get out of it! A slam takes three hearts. It's open for a moment after.",
    weak: 'Tar does nothing to it: it is made of tar. A stun still stops a slam.',
  },
  tarbeast: {
    name: 'A tar beast',
    beat: "Eighteen hits. When it crouches, a red line shows where it will lunge: step off the line! A lunge takes four hearts. It's wise: losing, it runs. Corner it with its back to the tar and it fights again.",
    weak: 'It will not fight a fight it knows it will lose.',
  },
  spider: {
    name: 'The giant spider',
    beat: "Your spear just bounces off him! Only bug spray works: three sprays. The old man on the prairie sells it. No spray? Run: he's slower than you. And don't walk into his web.",
    weak: 'Bug spray.',
  },
  pelican: {
    name: 'The giant pelican',
    beat: "Fifteen hits, and only while it's down low. Step round the fish it spits. When it flies up, a ring follows you and turns red: get out before it dives! Then spear it while its bill is stuck.",
    weak: 'Its bill gets stuck in the floor after a dive.',
  },
  sorcerer: {
    name: 'The leviathan sorcerer',
    beat: 'It flies round the roof throwing purple bolts at where you stand: keep moving. Spear it when it swoops in to peck. Angry, it throws three at once, or a ring of eight: step into a gap.',
    weak: 'Close and easy to hit when it swoops.',
  },
  heron: {
    name: 'The Heron',
    beat: 'A pink line shows from his gun, then he zaps along it: step off the line. His copies never shoot, so the one that shoots is the real one. On island 9, beat the chained necromancer first.',
    weak: 'Only the real one can be hurt. Tar works only on him.',
  },
  orb: {
    name: 'The chained necromancer',
    beat: "Eight hits. He can't hurt you, but he raises skeletons, two at a time. Beat him and his chain snaps, the orb goes dark, and the Heron's shield drops.",
    weak: "Beat him first: he is the Heron's shield.",
  },
  swordsman: {
    name: 'The swordsman',
    beat: "Twelve hits, and he blocks your first spear. Up close he raises his sword: step aside, then throw while he recovers. Stay far off and he dashes at where you're heading: change direction.",
    weak: 'Tar makes a raised sword come down unswung.',
  },
  red: {
    name: 'A red demon',
    beat: 'Four hits, and it blocks the first. It raises its sword before it slashes: step away, then throw.',
  },
  blue: {
    name: 'A blue demon',
    beat: "Four hits, and it can't block. It never fights you itself: it stays back and calls up monkeys, two at a time. Beat it, and no more come.",
  },
  green: {
    name: 'A green demon',
    beat: 'Four hits, and it blocks the first. It slashes like the red one and calls monkeys like the blue one, and one of its monkeys throws coconuts.',
  },
  anchorer: {
    name: 'The Tar Anchorer',
    beat: "Eighty hits. It whirls its anchor: when a red ring shows where you'll be, change course. Come close and it swings low round itself: step away. Angry, it throws much faster.",
    weak: "Tar cancels a whirl or a swing it's winding up.",
  },
  cthulhu: {
    name: 'Cthulhu',
    beat: "Ten hits on his body. The floor ripples green where you're going, then a tentacle bursts up: don't run into it. One spear sinks a tentacle.",
    weak: 'Tar on his face stops new tentacles coming.',
  },
  reaperland: {
    name: 'The Reaper on land',
    beat: "Thirty hits. A red fan on the sand means his tail: step out. A red line from his snout means he'll charge: step off it. After either he rears up, the only time a spear gets past his scales.",
    weak: 'Afraid of honey: hold up a jar and he runs off. The old man sells it, and the forest bees make it.',
  },
  skeleton: {
    name: 'A skeleton',
    beat: "Four hits, and its shield takes the first. It raises its sword before it slashes: step back, it can't reach far.",
  },
  archer: {
    name: 'A skeleton archer',
    beat: "Three hits, and it can't block. It shoots where you'll be if you keep going straight: turn when it shoots.",
  },
  zombie: {
    name: 'A zombie',
    beat: 'Eight hits. It winds up before it swings both arms: step back, then throw.',
    weak: "So slow it can't catch you.",
  },
  ghost: {
    name: 'A ghost',
    beat: 'Three hits. It sends slow wisps that turn after you: walk away from them, and throw from a distance.',
  },
  necro: {
    name: 'A necromancer',
    beat: 'Six hits. It never attacks you: it raises skeletons. Beat it first, and everything it raised falls with it.',
    weak: 'Beat it and its skeletons fall.',
  },
  lagoon: {
    name: 'A lagoon creature',
    beat: "Two hits, and it can't block. It's quick, and winds up before it claws: step away, then throw.",
  },
  lancer: {
    name: 'A lancer',
    beat: 'Ten hits. It stands guard and leaves you alone until you hit it. Roused, it draws its lance back, then thrusts straight ahead for two hearts: step sideways.',
    weak: "Very slow once it's roused.",
  },
  forgotten: {
    name: 'The Forgotten One',
    beat: "He raises his sword before he sweeps it. His skulls fly in a fan: find a gap. An orange line shows before his death ray: step off it, the line doesn't follow you.",
  },
  oldone: {
    name: 'The Old One',
    beat: 'Fifty hits, from the shore. His hand rises over a green ring where you stand: step out before it slams. He calls lagoon creatures five at a time: beat the close ones first.',
    weak: "Tar cancels a slam he's about to bring down.",
  },
  egg: {
    name: "The Reaper's egg",
    beat: 'Not one to beat: one to keep! Carry it aboard from its nest, and at the next dawn it hatches into a baby Reaper of your own.',
  },
  brother: {
    name: "The Heron's brother",
    beat: 'He fights just like the Heron: a pink line, then a zap, so step off the line; and copies, so hit the one that shoots. He can never be beaten, but fourteen hits stop him.',
  },
};
