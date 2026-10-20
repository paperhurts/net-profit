/**
 * The tester panel, for the owner: she could not get past the Skeleton Shark
 * King, the kid could, and she wanted to see what lies past him. Opened with
 * #tester at the end of the game's link (#tester-off puts it away again), it
 * stays on for that device, and a Tester button in the shop opens it: the
 * story's steps in the order they come, each marking everything up to it
 * beaten, and a few extras. The game applies what is tapped, saves, and
 * starts again from the save, so everything that hangs off the story fits.
 * A skip never skips a cutscene (the kid: "cutscenes are important"): island 3
 * is left with the tar monster's scene still to come, which plays the next
 * time the boat is out, and the game owes the Old One's rising (see main).
 * Nothing in it is shown to a player who has not opened the link.
 */

import { CROWS } from '../entities/crows';

/** The story as the save keeps it: how far each part has gone. */
export type Story = {
  isle3Seen: boolean;
  isle3Stage: number;
  isle4Stage: number;
  isle5Seen: boolean;
  isle5Stage: number;
  isle6Seen: boolean;
  isle6Stage: number;
  isle7Seen: boolean;
  isle7Stage: number;
  soulArmour: boolean;
  isle8Seen: boolean;
  heronStage: number;
  pelicanBeaten: boolean;
  feederFull: boolean;
  crows: number;
  catermanFree: boolean;
  skullKey: boolean;
  cryptWon: boolean;
  stealth1: boolean;
  invis: boolean;
  tarLeaderBeaten: boolean;
  eelStage: number;
  skrillBeaten: boolean;
};

/** A step of the story: what the panel calls it, what a game past it is past, and what marking it beaten sets (never lowers). */
export type Step = { id: string; label: string; short: string; apply(s: Story): void };

const atLeast = (s: Story, k: keyof Story, v: number): void => {
  (s[k] as number) = Math.max(s[k] as number, v);
};

export const STEPS: readonly Step[] = [
  {
    id: 'isle3',
    short: 'island 3',
    label: 'Island 3: its tower, the swordsman, the warlock freed, and the tar',
    // Stage 3, not 4: the tar monster's scene is still to come, and moves it on.
    apply: (s) => {
      s.isle3Seen = true;
      atLeast(s, 'isle3Stage', 3);
    },
  },
  {
    id: 'anchorer',
    short: 'the Tar Anchorer',
    label: 'The Tar Anchorer beaten: the far deep opens',
    apply: (s) => atLeast(s, 'isle4Stage', 1),
  },
  {
    id: 'king',
    short: 'the Skeleton Shark King',
    label: 'The Skeleton Shark King beaten',
    apply: (s) => {
      s.isle5Seen = true;
      atLeast(s, 'isle5Stage', 1);
    },
  },
  {
    id: 'cthulhu',
    short: 'Cthulhu',
    label: 'The Deep One and Cthulhu beaten on island 6',
    apply: (s) => {
      s.isle6Seen = true;
      atLeast(s, 'isle6Stage', 2);
    },
  },
  {
    id: 'sorcerer',
    short: "island 7's sorcerer",
    label: "Island 7's sorcerer beaten: the portal wakes",
    apply: (s) => {
      s.isle7Seen = true;
      atLeast(s, 'isle7Stage', 1);
    },
  },
  {
    id: 'forgotten',
    short: 'the Forgotten One',
    label: 'The Forgotten One beaten',
    apply: (s) => atLeast(s, 'isle7Stage', 2),
  },
  {
    id: 'oldone',
    short: 'the Old One',
    label: 'The Old One beaten, and the soul armour',
    apply: (s) => {
      atLeast(s, 'isle7Stage', 4);
      s.soulArmour = true;
    },
  },
  {
    id: 'heron',
    short: 'the Heron',
    label: 'The Heron beaten on island 9',
    apply: (s) => {
      s.isle8Seen = true;
      atLeast(s, 'heronStage', 2);
    },
  },
  // From here on the islands, the bridge and the tar island are left to be found: a step marks only who is beaten and
  // what was won, so each landfall still says what it is the first time.
  {
    id: 'pelican',
    short: 'the giant pelican',
    label:
      "Island 10's giant pelican beaten, and its crows won: they show the way past the far far buoys",
    apply: (s) => {
      s.pelicanBeaten = true;
      s.feederFull = true;
      atLeast(s, 'crows', CROWS);
    },
  },
  {
    id: 'caterman',
    short: "the Heron's brother",
    label: "Island 11: the Heron's brother, and Caterman with his swan paddle boat",
    apply: (s) => {
      s.catermanFree = true;
    },
  },
  {
    // Not the castle tour after: his cutscene plays when you go to him in the crypt, where he kneels, waiting.
    id: 'crypt',
    short: 'the crypt',
    label: 'Island 11: the skull key, and the Forgotten One beaten again in the crypt',
    apply: (s) => {
      s.skullKey = true;
      s.cryptWon = true;
    },
  },
  {
    id: 'mission1',
    short: 'stealth mission 1',
    label:
      "The metal bridge's stealth mission 1 won: the chemistry boat, and the invisibility potion",
    apply: (s) => {
      s.stealth1 = true;
      s.invis = true;
    },
  },
  {
    id: 'tarleader',
    short: 'the tar leader',
    label: 'The tar leader beaten on the tar island',
    apply: (s) => {
      s.tarLeaderBeaten = true;
    },
  },
  {
    id: 'eel',
    short: 'the tar eel',
    label: "Mission 2's tar eel beaten: the evil monkey caged in the bridge",
    apply: (s) => atLeast(s, 'eelStage', 2),
  },
  {
    id: 'skrill',
    short: 'Skrill',
    label: 'Skrill beaten, at the top of his tower on Skull Island',
    apply: (s) => {
      s.skrillBeaten = true;
    },
  },
];

/** Mark step i beaten, and every step before it. */
export function skipTo(s: Story, i: number): void {
  for (let k = 0; k <= i && k < STEPS.length; k++) STEPS[k]?.apply(s);
}

/** How far the story has got: the last step whose marking would change nothing. */
export function stepsDone(s: Story): number {
  let n = 0;
  for (const step of STEPS) {
    const t = { ...s };
    step.apply(t);
    if (JSON.stringify(t) !== JSON.stringify(s)) break;
    n++;
  }
  return n;
}

/** What the link's #… says to do with the panel: turn it on, put it away, or nothing. */
export function testerFromHash(hash: string): 'on' | 'off' | null {
  const h = hash.replace(/^#/, '').toLowerCase();
  if (h === 'tester') return 'on';
  if (h === 'tester-off') return 'off';
  return null;
}

/** Where the device keeps the panel switched on. */
export const TESTER_KEY = 'netprofit.tester';
