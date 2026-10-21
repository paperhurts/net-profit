import { describe, expect, it } from 'vitest';
import {
  ARENA_SIZES,
  arenaSpots,
  BARGE_DROP,
  BARGE_FOES,
  BARGE_LEAN,
  BARGE_MAX,
  BOSS_FOES,
  bargeAdd,
  bargeTotal,
  bargeZoom,
  defaultBarge,
  FIGHTER_FOES,
  FOE_NAMES,
  noPick,
  noTarPick,
  parseBarge,
  SEA_ARENA,
  TAR_ARENA,
  TAR_FOES,
  TAR_NAMES,
  tarAdd,
  tarTotal,
  UNDEAD_FOES,
} from '../../src/data/barge';
import { UNDEAD } from '../../src/entities/undead';
import { walkable } from '../../src/entities/walker';
import { ARENAS, entry, ROOMS, type Room, roomAt } from '../../src/world/tower';

describe('the Battle Barge: picking a fight', () => {
  it('starts with a medium arena, three monkeys and two skeletons', () => {
    const b = defaultBarge();
    expect(b.size).toBe('medium');
    expect(bargeTotal(b.pick)).toBe(5);
  });

  it('keeps a pick to ten all told, and never below none of a kind', () => {
    let p = noPick();
    for (let i = 0; i < 14; i++) p = bargeAdd(p, BARGE_FOES[i % BARGE_FOES.length] ?? 'monkey', 1);
    expect(bargeTotal(p)).toBe(BARGE_MAX);
    const full = bargeAdd(p, 'zombie', 1);
    expect(bargeTotal(full)).toBe(BARGE_MAX);
    expect(full.zombie).toBe(p.zombie);
    p = bargeAdd(noPick(), 'ghost', -1);
    expect(p.ghost).toBe(0);
    // Adding many at once stops at ten too.
    expect(bargeAdd(noPick(), 'lagoon', 30).lagoon).toBe(BARGE_MAX);
  });

  it('reads a saved setup back, dropping what it does not know and keeping to ten', () => {
    expect(parseBarge(undefined)).toEqual(defaultBarge());
    expect(parseBarge('large')).toEqual(defaultBarge());
    const b = parseBarge({ size: 'large', pick: { zombie: 3, ghost: 2.7, pirate: 4, monkey: -2 } });
    expect(b.size).toBe('large');
    expect(b.pick).toEqual({ ...noPick(), zombie: 3, ghost: 2 });
    expect(parseBarge({ size: 'huge', pick: { skeleton: 50 } })).toEqual({
      size: 'medium',
      pick: { ...noPick(), skeleton: BARGE_MAX },
      where: 'foot',
      sea: defaultBarge().sea,
      isles: [],
      tar: [],
      bridges: [],
      tarFoes: defaultBarge().tarFoes,
    });
  });

  it('names every enemy on the card, and its undead are the undead the castle has', () => {
    for (const k of BARGE_FOES) expect(FOE_NAMES[k][0].length).toBeGreaterThan(2);
    for (const k of UNDEAD_FOES) expect(UNDEAD[k as keyof typeof UNDEAD]).toBeDefined();
    expect(
      BARGE_FOES.filter(
        (k) => !UNDEAD_FOES.includes(k) && !FIGHTER_FOES.includes(k) && !BOSS_FOES.includes(k),
      ),
    ).toEqual([
      'monkey',
      'hired',
      'gorilla',
      'gator',
      'lancer',
      'tarhuman',
      'tarbeast',
      'boneman',
      'displacer',
    ]);
    expect(FIGHTER_FOES).toEqual(['swordsman', 'red', 'blue', 'green']);
    // The bosses come last on the card.
    expect(BARGE_FOES.slice(-BOSS_FOES.length)).toEqual([...BOSS_FOES]);
    // Each kind once, and none picked to start but the start's.
    expect(new Set(BARGE_FOES).size).toBe(BARGE_FOES.length);
    expect(Object.keys(noPick()).sort()).toEqual([...BARGE_FOES].sort());
  });

  it('reads an old save from before the second stage, with none of the new enemies picked', () => {
    const old = { size: 'small', pick: { monkey: 2, skeleton: 1, lagoon: 3 } };
    const b = parseBarge(old);
    expect(b.pick).toEqual({ ...noPick(), monkey: 2, skeleton: 1, lagoon: 3 });
    expect(b.pick.gorilla).toBe(0);
    expect(b.pick.swordsman).toBe(0);
  });

  it("reads an old save from before the fourth stage, with none of the tar island's or Skull Island's picked", () => {
    const b = parseBarge({ size: 'large', pick: { gorilla: 2, heron: 1 } });
    expect(b.pick).toEqual({ ...noPick(), gorilla: 2, heron: 1 });
    for (const k of ['tarhuman', 'tarbeast', 'boneman', 'displacer'] as const)
      expect(b.pick[k]).toBe(0);
  });

  it('on the tar: the eel, the tentacles and the kraken, ten at most, and an old save starts there with the eel', () => {
    expect([...TAR_FOES]).toEqual(['eel', 'tentacle', 'kraken']);
    for (const k of TAR_FOES) expect(TAR_NAMES[k][1].length).toBeGreaterThan(10);
    let p = noTarPick();
    p = tarAdd(p, 'eel', 4);
    p = tarAdd(p, 'kraken', 9);
    expect(tarTotal(p)).toBe(BARGE_MAX);
    expect(tarAdd(p, 'kraken', -20).kraken).toBe(0);
    // Read back: where it was, and who; a save from before it has the eel ready, on foot still.
    const b = parseBarge({
      size: 'large',
      where: 'tar',
      tarFoes: { eel: 2, tentacle: 3, kraken: 1, nobody: 4 },
    });
    expect([b.where, b.tarFoes]).toEqual(['tar', { eel: 2, tentacle: 3, kraken: 1 }]);
    const old = parseBarge({ size: 'small', where: 'sea', sea: { meteor: 1 } });
    expect([old.where, old.tarFoes]).toEqual(['sea', { eel: 1, tentacle: 0, kraken: 0 }]);
    expect(parseBarge({ where: 'moon' }).where).toBe('foot');
    // Out past everything, north of the sea, and clear of the tar ocean and of the sea's own ring.
    expect(TAR_ARENA.y).toBeLessThan(-5400 - 1500);
    expect(TAR_ARENA.x + 1500).toBeLessThan(-5400);
    expect(Math.hypot(TAR_ARENA.x - SEA_ARENA.x, TAR_ARENA.y - SEA_ARENA.y)).toBeGreaterThan(3000);
  });

  it('has Skrill last of all its bosses, and an old save from before him reads with him not picked', () => {
    expect(BOSS_FOES.at(-1)).toBe('skrill');
    expect(FOE_NAMES.skrill[0]).toBe('Skrill');
    expect(FOE_NAMES.skrill[1]).toContain('20 hits');
    const b = parseBarge({ size: 'medium', pick: { tarleader: 1, tardragon: 1 } });
    expect(b.pick).toEqual({ ...noPick(), tarleader: 1, tardragon: 1 });
    expect(b.pick.skrill).toBe(0);
    expect(parseBarge({ size: 'medium', pick: { skrill: 2 } }).pick.skrill).toBe(2);
  });
});

