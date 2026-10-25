/**
 * What the Garden Isle's stall keepers say (the owner's, 2026-10-25: "these NPCs don't have personalities"). Each has
 * a way of being, in lines that turn over as you come back, so they never say one thing twice running:
 *
 * - Capy Barrow, the capybara at the seed stall: unhurried, sleepy, kind; a little bird likes his hat.
 * - Penny Platypus at the sell stand: brisk, coin-mad, proud of being the oddest animal there is; she has an opinion on
 *   every basket, and a soft spot for anything that shines.
 * - Toolcayo the Tilcayo at the gear shed: an inventor, over-keen, every gadget tested on himself first.
 *
 * Stand-ins, all of it, until the kid says who they really are; the names live in ui/garden.ts KEEPERS.
 */

export type KeeperId = 'seeds' | 'sell' | 'gear';
/** The game's time of day, as its clock names it. */
export type Phase = 'Dawn' | 'Day' | 'Dusk' | 'Night';

type Lines = {
  /** Walking up, any time. */
  hello: readonly string[];
  /** Walking up at dawn, when the stock is new, and at night. */
  dawn: readonly string[];
  night: readonly string[];
  /** Over the shop card, as you look. */
  card: readonly string[];
};

export const KEEPER_LINES: Readonly<Record<KeeperId, Lines>> = {
  seeds: {
    hello: [
      'Mm. Hello. Take your time. I always do.',
      'Oh, it’s you. Good. Sit, if you like. I am.',
      'No rush. Seeds don’t hurry, and neither do I.',
      'I was resting my eyes. I’m very good at it.',
    ],
    dawn: [
      'Fresh seeds this morning. I was up early. Well. Up.',
      'New stock. I unpacked it very, very slowly.',
    ],
    night: [
      'Shh. The seeds are sleeping. You can still buy some.',
      'Late, isn’t it. Lovely and warm in here, though.',
    ],
    card: [
      'Plant them, water them, then sit. Sitting is most of gardening.',
      'That rare one? I’ve been keeping it warm for you.',
      'Every seed is a little nap that turns into a plant.',
      'A bird lives on my hat. I didn’t ask. I don’t mind.',
      'If it’s not on the shelf today, it might be tomorrow. Or not. Either way, I’ll be here.',
    ],
  },
  sell: {
    hello: [
      'Fruit? Fruit! Bring it here, I’ll weigh it.',
      'I can count to a thousand in my head. Try me.',
      'A duck’s bill, a beaver’s tail, and the best prices on the isle.',
      'Coins, coins, coins. Oh, hello! Also coins.',
    ],
    dawn: [
      'Up with the sun! The early fruit gets the coin.',
      'Morning! I’ve polished every coin. Twice.',
    ],
    night: [
      'Open late. Money never sleeps. Neither do I, much.',
      'Night fruit? Even better. Bring it in, bring it in.',
    ],
    card: [],
  },
  gear: {
    hello: [
      'New gear! Freshly invented. Or at least freshly dusted.',
      'Mind the spanner. And the other spanner.',
      'Ah! A customer! Quick, look impressed.',
      'Everything here is tested. On me. That’s why I’m damp.',
    ],
    dawn: [
      'Dawn! I fixed three things and broke one. A good night.',
      'Fresh off the bench this morning. Still warm. Don’t lick it.',
    ],
    night: [
      'Can’t sleep. Inventing. Want to buy what I invented?',
      'The shed glows at night because I left the soldering on. Probably fine.',
    ],
    card: [
      'The sprinkler: I tested it on myself. Twice. Still damp.',
      'The gold sprinkler is my best work. The first one exploded. Into flowers.',
      'A shovel! It digs. That’s all. I’m proud of it anyway.',
      'The watering can is full. I know because I tripped over it.',
      'One day I’ll invent a sprinkler that sprinkles coins. Not today.',
    ],
  },
};

/** One of a list, turning over with n, so the next visit says the next one. */
function nth(list: readonly string[], n: number): string {
  return list.length ? (list[((n % list.length) + list.length) % list.length] as string) : '';
}

/** What a keeper says walking up: a dawn or night line on the visits it falls to, else a hello. */
export function greeting(k: KeeperId, phase: string, n: number): string {
  const L = KEEPER_LINES[k];
  if (phase === 'Dawn' && n % 2 === 0) return nth(L.dawn, n / 2);
  if (phase === 'Night' && n % 2 === 0) return nth(L.night, n / 2);
  return nth(L.hello, n);
}

/** What a keeper says over the shop card. */
export function chatter(k: KeeperId, n: number): string {
  return nth(KEEPER_LINES[k].card, n);
}

/** A basket on the counter, as Penny sees it. */
export type Haul = { n: number; coins: number; gold: number; rainbow: number; giants: number };
/** Past this many fruit, or this many coins, it is a big basket. */
export const BIG_HAUL = { n: 30, coins: 5000 } as const;

/** Penny's opinion of a basket: shiny things first, then giants, then how much of it there is. */
export function soldLine(h: Haul, n = 0): string {
  if (h.n <= 0)
    return nth(
      [
        'An empty basket? I can’t buy air, dear. Well, I could. But I won’t.',
        'Nothing in it! Pick something, then come back. I’ll wait. Impatiently.',
      ],
      n,
    );
  if (h.rainbow > 0)
    return nth(
      [
        'A RAINBOW one! I’ve seen two in my life, and one was a fish.',
        'Rainbow! Oh, my bill is tingling. Here, take all the coins.',
      ],
      n,
    );
  if (h.gold > 0)
    return nth(
      [
        'Is that... GOLD? I’m going to frame it. After I sell it.',
        'Ooh, shiny! I’d bite it to check, but, well. Bill.',
      ],
      n,
    );
  if (h.giants > 0)
    return nth(
      [
        'Look at the size of it! It’s bigger than my bill!',
        'A giant! I’ll need both paws and my tail for this one.',
      ],
      n,
    );
  if (h.n >= BIG_HAUL.n || h.coins >= BIG_HAUL.coins)
    return nth(
      [
        'Now THAT’s a basket. Hold on, I need a bigger coin purse.',
        'My scales! My lovely scales! They can barely take it!',
      ],
      n,
    );
  return nth(
    [
      'Small but honest. Coins!',
      'Lovely. Fresh as the morning. Here you go.',
      'A fine little basket. Come back with a bigger one!',
    ],
    n,
  );
}
