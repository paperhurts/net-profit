/**
 * Inside the metal bridge (world/metalbridge.ts), the kid's facility, from his drawing of its inside and his answers in
 * his own tab, "the bridge for rowan" (2026-10-18): in through its door on the sea side from the boat, the round room
 * in its middle is the observatory, and off it are your room ("your character"), the science room where the scientist
 * is, the missions room with a hologram of the tar eel, the news room with news about the tar and a tentacle for
 * testing, and the dock on the tar side, where a tar animal with tentacles stays in the water. Up a ladder from the
 * observatory is the roof, and on it the orb from his drawing, island 9's, which shows you knowledge when you put your
 * hand in it (data/orb.ts). The rooms are ROOMS in world/tower.ts; this says where the doors and the things in them
 * stand, and what the climb button does by each.
 */
import {
  BRIDGE_MISSIONS,
  BRIDGE_NEWS,
  BRIDGE_OBS,
  BRIDGE_ROOF,
  BRIDGE_SCIENCE,
  BRIDGE_TARDOCK,
  BRIDGE_YOU,
  ROOMS,
  type Room,
} from './tower';

export type Pt = { x: number; y: number };

const room = (i: number): Room => ROOMS[i] as Room;

/** A point at angle a round room i, d in from its wall (less than nothing is out past it). */
export function onWall(i: number, a: number, d: number): Pt {
  const r = room(i);
  return { x: r.x + Math.cos(a) * (r.r - d), y: r.y + Math.sin(a) * (r.r - d) };
}

/** The observatory's doors round its back wall, each into one room, with the sign over it and the button's words. */
export const HUB_DOORS: readonly { to: number; a: number; sign: string; label: string }[] = [
  { to: BRIDGE_YOU, a: Math.PI * 0.85, sign: 'YOU', label: 'Into your room' },
  { to: BRIDGE_SCIENCE, a: Math.PI * 1.05, sign: 'SCIENCE', label: 'Into the science room' },
  { to: BRIDGE_TARDOCK, a: Math.PI * 1.25, sign: 'TAR DOCK', label: 'Out to the tar dock' },
  { to: BRIDGE_MISSIONS, a: Math.PI * 1.45, sign: 'MISSIONS', label: 'Into the missions room' },
  { to: BRIDGE_NEWS, a: Math.PI * 1.65, sign: 'NEWS', label: 'Into the news room' },
];
/** The rooms off the observatory, in the order of its doors. */
export const BRIDGE_SIDE = HUB_DOORS.map((d) => d.to);
/** Every room inside the bridge, and its roof. */
export const BRIDGE_INSIDE = [BRIDGE_OBS, ...BRIDGE_SIDE, BRIDGE_ROOF];
/**
 * The ladder up to the roof: free-standing at the observatory's front left, clear of its doors; and the hatch it comes
 * up through, the same way round on the roof.
 */
export const LADDER_A = Math.PI * 0.6;
/** Where each side room's door back to the observatory is: on its back wall, to the left. */
export const BACK_A = Math.PI * 0.9;

/** How near a door the figure must be for the button, and how near a thing. */
export const DOOR_IN_REACH = 36;
export const THING_REACH = 46;

/** Just in front of a door at angle a in room i: where the button is pressed. */
export function doorStep(i: number, a: number): Pt {
  return onWall(i, a, 14);
}
/** Where the figure stands having come in through a door at angle a: far enough in that the button is not there. */
export function cameIn(i: number, a: number): Pt {
  return onWall(i, a, 14 + DOOR_IN_REACH + 26);
}
/** Where the figure stands going from room `from` into room `to`, both in the bridge. */
export function arrive(from: number, to: number): Pt {
  if (to === BRIDGE_ROOF || from === BRIDGE_ROOF) return cameIn(to, LADDER_A);
  if (to !== BRIDGE_OBS) return cameIn(to, BACK_A);
  const d = HUB_DOORS.find((h) => h.to === from);
  return d ? cameIn(BRIDGE_OBS, d.a) : onWall(BRIDGE_OBS, Math.PI * 0.25, 70);
}