describe('the Battle Barge: its arenas', () => {
  it('has a small, a medium and a large one, each a room of its own, walkable from the way in', () => {
    const rs = ARENA_SIZES.map((k) => ROOMS[ARENAS[k]] as Room);
    expect(rs.map((r) => r.kind)).toEqual(['arena', 'arena', 'arena']);
    expect(rs[0]?.r).toBeLessThan(rs[1]?.r ?? 0);
    expect(rs[1]?.r).toBeLessThan(rs[2]?.r ?? 0);
    for (const k of ARENA_SIZES) {
      const i = ARENAS[k];
      const e = entry(i);
      expect(walkable(e.x, e.y, 0)).toBe(true);
      expect(roomAt(e.x, e.y)).toBe(i);
    }
  });

  it('stands every enemy picked on the deck, apart, round the back, away from the way in', () => {
    for (const k of ARENA_SIZES) {
      const i = ARENAS[k];
      const R = ROOMS[i] as Room;
      const e = entry(i);
      for (let n = 1; n <= BARGE_MAX; n++) {
        const spots = arenaSpots(n, R.r);
        expect(spots).toHaveLength(n);
        for (const s of spots) {
          expect(walkable(R.x + s.x, R.y + s.y, 0)).toBe(true);
          expect(Math.hypot(R.x + s.x - e.x, R.y + s.y - e.y)).toBeGreaterThan(R.r * 0.6);
        }
        for (let a = 0; a < spots.length; a++)
          for (let b = a + 1; b < spots.length; b++) {
            const p = spots[a] as { x: number; y: number };
            const q = spots[b] as { x: number; y: number };
            expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(20);
          }
      }
    }
  });
});

describe('the Battle Barge camera', () => {
  it('stands further back the bigger the arena, leans a little toward the figure, and sits the deck a little low', () => {
    const [small, medium, large] = [150, 200, 260].map(bargeZoom) as [number, number, number];
    expect(small).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(large);
    expect(large).toBeGreaterThan(0.5);
    expect(small).toBeLessThan(1);
    expect(BARGE_LEAN).toBeGreaterThan(0);
    expect(BARGE_LEAN).toBeLessThan(0.5);
    expect(BARGE_DROP).toBeGreaterThan(0);
    expect(BARGE_DROP).toBeLessThan(0.1);
  });
});
