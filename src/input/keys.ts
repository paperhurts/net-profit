/**
 * Keyboard steering, moved verbatim from the prototype script. WASD and the
 * arrows give a screen-space direction, normalised, so a diagonal is no faster
 * than a straight; the game turns it into a world heading with dirToWorld.
 */

export const STEER_KEYS = [
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'w',
  'a',
  's',
  'd',
] as const;

/** The keys currently held, lower-cased. */
export type Keys = Set<string>;

/** The held keys as a unit vector in screen space, or zero. */
export function keyVector(keys: Keys): [number, number] {
  let kx = 0;
  let ky = 0;
  if (keys.has('arrowleft') || keys.has('a')) kx--;
  if (keys.has('arrowright') || keys.has('d')) kx++;
  if (keys.has('arrowup') || keys.has('w')) ky--;
  if (keys.has('arrowdown') || keys.has('s')) ky++;
  const d = Math.hypot(kx, ky);
  return d ? [kx / d, ky / d] : [0, 0];
}

/** What the binding needs from a keyboard event. */
export type KeyLike = { key: string; preventDefault(): void };

export type KeyTarget = {
  addEventListener(type: string, listener: (e: KeyLike) => void): void;
};

/** Wire keydown and keyup on the window into the key set. onInput runs on every steering press. */
export function bindKeys(target: KeyTarget, keys: Keys, onInput: () => void): void {
  target.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ((STEER_KEYS as readonly string[]).includes(k)) {
      keys.add(k);
      onInput();
      if (k.startsWith('arrow')) e.preventDefault();
    }
  });
  target.addEventListener('keyup', (e) => {
    keys.delete(e.key.toLowerCase());
  });
}
