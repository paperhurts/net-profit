/**
 * Off the boat, the kid's ask. Tie up at the pier and step ashore, and a
 * little figure in a yellow sou'wester walks the home island with the same
 * stick that steers the boat: the sand and the grass, the planks of the pier,
 * the Ten Cent Bridge and the beach at its end. The boat waits bow in at the
 * end of the pier; walk back to it and go aboard. There is nothing to do
 * ashore yet, on purpose: walking has to feel right on a phone first, and then
 * the island fills up.
 *
 * Stepping ashore, the boat comes round to its berth over a second or so and
 * the figure hops onto the planks. The island, the pier, the bridge deck and
 * the beach are the dry land; the hut, the palace tree, the palms, the
 * watchtower, the stall, the smokehouse, the crates and the umbrella stand in
 * the way, and the figure slides along whatever it walks into. It leaves
 * footprints in the sand that fade.
 *
 * Sorting it among the solids is most of the work. Every solid on the island is
 * drawn at one depth, and a figure that walks right round them needs to know,
 * for each one near it, whether it stands in front or behind: in front when it
 * is past a face that looks at the viewer, behind when it is past one that
 * looks away. The pier sorts round the boat and the bridge in parts, so those
 * are handled the same way with their own depths.
 */

import { dirToWorld } from '../core/iso';
import { angDiff, clamp } from '../core/math';
import type { ArmourLook } from '../data/armour';
import { HAIR_COLOURS, HAT_COLOURS, type Look, SKINS, SKIPPER } from '../data/look';
import { AQUARIUM, AQUARIUM_FROM, AQUARIUM_MID } from '../world/aquarium';
import { BASES, polePoint } from '../world/bases';
import {
  berth13,
  DOCK13,
  groundZ13,
  inEndlessShallows,
  LANDING13,
  onEndless,
} from '../world/endless';
import { berth14, CRATES14, DOCK14, groundZ14, LANDING14, onIsle14 } from '../world/garden';
import { COLUMNS, POOL, SEAT } from '../world/gigantis';
import {
  BEACH,
  BRIDGE,
  BRIDGE_PARTS,
  BRIDGE_SOUTH,
  bridgePartDepth,
  DOCK,
  IR,
  IX,
  IY,
  PX0,
  SMOKEHOUSE,
  STALL,
  TOLL_SIGN,
  TWX,
  TWY,
  TX,
  TY,
  UMBRELLA,
} from '../world/island';
import {
  berth2,
  CHEST,
  DOCK2,
  HUTS,
  ISLE2,
  LANDING2,
  NAGA_CAGE,
  PALMS2,
  POST,
  TOTEM,
  TOWER,
} from '../world/isle2';
import { berth3, DOCK3, groundZ3, LAMPS, LANDING3, onIsle3, SHACKS, TOWER3 } from '../world/isle3';
import { inTar, onIsle4, PALMS4, ROCKS4, tarWay } from '../world/isle4';
import {
  berth6,
  CHESTS6,
  DOCK6,
  groundZ6,
  HILL,
  LANDING6,
  onIsle6,
  PALMS6,
  POST6,
  ROCKS6,
  TEMPLE,
} from '../world/isle6';
import {
  berth7,
  CHEST7,
  DOCK7,
  HUTS7,
  LANDING7,
  onIsle7,
  PALMS7,
  PORTAL_FEET,
  POST7,
  TOTEM7,
  TOWER7,
} from '../world/isle7';
import {
  berth8,
  DOCK8,
  LANDING8,
  onTwins,
  PALMS8,
  POST8,
  ROCKS9,
  SNAGS9,
  TENTS8,
  TOWER8,
  TOWER9,
} from '../world/isle8';
import {
  berth10,
  CRATES10,
  CYPRESS10,
  DOCK10,
  FEEDER10,
  groundZ10,
  LANDING10,
  OAKS10,
  OLDMAN10,
  onIsle10,
  ROCKS10,
  SHACK10,
  TOWER10,
  TREES10,
} from '../world/isle10';
import {
  berth11,
  COLUMNS11,
  CRATES11,
  DOCK11,
  groundZ11,
  LANDING11,
  onIsle11,
  PALMS11,
  PORTAL11,
  TREES11,
  WORKSHOP11,
} from '../world/isle11';
import { berth12, CRATES12, DOCK12, groundZ12, LANDING12, onIsle12 } from '../world/isle12';
import { inTunnelBounds, tunnelWalkable } from '../world/stealth';
import { CAGE, onFloor } from '../world/tower';
import type { DrawView, Entity, Layer, World } from './entity';
import { BAKERY, DRURY_LANE } from './muffinman';
import { drawKnife } from './spears';

/** Walking speed in world units a second, and how quickly a step answers the stick. */
export const WALK_SPEED = 85;
export const WALK_EASE = 12;
/**
 * How far the stick must be pushed to walk at full speed. A thumb at rest on a
 * phone pushes about half way, and at half pace the monkeys caught it, so half
 * a push is a full walk; less than that walks slower, for picking a way along
 * the pier. The boat keeps the whole push: its speed is the towed net's feel.
 */
export const WALK_FULL = 0.5;
/** Swimming in the tar goes at this share of walking pace, sunk to the chest. */
export const SWIM_PACE = 0.6;
export const SWIM_SINK = 11;
/** Wading the Endless Isle's shallows goes at half pace, in to the knees. */
export const WADE_PACE = 0.5;
export const WADE_SINK = 5;

/** The share of full walking speed for a push of the stick, 0..1. */
export function walkPace(push: number): number {
  return Math.min(1, Math.max(0, push) / WALK_FULL);
}
/** How much closer the camera comes while ashore: a figure this size wants it. */
export const WALK_ZOOM = 0.6;
/**
 * And how far below the screen's middle it keeps the figure, of the screen's height, the owner's (2026-10-16: "on land
 * the camera needs some adjusting so the player is closer to the bottom of the screen, same as the Battle Barge"): with
 * the bubbles down the top right, the figure in the middle stood just under them, under the messages, with empty sea
 * below. Lower, it shows more of what is ahead.
 */
export const WALK_DROP = 0.12;
/** The boat comes round to its berth in at most this many seconds, easing there and turning this fast. */
export const MOOR_TIME = 1.6;
export const MOOR_EASE = 2.6;
export const MOOR_TURN = 3;
/** Seconds for a hop between the bow and the planks. */
export const HOP = 0.4;
/**
 * Where the figure lands on the pier: past the crates on the open strip in front of them, so the
 * way up the pier is straight ahead. And how near it must be to go back aboard.
 */
export const LANDING = { x: PX0 + 147, y: IY + 12 } as const;
export const BOARD_REACH = 30;
/** Seconds a footprint lasts in the sand, and how far apart they fall. */
export const PRINT_LIFE = 7;
export const STRIDE = 9;
const MAX_PRINTS = 80;

/** The boat's berth for a hull of this scale: bow in at the end of the pier, a hand's width off the planks. */
export function berth(k: number): { x: number; y: number; h: number } {
  return { x: PX0 + 161 + 34 * k, y: IY, h: Math.PI };
}

/** A place to step ashore: the dock ring, where the boat ties up for a hull scale, and where the figure lands. */
export type Dock = {
  x: number;
  y: number;
  r: number;
  berth(k: number): { x: number; y: number; h: number };
  landing: { x: number; y: number };
  /** Off the bow into island 4's tar, in the chemistry suit, rather than onto planks or sand. */
  tar?: boolean;
};
/**
 * The pier at home, island 2's beach, where the boat runs up onto the sand, island 3's jetty, island
 * 6's pier, and island 7's beach (defined below).
 */
