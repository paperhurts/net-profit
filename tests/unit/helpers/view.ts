import type { DrawView } from '../../../src/entities/entity';

export type FakeView = {
  v: DrawView;
  /** How many times each context method or view primitive was called. */
  calls: Record<string, number>;
  /** What the view's onScreen answers; flip it to test culling. */
  onScreen: boolean;
};

/**
 * A draw view for entity draw tests. Its context and primitives only count
 * their calls; the projection is a simple shear so coordinates stay finite.
 */
export function fakeView(): FakeView {
  const calls: Record<string, number> = {};
  const count =
    (name: string) =>
    (..._args: unknown[]) => {
      calls[name] = (calls[name] ?? 0) + 1;
    };
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    lineWidth: 1,
    globalCompositeOperation: 'source-over',
    beginPath: count('beginPath'),
    // A real canvas throws on a negative radius, which has broken a frame in the game before.
    ellipse: (_x: number, _y: number, rx: number, ry: number) => {
      if (rx < 0 || ry < 0) throw new Error(`ellipse with a negative radius: ${rx}, ${ry}`);
      count('ellipse')();
    },
    arc: (_x: number, _y: number, r: number) => {
      if (r < 0) throw new Error(`arc with a negative radius: ${r}`);
      count('arc')();
    },
    fill: count('fill'),
    stroke: count('stroke'),
    moveTo: count('moveTo'),
    lineTo: count('lineTo'),
    quadraticCurveTo: count('quadraticCurveTo'),
    fillRect: count('fillRect'),
    bezierCurveTo: count('bezierCurveTo'),
    closePath: count('closePath'),
    fillText: count('fillText'),
    save: count('save'),
    restore: count('restore'),
    rect: count('rect'),
    clip: count('clip'),
    translate: count('translate'),
    rotate: count('rotate'),
    scale: count('scale'),
    setLineDash: count('setLineDash'),
  } as unknown as CanvasRenderingContext2D;
  const fake: FakeView = {
    calls,
    onScreen: true,
    v: {
      ctx,
      px: (x, y) => x - y,
      py: (x, y, z = 0) => (x + y) * 0.5 - z,
      onScreen: () => fake.onScreen,
      zoom: 1,
      dark: 0,
      T: 0,
      foam: '#fff',
      coin: '#fc0',
      ship: count('ship'),
      light: count('light'),
      glow: count('glow'),
      indicator: count('indicator'),
      isoEllipse: count('isoEllipse'),
      fishShape: count('fishShape'),
      star: count('star'),
      box: count('box'),
      extrude: count('extrude'),
      bird: count('bird'),
    },
  };
  return fake;
}
