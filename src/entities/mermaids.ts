/**
 * The mermaids, the owner's (2026-10-22), a surprise for the kid: three sisters on the rocks off island 2's far
 * shore (world/mermaids.ts). At dusk they come up out of the sea one after another and climb onto their rocks, and
 * there they sit until midnight, singing, when they slip back into the water. Their song is four notes, sung a few at
 * a time; in earshot it takes over the sea's music (audio/ambience.ts, which the game plays each note through).
 *
 * Come at them fast and they are gone under the water in a flick of tails, back up a little while after the boat
 * has slowed. Come slowly, and they sing on. Nothing here can hurt the boat: the sirens, on the same rocks after
 * midnight, will be the ones with teeth.
 */
import { clamp } from '../core/math';
import { drawMermaids, FLOAT_T } from '../render/mermaids';
import { MER_ROCKS, merHours, type Rock, SEATS } from '../world/mermaids';
import type { Blipper, DrawView, Entity, Layer, World } from './entity';

/** Under the water; coming up onto her rock; sitting on it; slipping back in. */
export type MerState = 'away' | 'rise' | 'sit' | 'dive';

export type MerLook = {
  name: string;
  hair: string;
  skin: string;
  tail: string;
  fin: string;
  top: string;
};

/** The three sisters, one to a rock in the order of SEATS. */
export const MER_LOOKS: readonly MerLook[] = [
  {
    name: 'Marina',
    hair: '#F2C94C',
    skin: '#F2C7A5',
    tail: '#25AFA0',
    fin: '#86E3D5',
    top: '#F7A6C4',
  },
  {
    name: 'Ondine',
    hair: '#C8462E',
    skin: '#C98E64',
    tail: '#3E9A5C',
    fin: '#A6DC8E',
    top: '#F6E3A1',
  },
  {
    name: 'Pearl',
    hair: '#ECEFF6',
    skin: '#8D5A3B',
    tail: '#8A68D8',
    fin: '#CDBBF5',
    top: '#9FE3F5',
  },
];

export type Mermaid = {
  look: MerLook;
  seat: Rock;
  state: MerState;
  /** Seconds in this state, and before she next comes up or goes down. */
  t: number;
  due: number;
  /** 0 under the water to 1 up on her rock. */
  up: number;
  /** Which way she faces on the screen, 1 right or -1 left: toward the boat. */
  face: 1 | -1;
  /** Seconds left of the note she is singing, and which of the four it is. */
  sing: number;
  note: number;
  /** For her hair and her tail. */
  ph: number;
};

/** A note of their song: which of the four, and for how long. */
export type MerNote = readonly [note: number, seconds: number];
/** A note drifting up off a singer, for the eye as well as the ear. */
export type Floater = { x: number; y: number; z: number; t: number; note: number };

/** Seconds to come up onto her rock, and between one sister and the next. */
export const RISE_T = 1.6;
export const STAGGER = 1.3;
/** Seconds the flick of her tail takes, going under. */
export const DIVE_T = 0.8;
/** Within this of the rocks they sing, and are heard. */
export const MER_EARSHOT = 900;
/** Within this, seen. */
export const MER_SIGHT = 320;
/** A boat faster than SPOOK within SPOOK_NEAR sends them all under; they stay down a while, and until it is gentle. */
export const SPOOK = 200;
export const SPOOK_NEAR = 280;
export const GENTLE = 110;
export const HIDE_T = 7;
/** Seconds between one phrase of the song and the next: floor and spread. */
export const PHRASE_GAP: readonly [number, number] = [4, 4];
/** Most notes are this long; the last of a phrase is held. */
export const NOTE_T = 0.42;
export const HELD_T = 0.9;

/** How loud the song is this far from the rocks, 0..1: full within a third of earshot, nothing at its edge. */
export function merLevel(dist: number): number {
  return clamp((MER_EARSHOT - dist) / (MER_EARSHOT * (2 / 3)), 0, 1);
}

