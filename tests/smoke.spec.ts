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
  schools: { cx: number; cy: number; sp: number; r: number }[];
  DOCK: { x: number; y: number };
  rare: { on: boolean };
  hold: number;
  coins: number;
  clock: number;
  phase: string;
  walker: {
    state: string;
    x: number;
    y: number;
    nearBoat: boolean;
    sink: number;
    dock: { landing: { x: number; y: number } };
  };
  dogAt: [number, number] | null;
  petted: boolean;
  swallowing: boolean;
  swallow(by: string): void;
  bases: Record<string, number>;
  BASES: { spit: { x: number; y: number }; dock: { x: number; y: number; r: number } }[];
  seine: { state: string };
  pots: { x: number; y: number; crabs: number }[];
  diving: boolean;
  diver: { x: number; y: number; vx: number; vy: number; air: number; face: number };
  trenchSh: {
    kind: string;
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    ph: number;
    pace: number;
  }[];
  diveT: number;
  diveAim: { si: number } | null;
  trenchSeen: boolean;
  trenchDeep: number;
  haulLeft: number;
  hp: number;
  shallows: { fish: { x: number; y: number }[] };
  masks: number;
  floor: number;
  towerTaken: boolean;
  isle3Seen: boolean;
  isle3Stage: number;
  boss3: { up: boolean; hit(power: number): void };
  swordsman: { up: boolean; state: string; hit(power: number): boolean };
  demons: { up: boolean; state: string; hit(power: number): boolean }[];
  warlock: { shown: boolean; x: number; y: number; hearts: number; bolts: unknown[] };
  wboat: { free: boolean; x: number; y: number; catches: number };
  cine: { t: number } | null;
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
  serpent: { state: string; resolve: number };
  armour: number;
  maxHearts: number;
  sailedShare: number;
  mapOpen: boolean;
  lionSeen: boolean;
  netCut: boolean;
  mending: boolean;
  lionCaught: number;
  aquarium: boolean;
  nagaFree: boolean;
  isle8Seen: boolean;
  hiredBoats: {
    here: boolean;
    chasing: boolean;
    boats: { x: number; y: number; state: string }[];
  };
  hired8: {
    home: { x: number; y: number };
    list: unknown[];
    hit(m: unknown, power: number, fx: number, fy: number): void;
  };
  hired9: { list: { state: string; back: number }[] };
  BAR: { x0: number; x1: number; y0: number; y1: number };
  DOOR9: { x: number; y: number };
  DOOR8: { x: number; y: number };
  heronStage: number;
  heron9: { up: boolean; hp: number; shielded: boolean; hit(power: number): void };
  nest: { up: boolean; state: string; hit(power: number): void };
  nestHorde: { list: { state: string }[] };
  necroPal: { shown: boolean; free: boolean };
  otter: { state: string; fed: number; free: boolean; reason: string | null };
  tapOtter(): void;
  heron: {
    up: boolean;
    hp: number;
    state: string;
    copies: { pop: number }[];
    hit(power: number): void;
  };
  NAGA_CAGE: { x: number; y: number; r: number };
  naga: { shown: boolean; swimming: boolean; x: number; y: number };
  AQUARIUM: { x0: number; y0: number; x1: number; y1: number };
  tankView: { fish: unknown[]; eaten: number };
  rod: { state: string };
  gear: { mesh: boolean; strongbox: boolean; suit: boolean };
  anchorer: { state: string; up: boolean; hit(power: number): void };
  tarling: { with: boolean; free: boolean };
  isle4Stage: number;
  isle5Seen: boolean;
  isle5Stage: number;
  isle6Seen: boolean;
  chests6: number;
  CHESTS6: [number, number][];
  isle6Stage: number;
  isle7Seen: boolean;
  isle7Stage: number;
  portalOpen: number;
  monkeys7: { list: { state: string }[] };
  monkeys: { list: unknown[]; hit(m: unknown, power: number, fx: number, fy: number): void };
  boss7: { up: boolean; hp: number; hit(power: number): void };
  roofMonkeys: { list: { state: string }[] };
  hordes: Record<
    number,
    {
      list: { x: number; y: number; guard: boolean; kind: string; state: string }[];
      cleared: boolean;
      hit(u: unknown, power: number, fx: number, fy: number): boolean;
    }
  >;
  forgotten: { up: boolean; state: string; hit(power: number): void };
  allies: { list: { kind: string }[] };
  bonesPal: { shown: boolean; free: boolean };
  lancers: { list: { state: string }[] };
  oldOne: { state: string; up: boolean; hit(power: number): boolean };
  soulArmour: boolean;
  deep: { fighting: boolean; state: string; resolve: number };
  cth: { state: string; hit(power: number): void };
  cat: { shown: boolean; heals: number; x: number; y: number };
  warrior: { shown: boolean };
  catAt: [number, number] | null;
  king: { fighting: boolean; state: string; resolve: number };
  fireHarpoon(): void;
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

test('armour: once there is a spear the shipwright sells leather armour, and it is a fourth heart', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 2000,
    isle2Seen: true,
    spear: 1,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  const card = page.locator('#gear [data-a]');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Leather armour');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.armour === 1, null, { timeout: 2000 });
  expect(await page.evaluate(() => [window.__np.maxHearts, window.__np.coins])).toEqual([4, 800]);
  // Next on the shelf: diamond.
  await expect(card).toContainText('Diamond armour');
  expect(errors).toEqual([]);
});

test('the sea map: sailing opens the fog, the map shows it, and the game waits while it is open', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 4000, y: 2400, h: 0, clock: 0.3, hold: [] },
  });
  // The boat opens the water round it on its first frame under way, which may come after Cast off returns.
  await page.waitForFunction(() => window.__np.sailedShare > 0, null, { timeout: 3000 });
  const before = await page.evaluate(() => window.__np.sailedShare);
  // Sail east a while: more of the sea is open.
  await page.evaluate(() => {
    window.__np.boat.v = 300;
  });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => window.__np.sailedShare);
  expect(after).toBeGreaterThan(before);
  await page.locator('#mapBtn').click();
  await expect(page.locator('#seamap')).toBeVisible();
  await expect(page.locator('#mapNote')).toContainText('of the sea');
  // While it is open, nothing moves.
  const at = await page.evaluate(() => [window.__np.boat.x, window.__np.boat.y]);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => [window.__np.boat.x, window.__np.boat.y])).toEqual(at);
  await page.locator('#mapClose').click();
  await expect(page.locator('#seamap')).toBeHidden();
  expect(errors).toEqual([]);
});

