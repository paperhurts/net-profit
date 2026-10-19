import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BEAST_FLEE,
  CORNERED_T,
  TAR_HOMES,
  TAR_MELT,
  TAR_RISE,
  TAR_SPEC,
  TAR_WAKE,
  type TarFolk,
  TarFolks,
} from '../../src/entities/tarfolk';
import { setWalkLand, WALK_SPEED } from '../../src/entities/walker';
import { drawTarFolk, drawTarMark } from '../../src/render/tarfolk';
import { JETTY_END, onTarIsle, shoreR, TAR_ISLE, tarIsleZ } from '../../src/world/tarisle';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

type At = { x: number; y: number } | null;
const step = (g: TarFolks, at: At) =>
  g.update(1 / 60, baseWorld({ figure: at ? { ...at, vx: 0, vy: 0 } : null }));
const run = (g: TarFolks, s: number, at: () => At) => {
  for (let t = 0; t < s; t += 1 / 60) step(g, at());
};
const until = (g: TarFolks, q: TarFolk, state: string, s: number, at: () => At) => {
  for (let t = 0; t < s && q.state !== state; t += 1 / 60) step(g, at());
};
const folk = (kind: 'human' | 'beast', x: number, y: number) => {
  const g = new TarFolks([{ kind, at: [x, y] }]);
  g.here = true;
  return { g, q: g.list[0] as TarFolk };
};

beforeEach(() => setWalkLand({ on: onTarIsle, z: tarIsleZ }));
afterEach(() => setWalkLand(null));

