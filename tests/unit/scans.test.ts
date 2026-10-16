import { describe, expect, it } from 'vitest';
import { RESOLVE } from '../../src/data/harpoon';
import {
  isScanKind,
  SCAN_EGGS,
  SCAN_HP,
  SCAN_KINDS,
  SCANNER_LEVELS,
  SCANS,
  scannerLevel,
} from '../../src/data/scans';
import { type Bounds, parseSave, serializeSave } from '../../src/state/save';

describe('the scanner', () => {
  it('knows how to beat every kind it can scan, in a few short sentences', () => {
    expect(new Set(SCAN_KINDS).size).toBe(SCAN_KINDS.length);
    for (const k of SCAN_KINDS) {
      const sc = SCANS[k];
      expect(sc.name.length).toBeGreaterThan(2);
      expect(sc.beat.length).toBeGreaterThan(20);
      expect(sc.beat.length).toBeLessThan(260);
      if (sc.weak) expect(sc.weak.length).toBeLessThan(140);
    }
  });

  it('scans every beast the harpoon can aim at', () => {
    for (const k of Object.keys(RESOLVE)) expect(isScanKind(k)).toBe(true);
  });

  it('gets better as more kinds are scanned: further at 5, eggs at 10, hit points at 18', () => {
    expect([0, 4, 5, 9, 10, 17, 18, 36].map(scannerLevel)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(SCANNER_LEVELS[SCAN_EGGS - 1]?.said).toMatch(/eggs/);
    expect(SCANNER_LEVELS[SCAN_HP - 1]?.said).toMatch(/hit points/);
    // Every level is reachable: there are more kinds to scan than the last level asks for.
    expect(SCAN_KINDS.length).toBeGreaterThan(SCANNER_LEVELS[SCANNER_LEVELS.length - 1]?.at ?? 0);
    expect(SCANS.egg.beat).toMatch(/hatch/);
  });

  it('says what the kid said they are afraid of: Star bigger stuff, the Reaper honey', () => {
    expect(SCANS.meteor.weak).toMatch(/bigger/i);
    expect(SCANS.reaper.weak).toMatch(/honey/i);
    expect(SCANS.reaperland.weak).toMatch(/honey/i);
  });
});

describe('what has been scanned, in the save', () => {
  const bounds: Bounds = {
    maxLevel: 5,
    paints: 10,
    stages: 5,
    species: 12,
    worldSize: 4800,
    holdCaps: [12, 20, 32, 50, 80, 120],
  };
  it('is none in an old save, keeps each kind once, and drops what is not a kind', () => {
    const s = parseSave(JSON.stringify({ coins: 5 }), bounds);
    expect(s.scanned).toEqual([]);
    const t = parseSave(
      JSON.stringify({ coins: 5, scanned: ['gorilla', 'gorilla', 'meteor', 'unicorn', 7] }),
      bounds,
    );
    expect(t.scanned).toEqual(['gorilla', 'meteor']);
    expect(parseSave(serializeSave(t), bounds).scanned).toEqual(['gorilla', 'meteor']);
  });
});
