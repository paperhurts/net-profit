/**
 * The flotilla's craft, the kid's (entities/flotilla.ts): an airboat, flat and silver, its rider up on a high seat in
 * front of a great caged fan; a catamaran, two slim white hulls with a net between and a striped sail; a windsurfer,
 * a board and a bright sail, its rider standing at the boom; and a banana boat, a big yellow inflatable banana as long
 * as the warlock's boat, its rider astride it, on a rope behind the airboat or, on its own, with a little outboard on
 * its tail; and a swan paddle boat, a white swan's body with its wings raised along its sides, its neck curving up at
 * the bow, two riders side by side and a red paddle wheel turning under its tail. Each bobs on the water, with a wake
 * when under way. The game draws the riders, at the point and height given, the swan's pedalling.
 */

import type { DrawView } from '../entities/entity';
import { BANANA_HALF, CRAFT_SCALE, type Craft, type CraftKind } from '../entities/flotilla';

export { CRAFT_SCALE };

const INK = '#1D2B3A';

/** A rider drawn at a seat; on the swan, pedalling, with the pedals' phase and how hard (0 to 1). */
type Rider = (
  x: number,
  y: number,
  z: number,
  h: number,
  pedal?: { ph: number; gait: number },
) => void;

/** Draw a craft, its wake, and its rider (if riding) at the seat; the swan's second rider beside the first. */
export function drawCraft(
  v: DrawView,
  c: Craft,
  rider: Rider | null,
  second: Rider | null = null,
): void {
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
  wake(v, c, L, c.kind === 'banana' ? -BANANA_HALF : c.kind === 'swan' ? -21 : -14);
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
  } else if (kind === 'swan') {
    drawSwan(v, c, { L, P, poly, line, hull }, bob, rider, second);
  } else {
    // The banana: a long fat yellow tube, its ends curling up, brown at the tips. On a rope behind the airboat, the
    // rope runs from its nose to the airboat's stern; on its own, a little outboard on its tail.
    const B = BANANA_HALF;
    if (c.tow) {
      const nose = P(B - 1, 0, 6);
      line(nose, [px(c.tow.x, c.tow.y), py(c.tow.x, c.tow.y, 3 + bob)], '#F4EFE6', 1.3);
    }
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const a = -B + t * 2 * B;
      const curl = (a / B) ** 2 * 6;
      const r = (4.4 - Math.abs(a / B) ** 3 * 2.4) * k;
      const [x, y] = L(a, 0);
      v.isoEllipse(x, y, r, (2.5 + curl) * k + bob);
      ctx.fillStyle = t < 0.05 || t > 0.95 ? '#6B4A1E' : i % 2 ? '#F6D23C' : '#F2C230';
      ctx.fill();
    }
    if (!c.tow) {
      line(P(-B + 1, 0, 5), P(-B - 3, 0, 1), '#2A2F33', 3);
      line(P(-B - 3, 0, 1), P(-B - 3, 0, -2), '#2A2F33', 1.6);
    }
    seat(-2, 0, 7);
  }
}

type Pt = [number, number];
type Kit = {
  L: (a: number, b: number) => Pt;
  P: (a: number, b: number, z: number) => Pt;
  poly: (pts: Pt[], fill: string, stroke?: boolean) => void;
  line: (a: Pt, b: Pt, col: string, w: number) => void;
  hull: (pts: Pt[], z0: number, z1: number, side: string, top: string) => void;
};

/** How wide the swan's body is, either side, this far along it: its wings stand on its sides there. */
const SWAN_SIDE: readonly [number, number, number][] = [
  // along, out, the wing's top
  [8, 8.6, 5.5],
  [3, 10, 8.5],
  [-3, 10.8, 11],
  [-9, 10.4, 12.5],
  [-13, 9, 14.5],
  [-16, 6.5, 18],
];

/**
 * The swan paddle boat, the kid's: a white swan's body, a well in its back with two seats side by side, its wings
 * raised along its sides so the riders sit down inside them, its neck curving up from the bow to a head with an
 * orange beak and its black knob, and its tail over a red paddle wheel that turns as they pedal. Its parts are drawn
 * far to near, so the near wing hides the riders' legs and the neck is in front of them coming toward you.
 */
