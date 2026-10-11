/**
 * The app icon, drawn here and written out at every size the game needs: a fishing boat riding
 * the waves at night under a full moon, a buoy beside it, its cabin lit, and a big cream fish in
 * the deep below, in the sea chart's colours. The owner picked the night one of three (dusk, day,
 * night) on 2026-10-11; it is already dark, so a phone's dark icon look changes it least.
 *
 * The icons fill the square, with no transparent corners: the phone rounds them itself, and fills
 * anything see-through with black. A browser tab gets a simpler, closer crop (`public/icon.svg`
 * and the 32px PNG), since the whole scene is mush at 16px.
 *
 * Run `node scripts/icons.mjs` after changing the drawing; it rewrites the files in public/. It
 * draws with Playwright's Chromium; CHROMIUM=/path/to/chrome points it at another.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const W = 1024;
/** The waterline. */
const SEA = 520;

const INK = '#12303A';
const CREAM = '#FFF6E5';
const BUOY = '#E4572E';
const BUOY_DARK = '#A3332A';
const COIN = '#FFC53D';
const FOAM = '#CFE8EC';
const FISH_SIDE = '#E8D8BC';

/** A row of rounded waves across the icon: crest at y, amplitude a, wavelength l, shifted by s. */
function waves(y, a, l, s, bottom) {
  let d = `M ${-l + s} ${bottom} L ${-l + s} ${y}`;
  for (let x = -l + s; x < W + l; x += l)
    d += ` Q ${x + l / 4} ${y - a} ${x + l / 2} ${y} Q ${x + (3 * l) / 4} ${y + a} ${x + l} ${y}`;
  return `${d} L ${W + l} ${bottom} Z`;
}

const STARS = [
  [150, 120, 5],
  [300, 70, 7],
  [820, 110, 9],
  [900, 250, 5],
  [700, 60, 7],
  [220, 260, 9],
  [620, 190, 5],
];

