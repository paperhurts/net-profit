/**
 * The Witch Doctor in New Dimensions (data/dimension.ts), the owner's design ("they're my favorite class"), a minion
 * class the way her kid likes to play, every name and look the game's own (2026-11-09):
 *
 * - The Skull Familiar, a little flying skull at her shoulder, is her main attack: it shoots neon purple glitter
 *   lightning at the nearest enemy.
 * - Bloodrot Terriers, a pack of scruffy zombie dogs: 2 at level 1, 3 at 4, 4 at 8. They bite and keep things off her;
 *   one that falls comes back by itself a few seconds later.
 * - Patches, a big teddy bear sewn from a patchwork quilt, from level 5, one at a time: his job is to distract, not to
 *   hurt, keeping things off her.
 * - Frost spiders, a cast of three that scuttle at the nearest and slow what they bite.
 * - Toad Rain: toads rain down on a circle and leave it mud that slows, and it "can absolutely be spammed across the
 *   battlefield".
 *
 * Her terriers and Patches have high threat: the dimension's enemies chase her as one group, so what they do is
 * distract: what stands near Patches (wide) or a terrier (close) is held up again and again, gawping, and so kept off
 * her. True threat, enemies choosing a minion to chase, would touch every kind of enemy, and waits for its own piece.
 *
 * My picks, hers to change: the zap's reach and damage (the Warrior's blow, from range); the terriers back one at a
 * time every 8 s; Patches 30 hits, nibbling for 1, every 25 s once he is down; frost spiders every 8 s, slowing 1 s a
 * bite; Toad Rain every 1.5 s, 1 for each toad that lands, its mud slowing for 4 s, six patches of mud at most.
 *
 * Here: the numbers, free of the game. Her waits live in the Warrior's bag (warrior.ts Fury), so the pepper works.
 */
import { basicPower, type Fury, peppered } from './warrior';

export type Hex = 'terriers' | 'patches' | 'spiders' | 'toads';
/** In the order of her four buttons. */
export const HEXES: readonly Hex[] = ['terriers', 'patches', 'spiders', 'toads'];
export const HEX_SPECS: Readonly<Record<Hex, { name: string; every: number; from: number }>> = {
  terriers: { name: 'Bloodrot Terriers', every: 6, from: 1 },
  patches: { name: 'Patches', every: 25, from: 5 },
  spiders: { name: 'Frost spiders', every: 8, from: 1 },
  toads: { name: 'Toad Rain', every: 1.5, from: 1 },
};

/** The Skull Familiar's glitter lightning: how far, how often, how hard (the Warrior's blow). */
export const ZAP_RANGE = 180;
export const ZAP_RELOAD = 0.6;
export function zapPower(lv: number): number {
  return basicPower(lv);
}

/** Bloodrot Terriers by level: 2 at 1, 3 at 4, 4 at 8; one that falls comes back every 8 s. */
export function terriersAt(lv: number): number {
  if (lv >= 8) return 4;
  if (lv >= 4) return 3;
  return 2;
}
export const TERRIER_BACK = 8;

/** Distraction: every so often what stands this near Patches or a terrier is held up this long. */
export const PATCHES_PULL = 90;
export const TERRIER_PULL = 40;
export const DISTRACT_EVERY = 2;
export const DISTRACT_HOLD = 0.8;

/** Frost spiders: a cast of three, each bite slowing what it bites. */
export const SPIDERS = 3;
export const SPIDER_SLOW = 1;

/** Toad Rain: where it can land, how wide, its damage, its mud's life and slow, and how many patches at most. */
export const TOAD_RANGE = 220;
export const TOAD_R = 50;
export const TOAD_HIT = 1;
export const MUD_TIME = 4;
export const MUD_EVERY = 1;
export const MUD_HOLD = 0.4;
export const MUD_MAX = 6;

export function noHex(f: Fury, h: Hex, lv: number): 'level' | 'wait' | null {
  if (lv < HEX_SPECS[h].from) return 'level';
  return (f.cd[h] ?? 0) > 0 && !peppered(f) ? 'wait' : null;
}
export function hex(f: Fury, h: Hex, lv: number): boolean {
  if (noHex(f, h, lv)) return false;
  if (peppered(f)) {
    f.skips--;
    f.cd[h] = 0;
  } else f.cd[h] = HEX_SPECS[h].every;
  return true;
}

/** A patch of mud from Toad Rain. */
export type Mud = { x: number; y: number; t: number; pulse: number };
export function mud(x: number, y: number): Mud {
  return { x, y, t: MUD_TIME, pulse: 0 };
}
/** Time on a patch of mud: whether what stands in it is slowed this step. Gone at 0. */
export function tickMud(m: Mud, dt: number): boolean {
  m.t = Math.max(0, m.t - dt);
  m.pulse -= dt;
  if (m.t > 0 && m.pulse <= 0) {
    m.pulse = MUD_EVERY;
    return true;
  }
  return false;
}
/** Muds kept: the newest MUD_MAX still wet. */
export function keepMuds(ms: Mud[]): Mud[] {
  return ms.filter((m) => m.t > 0).slice(-MUD_MAX);
}
