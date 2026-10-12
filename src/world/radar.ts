/**
 * The radar, the kid's (his fifth list, 2026-10-10): a round scope in the corner of the screen,
 * its line sweeping round, showing what is out on the water round the boat: fish blue, threats
 * red, and everything else grey, in the deep too. It is the shipwright's to sell.
 *
 * It shows what is out on the water, the way the game would draw it if the screen were bigger: a
 * leviathan still under the sea is not on it, so the radar spoils nothing that rises. Each
 * creature says for itself what it shows (Entity.radar); the game adds the schools, the islands
 * and the lines of buoys.
 *
 * The scope is turned the way the screen shows the sea, so a blip up and to the left on the
 * radar is up and to the left of the boat on the screen; but it is round, not squashed flat like
 * the sea, so a blip's distance from the middle is its true distance.
 */

import { K } from '../core/iso';

/** What a radar shows a thing as. */
export type BlipKind = 'fish' | 'threat' | 'other';

/** Something on the radar: where it is in the world, and what it shows as. */
export type Blip = { x: number; y: number; kind: BlipKind };

/** How far the radar sees, in world units: about two screens of sea round the boat. */
export const RADAR_RANGE = 1500;
/** Seconds for the line to sweep once round. */
export const SWEEP_T = 2.4;
/** A blip the line has just passed is bright; it dims to this as the line comes round again. */
export const BLIP_DIM = 0.3;

/**
 * Where a point this far from the boat falls on the scope: an offset from the middle, 1 at the
 * edge of the range, turned the way the screen shows the sea.
 */
export function scopeAt(dx: number, dy: number, range = RADAR_RANGE): [number, number] {
  return [((dx - dy) * K) / range, ((dx + dy) * K) / range];
}

/** Whether a point this far from the boat is on the scope at all. */
export function inRange(dx: number, dy: number, range = RADAR_RANGE): boolean {
  return dx * dx + dy * dy <= range * range;
}

/** The angle of the sweeping line at time T, clockwise from straight up the scope. */
export function sweepAngle(T: number): number {
  return ((T / SWEEP_T) % 1) * Math.PI * 2;
}

/**
 * How bright a blip is at a point on the scope (sx, sy) when the line is at angle a: full just
 * after the line has passed it, dimming to BLIP_DIM as the line comes round again.
 */
export function blipGlow(sx: number, sy: number, a: number): number {
  const at = Math.atan2(sx, -sy); // clockwise from up, the way the line goes
  const since = (((a - at) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return 1 - (1 - BLIP_DIM) * (since / (Math.PI * 2));
}

/** The colours of the three kinds, as the kid asked: fish blue, threats red, the rest grey. */
export const BLIP_COLOUR: Readonly<Record<BlipKind, string>> = {
  fish: '#4FC3F7',
  threat: '#FF5A3C',
  other: '#B7C4C7',
};