const centre = (i: number, back = 0): Pt => onWall(i, Math.PI * 1.25, room(i).r - back);
/** The big telescope in the middle of the observatory, under its open roof. */
export const SCOPE_IN = centre(BRIDGE_OBS, 10);
/** Your bed against the back wall of your room, and the mirror in its corner. */
export const BED_IN = onWall(BRIDGE_YOU, Math.PI * 1.32, 34);
export const MIRROR_IN = onWall(BRIDGE_YOU, Math.PI * 1.66, 20);
/** The scientist, at the back of the science room between the benches. */
export const SCIENTIST = onWall(BRIDGE_SCIENCE, Math.PI * 1.3, 52);
/**
 * The evil monkey's cage, in the science room's far corner from the door, once the tar eel is beaten: the kid's ("in the
 * bridge"; "it is the same monkey as island 4 DO NOT LET IT OUT").
 */
export const MONKEY_CAGE = onWall(BRIDGE_SCIENCE, Math.PI * 1.68, 20);
/** Where to stand to look at it: in front of it, not in it. */
export const CAGE_LOOK = onWall(BRIDGE_SCIENCE, Math.PI * 1.68, 64);
/** The round table the hologram turns over, in the middle of the missions room. */
export const HOLO = centre(BRIDGE_MISSIONS, 8);
/** The news screen on the news room's back wall, and the tank with the tentacle in it. */
export const NEWS_SCREEN = onWall(BRIDGE_NEWS, Math.PI * 1.3, 0);
export const NEWS_READ = onWall(BRIDGE_NEWS, Math.PI * 1.3, 30);
export const TANK = onWall(BRIDGE_NEWS, Math.PI * 1.64, 26);
/** The dock's open edge onto the tar at the back, and the tar animal out in the tar past it. */
export const TAR_EDGE = onWall(BRIDGE_TARDOCK, Math.PI * 1.25, 22);
export const TAR_ANIMAL = onWall(BRIDGE_TARDOCK, Math.PI * 1.25, -110);
/** The ladder in the observatory, the hatch on the roof, the orb on its pedestal in the roof's middle, and where to
 * stand to put your hand in it. */
export const LADDER_UP = onWall(BRIDGE_OBS, LADDER_A, 24);
export const HATCH = onWall(BRIDGE_ROOF, LADDER_A, 24);
export const ORB_ROOF = centre(BRIDGE_ROOF);
export const ORB_TOUCH = onWall(BRIDGE_ROOF, Math.PI * 0.25, room(BRIDGE_ROOF).r - 34);
/** Won in stealth mission 1, the chemistry boat, tied up in the tar off the dock's right-hand rail. */
export const CHEM_BOAT = onWall(BRIDGE_TARDOCK, Math.PI * 1.42, -76);
export const CHEM_BOAT_LOOK = onWall(BRIDGE_TARDOCK, Math.PI * 1.42, 22);

/** Things you can use inside the bridge, by the button's action. */
export const BRIDGE_THINGS: readonly { room: number; at: Pt; act: string }[] = [
  { room: BRIDGE_OBS, at: SCOPE_IN, act: 'bscope' },
  { room: BRIDGE_YOU, at: BED_IN, act: 'bbed' },
  { room: BRIDGE_YOU, at: MIRROR_IN, act: 'bmirror' },
  { room: BRIDGE_SCIENCE, at: SCIENTIST, act: 'bsci' },
  { room: BRIDGE_SCIENCE, at: CAGE_LOOK, act: 'bcage' },
  { room: BRIDGE_MISSIONS, at: HOLO, act: 'bmission' },
  { room: BRIDGE_NEWS, at: NEWS_READ, act: 'bnews' },
  { room: BRIDGE_NEWS, at: TANK, act: 'btank' },
  { room: BRIDGE_TARDOCK, at: TAR_EDGE, act: 'btar' },
  { room: BRIDGE_TARDOCK, at: CHEM_BOAT_LOOK, act: 'bboat' },
  { room: BRIDGE_OBS, at: LADDER_UP, act: `bdoor-${BRIDGE_ROOF}` },
  { room: BRIDGE_ROOF, at: HATCH, act: `bdoor-${BRIDGE_OBS}` },
  { room: BRIDGE_ROOF, at: ORB_TOUCH, act: 'borb' },
];

