/**
 * The sirens, the kid's ("do the sirens like Greek mythology!", 2026-10-22) with the owner's calls: as the oldest
 * Greek pictures have them, great dark birds with women's heads. A little after midnight, once the mermaids have
 * gone, three of them fly in out of the dark and take the mermaids' rocks off island 2 (world/mermaids.ts), and they
 * keep them until dawn, singing.
 *
 * Their song steers boats onto the rocks: within reach of them, a boat's bow is turned toward the nearest of their
 * rocks and it is kept moving, more strongly the nearer it is. Steered hard away at full speed it breaks free. On
 * the rocks a boat takes a knock (the game does the damage). The mermaids' pearl charm is the answer: their song
 * cannot pull a boat that wears it, and when one comes near they shriek and fly off for the rest of the night.
 */
import { angDiff, clamp } from '../core/math';
import { drawSirens } from '../render/sirens';
import { MER_ROCKS, type Rock, SEATS, sirenHours } from '../world/mermaids';
import type { Blipper, DrawView, Entity, Layer, World } from './entity';

/** Gone; flying in to her rock; perched on it, singing; flying off. */
export type SirenState = 'away' | 'come' | 'perch' | 'go';

export type SirenLook = { face: string; hair: string; feather: string; edge: string };
/** The three, one to each of the mermaids' big rocks. */
export const SIREN_LOOKS: readonly SirenLook[] = [
  { face: '#E3CBB8', hair: '#1E1A22', feather: '#2B2735', edge: '#B08A4A' },
  { face: '#B98A6A', hair: '#5A2A1E', feather: '#33283A', edge: '#9C7A44' },
  { face: '#7A5238', hair: '#141218', feather: '#262433', edge: '#C29A55' },
];

export type Siren = {
  look: SirenLook;
  seat: Rock;
  state: SirenState;
  t: number;
  /** Seconds before she flies in, staggered. */
  due: number;
  /** Which way she faces on the screen, toward the boat. */
  face: 1 | -1;
  /** Seconds left of the note she is singing. */
  sing: number;
  ph: number;
};

/** A note of their song drifting from her toward the boat, the way the song pulls. */
export type SirenNote = {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  t: number;
  note: number;
};

/** Seconds to fly in and to fly off, and between one and the next coming in. */
export const COME_T = 2.4;
export const GO_T = 2;
export const SIREN_STAGGER = 0.9;
/** Within this of the rocks they are heard, and their song pulls; full strength within PULL_FULL. */
export const SIREN_REACH = 600;
export const PULL_FULL = 200;
/** At full strength the song turns a bow this fast toward the rocks (radians a second), and keeps it this fast. */
export const PULL_TURN = 1.6;
export const PULL_SPEED = 90;
/** A boat going at least this share of its top speed, bow away from them, is half held. */
export const BREAK_FREE = 0.8;
/** A boat wearing the charm this near sends them off for the night. */
export const CHARM_NEAR = 320;
/** Seconds between phrases, and per note; their phrases are short and come often. */
export const SIREN_GAP: readonly [number, number] = [1.6, 1.6];
export const SIREN_NOTE = 0.55;
/** How long a note takes to drift to the boat. */
export const DRIFT_T = 1.8;

/** How strongly their song pulls a boat this far from the rocks, 0..1. */
export function pullAt(dist: number): number {
  return clamp((SIREN_REACH - dist) / (SIREN_REACH - PULL_FULL), 0, 1);
}

export class Sirens implements Entity {
  readonly list: Siren[];
  /** The day's clock, set by the game. */
  clock = 0;
  /** The boat wears the mermaids' charm, set by the game. */
  charm = false;
  /** The boat's top speed now, set by the game, for breaking free. */
  topSpeed = 300;
  /** How strongly the song pulls the boat now, 0..1, and the rock it pulls toward. */
  pull = 0;
  pullTo: Rock | null = null;
  /** The boat's distance from the rocks. */
  dist = Infinity;
  readonly notes: SirenNote[] = [];
  /** Sent off by the charm: gone until their hours come round again. */
  private foiled = false;
  private wait = 0.5;
  private singer = 0;
  private heard = false;
  private pulling = false;
  /** Flown in, with the boat in earshot. */
  onArrive: (() => void) | null = null;
  /** In earshot of them, the first time this night. */
  onHear: (() => void) | null = null;
  /** Their song has the boat. */
  onPull: (() => void) | null = null;
  /** A boat with the charm came near: they shriek and go. */
  onFoiled: (() => void) | null = null;
  /** One of them sings a note, for the game to play. */
  onNote: ((note: number, seconds: number, s: Siren) => void) | null = null;

  constructor() {
    this.list = SEATS.map((seat, i) => ({
      look: SIREN_LOOKS[i] ?? (SIREN_LOOKS[0] as SirenLook),
      seat,
      state: 'away',
      t: 0,
      due: i * SIREN_STAGGER,
      face: 1,
      sing: 0,
      ph: i * 1.7,
    }));
  }

  /** On their rocks now. */
  get perched(): Siren[] {
    return this.list.filter((s) => s.state === 'perch');
  }

  /** The one perched on this rock, if any. */
  on(rock: Rock): Siren | null {
    return this.list.find((s) => s.seat === rock && s.state === 'perch') ?? null;
  }

  /** How much their song fills the sea where the boat is, 0..1, for the music. */
  get presence(): number {
    return this.perched.length ? clamp((SIREN_REACH + 300 - this.dist) / 500, 0, 1) : 0;
  }

