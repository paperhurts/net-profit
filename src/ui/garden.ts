/**
 * The Garden Isle's words and buttons (data/garden.ts has its rules): what the action button says on each bed and at
 * each stall, the seed stall's shelf, and the seed tray, the row of seeds held and the basket, shown while ashore there.
 * Kept out of main.js, which only asks these and does what they say.
 */

import {
  BASKET_MAX,
  basketCount,
  basketValue,
  bedAt,
  CROP_IDS,
  CROPS,
  type CropId,
  type Garden,
  growBed,
  SEEDS_MAX,
  secondsLeft,
  seedsOf,
} from '../data/garden';
import { BEDS_START, bedUnder, GEAR_SHED, SEED_STALL, SELL_STAND, stallAt } from '../world/garden';

/**
 * What the action button does where the figure stands: open the seed stall, sell the basket, plant, pick, or say how long
 * a bed has to go. Codes start with g- so the game knows they are the garden's; a bed's carries its index.
 */
export function gardenAction(
  g: Garden,
  x: number,
  y: number,
  selected: CropId | null,
  now: number,
): string | null {
  const st = stallAt(x, y);
  if (st === SEED_STALL) return 'g-seeds';
  if (st === SELL_STAND) return 'g-sell';
  if (st === GEAR_SHED) return null;
  const i = bedUnder(x, y);
  if (i < 0 || i >= BEDS_START) return null;
  const b = bedAt(g, i);
  if (!b) return selected && seedsOf(g, selected) > 0 ? `g-plant-${i}` : 'g-noseed';
  growBed(b, now);
  return b.ripe > 0 ? `g-pick-${i}` : `g-wait-${i}`;
}

/** The bed's index in a garden action's code, or -1. */
export function bedOf(code: string): number {
  const m = /^g-(?:plant|pick|wait)-(\d+)$/.exec(code);
  return m ? Number(m[1]) : -1;
}

/** "3:05", or "45 s" under a minute. */
export function clockText(s: number): string {
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m}:${String(r).padStart(2, '0')}`;
}

/** How many of a crop, in words: "a carrot", "3 strawberries". */
export function howMany(k: CropId, n: number): string {
  const c = CROPS[k];
  return n === 1 ? `a ${c.name}` : `${n} ${c.plural}`;
}

/** What the action button says for a garden action. */
export function gardenLabel(g: Garden, code: string, selected: CropId | null, now: number): string {
  if (code === 'g-seeds') return 'Look at the seeds';
  if (code === 'g-sell') {
    const n = basketCount(g);
    return n ? `Sell your basket for ${basketValue(g)}` : 'Your basket is empty';
  }
  if (code === 'g-noseed') return 'No seeds: the seed stall has them';
  const i = bedOf(code);
  const b = bedAt(g, i);
  if (code.startsWith('g-plant-') && selected) return `Plant ${howMany(selected, 1)}`;
  if (!b) return 'An empty bed';
  if (code.startsWith('g-pick-')) {
    const room = BASKET_MAX - basketCount(g);
    return room ? `Pick ${howMany(b.crop, Math.min(b.ripe, room))}` : 'Your basket is full';
  }
  const c = CROPS[b.crop];
  return `${c.name[0]?.toUpperCase()}${c.name.slice(1)}: ripe in ${clockText(secondsLeft(b, now))}`;
}

/** A crop's seed packet, drawn small, for the shelf and the tray. */
export const CROP_SVG: Record<CropId, string> = {
  carrot:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 27 9 11h12z" fill="#F28C28"/><path d="M11.5 15h4M12.5 19h3.5M13.5 23h2" stroke="#C9661A" stroke-width="1.2" stroke-linecap="round"/><path d="M15 11c-1-4-4-6-6-6 2 2 3 4 4 6M15 11c0-4 1-7 3-8-1 3-1 6-1 8M15 11c2-3 5-4 7-3-3 1-5 2-6 3" fill="#4E9A3E" stroke="#4E9A3E" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  strawberry:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 27c-6-4-9-9-8-13 1-3 4-4 8-4s7 1 8 4c1 4-2 9-8 13z" fill="#E4413A"/><g fill="#FFE07A"><circle cx="12" cy="15" r=".9"/><circle cx="17" cy="14" r=".9"/><circle cx="15" cy="19" r=".9"/><circle cx="11" cy="20" r=".9"/><circle cx="19" cy="19" r=".9"/></g><path d="M9 10.5c2 1 4 1 6-1 2 2 4 2 6 1-1 2-3 2-6 1-3 1-5 1-6-1z" fill="#4E9A3E"/></svg>',
  blueberry:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="11" cy="18" r="6" fill="#3E5FB8"/><circle cx="19.5" cy="15" r="5.5" fill="#4C6FD0"/><circle cx="15" cy="23" r="4.5" fill="#33509E"/><path d="M9.5 15.5l1.5 1 1.5-1M18 12.5l1.5 1 1.5-1" stroke="#1E2E66" stroke-width="1" fill="none"/><path d="M19 9c1-3 4-4 6-3-2 1-3 2-4 4" fill="#4E9A3E"/></svg>',
};

/** "Picked once" or "keeps fruiting", with its times and what it sells for. */
export function cropBlurb(k: CropId): string {
  const c = CROPS[k];
  const t = (s: number) => (s < 60 ? `${s} s` : `${s / 60} min`);
  return c.regrow
    ? `Keeps fruiting: first in ${t(c.grow)}, then one every ${t(c.regrow)}, up to ${c.holds} at a time. Sells for ${c.sell} each.`
    : `Picked once: ripe in ${t(c.grow)}. Sells for ${c.sell}.`;
}

/** The seed stall's shelf: each crop, how many seeds you hold, and a button to buy one. */
export function seedShelfHtml(g: Garden, coins: number): string {
  return CROP_IDS.map((k) => {
    const c = CROPS[k];
    const have = seedsOf(g, k);
    const no = coins < c.seed || have >= SEEDS_MAX;
    return `<button class="item" data-seed="${k}" aria-disabled="${no ? 'true' : 'false'}">${CROP_SVG[k]}<span><b>${c.name[0]?.toUpperCase()}${c.name.slice(1)} seed <i class="tier ${c.tier}">${c.tier}</i></b><small>${cropBlurb(k)}${have ? ` You have ${have}.` : ''}</small></span><span class="buy">${c.seed}</span></button>`;
  }).join('');
}

/** The seed tray: a button for each seed held, the one chosen marked, and the basket at the end. */
export function seedTrayHtml(g: Garden, selected: CropId | null): string {
  const seeds = CROP_IDS.filter((k) => seedsOf(g, k) > 0)
    .map(
      (k) =>
        `<button class="seed${k === selected ? ' on' : ''}" data-pick="${k}" aria-pressed="${k === selected}" aria-label="${CROPS[k].name} seeds, ${seedsOf(g, k)}">${CROP_SVG[k]}<span>${seedsOf(g, k)}</span></button>`,
    )
    .join('');
  return `${seeds}<span class="basket" aria-label="Basket">${BASKET_SVG}<span>${basketCount(g)}/${BASKET_MAX}</span></span>`;
}

const BASKET_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10c0-5 14-5 14 0" fill="none" stroke="#8A5A34" stroke-width="2"/><path d="M3 10h18l-2 10H5z" fill="#C99A5B"/><path d="M7 12v6M12 12v6M17 12v6" stroke="#8A5A34" stroke-width="1.4"/></svg>';
