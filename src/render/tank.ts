/**
 * Inside the aquarium: the kid's "way to play with your fish". The tank seen
 * side on, sand and pebbles on the bottom, sea grass and kelp, a treasure chest
 * that lets out bubbles, light coming down through the water, and a fish of
 * every kind caught so far (a few of the little ones). They wander, each at its
 * own depth. Tap the water and food falls from the top for them to chase; hold
 * a finger in the tank and they all come to it and follow it about; tap a fish
 * and its name shows (and the pufferfish puffs up). Nothing here costs or pays:
 * it is somewhere to keep what you caught.
 */
import { rgba, shade } from '../core/color';
import { clamp, rng } from '../core/math';
import type { Species } from '../data/tuning';
import { drawSideCrab } from './crab';

/** The tank's width in its own units; its height follows the screen. */
export const TANK_W = 300;
/** The water's surface and the top of the sand, as shares of the tank's height. */
export const SURFACE = 0.05;
export const SAND = 0.86;
/** How long a fish's name shows once it is tapped, and how long a pufferfish stays puffed. */
export const LABEL_T = 2.4;
export const PUFF_T = 2.6;
/** Flakes from one tap of the water, how fast they sink, and how long they lie on the sand. */
export const PINCH = 5;
export const SINK = 11;
export const LIE = 8;
/** Seconds a fish leaves food alone once it has eaten. */
export const FULL_T = 0.9;

export type Shape =
  | 'fish'
  | 'puffer'
  | 'shark'
  | 'ray'
  | 'marlin'
  | 'mahi'
  | 'koi'
  | 'lion'
  | 'snook'
  | 'tuna'
  | 'grouper'
  | 'parrot'
  | 'crab'
  | 'squid'
  | 'dragon';

/** How one kind looks side on, and where in the water it likes to be. */
export type Look = {
  id: string;
  name: string;
  shape: Shape;
  c: string;
  belly: string;
  mark?: string;
  spots?: boolean;
  /** Body length in tank units, height as a share of it, and the tail's size. */
  len: number;
  fat: number;
  tail: number;
  glow?: boolean;
  /** The colour it glows, where that is not its body's. */
  glowC?: string;
  sparkle?: boolean;
  /** Its depth, as shares of the water from the surface to the sand. */
  band: readonly [number, number];
};

export type TankFish = {
  look: Look;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Which way it faces, eased from -1 (left) to 1 (right), so it turns rather than flips. */
  face: number;
  tx: number;
  ty: number;
  /** Seconds until it picks somewhere else to go. */
  t: number;
  /** How far back in the tank, 0 at the glass to 1 at the back: back ones are smaller and paler. */
  z: number;
  ph: number;
  /** Its place round a finger it follows. */
  ring: number;
  full: number;
  label: number;
  puff: number;
  dart: number;
  happy: number;
};

export type Flake = { x: number; y: number; ph: number; lie: number };
export type Bubble = { x: number; y: number; r: number; ph: number };
type Weed = { x: number; h: number; kind: 'kelp' | 'grass'; ph: number; front: boolean };
type Pebble = { x: number; r: number; c: string };

const BAND = {
  top: [0.08, 0.5],
  mid: [0.25, 0.7],
  low: [0.55, 0.92],
  /** On the sand: the crabs walk it. */
  floor: [0.99, 1],
} as const;

/** The species a side-on shape draws, by name; the rest are plain fish. */
const SHAPES: Record<string, Shape> = {
  pufferfish: 'puffer',
  shark: 'shark',
  'dusk ray': 'ray',
  marlin: 'marlin',
  'mahi-mahi': 'mahi',
  'sunrise koi': 'koi',
  tuna: 'tuna',
  grouper: 'grouper',
  parrotfish: 'parrot',
  'spider crab': 'crab',
  'glow squid': 'squid',
  'neon dragonfish': 'dragon',
};
const LOW = new Set(['pufferfish', 'dusk ray', 'grouper', 'parrotfish', 'neon dragonfish']);
const MID = new Set(['shark', 'marlin', 'mahi-mahi', 'sunrise koi', 'tuna', 'snapper']);

/** Tank units per world unit of a fish's length. */
const SCALE = 2.4;

function cap(s: string): string {
  return s[0] ? s[0].toUpperCase() + s.slice(1) : s;
}

/** How a species looks in the tank. */
export function speciesLook(S: Species, i: number): Look {
  const shape = SHAPES[S.name] ?? 'fish';
  return {
    id: `sp${i}`,
    name: cap(S.name),
    shape,
    c: S.c,
    belly: shape === 'tuna' ? '#C9D6E8' : shape === 'shark' ? '#E8EEF0' : '#FFFFFF',
    ...(S.mark ? { mark: S.mark } : {}),
    ...(S.dot ? { spots: true } : {}),
    len: S.s * SCALE,
    fat: S.fat,
    tail: S.tail,
    ...(S.glow ? { glow: true } : {}),
    ...(S.light ? { glowC: S.light } : {}),
    ...(S.rare || S.name === 'goldfin' ? { sparkle: true } : {}),
    band: S.crab ? BAND.floor : LOW.has(S.name) ? BAND.low : MID.has(S.name) ? BAND.mid : BAND.top,
  };
}

