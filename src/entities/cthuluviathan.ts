/**
 * The Cthuluviathan, the kid's: an octopus for a head, a fistful of
 * tentacles for a face and two small wings, asleep in a sunken city in a
 * corner of the deep. Go by slowly and it dreams on, snoring. Sail past fast,
 * or come too close, and it wakes: its eyes open, and it sends a tentacle up
 * wherever the boat is about to be. The water boils there for a second first,
 * so the counter is to steer off the bubbles. A tentacle that catches the
 * boat takes fish, never the boat, never coins. Get out of its reach and it
 * goes back to sleep. The tests dodge it with a person's reaction.
 */
import { rgba } from '../core/color';
import { WS } from '../world/island';
import type { DrawView, Entity, Layer, World } from './entity';

/** Its sunken city, past both lines of buoys at one corner of the deep. */
export const LAIR = { x: WS + 650, y: -650 } as const;
/** A boat this close, going faster than WAKE_SPEED, wakes it; faster than STIR_SPEED, it stirs. */
export const WAKE_RADIUS = 750;
export const WAKE_SPEED = 170;
export const STIR_SPEED = 120;
/** Any boat this close wakes it, however slowly it comes. */
export const TOO_CLOSE = 360;
/** The boat this close sees it: a sighting. */
export const SIGHT_RADIUS = 1100;
/** Within this, its place is marked at the edge of the screen when it is off it. */
export const MARK_RADIUS = 1800;
/** Awake, it reaches this far from the middle of its city. */
export const REACH = 1000;
/** Seconds between tentacles; seconds of bubbles before one comes up; seconds it stands; seconds to sink. */
export const STRIKE_EVERY = 0.9;
export const WARN = 1;
export const UP = 1.2;
export const SINK = 0.4;
/** Half the width of a tentacle where it comes up. */
export const TENTACLE_R = 40;
/** Seconds after one grab before another can. */
export const GRACE = 1.5;
/** Seconds out of reach before it goes back to sleep, the most it stays awake, and how long it sleeps soundly after. */
export const CALM = 5;
export const AWAKE_MAX = 30;
export const DROWSY = 12;
/** Seconds between snores the game hears, and between stirs. */
export const SNORE_EVERY = 4.5;
export const STIR_EVERY = 6;

export type Tentacle = {
  x: number;
  y: number;
  /** Seconds since the water began to boil. */
  t: number;
  hit: boolean;
};

/** A tentacle's part of its life: bubbling, standing, or sinking. */
export function tentaclePhase(t: number): 'warn' | 'up' | 'sink' | 'gone' {
  if (t < WARN) return 'warn';
  if (t < WARN + UP) return 'up';
  if (t < WARN + UP + SINK) return 'sink';
  return 'gone';
}

/** Where a tentacle comes up for a boat: where it will be when the bubbles end, kept within reach. */
export function strikeAt(b: World['boat']): [number, number] {
  let x = b.x + Math.cos(b.h) * b.v * WARN;
  let y = b.y + Math.sin(b.h) * b.v * WARN;
  const d = Math.hypot(x - LAIR.x, y - LAIR.y);
  if (d > REACH) {
    x = LAIR.x + ((x - LAIR.x) / d) * REACH;
    y = LAIR.y + ((y - LAIR.y) / d) * REACH;
  }
  return [x, y];
}

/** The broken columns of its city: angle, distance from the middle, and how far each stands out of the water. */
const COLUMNS: readonly [number, number, number][] = [
  [0.2, 300, 22],
  [0.9, 270, 9],
  [1.7, 320, 16],
  [2.5, 290, 5],
  [3.2, 310, 26],
  [4.0, 260, 12],
  [4.8, 330, 7],
  [5.6, 280, 18],
];

