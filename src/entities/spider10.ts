/**
 * The giant spider in island 10's swamp, the kid's: "a spider that can be killed only with bug spray from the prairie's
 * vendor; without it he traps you in his web". He hangs at the hub of his web, strung upright between two cypresses
 * (world/isle10.ts WEB10). When the figure comes near he drops down on a thread and scuttles after it, a little slower
 * than it walks. If he catches it, he wraps it in silk and drags it back into his web, where it hangs, stuck, for a few
 * seconds (a heart gone) while he climbs back up to his hub. Walking into the web sticks the figure too, and wakes him.
 * A spear just bounces off him. Bug spray (the old man's) is the only thing he can't stand: three sprays and he curls
 * up and is gone, and his web hangs torn. Every visit he is back in a whole web.
 */

import type { Point } from '../world/island';
import { WEB10 } from '../world/isle10';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

/** Sprays to beat him. */
export const SPIDER_HP = 3;
/** He drops for the figure this near his web, and gives up on it this far. */
export const SPIDER_WAKE = 100;
export const SPIDER_LEASH = 210;
/** He scuttles at this (the figure walks at 85), and drags at this. */
export const SPIDER_SPEED = 50;
export const DRAG_SPEED = 40;
/** He catches the figure this near. */
export const SPIDER_GRAB = 14;
/** Seconds: down his thread, back up it, flinching from a spray, and curling up. */
export const SPIDER_DROP = 0.6;
export const SPIDER_CLIMB = 0.8;
export const SPIDER_HURT = 0.6;
export const SPIDER_FALL = 1.6;
/** Seconds the figure hangs stuck in his web, and is stuck after walking into it. */
export const WEB_HOLD = 2.5;
export const WEB_STUCK = 1.5;
/** Within this of the line between the trunks is in the web. */
export const WEB_THICK = 5;
/** Sprays reach him from this far. */
export const SPRAY_RANGE = 90;
/** Coins for beating him. */
export const SPIDER_PRIZE = 100;

export type SpiderState =
  | 'web'
  | 'drop'
  | 'chase'
  | 'drag'
  | 'climb'
  | 'back'
  | 'hurt'
  | 'fall'
  | 'gone';

/** Where the web is, and its foot: the ground under the hub. */
export const WEB: { a: Point; b: Point; x: number; y: number; z: number; r: number } = WEB10;

/** How far a point is from the web's strand, the line between its trunks. */
export function offWeb(x: number, y: number): number {
  const [ax, ay] = WEB.a;
  const [bx, by] = WEB.b;
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
}

export class Spider10 implements Entity {
  x = WEB.x;
  y = WEB.y;
  /** How high he is: at his hub, or down on the ground. */
  z = WEB.z;
  h = 0;
  face = 1;
  hp = SPIDER_HP;
  state: SpiderState = 'web';
  t = 0;
  flash = 0;
  /** His legs' scuttle. */
  step = 0;
  /** Seconds before he will drop again. */
  cool = 0;
  /** He dropped for the figure; caught it; has it hanging in his web; was sprayed; was beaten. */
  onDrop: (() => void) | null = null;
  onGrab: (() => void) | null = null;
  onHang: (() => void) | null = null;
  onSprayed: (() => void) | null = null;
  onBeaten: (() => void) | null = null;

  /** Back at his hub in a whole web. */
  reset(): void {
    this.x = WEB.x;
    this.y = WEB.y;
    this.z = WEB.z;
    this.hp = SPIDER_HP;
    this.state = 'web';
    this.t = 0;
    this.flash = 0;
    this.cool = 0;
  }

  /** Out of his web and after the figure, or with it. */
  get awake(): boolean {
    return (
      this.state === 'drop' ||
      this.state === 'chase' ||
      this.state === 'drag' ||
      this.state === 'hurt'
    );
  }

  /** There to be seen and sprayed. */
  get here(): boolean {
    return this.state !== 'fall' && this.state !== 'gone';
  }

  /** Something woke him (the figure walked into his web): down he comes, if he is up there. */
  alert(): void {
    if (this.state === 'web') this.startDrop();
  }