export const HOME_DOCK: Dock = { x: DOCK.x, y: DOCK.y, r: DOCK.r, berth, landing: LANDING };
export const ISLE2_DOCK: Dock = {
  x: DOCK2.x,
  y: DOCK2.y,
  r: DOCK2.r,
  berth: berth2,
  landing: LANDING2,
};
export const ISLE3_DOCK: Dock = {
  x: DOCK3.x,
  y: DOCK3.y,
  r: DOCK3.r,
  berth: berth3,
  landing: LANDING3,
};
export const ISLE6_DOCK: Dock = {
  x: DOCK6.x,
  y: DOCK6.y,
  r: DOCK6.r,
  berth: berth6,
  landing: LANDING6,
};
export const ISLE7_DOCK: Dock = {
  x: DOCK7.x,
  y: DOCK7.y,
  r: DOCK7.r,
  berth: berth7,
  landing: LANDING7,
};
/** Island 8's dock, which is island 9's too: the sandbar joins them. */
export const ISLE8_DOCK: Dock = {
  x: DOCK8.x,
  y: DOCK8.y,
  r: DOCK8.r,
  berth: berth8,
  landing: LANDING8,
};
/** Island 10's dock, at the end of its pier on the side toward home. */
export const ISLE10_DOCK: Dock = {
  x: DOCK10.x,
  y: DOCK10.y,
  r: DOCK10.r,
  berth: berth10,
  landing: LANDING10,
};
/** Island 11's dock, at the end of its pier on the side toward home. */
export const ISLE11_DOCK: Dock = {
  x: DOCK11.x,
  y: DOCK11.y,
  r: DOCK11.r,
  berth: berth11,
  landing: LANDING11,
};
/** Skull Island's dock, past the end of the pier off its chin. */
export const ISLE12_DOCK: Dock = {
  x: DOCK12.x,
  y: DOCK12.y,
  r: DOCK12.r,
  berth: berth12,
  landing: LANDING12,
};
/** The Endless Isle's two docks, one past each half's pier: the pirates' and the ninjas'. */
export const ENDLESS_P_DOCK: Dock = {
  x: DOCK13.pirate.x,
  y: DOCK13.pirate.y,
  r: DOCK13.pirate.r,
  berth: (k) => berth13('pirate', k),
  landing: LANDING13.pirate,
};
export const ENDLESS_N_DOCK: Dock = {
  x: DOCK13.ninja.x,
  y: DOCK13.ninja.y,
  r: DOCK13.ninja.r,
  berth: (k) => berth13('ninja', k),
  landing: LANDING13.ninja,
};
/** The Garden Isle's dock, past the end of its pier toward home. */
export const GARDEN_DOCK: Dock = {
  x: DOCK14.x,
  y: DOCK14.y,
  r: DOCK14.r,
  berth: berth14,
  landing: LANDING14,
};
export const DOCKS: readonly Dock[] = [
  HOME_DOCK,
  ISLE2_DOCK,
  ISLE3_DOCK,
  ISLE6_DOCK,
  ISLE7_DOCK,
  ISLE8_DOCK,
  ISLE10_DOCK,
  ISLE11_DOCK,
  ISLE12_DOCK,
  ENDLESS_P_DOCK,
  ENDLESS_N_DOCK,
  GARDEN_DOCK,
];

/** Into the tar round island 4 at an angle round it: wherever the boat meets the black water. */
export function tarDock(a: number): Dock {
  const w = tarWay(a);
  return { x: w.landing.x, y: w.landing.y, r: 0, berth: w.berth, landing: w.landing, tar: true };
}

/** The dock whose ring a point is in, if any. */
export function dockAt(x: number, y: number): Dock | null {
  for (const d of DOCKS) if (Math.hypot(x - d.x, y - d.y) < d.r) return d;
  return null;
}

/**
 * Dry land stops this far in from the waterline, on the island and on the beach. On the far side of
 * the island the sand is squashed to half its depth on screen, and a figure nearer the edge than its
 * own shadow stands over the water behind it and looks as if it is wading.
 */
const SHORE = IR - 12;
const BEACH_IN = BEACH.r - 10;
/** The pier as drawn, and the planks that can be walked: all but the strip behind the crates, closed so nothing hides there. */
const PIER_BOX = { x0: PX0, x1: PX0 + 155, y0: IY - 17, y1: IY + 17 } as const;
export const PIER_WALK = { x0: PX0, x1: PX0 + 152, y0: IY - 12, y1: IY + 16 } as const;
const PIER_TOP = 7;
/** The bridge: its length, its deck's half width, the walkable half width inside the rails, and the deck's height. */
const SPAN = Math.hypot(BRIDGE.bx - BRIDGE.ax, BRIDGE.by - BRIDGE.ay);
const UX = (BRIDGE.bx - BRIDGE.ax) / SPAN;
const UY = (BRIDGE.by - BRIDGE.ay) / SPAN;
const HALF = BRIDGE.w / 2;
const DECK_HALF = HALF - 3;
const DECK_TOP = BRIDGE.z + 4;
/** The figure steps up onto a deck over this far, so it does not pop. */
const RAMP = 14;
/** The way onto the bridge starts this far back on the sand, where the shore's margin would cut it off. */
const APPROACH = 14;

/** Along the bridge from its island end, and across it toward its south side, which faces the viewer. */
export function bridgeFrame(x: number, y: number): [number, number] {
  const dx = x - BRIDGE.ax;
  const dy = y - BRIDGE.ay;
  return [dx * UX + dy * UY, dx * BRIDGE_SOUTH[0] + dy * BRIDGE_SOUTH[1]];
}

/** On the pier's planks, as drawn. */
export function onPier(x: number, y: number): boolean {
  return inBox(x, y, PIER_BOX);
}

function inBox(
  x: number,
  y: number,
  b: { x0: number; y0: number; x1: number; y1: number },
): boolean {
  return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
}

/**
 * Land that comes and goes: the bridges the kid puts on his map for the Battle Barge at sea, whose decks and docks
 * can be walked while the fight is on (main.js sets it as the fight starts and clears it as it ends). Where it is,
 * and the height underfoot there.
 */
export type WalkLand = { on(x: number, y: number): boolean; z(x: number, y: number): number };
let walkLand: WalkLand | null = null;
export function setWalkLand(l: WalkLand | null): void {
  walkLand = l;
}

/**
 * Dry land, ignoring what stands on it: the island, the pier, the bridge deck between the rails, the
 * beach, island 2, island 3's planks and seaweed, island 4 and its tar, which only a suited figure
 * gets into, island 6 and its pier, island 7, islands 8 and 9 with the sandbar between, island 10 and its
 * pier, round its pond and pools, island 11 and its pier, round its black lagoon, Skull Island and its pier, round
 * its eye sockets, nose and teeth, the Endless Isle's two halves, piers, bridges, sandbar and shallows, the Garden Isle
 * and its pier, and whatever land comes and goes.
 */
export function onLand(x: number, y: number): boolean {
  if (walkLand?.on(x, y)) return true;
  // Stealth mission 1's tunnels, far from everything: their own floor and nothing else.
  if (inTunnelBounds(x, y)) return tunnelWalkable(x, y);
  if (Math.hypot(x - IX, y - IY) <= SHORE) return true;
  if (onIsle4(x, y)) return true;
  if (onIsle6(x, y)) return true;
  if (onIsle7(x, y)) return true;
  if (onTwins(x, y)) return true;
  if (onIsle10(x, y)) return true;
  if (onIsle11(x, y)) return true;
  if (onIsle12(x, y)) return true;
  if (onEndless(x, y)) return true;
  if (onIsle14(x, y)) return true;
  if (Math.hypot(x - ISLE2.x, y - ISLE2.y) <= ISLE2.r - 12) return true;
  if (onIsle3(x, y)) return true;
  // Room floors, all but the black pool in the ruins behind the throne.
  if (onFloor(x, y)) return Math.hypot(x - POOL.x, y - POOL.y) > POOL.r - 4;
  if (inBox(x, y, PIER_WALK)) return true;
  const [t, o] = bridgeFrame(x, y);
  if (t >= -APPROACH && t <= SPAN && Math.abs(o) <= DECK_HALF) return true;
  return Math.hypot(x - BEACH.x, y - BEACH.y) <= BEACH_IN;
}

/** The height of what is underfoot: the pier's planks, the bridge's deck, island 3's rafts and seaweed, or the sand. */
export function groundZ(x: number, y: number): number {
  if (walkLand?.on(x, y)) return walkLand.z(x, y);
  if (onIsle3(x, y)) return groundZ3(x, y);
  if (onIsle6(x, y)) return groundZ6(x, y);
  if (onIsle10(x, y)) return groundZ10(x, y);
  if (onIsle11(x, y)) return groundZ11(x, y);
  if (onIsle12(x, y)) return groundZ12(x, y);
  if (onEndless(x, y)) return groundZ13(x, y);
  if (onIsle14(x, y)) return groundZ14(x, y);
  if (inBox(x, y, PIER_BOX)) return PIER_TOP * clamp((x - PX0) / 6, 0, 1);
  const [t, o] = bridgeFrame(x, y);
  if (t >= 0 && t <= SPAN && Math.abs(o) <= HALF)
    return DECK_TOP * clamp(Math.min(t, SPAN - t) / RAMP, 0, 1);
  return 0;
}

/**
 * Something that stands on the island: its footprint, the depth the game draws
 * it at, the palace stage that builds it, how far round it the figure is kept,
 * and whether the figure sorts against it (what stands on the pier sorts with
 * the pier).
 */
export type Prop = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  d: number;
  from: number;
  pad: number;
  sort: boolean;
};
const prop = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  d: number,
  from = 0,
  pad = 3,
  sort = true,
): Prop => ({ x0, y0, x1, y1, d, from, pad, sort });
const post = (p: readonly [number, number], r: number, d: number): Prop =>
  prop(p[0] - r, p[1] - r, p[0] + r, p[1] + r, d, 0, 1.5);

