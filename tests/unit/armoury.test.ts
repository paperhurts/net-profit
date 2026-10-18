import { describe, expect, it } from 'vitest';
import { ARMOURS } from '../../src/data/armour';
import {
  ARMOUR_STANDS,
  ARMOURY_REACH,
  armourName,
  armourStandAt,
  armourStory,
  hasArmour,
  hasWeapon,
  type Kit,
  nearArmoury,
  WEAPON_RACKS,
  weaponName,
  weaponRackAt,
  weaponStory,
} from '../../src/data/armoury';
import { drawArmourStand, drawWeaponRack } from '../../src/render/armoury';
import { LOCKED, LOCKED_REACH, SEAT } from '../../src/world/gigantis';
import { entry, ROOMS, THRONE } from '../../src/world/tower';
import { fakeView } from './helpers/view';

const kit = (armour: number, spear: number, soulArmour = false): Kit => ({
  armour,
  spear,
  soulArmour,
});

describe('the armoury', () => {
  it('holds each armour and weapon you have had, and nothing you have not', () => {
    expect(ARMOUR_STANDS.filter((k) => hasArmour(k, kit(0, 0)))).toEqual([]);
    expect(ARMOUR_STANDS.filter((k) => hasArmour(k, kit(3, 0)))).toEqual([
      'leather',
      'diamond',
      'gold',
    ]);
    expect(ARMOUR_STANDS.filter((k) => hasArmour(k, kit(0, 0, true)))).toEqual(['soul']);
    expect(WEAPON_RACKS.filter((k) => hasWeapon(k, kit(0, 2)))).toEqual(['fishing', 'long']);
    expect(WEAPON_RACKS.filter((k) => hasWeapon(k, kit(4, 4)))).toEqual([
      'fishing',
      'long',
      'barbed',
      'harpoon',
    ]);
    // The knife comes with the Honor Guard armour.
    expect(hasWeapon('knife', kit(5, 4))).toBe(true);
    expect(armourName('gold')).toBe('Gold armour');
    expect(armourName('soul')).toBe('Soul armour');
    expect(weaponName('barbed')).toBe('Barbed spear');
    expect(weaponName('knife')).toBe('Survival knife');
  });

  it('says what each is, the best you have, what you have outgrown, and where an empty one is had', () => {
    const k = kit(3, 2);
    expect(armourStory('gold', k)).toContain('the best you have');
    expect(armourStory('leather', k)).toContain('got better');
    expect(armourStory('space', k)).toMatch(/^An empty stand, for the space armour\..*shipwright/);
    expect(armourStory('soul', k)).toContain('ruins');
    expect(armourStory('soul', kit(3, 2, true))).toContain('gives you back a heart');
    expect(weaponStory('long', k)).toContain('the best you have');
    expect(weaponStory('fishing', k)).toContain('got better');
    expect(weaponStory('harpoon', k)).toMatch(/^An empty rack/);
    expect(weaponStory('harpoon', kit(0, 4))).toMatch(/^A spare harpoon/);
    expect(weaponStory('knife', k)).toContain('Honor Guard');
    for (const a of ARMOUR_STANDS) expect(armourStory(a, k).length).toBeGreaterThan(20);
    for (const w of WEAPON_RACKS) expect(weaponStory(w, k).length).toBeGreaterThan(20);
  });

  it('stands round the throne room, clear of the throne, its locked door and the way in, each looked at on its own', () => {
    const room = ROOMS[THRONE];
    if (!room) throw new Error('no throne room');
    const way = entry(THRONE);
    const spots = [
      ...ARMOUR_STANDS.map((_, i) => ({ id: `a${i}`, ...armourStandAt(i) })),
      ...WEAPON_RACKS.map((_, i) => ({ id: `w${i}`, ...weaponRackAt(i) })),
    ];
    for (const s of spots) {
      expect(Math.hypot(s.dx, s.dy) + 8).toBeLessThan(room.r - 12);
      expect(Math.hypot(s.dx - (LOCKED.x - room.x), s.dy - (LOCKED.y - room.y))).toBeGreaterThan(
        LOCKED_REACH + ARMOURY_REACH,
      );
      expect(Math.hypot(s.dx - (SEAT.x - room.x), s.dy - (SEAT.y - room.y))).toBeGreaterThan(
        SEAT.r + 40,
      );
      expect(Math.hypot(s.dx - (way.x - room.x), s.dy - (way.y - room.y))).toBeGreaterThan(60);
      expect(nearArmoury(s.dx + 5, s.dy + 5)).toBe(s.id);
    }
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i] as { dx: number; dy: number };
        const b = spots[j] as { dx: number; dy: number };
        expect(Math.hypot(a.dx - b.dx, a.dy - b.dy)).toBeGreaterThan(ARMOURY_REACH);
      }
    expect(nearArmoury(0, 0)).toBeNull();
  });

  it('draws each stand with its armour or bare, and each rack with its weapon or empty', () => {
    const bare = fakeView();
    drawArmourStand(bare.v, 0, 0, null);
    for (const A of ARMOURS) {
      const f = fakeView();
      drawArmourStand(f.v, 0, 0, A.look);
      expect(f.calls.fill ?? 0).toBeGreaterThan((bare.calls.fill ?? 0) + 4);
    }
    const soul = fakeView();
    drawArmourStand(soul.v, 0, 0, 'soul');
    expect(soul.calls.glow).toBe(1);
    for (const w of WEAPON_RACKS) {
      const empty = fakeView();
      drawWeaponRack(empty.v, 0, 0, w, false);
      const full = fakeView();
      drawWeaponRack(full.v, 0, 0, w, true);
      expect((full.calls.fill ?? 0) + (full.calls.stroke ?? 0)).toBeGreaterThan(
        (empty.calls.fill ?? 0) + (empty.calls.stroke ?? 0) + 1,
      );
    }
  });
});
