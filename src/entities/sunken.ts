/**
 * The day's sunken treasure on the sea floor (world/sunken.ts), once the treasure finder is fitted to the radar: gold
 * blips on the scope, a glint under the water where one lies, and the towed net snagging it as it drags over. The game
 * keeps what a snag pays (the coins, the cue, the toast, the save) as a callback, and which have been found today.
 */

import { SNAG_REACH, type Sunk } from '../world/sunken';
import type { Blipper, DrawView, Entity, Layer, World } from './entity';

export class Sunken implements Entity {
  /** Today's treasure, found or not. */
  list: Sunk[] = [];
  /** Which of today's have been snagged, a bit each. */
  found = 0;
  /** The treasure finder is fitted: they show, and can be snagged. */
  on = false;
  /** The net snagged this one (its index in the day's list). */
  onSnag: ((s: Sunk, i: number) => void) | null = null;

  /** A new day's treasure, with those already found that day. */
  set(list: Sunk[], found: number): void {
    this.list = list;
    this.found = found;
  }

  /** Still on the sea floor. */
  left(i: number): boolean {
    return i < this.list.length && (this.found & (1 << i)) === 0;
  }

  update(_dt: number, w: World): void {
    if (!this.on || !w.started || w.docked) return;
    const reach = w.netWidth * 0.5 + SNAG_REACH;
    this.list.forEach((s, i) => {
      if (!this.left(i)) return;
      if (Math.hypot(s.x - w.net.x, s.y - w.net.y) >= reach) return;
      this.found |= 1 << i;
      this.onSnag?.(s, i);
    });
  }

  /** On the radar, gold, each still down there. */
  radar(blip: Blipper): void {
    if (!this.on) return;
    this.list.forEach((s, i) => {
      if (this.left(i)) blip(s.x, s.y, 'treasure');
    });
  }

  /** A gold glint under the water where each lies, pulsing, so the net can be steered onto it. */
  draw(v: DrawView, layer: Layer): void {
    if (layer !== 'surface' || !this.on) return;
    const { ctx } = v;
    const Z = v.zoom;
    this.list.forEach((s, i) => {
      if (!this.left(i) || !v.onScreen(s.x, s.y, 60 * Z)) return;
      const p = 0.5 + 0.5 * Math.sin(v.T * 3 + i);
      ctx.fillStyle = `rgba(255,200,60,${0.5 + 0.25 * p})`;
      v.isoEllipse(s.x, s.y, 16 + 4 * p);
      ctx.fill();
      // A ring spreading out from it, over and over, like a ripple.
      const k = (v.T * 0.7 + i * 0.37) % 1;
      ctx.strokeStyle = `rgba(255,230,140,${1 - k})`;
      ctx.lineWidth = 2 * Z;
      v.isoEllipse(s.x, s.y, 14 + 26 * k);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,248,210,${0.85 + 0.15 * p})`;
      v.isoEllipse(s.x, s.y, 6);
      ctx.fill();
      // A twinkle now and then.
      const tw = Math.max(0, Math.sin(v.T * 2.2 + i * 2.3)) ** 4;
      if (tw > 0.05) {
        ctx.fillStyle = `rgba(255,252,230,${tw})`;
        v.star(v.px(s.x, s.y) + 7 * Z, v.py(s.x, s.y) - 4 * Z, 5 * Z * tw);
      }
    });
  }
}