/** A phrase of their song: four to six notes stepping up and down among the four, the last one held. */
export function merPhrase(r: () => number): MerNote[] {
  const n = 4 + Math.floor(r() * 3);
  let note = Math.floor(r() * 4);
  const out: MerNote[] = [];
  for (let i = 0; i < n; i++) {
    out.push([note, i === n - 1 ? HELD_T : NOTE_T]);
    const step = r() < 0.75 ? 1 : 2;
    const dir = note === 0 ? 1 : note === 3 ? -1 : r() < 0.5 ? -1 : 1;
    note = clamp(note + step * dir, 0, 3);
  }
  return out;
}

export class Mermaids implements Entity {
  readonly list: Mermaid[];
  /** The day's clock, 0..1, set by the game each frame: they keep to their hours. */
  clock = 0;
  /** Where the figure is, aboard or ashore, and its distance from the rocks, as of the last update. */
  eyeX = 0;
  eyeY = 0;
  dist = Infinity;
  /** Seconds they will stay under after a fright. */
  hiding = 0;
  /** Quiet: no song of their own while one of them is singing with you. */
  hush = false;
  readonly floaters: Floater[] = [];
  private phrase: MerNote[] = [];
  private phraseAt = 0;
  private phraseT = 0;
  private singer = 0;
  private wait = 1.5;
  private heard = false;
  private sighted = false;
  private emptied = false;
  /** In earshot of their song for the first time. */
  onHear: (() => void) | null = null;
  /** Near enough to see them, the first time. */
  onSight: (() => void) | null = null;
  /** Gone under the water from a boat coming on fast. */
  onSpook: (() => void) | null = null;
  /** At the rocks out of their hours, the first time: nobody there. */
  onEmpty: (() => void) | null = null;
  /** One of them sings a note, for the game to play: which of the four, how long, and who. */
  onNote: ((note: number, seconds: number, m: Mermaid) => void) | null = null;

  constructor() {
    this.list = SEATS.map((seat, i) => ({
      look: MER_LOOKS[i] ?? (MER_LOOKS[0] as MerLook),
      seat,
      state: 'away',
      t: 0,
      due: i * STAGGER,
      up: 0,
      face: 1,
      sing: 0,
      note: 0,
      ph: i * 2.1,
    }));
  }

  /** On their rocks now, or coming up onto them. */
  get out(): Mermaid[] {
    return this.list.filter((m) => m.state === 'sit' || m.state === 'rise');
  }

  /** The one sitting on this rock, if any. */
  on(rock: Rock): Mermaid | null {
    return (
      this.list.find(
        (m) => m.seat === rock && (m.state === 'sit' || (m.state === 'rise' && m.up > 0.75)),
      ) ?? null
    );
  }

  /** How much their song fills the sea where the figure is, 0..1, for the music. */
  get presence(): number {
    return this.list.some((m) => m.state === 'sit') ? merLevel(this.dist) : 0;
  }

  /** Start the day over: everyone under the water. */
  reset(): void {
    for (const [i, m] of this.list.entries())
      Object.assign(m, { state: 'away', t: 0, due: i * STAGGER, up: 0, sing: 0 });
    this.phrase = [];
    this.floaters.length = 0;
    this.hiding = 0;
    this.heard = false;
    this.sighted = false;
    this.emptied = false;
  }