/**
 * What the climb button does for the figure at (x, y) in room i inside the bridge: through a door ('bdoor-' and the
 * room it goes to), or one of the things in the room; or nothing. The bed only while there is a night to sleep through,
 * the chemistry boat only once it is yours, the monkey's cage only once it is in it.
 */
export function bridgeAction(
  i: number,
  x: number,
  y: number,
  canSleep: boolean,
  hasBoat = false,
  caged = false,
): string | null {
  const near = (p: Pt, r: number) => Math.hypot(x - p.x, y - p.y) < r;
  if (i === BRIDGE_OBS) {
    for (const d of HUB_DOORS) if (near(doorStep(i, d.a), DOOR_IN_REACH)) return `bdoor-${d.to}`;
  } else if (BRIDGE_SIDE.includes(i) && near(doorStep(i, BACK_A), DOOR_IN_REACH))
    return `bdoor-${BRIDGE_OBS}`;
  for (const t of BRIDGE_THINGS)
    if (
      t.room === i &&
      (t.act !== 'bbed' || canSleep) &&
      (t.act !== 'bboat' || hasBoat) &&
      (t.act !== 'bcage' || caged) &&
      near(t.at, THING_REACH)
    )
      return t.act;
  return null;
}

/** The button's words for a bridge action. */
export function bridgeLabel(act: string): string {
  if (act.startsWith('bdoor-')) {
    const to = Number(act.slice(6));
    return to === BRIDGE_OBS
      ? 'Back to the observatory'
      : to === BRIDGE_ROOF
        ? 'Up the ladder to the roof'
        : (HUB_DOORS.find((d) => d.to === to)?.label ?? 'Through the door');
  }
  return (
    {
      bscope: 'Look through the telescope',
      bbed: 'Sleep till morning',
      bmirror: 'Look in the mirror',
      bsci: 'Talk to the scientist',
      bmission: 'Start mission 1',
      bnews: 'Read the tar news',
      btank: 'Tap the glass',
      btar: 'Look at the tar animal',
      bboat: 'Sail the chemistry boat',
      bcage: 'Look at the monkey',
      borb: 'Put your hand in the orb',
    }[act] ?? ''
  );
}

/** The news on the screen, about the tar, one after another. */
export const TAR_NEWS: readonly string[] = [
  'TAR NEWS: The tar ocean rose two whole centimetres last night. The bridge is holding it back!',
  'TAR NEWS: Tar beasts seen on the shore of the tar island. Experts say: do not pat them.',
  'TAR NEWS: Something long and black was spotted swimming under the tar. Is it the tar eel?',
  'TAR NEWS: A tar dragon flew over the tower on the hill. It had a lot of legs. Nobody counted them all.',
  'TAR NEWS: The scientist says the tentacle in the tank is "doing fine" and "only a little bit grumpy".',
  'TAR NEWS: Weather on the tar side: sticky, with a chance of bubbles.',
];

/** The evil monkey in its cage, one look after another; and the scientist, every time: do not let it out. */
export const MONKEY_SAYS: readonly string[] = [
  'The evil monkey from island 4, the one that called up the tar monster! It rattles the bars and chatters at you. The scientist: "DO NOT LET IT OUT!"',
  'The evil monkey holds out its paw through the bars, all sweet, as if it wants to shake hands. The scientist: "Don\'t. Do NOT let it out."',
  'The evil monkey points at the lock, then at you, and grins. The scientist: "Nope. It stays in there."',
  'The evil monkey blows a raspberry at you and hangs upside down from the top of the cage. The scientist: "Ignore it. It wants you to open the door."',
];

/** What the scientist says, one after another, the first only the first time. */
export const SCIENTIST_SAYS: readonly string[] = [
  'The scientist: "Oh! A visitor! Welcome to the bridge. I study the tar: where it comes from, and how to keep it on its side of the sea. This bridge holds it back."',
  'The scientist: "I have a mission for you. A sneaky one! Go to the missions room and start mission 1 at the table. Sneaking is very important on the tar side."',
  'The scientist: "Have you seen the tentacle in the news room? We keep it for testing. Do not tap the glass. Everybody taps the glass."',
  'The scientist: "Look through the telescope in the observatory. You can see island 2 of the tar ocean from here, with the sorcerer\'s tower on the hill."',
];
