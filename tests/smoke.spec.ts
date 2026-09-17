/**
 * Smoke test for Net Profit.
 *
 * Drives the real game at phone size through the window.__np debug hook:
 *   1. core loop  - sail to a sardine school, fill the hold, return, sell
 *   2. range gate - a dinghy is held inside its range ring
 *   3. day cycle  - dawn spawns a sparkle rare; night activates glowing schools
 *
 * Ported from the prototype smoke_test.py. Timings and thresholds are the
 * same so the port can be checked against legacy/net-profit.html.
 */
import { type BrowserContext, expect, type Page, test } from '@playwright/test';

/** The slice of window.__np the smoke test touches. */
type Np = {
  boat: { x: number; y: number; h: number; v: number };
  keys: 'drive' | 'point';
  schools: { cx: number; cy: number }[];
  DOCK: { x: number; y: number };
  rare: { on: boolean };
  hold: number;
  coins: number;
  clock: number;
  phase: string;
};

declare global {
  interface Window {
    __np: Np;
  }
}

/** Joystick anchor in CSS pixels at 390x780. */
const CX = 195;
const CY = 420;

/** World centre and dinghy range, from the tuning tables. */
const ISLAND = 2400;
const DINGHY_RANGE = 1150;

/** Seed a save, load the game, press Go, and return the page-error log. */
async function boot(context: BrowserContext, page: Page, save: Record<string, unknown>) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await context.addInitScript((s: string) => {
    try {
      // Seed once; a reload inside a test must keep what the game saved.
      if (!localStorage.getItem('netprofit.v1')) localStorage.setItem('netprofit.v1', s);
    } catch {
      // Storage can be unavailable in some contexts; the game copes.
    }
  }, JSON.stringify(save));
  await page.goto('./');
  await page.waitForTimeout(400);
  await page.click('#go');
  return errors;
}

/**
 * Point the joystick at a world position. Returns the remaining distance.
 * The wobble alternates a sideways offset so the net sweeps through a school
 * instead of parking in its middle.
 */
async function steerTo(page: Page, tx: number, ty: number, wobble = 0, i = 0) {
  const [bx, by] = await page.evaluate((): [number, number] => [
    window.__np.boat.x,
    window.__np.boat.y,
  ]);
  const dx = tx - bx + (i % 20 < 10 ? wobble : -wobble);
  const dy = ty - by + (i % 14 < 7 ? wobble : -wobble);
  // World to screen direction (isometric, 2:1).
  const sx = dx - dy;
  const sy = (dx + dy) / 2;
  const n = Math.hypot(sx, sy) || 1;
  await page.mouse.move(CX + (sx / n) * 60, CY + (sy / n) * 60);
  return Math.hypot(dx, dy);
}

test('core loop: fill the hold at a sardine school, dock, sell', async ({ context, page }) => {
  const errors = await boot(context, page, { muted: true });
  const [sx, sy] = await page.evaluate((): [number, number] => {
    const s = window.__np.schools[0];
    if (!s) throw new Error('no schools');
    return [s.cx, s.cy];
  });

  await page.mouse.move(CX, CY);
  await page.mouse.down();
  let hold = 0;
  for (let i = 0; i < 80 && hold < 12; i++) {
    await steerTo(page, sx, sy, 40, i);
    await page.waitForTimeout(150);
    hold = await page.evaluate(() => window.__np.hold);
  }
  expect(hold, 'hold never filled').toBeGreaterThanOrEqual(12);

  const [dx, dy] = await page.evaluate((): [number, number] => [
    window.__np.DOCK.x + 15,
    window.__np.DOCK.y + 45,
  ]);
  for (let i = 0; i < 80; i++) {
    if ((await steerTo(page, dx, dy)) < 40) break;
    await page.waitForTimeout(150);
  }
  await page.mouse.up();
  await page.waitForTimeout(1800);

  expect(await page.evaluate(() => window.__np.hold), 'catch was not sold').toBe(0);
  expect(await page.evaluate(() => window.__np.coins), 'no coins earned').toBeGreaterThanOrEqual(
    12,
  );
  expect(errors).toEqual([]);
});

