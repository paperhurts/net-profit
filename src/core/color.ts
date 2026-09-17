/** Colour helpers moved verbatim from the prototype script. Hex in, CSS out. */

const channel = (hex: string, at: number): number => Number.parseInt(hex.slice(at, at + 2), 16);

/** A #rrggbb colour as rgba() with the given alpha. */
export function rgba(hex: string, a: number): string {
  return `rgba(${channel(hex, 1)},${channel(hex, 3)},${channel(hex, 5)},${a})`;
}

const shadeCache = new Map<string, string>();

/**
 * A #rrggbb colour darkened (f below 1, multiplied) or lightened (f above 1,
 * blended toward white). Cached per colour and factor; the extruder calls it
 * for every face every frame.
 */
export function shade(hex: string, f: number): string {
  const key = hex + f.toFixed(2);
  const cached = shadeCache.get(key);
  if (cached) return cached;
  let r = channel(hex, 1);
  let g = channel(hex, 3);
  let b = channel(hex, 5);
  if (f <= 1) {
    r *= f;
    g *= f;
    b *= f;
  } else {
    const m = f - 1;
    r += (255 - r) * m;
    g += (255 - g) * m;
    b += (255 - b) * m;
  }
  const v = `rgb(${r | 0},${g | 0},${b | 0})`;
  shadeCache.set(key, v);
  return v;
}
