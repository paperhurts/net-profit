/**
 * project.md's tuning tables are authoritative. These tests read the doc and
 * check the code against it, so the two cannot drift apart again.
 */
import { describe, expect, it } from 'vitest';
import doc from '../../project.md?raw';
import {
  COST,
  HOLD,
  MAXLV,
  NETW,
  PAINTS,
  RANGE,
  RING_R,
  SHARK,
  SPECIES,
  SPEED,
  STAGES,
  TIER_NAME,
  TIER_SCALE,
} from '../../src/data/tuning';

/** Rows of the markdown table whose first data row starts with `| first |`. */
function tableRows(first: string): string[][] {
  const lines = doc.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`| ${first} |`));
  if (start < 0) throw new Error(`no table row starting with "${first}"`);
  const rows: string[][] = [];
  for (let i = start; i < lines.length && lines[i]?.startsWith('|'); i++) {
    const cells = (lines[i] ?? '')
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    rows.push(cells);
  }
  return rows;
}

/** "1,200" -> 1200, "–" -> NaN. */
const num = (s: string | undefined) => Number((s ?? '').replace(/,/g, ''));

describe('upgrade table', () => {
  const rows = tableRows('1');
  it('has six levels', () => {
    expect(rows).toHaveLength(6);
    expect(MAXLV).toBe(5);
  });
  it('matches net width, hold and top speed per level', () => {
    rows.forEach((r, i) => {
      expect(NETW[i]).toBe(num(r[1]));
      expect(HOLD[i]).toBe(num(r[2]));
      expect(SPEED[i]).toBe(num(r[3]));
    });
  });
  it('matches the cost of each level from level 2 up', () => {
    rows.slice(1).forEach((r, i) => {
      expect(COST.net[i]).toBe(num(r[4]));
      expect(COST.hold[i]).toBe(num(r[5]));
      expect(COST.engine[i]).toBe(num(r[6]));
    });
  });
});

describe('tier table', () => {
  const rows = tableRows('0 | dinghy');
  it('matches names, hull scale and range', () => {
    expect(rows).toHaveLength(6);
    rows.forEach((r, i) => {
      expect(TIER_NAME[i]).toBe(r[1]);
      expect(TIER_SCALE[i]).toBeCloseTo(num(r[2]));
      if (r[3] === 'unlimited') expect(RANGE[i]).toBeGreaterThan(1e8);
      else expect(RANGE[i]).toBe(num(r[3]));
    });
  });
});

describe('species table', () => {
  const speciesRows = tableRows('0 | sardine');
  it('matches every species name and value', () => {
    expect(speciesRows).toHaveLength(SPECIES.length);
    speciesRows.forEach((r, i) => {
      expect(SPECIES[i]?.name).toBe(r[1]);
      expect(SPECIES[i]?.v).toBe(num(r[2]));
    });
  });
  it('keeps the index coupling the code relies on', () => {
    expect(SPECIES[SHARK]?.name).toBe('shark');
    expect(SPECIES.filter((s) => s.glow).map((s) => s.name)).toEqual([
      'lanternfish',
      'moonfish',
      'starfin',
    ]);
    expect(SPECIES.filter((s) => s.rare).map((s) => s.name)).toEqual(['sunrise koi', 'dusk ray']);
    expect(RING_R).toHaveLength(SHARK);
  });
});

describe('palace table', () => {
  const rows = tableRows('1 | tree platform');
  it('matches every stage: name, driftwood and coins', () => {
    expect(rows).toHaveLength(STAGES.length);
    rows.forEach((r, i) => {
      expect(STAGES[i]?.name).toBe(r[1]);
      expect(STAGES[i]?.wood).toBe(num(r[2]));
      expect(STAGES[i]?.coins).toBe(num(r[3]));
    });
  });
});

describe('paints', () => {
  it('has the ten hulls the flagship unlocks', () => {
    expect(PAINTS).toHaveLength(10);
    for (const p of PAINTS) expect(p.hull).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
