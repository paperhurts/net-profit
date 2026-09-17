/**
 * The 2:1 isometric projection shared by the renderer and the joystick.
 *
 * World units are (wx, wy) on the sea and wz up. Screen x grows with wx and
 * shrinks with wy; screen y grows with both at half the rate, which is what
 * squashes a world circle of radius r into an ellipse r·Z wide and r·Z/2 tall.
 * See project.md, "How the prototype is built", for the derivation.
 */

/** 1/√2: the isometric scale factor. */
export const K = Math.SQRT1_2;

/** Everything the projection needs to know about the camera and canvas. */
export type View = {
  /** World point drawn at the centre of the screen. */
  camX: number;
  camY: number;
  /** Zoom Z, screen pixels per world unit before the isometric squash. */
  zoom: number;
  /** Canvas size in CSS pixels. */
  width: number;
  height: number;
  /** Screen shake offset, applied last. */
  shakeX: number;
  shakeY: number;
  /** Vertical offset used to frame the island in the dock view. */
  viewDY: number;
};

/** Screen x of a world point. */
export function screenX(wx: number, wy: number, v: View): number {
  return (wx - v.camX - (wy - v.camY)) * K * v.zoom + v.width / 2 + v.shakeX;
}

/** Screen y of a world point at height wz above the sea. */
export function screenY(wx: number, wy: number, wz: number, v: View): number {
  return (
    (wx - v.camX + (wy - v.camY)) * K * 0.5 * v.zoom +
    v.height / 2 +
    v.viewDY -
    wz * v.zoom +
    v.shakeY
  );
}

/**
 * Invert the projection for a direction: a screen delta at zoom 1 becomes the
 * world delta that would produce it. Used to turn the joystick into a heading.
 */
export function dirToWorld(dx: number, dy: number): [number, number] {
  const a = dx / K;
  const b = (2 * dy) / K;
  return [(a + b) / 2, (b - a) / 2];
}

/** Whether a world point on the sea projects inside the screen plus a margin. */
export function onScreen(wx: number, wy: number, margin: number, v: View): boolean {
  const sx = screenX(wx, wy, v);
  const sy = screenY(wx, wy, 0, v);
  return sx > -margin && sx < v.width + margin && sy > -margin && sy < v.height + margin;
}

/** The zoom a canvas size earns: min(W, H) / 500, clamped to 0.62..1.35. */
export function baseZoom(width: number, height: number): number {
  return Math.max(0.62, Math.min(1.35, Math.min(width, height) / 500));
}