test('the aquarium: built at the shop, walked up to ashore, and its fish eat what is dropped in', async ({
  context,
  page,
}) => {
  // Tied up at home with the tree platform built, wood and coins to spare, and three kinds caught.
  const log = new Array(16).fill(0);
  log[0] = 12;
  log[3] = 2;
  log[4] = 1;
  const errors = await boot(context, page, {
    muted: true,
    build: 1,
    coins: 1500,
    wood: 30,
    log,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  const card = page.locator('#aquaBtn');
  await expect(card).toContainText('Build an aquarium');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.aquarium === true, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(500);
  await expect(card).toContainText('3 kinds of fish');
  // Ashore and up to its glass, where it can be looked into.
  await expect(page.locator('#ashore')).toBeVisible();
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    const w = window.__np.walker;
    const A = window.__np.AQUARIUM;
    w.x = A.x1 + 10;
    w.y = (A.y0 + A.y1) / 2;
  });
  await expect(page.locator('#climb')).toHaveText('Look in the aquarium');
  await page.locator('#climb').click();
  await expect(page.locator('#aquarium')).toBeVisible();
  await expect(page.locator('#tankNote')).toContainText('3 kinds of fish');
  // Three sardines, both pufferfish caught, one tuna.
  expect(await page.evaluate(() => window.__np.tankView.fish.length)).toBe(6);
  // The tank fits a phone.
  const box = await page.locator('#tankCanvas').boundingBox();
  if (!box) throw new Error('no tank');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  // While it is open, the game waits.
  const clock = await page.evaluate(() => window.__np.clock);
  // A tap at the very top of the water, over every fish: food, and they eat it.
  await page.mouse.click(box.x + box.width / 2, box.y + 5);
  await page.waitForFunction(() => window.__np.tankView.eaten > 0, null, { timeout: 8000 });
  expect(await page.evaluate(() => window.__np.clock)).toBe(clock);
  await page.locator('#tankClose').click();
  await expect(page.locator('#aquarium')).toBeHidden();
  expect(errors).toEqual([]);
});

test('lionfish: towed through, their spines cut the net, and the mending kit mends it at sea', async ({
  context,
  page,
}) => {
  // A cutter just short of the first group, round the outer sea, with fish aboard and the kit.
  const gx = 2400 + Math.cos(0.8) * 1700;
  const gy = 2400 + Math.sin(0.8) * 1700;
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 3, hold: 3, engine: 3 },
    gear: { kit: true },
    trip: { x: gx - 160, y: gy - 160, h: Math.PI / 4, clock: 0.3, hold: [3, 3] },
  });
  await page.waitForFunction(() => window.__np.lionSeen, null, { timeout: 3000 });
  // Sail through them, holding the stick the way the boat points (straight down the screen).
  await page.mouse.move(195, 600);
  await page.mouse.down();
  await page.mouse.move(195, 700, { steps: 5 });
  await page.waitForFunction(() => window.__np.netCut, null, { timeout: 5000 });
  await page.mouse.up();
  const mend = page.locator('#mend');
  await expect(mend).toBeVisible();
  await page.waitForFunction(() => window.__np.boat.v < 40, null, { timeout: 8000 });
  await mend.click();
  await page.waitForFunction(() => window.__np.mending, null, { timeout: 1000 });
  await page.waitForFunction(() => !window.__np.netCut, null, { timeout: 4000 });
  await expect(mend).toBeHidden();
  expect(errors).toEqual([]);
});

test('the fishing rod: stopped by some lionfish, cast, reel in when the float goes under, and the bounty pays', async ({
  context,
  page,
}) => {
  const gx = 2400 + Math.cos(0.8) * 1700;
  const gy = 2400 + Math.sin(0.8) * 1700;
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    lionSeen: true,
    lv: { net: 3, hold: 3, engine: 3 },
    gear: { rod: true },
    trip: { x: gx - 130, y: gy - 60, h: 0, clock: 0.3, hold: [] },
  });
  const rod = page.locator('#rodcast');
  await expect(rod).toHaveText('Cast for lionfish', { timeout: 3000 });
  await rod.click();
  await expect(rod).toHaveText(/Wait/);
  await page.waitForFunction(() => window.__np.rod.state === 'bite', null, { timeout: 4000 });
  // The button pulses while the float is under; a finger does not wait for it to be still.
  await rod.click({ force: true });
  await page.waitForFunction(() => window.__np.lionCaught === 1, null, { timeout: 1000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(140);
  expect(errors).toEqual([]);
});

test('the lionfish net: towed through them it is not cut, and sweeps them up for the bounty', async ({
  context,
  page,
}) => {
  const gx = 2400 + Math.cos(0.8) * 1700;
  const gy = 2400 + Math.sin(0.8) * 1700;
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    lionSeen: true,
    lv: { net: 3, hold: 3, engine: 3 },
    gear: { lionnet: true },
    trip: { x: gx - 160, y: gy - 160, h: Math.PI / 4, clock: 0.3, hold: [] },
  });
  await page.mouse.move(195, 600);
  await page.mouse.down();
  await page.mouse.move(195, 700, { steps: 5 });
  await page.waitForFunction(() => window.__np.lionCaught > 0, null, { timeout: 5000 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.__np.netCut)).toBe(false);
  expect(await page.evaluate(() => window.__np.coins)).toBeGreaterThanOrEqual(40);
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
  // The ashore message clears the bubbles top right, which are tallest here: hearts, the hull, the time of day.
  await expect(page.locator('#toast')).toHaveClass(/show/);
  const [toastTop, chipsBottom] = await page.evaluate(() => [
    (document.getElementById('toast') as HTMLElement).getBoundingClientRect().top,
    (document.getElementById('rchips') as HTMLElement).getBoundingClientRect().bottom,
  ]);
  expect(toastTop, 'the message covers the bubbles').toBeGreaterThanOrEqual(chipsBottom);
  expect(errors).toEqual([]);
});

test('bases: build a hut on island 2 from its dock, and the boat comes back up there after a sinking nearby', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 2000,
    wood: 40,
    isle2Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  const card = page.locator('#baseBtn');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Build a hut here');
  await card.click();
  // Built, the card goes on to the base's next stage.
  await expect(card).toContainText('Build a gear shed here');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.bases.isle2])).toEqual([500, 1]);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').bases),
  ).toEqual({ isle2: 1, isle3: 0 });
  // Out past island 2's dock, nearer it than home, the boat goes down; it comes back up off that dock.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = -600 + 900 * Math.SQRT1_2;
    b.y = 5400 - 900 * Math.SQRT1_2;
    b.v = 0;
  });
  await page.evaluate(() => window.__np.swallow('log'));
  await page.waitForFunction(() => !window.__np.swallowing, null, { timeout: 4000 });
  const [at, spit] = await page.evaluate(() => [
    [window.__np.boat.x, window.__np.boat.y],
    window.__np.BASES[0]?.spit,
  ]);
  expect(
    Math.hypot((at?.[0] ?? 0) - (spit?.x ?? 0), (at?.[1] ?? 0) - (spit?.y ?? 0)),
    'not off island 2',
  ).toBeLessThan(40);
  await expect(page.locator('#toast')).toContainText('your hut on island 2');
  expect(errors).toEqual([]);
});

