import { describe, expect, it } from 'vitest';
import { ROOM1 } from '../../src/data/goatcave';
import { type CaveEvent, FAINT_T, GoatCave, LIE_H, STAND_H } from '../../src/entities/goatcave';

const DT = 1 / 60;
/** A cave with its goats out of the way unless placed, and the events it gave. */
function cave() {
  const c = new GoatCave(ROOM1, () => 0.5);
  const seen: CaveEvent[] = [];
  c.onEvent = (e) => seen.push(e);
  for (const g of c.goats) {
    g.state = 'pause';
    g.t = 1e9;
  }
  return { c, seen };
}
const run = (c: GoatCave, secs: number, sx = 0) => {
  for (let t = 0; t < secs; t += DT) c.step(DT, sx);
};
/** Walk the figure to x, on whatever it stands on. */
const walkTo = (c: GoatCave, x: number) => {
  for (let i = 0; i < 600 && Math.abs(c.x - x) > 1; i++) c.step(DT, Math.sign(x - c.x));
};
/** A jump, holding a way, until the figure is on its feet again. */
const hop = (c: GoatCave, sx: number, holdFor = 9) => {
  c.press();
  c.step(DT, sx);
  // Holding the way only so long, as a player lets go to land on something.
  for (let i = 0; i < 180 && !c.ground; i++) c.step(DT, i < holdFor * 60 ? sx : 0);
};
const park = (c: GoatCave, keep: number[]) =>
  c.goats.forEach((g, i) => {
    if (!keep.includes(i)) {
      g.x = -1000;
      g.y = -1000;
      g.sx = g.sy = -1000;
    }
  });