  /** A spray of bug spray: he flinches away, and at none left he curls up. Whether it got him. */
  spray(): boolean {
    if (!this.here) return false;
    this.hp -= 1;
    this.flash = 0.25;
    this.onSprayed?.();
    if (this.hp <= 0) {
      this.state = 'fall';
      this.t = 0;
      this.onBeaten?.();
    } else if (this.state !== 'web' && this.state !== 'climb') {
      this.state = 'hurt';
      this.t = 0;
    } else {
      // Sprayed up in his web: he comes down, angry.
      this.startDrop();
    }
    return true;
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.cool = Math.max(0, this.cool - dt);
    switch (this.state) {
      case 'gone':
        return;
      case 'fall':
        this.z = Math.max(0, this.z - dt * 40);
        if (this.t >= SPIDER_FALL) this.state = 'gone';
        return;
      case 'web':
        this.x = WEB.x;
        this.y = WEB.y;
        this.z = WEB.z + Math.sin(this.t * 1.3) * 0.8;
        if (f && this.cool <= 0 && Math.hypot(f.x - WEB.x, f.y - WEB.y) < SPIDER_WAKE)
          this.startDrop();
        return;
      case 'drop':
        this.z = WEB.z * Math.max(0, 1 - this.t / SPIDER_DROP);
        if (this.t >= SPIDER_DROP) {
          this.state = 'chase';
          this.t = 0;
          this.z = 0;
        }
        return;
      case 'climb':
        this.z = WEB.z * Math.min(1, this.t / SPIDER_CLIMB);
        if (this.t >= SPIDER_CLIMB) {
          this.state = 'web';
          this.t = 0;
        }
        return;
      case 'drag': {
        // Back to the foot of his web with the figure in tow; then up it goes into the web.
        if (this.toward(WEB.x, WEB.y, DRAG_SPEED, dt)) {
          this.state = 'climb';
          this.t = 0;
          this.cool = WEB_HOLD + 2;
          this.onHang?.();
        }
        return;
      }
      case 'back':
        if (this.toward(WEB.x, WEB.y, SPIDER_SPEED, dt)) {
          this.state = 'climb';
          this.t = 0;
        }
        return;
      case 'hurt': {
        // A flinch back from the spray, then on again.
        if (f) {
          const d = Math.hypot(this.x - f.x, this.y - f.y) || 1;
          walkStep(this, ((this.x - f.x) / d) * 30 * dt, ((this.y - f.y) / d) * 30 * dt, 99);
        }
        if (this.t >= SPIDER_HURT) {
          this.state = 'chase';
          this.t = 0;
        }
        return;
      }
      case 'chase': {
        if (!f || Math.hypot(f.x - WEB.x, f.y - WEB.y) > SPIDER_LEASH) {
          this.state = 'back';
          this.t = 0;
          return;
        }
        if (Math.hypot(f.x - this.x, f.y - this.y) < SPIDER_GRAB) {
          this.state = 'drag';
          this.t = 0;
          this.onGrab?.();
          return;
        }
        this.toward(f.x, f.y, SPIDER_SPEED, dt);
        return;
      }
    }
  }

  /** Where the figure is pulled to as he drags it: just behind him, on his way home. */
  get towed(): Point {
    const d = Math.hypot(WEB.x - this.x, WEB.y - this.y) || 1;
    return [this.x - ((WEB.x - this.x) / d) * 10, this.y - ((WEB.y - this.y) / d) * 10];
  }

  private startDrop(): void {
    this.state = 'drop';
    this.t = 0;
    this.x = WEB.x;
    this.y = WEB.y;
    this.onDrop?.();
  }

  /** A scuttle toward (x, y); whether he has got there. */
  private toward(x: number, y: number, speed: number, dt: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 3) return true;
    const s = Math.min(d, speed * dt);
    // Near his web he goes straight, as the trunks either side would turn a step aside.
    if (Math.hypot(this.x - WEB.x, this.y - WEB.y) < 20) {
      this.x += (dx / d) * s;
      this.y += (dy / d) * s;
    } else if (walkStep(this, (dx / d) * s, (dy / d) * s, 99) === 0) {
      this.x += (dx / d) * s;
      this.y += (dy / d) * s;
    }
    this.h = Math.atan2(dy, dx);
    if (Math.abs(dx - dy) > 0.01) this.face = Math.sign(dx - dy);
    this.step += dt * speed * 0.5;
    return false;
  }

  /** The game draws him and his web (render/spider10.ts). */
  draw(_v: DrawView, _layer: Layer): void {}
}
