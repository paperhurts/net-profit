import { describe, expect, it } from 'vitest';
import { BASS, BLUEGILL, CATFISH, PERCH, SPECIES } from '../../src/data/tuning';
import {
  castSpot,
  FLOAT_IN,
  NIBBLE_T,
  POND_BITE_T,
  POND_FISH,
  POND_REACH,
  POND_WAIT,
  PondLine,
  pondFish,
} from '../../src/fishing/pond';
import { POND } from '../../src/world/isle10';

const DT = 1 / 30;

describe("fishing at island 10's pond", () => {
  it('four fish, the commoner the smaller, the catfish rarest', () => {
    expect(POND_FISH.map((f) => SPECIES[f.sp]?.name)).toEqual([
      'bluegill',
      'yellow perch',
      'largemouth bass',
      'channel catfish',
    ]);
    const v = POND_FISH.map((f) => SPECIES[f.sp]?.v ?? 0);
    expect([...v].sort((a, b) => a - b)).toEqual(v);
    const n = new Map<number, number>();
    for (let i = 0; i < 1000; i++) {
      const sp = pondFish(i / 1000);
      n.set(sp, (n.get(sp) ?? 0) + 1);
    }
    expect([n.get(BLUEGILL), n.get(PERCH), n.get(BASS), n.get(CATFISH)]).toEqual([
      400, 300, 200, 100,
    ]);
  });

  it('casts only from the edge, and the float lands out on the water toward the middle', () => {
    const edge = { x: POND.x + POND.r + 10, y: POND.y };
    const spot = castSpot(POND, edge.x, edge.y);
    expect(spot).not.toBeNull();
    if (!spot) return;
    expect(Math.hypot(spot.x - POND.x, spot.y - POND.y)).toBeCloseTo(POND.r - FLOAT_IN, 5);
    expect(castSpot(POND, POND.x + POND.r + POND_REACH + 5, POND.y)).toBeNull();
    // From any side.
    expect(castSpot(POND, POND.x, POND.y - POND.r - 12)).not.toBeNull();
  });

  it('the float sits, twitches, then goes under; reeled in then, the fish is caught', () => {
    const line = new PondLine();
    line.cast(0);
    const events: string[] = [];
    let t = 0;
    while (line.state !== 'bite' && t < 10) {
      const e = line.update(DT, 0.95, 0);
      if (e) events.push(e);
      t += DT;
    }
    expect(events).toEqual(['nibble', 'bite']);
    expect(t).toBeGreaterThanOrEqual(POND_WAIT[0] + NIBBLE_T - DT);
    expect(line.sp).toBe(CATFISH);
    expect(line.reel()).toBe('caught');
    expect(line.state).toBe('idle');
  });

  it('nothing goes wrong: too soon changes nothing, and a fish let go is followed by another', () => {
    const line = new PondLine();
    line.cast(0.5);
    for (let t = 0; t < 1; t += DT) line.update(DT, 0, 0);
    expect(line.reel()).toBe('early');
    expect(line.state).toBe('wait');
    // Wait through a whole bite without reeling in: it swims off, and the float waits for the next.
    let away = false;
    for (let t = 0; t < POND_WAIT[1] + NIBBLE_T + POND_BITE_T + 0.5; t += DT)
      if (line.update(DT, 0, 0) === 'away') away = true;
    expect(away).toBe(true);
    expect(line.state === 'wait' || line.state === 'nibble').toBe(true);
    // And another comes along.
    let bit = false;
    for (let t = 0; t < POND_WAIT[1] + NIBBLE_T + 0.5; t += DT)
      if (line.update(DT, 0, 0) === 'bite') bit = true;
    expect(bit).toBe(true);
  });

  it('a line given up is in, and an idle line has nothing to reel', () => {
    const line = new PondLine();
    expect(line.reel()).toBeNull();
    line.cast(0);
    line.stop();
    expect(line.state).toBe('idle');
    expect(line.update(1, 0, 0)).toBeNull();
  });
});
