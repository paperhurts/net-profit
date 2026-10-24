/**
 * The Endless Isle's battles, the owner's plan (2026-10-23, taken as it stood): five a side, you and four bots against
 * five bots, never real people online. Each team is a tank, a healer and three damage, the bots filling the places you
 * do not take. In battle your role sets your hearts and your weapon; story armour and the spear stay outside, and your
 * companions sit it out, only your side's minion fighting. The two sides have the same numbers, only their looks
 * differ, so neither is better.
 *
 * This is Capture the Flag with each role's basic attack, its three badges and their abilities.
 */

import type { Side } from '../world/endless';

export type Role = 'tank' | 'damage' | 'healer';

/**
 * Each role's kit, the same for both sides: hearts, walking pace (yours is 85), and its basic attack: how hard, how
 * far, how often, and whether it is thrown (the healer's: the cook throws a fish).
 */
export type Kit = {
  hearts: number;
  speed: number;
  hit: number;
  reach: number;
  every: number;
  thrown: boolean;
};
export const KITS: Readonly<Record<Role, Kit>> = {
  tank: { hearts: 14, speed: 75, hit: 2, reach: 40, every: 1.2, thrown: false },
  damage: { hearts: 8, speed: 85, hit: 2, reach: 40, every: 0.7, thrown: false },
  healer: { hearts: 7, speed: 85, hit: 1, reach: 220, every: 0.9, thrown: true },
};

/**
 * Armour, the tank's (2026-10-24, the owner's call: the tank died more than anyone, and a damage beat it one on one),
 * and yours in any place, so the other side's hits on you are kinder, once even when you are the tank: every hit is
 * this much less, never under this. A Badge II guard halves a hit first.
 */
export const ARMOUR = { less: 1, least: 0.5 } as const;

/** What each role is called on each side. */
export const ROLE_NAME: Readonly<Record<Side, Readonly<Record<Role, string>>>> = {
  pirate: { tank: 'Quartermaster', damage: 'Swashbuckler', healer: "Ship's Cook" },
  ninja: { tank: 'Stone Guard', damage: 'Shadow', healer: 'Blossom Monk' },
};

/** A team, in the order its places are filled: you take a damage place. */
export const TEAM: readonly Role[] = ['tank', 'healer', 'damage', 'damage', 'damage'];

/** The bots' names, pirates' and ninjas'; a team takes the first it needs. */
export const BOT_NAMES: Readonly<Record<Side, readonly string[]>> = {
  pirate: ['Barnacle Bob', 'One-Eye Wendy', 'Salty Sam', 'Peg-Leg Pete', 'Mad Molly'],
  ninja: ['Whisper', 'Pebble', 'Shade', 'Willow', 'Ember'],
};

/**
 * Each role's three badges and the ability each gives, the plan's: Badge I yours the first time you fight in that role
 * for that side, Badge II at 3 marks, Badge III at 8. The same numbers on both sides; only the names and the looks
 * differ. Each aims itself.
 */
export type Ability =
  | 'taunt'
  | 'shot'
  | 'heal'
  | 'guard'
  | 'leap'
  | 'hot'
  | 'stomp'
  | 'bomb'
  | 'group';
