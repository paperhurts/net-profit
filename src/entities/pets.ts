/**
 * The pets, which make the island a place. The kid designs them; the shapes
 * here are stand-ins until his drawings arrive. First, the dog: it comes to
 * live on the pier once the tree platform is built, potters about the
 * planks, and when the pirate sails in it runs to the end of the pier and
 * barks at the horizon, which is the early warning the boat did not have.
 * More pets follow as he draws them, earned by palace stages and rare
 * discoveries.
 */
import { IY, PX0 } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

export type PetKind = 'dog';

export type Pet = {
  kind: PetKind;
  x: number;
  y: number;
  tx: number;
  ty: number;
  /** Facing, in world radians. */
  h: number;
  /** Seconds until the next potter. */
  rest: number;
  /** Seconds of barking left. */
  bark: number;
  /** Gait phase, for the bob. */
  ph: number;
};

/** The palace stage that brings the dog. */
export const DOG_STAGE = 1;
/** The planks the dog keeps to: from the pier root up to the crates, on the deck. */
export const DECK = { x0: PX0 + 8, x1: PX0 + 86, y0: IY - 10, y1: IY + 10, z: 7 } as const;
export const DOG_SPEED = 40;
export const BARK_SECONDS = 4;

export function makeDog(): Pet {
  return { kind: 'dog', x: PX0 + 30, y: IY, tx: PX0 + 30, ty: IY, h: 0, rest: 1, bark: 0, ph: 0 };
}

export class Pets implements Entity {
  readonly pets: Pet[] = [];
  /** A pet has just been earned. The game says so. */
  onEarn: ((kind: PetKind) => void) | null = null;
  /** The dog has started barking at the horizon. The game plays the bark and, now and then, says why. */
  onBark: (() => void) | null = null;
  private boatDepth = 0;

  /** Pets already earned at this stage arrive quietly; later stages announce theirs. */
  constructor(build = 0) {
    if (build >= DOG_STAGE) this.pets.push(makeDog());
  }

  has(kind: PetKind): boolean {
    return this.pets.some((p) => p.kind === kind);
  }

  get dog(): Pet | undefined {
    return this.pets.find((p) => p.kind === 'dog');
  }

  /** Nobody home, as when the game starts over. */
  reset(): void {
    this.pets.length = 0;
  }

  /** Something is out there. The dog, if there is one, runs to the end of the planks and barks. */
  alert(): void {
    const d = this.dog;
    if (!d) return;
    d.bark = BARK_SECONDS;
    d.rest = BARK_SECONDS;
    d.tx = DECK.x1;
    d.ty = IY;
    this.onBark?.();
  }

  update(dt: number, w: World): void {
    this.boatDepth = w.boat.x + w.boat.y;
    if (w.build >= DOG_STAGE && !this.has('dog')) {
      this.pets.push(makeDog());
      this.onEarn?.('dog');
    }
    for (const p of this.pets) {
      p.bark = Math.max(0, p.bark - dt);
      p.rest -= dt;
      if (p.rest <= 0 && p.bark <= 0) {
        p.tx = DECK.x0 + w.rng() * (DECK.x1 - DECK.x0);
        p.ty = DECK.y0 + w.rng() * (DECK.y1 - DECK.y0);
        p.rest = 2 + w.rng() * 5;
      }
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const st = Math.min(d, DOG_SPEED * dt);
        p.x += (dx / d) * st;
        p.y += (dy / d) * st;
        p.h = Math.atan2(dy, dx);
        p.ph += dt * 9;
      } else if (p.bark > 0) p.h = 0;
    }
  }

  /** Just above the pier and the boat, which the pier sorts around. */
  depth(): number {
    return this.boatDepth + 2;
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'solids') return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    for (const p of this.pets) {
      const z = DECK.z;
      const c = Math.cos(p.h);
      const s = Math.sin(p.h);
      const moving = Math.hypot(p.tx - p.x, p.ty - p.y) > 1;
      const bob = moving ? Math.abs(Math.sin(p.ph)) * 1.2 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      v.isoEllipse(p.x, p.y, 7, z);
      ctx.fill();
      ctx.fillStyle = '#8B5E3C';
      v.isoEllipse(p.x, p.y, 6.5, z + 5 + bob);
      ctx.fill();
      const hx = p.x + c * 6;
      const hy = p.y + s * 6;
      v.isoEllipse(hx, hy, 4, z + 8 + bob);
      ctx.fill();
      ctx.fillStyle = '#5E3D1C';
      v.isoEllipse(hx - s * 3, hy + c * 3, 1.6, z + 11 + bob);
      ctx.fill();
      v.isoEllipse(hx + s * 3, hy - c * 3, 1.6, z + 11 + bob);
      ctx.fill();
      const wag = Math.sin(T * (p.bark > 0 ? 18 : 8)) * 4;
      const bx = p.x - c * 6;
      const by = p.y - s * 6;
      ctx.strokeStyle = '#5E3D1C';
      ctx.lineWidth = 2 * Z;
      ctx.beginPath();
      ctx.moveTo(px(bx, by), py(bx, by, z + 7 + bob));
      ctx.lineTo(
        px(bx - c * 4 - s * wag, by - s * 4 + c * wag),
        py(bx - c * 4, by - s * 4, z + 12 + bob),
      );
      ctx.stroke();
      if (p.bark > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.lineWidth = 1.5 * Z;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(px(hx, hy) + (10 + k * 5) * Z, py(hx, hy, z + 9), (3 + k * 2) * Z, -0.6, 0.6);
          ctx.stroke();
        }
      }
    }
  }
}
