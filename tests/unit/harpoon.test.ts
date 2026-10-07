import { describe, expect, it } from 'vitest';
import { rng } from '../../src/core/math';
import {
  AWAY,
  BEASTS,
  DRIVE_AGAIN,
  DRIVE_PRIZE,
  drivePrize,
  HARPOON_LEVEL,
  HARPOON_RANGE,
  HARPOON_RELOAD,
  noDriven,
  parseDriven,
  RESOLVE,
  TROPHY,
} from '../../src/data/harpoon';
import { SPEAR_MAX, SPEARS, spearAt } from '../../src/data/spear';
import { SPEED, TIER_NAME } from '../../src/data/tuning';
import { Anglerfish } from '../../src/entities/anglerfish';
import { steerBoat } from '../../src/entities/boat';
import {
  AWAKE_MAX,
  Cthuluviathan,
  LAIR,
  type Tentacle,
  TOO_CLOSE,
  tentaclePhase,
} from '../../src/entities/cthuluviathan';
import { Gulper, HUNT_MAX, ZONE } from '../../src/entities/gulper';
import { BODY_HALF, bodyDistance, GUARD_COOL, Leviathan } from '../../src/entities/leviathan';
import { SPEAR_SPEED, Spears } from '../../src/entities/spears';
import { DEEP, IY, WS } from '../../src/world/island';
import { fakeView } from './helpers/view';
import { baseWorld } from './helpers/world';

const TOP = SPEED[SPEED.length - 1] as number;
const DT = 1 / 60;
/** The stick's screen vector that points the boat along a world direction. */
const stickFor = (wx: number, wy: number): [number, number] => {
  const ix = wx - wy;
  const iy = (wx + wy) / 2;
  const m = Math.hypot(ix, iy) || 1;
  return [ix / m, iy / m];
};

describe('the harpoon', () => {
  it('is the last spear the shipwright sells, dearest of all, and better ashore than the barbed one', () => {
    expect(HARPOON_LEVEL).toBe(SPEAR_MAX);
    const h = spearAt(HARPOON_LEVEL);
    const barbed = SPEARS[SPEARS.length - 2];
    expect(h?.name).toBe('Harpoon');
    expect(h?.cost).toBeGreaterThan(barbed?.cost ?? Infinity);
    expect(h?.power).toBeGreaterThanOrEqual(barbed?.power ?? Infinity);
    // From the bow it reaches far further than any spear thrown on foot.
    expect(HARPOON_RANGE).toBeGreaterThan((h?.range ?? 0) * 2);
  });

  it('takes a few hits to drive each leviathan off, and each leaves a trophy', () => {
    for (const k of BEASTS) {
      expect(RESOLVE[k]).toBeGreaterThanOrEqual(3);
      expect(RESOLVE[k]).toBeLessThanOrEqual(5);
      expect(TROPHY[k].name.length).toBeGreaterThan(0);
      expect(TROPHY[k].told).toMatch(/drove .* off/);
    }
    expect(drivePrize(0)).toBe(DRIVE_PRIZE);
    expect(drivePrize(3)).toBe(DRIVE_AGAIN);
    expect(DRIVE_AGAIN).toBeLessThan(DRIVE_PRIZE);
    expect(parseDriven(undefined)).toEqual(noDriven());
  });
});

