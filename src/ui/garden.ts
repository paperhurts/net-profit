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
  canWater,
  type Garden,
  GEAR,
  GEAR_IDS,
  type GearId,
  gearInStock,
  gearOf,
  gearRoom,
  growBed,
  inStock,
  SEEDS_MAX,
  SPRINKLERS,
  secondsLeft,
  seedsOf,
  WATER,
} from '../data/garden';
import {
  BEDS_START,
  bedUnder,
  GEAR_SHED,
  inPlot14,
  SEED_STALL,
  SELL_STAND,
  stallAt,
} from '../world/garden';

/**
 * What the action button does where the figure stands: open the seed stall or the gear shed, sell the basket, plant,
 * pick, use the gear in hand (water a bed, dig it up, set a sprinkler down), or say how long a bed has to go. Ripe fruit
 * is always picked first, whatever is in hand, and an empty bed is planted with the seed chosen. Codes start with g- so
 * the game knows they are the garden's; a bed's carries its index.
 */
export function gardenAction(
  g: Garden,
  x: number,
  y: number,
  seed: CropId | null,
  now: number,
  tool: GearId | null = null,
): string | null {
  const st = stallAt(x, y);
  if (st === SEED_STALL) return 'g-seeds';
  if (st === SELL_STAND) return 'g-sell';
  if (st === GEAR_SHED) return 'g-gear';
  const i = bedUnder(x, y);
  const b = i >= 0 && i < BEDS_START ? bedAt(g, i) : null;
  if (b) growBed(b, now);
  if (b && b.ripe > 0) return `g-pick-${i}`;
  if (i >= 0 && !b && seed && seedsOf(g, seed) > 0) return `g-plant-${i}`;
  const sprinkler = (tool === 'sprinkler' || tool === 'goldsprinkler') && gearOf(g, tool) > 0;
  if (sprinkler && inPlot14(x, y)) return 'g-spr';
  if (i < 0 || i >= BEDS_START) return null;
  if (!b) return 'g-noseed';
  if (tool === 'can' && canWater(g, i)) return `g-water-${i}`;
  if (tool === 'shovel' && gearOf(g, 'shovel') > 0) return `g-dig-${i}`;
  return `g-wait-${i}`;
}

/** The bed's index in a garden action's code, or -1. */
export function bedOf(code: string): number {
  const m = /^g-(?:plant|pick|wait|water|dig)-(\d+)$/.exec(code);
  return m ? Number(m[1]) : -1;
}

