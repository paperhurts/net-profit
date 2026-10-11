import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Bounds, defaultSave, parseSave, serializeSave } from '../../src/state/save';
import {
  GAME_HASH,
  gameCode,
  gameLink,
  gameSummary,
  looksLikeSave,
  packGame,
  unpackGame,
} from '../../src/state/share';

const bounds: Bounds = {
  maxLevel: 5,
  paints: 10,
  stages: 5,
  species: 19,
  worldSize: 4800,
  holdCaps: [12, 20, 32, 50, 80, 120],
};

/** A save from well along: coins, a log, the story, and a fog map. */
function lateSave(): string {
  const d = defaultSave(bounds);
  return serializeSave({
    ...d,
    coins: 34567,
    day: 41,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    log: d.log.map((_, i) => i * 3),
    flag: d.flag,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('your game, on another device', () => {
  it('goes into a link squeezed small, and comes back out just as it was', async () => {
    const json = lateSave();
    const code = await packGame(json);
    expect(code[0]).toBe('z');
    expect(code.length).toBeLessThan(json.length);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = await unpackGame(code);
    expect(back).toEqual({ json });
    // And the game reads it as the same save.
    if ('json' in back) expect(parseSave(back.json, bounds)).toEqual(parseSave(json, bounds));
  });

  it('goes in plain where the browser cannot squeeze, and either kind opens', async () => {
    const json = lateSave();
    vi.stubGlobal('CompressionStream', undefined);
    const code = await packGame(json);
    expect(code[0]).toBe('j');
    expect(await unpackGame(code)).toEqual({ json });
  });

  it('says so when a squeezed game reaches a browser that cannot unsqueeze it', async () => {
    const code = await packGame(lateSave());
    vi.stubGlobal('DecompressionStream', undefined);
    expect(await unpackGame(code)).toEqual({ fault: 'old' });
  });

  it('turns away a code that is not a game', async () => {
    expect(await unpackGame('zAAAA')).toEqual({ fault: 'bad' });
    expect(await unpackGame(`q${'A'.repeat(20)}`)).toEqual({ fault: 'bad' });
    expect(await unpackGame('j')).toEqual({ fault: 'bad' });
    expect(await unpackGame('j!!!')).toEqual({ fault: 'bad' });
  });

  it('finds the code in a whole link, a bare #game=, or the code alone, and nothing in anything else', async () => {
    const code = await packGame(lateSave());
    const link = gameLink('https://net-profit.paperhurts.dev/?x=1#tester', code);
    expect(link).toBe(`https://net-profit.paperhurts.dev/?x=1#${GAME_HASH}${code}`);
    expect(gameCode(link)).toBe(code);
    expect(gameCode(`  ${link}\n`)).toBe(code);
    expect(gameCode(`#${GAME_HASH}${code}`)).toBe(code);
    expect(gameCode(`${GAME_HASH}${code}`)).toBe(code);
    expect(gameCode(code)).toBe(code);
    // A link broken over two lines by a message app still works.
    expect(gameCode(`${link.slice(0, 60)}\n${link.slice(60)}`)).toBe(code);
    expect(gameCode('https://net-profit.paperhurts.dev/#tester')).toBeNull();
    expect(gameCode('hello')).toBeNull();
    expect(gameCode('')).toBeNull();
  });
});

describe('telling two games apart', () => {
  it('knows a save from anything else', () => {
    expect(looksLikeSave(lateSave())).toBe(true);
    expect(looksLikeSave('{"coins":0}')).toBe(true);
    for (const x of ['', 'null', '[]', '{}', '{"coins":"lots"}', 'not json', '42'])
      expect(looksLikeSave(x)).toBe(false);
  });

  it('says its day, its coins, and the last boss it is past', () => {
    const d = parseSave(lateSave(), bounds);
    expect(gameSummary(d)).toBe('day 41, 34,567 coins, past the Skeleton Shark King');
    expect(gameSummary(defaultSave(bounds))).toBe('day 1, 0 coins');
  });
});
