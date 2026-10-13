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
  muffin: { line: number; near: boolean; saying(): string | null };
  bakerAt: [number, number];
  junk: number;
  muffins: number[];
  leggy: { count: number; list: { x: number; y: number; hop: number }[] };
  leggyAt(i: number): [number, number] | null;
  hearts: number;
  setHearts(n: number): void;
  swallowing: boolean;
  swallow(by: string): void;
  bases: Record<string, number>;
  BASES: { spit: { x: number; y: number }; dock: { x: number; y: number; r: number } }[];
  FLOE_BASE: { spit: { x: number; y: number } };
  day: number;
  seine: { state: string };
  pots: { x: number; y: number; crabs: number }[];
  diving: boolean;
  diver: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    air: number;
    airMax: number;
    face: number;
    cold: number;
    chill: number;
    state: string;
  };
  iceLoot: number;
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
  trenchLoot: number;
  pearlDay: number;
  TRENCH_LOOT: { kind: string; x: number; y: number }[];
  lurker: { x: number; y: number; a: number; state: string; t: number; wait: number };
  lurkerSeen: boolean;
  lurkerStung: number;
  storm: { phase: string; t: number; bring(): void };
  stormE: number;
  stormSeen: boolean;
  wreckChest: boolean;
  diveSite: string;
  boneSharks: { x: number; y: number; state: string; t: number }[];
  WRECK_CHEST: { x: number; y: number };
  charter: { wants: string[]; seen: string[]; shirts: number[] } | null;
  charterOffer: { wants: string[]; shirts: number[] } | null;
  chartersRun: number;
  whales: { mother: { x: number; y: number; up: number } };
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
  cine: { t: number; kind: string } | null;
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
  reaper: {
    state: string;
    hunting: boolean;
    resolve: number;
    x: number;
    y: number;
    holdOff: (() => boolean) | null;
  };
  reaperSeen: boolean;
  icing: boolean;
  iceSeen: boolean;
  iceRuns: number;
  iceRun: {
    phase: string;
    x: number;
    y: number;
    line: unknown[];
    pool: { kind: string; x: number; y: number; vx: number; caught: boolean; on: boolean }[];
  } | null;
  armour: number;
  maxHearts: number;
  sailedShare: number;
  mapOpen: boolean;
  mapMarks(): { x: number; y: number; name: string }[];
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
  neil: { state: string; fed: number; free: boolean; aboard: boolean };
  neilAt: [number, number] | null;
  iceSeal: { phase: string; dive(pool: unknown[]): boolean } | null;
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
  gear: {
    mesh: boolean;
    strongbox: boolean;
    suit: boolean;
    tank: boolean;
    white: boolean;
    radar: boolean;
  };
  pirate: { state: string; x: number; y: number };
  coastGuard: { out: boolean; ship: { state: string; x: number; y: number }; reset(): void };
  radioDay: number;
  checkForUpdate(force?: boolean): Promise<boolean>;
  updateReady: boolean;
  radarOn: boolean;
  radarBlips(): { x: number; y: number; kind: 'fish' | 'threat' | 'other' }[];
  anchorer: { state: string; up: boolean; hit(power: number): void };
  tarling: { with: boolean; free: boolean };
  isle4Stage: number;
  isle5Seen: boolean;
  isle5Stage: number;
  isle6Seen: boolean;
  chests6: number;
  CHESTS6: [number, number][];
  isle6Stage: number;
  landReaper: {
    state: string;
    awake: boolean;
    open: boolean;
    hp: number;
    t: number;
    up: number;
    hit(power: number, fired?: boolean): boolean;
  };
  reaperLandSeen: boolean;
  reaperEgg: number;
  eggDay: number;
  hatchT: number;
  eggT: number | null;
  flotilla: {
    crafts: {
      kind: string;
      placed: boolean;
      x: number;
      y: number;
      tow: { x: number; y: number } | null;
    }[];
    crew: Record<string, string | null>;
    riding(r: string): boolean;
  };
  warriorPal: { shown: boolean };
  baby: {
    shown: boolean;
    swimming: boolean;
    free: boolean;
    x: number;
    y: number;
    leapT: number;
    love: number;
  };
  babyAt: [number, number] | null;
  NEST6: { x: number; y: number; r: number };
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
  king: { fighting: boolean; state: string; t: number; resolve: number };
  fireHarpoon(): void;
};

declare global {
  interface Window {
    __np: Np;
    /** Junk the net brings up with the next fish, for a test. */
    __npJunk?: string;
  }
}

/** Joystick anchor in CSS pixels at 390x780. */
const CX = 195;
const CY = 420;

/** World centre and dinghy range, from the tuning tables. */
const ISLAND = 2400;
const DINGHY_RANGE = 1150;

/** Seed a save, load the game, press Go, and return the page-error log. */
async function boot(
  context: BrowserContext,
  page: Page,
  save: Record<string, unknown>,
  path = './',
) {
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
  await page.goto(path);
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

test('the muffin man: a tap from far off asks you to walk up; close by, his loop goes round and never resolves', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  // From the end of the pier he is out of reach: a word says to walk up, and he says nothing.
  await page.waitForTimeout(600);
  let at = await page.evaluate(() => window.__np.bakerAt);
  await page.mouse.click(at[0], at[1]);
  await expect(page.locator('#toast')).toContainText('Walk up to the baker');
  expect(await page.evaluate(() => window.__np.muffin.line)).toBe(-1);

  // In front of his counter, a "..." says he would talk, and each tap is the next line, round and round.
  await page.evaluate(() => {
    window.__np.walker.x = 2580 + 46;
    window.__np.walker.y = 2400 + 2;
  });
  await page.waitForFunction(() => window.__np.muffin.near, null, { timeout: 2000 });
  await page.waitForTimeout(2500);
  const said: string[] = [];
  for (let i = 0; i < 4; i++) {
    at = await page.evaluate(() => window.__np.bakerAt);
    await page.mouse.click(at[0], at[1]);
    said.push((await page.evaluate(() => window.__np.muffin.saying())) ?? '');
  }
  expect(said).toEqual([
    'Do you know the muffin man?',
    'I AM the muffin man.',
    'Do you know him?',
    'Do you know the muffin man?',
  ]);
  expect(errors).toEqual([]);
});

test('junk: now and then the net brings up junk with the fish, into a bucket on deck, not the hold', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true });
  await page.evaluate(() => {
    window.__npJunk = 'boot';
  });
  const [sx, sy] = await page.evaluate((): [number, number] => {
    const s = window.__np.schools[0];
    if (!s) throw new Error('no schools');
    return [s.cx, s.cy];
  });
  await expect(page.locator('#junk')).toBeHidden();
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  for (let i = 0; i < 80 && (await page.evaluate(() => window.__np.junk)) < 2; i++) {
    await steerTo(page, sx, sy, 40, i);
    await page.waitForTimeout(150);
  }
  await page.mouse.up();
  await page.evaluate(() => {
    window.__npJunk = undefined;
  });
  await page.waitForTimeout(300);
  const { junk, hold } = await page.evaluate(() => ({
    junk: window.__np.junk,
    hold: window.__np.hold,
  }));
  expect(junk, 'no junk came up').toBeGreaterThanOrEqual(2);
  // The hold has only the fish in it.
  expect(hold).toBeGreaterThanOrEqual(junk);
  await expect(page.locator('#junk')).toBeVisible();
  await expect(page.locator('#junk')).toContainText(String(junk));
  expect(errors).toEqual([]);
});