export class Cthuluviathan implements Entity {
  state: 'asleep' | 'awake' = 'asleep';
  tentacles: Tentacle[] = [];
  /** How far its eyes are open, 0..1. */
  eyes = 0;
  awakeT = 0;
  calmT = 0;
  strikeT = 0;
  drowsy = 0;
  grace = 0;
  snoreT = 0;
  stirT = 0;
  sighted = false;
  /** How far the boat was from its city last frame, for the edge marker. */
  boatD = Infinity;
  /** The boat came within SIGHT_RADIUS for the first time this session. */
  onSight: (() => void) | null = null;
  /** A boat inside WAKE_RADIUS is getting quick: the warning. */
  onStir: (() => void) | null = null;
  /** Asleep, with the boat in earshot. */
  onSnore: (() => void) | null = null;
  onWake: (() => void) | null = null;
  /** A tentacle has come up out of the boiling water. */
  onTentacle: (() => void) | null = null;
  /** A tentacle caught the boat. The game takes fish. */
  onGrab: (() => void) | null = null;
  onSleep: (() => void) | null = null;

  update(dt: number, w: World): void {
    const b = w.boat;
    this.eyes += ((this.state === 'awake' ? 1 : 0) - this.eyes) * Math.min(1, dt * 3);
    for (const t of this.tentacles) {
      const before = tentaclePhase(t.t);
      t.t += dt;
      if (before === 'warn' && tentaclePhase(t.t) === 'up') this.onTentacle?.();
    }
    this.tentacles = this.tentacles.filter((t) => tentaclePhase(t.t) !== 'gone');
    this.grace -= dt;
    this.stirT -= dt;
    this.snoreT -= dt;
    this.drowsy -= dt;
    if (!w.started) return;
    const d = Math.hypot(b.x - LAIR.x, b.y - LAIR.y);
    this.boatD = d;
    if (!this.sighted && d < SIGHT_RADIUS) {
      this.sighted = true;
      this.onSight?.();
    }
    if (this.state === 'asleep') {
      if (d < SIGHT_RADIUS && this.snoreT <= 0) {
        this.snoreT = SNORE_EVERY;
        this.onSnore?.();
      }
      if (
        this.drowsy <= 0 &&
        !w.docked &&
        (d < TOO_CLOSE || (d < WAKE_RADIUS && b.v > WAKE_SPEED))
      ) {
        this.state = 'awake';
        this.awakeT = 0;
        this.calmT = 0;
        this.strikeT = 0.6;
        this.onWake?.();
      } else if (d < WAKE_RADIUS && b.v > STIR_SPEED && this.stirT <= 0) {
        this.stirT = STIR_EVERY;
        this.onStir?.();
      }
    } else {
      this.awakeT += dt;
      this.calmT = d > REACH * 1.1 ? this.calmT + dt : 0;
      if (this.calmT > CALM || this.awakeT > AWAKE_MAX) {
        this.state = 'asleep';
        this.drowsy = DROWSY;
        this.onSleep?.();
      } else {
        this.strikeT -= dt;
        if (this.strikeT <= 0 && d < REACH) {
          this.strikeT = STRIKE_EVERY;
          const [x, y] = strikeAt(b);
          this.tentacles.push({ x, y, t: 0, hit: false });
        }
      }
    }
    const reach = TENTACLE_R + 24 * w.hullScale;
    for (const t of this.tentacles) {
      if (t.hit || tentaclePhase(t.t) !== 'up' || this.grace > 0) continue;
      if (Math.hypot(b.x - t.x, b.y - t.y) < reach) {
        t.hit = true;
        this.grace = GRACE;
        b.v *= 0.3;
        this.onGrab?.();
      }
    }
  }

