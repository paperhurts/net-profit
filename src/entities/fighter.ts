/**
 * The kid's island 3 bosses, on foot: the swordsman in the hall under the
 * tower, and the three little demons he turns into. One kind of fighter, set
 * up four ways.
 *
 * The swordsman is a man in a long red cape with a sword. He comes at the
 * figure nearly as fast as it walks, so running only buys time, and when he is
 * close he raises his sword (the warning) and slashes: step aside while it is
 * up, and throw while he recovers. Keep away from him and every so often he
 * crouches and dashes at where the figure is heading. He blocks the first
 * spear that would hit him, once, and never again.
 *
 * The red demon fights the way he did, smaller. The blue one keeps its
 * distance and calls up two skull-mask monkeys, and two more once those are
 * beaten. The green one does both. They are little: a couple of hits each.
 *
 * It wakes when the figure comes into its room and gives up if the figure
 * leaves. The game does the hearts, the monkeys and the prizes as callbacks.
 */

import { shade } from '../core/color';
import { angDiff, clamp } from '../core/math';
import type { DrawView, Entity, Layer, World } from './entity';
import { walkStep } from './walker';

export type FighterLook = 'swordsman' | 'red' | 'blue' | 'green';

export type FighterSpec = {
  look: FighterLook;
  hp: number;
  /** Walking speed; the figure walks at 85. */
  speed: number;
  /** How far its slash reaches from its middle; 0 for one that does not slash. */
  reach: number;
  /** Blocks the first spear that would hit it, once. */
  block: boolean;
  /** Dashes in when the figure keeps away. */
  dash: boolean;
  /** Keeps about this far off the figure rather than closing in; 0 to close in. */
  keep: number;
  /** Calls up two monkeys, and two more this many seconds after the last pair is beaten; 0 never. */
  summon: number;
  /** Its size against the figure's. */
  scale: number;
  /** How long its sword is up before the slash: the warning. */
  windup: number;
};

export const SWORDSMAN: FighterSpec = {
  look: 'swordsman',
  hp: 12,
  speed: 78,
  reach: 36,
  block: true,
  dash: true,
  keep: 0,
  summon: 0,
  scale: 1.45,
  windup: 0.45,
};
export const RED: FighterSpec = {
  look: 'red',
  hp: 4,
  speed: 58,
  reach: 24,
  block: true,
  dash: false,
  keep: 0,
  summon: 0,
  scale: 0.9,
  windup: 0.55,
};
export const BLUE: FighterSpec = {
  look: 'blue',
  hp: 4,
  speed: 55,
  reach: 0,
  block: false,
  dash: false,
  keep: 110,
  summon: 6,
  scale: 0.9,
  windup: 0.55,
};
export const GREEN: FighterSpec = {
  look: 'green',
  hp: 4,
  speed: 58,
  reach: 24,
  block: true,
  dash: false,
  keep: 0,
  summon: 9,
  scale: 0.9,
  windup: 0.55,
};

/** The sword: swung this long after the warning, then this long open before it moves again. */
export const SWING = 0.2;
export const RECOVER = 0.8;
/** A slash lands on a figure this much past its reach, inside this angle either side of where it faces. */
export const SLASH_SLACK = 6;
export const SLASH_ARC = 1.2;
/**
 * The dash: when the figure keeps further off than this, every so often, a crouch first and then a
 * burst at where it is heading. The first comes soon after he wakes.
 */
export const DASH_FAR = 75;
export const DASH_EVERY = 3;
export const FIRST_DASH = 1.5;
/** How far ahead of the figure the dash aims, in seconds of its walk. */
export const LEAD = 0.35;
export const CROUCH = 0.4;
export const DASH_SPEED = 230;
export const DASH_TIME = 0.45;
/** A summoner's first pair comes this soon after it wakes. */
export const FIRST_SUMMON = 1.2;
/** Seconds it falls once beaten, before the game is told. */
export const FALL = 1.4;

export type FighterState =
  | 'wait'
  | 'walk'
  | 'crouch'
  | 'dash'
  | 'windup'
  | 'swing'
  | 'recover'
  | 'fall'
  | 'gone';

/** Something it summoned, for knowing when the pair is beaten. */
export type Summoned = { state: string };

export class Fighter implements Entity {
  state: FighterState = 'wait';
  hp: number;
  x: number;
  y: number;
  h = Math.PI / 4;
  t = 0;
  /** Its block is still to use. */
  guard: boolean;
  /** Seconds of the hit flash, and of the block's spark. */
  flash = 0;
  blockT = 0;
  private dashCd = FIRST_DASH;
  private summonCd = FIRST_SUMMON;
  private pair: Summoned[] = [];
  private dashTo = { x: 0, y: 0 };
  /** The slash hit the figure. */
  onHit: ((by: 'slash') => void) | null = null;
  /** It blocked a spear. */
  onBlock: (() => void) | null = null;
  /** It has noticed the figure in its room. */
  onWake: (() => void) | null = null;
  /** It is beaten and has fallen. */
  onBeaten: (() => void) | null = null;
  /** It raises its sword, or calls: for a sound. */
  onWindup: (() => void) | null = null;
  /** It calls up monkeys at a point; the game makes them and hands them back. */
  onSummon: ((x: number, y: number) => Summoned[]) | null = null;

