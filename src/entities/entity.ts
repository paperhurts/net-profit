/**
 * The contract every creature and object grows into. An entity updates itself
 * from what it can see of the world and draws itself when its layer comes up.
 * Layers replace the prototype's hand-ordered draw list one entity at a time.
 */

export type Layer = 'underwater' | 'surface' | 'solids' | 'air' | 'mask' | 'glow' | 'overlay';

/** What entities may read. Kept small on purpose; add fields as entities need them. */
export type World = {
  /** Game seconds since the page loaded. */
  T: number;
  started: boolean;
  docked: boolean;
  boat: { x: number; y: number; h: number; v: number };
  /** Random numbers, injectable for tests. */
  rng: () => number;
};

/** What entities may draw with. Screen space comes from the game's projection. */
export type DrawView = {
  ctx: CanvasRenderingContext2D;
  px(x: number, y: number): number;
  py(x: number, y: number, z?: number): number;
  onScreen(x: number, y: number, margin: number): boolean;
  zoom: number;
  /** Palette entries entities use, by name. */
  foam: string;
};

export interface Entity {
  update(dt: number, world: World): void;
  draw(view: DrawView, layer: Layer): void;
  /** For the sorted solids layer; world x + y by convention. */
  depth?(): number;
}