function drawSwan(
  v: DrawView,
  c: Craft,
  { L, P, poly, line, hull }: Kit,
  bob: number,
  rider: Rider | null,
  second: Rider | null,
): void {
  const { ctx } = v;
  const k = CRAFT_SCALE;
  const depth = (a: number, b: number) => {
    const [x, y] = L(a, b);
    return x + y;
  };
  hull(
    [
      [15, 0],
      [12, 6],
      [5, 9.6],
      [-6, 10.6],
      [-13, 9.4],
      [-17, 5],
      [-18, 0],
      [-17, -5],
      [-13, -9.4],
      [-6, -10.6],
      [5, -9.6],
      [12, -6],
    ],
    -1,
    5,
    '#C9D3DB',
    '#F7F9FB',
  );
  // The well in its back, where they sit.
  poly(
    [P(8, 0, 5), P(5, 6.5, 5), P(-10, 7.5, 5), P(-13, 0, 5), P(-10, -7.5, 5), P(5, -6.5, 5)],
    '#7F95A6',
  );
  const sp = Math.abs(c.v);
  const gait = Math.min(1, sp / 120);
  const ph = v.T * 7;
  const parts: { d: number; f: () => void }[] = [];
  // A wing, standing up along one side, its tip curling up at the back, with a feather or two drawn in.
  for (const s of [1, -1]) {
    parts.push({
      d: depth(-3, 11 * s),
      f: () => {
        const top = SWAN_SIDE.map(([a, b, z]) => P(a, b * s, z));
        const foot = SWAN_SIDE.map(([a, b]) => P(a, b * s, 4)).reverse();
        poly([...top, ...foot], '#FFFFFF');
        for (const [a0, a1] of [
          [-4, -12],
          [-8, -14.5],
        ] as const) {
          const z0 = 6 + (-a0 - 3) * 0.3;
          line(P(a0, 10.9 * s, z0), P(a1, 9.6 * s, z0 + 4), '#C9D3DB', 1);
        }
      },
    });
  }
  // Two seats side by side, each rider pedalling.
  const seats: [number, Rider | null][] = [
    [5.5, rider],
    [-5.5, second],
  ];
  for (const [b, r] of seats) {
    if (!r) continue;
    parts.push({
      d: depth(-5, b),
      f: () => {
        const [x, y] = L(-5, b);
        r(x, y, 5 * k + bob, c.h, { ph: ph + (b > 0 ? 0 : Math.PI), gait });
      },
    });
  }
  // The neck, curving up from the bow, and the head: white, an orange beak with its black knob, a black eye.
  parts.push({
    d: depth(14, 0),
    f: () => {
      const neck: Pt[] = [
        [11, 4],
        [16, 8],
        [17, 14],
        [14.5, 20],
        [13.5, 26],
        [15, 31],
        [17.5, 33],
      ].map(([a, z]) => P(a as number, 0, z as number));
      for (const [col, w] of [
        ['#1D2B3A', 6.4],
        ['#FFFFFF', 4.8],
      ] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w * k * v.zoom;
        ctx.beginPath();
        neck.forEach(([x, y], i) => {
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        });
        ctx.stroke();
      }
      const head = P(18.5, 0, 33);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#1D2B3A';
      ctx.lineWidth = 1.1 * v.zoom;
      ctx.beginPath();
      ctx.arc(head[0], head[1], 3.3 * k * v.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      line(P(21, 0, 32.6), P(25.5, 0, 31), '#F28C28', 2.6 * k);
      ctx.fillStyle = '#1D2B3A';
      const knob = P(21, 0, 33.4);
      ctx.beginPath();
      ctx.arc(knob[0], knob[1], 1.2 * k * v.zoom, 0, Math.PI * 2);
      ctx.fill();
      // The eye on the side toward you.
      const near = depth(19, 2) > depth(19, -2) ? 1 : -1;
      const eye = P(19, 1.8 * near, 34.4);
      ctx.beginPath();
      ctx.arc(eye[0], eye[1], 0.8 * k * v.zoom, 0, Math.PI * 2);
      ctx.fill();
    },
  });
  // Its tail, and the paddle wheel under it, turning as they pedal; only what is above the water shows.
  parts.push({
    d: depth(-19, 0),
    f: () => {
      const turn = v.T * Math.min(9, sp * 0.06);
      for (let i = 0; i < 6; i++) {
        const t = turn + (i * Math.PI) / 3;
        const z = 2 + Math.sin(t) * 4.6;
        if (z < 0) continue;
        line(P(-19.5, 0, 2), P(-19.5 + Math.cos(t) * 4.6, 0, z), '#E4572E', 1.8 * k);
      }
      line(P(-19.5, -2, 2), P(-19.5, 2, 2), '#8A2E1C', 1.6 * k);
      poly(
        [P(-12, -4, 5), P(-19, -2.5, 10), P(-21.5, 0, 14), P(-19, 2.5, 10), P(-12, 4, 5)],
        '#FFFFFF',
      );
    },
  });
  parts.sort((p, q) => p.d - q.d);
  for (const p of parts) p.f();
}

/** A white V spreading behind a craft under way. */
function wake(
  v: DrawView,
  c: Craft,
  L: (a: number, b: number) => [number, number],
  stern: number,
): void {
  const sp = Math.abs(c.v);
  if (sp < 20) return;
  const { ctx, px, py } = v;
  const a = Math.min(0.5, sp / 400);
  ctx.strokeStyle = `rgba(255,255,255,${a})`;
  ctx.lineWidth = 1.5 * v.zoom;
  for (const s of [1, -1]) {
    const [x0, y0] = L(stern, 0);
    const [x1, y1] = L(stern - 30 - sp * 0.05, s * (10 + sp * 0.03));
    ctx.beginPath();
    ctx.moveTo(px(x0, y0), py(x0, y0));
    ctx.lineTo(px(x1, y1), py(x1, y1));
    ctx.stroke();
  }
}
