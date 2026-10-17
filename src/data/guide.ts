/**
 * The field guide: the catch log grown into a book you can open and read
 * on the phone. A page per species with a line about it, where its schools
 * ring the island and what boat reaches them, when it is about, what it is
 * worth, how many you have landed and the day you landed the first. A
 * species you have not caught keeps its name and its line to itself but
 * still tells you where to look. Line-caught fish, sizes and the legendary
 * pages come with the bridge and the second verb.
 */
import {
  ABYSS_FISH,
  DEEP_RINGS,
  FAR_RINGS,
  ISLE2_RINGS,
  ISLE3_RINGS,
  RANGE,
  REMORO,
  RINGS,
  SPECIES,
  TIER_NAME,
} from './tuning';

/** Where a species' schools sit: the ring's near and far edge, whether they only rise at night, and whether past the buoys. */
export type Habitat = {
  r0: number;
  r1: number;
  night?: boolean;
  deep?: boolean;
  isle2?: boolean;
  isle3?: boolean;
  far?: boolean;
};

/** The rings, from the same tables the world is built from. */
export const HABITAT: Readonly<Record<number, Habitat>> = Object.fromEntries(
  [...RINGS, ...DEEP_RINGS, ...ISLE2_RINGS, ...ISLE3_RINGS, ...FAR_RINGS].map((r) => {
    const h: Habitat = { r0: r.r0, r1: r.r1 };
    if (r.night) h.night = true;
    if (r.deep) h.deep = true;
    if (r.isle2) h.isle2 = true;
    if (r.isle3) h.isle3 = true;
    if (r.far) h.far = true;
    return [r.sp, h];
  }),
);

/** Species index of the shark, the dawn rare and the dusk rare. */
export const SHARK_SP = 7;
export const DAWN_SP = 10;
export const DUSK_SP = 11;
/** Species index of the spider crab, from the crab pots, and the trench's two, speared on a dive. */
export const CRAB_SP = 16;
export const SQUID_SP = 17;
export const DRAGON_SP = 18;
/** The ice floe's four, on the ice fishing line through its hole. */
export const CHAR_SP = 19;
export const COD_SP = 20;
export const ICEFISH_SP = 21;
export const SNOWCRAB_SP = 22;
/** Island 10's pond's four, on a line cast from its edge. */
export const POND_SPS: readonly number[] = [23, 24, 25, 26];

/** One line per species, in the game's voice. */
export const BLURBS: readonly string[] = [
  'Small, quick and everywhere near the shore. The first thing in every net.',
  'Striped and fast. Schools just past the shallows, where the water turns.',
  'Red as a buoy. Likes the middle rings and a net towed straight.',
  'Round, slow, and worth the trip out. Sells well; no one asks why.',
  'Big, silver and deep. The smokehouse pays half again for them.',
  'A flash of gold at the far ring. Sharks keep them company.',
  'Farthest out of all, and they glow after dark. Bring a boat that can get there.',
  'Charges a moving net. A wide enough net holds one; a lesser one tears. Sells for plenty.',
  'Rises after dark, pale and glowing, in the middle water. Gone by morning.',
  'Night fish of the far rings, each one a small light. Worth the dark.',
  'Once a dawn, somewhere inside your range, sparkling. Eighty seconds, then gone.',
  'Once a dusk, the same, and worth even more. The prettiest thing you will land.',
  'Green and gold with a blue back, and only in the deep. Look for the floating weed; they school under it.',
  'Sea-green with pink lips, and a beak for biting coral. Only round island 2, which is a long way to go for a fish. Worth it. With a spear you can take them from its sand.',
  'Big, brown and mottled, with a mouth like a bucket. Groupers live in wrecks, and the drowned town under island 3 is the biggest wreck in the sea.',
  'Long, blue and fast, with a spear for a nose. Only out in the far deep, where nobody had fished before you.',
  'Legs like a spider, longer than your arm, and a shell as bright as a sweet wrapper. They walk the sea floor and climb into crab pots for the bait.',
  'A squid that makes its own light, violet all over, down where the sun never reaches. Quick: aim where it is going.',
  'Black as the water it swims in, with a row of blue lights down its side and a glowing lure hanging off its chin to catch its supper. The deepest thing you can catch.',
  'A cold-water cousin of the trout, spotted, with a pink belly. The first thing up the ice fishing line, from the light just under the ice.',
  'Small and olive, and happier in icy water than anything else in the sea. They swim below the char.',
  'Nearly see-through, like a fish made of ice. Real icefish have clear blood, with no red in it at all, and live where the water is coldest. Deep down under the floe.',
  'Long legs and an orange shell, walking the floor far under the ice. Steer the hook down onto one as it drops: it grabs on when the line turns for home.',
  'A little round sunfish, blue-green with an orange breast, and the first fish lots of people ever catch. The pond is full of them.',
  'Gold with dark bars down its sides, like a tiger that took up swimming. Perch swim about the pond in little gangs.',
  'Green, with a dark stripe down its side and a mouth so big it can swallow a frog. The fish everybody in a pond wants to catch.',
  'Grey and spotted, with long whiskers like a cat, so it can taste its way along the muddy bottom in the dark. The biggest fish in the pond, and the hardest to find.',
  "The glow squid's giant cousin, three times as long, glowing teal, with two arms that trail far behind it. Real giant squid live this deep, and hardly anybody has ever seen one alive.",
  "A long body like a naga's, little fins all down its underside, and a flower for a head that glows pink in the dark. The flower is its mouth: small fish swim up to look at it.",
  'Orange, with three white stripes edged in black. Down here it is a long way from home: clown fish live in warm, shallow reefs, in anemones. Nobody knows how this one got so deep.',
  'Little, brown, and all mouth: a forked tail and a big open mouth that nibbles at anything. Drawn by the kid who found it.',
  'Black, with a jaw that hangs open like a trapdoor and a red light under its eye. Most deep fish cannot see red, so the loosejaw shines its red light like a secret torch.',
  'Fangs so long it cannot shut its mouth over them, and a row of lights down its belly. It swims up at night to hunt and comes back down by day.',
  "Pale, with two huge tube eyes that look straight up, like an owl's, to spot the shadows of things swimming above it in the very last of the light.",
  "A ghost shark: silver, with a great wing of a fin, a spine on its back and a tail like a whip. Its family and the sharks' went their own ways about 400 million years ago.",
  'Big and deep blue, spotted white, with fins on fleshy stalks like little legs. Everyone thought coelacanths died out with the dinosaurs, until a fisherman caught one in 1938.',
  'A shark as long and thin as an eel, with frilly gills and a mouth full of little three-pointed teeth. It has hardly changed in eighty million years.',
  'Silver from nose to tail and as long as Star, with a striped sucker plate on top of its head, as the real remoras have, that ride about stuck to sharks and whales. Sailors long ago told of a fish like this that could hold a ship still. Named by the kid who found it.',
];