/** The lionfish, caught on the rod: red and white, with its fans of spines. */
export const LIONFISH_LOOK: Look = {
  id: 'lion',
  name: 'Lionfish',
  shape: 'lion',
  c: '#B9472F',
  belly: '#F3D9C9',
  len: 9 * SCALE,
  fat: 0.48,
  tail: 0.6,
  band: BAND.mid,
};
/** The snook, landed under the bridge: silver, a black line down its side, yellow fins. */
export const SNOOK_LOOK: Look = {
  id: 'snook',
  name: 'Snook',
  shape: 'snook',
  c: '#B9C2BB',
  belly: '#EEF2EC',
  mark: '#1E2422',
  len: 15 * SCALE,
  fat: 0.3,
  tail: 0.9,
  band: BAND.mid,
};

/** How many of a kind the tank keeps: a few of the little ones, one of the big. */
export function keepOf(len: number): number {
  return len <= 7 * SCALE ? 3 : len <= 9 * SCALE ? 2 : 1;
}

/** Who lives in the tank: every species caught, the lionfish once one is caught, the snook once one is landed. */
export function tankKinds(
  species: readonly Species[],
  log: readonly number[],
  lionfish: number,
  snook: number,
): { look: Look; n: number }[] {
  const out: { look: Look; n: number }[] = [];
  species.forEach((S, i) => {
    const caught = log[i] ?? 0;
    if (caught <= 0) return;
    const look = speciesLook(S, i);
    out.push({ look, n: Math.min(caught, keepOf(look.len)) });
  });
  if (lionfish > 0) out.push({ look: LIONFISH_LOOK, n: 1 });
  if (snook > 0) out.push({ look: SNOOK_LOOK, n: 1 });
  return out;
}

const PEBBLES = ['#C9B58C', '#A99A80', '#D8C7A6', '#8F9B95', '#B98F6A'];

export class Tank {
  readonly w = TANK_W;
  h = 200;
  fish: TankFish[] = [];
  flakes: Flake[] = [];
  bubbles: Bubble[] = [];
  /** Where a finger is held in the tank, or null. */
  finger: { x: number; y: number } | null = null;
  /** Flakes eaten since the tank was made: the tests' way to see a feed land. */
  eaten = 0;
  T = 0;
  private stocked = '';
  private chest = 2;
  private bubbler = 0;
  private weed: Weed[] = [];
  private pebbles: Pebble[] = [];
  private readonly rnd: () => number;

  constructor(rnd: () => number = Math.random) {
    this.rnd = rnd;
    this.layout();
  }

  get top(): number {
    return this.h * SURFACE;
  }
  get floor(): number {
    return this.h * SAND;
  }
  /** Where the chest sits on the sand. */
  get chestX(): number {
    return this.w * 0.76;
  }

  /** A new height for the tank, as the screen gives it: the fish stay in the water. */
  resize(h: number): void {
    if (Math.abs(h - this.h) < 0.5) return;
    this.h = h;
    for (const f of this.fish) {
      this.keepIn(f);
      [f.tx, f.ty] = this.somewhere(f.look);
    }
  }

  /**
   * Fill the tank with these kinds. Fish already in it stay where they are;
   * a kind new since the tank was last filled drops in from the top with its name showing.
   */
  stock(kinds: readonly { look: Look; n: number }[]): void {
    const key = kinds.map((k) => `${k.look.id}:${k.n}`).join(',');
    if (key === this.stocked) return;
    const first = this.stocked === '';
    this.stocked = key;
    const was = new Map<string, TankFish[]>();
    for (const f of this.fish) was.set(f.look.id, [...(was.get(f.look.id) ?? []), f]);
    const next: TankFish[] = [];
    for (const { look, n } of kinds) {
      const old = was.get(look.id) ?? [];
      for (let i = 0; i < n; i++) {
        const kept = old[i];
        if (kept) {
          next.push(kept);
          continue;
        }
        const f = this.spawn(look);
        if (!first) {
          f.y = this.top + look.len * look.fat;
          f.label = LABEL_T + 1;
        }
        next.push(f);
      }
    }
    // Back ones first, so the nearer are drawn over them.
    this.fish = next.sort((a, b) => b.z - a.z);
  }

  /** Food at the surface over x, a pinch of it. */
  feed(x: number): void {
    for (let i = 0; i < PINCH && this.flakes.length < 60; i++) {
      this.flakes.push({
        x: clamp(x + (this.rnd() - 0.5) * 22, 6, this.w - 6),
        y: this.top + this.rnd() * 4,
        ph: this.rnd() * 6.3,
        lie: 0,
      });
    }
  }

  /**
   * The fish under this point, or null: of those whose body (and a little round it, for a
   * finger) covers it, the one it is nearest the middle of, the nearer the glass on a tie.
   */
  fishAt(x: number, y: number): TankFish | null {
    let best: TankFish | null = null;
    let bd = Infinity;
    for (const f of this.fish) {
      const k = size(f);
      const rx = (f.look.len * 0.5 + 7) * k;
      const ry = (f.look.len * f.look.fat * 0.5 + 9) * k;
      const d = ((x - f.x) / rx) ** 2 + ((y - f.y) / ry) ** 2;
      if (d > 1) continue;
      const score = d + f.z * 0.2;
      if (score < bd) {
        bd = score;
        best = f;
      }
    }
    return best;
  }

  /** A tap: on a fish, its name (and a puff, or a turn); on the water, food. Returns the fish, if one. */
  tap(x: number, y: number): TankFish | null {
    const f = this.fishAt(x, y);
    if (!f) {
      this.feed(x);
      return null;
    }
    f.label = LABEL_T;
    if (f.look.shape === 'puffer') f.puff = PUFF_T;
    else {
      // A startled turn and a dash the other way.
      const dir = f.face >= 0 ? -1 : 1;
      f.vx = dir * cruise(f.look) * 2.6;
      f.dart = 0.45;
    }
    return f;
  }

