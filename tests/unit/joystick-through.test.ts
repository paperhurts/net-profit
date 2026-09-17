import { describe, expect, it } from 'vitest';
import {
  bindJoystick,
  bindJoystickThrough,
  createJoystick,
  type JoystickSurface,
  type PointerLike,
  type ThroughPointer,
} from '../../src/input/joystick';

/** Records listeners and fires events; doubles as the canvas and the panel. */
class Fake implements JoystickSurface {
  listeners = new Map<string, ((e: never) => void)[]>();
  captured: number[] = [];
  addEventListener(type: string, listener: (e: never) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  setPointerCapture(id: number): void {
    this.captured.push(id);
  }
  fire<E extends PointerLike>(type: string, e: E): { prevented: boolean } {
    const out = { prevented: false };
    const ev = {
      ...e,
      preventDefault: () => {
        out.prevented = true;
      },
    };
    for (const l of this.listeners.get(type) ?? []) (l as (e: E) => void)(ev);
    return out;
  }
}

const down = (target: string, x = 100, y = 700): ThroughPointer => ({
  pointerId: 3,
  clientX: x,
  clientY: y,
  target,
  preventDefault: () => {},
});

describe('bindJoystickThrough', () => {
  it('starts the stick from the panel wood and captures the pointer on the canvas', () => {
    const canvas = new Fake();
    const panel = new Fake();
    const joy = createJoystick();
    let presses = 0;
    bindJoystick(canvas, joy, () => presses++);
    bindJoystickThrough(
      panel,
      joy,
      canvas,
      (t) => t === 'wood',
      () => presses++,
    );

    const r = panel.fire('pointerdown', down('wood'));
    expect(joy).toMatchObject({ on: true, through: true, id: 3, sx: 100, sy: 700 });
    expect(canvas.captured).toEqual([3]);
    expect(r.prevented).toBe(true);
    expect(presses).toBe(1);

    // Captured moves arrive at the canvas and steer as usual.
    canvas.fire('pointermove', {
      pointerId: 3,
      clientX: 140,
      clientY: 660,
      preventDefault: () => {},
    });
    expect([joy.x, joy.y]).toEqual([140, 660]);

    canvas.fire('pointerup', {
      pointerId: 3,
      clientX: 140,
      clientY: 660,
      preventDefault: () => {},
    });
    expect(joy.on).toBe(false);
    expect(joy.through).toBe(false);
  });

  it('leaves buttons and the scrolling log alone', () => {
    const canvas = new Fake();
    const panel = new Fake();
    const joy = createJoystick();
    bindJoystick(canvas, joy, () => {});
    bindJoystickThrough(
      panel,
      joy,
      canvas,
      (t) => t === 'wood',
      () => {},
    );

    const r = panel.fire('pointerdown', down('button'));
    expect(joy.on).toBe(false);
    expect(canvas.captured).toEqual([]);
    expect(r.prevented).toBe(false);
  });

  it('does not restart a stick that is already down on the canvas', () => {
    const canvas = new Fake();
    const panel = new Fake();
    const joy = createJoystick();
    bindJoystick(canvas, joy, () => {});
    bindJoystickThrough(
      panel,
      joy,
      canvas,
      () => true,
      () => {},
    );

    canvas.fire('pointerdown', {
      pointerId: 1,
      clientX: 50,
      clientY: 50,
      preventDefault: () => {},
    });
    panel.fire('pointerdown', down('wood'));
    expect(joy).toMatchObject({ on: true, through: false, id: 1, sx: 50, sy: 50 });
  });
});
