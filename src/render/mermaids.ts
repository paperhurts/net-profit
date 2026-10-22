/**
 * The mermaids' rocks off island 2, and the mermaids on them (world/mermaids.ts, entities/mermaids.ts). The rocks
 * are lumps of grey stone in two tiers, foam breaking round each, shells on the big ones and weed on the small;
 * they sort with the boat, and a mermaid sitting on one is drawn with it. She sits facing the boat, her tail over the
 * front of the rock and down it, its fin flicking at the water, her long hair down her back. Singing, her mouth is
 * open and her near arm out, and each note drifts up off her in its own colour: the four colours the shells will be
 * when she teaches you her song. Coming up, she swims in to her rock with her hair spread on the water; going under,
 * her tail flicks up out of the sea and down. At night each of them shines a little, so they can be found.
 */
import { rgba } from '../core/color';
import { clamp } from '../core/math';
import type { DrawView, Layer } from '../entities/entity';
import type { Floater, Mermaid, Mermaids } from '../entities/mermaids';
import type { Point } from '../world/island';
import { ISLE2 } from '../world/isle2';
import type { Rock } from '../world/mermaids';

/** The four notes' colours, low to high. */
export const NOTE_COLOURS: readonly string[] = ['#FF8FB8', '#FFD25E', '#7FDBFF', '#B7A2FF'];
/** How long a note floats up off her, and how high it goes. */
export const FLOAT_T = 2.2;
const FLOAT_UP = 34;
/** A mermaid is drawn this much bigger than the screen units her shapes are written in. */
const SIZE = 1.6;

