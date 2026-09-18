/**
 * The scene: every entity in one list, in one order. The game updates them
 * all with one call and paints each layer with one call where the frame
 * needs it, instead of naming each creature in the hand-ordered draw list
 * the prototype had. Within a layer, entities draw in the order they were
 * added, so the registration order is the z-order. The solids layer is the
 * exception: it is depth-sorted together with the game's own solids, so the
 * scene hands back one item per entity that has a depth.
 */
import type { DrawView, Entity, Layer, World } from '../entities/entity';

/** Every layer, in the order the frame is painted. */
export const LAYERS: readonly Layer[] = [
  'underwater',
  'surface',
  'afloat',
  'solids',
  'air',
  'mask',
  'glow',
  'overlay',
];

/** One depth-sorted thing to draw: world x + y, and how. */
export type Solid = { d: number; f: () => void };

export class Scene {
  readonly entities: Entity[] = [];

  /** Add an entity at the back of the order and hand it back, so a declaration can read naturally. */
  add<E extends Entity>(e: E): E {
    this.entities.push(e);
    return e;
  }

  update(dt: number, world: World): void {
    for (const e of this.entities) e.update(dt, world);
  }

  /** Paint one layer. Entities not on it return at once. */
  draw(view: DrawView, layer: Layer): void {
    for (const e of this.entities) e.draw(view, layer);
  }

  /** What the scene contributes to the depth-sorted solids: one item per entity with a depth. */
  solids(view: DrawView): Solid[] {
    const out: Solid[] = [];
    for (const e of this.entities) {
      if (!e.depth) continue;
      out.push({ d: e.depth(), f: () => e.draw(view, 'solids') });
    }
    return out;
  }
}