  update(dt: number, w: World): void {
    const b = w.boat;
    // Heard and seen from wherever the figure is, aboard or ashore; only a boat can come at them fast.
    const eye = w.figure ?? b;
    const afloat = !w.figure;
    const hours = merHours(this.clock);
    const d = Math.hypot(eye.x - MER_ROCKS.x, eye.y - MER_ROCKS.y);
    this.eyeX = eye.x;
    this.eyeY = eye.y;
    this.dist = d;
    this.hiding = Math.max(0, this.hiding - dt);
    if (w.started && afloat && hours && d < SPOOK_NEAR && b.v > SPOOK && this.out.length) {
      for (const m of this.out) this.go(m, 'dive');
      this.hiding = HIDE_T;
      this.phrase = [];
      this.onSpook?.();
    }
    const calm = this.hiding <= 0 && !(afloat && d < SPOOK_NEAR + 60 && b.v > GENTLE);
    const bs = eye.x - eye.y;
    for (const [i, m] of this.list.entries()) {
      m.t += dt;
      m.ph += dt;
      m.sing = Math.max(0, m.sing - dt);
      const rs = m.seat.x - m.seat.y;
      if (Math.abs(bs - rs) > 8) m.face = bs > rs ? 1 : -1;
      if (m.state === 'away') {
        m.up = 0;
        if (hours && calm) {
          m.due -= dt;
          if (m.due <= 0) this.go(m, 'rise');
        } else m.due = i * STAGGER;
      } else if (m.state === 'rise') {
        m.up = Math.min(1, m.t / RISE_T);
        if (m.t >= RISE_T) {
          this.go(m, 'sit');
          m.due = i * STAGGER;
        }
      } else if (m.state === 'sit') {
        m.up = 1;
        if (!hours) {
          m.due -= dt;
          if (m.due <= 0) this.go(m, 'dive');
        }
      } else {
        m.up = Math.max(0, 1 - m.t / DIVE_T);
        if (m.t >= DIVE_T) {
          this.go(m, 'away');
          m.due = i * STAGGER;
        }
      }
    }
    for (const f of this.floaters) f.t += dt;
    while (this.floaters.length && (this.floaters[0] as Floater).t > FLOAT_T) this.floaters.shift();
    if (!w.started) return;
    const sitting = this.list.filter((m) => m.state === 'sit');
    if (hours && sitting.length && d < MER_EARSHOT) {
      if (!this.heard) {
        this.heard = true;
        this.onHear?.();
      }
      if (!this.sighted && d < MER_SIGHT) {
        this.sighted = true;
        this.onSight?.();
      }
      if (this.hush) this.phrase = [];
      else this.song(dt, w, sitting);
    } else this.phrase = [];
    if (!hours && !this.emptied && d < MER_SIGHT) {
      this.emptied = true;
      this.onEmpty?.();
    }
  }

  /** A phrase now and then, each from one of them in turn: its notes go out one at a time as they come due. */
  private song(dt: number, w: World, sitting: Mermaid[]): void {
    if (!this.phrase.length) {
      this.wait -= dt;
      if (this.wait > 0) return;
      this.phrase = merPhrase(w.rng);
      this.phraseAt = 0;
      this.phraseT = 0;
      this.singer = (this.singer + 1) % this.list.length;
      this.wait = PHRASE_GAP[0] + w.rng() * PHRASE_GAP[1];
    }
    const m = sitting.find((s) => s === this.list[this.singer]) ?? (sitting[0] as Mermaid);
    this.phraseT += dt;
    let due = this.phrase.slice(0, this.phraseAt).reduce((s, n) => s + n[1], 0);
    while (this.phraseAt < this.phrase.length && this.phraseT >= due) {
      const [note, secs] = this.phrase[this.phraseAt] as MerNote;
      this.sing(m, note, secs);
      this.onNote?.(note, secs, m);
      due += secs;
      this.phraseAt++;
    }
    if (this.phraseAt >= this.phrase.length && this.phraseT >= due) this.phrase = [];
  }

  /** She sings a note: her mouth open and her arm out for so long, and the note drifting up off her. */
  sing(m: Mermaid, note: number, secs: number): void {
    m.sing = secs;
    m.note = note;
    this.floaters.push({ x: m.seat.x, y: m.seat.y, z: m.seat.h + 22, t: 0, note });
  }

  private go(m: Mermaid, s: MerState): void {
    m.state = s;
    m.t = 0;
  }

  /** On the radar, each one up on her rock. */
  radar(blip: Blipper): void {
    for (const m of this.out) blip(m.seat.x, m.seat.y, 'other');
  }

  /**
   * Sitting, she is drawn with her rock in the sorted solids (render/mermaids.ts drawMerRock), and in the water, coming
   * up or going under, she sorts with them too (drawMerInWater). Her notes drift up over everything, and at night each
   * of them shines a little, so they can be found in the dark.
   */
  draw(v: DrawView, layer: Layer): void {
    if (!v.onScreen(MER_ROCKS.x, MER_ROCKS.y, MER_ROCKS.r + 160)) return;
    drawMermaids(v, layer, this);
  }
}
