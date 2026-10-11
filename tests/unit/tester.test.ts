import { describe, expect, it } from 'vitest';
import {
  type Bounds,
  defaultSave,
  HERON_STAGES,
  ISLE3_STAGES,
  ISLE4_STAGES,
  ISLE5_STAGES,
  ISLE6_STAGES,
  ISLE7_STAGES,
  parseSave,
  serializeSave,
} from '../../src/state/save';
import { STEPS, type Story, skipTo, stepsDone, testerFromHash } from '../../src/ui/tester';

const bounds: Bounds = {
  maxLevel: 5,
  paints: 10,
  stages: 5,
  species: 19,
  worldSize: 4800,
  holdCaps: [12, 20, 32, 50, 80, 120],
};

function fresh(): Story {
  return {
    isle3Seen: false,
    isle3Stage: 0,
    isle4Stage: 0,
    isle5Seen: false,
    isle5Stage: 0,
    isle6Seen: false,
    isle6Stage: 0,
    isle7Seen: false,
    isle7Stage: 0,
    soulArmour: false,
    isle8Seen: false,
    heronStage: 0,
  };
}

const at = (id: string) => STEPS.findIndex((s) => s.id === id);

describe('the tester panel', () => {
  it('skips past the Skeleton Shark King, and everything before him, and nothing after', () => {
    const s = fresh();
    skipTo(s, at('king'));
    expect(s).toMatchObject({
      isle3Seen: true,
      isle3Stage: 4,
      isle4Stage: 1,
      isle5Seen: true,
      isle5Stage: 1,
      isle6Seen: false,
      isle6Stage: 0,
      isle7Stage: 0,
      heronStage: 0,
    });
    expect(stepsDone(s)).toBe(at('king') + 1);
    expect(stepsDone(fresh())).toBe(0);
  });

  it('never takes the story back: a step behind it changes nothing', () => {
    const s = fresh();
    s.isle7Seen = true;
    s.isle7Stage = 3;
    skipTo(s, at('anchorer'));
    expect(s.isle7Stage).toBe(3);
    const t = { ...s };
    skipTo(t, at('isle3'));
    expect(t).toEqual(s);
  });

  it('runs the whole story to the end, every stage at its last, and the save keeps it', () => {
    const s = fresh();
    skipTo(s, STEPS.length - 1);
    expect(s).toMatchObject({
      isle3Stage: ISLE3_STAGES,
      isle4Stage: ISLE4_STAGES,
      isle5Stage: ISLE5_STAGES,
      isle6Stage: ISLE6_STAGES,
      isle7Stage: ISLE7_STAGES,
      heronStage: HERON_STAGES,
      soulArmour: true,
      isle8Seen: true,
    });
    expect(stepsDone(s)).toBe(STEPS.length);
    // Each step is something a real game can save and load back as it is.
    const back = parseSave(serializeSave({ ...defaultSave(bounds), ...s }), bounds);
    for (const k of Object.keys(s) as (keyof Story)[]) expect(back[k]).toBe(s[k]);
  });

  it('is switched on and off by the end of the link, and by nothing else', () => {
    expect(testerFromHash('#tester')).toBe('on');
    expect(testerFromHash('#Tester')).toBe('on');
    expect(testerFromHash('#tester-off')).toBe('off');
    expect(testerFromHash('')).toBeNull();
    expect(testerFromHash('#testers')).toBeNull();
    expect(testerFromHash('#game=abc')).toBeNull();
  });
});
