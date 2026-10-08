import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import { HARPOON_POWER, HARPOON_RANGE, HARPOON_RELOAD } from '../../src/data/harpoon';
import { spearAt } from '../../src/data/spear';
import { SPEED } from '../../src/data/tuning';
import { steerBoat } from '../../src/entities/boat';
import { BONK_R, CTHULHU_HP, Cthulhu, RIPPLE, TENT_SPEED } from '../../src/entities/cthulhu';
import {
  BODY_R,
  DEEP_RESOLVE,
  DeepOne,
  DRAG_T,
  GRAB_R,
  GRAB_UP,
  HOLD_MAX,
  LAIR6,
  LEASH,
  LOG,
  LOG_FLIGHT,
  NOTICE,
  SQUEEZE,
} from '../../src/entities/deepone';
import type { World } from '../../src/entities/entity';
import { Spears } from '../../src/entities/spears';
import { WALK_SPEED, walkStep } from '../../src/entities/walker';
import { CAST_EVERY, CAST_RANGE } from '../../src/entities/warlock';
import { ROOMS, TEMPLE6 } from '../../src/world/tower';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const DT = 1 / 60;
const stick = (wx: number, wy: number): [number, number] => {
  const sx = wx - wy;
  const sy = (wx + wy) / 2;
  const n = Math.hypot(sx, sy) || 1;
  return [sx / n, sy / n];
};
const near = (d = NOTICE - 60) =>
  baseWorld({ hullScale: 1.6, boat: { x: LAIR6.x - d, y: LAIR6.y + 30, h: 0, v: 150 } });

describe('the Deep One at the surface', () => {
  it('sleeps until a boat comes near, then rises with its tentacles', () => {
    const d = new DeepOne();
    let rose = 0;
    d.onRise = () => rose++;
    const w = near(NOTICE + 300);
    for (let i = 0; i < 2 / DT; i++) d.update(DT, w);
    expect(d.state).toBe('sleep');
    w.boat.x = LAIR6.x - NOTICE + 50;
    d.update(DT, w);
    expect(rose).toBe(1);
    for (let i = 0; i < 2 / DT; i++) d.update(DT, w);
    expect(d.state).toBe('fight');
  });

  it('opens its eye every so often, and only then does the harpoon hurt it', () => {
    const d = new DeepOne();
    const w = near(400);
    let open = 0;
    let shut = 0;
    for (let i = 0; i < 20 / DT; i++) {
      d.update(DT, w);
      if (d.state !== 'fight') continue;
      if (d.eye) open++;
      else shut++;
      if (!d.eye && !d.grab) expect(d.mark()).toBeNull();
    }
    expect(open).toBeGreaterThan(0);
    expect(shut).toBeGreaterThan(open);
    const before = d.resolve;
    while (!d.eye) d.update(DT, w);
    d.harpoon(1);
    expect(d.resolve).toBe(before - 1);
  });

  it('grabs a boat that stays close and holds it, until a harpoon in the tentacle lets it go', () => {
    const d = new DeepOne();
    const w = near(BODY_R + 120);
    let grabbed = 0;
    let squeezed = 0;
    d.onGrab = () => grabbed++;
    d.onSqueeze = (n) => {
      squeezed += n;
    };
    for (let i = 0; i < 15 / DT && grabbed === 0; i++) {
      w.boat.v = 0;
      d.update(DT, w);
    }
    expect(grabbed).toBe(1);
    expect(d.holding).toBe(true);
    for (let i = 0; i < 0.5 / DT; i++) d.update(DT, w);
    expect(squeezed).toBeCloseTo(SQUEEZE * 0.5, 0);
    expect(d.mark()).toBe(d.grab);
    d.harpoon(1);
    expect(d.holding).toBe(false);
    expect(d.resolve).toBe(DEEP_RESOLVE);
    // Left alone, it lets go by itself.
    const e = new DeepOne();
    const v = near(BODY_R + 120);
    let held = 0;
    e.onGrab = () => held++;
    for (let i = 0; i < 15 / DT && held === 0; i++) {
      v.boat.v = 0;
      e.update(DT, v);
    }
    for (let i = 0; i < (HOLD_MAX + 0.2) / DT; i++) e.update(DT, v);
    expect(e.holding).toBe(false);
    expect(GRAB_UP).toBeGreaterThan(0.7);
  });

  it('lobs logs into rings where the boat is going, and they land on one that holds its course', () => {
    const d = new DeepOne();
    const w = near(420);
    let hits = 0;
    d.onLog = () => hits++;
    for (let i = 0; i < 20 / DT && hits === 0; i++) {
      const a = Math.atan2(w.boat.y - d.y, w.boat.x - d.x) + (120 / 420) * DT;
      w.boat.x = d.x + Math.cos(a) * 420;
      w.boat.y = d.y + Math.sin(a) * 420;
      w.boat.h = a + Math.PI / 2;
      w.boat.v = 120;
      d.update(DT, w);
    }
    expect(hits).toBeGreaterThan(0);
    expect(LOG_FLIGHT).toBeGreaterThan(0.8);
  });

  it('beaten, drags the boat under instead of dying, and stays down', () => {
    const d = new DeepOne();
    const w = near(400);
    let beaten = 0;
    let dragged = 0;
    d.onBeaten = () => beaten++;
    d.onDragged = () => dragged++;
    for (let i = 0; i < 200 / DT && d.state !== 'drag'; i++) {
      d.update(DT, w);
      if (d.eye) d.harpoon(1);
    }
    expect(beaten).toBe(1);
    expect(d.holding).toBe(true);
    for (let i = 0; i < (DRAG_T + 0.1) / DT; i++) d.update(DT, w);
    expect(dragged).toBe(1);
    expect(d.state).toBe('down');
    d.reset();
    expect(d.state).toBe('down');
  });

  it('sinks back to sleep, whole, when the boat sails off', () => {
    const d = new DeepOne();
    const w = near(400);
    for (let i = 0; i < 3 / DT; i++) d.update(DT, w);
    d.resolve = 2;
    w.boat.x = LAIR6.x - LEASH - 50;
    d.update(DT, w);
    expect(d.state).toBe('sleep');
    expect(d.resolve).toBe(DEEP_RESOLVE);
  });

  it('draws in every state without a negative size', () => {
    const d = new DeepOne();
    const w = near(BODY_R + 150);
    const v = fakeView();
    v.v.onScreen = () => true;
    for (let i = 0; i < 30 / DT; i++) {
      d.update(DT, w);
      if (d.eye && i % 30 === 0) d.harpoon(1);
      v.v.T = i * DT;
      d.draw(v.v, 'surface');
      d.draw(v.v, 'air');
      d.drawBody(v.v);
    }
    expect(v.calls.fill ?? 0).toBeGreaterThan(100);
  });
});