describe('the goat cave', () => {
  it('starts at the door, standing on the floor', () => {
    const { c } = cave();
    run(c, 0.5);
    expect(c.y).toBe(0);
    expect(c.ground).toBe(true);
  });

  it("can't jump up onto the high ledge from the floor", () => {
    const { c } = cave();
    park(c, []);
    walkTo(c, 168);
    for (let k = 0; k < 6; k++) {
      c.press();
      run(c, 0.9, 1);
    }
    expect(c.y).toBe(0);
    expect(c.x).toBeLessThan(175);
  });

  it('bumping a goat makes it faint stiff as a plank, and it gets up again later', () => {
    const { c, seen } = cave();
    park(c, [0]);
    const g = c.goats[0];
    if (!g) throw new Error('no goat');
    walkTo(c, g.x - 20);
    run(c, 1, 1);
    expect(seen).toContain('faint');
    expect(g.state).toBe('faint');
    run(c, FAINT_T + 1);
    expect(g.state).not.toBe('faint');
    expect(seen).toContain('rise');
  });

  it('a fainted goat shoved to the foot of the ledge is a step up onto it', () => {
    const { c, seen } = cave();
    park(c, [0]);
    const g = c.goats[0];
    if (!g) throw new Error('no goat');
    walkTo(c, g.x - 20);
    run(c, 0.8, 1);
    expect(g.state).toBe('faint');
    // Push it on along the floor until it is up against the ledge's face.
    run(c, 3, 1);
    expect(seen).toContain('push');
    expect(g.x).toBeGreaterThan(160);
    // Up onto it, and from it up onto the ledge.
    hop(c, 1);
    expect(c.y).toBeCloseTo(LIE_H, 5);
    hop(c, 1);
    expect(c.y).toBe(30);
    expect(c.x).toBeGreaterThan(175);
  });

  it('falling in the fondue is a splosh; the pit is too wide to jump, even from the very edge', () => {
    const { c, seen } = cave();
    park(c, []);
    c.x = 248;
    c.y = 30;
    run(c, 0.05);
    c.press();
    for (let i = 0; i < 120 && !seen.includes('splosh'); i++) c.step(DT, 1);
    expect(seen).toContain('splosh');
    expect(c.sploshes).toBe(1);
  });

  it('a splosh before the high ledge is back to the door; once up on it, back up there', () => {
    const { c } = cave();
    park(c, []);
    // Dropped straight in, never having stood on the ledge.
    c.x = 260;
    c.y = 0;
    run(c, 0.5);
    expect(c.x).toBe(ROOM1.door.x);
    expect(c.reached).toBe(false);
    // Up on the ledge, then off its edge into the fondue.
    c.x = 200;
    c.y = 30;
    run(c, 0.1);
    expect(c.reached).toBe(true);
    for (let i = 0; i < 240 && c.x !== ROOM1.checkpoint.x; i++) c.step(DT, 1);
    expect(c.x).toBe(ROOM1.checkpoint.x);
    expect(c.y).toBe(ROOM1.checkpoint.y);
  });

  it('back up on the ledge on top of a goat standing at the checkpoint, not inside it', () => {
    const { c } = cave();
    park(c, [2]);
    const g = c.goats[2];
    if (!g) throw new Error('no goat');
    g.x = ROOM1.checkpoint.x;
    c.x = 225;
    c.y = 30;
    run(c, 0.1);
    for (let i = 0; i < 240 && c.sploshes === 0; i++) c.step(DT, 1);
    run(c, 0.2);
    expect(c.y).toBeGreaterThanOrEqual(30 + 7);
  });

  it('a fainted goat pushed out over the edge bridges the pit, and across it is the pygmy goat', () => {
    const { c, seen } = cave();
    park(c, [2]);
    const g = c.goats[2];
    if (!g) throw new Error('no goat');
    // Up on the high ledge, behind the goat.
    c.x = 182;
    c.y = 30;
    g.x = 205;
    run(c, 1.2, 1);
    expect(g.state).toBe('faint');
    // Shove it out over the pit as far as it will go and still rest on the edge.
    run(c, 3, 1);
    expect(g.x).toBeGreaterThan(245);
    expect(g.y).toBe(30);
    // Onto it, out to its far end, and jump.
    hop(c, 1, 0.2);
    expect(c.y).toBeCloseTo(30 + LIE_H, 5);
    walkTo(c, g.x + 8);
    hop(c, 1);
    expect(seen).not.toContain('splosh');
    expect(c.y).toBe(30);
    expect(c.x).toBeGreaterThan(ROOM1.pit?.x1 ?? 0);
    run(c, 1, 1);
    expect(seen).toContain('found');
    expect(c.found).toBe(true);
  });

  it('the jump off the bridging goat lands from anywhere on its far half, holding right all the way', () => {
    for (const along of [0, 4, 8]) {
      const { c, seen } = cave();
      park(c, [2]);
      const g = c.goats[2];
      if (!g) throw new Error('no goat');
      c.x = 182;
      c.y = 30;
      g.x = 205;
      run(c, 1.2, 1);
      run(c, 3, 1);
      hop(c, 1, 0.2);
      walkTo(c, g.x + along);
      hop(c, 1);
      // On its feet on the far ledge (just its toes on, from the nearest of these), not in the fondue.
      expect(seen).not.toContain('splosh');
      expect(c.y).toBe(30);
      expect(c.x).toBeGreaterThan((ROOM1.pit?.x1 ?? 0) - 4);
    }
  });

  it('a goat going over startles the goat standing right where it falls', () => {
    const { c } = cave();
    park(c, [0, 1]);
    const [a, b] = c.goats;
    if (!a || !b) throw new Error('no goats');
    a.x = 100;
    b.x = 120;
    c.x = 80;
    run(c, 0.1);
    c.startle(a, 80);
    run(c, 1.5);
    expect(a.state).toBe('faint');
    expect(b.state).toBe('faint');
  });

  describe('picking goats up, throwing them and stacking them', () => {
    /** The figure on the floor at x facing right, with goat i just in front of it, the rest out of the way. */
    const setUp = (i = 0, x = 60) => {
      const { c, seen } = cave();
      park(c, [i]);
      const g = c.goats[i];
      if (!g) throw new Error('no goat');
      g.x = x + 14;
      g.y = 0;
      c.x = x;
      c.face = 1;
      run(c, 0.05);
      return { c, seen, g };
    };

    it('grabbing a standing goat in front: it faints stiff in the arms, held over the head', () => {
      const { c, seen, g } = setUp();
      c.grab();
      run(c, 0.05);
      expect(c.held).toBe(g);
      expect(g.state).toBe('faint');
      expect(seen).toContain('grab');
      expect(g.y).toBeCloseTo(c.y + 16.5, 5);
      // Carried along as the figure walks, and stiff all the while, however long.
      run(c, 1, 1);
      expect(g.x).toBeCloseTo(c.x, 5);
      run(c, FAINT_T + 5);
      expect(c.held).toBe(g);
      expect(g.state).toBe('faint');
    });

    it('nothing in reach, nothing grabbed', () => {
      const { c, seen } = setUp();
      c.face = -1;
      c.grab();
      run(c, 0.05);
      expect(c.held).toBe(null);
      expect(seen).not.toContain('grab');
    });

    it('thrown while walking, it flies in an arc and lands lying stiff, well ahead', () => {
      const { c, seen, g } = setUp();
      c.grab();
      run(c, 0.05);
      const from = c.x;
      c.grab();
      run(c, 0.05, 1);
      expect(c.held).toBe(null);
      expect(seen).toContain('throw');
      run(c, 1.2);
      expect(g.y).toBe(0);
      expect(g.vx).toBe(0);
      expect(g.state).toBe('faint');
      expect(g.k).toBe(1);
      expect(g.x).toBeGreaterThan(from + 30);
      // The full stiff time again from when it was thrown.
      run(c, FAINT_T - 2);
      expect(g.state).toBe('faint');
    });

    it('a thrown goat that flies into a standing goat startles it, and over it goes', () => {
      const { c } = cave();
      park(c, [0, 1]);
      const [a, b] = c.goats;
      if (!a || !b) throw new Error('no goats');
      a.x = 74;
      a.y = 0;
      b.x = 110;
      b.y = 0;
      c.x = 60;
      c.face = 1;
      run(c, 0.05);
      c.grab();
      run(c, 0.05);
      c.grab();
      run(c, 0.05, 1);
      run(c, 1.5);
      expect(b.state).toBe('faint');
    });

    it('set down standing still, it lies just in front; a second set down there goes on top: a stack', () => {
      const { c } = cave();
      park(c, [0, 1]);
      const [a, b] = c.goats;
      if (!a || !b) throw new Error('no goats');
      a.x = 74;
      a.y = 0;
      b.x = 40;
      b.y = 0;
      c.x = 60;
      c.face = 1;
      run(c, 0.05);
      c.grab();
      run(c, 0.05);
      c.grab();
      run(c, 0.05);
      expect(c.held).toBe(null);
      expect(a.y).toBe(0);
      expect(a.x).toBeGreaterThan(c.x);
      // Turn round for the other, pick it up, turn back and set it down on the first.
      c.face = -1;
      c.x = 54;
      run(c, 0.05);
      c.grab();
      run(c, 0.05);
      expect(c.held).toBe(b);
      run(c, 0.1, 1);
      c.x = 60;
      c.grab();
      run(c, 0.3);
      expect(c.held).toBe(null);
      expect(b.y).toBeCloseTo(LIE_H, 5);
      // And the stack stands: the figure can climb it, two goats up.
      walkTo(c, 50);
      hop(c, 1, 0.25);
      hop(c, 1, 0.2);
      expect(c.y).toBeCloseTo(2 * LIE_H, 5);
    });

    it('the bottom goat of a stack stays down while one lies on it', () => {
      const { c } = cave();
      park(c, [0, 1]);
      const [a, b] = c.goats;
      if (!a || !b) throw new Error('no goats');
      for (const g of [a, b]) {
        g.state = 'faint';
        g.k = 1;
        g.x = 100;
      }
      a.y = 0;
      a.t = 0.5;
      b.y = LIE_H;
      b.t = 5;
      run(c, 2);
      expect(a.state).toBe('faint');
      run(c, 5);
      // The top one is up and standing on it, so the bottom one still waits.
      expect(b.state).not.toBe('faint');
      expect(b.y).toBeCloseTo(LIE_H, 5);
      expect(a.state).toBe('faint');
    });

    it("can't pick up the goat it stands on", () => {
      const { c, g } = setUp();
      g.state = 'faint';
      g.k = 1;
      g.t = 99;
      g.x = c.x;
      c.y = LIE_H;
      run(c, 0.05);
      c.grab();
      run(c, 0.05);
      expect(c.held).toBe(null);
      expect(STAND_H).toBeGreaterThan(LIE_H);
    });
  });
});
