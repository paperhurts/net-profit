/**
 * The goat cave's sandbox (data/goatcave.ts), side-on: the figure walks and jumps as it does up the treehouse climb,
 * and the fainting goats are little physics bodies. Everything is an upright box (no spinning: a goat going over
 * swaps its standing box for a lying one, drawn tipping), with gravity, landing, and walls, which is all the plan's
 * puzzles need and keeps a phone's frame cheap.
 *
 * Bump into a standing goat, run into it or land on it, and it freezes, then goes over stiff as a plank, away from
 * you, startling any goat standing right where it falls. Lying stiff it is something to stand on, and walking into
 * its side shoves it along the ground, out over an edge as far as it still rests on something. After a while it gets
 * up as if nothing happened. Nothing here can hurt the figure: the fondue pit is a splosh and back to the door, and a
 * goat that falls in climbs out at its own start.
 *
 * The grab button (the owner, 2026-11-07: "Can we pick up goats and throw them and stack them in the cave") picks up
 * the goat in front, held stiff over the figure's head (a standing one faints from the fright, right there in its
 * arms); pressed again while walking it throws it in an arc, and standing still it sets it down just in front, on top
 * of whatever is there, which is how goats are stacked. A goat lies stiff as long as it is held, and the full time
 * again from when it is let go; one at the bottom of a stack stays down until whatever is on it gets off.
 */
import type { CaveRoom, Rock } from '../data/goatcave';

/** The treehouse climb's walk, jump and gravity, so the two feel the same. */
export const WALK = 58;
export const JUMP_V = 160;
export const GRAVITY = 480;
export const COYOTE = 0.1;
export const BUFFER = 0.12;
/** The figure's half width and height. */
export const FIG_HW = 4;
export const FIG_H = 16;
/** A goat's box, standing and lying stiff. */
export const STAND_HW = 7;
export const STAND_H = 11;
export const LIE_HW = 10;
export const LIE_H = 7;
/** How long it freezes before it goes over, how long tipping takes, and how long it lies stiff. */
export const FREEZE_T = 0.22;
export const TIP_T = 0.28;
/** Lying stiff long enough for a child to shove it, climb it and cross it (it was 8, too short, 2026-11-07). */
export const FAINT_T = 14;
/** After getting up, how long before it can be startled again. */
export const CALM_T = 2;
/** Going over, it startles a goat standing this far along the way it falls. */
export const CHAIN_R = 22;
/** How fast a goat ambles, and how fast a shoved one goes. */
export const AMBLE = 10;
export const PUSH = 34;
/** How near the goat to find the figure must come. */
export const FIND_R = 16;
/** How far in front the figure reaches for a goat, and how hard it throws one: across and up. */
export const GRAB_R = 6;
export const THROW_VX = 90;
export const THROW_VY = 120;
/** A goat still flying when the figure jumps into it boinks off the head, up and on its way (the owner's: "Bonk yes"). */
export const BONK_VY = 140;
/** How long the "Bonk!" shows over the head. */
export const BONK_T = 0.8;

export type CaveGoat = {
  x: number;
  y: number;
  /** Flying across, thrown: until it lands or hits something. */
  vx: number;
  vy: number;
  dir: number;
  state: 'amble' | 'pause' | 'startled' | 'faint';
  t: number;
  /** How far over it is, 0 standing to 1 lying, drawn. */
  k: number;
  calm: number;
  /** Where it started, for when it climbs out of the fondue. */
  sx: number;
  sy: number;
  step: number;
  look: number;
};

export type CaveEvent =
  | 'jump'
  | 'land'
  | 'faint'
  | 'push'
  | 'splosh'
  | 'goatsplosh'
  | 'found'
  | 'rise'
  | 'grab'
  | 'throw'
  | 'drop'
  | 'thud'
  | 'bonk';

type Box = { x0: number; x1: number; y0: number; y1: number };

const overlap = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
/** A goat lies stiff (or is going over) and is solid. */
const lying = (g: CaveGoat) => g.state === 'faint';
const standing = (g: CaveGoat) => g.state === 'amble' || g.state === 'pause';

export function goatBox(g: CaveGoat): Box {
  const hw = lying(g) ? LIE_HW : STAND_HW;
  const h = lying(g) ? LIE_H : STAND_H;
  return { x0: g.x - hw, x1: g.x + hw, y0: g.y, y1: g.y + h };
}