test("seining: island 2's gear shed puts a seine aboard, and a loop round a school hauls it in", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 4000,
    wood: 60,
    isle2Seen: true,
    bases: { isle2: 1 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  const card = page.locator('#baseBtn');
  await expect(card).toContainText('Build a gear shed here');
  await card.click();
  await expect(card).toContainText('Your base on island 2');
  expect(await page.evaluate(() => window.__np.bases.isle2)).toBe(2);
  // Out to the parrotfish school farthest from the dock, the boat on a circle round it, going round.
  const sc = await page.evaluate(() => {
    const d = window.__np.BASES[0]?.dock ?? { x: 0, y: 0 };
    let best = { cx: 0, cy: 0, r: 0 };
    let bd = -1;
    for (const s of window.__np.schools) {
      const k = Math.hypot(s.cx - d.x, s.cy - d.y);
      if (s.sp === 13 && k > bd) {
        bd = k;
        best = { cx: s.cx, cy: s.cy, r: s.r };
      }
    }
    return best;
  });
  const R = sc.r + 40;
  const at = (a: number) =>
    page.evaluate(
      ([cx, cy, r, a]) => {
        const b = window.__np.boat;
        b.x = cx + Math.cos(a) * r;
        b.y = cy + Math.sin(a) * r;
        b.h = a + Math.PI / 2;
        b.v = 0;
      },
      [sc.cx, sc.cy, R, a] as const,
    );
  await at(0);
  const button = page.locator('#seineBtn');
  await expect(button).toBeVisible();
  await button.click();
  expect(await page.evaluate(() => window.__np.seine.state)).toBe('out');
  await expect(button).toHaveAttribute('aria-label', 'Haul the seine in');
  for (let i = 1; i <= 140; i++) {
    if ((await page.evaluate(() => window.__np.seine.state)) !== 'out') break;
    await at((i / 120) * Math.PI * 2);
    await page.waitForTimeout(30);
  }
  expect(await page.evaluate(() => window.__np.seine.state)).toBe('stowed');
  await expect(page.locator('#toast')).toContainText('Seine closed round');
  await page.waitForFunction(() => window.__np.haulLeft === 0 && window.__np.hold >= 10, null, {
    timeout: 4000,
  });
  expect(errors).toEqual([]);
});

test("crab pots: island 3's crab shed puts three aboard; one dropped in home water fills with spider crabs that come aboard", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 4000,
    wood: 60,
    isle2Seen: true,
    isle3Seen: true,
    bases: { isle2: 0, isle3: 1 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -600 + 322, y: -600 + 154, h: Math.PI, clock: 0.3, hold: [] },
  });
  const card = page.locator('#baseBtn');
  await expect(card).toContainText('Build a crab shed here');
  await card.click();
  await expect(card).toContainText('Your base on island 3');
  // Home water, stopped: the crab button drops a pot astern.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 3500;
    b.y = 2300;
    b.h = 0;
    b.v = 0;
  });
  const button = page.locator('#potBtn');
  await expect(button).toBeVisible();
  await expect(page.locator('#potN')).toHaveText('3');
  await button.click();
  await page.waitForFunction(() => window.__np.pots.length === 1, null, { timeout: 2000 });
  await expect(page.locator('#potN')).toHaveText('\u2191');
  // Away, and the crabs climb in; back past it, they come aboard.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 3800;
    b.y = 2000;
    const p = window.__np.pots[0];
    if (p) p.crabs = 4;
  });
  await expect(page.locator('#potN')).toHaveText('2');
  // The towed net may land a fish or two on the way, so count from here, and wait for the pot itself to empty.
  const before = await page.evaluate(() => window.__np.hold);
  await page.evaluate(() => {
    const b = window.__np.boat;
    const p = window.__np.pots[0];
    if (!p) return;
    b.x = p.x + 20;
    b.y = p.y;
  });
  await page.waitForFunction(() => window.__np.pots[0]?.crabs === 0, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.hold)).toBeGreaterThanOrEqual(before + 4);
  // Past the buoys, no pots.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 5100;
    b.y = 2300;
  });
  await button.click();
  await expect(page.locator('#toast')).toContainText('No crab pots past the buoys');
  expect(await page.evaluate(() => window.__np.pots.length)).toBe(1);
  expect(errors).toEqual([]);
});

test('the trench: stopped over it with scuba gear, dive; down in the dark, then swim back up to the boat', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#diveBtn')).toBeVisible();
  expect(await page.evaluate(() => window.__np.trenchSeen)).toBe(true);
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  // The sea's own buttons stand down; the way back up shows.
  await expect(page.locator('#mapBtn')).toBeHidden();
  await expect(page.locator('#surfaceBtn')).toBeVisible();
  // The stick swims it down.
  await page.mouse.move(195, 400);
  await page.mouse.down();
  await page.mouse.move(195, 520, { steps: 4 });
  await page.waitForFunction(() => window.__np.diver.y > 150, null, { timeout: 4000 });
  await page.mouse.up();
  // Deep down, then back up on purpose.
  await page.evaluate(() => {
    window.__np.diver.y = 1100;
  });
  await page.waitForTimeout(200);
  await page.click('#surfaceBtn');
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 10000 });
  expect(await page.evaluate(() => window.__np.trenchDeep)).toBeGreaterThan(1000);
  await expect(page.locator('#toast')).toContainText('Back aboard');
  await expect(page.locator('#mapBtn')).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').trenchDeep),
  ).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});

test('spearfishing: down in the trench with a spear, a glow squid in reach is aimed at, and a throw takes it into the hold', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    trenchSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  await expect(page.locator('#throw')).toBeVisible();
  // Just short of the squid, facing them: held there while the aim settles on one.
  const squid = await page.evaluate(() =>
    window.__np.trenchSh.findIndex((s) => s.kind === 'squid'),
  );
  const put = () =>
    page.evaluate((si) => {
      const np = window.__np;
      const s = np.trenchSh[si];
      if (!s) return;
      const a = s.ph + np.diveT * s.pace;
      const d = np.diver;
      d.x = s.cx + Math.sin(a) * s.rx - 80;
      d.y = s.cy + Math.sin(a * 1.7 + 1) * s.ry;
      d.vx = 0;
      d.vy = 0;
      d.face = 1;
    }, squid);
  await put();
  await page.waitForFunction((si) => window.__np.diveAim?.si === si, squid, { timeout: 2000 });
  await put();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.hold >= 1, null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('the trench: without the scuba gear there is no diving, and the game says where to get it', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#toast')).toContainText('scuba gear');
  await page.waitForTimeout(500);
  await expect(page.locator('#diveBtn')).toBeHidden();
  expect(errors).toEqual([]);
});

