import { describe, expect, it } from 'vitest';
import { drawTarOcean, metalBridgeSolids } from '../../src/render/metalbridge';
import { ABYSS } from '../../src/world/abyss';
import { DEEP, FAR, FARFAR, WS } from '../../src/world/island';
import { DOCK11, ISLE11 } from '../../src/world/isle11';
import {
  atBridgeDoor,
  BRIDGE_DOOR,
  BRIDGE_SIGHT,
  bridgeDistance,
  DOOR_REACH,
  DOOR_STOP,
  METAL_BRIDGE,
  NORTH_EDGE,
  pushOffMetalBridge,
} from '../../src/world/metalbridge';
import { fakeView } from './helpers/view';

describe("the kid's metal bridge", () => {
  it('stands along the far far sea north edge, west of island 11 and north of the abyss, on the sea', () => {
    expect(NORTH_EDGE).toBe(-(DEEP + FAR + FARFAR));
    // Its sea face is inside the edge, where a boat can come to its door; its back is at the edge, against the tar.
    expect(METAL_BRIDGE.face).toBeGreaterThan(NORTH_EDGE);
    expect(METAL_BRIDGE.face - METAL_BRIDGE.depth).toBeGreaterThanOrEqual(NORTH_EDGE);
    const west = METAL_BRIDGE.x - METAL_BRIDGE.len / 2;
    const east = METAL_BRIDGE.x + METAL_BRIDGE.len / 2;
    expect(west).toBeGreaterThan(-(DEEP + FAR + FARFAR));
    expect(east).toBeLessThan(WS + DEEP + FAR + FARFAR);
    expect(east).toBeLessThan(ISLE11.x - ISLE11.r);
    expect(Math.abs(ABYSS.x - METAL_BRIDGE.x)).toBeLessThan(METAL_BRIDGE.len / 2);
    // An odd number of sections, so the door is in the middle of one, not on a join.
    expect(Math.round(METAL_BRIDGE.len / 200) % 2).toBe(1);
  });

  it('is seen from close by, but not from the abyss or island 11, whose own news would be talked over', () => {
    expect(bridgeDistance(BRIDGE_DOOR.x, BRIDGE_DOOR.y + 300)).toBeLessThan(BRIDGE_SIGHT);
    expect(bridgeDistance(ABYSS.x, ABYSS.y)).toBeGreaterThan(BRIDGE_SIGHT);
    expect(bridgeDistance(DOCK11.x, DOCK11.y)).toBeGreaterThan(BRIDGE_SIGHT);
    expect(bridgeDistance(ISLE11.x, ISLE11.y)).toBeGreaterThan(BRIDGE_SIGHT);
  });

  it('keeps a hull off its sea face, and lets a boat stopped at the door knock', () => {
    const boat = { x: METAL_BRIDGE.x + 300, y: METAL_BRIDGE.face - 10, v: 100 };
    pushOffMetalBridge(boat, 30);
    expect(boat.y).toBe(METAL_BRIDGE.face + 30);
    expect(boat.v).toBeLessThan(100);
    // Past either end it is open sea.
    const past = { x: METAL_BRIDGE.x + METAL_BRIDGE.len, y: METAL_BRIDGE.face - 10, v: 100 };
    pushOffMetalBridge(past, 30);
    expect(past.y).toBe(METAL_BRIDGE.face - 10);
    expect(atBridgeDoor(BRIDGE_DOOR.x, BRIDGE_DOOR.y + 80, 0)).toBe(true);
    expect(atBridgeDoor(BRIDGE_DOOR.x, BRIDGE_DOOR.y + 80, DOOR_STOP + 10)).toBe(false);
    expect(atBridgeDoor(BRIDGE_DOOR.x + DOOR_REACH + 20, BRIDGE_DOOR.y + 40, 0)).toBe(false);
  });

  it('is drawn in sections, each at its own depth, with its door, its flags and its orb, and the tar past the edge', () => {
    const v = fakeView();
    const solids = metalBridgeSolids(v.v);
    expect(solids.length).toBe(Math.round(METAL_BRIDGE.len / 200) + 3);
    const depths = solids.map((s) => s.d);
    expect(new Set(depths).size).toBe(depths.length);
    for (const s of solids) s.f();
    expect((v.calls.fill ?? 0) + (v.calls.stroke ?? 0)).toBeGreaterThan(100);
    const t = fakeView();
    drawTarOcean(t.v);
    expect(t.calls.fill ?? 0).toBeGreaterThan(4);
    // Off the screen, nothing.
    const off = fakeView();
    off.onScreen = false;
    expect(metalBridgeSolids(off.v)).toEqual([]);
  });
});