export class GoatCave {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  ground = false;
  face = 1;
  goats: CaveGoat[] = [];
  found = false;
  /** The goat held over the figure's head, if any. */
  held: CaveGoat | null = null;
  /** Whether the figure has stood up on the checkpoint's ledge, so a splosh puts it back there. */
  reached = false;
  /** How many times it has gone in the fondue, for the hints. */
  sploshes = 0;
  /** Where the last bonk was, and how long its "Bonk!" still shows. */
  bonk = { x: 0, y: 0, t: 0 };
  t = 0;
  onEvent: (e: CaveEvent) => void = () => {};
  private coyote = 0;
  private buffer = 0;
  private fresh = false;
  private grabbing = false;

  constructor(
    readonly room: CaveRoom,
    private readonly rand: () => number = Math.random,
  ) {
    this.toDoor();
    this.goats = room.goats.map((p, i) => ({
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      dir: i % 2 ? -1 : 1,
      state: 'pause',
      t: 0.5 + rand() * 2,
      k: 0,
      calm: 0,
      sx: p.x,
      sy: p.y,
      step: 0,
      look: i,
    }));
  }

  private toDoor(): void {
    this.x = this.room.door.x;
    this.y = this.room.door.y;
    this.vx = this.vy = 0;
    this.ground = true;
    this.face = 1;
  }

  /** The jump button: buffered a moment, so a press just before landing still jumps. */
  press(): void {
    this.buffer = BUFFER;
    this.fresh = true;
  }

  /** The grab button: pick up the goat in front, or let go of the one held (done on the next step, which knows the arrows). */
  grab(): void {
    this.grabbing = true;
  }

  /** The goat within reach in front of the figure, not one it stands on: the nearest. */
  private reachable(): CaveGoat | null {
    let best: CaveGoat | null = null;
    let bd = Number.POSITIVE_INFINITY;
    for (const g of this.goats) {
      if (g === this.held) continue;
      const b = goatBox(g);
      // Under its feet: standing on it, so not that one.
      if (Math.abs(b.y1 - this.y) < 0.6 && b.x0 < this.x + FIG_HW && b.x1 > this.x - FIG_HW)
        continue;
      const front = this.face > 0 ? b.x0 - (this.x + FIG_HW) : this.x - FIG_HW - b.x1;
      const level = b.y1 > this.y - 2 && b.y0 < this.y + FIG_H;
      if (!level || front > GRAB_R || front < -(b.x1 - b.x0)) continue;
      const d = Math.abs(g.x - this.x);
      if (d < bd) {
        bd = d;
        best = g;
      }
    }
    return best;
  }

  private takeOrLetGo(sx: number): void {
    const h = this.held;
    if (!h) {
      const g = this.reachable();
      if (!g) return;
      // A standing goat faints stiff from the fright of being picked up.
      if (g.state !== 'faint') {
        g.state = 'faint';
        this.onEvent('faint');
      }
      g.k = 1;
      g.vx = g.vy = 0;
      this.held = g;
      this.carry();
      this.onEvent('grab');
      return;
    }
    // Let go: thrown if walking, set down just in front if standing still.
    const out = { x0: 0, x1: 0, y0: 0, y1: 0 };
    const at = (x: number, y: number) => {
      out.x0 = x - LIE_HW;
      out.x1 = x + LIE_HW;
      out.y0 = y;
      out.y1 = y + LIE_H;
      return !this.blocked(out, h) && !overlap(out, this.figBox());
    };
    if (sx) {
      if (!at(h.x, h.y)) return;
      h.vx = this.face * THROW_VX;
      h.vy = THROW_VY;
      this.onEvent('throw');
    } else {
      // In front at the figure's feet; something there, then on top of it, as high as a stack might be.
      const x = this.x + this.face * (FIG_HW + LIE_HW + 0.5);
      let y = this.y;
      while (y < this.y + 40 && !at(x, y)) y += 1;
      if (!at(x, y)) return;
      h.x = x;
      h.y = y;
      h.vx = 0;
      h.vy = 0;
      this.onEvent('drop');
    }
    // Already over, so the full stiff time from now, not the tipping.
    h.state = 'faint';
    h.t = FAINT_T;
    h.k = 1;
    this.held = null;
  }

