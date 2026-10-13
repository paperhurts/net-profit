/**
 * Island 10's prairie animals (entities/prairie10.ts), drawn side on and big enough to read from the zoom a big
 * island is seen at: bunnies, round and soft with long ears and a white puff of a tail, rising on each hop; prairie
 * dogs, sandy and upright, half out of a hole in a little mound of earth; bison, dark and shaggy with a great woolly
 * hump, little horns and a beard, head down to the grass when grazing, and a ginger calf; and butterflies, wings
 * opening and closing over the flowers.
 */

import type { DrawView } from '../entities/entity';
import type { Bison, Bunny, Butterfly, PrairieDog } from '../entities/prairie10';

const INK = '#1D2B3A';
/** How big each is drawn, against the zoom: bison stand well over the figure, bunnies about cat-sized. */
const BUNNY_K = 2.6;
const DOG_K = 2.4;
const BISON_K = 3.3;
const FLY_K = 2.6;
const FUR: readonly { body: string; belly: string; ear: string }[] = [
  { body: '#A9825A', belly: '#E6D3B5', ear: '#E8A9A0' },
  { body: '#9A9590', belly: '#E3E0DA', ear: '#E8A9A0' },
  { body: '#F4F1EA', belly: '#FFFFFF', ear: '#F2B8B0' },
];

