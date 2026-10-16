import { describe, expect, it } from 'vitest';
import {
  FACES,
  HAIR_COLOURS,
  HAIRS,
  HAT_COLOURS,
  HATS,
  type Look,
  PRESETS,
  parseLook,
  presetOf,
  SKINS,
  SKIPPER,
} from '../../src/data/look';
import { Walker } from '../../src/entities/walker';
import { fakeView } from './helpers/view';

describe('choose your character', () => {
  it("has the old figure first, then the kid's three, each named and different", () => {
    expect(PRESETS[0]?.look).toEqual(SKIPPER);
    expect(PRESETS.map((p) => p.name)).toEqual(['Skipper', 'Finn', 'Coral', 'Hank']);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    for (const p of PRESETS) expect(presetOf(p.look)).toBe(p.id);
    // None of them is the Honor Guard look: that is the player's to put on.
    for (const p of PRESETS) expect(p.look.honorGuard).toBe(false);
  });

  it('knows a look changed from a preset is your own', () => {
    expect(presetOf({ ...SKIPPER, hat: 'cap' })).toBeNull();
    expect(presetOf({ ...SKIPPER, honorGuard: true })).toBeNull();
  });

  it('every preset uses only what there is', () => {
    for (const { look } of PRESETS) {
      expect(look.skin).toBeLessThan(SKINS.length);
      expect(look.hairColour).toBeLessThan(HAIR_COLOURS.length);
      expect(look.hatColour).toBeLessThan(HAT_COLOURS.length);
      expect(HAIRS.some(([k]) => k === look.hair)).toBe(true);
      expect(HATS.some(([k]) => k === look.hat)).toBe(true);
      expect(FACES.some(([k]) => k === look.face)).toBe(true);
    }
  });

  it("reads a save's look within range, and Skipper for one from before or one not understood", () => {
    expect(parseLook(undefined)).toEqual(SKIPPER);
    expect(parseLook('finn')).toEqual(SKIPPER);
    const hank = PRESETS[3]?.look as Look;
    expect(parseLook(JSON.parse(JSON.stringify(hank)))).toEqual(hank);
    expect(
      parseLook({
        skin: 99,
        hair: 'mohawk',
        hairColour: -1,
        hat: 'crown',
        hatColour: 2.7,
        face: 'x',
        honorGuard: 'yes',
      }),
    ).toEqual({ ...SKIPPER, hatColour: 2 });
    expect(parseLook({ ...SKIPPER, honorGuard: true }).honorGuard).toBe(true);
  });

  it('draws each hair, hat and face differently, and the Skipper as before', () => {
    const p = new Walker();
    const calls = (look: Look, h = Math.PI / 4) => {
      p.look = look;
      p.h = h;
      const { v, calls } = fakeView();
      p.drawPortrait(v);
      return JSON.stringify(calls);
    };
    const seen = new Set<string>();
    for (const [hat] of HATS) seen.add(calls({ ...SKIPPER, hat }));
    expect(seen.size).toBe(HATS.length);
    seen.clear();
    // Hair is told apart facing us and facing away together: long hair and pigtails differ most from behind.
    for (const [hair] of HAIRS)
      seen.add(
        calls({ ...SKIPPER, hat: 'none', hair }) +
          calls({ ...SKIPPER, hat: 'none', hair }, -Math.PI * 0.75),
      );
    expect(seen.size).toBe(HAIRS.length);
    seen.clear();
    for (const [face] of FACES) seen.add(calls({ ...SKIPPER, face }));
    expect(seen.size).toBe(FACES.length);
    // Facing away, it still draws, with the hair over the back of the head.
    expect(calls({ ...SKIPPER, hat: 'none', hair: 'long' }, -Math.PI * 0.75)).toBeTruthy();
  });
});