test('fish muffins: the muffin man bakes your junk into muffins, kept on reload, and one eaten gives a heart back', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    junk: 3,
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await expect(page.locator('#junk')).toContainText('3');
  await expect(page.locator('#muffinBtn')).toBeHidden();
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.evaluate(() => {
    window.__np.walker.x = 2580 + 46;
    window.__np.walker.y = 2400 + 2;
  });
  await page.waitForTimeout(2500);
  const at = await page.evaluate(() => window.__np.bakerAt);
  await page.mouse.click(at[0], at[1]);
  // He still says his line, and takes the junk for muffins.
  expect(await page.evaluate(() => window.__np.muffin.saying())).toBe(
    'Do you know the muffin man?',
  );
  expect(
    await page.evaluate(() => ({ junk: window.__np.junk, muffins: window.__np.muffins.length })),
  ).toEqual({
    junk: 0,
    muffins: 3,
  });
  await expect(page.locator('#junk')).toBeHidden();
  await expect(page.locator('#muffinBtn')).toContainText('3');

  // Full hearts: he says to keep it. Hurt, ashore: one is eaten, a heart comes back.
  await page.click('#muffinBtn');
  await expect(page.locator('#toast')).toContainText('Keep it for a fight');
  expect(await page.evaluate(() => window.__np.muffins.length)).toBe(3);
  await page.evaluate(() => window.__np.setHearts(1));
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => window.__np.hearts);
  await page.click('#muffinBtn');
  expect(await page.evaluate(() => window.__np.hearts)).toBe(before + 1);
  await expect(page.locator('#muffinBtn')).toContainText('2');

  // Kept on reload.
  await page.reload();
  await page.click('#go');
  await expect(page.locator('#muffinBtn')).toContainText('2');
  expect(errors).toEqual([]);
});

test('leggy muffins: a day in the box and they grow legs, six at most, and follow the figure ashore in a line', async ({
  context,
  page,
}) => {
  // Five already, and two muffins left in the box more than a day: both grow legs, and the oldest wanders off.
  const errors = await boot(context, page, {
    muted: true,
    day: 5,
    leggy: 5,
    muffins: [3.2, 3.9],
    trip: { x: 2745 + 30, y: 2400 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => window.__np.muffins.length === 0, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.leggy.count)).toBe(6);
  await expect(page.locator('#muffinBtn')).toBeHidden();

  // Ashore, they tumble out and trot after the figure in a line.
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.leggy.list.length === 6, null, { timeout: 2000 });
  const sx = -1;
  await page.mouse.move(CX, CY);
  await page.mouse.down();
  await page.mouse.move(CX + sx * 54, CY - 27, { steps: 3 });
  await page.waitForTimeout(2600);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const d = await page.evaluate(() => {
    const w = window.__np.walker;
    return window.__np.leggy.list.map((m) => Math.hypot(m.x - w.x, m.y - w.y));
  });
  expect(d).toHaveLength(6);
  expect(d[0], 'the first is not just behind').toBeLessThan(45);
  expect(d[5] ?? 0, 'they are not in a line').toBeGreaterThan((d[0] ?? 0) + 40);

  // A tap on one: it hops.
  const [mx, my] = (await page.evaluate(() => window.__np.leggyAt(2))) ?? [0, 0];
  await page.mouse.click(mx, my);
  expect(await page.evaluate(() => window.__np.leggy.list[2]?.hop ?? 0)).toBeGreaterThan(0.5);

  // Kept on reload: six, riding in their crate.
  await page.reload();
  await page.click('#go');
  expect(await page.evaluate(() => window.__np.leggy.count)).toBe(6);
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
  // Nor is there a big air tank before the scuba gear.
  await expect(page.locator('#gear [data-g="tank"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('shop: once there is scuba gear the shipwright sells a big air tank', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 4000,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  const card = page.locator('#gear [data-g="tank"]');
  await expect(card).toContainText('Big air tank');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.gear.tank, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(500);
  // Bought, it leaves the shelf for the Yours row.
  await expect(card).toHaveCount(0);
  await expect(page.locator('#yours')).toContainText('Big air tank');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').gear.tank),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('shop: once the ice floe is found, with scuba gear, the shipwright sells a white scuba suit', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 7000,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    iceSeen: true,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  const card = page.locator('#gear [data-g="white"]');
  await expect(card).toContainText('White scuba suit');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.gear.white, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(1000);
  await expect(page.locator('#yours')).toContainText('White scuba suit');
  expect(errors).toEqual([]);
});

test('the radar: the shipwright sells it, and at sea it shows the fish and a pirate coming; docked, it is put away', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 3500,
    lv: { net: 2, hold: 2, engine: 2 },
  });
  const card = page.locator('#gear [data-g="radar"]');
  await expect(card).toContainText('Radar');
  await card.dispatchEvent('click');
  await page.waitForFunction(() => window.__np.gear.radar, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(500);
  // Tied up at the dock, the shop has the corner; the radar waits. (A new game starts just off it.)
  await page.evaluate(() => {
    const n = window.__np;
    n.boat.x = n.DOCK.x;
    n.boat.y = n.DOCK.y;
    n.boat.v = 0;
  });
  await expect(page.locator('#radar')).toBeHidden({ timeout: 3000 });
  // Out at sea it shows, with the schools round about on it as fish.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 3300;
    b.y = 1500;
    b.v = 0;
  });
  await expect(page.locator('#radar')).toBeVisible({ timeout: 3000 });
  const kinds = async () =>
    page.evaluate(() => [...new Set(window.__np.radarBlips().map((b) => b.kind))].sort());
  expect(await kinds()).toContain('fish');
  // A pirate coming: a threat on it.
  await page.evaluate(() => {
    const n = window.__np;
    n.pirate.state = 'chase';
    n.pirate.x = n.boat.x + 600;
    n.pirate.y = n.boat.y - 200;
  });
  expect(await kinds()).toContain('threat');
  // Back at the dock, put away again.
  await page.evaluate(() => {
    const n = window.__np;
    n.pirate.state = 'away';
    n.boat.x = n.DOCK.x;
    n.boat.y = n.DOCK.y;
  });
  await expect(page.locator('#radar')).toBeHidden({ timeout: 3000 });
  expect(errors).toEqual([]);
});