/** What stands on the island, at the depths main.js draws it. */
export const PROPS: readonly Prop[] = [
  // The hut on the north shore.
  prop(IX + 20, IY - 120, IX + 80, IY - 70, IX + 80 + (IY - 70)),
  // The palace tree's trunk, and the ladder up to the platform once there is one.
  prop(TX - 10, TY - 10, TX + 10, TY + 10, TX + TY + 30),
  prop(TX + 26, TY + 4, TX + 31, TY + 15, TX + TY + 30, 1, 1.5, false),
  // Three palms.
  ...(
    [
      [IX + 118, IY - 30],
      [IX - 150, IY - 70],
      [IX + 50, IY + 125],
    ] as const
  ).map((p) => post(p, 4, p[0] + p[1])),
  // The watchtower and the fishmonger's stall, with its awnings; then the smokehouse.
  prop(TWX, TWY, TWX + 18, TWY + 18, TWX + TWY + 18, 4),
  prop(STALL.x - 18, STALL.y - 14, STALL.x + 18, STALL.y + 14, STALL.x + STALL.y, 4),
  prop(
    SMOKEHOUSE.x - 16,
    SMOKEHOUSE.y - 12,
    SMOKEHOUSE.x + 16,
    SMOKEHOUSE.y + 12,
    SMOKEHOUSE.x + SMOKEHOUSE.y,
    5,
  ),
  // The aquarium's plot, staked out with the tree platform, and then the aquarium on it.
  prop(
    AQUARIUM.x0,
    AQUARIUM.y0,
    AQUARIUM.x1,
    AQUARIUM.y1,
    AQUARIUM_MID.x + AQUARIUM_MID.y,
    AQUARIUM_FROM,
  ),
  // The crates on the pier, a little inside their fronts so the way past along the front edge is wide enough.
  prop(PX0 + 117, IY - 13, PX0 + 141, IY + 8, 0, 0, 0, false),
  prop(PX0 + 93, IY - 14, PX0 + 111, IY + 2, 0, 0, 0, false),
  // The muffin man's stall on the pier's far edge, and the Drury Lane sign's post on the sand beside it.
  prop(BAKERY.x0, BAKERY.y0, BAKERY.x1, BAKERY.y1, 0, 0, 0, false),
  post([DRURY_LANE.x, DRURY_LANE.y], 2, DRURY_LANE.x + DRURY_LANE.y),
  // The umbrella's pole, sorted with the beach things; the toll sign's post, with the bridge's last part.
  post(UMBRELLA, 3, BEACH.x + BEACH.y),
  post(TOLL_SIGN, 2.5, bridgePartDepth(BRIDGE_PARTS - 1)),
  // Island 2: the trading post, the tower and the palms.
  prop(POST.x0, POST.y0, POST.x1, POST.y1, POST.x1 + POST.y1),
  prop(
    TOWER.x - TOWER.r,
    TOWER.y - TOWER.r,
    TOWER.x + TOWER.r,
    TOWER.y + TOWER.r,
    TOWER.x + TOWER.y,
  ),
  ...PALMS2.map((p) => post(p, 4, p[0] + p[1])),
  // The bases' huts and gear sheds, or their plots until they are built, and the huts' flagpoles.
  ...BASES.flatMap((b) => {
    const { x, y, half } = b.hut;
    const p = polePoint(b);
    const sh = b.shed;
    const out = [
      prop(x - half, y - half, x + half, y + half, x + y + half),
      post([p.x, p.y], 2, x + y + half),
    ];
    // The shed's spare buoy stands off its front corner.
    if (sh)
      out.push(
        prop(
          sh.x - sh.half,
          sh.y - sh.half,
          sh.x + sh.half + 6,
          sh.y + sh.half + 4,
          sh.x + sh.y + sh.half,
        ),
      );
    return out;
  }),
  // The monkey camp: three huts, the totem and the chest.
  ...HUTS.map((h) => prop(h[0] - 11, h[1] - 11, h[0] + 11, h[1] + 11, h[0] + h[1] + 11)),
  post([TOTEM.x, TOTEM.y], 2.5, TOTEM.x + TOTEM.y),
  // The naga's cage, open or shut.
  post([NAGA_CAGE.x, NAGA_CAGE.y], NAGA_CAGE.r, NAGA_CAGE.x + NAGA_CAGE.y),
  prop(CHEST.x - 7, CHEST.y - 5, CHEST.x + 7, CHEST.y + 5, CHEST.x + CHEST.y + 5, 0, 1.5),
  // Island 3: the tower in its seaweed, the three shacks and the lamps.
  prop(
    TOWER3.x - TOWER3.r,
    TOWER3.y - TOWER3.r,
    TOWER3.x + TOWER3.r,
    TOWER3.y + TOWER3.r,
    TOWER3.x + TOWER3.y,
  ),
  ...SHACKS.map((s) => prop(s.x0, s.y0, s.x1, s.y1, s.x1 + s.y1)),
  ...LAMPS.map((p) => post(p, 2, p[0] + p[1])),
  // Island 4: its palms and rocks. The tar monster moves, so the game keeps the figure out of it.
  ...PALMS4.map((p) => post(p, 4, p[0] + p[1])),
  ...ROCKS4.map((p) => prop(p[0] - 8, p[1] - 6, p[0] + 8, p[1] + 6, p[0] + p[1])),
  // Island 6: the hill, the trading post, the temple, palms, boulders and the chests.
  prop(
    HILL.x - HILL.r * 0.85,
    HILL.y - HILL.r * 0.85,
    HILL.x + HILL.r * 0.85,
    HILL.y + HILL.r * 0.85,
    HILL.x + HILL.y + HILL.r * 0.5,
  ),
  prop(POST6.x0, POST6.y0, POST6.x1, POST6.y1, POST6.x1 + POST6.y1),
  prop(
    TEMPLE.x - TEMPLE.w,
    TEMPLE.y - TEMPLE.w * 0.8,
    TEMPLE.x + TEMPLE.w,
    TEMPLE.y + TEMPLE.w * 0.8,
    TEMPLE.x + TEMPLE.y + TEMPLE.w * 0.8,
  ),
  ...PALMS6.map((p) => post(p, 4, p[0] + p[1])),
  // Island 10: the forest's trees, the swamp's cypresses, the prairie's lone oaks and rocks, and the crates on the pier;
  // and its tower, in the meadow.
  prop(
    TOWER10.x - TOWER10.r,
    TOWER10.y - TOWER10.r,
    TOWER10.x + TOWER10.r,
    TOWER10.y + TOWER10.r,
    TOWER10.x + TOWER10.y,
  ),
  ...TREES10.map((p) => post(p, 5, p[0] + p[1])),
  ...CYPRESS10.map((p) => post(p, 5, p[0] + p[1])),
  ...OAKS10.map((p) => post(p, 6, p[0] + p[1])),
  ...ROCKS10.map((p) => prop(p[0] - 8, p[1] - 6, p[0] + 8, p[1] + 6, p[0] + p[1])),
  prop(
    CRATES10.x - 10,
    CRATES10.y - 8,
    CRATES10.x + 19,
    CRATES10.y + 15,
    CRATES10.x + CRATES10.y + 10,
  ),
  // The old man's shack, and his rocking chair on the porch.
  prop(SHACK10.x0, SHACK10.y0, SHACK10.x1, SHACK10.y1, SHACK10.x1 + SHACK10.y1),
  post([OLDMAN10.x, OLDMAN10.y], 6, OLDMAN10.x + OLDMAN10.y),
  // The birdfeeder's pole, past the porch.
  post([FEEDER10.x, FEEDER10.y], 3, FEEDER10.x + FEEDER10.y),
  // Island 11: the jungle's trees and palms, the ruins' broken columns and the portal, and the crates on the pier.
  ...TREES11.map((p) => post(p, 5, p[0] + p[1])),
  ...PALMS11.map((p) => post(p, 4, p[0] + p[1])),
  ...COLUMNS11.map((c) => post([c.x, c.y], 7, c.x + c.y)),
  // The portal's ring stands across the plaza's back, square to the viewer: its two feet and the stone between them.
  prop(PORTAL11.x - 22, PORTAL11.y - 22, PORTAL11.x + 22, PORTAL11.y + 22, PORTAL11.x + PORTAL11.y),
  prop(
    CRATES11.x - 10,
    CRATES11.y - 8,
    CRATES11.x + 19,
    CRATES11.y + 15,
    CRATES11.x + CRATES11.y + 10,
  ),
  // Skull Island's crates, at its pier's root.
  prop(
    CRATES12.x - 10,
    CRATES12.y - 8,
    CRATES12.x + 19,
    CRATES12.y + 15,
    CRATES12.x + CRATES12.y + 10,
  ),
  // The Garden Isle's crates, beside its pier's root.
  prop(
    CRATES14.x - 10,
    CRATES14.y - 8,
    CRATES14.x + 19,
    CRATES14.y + 15,
    CRATES14.x + CRATES14.y + 10,
  ),
  // Caterman's workshop, at the back of the Heron's brother's clearing.
  prop(WORKSHOP11.x0, WORKSHOP11.y0, WORKSHOP11.x1, WORKSHOP11.y1, WORKSHOP11.x1 + WORKSHOP11.y1),
  ...ROCKS6.map((p) => prop(p[0] - 9, p[1] - 7, p[0] + 9, p[1] + 7, p[0] + p[1])),
  ...CHESTS6.map((p) => prop(p[0] - 7, p[1] - 5, p[0] + 7, p[1] + 5, p[0] + p[1], 0, 1.5)),
  // Island 7: the trading post, the tower, the palms, the monkey camp and the portal's two feet.
  prop(POST7.x0, POST7.y0, POST7.x1, POST7.y1, POST7.x1 + POST7.y1),
  prop(
    TOWER7.x - TOWER7.r,
    TOWER7.y - TOWER7.r,
    TOWER7.x + TOWER7.r,
    TOWER7.y + TOWER7.r,
    TOWER7.x + TOWER7.y,
  ),
  ...PALMS7.map((p) => post(p, 4, p[0] + p[1])),
  ...HUTS7.map((h) => prop(h[0] - 11, h[1] - 11, h[0] + 11, h[1] + 11, h[0] + h[1] + 11)),
  // Islands 8 and 9: the trading post, both towers, island 8's palms, island 9's dead trees and rocks.
  prop(POST8.x0, POST8.y0, POST8.x1, POST8.y1, POST8.x1 + POST8.y1),
  ...[TOWER8, TOWER9].map((t) => prop(t.x - t.r, t.y - t.r, t.x + t.r, t.y + t.r, t.x + t.y)),
  ...PALMS8.map((p) => post(p, 4, p[0] + p[1])),
  ...SNAGS9.map((p) => post(p, 3.5, p[0] + p[1])),
  ...ROCKS9.map((p) => prop(p[0] - 9, p[1] - 7, p[0] + 9, p[1] + 7, p[0] + p[1])),
  // The hired men's tents.
  ...TENTS8.map((p) => prop(p[0] - 9, p[1] - 7, p[0] + 9, p[1] + 7, p[0] + p[1] + 7)),
  post([TOTEM7.x, TOTEM7.y], 2.5, TOTEM7.x + TOTEM7.y),
  prop(CHEST7.x - 7, CHEST7.y - 5, CHEST7.x + 7, CHEST7.y + 5, CHEST7.x + CHEST7.y + 5, 0, 1.5),
  ...PORTAL_FEET.map((p) => post(p, 5, p[0] + p[1])),
  // The Forgotten One's throne in Gigantis.
  prop(
    SEAT.x - SEAT.r,
    SEAT.y - SEAT.r,
    SEAT.x + SEAT.r,
    SEAT.y + SEAT.r,
    SEAT.x + SEAT.y + SEAT.r,
  ),
  // The broken columns in the ruins behind it.
  ...COLUMNS.map((c) => post([c.x, c.y], c.r * 0.8, c.x + c.y)),
  // The demon dimension's cage.
  prop(
    CAGE.x - CAGE.r,
    CAGE.y - CAGE.r,
    CAGE.x + CAGE.r,
    CAGE.y + CAGE.r,
    CAGE.x + CAGE.y + CAGE.r,
  ),
];