  update(dt: number): void {
    this.T += dt;
    const top = this.top;
    const floor = this.floor;
    // Food sinks, wobbling, and lies a while on the sand.
    for (const p of this.flakes) {
      if (p.y < floor - 1.5) {
        p.y = Math.min(floor - 1.5, p.y + SINK * dt);
        p.x = clamp(p.x + Math.sin(this.T * 2.6 + p.ph) * 5 * dt, 3, this.w - 3);
      } else p.lie += dt;
    }
    this.flakes = this.flakes.filter((p) => p.lie < LIE);
    for (const f of this.fish) this.swim(f, dt);
    // Bubbles: a stream from the stone, a burst from the chest now and then.
    this.bubbler -= dt;
    if (this.bubbler <= 0) {
      this.bubbler = 0.28;
      this.bubbles.push({
        x: this.w * 0.1,
        y: floor - 3,
        r: 1.2 + this.rnd() * 1.6,
        ph: this.rnd() * 6,
      });
    }
    this.chest -= dt;
    if (this.chest <= 0) {
      this.chest = 4 + this.rnd() * 2;
      for (let i = 0; i < 6; i++)
        this.bubbles.push({
          x: this.chestX + (this.rnd() - 0.5) * 10,
          y: floor - 10 - i * 4,
          r: 1.5 + this.rnd() * 2.5,
          ph: this.rnd() * 6,
        });
    }
    for (const b of this.bubbles) {
      b.y -= (22 + b.r * 5) * dt;
      b.x += Math.sin(this.T * 3 + b.ph) * 7 * dt;
    }
    this.bubbles = this.bubbles.filter((b) => b.y > top + b.r);
  }

  private swim(f: TankFish, dt: number): void {
    const L = f.look.len;
    const sp = cruise(f.look);
    f.ph += dt * (5 + sp / 6);
    f.t -= dt;
    f.full = Math.max(0, f.full - dt);
    f.label = Math.max(0, f.label - dt);
    f.puff = Math.max(0, f.puff - dt);
    f.dart = Math.max(0, f.dart - dt);
    f.happy = Math.max(0, f.happy - dt);
    let tx = f.tx;
    let ty = f.ty;
    let fast = false;
    let food: Flake | null = null;
    if (this.finger) {
      // Round the finger, each at its own place, so they crowd it rather than stack.
      const r = 10 + L * 0.45;
      tx = this.finger.x + Math.cos(f.ring) * r;
      ty = this.finger.y + Math.sin(f.ring) * r * 0.6;
      fast = true;
    } else if (f.full <= 0 && this.flakes.length) {
      let bd = Infinity;
      for (const p of this.flakes) {
        const d = Math.hypot(p.x - f.x, p.y - f.y);
        if (d < bd) {
          bd = d;
          food = p;
        }
      }
      if (food) {
        // Aim the mouth, not the middle, at the flake.
        tx = food.x - Math.sign(food.x - f.x || f.face) * L * 0.45;
        ty = food.y;
        fast = true;
      }
    }
    if (f.dart <= 0) {
      const dx = tx - f.x;
      const dy = ty - f.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = (fast ? sp * 2.3 : sp) * Math.min(1, d / 22);
      const ease = Math.min(1, dt * (fast ? 4 : 1.6));
      f.vx += ((dx / d) * speed - f.vx) * ease;
      f.vy += ((dy / d) * speed * 0.75 - f.vy) * ease;
      if (!fast && (d < 8 || f.t <= 0)) {
        [f.tx, f.ty] = this.somewhere(f.look);
        f.t = 3 + this.rnd() * 5;
      }
    }
    // Keep a little apart from the others.
    for (const o of this.fish) {
      if (o === f) continue;
      const gap = (L + o.look.len) * 0.28;
      const dx = f.x - o.x;
      const dy = f.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < gap) {
        f.vx += (dx / d) * 40 * dt;
        f.vy += (dy / d) * 40 * dt;
      }
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    this.keepIn(f);
    if (Math.abs(f.vx) > 2.5) f.face = clamp(f.face + Math.sign(f.vx) * dt * 5, -1, 1);
    if (food) {
      const mx = f.x + Math.sign(f.face || 1) * L * 0.48 * size(f);
      if (Math.hypot(food.x - mx, food.y - f.y) < 5 + L * 0.12) {
        this.flakes.splice(this.flakes.indexOf(food), 1);
        this.eaten++;
        f.full = FULL_T;
        f.happy = 0.6;
        this.bubbles.push({ x: mx, y: f.y - 2, r: 1.2, ph: this.rnd() * 6 });
      }
    }
  }

  /** Inside the glass, under the surface and over the sand. */
  private keepIn(f: TankFish): void {
    const k = size(f);
    const hx = f.look.len * 0.5 * k + 2;
    const hy = f.look.len * f.look.fat * 0.5 * k + 2;
    const y0 = this.top + hy;
    const y1 = Math.max(y0, this.floor - hy);
    if (f.x < hx || f.x > this.w - hx) f.vx *= -0.3;
    if (f.y < y0 || f.y > y1) f.vy *= -0.3;
    f.x = clamp(f.x, hx, this.w - hx);
    f.y = clamp(f.y, y0, y1);
  }

