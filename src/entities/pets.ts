/**
 * The pets, which make the island a place. The kid designs them; the shapes
 * here are stand-ins until his drawings arrive. First, the dog: it comes to
 * live on the pier once the tree platform is built, potters about the
 * planks, and when the pirate sails in it runs to the end of the pier and
 * barks at the horizon, which is the early warning the boat did not have.
 * Step ashore and it comes to say hello and follows at heel, along the way the
 * figure walked so nothing on the island can strand it; tap it to pet it.
 * More pets follow as he draws them, earned by palace stages and rare
 * discoveries.
 */
import { IY, PX0 } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';
import { groundZ, onPier, walkerDepth, walkStep } from './walker';

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
  /** Height of what it stands on: the planks, the sand or the bridge. */
  z: number;
  /** Seconds of hearts and a hard wag left after a pat. */
  love: number;
  /** Sitting by the figure, ashore. */
  sit: boolean;
};

/** The palace stage that brings the dog. */
export const DOG_STAGE = 1;
/** The planks the dog keeps to: from the pier root to a body's length short of the crates, on the deck. */
export const DECK = { x0: PX0 + 10, x1: PX0 + 72, y0: IY - 9, y1: IY + 9, z: 7 } as const;
export const DOG_SPEED = 40;
export const BARK_SECONDS = 4;
/** Ashore: how close the dog sits by the figure, how fast it trots to catch up, and how near a pat reaches. */
export const HEEL = 18;
export const TROT = 110;
export const PET_REACH = 40;
/** Seconds of hearts after a pat. */
export const LOVE_SECONDS = 1.6;
/** The figure's way is remembered every this far, as far back as this many steps. */
const CRUMB = 6;
const MAX_CRUMBS = 90;
/** Off the planks this long with nobody ashore, it is put back on them: it never strands anywhere. */
const HOME_BY = 8;
/** The stand-in dog's colours: a charcoal coat, near-black ears and tail, a pale muzzle, a buoy-red collar. */
const COAT = '#2F3138';
const POINTS = '#15161A';
const MUZZLE = '#B9BCC6';
const COLLAR = '#E4572E';

export function makeDog(): Pet {
  return {
    kind: 'dog',
    x: PX0 + 30,
    y: IY,
    tx: PX0 + 30,
    ty: IY,
    h: 0,
    rest: 1,
    bark: 0,
    ph: 0,
    z: DECK.z,
    love: 0,
    sit: false,
  };
}