/** Whether something built at this palace stage stands in the way of a point. */
export function blocked(x: number, y: number, build: number): boolean {
  for (const p of PROPS) {
    if (build < p.from) continue;
    if (x > p.x0 - p.pad && x < p.x1 + p.pad && y > p.y0 - p.pad && y < p.y1 + p.pad) return true;
  }
  return false;
}

export function walkable(x: number, y: number, build: number): boolean {
  return onLand(x, y) && !blocked(x, y, build);
}

/**
 * Straight on, then turned a little either way and shortened to match, then along x or y alone, then
 * turned further: how a step slides along what it meets. The square walls want the straight slides.
 */
const SLIDES = [0, 0.4, -0.4, 0.8, -0.8, 'x', 'y', 1.2, -1.2] as const;

/** Take one step of (dx, dy), sliding along whatever is in the way. Returns how far it went. */
export function walkStep(
  p: { x: number; y: number },
  dx: number,
  dy: number,
  build: number,
): number {
  if (dx === 0 && dy === 0) return 0;
  for (const a of SLIDES) {
    let mx = a === 'y' ? 0 : dx;
    let my = a === 'x' ? 0 : dy;
    if (typeof a === 'number') {
      const c = Math.cos(a);
      const s = Math.sin(a);
      mx = (dx * c - dy * s) * c;
      my = (dx * s + dy * c) * c;
    }
    if ((mx !== 0 || my !== 0) && walkable(p.x + mx, p.y + my, build)) {
      p.x += mx;
      p.y += my;
      return Math.hypot(mx, my);
    }
  }
  return 0;
}

/** Something else that stands on the pier and is sorted there: the dog. */
export type Rider = { x: number; y: number; d: number };
/** Only solids this near can overlap the figure on screen. */
const SORT_REACH = 110;

/**
 * The depth to sort the figure at among the solids, standing at (x, y) with the
 * palace at this stage, the pier sorted at pierD and the dog, if there is one,
 * on the planks. Riding means in the air between the bow and the pier.
 */
export function walkerDepth(
  x: number,
  y: number,
  build: number,
  pierD: number,
  dog: Rider | null,
  riding = false,
): number {
  // On the planks, or hopping to or from them: over the pier and the boat, and before or after the dog.
  if (riding || inBox(x, y, PIER_BOX)) {
    if (dog && inBox(dog.x, dog.y, PIER_BOX)) return dog.d + (x + y > dog.x + dog.y ? 0.25 : -0.25);
    // A dog on the sand in front of the pier stands before it, and so before whoever is on it.
    if (
      dog &&
      (dog.y > PIER_BOX.y1 || dog.x > PIER_BOX.x1) &&
      Math.hypot(dog.x - x, dog.y - y) < 40
    )
      return Math.max(pierD + 0.1, dog.d - 0.25);
    return pierD + 2.5;
  }
  const [t, o] = bridgeFrame(x, y);
  const seg = SPAN / BRIDGE_PARTS;
  const deck = t >= 0 && t <= SPAN && Math.abs(o) <= HALF;
  const base = deck
    ? bridgePartDepth(Math.min(BRIDGE_PARTS - 1, Math.floor(t / seg))) + 0.25
    : x + y;
  let lo = -Infinity;
  let hi = Infinity;
  const order = (front: boolean, behind: boolean, d: number) => {
    if (front && !behind) lo = Math.max(lo, d);
    else if (behind && !front) hi = Math.min(hi, d);
  };
  // A box on the ground: its +x and +y faces look at the viewer.
  const box = (x0: number, y0: number, x1: number, y1: number, d: number) => {
    if (Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)) >= SORT_REACH) return;
    order(x > x1 || y > y1, x < x0 || y < y0, d);
  };
  for (const p of PROPS) if (p.sort && build >= p.from) box(p.x0, p.y0, p.x1, p.y1, p.d);
  box(PIER_BOX.x0, PIER_BOX.y0, PIER_BOX.x1, PIER_BOX.y1, pierD);
  if (dog) box(dog.x - 9, dog.y - 9, dog.x + 9, dog.y + 9, dog.d);
  // The bridge's parts: their south sides and island ends look at the viewer.
  for (let i = 0; i < BRIDGE_PARTS; i++) {
    const t0 = i * seg;
    const t1 = t0 + seg;
    if (Math.hypot(Math.max(t0 - t, 0, t - t1), Math.max(Math.abs(o) - HALF, 0)) >= SORT_REACH)
      continue;
    order(o > HALF || t < t0, o < -HALF || t > t1, bridgePartDepth(i));
  }
  if (lo >= hi) return (lo + hi) / 2;
  if (base <= lo) return Math.min(lo + 0.5, (lo + hi) / 2);
  if (base >= hi) return Math.max(hi - 0.5, (lo + hi) / 2);
  return base;
}

export type WalkState = 'aboard' | 'mooring' | 'off' | 'ashore' | 'on';
/** A footprint: where, which way the foot pointed, which foot, and when. */
export type Print = { x: number; y: number; h: number; side: number; t: number };

/** The figure's trousers, navy; its skin, hair and hat are its look (data/look.ts). */
const TROUSERS = '#2E3A4A';
/** The chemistry suit. */
const SUIT = '#E9C02A';
const SUIT_DARK = '#B8901A';