/** How long a person takes to see a ring, or the bubbles, and act. */
const REACT = 0.35;

/**
 * A person at the wheel: circles it a little outside its grab, steers out of a log's ring a reaction
 * time after it shows (or never, with none), fires the harpoon at whatever mark says whenever in reach,
 * a third of a second late. Wins (dragged under) out of 30, health lost, and how long.
 */
function surface(react: number | null): { wins: number; lost: number; secs: number } {
  const r = rng(61 + (react ?? 9) * 100);
  let wins = 0;
  let lost = 0;
  let time = 0;
  for (let run = 0; run < 30; run++) {
    const d = new DeepOne();
    const a0 = r() * Math.PI * 2;
    const w: World = baseWorld({
      hullScale: 1.6,
      boat: {
        x: LAIR6.x + Math.cos(a0) * 600,
        y: LAIR6.y + Math.sin(a0) * 600,
        h: a0 + Math.PI,
        v: 200,
      },
    });
    let hp = 100;
    let ready = 0;
    const pending: number[] = [];
    const seen = new Map<object, number>();
    d.onLog = () => {
      hp -= LOG;
    };
    d.onSqueeze = (n) => {
      hp -= n;
    };
    const way = run % 2 ? 1 : -1;
    let t = 0;
    for (; t < 240 && hp > 0 && d.state !== 'drag' && d.state !== 'down'; t += DT) {
      const b = w.boat;
      const ra = Math.atan2(b.y - d.y, b.x - d.x);
      const rd = Math.hypot(b.x - d.x, b.y - d.y);
      const want = GRAB_R + BODY_R + 40;
      let dx = -Math.sin(ra) * way + Math.cos(ra) * Math.max(-1, Math.min(1, (want - rd) / 120));
      let dy = Math.cos(ra) * way + Math.sin(ra) * Math.max(-1, Math.min(1, (want - rd) / 120));
      if (react !== null) {
        for (const l of d.logs) {
          if (!seen.has(l)) seen.set(l, t);
          if (t - (seen.get(l) as number) < react) continue;
          // Hard over, to whichever side of the ring the boat is already on.
          const ax = l.tx - b.x;
          const ay = l.ty - b.y;
          if (Math.hypot(ax, ay) < 140) {
            const c = Math.cos(b.h);
            const sn = Math.sin(b.h);
            const side = c * ay - sn * ax > 0 ? -1 : 1;
            dx = -sn * side;
            dy = c * side;
          }
        }
      }
      steerBoat(b, ...stick(dx, dy), SPEED[5], DT);
      const m = d.mark();
      if (m && t >= ready && Math.hypot(m.x - b.x, m.y - b.y) < HARPOON_RANGE) {
        ready = t + HARPOON_RELOAD + 1 / 3;
        pending.push(t + 0.25);
      }
      for (let i = pending.length - 1; i >= 0; i--)
        if (t >= (pending[i] as number)) {
          pending.splice(i, 1);
          d.harpoon(HARPOON_POWER);
        }
      d.update(DT, w);
    }
    if (d.state === 'drag' || d.state === 'down') {
      wins++;
      time += t;
    }
    lost += 100 - Math.max(0, hp);
  }
  return { wins, lost: lost / 30, secs: wins ? time / wins : 0 };
}