  private somewhere(look: Look): [number, number] {
    const L = look.len;
    const water = this.floor - this.top;
    const [a, b] = look.band;
    return [
      L * 0.6 + this.rnd() * (this.w - L * 1.2),
      this.top + water * (a + this.rnd() * (b - a)),
    ];
  }

  private spawn(look: Look): TankFish {
    const [x, y] = this.somewhere(look);
    const [tx, ty] = this.somewhere(look);
    const f: TankFish = {
      look,
      x,
      y,
      vx: 0,
      vy: 0,
      face: this.rnd() < 0.5 ? -1 : 1,
      tx,
      ty,
      t: 2 + this.rnd() * 4,
      z: this.rnd(),
      ph: this.rnd() * 6.3,
      ring: this.rnd() * Math.PI * 2,
      full: 0,
      label: 0,
      puff: 0,
      dart: 0,
      happy: 0,
    };
    this.keepIn(f);
    return f;
  }

  private layout(): void {
    const r = rng(7);
    this.weed = [];
    for (let i = 0; i < 5; i++)
      this.weed.push({
        x: 18 + i * 62 + r() * 20,
        h: 0.45 + r() * 0.25,
        kind: 'kelp',
        ph: r() * 6,
        front: false,
      });
    for (let i = 0; i < 7; i++)
      this.weed.push({
        x: 10 + i * 46 + r() * 16,
        h: 0.12 + r() * 0.1,
        kind: 'grass',
        ph: r() * 6,
        front: true,
      });
    this.pebbles = Array.from({ length: 26 }, () => ({
      x: r() * this.w,
      r: 1.6 + r() * 3,
      c: PEBBLES[Math.floor(r() * PEBBLES.length)] ?? '#C9B58C',
    }));
  }