/** "3:05", or "45 s" under a minute. */
export function clockText(s: number): string {
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m}:${String(r).padStart(2, '0')}`;
}

/** How many fruit of a crop, in words: "a carrot", "3 strawberries". */
export function howMany(k: CropId, n: number): string {
  const c = CROPS[k];
  return n === 1 ? `a ${c.fruit}` : `${n} ${c.plural}`;
}

/** What the action button says for a garden action. */
export function gardenLabel(
  g: Garden,
  code: string,
  selected: CropId | null,
  now: number,
  tool: GearId | null = null,
): string {
  if (code === 'g-seeds') return 'Look at the seeds';
  if (code === 'g-gear') return 'Look at the gear';
  if (code === 'g-spr')
    return `Set your ${tool === 'goldsprinkler' ? 'gold sprinkler' : 'sprinkler'} down here`;
  if (code === 'g-sell') {
    const n = basketCount(g);
    return n ? `Sell your basket for ${basketValue(g)}` : 'Your basket is empty';
  }
  if (code === 'g-noseed') return 'No seeds: the seed stall has them';
  const i = bedOf(code);
  const b = bedAt(g, i);
  if (code.startsWith('g-plant-') && selected) return `Plant a ${CROPS[selected].name}`;
  if (!b) return 'An empty bed';
  if (code.startsWith('g-pick-')) {
    const room = BASKET_MAX - basketCount(g);
    return room ? `Pick ${howMany(b.crop, Math.min(b.ripe, room))}` : 'Your basket is full';
  }
  const c = CROPS[b.crop];
  if (code.startsWith('g-water-'))
    return `Water the ${c.name}: ripe in ${clockText(secondsLeft(b, now))}`;
  if (code.startsWith('g-dig-')) return `Dig up the ${c.name}`;
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
  sweetpotato:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M6 19c2-6 12-9 18-5 2 2 0 6-4 7-5 2-12 2-14-2z" fill="#B4566B"/><path d="M10 18c3-2 7-3 11-2" stroke="#8E3E52" stroke-width="1.2" fill="none"/><path d="M22 13c1-4 3-6 5-6-1 2-2 4-4 6" fill="#4E9A3E"/></svg>',
  tomato:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="17" r="9" fill="#E4413A"/><path d="M11 17c0-3 2-5 4-5" stroke="#F58C80" stroke-width="1.6" fill="none"/><path d="M15 9l-4 2 3 .5-2 3 3-2 3 2-2-3 3-.5z" fill="#4E9A3E"/></svg>',
  sweetcorn:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 4c4 0 5 6 5 12s-2 10-5 10-5-4-5-10 1-12 5-12z" fill="#F2C94C"/><g fill="#D9A62E"><circle cx="13" cy="10" r="1"/><circle cx="17" cy="10" r="1"/><circle cx="13" cy="15" r="1"/><circle cx="17" cy="15" r="1"/><circle cx="13" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></g><path d="M10 27c-1-6 0-12 2-15M20 27c1-6 0-12-2-15" stroke="#4E9A3E" stroke-width="2.2" fill="none"/></svg>',
  pineapple:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><ellipse cx="15" cy="19" rx="7" ry="8.5" fill="#F2B33D"/><path d="M10 15l10 8M20 15l-10 8M10 21l6 5M20 21l-6 5" stroke="#C98B1E" stroke-width="1"/><path d="M15 11l-4-7 3 3 1-5 1 5 3-3z" fill="#4E9A3E"/></svg>',
  papaya:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 4c6 2 9 8 8 14-1 6-5 9-8 9s-7-3-8-9C6 12 9 6 15 4z" fill="#F28C28"/><path d="M15 9c3 2 4 6 3 10-1 3-2 4-3 4s-2-1-3-4c-1-4 0-8 3-10z" fill="#F7B05A"/><g fill="#2B2B2B"><circle cx="15" cy="13" r=".9"/><circle cx="14" cy="16" r=".9"/><circle cx="16" cy="18" r=".9"/></g></svg>',
  coconut:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="17" r="9" fill="#7A5230"/><path d="M8 14c3-3 11-3 14 0" stroke="#5B3A22" stroke-width="1.4" fill="none"/><g fill="#3A2414"><circle cx="12" cy="17" r="1.3"/><circle cx="18" cy="17" r="1.3"/><circle cx="15" cy="21" r="1.3"/></g></svg>',
  dragonfruit:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><ellipse cx="15" cy="17" rx="8" ry="9.5" fill="#E8508F"/><path d="M15 7l-3 5M15 7l3 5M8 13l4 2M22 13l-4 2M8 21l4-1M22 21l-4-1" stroke="#6CC25F" stroke-width="2.2" stroke-linecap="round"/></svg>',
  lantern:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="17" r="11" fill="#FFE59A" opacity=".45"/><path d="M15 7c6 0 8 5 8 10s-3 9-8 9-8-4-8-9 2-10 8-10z" fill="#F7A93B"/><path d="M15 7v19M10 9c-2 5-2 12 1 16M20 9c2 5 2 12-1 16" stroke="#D97F1E" stroke-width="1.2" fill="none"/><path d="M15 7c0-2 1-3 3-4" stroke="#4E9A3E" stroke-width="2"/></svg>',
  kraken:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M5 18c0-6 5-10 10-10s10 4 10 10-4 8-10 8-10-2-10-8z" fill="#7E4FB0"/><path d="M9 11c1 5 1 10 0 14M15 8v18M21 11c-1 5-1 10 0 14" stroke="#5E3590" stroke-width="1.4" fill="none"/><path d="M15 8c0-3 3-4 5-3-1 1-3 1-3 3M3 22c3 0 4-2 4-4M27 22c-3 0-4-2-4-4" stroke="#4E9A3E" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
};

/** "Picked once" or "keeps fruiting", with its times and what it sells for. */
export function cropBlurb(k: CropId): string {
  const c = CROPS[k];
  const t = (s: number) => (s < 60 ? `${s} s` : `${s / 60} min`);
  return c.regrow
    ? `Keeps fruiting: first in ${t(c.grow)}, then one every ${t(c.regrow)}, up to ${c.holds} at a time. Sells for ${c.sell.toLocaleString('en-GB')} each.`
    : `Picked once: ripe in ${t(c.grow)}. Sells for ${c.sell.toLocaleString('en-GB')}.`;
}

/** The seed stall's shelf: each crop, how many seeds you hold, and a button to buy one. */
export function seedShelfHtml(g: Garden, coins: number): string {
  return CROP_IDS.map((k) => {
    const c = CROPS[k];
    const have = seedsOf(g, k);
    const left = inStock(g, k);
    const no = coins < c.seed || have >= SEEDS_MAX || left <= 0;
    const note =
      left > 0
        ? ` ${left} left today.`
        : g.stock?.n[k] === 0
          ? ' Sold out today.'
          : ' Not in today.';
    return `<button class="item${left > 0 ? '' : ' out'}" data-seed="${k}" aria-disabled="${no ? 'true' : 'false'}">${CROP_SVG[k]}<span><b>${c.name[0]?.toUpperCase()}${c.name.slice(1)} seed <i class="tier ${c.tier}">${c.tier}</i></b><small>${cropBlurb(k)}${note}${have ? ` You have ${have}.` : ''}</small></span><span class="buy">${left > 0 ? c.seed.toLocaleString('en-GB') : '–'}</span></button>`;
  }).join('');
}

/** The gear, drawn small, for the shed's shelf and the tray. */
export const GEAR_SVG: Record<GearId, string> = {
  can: '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M8 12h12v12H8z" fill="#7FA7B8"/><path d="M8 12h12v3H8z" fill="#9CC2D2"/><path d="M20 15l7-6" stroke="#7FA7B8" stroke-width="2.6" stroke-linecap="round"/><path d="M26 7l2 3" stroke="#5C8494" stroke-width="2.6" stroke-linecap="round"/><path d="M10 12c0-5 8-5 8 0" fill="none" stroke="#5C8494" stroke-width="2"/></svg>',
  sprinkler:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M14 27V14h2v13z" fill="#6E7F86"/><ellipse cx="15" cy="27" rx="6" ry="2" fill="#5C6B70"/><circle cx="15" cy="13" r="3.4" fill="#4FA3D9"/><g fill="#8FD0F5"><circle cx="7" cy="9" r="1.4"/><circle cx="23" cy="9" r="1.4"/><circle cx="10" cy="5" r="1.2"/><circle cx="20" cy="5" r="1.2"/><circle cx="15" cy="4" r="1.2"/><circle cx="5" cy="14" r="1.2"/><circle cx="25" cy="14" r="1.2"/></g></svg>',
  goldsprinkler:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M14 27V14h2v13z" fill="#C9962B"/><ellipse cx="15" cy="27" rx="6" ry="2" fill="#A97C1E"/><circle cx="15" cy="13" r="3.6" fill="#FFC53D"/><circle cx="14" cy="12" r="1.2" fill="#FFF3B8"/><g fill="#8FD0F5"><circle cx="7" cy="9" r="1.4"/><circle cx="23" cy="9" r="1.4"/><circle cx="10" cy="5" r="1.2"/><circle cx="20" cy="5" r="1.2"/><circle cx="15" cy="4" r="1.2"/><circle cx="5" cy="14" r="1.2"/><circle cx="25" cy="14" r="1.2"/></g></svg>',
  shovel:
    '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 3v15" stroke="#9A6A3C" stroke-width="2.6" stroke-linecap="round"/><path d="M11 3h8" stroke="#9A6A3C" stroke-width="2.6" stroke-linecap="round"/><path d="M10 18h10v4c0 3-2 5-5 6-3-1-5-3-5-6z" fill="#9AA9B0"/><path d="M12 19v3" stroke="#C8D3D8" stroke-width="1.4" stroke-linecap="round"/></svg>',
};

/** What a piece of gear does, for the shed's shelf. */
export function gearBlurb(k: GearId): string {
  const min = (ms: number) => `${ms / 60000} minutes`;
  if (k === 'can')
    return `${WATER.per} waterings. Each takes ${WATER.ms / 1000} seconds off a bed's wait.`;
  if (k === 'shovel') return 'Digs a plant up, to free its bed. Yours for good.';
  const s = SPRINKLERS[k];
  return k === 'sprinkler'
    ? `Waters the beds round it for ${min(s.ms)}: they grow half as fast again.`
    : `Waters the beds round it for ${min(s.ms)}: they grow twice as fast, and one fruit in ${s.wet} ripens Wet.`;
}

