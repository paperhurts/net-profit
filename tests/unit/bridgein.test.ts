import { describe, expect, it } from 'vitest';
import { walkable } from '../../src/entities/walker';
import { bridgeSolids, drawBridgeBack } from '../../src/render/bridgein';
import {
  arrive,
  BACK_A,
  BRIDGE_INSIDE,
  BRIDGE_SIDE,
  BRIDGE_THINGS,
  bridgeAction,
  bridgeLabel,
  doorStep,
  HUB_DOORS,
  MONKEY_SAYS,
  SCIENTIST_SAYS,
  TAR_ANIMAL,
  TAR_NEWS,
} from '../../src/world/bridgein';
import {
  BRIDGE_OBS,
  BRIDGE_SCIENCE,
  BRIDGE_TARDOCK,
  BRIDGE_YOU,
  ROOMS,
  type Room,
  roomAt,
} from '../../src/world/tower';
import { fakeView } from './helpers/view';

const anim = { talk: 0, slap: 0, news: 0 };

describe("inside the kid's metal bridge", () => {
  it('is the observatory with a door to each of five rooms, each with a door back', () => {
    expect(BRIDGE_INSIDE).toHaveLength(6);
    expect(new Set(BRIDGE_INSIDE).size).toBe(6);
    for (const i of BRIDGE_INSIDE) expect((ROOMS[i] as Room).kind).toBe('bridge');
    expect(HUB_DOORS.map((d) => d.sign)).toEqual([
      'YOU',
      'SCIENCE',
      'TAR DOCK',
      'MISSIONS',
      'NEWS',
    ]);
    for (const d of HUB_DOORS) {
      const p = doorStep(BRIDGE_OBS, d.a);
      expect(walkable(p.x, p.y, 0)).toBe(true);
      expect(roomAt(p.x, p.y)).toBe(BRIDGE_OBS);
      expect(bridgeAction(BRIDGE_OBS, p.x, p.y, true)).toBe(`bdoor-${d.to}`);
      expect(bridgeLabel(`bdoor-${d.to}`)).toBe(d.label);
    }
    for (const i of BRIDGE_SIDE) {
      const p = doorStep(i, BACK_A);
      expect(walkable(p.x, p.y, 0)).toBe(true);
      expect(bridgeAction(i, p.x, p.y, true)).toBe(`bdoor-${BRIDGE_OBS}`);
    }
    expect(bridgeLabel(`bdoor-${BRIDGE_OBS}`)).toBe('Back to the observatory');
  });

  it('puts you through a door far enough in that the button does not take you straight back', () => {
    for (const to of BRIDGE_SIDE) {
      const into = arrive(BRIDGE_OBS, to);
      expect(roomAt(into.x, into.y)).toBe(to);
      expect(walkable(into.x, into.y, 0)).toBe(true);
      expect(bridgeAction(to, into.x, into.y, true)).not.toBe(`bdoor-${BRIDGE_OBS}`);
      const back = arrive(to, BRIDGE_OBS);
      expect(roomAt(back.x, back.y)).toBe(BRIDGE_OBS);
      expect(walkable(back.x, back.y, 0)).toBe(true);
      expect(bridgeAction(BRIDGE_OBS, back.x, back.y, true)?.startsWith('bdoor-')).not.toBe(true);
    }
  });

  it('has its things where you can walk up to them, each answering only for itself', () => {
    for (const t of BRIDGE_THINGS) {
      expect(roomAt(t.at.x, t.at.y)).toBe(t.room);
      expect(walkable(t.at.x, t.at.y, 0)).toBe(true);
      expect(bridgeAction(t.room, t.at.x, t.at.y, true, true, true)).toBe(t.act);
      expect(bridgeLabel(t.act)).not.toBe('');
    }
    // The bed only when there is a night to sleep through.
    const bed = BRIDGE_THINGS.find((t) => t.act === 'bbed');
    expect(bed?.room).toBe(BRIDGE_YOU);
    if (bed) expect(bridgeAction(bed.room, bed.at.x, bed.at.y, false)).toBeNull();
    // The chemistry boat only once stealth mission 1 is won.
    const boat = BRIDGE_THINGS.find((t) => t.act === 'bboat');
    expect(boat?.room).toBe(BRIDGE_TARDOCK);
    if (boat) expect(bridgeAction(boat.room, boat.at.x, boat.at.y, true, false)).toBeNull();
    // The evil monkey's cage only once the tar eel is beaten and it is in it, and in the science room.
    const cage = BRIDGE_THINGS.find((t) => t.act === 'bcage');
    expect(cage?.room).toBe(BRIDGE_SCIENCE);
    if (cage) expect(bridgeAction(cage.room, cage.at.x, cage.at.y, true, true, false)).toBeNull();
    expect(MONKEY_SAYS.length).toBeGreaterThan(2);
    for (const m of MONKEY_SAYS) expect(m).toMatch(/let it out|stays in there|open the door/i);
    // The tar animal stays out in the tar, off the dock.
    expect(walkable(TAR_ANIMAL.x, TAR_ANIMAL.y, 0)).toBe(false);
    expect(roomAt(TAR_ANIMAL.x, TAR_ANIMAL.y)).not.toBe(BRIDGE_TARDOCK);
  });

  it('has news to read and a scientist with things to say', () => {
    expect(TAR_NEWS.length).toBeGreaterThan(3);
    for (const n of TAR_NEWS) expect(n.startsWith('TAR NEWS: ')).toBe(true);
    expect(SCIENTIST_SAYS.length).toBeGreaterThan(2);
  });

  it('draws every room and the things in it', () => {
    const counts: number[] = [];
    for (const i of BRIDGE_INSIDE) {
      const { v, calls } = fakeView();
      drawBridgeBack(v, ROOMS[i] as Room, i, 390, 780, anim);
      expect(calls.fill ?? 0).toBeGreaterThan(20);
      const solids = bridgeSolids(v, i, { talk: 1, slap: 1, news: 3 });
      for (const s of solids) s.f();
      counts.push(solids.length);
    }
    // The telescope; the bed and the mirror; two benches and the scientist; the table; the tank; the tar animal.
    expect(counts).toEqual([1, 2, 3, 1, 1, 1]);
    // With the evil monkey in its cage, the science room has it too.
    const { v } = fakeView();
    const caged = bridgeSolids(v, BRIDGE_SCIENCE, {
      talk: 0,
      slap: 0,
      news: 0,
      caged: true,
      rattle: 1,
    });
    expect(caged.length).toBe(4);
    for (const s of caged) s.f();
  });
});
