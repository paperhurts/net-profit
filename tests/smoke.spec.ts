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
  walker: { state: string; x: number; y: number; nearBoat: boolean };
  dogAt: [number, number] | null;
  petted: boolean;
  swallowing: boolean;
  hp: number;
  shallows: { fish: { x: number; y: number }[] };
  masks: number;
  floor: number;
  towerTaken: boolean;
  floors: {
    list: { x: number; y: number }[];
    hit(m: unknown, power: number, fx: number, fy: number): void;
  }[];
  boss: { up: boolean; hit(power: number): void };
  driven: Record<string, number>;
  turtles: { turtles: { x: number; y: number; up: number }[]; companion: unknown };
  turtleSwims: number;
  harpoonTarget: string | null;
  gulper: { resolve: number };
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

  // The shop is open in the dock. A drag on its wood steers the boat straight through it.
  const title = await page.locator('#shop h2').boundingBox();
  if (!title) throw new Error('shop title not visible');
  const tx = title.x + 8;
  const ty = title.y + title.height / 2;
  await page.mouse.move(tx, ty);
  await page.mouse.down();
  await page.mouse.move(tx + 60, ty - 60, { steps: 5 });
  await page.waitForTimeout(500);
  expect(
    await page.evaluate(() => window.__np.boat.v),
    'drag on the shop did not steer',
  ).toBeGreaterThan(20);
  expect(await page.locator('#shop').getAttribute('class')).toContain('steer');
  await page.mouse.up();
  await page.waitForTimeout(100);
  expect(await page.locator('#shop').getAttribute('class')).not.toContain('steer');
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

test('ashore: step off at the dock, pet the dog, walk up the pier onto the island, and back aboard', async ({
  context,
  page,
}) => {
  // Tied up in the dock ring, as a trip saved there comes back.
  const errors = await boot(context, page, {
    muted: true,
    build: 1,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#ashore')).toBeVisible();
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  expect(await page.locator('#shop').getAttribute('class')).not.toContain('open');
  // The way back is not offered under the thumb that lands to start walking.
  await expect(page.locator('#aboard')).toBeHidden();

  // The dog comes to say hello; a tap on it pets it.
  await page.waitForTimeout(3000);
  const dog = await page.evaluate(() => window.__np.dogAt);
  if (!dog) throw new Error('no dog');
  await page.mouse.click(dog[0], dog[1]);
  expect(await page.evaluate(() => window.__np.petted), 'the tap did not pet the dog').toBe(true);

  /** Hold the stick in a world direction. */
  const stick = async (wx: number, wy: number) => {
    const sx = wx - wy;
    const sy = (wx + wy) / 2;
    const n = Math.hypot(sx, sy);
    await page.mouse.move(CX, CY);
    await page.mouse.down();
    await page.mouse.move(CX + (sx / n) * 60, CY + (sy / n) * 60, { steps: 3 });
  };
  // Up the pier, past the crates, onto the sand.
  await stick(-1, 0);
  await page.waitForTimeout(2600);
  await page.mouse.up();
  const there = await page.evaluate(() => window.__np.walker.x);
  expect(there, 'did not walk up the pier onto the island').toBeLessThan(ISLAND + 200);

  // And back down it to the boat.
  await stick(1, 0);
  await page.waitForFunction(() => window.__np.walker.nearBoat, null, { timeout: 6000 });
  await page.mouse.up();
  await expect(page.locator('#aboard')).toBeVisible();
  await page.click('#aboard');
  await page.waitForFunction(() => window.__np.walker.state === 'aboard', null, { timeout: 2000 });
  await expect(page.locator('#shop')).toHaveClass(/open/);
  expect(errors).toEqual([]);
});

test('shop: the shipwright keeps the spear back until island 2 is found', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 900,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  await page.waitForTimeout(300);
  await expect(page.locator('#gear [data-g]').first()).toBeAttached();
  await expect(page.locator('#gear [data-s]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('island 2: sell at the trading post and step ashore on its sand', async ({
  context,
  page,
}) => {
  // A flagship already out in the deep by island 2, with mahi-mahi in the hold.
  const hold = new Array(14).fill(0);
  hold[12] = 6;
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -600 + 330 * Math.SQRT1_2, y: 5400 - 330 * Math.SQRT1_2, h: 2.36, clock: 0.3, hold },
  });
  await page.waitForFunction(() => window.__np.hold === 0, null, { timeout: 4000 });
  expect(
    await page.evaluate(() => window.__np.coins),
    'the trading post paid nothing',
  ).toBeGreaterThan(100);
  // Found, island 2 brings the spear into the shipwright's shop.
  await expect(page.locator('#gear [data-s]')).toHaveCount(1);
  await expect(page.locator('#ashore')).toBeVisible();
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const at = await page.evaluate(() => [window.__np.walker.x, window.__np.walker.y]);
  expect(Math.hypot((at[0] ?? 0) + 600, (at[1] ?? 0) - 5400), 'not on island 2').toBeLessThan(230);
  expect(errors).toEqual([]);
});

test('turtles: one swims alongside a boat that comes up slowly, and the log counts it', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 3, hold: 3, engine: 3 },
    trip: { x: 2400 + 700, y: 2400, h: Math.PI / 2, clock: 0.3, hold: new Array(14).fill(0) },
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const np = window.__np;
    const t = np.turtles.turtles[0];
    if (!t) throw new Error('no turtles');
    t.x = np.boat.x + 40;
    t.y = np.boat.y + 90;
    t.up = 1;
  });
  await page.waitForFunction(() => window.__np.turtleSwims === 1, null, { timeout: 4000 });
  expect(await page.evaluate(() => !!window.__np.turtles.companion)).toBe(true);
  await expect(page.locator('#log')).toContainText('Turtle swims 1');
  expect(errors).toEqual([]);
});