test('the coast guard: with the radio, a call when pirates come brings their boat out, the pirates run, and the call is spent for the day', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 500,
    earned: 5000,
    lv: { net: 2, hold: 2, engine: 2 },
    gear: { radio: true },
    trip: { x: 3300, y: 1500, h: 0, clock: 0.3, hold: [6] },
  });
  await page.waitForTimeout(300);
  // No pirate about, no call to make.
  await page.evaluate(() => {
    window.__np.pirate.state = 'away';
  });
  await expect(page.locator('#radioBtn')).toBeHidden();
  // A pirate comes for the boat: the button.
  await page.evaluate(() => {
    const n = window.__np;
    n.pirate.state = 'chase';
    n.pirate.x = n.boat.x + 700;
    n.pirate.y = n.boat.y;
  });
  const button = page.locator('#radioBtn');
  await expect(button).toBeVisible({ timeout: 2000 });
  await button.click();
  await page.waitForFunction(() => window.__np.coastGuard.out, null, { timeout: 2000 });
  // The pirate turns tail, and the call is spent for today, in the save too.
  await page.waitForFunction(() => ['leave', 'away'].includes(window.__np.pirate.state), null, {
    timeout: 2000,
  });
  const day = await page.evaluate(() => window.__np.day);
  expect(await page.evaluate(() => window.__np.radioDay)).toBe(day);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').radioDay),
  ).toBe(day);
  await expect(button).toBeHidden();
  // Its boat comes alongside.
  await page.waitForFunction(() => window.__np.coastGuard.ship.state === 'escort', null, {
    timeout: 10000,
  });
  // Home again, and pirates later the same day: no second call. Tomorrow, there is.
  await page.evaluate(() => {
    const n = window.__np;
    n.coastGuard.reset();
    n.pirate.state = 'chase';
    n.pirate.x = n.boat.x + 700;
    n.pirate.y = n.boat.y;
  });
  await page.waitForTimeout(400);
  await expect(button).toBeHidden();
  await page.evaluate(() => {
    window.__np.radioDay = 0;
  });
  await expect(button).toBeVisible({ timeout: 2000 });
  expect(errors).toEqual([]);
});

test.describe('a new version', () => {
  // Playwright cannot serve a page's fetches while a service worker is in charge of them, so this one runs
  // without it; that the worker lets the game's check through to the network is in the installable test.
  test.use({ serviceWorkers: 'block' });

  test('found when the game is checked mid-trip, the shop offers it at the dock', async ({
    context,
    page,
  }) => {
    const errors = await boot(context, page, {
      muted: true,
      coins: 300,
      trip: { x: 3300, y: 1500, h: 0, clock: 0.3, hold: [] },
    });
    // Nothing new yet.
    expect(await page.evaluate(() => window.__np.checkForUpdate(true))).toBe(false);
    // Then the server has a newer build.
    await page.route('**/', async (route) => {
      if (route.request().resourceType() !== 'fetch') return route.continue();
      const res = await route.fetch();
      const body = (await res.text()).replace(/assets\/index-[^"]+\.js/, 'assets/index-NEWER.js');
      return route.fulfill({ response: res, body });
    });
    expect(await page.evaluate(() => window.__np.checkForUpdate(true))).toBe(true);
    expect(await page.evaluate(() => window.__np.updateReady)).toBe(true);
    // At sea nothing is cut short; tied up, the shop offers it.
    await page.evaluate(() => {
      const n = window.__np;
      n.boat.x = n.DOCK.x;
      n.boat.y = n.DOCK.y;
      n.boat.v = 0;
    });
    await expect(page.locator('#updateBtn')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('#updateBtn')).toContainText('A new version is ready');
    expect(errors).toEqual([]);
  });
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
  // No scuba gear and no trench found: nothing marked yet.
  expect(await page.evaluate(() => window.__np.mapMarks())).toEqual([]);
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

test('the sea map: with scuba gear the trench is marked to dive, and not before', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 4000, y: 2400, h: 0, clock: 0.3, hold: [] },
  });
  expect(await page.evaluate(() => window.__np.mapMarks())).toEqual([
    { x: 1250, y: -620, name: 'Trench: dive here' },
  ]);
  await page.locator('#mapBtn').click();
  await expect(page.locator('#seamap')).toBeVisible();
  await page.locator('#mapClose').click();
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

test('island 2: with a late-game shop, Step ashore is still on the screen, and the long shop scrolls', async ({
  context,
  page,
}) => {
  // Everything bought, on a short phone: a shop taller than the screen, which once grew off the top and took
  // Step ashore with it.
  await page.setViewportSize({ width: 390, height: 440 });
  const errors = await boot(context, page, {
    muted: true,
    coins: 29474,
    build: 5,
    aquarium: true,
    lionSeen: true,
    gear: {
      mesh: true,
      strongbox: true,
      kit: true,
      rod: true,
      lionnet: true,
      suit: true,
      tank: true,
    },
    spear: 4,
    armour: 3,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    bases: { isle2: 2 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -600 + 330 * Math.SQRT1_2,
      y: 5400 - 330 * Math.SQRT1_2,
      h: 2.36,
      clock: 0.3,
      hold: [],
    },
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.waitForTimeout(500);
  // Visible is not enough: off the top of the screen counts as visible. On the screen, above the shop, which scrolls.
  const [pill, planks] = await page.evaluate(() => {
    const a = (document.getElementById('ashore') as HTMLElement).getBoundingClientRect();
    const p = document.querySelector('#shop .planks') as HTMLElement;
    return [
      { top: a.top, bottom: a.bottom },
      { top: p.getBoundingClientRect().top, more: p.scrollHeight - p.clientHeight },
    ];
  });
  expect(pill.top, 'Step ashore is off the top of the screen').toBeGreaterThanOrEqual(0);
  expect(pill.bottom).toBeLessThanOrEqual(planks.top);
  expect(planks.more, 'the shop is too short to test this').toBeGreaterThan(0);
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  expect(errors).toEqual([]);
});

test("bases: island 6's hut is built from its pier, a home port out in the far deep", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 2000,
    wood: 40,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1322 + 40, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  const card = page.locator('#baseBtn');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Build a hut here');
  await card.click();
  // Built, the card goes on to its next stage: the charter office.
  await expect(card).toContainText('Build a charter office here');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.bases.isle6])).toEqual([500, 1]);
  expect(errors).toEqual([]);
});

