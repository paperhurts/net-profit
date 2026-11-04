/**
 * The goat cave under Goat Isle's hill (part four of the owner's plan: "a whole goat sandbox physics mini game in a
 * goat cave where you explore and find all the kinds of goats"; her calls: played side-on, like the treehouse climb,
 * and the eleven kinds of goat to find). This is its rooms' shapes, in the cave's own side-on frame: x across, y up,
 * in the same units as the treehouse climb, so a jump goes as high (about 26) and as far.
 *
 * The first room is the puzzle the plan describes, and all a player needs to learn: a ledge too high to jump to, so
 * startle a goat at its foot and climb it; a gap too wide to jump, so push a fainted goat out over its edge and cross
 * on it. Across the gap is the first new kind of goat to find. Below the gap is a pit of warm cheese fondue: fall in
 * and it is a splosh and back to the door, nothing lost.
 */

/** A block of rock: its left, right, bottom and top. */
export type Rock = { x0: number; x1: number; y0: number; y1: number };

/** A kind of goat to find in the cave, for the Goat Almanac to come. */
export type GoatKind =
  | 'fainting'
  | 'pygmy'
  | 'angora'
  | 'mountain'
  | 'nubian'
  | 'boer'
  | 'alpine'
  | 'roof'
  | 'cheese'
  | 'ghost'
  | 'goat';

export const KIND_NAMES: Readonly<Record<GoatKind, string>> = {
  fainting: 'Fainting goat',
  pygmy: 'Pygmy goat',
  angora: 'Angora goat',
  mountain: 'Mountain goat',
  nubian: 'Nubian goat',
  boer: 'Boer goat',
  alpine: 'Alpine goat',
  roof: 'Roof goat',
  cheese: 'Cheese goat',
  ghost: 'Ghost goat',
  goat: 'The G.O.A.T.',
};

export type CaveRoom = {
  name: string;
  /** How wide and how tall it is. */
  w: number;
  h: number;
  rock: readonly Rock[];
  /** The fondue pit: fall below its top and it is back to the door. */
  pit: Rock | null;
  /** Where the figure comes in, at the door on the left. */
  door: { x: number; y: number };
  /** The fainting goats, where each starts. */
  goats: readonly { x: number; y: number }[];
  /** The goat to find here: its kind, where it stands, and what finding it says. */
  find: { kind: GoatKind; x: number; y: number; says: string };
};

/**
 * Room one, "The Way In": the floor from the door, a ledge 30 up (a jump is 26, a fainted goat is 7 tall), the pit
 * 50 across (a running jump is about 38), and the far ledge with a pygmy goat on it.
 */
export const ROOM1: CaveRoom = {
  name: 'The Way In',
  w: 330,
  h: 150,
  rock: [
    // The floor from the door, and under everything.
    { x0: -20, x1: 175, y0: -30, y1: 0 },
    // The high ledge, its face toward the door.
    { x0: 175, x1: 245, y0: -30, y1: 30 },
    // The far ledge, past the pit.
    { x0: 295, x1: 350, y0: -30, y1: 30 },
    // The pit's floor, under the fondue.
    { x0: 245, x1: 295, y0: -60, y1: -40 },
    // The walls at either end, and the ceiling.
    { x0: -40, x1: 0, y0: -30, y1: 180 },
    { x0: 330, x1: 370, y0: -30, y1: 180 },
    { x0: -40, x1: 370, y0: 150, y1: 180 },
  ],
  pit: { x0: 245, x1: 295, y0: -40, y1: -14 },
  door: { x: 14, y: 0 },
  goats: [
    { x: 70, y: 0 },
    { x: 125, y: 0 },
    { x: 210, y: 30 },
  ],
  find: {
    kind: 'pygmy',
    x: 318,
    y: 30,
    says: 'A pygmy goat! Tiny, round and very pleased with itself. It was waiting for you.',
  },
};

export const CAVE_ROOMS: readonly CaveRoom[] = [ROOM1];