describe('the gulper and the harpoon', () => {
  const hunting = () => {
    const g = new Gulper();
    const w = baseWorld({ hullScale: 1.6, boat: { x: g.x + 300, y: g.y, h: 0, v: 0 } });
    for (let i = 0; i < 120 && g.state !== 'hunt'; i++) g.update(DT, w);
    for (let i = 0; i < 60; i++) g.update(DT, w);
    return { g, w };
  };

  it('can be struck only while it is up and hunting, in the head', () => {
    const g = new Gulper();
    expect(g.mark()).toBeNull();
    expect(g.harpoon(1)).toBe(false);
    expect(g.resolve).toBe(RESOLVE.gulper);
    const h = hunting();
    expect(h.g.state).toBe('hunt');
    expect(h.g.mark()).toBe(h.g.body[0]);
  });

  it('flinches at each hit, is driven off at the last, and stays away a good while', () => {
    const { g, w } = hunting();
    for (let i = 1; i < RESOLVE.gulper; i++) {
      const v = g.v;
      expect(g.harpoon(1)).toBe(false);
      expect(g.v).toBeCloseTo(v * 0.35, 6);
      expect(g.state).toBe('hunt');
    }
    expect(g.harpoon(1)).toBe(true);
    expect(g.state).toBe('rest');
    expect(g.mark()).toBeNull();
    // The boat sits in its water, past the buoys, and it stays down.
    let hunts = 0;
    g.onHunt = () => hunts++;
    for (let t = 0; t < AWAY - 2; t += DT) {
      w.boat.x = g.x + 300;
      w.boat.y = g.y;
      g.update(DT, w);
    }
    expect(hunts).toBe(0);
    for (let t = 0; t < 30 && hunts === 0; t += DT) {
      w.boat.x = g.x + 300;
      w.boat.y = g.y;
      g.update(DT, w);
    }
    expect(hunts).toBe(1);
    // A new hunt, a fresh resolve.
    expect(g.resolve).toBe(RESOLVE.gulper);
  });

  /** A hunt as in the gulper's own tests, played by a person who fires the moment it is in reach and ready. */
  function fight(seed: number, plan: 'still' | 'circle') {
    const r = rng(seed);
    const g = new Gulper();
    g.x = ZONE.x0 + r() * (ZONE.x1 - ZONE.x0);
    g.y = ZONE.y0 + r() * (ZONE.y1 - ZONE.y0);
    for (const b of g.body) {
      b.x = g.x;
      b.y = g.y;
    }
    const a = r() * Math.PI * 2;
    const d0 = 500 + r() * 380;
    const w = baseWorld({
      hullScale: 1.6,
      boat: {
        x: Math.min(WS + 1150, Math.max(WS + 20, g.x + Math.cos(a) * d0)),
        y: g.y + Math.sin(a) * d0,
        h: r() * Math.PI * 2,
        v: 250,
      },
    });
    let bites = 0;
    let hunted = -1;
    let t = 0;
    let ready = 0;
    let driven = false;
    const flying: number[] = [];
    g.onBite = () => bites++;
    g.onHunt = () => {
      hunted = t;
    };
    for (; t < HUNT_MAX + 3 && bites < 3 && !driven; t += DT) {
      g.update(DT, w);
      for (let i = flying.length - 1; i >= 0; i--) {
        if ((flying[i] as number) > t) continue;
        flying.splice(i, 1);
        if (g.harpoon(1)) driven = true;
      }
      const on = hunted >= 0 && t - hunted > 1 / 3;
      let ix = 0;
      let iy = 0;
      if (on && plan === 'circle') {
        // Keep it on the beam: square across the line to it.
        const s = Math.atan2(w.boat.y - g.y, w.boat.x - g.x) + Math.PI / 2;
        [ix, iy] = stickFor(Math.cos(s), Math.sin(s));
      }
      steerBoat(w.boat, ix, iy, TOP, DT);
      w.boat.x = Math.min(WS + 1160, w.boat.x);
      const m = g.mark();
      if (on && m && t >= ready) {
        const d = Math.hypot(m.x - w.boat.x, m.y - w.boat.y);
        if (d < HARPOON_RANGE) {
          ready = t + HARPOON_RELOAD;
          flying.push(t + d / SPEAR_SPEED);
        }
      }
    }
    return { hunted: hunted >= 0, bites, driven };
  }

  it('is driven off by a person who keeps it on the beam and fires, and seldom bites; standing still to fire is riskier', () => {
    const tally = (plan: 'still' | 'circle') => {
      let hunts = 0;
      let driven = 0;
      let eaten = 0;
      for (let s = 1; s <= 40; s++) {
        const f = fight(s, plan);
        if (!f.hunted) continue;
        hunts++;
        if (f.driven) driven++;
        if (f.bites >= 3) eaten++;
      }
      return { hunts, driven, eaten };
    };
    const circle = tally('circle');
    expect(circle.hunts).toBeGreaterThanOrEqual(30);
    expect(circle.driven).toBeGreaterThanOrEqual(circle.hunts * 0.55);
    expect(circle.eaten).toBe(0);
    const still = tally('still');
    expect(still.driven).toBeGreaterThanOrEqual(still.hunts * 0.6);
    expect(still.eaten).toBeGreaterThanOrEqual(1);
    expect(still.eaten).toBeLessThanOrEqual(still.hunts * 0.2);
  });
});