  /** The whole tank, drawn into a canvas pw pixels wide. */
  draw(ctx: CanvasRenderingContext2D, pw: number): void {
    const k = pw / this.w;
    const { w, h, top, floor, T } = this;
    ctx.save();
    ctx.scale(k, k);
    // The water, light at the top and deep at the bottom, and light coming down through it.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#8FDCE6');
    g.addColorStop(0.55, '#3C9DB8');
    g.addColorStop(1, '#1D5F7E');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    for (let i = 0; i < 4; i++) {
      const x = w * (0.12 + i * 0.26) + Math.sin(T * 0.3 + i * 2) * 12;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 26, 0);
      ctx.lineTo(x - 10 + 40, floor);
      ctx.lineTo(x - 40, floor);
      ctx.closePath();
      ctx.fill();
    }
    for (const wd of this.weed) if (!wd.front) this.drawWeed(ctx, wd);
    // The sand, with pebbles in it.
    const sg = ctx.createLinearGradient(0, floor, 0, h);
    sg.addColorStop(0, '#E9D3A0');
    sg.addColorStop(1, '#C7AC76');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, floor + Math.sin(x * 0.04) * 2.5);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    for (const p of this.pebbles) {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.ellipse(
        p.x,
        floor + 4 + ((p.r * 7) % (h - floor - 6)),
        p.r,
        p.r * 0.6,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    this.drawChest(ctx);
    // The bubbling stone.
    ctx.fillStyle = '#7E8B88';
    ctx.beginPath();
    ctx.ellipse(w * 0.1, floor + 1, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const f of this.fish) {
      if (f.look.glow) {
        const gx = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.look.len * 0.9);
        gx.addColorStop(0, rgba(f.look.glowC ?? f.look.c, 0.35));
        gx.addColorStop(1, rgba(f.look.glowC ?? f.look.c, 0));
        ctx.fillStyle = gx;
        ctx.fillRect(f.x - f.look.len, f.y - f.look.len, f.look.len * 2, f.look.len * 2);
      }
      ctx.globalAlpha = 1 - f.z * 0.25;
      const tilt = clamp(Math.atan2(f.vy, Math.abs(f.vx) + 6), -0.45, 0.45);
      drawSideFish(ctx, f.x, f.y, f.look, f.face, f.ph, tilt, f.puff, size(f), T, f.happy);
    }
    ctx.globalAlpha = 1;
    for (const wd of this.weed) if (wd.front) this.drawWeed(ctx, wd);
    ctx.fillStyle = '#C9763A';
    for (const p of this.flakes) {
      ctx.globalAlpha = p.lie > LIE - 2 ? (LIE - p.lie) / 2 : 1;
      ctx.fillRect(p.x - 1.3, p.y - 1, 2.6, 2);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 0.8;
    for (const b of this.bubbles) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The surface, catching the light, and a glint on the glass.
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, top + Math.sin(x * 0.05 + T * 1.6) * 1.4);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.moveTo(w * 0.05, top + 6);
    ctx.lineTo(w * 0.14, top + 6);
    ctx.lineTo(w * 0.04, h * 0.6);
    ctx.lineTo(0, h * 0.6);
    ctx.closePath();
    ctx.fill();
    // Names over the fish that were tapped.
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.fish) {
      if (f.label <= 0) continue;
      const a = Math.min(1, f.label / 0.4);
      const ly = Math.max(top + 9, f.y - f.look.len * f.look.fat * 0.5 * size(f) - 12);
      const tw = ctx.measureText(f.look.name).width + 12;
      const lx = clamp(f.x, tw / 2 + 2, w - tw / 2 - 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(255,246,229,.94)';
      roundRect(ctx, lx - tw / 2, ly - 8, tw, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#12303A';
      ctx.fillText(f.look.name, lx, ly + 0.5);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawWeed(ctx: CanvasRenderingContext2D, wd: Weed): void {
    const base = this.floor + 2;
    const tall = (this.floor - this.top) * wd.h;
    const sway = Math.sin(this.T * 0.9 + wd.ph) * 6;
    ctx.lineCap = 'round';
    if (wd.kind === 'kelp') {
      ctx.strokeStyle = '#3E7F4E';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wd.x, base);
      ctx.quadraticCurveTo(wd.x + sway * 0.5, base - tall * 0.5, wd.x + sway, base - tall);
      ctx.stroke();
      ctx.fillStyle = '#4F9A5C';
      for (let i = 1; i < 5; i++) {
        const t = i / 5;
        const lx = wd.x + sway * t * t;
        const ly = base - tall * t;
        const s = i % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.ellipse(lx + s * 5, ly, 6, 2.4, s * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    ctx.strokeStyle = '#5DB36A';
    ctx.lineWidth = 1.8;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(wd.x + i * 2.2, base + 2);
      ctx.quadraticCurveTo(
        wd.x + i * 3 + sway * 0.4,
        base - tall * 0.5,
        wd.x + i * 4.5 + sway * (0.6 + Math.abs(i) * 0.1),
        base - tall * (1 - Math.abs(i) * 0.15),
      );
      ctx.stroke();
    }
  }

  private drawChest(ctx: CanvasRenderingContext2D): void {
    const x = this.chestX;
    const y = this.floor + 3;
    // The lid lifts as it lets the bubbles out.
    const open = this.chest > 3.4 ? 0 : this.chest < 0.5 ? (0.5 - this.chest) * 0.9 : 0;
    ctx.fillStyle = '#7A4E2A';
    ctx.fillRect(x - 13, y - 13, 26, 13);
    ctx.fillStyle = '#E2B13C';
    ctx.fillRect(x - 13, y - 13, 26, 2);
    ctx.fillRect(x - 2, y - 11, 4, 5);
    ctx.save();
    ctx.translate(x - 13, y - 13);
    ctx.rotate(-open);
    ctx.fillStyle = '#8C5B32';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(26, 0);
    ctx.quadraticCurveTo(26, -9, 13, -9);
    ctx.quadraticCurveTo(0, -9, 0, 0);
    ctx.fill();
    ctx.fillStyle = '#E2B13C';
    ctx.fillRect(11.5, -9, 3, 9);
    ctx.restore();
    if (open > 0) {
      ctx.fillStyle = 'rgba(255,220,90,.8)';
      ctx.beginPath();
      ctx.arc(x, y - 13, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** How quickly a fish of this look wanders, in tank units a second. */
export function cruise(look: Look): number {
  if (look.shape === 'crab') return 9;
  return 14 + look.len * 0.45;
}

/** Back fish are drawn smaller. */
function size(f: TankFish): number {
  return 1 - f.z * 0.22;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * One fish side on at x, y, nose toward face (eased -1..1, so a turn squeezes it thin), its tail
 * beating with ph, tipped up or down by tilt. Each shape adds what makes it that fish.
 */
export function drawSideFish(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  look: Look,
  face: number,
  ph: number,
  tilt: number,
  puff: number,
  k: number,
  T: number,
  happy: number,
): void {
  const L = look.len * k;
  const H = L * look.fat;
  const beat = Math.sin(ph);
  ctx.save();
  ctx.translate(x, y + (happy > 0 ? Math.sin(happy * 30) * 1.2 : 0));
  ctx.scale(Math.sign(face || 1) * Math.max(0.18, Math.abs(face)), 1);
  ctx.rotate(tilt);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const dark = shade(look.c, 0.72);
  switch (look.shape) {
    case 'puffer':
      puffer(ctx, look, L, H, beat, puff);
      break;
    case 'ray':
      ray(ctx, look, L, H, ph, T);
      break;
    case 'crab':
      drawSideCrab(ctx, L, H, H * 0.5 + 2, ph);
      break;
    case 'squid':
      squid(ctx, look, L, H, ph);
      break;
    case 'dragon':
      dragon(ctx, look, L, H, beat, T);
      break;
    default:
      body(ctx, look, L, H, beat, dark);
  }
  ctx.restore();
  if (look.sparkle && Math.sin(T * 2.7 + x * 0.05) > 0.94) {
    ctx.fillStyle = '#FFFFFF';
    star(ctx, x - L * 0.1, y - H * 0.35, 2.6);
  }
}

/** A squid side on, swimming tail first as squid do: a long mantle with fins at its tip, eyes, and arms trailing. */
function squid(ctx: CanvasRenderingContext2D, look: Look, L: number, H: number, ph: number): void {
  ctx.fillStyle = look.c;
  ctx.beginPath();
  ctx.ellipse(L * 0.05, 0, L * 0.42, H * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // The fins at the mantle's tip, which leads.
  ctx.beginPath();
  ctx.moveTo(L * 0.42, 0);
  ctx.lineTo(L * 0.3, -H * 0.9);
  ctx.lineTo(L * 0.2, 0);
  ctx.lineTo(L * 0.3, H * 0.9);
  ctx.closePath();
  ctx.fill();
  // Arms trailing behind, waving.
  ctx.strokeStyle = look.c;
  ctx.lineWidth = Math.max(1, H * 0.16);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-L * 0.35, i * H * 0.12);
    ctx.quadraticCurveTo(
      -L * 0.55,
      i * H * 0.2 + Math.sin(ph + i) * H * 0.3,
      -L * 0.75,
      i * H * 0.28,
    );
    ctx.stroke();
  }
  ctx.fillStyle = look.mark ?? '#FFFFFF';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(
      L * (0.25 - i * 0.12),
      -H * 0.1 + (i % 2) * H * 0.2,
      Math.max(0.8, H * 0.08),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  eye(ctx, -L * 0.28, -H * 0.05, Math.max(1.2, H * 0.2));
}

/** A dragonfish side on: long and black, big jaws full of teeth, blue lights down its side and a glowing lure on its chin. */
function dragon(
  ctx: CanvasRenderingContext2D,
  look: Look,
  L: number,
  H: number,
  beat: number,
  T: number,
): void {
  const light = look.glowC ?? look.mark ?? '#4FC3FF';
  ctx.fillStyle = look.c;
  ctx.beginPath();
  ctx.ellipse(-L * 0.02, 0, L * 0.5, H * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  tailPath(ctx, L, H, look.tail, beat, false);
  ctx.fill();
  // Its jaws, a little open, with teeth.
  ctx.strokeStyle = '#E8F2FF';
  ctx.lineWidth = Math.max(0.6, H * 0.08);
  for (let i = 0; i < 4; i++) {
    const tx = L * (0.3 + i * 0.05);
    ctx.beginPath();
    ctx.moveTo(tx, -H * 0.05);
    ctx.lineTo(tx + L * 0.015, H * 0.2);
    ctx.stroke();
  }
  // The lights down its side, and the lure on its chin, pulsing.
  ctx.fillStyle = light;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(L * (0.25 - i * 0.11), H * 0.25, Math.max(0.8, H * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = light;
  ctx.lineWidth = Math.max(0.6, H * 0.08);
  ctx.beginPath();
  ctx.moveTo(L * 0.3, H * 0.4);
  ctx.quadraticCurveTo(L * 0.35, H * 1.4, L * 0.45, H * 1.6);
  ctx.stroke();
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * (0.6 + 0.4 * Math.sin(T * 4));
  ctx.beginPath();
  ctx.arc(L * 0.45, H * 1.6, Math.max(1.4, H * 0.3), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = a0;
  eye(ctx, L * 0.3, -H * 0.2, Math.max(1, H * 0.16), false);
}

function tailPath(
  ctx: CanvasRenderingContext2D,
  L: number,
  H: number,
  size: number,
  beat: number,
  crescent: boolean,
): void {
  const bx = -L * 0.44;
  const tx = -L * 0.5 - L * size * 0.32;
  const ty = H * (0.55 + size * 0.25) * (0.8 + 0.2 * beat);
  ctx.beginPath();
  ctx.moveTo(bx, -H * 0.08);
  if (crescent) {
    ctx.quadraticCurveTo(bx - L * 0.06, -ty * 0.5, tx, -ty);
    ctx.quadraticCurveTo(tx + L * 0.05, 0, tx, ty);
    ctx.quadraticCurveTo(bx - L * 0.06, ty * 0.5, bx, H * 0.08);
  } else {
    ctx.lineTo(tx, -ty);
    ctx.lineTo(tx + L * size * 0.1, 0);
    ctx.lineTo(tx, ty);
    ctx.lineTo(bx, H * 0.08);
  }
  ctx.closePath();
}

function eye(ctx: CanvasRenderingContext2D, ex: number, ey: number, r: number, white = true): void {
  if (white) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ex, ey, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#14222A';
  ctx.beginPath();
  ctx.arc(ex + r * 0.2, ey, r * (white ? 0.55 : 0.8), 0, Math.PI * 2);
  ctx.fill();
}

function body(
  ctx: CanvasRenderingContext2D,
  look: Look,
  L: number,
  H: number,
  beat: number,
  dark: string,
): void {
  const s = look.shape;
  const crescent = s === 'tuna' || s === 'marlin' || s === 'shark' || s === 'mahi';
  // Fins behind the body: the tail, then a dorsal fin to suit.
  ctx.fillStyle = s === 'snook' ? '#E3C24A' : s === 'koi' ? rgba(look.c, 0.8) : dark;
  tailPath(ctx, L, H, s === 'koi' ? look.tail * 1.5 : look.tail, beat, crescent);
  ctx.fill();
  ctx.beginPath();
  if (s === 'shark') {
    ctx.moveTo(-L * 0.12, -H * 0.4);
    ctx.lineTo(-L * 0.02, -H * 1.25);
    ctx.lineTo(L * 0.12, -H * 0.42);
  } else if (s === 'marlin') {
    // The sail, tall and blue along the back.
    ctx.fillStyle = look.mark ?? dark;
    ctx.moveTo(-L * 0.2, -H * 0.35);
    ctx.quadraticCurveTo(L * 0.02, -H * 2.2, L * 0.28, -H * 0.4);
  } else if (s === 'mahi') {
    ctx.fillStyle = look.mark ?? dark;
    ctx.moveTo(-L * 0.4, -H * 0.2);
    ctx.quadraticCurveTo(0, -H * 0.95, L * 0.36, -H * 0.42);
  } else if (s === 'lion') {
    ctx.fillStyle = 'rgba(243,217,201,.6)';
    ctx.moveTo(-L * 0.3, -H * 0.4);
    ctx.lineTo(L * 0.25, -H * 0.42);
    ctx.lineTo(L * 0.05, -H * 1.5);
    ctx.lineTo(-L * 0.25, -H * 1.3);
  } else {
    ctx.moveTo(-L * 0.18, -H * 0.42);
    ctx.lineTo(-L * 0.02, -H * 0.8);
    ctx.lineTo(L * 0.12, -H * 0.45);
  }
  ctx.closePath();
  ctx.fill();
  if (s === 'lion') {
    // Its spines, standing up through the web.
    ctx.strokeStyle = '#8E3324';
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 6; i++) {
      const bx = -L * 0.28 + i * L * 0.1;
      ctx.beginPath();
      ctx.moveTo(bx, -H * 0.4);
      ctx.lineTo(bx + L * 0.05, -H * (1.2 + (i % 2) * 0.35));
      ctx.stroke();
    }
  }
  if (s === 'marlin') {
    // The bill.
    ctx.fillStyle = shade(look.c, 0.8);
    ctx.beginPath();
    ctx.moveTo(L * 0.42, -H * 0.12);
    ctx.lineTo(L * 0.95, -H * 0.05);
    ctx.lineTo(L * 0.42, H * 0.06);
    ctx.closePath();
    ctx.fill();
  }
  // The body, its belly paler.
  ctx.fillStyle = look.c;
  ctx.beginPath();
  if (s === 'shark' || s === 'snook') {
    // Pointed at the nose.
    ctx.moveTo(L * 0.52, 0);
    ctx.quadraticCurveTo(L * 0.3, -H * 0.58, -L * 0.1, -H * 0.5);
    ctx.quadraticCurveTo(-L * 0.45, -H * 0.3, -L * 0.48, 0);
    ctx.quadraticCurveTo(-L * 0.45, H * 0.32, -L * 0.1, H * 0.5);
    ctx.quadraticCurveTo(L * 0.3, H * 0.5, L * 0.52, 0);
  } else if (s === 'mahi') {
    // A blunt, high forehead.
    ctx.moveTo(L * 0.44, H * 0.1);
    ctx.quadraticCurveTo(L * 0.5, -H * 0.62, L * 0.15, -H * 0.55);
    ctx.quadraticCurveTo(-L * 0.4, -H * 0.4, -L * 0.48, 0);
    ctx.quadraticCurveTo(-L * 0.3, H * 0.45, L * 0.1, H * 0.45);
    ctx.quadraticCurveTo(L * 0.4, H * 0.4, L * 0.44, H * 0.1);
  } else ctx.ellipse(0, 0, L * 0.5, H * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = rgba(look.belly, s === 'tuna' || s === 'shark' ? 0.9 : 0.35);
  ctx.beginPath();
  ctx.ellipse(L * 0.04, H * 0.38, L * 0.5, H * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  // Its markings.
  if (s === 'lion') {
    ctx.strokeStyle = 'rgba(255,244,232,.92)';
    ctx.lineWidth = Math.max(1, L * 0.045);
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * L * 0.12, -H * 0.6);
      ctx.lineTo(i * L * 0.12 - L * 0.04, H * 0.6);
      ctx.stroke();
    }
  } else if (s === 'snook') {
    ctx.strokeStyle = look.mark ?? '#1E2422';
    ctx.lineWidth = Math.max(0.8, H * 0.08);
    ctx.beginPath();
    ctx.moveTo(L * 0.3, -H * 0.12);
    ctx.quadraticCurveTo(0, -H * 0.18, -L * 0.48, 0);
    ctx.stroke();
  } else if (s === 'koi') {
    ctx.fillStyle = '#FFF6EC';
    ctx.beginPath();
    ctx.ellipse(L * 0.18, -H * 0.15, L * 0.14, H * 0.22, 0.3, 0, Math.PI * 2);
    ctx.ellipse(-L * 0.2, H * 0.05, L * 0.12, H * 0.25, -0.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (s === 'grouper') {
    ctx.fillStyle = rgba(look.mark ?? '#C9A57A', 0.7);
    for (const [bx, by, br] of [
      [0.15, -0.15, 0.1],
      [-0.12, 0.05, 0.12],
      [-0.3, -0.12, 0.08],
      [0.02, 0.2, 0.08],
    ] as const) {
      ctx.beginPath();
      ctx.arc(bx * L, by * H * 2, br * L, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (look.mark && look.spots) {
    ctx.fillStyle = look.mark;
    for (const [bx, by] of [
      [0.1, -0.15],
      [-0.08, 0.05],
      [-0.25, -0.12],
      [0.22, 0.12],
    ] as const) {
      ctx.beginPath();
      ctx.arc(bx * L, by * H * 2, Math.max(0.8, H * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (look.mark) {
    // A stripe down the side; the tuna's along its back.
    ctx.fillStyle = look.mark;
    ctx.beginPath();
    ctx.ellipse(
      -L * 0.02,
      s === 'tuna' ? H * 0.05 : -H * 0.08,
      L * 0.38,
      H * 0.11,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.restore();
  if (s === 'tuna') {
    // Little yellow finlets toward the tail.
    ctx.fillStyle = '#F2D04A';
    for (let i = 0; i < 4; i++) {
      const fx = -L * 0.2 - i * L * 0.06;
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(fx, sy * H * 0.36);
        ctx.lineTo(fx - L * 0.03, sy * H * 0.5);
        ctx.lineTo(fx - L * 0.05, sy * H * 0.3);
        ctx.fill();
      }
    }
  }
  if (s === 'parrot') {
    // The beak.
    ctx.fillStyle = '#E8F1EC';
    ctx.beginPath();
    ctx.moveTo(L * 0.4, -H * 0.12);
    ctx.quadraticCurveTo(L * 0.58, -H * 0.05, L * 0.5, H * 0.1);
    ctx.lineTo(L * 0.4, H * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  if (s === 'grouper') {
    // A big lip.
    ctx.strokeStyle = shade(look.c, 0.6);
    ctx.lineWidth = Math.max(1, H * 0.08);
    ctx.beginPath();
    ctx.moveTo(L * 0.5, H * 0.02);
    ctx.lineTo(L * 0.32, H * 0.1);
    ctx.stroke();
  }
  if (s === 'shark') {
    ctx.strokeStyle = shade(look.c, 0.7);
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(L * (0.2 - i * 0.04), -H * 0.15);
      ctx.lineTo(L * (0.18 - i * 0.04), H * 0.12);
      ctx.stroke();
    }
  }
  if (s === 'koi') {
    // Whiskers.
    ctx.strokeStyle = shade(look.c, 0.7);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(L * 0.48, H * 0.1);
    ctx.quadraticCurveTo(L * 0.58, H * 0.25, L * 0.52, H * 0.4);
    ctx.stroke();
  }
  // A side fin, paddling, and on the lionfish a great fan of spines.
  if (s === 'lion') {
    ctx.fillStyle = 'rgba(243,217,201,.55)';
    ctx.beginPath();
    ctx.moveTo(L * 0.12, H * 0.1);
    ctx.lineTo(-L * 0.3, H * (0.9 + beat * 0.1));
    ctx.lineTo(-L * 0.05, H * 1.15);
    ctx.lineTo(L * 0.15, H * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8E3324';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(L * 0.12, H * 0.1);
      ctx.lineTo(-L * 0.3 + i * L * 0.15, H * (0.9 + i * 0.08));
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = s === 'snook' ? '#E3C24A' : dark;
    ctx.beginPath();
    ctx.ellipse(L * 0.12, H * 0.12, L * 0.1, H * 0.12, 0.6 + beat * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  eye(
    ctx,
    L * (s === 'shark' ? 0.32 : 0.3),
    -H * 0.1,
    Math.max(1.1, H * (s === 'shark' ? 0.07 : 0.13)),
    s !== 'shark',
  );
}

function puffer(
  ctx: CanvasRenderingContext2D,
  look: Look,
  L: number,
  H: number,
  beat: number,
  puff: number,
): void {
  // Tapped, it blows up round and spiky, then lets it go.
  const p = puff > 0 ? Math.min(1, puff * 3, (PUFF_T - puff) * 5 + 0.2) : 0;
  const R = H * 0.5 * (1 + p * 0.7);
  ctx.fillStyle = shade(look.c, 0.8);
  tailPath(ctx, L * 0.8, H * 0.7, look.tail, beat, false);
  ctx.fill();
  if (p > 0) {
    ctx.strokeStyle = shade(look.c, 0.65);
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
      ctx.lineTo(Math.cos(a) * (R + 2.5 * p + 1), Math.sin(a) * (R + 2.5 * p + 1));
      ctx.stroke();
    }
  }
  ctx.fillStyle = look.c;
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(L * 0.42, R), R, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath();
  ctx.ellipse(0, R * 0.4, Math.max(L * 0.42, R) * 0.8, R * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = look.mark ?? '#B98F3A';
  for (const [bx, by] of [
    [-0.3, -0.3],
    [0.05, -0.45],
    [-0.05, -0.1],
    [-0.4, 0.05],
  ] as const) {
    ctx.beginPath();
    ctx.arc(bx * R * 1.4, by * R, Math.max(0.8, R * 0.11), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = shade(look.c, 0.8);
  ctx.beginPath();
  ctx.ellipse(R * 0.25, R * 0.25, R * 0.22, R * 0.14, 0.6 + beat * 0.3, 0, Math.PI * 2);
  ctx.fill();
  eye(ctx, Math.max(L * 0.42, R) * 0.62, -R * 0.25, Math.max(1.3, R * 0.24));
}

function ray(
  ctx: CanvasRenderingContext2D,
  look: Look,
  L: number,
  H: number,
  ph: number,
  T: number,
): void {
  // A ray glides on its wings: seen from a little above, a diamond with a long thin tail.
  const flap = 0.75 + Math.sin(ph * 0.6) * 0.25;
  ctx.strokeStyle = shade(look.c, 0.7);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-L * 0.3, 0);
  ctx.quadraticCurveTo(-L * 0.7, Math.sin(T * 2) * 3, -L * 1.0, Math.sin(T * 2 + 1) * 4);
  ctx.stroke();
  ctx.fillStyle = look.c;
  ctx.beginPath();
  ctx.moveTo(L * 0.5, 0);
  ctx.quadraticCurveTo(L * 0.2, -H * 0.4, -L * 0.05, -H * 0.75 * flap);
  ctx.quadraticCurveTo(-L * 0.15, -H * 0.2, -L * 0.35, 0);
  ctx.quadraticCurveTo(-L * 0.15, H * 0.2, -L * 0.05, H * 0.75 * flap);
  ctx.quadraticCurveTo(L * 0.2, H * 0.4, L * 0.5, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath();
  ctx.ellipse(L * 0.05, 0, L * 0.22, H * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  eye(ctx, L * 0.28, -H * 0.1, Math.max(1, H * 0.06), false);
  eye(ctx, L * 0.28, H * 0.1, Math.max(1, H * 0.06), false);
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const q = i % 2 ? r * 0.3 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
  ctx.fill();
}