describe('the tar creatures', () => {
  it("are the kid's: 3 to 5 damage and 15 to 20 hits, slower than the figure walks", () => {
    for (const s of Object.values(TAR_SPEC)) {
      expect(s.dmg).toBeGreaterThanOrEqual(3);
      expect(s.dmg).toBeLessThanOrEqual(5);
      expect(s.hp).toBeGreaterThanOrEqual(15);
      expect(s.hp).toBeLessThanOrEqual(20);
      expect(s.speed).toBeLessThan(WALK_SPEED * 0.7);
      expect(s.windup).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('stand on the island, tar humans and tar beasts, none near the jetty', () => {
    expect(TAR_HOMES.filter((h) => h.kind === 'human')).toHaveLength(4);
    expect(TAR_HOMES.filter((h) => h.kind === 'beast')).toHaveLength(2);
    for (const h of TAR_HOMES) {
      expect(onTarIsle(h.at[0], h.at[1])).toBe(true);
      expect(Math.hypot(h.at[0] - JETTY_END.x, h.at[1] - JETTY_END.y)).toBeGreaterThan(
        TAR_WAKE + 100,
      );
    }
  });

  it('do nothing and are no fight while the figure is not on the island', () => {
    const g = new TarFolks();
    const q = g.list[0] as TarFolk;
    run(g, 1, () => ({ x: q.x + 10, y: q.y }));
    expect(q.state).toBe('idle');
    g.here = true;
    step(g, { x: q.x + 10, y: q.y });
    expect(q.state).toBe('rise');
    expect(g.roused).toBe(true);
    g.here = false;
    expect(g.roused).toBe(false);
  });

  it('rise for the figure near, the others near with them, then come on', () => {
    const g = new TarFolks();
    g.here = true;
    const q = g.list[4] as TarFolk;
    let rose = 0;
    g.onRise = () => rose++;
    run(g, 0.5, () => ({ x: q.x + TAR_WAKE + 60, y: q.y }));
    expect(q.state).toBe('idle');
    const near = { x: q.x + TAR_WAKE - 30, y: q.y };
    step(g, near);
    expect(q.state).toBe('rise');
    expect(rose).toBeGreaterThanOrEqual(2);
    run(g, TAR_RISE + 0.1, () => near);
    expect(q.state).toBe('chase');
  });

  it('a tar human slams a ring in front of it: three hearts in it, none for a figure that steps out', () => {
    const at = { x: TAR_ISLE.x - 200, y: TAR_ISLE.y + 60 };
    const { g, q } = folk('human', at.x, at.y);
    const hits: number[] = [];
    g.onHit = (n) => hits.push(n);
    const fig = { x: at.x + 26, y: at.y };
    until(g, q, 'windup', 5, () => fig);
    expect(q.state).toBe('windup');
    expect(TarFolks.catches(q, fig.x, fig.y)).toBe(true);
    until(g, q, 'strike', 2, () => fig);
    expect(hits).toEqual([TAR_SPEC.human.dmg]);
    // Again, and this time out of the ring before it lands.
    until(g, q, 'windup', 5, () => fig);
    const away = { x: q.from[0] + TAR_SPEC.human.wide + 30, y: q.from[1] + 40 };
    until(g, q, 'strike', 2, () => away);
    expect(hits).toHaveLength(1);
  });

  it('a tar beast lunges along a lane: four hearts on it, none for a figure that steps off it', () => {
    const at = { x: TAR_ISLE.x - 200, y: TAR_ISLE.y + 60 };
    const { g, q } = folk('beast', at.x, at.y);
    const hits: number[] = [];
    g.onHit = (n) => hits.push(n);
    const fig = { x: at.x + 50, y: at.y };
    until(g, q, 'windup', 5, () => fig);
    expect(q.state).toBe('windup');
    const x0 = q.x;
    until(g, q, 'strike', 2, () => fig);
    expect(hits).toEqual([TAR_SPEC.beast.dmg]);
    expect(q.x).toBeGreaterThan(x0 + 40);
    until(g, q, 'windup', 5, () => ({ x: q.x + 50, y: q.y }));
    const side = {
      x: (q.from[0] + q.to[0]) / 2,
      y: (q.from[1] + q.to[1]) / 2 + TAR_SPEC.beast.wide + 20,
    };
    until(g, q, 'strike', 2, () => side);
    expect(hits).toHaveLength(1);
  });

  it('a tar beast losing runs from the figure; cornered against the tar, it fights again', () => {
    const at = { x: TAR_ISLE.x - 200, y: TAR_ISLE.y + 60 };
    const { g, q } = folk('beast', at.x, at.y);
    let fled = 0;
    g.onFlee = () => fled++;
    const fig = { x: at.x + 60, y: at.y };
    step(g, fig);
    run(g, TAR_RISE + 0.1, () => fig);
    g.hit(q, Math.ceil(TAR_SPEC.beast.hp * (1 - BEAST_FLEE)));
    expect(q.state).toBe('flee');
    expect(fled).toBe(1);
    // It runs away west, toward the shore, and stops there with its back to the tar.
    const d0 = Math.hypot(q.x - fig.x, q.y - fig.y);
    run(g, 1, () => ({ x: q.x + 60, y: q.y }));
    expect(Math.hypot(q.x - fig.x, q.y - fig.y)).toBeGreaterThan(d0);
    for (let t = 0; t < 8 && !q.cornered; t += 1 / 60) step(g, { x: q.x + 60, y: q.y });
    expect(q.cornered).toBe(true);
    expect(
      q.state === 'chase' || q.state === 'windup' || q.state === 'strike' || q.state === 'recover',
    ).toBe(true);
    const rx = q.x - TAR_ISLE.x;
    const ry = q.y - TAR_ISLE.y;
    expect(Math.hypot(rx, ry)).toBeGreaterThan(shoreR(Math.atan2(ry, rx)) - 60);
    expect(CORNERED_T).toBeLessThan(1);
    // Cornered once, it does not run again.
    g.hit(q, 1);
    expect(q.state).not.toBe('flee');
  });

  it('beaten, melts into a puddle, and is back on the next landing', () => {
    const { g, q } = folk('human', TAR_ISLE.x - 200, TAR_ISLE.y + 60);
    let beaten = 0;
    g.onBeaten = () => beaten++;
    expect(g.hit(q, TAR_SPEC.human.hp)).toBe(true);
    expect(q.state).toBe('melt');
    expect(beaten).toBe(1);
    expect(g.hit(q, 1)).toBe(false);
    run(g, TAR_MELT + 0.1, () => null);
    expect(q.state).toBe('gone');
    g.reset();
    expect(q.state).toBe('idle');
    expect(q.hp).toBe(TAR_SPEC.human.hp);
  });

  it('go back to where they stand when the figure leaves', () => {
    const at = { x: TAR_ISLE.x - 200, y: TAR_ISLE.y + 60 };
    const { g, q } = folk('human', at.x, at.y);
    const fig = { x: at.x + 100, y: at.y };
    step(g, fig);
    run(g, 2, () => fig);
    expect(TarFolks.up(q)).toBe(true);
    run(g, 6, () => null);
    expect(q.state).toBe('idle');
    expect(Math.hypot(q.x - at.x, q.y - at.y)).toBeLessThan(4);
  });

  it('a stun stops a blow being wound up', () => {
    const at = { x: TAR_ISLE.x - 200, y: TAR_ISLE.y + 60 };
    const { g, q } = folk('human', at.x, at.y);
    const fig = { x: at.x + 26, y: at.y };
    until(g, q, 'windup', 5, () => fig);
    g.stun(q, 1);
    expect(q.state).toBe('chase');
    expect(q.stunT).toBe(1);
  });

  it('are drawn, with the warning on the ground while they wind up', () => {
    const at = { x: TAR_ISLE.x - 200, y: TAR_ISLE.y + 60 };
    for (const kind of ['human', 'beast'] as const) {
      const { g, q } = folk(kind, at.x, at.y);
      const f = fakeView();
      drawTarFolk(f.v, q);
      expect(f.calls.fill ?? 0).toBeGreaterThan(4);
      const before = f.calls.fill ?? 0;
      drawTarMark(f.v, q);
      expect(f.calls.fill ?? 0).toBe(before);
      until(g, q, 'windup', 5, () => ({ x: at.x + 26, y: at.y }));
      drawTarFolk(f.v, q);
      drawTarMark(f.v, q);
      expect(f.calls.fill ?? 0).toBeGreaterThan(before);
    }
  });

  it('is beaten by a person with the second spear who keeps out of reach, dodges a third of a second late, and throws', () => {
    // A bot: kept between 80 and 115 off, a throw each 0.7 s within 125 for one hit, and out of a ring or off a lane
    // a third of a second after the wind-up shows; walking at the figure's 85, over the island only.
    for (const kind of ['human', 'beast'] as const) {
      let lost = 0;
      let won = 0;
      for (let trial = 0; trial < 6; trial++) {
        const at = { x: TAR_ISLE.x - 300 + trial * 12, y: TAR_ISLE.y + 200 - trial * 25 };
        const { g, q } = folk(kind, at.x, at.y);
        g.onHit = (n) => {
          lost += n;
        };
        const me = { x: at.x + 110, y: at.y };
        expect(onTarIsle(me.x, me.y) && onTarIsle(at.x, at.y)).toBe(true);
        let reload = 0;
        let seen = -1;
        const walk = (dx: number, dy: number, dt: number) => {
          // That way, or the nearest way round whatever is in it.
          const a = Math.atan2(dy, dx);
          for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.2, -2.2]) {
            const nx = me.x + Math.cos(a + da) * WALK_SPEED * dt;
            const ny = me.y + Math.sin(a + da) * WALK_SPEED * dt;
            if (!onTarIsle(nx, ny)) continue;
            me.x = nx;
            me.y = ny;
            return;
          }
        };
        for (let t = 0; t < 120 && q.state !== 'melt' && q.state !== 'gone'; t += 1 / 60) {
          const dt = 1 / 60;
          step(g, me);
          reload -= dt;
          const dx = q.x - me.x;
          const dy = q.y - me.y;
          const d = Math.hypot(dx, dy);
          if (q.state === 'windup') {
            if (seen < 0) seen = q.t;
            if (q.t - seen > 0.33 && TarFolks.catches(q, me.x, me.y)) {
              // Out of it, sideways to the blow.
              const bx = q.to[0] - q.from[0];
              const by = q.to[1] - q.from[1];
              if (kind === 'beast') walk(-by, bx, dt);
              else walk(me.x - q.from[0], me.y - q.from[1], dt);
              continue;
            }
          } else seen = -1;
          if (d < 80) walk(-dx, -dy, dt);
          else if (d > 115) walk(dx, dy, dt);
          if (reload <= 0 && d <= 125 && q.state !== 'idle') {
            g.hit(q, 1);
            reload = 0.7;
          }
          if (q.state === 'idle' && d < 125 && reload <= 0) {
            g.hit(q, 1);
            reload = 0.7;
          }
        }
        if (q.state === 'melt' || q.state === 'gone') won++;
      }
      expect(won).toBe(6);
      expect(lost).toBeLessThanOrEqual(TAR_SPEC[kind].dmg);
    }
  });
});
