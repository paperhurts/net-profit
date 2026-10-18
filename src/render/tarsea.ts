/**
 * The tar ocean, sailed (world/tarsea.ts): black and glossy as far as you can see, slow purple sheens rolling across
 * it and bubbles rising and popping; the sea beyond the bridge to the south; yellow and black hazard buoys marking
 * its three open edges; and the chemistry boat's own things on top of its hull: a big round flask of green, and a
 * chimney puffing green bubbles.
 */

import type { DrawView } from '../entities/entity';
import { METAL_BRIDGE, NORTH_EDGE } from '../world/metalbridge';
import { EDGE_BUOY_GAP, TAR_BERTH, TAR_SEA } from '../world/tarsea';

const TAR = '#17121B';
const SEA = '#2E7FA0';

/** A hash of a cell, 0..1, for things scattered over the tar that stay put as it scrolls by. */
function hash(i: number, j: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** The tar under everything on the screen: the whole canvas, the sea's strip past the bridge, the sheen and bubbles. */
export function drawTarSea(v: DrawView, W: number, H: number, cx: number, cy: number): void {
  const { ctx, px, py, T, zoom: Z } = v;
  ctx.fillStyle = TAR;
  ctx.fillRect(0, 0, W, H);
  // The sea, south of the edge, where the bridge stands, if it is near.
  const quad = (x0: number, x1: number, y0: number, y1: number, c: string) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(px(x0, y0), py(x0, y0, 0));
    ctx.lineTo(px(x1, y0), py(x1, y0, 0));
    ctx.lineTo(px(x1, y1), py(x1, y1, 0));
    ctx.lineTo(px(x0, y1), py(x0, y1, 0));
    ctx.closePath();
    ctx.fill();
  };
  if (cy > NORTH_EDGE - 2000) {
    quad(cx - 3000, cx + 3000, NORTH_EDGE, NORTH_EDGE + 2000, SEA);
    quad(cx - 3000, cx + 3000, NORTH_EDGE - 10, NORTH_EDGE + 6, '#2A1F24');
  }
  // Slow sheens rolling across it.
  for (let i = -3; i <= 3; i++) {
    const at = Math.floor(cy / 300) * 300 + i * 300 - ((T * 18) % 300);
    if (at > NORTH_EDGE) continue;
    quad(cx - 3000, cx + 3000, at - 18, at, 'rgba(120,96,140,.08)');
  }
  // Bubbles, rising and popping, scattered on a grid round the boat.
  ctx.strokeStyle = 'rgba(150,120,170,.5)';
  ctx.lineWidth = 1.4 * Z;
  const G = 180;
  const gi = Math.floor(cx / G);
  const gj = Math.floor(cy / G);
  for (let i = gi - 6; i <= gi + 6; i++)
    for (let j = gj - 6; j <= gj + 6; j++) {
      const h = hash(i, j);
      if (h > 0.45) continue;
      const bx = i * G + hash(j, i) * G;
      const by = j * G + h * G;
      if (by > NORTH_EDGE - 20 || !v.onScreen(bx, by, 30 * Z)) continue;
      const k = (T * 0.5 + h * 7) % 1;
      v.isoEllipse(bx, by, 3 + k * 9);
      ctx.globalAlpha = 1 - k;
      ctx.stroke();
    }
  ctx.globalAlpha = 1;
}

/** The hazard buoys along the tar ocean's west, north and east edges, those near the screen, for the sorted solids. */
export function tarEdgeBuoys(v: DrawView, cx: number, cy: number): { d: number; f: () => void }[] {
  const out: { d: number; f: () => void }[] = [];
  const near = (x: number, y: number) => Math.hypot(x - cx, y - cy) < 1800;
  const put = (x: number, y: number) => {
    if (!near(x, y) || !v.onScreen(x, y, 40 * v.zoom)) return;
    out.push({ d: x + y, f: () => drawHazardBuoy(v, x, y) });
  };
  for (let y = TAR_SEA.y0; y < TAR_SEA.y1; y += EDGE_BUOY_GAP) {
    put(TAR_SEA.x0, y);
    put(TAR_SEA.x1, y);
  }
  for (let x = TAR_SEA.x0; x <= TAR_SEA.x1; x += EDGE_BUOY_GAP) put(x, TAR_SEA.y0);
  return out;
}

