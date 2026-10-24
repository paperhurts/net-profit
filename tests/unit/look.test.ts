import { describe, expect, it } from 'vitest';
import {
  FACES,
  HAIR_COLOURS,
  HAIRS,
  HAT_COLOURS,
  HATS,
  type Look,
  OUTFIT_LOOK,
  OUTFITS,
  PRESETS,
  parseLook,
  presetOf,
  SKINS,
  SKIPPER,
  wornArmour,
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

  it("hides the shipwright's armour when asked, keeps the Honor Guard look on top, and saves the choice", () => {
    const hg = 'honor guard';
    const space = 'space armour';
    expect(wornArmour(SKIPPER, hg, space)).toBe(space);
    expect(wornArmour({ ...SKIPPER, hideArmour: true }, hg, space)).toBeNull();
    expect(wornArmour({ ...SKIPPER, honorGuard: true, hideArmour: true }, hg, space)).toBe(hg);
    expect(wornArmour(SKIPPER, hg, null)).toBeNull();
    // An old save has the armour showing; the choice is kept; and it is not part of who a preset is.
    expect(parseLook({ skin: 1 }).hideArmour).toBe(false);
    expect(parseLook({ ...SKIPPER, hideArmour: true }).hideArmour).toBe(true);
    for (const p of PRESETS) expect(presetOf({ ...p.look, hideArmour: true })).toBe(p.id);
  });

  it('keeps an outfit from the Endless Isle in the save, over whoever is picked, and none for a save from before', () => {
    expect(SKIPPER.outfit).toBe('none');
    expect(parseLook({ skin: 1 }).outfit).toBe('none');
    expect(parseLook({ ...SKIPPER, outfit: 'snow' }).outfit).toBe('snow');
    expect(parseLook({ ...SKIPPER, outfit: 'pyjamas' }).outfit).toBe('none');
    // Like the armour shown or hidden, it is not part of who a preset is; nor is a title.
    for (const p of PRESETS) expect(presetOf({ ...p.look, outfit: 'captain' })).toBe(p.id);
    expect(parseLook({ ...SKIPPER, title: 'endless' }).title).toBe('endless');
    expect(parseLook({ ...SKIPPER, title: 'king' }).title).toBe('none');
    for (const p of PRESETS) expect(presetOf({ ...p.look, title: 'lord' })).toBe(p.id);
  });

  it('draws each outfit over the same look: its shapes, the coat or suit in place of the shirt, and its colours', () => {
    const p = new Walker();
    // What it draws, as counts of each call, and the colours it fills, facing us and facing away.
    const drawn = (look: Look) => {
      let shapes = '';
      const fills: string[] = [];
      for (const h of [Math.PI / 4, -Math.PI * 0.75]) {
        p.look = look;
        p.h = h;
        const { v, calls } = fakeView();
        const ctx = v.ctx as unknown as Record<string, unknown>;
        const fill = ctx.fill as () => void;
        ctx.fill = () => {
          fills.push(String(ctx.fillStyle));
          fill();
        };
        p.drawPortrait(v);
        shapes += JSON.stringify(calls);
      }
      return { shapes, fills };
    };
    const own = drawn(SKIPPER);
    const captain = drawn({ ...SKIPPER, outfit: 'captain' });
    const ninja = drawn({ ...SKIPPER, outfit: 'ninja' });
    const snow = drawn({ ...SKIPPER, outfit: 'snow' });
    // The coat and tricorn, and the hood, each drawn their own way; the two ninjas alike but for their colours.
    expect(new Set([own.shapes, captain.shapes, ninja.shapes]).size).toBe(3);
    expect(snow.shapes).toBe(ninja.shapes);
    expect(snow.fills).not.toEqual(ninja.fills);
    for (const [k, d] of [
      ['captain', captain],
      ['ninja', ninja],
      ['snow', snow],
    ] as const) {
      expect(d.fills).toContain(OUTFIT_LOOK[k].coat);
      expect(d.fills).toContain(OUTFIT_LOOK[k].trim);
    }
    // Under a hood the hat is not drawn, nor the hair over it.
    expect(drawn({ ...SKIPPER, outfit: 'ninja', hat: 'cowboy' }).shapes).toBe(ninja.shapes);
    expect(OUTFITS.map(([k]) => k)).toEqual(['none', 'captain', 'ninja', 'snow']);
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

  it('shows the back of the head as hair, not a blank face, walking away under a hat (the owner)', () => {
    const p = new Walker();
    // What each fill painted: its colour, and the round shape it filled.
    const fills = (look: Look, h: number) => {
      p.look = look;
      p.h = h;
      const { v } = fakeView();
      const out: { style: string; x: number; y: number; r: number }[] = [];
      let shape = { x: 0, y: 0, r: 0 };
      const ctx = v.ctx as unknown as Record<string, unknown>;
      ctx.arc = (x: number, y: number, r: number) => {
        shape = { x, y, r };
      };
      ctx.ellipse = (x: number, y: number, rx: number, ry: number) => {
        shape = { x, y, r: Math.min(rx, ry) };
      };
      ctx.fill = () => out.push({ style: String(ctx.fillStyle), ...shape });
      p.drawPortrait(v);
      return out;
    };
    const away = -Math.PI * 0.75;
    for (const [hat] of HATS)
      for (const [hair] of HAIRS) {
        if (hair === 'none') continue;
        const look = { ...SKIPPER, hat, hair, hairColour: 4 };
        const out = fills(look, away);
        const head = out.findIndex((f) => f.style === SKINS[look.skin] && f.r === 3.8);
        expect(head, `${hat} ${hair}`).toBeGreaterThan(-1);
        const at = out[head] as { x: number; y: number; r: number };
        // Over the skin, a round of hair covering it whole, with no edge of skin showing under it.
        expect(
          out
            .slice(head + 1)
            .some(
              (f) =>
                f.style === HAIR_COLOURS[4] && Math.hypot(f.x - at.x, f.y - at.y) + at.r <= f.r,
            ),
          `${hat} ${hair}`,
        ).toBe(true);
      }
  });
});
