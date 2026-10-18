import { describe, expect, it } from 'vitest';
import { SEA_ARENA } from '../../src/data/barge';
import {
  drawRoofBack,
  drawTunnelBack,
  roofSolids,
  tunnelEdges,
  tunnelSolids,
} from '../../src/render/stealth';
import {
  CATCH_T,
  COVER,
  clearLine,
  GUARDS,
  type Guard,
  INVIS_NEAR,
  KICK_END,
  lightFan,
  ROOF_START,
  SIGHT,
  SOLIDS,
  SORC_AT,
  STEALTH_GOAL,
  STEALTH_START,
  Stealth,
  sees,
  sorcLook,
  sorcSees,
  TUNNEL_BOUNDS,
  TUNNELS,
  tunnelWalkable,
} from '../../src/world/stealth';
import { ROOMS } from '../../src/world/tower';
import { fakeView } from './helpers/view';

/** The squares of a grid over the tunnels a figure can reach from a point, walking. */
function reach(from: { x: number; y: number }, step = 6): Set<string> {
  const key = (i: number, j: number) => `${i},${j}`;
  const x0 = TUNNEL_BOUNDS.x0;
  const y0 = TUNNEL_BOUNDS.y0;
  const at = (i: number, j: number) => ({ x: x0 + i * step, y: y0 + j * step });
  const i0 = Math.round((from.x - x0) / step);
  const j0 = Math.round((from.y - y0) / step);
  const seen = new Set([key(i0, j0)]);
  const queue: [number, number][] = [[i0, j0]];
  while (queue.length) {
    const [i, j] = queue.shift() as [number, number];
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const k = key(i + di, j + dj);
      if (seen.has(k)) continue;
      const p = at(i + di, j + dj);
      if (!tunnelWalkable(p.x, p.y)) continue;
      seen.add(k);
      queue.push([i + di, j + dj]);
    }
  }
  return seen;
}