describe('the Cthuluviathan and the harpoon', () => {
  const awake = () => {
    const c = new Cthuluviathan();
    const w = baseWorld({
      tier: 5,
      hullScale: 1.6,
      boat: { x: LAIR.x + 600, y: LAIR.y, h: Math.PI, v: TOP },
    });
    c.state = 'awake';
    for (let i = 0; i < 60 * 3 && !c.mark(w.boat); i++) c.update(DT, w);
    return { c, w };
  };

  it('is struck in a standing tentacle, which goes straight back down and cannot grab', () => {
    const asleep = new Cthuluviathan();
    expect(asleep.mark({ x: LAIR.x, y: LAIR.y })).toBeNull();
    expect(asleep.harpoon(1, null)).toBe(false);
    const { c, w } = awake();
    const t = c.mark(w.boat) as Tentacle;
    expect(t).not.toBeNull();
    expect(tentaclePhase(t.t)).toBe('up');
    expect(c.harpoon(1, t)).toBe(false);
    expect(c.resolve).toBe(RESOLVE.cthulu - 1);
    expect(tentaclePhase(t.t)).toBe('sink');
    expect(t.hit).toBe(true);
    expect(c.mark(w.boat)).not.toBe(t);
  });

  it('is driven off at the last hit: everything sinks, and it will not wake again for a good while', () => {
    const { c, w } = awake();
    for (let i = 1; i < RESOLVE.cthulu; i++) expect(c.harpoon(1, null)).toBe(false);
    let slept = 0;
    c.onSleep = () => slept++;
    expect(c.harpoon(1, c.mark(w.boat))).toBe(true);
    expect(c.state).toBe('asleep');
    expect(slept).toBe(0);
    expect(c.tentacles.every((t) => t.hit && tentaclePhase(t.t) !== 'up')).toBe(true);
    // Right on top of it, fast: still asleep.
    w.boat.x = LAIR.x + TOO_CLOSE / 2;
    for (let t = 0; t < AWAY - 2; t += 1 / 30) c.update(1 / 30, w);
    expect(c.state).toBe('asleep');
    for (let t = 0; t < 4; t += 1 / 30) c.update(1 / 30, w);
    expect(c.state).toBe('awake');
    expect(c.resolve).toBe(RESOLVE.cthulu);
  });

  it('is driven off by a person who circles its city dodging the bubbles and fires at the tentacles', () => {
    const own = rng(9);
    let driven = 0;
    let grabs = 0;
    for (let n = 0; n < 40; n++) {
      const a0 = own() * Math.PI * 2;
      const w = baseWorld({
        tier: 5,
        hullScale: 1.6,
        boat: {
          x: LAIR.x + Math.cos(a0) * 1300,
          y: LAIR.y + Math.sin(a0) * 1300,
          h: a0 + Math.PI,
          v: TOP,
        },
      });
      const c = new Cthuluviathan();
      c.onGrab = () => grabs++;
      const late = 1 / 3 + (own() * 2 - 1) * 0.1;
      let woke = -1;
      let t = 0;
      let ready = 0;
      let gone = false;
      const flying: [number, Tentacle][] = [];
      const seen = new Map<Tentacle, number>();
      let swerve: { until: number; dir: [number, number] } | null = null;
      for (let i = 0; i < 60 * (AWAKE_MAX + 8) && !gone; i++) {
        t += DT;
        if (woke < 0 && c.state === 'awake') woke = t;
        for (const x of c.tentacles) if (!seen.has(x)) seen.set(x, t);
        const b = w.boat;
        const fx = b.x - LAIR.x;
        const fy = b.y - LAIR.y;
        const fl = Math.hypot(fx, fy) || 1;
        // Charge in until it wakes, then circle the city about 750 out, inside its reach.
        let dir: [number, number] = [-fx / fl, -fy / fl];
        if (woke >= 0 && t >= woke + late) {
          const k = (fl - 750) / 200;
          dir = [-fy / fl - (fx / fl) * k, fx / fl - (fy / fl) * k];
          for (const [x, seenAt] of seen) {
            if (t < seenAt + late || seenAt + late <= t - DT) continue;
            let px = -(x.y - b.y);
            let py = x.x - b.x;
            const pl = Math.hypot(px, py) || 1;
            px /= pl;
            py /= pl;
            if (px * fx + py * fy < 0) {
              px = -px;
              py = -py;
            }
            swerve = { until: t + 0.8, dir: [px, py] };
          }
          if (swerve && t < swerve.until) dir = swerve.dir;
          const m = c.mark(b);
          if (m && t >= ready) {
            const d = Math.hypot(m.x - b.x, m.y - b.y);
            if (d < HARPOON_RANGE) {
              ready = t + HARPOON_RELOAD;
              flying.push([t + d / SPEAR_SPEED, m]);
            }
          }
        }
        for (let j = flying.length - 1; j >= 0; j--) {
          const f = flying[j] as [number, Tentacle];
          if (f[0] > t) continue;
          flying.splice(j, 1);
          if (c.harpoon(1, f[1])) {
            gone = true;
            driven++;
          }
        }
        const st = stickFor(dir[0], dir[1]);
        steerBoat(w.boat, st[0], st[1], TOP, DT);
        c.update(DT, w);
      }
    }
    expect(driven).toBeGreaterThanOrEqual(36);
    // It still gets a tentacle on the boat now and then: a fight, not a formality.
    expect(grabs).toBeGreaterThan(0);
    expect(grabs).toBeLessThanOrEqual(12);
  });
});