export class Walker implements Entity {
  state: WalkState = 'aboard';
  x: number = LANDING.x;
  y: number = LANDING.y;
  /** Where the boat is tied up while the figure is ashore. */
  dock: Dock = HOME_DOCK;
  z = 0;
  /** Facing, in world radians. */
  h = Math.PI;
  vx = 0;
  vy = 0;
  /** Seconds in the current state. */
  t = 0;
  /** The gait: its phase, and how much of a stride the legs are taking, 0..1. */
  ph = 0;
  gait = 0;
  /** Seconds left of a throw, with the arm up and forward. */
  throwT = 0;
  /** Whether it carries a spear, which shows over its shoulder while it walks. */
  armed = false;
  /** Whether it has the survival knife (it comes with the Honor Guard armour), at its belt; and whether the last blow
   * was a stab with it, the arm thrust forward with the knife in hand, not up in a throw. */
  knife = false;
  stabbing = false;
  /** How much faster than its own pace it walks: more than 1 while an apple from island 10's old man lasts. */
  speedK = 1;
  /** Just bonked: it blinks while it cannot be bonked again. */
  blink = false;
  /** Under the water in scuba gear: a brass helmet for the sou'wester, a tank on its back, bubbles. */
  diving = false;
  /** How far sunk in the tar, swimming: up to SWIM_SINK. */
  sink = 0;
  readonly prints: Print[] = [];
  /** The shirt, which the game keeps in the boat's paint. */
  shirt = '#E4572E';
  /** The armour it wears from the shipwright, or null. */
  armour: ArmourLook | null = null;
  /** Who it is: the character picked, its skin, hair, hat and face. */
  look: Look = SKIPPER;
  /** The figure has hopped onto the pier. */
  onLand: (() => void) | null = null;
  /** The figure is back aboard. */
  onBoard: (() => void) | null = null;
  /** A hop has begun, either way. */
  onHop: (() => void) | null = null;
  private ix = 0;
  private iy = 0;
  /** Off the end of the pier since landing: the way back aboard is offered only after a walk. */
  private wandered = false;
  private stride = 0;
  private side = 1;
  private now = 0;
  private bow = { x: 0, y: 0, z: 0 };
  private hop = { fx: 0, fy: 0, fz: 0, tx: 0, ty: 0, tz: 0 };

  /** Aboard and at the wheel: the stick steers the boat. */
  get aboard(): boolean {
    return this.state === 'aboard';
  }

  /** Ashore, or hopping between: the figure is drawn and the camera follows it. */
  get shown(): boolean {
    return this.state === 'off' || this.state === 'ashore' || this.state === 'on';
  }

  /**
   * Near enough the end of the pier to go back aboard, having been for a walk. Not straight after
   * landing: the button sits where a thumb lands to start walking.
   */
  get nearBoat(): boolean {
    return (
      this.state === 'ashore' &&
      this.wandered &&
      Math.hypot(this.x - this.dock.landing.x, this.y - this.dock.landing.y) < BOARD_REACH
    );
  }

  /** Tie up and go ashore. The game asks only while docked. */
  stepAshore(dock: Dock = HOME_DOCK): boolean {
    if (this.state !== 'aboard') return false;
    this.dock = dock;
    this.state = 'mooring';
    this.t = 0;
    return true;
  }

  /** Off the boat at once and standing at a point, as when the Deep One drags the boat under: ashore from a dock. */
  landIn(dock: Dock, x: number, y: number): void {
    this.dock = dock;
    this.state = 'ashore';
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.t = 0;
    this.sink = 0;
    this.wandered = false;
    this.onLand?.();
  }

  /** Hop back aboard, from the end of the pier. */
  goAboard(): boolean {
    if (!this.nearBoat) return false;
    this.hop = {
      fx: this.x,
      fy: this.y,
      fz: this.z,
      tx: this.bow.x,
      ty: this.bow.y,
      tz: this.bow.z,
    };
    this.h = Math.atan2(this.bow.y - this.y, this.bow.x - this.x);
    this.state = 'on';
    this.t = 0;
    this.sink = 0;
    this.onHop?.();
    return true;
  }

  /** Bonked out: back aboard at once, the boat still tied up. */
  knockOut(): void {
    if (this.state !== 'ashore') return;
    this.state = 'aboard';
    this.t = 0;
    this.vx = 0;
    this.vy = 0;
    this.sink = 0;
    this.onBoard?.();
  }

  /** Face a point and throw at it. */
  throwAt(x: number, y: number): void {
    this.h = Math.atan2(y - this.y, x - this.x);
    this.throwT = 0.3;
    this.stabbing = false;
  }

  /** Face a point and stab at it with the knife. */
  stabAt(x: number, y: number): void {
    this.throwAt(x, y);
    this.throwT = 0.22;
    this.stabbing = true;
  }

  /** The stick or the keys, as a screen-space vector of magnitude 0..1. */
  intent(ix: number, iy: number): void {
    this.ix = ix;
    this.iy = iy;
  }

  /** Aboard, as when the game starts over. */
  reset(): void {
    this.state = 'aboard';
    this.t = 0;
    this.vx = 0;
    this.vy = 0;
    this.gait = 0;
    this.sink = 0;
    this.prints.length = 0;
  }

  /** Where the figure sorts among the solids; the game draws it in its own sorted list. */
  sortDepth(build: number, pierD: number, dog: Rider | null): number {
    return walkerDepth(
      this.x,
      this.y,
      build,
      pierD,
      dog,
      this.state === 'off' || this.state === 'on',
    );
  }

  update(dt: number, w: World): void {
    const b = w.boat;
    const k = w.hullScale;
    this.now = w.T;
    this.t += dt;
    this.throwT = Math.max(0, this.throwT - dt);
    const first = this.prints[0];
    if (first && this.now - first.t > PRINT_LIFE) this.prints.shift();
    if (this.state === 'mooring') {
      const to = this.dock.berth(k);
      const e = Math.min(1, dt * MOOR_EASE);
      const turn = MOOR_TURN * dt;
      b.x += (to.x - b.x) * e;
      b.y += (to.y - b.y) * e;
      b.h += clamp(angDiff(to.h, b.h), -turn, turn);
      b.v = 0;
      const there = Math.hypot(to.x - b.x, to.y - b.y) < 2 && Math.abs(angDiff(to.h, b.h)) < 0.05;
      if (this.t >= MOOR_TIME || there) {
        b.x = to.x;
        b.y = to.y;
        b.h = to.h;
        this.bowOf(b, k);
        this.hop = {
          fx: this.bow.x,
          fy: this.bow.y,
          fz: this.bow.z,
          tx: this.dock.landing.x,
          ty: this.dock.landing.y,
          tz: groundZ(this.dock.landing.x, this.dock.landing.y),
        };
        this.h = Math.PI;
        this.state = 'off';
        this.t = 0;
        this.onHop?.();
      }
      return;
    }
    this.bowOf(b, k);
    if (this.state === 'off' || this.state === 'on') {
      const f = Math.min(1, this.t / HOP);
      const hp = this.hop;
      this.x = hp.fx + (hp.tx - hp.fx) * f;
      this.y = hp.fy + (hp.ty - hp.fy) * f;
      this.z = hp.fz + (hp.tz - hp.fz) * f + Math.sin(Math.PI * f) * 12;
      this.gait = 0;
      if (f >= 1) {
        this.t = 0;
        this.vx = 0;
        this.vy = 0;
        if (this.state === 'off') {
          this.state = 'ashore';
          this.wandered = false;
          this.onLand?.();
        } else {
          this.state = 'aboard';
          this.onBoard?.();
        }
      }
      return;
    }
    if (this.state !== 'ashore') return;
    // The stick points where to walk; how far it is pushed is how fast, up to full at half a push, the same in every direction.
    const mag = walkPace(Math.hypot(this.ix, this.iy));
    let tx = 0;
    let ty = 0;
    const swim = inTar(this.x, this.y);
    const wade = !swim && inEndlessShallows(this.x, this.y);
    if (mag > 0) {
      const d = dirToWorld(this.ix, this.iy);
      const n = Math.hypot(d[0], d[1]) || 1;
      const pace = WALK_SPEED * mag * (swim ? SWIM_PACE : wade ? WADE_PACE : 1) * this.speedK;
      tx = (d[0] / n) * pace;
      ty = (d[1] / n) * pace;
    }
    this.sink += ((swim ? SWIM_SINK : wade ? WADE_SINK : 0) - this.sink) * Math.min(1, dt * 6);
    const e = Math.min(1, dt * WALK_EASE);
    this.vx += (tx - this.vx) * e;
    this.vy += (ty - this.vy) * e;
    const moved = walkStep(this, this.vx * dt, this.vy * dt, w.build);
    if (Math.hypot(this.vx, this.vy) > 8) this.h = Math.atan2(this.vy, this.vx);
    const speed = dt > 0 ? moved / dt : 0;
    this.gait += (Math.min(1, speed / (WALK_SPEED * 0.6)) - this.gait) * Math.min(1, dt * 10);
    this.ph += moved * 0.42;
    this.z = groundZ(this.x, this.y);
    const home = this.dock.landing;
    if (Math.hypot(this.x - home.x, this.y - home.y) > BOARD_REACH + 10) this.wandered = true;
    this.stride += moved;
    if (this.stride >= STRIDE) {
      this.stride -= STRIDE;
      this.side = -this.side;
      if (this.z === 0 && !swim) {
        this.prints.push({ x: this.x, y: this.y, h: this.h, side: this.side, t: this.now });
        if (this.prints.length > MAX_PRINTS) this.prints.shift();
      }
    }
  }