test('charters: at island 6 passengers board, see the whales, and pay at the next dock', async ({
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
    bases: { isle2: 0, isle3: 0, isle6: 2 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1322 + 40, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  const card = page.locator('#charterBtn');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Take a charter');
  // One passenger, who wants the whales; and Star, who haunts island 6, off on a long flight.
  await page.evaluate(() => {
    window.__np.serpent.state = 'away';
    const o = window.__np.charterOffer;
    if (!o) return;
    o.wants = ['whales'];
    o.shirts = [1];
  });
  await card.click();
  await page.waitForFunction(() => window.__np.charter !== null, null, { timeout: 2000 });
  await expect(page.locator('#charter')).toBeVisible();
  await expect(page.locator('#charter')).toContainText('the whales');
  // Out to the whales, and one comes up beside the boat.
  await page.evaluate(() => {
    const np = window.__np;
    const m = np.whales.mother;
    np.boat.x = m.x + 200;
    np.boat.y = m.y;
    np.boat.v = 0;
    m.up = 3;
  });
  await page.waitForFunction(() => window.__np.charter?.seen.includes('whales'), null, {
    timeout: 3000,
  });
  await expect(page.locator('#charter')).toContainText('\u2713');
  // Back at island 6's pier: they pay, the trip, the whales and a tip for seeing it all; half that if a
  // shark circling a school by the whales happened to charge close and frighten them.
  const scared = await page.evaluate(() => !!(window.__np.charter as { scared?: boolean }).scared);
  await page.evaluate(() => {
    const np = window.__np;
    np.boat.x = 2400;
    np.boat.y = -1322 + 40;
    np.boat.v = 0;
  });
  await page.waitForFunction(() => window.__np.charter === null, null, { timeout: 3000 });
  // The fare, said as they step off. The purse may hold a little more: the net can sweep a fish on the way
  // out to the whales, and tying up sells it.
  const paid = scared ? 300 : 600;
  await expect(page.locator('#toast')).toContainText(`+${paid} coins`);
  expect(await page.evaluate(() => window.__np.chartersRun)).toBe(1);
  expect(await page.evaluate(() => window.__np.coins)).toBeGreaterThanOrEqual(paid);
  await expect(page.locator('#charter')).toBeHidden();
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
  ).toEqual({ isle2: 1, isle3: 0, isle6: 0, floe: 0 });
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
  // Built, the base is a chip in the Yours row.
  await expect(card).toBeHidden();
  await expect(page.locator('#yours')).toContainText('Your base on island 2');
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
    // Met already, so his first sighting does not talk over the pots at the buoys.
    reaperSeen: true,
    bases: { isle2: 0, isle3: 1 },
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -600 + 322, y: -600 + 154, h: Math.PI, clock: 0.3, hold: [] },
  });
  const card = page.locator('#baseBtn');
  await expect(card).toContainText('Build a crab shed here');
  await card.click();
  await expect(card).toBeHidden();
  await expect(page.locator('#yours')).toContainText('Your base on island 3');
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
  // Past the buoys, no pots. The Reaper roams out there: held off, so his hunt does not talk over it.
  await page.evaluate(() => {
    window.__np.reaper.holdOff = () => true;
    const b = window.__np.boat;
    b.x = 5100;
    b.y = 2300;
  });
  await button.click();
  await expect(page.locator('#toast')).toContainText('No crab pots past the buoys');
  expect(await page.evaluate(() => window.__np.pots.length)).toBe(1);
  expect(errors).toEqual([]);
});

test('the trench: the Dive button shows anywhere on its dark water, and a boat still under way is told to stop', async ({
  context,
  page,
}) => {
  // Reported from the owner's phone: stopped on the bubbles, no Dive button. The dark patch is drawn out to 180 from
  // the trench's middle, and the button used to want 150 and a boat all but stopped.
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    trenchSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 165, y: -620, h: Math.PI, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#diveBtn')).toBeVisible();
  // Under way over it: no button yet, and how to dive here.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 1250 - 120;
    b.y = -620;
    b.h = 0;
    b.v = 300;
  });
  await expect(page.locator('#toast')).toContainText('Let go of the stick');
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
    gear: { tank: true },
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
  // The big air tank from the shipwright: more air in it.
  expect(await page.evaluate(() => window.__np.diver.airMax)).toBe(120);
  expect(await page.evaluate(() => window.__np.diver.air)).toBeGreaterThan(100);
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
  // On a phone the other thumb is on the stick, and an iPhone makes no click of the tap: the press alone throws.
  await page.waitForFunction(
    () => !document.getElementById('throw')?.classList.contains('wait'),
    null,
    {
      timeout: 3000,
    },
  );
  await put();
  await page.waitForFunction((si) => window.__np.diveAim?.si === si, squid, { timeout: 2000 });
  await put();
  await page.dispatchEvent('#throw', 'pointerdown', {
    button: 0,
    pointerType: 'touch',
    isPrimary: false,
  });
  await page.waitForFunction(() => window.__np.hold >= 2, null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('trench treasure: swim up to the chest on the floor and it is yours, once; the clam has a pearl', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 1,
    trenchSeen: true,
    trenchDeep: 900,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  const at = (kind: string) =>
    page.evaluate((k) => {
      const np = window.__np;
      const l = np.TRENCH_LOOT.find((t) => t.kind === k);
      if (!l) return;
      np.diver.x = l.x;
      np.diver.y = l.y - 14;
      np.diver.vx = 0;
      np.diver.vy = 0;
    }, kind);
  await at('chest');
  await page.waitForFunction(() => window.__np.trenchLoot !== 0, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('treasure chest');
  const after = await page.evaluate(() => window.__np.coins);
  expect(after).toBe(600);
  // Not twice.
  await at('chest');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__np.coins)).toBe(600);
  // The giant clam's pearl.
  await at('clam');
  await page.waitForFunction(() => window.__np.pearlDay > 0, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(750);
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').trenchLoot),
  ).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('the lurker: deep in the dark its eyes come, it bites air out of a diver who stays put, and a spear stings it off', async ({
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
    trenchDeep: 900,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  // Down in the midnight water, and it has nearly made up its mind.
  await page.evaluate(() => {
    const d = window.__np.diver;
    d.x = 380;
    d.y = 1100;
    d.vx = 0;
    d.vy = 0;
    window.__np.lurker.wait = 5.8;
  });
  await page.waitForFunction(() => window.__np.lurkerSeen, null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('Two eyes in the dark');
  // Its warning, a little way off a diver who stays put: the bite takes air.
  const air = await page.evaluate(() => {
    const np = window.__np;
    const d = np.diver;
    const l = np.lurker;
    d.vx = 0;
    d.vy = 0;
    l.x = d.x - 90;
    l.y = d.y;
    l.a = 0;
    l.state = 'tell';
    l.t = 0.05;
    return d.air;
  });
  await page.waitForFunction((a) => window.__np.diver.air < a - 20, air, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('bit your tank');
  // Out again, ahead of the diver: the throw goes for it, and the spear stings it off.
  const put = () =>
    page.evaluate(() => {
      const np = window.__np;
      const d = np.diver;
      const l = np.lurker;
      d.x = 380;
      d.y = 1100;
      d.vx = 0;
      d.vy = 0;
      d.face = 1;
      l.state = 'stalk';
      l.t = 5;
      l.x = d.x + 110;
      l.y = d.y;
    });
  await put();
  await page.waitForFunction(() => window.__np.diveAim !== null, null, { timeout: 2000 });
  await put();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.lurkerStung === 1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.lurker.state)).toBe('flee');
  expect(errors).toEqual([]);
});

test('the wreck: stopped beside it at island 5, dive to it, find its treasure, and spear a bone shark off', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    spear: 2,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: -2306, y: 2523, h: 0, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  const btn = page.locator('#diveBtn');
  await expect(btn).toBeVisible();
  await expect(btn).toContainText('Dive to the wreck');
  await btn.click();
  await page.waitForFunction(() => window.__np.diving && window.__np.diveSite === 'wreck', null, {
    timeout: 2000,
  });
  // Into the hold to the chest.
  await page.evaluate(() => {
    const np = window.__np;
    for (const b of np.boneSharks) {
      b.state = 'stung';
      b.t = 60;
    }
    np.diver.x = np.WRECK_CHEST.x + 8;
    np.diver.y = np.WRECK_CHEST.y - 10;
    np.diver.vx = 0;
    np.diver.vy = 0;
  });
  await page.waitForFunction(() => window.__np.wreckChest, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(1200);
  await expect(page.locator('#toast')).toContainText("wreck's treasure");
  // Out in the open, a bone shark ahead: the throw goes for it and stings it off.
  const put = () =>
    page.evaluate(() => {
      const np = window.__np;
      const d = np.diver;
      d.x = 450;
      d.y = 110;
      d.vx = 0;
      d.vy = 0;
      d.face = 1;
      const b = np.boneSharks[0];
      if (!b) return;
      b.state = 'cruise';
      b.t = 0;
      b.x = 560;
      b.y = 110;
    });
  await put();
  await page.waitForFunction(() => window.__np.diveAim !== null, null, { timeout: 2000 });
  await put();
  await page.click('#throw');
  await page.waitForFunction(() => window.__np.boneSharks[0]?.state === 'stung', null, {
    timeout: 3000,
  });
  // Back up: the treasure is saved.
  await page.click('#surfaceBtn');
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 10000 });
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').wreckChest),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('storms: out past the buoys a storm warns, comes, slows the boat, and the fish boil up after', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 0,
    isle2Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 1250 + 60, y: -620 + 40, h: 2.5, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const st = window.__np.storm;
    st.bring();
  });
  await expect(page.locator('#toast')).toContainText('a storm is coming');
  // Hurried on from its warning.
  await page.evaluate(() => {
    window.__np.storm.t = 0.2;
  });
  await page.waitForFunction(() => window.__np.storm.phase === 'storm', null, { timeout: 3000 });
  await expect(page.locator('#toast')).toContainText('The storm is here');
  await page.waitForFunction(() => window.__np.stormE > 0.9, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.stormSeen)).toBe(true);
  // Full ahead in it, the boat makes less than its top speed.
  await page.evaluate(() => {
    window.__np.keys = 'drive';
  });
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(2500);
  const v = await page.evaluate(() => window.__np.boat.v);
  await page.keyboard.up('ArrowUp');
  expect(v).toBeLessThan(350 * 0.8);
  expect(v).toBeGreaterThan(350 * 0.5);
  // It passes, and the fish boil up.
  await page.evaluate(() => {
    window.__np.storm.t = 0.1;
  });
  await page.waitForFunction(() => window.__np.storm.phase === 'boil', null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('boiling up');
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

test("the Reaper's egg hatches at dawn: the baby swims and leaps by the boat, and walks ashore", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 3,
    day: 3,
    reaperLandSeen: true,
    reaperEgg: 2,
    eggDay: 3,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  // Taken aboard today: it waits for the morning.
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => [window.__np.reaperEgg, window.__np.hatchT])).toEqual([2, -1]);
  // A new day: a moment for the dawn, then the cutscene. The little egg shakes on deck, Crack! Crack! Crrrrack!,
  // he is out, and over the side he goes.
  await page.evaluate(() => {
    window.__np.eggDay = 0;
  });
  await page.waitForFunction(() => window.__np.cine?.kind === 'egg', null, { timeout: 5000 });
  await expect(page.locator('body')).toHaveClass(/cine/);
  // A tap as it begins does not skip it.
  await page.mouse.click(195, 600);
  expect(await page.evaluate(() => window.__np.cine?.kind)).toBe('egg');
  await page.waitForFunction(() => (window.__np.eggT ?? 0) > 5.4, null, { timeout: 8000 });
  expect(await page.evaluate(() => window.__np.reaperEgg)).toBe(2);
  await page.waitForFunction(() => window.__np.reaperEgg === 3, null, { timeout: 5000 });
  await page.waitForFunction(() => window.__np.cine === null, null, { timeout: 4000 });
  await expect(page.locator('body')).not.toHaveClass(/cine/);
  await expect(page.locator('#toast')).toContainText('baby Reaper');
  await page.waitForFunction(() => window.__np.baby.swimming && window.__np.baby.leapT < 0, null, {
    timeout: 3000,
  });
  const gap = await page.evaluate(() =>
    Math.hypot(window.__np.baby.x - window.__np.boat.x, window.__np.baby.y - window.__np.boat.y),
  );
  expect(gap).toBeLessThan(90);
  // Tap him: a pat, and a leap.
  const at = await page.evaluate(() => window.__np.babyAt);
  expect(at).not.toBeNull();
  await page.mouse.click(at?.[0] ?? 0, at?.[1] ?? 0);
  await page.waitForFunction(() => window.__np.baby.love > 0, null, { timeout: 2000 });
  // Kept: a reload finds him hatched and swimming.
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(await page.evaluate(() => window.__np.reaperEgg)).toBe(3);
  await page.waitForFunction(() => window.__np.baby.swimming, null, { timeout: 3000 });
  // Ashore at island 2's berth, he walks with the figure.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = -600 + 330 * Math.SQRT1_2;
    b.y = 5400 - 330 * Math.SQRT1_2;
    b.h = 2.36;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.baby.shown, null, { timeout: 3000 });
  expect(errors).toEqual([]);
});

