/**
 * Your game on another device, for the owner's dad: he plays on his phone and
 * wanted to pick the same game up on his laptop. There are no accounts, so the
 * game itself travels: the save, squeezed small, in a link (…/#game=…). Opened,
 * the link asks before it replaces the game on that device. A phone's home-screen
 * app keeps a game of its own, apart from the browser's, and cannot be opened
 * from a link, so the game also takes the link pasted in.
 */

import { STEPS, type Story, stepsDone } from '../ui/tester';

/** What starts a game in a link, after the #. */
export const GAME_HASH = 'game=';

/** A code that is the save squeezed; one that starts 'j' is the save as it is, for a browser that cannot squeeze. */
const SQUEEZED = 'z';
const PLAIN = 'j';

const canSqueeze = (): boolean =>
  typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

function toB64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function through(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** A save (its JSON) as a code for a link. */
export async function packGame(json: string): Promise<string> {
  const bytes = new TextEncoder().encode(json);
  if (canSqueeze()) {
    try {
      return SQUEEZED + toB64url(await through(bytes, new CompressionStream('deflate-raw')));
    } catch {
      // Fall through to the plain code.
    }
  }
  return PLAIN + toB64url(bytes);
}

/** Why a code would not open: not a game at all, or squeezed and this browser cannot unsqueeze it. */
export type Unpacked = { json: string } | { fault: 'bad' | 'old' };

/** A code back to the save's JSON. It is not checked here to be a save; the game reads it as one. */
export async function unpackGame(code: string): Promise<Unpacked> {
  const bytes = fromB64url(code.slice(1));
  if (!bytes?.length) return { fault: 'bad' };
  try {
    if (code[0] === PLAIN) return { json: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
    if (code[0] !== SQUEEZED) return { fault: 'bad' };
    if (!canSqueeze()) return { fault: 'old' };
    const out = await through(bytes, new DecompressionStream('deflate-raw'));
    return { json: new TextDecoder('utf-8', { fatal: true }).decode(out) };
  } catch {
    return { fault: 'bad' };
  }
}

/** The code in anything pasted or opened: a whole link, a bare #game=…, or the code alone; null if none. */
export function gameCode(text: string): string | null {
  const t = text.trim();
  const at = t.indexOf(`#${GAME_HASH}`);
  const code =
    at >= 0
      ? t.slice(at + GAME_HASH.length + 1)
      : t.startsWith(GAME_HASH)
        ? t.slice(GAME_HASH.length)
        : t;
  const c = code.replace(/\s+/g, '');
  return /^[zj][A-Za-z0-9_-]{8,}$/.test(c) ? c : null;
}

/** The link to a game: the page's own address, without its #…, and the code. */
export function gameLink(href: string, code: string): string {
  const at = href.indexOf('#');
  return `${at >= 0 ? href.slice(0, at) : href}#${GAME_HASH}${code}`;
}

/** Whether some JSON is a game's save, near enough to load: an object with its coins. */
export function looksLikeSave(json: string): boolean {
  try {
    const o: unknown = JSON.parse(json);
    return (
      !!o &&
      typeof o === 'object' &&
      !Array.isArray(o) &&
      typeof (o as { coins?: unknown }).coins === 'number'
    );
  } catch {
    return false;
  }
}

/** A game in a few words, to tell two apart: its day, its coins, and the last boss it is past. */
export function gameSummary(d: Story & { day: number; coins: number }): string {
  const n = stepsDone(d);
  const past = n > 0 ? `, past ${STEPS[n - 1]?.short}` : '';
  return `day ${d.day}, ${Math.floor(d.coins).toLocaleString('en-US')} coins${past}`;
}