describe('the anglerfish and the harpoon', () => {
  const lurking = () => {
    const a = new Anglerfish();
    a.state = 'lurking';
    a.glow = 1;
    a.x = WS / 2;
    a.y = WS + DEEP / 2;
    a.tx = a.x;
    a.ty = a.y;
    return a;
  };
  const night = (a: Anglerfish, v = 0) =>
    baseWorld({
      tier: 5,
      hullScale: 1.6,
      dark: 1,
      boat: { x: a.x, y: a.y + 300, h: -Math.PI / 2, v },
    });

  it('is struck in its light while it shows, and not once it has gone', () => {
    const a = new Anglerfish();
    expect(a.mark()).toBeNull();
    expect(a.harpoon(1)).toBe(false);
    const l = lurking();
    expect(l.mark()).toBe(l);
    expect(l.harpoon(1)).toBe(false);
    expect(l.resolve).toBe(RESOLVE.angler - 1);
    expect(l.state).toBe('lurking');
  });

  it('shuts open jaws on nothing when struck, as if the boat had turned away', () => {
    const a = lurking();
    a.state = 'opening';
    let missed = 0;
    let bit = 0;
    a.onMiss = () => missed++;
    a.onBite = () => bit++;
    expect(a.harpoon(1)).toBe(false);
    expect(a.state).toBe('diving');
    expect(missed).toBe(1);
    // The boat sails straight over where the jaws were.
    const w = night(a, TOP);
    w.boat.x = a.x;
    w.boat.y = a.y;
    for (let t = 0; t < 2; t += 1 / 30) a.update(1 / 30, w);
    expect(bit).toBe(0);
  });

  it('is driven off at the last hit, and its light stays out a good while, even at night', () => {
    const a = lurking();
    const w = night(a);
    for (let i = 1; i < RESOLVE.angler; i++) expect(a.harpoon(1)).toBe(false);
    let missed = 0;
    a.onMiss = () => missed++;
    expect(a.harpoon(1)).toBe(true);
    expect(missed).toBe(0);
    expect(a.state).toBe('diving');
    for (let t = 0; t < AWAY - 2; t += 1 / 30) a.update(1 / 30, w);
    expect(a.state).toBe('gone');
    for (let t = 0; t < 4; t += 1 / 30) a.update(1 / 30, w);
    expect(a.state).toBe('lurking');
    expect(a.resolve).toBe(RESOLVE.angler);
  });
});