test('the flotilla: the warrior, the bones, the necromancer and the tarling sail their own craft, and step off them ashore', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 4,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    isle6Stage: 2,
    isle7Seen: true,
    isle7Stage: 4,
    soulArmour: true,
    isle8Seen: true,
    heronStage: 2,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  // Out at sea, each on its craft, the four of them round the boat.
  await page.waitForFunction(() => window.__np.flotilla.crafts.every((c) => c.placed), null, {
    timeout: 3000,
  });
  const sea = await page.evaluate(() => {
    const { flotilla: f, boat: b } = window.__np;
    return {
      kinds: f.crafts.map((c) => c.kind),
      gaps: f.crafts.map((c) => Math.hypot(c.x - b.x, c.y - b.y)),
      riding: ['warrior', 'bones', 'necro', 'tarling'].map((r) => f.riding(r)),
    };
  });
  expect(sea.kinds).toEqual(['airboat', 'catamaran', 'windsurf', 'banana']);
  for (const g of sea.gaps) expect(g).toBeLessThan(260);
  expect(sea.riding).toEqual([true, true, true, true]);
  // Ashore at island 2's berth: they step off and walk with the figure; the craft wait.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = -600 + 330 * Math.SQRT1_2;
    b.y = 5400 - 330 * Math.SQRT1_2;
    b.h = 2.36;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.click('#ashore');
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 4000 });
  await page.waitForFunction(() => window.__np.warriorPal.shown, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.flotilla.riding('warrior'))).toBe(false);
  expect(await page.evaluate(() => window.__np.flotilla.crafts.every((c) => c.placed))).toBe(true);
  expect(errors).toEqual([]);
});