/** The smallest boat whose range reaches a ring's near edge, by the orders' own rule. */
export function boatFor(r0: number): string {
  const t = RANGE.findIndex((r) => r >= r0 + 120);
  return TIER_NAME[t < 0 ? TIER_NAME.length - 1 : t] as string;
}

const cap = (s: string): string => s[0]?.toUpperCase() + s.slice(1);

export function whereText(sp: number): string {
  const h = HABITAT[sp];
  if (h?.isle2) return 'Round island 2, in the far corner of the deep. Flagship only.';
  if (h?.isle3)
    return 'Over the drowned shore of island 3, in the north corner of the deep. Flagship only.';
  if (h?.far) return 'Out at the corners of the far deep, past the far buoys. Flagship only.';
  if (h?.deep) return `Past the buoys, ${h.r0} to ${h.r1} out. Flagship only.`;
  if (h) return `Schools ${h.r0} to ${h.r1} out. ${cap(boatFor(h.r0))} range.`;
  if (sp === SHARK_SP) return 'Circling the tuna, goldfin and lanternfish schools.';
  if (sp === DAWN_SP || sp === DUSK_SP) return 'Anywhere inside your range, past the shallows.';
  if (sp === CRAB_SP)
    return 'In your crab pots, anywhere inside the buoys. Pots come with the crab shed on island 3.';
  if (sp === SQUID_SP)
    return 'The trench in the deep, in the midnight water. Dive with scuba gear and a spear.';
  if (sp === DRAGON_SP)
    return 'The trench in the deep, down by its floor. Dive with scuba gear and a spear.';
  if (sp === CHAR_SP || sp === COD_SP || sp === ICEFISH_SP)
    return "Under the ice floe in the far deep's north-west corner, on the ice fishing line.";
  if (POND_SPS.includes(sp))
    return "In the pond on island 10's prairie. Stand at its edge and cast.";
  if (sp === SNOWCRAB_SP)
    return 'On the floor under the ice floe, on the ice fishing line. Steer the hook down onto one.';
  if (ABYSS_FISH.includes(sp))
    return 'On the floor of the abyss, the blue hole past the white buoys, 1,000 metres down. Go down in the dive cage with scuba gear and a spear.';
  if (sp === REMORO)
    return 'Cruising slow laps over the floor of the abyss, 1,000 metres down past the white buoys. It takes three spears: each one sends it darting off.';
  return 'Out there somewhere.';
}

export function whenText(sp: number): string {
  const h = HABITAT[sp];
  if (h?.night) return 'At night. Glows.';
  if (h) return SPECIES[sp]?.glow ? 'By day; glows after dark.' : 'By day.';
  if (sp === SHARK_SP) return 'Day and night. A net of level 3 holds one.';
  if (sp === DAWN_SP) return 'Dawn, for eighty seconds.';
  if (sp === DUSK_SP) return 'Dusk, for eighty seconds.';
  if (sp === CRAB_SP) return 'Day and night. Pots further out fill faster.';
  if (sp === SQUID_SP || sp === DRAGON_SP)
    return 'Day and night: down there it is always dark. Glows.';
  if (sp >= CHAR_SP && sp <= SNOWCRAB_SP) return 'Day and night. So many a day under the hole.';
  if (POND_SPS.includes(sp))
    return 'Day and night, as many as you like. By day, birds sing while you wait.';
  if (ABYSS_FISH.includes(sp))
    return SPECIES[sp]?.glow
      ? 'Day and night: 1,000 metres down it is always dark. Glows.'
      : 'Day and night: 1,000 metres down it is always dark. Only your lamp shows it.';
  if (sp === REMORO)
    return 'One a day: land it, and the next is there tomorrow. Its silver glints in the dark.';
  return '';
}

export type GuidePage = {
  name: string;
  known: boolean;
  blurb: string;
  where: string;
  when: string;
  worth: string;
  caught: string;
};

/** A species' page, given how many the player has landed and the day of the first. */
export function guidePage(sp: number, count: number, firstDay: number): GuidePage {
  const S = SPECIES[sp];
  if (!S) throw new Error(`no species ${sp}`);
  const known = count > 0;
  const times = count === 1 ? 'Caught once' : `Caught ${count} times`;
  return {
    name: known ? cap(S.name) : '?',
    known,
    blurb: known ? (BLURBS[sp] ?? '') : 'Not caught yet.',
    where: whereText(sp),
    when: whenText(sp),
    worth: `${S.v} coins`,
    caught: known ? `${times}${firstDay > 0 ? `, first on day ${firstDay}` : ''}` : 'None yet',
  };
}
