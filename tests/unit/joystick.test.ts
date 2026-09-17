import { describe, expect, it } from 'vitest';
import {
  bindJoystick,
  createJoystick,
  DEAD_ZONE,
  type JoystickSurface,
  JR,
  joystickVector,
  type PointerLike,
} from '../../src/input/joystick';

const held = (x: number, y: number) => ({ ...createJoystick(), on: true, sx: 100, sy: 100, x, y });

describe('joystickVector', () => {
  it('is zero when the stick is up or inside the dead zone', () => {
    expect(joystickVector(createJoystick())).toEqual([0, 0]);
    expect(joystickVector(held(100, 100))).toEqual([0, 0]);
    expect(joystickVector(held(100 + DEAD_ZONE, 100))).toEqual([0, 0]);
  });

  it('scales with distance up to the ring radius', () => {
    const [x, y] = joystickVector(held(100 + JR / 2, 100));
    expect(x).toBeCloseTo(0.5);
    expect(y).toBeCloseTo(0);
    const [, dy] = joystickVector(held(100, 100 + JR / 2));
    expect(dy).toBeCloseTo(0.5);
    const [fx] = joystickVector(held(100 + JR, 100));
    expect(fx).toBeCloseTo(1);
  });

  it('drags the ring along when the thumb goes past the radius', () => {
    const joy = held(200, 100);
    const [x, y] = joystickVector(joy);
    expect([x, y]).toEqual([1, 0]);
    expect(joy.sx).toBeCloseTo(200 - JR);
    expect(joy.sy).toBeCloseTo(100);
    // Pulling back toward the new anchor now reads as a shorter stick.
    joy.x = 200 - JR / 2;
    expect(joystickVector(joy)[0]).toBeCloseTo(0.5);
  });
});

/** A stand-in for the canvas that records listeners and lets a test fire events. */
class FakeSurface implements JoystickSurface {
  listeners = new Map<string, ((e: PointerLike) => void)[]>();
  captured: number[] = [];
  addEventListener(type: string, listener: (e: PointerLike) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  setPointerCapture(id: number): void {
    this.captured.push(id);
  }
  fire(type: string, e: Partial<PointerLike>): { prevented: boolean } {
    const out = { prevented: false };
    const ev: PointerLike = {
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      preventDefault: () => {
        out.prevented = true;
      },
      ...e,
    };
    for (const l of this.listeners.get(type) ?? []) l(ev);
    return out;
  }
}

describe('bindJoystick', () => {
  it('anchors on press, follows the same pointer, and releases on up or cancel', () => {
    const surface = new FakeSurface();
    const joy = createJoystick();
    let presses = 0;
    bindJoystick(surface, joy, () => presses++);

    const down = surface.fire('pointerdown', { pointerId: 7, clientX: 50, clientY: 60 });
    expect(joy).toMatchObject({ on: true, id: 7, sx: 50, sy: 60, x: 50, y: 60 });
    expect(down.prevented).toBe(true);
    expect(surface.captured).toEqual([7]);
    expect(presses).toBe(1);

    surface.fire('pointermove', { pointerId: 7, clientX: 90, clientY: 65 });
    expect([joy.x, joy.y]).toEqual([90, 65]);
    surface.fire('pointermove', { pointerId: 8, clientX: 0, clientY: 0 });
    expect([joy.x, joy.y]).toEqual([90, 65]);

    surface.fire('pointerup', { pointerId: 8 });
    expect(joy.on).toBe(true);
    surface.fire('pointercancel', { pointerId: 7 });
    expect(joy.on).toBe(false);
  });

  it('swallows the context menu so a long press does not open one', () => {
    const surface = new FakeSurface();
    bindJoystick(surface, createJoystick(), () => {});
    expect(surface.fire('contextmenu', {}).prevented).toBe(true);
  });
});
