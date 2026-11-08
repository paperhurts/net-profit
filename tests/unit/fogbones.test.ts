import { describe, expect, it } from 'vitest';
import { SEA_FOES } from '../../src/data/barge';
import { boneColour } from '../../src/render/bone';
import {
  BONE_KINDS,
  BONE_LEASH,
  BONE_NOTICE,
  BONE_RING,
  BONE_SPOTS,
  keepBone,
  spotsClear,
} from '../../src/world/fogbones';
import { FOG_EXIT, inFogSea, SIGHT_SEA } from '../../src/world/fogsea';
import { FOG16, TOMB_ISLE } from '../../src/world/tombisle';

describe('the fog sea’s skeletons', () => {
  it('has the bones of every leviathan, one of each', () => {
    expect([...BONE_KINDS].sort()).toEqual([...SEA_FOES].sort());
    expect(BONE_SPOTS.map((s) => s.k)).toEqual([...BONE_KINDS]);
  });

  it('lays each in its own water, in the fog sea, off the island and its fog, clear of the walls and each other', () => {
    expect(spotsClear()).toBe(true);
    for (const a of BONE_SPOTS)
      for (const b of BONE_SPOTS)
        if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(BONE_RING * 2);
    // The east, the way out, is open water.
    for (const s of BONE_SPOTS)
      expect(Math.hypot(s.x - FOG_EXIT.x, s.y - FOG_EXIT.y)).toBeGreaterThan(BONE_LEASH);
  });

  it('wakes further off than the fog lets you see, and gives up before it is far from home', () => {
    expect(BONE_NOTICE).toBeGreaterThan(SIGHT_SEA);
    expect(BONE_LEASH).toBeGreaterThan(BONE_NOTICE);
  });

  it('keeps one in its ring and off the island', () => {
    const s = BONE_SPOTS[0] as (typeof BONE_SPOTS)[number];
    const p = { x: s.x + 5000, y: s.y };
    keepBone(s, p);
    expect(Math.hypot(p.x - s.x, p.y - s.y)).toBeLessThanOrEqual(BONE_RING);
    expect(inFogSea(p.x, p.y)).toBe(true);
    const q = { x: TOMB_ISLE.x + 1, y: TOMB_ISLE.y };
    keepBone(s, q);
    expect(Math.hypot(q.x - TOMB_ISLE.x, q.y - TOMB_ISLE.y)).toBeGreaterThan(
      TOMB_ISLE.r + FOG16 * 0.4,
    );
  });
});

describe('the bone look', () => {
  const rgb = (c: string) => (/\d+,\d+,\d+/.exec(c)?.[0] ?? '').split(',').map(Number);
  it('turns a beast’s colours to bone by how light they are, alpha kept', () => {
    const dark = rgb(boneColour('#23384A'));
    const light = rgb(boneColour('#E8E2D0'));
    expect(dark.reduce((a, b) => a + b)).toBeLessThan(light.reduce((a, b) => a + b));
    // Near grey: bone has little colour in it.
    for (const c of [dark, light]) expect(Math.max(...c) - Math.min(...c)).toBeLessThan(40);
    expect(boneColour('rgba(6,20,34,.5)')).toMatch(/^rgba\(.*,0\.5\)$/);
  });
  it('keeps warnings, fire and gold as they are, and turns cold glows ghost green', () => {
    for (const c of ['#FF5A6A', '#E4572E', '#F0C544', 'rgba(255,120,90,.8)'])
      expect(boneColour(c)).toBe(c);
    const g = rgb(boneColour('#7CF5E6'));
    expect(g[1]).toBeGreaterThan(g[0] as number);
    expect(g[1]).toBeGreaterThan(g[2] as number);
  });
  it('leaves what it cannot read alone', () => {
    expect(boneColour('transparent')).toBe('transparent');
  });
});