test('the Boats card: the kid puts a friend on a boat, the two swap, and it is kept', async ({
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
    isle7Seen: true,
    isle7Stage: 4,
    soulArmour: true,
    isle8Seen: true,
    heronStage: 2,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 3000, y: 2900, h: 0.6, clock: 0.3, hold: [] },
  });
  await page.waitForFunction(() => document.getElementById('boatsBtn')?.hidden === false, null, {
    timeout: 3000,
  });
  await page.locator('#boatsBtn').dispatchEvent('click');
  await expect(page.locator('#boats')).toBeVisible();
  // Four boats, each offering the four friends and Nobody; the warrior has the airboat to start.
  await expect(page.locator('#boatsList .boat')).toHaveCount(4);
  await expect(page.locator('#boatsList .rchip.on[data-craft="airboat"]')).toHaveText('Warrior');
  // The tarling onto the airboat: the warrior takes his banana boat.
  await page.locator('#boatsList [data-craft="airboat"][data-rider="tarling"]').click();
  await expect(page.locator('#boatsList .rchip.on[data-craft="airboat"]')).toHaveText('Tarling');
  await expect(page.locator('#boatsList .rchip.on[data-craft="banana"]')).toHaveText('Warrior');
  // Nobody on the catamaran: the necromancer goes back to the deck.
  await page.locator('#boatsList [data-craft="catamaran"][data-rider=""]').click();
  expect(await page.evaluate(() => window.__np.flotilla.crew)).toEqual({
    airboat: 'tarling',
    catamaran: null,
    windsurf: 'bones',
    banana: 'warrior',
  });
  await page.locator('#boatsClose').click();
  await expect(page.locator('#boats')).toBeHidden();
  // Kept: a reload finds the same crew, and the airboat towing the banana.
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(await page.evaluate(() => window.__np.flotilla.crew.airboat)).toBe('tarling');
  await page.waitForFunction(
    () => window.__np.flotilla.crafts.find((c) => c.kind === 'banana')?.tow,
    null,
    {
      timeout: 3000,
    },
  );
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
  // The far deep opening is said, the first time.
  await expect(page.locator('#toast')).toContainText('far deep is open');
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
  // A harpoon fired while he is up counts, though he has gone back under by the time it lands.
  const fired = await page.waitForFunction(
    () => {
      const np = window.__np;
      if (np.harpoonTarget !== 'king') return false;
      const r = np.king.resolve;
      np.fireHarpoon();
      np.king.state = 'dive';
      np.king.t = 0;
      return r;
    },
    null,
    { timeout: 30000, polling: 50 },
  );
  const r0 = Number(await fired.jsonValue());
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__np.king.resolve)).toBe(r0 - 1);
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

test('the Reaper: he hunts a boat out in the deep, sweeps, rears, and harpooned off leaves his ice fishing kit', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    spear: 4,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: 5500, h: Math.PI, clock: 0.3, hold: [] },
  });
  // Out in the deep south of home, by day, away from the gulper and the anglerfish; he swims up from the south.
  await page.evaluate(() => {
    window.__np.reaper.x = 2400;
    window.__np.reaper.y = 5900;
  });
  await page.waitForFunction(() => window.__np.reaper.hunting, null, { timeout: 4000 });
  await expect(page.locator('#toast')).toContainText('Reaper');
  expect(await page.evaluate(() => window.__np.reaperSeen)).toBe(true);
  // Nearly beaten; then the harpoon, whenever he is reared up and in reach.
  await page.evaluate(() => {
    window.__np.reaper.resolve = 1;
  });
  await page.waitForFunction(
    () => {
      window.__np.fireHarpoon();
      return window.__np.reaper.state === 'away';
    },
    null,
    { timeout: 30000, polling: 100 },
  );
  await expect(page.locator('#toast')).toContainText('ice fishing kit', { timeout: 9000 });
  expect(await page.evaluate(() => window.__np.driven.reaper)).toBe(1);
  expect(errors).toEqual([]);
});

test("ice fishing: alongside the floe with the Reaper's kit, drop the line and land what it hooks", async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    spear: 4,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#iceBtn')).toBeVisible({ timeout: 4000 });
  expect(await page.evaluate(() => window.__np.iceSeen)).toBe(true);
  await page.click('#iceBtn');
  await page.waitForFunction(() => window.__np.icing, null, { timeout: 2000 });
  await page.click('#iceDrop');
  // Down to the floor, and on the way up a char swims into the hook.
  await page.waitForFunction(() => window.__np.iceRun?.phase === 'reel', null, { timeout: 8000 });
  await page.evaluate(() => {
    const r = window.__np.iceRun;
    const f = r?.pool.find((f) => f.kind === 'char' && !f.caught && !f.on);
    if (r && f) {
      f.vx = 0;
      f.x = r.x;
      f.y = 300;
    }
  });
  await page.waitForFunction(() => window.__np.iceRun?.phase === 'done', null, { timeout: 12000 });
  expect(await page.evaluate(() => window.__np.iceRuns)).toBe(1);
  expect(await page.evaluate(() => window.__np.hold)).toBeGreaterThanOrEqual(1);
  await expect(page.locator('#toast')).toContainText('arctic char');
  await page.click('#iceLeave');
  await page.waitForFunction(() => !window.__np.icing, null, { timeout: 2000 });
  expect(errors).toEqual([]);
});

test('ice fishing: without the kit there is no fishing the floe, and the game says who has one', async ({
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
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#toast')).toContainText('Reaper', { timeout: 4000 });
  await expect(page.locator('#iceBtn')).toBeHidden();
  expect(errors).toEqual([]);
});

test('Neil: three ice fish tossed to the seal at the floe make him yours, and he swims along with the boat', async ({
  context,
  page,
}) => {
  const hold = new Array(23).fill(0);
  hold[20] = 3;
  const a = 0.5;
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    iceSeen: true,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + Math.cos(a) * 316,
      y: -2244 + Math.sin(a) * 316,
      h: a + Math.PI / 2,
      clock: 0.3,
      hold,
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#toast')).toContainText('looks like a Neil', { timeout: 4000 });
  // A tap on him, three times: each tosses him a polar cod from the hold.
  for (let i = 1; i <= 3; i++) {
    const at = await page.evaluate(() => window.__np.neilAt);
    expect(at, 'Neil is not on the screen').not.toBeNull();
    await page.mouse.click(at?.[0] ?? 0, at?.[1] ?? 0);
    await page.waitForFunction((n) => window.__np.neil.fed === n, i, { timeout: 2000 });
  }
  expect(await page.evaluate(() => [window.__np.neil.free, window.__np.hold])).toEqual([true, 0]);
  await expect(page.locator('#toast')).toContainText('his name is Neil');
  // Off the ice and into the water by the boat; under way he keeps up.
  await page.evaluate(() => {
    window.__np.boat.v = 200;
  });
  await page.waitForFunction(() => window.__np.neil.state === 'swim', null, { timeout: 3000 });
  await page.waitForTimeout(1500);
  const d = await page.evaluate(() => {
    const { boat, neil } = window.__np as unknown as {
      boat: { x: number; y: number };
      neil: { x: number; y: number };
    };
    return Math.hypot(neil.x - boat.x, neil.y - boat.y);
  });
  expect(d).toBeLessThan(80);
  expect(errors).toEqual([]);
});

test('Neil ice fishing: he sits by the hole, goes in after a fish, and it goes in the hold', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    iceSeen: true,
    neilFed: 3,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#iceBtn')).toBeVisible({ timeout: 4000 });
  await page.click('#iceBtn');
  await page.waitForFunction(() => window.__np.icing, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.iceSeal?.phase)).toBe('sit');
  // He goes in after one (the game sends him now and then; here, at once).
  expect(
    await page.evaluate(() => {
      const np = window.__np;
      return np.iceSeal?.dive(np.iceRun?.pool ?? []) ?? false;
    }),
  ).toBe(true);
  await page.waitForFunction(() => window.__np.hold >= 1, null, { timeout: 15000 });
  await expect(page.locator('#toast')).toContainText('Neil caught');
  expect(await page.evaluate(() => window.__np.iceSeal?.phase)).toBe('sit');
  await page.click('#iceLeave');
  await page.waitForFunction(() => !window.__np.icing, null, { timeout: 2000 });
  expect(errors).toEqual([]);
});