  /** The held goat rides over the figure's head. */
  private carry(): void {
    const h = this.held;
    if (!h) return;
    h.x = this.x;
    h.y = this.y + FIG_H + 0.5;
  }

  private figBox(x = this.x, y = this.y): Box {
    return { x0: x - FIG_HW, x1: x + FIG_HW, y0: y, y1: y + FIG_H };
  }

  /**
   * Whether a box hits rock, or a lying goat other than the one given; for the figure, standing goats too, since
   * bumping into one is how it is startled.
   */
  private blocked(b: Box, not: CaveGoat | null = null, fig = false): boolean {
    if (this.room.rock.some((r: Rock) => overlap(b, r))) return true;
    const now = fig ? this.figBox() : null;
    return this.goats.some(
      (g) =>
        g !== not &&
        g !== this.held &&
        (lying(g) || (fig && g.state !== 'faint')) &&
        overlap(b, goatBox(g)) &&
        // One that came down on top of the figure, it walks out of rather than being stuck in.
        !(now && overlap(now, goatBox(g))),
    );
  }

  /** Startle a goat: it freezes, then goes over away from where the fright came from. */
  startle(g: CaveGoat, fromX: number, after = FREEZE_T): void {
    if (!standing(g) || g.calm > 0) return;
    g.state = 'startled';
    g.t = after;
    g.dir = g.x >= fromX ? 1 : -1;
  }

  step(dt: number, sx: number): void {
    this.t += dt;
    this.bonk.t = Math.max(0, this.bonk.t - dt);
    this.stepFigure(dt, sx);
    if (this.grabbing) {
      this.grabbing = false;
      this.takeOrLetGo(sx);
    }
    this.carry();
    for (const g of this.goats) if (g !== this.held) this.stepGoat(g, dt);
    // The goat to find.
    const f = this.room.find;
    if (!this.found && Math.abs(this.x - f.x) < FIND_R && Math.abs(this.y - f.y) < 10) {
      this.found = true;
      this.onEvent('found');
    }
  }

  private stepFigure(dt: number, sx: number): void {
    const want = Math.sign(sx);
    if (want) this.face = want;
    this.vx = want * WALK;
    this.coyote = this.ground ? COYOTE : Math.max(0, this.coyote - dt);
    // A press this very frame keeps its whole grace: one slow frame (a busy phone) must not eat the jump.
    if (this.fresh) this.fresh = false;
    else this.buffer = Math.max(0, this.buffer - dt);
    if (this.buffer > 0 && this.coyote > 0) {
      this.vy = JUMP_V;
      this.ground = false;
      this.coyote = this.buffer = 0;
      this.onEvent('jump');
    }
    // Across: into a lying goat's side, shove it, a little slower than walking.
    let dx = want * WALK * dt;
    if (dx) {
      const nb = this.figBox(this.x + dx, this.y);
      const hit = this.goats.find((g) => g !== this.held && lying(g) && overlap(nb, goatBox(g)));
      if (hit && this.y < goatBox(hit).y1 - 1) {
        const push = Math.sign(dx) * PUSH * dt;
        const moved = { ...goatBox(hit), x0: goatBox(hit).x0 + push, x1: goatBox(hit).x1 + push };
        if (!this.blocked(moved, hit) && this.restsOn(moved, hit)) {
          hit.x += push;
          dx = push;
          this.onEvent('push');
        } else dx = 0;
      }
      if (dx) {
        const ahead = this.figBox(this.x + dx, this.y);
        // Bumped into a standing goat: the figure stops, and over it goes.
        const bumped = this.goats.find(
          (g) => g !== this.held && !lying(g) && overlap(ahead, goatBox(g)),
        );
        if (bumped) this.startle(bumped, this.x);
        if (!this.blocked(ahead, null, true)) this.x += dx;
      }
    }
    // Up and down.
    this.vy -= GRAVITY * dt;
    const dy = this.vy * dt;
    const nb = this.figBox(this.x, this.y + dy);
    // Up into a goat still flying (thrown a moment ago): it boinks off the head and sails on, and the jump goes on.
    if (dy > 0) {
      const now = this.figBox();
      for (const g of this.goats) {
        if (g === this.held || !lying(g) || (!g.vx && !g.vy)) continue;
        const gb = goatBox(g);
        if (!overlap(nb, gb) || overlap(now, gb)) continue;
        g.y = nb.y1 + 0.5;
        g.vy = Math.max(g.vy, BONK_VY);
        if (!g.vx) g.vx = this.face * THROW_VX * 0.5;
        this.bonk = { x: this.x, y: nb.y1, t: BONK_T };
        this.onEvent('bonk');
      }
    }
    const wasGround = this.ground;
    this.ground = false;
    if (this.blocked(nb, null, true)) {
      if (dy < 0) {
        // Down onto the highest thing under the feet; a standing goat landed on is startled.
        for (const g of this.goats)
          if (!lying(g) && overlap(nb, goatBox(g))) this.startle(g, this.x);
        this.y = this.topUnder(this.figBox(), this.y + dy, null, true);
        this.ground = true;
        if (!wasGround) this.onEvent('land');
      }
      this.vy = 0;
    } else this.y += dy;
    // Standing up on the high ledge, anywhere before the pit: from now on a splosh comes back up here.
    const cp = this.room.checkpoint;
    const p = this.room.pit;
    if (this.ground && this.y >= cp.y - 0.5 && this.x < (p ? p.x0 : Number.POSITIVE_INFINITY))
      this.reached = true;
    // The fondue.
    if (p && this.x > p.x0 && this.x < p.x1 && this.y < p.y1) {
      this.sploshes++;
      this.onEvent('splosh');
      this.toDoor();
      if (this.reached) {
        this.x = cp.x;
        this.y = cp.y;
        // A goat standing (or lying) there: up on top of it instead of inside it.
        for (const g of this.goats) {
          const gb = goatBox(g);
          if (overlap(this.figBox(), gb)) this.y = gb.y1;
        }
      }
    }
  }

