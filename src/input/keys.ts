/**
 * Keyboard steering, two ways, chosen in the HUD and saved with the game:
 * drive (A and D turn the hull, W is throttle, S brakes) or point (WASD and
 * the arrows give a screen direction, eased so taps read like the stick).
 * The owner picked drive and her kid picked point on 2026-09-17, so both
 * stay. The joystick is the other input and is untouched by either.
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

/** Drive mode: what the held keys ask of the boat. */
export type KeyControls = { turn: number; throttle: number; brake: boolean };

export function keyControls(keys: Keys): KeyControls {
  let turn = 0;
  if (keys.has('arrowleft') || keys.has('a')) turn -= 1;
  if (keys.has('arrowright') || keys.has('d')) turn += 1;
  const ahead = keys.has('arrowup') || keys.has('w');
  const brake = keys.has('arrowdown') || keys.has('s');
  return { turn, throttle: ahead && !brake ? 1 : 0, brake };
}

/** Point mode: the key vector eased over time, so taps read like a stick instead of a switch. */
export type SmoothVector = { x: number; y: number };

/** Seconds for the eased vector to cover most of the way to a new target. */
export const SMOOTH_TAU = 0.15;

/** Ease the held vector toward the target by one step, snapping to rest when released. */
export function smoothVector(
  s: SmoothVector,
  ix: number,
  iy: number,
  dt: number,
  tau = SMOOTH_TAU,
): void {
  const k = Math.min(1, dt / tau);
  s.x += (ix - s.x) * k;
  s.y += (iy - s.y) * k;
  if (ix === 0 && iy === 0 && Math.hypot(s.x, s.y) < 0.02) {
    s.x = 0;
    s.y = 0;
  }
}