test('under the ice without the white suit: a dive through the hole gets too cold, and the rope pulls you back up', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    iceSeen: true,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  const btn = page.locator('#diveBtn');
  await expect(btn).toHaveText('Dive under the ice', { timeout: 4000 });
  await btn.click();
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  await expect(page.locator('#toast')).toContainText('freezing');
  expect(await page.evaluate(() => window.__np.diver.chill)).toBeGreaterThan(0);
  // Down under the ice, all but too cold: it tips over, and the rope pulls the diver back up the hole.
  await page.evaluate(() => {
    const d = window.__np.diver;
    d.x = 200;
    d.y = 300;
    d.cold = 0.97;
  });
  await expect(page.locator('#toast')).toContainText('Too cold', { timeout: 3000 });
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 6000 });
  await expect(page.locator('#toast')).toContainText('Up through the hole');
  expect(errors).toEqual([]);
});

test('under the ice in the white suit: warm, and a thing frozen in the ice is chipped out for coins', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    spear: 2,
    coins: 0,
    gear: { white: true },
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    iceSeen: true,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  await expect(page.locator('#diveBtn')).toHaveText('Dive under the ice', { timeout: 4000 });
  await page.click('#diveBtn');
  await page.waitForFunction(() => window.__np.diving, null, { timeout: 2000 });
  expect(await page.evaluate(() => window.__np.diver.chill)).toBe(0);
  // Just under the explorer's spyglass, frozen in the ice by the hole.
  await page.evaluate(() => {
    const d = window.__np.diver;
    d.x = 345;
    d.y = 50;
  });
  await page.waitForFunction(() => window.__np.iceLoot === 1, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.coins)).toBe(200);
  await expect(page.locator('#toast')).toContainText('out of the ice');
  await page.click('#surfaceBtn');
  await page.waitForFunction(() => !window.__np.diving, null, { timeout: 6000 });
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('netprofit.v1') ?? '{}').iceLoot),
  ).toBe(1);
  expect(errors).toEqual([]);
});

test('the igloo: built from the boat alongside the floe, a bed till morning, and a home port', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 2000,
    wood: 40,
    day: 3,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    iceSeen: true,
    driven: { reaper: 1 },
    reaperSeen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: {
      x: -2244 + 340 * Math.SQRT1_2,
      y: -2244 + 340 * Math.SQRT1_2,
      h: 3.9,
      clock: 0.3,
      hold: [],
    },
  });
  await page.evaluate(() => {
    window.__np.boat.v = 0;
  });
  const btn = page.locator('#iglooBtn');
  await expect(btn).toHaveText('Build an igloo', { timeout: 4000 });
  await btn.click();
  await expect(btn).toHaveText('Sleep till morning');
  expect(await page.evaluate(() => [window.__np.coins, window.__np.bases.floe])).toEqual([500, 1]);
  await expect(page.locator('#toast')).toContainText('Built an igloo');
  // A night in it: the next morning.
  await btn.click();
  await page.waitForFunction(() => window.__np.day === 4, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.phase)).toBe('Dawn');
  await expect(page.locator('#toast')).toContainText('A night in the igloo');
  // Not again while it is morning.
  await expect(btn).toBeHidden();
  // Lost out by the floe, the boat comes back up off it.
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = -2244 + 600;
    b.y = -2244 + 200;
    b.v = 0;
  });
  await page.evaluate(() => window.__np.swallow('log'));
  await page.waitForFunction(() => !window.__np.swallowing, null, { timeout: 4000 });
  const [at, spit] = await page.evaluate(() => [
    [window.__np.boat.x, window.__np.boat.y],
    window.__np.FLOE_BASE.spit,
  ]);
  expect(Math.hypot((at?.[0] ?? 0) - (spit?.x ?? 0), (at?.[1] ?? 0) - (spit?.y ?? 0))).toBeLessThan(
    40,
  );
  await expect(page.locator('#toast')).toContainText('your igloo on the ice floe');
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

test('the Reaper on land: he wakes by his nest on island 6, and beaten, his egg is yours and rides aboard', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 100,
    spear: 3,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    isle4Stage: 1,
    isle5Seen: true,
    isle5Stage: 1,
    isle6Seen: true,
    lv: { net: 5, hold: 5, engine: 5 },
    trip: { x: 2400, y: -1320, h: -Math.PI / 2, clock: 0.3, hold: [] },
  });
  await page.evaluate(() => {
    const b = window.__np.boat;
    b.x = 2400;
    b.y = -1320;
    b.v = 0;
  });
  await expect(page.locator('#ashore')).toBeVisible({ timeout: 4000 });
  await page.locator('#ashore').click();
  await page.waitForFunction(() => window.__np.walker.state === 'ashore', null, { timeout: 5000 });
  expect(await page.evaluate(() => window.__np.landReaper.state)).toBe('sleep');
  // Up the beach toward his cove: sighted asleep first, then he wakes.
  await page.evaluate(() => {
    const { walker: w, NEST6: n } = window.__np;
    w.x = n.x + 200;
    w.y = n.y + 180;
  });
  await page.waitForFunction(() => window.__np.reaperLandSeen, null, { timeout: 3000 });
  expect(await page.evaluate(() => window.__np.landReaper.state)).toBe('sleep');
  await page.evaluate(() => {
    const { walker: w, NEST6: n } = window.__np;
    w.x = n.x + 110;
    w.y = n.y + 90;
  });
  await page.waitForFunction(() => window.__np.landReaper.awake, null, { timeout: 3000 });
  await expect(page.locator('#hearts')).toBeVisible();
  // His scales turn a spear until he rears up; then the throw button shows.
  expect(await page.evaluate(() => window.__np.landReaper.hit(2))).toBe(false);
  await page.waitForFunction(() => window.__np.landReaper.open, null, { timeout: 20000 });
  await expect(page.locator('#throw')).toBeVisible({ timeout: 2000 });
  // Beat him: he backs off into the sea, and the egg waits in his nest.
  await page.evaluate(() => window.__np.landReaper.hit(99, true));
  await page.waitForFunction(() => window.__np.reaperEgg === 1, null, { timeout: 4000 });
  expect(await page.evaluate(() => window.__np.coins)).toBeGreaterThanOrEqual(1100);
  await page.evaluate(() => {
    const { walker: w, NEST6: n } = window.__np;
    w.x = n.x + 6;
    w.y = n.y + 6;
  });
  await page.waitForFunction(() => window.__np.reaperEgg === 2, null, { timeout: 3000 });
  // It is kept, and he stays beaten.
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => [window.__np.reaperEgg, window.__np.landReaper.state])).toEqual([
    2,
    'gone',
  ]);
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

