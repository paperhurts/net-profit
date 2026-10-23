import { describe, expect, it } from 'vitest';
import {
  bleepsIn,
  LEADER_NAME,
  LEADER_SAYS,
  MINION_NAME,
  nextLine,
  PARROT_LINES,
  squawkParts,
} from '../../src/data/doomfolk';
import { onLand, walkable } from '../../src/entities/walker';
import {
  drawBun,
  drawCaptain,
  drawMaster,
  drawParrot,
  drawPoof,
  drawSquawk,
} from '../../src/render/minions';
import {
  blockedHalf,
  LANDING13,
  LEADER13,
  LEADER13_AT,
  LEADER13_R,
  LEADER13_REACH,
  leaderNear,
  SIDES,
  toDoom,
} from '../../src/world/doom';
import { fakeView } from './helpers/view';

describe("Jacks Parrow's lines", () => {
  it('are the seven the owner passed, the first his first word on your shoulder', () => {
    expect(PARROT_LINES).toHaveLength(7);
    expect(PARROT_LINES[0]).toBe('EXPLETIVE DELETED!');
  });

  it('only ever hide a word behind a bleep or a swear, with no letters under it', () => {
    for (const line of PARROT_LINES) {
      expect(line.replace(/\{[B#]\}/g, '')).not.toMatch(/[{}]/);
    }
  });

  it('come apart into words, bleeps and swears, in order', () => {
    expect(squawkParts('EXPLETIVE DELETED!')).toEqual([
      { kind: 'text', text: 'EXPLETIVE DELETED!' },
    ]);
    expect(squawkParts('Shiver me {B}-ing timbers!')).toEqual([
      { kind: 'text', text: 'Shiver me ' },
      { kind: 'bleep', text: 'BLEEP' },
      { kind: 'text', text: '-ing timbers!' },
    ]);
    const pieces = squawkParts('Pieces of {#}! Pieces of {#}!');
    expect(pieces.map((p) => p.kind)).toEqual(['text', 'swear', 'text', 'swear', 'text']);
    expect(bleepsIn('Pieces of {#}! Pieces of {#}!')).toBe(2);
    expect(bleepsIn('EXPLETIVE DELETED!')).toBe(0);
  });

  it('never says the same line twice running, and in time says every other', () => {
    for (let last = 0; last < PARROT_LINES.length; last++) {
      const said = new Set<number>();
      for (let r = 0; r < 1; r += 0.01) {
        const i = nextLine(last, r);
        expect(i).not.toBe(last);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(PARROT_LINES.length);
        said.add(i);
      }
      expect(said.size).toBe(PARROT_LINES.length - 1);
    }
  });

  it('draws a bubble with a bar over each rude word', () => {
    const plain = fakeView();
    drawSquawk(plain.v, 100, 100, 'EXPLETIVE DELETED!', 1);
    const rude = fakeView();
    drawSquawk(rude.v, 100, 100, 'Pieces of {#}! Pieces of {#}!', 1);
    expect((rude.calls.fill ?? 0) - (plain.calls.fill ?? 0)).toBe(2);
    expect(rude.calls.fillText ?? 0).toBe(5);
  });
});

describe("Doom Island's leaders", () => {
  it('say who they are, why they fight, and give their minion to anyone, of either side or both', () => {
    expect(MINION_NAME).toEqual({ pirate: 'Jacks Parrow', ninja: 'Bun-San' });
    expect(LEADER_NAME.pirate).toMatch(/Captain/);
    expect(LEADER_NAME.ninja).toMatch(/Master/);
    for (const side of SIDES) {
      const says = LEADER_SAYS[side];
      expect(says.why).toMatch(/stimulate the economy/);
      expect(says.rival).toMatch(/both sides/);
      expect(says.joined).toMatch(MINION_NAME[side]);
    }
    expect(LEADER_SAYS.pirate.hello).toMatch(/parrot/);
    expect(LEADER_SAYS.ninja.hello).toMatch(/Bun-San/);
  });

  it('stand ashore at the foot of each pier, mirrored, in your way, and are talked to from close by', () => {
    for (const side of SIDES) {
      const L = LEADER13[side];
      const [u, v] = toDoom(L.x, L.y);
      expect(u).toBeCloseTo(LEADER13_AT.u, 3);
      expect(Math.abs(v)).toBeCloseTo(LEADER13_AT.w, 3);
      // Ground round him, the pier's landing a short walk off.
      for (const a of [0, 1, 2, 3, 4, 5]) {
        const x = L.x + Math.cos(a) * (LEADER13_R + 12);
        const y = L.y + Math.sin(a) * (LEADER13_R + 12);
        expect(onLand(x, y)).toBe(true);
        expect(walkable(x, y, 99)).toBe(true);
        expect(leaderNear(x, y)).toBe(side);
      }
      expect(walkable(L.x, L.y, 99)).toBe(false);
      const land = LANDING13[side];
      expect(Math.hypot(land.x - L.x, land.y - L.y)).toBeGreaterThan(LEADER13_REACH);
      expect(Math.hypot(land.x - L.x, land.y - L.y)).toBeLessThan(400);
    }
    expect(blockedHalf(LEADER13_AT.u, LEADER13_AT.w)).toBe(true);
    expect(leaderNear(LANDING13.pirate.x, LANDING13.pirate.y)).toBe(null);
  });

  it('are drawn, with the two minions and the puff of smoke, without a bad radius', () => {
    const f = fakeView();
    drawCaptain(f.v, 0, 0, 1.3);
    drawMaster(f.v, 0, 0, 1.3);
    for (const flying of [false, true]) drawParrot(f.v, 0, 0, 0.7, 3, flying, 1);
    for (const h of [0, Math.PI]) drawBun(f.v, 0, 0, h, 2, 1, 0.5);
    for (const k of [0, 0.5, 1]) drawPoof(f.v, 0, 0, k);
    expect(f.calls.fill ?? 0).toBeGreaterThan(30);
  });
});
