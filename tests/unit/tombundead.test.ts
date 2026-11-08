import { describe, expect, it } from 'vitest';
import { UNDEAD } from '../../src/entities/undead';
import { onLand } from '../../src/entities/walker';
import {
  CASTLE16_DOOR,
  COFFINS16,
  cellU,
  fromTomb,
  LANDING16,
  LEVER16,
  MAZE16,
  onIsle16,
} from '../../src/world/tombisle';
import {
  COFFIN_ROOMS,
  COFFIN_WAKE,
  coffinKind,
  coffinRise,
  ELITES16,
  HAUNT_R,
  HAUNTS16,
} from '../../src/world/tombundead';

describe("Tomb Island's undead", () => {
  it('waits in haunts spread through the maze: the kid’s three zombies first, skeletons and ghosts after', () => {
    expect(HAUNTS16.length).toBeGreaterThanOrEqual(6);
    expect(HAUNTS16[0]?.spawns.map((s) => s.kind)).toEqual(['zombie', 'zombie', 'zombie']);
    const kinds = new Set(HAUNTS16.flatMap((h) => h.spawns.map((s) => s.kind)));
    for (const k of ['zombie', 'skeleton', 'ghost'] as const) expect(kinds.has(k)).toBe(true);
    // No archers (their arrows would fly through the maze's walls), no necromancers yet (they are the elites).
    expect(kinds.has('archer')).toBe(false);
    expect(kinds.has('necro')).toBe(false);
    for (const h of HAUNTS16) {
      for (const s of h.spawns) expect(onIsle16(s.x, s.y)).toBe(true);
      // Well clear of the landing, and of every other haunt.
      expect(Math.hypot(h.x - LANDING16.x, h.y - LANDING16.y)).toBeGreaterThan(HAUNT_R + 60);
      for (const g of HAUNTS16)
        if (g !== h) expect(Math.hypot(g.x - h.x, g.y - h.y)).toBeGreaterThan(150);
    }
    expect(HAUNTS16.some((h) => Math.hypot(h.x - LEVER16.x, h.y - LEVER16.y) < 1)).toBe(false);
  });

  it('keeps a mummy or a vampire in every coffin, at a zombie’s toughness, climbing out onto the ground', () => {
    expect(COFFIN_ROOMS.length).toBe(COFFINS16.length);
    expect(coffinKind(0)).toBe('mummy');
    expect(coffinKind(1)).toBe('vampire');
    expect(UNDEAD.mummy.hp).toBe(UNDEAD.zombie.hp);
    expect(UNDEAD.vampire.hp).toBe(UNDEAD.zombie.hp);
    expect(UNDEAD.vampire.speed).toBeGreaterThan(UNDEAD.zombie.speed);
    for (const c of COFFINS16) {
      const r = coffinRise(c);
      expect(onLand(r.x, r.y)).toBe(true);
      expect(Math.hypot(r.x - (c.x0 + c.x1) / 2, r.y - (c.y0 + c.y1) / 2)).toBeLessThan(
        COFFIN_WAKE,
      );
    }
  });

  it('puts the elites in the way of the castle: the sword mummy at the gate to its square, the big necromancer at its door', () => {
    const [mummy, necro] = ELITES16;
    expect(mummy?.spawns.map((x) => x.kind)).toEqual(['mummyElite']);
    expect(necro?.spawns.map((x) => x.kind)).toEqual(['necroElite']);
    const [gx, gy] = fromTomb(cellU(MAZE16.gate.i), cellU(MAZE16.gate.j));
    expect(Math.hypot((mummy?.x ?? 0) - gx, (mummy?.y ?? 0) - gy)).toBeLessThan(1);
    expect(
      Math.hypot((necro?.x ?? 0) - CASTLE16_DOOR.x, (necro?.y ?? 0) - CASTLE16_DOOR.y),
    ).toBeLessThan(80);
    for (const e of ELITES16) {
      expect(onIsle16(e.x, e.y)).toBe(true);
      for (const h of HAUNTS16) expect(Math.hypot(h.x - e.x, h.y - e.y)).toBeGreaterThan(150);
    }
  });

  it('makes the elites tougher: the sword mummy twice a mummy, the big necromancer one more damage', () => {
    expect(UNDEAD.mummyElite.hp).toBe(UNDEAD.mummy.hp * 2);
    expect(UNDEAD.mummyElite.reach).toBeGreaterThan(UNDEAD.mummy.reach);
    expect(UNDEAD.necroElite.damage).toBe(UNDEAD.necro.damage + 1);
    expect(UNDEAD.necroElite.summon).toBeGreaterThan(0);
    expect(UNDEAD.necroElite.scale).toBeGreaterThan(UNDEAD.necro.scale);
  });
});
