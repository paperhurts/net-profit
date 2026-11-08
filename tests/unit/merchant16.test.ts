import { describe, expect, it } from 'vitest';
import { OUTFIT_LOOK } from '../../src/data/look';
import {
  HINTS16,
  nextHint16,
  pickLine,
  SKULL_CLOAK,
  SNEERS,
  TORCH_SIGHT16,
  TORCH16,
} from '../../src/data/merchant16';
import { outfitWon } from '../../src/data/rewards';
import { onLand } from '../../src/entities/walker';
import {
  LANDING16,
  MERCHANT_REACH,
  MERCHANT16,
  onIsle16,
  SIGHT_LAND16,
} from '../../src/world/tombisle';

describe("Tomb Island's merchant", () => {
  it('tells his hints in order, round again once all are told, and counts each one bought', () => {
    expect(nextHint16(0)).toEqual({ line: HINTS16[0], told: 1 });
    expect(nextHint16(HINTS16.length)).toEqual({ line: HINTS16[0], told: HINTS16.length + 1 });
    expect(nextHint16(Number.NaN).told).toBe(1);
    expect(pickLine(SNEERS, -1)).toBe(SNEERS[SNEERS.length - 1]);
  });

  it('sells a torch that sees further than the fog lets you, and the skull cloak as an outfit, bought not won', () => {
    expect(TORCH_SIGHT16).toBeGreaterThan(SIGHT_LAND16 * 1.6);
    expect(TORCH16.price).toBeLessThan(SKULL_CLOAK.price);
    expect(OUTFIT_LOOK.skull.skull).toBe(true);
    expect(outfitWon('skull', {})).toBe(false);
    expect(outfitWon('skull', { skull: true })).toBe(true);
  });

  it('stands on the beach by the way up from the jetty, in the way, and can be walked up to', () => {
    expect(onIsle16(MERCHANT16.x, MERCHANT16.y)).toBe(false);
    // A spot within his reach on the ground, on the side toward the path.
    const spot = { x: MERCHANT16.x + 24, y: MERCHANT16.y };
    expect(onLand(spot.x, spot.y)).toBe(true);
    expect(Math.hypot(spot.x - MERCHANT16.x, spot.y - MERCHANT16.y)).toBeLessThan(MERCHANT_REACH);
    expect(Math.hypot(LANDING16.x - MERCHANT16.x, LANDING16.y - MERCHANT16.y)).toBeLessThan(300);
  });
});