export class Pets implements Entity {
  readonly pets: Pet[] = [];
  /** A pet has just been earned. The game says so. */
  onEarn: ((kind: PetKind) => void) | null = null;
  /** The dog has started barking at the horizon. The game plays the bark and, now and then, says why. */
  onBark: (() => void) | null = null;
  /** The dog has come to sit by the figure, once each time ashore. */
  onGreet: (() => void) | null = null;
  /** The dog has been patted. */
  onPet: (() => void) | null = null;
  /** Show a heart over the dog while it sits by the figure: nobody has patted it yet. */
  hint = false;
  private boatDepth = 0;
  private pierD = 0;
  private build = 0;
  /** Where the figure has walked since it came ashore, oldest first. */
  private readonly trail: { x: number; y: number }[] = [];
  private ashore = false;
  private greeted = false;
  private away = 0;

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
    // Ashore it barks where it stands, by the figure.
    if (!this.ashore) {
      d.tx = DECK.x1;
      d.ty = IY;
    }
    this.onBark?.();
  }

  /** A pat, from the game when the dog is tapped with the figure near. */
  pet(): boolean {
    const d = this.dog;
    if (!d) return false;
    d.love = LOVE_SECONDS;
    this.onPet?.();
    return true;
  }

  update(dt: number, w: World): void {
    this.boatDepth = w.boat.x + w.boat.y;
    this.pierD = this.boatDepth + (w.boat.y < IY ? 1 : -1);
    this.build = w.build;
    if (w.build >= DOG_STAGE && !this.has('dog')) {
      this.pets.push(makeDog());
      this.onEarn?.('dog');
    }
    const a = w.ashore;
    if (!!a !== this.ashore) {
      this.ashore = !!a;
      this.trail.length = 0;
      this.greeted = false;
      this.away = 0;
      for (const p of this.pets) {
        p.rest = 0;
        p.sit = false;
      }
    }
    if (a) {
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(a.x - last.x, a.y - last.y) >= CRUMB) {
        this.trail.push({ x: a.x, y: a.y });
        if (this.trail.length > MAX_CRUMBS) this.trail.shift();
      }
    }
    for (const p of this.pets) {
      p.bark = Math.max(0, p.bark - dt);
      p.love = Math.max(0, p.love - dt);
      if (a) this.heel(p, a, dt, w.build);
      else this.potter(p, dt, w);
      p.z = groundZ(p.x, p.y);
    }
  }

  /** Ashore: follow the way the figure walked and sit by it, facing it, or the horizon while barking. */
  private heel(p: Pet, a: { x: number; y: number }, dt: number, build: number): void {
    const d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d <= HEEL || p.bark > 0) {
      p.h = p.bark > 0 ? 0 : Math.atan2(a.y - p.y, a.x - p.x);
      p.tx = p.x;
      p.ty = p.y;
      p.sit = p.bark <= 0;
      if (!this.greeted && d <= HEEL) {
        this.greeted = true;
        this.onGreet?.();
      }
      return;
    }
    p.sit = false;
    // Pick up the trail at the newest step it is standing on, so a figure that doubles back is met.
    for (let i = this.trail.length - 1; i > 0; i--) {
      const c = this.trail[i] as { x: number; y: number };
      if (Math.hypot(c.x - p.x, c.y - p.y) < 10) {
        this.trail.splice(0, i);
        break;
      }
    }
    while (this.trail.length > 1) {
      const c = this.trail[0] as { x: number; y: number };
      if (Math.hypot(c.x - p.x, c.y - p.y) >= 5) break;
      this.trail.shift();
    }
    const t = this.trail[0] ?? a;
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const dl = Math.hypot(dx, dy);
    p.tx = t.x;
    p.ty = t.y;
    if (dl < 0.5) return;
    const sp = Math.min(TROT, 30 + (d - HEEL) * 4);
    const moved = walkStep(p, (dx / dl) * sp * dt, (dy / dl) * sp * dt, build);
    p.h = Math.atan2(dy, dx);
    p.ph += moved * (9 / DOG_SPEED);
  }

  /** Aboard, or nobody home: potter about the planks, finding the way back to them first if it has been ashore. */
  private potter(p: Pet, dt: number, w: World): void {
    p.sit = false;
    const deck =
      p.x >= DECK.x0 - 1 && p.x <= DECK.x1 + 1 && p.y >= DECK.y0 - 1 && p.y <= DECK.y1 + 1;
    this.away = deck ? 0 : this.away + dt;
    if (this.away > HOME_BY) {
      p.x = DECK.x0;
      p.y = IY;
      this.away = 0;
    }
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
      if (deck) {
        const st = Math.min(d, DOG_SPEED * dt);
        p.x += (dx / d) * st;
        p.y += (dy / d) * st;
      } else {
        const st = Math.min(d, TROT * 0.7 * dt);
        walkStep(p, (dx / d) * st, (dy / d) * st, w.build);
      }
      p.h = Math.atan2(dy, dx);
      p.ph += dt * 9;
    } else if (p.bark > 0) p.h = 0;
  }

  /** On the planks, just above the pier and the boat, which the pier sorts around; ashore, among the solids. */
  depth(): number {
    const d = this.dog;
    if (!d || onPier(d.x, d.y)) return this.boatDepth + 2;
    return walkerDepth(d.x, d.y, this.build, this.pierD, null);
  }

  draw(v: DrawView, layer: Layer): void {
    if (layer === 'air') {
      this.drawHearts(v);
      return;
    }
    if (layer !== 'solids') return;
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    for (const p of this.pets) {
      const z = p.z;
      // Sitting by the figure, its hindquarters drop.
      const rear = p.sit ? 4 : 0;
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
        ctx.lineTo(px(lx, ly), py(lx, ly, z + 7 + bob - (fx < 0 ? rear : 0)));
        ctx.stroke();
      }
      ctx.fillStyle = COAT;
      v.isoEllipse(p.x - c * 3.5, p.y - s * 3.5, 6, z + 9 + bob - rear);
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
      const wag = Math.sin(T * (p.bark > 0 ? 18 : p.love > 0 ? 24 : p.sit ? 12 : 8)) * 4;
      const bx = p.x - c * 9;
      const by = p.y - s * 9;
      ctx.strokeStyle = POINTS;
      ctx.lineWidth = 2.5 * Z;
      ctx.beginPath();
      ctx.moveTo(px(bx, by), py(bx, by, z + 11 + bob - rear));
      ctx.lineTo(
        px(bx - c * 4 - s * wag, by - s * 4 + c * wag),
        py(bx - c * 4, by - s * 4, z + 19 + bob - rear),
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

  /** Hearts rising off a patted dog; a faint one over a dog nobody has patted yet, sitting by the figure. */
  private drawHearts(v: DrawView): void {
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const heart = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y + r * 0.9);
      ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.5, x, y - r * 0.5);
      ctx.bezierCurveTo(x + r * 0.7, y - r * 1.5, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
      ctx.fill();
    };
    for (const p of this.pets) {
      const hx = p.x + Math.cos(p.h) * 9.5;
      const hy = p.y + Math.sin(p.h) * 9.5;
      ctx.fillStyle = '#FF6F8E';
      if (p.love > 0) {
        const k = 1 - p.love / LOVE_SECONDS;
        for (let i = 0; i < 3; i++) {
          const t = k * 1.4 - i * 0.25;
          if (t <= 0 || t >= 1) continue;
          ctx.globalAlpha = 1 - t;
          heart(px(hx, hy) + (i - 1) * 7 * Z, py(hx, hy, p.z + 24 + t * 28), (3.4 + i * 0.6) * Z);
        }
      } else if (this.hint && p.sit) {
        ctx.globalAlpha = 0.55 + 0.3 * Math.sin(T * 4);
        heart(px(hx, hy), py(hx, hy, p.z + 27), 3.6 * Z);
      }
    }
    ctx.globalAlpha = 1;
  }
}