/** The icon as SVG; small: the closer, plainer crop for a browser tab. */
export function icon(small = false) {
  const full = !small;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${small ? '150 140 760 760' : `0 0 ${W} ${W}`}" width="${W}" height="${W}">
  <title>Net Profit</title>
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B2F3B"/><stop offset=".55" stop-color="#134A57"/><stop offset="1" stop-color="#1B6676"/></linearGradient>
    <linearGradient id="sea" x1="0" y1="${SEA}" x2="0" y2="${W}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#155868"/><stop offset=".2" stop-color="#0F4A59"/><stop offset=".65" stop-color="#0B2F3B"/><stop offset="1" stop-color="#041820"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="rgba(255,197,61,.35)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient>
    <clipPath id="top"><rect x="0" y="0" width="${W}" height="${SEA + 24}"/></clipPath>
    <clipPath id="hull"><path d="M -300 -96 L 330 -140 Q 322 -30 236 40 L -226 40 Q -296 22 -300 -96 Z"/></clipPath>
  </defs>
  <rect width="${W}" height="${W}" fill="#041820"/>
  <rect width="${W}" height="${SEA + 40}" fill="url(#sky)"/>
  ${full ? STARS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${CREAM}" opacity=".8"/>`).join('') : ''}
  <circle cx="790" cy="370" r="140" fill="#F4F7E8"/>
  <path d="${waves(SEA - 18, 14, 170, 40, SEA + 60)}" fill="#1B6676"/>
  ${
    full
      ? `<g transform="translate(118 ${SEA - 20}) rotate(-8)">
    <rect x="-6" y="-150" width="12" height="40" fill="${INK}"/>
    <circle cx="0" cy="-156" r="14" fill="${COIN}"/>
    <path d="M -34 0 L -22 -116 L 22 -116 L 34 0 Z" fill="${BUOY}"/>
    <path d="M -28 -54 L -25 -80 L 25 -80 L 28 -54 Z" fill="${CREAM}"/>
    <rect x="-44" y="-8" width="88" height="22" rx="11" fill="${BUOY_DARK}"/>
  </g>`
      : ''
  }
  <g transform="translate(500 ${SEA - 4}) rotate(-3)">
    <rect x="40" y="-340" width="14" height="260" rx="7" fill="${INK}"/>
    <path d="M 54 -336 Q 120 -330 182 -300 Q 120 -276 54 -262 Z" fill="${COIN}"/>
    <path d="M 88 -300 q 18 -13 38 0 q -20 13 -38 0 Z M 126 -300 l 16 -10 l 0 20 Z" fill="#1B6676"/>
    <rect x="-170" y="-214" width="200" height="140" rx="16" fill="${CREAM}"/>
    <rect x="-188" y="-238" width="236" height="36" rx="12" fill="${INK}"/>
    <rect x="-144" y="-182" width="58" height="54" rx="10" fill="${COIN}"/>
    <rect x="-64" y="-182" width="58" height="54" rx="10" fill="${COIN}"/>
    <g clip-path="url(#hull)">
      <rect x="-320" y="-200" width="680" height="260" fill="${BUOY}"/>
      <path d="M -320 -64 L 360 -112 L 360 -80 L -320 -32 Z" fill="${CREAM}"/>
      <path d="M -320 6 L 360 -42 L 360 80 L -320 80 Z" fill="${BUOY_DARK}"/>
    </g>
    <path d="M -304 -96 L 334 -140" stroke="${INK}" stroke-width="24" stroke-linecap="round"/>
  </g>
  <path d="${waves(SEA, 18, 200, 0, W + 20)}" fill="url(#sea)"/>
  <path d="${waves(SEA, 18, 200, 0, W + 20)}" fill="none" stroke="${FOAM}" stroke-width="14" stroke-linejoin="round" clip-path="url(#top)"/>
  ${full ? `<path d="M 380 560 L 470 560 L 330 1024 L 180 1024 Z M 560 560 L 610 560 L 560 1024 L 470 1024 Z M 700 560 L 780 560 L 900 1024 L 760 1024 Z" fill="rgba(207,232,236,.06)"/>` : ''}
  <ellipse cx="500" cy="790" rx="300" ry="150" fill="url(#glow)"/>
  <g transform="translate(500 790)">
    <path d="M -250 0 Q -140 -118 40 -96 Q 140 -84 190 -30 L 300 -110 Q 270 0 300 110 L 190 30 Q 140 84 40 96 Q -140 118 -250 0 Z" fill="${CREAM}"/>
    <path d="M -250 0 Q -140 118 40 96 Q 140 84 190 30 Q 120 54 20 50 Q -150 44 -250 0 Z" fill="${FISH_SIDE}"/>
    <path d="M -40 -96 Q 20 -150 110 -130 Q 80 -110 70 -88 Z" fill="${FISH_SIDE}"/>
    <circle cx="-150" cy="-22" r="30" fill="${INK}"/>
    <circle cx="-140" cy="-32" r="10" fill="${CREAM}"/>
    <circle cx="-10" cy="-48" r="24" fill="${COIN}"/>
    <circle cx="70" cy="-10" r="19" fill="${COIN}"/>
    <circle cx="10" cy="30" r="14" fill="${COIN}"/>
    <path d="M -100 -60 Q -78 0 -100 60" fill="none" stroke="${FISH_SIDE}" stroke-width="10" stroke-linecap="round"/>
  </g>
  ${
    full
      ? `<circle cx="232" cy="742" r="16" fill="none" stroke="${FOAM}" stroke-width="7" opacity=".7"/>
  <circle cx="196" cy="672" r="10" fill="none" stroke="${FOAM}" stroke-width="6" opacity=".6"/>
  <circle cx="214" cy="616" r="6" fill="${FOAM}" opacity=".5"/>`
      : ''
  }
</svg>
`;
}

/** Each file in public/: its size, and whether it is the tab's crop. */
const PNGS = [
  ['apple-touch-icon.png', 180, false],
  ['favicon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, false],
  ['favicon-32.png', 32, true],
];

const dir = new URL('../public/', import.meta.url);
writeFileSync(new URL('icon.svg', dir), icon(true));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage();
for (const [name, size, small] of PNGS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0">${icon(small).replace(`width="${W}" height="${W}"`, `width="${size}" height="${size}"`)}</body></html>`,
  );
  await page.screenshot({
    path: new URL(name, dir).pathname,
    clip: { x: 0, y: 0, width: size, height: size },
  });
}
await browser.close();
