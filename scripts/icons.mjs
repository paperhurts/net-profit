/**
 * The app icon, cut to every size the game needs from the picture the owner and her kid made for
 * it together (art/app-icon-source.png, 2026-10-11): a white and red boat on bright blue waves, a
 * buoy beside it, and three fish in the deep below.
 *
 * The picture draws its own rounded tile on white. A phone rounds an icon's corners itself and
 * fills anything see-through with black, so the icons here are the tile cut square, its corners
 * filled with the blue just inside each one. The maskable icon is the same: the boat and the fish
 * sit well inside Android's crop circle, and the tightest crop takes only a sliver of the buoy's
 * ripple. (Mirroring the edges out to pad it copied half the buoy onto the rim.)
 *
 * Run `node scripts/icons.mjs` after changing the picture; it rewrites the icons in public/. It
 * works in Playwright's Chromium; CHROMIUM=/path/to/chrome points it at another.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const SOURCE = new URL('../art/app-icon-source.png', import.meta.url);
const PUBLIC = new URL('../public/', import.meta.url);
/** Each icon: its file and its size. */
const ICONS = [
  ['apple-touch-icon.png', 180],
  ['favicon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['favicon-32.png', 32],
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage();
const out = await page.evaluate(
  async ({ src, icons }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0);
    const all = x.getImageData(0, 0, c.width, c.height).data;
    const at = (i, j) => (j * c.width + i) * 4;
    const tile = (i, j) => all[at(i, j)] < 90; // the tile is all blues, its ground white
    // The tile's square, two pixels in from its edges to leave their soft white rim behind.
    const my = c.height >> 1;
    const mx = c.width >> 1;
    let l = 0;
    let t = 0;
    let r = c.width - 1;
    let b = c.height - 1;
    while (!tile(l, my)) l++;
    while (!tile(r, my)) r--;
    while (!tile(mx, t)) t++;
    while (!tile(mx, b)) b--;
    const n = Math.min(r - l, b - t) - 4;
    const sq = document.createElement('canvas');
    sq.width = sq.height = n;
    const s = sq.getContext('2d', { willReadFrequently: true });
    s.drawImage(c, l + 2, t + 2, n, n, 0, 0, n, n);
    // Each row's corners, outside the drawn curve, take the colour just inside it.
    const im = s.getImageData(0, 0, n, n);
    const d = im.data;
    const blue = (i, j) => d[(j * n + i) * 4] < 90;
    const copy = (from, to) => {
      for (let k = 0; k < 4; k++) d[to + k] = d[from + k];
    };
    for (let j = 0; j < n; j++) {
      let a = 0;
      while (a < n && !blue(a, j)) a++;
      if (a === n) continue;
      let z = n - 1;
      while (!blue(z, j)) z--;
      const left = (j * n + Math.min(a + 3, z)) * 4;
      const right = (j * n + Math.max(z - 3, a)) * 4;
      for (let i = 0; i < a + 3 && i < n; i++) copy(left, (j * n + i) * 4);
      for (let i = n - 1; i > z - 3 && i >= 0; i--) copy(right, (j * n + i) * 4);
    }
    s.putImageData(im, 0, 0);
    // Then each size, drawn down in halves so the small ones stay crisp.
    const result = {};
    for (const [name, size] of icons) {
      let from = sq;
      while (from.width / 2 >= size * 1.5) {
        const h = document.createElement('canvas');
        h.width = h.height = Math.round(from.width / 2);
        const hx = h.getContext('2d');
        hx.imageSmoothingQuality = 'high';
        hx.drawImage(from, 0, 0, h.width, h.height);
        from = h;
      }
      const o = document.createElement('canvas');
      o.width = o.height = size;
      const ox = o.getContext('2d');
      ox.imageSmoothingQuality = 'high';
      ox.drawImage(from, 0, 0, size, size);
      result[name] = o.toDataURL('image/png').split(',')[1];
    }
    return result;
  },
  {
    src: `data:image/png;base64,${readFileSync(SOURCE).toString('base64')}`,
    icons: ICONS,
  },
);
await browser.close();
for (const [name, b64] of Object.entries(out))
  writeFileSync(new URL(name, PUBLIC), Buffer.from(b64, 'base64'));