  reset(): void {
    for (const [i, s] of this.list.entries())
      Object.assign(s, { state: 'away', t: 0, due: i * SIREN_STAGGER, sing: 0 });
    this.notes.length = 0;
    this.foiled = false;
    this.heard = false;
    this.pulling = false;
    this.pull = 0;
    this.pullTo = null;
  }

  update(dt: number, w: World): void {
    const b = w.boat;
    const hours = sirenHours(this.clock);
    if (!hours) this.foiled = false;
    const d = Math.hypot(b.x - MER_ROCKS.x, b.y - MER_ROCKS.y);
    this.dist = d;
    const afloat = !w.figure && !w.docked;
    const bs = b.x - b.y;
    let arrived = false;
    for (const [i, s] of this.list.entries()) {
      s.t += dt;
      s.ph += dt;
      s.sing = Math.max(0, s.sing - dt);
      const rs = s.seat.x - s.seat.y;
      if (Math.abs(bs - rs) > 8) s.face = bs > rs ? 1 : -1;
      if (s.state === 'away') {
        if (hours && !this.foiled) {
          s.due -= dt;
          if (s.due <= 0) this.go(s, 'come');
        } else s.due = i * SIREN_STAGGER;
      } else if (s.state === 'come') {
        if (s.t >= COME_T) {
          this.go(s, 'perch');
          arrived = true;
        }
      } else if (s.state === 'perch') {
        if (!hours || this.foiled) this.go(s, 'go');
      } else if (s.t >= GO_T) {
        this.go(s, 'away');
        s.due = i * SIREN_STAGGER;
      }
    }
    for (const n of this.notes) n.t += dt;
    while (this.notes.length && (this.notes[0] as SirenNote).t > DRIFT_T) this.notes.shift();
    this.pull = 0;
    this.pullTo = null;
    const perched = this.perched;
    if (!w.started || !perched.length) {
      this.pulling = false;
      return;
    }
    if (arrived && d < SIREN_REACH + 300 && perched.length === 1) this.onArrive?.();
    if (d < SIREN_REACH + 300) {
      if (!this.heard) {
        this.heard = true;
        this.onHear?.();
      }
      this.song(dt, w, perched);
    }
    if (this.charm) {
      if (afloat && d < CHARM_NEAR) {
        this.foiled = true;
        for (const s of perched) this.go(s, 'go');
        this.onFoiled?.();
      }
      return;
    }
    // The song has the boat: toward the nearest of their rocks, less so for a boat racing away.
    const k = afloat ? pullAt(d) : 0;
    if (k <= 0) {
      this.pulling = false;
      return;
    }
    let to = perched[0] as Siren;
    for (const s of perched)
      if (Math.hypot(s.seat.x - b.x, s.seat.y - b.y) < Math.hypot(to.seat.x - b.x, to.seat.y - b.y))
        to = s;
    const toward = Math.atan2(to.seat.y - b.y, to.seat.x - b.x);
    const away = Math.cos(angDiff(toward, b.h)) < 0;
    this.pull = away && b.v >= BREAK_FREE * this.topSpeed ? k / 2 : k;
    this.pullTo = to.seat;
    if (!this.pulling) {
      this.pulling = true;
      this.onPull?.();
    }
  }

  /** Steer a boat the way their song pulls it: its bow turned toward the rock, and kept moving. */
  steer(b: { x: number; y: number; h: number; v: number }, dt: number): void {
    const r = this.pullTo;
    if (!r || this.pull <= 0) return;
    const toward = Math.atan2(r.y - b.y, r.x - b.x);
    const turn = PULL_TURN * this.pull * dt;
    b.h += clamp(angDiff(toward, b.h), -turn, turn);
    const min = PULL_SPEED * this.pull;
    if (b.v < min) {
      const add = min - b.v;
      b.v = min;
      b.x += Math.cos(b.h) * add * dt;
      b.y += Math.sin(b.h) * add * dt;
    }
  }

  /** A short phrase now and then from one of them in turn, its notes drifting off toward the boat. */
  private song(dt: number, w: World, perched: Siren[]): void {
    this.wait -= dt;
    if (this.wait > 0) return;
    this.singer = (this.singer + 1) % perched.length;
    const s = perched[this.singer] as Siren;
    const note = Math.floor(w.rng() * 4);
    s.sing = SIREN_NOTE;
    this.notes.push({
      x: s.seat.x,
      y: s.seat.y,
      z: s.seat.h + 26,
      tx: w.boat.x,
      ty: w.boat.y,
      t: 0,
      note,
    });
    this.onNote?.(note, SIREN_NOTE, s);
    // Fast, one note after another, while it has a boat; now and then, otherwise.
    const hold = !this.charm && pullAt(this.dist) > 0;
    this.wait = SIREN_NOTE + (hold ? 0.15 : SIREN_GAP[0] + w.rng() * SIREN_GAP[1]);
  }

  private go(s: Siren, st: SirenState): void {
    s.state = st;
    s.t = 0;
  }

  /** On the radar, a threat on each rock they hold. */
  radar(blip: Blipper): void {
    for (const s of this.perched) blip(s.seat.x, s.seat.y, 'threat');
  }

  /**
   * Perched, each is drawn with her rock in the sorted solids (render/mermaids.ts drawMerRock). Flying in and off,
   * over everything; their notes drift toward the boat; at night their eyes burn gold.
   */
  draw(v: DrawView, layer: Layer): void {
    if (!v.onScreen(MER_ROCKS.x, MER_ROCKS.y, MER_ROCKS.r + 600)) return;
    drawSirens(v, layer, this);
  }
}