/** A hash of two whole numbers, 0..1: each rock keeps its own lumps from frame to frame. */
function hash(a: number, b: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A rock's outline at this share of its width: lumpy, and the same every frame. */
function outline(rock: Rock, i: number, k: number): Point[] {
  const out: Point[] = [];
  const turn = hash(i, 40) * Math.PI;
  for (let j = 0; j < 9; j++) {
    const a = (j / 9) * Math.PI * 2 + turn;
    const r = rock.r * k * (0.82 + 0.26 * hash(i, j));
    out.push([rock.x + Math.cos(a) * r, rock.y + Math.sin(a) * r]);
  }
  return out;
}

/** One rock, in the sorted solids, and whoever is sitting on it. */
export function drawMerRock(v: DrawView, rock: Rock, i: number, m: Mermaid | null): void {
  const { ctx, T } = v;
  const Z = v.zoom;
  v.isoEllipse(rock.x, rock.y, rock.r + 4 + Math.sin(T * 1.3 + i * 1.7) * 1.6);
  ctx.strokeStyle = v.foam;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2.2 * Z;
  ctx.stroke();
  ctx.globalAlpha = 1;
  const mid = rock.h * (rock.seat ? 0.6 : 0.5);
  v.extrude(outline(rock, i, 1), 0, mid, '#4A5860', '#5D6D75');
  v.extrude(outline(rock, i + 20, rock.seat ? 0.82 : 0.66), mid, rock.h, '#5A6971', '#7B8A91');
  const sx = v.px(rock.x, rock.y);
  const top = v.py(rock.x, rock.y, rock.h);
  if (rock.seat) {
    // A shell or two, and a starfish, about the top.
    ctx.fillStyle = '#F4E3CF';
    ctx.beginPath();
    ctx.ellipse(sx - rock.r * 0.35 * Z, top + 1.5 * Z, 2 * Z, 1.3 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F08A5D';
    const fx = sx + rock.r * 0.4 * Z;
    const fy = top + 2 * Z;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const r = (k % 2 ? 0.9 : 2.4) * Z;
      ctx.lineTo(fx + Math.cos(a) * r, fy + Math.sin(a) * r * 0.6);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // Weed hanging off it at the waterline, swaying.
    ctx.strokeStyle = '#3E7A4E';
    ctx.lineWidth = 1.4 * Z;
    for (const k of [-0.5, 0.1, 0.55]) {
      const wx = sx + rock.r * k * Z;
      const wy = v.py(rock.x, rock.y, rock.h * 0.45) + rock.r * 0.3 * Z;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.quadraticCurveTo(
        wx + Math.sin(T * 1.6 + k * 4) * 2 * Z,
        wy + 3 * Z,
        wx + Math.sin(T + k) * Z,
        wy + 6 * Z,
      );
      ctx.stroke();
    }
  }
  if (m) drawSitting(v, m, rock);
}

/** A mermaid on her rock, at its top, facing the boat. */
function drawSitting(v: DrawView, m: Mermaid, rock: Rock): void {
  const { ctx, T } = v;
  const L = m.look;
  const Z = v.zoom * SIZE;
  const dir = m.face;
  const x = v.px(rock.x, rock.y);
  const y = v.py(rock.x, rock.y, rock.h) + 1 * Z;
  const sway = Math.sin(m.ph * 1.3);
  const singing = m.sing > 0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Her hair down her back, behind everything else of her, swaying.
  ctx.fillStyle = L.hair;
  ctx.beginPath();
  ctx.moveTo(x - dir * 1 * Z, y - 18.5 * Z);
  ctx.quadraticCurveTo(
    x - dir * (8 + sway) * Z,
    y - 11 * Z,
    x - dir * (6.5 + sway * 1.6) * Z,
    y - 1 * Z,
  );
  ctx.lineTo(x - dir * 2 * Z, y - 2.5 * Z);
  ctx.quadraticCurveTo(x - dir * 2.5 * Z, y - 10 * Z, x + dir * 1.5 * Z, y - 16 * Z);
  ctx.closePath();
  ctx.fill();
  // The far arm, leaning back on the rock.
  ctx.strokeStyle = L.skin;
  ctx.lineWidth = 1.7 * Z;
  ctx.beginPath();
  ctx.moveTo(x - dir * 1.2 * Z, y - 11 * Z);
  ctx.lineTo(x - dir * 5 * Z, y - 1.5 * Z);
  ctx.stroke();
  // Her tail, from her hips over the front of the rock and down it, the fin flicking at the water.
  const drop = clamp(((rock.h + rock.r * 0.45) * v.zoom * 0.9) / Z, 10, 30);
  const tail: [number, number][] = [
    [0, -1],
    [dir * 5.5, 1.5],
    [dir * 8.5, drop * 0.45],
    [dir * 8, drop * 0.85],
  ];
  for (let i = 0; i < tail.length - 1; i++) {
    const a = tail[i] as [number, number];
    const b = tail[i + 1] as [number, number];
    ctx.strokeStyle = L.tail;
    ctx.lineWidth = (5.6 - i * 1.4) * Z;
    ctx.beginPath();
    ctx.moveTo(x + a[0] * Z, y + a[1] * Z);
    ctx.lineTo(x + b[0] * Z, y + b[1] * Z);
    ctx.stroke();
    // Scales: a little pale arc on each piece.
    ctx.strokeStyle = L.fin;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 0.7 * Z;
    const mx = x + ((a[0] + b[0]) / 2) * Z;
    const my = y + ((a[1] + b[1]) / 2) * Z;
    ctx.beginPath();
    ctx.arc(mx, my, (1.8 - i * 0.3) * Z, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const end = tail[tail.length - 1] as [number, number];
  const flick = Math.sin(T * 2.2 + m.ph) * 0.45;
  fin(v, x + end[0] * Z, y + end[1] * Z, Math.PI / 2 - dir * 0.5 + flick, L.fin, Z);
  // Her body, upright on the rock, and her shell top.
  ctx.fillStyle = L.skin;
  ctx.beginPath();
  ctx.ellipse(x, y - 6 * Z, 3.1 * Z, 5.2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = L.tail;
  ctx.beginPath();
  ctx.ellipse(x + dir * 0.3 * Z, y - 1.5 * Z, 3.4 * Z, 1.8 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = L.top;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + (dir * 0.8 + s * 1.5) * Z, y - 7.6 * Z, 1.35 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  // The near arm: out toward the boat while she sings, resting on her tail when not.
  ctx.strokeStyle = L.skin;
  ctx.lineWidth = 1.7 * Z;
  ctx.beginPath();
  ctx.moveTo(x + dir * 1.5 * Z, y - 10.5 * Z);
  if (singing) ctx.quadraticCurveTo(x + dir * 5 * Z, y - 11 * Z, x + dir * 7.5 * Z, y - 14 * Z);
  else ctx.quadraticCurveTo(x + dir * 4 * Z, y - 7 * Z, x + dir * 4.5 * Z, y - 2.5 * Z);
  ctx.stroke();
  // Her head, her hair over the top of it and a lock over her near shoulder, and her face.
  const hx = x + dir * 0.4 * Z;
  const hy = y - 15 * Z;
  ctx.fillStyle = L.skin;
  ctx.beginPath();
  ctx.arc(hx, hy, 3.4 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = L.hair;
  ctx.beginPath();
  ctx.arc(hx - dir * 0.3 * Z, hy - 0.4 * Z, 3.7 * Z, Math.PI * 0.95, Math.PI * 2.05);
  ctx.quadraticCurveTo(hx + dir * 2 * Z, hy - 1.2 * Z, hx + dir * 0.6 * Z, hy - 2.2 * Z);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = L.hair;
  ctx.lineWidth = 1.5 * Z;
  ctx.beginPath();
  ctx.moveTo(hx + dir * 1.8 * Z, hy - 1.5 * Z);
  ctx.quadraticCurveTo(
    hx + dir * 3.6 * Z,
    hy + 3 * Z,
    hx + dir * (2.6 + sway * 0.4) * Z,
    y - 8 * Z,
  );
  ctx.stroke();
  ctx.fillStyle = '#2A2230';
  ctx.beginPath();
  ctx.arc(hx + dir * 1.8 * Z, hy - 0.2 * Z, 0.55 * Z, 0, Math.PI * 2);
  ctx.fill();
  if (singing) {
    ctx.fillStyle = '#9A3B4E';
    ctx.beginPath();
    ctx.ellipse(hx + dir * 2.3 * Z, hy + 1.8 * Z, 0.7 * Z, 0.9 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#9A3B4E';
    ctx.lineWidth = 0.6 * Z;
    ctx.beginPath();
    ctx.arc(hx + dir * 2 * Z, hy + 1.1 * Z, 0.8 * Z, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // A glint running down her tail now and then.
  const g = (T * 0.6 + m.ph * 0.37) % 1;
  if (g < 0.3) {
    const k = g / 0.3;
    const at = tail[Math.min(2, Math.floor(k * 3))] as [number, number];
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = Math.sin(Math.PI * k);
    v.star(x + at[0] * Z, y + at[1] * Z - 1 * Z, 2.6 * Z);
    ctx.globalAlpha = 1;
  }
}

/** A tail's fin: two lobes from its end, this way. */
function fin(
  v: DrawView,
  x: number,
  y: number,
  a: number,
  colour: string,
  Z: number,
  k = 1,
  spread = 0.75,
): void {
  const { ctx } = v;
  ctx.fillStyle = colour;
  for (const s of [-1, 1]) {
    const b = a + s * spread;
    const R = Z * k;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + Math.cos(a + s * 0.3) * 4 * R,
      y + Math.sin(a + s * 0.3) * 4 * R,
      x + Math.cos(b) * 6.5 * R,
      y + Math.sin(b) * 6.5 * R,
    );
    ctx.quadraticCurveTo(x + Math.cos(a) * 3.5 * R, y + Math.sin(a) * 3.5 * R, x, y);
    ctx.fill();
  }
}

/**
 * Where she is in the water, out from her rock on its seaward side: coming up, nearer it the further up she is;
 * going under, just off it.
 */
function swimSpot(m: Mermaid): [number, number] {
  const ox = m.seat.x - ISLE2.x;
  const oy = m.seat.y - ISLE2.y;
  const od = Math.hypot(ox, oy) || 1;
  const out = m.seat.r + 10 + (m.state === 'dive' ? 0 : (1 - clamp(m.up / 0.75, 0, 1)) * 60);
  return [m.seat.x + (ox / od) * out, m.seat.y + (oy / od) * out];
}

/** Where she is in the water and how she sorts with the rocks and the boat, while she is in it; null up on her rock. */
export function merInWater(m: Mermaid): { x: number; y: number } | null {
  if (!(m.state === 'dive' || (m.state === 'rise' && m.up <= 0.75))) return null;
  const [x, y] = swimSpot(m);
  return { x, y };
}

/** Her, in the water: swimming in to her rock, or the flick of her tail going under. In the sorted solids. */
export function drawMerInWater(v: DrawView, m: Mermaid): void {
  if (m.state === 'dive') drawDiving(v, m);
  else if (m.state === 'rise') drawSwimming(v, m);
}

/** Swimming in to her rock: her head and shoulders out of the water, her hair spread on it, a ripple round her. */
function drawSwimming(v: DrawView, m: Mermaid): void {
  const { ctx, T } = v;
  const L = m.look;
  const Z = v.zoom * SIZE;
  const [wx, wy] = swimSpot(m);
  const x = v.px(wx, wy);
  const y = v.py(wx, wy, 0);
  const dir = m.face;
  ctx.strokeStyle = 'rgba(255,255,255,.5)';
  ctx.lineWidth = 1.2 * Z;
  ctx.beginPath();
  ctx.ellipse(
    x,
    y,
    (9 + Math.sin(T * 3) * 1.5) * Z,
    (4.5 + Math.sin(T * 3) * 0.7) * Z,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.fillStyle = L.hair;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(x - dir * 5 * Z, y + 0.5 * Z, 6 * Z, 2.2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 30 * Z, y - 40 * Z, 60 * Z, 40 * Z + 0.5);
  ctx.clip();
  const bob = Math.sin(T * 2.4 + m.ph) * 0.8 * Z;
  ctx.fillStyle = L.skin;
  ctx.beginPath();
  ctx.ellipse(x, y + 1 * Z + bob, 3.6 * Z, 2.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + dir * 0.4 * Z, y - 4 * Z + bob, 3.3 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = L.hair;
  ctx.beginPath();
  ctx.arc(x + dir * 0.1 * Z, y - 4.4 * Z + bob, 3.6 * Z, Math.PI * 0.95, Math.PI * 2.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2A2230';
  ctx.beginPath();
  ctx.arc(x + dir * 1.7 * Z, y - 3.8 * Z + bob, 0.55 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Going under: her tail up out of the sea beside her rock and down again, its fin last, in a splash. */
function drawDiving(v: DrawView, m: Mermaid): void {
  const { ctx } = v;
  const L = m.look;
  const Z = v.zoom * SIZE;
  const f = 1 - m.up;
  const [wx, wy] = swimSpot(m);
  const x = v.px(wx, wy);
  const y = v.py(wx, wy, 0);
  const lift = Math.sin(Math.PI * f) * 22;
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = 1.4 * Z;
  ctx.beginPath();
  ctx.ellipse(x, y, (6 + f * 12) * Z, (3 + f * 6) * Z, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (lift > 1) {
    ctx.strokeStyle = L.tail;
    ctx.lineWidth = 4.6 * Z;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + m.face * 3 * Z,
      y - lift * 0.5 * Z,
      x + m.face * 1.5 * Z,
      y - lift * Z,
    );
    ctx.stroke();
    fin(
      v,
      x + m.face * 1.5 * Z,
      y - lift * Z,
      -Math.PI / 2 + m.face * 0.4 * (f - 0.5),
      L.fin,
      Z,
      1.7,
      1.15,
    );
  }
  ctx.fillStyle = v.foam;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.5;
    const r = f * 14 * Z;
    ctx.globalAlpha = 1 - f;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8 - f * 4 * Z, 1.3 * Z, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A note of the song, drifting up and fading: a round head, a stem and a little flag, in its colour. */
function drawFloater(v: DrawView, f: Floater): void {
  const { ctx } = v;
  const k = clamp(f.t / FLOAT_T, 0, 1);
  const Z = v.zoom;
  const x = v.px(f.x, f.y) + Math.sin(f.t * 2.6 + f.note) * 4 * Z;
  const y = v.py(f.x, f.y, f.z + k * FLOAT_UP);
  ctx.globalAlpha = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
  ctx.fillStyle = NOTE_COLOURS[f.note] ?? '#FFFFFF';
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = 1.3 * Z;
  ctx.beginPath();
  ctx.ellipse(x, y, 2.6 * Z, 1.9 * Z, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 2.3 * Z, y - 0.6 * Z);
  ctx.lineTo(x + 2.3 * Z, y - 9 * Z);
  ctx.quadraticCurveTo(x + 5.5 * Z, y - 7.5 * Z, x + 5 * Z, y - 4.5 * Z);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** The entity's own layers: the notes in the air, and the light and glow they shine at night. */
export function drawMermaids(v: DrawView, layer: Layer, mer: Mermaids): void {
  if (layer === 'air') {
    for (const f of mer.floaters) drawFloater(v, f);
  } else if (layer === 'mask') {
    for (const m of mer.list)
      if (m.up > 0.3) v.light(m.seat.x, m.seat.y, m.seat.h + 10, 80, 0.85 * m.up);
  } else if (layer === 'glow') {
    const k = clamp(v.dark * 1.2, 0.2, 1);
    v.ctx.globalCompositeOperation = 'screen';
    for (const m of mer.list) {
      if (m.state === 'sit')
        v.glow(m.seat.x, m.seat.y, m.seat.h + 8, 30, rgba(m.look.tail, 0.4 * k));
    }
    v.ctx.globalCompositeOperation = 'source-over';
  }
}