/** A hazard buoy bobbing in the tar: striped yellow and black, a red light on top. */
function drawHazardBuoy(v: DrawView, x: number, y: number): void {
  const { ctx, px, py, T, zoom: Z } = v;
  const bob = Math.sin(T * 1.6 + x * 0.01 + y * 0.013) * 1.5;
  const sx = px(x, y);
  const sy = py(x, y, bob);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  v.isoEllipse(x, y, 10);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? '#1E1C20' : '#F0C544';
    ctx.fillRect(sx - 5 * Z, sy - (6 + i * 5) * Z, 10 * Z, 5 * Z);
  }
  const blink = Math.sin(T * 3 + x) > 0;
  ctx.fillStyle = blink ? '#FF5A4A' : '#7A2A24';
  ctx.beginPath();
  ctx.arc(sx, sy - 28 * Z, 2.6 * Z, 0, Math.PI * 2);
  ctx.fill();
}

/** The berth at the tar dock, on the bridge's back: a green ring where the chemistry boat goes in. */
export function drawBerth(v: DrawView): void {
  const { ctx, T, zoom: Z } = v;
  ctx.strokeStyle = `rgba(110,230,140,${0.45 + 0.25 * Math.sin(T * 3)})`;
  ctx.lineWidth = 2.5 * Z;
  v.isoEllipse(TAR_BERTH.x, TAR_BERTH.y, 46 + Math.sin(T * 3) * 3);
  ctx.stroke();
}

/** The jetty from the tar dock, on the bridge's back, out to the berth: planks on posts, for the sorted solids. */
export function tarJetty(v: DrawView): { d: number; f: () => void } {
  const x = METAL_BRIDGE.x;
  const y0 = TAR_BERTH.y + 36;
  const y1 = METAL_BRIDGE.face - METAL_BRIDGE.depth;
  return {
    d: x + y0,
    f: () => {
      for (let y = y0; y < y1; y += 40)
        for (const dx of [-9, 7]) v.box(x + dx, y, 3, 3, -4, 6, '#3A2414', '#5A3A22');
      v.box(x - 10, y0, 20, y1 - y0, 6, 9, '#6A4426', '#8A5E36');
    },
  };
}

/** The chemistry boat's own things, on top of a hull drawn as the flagship's is: a flask and a puffing chimney. */
export function drawChemTop(v: DrawView, b: { x: number; y: number; h: number }): void {
  const { ctx, px, py, T, zoom: Z } = v;
  const c = Math.cos(b.h);
  const s = Math.sin(b.h);
  const at = (lx: number, ly: number): [number, number] => [
    b.x + lx * c - ly * s,
    b.y + lx * s + ly * c,
  ];
  const bob = Math.sin(T * 2.1 + b.x * 0.01) * 1.3;
  // The flask, aft of the cabin: a round green bottle with a neck and a cork.
  const [fx, fy] = at(-16, 0);
  const fsx = px(fx, fy);
  const fsy = py(fx, fy, 12 + bob);
  ctx.fillStyle = 'rgba(120,230,140,.85)';
  ctx.beginPath();
  ctx.arc(fsx, fsy - 5 * Z, 5.5 * Z, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(220,255,230,.7)';
  ctx.fillRect(fsx - 1.6 * Z, fsy - 14 * Z, 3.2 * Z, 5 * Z);
  ctx.fillStyle = '#8A5E36';
  ctx.fillRect(fsx - 1.8 * Z, fsy - 16 * Z, 3.6 * Z, 2.4 * Z);
  // The chimney at the stern, and its green bubbles drifting up and away.
  const [kx, ky] = at(-26, 0);
  const ksx = px(kx, ky);
  const ksy = py(kx, ky, 12 + bob);
  ctx.fillStyle = '#5A6468';
  ctx.fillRect(ksx - 2.4 * Z, ksy - 16 * Z, 4.8 * Z, 16 * Z);
  for (let i = 0; i < 3; i++) {
    const k = (T * 0.6 + i / 3) % 1;
    ctx.fillStyle = `rgba(120,240,150,${0.7 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(
      ksx + Math.sin(k * 6 + i) * 3 * Z,
      ksy - (18 + k * 22) * Z,
      (1.6 + k * 2.4) * Z,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/** The chemistry boat's hull and cabin, in the look the flagship's drawing takes: white with a green stripe. */
export const CHEM_LOOK = {
  scale: 1.2,
  tier: 0,
  hull: '#F2F4F2',
  trim: '#3FA34D',
  deck: '#DCE8DC',
  cabin: '#EEF3EE',
  roof: '#3FA34D',
  mast: '#8A9488',
  flag: '#3FA34D',
} as const;
