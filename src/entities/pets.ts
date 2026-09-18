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
/** The planks the dog keeps to: from the pier root to a body's length short of the crates, on the deck. */
export const DECK = { x0: PX0 + 10, x1: PX0 + 72, y0: IY - 9, y1: IY + 9, z: 7 } as const;
export const DOG_SPEED = 40;
export const BARK_SECONDS = 4;
/** The stand-in dog's colours: a charcoal coat, near-black ears and tail, a pale muzzle, a buoy-red collar. */
const COAT = '#2F3138';
const POINTS = '#15161A';
const MUZZLE = '#B9BCC6';
const COLLAR = '#E4572E';

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
      // Charcoal with a red collar and a pale muzzle, standing on four legs: a brown
      // dog lying flat on tan planks beside the pier's crates read as one more box.
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      v.isoEllipse(p.x, p.y, 10, z);
      ctx.fill();
      ctx.strokeStyle = POINTS;
      ctx.lineWidth = 2.2 * Z;
      for (const [fx, fy] of [
        [5, 2.5],
        [5, -2.5],
        [-5, 2.5],
        [-5, -2.5],
      ] as const) {
        const lx = p.x + c * fx - s * fy;
        const ly = p.y + s * fx + c * fy;
        ctx.beginPath();
        ctx.moveTo(px(lx, ly), py(lx, ly, z));
        ctx.lineTo(px(lx, ly), py(lx, ly, z + 7 + bob));
        ctx.stroke();
      }
      ctx.fillStyle = COAT;
      v.isoEllipse(p.x - c * 3.5, p.y - s * 3.5, 6, z + 9 + bob);
      ctx.fill();
      v.isoEllipse(p.x + c * 3.5, p.y + s * 3.5, 6, z + 10 + bob);
      ctx.fill();
      ctx.fillStyle = COLLAR;
      v.isoEllipse(p.x + c * 7, p.y + s * 7, 2.6, z + 13 + bob);
      ctx.fill();
      const hx = p.x + c * 9.5;
      const hy = p.y + s * 9.5;
      ctx.fillStyle = COAT;
      v.isoEllipse(hx, hy, 4.8, z + 15 + bob);
      ctx.fill();
      ctx.fillStyle = MUZZLE;
      v.isoEllipse(hx + c * 3.6, hy + s * 3.6, 2.3, z + 14 + bob);
      ctx.fill();
      ctx.fillStyle = POINTS;
      v.isoEllipse(hx - s * 3, hy + c * 3, 2.3, z + 17 + bob);
      ctx.fill();
      v.isoEllipse(hx + s * 3, hy - c * 3, 2.3, z + 17 + bob);
      ctx.fill();
      const wag = Math.sin(T * (p.bark > 0 ? 18 : 8)) * 4;
      const bx = p.x - c * 9;
      const by = p.y - s * 9;
      ctx.strokeStyle = POINTS;
      ctx.lineWidth = 2.5 * Z;
      ctx.beginPath();
      ctx.moveTo(px(bx, by), py(bx, by, z + 11 + bob));
      ctx.lineTo(
        px(bx - c * 4 - s * wag, by - s * 4 + c * wag),
        py(bx - c * 4, by - s * 4, z + 19 + bob),
      );
      ctx.stroke();
      if (p.bark > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        ctx.lineWidth = 1.5 * Z;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(px(hx, hy) + (12 + k * 5) * Z, py(hx, hy, z + 15), (3 + k * 2) * Z, -0.6, 0.6);
          ctx.stroke();
        }
      }
    }
  }
}