describe('the leviathan at the buoys and the harpoon', () => {
  const FLAGSHIP = TIER_NAME.length - 1;
  /** A flagship crossing the buoys at full speed, and the leviathan up across its way. */
  const risen = () => {
    const e = new Leviathan(rng(1));
    const w = baseWorld({
      tier: FLAGSHIP,
      hullScale: 1.6,
      boat: { x: WS - 200, y: IY, h: 0, v: TOP },
    });
    for (let i = 0; i < 30 * 3 && !e.lev.rise; i++) {
      w.boat.x += TOP / 30;
      e.update(1 / 30, w);
    }
    w.boat.v = 0;
    for (let i = 0; i < 30; i++) e.update(1 / 30, w);
    return { e, w };
  };

  it('is struck at the nearest of its risen body, and only while it stands', () => {
    const e = new Leviathan(rng(1));
    expect(e.mark({ x: 0, y: 0 })).toBeNull();
    expect(e.harpoon(1)).toBe(false);
    const { e: up, w } = risen();
    const r = up.lev.rise;
    if (!r) throw new Error('it should have risen');
    const m = up.mark(w.boat);
    if (!m) throw new Error('it should be standing');
    expect(bodyDistance(r, m.x, m.y)).toBeCloseTo(0, 6);
    expect(Math.abs((m.x - r.x) * r.ux + (m.y - r.y) * r.uy)).toBeLessThanOrEqual(BODY_HALF);
    expect(Math.hypot(m.x - w.boat.x, m.y - w.boat.y)).toBeCloseTo(
      bodyDistance(r, w.boat.x, w.boat.y),
      6,
    );
  });

  it('is driven off at the last hit: it sinks at once, says nothing of the crossing, and leaves the buoys alone a good while', () => {
    const { e, w } = risen();
    let missed = 0;
    let rises = 0;
    e.onMiss = () => missed++;
    e.onRise = () => rises++;
    for (let i = 1; i < RESOLVE.guard; i++) expect(e.harpoon(1)).toBe(false);
    expect(e.harpoon(1)).toBe(true);
    expect(e.mark(w.boat)).toBeNull();
    expect(e.harpoon(1)).toBe(false);
    for (let i = 0; i < 30 * 2; i++) e.update(1 / 30, w);
    expect(e.lev.rise).toBeNull();
    expect(missed).toBe(0);
    expect(e.lev.cool).toBeGreaterThan(GUARD_COOL);
    // Back and forth across the buoys: nothing, until it is ready again.
    w.boat.v = TOP;
    const cross = (seconds: number) => {
      for (let i = 0; i < seconds * 30; i++) {
        w.boat.x = WS + (Math.floor(i / 30) % 2 ? 60 : -60);
        e.update(1 / 30, w);
        if (e.lev.rise) break;
      }
    };
    cross(AWAY - 6);
    expect(rises).toBe(0);
    cross(12);
    expect(rises).toBe(1);
    expect(e.resolve).toBe(RESOLVE.guard);
  });
});

describe('a harpoon in flight', () => {
  it('lands like a spear, and draws its line back to the boat while it flies', () => {
    const s = new Spears();
    const bow = { x: 0, y: 0 };
    const target = { x: 200, y: 0 };
    let hit = 0;
    s.launch(bow.x, bow.y, 14, target, 6, () => hit++, bow);
    const w = baseWorld();
    s.update(0.1, w);
    const v = fakeView();
    s.draw(v.v, 'air');
    expect(v.calls.quadraticCurveTo).toBe(1);
    const plain = new Spears();
    plain.launch(0, 0, 14, target, 6, () => {});
    plain.update(0.1, w);
    const pv = fakeView();
    plain.draw(pv.v, 'air');
    expect(pv.calls.quadraticCurveTo ?? 0).toBe(0);
    for (let i = 0; i < 30; i++) s.update(1 / 30, w);
    expect(hit).toBe(1);
  });
});