function shadow(v: DrawView, x: number, y: number, rx: number, ry: number): void {
  const { ctx } = v;
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  ctx.beginPath();
  ctx.ellipse(v.px(x, y), v.py(x, y, 0), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBunny(v: DrawView, b: Bunny): void {
  const { ctx } = v;
  const Z = v.zoom * BUNNY_K;
  const F = FUR[b.kind % FUR.length] ?? FUR[0];
  if (!F) return;
  const bound = b.hopT < 0.25;
  const lift = b.hop > 0 ? Math.sin(Math.min(1, b.hop) * Math.PI) * (bound ? 9 : 6) : 0;
  shadow(v, b.x, b.y, 3.2 * Z, 1.3 * Z);
  ctx.save();
  ctx.translate(v.px(b.x, b.y), v.py(b.x, b.y, lift));
  ctx.scale(b.face, 1);
  // Stretched out mid-hop, tucked up sitting.
  const stretch = b.hop > 0 ? 1.2 : 1;
  ctx.lineWidth = 0.5 * Z;
  ctx.strokeStyle = INK;
  // Back feet.
  ctx.fillStyle = F.body;
  ctx.beginPath();
  ctx.ellipse(-1.6 * Z * stretch, -0.4 * Z, 1.5 * Z, 0.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.beginPath();
  ctx.ellipse(
    -0.4 * Z,
    -2.1 * Z,
    2.6 * Z * stretch,
    1.9 * Z,
    b.hop > 0 ? -0.15 : 0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.stroke();
  // Tail puff.
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-3 * Z * stretch, -2.6 * Z, 0.9 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Head, ears back a little mid-hop.
  ctx.fillStyle = F.body;
  const hx = 2 * Z * stretch;
  const hy = -3.4 * Z;
  for (const [ox, tilt] of [
    [-0.4, b.hop > 0 ? -0.9 : -0.35],
    [0.5, b.hop > 0 ? -0.7 : -0.1],
  ] as const) {
    ctx.save();
    ctx.translate(hx + ox * Z, hy - 0.6 * Z);
    ctx.rotate(tilt);
    ctx.fillStyle = F.body;
    ctx.beginPath();
    ctx.ellipse(0, -2 * Z, 0.65 * Z, 2.1 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = F.ear;
    ctx.beginPath();
    ctx.ellipse(0, -2 * Z, 0.3 * Z, 1.4 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = F.body;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 1.5 * Z, 1.3 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx + 0.6 * Z, hy - 0.3 * Z, 0.32 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#E8838A';
  ctx.beginPath();
  ctx.arc(hx + 1.45 * Z, hy + 0.2 * Z, 0.28 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The mound and the hole, flat on the grass, drawn whether its dog is up or not. */
function burrow(v: DrawView, d: PrairieDog, Z: number): void {
  const { ctx } = v;
  const x = v.px(d.x, d.y);
  const y = v.py(d.x, d.y, 0);
  ctx.fillStyle = '#B08A5A';
  ctx.beginPath();
  ctx.ellipse(x, y, 4.6 * Z, 2.2 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#C9A774';
  ctx.beginPath();
  ctx.ellipse(x, y - 0.5 * Z, 3.6 * Z, 1.6 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3B2A1E';
  ctx.beginPath();
  ctx.ellipse(x, y - 0.4 * Z, 1.8 * Z, 0.8 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPrairieDog(v: DrawView, d: PrairieDog): void {
  const { ctx } = v;
  const Z = v.zoom * DOG_K;
  burrow(v, d, Z);
  if (d.up < 0.02) return;
  const x = v.px(d.x, d.y);
  const y = v.py(d.x, d.y, 0) - 0.4 * Z;
  const tall = 1 + d.tall * 0.35;
  const h = 4.4 * Z * tall * d.up;
  ctx.save();
  // Only what is out of the hole shows.
  ctx.beginPath();
  ctx.rect(x - 6 * Z, y - 12 * Z, 12 * Z, 12 * Z);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(d.look >= 0 ? 1 : -1, 1);
  ctx.lineWidth = 0.5 * Z;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#C79A62';
  // Body, a sandy upright bean.
  ctx.beginPath();
  ctx.ellipse(0, -h + 2.6 * Z * tall, 1.6 * Z, 2.7 * Z * tall, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#EBD3A8';
  ctx.beginPath();
  ctx.ellipse(0.5 * Z, -h + 3 * Z * tall, 0.8 * Z, 1.8 * Z * tall, 0, 0, Math.PI * 2);
  ctx.fill();
  // Paws held up in front when on watch.
  if (d.tall > 0.4) {
    ctx.fillStyle = '#A97E4E';
    ctx.beginPath();
    ctx.ellipse(1.3 * Z, -h + 2.5 * Z, 0.6 * Z, 0.4 * Z, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Head.
  ctx.fillStyle = '#C79A62';
  ctx.beginPath();
  ctx.ellipse(0.4 * Z, -h, 1.3 * Z, 1.1 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0.9 * Z, -h - 0.2 * Z, 0.28 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1.65 * Z, -h + 0.15 * Z, 0.22 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#A97E4E';
  ctx.beginPath();
  ctx.arc(-0.5 * Z, -h - 0.8 * Z, 0.35 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBison(v: DrawView, b: Bison): void {
  const { ctx } = v;
  const Z = v.zoom * BISON_K * (b.calf ? 0.55 : 1);
  shadow(v, b.x, b.y, 8 * Z, 2.6 * Z);
  ctx.save();
  ctx.translate(v.px(b.x, b.y), v.py(b.x, b.y, 0));
  ctx.scale(b.face, 1);
  ctx.lineWidth = 0.45 * Z;
  ctx.strokeStyle = INK;
  const coat = b.calf ? '#B8743A' : '#4A3226';
  const wool = b.calf ? '#C98A4C' : '#6E4A33';
  // Legs, stepping.
  const swing = Math.sin(b.step) * 0.8 * Z;
  ctx.strokeStyle = coat;
  ctx.lineWidth = 1.1 * Z;
  ctx.lineCap = 'round';
  for (const [lx, s] of [
    [-4.6, 1],
    [-3.2, -1],
    [3, -1],
    [4.4, 1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(lx * Z, -3.5 * Z);
    ctx.lineTo(lx * Z + swing * s, 0);
    ctx.stroke();
  }
  ctx.lineWidth = 0.45 * Z;
  ctx.strokeStyle = INK;
  // Body, low at the back.
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.ellipse(-1.4 * Z, -5.4 * Z, 5.4 * Z, 2.8 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A tuft of a tail.
  ctx.beginPath();
  ctx.moveTo(-6.6 * Z, -6.2 * Z);
  ctx.quadraticCurveTo(-7.8 * Z, -5 * Z, -7.2 * Z, -3.6 * Z);
  ctx.stroke();
  // The great woolly hump and shoulders.
  if (!b.calf) {
    ctx.fillStyle = wool;
    ctx.beginPath();
    ctx.ellipse(2.4 * Z, -7 * Z, 3.8 * Z, 3.6 * Z, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // The head: low to the grass while grazing, up and looking about otherwise.
  const down = b.graze;
  const hx = (b.calf ? 4.6 : 5.6) * Z;
  const hy = (-6 + down * 3.6) * Z;
  ctx.fillStyle = wool;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 1.9 * Z, 2.1 * Z, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (!b.calf) {
    // Beard, horns.
    ctx.fillStyle = '#3A271D';
    ctx.beginPath();
    ctx.ellipse(hx + 0.6 * Z, hy + 2 * Z, 0.9 * Z, 1.2 * Z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E8E0CC';
    ctx.lineWidth = 0.55 * Z;
    ctx.beginPath();
    ctx.moveTo(hx - 0.4 * Z, hy - 1.6 * Z);
    ctx.quadraticCurveTo(hx - 0.2 * Z, hy - 3 * Z, hx + 0.8 * Z, hy - 2.9 * Z);
    ctx.stroke();
  }
  ctx.fillStyle = '#F4EBD8';
  ctx.beginPath();
  ctx.arc(hx + 0.9 * Z, hy - 0.4 * Z, 0.38 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx + 1 * Z, hy - 0.4 * Z, 0.22 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const WINGS: readonly [string, string][] = [
  ['#F28C28', '#1D2B3A'],
  ['#F7D84A', '#6B5A20'],
  ['#7FB7F0', '#2C4A6E'],
];

export function drawButterfly(v: DrawView, b: Butterfly): void {
  const { ctx } = v;
  if (!v.onScreen(b.x, b.y, 30)) return;
  const Z = v.zoom * FLY_K;
  const [fill, edge] = WINGS[b.kind % WINGS.length] ?? ['#F28C28', INK];
  const open = Math.abs(Math.sin(b.t * 11));
  const x = v.px(b.x, b.y);
  const y = v.py(b.x, b.y, b.z);
  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.beginPath();
  ctx.ellipse(x, v.py(b.x, b.y, 0), 1.2 * Z, 0.5 * Z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 0.35 * Z;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      x + s * 1 * Z * open,
      y - 0.6 * Z,
      1.1 * Z * open + 0.2 * Z,
      1.3 * Z,
      s * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(
      x + s * 0.7 * Z * open,
      y + 0.7 * Z,
      0.7 * Z * open + 0.15 * Z,
      0.8 * Z,
      -s * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = INK;
  ctx.fillRect(x - 0.2 * Z, y - 1 * Z, 0.4 * Z, 2.2 * Z);
}

/** The prairie's butterflies, over everything on the ground. */
export function drawPrairieAir(v: DrawView, flies: readonly Butterfly[]): void {
  for (const b of flies) drawButterfly(v, b);
}