test('flag: design one in the shop and the boat flies it', async ({ context, page }) => {
  const errors = await boot(context, page, {
    muted: true,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#flagBtn')).toBeVisible();
  await page.click('#flagBtn');
  await expect(page.locator('#flagger')).toBeVisible();
  await page.click('#fEmblem button:nth-child(4)');
  await page.click('#fField button:nth-child(9)');
  await page.click('#flagDone');
  await expect(page.locator('#flagger')).toBeHidden();
  const flag = await page.evaluate(
    () => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').flag,
  );
  expect(flag).toEqual({ field: 8, accent: 1, pattern: 0, emblem: 3 });
  expect(errors).toEqual([]);
});

test('health: the gulper eats a boat that sits still, and spits it out at home without its catch', async ({
  context,
  page,
}) => {
  const hold = new Array(14).fill(0);
  hold[12] = 20;
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 4800 + 900, y: 2700, h: Math.PI, clock: 0.3, hold },
  });
  await expect(page.locator('#hull')).toBeVisible();
  await page.waitForFunction(() => window.__np.swallowing, null, { timeout: 20000 });
  await page.waitForFunction(() => !window.__np.swallowing, null, { timeout: 4000 });
  const after = await page.evaluate(() => ({
    hold: window.__np.hold,
    x: window.__np.boat.x,
    y: window.__np.boat.y,
    hp: window.__np.hp,
  }));
  expect(after.hold, 'the catch came back with the boat').toBe(0);
  expect(Math.hypot(after.x - 2400, after.y - 2400), 'not spat out at home').toBeLessThan(700);
  expect(after.hp).toBe(100);
  expect(errors).toEqual([]);
});

test('harpoon: the gulper comes up, the button fires the harpoon, and driven off it pays and leaves a tooth', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    lv: { net: 5, hold: 5, engine: 5 },
    spear: 4,
    trip: { x: 4800 + 900, y: 2700, h: Math.PI, clock: 0.3, hold: new Array(14).fill(0) },
  });
  await page.waitForFunction(() => window.__np.harpoonTarget === 'gulper', null, {
    timeout: 20000,
  });
  const fire = page.locator('#throw');
  await expect(fire).toBeVisible();
  await expect(fire).toHaveClass(/harpoon/);
  await expect(fire).toHaveAttribute('aria-label', 'Fire the harpoon');
  await fire.click();
  await page.waitForFunction(() => window.__np.gulper.resolve < 4, null, { timeout: 3000 });
  // One more hit drives it off: the unit tests play the whole fight.
  await page.evaluate(() => {
    window.__np.gulper.resolve = 1;
  });
  await page.waitForTimeout(1300);
  await page.waitForFunction(() => window.__np.harpoonTarget === 'gulper', null, { timeout: 3000 });
  await fire.click();
  await page.waitForFunction(() => window.__np.driven.gulper === 1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(1000);
  await expect(page.locator('#log')).toContainText('Gulper tooth');
  expect(errors).toEqual([]);
});

test('spear: ashore on island 2, a parrotfish in range brings the throw button, and a throw pays', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    spear: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Stand on the sand straight in from a fish.
  await page.evaluate(() => {
    const f = window.__np.shallows.fish[0];
    if (!f) return;
    const a = Math.atan2(f.y - 5400, f.x + 600);
    window.__np.walker.x = -600 + Math.cos(a) * 214;
    window.__np.walker.y = 5400 + Math.sin(a) * 214;
  });
  await expect(page.locator('#throw')).toBeVisible();
  const before = await page.evaluate(() => window.__np.coins);
  await page.click('#throw');
  await page.waitForFunction((c) => window.__np.coins > c, before, { timeout: 2000 });
  expect(errors).toEqual([]);
});

test('monkeys: a barbed spear beats a skull-mask monkey and its mask is kept', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = -600 - 115 + 70;
    window.__np.walker.y = 5400 + 105 - 30;
  });
  await expect(page.locator('#hearts')).toBeVisible();
  await expect(page.locator('#throw')).toBeVisible();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.masks > 0, null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('tower: in at the door, up both floors, beat the sorcerer, and the tower is taken', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // To the tower's door.
  await page.evaluate(() => {
    window.__np.walker.x = -590 + 46 * Math.SQRT1_2;
    window.__np.walker.y = 5410 + 46 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 0);
  for (const f of [0, 1]) {
    // Beat the floor, step onto its stairs, climb.
    await page.evaluate((i) => {
      const fl = window.__np.floors[i];
      if (!fl) return;
      for (const m of fl.list) fl.hit(m, 9, m.x + 50, m.y);
      window.__np.walker.x = -6000 - 130 * 0.6 * Math.SQRT1_2;
      window.__np.walker.y = (i ? -6900 : -6000) - 130 * 0.6 * Math.SQRT1_2;
    }, f);
    await expect(page.locator('#climb')).toBeVisible();
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, f + 1);
  }
  await page.waitForFunction(() => window.__np.boss.up, null, { timeout: 3000 });
  await page.evaluate(() => window.__np.boss.hit(99));
  await page.waitForFunction(() => window.__np.towerTaken, null, { timeout: 4000 });
  await expect(page.locator('#leave')).toHaveText('Back to the boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.walker.state === 'aboard');
  expect(errors).toEqual([]);
});