export const ABILITIES: Readonly<Record<Role, readonly [Ability, Ability, Ability]>> = {
  tank: ['taunt', 'guard', 'stomp'],
  damage: ['shot', 'leap', 'bomb'],
  healer: ['heal', 'hot', 'group'],
};
export const ABILITY_I: Readonly<Record<Role, Ability>> = {
  tank: 'taunt',
  damage: 'shot',
  healer: 'heal',
};
export const ABILITY = {
  /** Every foe this near must come at you for this long. */
  taunt: { reach: 140, lasts: 4, every: 12 },
  /** A hit from afar at the nearest foe (a carrier first), after an aim line shown this long. */
  shot: { hit: 4, reach: 300, aim: 0.4, every: 6 },
  /** Hearts back for the most hurt teammate this near, or yourself. */
  heal: { hearts: 4, reach: 220, every: 7 },
  /** Hits on you count this much, for this long. */
  guard: { take: 0.5, lasts: 6, every: 18 },
  /** A jump to a foe this far off, and a strike for this much. */
  leap: { reach: 220, hit: 3, every: 10 },
  /** A heart a second for the most hurt teammate this near, or yourself, for this long. */
  hot: { reach: 220, lasts: 6, every: 10 },
  /** A red ring for this long, then this much to every foe this near, and stunned for this long. */
  stomp: { wind: 0.6, reach: 90, hit: 2, stun: 1.5, every: 20 },
  /** Thrown at a foe this far off: in the air this long, then a red ring this wide round where it lands, bursting for
   * this much this long after it lands. */
  bomb: { reach: 250, fly: 0.35, ring: 45, fuse: 1.2, hit: 5, every: 22 },
  /** A heart a second for every teammate this near, for this long. */
  group: { reach: 180, lasts: 6, every: 25 },
} as const;
/** What each is called on each side: the pirates' and the ninjas' look for the same thing. */
export const ABILITY_NAME: Readonly<Record<Side, Readonly<Record<Ability, string>>>> = {
  pirate: {
    taunt: 'Oi! Over here!',
    shot: 'Flintlock',
    heal: 'Sea Biscuit',
    guard: 'Batten the Hatches',
    leap: 'Swing In',
    hot: 'Lime Ration',
    stomp: 'Drop Anchor',
    bomb: 'Powder Keg',
    group: 'Sea Shanty',
  },
  ninja: {
    taunt: 'Mountain Shout',
    shot: 'Shuriken',
    heal: 'Green Tea',
    guard: 'Iron Skin',
    leap: 'Shadow Step',
    hot: 'Cherry Blossom',
    stomp: 'Earthquake Stomp',
    bomb: 'Firework Bomb',
    group: 'Lotus Circle',
  },
};
/** What each does, in a line. The group heal works a little differently on each side, so it has a line for each. */
export const ABILITY_SAYS: Readonly<Record<Exclude<Ability, 'group'>, string>> = {
  taunt: 'Every enemy close by has to come at you for 4 seconds.',
  shot: 'A hit for 4 on the nearest enemy up to 300 away.',
  heal: '4 hearts back for the most hurt teammate near you, or for you.',
  guard: 'You take half damage for 6 seconds.',
  leap: 'Jump to an enemy up to 220 away and strike for 3.',
  hot: 'A heart a second for 6 seconds, for the most hurt teammate near you, or for you.',
  stomp:
    'A red ring, then every enemy close round you takes 2 and is stunned for a second and a half.',
  bomb: 'Thrown at an enemy: a red ring where it lands, then it bursts for 5 on everyone still in it.',
};
export function abilitySays(side: Side, ab: Ability): string {
  if (ab !== 'group') return ABILITY_SAYS[ab];
  return side === 'pirate'
    ? 'You sing, and every teammate near you gets a heart a second for 6 seconds. You walk at half speed while you sing.'
    : 'A glowing ring on the ground: every teammate in it gets a heart a second for 6 seconds.';
}

/** The marks a badge takes, Badge I's none (yours in your first battle); and the badge a track's marks give. */
export const BADGE_MARKS: readonly [number, number, number] = [0, 3, 8];
/** The last rung: Badge III turns gold, with a title and no new power, the long goal. */
export const GOLD_MARKS = 20;
export type Badge = 1 | 2 | 3;
export function badgeOf(marks: number): Badge {
  return marks >= BADGE_MARKS[2] ? 3 : marks >= BADGE_MARKS[1] ? 2 : 1;
}