  draw(v: DrawView, layer: Layer): void {
    const near = v.onScreen(LAIR.x, LAIR.y, 700);
    if (layer === 'underwater') {
      if (near) this.drawCity(v, false);
      if (near) this.drawBody(v);
    } else if (layer === 'surface') {
      if (near) this.drawCity(v, true);
    } else if (layer === 'afloat') {
      for (const t of this.tentacles) if (v.onScreen(t.x, t.y, 120)) this.drawTentacle(v, t);
      if (near && this.state === 'asleep' && this.eyes < 0.3) this.drawZs(v);
    } else if (layer === 'mask') {
      if (near) v.light(LAIR.x, LAIR.y, 0, 320, 0.45 + 0.3 * this.eyes);
      for (const t of this.tentacles) v.light(t.x, t.y, 10, 130, 0.8);
    } else if (layer === 'overlay') {
      // A phone in portrait shows little to either side: mark it at the edge while the boat is near.
      if (this.boatD < MARK_RADIUS)
        v.indicator(
          LAIR.x,
          LAIR.y,
          '#285E46',
          this.state === 'awake' ? 'eye' : 'sleep',
          this.state === 'awake',
        );
    } else if (layer === 'glow') {
      if (!near || v.dark <= 0.05 || this.eyes < 0.1) return;
      const { ctx } = v;
      ctx.globalCompositeOperation = 'screen';
      for (const s of [-1, 1])
        v.glow(
          LAIR.x + s * 34,
          LAIR.y - s * 34,
          24,
          40,
          rgba('#B6FF7A', 0.35 * this.eyes * v.dark),
        );
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /** Paving and broken columns under the water; the tops of the tall ones break the surface. */
  private drawCity(v: DrawView, tops: boolean): void {
    const { ctx } = v;
    if (!tops) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#123B44';
      v.isoEllipse(LAIR.x, LAIR.y, 380);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const [a, r, h] of COLUMNS) {
      const x = LAIR.x + Math.cos(a) * r;
      const y = LAIR.y + Math.sin(a) * r;
      if (tops) {
        if (h < 10) continue;
        v.box(x - 11, y - 11, 22, 22, 0, h, '#6F8781', '#A4B9B2');
      } else {
        ctx.globalAlpha = 0.55;
        v.box(x - 14, y - 14, 28, 28, -30, 0, '#2C4A4B', '#3E6461');
        ctx.globalAlpha = 1;
      }
    }
  }

  /** The great head under the water: a dome, two little wings, the face tentacles, and the eyes. */
  private drawBody(v: DrawView): void {
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const e = this.eyes;
    const sx = px(LAIR.x, LAIR.y);
    const sy = py(LAIR.x, LAIR.y) - 6 * Z * e;
    const body = e > 0.5 ? '#285E46' : '#173F33';
    ctx.globalAlpha = 0.55 + 0.35 * e;
    // Wings, either side, scalloped.
    ctx.fillStyle = '#123629';
    for (const s of [-1, 1]) {
      const flap = Math.sin(T * (1 + 2 * e)) * 6 * Z;
      ctx.beginPath();
      ctx.moveTo(sx + s * 70 * Z, sy - 10 * Z);
      ctx.lineTo(sx + s * 150 * Z, sy - 50 * Z - flap);
      ctx.lineTo(sx + s * 130 * Z, sy - 10 * Z);
      ctx.lineTo(sx + s * 150 * Z, sy + 10 * Z - flap * 0.5);
      ctx.lineTo(sx + s * 115 * Z, sy + 14 * Z);
      ctx.closePath();
      ctx.fill();
    }
    // The face tentacles, hanging and curling.
    ctx.strokeStyle = body;
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const ox = (i - 3) * 16 * Z;
      ctx.lineWidth = (12 - Math.abs(i - 3) * 2) * Z;
      ctx.beginPath();
      ctx.moveTo(sx + ox, sy + 18 * Z);
      for (let k = 1; k <= 5; k++) {
        const wag = Math.sin(T * 1.6 + i * 0.9 + k * 0.7) * (5 + 6 * e) * Z;
        ctx.lineTo(sx + ox * (1 + k * 0.08) + wag, sy + (18 + k * 16) * Z);
      }
      ctx.stroke();
    }
    // The dome of the head.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 92 * Z, 58 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#356F55';
    ctx.beginPath();
    ctx.ellipse(sx - 18 * Z, sy - 16 * Z, 46 * Z, 22 * Z, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Eyes: shut and dreaming, or open and yellow-green with a slit.
    for (const s of [-1, 1]) {
      const ex = sx + s * 34 * Z;
      const ey = sy + 4 * Z;
      if (e < 0.3) {
        ctx.strokeStyle = 'rgba(214,240,200,.7)';
        ctx.lineWidth = 2.4 * Z;
        ctx.beginPath();
        ctx.arc(ex, ey - 4 * Z, 10 * Z, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#C8F56A';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 13 * Z, 9 * Z * e, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0B1F18';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 2.6 * Z, 7 * Z * e, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** A tentacle: boiling water first, then up it comes with suckers down one side, then down again. */
  private drawTentacle(v: DrawView, t: Tentacle): void {
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const sx = px(t.x, t.y);
    const sy = py(t.x, t.y);
    const phase = tentaclePhase(t.t);
    if (phase === 'warn') {
      const k = t.t / WARN;
      ctx.strokeStyle = v.foam;
      ctx.lineWidth = 2 * Z;
      ctx.globalAlpha = 0.35 + 0.5 * k;
      v.isoEllipse(t.x, t.y, TENTACLE_R * (0.5 + 0.6 * k));
      ctx.stroke();
      ctx.fillStyle = v.foam;
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + T * 3;
        const r = TENTACLE_R * (0.2 + ((i * 37) % 10) / 12);
        const bob = Math.abs(Math.sin(T * 8 + i)) * 4 * Z;
        ctx.beginPath();
        ctx.arc(
          px(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r),
          py(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r) - bob,
          (2 + (i % 3)) * Z * (0.6 + k),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    const k =
      phase === 'up' ? Math.min(1, (t.t - WARN) / 0.25) : Math.max(0, 1 - (t.t - WARN - UP) / SINK);
    const H = 92 * Z * k;
    // Spray ring where it broke the surface.
    ctx.strokeStyle = v.foam;
    ctx.lineWidth = 2.4 * Z;
    ctx.globalAlpha = 0.7 * k;
    v.isoEllipse(t.x, t.y, TENTACLE_R * 1.1);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const curl = (s: number) => Math.sin(s * 2.6 + T * 2.2 + t.x) * 14 * Z * s;
    for (const [side, fill] of [
      [1, '#2F6E4E'],
      [-1, '#4FA375'],
    ] as const) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const s = i / 10;
        const w = (17 - 13 * s) * Z * (side > 0 ? 1 : 0.55);
        ctx.lineTo(sx + curl(s) + side * w, sy - H * s);
      }
      ctx.lineTo(sx + curl(1), sy - H - 6 * Z * k);
      for (let i = 10; i >= 0; i--) {
        const s = i / 10;
        const w = (17 - 13 * s) * Z;
        ctx.lineTo(sx + curl(s) - w, sy - H * s);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#D6F0D8';
    for (let i = 1; i < 8; i++) {
      const s = i / 9;
      ctx.beginPath();
      ctx.arc(sx + curl(s) - (14 - 11 * s) * Z, sy - H * s, (2.6 - 1.6 * s) * Z, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Zs rising off the head while it sleeps. */
  private drawZs(v: DrawView): void {
    const { ctx, px, py, T } = v;
    const Z = v.zoom;
    const sx = px(LAIR.x, LAIR.y);
    const sy = py(LAIR.x, LAIR.y);
    ctx.fillStyle = v.foam;
    for (let i = 0; i < 3; i++) {
      const p = (T * 0.35 + i / 3) % 1;
      ctx.globalAlpha = 0.85 * Math.sin(Math.PI * p);
      ctx.font = `700 ${Math.round((14 + 16 * p) * Z)}px Grandstander, ui-rounded, sans-serif`;
      ctx.fillText(
        'z',
        sx + 40 * Z + p * 50 * Z + Math.sin(T + i) * 6 * Z,
        sy - 40 * Z - p * 110 * Z,
      );
    }
    ctx.globalAlpha = 1;
  }
}
