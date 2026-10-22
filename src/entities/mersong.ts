/**
 * Singing with the mermaids, part two of the owner's mermaids (2026-10-22: "sing it back", her pick for what you do
 * when you find them). Stopped by their rocks in their hours, one of the sisters sings you a short tune on their four
 * notes, the four shells lighting as she sings; then it is yours to sing back, tapping the shells in the same order.
 * Right, and she gives you a pearl: one a night. A wrong note and she sings it again, a little slower: nothing is ever
 * lost. Each pearl makes the next tune a note longer, three notes at first and seven at most.
 *
 * Pure: the game plays the notes, lights the shells and gives the pearl through the callbacks.
 */
import { clamp } from '../core/math';

/** The shortest tune and the longest. */
export const TUNE_MIN = 3;
export const TUNE_MAX = 7;
/** While she sings: seconds a note lasts, and the breath between two. */
export const TUNE_NOTE = 0.5;
export const TUNE_GAP = 0.15;
/** After her last note, before it is yours. */
export const YOURS_AFTER = 0.5;
/** After a wrong note, before she sings it again; each time again a little slower, down to the slowest. */
export const AGAIN_T = 1.4;
export const SLOWER = 1.25;
export const SLOWEST = 1.6;
/** Your notes ring this long. */
export const YOUR_NOTE = 0.4;
/** Sung right: their song together, before the pearl. */
export const RIGHT_T = 2;
/** Pearls the mermaids string into a charm against the sirens. */
export const CHARM_PEARLS = 5;

/** She sings; it is yours; a wrong note, before she sings it again; sung right; over. */
export type SongState = 'listen' | 'yours' | 'again' | 'right' | 'done';

/** How long tonight's tune is, for this many pearls already given. */
export function tuneLength(given: number): number {
  return clamp(TUNE_MIN + Math.max(0, given), TUNE_MIN, TUNE_MAX);
}

/** A tune: stepping up and down among the four notes by one or two, never the same note twice running. */
export function merTune(len: number, r: () => number): number[] {
  let note = Math.floor(r() * 4);
  const out = [note];
  while (out.length < len) {
    const step = r() < 0.7 ? 1 : 2;
    const up = note + step <= 3 && (note - step < 0 || r() < 0.5);
    note = up ? note + step : note - step;
    out.push(note);
  }
  return out;
}

export class MerSong {
  state: SongState = 'listen';
  /** Seconds in this state. */
  t = 0;
  /** How much slower than at first she sings it now. */
  slow = 1;
  /** Notes sung so far: hers this time through while she sings, yours while it is yours. */
  at = 0;
  wrongs = 0;
  /** The shell lit now (-1 for none) and for how long more. */
  lit = -1;
  litT = 0;
  /** A note to play: which of the four, how long, and whose. */
  onNote: ((note: number, seconds: number, by: 'her' | 'you') => void) | null = null;
  onYours: (() => void) | null = null;
  onWrong: ((note: number) => void) | null = null;
  onRight: (() => void) | null = null;
  onDone: (() => void) | null = null;

  constructor(readonly tune: readonly number[]) {}

  /** Seconds from one of her notes to the next, as slow as she is singing now. */
  get per(): number {
    return (TUNE_NOTE + TUNE_GAP) * this.slow;
  }

  step(dt: number): void {
    this.t += dt;
    this.litT = Math.max(0, this.litT - dt);
    if (this.litT <= 0) this.lit = -1;
    if (this.state === 'listen') {
      while (this.at < this.tune.length && this.t >= this.at * this.per) {
        const n = this.tune[this.at] as number;
        this.light(n, TUNE_NOTE * this.slow);
        this.onNote?.(n, TUNE_NOTE * this.slow, 'her');
        this.at++;
      }
      if (this.at >= this.tune.length && this.t >= this.tune.length * this.per + YOURS_AFTER) {
        this.go('yours');
        this.onYours?.();
      }
    } else if (this.state === 'again' && this.t >= AGAIN_T) {
      this.slow = Math.min(SLOWEST, this.slow * SLOWER);
      this.go('listen');
    } else if (this.state === 'right' && this.t >= RIGHT_T) {
      this.go('done');
      this.onDone?.();
    }
  }

  /** A shell tapped: the next note of the tune, or a wrong one. Only while it is yours. */
  press(note: number): boolean {
    if (this.state !== 'yours') return false;
    this.light(note, YOUR_NOTE);
    if (note === this.tune[this.at]) {
      this.onNote?.(note, YOUR_NOTE, 'you');
      this.at++;
      if (this.at >= this.tune.length) {
        this.go('right');
        this.onRight?.();
      }
      return true;
    }
    this.wrongs++;
    this.go('again');
    this.onWrong?.(note);
    return false;
  }

  private light(note: number, secs: number): void {
    this.lit = note;
    this.litT = secs;
  }

  private go(s: SongState): void {
    this.state = s;
    this.t = 0;
    this.at = 0;
  }
}