/** Capture the Flag's rules. */
export const CTF = {
  /** Captures to win. */
  win: 3,
  /** The clock, seconds: the most captures when it runs out wins, the same is a draw. */
  clock: 420,
  /** Behind the gates before they drop. */
  gates: 10,
  /** Beaten, back up at your graveyard after this long. */
  respawn: 6,
  /** A flag carrier's pace. */
  carry: 0.85,
  /** A dropped flag left alone this long goes home. */
  dropped: 10,
  /** Both flags out this long, and each carrier takes a heart more from every hit, so nobody hides forever. */
  bothOut: 60,
  /** Touching a flag, or your own flag's place to score. */
  touch: 26,
} as const;

/** The two battles: Capture the Flag, and Hold the Forts. */
export type Mode = 'flag' | 'forts';

/**
 * Hold the Forts' rules, the plan's: three bases, each half's own and the Shipwreck between. Stand in a base's ring
 * with no foe in it to take it; both sides in it, nobody gets anywhere. Every second each side scores for the bases it
 * holds, the more the much faster, and the first to its total wins, or the most when the clock runs out.
 */
export const FORTS = {
  /** Standing in a ring with no foe in it, this long to take it. */
  take: 5,
  /** Points a second for holding none, one, two or all three. */
  rate: [0, 1, 3, 10],
  /** First to this many wins. */
  win: 400,
  /** The clock, seconds: the most points when it runs out wins, the same is a draw. */
  clock: 360,
  /** A taking left alone fades back at this much of its pace. */
  fade: 0.5,
} as const;

/** The three bases, as they are called. */
export type HoldKey = 'battery' | 'wreck' | 'bell';
export const HOLD_NAME: Readonly<Record<HoldKey, string>> = {
  battery: 'the Cannon Battery',
  wreck: 'the Shipwreck',
  bell: 'the Bell Tower',
};

/**
 * What a battle pays, the plan's (less than fishing pays for the time, so fishing stays the way to earn), and the marks
 * it earns toward the next badge for the side and role you fought as (1 for a loss, 2 for a win, so losing never stalls
 * you). The plan has no draw: one pays and marks as a loss.
 */
export const PAY = { win: 500, draw: 200, loss: 200 } as const;
export const MARKS = { win: 2, draw: 1, loss: 1 } as const;

/** What you have fought on the Endless Isle: battles fought and won, and your marks for each side and role. */
export type Battles = {
  fought: number;
  won: number;
  marks: Record<Side, Record<Role, number>>;
};
const ROLES: readonly Role[] = ['tank', 'damage', 'healer'];
/** More battles than anyone will fight. */
const BATTLES_MAX = 99999;
export function noBattles(): Battles {
  const none = (): Record<Role, number> => ({ tank: 0, damage: 0, healer: 0 });
  return { fought: 0, won: 0, marks: { pirate: none(), ninja: none() } };
}
/** A save's battles, anything that is not a count read as none; undefined when there are none at all. */
export function parseBattles(v: unknown): Battles | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const o = v as Record<string, unknown>;
  const count = (x: unknown): number => {
    const n = Math.floor(Number(x));
    return Number.isFinite(n) ? Math.max(0, Math.min(BATTLES_MAX, n)) : 0;
  };
  const b = noBattles();
  b.fought = count(o.fought);
  b.won = Math.min(b.fought, count(o.won));
  const marks = o.marks && typeof o.marks === 'object' ? (o.marks as Record<string, unknown>) : {};
  for (const side of ['pirate', 'ninja'] as const) {
    const m =
      marks[side] && typeof marks[side] === 'object'
        ? (marks[side] as Record<string, unknown>)
        : {};
    for (const r of ROLES) b.marks[side][r] = count(m[r]);
  }
  return b.fought ? b : undefined;
}
/** Marks for a battle: its result, for your side and role. */
export function marked(b: Battles, side: Side, role: Role, result: keyof typeof MARKS): Battles {
  return {
    fought: Math.min(BATTLES_MAX, b.fought + 1),
    won: Math.min(BATTLES_MAX, b.won + (result === 'win' ? 1 : 0)),
    marks: {
      ...b.marks,
      [side]: {
        ...b.marks[side],
        [role]: Math.min(BATTLES_MAX, b.marks[side][role] + MARKS[result]),
      },
    },
  };
}
