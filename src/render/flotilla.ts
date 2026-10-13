/**
 * The flotilla's craft, the kid's (entities/flotilla.ts): an airboat, flat and silver, its rider up on a high seat in
 * front of a great caged fan; a catamaran, two slim white hulls with a net between and a striped sail; a windsurfer,
 * a board and a bright sail, its rider standing at the boom; and a banana boat, a big yellow inflatable banana with a
 * little outboard on its tail and its rider astride it. Each bobs on the water, with a wake when under way. The game
 * draws the rider, at the point and height given.
 */

import type { DrawView } from '../entities/entity';
import type { Craft, CraftKind } from '../entities/flotilla';

/** How big the craft are drawn, against the hull's units. */
export const CRAFT_SCALE = 1.15;

const INK = '#1D2B3A';

type Rider = (x: number, y: number, z: number, h: number) => void;

/** Draw a craft, its wake, and its rider (if riding) at the seat. */
export function drawCraft(v: DrawView, c: Craft, rider: Rider | null): void {
  const { ctx, px, py } = v;
  const k = CRAFT_SCALE;
  const co = Math.cos(c.h);
  const si = Math.sin(c.h);
  const bob = Math.sin(v.T * 2.3 + c.x * 0.013) * 1.1;
  const L = (a: number, b: number): [number, number] => [
    c.x + (a * co - b * si) * k,
    c.y + (a * si + b * co) * k,
  ];
  const P = (a: number, b: number, z: number): [number, number] => {
    const [x, y] = L(a, b);
    return [px(x, y), py(x, y, z * k + bob)];
  };
  const poly = (pts: [number, number][], fill: string, stroke = true) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.1 * v.zoom;
      ctx.stroke();
    }
  };
  const line = (a: [number, number], b: [number, number], col: string, w: number) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = w * v.zoom;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  wake(v, c, L);
  const hull = (pts: [number, number][], z0: number, z1: number, side: string, top: string) =>
    v.extrude(
      pts.map(([a, b]) => L(a, b)),
      z0 * k + bob,
      z1 * k + bob,
      side,
      top,
    );
  const seat = (a: number, b: number, z: number) => {
    if (!rider) return;
    const [x, y] = L(a, b);
    rider(x, y, z * k + bob, c.h);
  };
  const kind: CraftKind = c.kind;
  if (kind === 'airboat') {
    hull(
      [
        [17, 0],
        [13, 8],
        [-15, 8],
        [-15, -8],
        [13, -8],
      ],
      -1,
      3,
      '#5E7F89',
      '#A9C6CE',
    );
    // The high seat, and its rider, in front of the fan.
    hull(
      [
        [0, -3],
        [0, 3],
        [-5, 3],
        [-5, -3],
      ],
      3,
      9,
      '#33454D',
      '#4D646D',
    );
    seat(-2, 0, 9);
    // The fan: a ring standing across the stern, its blades a blur, faster under way.
    const centre = P(-12, 0, 15);
    const side = P(-12, 10, 15);
    const up = P(-12, 0, 25);
    const ax = side[0] - centre[0];
    const ay = side[1] - centre[1];
    const bx = up[0] - centre[0];
    const by = up[1] - centre[1];
    const at = (t: number): [number, number] => [
      centre[0] + Math.cos(t) * ax + Math.sin(t) * bx,
      centre[1] + Math.cos(t) * ay + Math.sin(t) * by,
    ];
    line(P(-12, 0, 3), centre, '#33454D', 2.4);
    ctx.fillStyle = 'rgba(210,225,230,.25)';
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const [x, y] = at((i / 24) * Math.PI * 2);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.fill();
    const spin = v.T * (14 + Math.abs(c.v) * 0.12);
    for (let i = 0; i < 2; i++)
      line(at(spin + i * Math.PI), at(spin + i * Math.PI + Math.PI), '#2A2F33', 1.8);
    ctx.strokeStyle = '#E4572E';
    ctx.lineWidth = 1.8 * v.zoom;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const [x, y] = at((i / 24) * Math.PI * 2);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    line(at(0), at(Math.PI), 'rgba(29,43,58,.5)', 0.8);
    line(at(Math.PI / 2), at(-Math.PI / 2), 'rgba(29,43,58,.5)', 0.8);
  } else if (kind === 'catamaran') {
    for (const s of [1, -1]) {
      hull(
        [
          [19, 7 * s],
          [15, 9.5 * s],
          [-17, 9.5 * s],
          [-17, 4.5 * s],
          [15, 4.5 * s],
        ],
        -1,
        4,
        '#C9C3B4',
        '#F4F1E8',
      );
    }
    // The net between the hulls.
    poly([P(11, -5, 4), P(11, 5, 4), P(-14, 5, 4), P(-14, -5, 4)], 'rgba(46,79,99,.75)', false);
    seat(-7, 0, 4.5);
    // The mast and its striped sail, along the boat.
    const top = P(4, 0, 38);
    const foot = P(4, 0, 7);
    // The boom swung out to the side, as to the wind, so the sail shows from more of the ways round.
    const clew = P(-10, 11, 7);
    poly([top, foot, clew], '#FFFBEF');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(foot[0], foot[1]);
    ctx.lineTo(clew[0], clew[1]);
    ctx.closePath();
    ctx.clip();
    for (const [z, col] of [
      [12, '#E4572E'],
      [20, '#F2C230'],
      [28, '#2B8A99'],
    ] as const) {
      const a = P(4, 0, z);
      const b = P(-10, 11, z - 5);
      line(a, b, col, 4.5);
    }
    ctx.restore();
    line(foot, top, INK, 1.6);
    line(foot, clew, INK, 1.4);
  } else if (kind === 'windsurf') {
    hull(
      [
        [12, 0],
        [9, 3.6],
        [-11, 3.2],
        [-12.5, 0],
        [-11, -3.2],
        [9, -3.6],
      ],
      -0.5,
      1.5,
      '#D7DEE0',
      '#FFFFFF',
    );
    line(P(10, 0, 1.6), P(-11, 0, 1.6), '#2B8A99', 1.6);
    // The sail leans and sways a little, the rider at its boom.
    const lean = Math.sin(v.T * 1.3 + c.x * 0.01) * 2.5;
    const foot = P(3, 0, 1.5);
    const top = P(0, 4 + lean, 34);
    const clew = P(-5, 12 + lean * 0.6, 15);
    const tack = P(2.5, 0, 6);
    poly([foot, top, clew, tack], '#FF5FA2');
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(foot[0], foot[1]);
    ctx.lineTo(top[0], top[1]);
    ctx.lineTo(clew[0], clew[1]);
    ctx.lineTo(tack[0], tack[1]);
    ctx.closePath();
    ctx.clip();
    line(P(2, 2 + lean * 0.5, 18), P(-5, 12 + lean * 0.6, 12), '#F2C230', 5);
    line(P(1.5, 3 + lean * 0.7, 26), P(-3, 9 + lean * 0.7, 22), '#7FD8FF', 4);
    ctx.restore();
    line(foot, top, INK, 1.4);
    seat(-3, 0, 1.5);
    line(P(2, lean * 0.4, 15), clew, INK, 1.2);
  } else {
    // The banana: a fat yellow tube, its ends curling up, brown at the tips; a little outboard on its tail.
    const N = 12;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = -16 + t * 32;
      const curl = (a / 16) ** 2 * 5;
      const r = (4.4 - Math.abs(a / 16) ** 3 * 2.4) * k;
      const [x, y] = L(a, 0);
      v.isoEllipse(x, y, r, (2.5 + curl) * k + bob);
      ctx.fillStyle = t < 0.06 || t > 0.94 ? '#6B4A1E' : i % 2 ? '#F6D23C' : '#F2C230';
      ctx.fill();
    }
    line(P(-15, 0, 5), P(-19, 0, 1), '#2A2F33', 3);
    line(P(-19, 0, 1), P(-19, 0, -2), '#2A2F33', 1.6);
    seat(-1, 0, 7);
  }
}

/** A white V spreading behind a craft under way. */
function wake(v: DrawView, c: Craft, L: (a: number, b: number) => [number, number]): void {
  const sp = Math.abs(c.v);
  if (sp < 20) return;
  const { ctx, px, py } = v;
  const a = Math.min(0.5, sp / 400);
  ctx.strokeStyle = `rgba(255,255,255,${a})`;
  ctx.lineWidth = 1.5 * v.zoom;
  for (const s of [1, -1]) {
    const [x0, y0] = L(-14, 0);
    const [x1, y1] = L(-14 - 30 - sp * 0.05, s * (10 + sp * 0.03));
    ctx.beginPath();
    ctx.moveTo(px(x0, y0), py(x0, y0));
    ctx.lineTo(px(x1, y1), py(x1, y1));
    ctx.stroke();
  }
}
