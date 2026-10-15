/**
 * The Heron's escape, the kid's (his sixth list, 2026-10-15): "you defeat the Heron, which now has 14 hp and 2
 * damage; the Heron falls in the water and the Reaper hunts him, but the Heron casts a portal and saves himself."
 * His drawing has him back one day, horned and winged, crowing "The spell worked!".
 *
 * A cutscene, the next time the figure is back aboard after beating him in his nest on island 9: the camera flies out
 * over the sea beside island 9, where the beaten Heron comes flapping weakly overhead and tumbles into the water with a
 * splash. He flounders. A striped fin comes for him: the Reaper. He raises his staff, a purple portal opens on the
 * water under him, he sinks into it just before the Reaper's jaws close on the spot, and it shuts. The Reaper circles
 * and goes down. Here is where it all happens and when, as a timeline the game draws from.
 */

import { ISLE9 } from './isle8';

/** Where he comes down: open water off island 9's east shore. */
export const ESCAPE_AT = { x: ISLE9.x + ISLE9.r + 230, y: ISLE9.y + 90 } as const;

/** Where the camera looks: a little back toward island 9, so his tower is in the picture too. */
export const ESCAPE_VIEW = {
  x: ESCAPE_AT.x + (ISLE9.x - ESCAPE_AT.x) * 0.3,
  y: ESCAPE_AT.y + (ISLE9.y - ESCAPE_AT.y) * 0.3,
} as const;

/** Seconds: the camera's way in and out, and the whole scene. */
export const ESCAPE_IN = 2.5;
export const ESCAPE_OUT = 10.4;
export const ESCAPE_LEN = 12.5;
/** He falls from this high, starting then, and hits the water then. */
export const FALL_FROM = 150;
export const FALL_START = 1.6;
export const SPLASH_T = 3.3;
/** The Reaper's fin shows this far off, then, and reaches him then. */
export const REAPER_FROM = 380;
/** The way he comes from: the screen's right, across the sea toward island 8, not from off its edge. */
const REAPER_DIR = Math.atan2(-0.8, 0.55);
export const REAPER_SHOWS = 3.8;
export const SNAP_T = 7.6;
/** The staff goes up, the portal opens, he sinks into it, and it shuts. */
export const CAST_START = 5.4;
export const CAST_END = 6.2;
export const PORTAL_OPEN = 6.4;
export const SINK_START = 6.8;
export const SINK_END = 7.4;
export const PORTAL_SHUT = 8.8;
/** The Reaper circles, then goes down. */
export const DIVE_START = 9.4;
export const DIVE_END = 10.4;

export type EscapeFrame = {
  /** The Heron: where, how high, flying or floundering, his staff up, sinking (0 to 1), there at all. */
  heron: {
    x: number;
    y: number;
    z: number;
    fly: boolean;
    cast: number;
    sink: number;
    shown: boolean;
  };
  /** The Reaper's fin: where, which way, how far up out of the water (0 to 1). */
  reaper: { x: number; y: number; h: number; up: number };
  /** The portal on the water, 0 shut to 1 wide open. */
  portal: number;
  /** The splash where he hit the water, 0 to 1 as it spreads (and 0 when none). */
  splash: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** The scene at t seconds in. */
export function escapeAt(t: number): EscapeFrame {
  const { x, y } = ESCAPE_AT;
  // Flapping in from the island's side, then falling.
  const inFlight = span(t, 0, FALL_START);
  const fall = span(t, FALL_START, SPLASH_T);
  const hx = x - 160 * (1 - inFlight);
  const hy = y - 60 * (1 - inFlight);
  const z = t < FALL_START ? FALL_FROM : FALL_FROM * (1 - fall * fall);
  const sink = span(t, SINK_START, SINK_END);
  const cast =
    t < CAST_START
      ? 0
      : t < CAST_END
        ? span(t, CAST_START, CAST_END)
        : t < SINK_START
          ? 1
          : 1 - sink;
  // The Reaper: in from the far side, straight at him, then round in a circle, then down.
  const come = span(t, REAPER_SHOWS, SNAP_T);
  const fromX = x + Math.cos(REAPER_DIR) * REAPER_FROM;
  const fromY = y + Math.sin(REAPER_DIR) * REAPER_FROM;
  let rx = fromX + (x - fromX) * come;
  let ry = fromY + (y - fromY) * come;
  let rh = Math.atan2(y - fromY, x - fromX);
  if (t > SNAP_T) {
    const a = rh + ((t - SNAP_T) / 2.2) * Math.PI * 2;
    rx = x + Math.cos(a - Math.PI / 2) * 60 * span(t, SNAP_T, SNAP_T + 0.6);
    ry = y + Math.sin(a - Math.PI / 2) * 60 * span(t, SNAP_T, SNAP_T + 0.6);
    rh = a;
  }
  const up =
    t < REAPER_SHOWS
      ? 0
      : span(t, REAPER_SHOWS, REAPER_SHOWS + 0.6) * (1 - span(t, DIVE_START, DIVE_END));
  const portal =
    t < PORTAL_OPEN - 0.4
      ? 0
      : t < PORTAL_SHUT - 0.8
        ? span(t, PORTAL_OPEN - 0.4, PORTAL_OPEN)
        : 1 - span(t, PORTAL_SHUT - 0.8, PORTAL_SHUT);
  return {
    heron: { x: hx, y: hy, z, fly: t < SPLASH_T, cast, sink, shown: t < SINK_END },
    reaper: { x: rx, y: ry, h: rh, up },
    portal,
    splash: t >= SPLASH_T && t < SPLASH_T + 1.4 ? (t - SPLASH_T) / 1.4 : 0,
  };
}

/** What the scene says along the bottom, from when. */
export const ESCAPE_CAPTIONS: readonly [number, string][] = [
  [0, 'Out over the sea by island 9, the beaten Heron is flapping away...'],
  [FALL_START + 0.3, 'He is too hurt to fly. Down he goes!'],
  [SPLASH_T + 0.5, 'Splash! And something big has smelled him in the water: the Reaper!'],
  [CAST_START, 'The Heron raises his staff and casts a spell...'],
  [SINK_START, '"The spell worked!" A portal, and he is gone.'],
  [PORTAL_SHUT, 'The Heron got away. He will be back, somewhere far away...'],
];