  constructor(
    readonly spec: FighterSpec,
    readonly room: { x: number; y: number; r: number },
    readonly start: { x: number; y: number },
  ) {
    this.hp = spec.hp;
    this.guard = spec.block;
    this.x = start.x;
    this.y = start.y;
  }

  /** In the fight: there to be speared. */
  get up(): boolean {
    return this.state !== 'wait' && this.state !== 'fall' && this.state !== 'gone';
  }

  reset(): void {
    this.state = 'wait';
    this.hp = this.spec.hp;
    this.guard = this.spec.block;
    this.x = this.start.x;
    this.y = this.start.y;
    this.h = Math.PI / 4;
    this.t = 0;
    this.flash = 0;
    this.blockT = 0;
    this.dashCd = FIRST_DASH;
    this.summonCd = FIRST_SUMMON;
    this.pair = [];
  }

  /** A spear lands with this power. Returns whether it was blocked. */
  hit(power: number): boolean {
    if (!this.up) return false;
    if (this.guard) {
      this.guard = false;
      this.blockT = 0.5;
      this.onBlock?.();
      return true;
    }
    this.hp = Math.max(0, this.hp - power);
    this.flash = 0.2;
    if (this.hp <= 0) {
      this.state = 'fall';
      this.t = 0;
    } else if (this.state === 'crouch') {
      // Hit as it crouches, it does not go.
      this.state = 'walk';
      this.t = 0;
    }
    return false;
  }

  update(dt: number, w: World): void {
    const f = w.figure;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.blockT = Math.max(0, this.blockT - dt);
    const inRoom =
      f !== null && Math.hypot(f.x - this.room.x, f.y - this.room.y) < this.room.r + 60;
    if (this.state === 'wait') {
      if (inRoom) {
        this.state = 'walk';
        this.t = 0;
        this.onWake?.();
      }
      return;
    }
    if (this.state === 'fall') {
      if (this.t >= FALL) {
        this.state = 'gone';
        this.onBeaten?.();
      }
      return;
    }
    if (this.state === 'gone') return;
    if (!inRoom || !f) {
      this.reset();
      return;
    }
    const dx = f.x - this.x;
    const dy = f.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = this.spec;
    // Calling up monkeys, while its last pair is beaten.
    if (sp.summon > 0) {
      const pairUp = this.pair.some((m) => m.state === 'idle' || m.state === 'chase');
      if (!pairUp) {
        this.summonCd -= dt;
        if (this.summonCd <= 0 && this.onSummon) {
          this.summonCd = sp.summon;
          this.pair = this.onSummon(this.x, this.y);
        }
      }
    }
    this.dashCd -= dt;
    switch (this.state) {
      case 'walk': {
        this.h = Math.atan2(dy, dx);
        if (sp.keep > 0) {
          // Keep off: back away if it is close, come on if it is far, and drift round it between.
          let mx = 0;
          let my = 0;
          if (d < sp.keep * 0.8) {
            mx = -dx / d;
            my = -dy / d;
          } else if (d > sp.keep * 1.25) {
            mx = dx / d;
            my = dy / d;
          } else {
            mx = -dy / d;
            my = dx / d;
          }
          walkStep(this, mx * sp.speed * dt, my * sp.speed * dt, 99);
          break;
        }
        if (sp.dash && d > DASH_FAR && this.dashCd <= 0) {
          this.state = 'crouch';
          this.t = 0;
          break;
        }
        if (d < sp.reach * 0.85) {
          this.state = 'windup';
          this.t = 0;
          this.onWindup?.();
          break;
        }
        walkStep(this, (dx / d) * sp.speed * dt, (dy / d) * sp.speed * dt, 99);
        break;
      }
      case 'crouch':
        this.h = Math.atan2(dy, dx);
        if (this.t >= CROUCH) {
          // Off at where the figure is going: one that turns is not there when it arrives.
          this.dashTo = { x: f.x + f.vx * LEAD, y: f.y + f.vy * LEAD };
          this.state = 'dash';
          this.t = 0;
        }
        break;
      case 'dash': {
        const tx = this.dashTo.x - this.x;
        const ty = this.dashTo.y - this.y;
        const td = Math.hypot(tx, ty);
        const st = Math.min(td, DASH_SPEED * dt);
        if (td > 1) walkStep(this, (tx / td) * st, (ty / td) * st, 99);
        if (this.t >= DASH_TIME || td < 4) {
          this.dashCd = DASH_EVERY;
          this.state = d < sp.reach ? 'windup' : 'walk';
          this.t = 0;
          if (this.state === 'windup') this.onWindup?.();
        }
        break;
      }
      case 'windup':
        if (this.t >= sp.windup) {
          this.state = 'swing';
          this.t = 0;
          const off = Math.abs(angDiff(this.h, Math.atan2(dy, dx)));
          if (d < sp.reach + SLASH_SLACK && off < SLASH_ARC) this.onHit?.('slash');
        }
        break;
      case 'swing':
        if (this.t >= SWING) {
          this.state = 'recover';
          this.t = 0;
        }
        break;
      case 'recover':
        if (this.t >= RECOVER) {
          this.state = 'walk';
          this.t = 0;
        }
        break;
    }
  }

