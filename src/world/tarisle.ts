/**
 * The tar island, the kid's "island 2 (new)" of the tar ocean (his answers in his tabs "stealth mission for rowan" and
 * "tar ocean for rowan"; his sixth list's drawing: "on the tar side an island with a tower on a hill"). It lies out on
 * the tar north of the bridge, near enough to see through the observatory's telescope: black rock, a hill in its middle,
 * and on top of the hill the sorcerer's old tower, the one he was kicked off in mission 1. The chemistry boat ties up
 * at a jetty on its south side, toward the bridge, and the figure walks ashore. Its tar creatures and their leader up
 * on the high ground come after.
 */

import { METAL_BRIDGE, NORTH_EDGE } from './metalbridge';

/** The island: its middle and how far its shore runs out. */
export const TAR_ISLE = { x: METAL_BRIDGE.x - 1500, y: NORTH_EDGE - 3800, r: 440 } as const;

/** The hill in its middle: how far out it rises from, and how high its top is. */
export const HILL_R = 240;
export const HILL_H = 46;

/** The sorcerer's old tower on the hilltop: round, of grey stone, its door toward the viewer. */
export const TAR_TOWER = { x: TAR_ISLE.x, y: TAR_ISLE.y, r: 56, h: 190 } as const;
export const TOWER_DOOR = {
  x: TAR_TOWER.x + (TAR_TOWER.r + 16) * Math.SQRT1_2,
  y: TAR_TOWER.y + (TAR_TOWER.r + 16) * Math.SQRT1_2,
} as const;
export const DOOR_REACH = 30;

/** The jetty on the south shore, toward the bridge: from the rock out over the tar, and its planks' half width. */
export const JETTY = {
  x: TAR_ISLE.x,
  y0: TAR_ISLE.y + TAR_ISLE.r - 60,
  y1: TAR_ISLE.y + TAR_ISLE.r + 80,
  half: 13,
} as const;
/** Where the figure steps off the boat and back on, at the jetty's end, and how near to be. */
export const JETTY_END = { x: JETTY.x, y: JETTY.y1 - 22 } as const;
export const BOARD_REACH = 34;

/** Where the chemistry boat ties up, alongside the jetty's end, and how near and slow to step ashore from it. */
export const ISLE_BERTH = { x: JETTY.x + 72, y: JETTY.y1 - 10 } as const;
export const ISLE_BERTH_REACH = 150;
export const ISLE_BERTH_STOP = 25;

/** How far round the shore the boat is kept off the rock. */
export const SHORE_OFF = 34;

/** The shore's wobble round the island, so it is not a perfect circle. */
export function shoreR(a: number): number {
  return TAR_ISLE.r * (1 + 0.06 * Math.sin(a * 3 + 0.7) + 0.04 * Math.sin(a * 7 + 2.1));
}

/** Whether a point is on the island's rock. */
export function onIsleRock(x: number, y: number): boolean {
  const dx = x - TAR_ISLE.x;
  const dy = y - TAR_ISLE.y;
  return Math.hypot(dx, dy) <= shoreR(Math.atan2(dy, dx)) - 12;
}

function onJetty(x: number, y: number): boolean {
  return Math.abs(x - JETTY.x) <= JETTY.half - 3 && y >= JETTY.y0 && y <= JETTY.y1;
}

/** The height of the ground: up the hill toward its top, the jetty's planks a little over the tar. */
export function tarIsleZ(x: number, y: number): number {
  const d = Math.hypot(x - TAR_ISLE.x, y - TAR_ISLE.y);
  if (d < HILL_R) {
    const k = Math.cos((d / HILL_R) * (Math.PI / 2));
    return HILL_H * k * k;
  }
  return onJetty(x, y) && !onIsleRock(x, y) ? 4 : 0;
}

/** The chemistry boat stopped alongside the jetty. */
export function atIsleBerth(b: { x: number; y: number; v: number }): boolean {
  return (
    Math.abs(b.v) < ISLE_BERTH_STOP &&
    Math.hypot(b.x - ISLE_BERTH.x, b.y - ISLE_BERTH.y) < ISLE_BERTH_REACH
  );
}

/** A hull kept off the island's rock: pushed back out to its shore, its speed taken off. */
export function keepOffIsle(b: { x: number; y: number; v: number }): void {
  const dx = b.x - TAR_ISLE.x;
  const dy = b.y - TAR_ISLE.y;
  const d = Math.hypot(dx, dy) || 1;
  const R = shoreR(Math.atan2(dy, dx)) + SHORE_OFF;
  if (d >= R) return;
  b.x = TAR_ISLE.x + (dx / d) * R;
  b.y = TAR_ISLE.y + (dy / d) * R;
  b.v *= 0.5;
}

/** What there is to do, on foot on the island: back aboard at the jetty's end, or try the tower's door. */
export function tarIsleAction(x: number, y: number): 'tarboard' | 'tartower' | null {
  if (Math.hypot(x - JETTY_END.x, y - JETTY_END.y) < BOARD_REACH) return 'tarboard';
  if (Math.hypot(x - TOWER_DOOR.x, y - TOWER_DOOR.y) < DOOR_REACH) return 'tartower';
  return null;
}

/** The dead trees and rocks on it, where they stand, kept off the jetty's way up and the tower's door. */
export const TAR_TREES: readonly { x: number; y: number; s: number }[] = [
  { x: TAR_ISLE.x - 300, y: TAR_ISLE.y - 120, s: 1.1 },
  { x: TAR_ISLE.x - 220, y: TAR_ISLE.y + 230, s: 0.9 },
  { x: TAR_ISLE.x + 280, y: TAR_ISLE.y - 210, s: 1.2 },
  { x: TAR_ISLE.x + 330, y: TAR_ISLE.y + 60, s: 1 },
  { x: TAR_ISLE.x - 90, y: TAR_ISLE.y - 340, s: 0.95 },
];
export const TAR_ROCKS: readonly { x: number; y: number; r: number }[] = [
  { x: TAR_ISLE.x - 340, y: TAR_ISLE.y + 60, r: 18 },
  { x: TAR_ISLE.x + 200, y: TAR_ISLE.y + 300, r: 14 },
  { x: TAR_ISLE.x + 120, y: TAR_ISLE.y - 330, r: 20 },
  { x: TAR_ISLE.x - 260, y: TAR_ISLE.y - 260, r: 16 },
];

/** How near a dead tree's trunk the figure can come. */
const TRUNK_R = 10;

/** Where the figure can walk: the rock and the jetty, not into the tower, a rock or a tree's trunk. */
export function onTarIsle(x: number, y: number): boolean {
  if (Math.hypot(x - TAR_TOWER.x, y - TAR_TOWER.y) < TAR_TOWER.r + 8) return false;
  if (TAR_ROCKS.some((r) => Math.hypot(x - r.x, y - r.y) < r.r + 6)) return false;
  if (TAR_TREES.some((t) => Math.hypot(x - t.x, y - t.y) < TRUNK_R)) return false;
  return onIsleRock(x, y) || onJetty(x, y);
}