test('tester: the #tester link shows a Tester button in the shop, and skipping to the Shark King marks him and all before him beaten', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true, coins: 300 }, './#tester');
  // The link's end is tidied away, and the button is there from now on.
  expect(new URL(page.url()).hash).toBe('');
  expect(await page.evaluate(() => document.getElementById('testerBtn')?.hidden)).toBe(false);
  await page.locator('#testerBtn').dispatchEvent('click');
  await expect(page.locator('#tester')).toBeVisible();
  await expect(page.locator('#testerSteps .tstep.done')).toHaveCount(0);
  // An extra: coins, straight away.
  await page.locator('#testerExtras [data-extra="coins"]').click();
  expect(await page.evaluate(() => window.__np.coins)).toBe(10300);
  // The button itself says it worked, since the toasts are behind the panel; then it goes back to Add.
  await expect(page.locator('#testerExtras [data-extra="coins"]')).toContainText('Added');
  await expect(page.locator('#testerExtras [data-extra="coins"]')).not.toContainText('Added', {
    timeout: 3000,
  });
  // The pets: the otter and Neil, and the naga, each once.
  for (const k of ['otter', 'neil', 'naga']) {
    await page.locator(`#testerExtras [data-extra="${k}"]`).click();
    await expect(page.locator(`#testerExtras [data-extra="${k}"]`)).toContainText('Have it', {
      timeout: 3000,
    });
  }
  expect(
    await page.evaluate(() => [
      window.__np.otter.free,
      window.__np.neil.free,
      window.__np.nagaFree,
    ]),
  ).toEqual([true, true, true]);
  // A step: the game saves and starts again, past the Shark King.
  await Promise.all([
    page.waitForEvent('load'),
    page.locator('#testerSteps .tstep', { hasText: 'Skeleton Shark King' }).click(),
  ]);
  await page.waitForTimeout(400);
  await page.click('#go');
  expect(
    await page.evaluate(() => {
      const n = window.__np;
      return [n.isle3Stage, n.isle4Stage, n.isle5Seen, n.isle5Stage, n.isle6Stage, n.coins];
    }),
  ).toEqual([4, 1, true, 1, 0, 10300]);
  expect(await page.evaluate(() => document.getElementById('testerBtn')?.hidden)).toBe(false);
  await page.locator('#testerBtn').dispatchEvent('click');
  await expect(page.locator('#testerSteps .tstep.done')).toHaveCount(3);
  // And #tester-off, typed onto the page already open, puts it away again.
  await page.locator('#testerClose').click();
  await page.evaluate(() => {
    location.hash = 'tester-off';
  });
  await page.waitForFunction(() => document.getElementById('testerBtn')?.hidden === true, null, {
    timeout: 2000,
  });
  expect(new URL(page.url()).hash).toBe('');
  expect(errors).toEqual([]);
});

test('tester: without the link there is no Tester button', async ({ context, page }) => {
  const errors = await boot(context, page, { muted: true, coins: 300 });
  expect(await page.evaluate(() => document.getElementById('testerBtn')?.hidden)).toBe(true);
  expect(errors).toEqual([]);
});

test('another device: the shop copies a link to the game, and opened elsewhere it asks, then loads it', async ({
  browser,
  context,
  page,
}) => {
  const errors = await boot(context, page, {
    muted: true,
    coins: 4321,
    day: 7,
    isle2Seen: true,
    isle3Seen: true,
    isle3Stage: 4,
    lv: { net: 3, hold: 2, engine: 2 },
  });
  await page.locator('#carryBtn').dispatchEvent('click');
  await expect(page.locator('#carry')).toBeVisible();
  await expect(page.locator('#carryLink')).toHaveValue(/#game=z/);
  const link = await page.locator('#carryLink').inputValue();
  expect(link.length).toBeLessThan(2000);

  // The other device, with a game of its own.
  const other = await browser.newContext({ viewport: { width: 390, height: 780 } });
  await other.addInitScript(
    (s: string) => {
      if (!localStorage.getItem('netprofit.v1')) localStorage.setItem('netprofit.v1', s);
    },
    JSON.stringify({ muted: true, coins: 50, day: 2 }),
  );
  const p2 = await other.newPage();
  p2.on('pageerror', (e) => errors.push(String(e)));
  await p2.goto(link);
  await expect(p2.locator('#carryAsk')).toBeVisible();
  await expect(p2.locator('#carryThere')).toHaveText('day 7, 4,321 coins, past island 3');
  await expect(p2.locator('#carryHere')).toHaveText('day 2, 50 coins');
  expect(new URL(p2.url()).hash).toBe('');
  await Promise.all([p2.waitForEvent('load'), p2.locator('#carryYes').click()]);
  await p2.waitForTimeout(400);
  await p2.click('#go');
  expect(
    await p2.evaluate(() => [window.__np.coins, window.__np.day, window.__np.isle3Stage]),
  ).toEqual([4321, 7, 4]);

  // Pasted in, it asks too; kept, nothing changes.
  await p2.locator('#carryBtn').dispatchEvent('click');
  await p2.locator('#carryIn').fill(link.replace(/#game=.*/, '#game=zNOTAGAMEATALL'));
  await p2.locator('#carryLoad').click();
  await expect(p2.locator('#carryAsk')).toBeHidden();
  await p2.locator('#carryIn').fill(`  ${link}\n`);
  await p2.locator('#carryLoad').click();
  await expect(p2.locator('#carryAsk')).toBeVisible();
  await p2.locator('#carryNo').click();
  await expect(p2.locator('#carryAsk')).toBeHidden();
  expect(await p2.evaluate(() => window.__np.coins)).toBe(4321);
  await other.close();
  expect(errors).toEqual([]);
});

test('installable: a manifest with its icons, a service worker, and with no signal the game still opens', async ({
  context,
  page,
}) => {
  const errors = await boot(context, page, { muted: true, coins: 777 });
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();
  const app = await page.evaluate(async (h) => {
    const m = await (await fetch(h as string)).json();
    const sizes: string[] = [];
    for (const i of m.icons)
      if ((await fetch(new URL(i.src, new URL(h as string, location.href)))).ok)
        sizes.push(i.sizes);
    return { name: m.name, display: m.display, start: m.start_url, sizes };
  }, href);
  expect(app).toMatchObject({ name: 'Net Profit', display: 'standalone', start: './' });
  expect(app.sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  // The service worker takes over and keeps the page and its script.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(
    async () => {
      const keys = await (await caches.open('netprofit')).keys();
      return keys.some((r) => r.url.includes('/assets/')) && keys.some((r) => r.url.endsWith('/'));
    },
    null,
    { timeout: 5000, polling: 200 },
  );
  // No signal: the game opens from what was kept, the save with it.
  await context.setOffline(true);
  // The game's own check for a new version is not answered from what was kept: it goes to the network, and fails.
  expect(
    await page.evaluate(async () => {
      const got = async (init?: RequestInit) => {
        try {
          return (await fetch('./', init)).ok;
        } catch {
          return 'failed';
        }
      };
      return [await got(), await got({ cache: 'no-store' })];
    }),
  ).toEqual([true, 'failed']);
  await page.reload();
  await page.waitForTimeout(400);
  await page.click('#go');
  await page.waitForFunction(() => window.__np?.coins === 777, null, { timeout: 3000 });
  await context.setOffline(false);
  expect(errors).toEqual([]);
});