describe("stealth mission 1's tunnels, from the kid's map", () => {
  it('lie far from any sea, the rooms and the sea battle', () => {
    for (const r of TUNNELS) {
      for (const room of ROOMS)
        expect(Math.hypot(r.x0 - room.x, r.y0 - room.y)).toBeGreaterThan(room.r + 1500);
      expect(Math.hypot(r.x0 - SEA_ARENA.x, r.y0 - SEA_ARENA.y)).toBeGreaterThan(4500);
      expect(r.x1).toBeLessThan(-4000);
    }
  });

  it('can be walked all the way from the way in to the way out', () => {
    expect(tunnelWalkable(STEALTH_START.x, STEALTH_START.y)).toBe(true);
    expect(tunnelWalkable(STEALTH_GOAL.x, STEALTH_GOAL.y)).toBe(true);
    const got = reach(STEALTH_START);
    const step = 6;
    const near = [...got].some((k) => {
      const [i, j] = k.split(',').map(Number) as [number, number];
      const x = TUNNEL_BOUNDS.x0 + i * step;
      const y = TUNNEL_BOUNDS.y0 + j * step;
      return Math.hypot(x - STEALTH_GOAL.x, y - STEALTH_GOAL.y) < 12;
    });
    expect(near).toBe(true);
    // Every part of his map is reached on the way.
    for (const part of ['blue', 'black', 'green', 'red'] as const) {
      const r = TUNNELS.find((t) => t.part === part);
      expect(r).toBeDefined();
    }
  });

  it('keeps you off the walls and out of the pillars, walls and rubble', () => {
    const r = TUNNELS[0];
    if (r) expect(tunnelWalkable(r.x0 + 1, (r.y0 + r.y1) / 2)).toBe(false);
    for (const s of SOLIDS)
      expect(tunnelWalkable((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2)).toBe(false);
  });

  it('has its guards walk where they can stand', () => {
    for (const g of GUARDS)
      for (let k = 0; k < g.path.length; k++) {
        const a = g.path[k] as { x: number; y: number };
        const b = g.path[(k + 1) % g.path.length] as { x: number; y: number };
        expect(tunnelWalkable(a.x, a.y)).toBe(true);
        expect(clearLine(a.x, a.y, b.x, b.y)).toBe(true);
      }
  });

  it('lets a guard see what is in front of it, not behind it or round a pillar', () => {
    const g: Guard = { ...(GUARDS[0] as Guard), x: 0, y: 0, look: 0, i: 0, t: 0, seen: 0 };
    const pillar = SOLIDS.find((s) => s.kind === 'pillar');
    expect(pillar).toBeDefined();
    if (!pillar) return;
    // Stood beside the pillar, looking across it.
    const mid = { x: (pillar.x0 + pillar.x1) / 2, y: (pillar.y0 + pillar.y1) / 2 };
    const w = pillar.x1 - pillar.x0;
    const look: Guard = { ...g, x: mid.x - w, y: mid.y, look: 0 };
    expect(sees(look, mid.x + w, mid.y)).toBe(false);
    // In the open at the way in, in front and behind.
    const open: Guard = { ...g, x: STEALTH_START.x, y: STEALTH_START.y, look: 0 };
    expect(sees(open, STEALTH_START.x + 40, STEALTH_START.y)).toBe(true);
    expect(sees(open, STEALTH_START.x - 40, STEALTH_START.y)).toBe(false);
    expect(sees(open, STEALTH_START.x + SIGHT + 20, STEALTH_START.y)).toBe(false);
    expect(lightFan(open).length).toBeGreaterThan(10);
  });

  it('catches you if a guard sees you long enough, and lets you out at the top', () => {
    const st = new Stealth();
    const g = st.guards[0] as Guard;
    const front = { x: g.x + Math.cos(g.look) * 40, y: g.y + Math.sin(g.look) * 40 };
    let got: string | null = null;
    for (let t = 0; t < CATCH_T + 0.2 && !got; t += 1 / 30) got = st.update(1 / 30, front);
    expect(got).toBe('caught');
    st.reset();
    expect(st.update(1 / 30, STEALTH_GOAL)).toBe('out');
  });

  it('gives you a fair start: nobody sees the way in, whatever they are doing', () => {
    const st = new Stealth();
    for (let t = 0; t < 60; t += 1 / 30) expect(st.update(1 / 30, STEALTH_START)).toBeNull();
  });

  it('draws the floor, the walls, the solids and every guard', () => {
    expect(tunnelEdges().length).toBeGreaterThan(20);
    const st = new Stealth();
    const { v, calls } = fakeView();
    drawTunnelBack(v, 390, 780, st);
    const solids = tunnelSolids(v, st);
    for (const s of solids) s.f();
    expect(solids.length).toBeGreaterThan(SOLIDS.length + GUARDS.length);
    expect(calls.fill ?? 0).toBeGreaterThan(50);
  });
});

describe('stealth mission 1: backstab, invisibility, and the sorcerer on his tower', () => {
  const front = (g: Guard, d: number) => ({
    x: g.x + Math.cos(g.look) * d,
    y: g.y + Math.sin(g.look) * d,
  });
  const run = (st: Stealth, me: { x: number; y: number }, s: number) => {
    let got: string | null = null;
    for (let t = 0; t < s && !got; t += 1 / 30) got = st.update(1 / 30, me);
    return got;
  };

  it('lets you backstab a guard from close behind, and a guard that is down sees nothing', () => {
    const st = new Stealth();
    const g = st.guards[0] as Guard;
    const back = { x: g.x - Math.cos(g.look) * 20, y: g.y - Math.sin(g.look) * 20 };
    expect(st.stabbable(back)).toBe(g);
    expect(st.stabbable(front(g, 20))).toBeNull();
    expect(
      st.stabbable({ x: back.x - Math.cos(g.look) * 40, y: back.y - Math.sin(g.look) * 40 }),
    ).toBeNull();
    g.down = true;
    expect(run(st, front(g, 40), 2)).toBeNull();
    st.reset();
    expect(st.guards.every((k) => !k.down)).toBe(true);
  });

  it('hides you while invisible, but never perfectly: right up close they still see you', () => {
    const st = new Stealth();
    st.invisible = true;
    const g = st.guards[0] as Guard;
    expect(run(st, front(g, 60), 1)).toBeNull();
    expect(run(new Stealth(), front(g, 60), 1)).toBe('caught');
    const close = new Stealth();
    close.invisible = true;
    expect(run(close, front(close.guards[0] as Guard, INVIS_NEAR - 10), 1)).toBe('caught');
  });

  it('puts the sorcerer on the tower top looking out, turning round now and then, and the crates hide you', () => {
    expect(tunnelWalkable(ROOF_START.x, ROOF_START.y)).toBe(true);
    for (const c of COVER) expect(tunnelWalkable((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2)).toBe(false);
    expect(sorcLook(0).away).toBe(true);
    let turned = false;
    for (let t = 0; t < 10; t += 0.1) if (!sorcLook(t).away) turned = true;
    expect(turned).toBe(true);
    // Coming up the ladder you are out of his sight, whichever way he looks.
    const st = new Stealth();
    st.toRoof();
    expect(run(st, ROOF_START, 20)).toBeNull();
    // Looking back across the roof, he sees you in the open between him and the ladder.
    const mid = { x: SORC_AT.x + 100, y: SORC_AT.y - 10 };
    const back = sorcLook(6.5);
    expect(back.away).toBe(false);
    expect(sorcSees(back.look, mid.x, mid.y)).toBe(true);
    expect(sorcSees(sorcLook(1).look, mid.x, mid.y)).toBe(false);
  });

  it('lets you kick him off from close behind while he looks out, and the mission is won when it is over', () => {
    const st = new Stealth();
    expect(st.canKick(SORC_AT)).toBe(false);
    st.toRoof();
    const near = { x: SORC_AT.x + 20, y: SORC_AT.y + 20 };
    expect(st.canKick(near)).toBe(true);
    expect(st.canKick(ROOF_START)).toBe(false);
    st.kick();
    expect(st.canKick(near)).toBe(false);
    expect(run(st, near, KICK_END + 0.5)).toBe('won');
  });

  it('draws the tower top before, during and after the kick', () => {
    const st = new Stealth();
    st.toRoof();
    for (const k of [-1, 0.8, 2.4, KICK_END - 0.1]) {
      st.kickT = k;
      const { v, calls } = fakeView();
      drawRoofBack(v, 390, 780, st);
      for (const o of roofSolids(v, st)) o.f();
      expect(calls.fill ?? 0).toBeGreaterThan(10);
    }
  });
});
