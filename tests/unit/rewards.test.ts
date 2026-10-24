import { describe, expect, it } from 'vitest';
import { marked, noBattles } from '../../src/data/battle';
import { EMBLEMS, flagShapes, parseFlag } from '../../src/data/flag';
import {
  ALL_BADGES,
  allGold,
  emblemWon,
  FLAG_BADGES,
  flagWon,
  HALL_KINDS,
  HALL_SOLID,
  hallAt,
  hallWon,
  nearHall,
  newOutfits,
  newRewards,
  nextReward,
  OUTFIT_BADGES,
  outfitWon,
  paintWon,
  rewardName,
  rewardsWon,
  sideBadges,
  TITLE_NAME,
  titleWon,
  WON_FLAGS,
} from '../../src/data/rewards';
import { RUNS, skied } from '../../src/data/slalom';
import { HEAP_R } from '../../src/data/treasury';
import { STAND_RING } from '../../src/data/trophies';
import { LORD_PAINT, MASTER_PAINT, PAINTS } from '../../src/data/tuning';

describe("the Endless Isle's side rewards", () => {
  it("counts a side's badges across its three roles: Badge I once a role has been fought in, then each one after", () => {
    expect(sideBadges(undefined, 'pirate')).toBe(0);
    let b = marked(noBattles(), 'pirate', 'tank', 'loss');
    expect(sideBadges(b, 'pirate')).toBe(1);
    expect(sideBadges(b, 'ninja')).toBe(0);
    // Badge II at 3 marks.
    b = marked(b, 'pirate', 'tank', 'win');
    expect(sideBadges(b, 'pirate')).toBe(2);
    b = marked(b, 'pirate', 'healer', 'loss');
    expect(sideBadges(b, 'pirate')).toBe(OUTFIT_BADGES);
    // All three roles at Badge III, nine.
    const all = noBattles();
    all.marks.ninja = { tank: 8, damage: 20, healer: 9 };
    expect(sideBadges(all, 'ninja')).toBe(9);
  });

  it("wins the captain's coat and the ninja garb at three badges for the side, and never one for the other side", () => {
    let b = noBattles();
    for (const r of ['tank', 'damage'] as const) b = marked(b, 'pirate', r, 'win');
    expect(outfitWon('captain', { battles: b })).toBe(false);
    const was = { battles: b };
    b = marked(b, 'pirate', 'tank', 'loss');
    const now = { battles: b };
    expect(outfitWon('captain', now)).toBe(true);
    expect(outfitWon('ninja', now)).toBe(false);
    expect(newOutfits(was, now)).toEqual(['captain']);
    expect(newOutfits(now, now)).toEqual([]);
    expect(outfitWon('none', {})).toBe(true);
  });

  it("wins the snow ninja's whites for gold on all three ski runs, and not for silver on any", () => {
    const [bunny, fox, doom] = [RUNS.bunny, RUNS.fox, RUNS.doom].map((r) => r.medals[0]) as [
      number,
      number,
      number,
    ];
    let s = skied(skied(undefined, 'bunny', bunny), 'fox', fox);
    expect(allGold(s)).toBe(false);
    const was = { slalom: s };
    s = skied(s, 'doom', doom + 1);
    expect(allGold(s)).toBe(false);
    s = skied(s, 'doom', doom - 1);
    expect(allGold(s)).toBe(true);
    expect(newOutfits(was, { slalom: s })).toEqual(['snow']);
  });

  it("wins a side's flag at six of its badges, and its emblem for any flag; its hull paint at all nine", () => {
    const b = noBattles();
    b.marks.pirate = { tank: 8, damage: 3, healer: 0 };
    const five = { battles: structuredClone(b) };
    expect(flagWon('jolly', five)).toBe(false);
    const jolly = EMBLEMS.indexOf('jolly');
    const star = EMBLEMS.indexOf('shuriken');
    expect(emblemWon(jolly, five)).toBe(false);
    expect(emblemWon(EMBLEMS.indexOf('skull'), five)).toBe(true);
    b.marks.pirate.healer = 1;
    const six = { battles: structuredClone(b) };
    expect(sideBadges(six.battles, 'pirate')).toBe(FLAG_BADGES);
    expect(flagWon('jolly', six)).toBe(true);
    expect(flagWon('banner', six)).toBe(false);
    expect(emblemWon(jolly, six)).toBe(true);
    expect(emblemWon(star, six)).toBe(false);
    expect(newRewards(five, six)).toEqual([{ kind: 'flag', key: 'jolly' }]);
    expect(paintWon('lord', six)).toBe(false);
    b.marks.pirate = { tank: 8, damage: 8, healer: 8 };
    const nine = { battles: structuredClone(b) };
    expect(sideBadges(nine.battles, 'pirate')).toBe(ALL_BADGES);
    expect(paintWon('lord', nine)).toBe(true);
    expect(paintWon('master', nine)).toBe(false);
    // From nothing to all nine at once, every one of them, the outfit first.
    expect(newRewards({}, nine).map(rewardName)).toEqual([
      "the captain's coat and tricorn",
      'the Jolly Roger',
      'the Pirate Lord hull paint, black and red',
      'the title Pirate Lord',
      "Captain Cappy's cutlass for your trophy hall",
    ]);
  });

  it('flies each won flag as a plain flag of its own emblem, and a save keeps it', () => {
    for (const w of Object.values(WON_FLAGS)) {
      expect(EMBLEMS[w.flag.emblem]).toBe(w.emblem);
      expect(parseFlag(JSON.parse(JSON.stringify(w.flag)))).toEqual(w.flag);
      // Its emblem is drawn: more shapes than the plain field.
      expect(flagShapes(w.flag, 60, 40).length).toBeGreaterThan(
        flagShapes({ ...w.flag, emblem: 0 }, 60, 40).length + 1,
      );
    }
  });

  it("has the two hull paints after the mermaids', the pirates' black and red, the ninjas' midnight blue with a glint", () => {
    expect(PAINTS[LORD_PAINT]?.name).toBe('Pirate Lord');
    expect(PAINTS[MASTER_PAINT]?.name).toBe('Grand Master');
    expect(PAINTS[MASTER_PAINT]?.shimmer).toBe(true);
    expect(PAINTS).toHaveLength(13);
  });

  it('gives a side its title and its stand in the trophy hall at all nine, and the mirror and a title for both', () => {
    const b = noBattles();
    b.marks.pirate = { tank: 8, damage: 8, healer: 8 };
    const pirate = { battles: structuredClone(b) };
    expect(titleWon('lord', pirate)).toBe(true);
    expect(titleWon('master', pirate)).toBe(false);
    expect(titleWon('endless', pirate)).toBe(false);
    expect(titleWon('none', {})).toBe(true);
    expect(hallWon('cutlass', pirate)).toBe(true);
    expect(hallWon('mirror', pirate)).toBe(false);
    b.marks.ninja = { tank: 8, damage: 8, healer: 7 };
    const almost = { battles: structuredClone(b) };
    b.marks.ninja.healer = 8;
    const both = { battles: structuredClone(b) };
    expect(newRewards(almost, both).map(rewardName)).toEqual([
      'the Grand Master hull paint, midnight blue and silver',
      'the title Grand Master',
      "Master Sensei's katana for your trophy hall",
      'the title Master of the Endless Isle',
      'the golden mirror',
    ]);
    expect(TITLE_NAME.endless).toBe('Master of the Endless Isle');
    expect(nextReward(almost.battles, 'ninja')?.what).toBe(
      "the Grand Master hull paint, midnight blue and silver, the title Grand Master and Master Sensei's katana for your trophy hall",
    );
  });

  it('stands the three in the trophy hall round the dais, clear of it and of the stands round the wall, the two sides mirrored', () => {
    const cut = hallAt('cutlass');
    const kat = hallAt('katana');
    expect(cut.dx).toBeCloseTo(-kat.dx, 6);
    expect(cut.dy).toBeCloseTo(-kat.dy, 6);
    for (const k of HALL_KINDS) {
      const p = hallAt(k);
      const r = Math.hypot(p.dx, p.dy);
      expect(r).toBeGreaterThan(HEAP_R + HALL_SOLID + 16);
      expect(r).toBeLessThan(STAND_RING - 30);
      expect(nearHall(p.dx + 5, p.dy)).toBe(k);
    }
    expect(nearHall(0, 0)).toBeNull();
  });

  it('names the next reward for a side and how far off it is, up the ladder, until there are none left', () => {
    expect(nextReward(undefined, 'ninja')).toEqual({
      at: OUTFIT_BADGES,
      what: 'the ninja garb and mask',
      have: 0,
    });
    const b = noBattles();
    b.marks.pirate.damage = 8;
    expect(nextReward(b, 'pirate')).toEqual({ at: FLAG_BADGES, what: 'the Jolly Roger', have: 3 });
    expect(rewardsWon(b, 'pirate').map(rewardName)).toEqual(["the captain's coat and tricorn"]);
    b.marks.pirate.tank = 8;
    expect(nextReward(b, 'pirate')?.at).toBe(ALL_BADGES);
    b.marks.pirate.healer = 8;
    expect(nextReward(b, 'pirate')).toBeNull();
    expect(rewardsWon(b, 'pirate')).toHaveLength(5);
    expect(nextReward(b, 'ninja')?.have).toBe(0);
  });
});
