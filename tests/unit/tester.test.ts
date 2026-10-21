import { describe, expect, it } from 'vitest';
import { CROWS } from '../../src/entities/crows';
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
import {
  type Owed,
  owedScenes,
  STEPS,
  type Story,
  skipTo,
  stepsDone,
  testerFromHash,
} from '../../src/ui/tester';

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
    pelicanBeaten: false,
    feederFull: false,
    crows: 0,
    catermanFree: false,
    skullKey: false,
    cryptWon: false,
    stealth1: false,
    invis: false,
    tarLeaderBeaten: false,
    eelStage: 0,
    skrillBeaten: false,
    krakenBeaten: false,
  };
}

const at = (id: string) => STEPS.findIndex((s) => s.id === id);

describe('the tester panel', () => {
  it('skips past the Skeleton Shark King, and everything before him, and nothing after', () => {
    const s = fresh();
    skipTo(s, at('king'));
    expect(s).toMatchObject({
      isle3Seen: true,
      // The tar monster's scene still to come: it plays the next time the boat is out, and moves this to 4.
      isle3Stage: 3,
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
      isle3Stage: ISLE3_STAGES - 1,
      isle4Stage: ISLE4_STAGES,
      isle5Stage: ISLE5_STAGES,
      isle6Stage: ISLE6_STAGES,
      isle7Stage: ISLE7_STAGES,
      heronStage: HERON_STAGES,
      soulArmour: true,
      isle8Seen: true,
      pelicanBeaten: true,
      crows: CROWS,
      catermanFree: true,
      skullKey: true,
      cryptWon: true,
      stealth1: true,
      tarLeaderBeaten: true,
      eelStage: 2,
      skrillBeaten: true,
      krakenBeaten: true,
    });
    expect(stepsDone(s)).toBe(STEPS.length);
    // Each step is something a real game can save and load back as it is.
    const back = parseSave(serializeSave({ ...defaultSave(bounds), ...s }), bounds);
    for (const k of Object.keys(s) as (keyof Story)[]) expect(back[k]).toBe(s[k]);
  });

  it('goes on past the Heron: island 10, island 11, the bridge and the tar ocean, in the order they come', () => {
    expect(STEPS.map((s) => s.id).slice(at('heron'))).toEqual([
      'heron',
      'pelican',
      'caterman',
      'crypt',
      'mission1',
      'tarleader',
      'eel',
      'skrill',
      'kraken',
    ]);
    const s = fresh();
    skipTo(s, at('pelican'));
    // The crows: one is all the far far sea needs to open.
    expect(s).toMatchObject({
      heronStage: HERON_STAGES,
      pelicanBeaten: true,
      feederFull: true,
      crows: CROWS,
    });
    expect(s.catermanFree).toBe(false);
    skipTo(s, at('mission1'));
    expect(s).toMatchObject({
      catermanFree: true,
      skullKey: true,
      cryptWon: true,
      stealth1: true,
      invis: true,
    });
    expect(s.tarLeaderBeaten).toBe(false);
    expect(s.eelStage).toBe(0);
    expect(stepsDone(s)).toBe(at('mission1') + 1);
  });

  it('marks only who is beaten and what was won: the places are still to find, and the castle tour still to play', () => {
    const s = fresh();
    skipTo(s, STEPS.length - 1);
    const back = parseSave(serializeSave({ ...defaultSave(bounds), ...s }), bounds);
    for (const k of [
      'isle10Seen',
      'isle11Seen',
      'isle12Seen',
      'bridgeSeen',
      'tarIsleSeen',
    ] as const)
      expect(back[k]).toBe(false);
    // The Forgotten One kneels in the crypt, waiting to show you his castle: his cutscene, then the scanner.
    expect(back.cryptWon).toBe(true);
    expect(back.castleHQ).toBe(false);
    expect(back.scanner).toBe(0);
  });

  it('lists the cutscenes a skip left still to see, in the story order, each with where it plays', () => {
    const none: Owed = {
      isle3Stage: 4,
      kingOwed: false,
      heronStage: 0,
      heronFled: false,
      oldOwed: false,
      isle7Stage: 0,
      cryptWon: false,
      castleHQ: false,
    };
    expect(owedScenes(none)).toEqual([]);
    // A game skipped from the start to the crypt: every one of them is still to see.
    const all = owedScenes({
      isle3Stage: 3,
      kingOwed: true,
      heronStage: 2,
      heronFled: false,
      oldOwed: true,
      isle7Stage: 4,
      cryptWon: true,
      castleHQ: false,
    });
    expect(all.map(([n]) => n)).toEqual([
      'The tar monster rising',
      "The Skeleton Shark King's last words",
      "The Heron's escape",
      'The Old One rising',
      'The Forgotten One showing you his castle',
    ]);
    expect(all[1]?.[1]).toContain('island 5');
    // Seen: the Heron fled, and the castle shown (which is the Old One's end too).
    expect(
      owedScenes({
        ...none,
        heronStage: 2,
        heronFled: true,
        oldOwed: true,
        isle7Stage: 4,
        cryptWon: true,
        castleHQ: true,
      }),
    ).toEqual([]);
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