/** The gear shed's shelf: each piece of gear, how much you hold, and a button to buy one. */
export function gearShelfHtml(g: Garden, coins: number): string {
  return GEAR_IDS.map((k) => {
    const c = GEAR[k];
    const have = gearOf(g, k);
    const left = gearInStock(g, k);
    const no = coins < c.price || !gearRoom(g, k) || left <= 0;
    const note =
      k === 'shovel' && have
        ? ' You have one.'
        : `${left > 0 ? ` ${left} left today.` : g.gearStock?.n[k] === 0 ? ' Sold out today.' : ' Not in today.'}${have ? ` You have ${have}${k === 'can' ? ' waterings' : ''}.` : ''}`;
    return `<button class="item${left > 0 ? '' : ' out'}" data-gear="${k}" aria-disabled="${no ? 'true' : 'false'}">${GEAR_SVG[k]}<span><b>${c.name[0]?.toUpperCase()}${c.name.slice(1)}</b><small>${gearBlurb(k)}${note}</small></span><span class="buy">${left > 0 ? c.price.toLocaleString('en-GB') : '–'}</span></button>`;
  }).join('');
}

/**
 * The seed tray: a button for each seed held and each piece of gear, the one in hand marked (the gear, or else the seed
 * chosen), and the basket.
 */
