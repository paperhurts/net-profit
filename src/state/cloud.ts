/**
 * The game kept online as well as on the device, the owner's call (2026-10-16), for anyone who finds the game: no
 * accounts and nothing personal. Each game has a save code, four words (otter-maple-reef-cove), made once and kept in
 * its save, and now and then the game puts itself online under it, squeezed as for a link (state/share.ts). The other
 * end is a table in the owner's Supabase project and two functions (supabase/migrations), the only way in. It refuses
 * a game that has earned less than the one it holds, so an old copy on another device cannot write over a newer one.
 * Typed into the game on another device, the code fetches the game, and the game asks before it takes the place of the
 * one there, as a link does. Offline, or with the project asleep (the free plan's, after a quiet week), nothing changes
 * but that the copy online waits.
 */

/** Where the saves are kept, and the key that lets the game in: public, as any web page's must be; the table is shut
 *  to it but for the two functions. With no address, the game keeps to the device, as before. */
export type Cloud = { url: string; key: string };
export const CLOUD: Cloud = {
  url: 'https://pbswebsavanetmieodsf.supabase.co',
  key: 'sb_publishable_uwy6Sq9BCvjcbiWoykmBvw_Tfe8e6yI',
};

/** The words a save code is made of: 256, so four are one of about four billion codes. Short, easy to spell, and from
 *  the game's world. */
export const WORDS: readonly string[] = (
  'otter seal whale crab squid shark clam eel ray cod tuna perch trout bass carp pike snook krill ' +
  'shrimp prawn oyster potato urchin coral kelp manta orca dolphin walrus puffin gull tomato pelican ' +
  'heron crane egret turtle newt frog toad salmon minnow guppy marlin sponge snail whelk limpet beluga ' +
  'narwhal fox owl bear wolf deer moose elk pumpkin rabbit badger mole mouse vole lynx bison yak goat ' +
  'sheep lamb pony horse zebra camel llama koala panda tiger lion lemur sloth gecko lizard robin wren ' +
  'finch lark crow raven swan duck goose hen dove eagle hawk parrot toucan reef cove bay tide wave ' +
  'shore beach dune sand cliff cape canyon inlet lagoon harbor dock cactus valley mast sail oar keel ' +
  'anchor rope net hook float boat raft canoe kayak ship carrot ferry maple oak pine elm birch cedar ' +
  'willow fern moss ivy reed rose lily daisy tulip poppy clover acorn cone leaf seed root bloom petal ' +
  'bud sun moon star comet cloud rain snow frost mist fog storm wind breeze dawn dusk noon sky red blue ' +
  'green gold amber teal ruby jade pearl silver copper ivory olive peach plum lemon lime mint navy pink ' +
  'apple pear grape melon berry cherry mango kiwi bread toast honey jam creek muffin waffle cookie ' +
  'bagel noodle pasta pizza taco lamp drum bell kite map shell pebble stone rock gem crown key candle ' +
  'button marble rocket robot wagon sled jelly skate pepper hake herring sardine snapper tarpon conch ' +
  'scallop bee moth beetle castle tower bridge island forest meadow river brook pond lake'
).split(' ');

/** A new save code, from four random bytes. */
export function makeCode(bytes: ArrayLike<number>): string {
  return Array.from({ length: 4 }, (_, i) => WORDS[(bytes[i] ?? 0) & 255]).join('-');
}

/** The save code in something typed: four of the words, in any case, with spaces, dashes or anything between them;
 *  null if it is not one. */
export function readCode(text: string): string | null {
  const ws = text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  return ws.length === 4 && ws.every((w) => WORDS.includes(w)) ? ws.join('-') : null;
}

/** How long the game waits on the project before it gives up for now. */
export const CLOUD_WAIT = 8000;
/** How often, at most, the game puts itself online while it is played: a minute. */
export const CLOUD_EVERY = 60_000;

/** Put online: kept, or refused because the one there has earned more (and how much); or the project not reached. */
export type Put = { saved: boolean; earned: number } | 'down';
/** Fetched: the game (squeezed), what it has earned and when it was put there; null if there is none under the code;
 *  or the project not reached. */
export type Got = { game: string; earned: number; at: string } | null | 'down';
type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0;

async function call(
  fn: string,
  body: Record<string, unknown>,
  cloud: Cloud,
  f: Fetch,
  keepalive: boolean,
): Promise<unknown> {
  // The smoke tests' switch, set before the page loads: no test reaches the real project.
  if (!cloud.url || (globalThis as { __npCloudOff?: boolean }).__npCloudOff) return 'down';
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), CLOUD_WAIT) : null;
  try {
    const res = await f(`${cloud.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      // A legacy key is a token too, and goes as one; a publishable key goes as the key alone.
      headers: {
        apikey: cloud.key,
        'content-type': 'application/json',
        ...(cloud.key.startsWith('eyJ') ? { authorization: `Bearer ${cloud.key}` } : {}),
      },
      body: JSON.stringify(body),
      keepalive,
      ...(ctl ? { signal: ctl.signal } : {}),
    });
    if (!res.ok) return 'down';
    return await res.json();
  } catch {
    return 'down';
  } finally {
    if (t) clearTimeout(t);
  }
}

/** Put a game online under its code; as the page goes, with keepalive, so the request outlives it. Never throws. */
export async function putGame(
  code: string,
  game: string,
  earned: number,
  { cloud = CLOUD, f = fetch as Fetch, keepalive = false } = {},
): Promise<Put> {
  const r = await call(
    'np_save_game',
    { p_code: code, p_game: game, p_earned: Math.max(0, Math.floor(earned)) },
    cloud,
    f,
    keepalive,
  );
  if (!r || typeof r !== 'object') return 'down';
  const o = r as { saved?: unknown; earned?: unknown };
  return { saved: o.saved === true, earned: num(o.earned) };
}

/** Fetch the game under a code. Never throws. */
export async function getGame(
  code: string,
  { cloud = CLOUD, f = fetch as Fetch } = {},
): Promise<Got> {
  const r = await call('np_load_game', { p_code: code }, cloud, f, false);
  if (r === 'down') return 'down';
  if (!r || typeof r !== 'object') return null;
  const o = r as { game?: unknown; earned?: unknown; at?: unknown };
  return typeof o.game === 'string' && o.game
    ? { game: o.game, earned: num(o.earned), at: typeof o.at === 'string' ? o.at : '' }
    : null;
}
