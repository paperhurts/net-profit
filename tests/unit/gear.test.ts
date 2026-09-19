import { describe, expect, it } from 'vitest';
import doc from '../../project.md?raw';
import {
  GEAR,
  GEAR_IDS,
  noGear,
  refusal,
  SHIPWRIGHT_TIER,
  STEAL_SHARE,
  STRONGBOX_SHARE,
  shipwrightOpen,
  stealShare,
} from '../../src/data/gear';

describe('the shipwright', () => {
  it('prices his shelf as the doc says', () => {
    for (const id of GEAR_IDS) {
      const g = GEAR[id];
      const row = doc
        .split('\n')
        .find((l) => l.toLowerCase().startsWith(`| ${g.name.toLowerCase()} |`));
      expect(row, `project.md has no gear row for ${g.name}`).toBeDefined();
      const cells = (row as string).split('|').map((c) => c.trim());
      expect(Number((cells[2] as string).replace(/,/g, ''))).toBe(g.cost);
    }
  });

  it('opens once the boat is a cutter', () => {
    expect(shipwrightOpen(SHIPWRIGHT_TIER - 1)).toBe(false);
    expect(shipwrightOpen(SHIPWRIGHT_TIER)).toBe(true);
    expect(shipwrightOpen(5)).toBe(true);
  });

  it('sells each piece once, to those who can pay', () => {
    const owned = noGear();
    expect(refusal('mesh', owned, GEAR.mesh.cost - 1)).toBe('coins');
    expect(refusal('mesh', owned, GEAR.mesh.cost)).toBeNull();
    owned.mesh = true;
    expect(refusal('mesh', owned, 99999)).toBe('fitted');
    expect(refusal('strongbox', owned, 99999)).toBeNull();
  });

  it('halves what the pirate takes once the strongbox is fitted', () => {
    const owned = noGear();
    expect(stealShare(owned)).toBe(STEAL_SHARE);
    owned.strongbox = true;
    expect(stealShare(owned)).toBe(STRONGBOX_SHARE);
    expect(STRONGBOX_SHARE).toBe(STEAL_SHARE / 2);
  });
});