test('island 3: sell at the floating town, step onto the jetty, walk to the tower door', async ({
  context,
  page,
}) => {
  // A flagship already at the floating town's jetty, with grouper in the hold.
  const hold = new Array(15).fill(0);
  hold[14] = 5;
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 5, hold: 5, engine: 5 },
    isle2Seen: true,
    trip: { x: -600 + 322, y: -600 + 154, h: Math.PI, clock: 0.3, hold },
  });
  await page.waitForFunction(() => window.__np.hold === 0, null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.coins), 'the trader paid nothing').toBeGreaterThan(
    200,
  );
  expect(await page.evaluate(() => window.__np.isle3Seen)).toBe(true);
  await expect(page.locator('#log')).toContainText('Sunken island found');
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const at = await page.evaluate(() => [window.__np.walker.x, window.__np.walker.y]);
  // On the jetty, near its end.
  expect(Math.hypot((at[0] ?? 0) + 334, (at[1] ?? 0) + 456), 'not on the jetty').toBeLessThan(12);
  // Over the planks and the seaweed to the tower's door, where it can be climbed.
  await page.evaluate(() => {
    const w = window.__np.walker;
    w.x = -600 + 37;
    w.y = -600 + 40;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower');
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
  // Black with a skull, the second colour still the first flag's navy.
  expect(flag).toEqual({ field: 8, accent: 3, pattern: 0, emblem: 3 });
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

test('Star, the meteor serpent: over island 6 it dives at the boat, and harpooned in the water it is driven off', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1000, h: Math.PI, clock: 0.3, hold: [] },
  });
  // It comes for the boat, circles, and dives into its ring.
  await page.waitForFunction(() => window.__np.serpent.state === 'hunt', null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('hunting you', { timeout: 3000 });
  await page.waitForFunction(() => window.__np.serpent.state === 'down', null, { timeout: 12000 });
  // One hit from driven off: the unit tests play the whole fight.
  await page.evaluate(() => {
    window.__np.serpent.resolve = 1;
  });
  await page.waitForFunction(() => window.__np.harpoonTarget === 'meteor', null, { timeout: 2000 });
  await page.locator('#throw').click();
  await page.waitForFunction(() => window.__np.driven.meteor === 1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.serpent.state)).toBe('away');
  expect(await page.evaluate(() => window.__np.coins)).toBe(1000);
  await expect(page.locator('#log')).toContainText('Meteor shard');
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

test('the naga: beat the monkey camp and his cage opens; he fights beside you, and swims beside the boat', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
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
  expect(await page.evaluate(() => window.__np.nagaFree)).toBe(false);
  // Beat the whole camp.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const C = window.__np.NAGA_CAGE;
    w.x = C.x + 30;
    w.y = C.y + 30;
    const M = window.__np.monkeys;
    for (const m of M.list) M.hit(m, 9, w.x, w.y);
  });
  await page.waitForFunction(() => window.__np.nagaFree, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('naga');
  await page.waitForFunction(() => window.__np.naga.shown, null, { timeout: 2000 });
  // It is kept: a reload finds him free.
  await page.waitForTimeout(5200);
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(await page.evaluate(() => window.__np.nagaFree)).toBe(true);
  // Back aboard at the berth, he is in the water beside the boat.
  await page.waitForFunction(() => window.__np.naga.swimming, null, { timeout: 3000 });
  await page.waitForTimeout(800);
  const gap = await page.evaluate(() =>
    Math.hypot(window.__np.naga.x - window.__np.boat.x, window.__np.naga.y - window.__np.boat.y),
  );
  expect(gap).toBeLessThan(80);
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
  await expect(page.locator('#order')).toBeVisible();
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 0);
  // Inside, the boat's bubbles are put away; the hearts stay.
  for (const id of ['#order', '#holdPill', '#hull', '#wood'])
    await expect(page.locator(id)).toBeHidden();
  await expect(page.locator('#hearts')).toBeVisible();
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
  await expect(page.locator('#order')).toBeVisible();
  await expect(page.locator('#holdPill')).toBeVisible();
  expect(errors).toEqual([]);
});

test('island 3 tower: up the sunken tower, beat the sorcerer again, and find the scuba gear', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -600 + 322, y: -600 + 154, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Across the planks and the seaweed to the door.
  await page.evaluate(() => {
    window.__np.walker.x = -600 + 52 * Math.SQRT1_2;
    window.__np.walker.y = -600 + 52 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 3);
  for (const f of [3, 4]) {
    await page.evaluate((i) => {
      const fl = window.__np.floors[i];
      if (!fl) return;
      for (const m of fl.list) fl.hit(m, 9, m.x + 50, m.y);
      window.__np.walker.x = -7500 - 130 * 0.6 * Math.SQRT1_2;
      window.__np.walker.y = (i === 4 ? -6900 : -6000) - 130 * 0.6 * Math.SQRT1_2;
    }, f);
    await expect(page.locator('#climb')).toBeVisible();
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, f + 1);
  }
  await page.waitForFunction(() => window.__np.boss3.up, null, { timeout: 3000 });
  await page.evaluate(() => window.__np.boss3.hit(99));
  await page.waitForFunction(() => window.__np.isle3Stage === 1, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('scuba gear');
  await expect(page.locator('#leave')).toHaveText('Back to the boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.walker.state === 'aboard');
  expect(errors).toEqual([]);
});

test('the dive: down to the swordsman, into the demon dimension, and the warlock freed', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -600 + 322, y: -600 + 154, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // To the gap in the seaweed, round from the door.
  await page.evaluate(() => {
    window.__np.walker.x = -600 - 56 * Math.SQRT1_2;
    window.__np.walker.y = -600 + 56 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Dive');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 6);
  await expect(page.locator('#leave')).toHaveText('Swim up');
  await page.waitForFunction(() => window.__np.swordsman.up, null, { timeout: 3000 });
  // His one block, then the rest.
  expect(await page.evaluate(() => window.__np.swordsman.hit(2))).toBe(true);
  await page.evaluate(() => window.__np.swordsman.hit(99));
  await page.waitForFunction(() => window.__np.isle3Stage === 2, null, { timeout: 4000 });
  // He heals you, and the floor opens into the demon dimension.
  await page.waitForFunction(() => window.__np.floor === 7, null, { timeout: 6000 });
  await page.waitForFunction(() => window.__np.demons.every((d) => d.up), null, { timeout: 3000 });
  await page.evaluate(() => {
    for (const d of window.__np.demons) {
      d.hit(9);
      d.hit(9);
    }
  });
  await page.waitForFunction(() => window.__np.isle3Stage === 3, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('warlock is free');
  await expect(page.locator('#leave')).toHaveText('Back to the boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.walker.state === 'aboard');
  expect(errors).toEqual([]);
});

test('the warlock: freed, he comes ashore with the figure and casts at the monkeys', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 3,
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
  await page.waitForFunction(() => window.__np.warlock.shown, null, { timeout: 2000 });
  const d = await page.evaluate(() => {
    const { walker, warlock } = window.__np;
    return Math.hypot(walker.x - warlock.x, walker.y - warlock.y);
  });
  expect(d, 'the warlock is not beside the figure').toBeLessThan(40);
  // His three hearts show beside the figure's.
  await expect(page.locator('#hearts svg')).toHaveCount(6);
  // Into the monkey camp: he casts at them.
  await page.evaluate(() => {
    window.__np.walker.x = -600 - 115 + 60;
    window.__np.walker.y = 5400 + 105 - 30;
  });
  await page.waitForFunction(() => window.__np.warlock.bolts.length > 0, null, { timeout: 6000 });
  expect(errors).toEqual([]);
});

test("the warlock's boat: it sails beside yours and catches fish for you", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400 + 900, y: 2400 + 900, h: 0, clock: 0.3, hold: [] },
  });
  // Lie still with his station right on a school of sardines: your net catches nothing standing still.
  await page.evaluate(() => {
    const np = window.__np;
    const sc = np.schools[0];
    if (!sc) throw new Error('no schools');
    np.boat.x = sc.cx + 70 * 1.6;
    np.boat.y = sc.cy - 62 * 1.6;
    np.boat.h = 0;
    np.boat.v = 0;
  });
  await page.waitForFunction(() => window.__np.wboat.free, null, { timeout: 3000 });
  await page.waitForFunction(() => window.__np.wboat.catches > 0, null, { timeout: 8000 });
  expect(await page.evaluate(() => window.__np.hold)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('the cutscene: back aboard with the warlock free, island 4 turns to tar, and a tap skips it', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400 + 900, y: 2400 + 900, h: 0, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.cine !== null, null, { timeout: 5000 });
  // A tap skips to the end.
  await page.waitForTimeout(600);
  await page.mouse.click(200, 400);
  await page.waitForFunction(() => window.__np.isle3Stage === 4, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('turned to tar');
  // No boat goes into the black water.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 5400 - 200;
    b.y = 5400 - 200;
  });
  await page.waitForTimeout(200);
  const d = await page.evaluate(() =>
    Math.hypot(window.__np.boat.x - 5400, window.__np.boat.y - 5400),
  );
  expect(d).toBeGreaterThan(200 + 240);
  expect(errors).toEqual([]);
});