test('range gate: a dinghy is held inside its range ring', async ({ context, page }) => {
  const errors = await boot(context, page, { muted: true });
  await page.evaluate(
    ([x, y]) => {
      window.__np.boat.x = x;
      window.__np.boat.y = y;
    },
    [ISLAND + DINGHY_RANGE - 50, ISLAND] as const,
  );

  await page.mouse.move(CX, CY);
  await page.mouse.down();
  await page.mouse.move(CX + 55, CY + 28);
  await page.waitForTimeout(4000);

  const d = await page.evaluate(
    (c) => Math.hypot(window.__np.boat.x - c, window.__np.boat.y - c),
    ISLAND,
  );
  expect(d, `dinghy escaped its range: ${d.toFixed(0)}`).toBeLessThanOrEqual(DINGHY_RANGE + 1);
  expect(errors).toEqual([]);
});

test('day cycle: dawn spawns a rare, night follows', async ({ context, page }) => {
  const errors = await boot(context, page, { muted: true });

  await page.evaluate(() => {
    window.__np.clock = 0.999;
  });
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__np.phase)).toBe('Dawn');
  expect(await page.evaluate(() => window.__np.rare.on), 'no rare at dawn').toBe(true);

  await page.evaluate(() => {
    window.__np.clock = 0.8;
  });
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__np.phase)).toBe('Night');
  expect(errors).toEqual([]);
});

test('keyboard: drive mode steers the hull, point mode aims it', async ({ context, page }) => {
  const errors = await boot(context, page, { muted: true });
  // Drive, the default: W holds the heading and builds speed, D turns to starboard, S brakes.
  const h0 = await page.evaluate(() => window.__np.boat.h);
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  const afterW = await page.evaluate(() => ({ v: window.__np.boat.v, h: window.__np.boat.h }));
  expect(afterW.v, 'W did not drive').toBeGreaterThan(80);
  expect(Math.abs(afterW.h - h0), 'W alone turned the hull').toBeLessThan(0.01);
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  const afterD = await page.evaluate(() => window.__np.boat.h);
  expect(afterD - afterW.h, 'D did not turn to starboard').toBeGreaterThan(0.5);
  await page.keyboard.up('d');
  await page.keyboard.up('w');
  await page.keyboard.down('s');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__np.boat.v), 'S did not brake').toBeLessThan(
    afterW.v * 0.5,
  );
  await page.keyboard.up('s');
  // Point: W aims the hull at screen-up and it goes; the button reflects the switch.
  await page.evaluate(() => {
    window.__np.keys = 'point';
  });
  expect(await page.locator('#keys').textContent()).toContain('point');
  const hBefore = await page.evaluate(() => window.__np.boat.h);
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  const afterPoint = await page.evaluate(() => ({ v: window.__np.boat.v, h: window.__np.boat.h }));
  await page.keyboard.up('w');
  expect(afterPoint.v, 'point mode did not move').toBeGreaterThan(40);
  expect(Math.abs(afterPoint.h - hBefore), 'point mode did not aim the hull').toBeGreaterThan(0.3);
  expect(errors).toEqual([]);
});

test('trip: hold, position and clock survive the tab being discarded', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true });
  const [sx, sy] = await page.evaluate((): [number, number] => {
    const s = window.__np.schools[0];
    if (!s) throw new Error('no schools');
    return [s.cx, s.cy];
  });

  await page.mouse.move(CX, CY);
  await page.mouse.down();
  let hold = 0;
  for (let i = 0; i < 80 && hold < 6; i++) {
    await steerTo(page, sx, sy, 40, i);
    await page.waitForTimeout(150);
    hold = await page.evaluate(() => window.__np.hold);
  }
  await page.mouse.up();
  expect(hold, 'hold never filled').toBeGreaterThanOrEqual(6);
  // Let the boat coast to a stop so the net cannot catch anything more.
  await page.waitForFunction(() => window.__np.boat.v < 1);
  await page.evaluate(() => {
    window.__np.clock = 0.42;
  });

  // What a phone does right before it discards the tab.
  const before = await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { get: () => 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    return { x: window.__np.boat.x, y: window.__np.boat.y, hold: window.__np.hold };
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => ({
    x: window.__np.boat.x,
    y: window.__np.boat.y,
    hold: window.__np.hold,
    clock: window.__np.clock,
  }));
  expect(after.hold, 'hold was lost').toBe(before.hold);
  expect(Math.hypot(after.x - before.x, after.y - before.y), 'boat moved').toBeLessThan(40);
  expect(after.clock, 'clock was lost').toBeGreaterThan(0.41);
  expect(after.clock).toBeLessThan(0.45);
  expect(errors).toEqual([]);
});
