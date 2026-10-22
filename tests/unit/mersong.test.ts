import { describe, expect, it } from 'vitest';
import {
  AGAIN_T,
  MerSong,
  merTune,
  RIGHT_T,
  SLOWEST,
  TUNE_MAX,
  TUNE_MIN,
  TUNE_NOTE,
  tuneLength,
  YOURS_AFTER,
} from '../../src/entities/mersong';

const run = (s: MerSong, secs: number) => {
  for (let t = 0; t < secs - 1e-9; t += 1 / 60) s.step(1 / 60);
};

/** A song with what it said, in order. */
function song(tune: number[]) {
  const s = new MerSong(tune);
  const said: string[] = [];
  s.onNote = (n, _secs, by) => said.push(`${by} ${n}`);
  s.onYours = () => said.push('yours');
  s.onWrong = (n) => said.push(`wrong ${n}`);
  s.onRight = () => said.push('right');
  s.onDone = () => said.push('done');
  return { s, said };
}

describe('singing with the mermaids', () => {
  it('starts at three notes, a note longer for each pearl given, seven at most', () => {
    expect([0, 1, 2, 4, 99].map(tuneLength)).toEqual([TUNE_MIN, 4, 5, TUNE_MAX, TUNE_MAX]);
  });

  it('makes tunes that step among the four notes, never the same twice running', () => {
    let seed = 3;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let len = TUNE_MIN; len <= TUNE_MAX; len++)
      for (let i = 0; i < 40; i++) {
        const t = merTune(len, r);
        expect(t).toHaveLength(len);
        for (const [k, n] of t.entries()) {
          expect(n >= 0 && n <= 3).toBe(true);
          if (k) {
            const d = Math.abs(n - (t[k - 1] as number));
            expect(d === 1 || d === 2).toBe(true);
          }
        }
      }
  });

  it('she sings it, the shells lighting in turn, then it is yours; sung back right, the pearl', () => {
    const { s, said } = song([0, 2, 1]);
    s.step(0.01);
    expect([said, s.lit]).toEqual([['her 0'], 0]);
    // Nothing tapped counts while she sings.
    expect(s.press(0)).toBe(false);
    run(s, 3 * s.per + YOURS_AFTER + 0.05);
    expect(said).toEqual(['her 0', 'her 2', 'her 1', 'yours']);
    for (const n of [0, 2, 1]) expect(s.press(n)).toBe(true);
    expect(s.state).toBe('right');
    run(s, RIGHT_T + 0.1);
    expect(said.slice(4)).toEqual(['you 0', 'you 2', 'you 1', 'right', 'done']);
    expect(s.state).toBe('done');
  });

  it('a wrong note and she sings it again, a little slower each time, down to the slowest', () => {
    const { s, said } = song([3, 1]);
    run(s, 2 * s.per + YOURS_AFTER + 0.05);
    expect(s.press(3)).toBe(true);
    expect(s.press(2)).toBe(false);
    expect([s.state, s.wrongs, said.at(-1)]).toEqual(['again', 1, 'wrong 2']);
    const per = s.per;
    run(s, AGAIN_T + 0.05);
    expect(s.state).toBe('listen');
    expect(s.per).toBeGreaterThan(per);
    expect(said.at(-1)).toBe('her 3');
    for (let i = 0; i < 6; i++) {
      run(s, 2 * s.per + YOURS_AFTER + 0.05);
      s.press(0);
      run(s, AGAIN_T + 0.05);
    }
    expect(s.slow).toBeCloseTo(SLOWEST, 5);
    // Still hers to sing, and still yours to get right.
    run(s, 2 * s.per + YOURS_AFTER + 0.05);
    expect(s.press(3) && s.press(1)).toBe(true);
    expect(s.state).toBe('right');
    expect(TUNE_NOTE).toBeGreaterThan(0.3);
  });
});