test('the chemistry suit: from the shipwright, then into the tar off the bow, swimming', async ({
  context,
  page,
}) => {
  const a = (-3 * Math.PI) / 4 + 0.55;
  const r = 440 + 24 * 1.6 + 25;
  const errors = await boot(context, page, {
    muted: true,
    coins: 9000,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: 5400 + Math.cos(a) * r,
      y: 5400 + Math.sin(a) * r,
      h: a + Math.PI,
      clock: 0.3,
      hold: [],
    },
  });
  // Without the suit, no way in.
  await page.waitForTimeout(800);
  await expect(page.locator('#climb')).toBeHidden();
  // The shipwright has it now the tar has been seen; buy it as if from the shop.
  await page.evaluate(() => {
    window.__np.gear.suit = true;
  });
  await expect(page.locator('#climb')).toHaveText('Into the tar');
  await page.locator('#climb').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.walker.sink > 10, null, { timeout: 3000 });
  // The boat waits outside the black water.
  const d = await page.evaluate(() =>
    Math.hypot(window.__np.boat.x - 5400, window.__np.boat.y - 5400),
  );
  expect(d).toBeGreaterThan(440);
  expect(errors).toEqual([]);
});

test('the Tar Anchorer: it rises when the figure reaches the sand, and beaten, leaves a tarling', async ({
  context,
  page,
}) => {
  const a = (-3 * Math.PI) / 4 + 0.55;
  const r = 440 + 24 * 1.6 + 25;
  const errors = await boot(context, page, {
    muted: true,
    coins: 9000,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    spear: 3,
    gear: { mesh: false, strongbox: false, suit: true },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: 5400 + Math.cos(a) * r,
      y: 5400 + Math.sin(a) * r,
      h: a + Math.PI,
      clock: 0.3,
      hold: [],
    },
  });
  await expect(page.locator('#climb')).toHaveText('Into the tar');
  await page.locator('#climb').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.anchorer.state)).toBe('lurk');
  // Onto the sand: it wakes.
  await page.evaluate(() => {
    const w = window.__np.walker;
    w.x = 5400 - 95;
    w.y = 5400 - 75;
  });
  await page.waitForFunction(() => window.__np.anchorer.up, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('Tar Anchorer');
  // The spear reaches it.
  await expect(page.locator('#throw')).toBeVisible({ timeout: 4000 });
  await page.evaluate(() => window.__np.anchorer.hit(200));
  await page.waitForFunction(() => window.__np.isle4Stage === 1, null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.tarling.with, null, { timeout: 2000 });
  // Back aboard, it rides along.
  await page.evaluate(() => {
    const w = window.__np.walker;
    w.x = w.dock.landing.x;
    w.y = w.dock.landing.y;
  });
  expect(await page.evaluate(() => window.__np.tarling.free)).toBe(true);
  expect(errors).toEqual([]);
});

test('the far deep: an anchor chain holds the far buoys until the Tar Anchorer is beaten', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    // Along the deep's end well away from island 5, whose sighting would clear the toasts.
    trip: { x: -1000, y: 700, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__np.boat.x = -1500;
  });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__np.boat.x)).toBeGreaterThan(-1200);
  await expect(page.locator('#toast')).toContainText('anchor chain', { timeout: 9000 });
  // Beaten, the chain sinks and the far deep opens.
  await page.evaluate(() => {
    window.__np.isle4Stage = 1;
    window.__np.boat.x = -1500;
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__np.boat.x)).toBeLessThan(-1400);
  await expect(page.locator('#toast')).toContainText('far deep', { timeout: 9000 });
  expect(errors).toEqual([]);
});

test('island 5: out in the far deep, a reef of bones is found and logged', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    // Inside sighting distance but short of where the King wakes.
    trip: { x: -1260, y: 2400, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.isle5Seen, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('bones', { timeout: 9000 });
  // No hull runs onto it.
  await page.evaluate(() => {
    window.__np.boat.x = -2100 + 60;
    window.__np.boat.y = 2400;
  });
  await page.waitForTimeout(200);
  const d = await page.evaluate(() =>
    Math.hypot(window.__np.boat.x + 2100, window.__np.boat.y - 2400),
  );
  expect(d).toBeGreaterThan(185);
  expect(errors).toEqual([]);
});

test('the Skeleton Shark King: he rises at the reef, and harpooned down, dies with his secret', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -1500, y: 2400, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.king.fighting, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Skeleton Shark King');
  // Nearly beaten; then the harpoon, whenever he is up and in reach.
  await page.evaluate(() => {
    window.__np.king.resolve = 1;
  });
  await page.waitForFunction(
    () => {
      window.__np.fireHarpoon();
      return window.__np.king.state === 'dying';
    },
    null,
    { timeout: 30000, polling: 100 },
  );
  // A tap skips his speech.
  await page.waitForTimeout(800);
  await page.mouse.click(200, 400);
  await page.waitForFunction(() => window.__np.isle5Stage === 1, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('portal', { timeout: 6000 });
  expect(errors).toEqual([]);
});

test('island 6: dock at the big island, step ashore, and find a treasure chest', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1150, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.isle6Seen, null, { timeout: 4000 });
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = -1320;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.locator('#ashore').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 5000 });
  // Straight to the first chest.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const [x, y] = window.__np.CHESTS6[0] as [number, number];
    w.x = x + 10;
    w.y = y + 10;
  });
  await page.waitForFunction(() => window.__np.chests6 > 0, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.coins)).toBeGreaterThanOrEqual(400);
  expect(errors).toEqual([]);
});