  /** The top of whatever a box falling to y would land on: the highest rock or lying goat under it. */
  private topUnder(b: Box, y: number, not: CaveGoat | null = null, fig = false): number {
    let top = y;
    const under = { ...b, y0: y, y1: b.y0 + 0.01 };
    for (const r of this.room.rock) if (overlap(under, r)) top = Math.max(top, r.y1);
    for (const g of this.goats)
      if (g !== not && g !== this.held && (lying(g) || (fig && g.state !== 'faint'))) {
        const gb = goatBox(g);
        if (overlap(under, gb)) top = Math.max(top, gb.y1);
      }
    return top;
  }

  /** Whether a box has something under it to rest on, rock or a lying goat. */
  private restsOn(b: Box, not: CaveGoat | null): boolean {
    const below = { ...b, y0: b.y0 - 0.5, y1: b.y0 };
    return this.blocked(below, not);
  }

  private stepGoat(g: CaveGoat, dt: number): void {
    g.calm = Math.max(0, g.calm - dt);
    // Thrown: across until it hits something, startling any standing goat it flies into.
    if (g.vx) {
      const b = goatBox(g);
      const nx = g.x + g.vx * dt;
      const nb = { ...b, x0: b.x0 + g.vx * dt, x1: b.x1 + g.vx * dt };
      if (this.blocked(nb, g)) {
        g.vx = 0;
        this.onEvent('thud');
      } else g.x = nx;
      for (const o of this.goats)
        if (o !== g && standing(o) && overlap(goatBox(g), goatBox(o)))
          this.startle(o, g.x - g.vx, 0.05);
    }
    // Falling (or flying up, thrown), standing or lying.
    const b = goatBox(g);
    if (g.vy > 0 || !this.restsOn(b, g)) {
      g.vy -= GRAVITY * dt;
      const ny = g.y + g.vy * dt;
      const nb = { ...b, y0: ny, y1: ny + (b.y1 - b.y0) };
      if (this.blocked(nb, g)) {
        if (g.vy < 0) {
          g.y = this.topUnder(b, ny, g);
          if (g.vx) this.onEvent('thud');
          g.vx = 0;
        }
        g.vy = 0;
      } else g.y = ny;
    } else {
      g.vy = 0;
      g.vx = 0;
    }
    const p = this.room.pit;
    if (p && g.x > p.x0 && g.x < p.x1 && g.y < p.y1) {
      this.onEvent('goatsplosh');
      g.x = g.sx;
      g.y = g.sy;
      g.vx = 0;
      g.vy = 0;
      g.state = 'pause';
      g.k = 0;
      g.t = 1;
      g.calm = CALM_T;
      return;
    }
    switch (g.state) {
      case 'pause':
        g.t -= dt;
        if (g.t <= 0) {
          g.state = 'amble';
          g.t = 1.5 + this.rand() * 3;
          if (this.rand() < 0.5) g.dir = -g.dir;
        }
        break;
      case 'amble': {
        g.t -= dt;
        g.step += dt * 8;
        const nx = g.x + g.dir * AMBLE * dt;
        const nb = { ...b, x0: nx - STAND_HW, x1: nx + STAND_HW };
        // Turn at a wall, a lying goat, or the edge of what it stands on.
        const ahead = {
          x0: nx + g.dir * STAND_HW - 1,
          x1: nx + g.dir * STAND_HW + 1,
          y0: g.y - 2,
          y1: g.y,
        };
        if (this.blocked(nb, g) || !this.blocked(ahead, g)) g.dir = -g.dir;
        else g.x = nx;
        if (g.t <= 0) {
          g.state = 'pause';
          g.t = 1 + this.rand() * 3;
        }
        break;
      }
      case 'startled':
        g.t -= dt;
        if (g.t <= 0) this.goOver(g);
        break;
      case 'faint': {
        g.t -= dt;
        const gone = TIP_T + FAINT_T - g.t;
        g.k = Math.min(1, gone / TIP_T);
        if (g.t <= 0) this.getUp(g);
        break;
      }
    }
  }

