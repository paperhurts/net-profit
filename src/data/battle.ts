/**
 * The Endless Isle's battles, the owner's plan (2026-10-23, taken as it stood): five a side, you and four bots against
 * five bots, never real people online. Each team is a tank, a healer and three damage, the bots filling the places you
 * do not take. In battle your role sets your hearts and your weapon; story armour and the spear stay outside, and your
 * companions sit it out, only your side's minion fighting. The two sides have the same numbers, only their looks
 * differ, so neither is better.
 *
 * This piece is Capture the Flag with each role's basic attack. The roles' abilities and badges come next.
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
  tank: { hearts: 14, speed: 75, hit: 1, reach: 40, every: 0.8, thrown: false },
  damage: { hearts: 8, speed: 85, hit: 2, reach: 40, every: 0.7, thrown: false },
  healer: { hearts: 7, speed: 85, hit: 1, reach: 160, every: 0.9, thrown: true },
};

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