test('island 7: sight it, run up on its sand, and the monkeys come for you', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 5950, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.isle7Seen, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Island 7', { timeout: 3000 });
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = 6500;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.locator('#ashore').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 5000 });
  await expect(page.locator('#hearts')).toBeVisible();
  // Over to the camp on the far side.
  await page.evaluate(() => {
    const w = window.__np.walker;
    w.x = 2400 - 70 + 60;
    w.y = 6900 + 170 - 70;
  });
  await page.waitForFunction(
    () => window.__np.monkeys7.list.some((m) => m.state === 'chase'),
    null,
    { timeout: 4000 },
  );
  expect(errors).toEqual([]);
});

test("island 7's tower: up two floors of monkeys, the sorcerer a third time, and the portal wakes", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 52 * Math.SQRT1_2;
    window.__np.walker.y = 6900 + 52 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 9);
  for (const f of [9, 10]) {
    await page.evaluate((i) => {
      const fl = window.__np.floors[i];
      if (!fl) return;
      for (const m of fl.list) fl.hit(m, 9, m.x + 50, m.y);
      window.__np.walker.x = -12000 - 130 * 0.6 * Math.SQRT1_2;
      window.__np.walker.y = (i === 10 ? -6900 : -6000) - 130 * 0.6 * Math.SQRT1_2;
    }, f);
    await expect(page.locator('#climb')).toBeVisible();
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, f + 1);
  }
  await page.waitForFunction(() => window.__np.boss7.up, null, { timeout: 3000 });
  // Hurt to half, it calls monkeys up onto the roof.
  await page.evaluate(() => window.__np.boss7.hit(window.__np.boss7.hp / 2));
  await page.waitForFunction(() => window.__np.roofMonkeys.list.length >= 2, null, {
    timeout: 3000,
  });
  await page.evaluate(() => window.__np.boss7.hit(99));
  await page.waitForFunction(() => window.__np.isle7Stage === 1, null, { timeout: 4000 });
  await expect(page.locator('#leave')).toHaveText('Down to the portal');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1 && window.__np.portalOpen >= 1, null, {
    timeout: 5000,
  });
  // Into the ring, and it is the way through.
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await expect(page.locator('#climb')).toHaveText('Into the portal', { timeout: 3000 });
  expect(errors).toEqual([]);
});

test("islands 8 and 9: sight the twins, tie up at island 8, walk the sandbar, and island 9's tower is barred", async ({
  context,
  page,
}) => {
  // A flagship out in the far deep, west of island 8's dock, sailing for it.
  const errors = await boot(context, page, {
    muted: true,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6300, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.isle8Seen, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('Islands 8 and 9');
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Over the sandbar to island 9, and up to its tower's door.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const B = window.__np.BAR;
    w.x = (B.x0 + B.x1) / 2;
    w.y = (B.y0 + B.y1) / 2;
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__np.walker.state)).toBe('ashore');
  // The Heron's hired men camp by that door; this is about the door, so they are away.
  await page.evaluate(() => {
    for (const m of window.__np.hired9.list) {
      m.state = 'gone';
      m.back = 999;
    }
    const w = window.__np.walker;
    const D = window.__np.DOOR9;
    w.x = D.x + 4;
    w.y = D.y + 4;
  });
  // After the landing's own message, which is still up.
  await expect(page.locator('#toast')).toContainText('Barred', { timeout: 9000 });
  await expect(page.locator('#log')).toContainText('Islands 8 and 9 found');
  expect(errors).toEqual([]);
});

test("the Heron's hired boats go home once he is beaten for good", async ({ context, page }) => {
  // The same water as above, a flagship sitting in it, but the Heron beaten on island 9.
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    heronStage: 2,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6300, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__np.hiredBoats.here)).toBe(false);
  expect(await page.evaluate(() => window.__np.hiredBoats.chasing)).toBe(false);
  expect(await page.evaluate(() => window.__np.hp)).toBe(100);
  expect(errors).toEqual([]);
});