export function seedTrayHtml(
  g: Garden,
  selected: CropId | null,
  tool: GearId | null = null,
): string {
  const seeds = CROP_IDS.filter((k) => seedsOf(g, k) > 0)
    .map((k) => {
      const on = k === selected && !tool;
      return `<button class="seed${on ? ' on' : ''}" data-pick="${k}" aria-pressed="${on}" aria-label="${CROPS[k].name} seeds, ${seedsOf(g, k)}">${CROP_SVG[k]}<span>${seedsOf(g, k)}</span></button>`;
    })
    .join('');
  const gear = GEAR_IDS.filter((k) => gearOf(g, k) > 0)
    .map((k) => {
      const on = k === tool;
      const n = k === 'shovel' ? '' : String(gearOf(g, k));
      return `<button class="seed gear${on ? ' on' : ''}" data-tool="${k}" aria-pressed="${on}" aria-label="${GEAR[k].name}${n ? `, ${n}` : ''}">${GEAR_SVG[k]}<span>${n}</span></button>`;
    })
    .join('');
  return `${seeds}${gear}<span class="basket" aria-label="Basket">${BASKET_SVG}<span>${basketCount(g)}/${BASKET_MAX}</span></span>`;
}

const BASKET_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10c0-5 14-5 14 0" fill="none" stroke="#8A5A34" stroke-width="2"/><path d="M3 10h18l-2 10H5z" fill="#C99A5B"/><path d="M7 12v6M12 12v6M17 12v6" stroke="#8A5A34" stroke-width="1.4"/></svg>';