  /** Over it goes, lying stiff the way it was going, and it startles a goat standing right where it falls. */
  private goOver(g: CaveGoat): void {
    // The lying box is wider: shift it the way it falls, as far as there is room.
    let shift = (LIE_HW - STAND_HW) * g.dir;
    const fits = (x: number) => {
      const b = { x0: x - LIE_HW, x1: x + LIE_HW, y0: g.y, y1: g.y + LIE_H };
      return !this.blocked(b, g) && !overlap(b, this.figBox());
    };
    while (Math.abs(shift) > 0 && !fits(g.x + shift)) shift -= Math.sign(shift);
    // No room just there (a thrown goat landed on it, say): the nearest room either side, then on top of what is there.
    for (let d = 1; d <= 2 * LIE_HW && !fits(g.x + shift); d++) {
      if (fits(g.x + d * g.dir)) shift = d * g.dir;
      else if (fits(g.x - d * g.dir)) shift = -d * g.dir;
    }
    if (!fits(g.x + shift)) {
      const top = this.topUnder(
        { x0: g.x - LIE_HW, x1: g.x + LIE_HW, y0: g.y + 40, y1: g.y + 41 },
        g.y,
        g,
      );
      if (top > g.y && top - g.y <= LIE_H + 0.5) {
        g.y = top;
        shift = 0;
      }
    }
    if (!fits(g.x + shift)) {
      // No room to lie down here (squeezed between things): it just stays frozen a moment longer.
      g.t = 0.3;
      return;
    }
    g.x += shift;
    g.state = 'faint';
    g.t = TIP_T + FAINT_T;
    g.k = 0;
    this.onEvent('faint');
    for (const o of this.goats)
      if (o !== g && standing(o) && o.calm <= 0) {
        const ahead = (o.x - g.x) * g.dir;
        if (ahead > 0 && ahead < CHAIN_R + LIE_HW && Math.abs(o.y - g.y) < 6)
          this.startle(o, g.x, 0.16);
      }
  }

  /** Up again, if there is room to stand; the figure on it is lifted with it. */
  private getUp(g: CaveGoat): void {
    const stand = { x0: g.x - STAND_HW, x1: g.x + STAND_HW, y0: g.y, y1: g.y + STAND_H };
    const fb = this.figBox();
    const onIt =
      this.ground && Math.abs(this.y - (g.y + LIE_H)) < 0.5 && fb.x1 > stand.x0 && fb.x0 < stand.x1;
    if (
      this.blocked(stand, g) ||
      this.goats.some((o) => o !== g && o !== this.held && o.y > g.y && overlap(stand, goatBox(o)))
    ) {
      g.t = 0.5;
      return;
    }
    g.state = 'pause';
    g.k = 0;
    g.t = 1 + this.rand() * 2;
    g.calm = CALM_T;
    if (onIt) this.y = g.y + STAND_H;
    this.onEvent('rise');
  }
}