test("the Heron's hired men: boats chase and ram at sea and the harpoon sinks one; ashore, a beaten man drops his pay", async ({
  context,
  page,
}) => {
  // Island 7's sorcerer beaten, so the Heron has hired them; a flagship with a harpoon off island 8.
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6300, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  // One comes for the boat: a chase, and a ram that costs hull.
  await page.evaluate(() => {
    const b = window.__np.boat;
    const s = window.__np.hiredBoats.boats[0];
    if (!s) return;
    s.x = b.x + 220;
    s.y = b.y - 120;
  });
  await page.waitForFunction(() => window.__np.hiredBoats.chasing, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('hired boats');
  await page.waitForFunction(() => window.__np.hp < 100, null, { timeout: 6000 });
  // The harpoon aims at the nearest; enough hits sink it, for the bounty.
  const coins = await page.evaluate(() => window.__np.coins);
  await page.waitForFunction(() => window.__np.harpoonTarget === 'hired', null, { timeout: 3000 });
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => window.__np.fireHarpoon());
    await page.waitForTimeout(1300);
    if (await page.evaluate(() => window.__np.hiredBoats.boats.some((s) => s.state === 'sunk')))
      break;
  }
  expect(
    await page.evaluate(() => window.__np.hiredBoats.boats.some((s) => s.state === 'sunk')),
  ).toBe(true);
  expect(await page.evaluate(() => window.__np.coins)).toBeGreaterThan(coins);
  // Ashore on island 8, by their camp: a beaten man drops his pay.
  await page.evaluate(() => {
    for (const s of window.__np.hiredBoats.boats) s.state = 'sunk';
    const b = window.__np.boat;
    b.x = 6560;
    b.y = 2070;
    b.v = 0;
    b.h = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  const before = await page.evaluate(() => window.__np.coins);
  await page.evaluate(() => {
    const w = window.__np.walker;
    const c = window.__np.hired8;
    w.x = c.home.x - 70;
    w.y = c.home.y - 30;
    const m = c.list[0];
    if (m) c.hit(m, 9, w.x, w.y);
  });
  await page.waitForFunction((b) => window.__np.coins > b, before, { timeout: 2000 });
  await expect(page.locator('#hearts')).toBeVisible();
  expect(errors).toEqual([]);
});

test("the Heron: up island 8's tower past his hired men, and on the roof he splits into copies; beaten, he flies off", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6560, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    for (const s of window.__np.hiredBoats.boats) s.state = 'sunk';
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Island 8's camp is away; up to its tower's door, which is open now.
  await page.evaluate(() => {
    for (const m of window.__np.hired9.list) {
      m.state = 'gone';
      m.back = 999;
    }
    for (const m of window.__np.hired8.list as { state: string; back: number }[]) {
      m.state = 'gone';
      m.back = 999;
    }
    const w = window.__np.walker;
    const D = window.__np.DOOR8;
    w.x = D.x;
    w.y = D.y;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 17);
  await expect(page.locator('#toast')).toContainText('hold the floors', { timeout: 9000 });
  for (const f of [17, 18]) {
    await page.evaluate((i) => {
      const fl = window.__np.floors[i];
      if (!fl) return;
      for (const m of fl.list) fl.hit(m, 9, m.x + 50, m.y);
      window.__np.walker.x = -15000 - 130 * 0.6 * Math.SQRT1_2;
      window.__np.walker.y = (i === 18 ? -6900 : -6000) - 130 * 0.6 * Math.SQRT1_2;
    }, f);
    await expect(page.locator('#climb')).toBeVisible();
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, f + 1);
  }
  await page.waitForFunction(() => window.__np.heron.up, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('The Heron');
  // His staff: copies of him. A spear thrown pops one or hurts him. The tarling's tar holds him up now and then.
  await page.waitForFunction(() => window.__np.heron.copies.length >= 2, null, { timeout: 18000 });
  await expect(page.locator('#throw')).toBeVisible();
  await page.click('#throw');
  await page.waitForFunction(
    () => window.__np.heron.hp < 14 || window.__np.heron.copies.some((c) => c.pop > 0),
    null,
    { timeout: 3000 },
  );
  await page.evaluate(() => window.__np.heron.hit(99));
  await page.waitForFunction(() => window.__np.heronStage === 1, null, { timeout: 5000 });
  await expect(page.locator('#toast')).toContainText('island 9');
  await expect(page.locator('#leave')).toHaveText('Back to the boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  await expect(page.locator('#log')).toContainText('Heron driven off');
  expect(errors).toEqual([]);
});

test("the Heron's nest: up island 9's tower, the orb shields him until the necromancer's chain snaps, and he is beaten for good", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    heronStage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6560, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    for (const s of window.__np.hiredBoats.boats) s.state = 'sunk';
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // Island 9's camp is away; up to the Heron's own door, open now he has fled to it.
  await page.evaluate(() => {
    for (const m of window.__np.hired9.list) {
      m.state = 'gone';
      m.back = 999;
    }
    const w = window.__np.walker;
    const D = window.__np.DOOR9;
    w.x = D.x;
    w.y = D.y;
  });
  await expect(page.locator('#climb')).toHaveText('Climb the tower', { timeout: 3000 });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 20);
  for (const f of [20, 21]) {
    await page.evaluate((i) => {
      const fl = window.__np.floors[i];
      if (!fl) return;
      for (const m of fl.list) fl.hit(m, 9, m.x + 50, m.y);
      window.__np.walker.x = -16500 - 130 * 0.6 * Math.SQRT1_2;
      window.__np.walker.y = (i === 21 ? -6900 : -6000) - 130 * 0.6 * Math.SQRT1_2;
    }, f);
    await expect(page.locator('#climb')).toBeVisible();
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, f + 1);
  }
  // The nest: the necromancer wakes, chained to the orb, and the Heron is shielded.
  await page.waitForFunction(() => window.__np.nest.up, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('orb of power');
  expect(await page.evaluate(() => window.__np.heron9.shielded)).toBe(true);
  const hp = await page.evaluate(() => window.__np.heron9.hp);
  await page.waitForFunction(() => window.__np.heron9.up, null, { timeout: 3000 });
  await page.evaluate(() => window.__np.heron9.hit(5));
  expect(await page.evaluate(() => window.__np.heron9.hp)).toBe(hp);
  // He raises a skeleton out of the sticks.
  await page.waitForFunction(() => window.__np.nestHorde.list.length >= 1, null, { timeout: 6000 });
  // Beaten, his chain snaps: the shield is down and what he raised falls.
  await page.evaluate(() => window.__np.nest.hit(99));
  await page.waitForFunction(() => !window.__np.heron9.shielded, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('chain snaps');
  expect(
    await page.evaluate(() =>
      window.__np.nestHorde.list.every((u) => u.state === 'fall' || u.state === 'gone'),
    ),
  ).toBe(true);
  await page.evaluate(() => window.__np.heron9.hit(99));
  await page.waitForFunction(() => window.__np.heronStage === 2, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('for good');
  // The necromancer is free, and comes with you.
  expect(await page.evaluate(() => window.__np.necroPal.shown)).toBe(true);
  await expect(page.locator('#leave')).toHaveText('Back to the boat');
  await page.click('#leave');
  await page.waitForFunction(() => window.__np.floor === -1, null, { timeout: 3000 });
  await expect(page.locator('#log')).toContainText('Heron beaten for good');
  expect(errors).toEqual([]);
});

test('the necromancer: with the Heron beaten for good he comes along, and in a fight raises his skeleton hamster', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    armour: 4,
    isle4Stage: 1,
    isle7Seen: true,
    isle7Stage: 1,
    isle8Seen: true,
    heronStage: 2,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 6560, y: 2070, h: 0, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    for (const s of window.__np.hiredBoats.boats) s.state = 'sunk';
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 6000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.necroPal.shown, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('necromancer walks with you', {
    timeout: 9000,
  });
  // Up to island 8's camp of hired men: a fight, and he raises his hamster.
  await page.evaluate(() => {
    const w = window.__np.walker;
    const c = window.__np.hired8;
    w.x = c.home.x - 70;
    w.y = c.home.y - 30;
  });
  await page.waitForFunction(
    () => window.__np.allies.list.some((a) => a.kind === 'hamster'),
    null,
    { timeout: 6000 },
  );
  expect(errors).toEqual([]);
});

test('the otter: three fish off the dock make him yours, he swims along, and climbs aboard past the buoys', async ({
  context,
  page,
}) => {
  const hold = new Array(16).fill(0);
  hold[0] = 5;
  const errors = await boot(context, page, {
    muted: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2700, y: 2210, h: -0.5, clock: 0.3, hold },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#toast')).toContainText('otter', { timeout: 4000 });
  await expect(page.locator('#log')).toContainText('Something off the dock?');
  for (let i = 0; i < 3; i++) await page.evaluate(() => window.__np.tapOtter());
  expect(await page.evaluate(() => window.__np.otter.free)).toBe(true);
  expect(await page.evaluate(() => window.__np.hold)).toBe(2);
  await expect(page.locator('#toast')).toContainText('The otter is yours');
  await expect(page.locator('#log')).toContainText('Otter befriended');
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').otterFed,
  );
  expect(saved).toBe(3);
  // Out past the buoys, he climbs up on deck.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 5100;
    b.y = 2400;
    b.v = 0;
  });
  await page.waitForFunction(() => window.__np.otter.state === 'aboard', null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('Gigantis: through the portal, beat the courtyard, on through the door, and back home', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await expect(page.locator('#climb')).toHaveText('Into the portal');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  await expect(page.locator('#leave')).toHaveText('Back through the portal');
  await expect(page.locator('#toast')).toContainText('Skeletons', { timeout: 3000 });
  // Everyone in the courtyard down, then to the door at its back.
  await page.evaluate(() => {
    const h = window.__np.hordes[12];
    if (!h) return;
    for (const u of h.list) {
      u.guard = false;
      h.hit(u, 99, u.x + 40, u.y);
    }
    window.__np.walker.x = -13500 - 170 * 0.6 * Math.SQRT1_2;
    window.__np.walker.y = -6000 - 170 * 0.6 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Through the door');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 13);
  await expect(page.locator('#toast')).toContainText('Zombies', { timeout: 3000 });
  await page.click('#leave');
  await page.waitForFunction(
    () => window.__np.floor === -1 && window.__np.walker.state === 'ashore',
  );
  expect(errors).toEqual([]);
});

test('the Forgotten One: through the halls to his throne room, his bones join you and give the key, into the ruins', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  const rooms: [number, number, number][] = [
    [12, -6000, 170],
    [13, -6900, 160],
    [14, -7800, 160],
  ];
  for (const [i, y, r] of rooms) {
    await page.waitForFunction(
      (n) => window.__np.hordes[n]?.list.some((u) => u.state !== 'wait'),
      i,
    );
    await page.evaluate(
      ([n, ry, rr]) => {
        const h = window.__np.hordes[n];
        if (!h) return;
        for (const u of h.list) {
          u.guard = false;
          h.hit(u, 99, u.x + 40, u.y);
        }
        window.__np.walker.x = -13500 - rr * 0.6 * Math.SQRT1_2;
        window.__np.walker.y = ry - rr * 0.6 * Math.SQRT1_2;
      },
      [i, y, r] as const,
    );
    await expect(page.locator('#climb')).toHaveText('Through the door');
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, i + 1);
  }
  await page.waitForFunction(() => window.__np.forgotten.up, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('Forgotten One');
  // The warlock calls his merlocks.
  await page.waitForFunction(
    () => window.__np.allies.list.some((a) => a.kind === 'merlock'),
    null,
    { timeout: 4000 },
  );
  // The necromancers down, then him.
  await page.evaluate(() => {
    const h = window.__np.hordes[15];
    if (h) for (const u of h.list) h.hit(u, 99, u.x + 40, u.y);
    window.__np.forgotten.hit(99);
  });
  // He falls apart, and his bones get up on your side.
  await page.waitForFunction(() => window.__np.bonesPal.shown, null, { timeout: 5000 });
  await expect(page.locator('#toast')).toContainText('bones');
  await page.waitForFunction(() => window.__np.isle7Stage === 2, null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.bonesPal.free)).toBe(true);
  await expect(page.locator('#toast')).toContainText('locked');
  // At the door behind the throne, his bones give the key.
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__np.walker.x = -13500 - 158 * Math.SQRT1_2;
    window.__np.walker.y = -8800 - 158 * Math.SQRT1_2;
  });
  await page.waitForFunction(() => window.__np.isle7Stage === 3, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('key');
  await expect(page.locator('#climb')).toHaveText('Through the door');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 16);
  await expect(page.locator('#toast')).toContainText('Lancers');
  expect(
    await page.evaluate(() => window.__np.lancers.list.every((l) => l.state === 'guard')),
  ).toBe(true);
  await expect(page.locator('#leave')).toHaveText('Back through the portal');
  expect(errors).toEqual([]);
});