describe('fighting the Deep One at the surface', () => {
  it('is won by keeping out of its reach and out of the rings, in a long fight', () => {
    const f = surface(REACT);
    expect(f.wins).toBeGreaterThanOrEqual(27);
    expect(f.lost).toBeLessThan(35);
    expect(f.secs).toBeGreaterThan(25);
    expect(f.secs).toBeLessThan(110);
  });

  it('costs one who never minds the rings far more of the boat', () => {
    expect(surface(null).lost).toBeGreaterThan(surface(REACT).lost + 20);
  });
});

const room = ROOMS[TEMPLE6] as (typeof ROOMS)[number];

describe('Cthulhu, below', () => {
  it('wakes when the figure comes into its temple, and sends a tentacle up where the figure is going', () => {
    const c = new Cthulhu(room);
    let woke = 0;
    let ripples = 0;
    c.onWake = () => woke++;
    c.onRipple = () => ripples++;
    // Walking: the ripple is where it is going, so the tentacle comes up beside it and gives chase.
    const f = { x: room.x + 40, y: room.y + 40, vx: 40, vy: 0 };
    const w: World = baseWorld({ figure: f });
    let chased = false;
    for (let i = 0; i < 4 / DT; i++) {
      c.update(DT, w);
      if (c.tents.some((k) => k.state === 'chase')) chased = true;
    }
    expect(woke).toBe(1);
    expect(ripples).toBeGreaterThan(0);
    expect(chased).toBe(true);
    expect(TENT_SPEED).toBeGreaterThan(WALK_SPEED);
  });

  it('bonks a figure that stands still where the floor ripples, and one spear sinks a tentacle', () => {
    const c = new Cthulhu(room);
    let bonks = 0;
    c.onBonk = () => bonks++;
    const f = { x: room.x + 40, y: room.y + 40, vx: 0, vy: 0 };
    const w: World = baseWorld({ figure: f });
    for (let i = 0; i < 5 / DT; i++) c.update(DT, w);
    expect(bonks).toBeGreaterThan(0);
    // A figure off to one side: a tentacle chases, and a spear sinks it.
    const d = new Cthulhu(room);
    const g = { x: room.x + 50, y: room.y + 20, vx: 0, vy: 0 };
    const v: World = baseWorld({ figure: g });
    for (let i = 0; i < 3 / DT; i++) {
      d.update(DT, v);
      g.x = room.x + 50 + Math.sin(i * DT * 3) * 40;
      const k = d.nearestTent(g.x, g.y, 300);
      if (k) {
        d.hitTent(k, 1);
        expect(k.state).toBe('sink');
        return;
      }
    }
    throw new Error('no tentacle to spear');
  });

  it('crumbles when speared down, and leaves the room as it is when the figure leaves', () => {
    const c = new Cthulhu(room);
    let beaten = 0;
    c.onBeaten = () => beaten++;
    const f = { x: room.x + 40, y: room.y + 40, vx: 0, vy: 0 };
    const w: World = baseWorld({ figure: f });
    c.update(DT, w);
    c.hit(3);
    w.figure = null;
    c.update(DT, w);
    expect(c.hp).toBe(CTHULHU_HP);
    w.figure = f;
    c.update(DT, w);
    c.hit(CTHULHU_HP);
    for (let i = 0; i < 3 / DT; i++) c.update(DT, w);
    expect(beaten).toBe(1);
    expect(c.state).toBe('gone');
    c.reset();
    expect(c.state).toBe('gone');
  });

  it('draws itself, its tentacles and their ripples', () => {
    const c = new Cthulhu(room);
    const f = { x: room.x + 40, y: room.y + 40, vx: 30, vy: 0 };
    const w: World = baseWorld({ figure: f });
    const v = fakeView();
    for (let i = 0; i < 6 / DT; i++) {
      c.update(DT, w);
      c.draw(v.v, 'surface');
      for (const k of c.tents) c.drawTent(v.v, k);
      c.drawBody(v.v);
    }
    expect(v.calls.fill ?? 0).toBeGreaterThan(100);
    expect(v.calls.restore).toBe(v.calls.save);
  });
});

