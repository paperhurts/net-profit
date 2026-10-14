import { describe, expect, it } from 'vitest';
import {
  BISON_SHY,
  BUNNY_RANGE,
  BUNNY_SHY,
  DOG_CLEAR,
  DOG_DUCK,
  DOG_HIDE,
  onPrairie,
  PLAY_R,
  Prairie10,
} from '../../src/entities/prairie10';
import { ISLE10 } from '../../src/world/isle10';
import { baseWorld } from './helpers/world';

const DT = 1 / 30;
const at = (x: number, y: number) => baseWorld({ figure: { x, y, vx: 0, vy: 0 } });
/** Somewhere on island 10 out of everyone's way: the forest. */
const FAR_OFF = at(ISLE10.x - 60, ISLE10.y - 300);

describe("island 10's prairie animals", () => {
  it('bunnies in pairs, three prairie dog towns, butterflies and a herd with a calf, all on the prairie', () => {
    const p = new Prairie10();
    expect(p.bunnies).toHaveLength(8);
    expect(p.dogs).toHaveLength(9);
    expect(new Set(p.dogs.map((d) => d.town)).size).toBe(3);
    expect(p.flies.length).toBeGreaterThanOrEqual(8);
    expect(p.bison.filter((b) => b.calf)).toHaveLength(1);
    expect(p.bison.length).toBeGreaterThanOrEqual(4);
    for (const b of p.bunnies) expect(onPrairie(b.x, b.y)).toBe(true);
    for (const d of p.dogs) expect(onPrairie(d.x, d.y)).toBe(true);
    for (const b of p.bison) expect(onPrairie(b.x, b.y)).toBe(true);
    // All three coats of bunny.
    expect(new Set(p.bunnies.map((b) => b.kind)).size).toBe(3);
  });

  it('a bunny bounds away from the figure, and keeps to the prairie', () => {
    const p = new Prairie10();
    const b = p.bunnies[0];
    if (!b) throw new Error('no bunny');
    const fx = b.x + 12;
    const fy = b.y + 12;
    for (let t = 0; t < 1.2; t += DT) p.update(DT, at(fx, fy));
    expect(Math.hypot(b.x - fx, b.y - fy)).toBeGreaterThan(BUNNY_SHY * 0.9);
    expect(onPrairie(b.x, b.y)).toBe(true);
  });

  it('left alone, they potter about near home, and a pair frolics round a little ring now and then', () => {
    const p = new Prairie10();
    let played = 0;
    let ringOk = true;
    for (let t = 0; t < 90; t += DT) {
      p.update(DT, FAR_OFF);
      const r = p.play;
      if (r) {
        played++;
        for (const b of [p.bunnies[r.i], p.bunnies[r.i + 1]])
          if (b && Math.hypot(b.x - r.x, b.y - r.y) > Math.max(PLAY_R, r.r0) + 0.5) ringOk = false;
      }
      for (const b of p.bunnies)
        if (!onPrairie(b.x, b.y)) throw new Error('a bunny left the prairie');
    }
    expect(played).toBeGreaterThan(0);
    expect(ringOk).toBe(true);
    for (const b of p.bunnies)
      expect(Math.hypot(b.x - b.home[0], b.y - b.home[1])).toBeLessThan(BUNNY_RANGE * 2.3);
  });

  it('prairie dogs squeak and duck as the figure comes near their town, and pop back up once it has gone', () => {
    const p = new Prairie10();
    let squeaks = 0;
    p.onDuck = () => squeaks++;
    const d = p.dogs[0];
    if (!d) throw new Error('no dog');
    const town = p.dogs.filter((o) => o.town === d.town);
    p.update(DT, at(d.x + DOG_DUCK + 40, d.y));
    expect(d.up).toBe(1);
    for (let t = 0; t < 0.4; t += DT) p.update(DT, at(d.x + DOG_DUCK - 20, d.y));
    for (const o of town) expect(o.up).toBe(0);
    expect(squeaks).toBe(1);
    // Still down while the figure is about, and a moment after it has gone.
    for (let t = 0; t < 1; t += DT) p.update(DT, at(d.x + DOG_CLEAR + 60, d.y));
    expect(d.up).toBe(0);
    for (let t = 0; t < DOG_HIDE + 1.5; t += DT) p.update(DT, at(d.x + DOG_CLEAR + 60, d.y));
    expect(d.up).toBe(1);
    // One of each town stands tall on watch.
    expect(town.filter((o) => o.tall > 0.5)).toHaveLength(1);
  });

  it('the herd grazes and drifts on over the grass, with the calf never far from its mother', () => {
    const p = new Prairie10();
    const start = { x: p.herd.x, y: p.herd.y };
    let grazed = false;
    let calfFar = 0;
    for (let t = 0; t < 120; t += DT) {
      p.update(DT, FAR_OFF);
      if (p.bison.some((b) => b.graze > 0.9)) grazed = true;
      const mom = p.bison.find((b) => !b.calf);
      const calf = p.bison.find((b) => b.calf);
      if (mom && calf) calfFar = Math.max(calfFar, Math.hypot(mom.x - calf.x, mom.y - calf.y));
      for (const b of p.bison)
        if (!onPrairie(b.x, b.y)) throw new Error('a bison left the prairie');
    }
    expect(grazed).toBe(true);
    expect(Math.hypot(p.herd.x - start.x, p.herd.y - start.y)).toBeGreaterThan(20);
    expect(calfFar).toBeLessThan(80);
  });

  it('a bison walked right up to ambles off out of the way', () => {
    const p = new Prairie10();
    const b = p.bison[1];
    if (!b) throw new Error('no bison');
    const fx = b.x + 20;
    const fy = b.y;
    const was = Math.hypot(b.x - fx, b.y - fy);
    for (let t = 0; t < 1.5; t += DT) p.update(DT, at(fx, fy));
    expect(Math.hypot(b.x - fx, b.y - fy)).toBeGreaterThan(was + 10);
    expect(BISON_SHY).toBeGreaterThan(was);
  });

  it('a bison with the figure stood by stands off and keeps still, not shuffling to and fro and turning', () => {
    // The owner's report: the bison flickered, and the companions beside them, when the figure stood near to pet one.
    const p = new Prairie10();
    p.herd.grazeT = 99;
    const b = p.bison[0];
    if (!b) throw new Error('no bison');
    const fx = b.x + 40;
    const fy = b.y + 15;
    for (let t = 0; t < 4; t += DT) p.update(DT, at(fx, fy));
    const flips = p.bison.map(() => 0);
    const moved = p.bison.map(() => 0);
    let last = p.bison.map((q) => ({ x: q.x, y: q.y, face: q.face }));
    for (let t = 0; t < 2; t += DT) {
      p.update(DT, at(fx, fy));
      p.bison.forEach((q, i) => {
        const was = last[i];
        if (!was || q.calf) return;
        if (q.face !== was.face) flips[i] = (flips[i] ?? 0) + 1;
        moved[i] = (moved[i] ?? 0) + Math.hypot(q.x - was.x, q.y - was.y);
      });
      last = p.bison.map((q) => ({ x: q.x, y: q.y, face: q.face }));
    }
    expect(flips.every((n) => n === 0)).toBe(true);
    expect(Math.max(...moved)).toBeLessThan(1);
    expect(Math.hypot(b.x - fx, b.y - fy)).toBeGreaterThan(BISON_SHY - 4);
  });

  it('a tap: a bunny hops on the spot, a dog ducks; only the dogs that are up can be tapped', () => {
    const p = new Prairie10();
    const b = p.bunnies[2];
    if (!b) throw new Error('no bunny');
    p.poke('bunny', 2);
    expect(b.hop).toBeGreaterThan(0);
    p.poke('dog', 0);
    expect(p.dogs[0]?.hide).toBeGreaterThan(0);
    for (let t = 0; t < 0.5; t += DT) p.update(DT, FAR_OFF);
    expect(p.targets().some((t) => t.k === 'dog' && t.i === 0)).toBe(false);
    expect(p.targets().filter((t) => t.k === 'bison')).toHaveLength(p.bison.length);
  });

  it('nobody moves while the figure is away from the island, and visiting again they are back home', () => {
    const p = new Prairie10();
    const b = p.bunnies[0];
    if (!b) throw new Error('no bunny');
    for (let t = 0; t < 3; t += DT) p.update(DT, at(b.x + 10, b.y + 10));
    const moved = { x: b.x, y: b.y };
    for (let t = 0; t < 3; t += DT) p.update(DT, baseWorld({ figure: null }));
    expect({ x: b.x, y: b.y }).toEqual(moved);
    p.home();
    expect([b.x, b.y]).toEqual(b.home);
  });
});
