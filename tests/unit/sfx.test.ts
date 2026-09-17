/**
 * Every cue is locked to the prototype: the exact tone() calls are found in
 * the legacy file, run through a recorder, and compared note for note with
 * what the named cue plays.
 */
import { afterEach, describe, expect, it } from 'vitest';
import legacy from '../../legacy/net-profit.html?raw';
import { captureNotes, cues, type Note, tone } from '../../src/audio/sfx';

type Env = { combo?: number; sc?: { sp: number }; saleN?: number; sp?: number };

/** Cue name, the legacy source of its notes, how to call the cue, and the legacy variables it reads. */
const table: [keyof typeof cues, string, unknown[], Env][] = [
  ['click', "tone(700,.08,'triangle',.08);", [], {}],
  ['denied', "tone(180,.12,'square',.05);", [], {}],
  ['toggleSound', "tone(660,.08,'triangle',.08);", [], {}],
  ['castOff', "tone(392,.12,'triangle',.1); tone(587,.2,'triangle',.1,0,.1);", [], {}],
  [
    'upgrade',
    "tone(523,.1,'triangle',.1); tone(659,.1,'triangle',.1,0,.08); tone(784,.16,'triangle',.1,0,.16);",
    [],
    {},
  ],
  [
    'tierUp',
    "tone(392,.12,'triangle',.1,0,.25); tone(523,.12,'triangle',.1,0,.35); tone(784,.3,'triangle',.1,0,.45);",
    [],
    {},
  ],
  ['build', "[523,659,784,1047].forEach((f,i) => tone(f,.16,'triangle',.1,0,i*.11));", [], {}],
  [
    'fish',
    "tone(500 + combo*34 + sc.sp*60, .08, 'sine', .07);",
    [5, 3],
    { combo: 5, sc: { sp: 3 } },
  ],
  ['holdFull', "tone(330,.18,'triangle',.1); tone(262,.25,'triangle',.1,0,.15);", [], {}],
  [
    'sale',
    "tone(620 + Math.min(saleN,30)*16 + sp*40, .07, 'triangle', .07);",
    [44, 6],
    { saleN: 44, sp: 6 },
  ],
  [
    'orderFilled',
    "tone(659,.1,'triangle',.1,0,.1); tone(880,.1,'triangle',.1,0,.2); tone(1319,.3,'triangle',.1,0,.3);",
    [],
    {},
  ],
  ['sold', "tone(880,.1,'triangle',.1); tone(1175,.22,'triangle',.1,0,.09);", [], {}],
  ['pirateChase', "tone(196,.2,'sawtooth',.06); tone(185,.3,'sawtooth',.06,0,.2);", [], {}],
  ['pirateSteal', "tone(220,.35,'sawtooth',.09,.4); tone(110,.4,'square',.06,.5,.1);", [], {}],
  ['sharkWarning', "tone(150,.25,'sawtooth',.05); tone(140,.25,'sawtooth',.05,0,.3);", [], {}],
  [
    'sharkCaught',
    "tone(330,.12,'triangle',.1); tone(494,.12,'triangle',.1,0,.1); tone(740,.25,'triangle',.1,0,.2);",
    [],
    {},
  ],
  ['netTorn', "tone(200,.3,'sawtooth',.08,.35);", [], {}],
  ['salvage', "tone(784,.09,'triangle',.09); tone(1047,.16,'triangle',.09,0,.08);", [], {}],
  ['phaseChange', "tone(660,.2,'sine',.06); tone(990,.35,'sine',.05,0,.18);", [], {}],
  [
    'rareCaught',
    "[784,988,1175,1568].forEach((f,i) => tone(f,.18,'triangle',.1,0,i*.09));",
    [],
    {},
  ],
  ['leviathan', "tone(55,1.4,'sine',.14); tone(41,1.8,'sine',.12,0,.3);", [], {}],
  ['driftwood', "tone(233,.07,'square',.05); tone(349,.1,'square',.05,0,.07);", [], {}],
  ['dolphins', "tone(1400,.09,'sine',.05,1.5); tone(1800,.12,'sine',.05,1.3,.1);", [], {}],
  ['rangeEdge', "tone(160,.2,'triangle',.06);", [], {}],
];

/** The prototype's tone() defaults, applied by the recorder so tuples compare whole. */
const record =
  (notes: Note[]) =>
  (f: number, d = 0.12, type: Note[2] = 'sine', vol = 0.1, slide = 0, delay = 0) => {
    notes.push([f, d, type, vol, slide, delay]);
  };

afterEach(() => captureNotes(null));

describe('cues', () => {
  it('cover every tone() call in the legacy file', () => {
    const legacyCalls = (legacy.match(/\btone\(/g) ?? []).length - 1; // minus the definition
    const covered = table.reduce((n, [, src]) => n + (src.match(/\btone\(/g) ?? []).length, 0);
    // click and denied are used at several sites; every other site appears once.
    const sites =
      legacy.split("tone(700,.08,'triangle',.08)").length -
      1 +
      legacy.split("tone(180,.12,'square',.05)").length -
      1;
    expect(covered + sites - 2).toBe(legacyCalls);
  });

  for (const [name, src, args, env] of table) {
    it(`${name} plays exactly the legacy notes`, () => {
      expect(legacy, `legacy no longer contains: ${src}`).toContain(src);
      // The prototype's own line, run with a recorder in place of tone(). The
      // source is the repo's committed reference file, never an input.
      const expected: Note[] = [];
      const run = new Function('tone', 'combo', 'sc', 'saleN', 'sp', src) as (
        tone: (
          f: number,
          d?: number,
          type?: Note[2],
          vol?: number,
          slide?: number,
          delay?: number,
        ) => void,
        combo?: number,
        sc?: { sp: number },
        saleN?: number,
        sp?: number,
      ) => void;
      run(record(expected), env.combo, env.sc, env.saleN, env.sp);

      const actual: Note[] = [];
      captureNotes((...note) => actual.push(note));
      (cues[name] as (...a: unknown[]) => void)(...args);

      expect(actual).toEqual(expected);
      expect(actual.length).toBeGreaterThan(0);
    });
  }
});

describe('tone', () => {
  it('fills the prototype defaults', () => {
    const got: Note[] = [];
    captureNotes((...n) => got.push(n));
    tone(440);
    expect(got).toEqual([[440, 0.12, 'sine', 0.1, 0, 0]]);
  });
});