/**
 * A person below, with a spear and maybe the warlock: keeps about the middle of the temple, steps off
 * a ripple a reaction time after it shows, backs away from the nearest tentacle, and throws at the
 * nearest thing in reach (a tentacle before it) a third of a second late. Wins out of 30, hearts lost.
 */
function below(level: number, warlock: boolean): { wins: number; hearts: number } {
  const sp = spearAt(level);
  if (!sp) throw new Error('spear');
  const r = rng(level * 17 + (warlock ? 3 : 0));
  let wins = 0;
  let lost = 0;
  for (let run = 0; run < 30; run++) {
    const c = new Cthulhu(room);
    const spears = new Spears();
    const fig = { x: room.x + 30 + r() * 20, y: room.y + 30 + r() * 20, vx: 0, vy: 0 };
    const w: World = baseWorld({ figure: fig });
    let hearts = 3;
    let invuln = 0;
    let ready = 0;
    let cast = CAST_EVERY;
    const seen = new Map<object, number>();
    c.onBonk = () => {
      if (invuln > 0) return;
      hearts--;
      invuln = 1.2;
    };
    for (let t = 0; t < 200 && hearts > 0 && c.state !== 'gone'; t += DT) {
      invuln -= DT;
      // Within reach of it, out of the back corner.
      const keep = Math.min(sp.range - 15, 120);
      const cx = fig.x - c.x;
      const cy = fig.y - c.y;
      const cl = Math.hypot(cx, cy) || 1;
      let vx = ((keep - cl) / 60) * (cx / cl);
      let vy = ((keep - cl) / 60) * (cy / cl);
      for (const k of c.tents) {
        if (!seen.has(k)) seen.set(k, t);
        const dx = fig.x - k.x;
        const dy = fig.y - k.y;
        const d = Math.hypot(dx, dy) || 1;
        if (k.state === 'ripple' && t - (seen.get(k) as number) >= REACT && d < BONK_R + 26) {
          vx += (dx / d) * 2;
          vy += (dy / d) * 2;
        }
        if (k.state === 'chase' && d < 60) {
          vx += dx / d;
          vy += dy / d;
        }
      }
      const n = Math.hypot(vx, vy);
      const before = { x: fig.x, y: fig.y };
      if (n > 0.05) walkStep(fig, (vx / n) * WALK_SPEED * DT, (vy / n) * WALK_SPEED * DT, 0);
      fig.vx = (fig.x - before.x) / DT;
      fig.vy = (fig.y - before.y) / DT;
      if (t >= ready) {
        const k = c.nearestTent(fig.x, fig.y, sp.range);
        const cd = Math.hypot(c.x - fig.x, c.y - fig.y);
        if (k) {
          ready = t + sp.reload + 1 / 3;
          spears.launch(fig.x, fig.y, 20, k, 10, () => c.hitTent(k, sp.power));
        } else if (c.up && cd <= sp.range) {
          ready = t + sp.reload + 1 / 3;
          spears.launch(fig.x, fig.y, 20, c, 60, () => c.hit(sp.power));
        }
      }
      if (warlock) {
        cast -= DT;
        if (cast <= 0) {
          const k = c.nearestTent(fig.x, fig.y, CAST_RANGE);
          if (k) {
            cast = CAST_EVERY;
            c.hitTent(k, 1);
          } else if (c.up && Math.hypot(c.x - fig.x, c.y - fig.y) < CAST_RANGE) {
            cast = CAST_EVERY;
            c.hit(1);
          }
        }
      }
      c.update(DT, w);
      spears.update(DT, w);
    }
    if (c.state === 'gone' || c.state === 'fall') wins++;
    lost += 3 - Math.max(0, hearts);
  }
  return { wins, hearts: lost / 30 };
}

describe('fighting Cthulhu', () => {
  it('is won by spearing the tentacles as they come and stepping off the ripples', () => {
    // By island 6 the harpoon is on the bow, and ashore it throws as the best spear.
    const f = below(4, true);
    expect(f.wins).toBeGreaterThanOrEqual(27);
    expect(f.hearts).toBeLessThan(1.6);
  });

  it('can be done alone with the barbed spear, and the ripple gives time to step off', () => {
    expect(below(3, false).wins).toBeGreaterThanOrEqual(20);
    expect(RIPPLE).toBeGreaterThan(REACT + BONK_R / WALK_SPEED);
  });
});
