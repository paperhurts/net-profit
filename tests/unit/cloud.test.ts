import { describe, expect, it } from 'vitest';
import { type Cloud, getGame, makeCode, putGame, readCode, WORDS } from '../../src/state/cloud';
import { type Bounds, parseSave, serializeSave } from '../../src/state/save';

const at: Cloud = { url: 'https://x.supabase.co', key: 'sb_publishable_abc' };
type Call = { url: string; init: RequestInit };
const answer = (body: unknown, status = 200) => {
  const calls: Call[] = [];
  const f = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  };
  return { calls, f };
};

describe('save codes', () => {
  it('are made of 256 short words, each easy to type', () => {
    expect(WORDS).toHaveLength(256);
    expect(new Set(WORDS).size).toBe(256);
    for (const w of WORDS) expect(w).toMatch(/^[a-z]{3,7}$/);
  });

  it('are four of them, one for each random byte', () => {
    expect(makeCode([0, 1, 2, 255])).toBe(`${WORDS[0]}-${WORDS[1]}-${WORDS[2]}-${WORDS[255]}`);
    expect(makeCode([256 + 3, 0, 0, 0]).split('-')[0]).toBe(WORDS[3]);
  });

  it('are read however they are typed, and only if they are four of the words', () => {
    expect(readCode('Otter Maple  reef, COVE')).toBe('otter-maple-reef-cove');
    expect(readCode(' otter-maple-reef-cove\n')).toBe('otter-maple-reef-cove');
    expect(readCode('otter maple reef')).toBeNull();
    expect(readCode('otter maple reef cove sun')).toBeNull();
    expect(readCode('otter maple reef zzzz')).toBeNull();
    expect(readCode('https://example.com/#game=zAbc')).toBeNull();
  });
});

describe('the game online', () => {
  it('is put there by the save function, under its code, with what it has earned', async () => {
    const { calls, f } = answer({ saved: true, earned: 1200, at: '2026-10-16T16:00:00Z' });
    const r = await putGame('otter-maple-reef-cove', 'zGAME', 1200.7, { cloud: at, f });
    expect(r).toEqual({ saved: true, earned: 1200 });
    const c = calls[0] as Call;
    expect(c.url).toBe('https://x.supabase.co/rest/v1/rpc/np_save_game');
    expect(c.init.method).toBe('POST');
    expect(JSON.parse(String(c.init.body))).toEqual({
      p_code: 'otter-maple-reef-cove',
      p_game: 'zGAME',
      p_earned: 1200,
    });
    const h = c.init.headers as Record<string, string>;
    expect(h.apikey).toBe('sb_publishable_abc');
    // A publishable key goes as the key alone; a legacy one as a token too.
    expect(h.authorization).toBeUndefined();
    const legacy = answer({ saved: true, earned: 1 });
    await putGame('otter-maple-reef-cove', 'zGAME', 1, {
      cloud: { ...at, key: 'eyJabc' },
      f: legacy.f,
    });
    const lc = legacy.calls[0] as Call;
    expect((lc.init.headers as Record<string, string>).authorization).toBe('Bearer eyJabc');
  });

  it('says when it was refused, because the game there has earned more', async () => {
    const { f } = answer({ saved: false, earned: 9000 });
    expect(await putGame('otter-maple-reef-cove', 'zOLD', 10, { cloud: at, f })).toEqual({
      saved: false,
      earned: 9000,
    });
  });

  it('is fetched by its code, or is not there', async () => {
    const got = answer({ game: 'zGAME', earned: 9000, at: '2026-10-16T16:00:00Z' });
    expect(await getGame('otter-maple-reef-cove', { cloud: at, f: got.f })).toEqual({
      game: 'zGAME',
      earned: 9000,
      at: '2026-10-16T16:00:00Z',
    });
    expect(got.calls[0]?.url).toBe('https://x.supabase.co/rest/v1/rpc/np_load_game');
    expect(await getGame('otter-maple-reef-cove', { cloud: at, f: answer(null).f })).toBeNull();
  });

  it('never throws: unreached, asleep, refused by the server, or with no address, it is down', async () => {
    const thrown = async () => {
      throw new TypeError('offline');
    };
    expect(await putGame('otter-maple-reef-cove', 'z', 1, { cloud: at, f: thrown })).toBe('down');
    expect(await getGame('otter-maple-reef-cove', { cloud: at, f: thrown })).toBe('down');
    // A paused project answers 540.
    const asleep = answer({ message: 'paused' }, 540);
    expect(await putGame('otter-maple-reef-cove', 'z', 1, { cloud: at, f: asleep.f })).toBe('down');
    const none = answer({});
    expect(await getGame('otter-maple-reef-cove', { cloud: { url: '', key: '' }, f: none.f })).toBe(
      'down',
    );
    expect(none.calls).toHaveLength(0);
  });
});

describe('the save code in the save', () => {
  const bounds: Bounds = {
    maxLevel: 5,
    paints: 10,
    stages: 5,
    species: 12,
    worldSize: 4800,
    deep: 9000,
    holdCaps: [10, 20, 30, 40, 50, 60],
  };
  it('is none in an old save, and kept once made, with when it was last shown', () => {
    const s = parseSave(JSON.stringify({ coins: 5 }), bounds);
    expect(s.saveCode).toBe('');
    expect(s.codeTold).toBe(0);
    s.saveCode = 'otter-maple-reef-cove';
    s.codeTold = 1_790_000_000_000;
    const t = parseSave(serializeSave(s), bounds);
    expect(t.saveCode).toBe('otter-maple-reef-cove');
    expect(t.codeTold).toBe(1_790_000_000_000);
  });

  it('is dropped if it is not a code', () => {
    for (const bad of ['otter', 'Otter-Maple-Reef-Cove', 'otter-maple-reef-zzzz', 7])
      expect(parseSave(JSON.stringify({ coins: 5, saveCode: bad }), bounds).saveCode).toBe('');
  });
});
