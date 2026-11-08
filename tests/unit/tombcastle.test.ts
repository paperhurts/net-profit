import { describe, expect, it } from 'vitest';
import { onLand } from '../../src/entities/walker';
import {
  SPIKE_CYCLE,
  SPIKE_UP,
  SPIKES,
  spikeAt,
  spikesUp,
  TOMB_SPAWNS,
  TRAP_FLOOR,
} from '../../src/world/tombcastle';
import { entry, ROOMS, stairs, TOMB_FLOORS, TOMB_TOP } from '../../src/world/tower';

describe("Tomb Island's castle", () => {
  it('has three floors in order and its top, each held by the undead but the top', () => {
    expect(TOMB_FLOORS).toEqual([42, 43, 44]);
    expect(TOMB_TOP).toBe(45);
    expect(ROOMS[TOMB_TOP]?.kind).toBe('tombtop');
    for (const i of TOMB_FLOORS) {
      expect(ROOMS[i]?.kind).toBe('tomb');
      expect(TOMB_SPAWNS[i]?.length).toBeGreaterThanOrEqual(3);
      for (const s of TOMB_SPAWNS[i] ?? []) expect(onLand(s.x, s.y)).toBe(true);
    }
    expect(TOMB_SPAWNS[TOMB_FLOORS[2] as number]?.map((s) => s.kind)).toEqual([
      'mummy',
      'vampire',
      'necro',
    ]);
  });

  it('sets its trap floor with spikes that take turns, and none where you come in or go up', () => {
    expect(TRAP_FLOOR).toBe(TOMB_FLOORS[1]);
    const e = entry(TRAP_FLOOR);
    const st = stairs(TRAP_FLOOR);
    expect(spikeAt(e.x, e.y)).toBeNull();
    expect(spikeAt(st.x, st.y)).toBeNull();
    for (const s of SPIKES) expect(spikeAt(s.x, s.y)).toBe(s);
    // Each set is up a while each cycle, the two never at once.
    for (let t = 0; t < SPIKE_CYCLE; t += 0.05)
      expect(spikesUp(0, t) > 0 && spikesUp(1, t) > 0).toBe(false);
    expect(spikesUp(0, SPIKE_UP / 2)).toBe(1);
    expect(spikesUp(0, SPIKE_UP + 0.2)).toBe(0);
  });
});