test('the Deep One: harpooned down, it drags the boat under to its temple, where Cthulhu waits', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3700, y: -1600, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.deep.fighting, null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.deep.resolve = 1;
  });
  await page.waitForFunction(
    () => {
      window.__np.fireHarpoon();
      return window.__np.deep.state === 'drag';
    },
    null,
    { timeout: 30000, polling: 100 },
  );
  // Under, in the temple.
  await page.waitForFunction(() => window.__np.floor === 8 && window.__np.isle6Stage === 1, null, {
    timeout: 5000,
  });
  await page.waitForFunction(() => window.__np.cth.state === 'fight', null, { timeout: 3000 });
  await page.evaluate(() => window.__np.cth.hit(99));
  await page.waitForFunction(() => window.__np.isle6Stage === 2, null, { timeout: 5000 });
  await expect(page.locator('#toast')).toContainText('rare fish', { timeout: 6000 });
  expect(errors).toEqual([]);
});

test('the Old One: through the door behind the throne, he rises, you get soul armour, and he is beaten', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    towerTaken: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 6500, h: Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2400 + 150;
    window.__np.walker.y = 6900 + 95;
  });
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 12);
  for (const [i, y, r] of [
    [12, -6000, 170],
    [13, -6900, 160],
    [14, -7800, 160],
  ] as const) {
    await page.waitForFunction(
      (n) => window.__np.hordes[n]?.list.some((u) => u.state !== 'wait'),
      i,
    );
    await page.evaluate(
      ([n, ry, rr]) => {
        const h = window.__np.hordes[n];
        if (!h) return;
        for (const u of h.list) {
          u.guard = false;
          h.hit(u, 99, u.x + 40, u.y);
        }
        window.__np.walker.x = -13500 - rr * 0.6 * Math.SQRT1_2;
        window.__np.walker.y = ry - rr * 0.6 * Math.SQRT1_2;
      },
      [i, y, r] as const,
    );
    await expect(page.locator('#climb')).toHaveText('Through the door');
    await page.click('#climb');
    await page.waitForFunction((n) => window.__np.floor === n, i + 1);
  }
  // The throne room is empty, and the door behind it open: through it.
  await page.evaluate(() => {
    window.__np.walker.x = -13500 - 158 * Math.SQRT1_2;
    window.__np.walker.y = -8800 - 158 * Math.SQRT1_2;
  });
  await expect(page.locator('#climb')).toHaveText('Through the door');
  await page.click('#climb');
  await page.waitForFunction(() => window.__np.floor === 16);
  // He rises, the skeleton is knocked flying, and soul armour is yours.
  await page.waitForFunction(() => window.__np.oldOne.state === 'rise', null, { timeout: 5000 });
  await page.waitForFunction(() => window.__np.soulArmour, null, { timeout: 12000 });
  await expect(page.locator('#toast')).toContainText('soul armour');
  await page.waitForFunction(() => window.__np.oldOne.up, null, { timeout: 8000 });
  await page.waitForFunction(
    () => window.__np.hordes[16]?.list.filter((u) => u.kind === 'lagoon').length === 5,
    null,
    { timeout: 3000 },
  );
  await page.evaluate(() => window.__np.oldOne.hit(999));
  await page.waitForFunction(() => window.__np.isle7Stage === 4, null, { timeout: 8000 });
  await expect(page.locator('#toast')).toContainText('Old One');
  expect(errors).toEqual([]);
});

test('the healer cat and the Cthulhu warrior: the cat eats a fish aboard for a heal, and both come ashore', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1100, h: -Math.PI / 2, clock: 0.3, hold: [3] },
  });
  // At sea, the cat rides on the cabin roof: tap it to feed it a fish.
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => window.__np.cat.heals);
  const [x, y] = (await page.evaluate(() => window.__np.catAt)) as [number, number];
  await page.mouse.click(x, y);
  await page.waitForFunction((b) => window.__np.cat.heals > b, before, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.hold)).toBe(2);
  // Into the dock and ashore: both come along.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = -1320;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.locator('#ashore').click();
  await page.waitForFunction(() => window.__np.cat.shown && window.__np.warrior.shown, null, {
    timeout: 5000,
  });
  expect(errors).toEqual([]);
});