  /** Drawn by the game among the room's sorted actors, not by a layer of its own. */
  draw(_v: DrawView, _layer: Layer): void {}

  /** The fighter itself, at its feet. */
  drawBody(v: DrawView): void {
    if (this.state === 'gone') return;
    const { ctx, px, py, T } = v;
    const k = this.spec.scale * v.zoom;
    const fall = this.state === 'fall' ? clamp(this.t / FALL, 0, 1) : 0;
    const sx = px(this.x, this.y);
    const sy = py(this.x, this.y);
    ctx.globalAlpha = 1 - fall * 0.85;
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    v.isoEllipse(this.x, this.y, 9 * this.spec.scale);
    ctx.fill();
    const look = this.spec.look;
    const hurt = this.flash > 0;
    // Which way it faces on screen: right is +1.
    const c = Math.cos(this.h);
    const s = Math.sin(this.h);
    const face = c - s >= 0 ? 1 : -1;
    const toward = (c + s) / 2 > -0.1;
    const crouch = this.state === 'crouch' ? 4 : 0;
    const bob =
      this.state === 'walk' || this.state === 'dash' ? Math.abs(Math.sin(T * 9)) * 1.2 : 0;
    const base = sy - (bob - crouch * 0.5) * k;
    const body = {
      swordsman: '#2E3346',
      red: '#C8322B',
      blue: '#2F5FC4',
      green: '#2F9A4A',
    }[look];
    const W = (col: string) => (hurt ? '#FFFFFF' : col);
    // A swordsman's cape behind, in the wind of his walk.
    if (look === 'swordsman') {
      const wave = Math.sin(T * 4) * 2 * k;
      ctx.fillStyle = W('#A3202A');
      ctx.beginPath();
      ctx.moveTo(sx - 5 * k, base - 22 * k);
      ctx.lineTo(sx + 5 * k, base - 22 * k);
      ctx.quadraticCurveTo(
        sx + 9 * k - face * 4 * k,
        base - 8 * k,
        sx + 7 * k - face * 6 * k + wave,
        base + 1 * k,
      );
      ctx.lineTo(sx - 8 * k - face * 6 * k + wave, base + 1 * k);
      ctx.quadraticCurveTo(sx - 9 * k - face * 4 * k, base - 8 * k, sx - 5 * k, base - 22 * k);
      ctx.fill();
    } else {
      // A demon's little bat wings and a pointed tail.
      const flap = Math.sin(T * 8) * 2 * k;
      ctx.fillStyle = W(body);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx + side * 3 * k, base - 16 * k);
        ctx.lineTo(sx + side * 14 * k, base - 24 * k - flap);
        ctx.lineTo(sx + side * 11 * k, base - 15 * k);
        ctx.lineTo(sx + side * 13 * k, base - 12 * k - flap * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = W(body);
      ctx.lineWidth = 1.6 * k;
      ctx.beginPath();
      ctx.moveTo(sx - face * 3 * k, base - 6 * k);
      ctx.quadraticCurveTo(
        sx - face * 12 * k,
        base - 4 * k + Math.sin(T * 5) * 2 * k,
        sx - face * 10 * k,
        base - 12 * k,
      );
      ctx.stroke();
      ctx.fillStyle = W(body);
      ctx.beginPath();
      ctx.moveTo(sx - face * 10 * k, base - 12 * k);
      ctx.lineTo(sx - face * 13 * k, base - 14 * k);
      ctx.lineTo(sx - face * 9 * k, base - 15 * k);
      ctx.closePath();
      ctx.fill();
    }
    // Legs.
    ctx.strokeStyle = W(look === 'swordsman' ? '#1E2230' : shade(body, 0.7));
    ctx.lineWidth = 2.6 * k;
    ctx.lineCap = 'round';
    const stride = this.state === 'walk' || this.state === 'dash' ? Math.sin(T * 9) * 3 * k : 0;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx + side * 1.8 * k, base - 9 * k);
      ctx.lineTo(sx + side * 1.8 * k + stride * side, base);
      ctx.stroke();
    }
    // The body.
    ctx.fillStyle = W(body);
    ctx.beginPath();
    ctx.ellipse(sx, base - 14 * k, 5 * k, 6.5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    if (look === 'swordsman') {
      // A belt and a clasp at the throat for the cape.
      ctx.fillStyle = W('#5A3E26');
      ctx.fillRect(sx - 5 * k, base - 12 * k, 10 * k, 1.8 * k);
      ctx.fillStyle = W('#E8C04A');
      ctx.beginPath();
      ctx.arc(sx, base - 19.5 * k, 1.2 * k, 0, Math.PI * 2);
      ctx.fill();
    }
    // The head.
    const hy = base - 24 * k;
    ctx.fillStyle = W(look === 'swordsman' ? '#E8B48A' : body);
    ctx.beginPath();
    ctx.arc(sx, hy, 4.2 * k, 0, Math.PI * 2);
    ctx.fill();
    if (look === 'swordsman') {
      // Dark hair, and eyes when he looks this way.
      ctx.fillStyle = W('#2A1A10');
      ctx.beginPath();
      ctx.arc(sx, hy - 1.2 * k, 4.4 * k, Math.PI, Math.PI * 2);
      ctx.fill();
      if (toward) {
        ctx.fillStyle = '#1A1A1A';
        for (const e of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(sx + face * 1.2 * k + e * 1.4 * k, hy + 0.6 * k, 0.6 * k, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Horns and glowing eyes.
      ctx.fillStyle = W('#F2E6C8');
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx + side * 2 * k, hy - 3 * k);
        ctx.lineTo(sx + side * 4.5 * k, hy - 8 * k);
        ctx.lineTo(sx + side * 4 * k, hy - 2 * k);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#FFE14A';
      for (const e of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sx + face * 1 * k + e * 1.6 * k, hy + 0.2 * k, 0.9 * k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // The sword, or the blue one's staff.
    if (look === 'blue') {
      const glow = 0.6 + 0.4 * Math.sin(T * 5);
      ctx.strokeStyle = W('#6B4A2C');
      ctx.lineWidth = 1.6 * k;
      ctx.beginPath();
      ctx.moveTo(sx + face * 6 * k, base);
      ctx.lineTo(sx + face * 6 * k, base - 26 * k);
      ctx.stroke();
      ctx.fillStyle = `rgba(150,200,255,${glow})`;
      ctx.beginPath();
      ctx.arc(sx + face * 6 * k, base - 28 * k, 2.6 * k, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const hx = sx + face * 6 * k;
      const hyy = base - 13 * k;
      // Raised for the warning, swept down and across in the swing, held across to block.
      let a = -face * 0.5;
      if (this.state === 'windup') a = -face * (1.2 + Math.sin(T * 30) * 0.05);
      else if (this.state === 'swing') a = face * (0.6 + (this.t / SWING) * 1.4);
      else if (this.blockT > 0) a = -face * 1.57;
      const len = 15 * k;
      const ex = hx + Math.sin(a) * len * face;
      const ey = hyy - Math.cos(a) * len;
      ctx.strokeStyle = W('#D9DEE3');
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.moveTo(hx, hyy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = W('#C8A040');
      ctx.lineWidth = 2.4 * k;
      ctx.beginPath();
      ctx.moveTo(hx - 2.5 * k, hyy + 0.5 * k);
      ctx.lineTo(hx + 2.5 * k, hyy - 0.5 * k);
      ctx.stroke();
      if (this.state === 'windup') {
        // A glint at the tip: the warning.
        ctx.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(T * 25)})`;
        ctx.beginPath();
        ctx.arc(ex, ey, 2.4 * k, 0, Math.PI * 2);
        ctx.fill();
      }
      if (this.state === 'swing') {
        // The arc of the swing.
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.lineWidth = 3 * k;
        ctx.beginPath();
        ctx.ellipse(
          sx,
          base - 8 * k,
          this.spec.reach * 0.9 * v.zoom,
          this.spec.reach * 0.45 * v.zoom,
          0,
          face > 0 ? -1.2 : Math.PI - 0.6,
          face > 0 ? 0.6 : Math.PI + 1.2,
        );
        ctx.stroke();
      }
    }
    if (this.blockT > 0) {
      // The block: a spark where the spear met the blade.
      ctx.fillStyle = `rgba(255,240,170,${this.blockT * 2})`;
      const bx = sx + face * 8 * k;
      const by = base - 18 * k;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + T * 4;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a) * 7 * k, by + Math.sin(a) * 7 * k);
        ctx.lineTo(bx + Math.cos(a + 0.3) * 3 * k, by + Math.sin(a + 0.3) * 3 * k);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