  private bowOf(b: { x: number; y: number; h: number }, k: number): void {
    this.bow.x = b.x + Math.cos(b.h) * 24 * k;
    this.bow.y = b.y + Math.sin(b.h) * 24 * k;
    this.bow.z = 9 * k + 1;
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer === 'surface') {
      this.drawPrints(v);
      return;
    }
    if (!this.shown) return;
    if (layer === 'solids') this.drawFigure(v);
    else if (layer === 'mask') v.light(this.x, this.y, this.z + 14, 160, 0.9);
    else if (layer === 'glow' && v.dark > 0.05) {
      const [hx, hy] = this.hand(-1);
      v.glow(hx, hy, this.z + 8, 36, `rgba(255,217,138,${0.55 * v.dark})`);
    }
  }

  /** Where a hand is, on this side (1 or -1 across the facing), as the arm swings against the legs. */
  private hand(side: number): [number, number] {
    const c = Math.cos(this.h);
    const s = Math.sin(this.h);
    const sw = -Math.sin(this.ph) * this.gait * side * 3;
    return [this.x + c * sw - s * 4.6 * side, this.y + s * sw + c * 4.6 * side];
  }

  private drawPrints(v: DrawView): void {
    const { ctx, px, py } = v;
    const Z = v.zoom;
    for (const p of this.prints) {
      if (!v.onScreen(p.x, p.y, 20)) continue;
      const a = 1 - (this.now - p.t) / PRINT_LIFE;
      if (a <= 0) continue;
      const c = Math.cos(p.h);
      const s = Math.sin(p.h);
      const x = p.x - s * 2.4 * p.side;
      const y = p.y + c * 2.4 * p.side;
      ctx.fillStyle = `rgba(122,86,44,${0.3 * a})`;
      ctx.beginPath();
      ctx.ellipse(
        px(x, y),
        py(x, y),
        2.3 * Z,
        1.2 * Z,
        Math.atan2((c + s) / 2, c - s),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  /** A cape from the shoulders down the back, swinging a little as it walks. */
  private drawCape(v: DrawView, colour: string): void {
    const { ctx, px, py } = v;
    const Z = v.zoom;
    const { x, y } = this;
    const z = this.z - this.sink;
    const c = Math.cos(this.h);
    const s = Math.sin(this.h);
    const sway = Math.sin(this.ph) * this.gait * 1.5;
    const top = (k: number): [number, number] => {
      const wx = x - c * 2.4 - s * 4 * k;
      const wy = y - s * 2.4 + c * 4 * k;
      return [px(wx, wy), py(wx, wy, z + 18)];
    };
    const foot = (k: number): [number, number] => {
      const wx = x - c * (5 + this.gait * 2) - s * (5.5 * k + sway);
      const wy = y - s * (5 + this.gait * 2) + c * (5.5 * k + sway);
      return [px(wx, wy), py(wx, wy, z + 3)];
    };
    const [ax, ay] = top(-1);
    const [bx, by] = top(1);
    const [cx, cy] = foot(1);
    const [dx, dy] = foot(-1);
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.quadraticCurveTo((cx + dx) / 2, (cy + dy) / 2 + 1.5 * Z, dx, dy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 0.8 * Z;
    ctx.stroke();
  }

  private drawFigure(v: DrawView): void {
    if (this.blink && Math.floor(this.now * 12) % 2) return;
    const { ctx, px, py } = v;
    const Z = v.zoom;
    // Swimming in the tar, or wading the Endless Isle's shallows: rings round it, and nothing of it below the surface.
    const sunk = this.sink > 0.5;
    if (sunk) {
      const { x, y } = this;
      const water = inEndlessShallows(x, y);
      const a = water ? 1 : this.sink / SWIM_SINK;
      ctx.lineWidth = 1.2 * Z;
      for (let k = 0; k < 2; k++) {
        const t = (this.now * 0.8 + k * 0.5) % 1;
        v.isoEllipse(x, y, 6 + t * 12);
        ctx.strokeStyle = water
          ? `rgba(235,250,255,${0.6 * (1 - t)})`
          : `rgba(160,120,200,${0.45 * (1 - t) * a})`;
        ctx.stroke();
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(px(x, y) - 40 * Z, py(x, y, 0) - 90 * Z, 80 * Z, 90 * Z);
      ctx.clip();
    }
    this.drawParts(v);
    if (sunk) ctx.restore();
  }

  private drawParts(v: DrawView): void {
    const { ctx, px, py } = v;
    const Z = v.zoom;
    const { x, y } = this;
    const z = this.z - this.sink;
    const c = Math.cos(this.h);
    const s = Math.sin(this.h);
    const swing = Math.sin(this.ph) * this.gait;
    // In island 4's tar, the chemistry suit: yellow from boots to hood.
    const suit = this.dock.tar === true;
    const shirt = suit ? SUIT : this.shirt;
    // A shadow on whatever is beneath, the water too while hopping.
    if (this.sink <= 0.5) {
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      v.isoEllipse(x, y, 6, Math.min(z, groundZ(x, y)));
      ctx.fill();
    }
    ctx.lineCap = 'round';
    // Legs: the forward foot lifts a little.
    ctx.strokeStyle = suit ? SUIT_DARK : TROUSERS;
    ctx.lineWidth = 2.6 * Z;
    for (const side of [-1, 1]) {
      const f = swing * side * 3.5;
      const hx = x - s * 1.7 * side;
      const hy = y + c * 1.7 * side;
      const fx = hx + c * f;
      const fy = hy + s * f;
      ctx.beginPath();
      ctx.moveTo(px(hx, hy), py(hx, hy, z + 9));
      ctx.lineTo(px(fx, fy), py(fx, fy, z + Math.max(0, f) * 0.5));
      ctx.stroke();
    }
    // Diving, the air tank on its back, drawn first so the body covers its near side.
    if (this.diving) {
      const tx = x - c * 3.5;
      const ty = y - s * 3.5;
      ctx.fillStyle = '#8E9AA0';
      ctx.beginPath();
      ctx.ellipse(px(tx, ty), py(tx, ty, z + 15), 2.8 * Z, 6 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // The body, in the boat's colour; a cape behind it, when it faces this way.
    const arm0 = suit ? null : this.armour;
    const towardUs = (c + s) / 2 >= 0;
    if (arm0?.cape && towardUs) this.drawCape(v, arm0.cape);
    const bx = px(x, y);
    const by = py(x, y, z + 13);
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.ellipse(bx, by, 4.6 * Z, 5.8 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    // Armour over the shirt: a chest plate with an edge and a shine (never over the chemistry suit).
    const arm = suit ? null : this.armour;
    if (arm) {
      ctx.fillStyle = arm.plate;
      ctx.strokeStyle = arm.edge;
      ctx.lineWidth = 0.9 * Z;
      ctx.beginPath();
      ctx.ellipse(bx, by - 0.4 * Z, 4.4 * Z, 4.8 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx - 4 * Z, by + 2.6 * Z);
      ctx.quadraticCurveTo(bx, by + 4.2 * Z, bx + 4 * Z, by + 2.6 * Z);
      ctx.stroke();
      ctx.fillStyle = arm.shine;
      ctx.beginPath();
      ctx.ellipse(bx - 1.6 * Z, by - 2 * Z, 1.1 * Z, 1.8 * Z, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Its back to us, the cape hangs over it.
    if (arm?.cape && !towardUs) this.drawCape(v, arm.cape);
    // The survival knife at its belt, unless it is in its hand.
    if (this.knife && !(this.throwT > 0 && this.stabbing)) {
      const kx = x + s * 4.6;
      const ky = y - c * 4.6;
      drawKnife(ctx, px(kx, ky), py(kx, ky, z + 10), Z * 0.75, Math.PI / 2);
    }
    // Arms, swinging against the legs; at night one hand carries a lantern. Swimming, they reach over in turn.
    ctx.strokeStyle = shirt;
    ctx.lineWidth = 2.2 * Z;
    const crawl = this.sink / SWIM_SINK;
    for (const side of [-1, 1]) {
      let [hx, hy] = this.hand(side);
      let hz = z + 9;
      if (crawl > 0.5) {
        const p = this.now * 4 + (side > 0 ? Math.PI : 0);
        const reach = Math.cos(p) * 7 * Math.max(0.3, this.gait);
        hx = x + c * reach - s * 5 * side;
        hy = y + s * reach + c * 5 * side;
        hz = z + 12 + Math.sin(p) * 6 * Math.max(0.3, this.gait);
      }
      // Throwing, the near arm goes up and forward; stabbing, it thrusts straight out, the knife in hand.
      if (side === 1 && this.throwT > 0) {
        const out = this.stabbing ? 10 : 7;
        hx = x + c * out - s * 3;
        hy = y + s * out + c * 3;
        hz = this.stabbing ? z + 13 : z + 21;
      }
      const sx = x - s * 4.2 * side;
      const sy = y + c * 4.2 * side;
      ctx.beginPath();
      ctx.moveTo(px(sx, sy), py(sx, sy, z + 16));
      ctx.lineTo(px(hx, hy), py(hx, hy, hz));
      ctx.stroke();
      if (side === 1 && this.throwT > 0 && this.stabbing) {
        const tx = hx + c * 6;
        const ty = hy + s * 6;
        const a = Math.atan2(py(tx, ty, hz) - py(hx, hy, hz), px(tx, ty) - px(hx, hy));
        drawKnife(ctx, px(hx, hy), py(hx, hy, hz), Z * 0.9, a);
        ctx.strokeStyle = shirt;
        ctx.lineWidth = 2.2 * Z;
      }
    }
    // A spear over the shoulder, between throws.
    if (this.armed && this.throwT <= 0) {
      const sx = x - s * 4.2 - c * 6;
      const sy = y + c * 4.2 - s * 6;
      ctx.strokeStyle = '#8A5A2B';
      ctx.lineWidth = 1.6 * Z;
      ctx.beginPath();
      ctx.moveTo(px(sx, sy), py(sx, sy, z + 4));
      ctx.lineTo(px(sx + c * 14, sy + s * 14), py(sx + c * 14, sy + s * 14, z + 30));
      ctx.stroke();
      ctx.strokeStyle = shirt;
      ctx.lineWidth = 2.2 * Z;
    }
    if (v.dark > 0.2 && !this.diving && crawl <= 0.5) {
      const [hx, hy] = this.hand(-1);
      ctx.fillStyle = '#FFE9A8';
      ctx.fillRect(px(hx, hy) - 1.8 * Z, py(hx, hy, z + 8) - 1.5 * Z, 3.6 * Z, 4 * Z);
    }
    // The head, a face when it looks toward the viewer, and the sou'wester.
    const hx = bx;
    const hy = py(x, y, z + 21);
    const fx = c - s;
    const fy = (c + s) / 2;
    if (suit) {
      // The suit's hood, a dark visor toward where it looks and a filter under it.
      ctx.fillStyle = SUIT;
      ctx.beginPath();
      ctx.arc(hx, hy - 0.4 * Z, 5 * Z, 0, Math.PI * 2);
      ctx.fill();
      if (fy > -0.4) {
        ctx.fillStyle = '#26343A';
        ctx.beginPath();
        ctx.ellipse(hx + fx * 2 * Z, hy - 0.8 * Z, 3.2 * Z, 2 * Z, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(160,220,230,.5)';
        ctx.beginPath();
        ctx.ellipse(hx + fx * 2 * Z - 1 * Z, hy - 1.4 * Z, 1.2 * Z, 0.6 * Z, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3C3C3C';
        ctx.beginPath();
        ctx.arc(hx + fx * 2.6 * Z, hy + 2.4 * Z, 1.5 * Z, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    const look = this.look;
    const helmet = !!arm && arm.helm !== 'none';
    this.drawHairBack(v, hx, hy, fx, fy, look);
    ctx.fillStyle = SKINS[look.skin] ?? (SKINS[1] as string);
    ctx.beginPath();
    ctx.arc(hx, hy, 3.8 * Z, 0, Math.PI * 2);
    ctx.fill();
    if (fy > -0.1) this.drawFace(v, hx, hy, fx, look);
    if (!helmet && !this.diving) this.drawHairTop(v, hx, hy, fx, fy, look);
    if (this.diving) {
      // A brass diving helmet with a round glass port toward where it looks, and bubbles going up.
      ctx.fillStyle = '#C9973A';
      ctx.beginPath();
      ctx.arc(hx, hy - 0.6 * Z, 5.6 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#A87A2A';
      ctx.fillRect(hx - 5.4 * Z, hy + 3.6 * Z, 10.8 * Z, 1.8 * Z);
      if (fy > -0.4) {
        ctx.fillStyle = 'rgba(150,215,225,.85)';
        ctx.beginPath();
        ctx.arc(hx + fx * 2.2 * Z, hy - 0.4 * Z, 2.6 * Z, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#7A5A1E';
        ctx.lineWidth = 0.9 * Z;
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(220,245,255,.7)';
      for (let k = 0; k < 3; k++) {
        const t = (this.now * 0.7 + k / 3) % 1;
        ctx.beginPath();
        ctx.arc(
          hx + Math.sin(this.now * 3 + k * 2) * 2 * Z,
          hy - (7 + t * 26) * Z,
          (1 + t * 1.4) * Z,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      return;
    }
    if (arm && arm.helm === 'space') {
      // Space armour's helmet: a white dome, a dark visor toward where it looks with the sky in it, an antenna.
      ctx.fillStyle = arm.plate;
      ctx.strokeStyle = arm.edge;
      ctx.lineWidth = 0.9 * Z;
      ctx.beginPath();
      ctx.arc(hx, hy - 0.6 * Z, 5.4 * Z, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (fy > -0.4) {
        ctx.fillStyle = '#1C2638';
        ctx.beginPath();
        ctx.ellipse(hx + fx * 1.8 * Z, hy - 0.4 * Z, 3.6 * Z, 2.6 * Z, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = arm.shine;
        ctx.beginPath();
        ctx.ellipse(
          hx + fx * 1.8 * Z - 1.3 * Z,
          hy - 1.3 * Z,
          1.3 * Z,
          0.7 * Z,
          -0.3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.strokeStyle = arm.edge;
      ctx.beginPath();
      ctx.moveTo(hx + 3 * Z, hy - 4.6 * Z);
      ctx.lineTo(hx + 4.4 * Z, hy - 8.6 * Z);
      ctx.stroke();
      ctx.fillStyle = arm.shine;
      ctx.beginPath();
      ctx.arc(hx + 4.4 * Z, hy - 8.6 * Z, 1.1 * Z, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (arm && (arm.helm === 'helm' || arm.helm === 'plume')) {
      // A helmet in the armour's colour: a dome over the head with a rim and a crest, the face showing under it.
      // Honor Guard's has a tall red plume along its top instead, swept back from where it looks.
      ctx.fillStyle = arm.plate;
      ctx.strokeStyle = arm.edge;
      ctx.lineWidth = 0.9 * Z;
      ctx.beginPath();
      ctx.ellipse(hx, hy - 1.6 * Z, 4.6 * Z, 4.2 * Z, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(hx - 4.9 * Z, hy - 1.9 * Z, 9.8 * Z, 1.4 * Z);
      ctx.fillStyle = arm.shine;
      ctx.beginPath();
      ctx.ellipse(hx - 1.6 * Z, hy - 4 * Z, 1.2 * Z, 0.8 * Z, -0.3, 0, Math.PI * 2);
      ctx.fill();
      if (arm.helm === 'plume') {
        const back = -fx;
        ctx.fillStyle = arm.cape ?? '#C42F2A';
        ctx.beginPath();
        ctx.moveTo(hx - 2.6 * Z, hy - 5.2 * Z);
        ctx.quadraticCurveTo(
          hx - 1 * Z + back * 2 * Z,
          hy - 12.5 * Z,
          hx + back * 6.5 * Z,
          hy - 9.5 * Z,
        );
        ctx.quadraticCurveTo(hx + back * 4 * Z, hy - 7 * Z, hx + 2.6 * Z, hy - 5.2 * Z);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 0.7 * Z;
        ctx.beginPath();
        ctx.moveTo(hx - 0.6 * Z, hy - 6 * Z);
        ctx.quadraticCurveTo(hx + back * 1.5 * Z, hy - 10.5 * Z, hx + back * 5.2 * Z, hy - 9.4 * Z);
        ctx.stroke();
        return;
      }
      ctx.strokeStyle = arm.edge;
      ctx.lineWidth = 1.4 * Z;
      ctx.beginPath();
      ctx.moveTo(hx - 2.4 * Z, hy - 5.4 * Z);
      ctx.quadraticCurveTo(hx, hy - 7.4 * Z, hx + 2.4 * Z, hy - 5.4 * Z);
      ctx.stroke();
      return;
    }
    this.drawHat(v, hx, hy, fx, fy, look);
  }

  /** The figure on its own, as the character screen shows it: at its place, facing its way, standing. */
  drawPortrait(v: DrawView): void {
    this.drawParts(v);
  }

  /** Hair that hangs behind the head: long hair down the back, pigtails out at the sides. */
  private drawHairBack(
    v: DrawView,
    hx: number,
    hy: number,
    fx: number,
    fy: number,
    look: Look,
  ): void {
    if (look.hair !== 'long' && look.hair !== 'pigtails') return;
    const { ctx } = v;
    const Z = v.zoom;
    ctx.fillStyle = HAIR_COLOURS[look.hairColour] ?? (HAIR_COLOURS[0] as string);
    if (look.hair === 'long') {
      // Facing us, it falls in two locks beside the face to the shoulders; facing away, down the back.
      if (fy > -0.1) {
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(
            hx + side * 3.5 * Z - fx * 0.6 * Z,
            hy + 1.6 * Z,
            1.9 * Z,
            4.4 * Z,
            side * 0.12,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.ellipse(hx, hy + 2.2 * Z, 4.4 * Z, 6 * Z, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(
        hx + side * 4.6 * Z,
        hy + 1.6 * Z - (fy < 0 ? 0.4 * Z : 0),
        1.8 * Z,
        2.8 * Z,
        side * 0.3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  /** Hair on top of the head, when nothing covers it: a short crop, spikes, or a long fringe. */
  private drawHairTop(
    v: DrawView,
    hx: number,
    hy: number,
    fx: number,
    fy: number,
    look: Look,
  ): void {
    if (look.hair === 'none') return;
    const covered = look.hat === 'souwester' || look.hat === 'fishing' || look.hat === 'cowboy';
    const { ctx } = v;
    const Z = v.zoom;
    const colour = HAIR_COLOURS[look.hairColour] ?? (HAIR_COLOURS[0] as string);
    ctx.fillStyle = colour;
    if (covered) {
      // Under a hat, from behind, the back of the head is all hair below the brim (bare, it read as a blank face
      // looking back, the owner, 2026-10-18); from the front, only a little shows at the sides.
      if (fy <= -0.1) {
        ctx.beginPath();
        ctx.arc(hx, hy - 0.1 * Z, 4 * Z, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(hx + side * 3.3 * Z, hy - 0.4 * Z, 1 * Z, 1.8 * Z, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    // A cap of hair over the top, toward the back when it faces us.
    const back = fy > -0.1 ? 1.1 : 0;
    ctx.beginPath();
    ctx.ellipse(
      hx - fx * 0.4 * Z,
      hy - 1.4 * Z - back * 0.2 * Z,
      4.1 * Z,
      3.1 * Z,
      0,
      Math.PI,
      Math.PI * 2,
    );
    ctx.fill();
    if (fy <= -0.1) {
      ctx.beginPath();
      ctx.arc(hx, hy - 0.1 * Z, 4 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    if (look.hair === 'spiky') {
      for (let i = -2; i <= 2; i++) {
        const bx = hx + i * 1.6 * Z;
        const by = hy - 3.4 * Z + Math.abs(i) * 0.5 * Z;
        ctx.beginPath();
        ctx.moveTo(bx - 1 * Z, by + 0.6 * Z);
        ctx.lineTo(bx + i * 0.5 * Z, by - 3 * Z + Math.abs(i) * 0.6 * Z);
        ctx.lineTo(bx + 1 * Z, by + 0.6 * Z);
        ctx.closePath();
        ctx.fill();
      }
    }
    if ((look.hair === 'long' || look.hair === 'pigtails') && fy > -0.1) {
      // A fringe across the forehead.
      ctx.beginPath();
      ctx.ellipse(hx + fx * 0.6 * Z, hy - 2.2 * Z, 3.4 * Z, 1.2 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** The face, toward where it looks: eyes, and a smile, a grin, freckles or glasses. */
  private drawFace(v: DrawView, hx: number, hy: number, fx: number, look: Look): void {
    const { ctx } = v;
    const Z = v.zoom;
    const ex = (e: number) => hx + (fx * 1.6 + e * 1.4) * Z;
    const ey = hy + 0.6 * Z;
    ctx.fillStyle = '#2A1A08';
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(ex(e), ey, 0.65 * Z, 0, Math.PI * 2);
      ctx.fill();
    }
    const mx = hx + fx * 1.6 * Z;
    if (look.face === 'smile' || look.face === 'grin') {
      ctx.strokeStyle = '#5A2A1A';
      ctx.lineWidth = 0.6 * Z;
      ctx.beginPath();
      ctx.arc(
        mx,
        hy + 1.6 * Z,
        look.face === 'grin' ? 1.6 * Z : 1.1 * Z,
        0.15 * Math.PI,
        0.85 * Math.PI,
      );
      ctx.stroke();
      if (look.face === 'grin') {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(mx, hy + 1.8 * Z, 1.3 * Z, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.fill();
      }
    }
    if (look.face === 'freckles') {
      ctx.fillStyle = 'rgba(150,80,40,.7)';
      for (const e of [-1, 1])
        for (const [dx, dy] of [
          [0, 0],
          [0.7, 0.4],
          [-0.5, 0.5],
        ] as const) {
          ctx.beginPath();
          ctx.arc(ex(e) + (e * 0.4 + dx) * Z, ey + (1.3 + dy) * Z, 0.28 * Z, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    if (look.face === 'glasses') {
      ctx.strokeStyle = '#1E2227';
      ctx.lineWidth = 0.45 * Z;
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(ex(e), ey, 1.15 * Z, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(ex(-1) + 1.15 * Z, ey);
      ctx.lineTo(ex(1) - 1.15 * Z, ey);
      ctx.stroke();
    }
  }

  /** The hat, in its colour: the sou'wester, a cap with its peak where it looks, a fishing hat, a cowboy hat. */
  private drawHat(v: DrawView, hx: number, hy: number, fx: number, fy: number, look: Look): void {
    if (look.hat === 'none') return;
    const { ctx } = v;
    const Z = v.zoom;
    const [hat, brim] =
      HAT_COLOURS[look.hatColour] ?? (HAT_COLOURS[0] as readonly [string, string]);
    if (look.hat === 'souwester') {
      ctx.fillStyle = brim;
      ctx.beginPath();
      ctx.ellipse(hx, hy - 2.2 * Z, 6.2 * Z, 2.6 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hat;
      ctx.beginPath();
      ctx.ellipse(hx, hy - 2.6 * Z, 4 * Z, 3.6 * Z, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (look.hat === 'cap') {
      // The peak sticks out the way it looks: in front of the crown when it faces us, behind it when it faces away.
      const peak = () => {
        ctx.fillStyle = brim;
        ctx.beginPath();
        ctx.ellipse(
          hx + fx * 3.2 * Z,
          hy - 2 * Z + (fy > 0 ? 0.6 * Z : -0.4 * Z),
          3.4 * Z,
          1.3 * Z,
          fx * 0.2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      };
      if (fy <= 0) peak();
      ctx.fillStyle = hat;
      ctx.beginPath();
      ctx.ellipse(hx, hy - 2 * Z, 4.1 * Z, 3.4 * Z, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = brim;
      ctx.beginPath();
      ctx.arc(hx, hy - 5.3 * Z, 0.7 * Z, 0, Math.PI * 2);
      ctx.fill();
      if (fy > 0) peak();
      return;
    }
    if (look.hat === 'fishing') {
      // A soft bucket hat: a sloping brim all round, a rounded crown, a band.
      ctx.fillStyle = brim;
      ctx.beginPath();
      ctx.ellipse(hx, hy - 2 * Z, 5.4 * Z, 2.2 * Z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hat;
      ctx.beginPath();
      ctx.moveTo(hx - 3.6 * Z, hy - 2.2 * Z);
      ctx.quadraticCurveTo(hx - 3.4 * Z, hy - 6.4 * Z, hx, hy - 6.4 * Z);
      ctx.quadraticCurveTo(hx + 3.4 * Z, hy - 6.4 * Z, hx + 3.6 * Z, hy - 2.2 * Z);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.fillRect(hx - 3.6 * Z, hy - 3.4 * Z, 7.2 * Z, 1 * Z);
      return;
    }
    // A cowboy hat: a wide brim turned up at the sides, a tall crown with a dent in its top, a band.
    ctx.fillStyle = brim;
    ctx.beginPath();
    ctx.ellipse(hx, hy - 2.4 * Z, 7.6 * Z, 2.2 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(hx + side * 6.6 * Z, hy - 3.6 * Z, 1.4 * Z, 2 * Z, side * -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = hat;
    ctx.beginPath();
    ctx.moveTo(hx - 3.4 * Z, hy - 2.6 * Z);
    ctx.lineTo(hx - 3 * Z, hy - 7.8 * Z);
    ctx.quadraticCurveTo(hx, hy - 6.6 * Z, hx + 3 * Z, hy - 7.8 * Z);
    ctx.lineTo(hx + 3.4 * Z, hy - 2.6 * Z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(hx - 3.3 * Z, hy - 4 * Z, 6.6 * Z, 1.1 * Z);
  }
}
