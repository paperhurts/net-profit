/**
 * A new version of the game, found while it runs. Installed on a phone's home screen, the game is
 * paused in the background and brought back as the same page, so a new version would not arrive
 * until the phone closed it for good. So coming back to the front, the game asks for its page
 * again and compares the script that page names (its hash changes with every build) with the one
 * running now.
 */

/** The game's own script named in a page: the hashed bundle under assets/, or null. */
export function scriptIn(html: string): string | null {
  const m = /<script\b[^>]*\bsrc="([^"]*assets\/[^"]+\.js)"/.exec(html);
  return m?.[1] ?? null;
}

/** Whether a page just fetched runs a different script from the one running, both read from base. */
export function isNewVersion(html: string, running: string, base: string): boolean {
  const s = scriptIn(html);
  if (!s || !running) return false;
  return new URL(s, base).href !== new URL(running, base).href;
}
