/**
 * The floating joystick, moved verbatim from the prototype script. A touch or
 * mouse press anchors a ring where it lands; dragging past the ring's radius
 * drags the ring along, so the stick never feels pinned. The vector it yields
 * is in screen space; the game turns it into a world heading with dirToWorld.
 */

/** Ring radius in CSS pixels. */
export const JR = 54;
/** Movement smaller than this from the anchor is ignored. */
export const DEAD_ZONE = 8;

export type Joystick = {
  on: boolean;
  /** Started on the shop panel rather than the water; the panel fades while it is. */
  through: boolean;
  id: number | null;
  /** Anchor: where the ring is drawn. */
  sx: number;
  sy: number;
  /** Pointer: where the thumb is. */
  x: number;
  y: number;
};

export function createJoystick(): Joystick {
  return { on: false, through: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };
}

/**
 * The stick's screen-space vector, magnitude 0..1. Drags the anchor along when
 * the pointer is past the radius, exactly as the prototype did, so the ring on
 * screen follows the thumb.
 */
export function joystickVector(joy: Joystick, radius = JR): [number, number] {
  if (!joy.on) return [0, 0];
  let dx = joy.x - joy.sx;
  let dy = joy.y - joy.sy;
  let d = Math.hypot(dx, dy);
  if (d > radius) {
    joy.sx = joy.x - (dx / d) * radius;
    joy.sy = joy.y - (dy / d) * radius;
    dx = joy.x - joy.sx;
    dy = joy.y - joy.sy;
    d = radius;
  }
  if (d > DEAD_ZONE) {
    const m = Math.min(1, d / radius);
    return [(dx / d) * m, (dy / d) * m];
  }
  return [0, 0];
}

/** What the binding needs from a pointer event. */
export type PointerLike = {
  pointerId: number;
  clientX: number;
  clientY: number;
  preventDefault(): void;
};

/** What the binding needs from the canvas. */
export type JoystickSurface = {
  addEventListener(type: string, listener: (e: PointerLike) => void): void;
  setPointerCapture?(pointerId: number): void;
};

/** Anchor the ring under a fresh press and route the rest of that pointer to the canvas. */
function begin(joy: Joystick, e: PointerLike, surface: JoystickSurface): void {
  joy.on = true;
  joy.id = e.pointerId;
  joy.sx = joy.x = e.clientX;
  joy.sy = joy.y = e.clientY;
  try {
    surface.setPointerCapture?.(e.pointerId);
  } catch {
    // Some browsers refuse capture for synthetic or already-released pointers.
  }
  e.preventDefault();
}

/** Wire pointer events on the canvas into the joystick. onInput runs on every press. */
export function bindJoystick(surface: JoystickSurface, joy: Joystick, onInput: () => void): void {
  surface.addEventListener('pointerdown', (e) => {
    onInput();
    joy.through = false;
    begin(joy, e, surface);
  });
  surface.addEventListener('pointermove', (e) => {
    if (joy.on && e.pointerId === joy.id) {
      joy.x = e.clientX;
      joy.y = e.clientY;
    }
  });
  const end = (e: PointerLike) => {
    if (e.pointerId === joy.id) {
      joy.on = false;
      joy.through = false;
    }
  };
  surface.addEventListener('pointerup', end);
  surface.addEventListener('pointercancel', end);
  surface.addEventListener('contextmenu', (e) => e.preventDefault());
}

/** A pointer event that also says what was under it. */
export type ThroughPointer = PointerLike & { target: unknown };

export type ThroughPanel = {
  addEventListener(type: string, listener: (e: ThroughPointer) => void): void;
};

/**
 * Let a press on a panel that covers the water steer anyway. The shop sits
 * where the thumb lives; dragging on its wood starts the stick as if the
 * press had landed on the canvas, and the canvas takes the pointer from
 * there. Buttons and scrolling rows are excluded by the steerable test.
 */
export function bindJoystickThrough(
  panel: ThroughPanel,
  joy: Joystick,
  surface: JoystickSurface,
  steerable: (target: unknown) => boolean,
  onInput: () => void,
): void {
  panel.addEventListener('pointerdown', (e) => {
    if (joy.on || !steerable(e.target)) return;
    onInput();
    begin(joy, e, surface);
    joy.through = true;
  });
}
