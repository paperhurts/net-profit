/**
 * The contract every creature and object grows into. An entity updates itself
 * from what it can see of the world and draws itself when its layer comes up.
 * The scene in render/layers.ts updates every entity in one order and paints
 * each layer through all of them where the frame needs it.
 */

/**
 * Where an entity draws, in the order the frame is painted. underwater: shadows
 * beneath the surface. surface: creatures at the surface, under the wakes and
 * the net. afloat: things floating on the water, over the net. solids:
 * depth-sorted with the boat and the island, through depth(). air: above
 * everything. mask: light punches in the night mask. glow: the glow pass after
 * the mask; set and restore your own composite. overlay: indicators, over the
 * floating text.
 */
export type Layer =
  | 'underwater'
  | 'surface'
  | 'afloat'
  | 'solids'
  | 'air'
  | 'mask'
  | 'glow'
  | 'overlay';

/** What entities may read. Kept small on purpose; add fields as entities need them. */
export type World = {
  /** Game seconds since the page loaded. */
  T: number;
  started: boolean;
  docked: boolean;
  boat: { x: number; y: number; h: number; v: number };
  /** Random numbers, injectable for tests. */
  rng: () => number;
  /** Lifetime coins, which wakes the pirate. */
  earned: number;
  /** Fish in the hold, which tempts it. */
  holdTotal: number;
  /** The boat's hull scale for its tier. */
  hullScale: number;
  /** The towed net: position, speed, and seconds of tear left. */
  net: { x: number; y: number; speed: number; torn: number };
  /** Net width for the current level. */
  netWidth: number;
  /** Net upgrade level; three or better holds a shark. */
  netLevel: number;
  /** Fish the hold can take. */
  holdCap: number;
  /** A dolphin escort is alongside; sharks keep off. */
  escorted: boolean;
  /** How far from the island the boat may sail. */
  range: number;
  /** The boat's tier, which scales what flotsam pays. */
  tier: number;
  /** The net is full of jellyfish; nothing else stays in it. */
  netFouled: boolean;
  /** Palace stages built, which earn pets. */
  build: number;
};

/** What entities may draw with. Screen space comes from the game's projection. */
export type DrawView = {
  ctx: CanvasRenderingContext2D;
  px(x: number, y: number): number;
  py(x: number, y: number, z?: number): number;
  onScreen(x: number, y: number, margin: number): boolean;
  zoom: number;
  /** Game seconds, for animation. */
  T: number;
  /** Night strength, 0..1. */
  dark: number;
  /** Palette entries entities use, by name. */
  foam: string;
  coin: string;
  /** Path an ellipse of world radius r at world x, y (and height z); the caller fills or strokes. */
  isoEllipse(x: number, y: number, r: number, z?: number): void;
  /** Draw a fish of a species at screen x, y with this length, heading and tail wag. */
  fishShape(
    x: number,
    y: number,
    len: number,
    species: import('../data/tuning').Species,
    ang: number,
    wag: number,
  ): void;
  /** Fill an eight-point star at screen x, y. */
  star(x: number, y: number, r: number): void;
  /** A gull at world x, y and height z, wings at this phase, this big, this present. */
  bird(x: number, y: number, z: number, flap: number, scale: number, alpha: number): void;
  /** A solid box on the water: world x, y, footprint w by h, from height z0 to z1, side and top colours. */
  box(
    x: number,
    y: number,
    w: number,
    h: number,
    z0: number,
    z1: number,
    side: string,
    top: string,
  ): void;
  /** A solid with this world footprint, from height z0 to z1, side and top colours. */
  extrude(
    pts: readonly import('../world/island').Point[],
    z0: number,
    z1: number,
    side: string,
    top: string,
  ): void;
  /** Draw a hull with the given look; the prototype's ship renderer until it moves. */
  ship(s: { x: number; y: number; h: number; v: number }, look: import('./ship').ShipLook): void;
  /** Punch a light into the night mask. */
  light(x: number, y: number, z: number, r: number, k: number): void;
  /** A soft radial glow in the glow pass. */
  glow(x: number, y: number, z: number, r: number, color: string): void;
  /** An edge indicator pointing at something off screen. */
  indicator(wx: number, wy: number, bg: string, kind: string, pulse: boolean): void;
};

export interface Entity {
  update(dt: number, world: World): void;
  draw(view: DrawView, layer: Layer): void;
  /** For the sorted solids layer; world x + y by convention. */
  depth?(): number;
}
