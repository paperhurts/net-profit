/**
 * Badges for the companions, the kid's: "badges that power companions up with magic, each badge a different power
 * and movable from one companion to another: armour (an energy shield), +3 health, upgradable to +6; damage;
 * healing". The old man on island 10 sells them; the Badges card pins each on one companion, and a tap moves it to
 * another. One badge to a companion. Invisibility, his fourth, waits on what "levels" are.
 *
 *  - The shield badge: a blue bubble round the wearer that takes the next 3 hits (6, upgraded) before any hurts it,
 *    full again every landing.
 *  - The damage badge: the wearer's hits count double.
 *  - The healing badge: hurt, the wearer gets a hit point back every few seconds, even in a fight.
 */

import type { PalKind } from '../entities/pals';

export type BadgeKind = 'shield' | 'damage' | 'heal';
export const BADGE_KINDS: readonly BadgeKind[] = ['shield', 'damage', 'heal'];

/** Who can wear one: the companions that fight beside the figure and can be hurt. */
export type Wearer = 'warlock' | PalKind;
export const WEARERS: readonly Wearer[] = [
  'warlock',
  'cat',
  'warrior',
  'bones',
  'naga',
  'necro',
  'baby',
];

export const BADGES: Readonly<Record<BadgeKind, { name: string; price: number; blurb: string }>> = {
  shield: {
    name: 'Shield badge',
    price: 1500,
    blurb: 'A magic energy shield round a companion. It takes the next 3 hits for them.',
  },
  damage: {
    name: 'Damage badge',
    price: 2000,
    blurb: "A companion's hits count double.",
  },
  heal: {
    name: 'Healing badge',
    price: 2000,
    blurb: 'Hurt, a companion heals itself, a little at a time, even in a fight.',
  },
};
/** The shield's upgrade, to take 6 hits. */
export const SHIELD_UP = {
  name: 'Shield badge, upgraded',
  price: 2500,
  blurb: 'The energy shield takes 6 hits now, not 3.',
};
/** Hits the shield takes at each level: none, bought, upgraded. */
export const SHIELD_HITS = [0, 3, 6] as const;
/** The damage badge's hits count this many times over. */
export const DAMAGE_K = 2;
/** The healing badge gives a hit point back this often while its wearer is hurt. */
export const HEAL_EVERY = 4;
/** Seconds the shield glows after it takes a hit. */
export const SHIELD_FLASH = 0.35;

/** The badges bought, and who wears each. */
export type Badges = {
  /** 0 none, 1 bought, 2 upgraded. */
  shield: 0 | 1 | 2;
  damage: boolean;
  heal: boolean;
  on: Record<BadgeKind, Wearer | null>;
};

export function noBadges(): Badges {
  return { shield: 0, damage: false, heal: false, on: { shield: null, damage: null, heal: null } };
}

/** Whether this badge has been bought. */
export function owned(b: Badges, k: BadgeKind): boolean {
  return k === 'shield' ? b.shield > 0 : b[k];
}

/** The badge a companion wears, or null. */
export function wornBy(b: Badges, w: Wearer): BadgeKind | null {
  return BADGE_KINDS.find((k) => b.on[k] === w) ?? null;
}

/** Pin a badge on a companion (null takes it off): whatever that companion wore comes off. */
export function pin(b: Badges, k: BadgeKind, w: Wearer | null): void {
  if (!owned(b, k)) return;
  if (w) for (const o of BADGE_KINDS) if (o !== k && b.on[o] === w) b.on[o] = null;
  b.on[k] = w;
}

/** A save's badges, kept within their ranges, a badge never on two companions or on one not bought. */
export function parseBadges(o: unknown): Badges {
  const b = noBadges();
  if (!o || typeof o !== 'object') return b;
  const r = o as Record<string, unknown>;
  const s = Number(r.shield);
  b.shield = s >= 2 ? 2 : s >= 1 ? 1 : 0;
  b.damage = !!r.damage;
  b.heal = !!r.heal;
  const on = (r.on && typeof r.on === 'object' ? r.on : {}) as Record<string, unknown>;
  for (const k of BADGE_KINDS) {
    const w = on[k];
    if (typeof w === 'string' && (WEARERS as readonly string[]).includes(w)) pin(b, k, w as Wearer);
  }
  return b;
}

/**
 * What a companion carries of its badge from moment to moment: which it wears, the shield's hits left and its glow,
 * and the healing's count to the next hit point. The companion asks it about each hit it takes and gives.
 */
export class Worn {
  badge: BadgeKind | null = null;
  shield = 0;
  shieldMax = 0;
  flash = 0;
  private healT = 0;

  /** Wearing this badge now, with the shield at this level: a shield comes on full. */
  wear(badge: BadgeKind | null, shieldLevel: number): void {
    const max = badge === 'shield' ? (SHIELD_HITS[shieldLevel] ?? 0) : 0;
    if (badge !== this.badge || max !== this.shieldMax) this.shield = max;
    this.badge = badge;
    this.shieldMax = max;
    this.healT = 0;
  }

  /** A landing: the shield is full again. */
  refill(): void {
    this.shield = this.shieldMax;
  }

  /** A hit on the wearer: whether the shield took it. */
  absorb(): boolean {
    if (this.shield <= 0) return false;
    this.shield--;
    this.flash = SHIELD_FLASH;
    return true;
  }

  /** A hit by the wearer, this hard: as hard again with the damage badge. */
  power(p: number): number {
    return this.badge === 'damage' ? p * DAMAGE_K : p;
  }

  /** Time passing; whether the healing badge gives a hit point back now (the wearer is hurt). */
  tick(dt: number, hurt: boolean): boolean {
    this.flash = Math.max(0, this.flash - dt);
    if (this.badge !== 'heal' || !hurt) {
      this.healT = 0;
      return false;
    }
    this.healT += dt;
    if (this.healT < HEAL_EVERY) return false;
    this.healT = 0;
    return true;
  }
}
