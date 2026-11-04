import { describe, expect, it } from 'vitest';
import {
  GREETING,
  JOKE_ORDER,
  JOKES,
  nextJoke,
  OUT_OF_JOKES,
  PORTRAITS,
} from '../../src/data/bucksworth';
import {
  CASTLE15_DOOR,
  castleAction,
  HALL_DOOR_A,
  onWall15,
  PORTRAIT_AT,
  THRONE_AT,
} from '../../src/world/goatcastle';
import {
  CASTLE15,
  HERDS15,
  HOUSES15,
  inHouse15,
  KID_ZONE,
  onIsle15,
} from '../../src/world/goatisle';
import { GOAT_HALL, GOAT_THRONE, ROOMS, type Room } from '../../src/world/tower';

describe("Sir Bucksworth's jokes", () => {
  it('tells every joke once, in a fixed shuffle, before he says he is out and starts again', () => {
    expect([...JOKE_ORDER].sort((a, b) => a - b)).toEqual(JOKES.map((_, i) => i));
    const heard: string[] = [];
    let told = 0;
    for (let i = 0; i < JOKES.length; i++) {
      const r = nextJoke(told);
      expect(r.joke).not.toBeNull();
      heard.push(r.line);
      told = r.told;
    }
    expect(new Set(heard).size).toBe(JOKES.length);
    const out = nextJoke(told);
    expect(out.line).toBe(OUT_OF_JOKES);
    expect(out.told).toBe(0);
    expect(nextJoke(out.told).line).toBe(heard[0]);
  });

  it('reads a strange count in the save as the start of the book', () => {
    expect(nextJoke(Number.NaN).line).toBe(nextJoke(0).line);
    expect(nextJoke(-3).line).toBe(nextJoke(0).line);
  });

  it('has his greeting, a joke he faints after, and none of his lines repeated', () => {
    expect(GREETING).toContain('GOAT-ed');
    expect(JOKES.some((j) => j.faint)).toBe(true);
    expect(new Set(JOKES.map((j) => j.text)).size).toBe(JOKES.length);
  });
});

describe('his castle', () => {
  const R = (i: number) => ROOMS[i] as Room;

  it('stands on the hill on dry land, clear of the houses, the Kid Zone and the meadows, its gate reachable', () => {
    const from = (x: number, y: number, p: { x: number; y: number }) =>
      Math.hypot(x - p.x, y - p.y);
    expect(onIsle15(CASTLE15.x, CASTLE15.y)).toBe(false);
    expect(onIsle15(CASTLE15_DOOR.x, CASTLE15_DOOR.y)).toBe(true);
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const x = CASTLE15.x + Math.cos(a) * CASTLE15.r;
      const y = CASTLE15.y + Math.sin(a) * CASTLE15.r;
      expect(inHouse15(x, y, 6)).toBe(false);
    }
    expect(HOUSES15.length).toBeGreaterThan(0);
    expect(from(CASTLE15.x, CASTLE15.y, KID_ZONE)).toBeGreaterThan(CASTLE15.r + KID_ZONE.r + 20);
    for (const m of HERDS15)
      expect(from(CASTLE15.x, CASTLE15.y, m)).toBeGreaterThan(CASTLE15.r + m.r);
  });

  it('has a portrait for every plaque, each read from in front of it and only it', () => {
    expect(PORTRAIT_AT).toHaveLength(PORTRAITS.length);
    PORTRAIT_AT.forEach((a, k) => {
      const p = onWall15(GOAT_HALL, a, 16);
      expect(castleAction(GOAT_HALL, p.x, p.y)).toBe(`gplaque-${k}`);
      // Within the room, off its wall.
      expect(Math.hypot(p.x - R(GOAT_HALL).x, p.y - R(GOAT_HALL).y)).toBeLessThan(
        R(GOAT_HALL).r - 12,
      );
    });
  });

  it('opens on the throne room from its back door, and the king tells jokes from in front of his throne', () => {
    const d = onWall15(GOAT_HALL, HALL_DOOR_A, 14);
    expect(castleAction(GOAT_HALL, d.x, d.y)).toBe('gthrone');
    const t = THRONE_AT();
    expect(castleAction(GOAT_THRONE, t.x + 30, t.y + 30)).toBe('gjoke');
    // The middle of the hall, and the throne room's front, do nothing.
    expect(castleAction(GOAT_HALL, R(GOAT_HALL).x, R(GOAT_HALL).y + 60)).toBeNull();
    expect(castleAction(GOAT_THRONE, R(GOAT_THRONE).x + 80, R(GOAT_THRONE).y + 80)).toBeNull();
  });
});
