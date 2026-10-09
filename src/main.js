// The prototype game script, moved here verbatim from index.html so Vite can
// serve and bundle it. Phase 1 of project.md splits it into modules; until
// then it is not linted or type-checked, and legacy/net-profit.html stays the
// behavioural reference.
import { baseZoom, dirToWorld, onScreen as isoOnScreen, screenX, screenY } from './core/iso';
import { COST, DAY_LEN, HOLD, MAXLV, NETW, PAINTS, PARROT, PIRATE_SPEED, PIRATE_UNLOCK, RING_R, SHARK, SPECIES, SPEED, STAGES, TIER_NAME } from './data/tuning';
import { angDiff, clamp } from './core/math';
import { rgba, shade } from './core/color';
import { GEAR, GEAR_IDS, noGear, refusal, shipwrightOpen, stealShare } from './data/gear';
import { guidePage } from './data/guide';
import { EMBLEMS, FLAG_COLOR_NAMES, FLAG_COLORS, flagShapes, flagSvg, PATTERNS, START_FLAG } from './data/flag';
import { CAST_RANGE, CAST_SPEED, Fight, MAX_DISTANCE, MISS_LINE, smoothPull, snookHome, TOLL } from './fishing/snook';
import { buyer, FISHMONGER_STAGE, NO_PICK, pickMarket, salePrice, SMOKEHOUSE_STAGE, vendorsOpen } from './data/vendors';
import { hullScale, levelCap, paintsUnlocked, rangeOf, tierOf } from './data/progression';
import { advanceClock, dayState, PHASE_COLOR as PHASE_C } from './world/daycycle';
import { parseSave, SAVE_KEY, serializeSave } from './state/save';
import { ABUTMENTS, around, BEACH, BRIDGE, BRIDGE_BUMPS, BRIDGE_PARTS, BRIDGE_SOUTH, bridgeAt, bridgePartDepth, CRATE, DEEP, DOCK, FAR, FAR_BUOY_GAP, IR, IX, IY, pastBuoys, pastFar, PIER, PIER_BUMPS, pushOut, PX0, SMOKEHOUSE, SNOOK_SPOT, STALL, seaEdge, TOLL_SIGN, TWX, TWY, TX, TY, UMBRELLA, WS } from './world/island';
import { placeNetBehind, towLength, towNet } from './entities/net';
import { bindJoystick, bindJoystickThrough, createJoystick, JR, joystickVector } from './input/joystick';
import { bindKeys, keyControls, keyVector, smoothVector } from './input/keys';
import { steerBoat, steerBoatRelative } from './entities/boat';
import { cues as sfx, getContext, setCueListener, setMuted, unlock as audio } from './audio/sfx';
import { Ambience } from './audio/ambience';
import { ToastQueue } from './ui/toast';
import { Dolphins } from './entities/dolphins';
import { CRATES, DRIFTWOOD, Flotsam } from './entities/flotsam';
import { Gulls } from './entities/gulls';
import { Jellies } from './entities/jellies';
import { PET_REACH, Pets } from './entities/pets';
import { Leviathan } from './entities/leviathan';
import { Cthuluviathan } from './entities/cthuluviathan';
import { Anglerfish } from './entities/anglerfish';
import { Gulper } from './entities/gulper';
import { Shallows } from './entities/shallows';
import { BLUE, Fighter, GREEN, RED, SLASH_ARC, SLASH_SLACK, SWORDSMAN } from './entities/fighter';
import { BONK_EVERY, BONK_R, Monkeys } from './entities/monkeys';
import { BOLT_HIT, CALL_N, Sorcerer, THIRD_HP } from './entities/sorcerer';
import { Warlock, WARLOCK_HEARTS } from './entities/warlock';
import { WarlockBoat } from './entities/warlockboat';
import { CAGE, DEMON, DOOR, entry, GATE, HALL, HALL_A, HALL_B, ROOF, ROOF3, ROOF7, ROOMS, RUINS, STEP, stairs, TEMPLE6, THRONE, TOWERS } from './world/tower';
import { Spears } from './entities/spears';
import { nextSpear, spearAt } from './data/spear';
import { drivePrize, HARPOON_LEVEL, HARPOON_POWER, HARPOON_RANGE, HARPOON_RELOAD, noDriven, RESOLVE, TROPHY } from './data/harpoon';
import { HP_MAX, HURT, hurt, mend, SPIT, SWALLOW } from './data/health';
import { dockAt, HOME_DOCK, ISLE2_DOCK, ISLE3_DOCK, ISLE6_DOCK, ISLE7_DOCK, tarDock, WALK_ZOOM, Walker, walkerDepth, walkStep } from './entities/walker';
import { CAMP, CHEST, DOCK2, FIRE, HUTS, ISLE2, PALMS2, POST, TOTEM, TOWER } from './world/isle2';
import { DIVE3, DOCK3, DOOR3, ISLE3, MAT, onPlanks, pushOffTown, TRADER_MID } from './world/isle3';
import { atTar, ISLE4, MONSTER, SUMMONER, TAR_R, TAR_STOP } from './world/isle4';
import { ANCHOR_HIT, Anchorer, BODY_R, SWEEP_R } from './entities/anchorer';
import { Tarbaby } from './entities/tarbaby';
import { drawIsle4Flat, drawIsle4Sea, isle4Solids } from './render/isle4';
import { ISLE5, SIGHT5 } from './world/isle5';
import { BITE as KING_BITE, KING_RESOLVE, SharkKing, TRIDENT as KING_TRIDENT } from './entities/sharkking';
import { drawBoneFins, drawIsle5Flat, drawIsle5Sea, isle5Solids } from './render/isle5';
import { berth6, CHEST_COINS, CHEST_REACH, CHESTS6, ISLE6, POST6_MID, pushOffIsle6, SIGHT6, shoreR as shore6, TEMPLE } from './world/isle6';
import { BODY_R as DEEP_BODY, DEEP_RESOLVE, DeepOne, LOG as DEEP_LOG } from './entities/deepone';
import { Cthulhu, CTH_R } from './entities/cthulhu';
import { Pal } from './entities/pals';
import { drawIsle6Flat, drawIsle6Sea, isle6Solids } from './render/isle6';
import { CAMP7, CHEST7, DOCK7, DOOR7, ISLE7, PORTAL7, POST7_MID, pushOffIsle7, SIGHT7 } from './world/isle7';
import { drawIsle7Flat, drawIsle7Sea, drawPortal7, isle7Glow, isle7Solids } from './render/isle7';
import { Horde } from './entities/undead';
import { ARC as FG_ARC, FORGOTTEN_HP, Forgotten, REACH as FG_REACH, RAY_HIT, SKULL_HIT } from './entities/forgotten';
import { Allies } from './entities/allies';
import { CASTLE_ROOMS, CASTLE_SPAWNS, COLUMNS, FORGOTTEN_START, LANCER_POSTS, LOCKED, LOCKED_REACH, PORTAL_OUT, SEAT } from './world/gigantis';
import { LANCE_ARC, LANCE_REACH, Lancers } from './entities/lancers';
import { drawCastleBack, drawCastleDoor, drawColumn, drawCourtBack, drawLockedDoor, drawRuinsBack, drawThrone } from './render/gigantis';
import { drawIsle3Flat, drawIsle3Sea, isle3Glow, isle3Lights, isle3Solids } from './render/isle3';
import { drawCage, drawDemonBack, drawHallBack, drawPortal } from './render/depths';
import { Mantas } from './entities/mantas';
import { Turtles } from './entities/turtles';
import { bushSolids, drawGroundPlants, drawUnderwaterPlants } from './render/plants';
import { Pirate } from './entities/pirate';
import { Rare } from './entities/rare';
import { Sharks } from './entities/sharks';
import { Whales } from './entities/whales';
import { Scene } from './render/layers';
import { createDeepSchools, createFarSchools, createIsle2Schools, createIsle3Schools, createSchools, resetSchools, updateSchools } from './world/schools';
(() => {
'use strict';
const $ = id => document.getElementById(id);
const cv = $('sea'), ctx = cv.getContext('2d');

/* ---------- tuning ---------- */
const C = {
  abyss:'#1B6676', lagoon:'#2B8A99', mid:'#36A0A8', shallow:'#5BBFB5', shore:'#8ADBC6',
  sand:'#F2D79B', grass:'#7DBB6B', foam:'#F3FFFB', ink:'#12303A',
  hull:'#E4572E', trim:'#FFF6E5', deck:'#E8C58A', cabin:'#FFF6E5', roof:'#1F6B7A',
  wood:'#9C6A34', woodTop:'#D9A566', coin:'#FFC53D'
};
const HULL = [[34,0],[18,11],[-24,11],[-28,6],[-28,-6],[-24,-11],[18,-11]];

/* ---------- state ---------- */
let coins = 0, earned = 0, muted = false, paint = 0, wood = 0, build = 0, carry = 0, levSeen = false, whaleSeen = false, mantaSeen = false, cthuluSeen = false, anglerSeen = false, petted = false, isle2Seen = false, isle3Seen = false, isle3Stage = 0, isle4Stage = 0, isle5Seen = false, isle5Stage = 0, isle6Seen = false, chests6 = 0, isle6Stage = 0, isle7Seen = false, isle7Stage = 0, flag = null, gulperSeen = false, spear = 0, masks = 0, towerTaken = false, turtleSeen = false, turtleSwims = 0, keyMode = 'drive';
let hp = HP_MAX, swallowT = 0, irisT = 0, hpShown = -1; // the boat's health in the deep, and being swallowed
let clock = .13, dark = 0, warm = 0, phase = 'Day', lastPhase = 'Day', rangeToastT = 0, deepToastT = 0, wasDeep = false, farToastT = 0, wasFar = false;
const lv = {net:0, hold:0, engine:0};
const log = SPECIES.map(() => 0);
let order = {sp:0, n:8, have:0, pay:15}, market = NO_PICK, day = 1;
const first = new Array(SPECIES.length).fill(0); // the day each species was first landed
const gear = noGear(); // what the shipwright has fitted
const driven = noDriven(); // how many times the harpoon has driven off each leviathan
const snook = {casts:0, landed:0, kept:0, giant:0, best:0, firstDay:0}; // the fishing log
let fight = null, pullSmooth = 0, slipT = 0, slipShow = 9, castShown = false; // the line: a Fight while one is out
function noteFirst(sp){ if (!first[sp]) first[sp] = day; }
const SAVE_BOUNDS = {maxLevel: MAXLV, paints: PAINTS.length, stages: STAGES.length, species: SPECIES.length, worldSize: WS, deep: DEEP + FAR, holdCaps: HOLD};
let savedTrip = null;
{ let raw = null; try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  const s = parseSave(raw, SAVE_BOUNDS);
  coins = s.coins; earned = s.earned; muted = s.muted; lv.net = s.lv.net; lv.hold = s.lv.hold; lv.engine = s.lv.engine;
  paint = s.paint; levSeen = s.levSeen; whaleSeen = s.whaleSeen; mantaSeen = s.mantaSeen; cthuluSeen = s.cthuluSeen; anglerSeen = s.anglerSeen; petted = s.petted; isle2Seen = s.isle2Seen; isle3Seen = s.isle3Seen; isle3Stage = s.isle3Stage; isle4Stage = s.isle4Stage; isle5Seen = s.isle5Seen; isle5Stage = s.isle5Stage; isle6Seen = s.isle6Seen; chests6 = s.chests6; isle6Stage = s.isle6Stage; isle7Seen = s.isle7Seen; isle7Stage = s.isle7Stage; flag = s.flag; gulperSeen = s.gulperSeen; spear = s.spear; masks = s.masks; towerTaken = s.towerTaken; turtleSeen = s.turtleSeen; turtleSwims = s.turtleSwims; Object.assign(gear, s.gear); Object.assign(driven, s.driven); Object.assign(snook, s.snook); wood = s.wood; build = s.build; s.log.forEach((n,i) => { log[i] = n; }); order = s.order; market = s.market; day = s.day; s.first.forEach((n,i) => { first[i] = n; }); savedTrip = s.trip; keyMode = s.keys; }
setMuted(muted);
function save(){ try { localStorage.setItem(SAVE_KEY, serializeSave({coins, earned, muted, lv, paint, log, order, wood, build, market, day, first, levSeen, whaleSeen, mantaSeen, cthuluSeen, anglerSeen, petted, isle2Seen, isle3Seen, isle3Stage, isle4Stage, isle5Seen, isle5Stage, isle6Seen, chests6, isle6Stage, isle7Seen, isle7Stage, flag, gulperSeen, spear, masks, towerTaken, driven, turtleSeen, turtleSwims, gear, snook, trip: tripSnapshot() || null, keys: keyMode})); } catch (e) {} }
// The trip is what a phone loses when it discards a backgrounded tab: where the boat is, what time it is, what is in the hold.
function tripSnapshot(){ return started ? {x: Math.round(boat.x), y: Math.round(boat.y), h: +boat.h.toFixed(3), clock: +clock.toFixed(4), hold: hold.slice()} : (savedTrip || undefined); }

let T = 0, started = false, docked = false, sellT = 0, saleSum = 0, saleN = 0;
let combo = 0, comboT = 0, shake = 0, wakeT = 0;
const hold = SPECIES.map(() => 0); let holdTotal = 0;
const boat = {x: DOCK.x+125, y: IY+125, h: .45, v: 0};
const net = {x:0, y:0, speed:0, torn:0};
let Zbase = 1;
const pirateEntity = new Pirate(); const pirate = pirateEntity.ship;
const wakes = [], flies = [], texts = [];
if (savedTrip){ // resume an interrupted trip before the camera and net are placed; parseSave already clamped it
  if (savedTrip.x !== undefined){ boat.x = savedTrip.x; boat.y = savedTrip.y; }
  if (savedTrip.h !== undefined) boat.h = savedTrip.h;
  if (savedTrip.clock !== undefined) clock = savedTrip.clock;
  if (savedTrip.hold){ savedTrip.hold.forEach((n,i) => { hold[i] = n; }); holdTotal = hold.reduce((a,b) => a+b, 0); }
}
wasDeep = pastBuoys(boat.x, boat.y); wasFar = pastFar(boat.x, boat.y); // a trip restored out in the deep has not just crossed the buoys
const cam = {x: boat.x, y: boat.y};

/* ---------- view ---------- */
let W = 0, H = 0, DPR = 1, Z = 1, shx = 0, shy = 0, viewDY = 0, dockView = 0, walkView = 0;
function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  Zbase = baseZoom(W, H); Z = Zbase;
}
window.addEventListener('resize', resize); resize();
// One mutable view shared with core/iso so the hot paths allocate nothing.
const view = {camX:0, camY:0, zoom:1, width:0, height:0, shakeX:0, shakeY:0, viewDY:0};
function syncView(){ view.camX = cam.x; view.camY = cam.y; view.zoom = Z; view.width = W; view.height = H; view.shakeX = shx; view.shakeY = shy; view.viewDY = viewDY; return view; }
const px = (x,y) => screenX(x, y, syncView());
const py = (x,y,z=0) => screenY(x, y, z, syncView());
const onScreen = (x,y,m) => isoOnScreen(x, y, m, syncView());
const drawView = { ctx, px, py, onScreen, zoom: 1, dark: 0, T: 0, foam: C.foam, coin: C.coin, ship: (s, look) => drawShip(s, look), isoEllipse: (x,y,r,z) => isoEllipse(x,y,r,z), fishShape: (x,y,len,S,ang,wag) => fishShape(x,y,len,S,ang,wag), star: (x,y,r) => star(x,y,r), bird: (x,y,z,flap,s,a) => drawBird(x,y,z,flap,s,a), box: (x,y,w,h,z0,z1,c1,c2) => box(x,y,w,h,z0,z1,c1,c2), extrude: (pts,z0,z1,c1,c2) => extrude(pts,z0,z1,c1,c2), light: (x,y,z,r,k) => light(x,y,z,r,k), glow: (x,y,z,r,c) => glow(x,y,z,r,c), indicator: (wx,wy,bg,kind,pulse) => indicator(wx,wy,bg,kind,pulse) }; // what entities may draw with
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function isDark(){ const t = document.documentElement.getAttribute('data-theme'); if (t) return t === 'dark'; return !!(mq && mq.matches); }

/* ---------- helpers ---------- */
function tier(){ return tierOf(lv); }
function bk(){ return hullScale(tier()); }
function range(){ return rangeOf(tier()); }
function polyPath(pts,z){ ctx.beginPath(); for (let i=0;i<pts.length;i++){ const p = pts[i]; const x = px(p[0],p[1]), y = py(p[0],p[1],z); i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); }
function extrude(pts,z0,z1,side,top){
  const n = pts.length; let area = 0;
  for (let i=0;i<n;i++){ const a = pts[i], b = pts[(i+1)%n]; area += a[0]*b[1]-b[0]*a[1]; }
  const s = area>0?1:-1;
  for (let i=0;i<n;i++){
    const a = pts[i], b = pts[(i+1)%n]; const ex = b[0]-a[0], ey = b[1]-a[1];
    const nx = ey*s, ny = -ex*s; if (nx+ny <= 0) continue;
    const len = Math.hypot(nx,ny) || 1; const f = .8 + .13*(ny-nx)/len;
    ctx.beginPath();
    ctx.moveTo(px(a[0],a[1]),py(a[0],a[1],z0)); ctx.lineTo(px(b[0],b[1]),py(b[0],b[1],z0));
    ctx.lineTo(px(b[0],b[1]),py(b[0],b[1],z1)); ctx.lineTo(px(a[0],a[1]),py(a[0],a[1],z1)); ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle = shade(side,f); ctx.lineWidth = 1; ctx.fill(); ctx.stroke();
  }
  polyPath(pts,z1); ctx.fillStyle = ctx.strokeStyle = top; ctx.lineWidth = 1; ctx.fill(); ctx.stroke();
}
function box(x,y,w,d,z0,z1,side,top){ extrude([[x,y],[x+w,y],[x+w,y+d],[x,y+d]],z0,z1,side,top); }
function isoEllipse(x,y,r,z=0){ ctx.beginPath(); ctx.ellipse(px(x,y),py(x,y,z),Math.max(.1,r*Z),Math.max(.1,r*Z*.5),0,0,Math.PI*2); }

/* ---------- audio ---------- */

/* ---------- world ---------- */
const deepSchools = createDeepSchools(); // past the buoys, under the weed
const schools = [...createSchools(), ...deepSchools, ...createIsle2Schools(), ...createIsle3Schools(), ...createFarSchools()];
const buoys = [];
for (let i=0;i<=WS;i+=260){ buoys.push([i,0],[i,WS]); if (i && i<WS) buoys.push([0,i],[WS,i]); }
// The far buoys at the deep's end, in order round it so each can be chained to the next.
const farBuoys = [], FE = WS + DEEP;
for (let i = -DEEP; i < FE; i += FAR_BUOY_GAP) farBuoys.push([i, -DEEP]);
for (let i = -DEEP; i < FE; i += FAR_BUOY_GAP) farBuoys.push([FE, i]);
for (let i = FE; i > -DEEP; i -= FAR_BUOY_GAP) farBuoys.push([i, FE]);
for (let i = FE; i > -DEEP; i -= FAR_BUOY_GAP) farBuoys.push([-DEEP, i]);
// The far deep opens when the Tar Anchorer is beaten: its anchor chain held the far buoys together.
function farOpen(){ return isle4Stage >= 1; }

function resetNet(){ placeNetBehind(net, boat, bk(), towLen()); }
const sharksEntity = new Sharks(schools); const sharks = sharksEntity.sharks;
const gullsEntity = new Gulls(schools, boat), boatGulls = gullsEntity.gulls;
const world = { T: 0, started: false, docked: false, boat, rng: Math.random, net, // what entities may read; the getters stay live
  get earned(){ return earned; }, get holdTotal(){ return holdTotal; }, get hullScale(){ return bk(); },
  get netWidth(){ return NETW[lv.net]; }, get netLevel(){ return lv.net; }, get holdCap(){ return HOLD[lv.hold]; }, get escorted(){ return dolphins.escorted; }, get range(){ return range(); }, get tier(){ return tier(); }, get netFouled(){ return jellies.inNet > 0; }, get build(){ return build; }, get fineMesh(){ return gear.mesh; }, get stealShare(){ return stealShare(gear); }, get dark(){ return dark; }, get ashore(){ return walker.state === 'ashore' && walker.dock === HOME_DOCK ? walker : null; },
  get figure(){ return walker.state === 'ashore' ? walker : null; } };
const crates = new Flotsam(CRATES, world), flotsam = crates.pieces;
crates.onPick = (f, r) => { coins += r; earned += r; addText(f.x, f.y, 24, 'Salvage +' + r, C.coin, 19, 1.6); sfx.salvage(); hud(); save(); };
const driftwood = new Flotsam(DRIFTWOOD, world), drift = driftwood.pieces;
driftwood.onPick = (f, n) => { wood += n; addText(f.x, f.y, 24, 'Driftwood +' + n, '#F0C58A', 18, 1.5); sfx.driftwood(); hudWood(); save(); };
pirateEntity.onChase = () => { toast('Pirates on your tail. Run for the dock.', 2600, 2); sfx.pirateChase(); };
pirateEntity.onSteal = (n) => { const took = n;
  for (let sp=SPECIES.length-1; sp>=0 && n>0; sp--){ const k = Math.min(hold[sp], n); hold[sp] -= k; n -= k; holdTotal -= k; }
  addText(boat.x, boat.y, 46, 'Pirates took ' + took + ' fish', '#FF9A8A', 19, 2);
  shake = 1; sfx.pirateSteal();
  for (let i=0;i<Math.min(took,10);i++) flies.push({x0:boat.x, y0:boat.y, z0:12, to:'pirate', t:-i*.04, dur:.35, c:SPECIES[0].c, s:7});
  hud(); };
sharksEntity.onWarn = () => { toast(lv.net >= 3 ? 'Shark incoming. Your net can hold it.' : 'Shark after your net. Steer clear.', 2200, 2); sfx.sharkWarning(); };
sharksEntity.onCatch = (sh) => { hold[SHARK]++; holdTotal++; log[SHARK]++; noteFirst(SHARK);
  flies.push({x0:sh.x, y0:sh.y, z0:0, to:'boat', t:0, dur:.45, c:SPECIES[SHARK].c, s:14});
  addText(sh.x, sh.y, 30, 'Shark caught', '#CFE3EE', 20, 1.8);
  sfx.sharkCaught(); hud(); };
sharksEntity.onTear = () => { net.torn = 6; const lost = spill(3);
  addText(net.x, net.y, 30, lost ? `Net torn, ${lost} fish lost` : 'Net torn', '#FF9A8A', 19, 2);
  shake = .7; sfx.netTorn(); hud(); };
const dolphins = new Dolphins(Math.random);
let dolphinToastT = 0, lastWhistleT = -99;
dolphins.onEscort = () => { if (dolphinToastT <= 0){ dolphinToastT = 60; toast('Dolphins alongside. Sharks keep their distance.', 2600, 1); } sfx.dolphins(); lastWhistleT = T; };
let ambience = null; // built once the first gesture has unlocked audio
const rareEntity = new Rare(); const rare = rareEntity.rare;
rareEntity.onSlip = (sp) => toast(`The ${SPECIES[sp].name} slipped away. It will be back.`, 2400);
rareEntity.onFull = (sp) => toast(`Hold full. Sell up to land the ${SPECIES[sp].name}.`, 2200);
rareEntity.onCatch = (sp) => { const S = SPECIES[sp]; hold[sp]++; holdTotal++; log[sp]++; noteFirst(sp); shake = .3;
  flies.push({x0:rare.x, y0:rare.y, z0:0, to:'boat', t:0, dur:.5, c:S.c, s:15});
  addText(rare.x, rare.y, 40, S.name[0].toUpperCase() + S.name.slice(1) + '!', '#FFF3C4', 24, 2.6);
  for (let i=0;i<14;i++) sparks.push({x:rare.x, y:rare.y, vx:(Math.random()-.5)*160, vy:(Math.random()-.5)*160, z:10, vz:40+Math.random()*60, age:0, life:.9+Math.random()*.6});
  sfx.rareCaught(); hud(); save(); };
const leviathan = new Leviathan(); const lev = leviathan.lev;
leviathan.onPass = () => { shake = Math.max(shake,.4);
  sfx.leviathan();
  toast(levSeen ? 'The leviathan passes beneath you.' : 'Something enormous is moving beneath you.', 3200, 1);
  if (!levSeen){ levSeen = true; save(); } };
// At the buoys it rises across a flagship's way. Turning away is the counter; running into it costs fish, never the boat.
let levRisen = false;
leviathan.onRise = () => { shake = Math.max(shake,.35); sfx.leviathanRise();
  toast(hasHarpoon() ? `The leviathan rises. Turn away, or harpoon it: ${hitsWord('guard')} drive it off.` : levRisen ? 'The leviathan rises. Turn away.' : 'The leviathan is rising across your way. Turn away from the spines.', 3000, 2);
  levRisen = true; if (!levSeen){ levSeen = true; save(); } };
leviathan.onHit = () => { let n = Math.ceil(holdTotal/3); const lost = n;
  for (let sp=SPECIES.length-1; sp>=0 && n>0; sp--){ const k = Math.min(hold[sp], n); hold[sp] -= k; n -= k; holdTotal -= k; }
  shake = 1; sfx.whump(); resetNet();
  addText(boat.x, boat.y, 44, lost ? `${lost} fish overboard` : 'Shoved back', '#FF9A8A', 19, 2);
  toasts.clear(); toast(lost ? `The leviathan knocked ${lost} fish overboard. Turn away when the spines rise.` : 'The leviathan shoved you back. Turn away when the spines rise.', 3400, 2);
  hud(); save(); damage(HURT.leviathan, 'leviathan'); };
leviathan.onMiss = () => toast('It sank. Cross now, while it is down.', 2600, 1);
const whales = new Whales(Math.random);
whales.onSight = () => { if (!whaleSeen){ whaleSeen = true; save(); toast('A whale and her calf. Ease off and listen.', 3800, 1); } };
const mantas = new Mantas(Math.random);
mantas.onWhump = (m) => { if (Math.hypot(m.x-boat.x, m.y-boat.y) < 900) sfx.whump(); };
mantas.onSight = () => { if (!mantaSeen){ mantaSeen = true; save(); toast('Manta rays. Stay close and one may leap.', 3800, 1); } };
// The kid's sea turtles, paddling the inner rings. Ease up slowly and one swims alongside; come on fast and it ducks away.
const turtles = new Turtles(Math.random);
let turtleSpookTold = false;
turtles.onSight = () => { if (!turtleSeen){ turtleSeen = true; save(); refreshShop(); toast('Sea turtles! Ease up to one slowly and it may swim with you.', 3800, 1); } };
turtles.onJoin = () => { turtleSwims++; turtleSeen = true; sfx.turtle();
  toast(turtleSwims === 1 ? 'A sea turtle is swimming with you. Keep it slow and it stays.' : 'A turtle is swimming with you.', 2800, 1); refreshShop(); save(); };
turtles.onLeave = (t, spooked) => { if (spooked) toast('Too fast! The turtle ducked away.', 2000); };
turtles.onSpook = () => { if (!turtleSpookTold){ turtleSpookTold = true; toast('A turtle ducked away from the boat. Go slowly near turtles.', 2800); } };
const jellies = new Jellies();
jellies.onFoul = () => { toast('Jellyfish in the net. Nothing else will stay in it until you shake them out at the dock.', 3400, 1); sfx.jellies(); };
const pets = new Pets(build); let dogToastT = 0;
pets.onEarn = () => toast('A dog has come to live on the pier. It barks when pirates are about.', 3600, 1);
pets.onBark = () => { sfx.bark(); if (dogToastT <= 0){ dogToastT = 60; toast('The dog is barking at the horizon. Pirates are about.', 3200, 1); } };
pirateEntity.onProwl = () => pets.alert();
// Ashore the dog comes to say hello and follows; a tap pats it. Until the first pat, it says how.
pets.hint = !petted;
pets.onGreet = () => { if (!petted) toast('The dog came to say hello. Tap it to pet it.', 3600, 1); };
pets.onPet = () => { sfx.yip(); if (!petted){ petted = true; pets.hint = false; save(); toasts.clear(); toast('Good dog.', 1800, 1); } };
// One list, one order, for updating and for z within a layer: the prototype's update order, then what came after.
const scene = new Scene();
// The kid's Cthuluviathan, asleep in a sunken city in a corner of the deep. Go slowly and it dreams on.
const cthulu = new Cthuluviathan();
cthulu.onSight = () => { if (!cthuluSeen){ cthuluSeen = true; save(); toast('A sunken city, and something asleep in it: the Cthuluviathan. Go slowly.', 4200, 1); } };
cthulu.onSnore = () => sfx.snore();
cthulu.onStir = () => toast('It stirs. Slow down.', 1800, 1);
cthulu.onWake = () => { shake = Math.max(shake,.5); sfx.cthuluWake(); toast(hasHarpoon() ? `The Cthuluviathan is awake. Steer off the bubbles, and harpoon the tentacles: ${hitsWord('cthulu')} drive it off.` : 'The Cthuluviathan is awake. Steer off the bubbles: that is where a tentacle comes up.', 3400, 2); };
cthulu.onTentacle = () => sfx.tentacle();
cthulu.onGrab = () => { let n = Math.ceil(holdTotal/5); const lost = n;
  for (let sp=SPECIES.length-1; sp>=0 && n>0; sp--){ const k = Math.min(hold[sp], n); hold[sp] -= k; n -= k; holdTotal -= k; }
  shake = Math.max(shake,.6); sfx.whump();
  addText(boat.x, boat.y, 44, lost ? `A tentacle took ${lost}` : 'Grabbed', '#FF9A8A', 19, 1.8);
  toasts.clear(); toast(lost ? `A tentacle took ${lost} fish. Steer off the bubbles.` : 'A tentacle grabbed the boat. Steer off the bubbles.', 2600, 2);
  hud(); save(); damage(HURT.tentacle, 'tentacle'); };
cthulu.onSleep = () => toast('The Cthuluviathan has gone back to sleep.', 2400, 1);
// The anglerfish fishes for boats in the deep at night: its light looks like glowing fish, and there are none out there.
const angler = new Anglerfish();
angler.onOpen = () => { sfx.anglerOpen(); shake = Math.max(shake,.25);
  toast(hasHarpoon() ? 'Its jaws are opening! Turn away, or harpoon the light.' : anglerSeen ? 'Turn away from the light.' : 'That light is no fish. Turn away.', 2400, 2);
  if (!anglerSeen){ anglerSeen = true; save(); } };
angler.onBite = () => { sfx.anglerSnap(); swallow('angler'); };
angler.onMiss = () => { sfx.anglerSnap(); toast('Its jaws shut on nothing. It sank back into the dark.', 2600, 1); };
// The gulper hunts the east side of the deep, and eats boats. Run, and turn hard when it closes.
const gulper = new Gulper();
gulper.onHunt = () => { sfx.gulperHunt(); shake = Math.max(shake,.3);
  toast(hasHarpoon() ? `The gulper is hunting you. Run, or let it close and harpoon it: ${hitsWord('gulper')} drive it off.` : gulperSeen ? 'The gulper is hunting you. Run!' : 'Something with an enormous mouth is coming up behind you. Run, and turn hard when it closes.', 3200, 2);
  if (!gulperSeen){ gulperSeen = true; save(); refreshShop(); } };
gulper.onBite = () => { sfx.anglerSnap(); damage(HURT.gulper, 'gulper'); };
gulper.onGiveUp = () => { if (swallowT <= 0) toast('The gulper gave up and sank.', 2200, 1); };
// The harpoon, the spear's top level, on the bow: it fires at the nearest leviathan that is up and in reach,
// on a line, and always lands. Enough hits drive one off for a trophy; it is never killed.
let harpoonAt = 0;
function hasHarpoon(){ return spear >= HARPOON_LEVEL; }
function hitsWord(k){ return (['no', 'one', 'two', 'three', 'four', 'five', 'six'][RESOLVE[k]] || RESOLVE[k]) + ' hits'; }
const BOW = { get x(){ return boat.x + Math.cos(boat.h)*30*bk(); }, get y(){ return boat.y + Math.sin(boat.h)*30*bk(); } };
// Each leviathan, what it is, and where a harpoon would strike it now.
// The Skeleton Shark King is not driven off like the four: harpooned down, he dies, and says why it matters.
function beasts(){ return [['guard', leviathan, leviathan.mark(boat)], ['cthulu', cthulu, cthulu.mark(boat)], ['angler', angler, angler.mark()], ['gulper', gulper, gulper.mark()], ['king', king, king.mark()], ['deep', deep, deep.mark()]]; }
const BEAST_Z = {guard: 30, cthulu: 36, angler: 6, gulper: 6, king: 50, deep: 40};
const RESOLVES = {...RESOLVE, king: KING_RESOLVE, deep: DEEP_RESOLVE};
function harpoonTarget(){ if (!hasHarpoon() || walker.state !== 'aboard' || !started || docked || swallowT > 0) return null;
  let best = null, bd = HARPOON_RANGE;
  for (const [k, e, m] of beasts()){ if (!m) continue; const d = Math.hypot(m.x - boat.x, m.y - boat.y); if (d < bd){ bd = d; best = {k, e, m}; } }
  return best; }
function fireHarpoon(){ if (T < harpoonAt) return; const t = harpoonTarget(); if (!t) return;
  harpoonAt = T + HARPOON_RELOAD; sfx.spearThrow(); const z = BEAST_Z[t.k];
  spears.launch(BOW.x, BOW.y, 14, t.m, z, () => { const before = t.e.resolve;
    if (t.e.harpoon(HARPOON_POWER, t.m)){ if (t.k !== 'king' && t.k !== 'deep') driveOff(t.k); }
    else if (t.e.resolve < before){ sfx.spearHit(); shake = Math.max(shake, .2); addText(t.m.x, t.m.y, z + 24, 'Hit!', '#FFF3C4', 18, 1); } }, BOW); }
function driveOff(k){ const prize = drivePrize(driven[k]); driven[k]++; coins += prize; earned += prize;
  shake = 1; sfx.tierUp(); for (let i=0;i<18;i++) sparks.push({x:boat.x, y:boat.y, vx:(Math.random()-.5)*180, vy:(Math.random()-.5)*180, z:20, vz:50+Math.random()*70, age:0, life:1+Math.random()*.7});
  addText(boat.x, boat.y, 60, '+' + prize, C.coin, 24, 2.4); toasts.clear();
  toast(`${TROPHY[k].told} +${prize} coins.`, 4800, 2); hud(); refreshShop(); save(); }
// Over each leviathan in reach: its resolve as pips, and a ring on the one the harpoon would fire at.
function drawHarpoonMarks(){ if (!hasHarpoon() || walker.state !== 'aboard') return; const tg = harpoonTarget();
  for (const [k, e, m] of beasts()){ if (!m || Math.hypot(m.x - boat.x, m.y - boat.y) > HARPOON_RANGE*1.5) continue;
    const n = RESOLVES[k], sx = px(m.x, m.y), sy = py(m.x, m.y, BEAST_Z[k] + 40);
    for (let i=0;i<n;i++){ ctx.fillStyle = i < e.resolve ? '#FF5A6A' : 'rgba(255,255,255,.4)';
      ctx.beginPath(); ctx.arc(sx + (i - (n-1)/2)*11*Z, sy, 4*Z, 0, Math.PI*2); ctx.fill(); }
    if (tg && tg.k === k){ ctx.strokeStyle = T < harpoonAt ? 'rgba(255,243,196,.45)' : 'rgba(255,243,196,.95)'; ctx.lineWidth = 2.4*Z;
      isoEllipse(m.x, m.y, 30 + Math.sin(T*6)*3, 2); ctx.stroke(); } } }
// Health only goes down past the buoys. At none, whatever did it swallows the boat, and spits it out at home.
function damage(n, by){ if (swallowT > 0) return; hp = hurt(hp, n); shake = Math.max(shake,.6);
  addText(boat.x, boat.y, 60, '-' + n, '#FF6F6F', 20, 1.4); hudHull();
  if (hp <= 0) swallow(by); }
const SWALLOWED = {angler: 'Swallowed whole by the anglerfish!', gulper: 'The gulper ate your boat!', leviathan: 'The leviathan swallowed your boat!', tentacle: 'The Cthuluviathan dragged your boat under!', king: 'The Skeleton Shark King ate your boat!', trident: 'The trident sank your boat!', log: 'The driftwood sank your boat!', squeeze: 'The Deep One crushed your boat!'};
function swallow(by){ if (swallowT > 0) return; swallowT = SWALLOW; hp = 0; boat.v = 0; shake = 1; sfx.gulp();
  toasts.clear(); toast(SWALLOWED[by], 1800, 2); hudHull(); }
function spitOut(){ const lost = holdTotal; hold.fill(0); holdTotal = 0;
  boat.x = DOCK.x+125; boat.y = IY+125; boat.h = .45; boat.v = 0; resetNet(); net.torn = 0; wasDeep = false;
  cam.x = boat.x; cam.y = boat.y; hp = HP_MAX; irisT = SPIT; gulper.reset(); king.reset(); deep.reset(); sfx.spit();
  toasts.clear(); toast(`Spat out in the shallows by home. ${lost ? `Your ${lost} fish are gone, but the` : 'The'} boat is fine.`, 3800, 2);
  hud(); hudHull(); save(); }
// Island 2's shallows and the spear: ashore there, the Throw button spears the nearest parrotfish in range.
const shallows = new Shallows(Math.random), spears = new Spears();
let reloadAt = 0;
function spearTarget(){ const sp = spearAt(spear); if (walker.state !== 'ashore' || !sp) return null;
  if (floor === TEMPLE6){ const k = cth.nearestTent(walker.x, walker.y, sp.range); if (k) return k;
    return cth.up && Math.hypot(cth.x - walker.x, cth.y - walker.y) <= sp.range ? cth : null; }
  if (floor === HALL || floor === DEMON){ let best = null, bd = sp.range;
    for (const f of floor === HALL ? [swordsman] : demons) if (f.up){ const d = Math.hypot(f.x - walker.x, f.y - walker.y); if (d <= bd){ bd = d; best = f; } }
    const m = floor === DEMON ? demonMonkeys.nearest(walker.x, walker.y, sp.range) : null;
    return m && Math.hypot(m.x - walker.x, m.y - walker.y) < bd ? m : best; }
  // In the ruins, a roused lancer; a quiet one only if there is nothing else, and then it is roused.
  if (floor === RUINS) return lancers.nearest(walker.x, walker.y, sp.range) || lancers.nearest(walker.x, walker.y, sp.range, true);
  if (hordes[floor]){ const u = hordes[floor].target(walker.x, walker.y, sp.range);
    // In the throne room the Forgotten One too, if he is nearer than any but a necromancer.
    if (floor === THRONE && forgotten.up && (!u || u.kind !== 'necro')){ const fd = Math.hypot(forgotten.x - walker.x, forgotten.y - walker.y);
      if (fd <= sp.range && (!u || fd < Math.hypot(u.x - walker.x, u.y - walker.y))) return forgotten; }
    return u; }
  if (floor >= 0){ const b = bosses[floor];
    if (b){ const bd = b.up ? Math.hypot(b.x - walker.x, b.y - walker.y) : Infinity, m = floor === ROOF7 ? roofMonkeys.nearest(walker.x, walker.y, sp.range) : null;
      if (m && Math.hypot(m.x - walker.x, m.y - walker.y) < bd) return m; return bd <= sp.range ? b : null; }
    return floors[floor] ? floors[floor].nearest(walker.x, walker.y, sp.range) : null; }
  if (anchorer.up && Math.hypot(anchorer.x - walker.x, anchorer.y - walker.y) <= sp.range) return anchorer;
  return monkeys.nearest(walker.x, walker.y, sp.range) || monkeys7.nearest(walker.x, walker.y, sp.range) || shallows.nearest(walker.x, walker.y, sp.range); }
function throwSpear(target){ const sp = spearAt(spear); if (walker.state !== 'ashore' || !sp || T < reloadAt) return;
  const f = target || spearTarget(); if (!f) return;
  reloadAt = T + sp.reload; walker.throwAt(f.x, f.y); sfx.spearThrow();
  if (f instanceof Sorcerer){ spears.launch(walker.x, walker.y, walker.z + 20, f, 34, () => f.hit(sp.power)); return; }
  if (f instanceof Fighter){ spears.launch(walker.x, walker.y, walker.z + 20, f, 18*f.spec.scale, () => f.hit(sp.power)); return; }
  if (f === anchorer){ spears.launch(walker.x, walker.y, walker.z + 20, f, 70, () => f.hit(sp.power)); return; }
  if (f === cth){ spears.launch(walker.x, walker.y, walker.z + 20, f, 90, () => cth.hit(sp.power)); return; }
  if (cth.tents.includes(f)){ spears.launch(walker.x, walker.y, walker.z + 20, f, 24, () => cth.hitTent(f, sp.power)); return; }
  if (f === forgotten){ spears.launch(walker.x, walker.y, walker.z + 20, f, 40, () => forgotten.hit(sp.power)); return; }
  if (lancers.list.includes(f)){ spears.launch(walker.x, walker.y, walker.z + 20, f, 34, () => lancers.hit(f, sp.power)); return; }
  for (const h of HORDES) if (h.list.includes(f)){ spears.launch(walker.x, walker.y, walker.z + 20, f, 18*f.spec.scale, () => h.hit(f, sp.power, walker.x, walker.y)); return; }
  for (const camp of [monkeys, monkeys7, ...camps, demonMonkeys, roofMonkeys]) if (camp.list.includes(f)){ spears.launch(walker.x, walker.y, walker.z + 20, f, 10, () => camp.hit(f, sp.power, walker.x, walker.y)); return; }
  spears.launch(walker.x, walker.y, walker.z + 20, f, 0, () => { if (!f.alive) return; shallows.take(f); sellSpeared(PARROT, f.x, f.y); }); }
// The monkey camp. Three hearts ashore; bonked out, the figure wakes up aboard, nothing lost.
const HEARTS = 3, CAMP_PRIZE = 400;
let hearts = HEARTS, invulnT = 0, heartT = 0, spotToldT = 0;
const monkeys = new Monkeys();
monkeys.onSpot = () => { if (spotToldT <= 0){ spotToldT = 90; toast(spear ? 'Monkeys in skull masks! Keep moving and throw your spear.' : 'Monkeys in skull masks! You have no spear: run back to the boat.', 3000, 2); } };
monkeys.onThrow = () => sfx.spearThrow();
monkeys.onBonk = (by) => bonked(by);
function bonked(by, n = 1){ if (invulnT > 0 || walker.state !== 'ashore') return;
  hearts = Math.max(0, hearts - n); if (hearts > 0) cat.noticeHurt(); invulnT = 1.2; heartT = 0; shake = Math.max(shake, .4); sfx.whump(); hudHearts();
  addText(walker.x, walker.y, 30, {coconut: 'Coconut!', bolt: 'Zap!', peck: 'Peck!', slash: 'Slash!', anchor: 'Clang!', sweep: 'Whack!', tentacle: 'Squeeze!', arrow: 'Twang!', wisp: 'Brrr!', sword: 'Slash!', skull: 'Crack!', ray: 'Zzzap!', lance: 'Stab!'}[by] || 'Bonk!', '#FF9A8A', 18, 1.1);
  const m = monkeys.nearest(walker.x, walker.y, 60) || monkeys7.nearest(walker.x, walker.y, 60); if (m){ const d = Math.hypot(walker.x - m.x, walker.y - m.y) || 1; walkStep(walker, (walker.x - m.x)/d*22, (walker.y - m.y)/d*22, build); }
  if (hearts <= 0){ leaveTower(false); walker.knockOut(); hearts = HEARTS; hudHearts(); toasts.clear(); toast('Bonked out! You woke up aboard the boat. Nothing lost.', 3600, 2); } }
monkeys.onBeat = (m) => { masks++; sfx.spearHit(); addText(m.x, m.y, 26, 'Mask!', '#F4F1E6', 18, 1.3);
  flies.push({x0:m.x, y0:m.y, z0:16, to:'figure', t:0, dur:.5, c:'#F4F1E6', s:5}); refreshShop(); save(); };
monkeys.onClear = () => { coins += CAMP_PRIZE; earned += CAMP_PRIZE; sfx.orderFilled(); shake = Math.max(shake, .3);
  addText(CHEST.x, CHEST.y, 30, '+' + CAMP_PRIZE, C.coin, 24, 2.2); toasts.clear();
  toast(`You beat the monkey camp! Its chest held ${CAMP_PRIZE} coins. They will be back.`, 4200, 2); hud(); save(); };
// Island 7's camp: the same monkeys, one more of them, and a fuller chest.
const CAMP7_PRIZE = 800;
const monkeys7 = new Monkeys(CAMP7, 6, 2);
for (const k of ['onSpot', 'onThrow', 'onBonk', 'onBeat']) monkeys7[k] = monkeys[k];
monkeys7.onClear = () => { coins += CAMP7_PRIZE; earned += CAMP7_PRIZE; sfx.orderFilled(); shake = Math.max(shake, .3);
  addText(CHEST7.x, CHEST7.y, 30, '+' + CAMP7_PRIZE, C.coin, 24, 2.2); toasts.clear();
  toast(`You beat island 7's monkey camp! Its chest held ${CAMP7_PRIZE} coins. They will be back.`, 4200, 2); hud(); save(); };
// The towers: floors of monkeys and a roof each, where the sorcerer waits. floor is the room the figure
// is in, -1 outside; tower is the one it went into.
const TOWER_PRIZE = 2000, TOWER_AGAIN = 500, TOWER3_PRIZE = 1000;
let floor = -1, towerWon = false, tower = null;
const floors = [];
floors[0] = new Monkeys(ROOMS[0], 3, 0); floors[1] = new Monkeys(ROOMS[1], 4, 2);
floors[3] = new Monkeys(ROOMS[3], 4, 1); floors[4] = new Monkeys(ROOMS[4], 5, 2); // island 3's, a little busier
floors[9] = new Monkeys(ROOMS[9], 5, 1); floors[10] = new Monkeys(ROOMS[10], 6, 2); // and island 7's, busier still
const camps = floors.filter(Boolean);
for (const [i, fl] of floors.entries()){ if (!fl) continue; fl.onBonk = (by) => bonked(by); fl.onThrow = () => sfx.spearThrow(); fl.onBeat = monkeys.onBeat;
  fl.onClear = () => { sfx.orderFilled(); toast(TOWERS.some(t => t.roof === i + 1) ? 'The stairs to the roof are open. Something is waiting up there.' : 'The stairs up are open. Climb!', 3000, 1); }; }
function burst(b){ shake = 1; sfx.tierUp(); for (let i=0;i<24;i++) sparks.push({x:b.x, y:b.y, vx:(Math.random()-.5)*200, vy:(Math.random()-.5)*200, z:30, vz:60+Math.random()*80, age:0, life:1.2+Math.random()*.8}); }
const boss = new Sorcerer(ROOMS[ROOF]);
boss.onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .4); toasts.clear(); toast('The leviathan sorcerer! Dodge its purple bolts, and spear it when it swoops.', 3800, 2); };
boss.onCast = () => sfx.tentacle();
boss.onHit = (by) => bonked(by);
boss.onBeaten = () => { const prize = towerTaken ? TOWER_AGAIN : TOWER_PRIZE; coins += prize; earned += prize; towerTaken = true; towerWon = true;
  burst(boss); addText(boss.x, boss.y, 50, '+' + prize, C.coin, 26, 2.6); toasts.clear();
  toast(`You beat the leviathan sorcerer! The tower is yours: your flag flies from the top. +${prize} coins.`, 5200, 2); hud(); refreshShop(); save(); };
// It comes back on island 3's tower, with a ring of bolts. Beaten there, it leaves scuba gear behind.
const boss3 = new Sorcerer(ROOMS[ROOF3], true);
boss3.onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .4); toasts.clear(); toast('The leviathan sorcerer is back! Angry, it throws a ring of bolts: step into a gap.', 3800, 2); };
boss3.onCast = () => sfx.tentacle();
boss3.onHit = (by) => bonked(by);
boss3.onBeaten = () => { const first = isle3Stage < 1, prize = first ? TOWER3_PRIZE : TOWER_AGAIN; coins += prize; earned += prize; isle3Stage = Math.max(isle3Stage, 1); towerWon = true;
  burst(boss3); addText(boss3.x, boss3.y, 50, '+' + prize, C.coin, 26, 2.6); toasts.clear();
  toast(first ? `You beat the sorcerer again! Where it fell: scuba gear. It was not the real boss. Something is down there, under the tower. +${prize} coins.`
    : `You beat the sorcerer again! +${prize} coins.`, 6200, 2); hud(); refreshShop(); save(); };
// And a third time on island 7's, twice as tough, and once angry it calls monkeys up onto the roof, two at a
// time. Beaten there, the portal on the burnt grass below wakes (isle7Stage 1).
const TOWER7_PRIZE = 2000;
const roofMonkeys = new Monkeys(ROOMS[ROOF7], 0, 0, false);
roofMonkeys.onBonk = (by) => bonked(by); roofMonkeys.onThrow = () => sfx.spearThrow(); roofMonkeys.onBeat = (m) => monkeys.onBeat(m);
const boss7 = new Sorcerer(ROOMS[ROOF7], true, true, THIRD_HP);
boss7.onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .4); toasts.clear(); toast('The leviathan sorcerer, a third time! Twice as tough now, and angry it calls monkeys up onto the roof.', 4200, 2); };
boss7.onCast = () => sfx.tentacle();
boss7.onHit = (by) => bonked(by);
boss7.onCall = (x, y) => { if (roofMonkeys.list.filter(m => m.state === 'chase').length >= CALL_N) return;
  sfx.spearThrow(); addText(x, y, 40, 'Monkeys!', '#FFB0A0', 18, 1.1); roofMonkeys.summon(x + 14, y + 10); roofMonkeys.summon(x - 14, y + 10, true); };
boss7.onBeaten = () => { const first = isle7Stage < 1, prize = first ? TOWER7_PRIZE : TOWER_AGAIN; coins += prize; earned += prize; isle7Stage = Math.max(isle7Stage, 1); towerWon = true; roofMonkeys.reset();
  burst(boss7); addText(boss7.x, boss7.y, 50, '+' + prize, C.coin, 26, 2.6); toasts.clear();
  toast(first ? `You beat the sorcerer a third time! As it falls, far below, the ring on the burnt grass lights up green. +${prize} coins.`
    : `You beat the sorcerer again! +${prize} coins.`, 6200, 2); hud(); refreshShop(); save(); };
const bosses = {[ROOF]: boss, [ROOF3]: boss3, [ROOF7]: boss7};
// Each tower: the dock its island is reached from, its door, its rooms and its boss.
const TOWER_AT = [{dock: ISLE2_DOCK, door: DOOR, ...TOWERS[0], boss}, {dock: ISLE3_DOCK, door: DOOR3, ...TOWERS[1], boss: boss3}, {dock: ISLE7_DOCK, door: DOOR7, ...TOWERS[2], boss: boss7}];
// Under island 3's tower, the kid's real boss. With the scuba gear, a gap in the seaweed is the way down to the hall
// at the tower's foot, where the swordsman waits. Beaten, he heals the figure, drops a key, and the floor opens into the
// demon dimension, where he has become three little demons. Beat them and the key opens the cage: the warlock is free.
// Each stage stays done (isle3Stage): die to the demons and the next dive finds a portal where the swordsman was.
const DEPTHS = {dock: ISLE3_DOCK, door: DIVE3, first: HALL, roof: -1, boss: null};
const SWORD_PRIZE = 1500, DEMON_PRIZE = 1500;
const HALL_R = ROOMS[HALL], DEMON_R = ROOMS[DEMON], PORTAL = stairs(HALL);
let pullT = 0, redFlash = 0, cageOpen = 0, blockTold = false, gapTold = false;
const swordsman = new Fighter(SWORDSMAN, HALL_R, {x: HALL_R.x - 40, y: HALL_R.y - 40});
swordsman.onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .4); toasts.clear(); toast('The swordsman, the real boss! When his sword goes up, step away. He can block one spear, once.', 4200, 2); };
const demonMonkeys = new Monkeys(DEMON_R, 0, 0, false);
const demons = [new Fighter(RED, DEMON_R, {x: DEMON_R.x - 10, y: DEMON_R.y + 5}), new Fighter(BLUE, DEMON_R, {x: DEMON_R.x + 35, y: DEMON_R.y - 35}), new Fighter(GREEN, DEMON_R, {x: DEMON_R.x - 45, y: DEMON_R.y - 15})];
demons[0].onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .5); toasts.clear(); toast('The demon dimension! He became three little demons: red slashes, blue calls monkeys, green does both.', 4600, 2); };
for (const f of [swordsman, ...demons]){ f.onHit = (by) => bonked(by); f.onWindup = () => sfx.spearThrow();
  f.onBlock = () => { sfx.clang(); addText(f.x, f.y, 40, 'Blocked!', '#FFE9A8', 20, 1.2); if (!blockTold){ blockTold = true; toast('Blocked! That was its one block.', 2400, 1); } }; }
for (const f of demons){ f.onSummon = (x, y) => { sfx.spearThrow(); addText(x, y, 40, 'Monkeys!', '#FFB0A0', 18, 1.1);
    return [demonMonkeys.summon(x + 14, y + 10), demonMonkeys.summon(x - 14, y + 10, f.spec.look === 'green')]; };
  f.onBeaten = () => { sfx.spearHit(); addText(f.x, f.y, 30, 'Poof!', '#FFB0A0', 20, 1.2);
    if (demons.every(d => d.state === 'gone')) freeWarlock(); }; }
demonMonkeys.onBonk = (by) => bonked(by); demonMonkeys.onThrow = () => sfx.spearThrow(); demonMonkeys.onBeat = (m) => monkeys.onBeat(m);
swordsman.onBeaten = () => { const first = isle3Stage < 2; isle3Stage = Math.max(isle3Stage, 2); hearts = HEARTS; hudHearts(); burst(swordsman);
  if (first){ coins += SWORD_PRIZE; earned += SWORD_PRIZE; addText(swordsman.x, swordsman.y, 60, '+' + SWORD_PRIZE, C.coin, 24, 2.4); }
  flies.push({x0:swordsman.x, y0:swordsman.y, z0:10, to:'figure', t:0, dur:.6, c:'#F0C544', s:6}); addText(swordsman.x, swordsman.y, 40, 'Key!', '#F0C544', 22, 2);
  toasts.clear(); toast('He healed you, and dropped a key! Then the floor splits open, red underneath...', 3800, 2); hud(); save(); pullT = 2.6; };
function freeWarlock(){ const first = isle3Stage < 3; isle3Stage = Math.max(isle3Stage, 3); towerWon = true; cageOpen = Math.max(cageOpen, .001); burst({x: CAGE.x, y: CAGE.y}); demonMonkeys.reset();
  warlock.come(CAGE.x + 24, CAGE.y + 24); warlockTold = true;
  if (first){ coins += DEMON_PRIZE; earned += DEMON_PRIZE; addText(CAGE.x, CAGE.y, 70, '+' + DEMON_PRIZE, C.coin, 24, 2.4); }
  toasts.clear(); toast('The key opens the cage. The warlock is free! Part man, part bird, and he is coming with you.', 5200, 2); hud(); refreshShop(); save(); }
// What is already done stays done.
function applyStage(){ if (isle3Stage >= 2) swordsman.state = 'gone'; if (isle3Stage >= 3){ for (const d of demons) d.state = 'gone'; cageOpen = 1; } }
// The warlock, freed: ashore he follows the figure everywhere, every island and every room, casting green bolts at
// whatever it is fighting; and things that would hurt the figure hurt him if he is in the way.
const warlock = new Warlock();
let warlockTold = false;
// What the warlock, the cat, the warrior, the bones, the allies and the tarbaby fight: where it is, how it is hurt, and for the
// tarbaby's tar, how it is stuck and how high its face is.
function campTarget(camp, m){ return {get x(){ return m.x; }, get y(){ return m.y; }, hit: (p) => camp.hit(m, p, warlock.x, warlock.y), stun: (s) => camp.stun(m, s), head: 18}; }
function fighterTarget(f, head = 24){ return {get x(){ return f.x; }, get y(){ return f.y; }, hit: (p) => f.hit(p), stun: (s) => f.stun(s), head}; }
function bossHead(b){ return b === anchorer ? 70 : b === cth ? 80 : b === forgotten ? 50 : 52; }
warlock.findTarget = (x, y, range) => { let best = null, bd = range;
  const consider = (t, d) => { if (d <= bd){ bd = d; best = t; } };
  for (const camp of [monkeys, monkeys7, ...camps, demonMonkeys, roofMonkeys]) for (const m of camp.list) if (m.state === 'chase') consider(campTarget(camp, m), Math.hypot(m.x - x, m.y - y));
  for (const f of [swordsman, ...demons]) if (f.up) consider(fighterTarget(f, 24*f.spec.scale), Math.hypot(f.x - x, f.y - y));
  for (const h of HORDES) for (const u of h.list) if (Horde.up(u)) consider({get x(){ return u.x; }, get y(){ return u.y; }, hit: (p) => h.hit(u, p, warlock.x, warlock.y), stun: (s) => h.stun(u, s), head: (u.kind === 'ghost' ? 34 : 25)*u.spec.scale}, Math.hypot(u.x - x, u.y - y));
  for (const b of [boss, boss3, boss7, anchorer, cth, forgotten]) if (b.up) consider(fighterTarget(b, bossHead(b)), Math.hypot(b.x - x, b.y - y));
  for (const l of lancers.list) if (Lancers.up(l)) consider({get x(){ return l.x; }, get y(){ return l.y; }, hit: (p) => lancers.hit(l, p), stun: (s) => lancers.stun(l, s), head: 40}, Math.hypot(l.x - x, l.y - y));
  for (const k of cth.tents) if (k.state === 'chase') consider({get x(){ return k.x; }, get y(){ return k.y; }, hit: (p) => cth.hitTent(k, p), stun: (s) => cth.stunTent(k, s), head: 22}, Math.hypot(k.x - x, k.y - y));
  return best; };
warlock.onCast = () => sfx.zap();
warlock.onHurt = (out) => { addText(warlock.x, warlock.y, 32, out ? 'Worn out!' : 'Ow!', '#B8FFC8', 16, 1.1); hudHearts();
  if (out){ toasts.clear(); toast('The warlock is worn out. He flies back to his boat to rest.', 3200, 1); } };
warlock.onArrive = () => { if (!warlockTold){ warlockTold = true; toast('The warlock comes ashore with you. He casts at whatever you fight.', 3000, 1); } };
// What would hurt the figure hurts the warlock if he is in the way: a monkey's bonk, a bolt, a slash.
function hurtWarlock(dt){ for (const h of [warlock, cat, warrior, bonesPal]) hurtHelper(h, dt);
  for (const a of allies.list) hurtHelper({shown: a.state === 'fight', x: a.x, y: a.y, hurt: () => allies.hurt(a)}, dt); }
// What would hurt the figure hurts a helper in the way: the warlock, the cat, the warrior or the bones.
function hurtHelper(h, dt){ if (!h.shown) return;
  for (const camp of [monkeys, monkeys7, ...camps, demonMonkeys, roofMonkeys]) for (const m of camp.list)
    if (m.state === 'chase' && !m.thrower && m.cd <= 0 && Math.hypot(m.x - h.x, m.y - h.y) < BONK_R){ m.cd = BONK_EVERY; h.hurt(); }
  for (const b of [boss, boss3, boss7]) for (let i = b.bolts.length - 1; i >= 0; i--){ const q = b.bolts[i];
    if (Math.hypot(q.x - h.x, q.y - h.y) < BOLT_HIT){ b.bolts.splice(i, 1); h.hurt(); } }
  for (const f of [swordsman, ...demons]) if (f.state === 'swing' && f.t <= dt * 1.01){
    const d = Math.hypot(h.x - f.x, h.y - f.y);
    if (d < f.spec.reach + SLASH_SLACK && Math.abs(angDiff(f.h, Math.atan2(h.y - f.y, h.x - f.x))) < SLASH_ARC) h.hurt(); }
  for (const k of cth.tents) if (k.state === 'chase' && Math.hypot(k.x - h.x, k.y - h.y) < 14){ k.state = 'sink'; k.t = 0; h.hurt(); }
  for (const hd of HORDES){ for (const u of hd.list) if (u.state === 'swing' && u.spec.reach > 0 && u.t <= dt * 1.01){
      if (Math.hypot(h.x - u.x, h.y - u.y) < u.spec.reach + SLASH_SLACK && Math.abs(angDiff(u.h, Math.atan2(h.y - u.y, h.x - u.x))) < SLASH_ARC) h.hurt(); }
    for (let i = hd.shots.length - 1; i >= 0; i--){ const q = hd.shots[i]; if (Math.hypot(q.x - h.x, q.y - h.y) < 10){ hd.shots.splice(i, 1); h.hurt(); } } }
  for (const l of lancers.list) if (l.state === 'thrust' && l.t <= dt * 1.01 && Math.hypot(h.x - l.x, h.y - l.y) < LANCE_REACH + 4 && Math.abs(angDiff(l.h, Math.atan2(h.y - l.y, h.x - l.x))) < LANCE_ARC) h.hurt();
  if (forgotten.up){ const fd = Math.hypot(h.x - forgotten.x, h.y - forgotten.y);
    if (forgotten.state === 'swing' && forgotten.t <= dt * 1.01 && fd < FG_REACH + 6 && Math.abs(angDiff(forgotten.h, Math.atan2(h.y - forgotten.y, h.x - forgotten.x))) < FG_ARC) h.hurt();
    if (forgotten.state === 'beam' && forgotten.t <= dt * 1.01 && forgotten.offRay(h.x, h.y) < RAY_HIT) h.hurt();
    for (let i = forgotten.skulls.length - 1; i >= 0; i--){ const q = forgotten.skulls[i]; if (Math.hypot(q.x - h.x, q.y - h.y) < SKULL_HIT){ forgotten.skulls.splice(i, 1); h.hurt(); } } } }
// His boat: beside yours at sea, netting fish for you from it while he is aboard.
const wboat = new WarlockBoat();
wboat.findFish = (x, y, reach) => { if (holdTotal >= HOLD[lv.hold]) return null; let best = null, bd = reach;
  for (const sc of schools){ if (sc.alive <= 0 || (sc.night && dark < .75) || Math.hypot(sc.cx - x, sc.cy - y) > reach + sc.r + 20) continue;
    for (const f of sc.fish){ if (!f.alive || f.grow < 1) continue; const d = Math.hypot(f.x - x, f.y - y); if (d < bd){ bd = d; best = {x: f.x, y: f.y, f, sc}; } } }
  return best; };
wboat.onFish = (c) => { sfx.zap(); catchFish(c.f, c.sc); };
wboat.onArrive = () => toast('The warlock sails his own boat beside yours. He will catch fish for you.', 3600, 1);
// Island 4's boss, the kid's: the tar monster with an anchor on a chain. It watches from the tar until the figure sets
// foot on the sand, then rises, and the evil monkey vanishes. Beaten, it melts, and a tarbaby climbs out and comes along.
const TAR_PRIZE = 2000;
const anchorer = new Anchorer(), tarbaby = new Tarbaby();
anchorer.onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .5); toasts.clear(); puff(SUMMONER.x, SUMMONER.y);
  addText(SUMMONER.x, SUMMONER.y, 30, 'Poof!', '#C9A2FF', 18, 1.3);
  toast('The Tar Anchorer! Get out of the red ring before its anchor lands.', 3800, 2); };
anchorer.onHit = (by) => bonked(by);
anchorer.onWindup = () => sfx.tentacle();
anchorer.onThud = (x, y) => { sfx.whump(); shake = Math.max(shake, .35);
  for (let i=0;i<10;i++) sparks.push({x, y, vx:(Math.random()-.5)*120, vy:(Math.random()-.5)*120, z:4, vz:40+Math.random()*50, age:0, life:.6+Math.random()*.4, c:'#1C1719'});
  if (warlock.shown && Math.hypot(warlock.x - x, warlock.y - y) < ANCHOR_HIT) warlock.hurt(); };
anchorer.onSwing = () => { sfx.whump(); if (warlock.shown && Math.hypot(warlock.x - anchorer.x, warlock.y - anchorer.y) < SWEEP_R + 6) warlock.hurt(); };
anchorer.onBeaten = () => { const first = isle4Stage < 1; isle4Stage = 1; burst(anchorer);
  if (first){ coins += TAR_PRIZE; earned += TAR_PRIZE; addText(anchorer.x, anchorer.y, 60, '+' + TAR_PRIZE, C.coin, 24, 2.4); }
  // What is left of it climbs out onto the sand beside the figure.
  tarbaby.come(walker.x + 14, walker.y + 10); sfx.yip();
  toasts.clear(); toast(`You beat the Tar Anchorer! A tarbaby climbed out of the tar, and it is coming with you. +${TAR_PRIZE} coins.`, 5000, 2);
  if (first) toast('Far out at the deep\'s end, its anchor chain sinks between the far buoys. The far deep is open.', 4600, 1);
  hud(); refreshShop(); save(); };
tarbaby.findTarget = (x, y, range) => warlock.findTarget(x, y, range);
tarbaby.onSpit = () => sfx.spit();
// Island 5's boss, the kid's: the Skeleton Shark King. Fought from the boat with the harpoon; beaten, he dies at the
// surface, claiming to know of a portal, and does not live to say where.
const KING_PRIZE = 3000;
const king = new SharkKing();
let jawsT = 0;
const KING_LINES = [[0.6, 'Argh... You have beaten me, little fisher. Me! The King of all the sharks!'], [3.8, 'Hear me. I know of a portal... a portal to another world...'],
  [7, 'It lies on the island of... of...'], [9.2, '...']];
king.onRise = () => { sfx.cthuluWake(); shake = Math.max(shake, .5); toasts.clear();
  toast(hasHarpoon() ? 'The Skeleton Shark King! When the water churns, a line shows where he will charge: turn off it. When he leaps out, harpoon him.'
    : 'The Skeleton Shark King! You need the harpoon to fight him: the shipwright sells it. Turn off his line when he charges!', 5600, 2); };
king.onWarn = (what) => { sfx.jaws(); if (what === 'trident') sfx.tentacle(); };
king.onBite = () => { sfx.gulp(); damage(KING_BITE, 'king'); };
king.onTrident = () => { sfx.whump(); damage(KING_TRIDENT, 'trident'); };
king.onSplash = (x, y) => { for (let i=0;i<10;i++) sparks.push({x, y, vx:(Math.random()-.5)*110, vy:(Math.random()-.5)*110, z:4, vz:50+Math.random()*50, age:0, life:.6+Math.random()*.4, c:'#E8F6FA'}); };
king.onBeaten = () => { sfx.cthuluWake(); shake = 1; toasts.clear(); boat.v = 0; document.body.classList.add('cine'); };
king.onDead = () => { document.body.classList.remove('cine'); const first = isle5Stage < 1; isle5Stage = 1;
  if (first){ coins += KING_PRIZE; earned += KING_PRIZE; addText(king.x, king.y, 40, '+' + KING_PRIZE, C.coin, 24, 2.4); }
  toast(`The Skeleton Shark King is dead, and whatever he knew about the portal, he took to the bottom. His crown washed up on his throne. +${KING_PRIZE} coins.`, 6400, 2);
  hud(); refreshShop(); save(); };
function kingDying(){ return king.state === 'dying'; }
cv.addEventListener('pointerdown', () => { if (kingDying()) king.t = Math.max(king.t, 11.9); });
// His last words: letterbox bars, a speech bubble over him, and the narration at the bottom.
function drawKingScene(){ if (!kingDying()) return; const t = king.t, k = Math.min(1, t/.5, (12 - t)/.5), bar = H*.11*Math.max(0, k);
  ctx.fillStyle = '#05080C'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  let line = ''; for (const [at, l] of KING_LINES) if (t >= at) line = l;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (line && t < 10){ ctx.font = `700 ${Math.round(Math.min(16, W/24))}px Grandstander, ui-rounded, system-ui, sans-serif`;
    const words = line.split(' '), lines = []; let cur = '';
    for (const w of words){ const tryLine = cur ? cur + ' ' + w : w; if (ctx.measureText(tryLine).width > W*.7){ lines.push(cur); cur = w; } else cur = tryLine; }
    if (cur) lines.push(cur);
    const bw = Math.min(W*.78, Math.max(...lines.map(l => ctx.measureText(l).width)) + 28), bh = lines.length*20 + 18;
    const kx = px(king.x, king.y), ky = py(king.x, king.y, 30), bx = clamp(kx - bw/2, 12, W - bw - 12), by = clamp(ky - bh - 40, bar + 8, H - bar - bh - 8);
    ctx.fillStyle = '#FFF6E5'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 12) : ctx.rect(bx, by, bw, bh); ctx.fill();
    ctx.beginPath(); ctx.moveTo(clamp(kx, bx + 16, bx + bw - 16) - 8, by + bh); ctx.lineTo(clamp(kx, bx + 16, bx + bw - 16), by + bh + 12); ctx.lineTo(clamp(kx, bx + 16, bx + bw - 16) + 8, by + bh); ctx.fill();
    ctx.fillStyle = '#2B2A26'; lines.forEach((l, i) => ctx.fillText(l, bx + bw/2, by + 19 + i*20)); }
  if (t >= 10){ ctx.globalAlpha = Math.min(1, (t - 10)/.4) * Math.max(0, k); ctx.fillStyle = '#FFF1D6';
    ctx.font = `800 ${Math.round(Math.min(18, W/22))}px Grandstander, ui-rounded, system-ui, sans-serif`;
    ctx.fillText('The Skeleton Shark King is dead.', W/2, H - bar/2); ctx.globalAlpha = 1; }
  ctx.globalAlpha = Math.max(0, k)*.6; ctx.font = `600 12px Grandstander, ui-rounded, system-ui, sans-serif`; ctx.fillStyle = '#FFF1D6'; ctx.fillText('Tap to skip', W/2, bar*.75); ctx.globalAlpha = 1; }
// Island 6's treasure chests: walk up to one and it opens, once, for coins.
function popcount(n){ let c = 0; while (n){ c += n & 1; n >>= 1; } return c; }
function openChests(){ if (walker.state !== 'ashore' || walker.dock !== ISLE6_DOCK || floor >= 0) return;
  CHESTS6.forEach(([x, y], i) => { if ((chests6 & (1 << i)) || Math.hypot(walker.x - x, walker.y - y) > CHEST_REACH) return;
    chests6 |= 1 << i; coins += CHEST_COINS; earned += CHEST_COINS; sfx.orderFilled(); shake = Math.max(shake, .2);
    for (let k=0;k<12;k++) sparks.push({x, y, vx:(Math.random()-.5)*120, vy:(Math.random()-.5)*120, z:12, vz:60+Math.random()*60, age:0, life:.9+Math.random()*.5});
    addText(x, y, 30, '+' + CHEST_COINS, C.coin, 22, 2);
    const n = popcount(chests6); toasts.clear();
    toast(n === CHESTS6.length ? `A treasure chest! That is all ${n} on island 6. +${CHEST_COINS} coins.` : `A treasure chest! ${n} of ${CHESTS6.length} found. +${CHEST_COINS} coins.`, 3000, 1);
    hud(); refreshShop(); save(); }); }
// Island 6's leviathan, the kid's: the Deep One, fought from the boat. Beaten, instead of dying it drags the boat
// under to its drowned temple, where it waits as Cthulhu, fought on foot. Each stage stays done (isle6Stage): at 1 the
// temple's door on island 6 is a way back down; at 2 it is gone, and has paid out a rare fish.
const RARE_FISH = 1000;
const deep = new DeepOne(), cth = new Cthulhu(ROOMS[TEMPLE6]);
const TEMPLE_DOOR = {x: TEMPLE.x, y: TEMPLE.y + TEMPLE.w * .8 + 16};
const TEMPLE_DEEP = {dock: ISLE6_DOCK, door: TEMPLE_DOOR, first: TEMPLE6, roof: -1, boss: null};
let squeezeAcc = 0, grabTold = false;
deep.onRise = () => { sfx.cthuluWake(); shake = Math.max(shake, .6); toasts.clear();
  toast('The Deep One! Its eye opens every few seconds: harpoon it then. Steer out of the rings where its logs will land, and keep out of its reach.', 5600, 2); };
deep.onWarn = (what) => what === 'grab' ? sfx.tentacle() : sfx.spearThrow();
deep.onGrab = () => { sfx.whump(); shake = Math.max(shake, .5); if (!grabTold){ grabTold = true; toasts.clear(); toast('It has the boat! Harpoon the tentacle to make it let go.', 3000, 2); } };
deep.onSqueeze = (n) => { squeezeAcc += n; if (squeezeAcc >= 3){ squeezeAcc -= 3; damage(3, 'squeeze'); } };
deep.onLog = () => { sfx.whump(); damage(DEEP_LOG, 'log'); };
deep.onSplash = (x, y) => { for (let i=0;i<8;i++) sparks.push({x, y, vx:(Math.random()-.5)*100, vy:(Math.random()-.5)*100, z:4, vz:40+Math.random()*50, age:0, life:.6+Math.random()*.4, c:'#E8F6FA'}); };
deep.onBeaten = () => { sfx.cthuluWake(); shake = 1; toasts.clear(); toast('It is not dying... it has hold of the boat. It is dragging you under!', 3200, 2); };
deep.onDragged = () => dragUnder();
cth.onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .5); toasts.clear();
  toast('Its drowned temple, and it is waiting, as Cthulhu! When the floor ripples, step off it. Spear its tentacles: one spear each. They are faster than you.', 5600, 2); };
cth.onBonk = (by) => bonked(by);
cth.onRipple = () => sfx.tentacle();
cth.onSink = () => sfx.spearHit();
cth.onBeaten = () => { const first = isle6Stage < 2; isle6Stage = 2; towerWon = true; burst(cth); hearts = HEARTS; hudHearts();
  if (first){ coins += RARE_FISH; earned += RARE_FISH; addText(cth.x, cth.y, 60, '+' + RARE_FISH, C.coin, 24, 2.4); }
  if (first){ cat.come(cth.x + 30, cth.y + 40); warrior.come(cth.x + 40, cth.y + 26); }
  toasts.clear(); toast(first ? `Cthulhu crumbles into the deep... and leaves behind a rare fish worth ${RARE_FISH} coins, and two who were kept down there: a healer cat and a little Cthulhu warrior. They are coming with you!` : 'Cthulhu crumbles into the deep.', 6400, 2);
  hud(); refreshShop(); save(); };
// The two Cthulhu leaves behind, the kid's: a healer cat and a little Cthulhu warrior. They follow the figure ashore and
// fight beside it; the cat gives back a heart, twice a fight, and more for a fish from the hold. Tap it to feed or pet it.
// And the Forgotten One's bones, the kid's, on your side once he falls: they hit for two and raise a ghost and a
// skeleton to fight for you.
const cat = new Pal('cat'), warrior = new Pal('warrior'), bonesPal = new Pal('bones');
let palsTold = false, wasFight = false, bonesTold = false, raiseTold = false;
for (const p of [cat, warrior, bonesPal]){ p.findTarget = (x, y, r) => warlock.findTarget(x, y, r); p.onSwing = () => sfx.spearHit();
  p.onHurt = (out) => { addText(p.x, p.y, 26, out ? 'Worn out!' : 'Ow!', '#B8FFC8', 15, 1); if (out){ toasts.clear(); toast(`The ${p.kind === 'cat' ? 'cat' : p.kind === 'warrior' ? 'warrior' : 'skeleton'} is worn out. It goes back to the boat to rest.`, 2800, 1); } }; }
bonesPal.canRaise = () => allies.count('ghost') + allies.count('skeleton') === 0;
bonesPal.onRaise = (x, y) => { allies.call(x + 18, y + 8, 'ghost'); allies.call(x - 14, y + 16, 'skeleton'); sfx.portal();
  if (!raiseTold){ raiseTold = true; toast('The skeleton raises a ghost and a skeleton out of the ground. They fight for you!', 3000, 1); } };
cat.onHeal = () => { if (hearts < HEARTS){ hearts++; hudHearts(); sfx.turtle(); addText(walker.x, walker.y, 34, '+1', '#FF8FB0', 18, 1.2);
  for (let i=0;i<8;i++) sparks.push({x: walker.x, y: walker.y, vx:(Math.random()-.5)*60, vy:(Math.random()-.5)*60, z:20, vz:30+Math.random()*30, age:0, life:.7, c:'#FFB3C8'}); } };
// Tapped: on the boat at sea with fish aboard it eats one, the commonest, for another heal; otherwise it is petted.
function tapCat(){ if (walker.state === 'ashore' && Math.hypot(walker.x - cat.x, walker.y - cat.y) > PET_REACH){ toast('Walk up to the cat.', 1600); return; }
  if (walker.aboard && holdTotal > 0 && cat.feed()){ let sp = 0; while (sp < hold.length && !hold[sp]) sp++; hold[sp]--; holdTotal--; hud(); sfx.yip();
    hudHearts(); toasts.clear(); toast(`The cat ate a ${SPECIES[sp].name}. It has ${cat.heals} heals for the next fight.`, 2400, 1); }
  else { cat.pet(); sfx.yip(); if (walker.aboard && cat.heals >= 5 && holdTotal > 0) toast('The cat is full. Purr.', 1600);
    else if (walker.aboard && !holdTotal && !catFedTold){ catFedTold = true; toast('Purr. Catch a fish and tap the cat to feed it: one more heal.', 2800, 1); } } }
let catFedTold = false;
function catAt(){ if (cat.shown) return [px(cat.x, cat.y), py(cat.x, cat.y, 8)];
  if (cat.free && walker.aboard){ const p = cat.seat(boat, bk()); return [px(p.x, p.y), py(p.x, p.y, p.z + 6)]; } return null; }
// Dragged under: the boat is left tied up at island 6's pier, and the figure, in its helmet, is in the temple.
function dragUnder(){ isle6Stage = Math.max(isle6Stage, 1); const b = berth6(bk()); boat.x = b.x; boat.y = b.y; boat.h = b.h; boat.v = 0;
  walker.landIn(ISLE6_DOCK, TEMPLE_DOOR.x, TEMPLE_DOOR.y); intoTemple(); redFlash = .6; save(); }
function intoTemple(){ resetTowers(); towerWon = false; tower = TEMPLE_DEEP; toRoom(TEMPLE6); walker.diving = true; cth.reset(); if (isle6Stage >= 2) cth.beaten(); sfx.portal(); }
function puff(x, y){ for (let i=0;i<16;i++) sparks.push({x, y, vx:(Math.random()-.5)*90, vy:(Math.random()-.5)*90, z:14, vz:30+Math.random()*40, age:0, life:.8+Math.random()*.5, c:'#B98AFF'}); }
// The kid's cutscene, once the warlock is free and the figure is back aboard: far off in the south corner of the deep,
// an evil monkey summons a tar monster out of the sea, the water goes black, and island 4 turns to tar. A tap skips it.
const CINE = 12, CINE_IN = 2.5, CINE_OUT = 9.5;
const CAPTIONS = [[0, 'Far away, in the south corner of the deep...'], [2.6, 'An evil monkey is summoning something out of the sea.'],
  [4.8, 'A tar monster! The water is turning black.'], [7.6, 'Island 4 is a tar island now. To go there, you will need a chemistry suit from the shipwright.']];
let cine = null, cineWait = 0, tarToastT = 0;
const ease = (t) => t*t*(3 - 2*t);
function cineK(){ if (!cine) return 0; const t = cine.t; return t < CINE_IN ? ease(t/CINE_IN) : t < CINE_OUT ? 1 : ease(clamp(1 - (t - CINE_OUT)/(CINE - CINE_OUT), 0, 1)); }
// Once it is tar the Anchorer draws the monster, and the evil monkey stands on the beach until it wakes.
// How island 7 looks now: the camp's chest, the tower's flag once the sorcerer is beaten there, and the portal.
function isle7Look(){ return {cleared: monkeys7.cleared, open: isle7Stage >= 1 ? portalOpen : 0,
  flag: isle7Stage >= 1 ? (sx, sy) => drawFlagAt(sx, sy, 18*Z, 12*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1) : null}; }
// The portal wakes the first time the figure is back out on island 7 after the sorcerer falls: its lights come on and
// the ring fills over a couple of seconds. Awake, it is the way to Gigantis.
let portalOpen = isle7Stage >= 1 ? 1 : 0;
// Gigantis, through island 7's portal once it is awake: a courtyard inside its gate and two halls of the undead, each
// opening its door at the back once everyone in it is beaten, and then the throne room's great door, barred for now.
// Back through the portal is the way home; bonked out, the figure wakes aboard. It is whole again next time.
const CASTLE = {dock: ISLE7_DOCK, door: PORTAL_OUT, first: GATE, roof: -1, boss: null};
const hordes = {};
const CASTLE_WAKE = {[GATE]: 'Gigantis! Skeletons with swords and shields, and archers. Turn when an arrow flies.',
  [HALL_A]: 'Zombies, slow and tough, and ghosts. Walk away from their wisps.',
  [HALL_B]: 'Necromancers! They raise skeletons from the floor. Your spear goes for them first.',
  [THRONE]: 'The throne room! Three necromancers, and the Forgotten One: skulls, a sword, and a death ray. Step off the orange line!'};
for (const i of CASTLE_ROOMS){ const h = hordes[i] = new Horde(ROOMS[i], CASTLE_SPAWNS[i]);
  h.onHit = (by, n) => bonked(by, n); h.onWindup = () => sfx.spearThrow(); h.onShoot = () => sfx.spearThrow();
  h.onWake = () => { toasts.clear(); toast(CASTLE_WAKE[i], 3600, 2); };
  h.onBlock = (u) => { sfx.clang(); addText(u.x, u.y, 40, 'Blocked!', '#FFE9A8', 20, 1.2); };
  h.onBeat = (u) => { sfx.spearHit(); addText(u.x, u.y, 30, u.kind === 'ghost' ? 'Gone!' : 'Down!', '#D8FFE0', 18, 1.1); };
  h.onRaise = (u) => { sfx.tentacle(); addText(u.x, u.y, 34, 'Rise!', '#8CFFA8', 18, 1.1); };
  h.onClear = () => { if (i === THRONE){ castleWon(); return; } sfx.orderFilled();
    toast(i === HALL_B ? 'The hall is clear. The great door at its back opens on the throne room.' : 'The room is clear, and the door at the back is open.', 3000, 1); }; }
const HORDES = Object.values(hordes);
// The courtyard's portal home stands at its side, toward the viewer's right.
const GATE_PORTAL = {x: ROOMS[GATE].x + ROOMS[GATE].r*.62*Math.SQRT1_2, y: ROOMS[GATE].y - ROOMS[GATE].r*.62*Math.SQRT1_2};
// The throne room: three necromancers and the Forgotten One. Beaten, he falls apart and his bones get up on your side
// (the companions, below). The warlock calls merlocks up out of a puddle of sea to help.
// Beat everyone and the Forgotten One stays beaten (isle7Stage 2): his throne is empty after, and behind it is a door,
// locked, which the kid left for next time.
const FORGOTTEN_PRIZE = 5000;
const forgotten = new Forgotten(ROOMS[THRONE], FORGOTTEN_START);
forgotten.onHit = (by) => bonked(by);
forgotten.onWindup = () => sfx.spearThrow(); forgotten.onSkulls = () => sfx.spearThrow(); forgotten.onAim = () => sfx.zap();
// Beaten, he falls apart, and his bones get up on your side, as the kid wrote: they come with you from then on.
let bonesJoined = false;
forgotten.onBeaten = (x, y) => { burst({x, y}); bonesJoined = true; bonesPal.come(x, y); bonesTold = true; toasts.clear();
  toast('He falls apart! His bones get up, hair and all... and kneel to you. The Forgotten One\'s bones are on your side now, and they are coming with you!', 5200, 2); };
// The lancers in the ruins behind the throne, the kid's: quiet unless you start it, then two hearts a thrust.
const lancers = new Lancers(LANCER_POSTS, ROOMS[RUINS]);
let lancerTold = false;
lancers.onHit = (n) => bonked('lance', n);
lancers.onWindup = () => sfx.spearThrow();
lancers.onRouse = () => { if (!lancerTold){ lancerTold = true; toasts.clear(); toast('You roused a lancer! When it draws its lance back, get out of the way: two hearts a stab.', 3600, 2); } };
// The warlock's merlocks, and the ghost and skeleton the bones raise: allies called up to fight beside the figure.
const allies = new Allies();
allies.findTarget = (x, y, r) => warlock.findTarget(x, y, r);
allies.onHit = () => sfx.spearHit();
allies.onHurt = (a, out) => addText(a.x, a.y, 30, out ? (a.kind === 'merlock' ? 'Splash!' : 'Crumble!') : 'Ow!', '#B8F0E0', 16, 1.1);
let throneToldT = 0, merlockT = 0, merlocksTold = false;
// Won once only: after it his throne room is empty.
function castleWon(){ if (forgotten.state !== 'gone' || towerWon) return;
  isle7Stage = 2; towerWon = true; hearts = HEARTS; hudHearts(); allies.clear();
  coins += FORGOTTEN_PRIZE; earned += FORGOTTEN_PRIZE; sfx.tierUp(); shake = 1;
  addText(SEAT.x, SEAT.y, 60, '+' + FORGOTTEN_PRIZE, C.coin, 26, 2.6); toasts.clear();
  toast(`You beat the Forgotten One, and his bones are on your side now! And behind his empty throne, a locked door: walk his bones to it. +${FORGOTTEN_PRIZE} coins.`, 6400, 2);
  hud(); refreshShop(); save(); }
function intoCastle(){ resetTowers(); towerWon = false; tower = CASTLE; toRoom(GATE); sfx.portal(); shake = Math.max(shake, .4); toasts.clear();
  // Once he is beaten, his throne room stays empty.
  if (isle7Stage >= 2){ forgotten.beaten(); for (const u of hordes[THRONE].list) u.state = 'gone'; hordes[THRONE].cleared = true; }
  toast('Through the portal: Gigantis, a castle standing on the sea under a green sky. The dead walk here.', 4200, 2); }
function updateCastle(dt){ throneToldT -= dt;
  if (tower !== CASTLE || floor !== THRONE) return;
  // Won when he has finished falling apart and the room is clear, whichever comes last.
  if (isle7Stage < 2 && hordes[THRONE].cleared) castleWon();
  // The warlock calls merlocks while the fight is on: two, and two more a while after they are gone.
  const fight = forgotten.up || hordes[THRONE].list.some(u => Horde.up(u));
  if (fight && warlock.shown){ merlockT -= dt;
    if (allies.count('merlock') === 0 && merlockT <= 0){ merlockT = 12; sfx.portal();
      for (const s of [-1, 1]) allies.call(warlock.x + s * 18, warlock.y + 14, 'merlock');
      if (!merlocksTold){ merlocksTold = true; toast('The warlock calls up merlocks out of a puddle of sea! They fight beside you.', 3200, 1); } } }
  // The door behind the throne: his bones have the key, and give it once they are with you there.
  const atDoor = Math.hypot(walker.x - LOCKED.x, walker.y - LOCKED.y) <= LOCKED_REACH;
  if (atDoor && isle7Stage === 2 && bonesPal.shown){ isle7Stage = 3; save(); sfx.tierUp(); shake = Math.max(shake, .5);
    addText(LOCKED.x, LOCKED.y, 60, 'Click!', C.coin, 22, 1.8); toasts.clear();
    toast('The Forgotten One\'s bones hold out a key: his own. The padlock falls open and the chains drop. Through the door!', 4600, 2); return; }
  if (isle7Stage >= 3 || throneToldT > 0 || !atDoor) return;
  throneToldT = 20; toasts.clear();
  toast(isle7Stage >= 2 ? 'Locked. The Forgotten One\'s bones know where his key is: bring them here.' : 'Locked, with a lock as big as your head.', 4200, 2); }
// Into the ruins behind the throne: the lancers are back at their posts, quiet.
function intoRuins(){ lancers.reset(); toasts.clear();
  toast('Ruins behind the throne, open to the sky, round a black pool. Lancers stand guard: they leave you alone if you leave them alone.', 5200, 2); }
function updatePortal7(dt){ if (isle7Stage < 1){ portalOpen = 0; return; }
  const out = floor < 0 && walker.state === 'ashore' && walker.dock === ISLE7_DOCK;
  if (portalOpen < 1 && out){ if (portalOpen === 0){ sfx.portal(); shake = Math.max(shake, .4); toasts.clear(); toast('The ring on the burnt grass is waking up. It is a portal! Walk into it.', 3600, 2); }
    portalOpen = Math.min(1, portalOpen + dt/2.5); } }
function isle4Look(){ if (isle3Stage >= 4) return {tar: 1, spread: 1, rise: 0, summon: 0, monkey: anchorer.waiting};
  if (!cine) return {tar: 0, spread: 0, rise: 0, summon: 0, monkey: false};
  const t = cine.t, r = (a, b) => clamp((t - a)/(b - a), 0, 1);
  return {summon: r(2.5, 4.6), rise: r(4.4, 6.8), spread: r(5, 8.2), tar: r(6.2, 8.8), monkey: t >= 2.5}; }
function startCine(){ cine = {t: 0, cue: 0}; toasts.clear(); boat.v = 0; document.body.classList.add('cine'); }
function endCine(){ cine = null; document.body.classList.remove('cine'); isle3Stage = Math.max(isle3Stage, 4); save(); refreshShop();
  toast('Island 4 has turned to tar. A dark marker shows the way there. You need a chemistry suit: dock, and the shipwright in the shop sells one.', 5200, 1); }
function updateCine(dt){
  if (!cine){ if (isle3Stage === 3 && walker.aboard && started && swallowT <= 0){ cineWait += dt; if (cineWait > 1.5){ cineWait = 0; startCine(); } } else cineWait = 0; return; }
  cine.t += dt;
  if (cine.cue === 0 && cine.t >= 2.5){ cine.cue = 1; sfx.portal(); }
  if (cine.cue === 1 && cine.t >= 4.4){ cine.cue = 2; sfx.cthuluWake(); shake = Math.max(shake, .6); }
  if (cine.t >= CINE) endCine(); }
cv.addEventListener('pointerdown', () => { if (cine) cine.t = Math.max(cine.t, CINE - .01); });
function drawCine(){ if (!cine) return; const k = Math.min(1, cine.t/.5, (CINE - cine.t)/.5), bar = H*.11*k;
  ctx.fillStyle = '#05080C'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  let cap = ''; for (const [t, c] of CAPTIONS) if (cine.t >= t) cap = c;
  ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFF1D6';
  ctx.font = `800 ${Math.round(Math.min(18, W/22))}px Grandstander, ui-rounded, system-ui, sans-serif`;
  const words = cap.split(' '), lines = []; let line = '';
  for (const w of words){ const tryLine = line ? line + ' ' + w : w; if (ctx.measureText(tryLine).width > W - 40){ lines.push(line); line = w; } else line = tryLine; }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, W/2, H - bar/2 + (i - (lines.length - 1)/2)*22));
  ctx.font = `600 12px Grandstander, ui-rounded, system-ui, sans-serif`; ctx.fillStyle = 'rgba(255,241,214,.6)'; ctx.fillText('Tap to skip', W/2, bar*.75);
  ctx.globalAlpha = 1; }
function inFight(){ return [monkeys, monkeys7, ...camps, demonMonkeys, roofMonkeys].some(c => c.list.some(m => m.state === 'chase')) || HORDES.some(h => h.list.some(u => Horde.up(u))) || forgotten.up || boss.up || boss3.up || boss7.up || swordsman.up || demons.some(d => d.up) || anchorer.up || cth.up || lancers.roused || pullT > 0; }
warlock.fighting = inFight;
function dive(){ resetTowers(); towerWon = false; tower = DEPTHS; toRoom(HALL); walker.diving = true; applyStage(); sfx.hop();
  toast(isle3Stage >= 2 ? 'Down at the tower\'s foot again. The portal is still turning.' : 'Down to the foot of the tower, under the sea.', 3000, 1); }
function intoDemons(){ sfx.portal(); redFlash = 1; shake = Math.max(shake, .6); toRoom(DEMON); walker.diving = false; demonMonkeys.reset(); for (const d of demons) d.reset(); applyStage(); }
function toRoom(i){ floor = i; allies.clear(); const e = entry(i); walker.x = e.x; walker.y = e.y; walker.vx = walker.vy = 0; cam.x = walker.x; cam.y = walker.y; sfx.hop(); if (i === RUINS) intoRuins(); }
function resetTowers(){ for (const fl of camps) fl.reset(); for (const h of HORDES) h.reset(); forgotten.reset(); lancers.reset(); allies.clear(); bonesJoined = false; merlockT = 1; boss.reset(); boss3.reset(); boss7.reset(); roofMonkeys.reset(); swordsman.reset(); for (const d of demons) d.reset(); demonMonkeys.reset(); pullT = 0; cageOpen = 0; }
function enterTower(t){ resetTowers(); towerWon = false; tower = t; toRoom(t.first);
  toast(!spear ? 'Inside the tower, and you have no spear! Leave, and buy one from the shipwright.'
    : t.boss === boss3 ? 'Inside the sunken tower. It drips. Beat the monkeys to open the stairs.' : t.boss === boss7 ? 'Inside island 7\'s tower. More monkeys this time: beat them to open the stairs.' : 'Inside the tower. Beat the monkeys to open the stairs.', 3200, 1); }
function leaveTower(out = true){ if (floor < 0) return; floor = -1; resetTowers(); walker.diving = false;
  if (out && walker.state === 'ashore' && tower){ walker.x = tower.door.x; walker.y = tower.door.y; walker.vx = walker.vy = 0; cam.x = walker.x; cam.y = walker.y; }
  tower = null; }
// What the climb button would do now: in at a door, up the open stairs, or nothing.
function climbAction(){
  // Up against island 4's tar in the chemistry suit, all but stopped: into it.
  if (walker.aboard) return !cine && gear.suit && isle3Stage >= 4 && Math.abs(boat.v) < TAR_STOP && atTar(boat.x, boat.y, bk()) ? 'tar' : null;
  if (walker.state !== 'ashore') return null;
  if (floor < 0){ if (walker.dock === ISLE3_DOCK && isle3Stage >= 1 && Math.hypot(walker.x - DIVE3.x, walker.y - DIVE3.y) < STEP) return 'dive';
    if (walker.dock === ISLE6_DOCK && isle6Stage === 1 && Math.hypot(walker.x - TEMPLE_DOOR.x, walker.y - TEMPLE_DOOR.y) < STEP + 6) return 'temple';
    if (walker.dock === ISLE7_DOCK && isle7Stage >= 1 && portalOpen >= 1 && Math.hypot(walker.x - PORTAL7.x, walker.y - PORTAL7.y) < PORTAL7.r * .7) return 'castle';
    const t = TOWER_AT.find(t => t.dock === walker.dock); return t && Math.hypot(walker.x - t.door.x, walker.y - t.door.y) < STEP ? 'door' : null; }
  if (tower === CASTLE){ const h = hordes[floor], st = stairs(floor);
    if (floor === THRONE) return isle7Stage >= 3 && Math.hypot(walker.x - LOCKED.x, walker.y - LOCKED.y) < LOCKED_REACH ? 'onward' : null;
    return h && h.cleared && Math.hypot(walker.x - st.x, walker.y - st.y) < STEP + 6 ? 'onward' : null; }
  if (floor === HALL && isle3Stage >= 2 && pullT <= 0 && Math.hypot(walker.x - PORTAL.x, walker.y - PORTAL.y) < STEP + 6) return 'portal';
  if (tower && floor < tower.roof && floors[floor] && floors[floor].cleared){ const st = stairs(floor); if (Math.hypot(walker.x - st.x, walker.y - st.y) < STEP + 6) return 'stairs'; }
  return null; }
function hudHearts(){ const el = $('hearts'), show = walker.state === 'ashore' && (walker.dock === ISLE2_DOCK || walker.dock === ISLE3_DOCK || walker.dock === ISLE7_DOCK || walker.dock.tar || warlock.shown || cat.shown || bonesPal.shown) || hearts < HEARTS; el.hidden = !show;
  if (show) el.innerHTML = Array.from({length: HEARTS}, (_, i) => HEART_SVG.replace('#E4572E', i < hearts ? '#E4572E' : 'rgba(128,128,128,.35)')).join('')
    // The warlock's, in green, after a gap.
    + (warlock.shown ? '<i style="display:inline-block;width:8px"></i>' + Array.from({length: WARLOCK_HEARTS}, (_, i) => HEART_SVG.replace('#E4572E', i < warlock.hearts ? '#3FB37A' : 'rgba(128,128,128,.35)')).join('') : '')
    // The cat's heals left, as little pink crosses.
    + (cat.shown && cat.heals ? '<i style="display:inline-block;width:8px"></i>' + Array.from({length: cat.heals}, () => HEAL_SVG).join('') : ''); }
const HEAL_SVG = '<svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M4 2h4v4h4v4H8v4H4v-4H0V6h4z" fill="#FF8FB0"/></svg>';
// The boat is tied up at the trading post while the figure is ashore, so a speared fish is sold on the spot.
function sellSpeared(sp, x, y){ log[sp]++; noteFirst(sp); carry += salePrice(SPECIES[sp].v, build, sp, market); const v = Math.floor(carry); carry -= v;
  coins += v; earned += v; sfx.spearHit();
  flies.push({x0:x, y0:y, z0:0, to:'post', t:0, dur:.55, c:SPECIES[sp].c, s:SPECIES[sp].s});
  addText(x, y, 18, '+' + v, C.coin, 19, 1.3); hud(); refreshShop(); save(); }
// Off the boat: tie up at the pier and walk the island. The stick walks the figure while it is ashore.
const walker = new Walker();
walker.onHop = () => sfx.hop();
const ashoreTold = new Set(); // each landing explains itself once a visit
walker.onLand = () => { gapTold = false; const told = walker.dock.tar ? 'tar' : walker.dock; if (!ashoreTold.has(told)){ ashoreTold.add(told);
    toast(walker.dock.tar ? 'Into the tar in your chemistry suit. Swim to the island; the boat waits at the edge.' : walker.dock === HOME_DOCK ? 'Ashore. Walk the island, the pier and the bridge. The boat waits at the end of the pier.' : walker.dock === ISLE3_DOCK ? 'Ashore on the floating town. Walk the planks out to the seaweed round the tower.' : walker.dock === ISLE6_DOCK ? `Ashore on island 6, the big island. ${CHESTS6.length} treasure chests are hidden on it: walk it all to find them.` : walker.dock === ISLE7_DOCK ? 'Ashore on island 7. Monkeys on the far side, a tower in the middle, and a ring of strange metal standing on burnt grass. It is dead quiet.' : (spear ? 'Ashore on island 2. Walk along the sand: when a parrotfish swims close, throw your spear.' : 'Ashore on island 2. Parrotfish swim close to the sand here, and the shipwright sells a spear.'), 3800, 1); } save(); };
for (const e of [rareEntity, leviathan, cthulu, angler, gulper, shallows, spears, monkeys, monkeys7, ...camps, roofMonkeys, ...HORDES, forgotten, lancers, allies, boss, boss3, boss7, swordsman, ...demons, demonMonkeys, warlock, wboat, anchorer, tarbaby, king, deep, cth, cat, warrior, bonesPal, whales, mantas, turtles, pirateEntity, gullsEntity, dolphins, sharksEntity, crates, driftwood, jellies, pets, walker]) scene.add(e);
function towLen(){ return towLength(NETW[lv.net]); }
resetNet();

/* ---------- input ---------- */
const joy = createJoystick();
const keys = new Set();
const keySmooth = {x:0, y:0};
const elKeys = $('keys');
function keysLabel(){ elKeys.textContent = keyMode === 'drive' ? '⌨ drive' : '⌨ point'; elKeys.setAttribute('aria-label', keyMode === 'drive' ? 'Keys drive the boat' : 'Keys point the boat'); }
function showKeys(){ elKeys.hidden = false; }
elKeys.addEventListener('click', () => { keyMode = keyMode === 'drive' ? 'point' : 'drive'; keysLabel(); save(); audio(); sfx.click();
  toast(keyMode === 'drive' ? 'Keys drive the boat. A and D turn, W throttle, S brakes.' : 'Keys point the boat. Hold a direction and it goes that way.', 3200); });
// The keyboard button is noise on a phone: show it where a mouse lives, or once a key is pressed.
if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) showKeys();
bindJoystick(cv, joy, audio);
// The shop covers where the thumb lives: a drag on its wood steers the boat through it.
bindJoystickThrough($('shop'), joy, cv, t => !(t && t.closest && (t.closest('button') || t.closest('.log'))), audio);
bindKeys(window, keys, () => { audio(); showKeys(); });
window.addEventListener('blur', () => { keys.clear(); joy.on = false; });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
window.addEventListener('pagehide', () => save());

/* ---------- HUD ---------- */
const elCoins = $('coins'), elHoldTxt = $('holdTxt'), elHoldBar = $('holdBar'), elHoldPill = $('holdPill');
const elToast = $('toast'), elShop = $('shop'), elSnd = $('snd'), elRst = $('rst');
const toasts = new ToastQueue(); let toastShown = null;
// pri 0 is routine, 1 an event, 2 danger; danger interrupts, the rest wait their turn.
function toast(msg, ms=2600, pri=0){ toasts.push(msg, ms, pri, performance.now()/1000); }
function renderToast(){ const m = toasts.tick(performance.now()/1000); if (m === toastShown) return; toastShown = m;
  if (m){ elToast.textContent = m; elToast.style.top = toastTop(); elToast.classList.add('show'); } else elToast.classList.remove('show'); }
// A message sits below the bubbles at the top, which grow a row for each of hearts, the hull and the market.
const TOAST_TOP = 140;
function toastTop(){ let b = 0;
  for (const el of [$('order'), $('rchips')]){ const r = el.getBoundingClientRect(); if (r.height) b = Math.max(b, r.bottom); }
  return b + 10 > TOAST_TOP ? (b + 10) + 'px' : ''; }
// The bubbles change as hearts, the hull and the market come and go; the message moves with them.
if (typeof ResizeObserver !== 'undefined'){ const ro = new ResizeObserver(() => { elToast.style.top = toastTop(); }); ro.observe($('order')); ro.observe($('rchips')); }
// The boat's health, shown past the buoys and whenever it is not whole.
const HEART_SVG = '<svg width="16" height="14" viewBox="0 0 16 14" aria-hidden="true"><path d="M8 13C3 9 1 7 1 4.5A3.5 3.5 0 0 1 8 3a3.5 3.5 0 0 1 7 1.5C15 7 13 9 8 13z" fill="#E4572E"/></svg>';
function hudHull(){ const show = pastBuoys(boat.x, boat.y) || hp < HP_MAX || swallowT > 0, v = Math.ceil(hp), key = show ? v : -2;
  if (key === hpShown) return; hpShown = key; const el = $('hull'); el.hidden = !show; if (!show) return;
  el.innerHTML = HEART_SVG + `<span class="hbar"><i style="width:${v}%;background:${v <= 34 ? '#E4572E' : '#5BBF6A'}"></i></span><span>${v}</span>`; }
function hud(){
  elCoins.textContent = coins;
  const cap = HOLD[lv.hold];
  elHoldTxt.textContent = holdTotal + '/' + cap;
  elHoldBar.style.width = (holdTotal/cap*100) + '%';
  elHoldPill.classList.toggle('full', holdTotal >= cap);
}
const EFFECT = {
  net: l => `Sweeps ${NETW[l]} across` + (l >= 3 ? '. Catches sharks' : ''),
  hold: l => `Carries ${HOLD[l]} fish`,
  engine: l => `Top speed ${SPEED[l]}`
};
function refreshShop(){
  elShop.querySelectorAll('.up').forEach(b => {
    const k = b.dataset.k, l = lv[k], maxed = l >= MAXLV, cost = maxed ? 0 : COST[k][l], locked = !maxed && l >= levelCap(build);
    b.querySelector('.pips').innerHTML = [0,1,2,3,4,5].map(i => `<i class="${i<=l?'on':''}"></i>`).join('');
    b.querySelector('small').textContent = maxed ? EFFECT[k](l) : EFFECT[k](l+1);
    b.querySelector('.buy').textContent = maxed ? 'Maxed out' : locked ? 'Build to unlock' : `Buy for ${cost}`;
    b.setAttribute('aria-disabled', (maxed || locked || coins < cost) ? 'true' : 'false');
  });
  const t = tier(), left = 3 - (lv.net+lv.hold+lv.engine)%3;
  const nm = TIER_NAME[t][0].toUpperCase() + TIER_NAME[t].slice(1);
  $('tierTxt').textContent = t >= 5 ? nm + '. Fully grown.' : `${nm}. ${left} upgrade${left>1?'s':''} to grow.`;
  const open = paintsUnlocked(t);
  $('paints').innerHTML = PAINTS.map((p,i) => `<button class="sw${i===paint?' sel':''}" data-i="${i}" aria-label="${p.name}${i>=open?' (locked)':''}" aria-disabled="${i>=open}" style="background:${p.hull};border-color:${p.trim}"></button>`).join('');
  // A fully grown boat has nothing left to buy here, so the three maxed cards fold away and the panel stays short.
  elShop.querySelector('.row').hidden = lv.net >= MAXLV && lv.hold >= MAXLV && lv.engine >= MAXLV;
  refreshBuild(); refreshMarket(); refreshGear(); $('flagMini').innerHTML = flagSvg(flag || START_FLAG, 30, 20);
  $('log').innerHTML = SPECIES.map((S,i) => `<span class="chip${log[i]?'':' unk'}${S.rare&&log[i]?' gold':''}" title="${log[i]?S.name:'Not caught yet'}">${FISH_SVG(log[i]?S.c:'currentColor')}${log[i]||'?'}</span>`).join('')
    + `<span class="chip${levSeen?' gold':' unk'}">${levSeen?'Leviathan sighted':'Something bigger?'}</span>`
    + `<span class="chip${whaleSeen?' gold':' unk'}">${whaleSeen?'Whales sighted':'A song, far out?'}</span>`
    + `<span class="chip${turtleSeen?' gold':' unk'}">${turtleSeen ? (turtleSwims ? 'Turtle swims ' + turtleSwims : 'Turtles sighted') : 'Something paddling?'}</span>`
    + `<span class="chip${mantaSeen?' gold':' unk'}">${mantaSeen?'Mantas sighted':'Wings in the water?'}</span>`
    + `<span class="chip${cthuluSeen?' gold':' unk'}">${cthuluSeen?'Cthuluviathan sighted':'Something asleep?'}</span>`
    + `<span class="chip${anglerSeen?' gold':' unk'}">${anglerSeen?'Anglerfish sighted':'A light in the deep?'}</span>`
    + `<span class="chip${towerTaken?' gold':' unk'}">${towerTaken ? 'Tower taken' : 'Who is in the tower?'}</span>`
    + `<span class="chip${masks?' gold':' unk'}">${masks ? 'Skull masks ' + masks : 'Masks on island 2?'}</span>`
    + `<span class="chip${gulperSeen?' gold':' unk'}">${gulperSeen?'Gulper escaped':'An open mouth?'}</span>`
    + Object.keys(TROPHY).filter(k => driven[k]).map(k => `<span class="chip gold">${TROPHY[k].name}${driven[k] > 1 ? ' \u00d7' + driven[k] : ''}</span>`).join('')
    + (hasHarpoon() && !Object.keys(TROPHY).some(k => driven[k]) ? '<span class="chip unk">Harpoon a leviathan?</span>' : '')
    + `<span class="chip${isle2Seen?' gold':' unk'}">${isle2Seen?'Island 2 found':'Land past the deep?'}</span>`
    + (isle3Seen || isle2Seen ? `<span class="chip${isle3Seen?' gold':' unk'}">${isle3Seen?'Sunken island found':'Another island?'}</span>` : '')
    + (isle3Stage >= 4 ? '<span class="chip gold">Tar island seen</span>' : '')
    + (isle4Stage >= 1 ? '<span class="chip gold">Tar Anchorer beaten</span>' : '')
    + (isle5Seen ? '<span class="chip gold">Island of bones found</span>' : '')
    + (isle5Stage >= 1 ? '<span class="chip gold">Shark King beaten</span>' : '')
    + (isle6Stage >= 2 ? '<span class="chip gold">Deep One beaten</span>' : '')
    + (isle7Seen ? '<span class="chip gold">Island 7 found</span>' : '')
    + (isle7Stage >= 1 ? '<span class="chip gold">Portal awake</span>' : '')
    + (isle7Stage >= 2 ? '<span class="chip gold">Forgotten One beaten</span>' : '')
    + (isle6Seen ? `<span class="chip gold">Big island found${chests6 ? ': ' + popcount(chests6) + ' of ' + CHESTS6.length + ' chests' : ''}</span>` : '')
    + `<span class="chip${snook.landed?' gold':' unk'}">${snook.landed ? 'Snook landed ' + snook.landed : 'Under the bridge?'}</span>`;
}
const FISH_SVG = c => `<svg width="18" height="11" viewBox="0 0 22 14" aria-hidden="true"><path d="M1 7c3-5 9-7 14-3l5-3v12l-5-3C10 14 4 12 1 7z" fill="${c}" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/></svg>`;
const LOG_SVG = '<svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true"><rect x="1" y="2" width="18" height="8" rx="4" fill="#A9773F" stroke="#5E3D1C" stroke-width="1.5"/><circle cx="15.5" cy="6" r="1.8" fill="#E6B877"/></svg>';
function hudPhase(){ $('phase').innerHTML = `<i style="background:${PHASE_C[phase]}"></i><span>${phase}</span>`; }
function hudWood(){ $('wood').innerHTML = LOG_SVG + '<span>' + wood + '</span>'; }
function refreshGear(){ const el = $('gear'); el.hidden = !shipwrightOpen(tier());
  // The chemistry suit is kept back until the tar island has been seen.
  el.innerHTML = '<span class="gearhead">Shipwright</span>' + GEAR_IDS.filter(id => id !== 'suit' || isle3Stage >= 4 || gear.suit).map(id => { const g = GEAR[id], no = refusal(id, gear, coins);
    return `<button class="gear" data-g="${id}" aria-disabled="${no ? 'true' : 'false'}"><b>${g.name}</b><span class="buy">${no === 'fitted' ? 'Fitted' : g.cost}</span><small>${g.blurb}</small></button>`; }).join('')
    // The spear is for island 2's shallows, so the shipwright keeps it back until island 2 has been found.
    + (() => { const n = nextSpear(spear), have = spearAt(spear); if (!isle2Seen && !spear) return '';
      return n ? `<button class="gear" data-s="1" aria-disabled="${coins < n.cost ? 'true' : 'false'}"><b>${n.name}</b><span class="buy">${n.cost}</span><small>${n.blurb}</small></button>`
        : `<button class="gear" data-s="1" aria-disabled="true"><b>${have.name}</b><span class="buy">Owned</span><small>On the bow. Past the buoys, fire it at a leviathan.</small></button>`; })(); }
function refreshBuild(){
  const b = $('build'), mult = Math.round(build*15);
  if (build >= STAGES.length){ b.setAttribute('aria-disabled','true');
    b.innerHTML = `<span><b>Your palace is finished</b><small>All fish sell for ${mult}% more. The fishmonger and the smokehouse are open.</small></span>`; return; }
  const S = STAGES[build], ok = wood >= S.wood && coins >= S.coins;
  const note = wood < S.wood ? `You have ${wood} of ${S.wood} driftwood.` : coins < S.coins ? `You need ${S.coins - coins} more coins.` : `Fish sell for ${mult+15}% more${build < 3 ? '. Unlocks the next upgrade level' : build === FISHMONGER_STAGE-1 ? '. Opens the fishmonger, who pays double for his pick of the day' : build === SMOKEHOUSE_STAGE-1 ? '. Opens the smokehouse: tuna, goldfin and shark sell for half again' : ''}.`;
  b.setAttribute('aria-disabled', ok ? 'false' : 'true');
  b.innerHTML = `<span><b>Build the ${S.name}</b><small>${note}</small></span><span class="buy">${S.wood} driftwood${S.coins ? ' and ' + S.coins + ' coins' : ''}</span>`;
}
function drawOrder(){
  const S = SPECIES[order.sp];
  $('order').innerHTML = `${FISH_SVG(S.c)}<span>${order.n} ${S.pl} pays ${order.pay}</span><b>${Math.min(order.have,order.n)}/${order.n}</b>`;
}
// The deepest species the orders and the fishmonger may ask for: one past the deepest caught, inside the range.
function reachTop(){ let top = 0; for (let i=0;i<SHARK;i++) if (log[i] > 0) top = i;
  top = Math.min(SHARK-1, top+1); while (top > 0 && RING_R[top] + 120 > range()) top--; return top; }
function refreshMarket(){ const el = $('market'); if (!vendorsOpen(build).fishmonger || market === NO_PICK){ el.hidden = true; return; }
  const S = SPECIES[market]; el.hidden = false; el.innerHTML = FISH_SVG(S.c) + '<span>\u00d72 ' + S.pl + '</span>'; }
function newMarket(){ market = pickMarket(reachTop(), market, Math.random); refreshMarket(); save(); }
function newOrder(){
  const top = reachTop();
  let sp = Math.max(Math.floor(Math.random()*(top+1)), Math.floor(Math.random()*(top+1)));
  if (sp === order.sp && top > 0) sp = (sp + 1) % (top+1);
  const n = Math.max(4, Math.round((15 - sp*1.5)*(.7 + Math.random()*.6)));
  order = {sp, n, have:0, pay: Math.max(10, Math.round(n*SPECIES[sp].v*1.6/5)*5)};
  drawOrder();
}
elShop.addEventListener('click', e => {
  const b = e.target.closest('.up'); if (!b) return; audio();
  const k = b.dataset.k, l = lv[k]; if (l >= MAXLV) return;
  if (l >= levelCap(build)){ sfx.denied(); toast(`Build the ${STAGES[build].name} to unlock the next level.`, 2400); return; }
  const t0 = tier();
  const cost = COST[k][l];
  if (coins < cost){ sfx.denied(); toast(`You need ${cost - coins} more coins.`, 1600); return; }
  coins -= cost; lv[k]++;
  if (tier() > t0){
    const fresh = paintsUnlocked(t0); if (fresh < PAINTS.length) paint = fresh;
    toast(`Your boat grew into a ${TIER_NAME[tier()]}. New paint unlocked.`, 3000, 1);
    sfx.tierUp();
  } else toast('Bought ' + b.querySelector('b').textContent.toLowerCase() + '.', 1600);
  save(); hud(); refreshShop(); resetNet();
  sfx.upgrade();
});
function sndLabel(){ elSnd.classList.toggle('off', muted); elSnd.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on'); }
elSnd.addEventListener('click', () => { muted = !muted; setMuted(muted); sndLabel(); save(); audio(); sfx.toggleSound(); });
$('paints').addEventListener('click', e => {
  const b = e.target.closest('.sw'); if (!b) return; audio();
  const i = +b.dataset.i;
  if (i >= paintsUnlocked(tier())){ toast('More paint unlocks as your boat grows.', 1800); sfx.denied(); return; }
  paint = i; save(); refreshShop(); sfx.click();
});
$('build').addEventListener('click', () => { audio();
  if (build >= STAGES.length) return;
  const S = STAGES[build];
  if (wood < S.wood || coins < S.coins){ sfx.denied();
    toast(wood < S.wood ? `Collect ${S.wood - wood} more driftwood out at sea.` : `You need ${S.coins - coins} more coins.`, 2000); return; }
  wood -= S.wood; coins -= S.coins; build++;
  addText(TX, TY, 130, 'Built the ' + S.name, '#9CF0C0', 22, 2.6);
  if (build === FISHMONGER_STAGE){ newMarket(); toast(`Built the ${S.name}. The fishmonger has opened: he wants ${SPECIES[market].pl} today, double pay.`, 4000, 1); }
  else if (build === SMOKEHOUSE_STAGE) toast(`Built the ${S.name}. The smokehouse has opened: tuna, goldfin and shark sell for half again as much.`, 4000, 1);
  else toast(`Built the ${S.name}. Fish now sell for ${build*15}% more.`, 3200, 1);
  sfx.build();
  save(); hud(); hudWood(); refreshShop();
});
$('gear').addEventListener('click', e => { const b = e.target.closest('.gear'); if (!b) return; audio();
  if (b.dataset.s){ const n = nextSpear(spear); if (!n) return;
    if (coins < n.cost){ sfx.denied(); toast(`${n.blurb} You need ${n.cost - coins} more coins.`, 2600); return; }
    coins -= n.cost; spear++; sfx.upgrade(); toast(n.bought, 3600, 1); save(); hud(); refreshShop(); return; }
  const id = b.dataset.g, no = refusal(id, gear, coins); if (no === 'fitted') return;
  if (no === 'coins'){ sfx.denied(); toast(`${GEAR[id].blurb} You need ${GEAR[id].cost - coins} more coins.`, 2600); return; }
  coins -= GEAR[id].cost; gear[id] = true; sfx.upgrade(); toast(GEAR[id].fitted, 3200, 1); save(); hud(); refreshShop(); });
const elGuide = $('guide');
const LEV_SVG = '<svg width="18" height="11" viewBox="0 0 22 14" aria-hidden="true"><ellipse cx="11" cy="7" rx="10" ry="4" fill="currentColor" opacity=".7"/></svg>';
// A leviathan's last fact in the guide: how often the harpoon has driven it off, or what it takes.
function beastFact(k){ const n = driven[k];
  return n ? `Driven off ${n === 1 ? 'once' : n + ' times'}: ${TROPHY[k].name.toLowerCase()}` : hasHarpoon() ? `${RESOLVE[k]} harpoon hits drive it off` : 'Not for catching'; }
function renderGuide(){
  const pages = SPECIES.map((S, sp) => { const g = guidePage(sp, log[sp], first[sp]);
    return `<article class="page${g.known ? '' : ' unk'}${g.known && S.rare ? ' gold' : ''}">${FISH_SVG(g.known ? S.c : 'currentColor')}<b>${g.name}</b><small>${g.blurb}</small>`
      + `<div class="facts"><span>${g.where}</span><span>${g.when}</span><span>${g.worth}</span><span>${g.caught}</span></div></article>`; });
  pages.push(`<article class="page${levSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${levSeen ? 'Leviathan' : '?'}</b><small>${levSeen
    ? 'Something enormous circles the island far out: a chain of shadows, the odd back breaking the surface, lit at night. It guards the buoys: make for them in a flagship and it rises across your way. Turn away from the spines.'
    : 'Not seen yet. Something enormous circles the island, far out. Sail over it, and go at night.'}</small><div class="facts"><span>About 2,180 out</span><span>Day and night</span><span>${beastFact('guard')}</span></div></article>`);
  pages.push(`<article class="page${whaleSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${whaleSeen ? 'Whale and calf' : '?'}</b><small>${whaleSeen
    ? 'A mother and her calf, round and round the far water. They come up to breathe, and they sing: she low, the calf higher. At night the song carries.'
    : 'Not seen yet. Listen out in the far water, best at night.'}</small><div class="facts"><span>1,750 to 2,250 out</span><span>Day and night</span><span>Not for catching</span></div></article>`);
  pages.push(`<article class="page${turtleSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${turtleSeen ? 'Sea turtles' : '?'}</b><small>${turtleSeen
    ? 'Green turtles paddle the inner rings round the island and come up every so often to breathe. Ease up beside one slowly and it swims with you a while; come on fast and it ducks away. Real fishing nets have a door that lets turtles out, and so does yours.'
    : 'Not seen yet. Something paddles the water near the island and comes up to breathe. Go slowly.'}</small><div class="facts"><span>400 to 1,150 out</span><span>Day and night</span><span>${turtleSwims ? 'Swum with you ' + (turtleSwims === 1 ? 'once' : turtleSwims + ' times') : 'The net lets them go'}</span></div></article>`);
  pages.push(`<article class="page${mantaSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${mantaSeen ? 'Manta rays' : '?'}</b><small>${mantaSeen
    ? 'A squadron of three to five, gliding the middle rings in a V. Stay near and, every so often, one leaps clear of the water and comes down with a whump.'
    : 'Not seen yet. Something with wings glides the middle rings.'}</small><div class="facts"><span>1,200 to 1,700 out</span><span>Day and night</span><span>The net slides off them</span></div></article>`);
  pages.push(`<article class="page${cthuluSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${cthuluSeen ? 'Cthuluviathan' : '?'}</b><small>${cthuluSeen
    ? 'Cthulhu\'s pet. A green octopus head with two wings on top, a beard of tentacles, and arms long enough to reach a boat from under the water. It sleeps in a sunken city in a far corner of the deep and snores. Sail by fast or close and it wakes, and a tentacle comes up wherever the water boils. Go slowly and it dreams on.'
    : 'Not seen yet. Something sleeps in a sunken city, far out in the deep. Go quietly.'}</small><div class="facts"><span>A corner of the deep</span><span>Asleep, mostly</span><span>${beastFact('cthulu')}</span></div></article>`);
  pages.push(`<article class="page${anglerSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${anglerSeen ? 'Anglerfish' : '?'}</b><small>${anglerSeen
    ? 'A light in the deep at night, with what look like glowing fish around it. There are no glowing fish in the deep. Make for the light and its jaws open under you: turn away. Caught, it swallows the boat whole and spits it out in the home shallows, without your catch.'
    : 'Not seen yet. Something out in the deep fishes for boats at night.'}</small><div class="facts"><span>The deep</span><span>Night only</span><span>${beastFact('angler')}</span></div></article>`);
  pages.push(`<article class="page${towerTaken ? ' gold' : ' unk'}">${LEV_SVG}<b>${towerTaken ? 'Leviathan sorcerer' : '?'}</b><small>${towerTaken
    ? 'It lived at the top of island 2\'s tower: a serpent\'s finned tail, wings and a bird\'s head. It flies round the roof throwing purple bolts at where you stand, and swoops in to peck, which is when your spear can reach it. Hurt, it gets angry and throws three at a time. The tower is yours now, and flies your flag.' + (isle3Stage >= 1 ? ' It came back on island 3\'s tower with a new trick, a ring of bolts, and lost again.' : '')
      + (isle7Stage >= 1 ? ' And a third time on island 7\'s, twice as tough and calling monkeys up onto the roof. It lost again, and as it fell the alien portal below woke up.' : '')
    : 'Not met yet. Something at the top of island 2\'s tower shows a purple light at night. Two floors of monkeys stand in the way.'}</small><div class="facts"><span>Island 2's tower</span><span>Eight spear hits</span><span>${towerTaken ? 'Taken' : 'Not taken'}</span></div></article>`);
  pages.push(`<article class="page${isle3Stage >= 2 ? ' gold' : ' unk'}">${LEV_SVG}<b>${isle3Stage >= 2 ? 'The swordsman' : '?'}</b><small>${isle3Stage >= 2
    ? 'The real boss of island 3, in the hall at the foot of its tower under the sea: a man in a long red cape with a sword, nearly as quick as you. When his sword goes up, step aside, and throw while he gets his breath. Keep away and he dashes at where you are going. He blocks one spear, once. Beaten, he healed you, dropped a key, and opened the floor.'
    : 'Not met yet. Something is down there, under island 3\'s tower. You would need scuba gear.'}</small><div class="facts"><span>Under island 3's tower</span><span>Blocks once</span><span>${isle3Stage >= 2 ? 'Beaten' : 'Not beaten'}</span></div></article>`);
  pages.push(`<article class="page${isle3Stage >= 3 ? ' gold' : ' unk'}">${LEV_SVG}<b>${isle3Stage >= 3 ? 'The three demons' : '?'}</b><small>${isle3Stage >= 3
    ? 'What the swordsman became, in the demon dimension: three little demons. The red one slashes like he did and blocks once; the blue one keeps away and calls up two skull-mask monkeys at a time; the green one does both. They kept the warlock in a cage, and the swordsman\'s key opened it.'
    : 'Not met yet.'}</small><div class="facts"><span>The demon dimension</span><span>Red, blue, green</span><span>${isle3Stage >= 3 ? 'Warlock freed' : 'Not beaten'}</span></div></article>`);
  pages.push(`<article class="page${isle3Stage >= 4 ? ' gold' : ' unk'}">${LEV_SVG}<b>${isle3Stage >= 4 ? 'Tar monster' : '?'}</b><small>${isle3Stage >= 4
    ? 'An evil monkey called it up out of the sea round island 4: a great dome of tar with glowing yellow eyes and dripping arms. The water round it went black and the island turned to tar. No boat can go into the black water, but you can, in a chemistry suit.'
      + (isle4Stage >= 1 ? ' Set foot on its sand and it rose with an anchor on a chain: the Tar Anchorer. It threw the anchor where you were going and swung it round itself. You beat it, it melted, and a tarbaby climbed out of what was left.' : '')
    : 'Not seen yet.'}</small><div class="facts"><span>Island 4</span><span>${isle4Stage >= 1 ? 'The Tar Anchorer' : 'Black water'}</span><span>${isle4Stage >= 1 ? 'Beaten: a tarbaby' : gear.suit ? 'Suit bought' : 'Suit: the shipwright'}</span></div></article>`);
  pages.push(`<article class="page${isle5Seen ? ' gold' : ' unk'}">${LEV_SVG}<b>${isle5Seen ? 'The Skeleton Shark King' : '?'}</b><small>${isle5Seen
    ? 'King of all the sharks, and nothing left of him but bones, a crown and a trident. He rules the reef of bones out in the far deep. His fin stalks your boat; when the water churns, a line shows where he will charge, so turn off it. Then he leaps clean out of the water, which is when the harpoon reaches him. He throws his trident too: steer out of the gold ring.'
      + (isle5Stage >= 1 ? ' You beat him. Dying, he said he knew of a portal to another world, and died before he could say where.' : '')
    : 'Not seen yet. Something rules a reef out in the far deep.'}</small><div class="facts"><span>Island 5</span><span>${KING_RESOLVE} harpoon hits</span><span>${isle5Stage >= 1 ? 'Dead' : 'Not beaten'}</span></div></article>`);
  pages.push(`<article class="page${isle6Stage >= 1 ? ' gold' : ' unk'}">${LEV_SVG}<b>${isle6Stage >= 1 ? 'The Deep One' : '?'}</b><small>${isle6Stage >= 1
    ? 'Island 6\'s leviathan, huge and slow, asleep in the sea off the temple. One tentacle grabs and squeezes the boat until you harpoon it loose; two throw driftwood into rings where you are going; its eye opens every few seconds, and that is where the harpoon hurts it. Beaten, it does not die: it drags you under to its temple, where it waits as Cthulhu, sending up tentacles faster than you can run, one spear each.'
      + ' Its pet is the Cthuluviathan, asleep in a sunken city in the deep near home.'
      + (isle6Stage >= 2 ? ' You beat it there too, and it left a rare fish behind.' : ' The temple\'s door on island 6 is the way back down.')
    : 'Not met yet. Something sleeps off the temple on the big island.'}</small><div class="facts"><span>Island 6</span><span>${DEEP_RESOLVE} harpoon hits, then 10 spears</span><span>${isle6Stage >= 2 ? 'Beaten' : isle6Stage >= 1 ? 'Waiting below' : 'Not beaten'}</span></div></article>`);
  pages.push(`<article class="page${isle7Stage >= 2 ? ' gold' : ' unk'}">${LEV_SVG}<b>${isle7Stage >= 2 ? 'The undead of Gigantis' : '?'}</b><small>${isle7Stage >= 2
    ? 'The castle through island 7\'s portal is full of them. Skeletons with a sword and a little shield that takes one spear; archers that shoot where you are going, so turn when one looses; slow, tough zombies; ghosts whose wisps drift after you, slower than a walk; and necromancers that raise skeletons from the floor. Your spear goes for the necromancers first.'
    : 'Not met yet. Through the portal on island 7, once it is awake.'}</small><div class="facts"><span>Gigantis</span><span>A heart a hit</span><span>${isle7Stage >= 2 ? 'Beaten' : isle7Stage >= 1 ? 'Waiting' : 'Not met'}</span></div></article>`);
  pages.push(`<article class="page${isle7Stage >= 2 ? ' gold' : ' unk'}">${LEV_SVG}<b>${isle7Stage >= 2 ? 'The Forgotten One' : '?'}</b><small>${isle7Stage >= 2
    ? 'The king of Gigantis, with long black hair, a pale face screaming and a black cloak, in his throne room behind three necromancers. He flings blue skulls trailing purple fire in a fan, swings a great sword when you are close, and shows a thin orange line before his death ray burns along it: step off the line. Beaten, he fell apart, and his bones got up on your side: they come with you now, hitting for two and raising a ghost and a skeleton to fight for you. The warlock called merlocks out of a puddle of sea to help.'
      + (isle7Stage >= 3 ? ' Behind his throne, through the door his bones unlocked, are the ruins.' : ' Behind his throne is a locked door, and his bones know where the key is.')
    : 'Not met yet. Something sits on a throne in Gigantis.'}</small><div class="facts"><span>Gigantis</span><span>${FORGOTTEN_HP} to beat</span><span>${isle7Stage >= 2 ? 'Beaten' : 'Not beaten'}</span></div></article>`);
  pages.push(`<article class="page${masks ? ' gold' : ' unk'}">${LEV_SVG}<b>${masks ? 'Skull-mask monkeys' : '?'}</b><small>${masks
    ? 'A camp of monkeys in little skull masks on the far side of island 2. They run at you to bonk you, and two of them throw coconuts: keep moving, step out from under the shadow, and throw your spear. Beaten, a monkey drops its mask and runs off. Beat the whole camp and its chest opens.'
    : 'Not met yet. Something lives in the huts on the far side of island 2. Take a spear.'}</small><div class="facts"><span>Island 2</span><span>Three hearts ashore</span><span>${masks} masks</span></div></article>`);
  pages.push(`<article class="page${gulperSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${gulperSeen ? 'Gulper' : '?'}</b><small>${gulperSeen
    ? 'A giant gulper eel, black as the deep, with a mouth like a pelican\'s and a pink light at the tip of its tail. It hunts the east side of the deep. Each bite takes a third of the boat\'s health; three and it eats the boat, which it spits out at home without the catch. It is slower than a flagship flat out: run, and turn hard when it closes.'
    : 'Not seen yet. Something with an enormous mouth hunts the east side of the deep. Watch for a pink light.'}</small><div class="facts"><span>East side of the deep</span><span>Day and night</span><span>${beastFact('gulper')}</span></div></article>`);
  pages.push(`<article class="page${snook.landed ? ' gold' : ' unk'}">${FISH_SVG(snook.landed ? '#C9D3D6' : 'currentColor')}<b>${snook.landed ? 'Snook' : '?'}</b><small>${snook.landed
    ? 'Silver, with a black line down its side and yellow fins. It holds in the shadow of the far abutment and runs for the piling the moment it feels the hook. Most of them get there.'
    : 'Not landed yet. Something big holds in the shadow of the bridge when the light goes. A net will not take it.'}</small><div class="facts"><span>By line only: tie up south of the bridge and cast, ${TOLL} coins</span><span>Dusk, night and dawn</span>`
    + `<span>${snook.casts} casts. Landed ${snook.landed}, kept ${snook.kept}${snook.best ? ', best ' + snook.best + ' inches' : ''}${snook.firstDay ? ', first on day ' + snook.firstDay : ''}</span></div></article>`);
  if (snook.giant) pages.push(`<article class="page gold">${FISH_SVG('#F0C544')}<b>Grampy's Snook</b><small>Over forty inches, which is over the slot, so back she went. The photo is on the wall.</small><div class="facts"><span>Landed ${snook.giant}</span><span>One keeper in five, they say</span></div></article>`);
  $('pages').innerHTML = pages.join('');
}
function openGuide(){ audio(); sfx.click(); renderGuide(); elGuide.hidden = false; }
function closeGuide(){ elGuide.hidden = true; sfx.click(); }
$('guideBtn').addEventListener('click', openGuide);
// The flag designer: a colour, a pattern, a second colour and an emblem. Every tap flies it at once.
const elFlagger = $('flagger');
function swatchRow(sel){ return FLAG_COLORS.map((c,i) => `<button class="sw${i===sel?' sel':''}" data-i="${i}" aria-label="${FLAG_COLOR_NAMES[i]}" style="background:${c};border-color:${i===2?'#C9B98F':'#FFF6E5'}"></button>`).join(''); }
function renderFlagger(){ const f = flag || START_FLAG;
  $('flagBig').innerHTML = flagSvg(f, 150, 100);
  $('fField').innerHTML = swatchRow(f.field); $('fAccent').innerHTML = swatchRow(f.accent);
  $('fPattern').innerHTML = PATTERNS.map((p,i) => `<button class="fchip${i===f.pattern?' sel':''}" data-i="${i}" aria-label="${p}">${flagSvg({...f, pattern:i, emblem:0}, 42, 28)}</button>`).join('');
  $('fEmblem').innerHTML = EMBLEMS.map((e,i) => `<button class="fchip${i===f.emblem?' sel':''}" data-i="${i}" aria-label="${e}">${flagSvg({...f, emblem:i}, 42, 28)}</button>`).join(''); }
function setFlag(k, i){ flag = {...(flag || START_FLAG), [k]: i}; audio(); sfx.click(); renderFlagger(); refreshShop(); save(); }
for (const [id, k] of [['fField','field'], ['fAccent','accent'], ['fPattern','pattern'], ['fEmblem','emblem']])
  $(id).addEventListener('click', e => { const b = e.target.closest('button'); if (b) setFlag(k, +b.dataset.i); });
function openFlagger(){ audio(); sfx.click(); if (!flag){ flag = {...START_FLAG}; save(); refreshShop(); } renderFlagger(); elFlagger.hidden = false; }
function closeFlagger(){ elFlagger.hidden = true; sfx.click(); }
$('flagBtn').addEventListener('click', openFlagger);
$('flagDone').addEventListener('click', closeFlagger);
$('flagClose').addEventListener('click', closeFlagger);
$('log').addEventListener('click', openGuide);
$('guideClose').addEventListener('click', closeGuide);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !elGuide.hidden) closeGuide(); if (e.key === 'Escape' && !elFlagger.hidden) closeFlagger(); });
let rstTimer = 0;
elRst.addEventListener('click', () => {
  if (!elRst.classList.contains('sure')){
    elRst.classList.add('sure'); elRst.textContent = 'Start over?';
    rstTimer = setTimeout(() => { elRst.classList.remove('sure'); elRst.textContent = '↻'; }, 3000); return;
  }
  clearTimeout(rstTimer); elRst.classList.remove('sure'); elRst.textContent = '↻';
  coins = 0; earned = 0; lv.net = lv.hold = lv.engine = 0; hold.fill(0); holdTotal = 0; log.fill(0); paint = 0; net.torn = 0;
  order = {sp:0, n:8, have:0, pay:15}; drawOrder(); market = NO_PICK; refreshMarket(); day = 1; first.fill(0);
  sharksEntity.reset();
  boat.x = DOCK.x+125; boat.y = IY+125; boat.h = .45; boat.v = 0; resetNet();
  wood = 0; build = 0; carry = 0; hudWood(); levSeen = false; whaleSeen = false; mantaSeen = false; cthuluSeen = false; anglerSeen = false; petted = false; isle2Seen = false; isle3Seen = false; isle3Stage = 0; isle4Stage = 0; isle5Seen = false; isle5Stage = 0; isle6Seen = false; chests6 = 0; isle6Stage = 0; isle7Seen = false; isle7Stage = 0; portalOpen = 0; deep.state = 'sleep'; deep.reset(); cth.state = 'wait'; cth.reset(); king.state = 'wait'; king.reset(); anchorer.state = 'lurk'; anchorer.reset(); flag = null; gulperSeen = false; spear = 0; masks = 0; towerTaken = false; turtleSeen = false; turtleSwims = 0; Object.assign(driven, noDriven()); harpoonAt = 0; leaveTower(false); monkeys.reset(); monkeys7.reset(); hearts = HEARTS; shallows.reset(); hp = HP_MAX; swallowT = 0; pets.hint = true; Object.assign(gear, noGear()); Object.assign(snook, {casts:0, landed:0, kept:0, giant:0, best:0, firstDay:0}); fight = null; rareEntity.reset(); jellies.reset(); pets.reset(); clock = .13;
  pirateEntity.reset(); walker.reset();
  resetSchools(schools);
  save(); hud(); refreshShop(); toast('Started over.', 1400);
});
$('go').addEventListener('click', () => { audio(); started = true; $('intro').classList.add('gone'); sfx.castOff(); });
sndLabel(); hud(); hudWood(); hudPhase(); refreshShop(); drawOrder();
// A fishmonger who is open but has never asked picks now, rather than making a loaded save wait for dawn.
if (vendorsOpen(build).fishmonger && market === NO_PICK){ newMarket(); toast(`The fishmonger wants ${SPECIES[market].pl} today. Double pay.`, 3200); }
keysLabel();

/* ---------- game logic ---------- */
function addText(x,y,z,txt,color,size=18,life=1.2){ texts.push({x,y,z,txt,color,size,age:0,life}); }

function catchFish(f,sc){
  f.alive = false; f.resp = T + 8 + Math.random()*9 + sc.sp*1.5; sc.alive--;
  hold[sc.sp]++; holdTotal++; log[sc.sp]++; noteFirst(sc.sp);
  flies.push({x0:f.x, y0:f.y, z0:0, to:'boat', t:0, dur:.32, c:SPECIES[sc.sp].c, s:SPECIES[sc.sp].s});
  combo = comboT > 0 ? Math.min(combo+1, 14) : 0; comboT = .5;
  sfx.fish(combo, sc.sp);
  if (holdTotal >= HOLD[lv.hold]){ toast('Hold full. Head for the dock.'); sfx.holdFull(); }
  hud();
}
function sellOne(){
  let sp = hold.findIndex(n => n > 0); if (sp < 0) return;
  hold[sp]--; holdTotal--;
  carry += salePrice(SPECIES[sp].v, build, sp, market); const v = Math.floor(carry); carry -= v;
  coins += v; earned += v; saleSum += v; saleN++;
  const to = buyer(build, sp, market);
  flies.push({x0:boat.x, y0:boat.y, z0:12, to: dockHere === ISLE2_DOCK ? 'post' : dockHere === ISLE3_DOCK ? 'trader' : dockHere === ISLE6_DOCK ? 'post6' : dockHere === ISLE7_DOCK ? 'post7' : to === 'fishmonger' ? 'stall' : to === 'smokehouse' ? 'smoke' : 'crate', t:0, dur: to === 'dock' ? .3 : .45, c:SPECIES[sp].c, s:SPECIES[sp].s});
  sfx.sale(saleN, sp);
  if (sp === order.sp){ order.have++;
    if (order.have >= order.n){ coins += order.pay; earned += order.pay;
      addText(saleSpot().x, saleSpot().y, 70, 'Order filled +' + order.pay, '#9CF0C0', 20, 2.2);
      sfx.orderFilled();
      newOrder(); } else drawOrder(); }
  hud(); refreshShop();
}
function finishSale(){
  addText(saleSpot().x, saleSpot().y, 40, '+' + saleSum, C.coin, 26, 1.6);
  sfx.sold();
  saleSum = 0; saleN = 0; save();
  if (earned >= PIRATE_UNLOCK && pirate.state === 'away' && !pirate.warned){
    pirate.warned = 1; setTimeout(() => toast('Word is out about your catch. Pirates are about.', 3400, 1), 1700);
  }
}
function spill(n){ let lost = 0; for (let sp=0; sp<SPECIES.length && n>0; sp++){ const k = Math.min(hold[sp], n); hold[sp] -= k; holdTotal -= k; n -= k; lost += k; } return lost; }
function updateClock(dt){
  if (started) clock = advanceClock(clock, dt, DAY_LEN);
  { const d = dayState(clock); phase = d.phase; dark = d.dark; warm = d.warm; }
  if (phase !== lastPhase){ lastPhase = phase; hudPhase();
    if (phase === 'Dawn'){ day++; if (vendorsOpen(build).fishmonger){ newMarket(); toast(`The fishmonger wants ${SPECIES[market].pl} today. Double pay.`, 3200); } rareEntity.spawn(10, world); toast('Dawn. Something is sparkling out on the water.', 3200); }
    else if (phase === 'Dusk'){ rareEntity.spawn(11, world); toast('Dusk. Something is sparkling out on the water.', 3200); }
    else if (phase === 'Night') toast('Night. Glowing fish are rising.', 2600);
    if (phase !== 'Day'){ sfx.phaseChange(); } }
}
const sparks = [];
function emitWake(s,k){
  if (s.v < 25) return;
  const c = Math.cos(s.h), sn = Math.sin(s.h);
  for (const side of [-1,1]){
    wakes.push({x: s.x - c*26*k - sn*side*8*k, y: s.y - sn*26*k + c*side*8*k,
      vx: -sn*side*16, vy: c*side*16, age:0, life: 1.1 + s.v/300});
  }
  if (wakes.length > 260) wakes.splice(0, wakes.length-260);
}

function updateAmbience(dt){
  if (!ambience){ const ctx = getContext(); if (!ctx) return; ambience = new Ambience(ctx, ctx.destination); setCueListener(() => ambience.duck()); }
  const toIsland = Math.min(Math.hypot(boat.x-IX, boat.y-IY) - IR, Math.hypot(boat.x-ISLE2.x, boat.y-ISLE2.y) - ISLE2.r, Math.hypot(boat.x-MAT.x, boat.y-MAT.y) - MAT.r);
  let toPier = Infinity; for (const b of PIER_BUMPS) toPier = Math.min(toPier, Math.hypot(boat.x-b[0], boat.y-b[1]) - 30);
  const gulls = [];
  boatGulls.forEach(g => { if (g.a > .5) gulls.push({dx: g.x-boat.x, dy: g.y-boat.y}); });
  for (const sc of schools) if (sc.alive > 0 && onScreen(sc.cx, sc.cy, 0)) gulls.push({dx: sc.cx-boat.x, dy: sc.cy-boat.y});
  ambience.update(dt, {
    on: started && !muted, t: T, speedRatio: boat.v/SPEED[lv.engine], dockness: dockView, dark, phase,
    deepness: clamp(Math.max(-boat.x, boat.x-WS, -boat.y, boat.y-WS)/400, 0, 1),
    shoreDist: Math.max(0, Math.min(toIsland, toPier)), gulls,
    pods: dolphins.pods.map(p => ({dx: p.x-boat.x, dy: p.y-boat.y, dist: Math.hypot(p.x-boat.x, p.y-boat.y), escort: p.state === 'escort'})),
    whales: whales.all.map(w => ({dx: w.x-boat.x, dy: w.y-boat.y, dist: Math.hypot(w.x-boat.x, w.y-boat.y)})),
    sinceWhistle: T - lastWhistleT,
  });
}
/* ---------- the line: casting for the snook from a boat tied up south of the bridge ---------- */
function canCast(){
  if (!started || docked || fight || !snookHome(phase) || boat.v > CAST_SPEED) return false;
  const dx = boat.x-SNOOK_SPOT[0], dy = boat.y-SNOOK_SPOT[1];
  return Math.hypot(dx,dy) < CAST_RANGE && dx*BRIDGE_SOUTH[0] + dy*BRIDGE_SOUTH[1] > 20;
}
// Where the hooked fish is: on the line from the abutment to the boat, as far out as it has been let run,
// swinging a little as it fights. Never under the hull, where the tell and the run could not be seen.
function fishAt(){ const sway = Math.sin(T*3.1)*10*(fight.running ? 1 : .4);
  const ox = boat.x-SNOOK_SPOT[0], oy = boat.y-SNOOK_SPOT[1], L = Math.hypot(ox, oy) || 1, ux = ox/L, uy = oy/L;
  const d = Math.max(0, L-34)*Math.max(0, fight.d)/MAX_DISTANCE;
  return [SNOOK_SPOT[0] + ux*d - uy*sway, SNOOK_SPOT[1] + uy*d + ux*sway]; }
function landSnook(f){
  snook.landed++; snook.best = Math.max(snook.best, f.inches); if (!snook.firstDay) snook.firstDay = day;
  const at = fishAt();
  if (f.kind === 'short'){ toast(`A snook, ${f.inches} inches. Too short to keep. Back it goes.`, 3800, 1);
    addText(at[0], at[1], 30, `${f.inches} in. Released`, '#CFE3EE', 20, 2.2); sfx.snookLanded(false); }
  else { shake = .5;
    for (let i=0;i<18;i++) sparks.push({x:boat.x, y:boat.y, vx:(Math.random()-.5)*180, vy:(Math.random()-.5)*180, z:12, vz:50+Math.random()*70, age:0, life:1+Math.random()*.7});
    if (f.kind === 'giant'){ snook.giant++; toast(`Grampy's Snook. ${f.inches} inches. Too big to keep, so back she goes, after the photo.`, 5600, 2);
      addText(boat.x, boat.y, 50, "Grampy's Snook!", '#FFF3C4', 26, 3.2); }
    else { snook.kept++; toast(`A snook, ${f.inches} inches. Big enough to keep. It goes up on the wall.`, 4600, 2);
      addText(boat.x, boat.y, 50, 'Snook!', '#FFF3C4', 26, 3); }
    sfx.snookLanded(true); }
  save(); refreshShop();
}
function updateFishing(dt){
  const show = canCast(); if (show !== castShown){ castShown = show; $('cast').hidden = !show; }
  // A net towed past the spot finds nothing: the snook slides under it, with a splash so you know it was there.
  slipT -= dt; slipShow += dt;
  if (started && !fight && snookHome(phase) && slipT <= 0 && net.speed > 22 && Math.hypot(net.x-SNOOK_SPOT[0], net.y-SNOOK_SPOT[1]) < NETW[lv.net]*.5 + 24){
    slipT = 45; slipShow = 0; toast('Something big slid under the net by the bridge.', 3200); }
  if (!fight) return;
  // A thumb on the rod is down or up: any press pulls in full, however far it drags. A short drag used to
  // pull at a third and lose every fish to the piling. The keys are the same, any held key pulls.
  const v = keyVector(keys);
  pullSmooth = smoothPull(pullSmooth, joy.on ? 1 : Math.hypot(v[0], v[1]), dt);
  const was = fight.state, told = fight.telling; fight.update(dt, pullSmooth, Math.random);
  if (was === 'waiting' && fight.state === 'fight'){ sfx.strike(); shake = .35; toast('Fish on. Hold to pull while it sulks. Let go when it shakes its head.', 3600, 2); }
  if (!told && fight.telling) sfx.headShake();
  if (fight.state === 'landed'){ const f = fight; landSnook(f); fight = null; }
  else if (fight.state === 'lost' || docked){ const at = fishAt(); sfx.lineSnap(); shake = .4;
    addText(at[0], at[1], 30, fight.lostWords, '#FF9A8A', 19, 2);
    toast(MISS_LINE, 3600, 1); fight = null; save(); }
}
function cast(){
  audio(); if (!canCast()) return;
  if (coins < TOLL){ sfx.denied(); toast(`A cast costs ${TOLL} coins.`, 1800); return; }
  coins -= TOLL; snook.casts++; pullSmooth = 0; fight = new Fight(Math.random, window.__npCastAs); sfx.cast(); hud(); save();
}
$('cast').addEventListener('click', cast);
const elAshore = $('ashore'), elAboard = $('aboard'); let shopOpen = false, aboardShown = false;
let dockHere = HOME_DOCK; // the dock the boat is in, or was in last
const POST_MID = {x: (POST.x0+POST.x1)/2, y: (POST.y0+POST.y1)/2};
function saleSpot(){ return dockHere === ISLE2_DOCK ? POST_MID : dockHere === ISLE3_DOCK ? TRADER_MID : dockHere === ISLE6_DOCK ? POST6_MID : dockHere === ISLE7_DOCK ? POST7_MID : CRATE; }
elAshore.addEventListener('click', () => { audio(); if (walker.stepAshore(dockHere)) toasts.clear(); });
elAboard.addEventListener('click', () => { audio(); walker.goAboard(); });
const elThrow = $('throw'); let throwShown = null, throwWait = false;
const elClimb = $('climb'), elLeave = $('leave'); let climbShown = null, leaveShown = null;
elClimb.addEventListener('click', () => { audio(); const a = climbAction();
  if (a === 'tar'){ if (walker.stepAshore(tarDock(Math.atan2(boat.y - ISLE4.y, boat.x - ISLE4.x)))) toasts.clear(); return; }
  if (a === 'temple'){ intoTemple(); return; }
  if (a === 'castle'){ intoCastle(); return; }
  if (a === 'door') enterTower(TOWER_AT.find(t => t.dock === walker.dock));
  else if (a === 'dive') dive(); else if (a === 'portal') intoDemons();
  else if (a === 'stairs' || a === 'onward'){ toRoom(floor + 1); if (hearts < HEARTS){ hearts = HEARTS; hudHearts(); toast('You catch your breath on the stairs. Hearts full.', 2000); } } });
elLeave.addEventListener('click', () => { audio(); if (floor < 0) return;
  // Island 7's tower beaten: down the stairs and out at its door, to see the portal wake.
  if (towerWon && tower && tower.boss === boss7){ leaveTower(); return; }
  if (tower === CASTLE){ leaveTower(); sfx.portal(); toast('Back through the portal to island 7.', 2400, 1); return; }
  if (towerWon){ const depths = tower === DEPTHS, temple = tower === TEMPLE_DEEP; leaveTower(false); walker.knockOut(); toast(temple ? 'Back aboard. The Deep One is gone for good.' : depths ? 'Back aboard, and the warlock with you.' : 'Back aboard. The tower is yours.', 2400, 1); }
  else if (tower === DEPTHS){ leaveTower(); toast('Up through the gap in the seaweed.', 2200); }
  else if (tower === TEMPLE_DEEP){ leaveTower(); toast('Up out of the temple. It waits below.', 2200); }
  else { leaveTower(); toast('Out of the tower. Come back with more spears.', 2200); } });
elThrow.addEventListener('click', () => { audio(); if (walker.state === 'ashore') throwSpear(); else fireHarpoon(); });
window.addEventListener('keydown', e => { if (e.key !== ' ') return;
  if (walker.state === 'ashore'){ e.preventDefault(); throwSpear(); } else if (harpoonTarget()){ e.preventDefault(); fireHarpoon(); } });
// A tap, not a drag: ashore, a tap on the dog pats it, if the figure is near enough to reach.
let tapFrom = null;
cv.addEventListener('pointerdown', e => { tapFrom = {x: e.clientX, y: e.clientY, t: performance.now()}; });
cv.addEventListener('pointerup', e => { const q = tapFrom; tapFrom = null;
  if (!q || performance.now() - q.t > 350 || Math.hypot(e.clientX - q.x, e.clientY - q.y) > 12) return;
  if (walker.state === 'ashore' && spear > 0){ const sp = spearAt(spear);
    const f = shallows.fish.find(f => f.alive && Math.hypot(e.clientX - px(f.x, f.y), e.clientY - py(f.x, f.y)) < 30 && Math.hypot(f.x - walker.x, f.y - walker.y) <= sp.range);
    if (f){ throwSpear(f); return; } }
  { const c = catAt(); if (c && Math.hypot(e.clientX - c[0], e.clientY - c[1]) < 30){ tapCat(); return; } }
  const d = pets.dog; if (walker.state !== 'ashore' || !d) return;
  if (Math.hypot(e.clientX - px(d.x, d.y), e.clientY - py(d.x, d.y, d.z + 12)) > 36) return;
  if (Math.hypot(walker.x - d.x, walker.y - d.y) < PET_REACH) pets.pet(); else toast('Walk up to the dog to pet it.', 1800); });
// A silver fish with a black line down its side and yellow fins: the snook, at this screen point.
const SNOOK_LOOK = {c:'#C9D3D6', fat:.2, tail:.42};
function snookShape(x, y, len, ang, wag, alpha){
  const ca = Math.cos(ang), sa = Math.sin(ang); ctx.globalAlpha = alpha;
  ctx.fillStyle = '#E3C34A'; fishShape(x - ca*len*.12, y - sa*len*.12, len*.98, {fat:.12, tail:.46}, ang, wag);
  ctx.fillStyle = SNOOK_LOOK.c; ctx.beginPath(); ctx.ellipse(x, y, len, len*SNOOK_LOOK.fat, ang, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#15181A'; ctx.lineWidth = Math.max(1, len*.06); ctx.beginPath(); ctx.moveTo(x - ca*len*.8, y - sa*len*.8); ctx.lineTo(x + ca*len*.75, y + sa*len*.75); ctx.stroke();
  ctx.globalAlpha = 1;
}
// At home and unhooked: a long shadow finning in the abutment's shade, and the splash when a net goes over it.
function drawSnookShadow(){
  if (!snookHome(phase) || !onScreen(SNOOK_SPOT[0], SNOOK_SPOT[1], 80)) return;
  const x = px(SNOOK_SPOT[0], SNOOK_SPOT[1]), y = py(SNOOK_SPOT[0], SNOOK_SPOT[1]);
  if (!fight || fight.state === 'waiting'){ ctx.fillStyle = 'rgba(10,28,40,.45)'; ctx.globalAlpha = 1;
    const a = Math.PI*.92 + Math.sin(T*.6)*.12; fishShape(x, y, 17*Z, {fat:.2, tail:.42}, a, Math.sin(T*2.2)*.3); }
  if (slipShow < 1.2){ const t = slipShow/1.2; ctx.strokeStyle = C.foam; ctx.globalAlpha = .85*(1-t); ctx.lineWidth = 2.4*Z*(1-t) + .5;
    ctx.beginPath(); ctx.ellipse(x, y, (10+44*t)*Z, (5+20*t)*Z, 0, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; }
}
// The line, the float or the fish on the end of it, and the rod's tension over the boat.
function drawFishing(){
  if (!fight) return;
  const waiting = fight.state === 'waiting', at = waiting ? [SNOOK_SPOT[0] + BRIDGE_SOUTH[0]*22, SNOOK_SPOT[1] + BRIDGE_SOUTH[1]*22] : fishAt();
  const bx = px(boat.x, boat.y), by = py(boat.x, boat.y, 30*bk()), fx = px(at[0], at[1]), fy = py(at[0], at[1], 0);
  const sag = (waiting ? 26 : 34*(1 - fight.tension))*Z;
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2*Z; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx+fx)/2, (by+fy)/2 + sag, fx, fy); ctx.stroke();
  if (waiting){ const bob = Math.sin(T*4)*1.5*Z; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(fx, fy+bob, 3.4*Z, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = C.hull; ctx.beginPath(); ctx.arc(fx, fy+bob-1.6*Z, 3.4*Z, Math.PI, 0); ctx.fill(); return; }
  if (fight.running){ const t = (T*1.6)%1; ctx.strokeStyle = C.foam; ctx.globalAlpha = .8*(1-t); ctx.lineWidth = 2*Z;
    ctx.beginPath(); ctx.ellipse(fx, fy, (8+26*t)*Z, (4+12*t)*Z, 0, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; }
  // The tell: it shakes its head at the surface and throws spray, then runs.
  if (fight.telling){ ctx.fillStyle = C.foam;
    for (let i=0;i<9;i++){ const ph = (T*3.2 + i/9)%1, a = i*2.4; ctx.globalAlpha = .9*(1-ph);
      ctx.beginPath(); ctx.arc(fx + Math.cos(a)*22*ph*Z, fy + Math.sin(a)*9*ph*Z - Math.sin(Math.PI*ph)*16*Z, 2.2*Z, 0, Math.PI*2); ctx.fill(); }
    const t = (T*4)%1; ctx.strokeStyle = C.foam; ctx.globalAlpha = .9*(1-t); ctx.lineWidth = 2.6*Z;
    ctx.beginPath(); ctx.ellipse(fx, fy, (12+30*t)*Z, (6+14*t)*Z, 0, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; }
  // It faces the abutment when it runs, and is dragged round to face the boat when it sulks.
  const home = [SNOOK_SPOT[0]-at[0], SNOOK_SPOT[1]-at[1]], dirw = fight.running ? home : [-home[0], -home[1]];
  const ang = Math.atan2((dirw[0]+dirw[1])*.5, dirw[0]-dirw[1]) + (fight.telling ? Math.sin(T*30)*.6 : 0);
  snookShape(fx, fy, (fight.kind === 'giant' ? 27 : fight.kind === 'keeper' ? 21 : 17)*Z, ang, Math.sin(T*(fight.running || fight.telling ? 16 : 7))*.45, .95);
}
function drawTension(){
  if (!fight || fight.state !== 'fight') return;
  const x = px(boat.x, boat.y), y = py(boat.x, boat.y, 78*bk()), w = 84, h = 11, t = Math.min(1, fight.tension);
  ctx.fillStyle = 'rgba(18,48,58,.8)'; ctx.beginPath(); ctx.roundRect(x-w/2-3, y-h/2-3, w+6, h+6, 8); ctx.fill();
  ctx.fillStyle = t < .6 ? '#7BD389' : t < .85 ? C.coin : C.hull; ctx.beginPath(); ctx.roundRect(x-w/2, y-h/2, Math.max(h, w*t), h, 6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x-w/2 + w*.85, y-h/2-2, 2, h+4);
  // What the rod wants now, in the toast's words: the tell and the run both say let go.
  const ease = fight.running || fight.telling, word = ease ? 'Let go' : 'Hold';
  ctx.font = '800 15px Grandstander, ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.strokeText(word, x, y-h/2-15);
  ctx.fillStyle = ease ? C.coin : '#FFF6E5'; ctx.fillText(word, x, y-h/2-15);
}
// What has been landed hangs on the hut's front wall: a mount for the first keeper, a gilt photo for the giant.
function drawTrophies(){
  const wy = IY-70;
  if (snook.kept > 0){ box(IX+27, wy, 26, 1.6, 15, 29, '#5E3D1C', '#7A5230'); snookShape(px(IX+40, wy+1.7), py(IX+40, wy+1.7, 22), 8.5*Z, Math.PI*.04, 0, 1); }
  if (snook.giant > 0){ box(IX+56, wy, 20, 1.6, 13, 31, '#C9982A', '#F0C544'); box(IX+58, wy+.2, 16, 1.6, 15, 29, '#FFF6E5', '#FFF6E5');
    snookShape(px(IX+66, wy+1.9), py(IX+66, wy+1.9, 22), 6.2*Z, Math.PI*.04, 0, 1); }
}
function update(dt){
  T += dt; updateClock(dt);
  world.T = T; world.started = started; world.docked = docked || !walker.aboard; // tied up at the tar's edge too, with nobody aboard
  /* input and boat: the stick points; the keys drive or point, by setting */
  updateCine(dt);
  if (fight || swallowT > 0 || cine || kingDying() || deep.holding){ steerBoat(boat, 0, 0, SPEED[lv.engine], dt); }
  else if (!walker.aboard){ steerBoat(boat, 0, 0, SPEED[lv.engine], dt);
    // Ashore the stick walks, and the keys always point: driving a person by turning them reads as a tank.
    let ix = 0, iy = 0;
    if (joy.on){ const v = joystickVector(joy); ix = v[0]; iy = v[1]; }
    else { const v = keyVector(keys); smoothVector(keySmooth, v[0], v[1], dt); ix = keySmooth.x; iy = keySmooth.y; }
    walker.intent(ix, iy); }
  else if (started && !joy.on && keyMode === 'drive'){
    const c = keyControls(keys); steerBoatRelative(boat, c.turn, c.throttle, c.brake, SPEED[lv.engine], dt);
  } else {
    let ix = 0, iy = 0;
    if (started){
      if (joy.on){ const v = joystickVector(joy); ix = v[0]; iy = v[1]; }
      else { const v = keyVector(keys); smoothVector(keySmooth, v[0], v[1], dt); ix = keySmooth.x; iy = keySmooth.y; }
    }
    steerBoat(boat, ix, iy, SPEED[lv.engine], dt);
  }
  const k = bk();
  pushOut(boat, IX, IY, IR+24*k);
  for (const b of PIER_BUMPS) pushOut(boat, b[0], b[1], 20+20*k);
  for (const b of BRIDGE_BUMPS) pushOut(boat, b[0], b[1], 18+20*k);
  pushOut(boat, BEACH.x, BEACH.y, BEACH.r+24*k);
  pushOut(boat, ISLE2.x, ISLE2.y, ISLE2.r+24*k);
  pushOffTown(boat, 4+20*k);
  pushOut(boat, ISLE5.x, ISLE5.y, ISLE5.r+24*k);
  pushOffIsle6(boat, 24*k);
  pushOffIsle7(boat, 24*k);
  { const look = isle4Look(), r = Math.max(ISLE4.r, TAR_R*look.spread) + 24*k, d = Math.hypot(boat.x - ISLE4.x, boat.y - ISLE4.y); tarToastT -= dt;
    if (d < r){ pushOut(boat, ISLE4.x, ISLE4.y, r);
      if (look.spread >= 1 && tarToastT <= 0){ tarToastT = 9;
        toast(gear.suit ? 'Tar. No hull goes in, but you can: stop here and tap Into the tar.' : 'Tar! The water round island 4 is black and sticky. You need a chemistry suit: the shipwright sells one.', 3200, 1); } } }
  // The buoys hold every boat but the flagship, which goes on into the deep as far as the deep runs, and on into the far
  // deep once the anchor chain between the far buoys is gone.
  { const flag = tier() === TIER_NAME.length-1, m = seaEdge(flag, farOpen()), x0 = boat.x, y0 = boat.y;
    boat.x = clamp(boat.x, 40-m, WS-40+m); boat.y = clamp(boat.y, 40-m, WS-40+m);
    if ((boat.x !== x0 || boat.y !== y0) && rangeToastT <= 0){ rangeToastT = 9;
      toast(!m ? 'Only a flagship can cross the buoys.' : m > DEEP ? 'Nothing out here but water. For now.'
        : isle3Stage >= 4 ? 'An anchor chain runs between the far buoys, and nothing gets past it. Whatever holds the anchor is on the tar island.'
        : 'An anchor chain runs between the far buoys, and nothing gets past it. For now.', 3400, 1); sfx.rangeEdge(); } }
  { const far = pastFar(boat.x, boat.y); farToastT -= dt;
    if (far && !wasFar && farToastT <= 0){ farToastT = 60; toast(isle5Seen ? 'Past the far buoys, into the far deep. Marlin school at its corners.' : 'Past the far buoys, into the far deep. An island of bones is out here: follow the white marker. Marlin school at its corners.', 3600, 1); }
    wasFar = far; }
  { const deep = pastBuoys(boat.x, boat.y); deepToastT -= dt;
    if (deep && !wasDeep && deepToastT <= 0){ deepToastT = 60; toast(!isle2Seen ? 'Past the buoys, into the deep. There is land out here: follow the green marker.' : !isle3Seen ? 'Past the buoys, into the deep. Another island is out here: follow the blue marker, up to the top of the map.' : 'Past the buoys, into the deep. Mahi-mahi school under the floating weed.', 3400, 1); }
    wasDeep = deep; }
  if (!isle2Seen && Math.hypot(boat.x-ISLE2.x, boat.y-ISLE2.y) < ISLE2.r + 700){ isle2Seen = true; save(); refreshShop();
    toast('Land ho: island 2. Parrotfish school round it, and the trading post buys your catch.' + (spear ? '' : ' The shipwright has a spear for its shallows now.'), 4600, 1); sfx.tierUp(); }
  if (!isle6Seen && Math.hypot(boat.x-ISLE6.x, boat.y-ISLE6.y) < ISLE6.r + SIGHT6){ isle6Seen = true; save(); refreshShop(); sfx.tierUp(); toasts.clear();
    toast('Island 6: the big island! A pier with a trading post, a rocky hill, and an old green temple half in the sea on its east side. Something big sleeps by it...', 5600, 2); }
  if (!isle7Seen && Math.hypot(boat.x-ISLE7.x, boat.y-ISLE7.y) < ISLE7.r + SIGHT7){ isle7Seen = true; save(); refreshShop(); sfx.tierUp(); toasts.clear();
    toast('Island 7! Monkeys again, and a tower again, with a purple light at the top. And something strange: a ring of grey metal, standing on burnt grass.', 5600, 2); }
  if (!isle5Seen && Math.hypot(boat.x-ISLE5.x, boat.y-ISLE5.y) < SIGHT5){ isle5Seen = true; save(); refreshShop(); sfx.cthuluWake(); toasts.clear();
    toast('Island 5: a reef of bleached bones, with a throne under a giant shark\'s jaw. Bone sharks circle it. Something bigger is down there...', 5200, 2); }
  if (!isle3Seen && Math.hypot(boat.x-ISLE3.x, boat.y-ISLE3.y) < ISLE3.r + 700){ isle3Seen = true; save(); refreshShop();
    toast('Island 3 sank long ago: its old town lies under the water. Only its tower and a floating town are left up top. Grouper school over the ruins.', 5200, 1); sfx.tierUp(); }
  { const R = range(), dI = Math.hypot(boat.x-IX, boat.y-IY); rangeToastT -= dt;
    if (dI > R){ boat.x = IX + (boat.x-IX)/dI*R; boat.y = IY + (boat.y-IY)/dI*R; boat.v *= .93;
      if (rangeToastT <= 0){ rangeToastT = 9; toast(`Too rough out there for a ${TIER_NAME[tier()]}. Grow your boat to sail further.`, 2800, 1); sfx.rangeEdge(); } } }

  /* net tows behind like a trailer */
  towNet(net, boat, k, towLen(), dt);

  /* fish */
  const cap = HOLD[lv.hold], nw = NETW[lv.net];
  net.torn = Math.max(0, net.torn - dt);
  const catching = started && net.speed > 22 && net.torn <= 0;
  comboT -= dt;
  updateSchools(schools, {T, dt, dark, net, netWidth: nw, catching: catching && !jellies.inNet, zoom: Z, onScreen, hasRoom: () => holdTotal < cap}, catchFish);

  /* dock */
  const dk = dockAt(boat.x, boat.y), inDock = !!dk; if (dk) dockHere = dk;
  if (inDock !== docked){ docked = inDock; if (docked){ refreshShop(); toasts.clear(); renderToast(); if (net.torn > 0){ net.torn = 0; addText(boat.x, boat.y, 40, 'Net mended', '#9CF0C0', 17, 1.4); }
    if (jellies.inNet){ const n = jellies.shakeOut(); toast(n === 1 ? 'Shook a jellyfish out of the net.' : `Shook ${n} jellyfish out of the net.`, 2400); sfx.jelliesOut(); } } }
  // The shop is the dock while aboard; ashore it folds away so the stick has the screen.
  { const open = docked && walker.aboard && !cine && !kingDying(); if (open !== shopOpen){ shopOpen = open; if (open) refreshShop();
      elShop.classList.toggle('open', open); elShop.setAttribute('aria-hidden', String(!open)); elAshore.hidden = !open; } }
  if (swallowT > 0){ swallowT -= dt; boat.v = 0; if (swallowT <= 0) spitOut(); }
  irisT = Math.max(0, irisT - dt);
  if (swallowT <= 0){ hp = mend(hp, dt, !pastBuoys(boat.x, boat.y), docked); hudHull(); }
  if (docked && holdTotal > 0){
    sellT -= dt;
    while (sellT <= 0 && holdTotal > 0){ sellOne(); sellT += .045; }
    if (holdTotal === 0) finishSale();
  } else sellT = 0;

  dolphinToastT -= dt; dogToastT -= dt; scene.update(dt, world);
  if (walker.nearBoat !== aboardShown){ aboardShown = walker.nearBoat; elAboard.hidden = !aboardShown; }
  walker.armed = spear > 0;
  invulnT = Math.max(0, invulnT - dt); walker.blink = invulnT > 0; spotToldT -= dt;
  { const fighting = inFight(); heartT += dt;
    if (hearts < HEARTS && (!walker.shown || (!fighting && heartT > 6))){ hearts = walker.shown ? hearts + 1 : HEARTS; heartT = 0; }
    hudHearts(); }
  { const show = spearTarget() ? 'spear' : harpoonTarget() ? 'harpoon' : null;
    if (show !== throwShown){ throwShown = show; elThrow.hidden = !show; elThrow.classList.toggle('harpoon', show === 'harpoon');
      if (show) elThrow.setAttribute('aria-label', show === 'harpoon' ? 'Fire the harpoon' : 'Throw the spear'); }
    const wait = !!show && T < (show === 'harpoon' ? harpoonAt : reloadAt);
    if (wait !== throwWait){ throwWait = wait; elThrow.classList.toggle('wait', wait); } }
  { const a = climbAction(); if (a !== climbShown){ climbShown = a; elClimb.hidden = !a; if (a) elClimb.textContent = a === 'tar' ? 'Into the tar' : a === 'temple' ? 'Into the temple' : a === 'door' ? 'Climb the tower' : a === 'dive' ? 'Dive' : a === 'portal' || a === 'castle' ? 'Into the portal' : a === 'onward' ? 'Through the door' : tower && floor + 1 === tower.roof ? 'Up to the roof' : 'Climb the stairs'; } }
  { const l = floor >= 0 && walker.state === 'ashore' ? (tower === CASTLE ? 'home' : towerWon ? (tower && tower.boss === boss7 ? 'down' : 'jump') : tower === DEPTHS || tower === TEMPLE_DEEP ? 'swim' : 'leave') : null;
    if (l !== leaveShown){ leaveShown = l; elLeave.hidden = !l; if (l) elLeave.textContent = l === 'jump' ? 'Back to the boat' : l === 'down' ? 'Down to the portal' : l === 'home' ? 'Back through the portal' : l === 'swim' ? 'Swim up' : 'Leave the tower'; } }
  if (isle5Stage >= 1 && king.state !== 'dead' && king.state !== 'dying') king.dead();
  if (isle6Stage >= 1 && deep.state !== 'down' && deep.state !== 'drag') deep.down();
  updatePortal7(dt); updateCastle(dt);
  if (isle6Stage >= 2 && cth.state !== 'gone' && cth.state !== 'fall') cth.beaten();
  if (deep.up > .3 && deep.state !== 'down') pushOut(boat, deep.x, deep.y, DEEP_BODY + 24*bk());
  if (floor === TEMPLE6 && cth.state !== 'gone' && walker.state === 'ashore'){ const dx = walker.x - cth.x, dy = walker.y - cth.y, d = Math.hypot(dx, dy);
    if (d < CTH_R && d > 0) walkStep(walker, dx/d*(CTH_R - d), dy/d*(CTH_R - d), build); }
  jawsT -= dt; if (king.state === 'stalk' && jawsT <= 0){ sfx.jaws(); jawsT = king.angry ? .7 : 1.1; }
  openChests();
  cat.free = warrior.free = isle6Stage >= 2;
  bonesPal.free = isle7Stage >= 2 || bonesJoined;
  if (bonesPal.shown && !bonesTold){ bonesTold = true; toast('The Forgotten One\'s bones walk with you now. They hit for two, and raise a ghost and a skeleton to fight for you.', 4400, 1); }
  { const f = inFight(); if (f && !wasFight){ cat.newFight(); hudHearts(); } wasFight = f; }
  if (cat.shown && !palsTold){ palsTold = true; toast('The cat heals you, twice a fight: the pink crosses. Aboard at sea, tap it to feed it a fish from the hold for another heal.', 4400, 1); }
  tarbaby.free = isle4Stage >= 1; if (isle4Stage >= 1 && anchorer.state !== 'gone' && anchorer.state !== 'melt') anchorer.beaten();
  // Nothing walks through the tar monster.
  if (anchorer.state !== 'gone' && walker.state === 'ashore'){ const dx = walker.x - anchorer.x, dy = walker.y - anchorer.y, d = Math.hypot(dx, dy);
    if (d < BODY_R && d > 0) walkStep(walker, dx/d*(BODY_R - d), dy/d*(BODY_R - d), build); }
  warlock.free = isle3Stage >= 3; hurtWarlock(dt); wboat.free = warlock.free; wboat.crewed = !warlock.shown;
  if (wboat.free){ const wk = .85; pushOut(wboat, IX, IY, IR+24*wk); for (const b of PIER_BUMPS) pushOut(wboat, b[0], b[1], 20+20*wk);
    for (const b of BRIDGE_BUMPS) pushOut(wboat, b[0], b[1], 18+20*wk); pushOut(wboat, BEACH.x, BEACH.y, BEACH.r+24*wk);
    pushOut(wboat, ISLE2.x, ISLE2.y, ISLE2.r+24*wk); pushOut(wboat, ISLE5.x, ISLE5.y, ISLE5.r+24*wk); pushOffIsle6(wboat, 24*wk); pushOffIsle7(wboat, 24*wk); pushOffTown(wboat, 4+20*wk); pushOut(wboat, ISLE4.x, ISLE4.y, Math.max(ISLE4.r, TAR_R*isle4Look().spread) + 24*wk); pushOut(wboat, boat.x, boat.y, 36*k);
    wboat.x = clamp(wboat.x, 40-DEEP-FAR, WS-40+DEEP+FAR); wboat.y = clamp(wboat.y, 40-DEEP-FAR, WS-40+DEEP+FAR); }
  if (pullT > 0){ pullT -= dt; if (pullT <= 0 && floor === HALL) intoDemons(); }
  redFlash = Math.max(0, redFlash - dt*1.2); if (cageOpen > 0 && cageOpen < 1) cageOpen = Math.min(1, cageOpen + dt/1.2);
  { const near = walker.state === 'ashore' && walker.dock === ISLE3_DOCK && floor < 0 && isle3Stage < 1 && Math.hypot(walker.x - DIVE3.x, walker.y - DIVE3.y) < STEP;
    if (near && !gapTold){ gapTold = true; toast('A gap in the seaweed, and deep water under it. You would need scuba gear.', 3200, 1); } }
  updateFishing(dt);
  for (let i=sparks.length-1;i>=0;i--){ const q = sparks[i]; q.age += dt; q.x += q.vx*dt; q.y += q.vy*dt; q.z += q.vz*dt; q.vz -= 120*dt; if (q.age > q.life) sparks.splice(i,1); }
  Z += (Zbase*(1 - .02*tier())*(1 - .2*dockView)*(1 + WALK_ZOOM*walkView) - Z)*Math.min(1, dt*4);

  /* bits */
  wakeT -= dt;
  if (wakeT <= 0){ wakeT = .06; emitWake(boat,k); if (pirate.state !== 'away') emitWake(pirate,1.3); if (wboat.free && wboat.v > 25) emitWake(wboat,.85); }
  for (let i=wakes.length-1;i>=0;i--){ const w = wakes[i]; w.age += dt; w.x += w.vx*dt; w.y += w.vy*dt; if (w.age > w.life) wakes.splice(i,1); }
  for (let i=flies.length-1;i>=0;i--){ const f = flies[i]; f.t += dt/f.dur; if (f.t >= 1) flies.splice(i,1); }
  for (let i=texts.length-1;i>=0;i--){ const t = texts[i]; t.age += dt; if (t.age > t.life) texts.splice(i,1); }
  shake = Math.max(0, shake - dt*2.5);
  shx = (Math.random()-.5)*shake*14; shy = (Math.random()-.5)*shake*14;

  /* camera leads the boat a little */
  let lx = boat.x + Math.cos(boat.h)*boat.v*.3, ly = boat.y + Math.sin(boat.h)*boat.v*.3;
  dockView += ((docked && walker.aboard && boat.v < 70 ? 1 : 0) - dockView)*Math.min(1, dt*1.6);
  const w = .4*dockView, isle2 = dockHere === ISLE2_DOCK, isle3 = dockHere === ISLE3_DOCK, isle6 = dockHere === ISLE6_DOCK, isle7 = dockHere === ISLE7_DOCK;
  lx = lx*(1-w) + (isle2 ? ISLE2.x : isle3 ? ISLE3.x+110 : isle6 ? POST6_MID.x : isle7 ? ISLE7.x + 30 : TX)*w; ly = ly*(1-w) + (isle2 ? ISLE2.y : isle3 ? ISLE3.y+90 : isle6 ? POST6_MID.y + 60 : isle7 ? ISLE7.y - 120 : TY-30)*w;
  // Ashore the camera comes in close and follows the figure, leading it a little.
  walkView += ((walker.shown ? 1 : 0) - walkView)*Math.min(1, dt*2.2);
  lx += (walker.x + walker.vx*.3 - lx)*walkView; ly += (walker.y + walker.vy*.3 - ly)*walkView;
  if (cine){ const c = cineK(); lx = lx*(1-c) + (ISLE4.x - 70)*c; ly = ly*(1-c) + (ISLE4.y - 70)*c; }
  if (kingDying()){ const c = clamp(Math.min(king.t, 12 - king.t)/.8, 0, 1); lx = lx*(1-c) + king.x*c; ly = ly*(1-c) + king.y*c; }
  viewDY = -Math.min(150, H*.17)*dockView*(1 - cineK());
  cam.x += (lx-cam.x)*Math.min(1, dt*3.5); cam.y += (ly-cam.y)*Math.min(1, dt*3.5);
}

/* ---------- drawing ---------- */
// Past the buoys the water darkens in bands, like the depth rings inside them; past the last band the deep ends.
const DEEP_BANDS = [[DEEP + FAR, '#0F4150'], [DEEP + FAR*.5, '#114A58'], [DEEP, '#155565'], [DEEP*.62, '#185D6C'], [DEEP*.28, C.abyss]];
function square(m){ return [[-m,-m],[WS+m,-m],[WS+m,WS+m],[-m,WS+m]]; }
function drawSea(){
  ctx.fillStyle = '#0B3540'; ctx.fillRect(0,0,W,H);
  for (const [m, c] of DEEP_BANDS){ polyPath(square(m),0); ctx.fillStyle = c; ctx.fill(); }
  polyPath(square(0),0); ctx.fillStyle = C.lagoon; ctx.fill();
  ctx.save(); ctx.clip();
  isoEllipse(IX,IY,2250); ctx.fillStyle = '#30949F'; ctx.fill();
  isoEllipse(IX,IY,1600); ctx.fillStyle = C.mid; ctx.fill();
  isoEllipse(IX,IY,880);  ctx.fillStyle = C.shallow; ctx.fill();
  isoEllipse(IX,IY,IR+150); ctx.fillStyle = C.shore; ctx.fill();
  isoEllipse(BEACH.x,BEACH.y,BEACH.r+60); ctx.fillStyle = C.shore; ctx.fill();
  ctx.restore();
  // Island 2's shallows, out in the deep.
  if (onScreen(ISLE2.x, ISLE2.y, (ISLE2.r+340)*Z)){
    isoEllipse(ISLE2.x,ISLE2.y,ISLE2.r+330); ctx.fillStyle = '#20808B'; ctx.fill();
    isoEllipse(ISLE2.x,ISLE2.y,ISLE2.r+180); ctx.fillStyle = C.shallow; ctx.fill();
    isoEllipse(ISLE2.x,ISLE2.y,ISLE2.r+70); ctx.fillStyle = C.shore; ctx.fill(); }
  drawIsle3Sea(drawView);
  drawIsle4Sea(drawView, isle4Look());
  drawIsle5Sea(drawView);
  drawIsle6Sea(drawView);
  drawIsle7Sea(drawView);
  drawUnderwaterPlants(drawView);

  /* wave glints across the visible patch of world */
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const c of [[0,0],[W,0],[W,H],[0,H]]){
    const w = dirToWorld((c[0]-W/2)/Z, (c[1]-H/2)/Z); const wx = cam.x+w[0], wy = cam.y+w[1];
    x0 = Math.min(x0,wx); x1 = Math.max(x1,wx); y0 = Math.min(y0,wy); y1 = Math.max(y1,wy);
  }
  const G = 130; ctx.strokeStyle = C.foam; ctx.lineWidth = 2*Z; ctx.lineCap = 'round';
  for (let gx = Math.max(-DEEP-FAR,Math.floor(x0/G)*G); gx <= Math.min(WS+DEEP+FAR,x1); gx += G){
    for (let gy = Math.max(-DEEP-FAR,Math.floor(y0/G)*G); gy <= Math.min(WS+DEEP+FAR,y1); gy += G){
      const hsh = Math.sin(gx*12.9898+gy*78.233)*43758.5453, r = hsh - Math.floor(hsh);
      const wx = gx + r*90, wy = gy + ((r*7)%1)*90;
      if (Math.hypot(wx-IX, wy-IY) < IR+30 || Math.hypot(wx-ISLE2.x, wy-ISLE2.y) < ISLE2.r+30 || Math.hypot(wx-MAT.x, wy-MAT.y) < MAT.r+20 || onPlanks(wx, wy) || Math.hypot(wx-ISLE4.x, wy-ISLE4.y) < ISLE4.r+30 || Math.hypot(wx-ISLE5.x, wy-ISLE5.y) < ISLE5.r+30 || Math.hypot(wx-ISLE6.x, wy-ISLE6.y) < shore6(Math.atan2(wy-ISLE6.y, wx-ISLE6.x))+30 || Math.hypot(wx-ISLE7.x, wy-ISLE7.y) < ISLE7.r+30) continue;
      const sx = px(wx,wy), sy = py(wx,wy); if (sx<-40||sx>W+40||sy<-40||sy>H+40) continue;
      if (pastBuoys(wx, wy)){ // the deep's swell: bigger, slower, and every other one
        if (r > .5) continue;
        const ph = Math.sin(T*.6 + r*30); ctx.globalAlpha = .08 + .14*(ph*.5+.5); ctx.lineWidth = 2.6*Z;
        ctx.beginPath(); ctx.ellipse(sx + ph*9*Z, sy, 22*Z, 7*Z, 0, Math.PI*1.12, Math.PI*1.88); ctx.stroke(); ctx.lineWidth = 2*Z; continue; }
      const ph = Math.sin(T*1.1 + r*30);
      ctx.globalAlpha = .1 + .16*(ph*.5+.5);
      ctx.beginPath(); ctx.ellipse(sx + ph*5*Z, sy, 11*Z, 4*Z, 0, Math.PI*1.12, Math.PI*1.88); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  drawWeed();

  /* how far this boat can go */
  { const R = range(); if (R < 1e8){ const dI = Math.hypot(boat.x-IX, boat.y-IY), hot = dI > R-260;
    isoEllipse(IX,IY,R); ctx.setLineDash([16*Z,14*Z]); ctx.strokeStyle = hot ? '#FF9A8A' : C.foam; ctx.globalAlpha = hot ? .85 : .3; ctx.lineWidth = (hot?3:2)*Z; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; } }

  /* island, flat parts */
  isoEllipse(IX,IY,IR+9+Math.sin(T*1.3)*3); ctx.strokeStyle = C.foam; ctx.globalAlpha = .7; ctx.lineWidth = 4*Z; ctx.stroke(); ctx.globalAlpha = 1;
  isoEllipse(IX,IY,IR); ctx.fillStyle = C.sand; ctx.fill();
  isoEllipse(BEACH.x,BEACH.y,BEACH.r+7+Math.sin(T*1.3+2)*3); ctx.strokeStyle = C.foam; ctx.globalAlpha = .7; ctx.lineWidth = 4*Z; ctx.stroke(); ctx.globalAlpha = 1;
  isoEllipse(BEACH.x,BEACH.y,BEACH.r); ctx.fillStyle = C.sand; ctx.fill();
  isoEllipse(IX-25,IY-12,150); ctx.fillStyle = C.grass; ctx.fill();
  if (onScreen(ISLE2.x, ISLE2.y, (ISLE2.r+40)*Z)){
    isoEllipse(ISLE2.x,ISLE2.y,ISLE2.r+9+Math.sin(T*1.3+4)*3); ctx.strokeStyle = C.foam; ctx.globalAlpha = .7; ctx.lineWidth = 4*Z; ctx.stroke(); ctx.globalAlpha = 1;
    isoEllipse(ISLE2.x,ISLE2.y,ISLE2.r); ctx.fillStyle = C.sand; ctx.fill();
    isoEllipse(ISLE2.x-30,ISLE2.y+20,165); ctx.fillStyle = '#6FB062'; ctx.fill(); }
  drawIsle3Flat(drawView);
  drawIsle4Flat(drawView, isle4Look());
  drawIsle5Flat(drawView); drawBoneFins(drawView);
  drawIsle6Flat(drawView);
  drawIsle7Flat(drawView);
  drawGroundPlants(drawView);

  /* dock zone */
  if (isle3Seen || pastBuoys(boat.x, boat.y)){ isoEllipse(DOCK3.x,DOCK3.y,DOCK3.r);
    ctx.setLineDash([10*Z,9*Z]); ctx.lineDashOffset = holdTotal ? -T*26 : 0;
    ctx.strokeStyle = holdTotal ? C.coin : C.foam; ctx.globalAlpha = holdTotal ? .95 : .45; ctx.lineWidth = 3*Z; ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1; }
  if (isle7Seen && onScreen(DOCK7.x, DOCK7.y, 200*Z)){ isoEllipse(DOCK7.x,DOCK7.y,DOCK7.r);
    ctx.setLineDash([10*Z,9*Z]); ctx.lineDashOffset = holdTotal ? -T*26 : 0;
    ctx.strokeStyle = holdTotal ? C.coin : C.foam; ctx.globalAlpha = holdTotal ? .95 : .45; ctx.lineWidth = 3*Z; ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1; }
  if (isle2Seen || pastBuoys(boat.x, boat.y)){ isoEllipse(DOCK2.x,DOCK2.y,DOCK2.r);
    ctx.setLineDash([10*Z,9*Z]); ctx.lineDashOffset = holdTotal ? -T*26 : 0;
    ctx.strokeStyle = holdTotal ? C.coin : C.foam; ctx.globalAlpha = holdTotal ? .95 : .45; ctx.lineWidth = 3*Z; ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1; }
  isoEllipse(DOCK.x,DOCK.y,DOCK.r);
  ctx.setLineDash([10*Z,9*Z]); ctx.lineDashOffset = holdTotal ? -T*26 : 0;
  ctx.strokeStyle = holdTotal ? C.coin : C.foam; ctx.globalAlpha = holdTotal ? .95 : .45; ctx.lineWidth = 3*Z; ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}
// Floating weed over each school in the deep: mahi-mahi shelter under it, so it is how you find them.
function drawWeed(){
  for (let i=0;i<deepSchools.length;i++){ const sc = deepSchools[i]; if (!onScreen(sc.cx, sc.cy, 180)) continue;
    // A ragged line of small clumps along one flank of the school, drifting with it.
    const a = sc.p, ca = Math.cos(a), sa = Math.sin(a), side = sc.r*.7;
    for (let k=0;k<18;k++){ const t = (k-8.5)*17, n = side + Math.sin(k*2.3+i)*14 + Math.sin(k*.7)*10, bob = Math.sin(T*.8+k)*2.5;
      const x = sc.cx + ca*t - sa*n + bob, y = sc.cy + sa*t + ca*n;
      isoEllipse(x, y, 8 + (k*7+i*3)%7); ctx.fillStyle = k%3 ? 'rgba(186,150,58,.92)' : 'rgba(222,190,92,.95)'; ctx.fill();
      if (k%2){ isoEllipse(x+7, y-4, 3.2); ctx.fillStyle = 'rgba(240,214,120,.95)'; ctx.fill(); } } }
}
function fishShape(x,y,len,S,ang,wag){
  const ca = Math.cos(ang), sa = Math.sin(ang);
  ctx.beginPath(); ctx.ellipse(x,y,len,len*S.fat,ang,0,Math.PI*2); ctx.fill();
  const tx = x - ca*len*.85, ty = y - sa*len*.85, ta = ang + wag;
  ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx - Math.cos(ta-.6)*len*S.tail, ty - Math.sin(ta-.6)*len*S.tail);
  ctx.lineTo(tx - Math.cos(ta+.6)*len*S.tail, ty - Math.sin(ta+.6)*len*S.tail); ctx.closePath(); ctx.fill();
}
function star(x,y,r){ ctx.beginPath(); for (let i=0;i<8;i++){ const a = i*Math.PI/4, q = i%2 ? r*.28 : r; ctx.lineTo(x+Math.cos(a)*q, y+Math.sin(a)*q); } ctx.closePath(); ctx.fill(); }
function drawGlow(){
  if (dark > .05){
    ctx.globalCompositeOperation = 'screen';
    for (const sc of schools){ const S = SPECIES[sc.sp]; if (!S.glow || !sc.vis) continue;
      const a = dark*(sc.night ? clamp((dark-.5)/.3,0,1) : 1); if (a < .03) continue;
      glow(sc.cx, sc.cy, 0, sc.r+80, rgba(S.c, .3*a*sc.alive/sc.n));
      ctx.fillStyle = rgba(S.c, .9*a);
      for (const f of sc.fish){ if (!f.alive || f.grow < .5) continue; const x = px(f.x,f.y), y = py(f.x,f.y);
        if (x<-10||x>W+10||y<-10||y>H+10) continue; ctx.beginPath(); ctx.arc(x,y,2.4*Z,0,Math.PI*2); ctx.fill(); } }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (dark > .05 && !towerTaken && onScreen(TOWER.x, TOWER.y, 300)){ ctx.globalCompositeOperation = 'screen';
    glow(TOWER.x, TOWER.y, TOWER.h-30, 70, rgba('#B98AFF', .45*dark*(.8+.2*Math.sin(T*2)))); ctx.globalCompositeOperation = 'source-over'; }
  if (isle3Stage < 1) isle3Glow(drawView);
  isle7Glow(drawView, isle7Look());
  scene.draw(drawView, 'glow');
  for (const q of sparks){ ctx.globalAlpha = 1 - q.age/q.life; ctx.fillStyle = q.c || (Math.random() < .5 ? '#FFFFFF' : '#FFE58A'); star(px(q.x,q.y), py(q.x,q.y,q.z), 4*Z); } ctx.globalAlpha = 1;
}
function drawFish(){
  for (const sc of schools){
    if (!sc.vis) continue;
    const S = SPECIES[sc.sp]; ctx.fillStyle = S.c; const na = sc.night ? clamp((dark-.5)/.3,0,1) : 1;
    for (const f of sc.fish){
      if (!f.alive || f.grow < .08) continue;
      const x = px(f.x,f.y), y = py(f.x,f.y); if (x<-20||x>W+20||y<-20||y>H+20) continue;
      const len = S.s*Z*f.grow, ca = Math.cos(f.ang), sa = Math.sin(f.ang), wag = Math.sin(T*9+f.ph)*.35;
      ctx.globalAlpha = .88*na;
      ctx.beginPath(); ctx.ellipse(x,y,len,len*S.fat,f.ang,0,Math.PI*2); ctx.fill();
      const tx = x - ca*len*.85, ty = y - sa*len*.85, ta = f.ang + wag;
      ctx.beginPath(); ctx.moveTo(tx,ty);
      ctx.lineTo(tx - Math.cos(ta-.6)*len*S.tail, ty - Math.sin(ta-.6)*len*S.tail);
      ctx.lineTo(tx - Math.cos(ta+.6)*len*S.tail, ty - Math.sin(ta+.6)*len*S.tail); ctx.closePath(); ctx.fill();
      if (S.mark){ ctx.fillStyle = S.mark;
        if (S.dot){ ctx.beginPath(); ctx.arc(x + ca*len*.35, y + sa*len*.35, len*.2, 0, Math.PI*2); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(x,y,len*.62,len*S.fat*.36,f.ang,0,Math.PI*2); ctx.fill(); }
        ctx.fillStyle = S.c; }
      if (sc.sp === 5 && Math.sin(T*3+f.ph*5) > .93){ ctx.globalAlpha = .9; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x,y-len*.2,1.8*Z,0,Math.PI*2); ctx.fill(); ctx.fillStyle = S.c; }
    }
  }
  ctx.globalAlpha = 1;
}
function drawWakes(){
  ctx.fillStyle = C.foam;
  for (const w of wakes){ const k = w.age/w.life; ctx.globalAlpha = (1-k)*.45; isoEllipse(w.x,w.y,3+k*9); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function drawNet(){
  const c = Math.cos(boat.h), s = Math.sin(boat.h), k = bk(), sx = boat.x-c*27*k, sy = boat.y-s*27*k, torn = net.torn > 0;
  let ux = net.x-sx, uy = net.y-sy; const ul = Math.hypot(ux,uy) || 1; ux /= ul; uy /= ul;
  const qx = -uy, qy = ux, w = NETW[lv.net], m = 10, pts = [];
  for (let i=0;i<=m;i++){ const t = i/m*2-1, b = (1-t*t)*w*.4 - w*.14; pts.push([net.x + qx*t*w/2 + ux*b, net.y + qy*t*w/2 + uy*b]); }
  const full = holdTotal >= HOLD[lv.hold]; ctx.globalAlpha = (full || torn) ? .45 : 1;
  ctx.strokeStyle = 'rgba(255,246,229,.75)'; ctx.lineWidth = 1.5*Z;
  for (const side of [-1,1]){ const e = side<0 ? pts[0] : pts[m];
    const rx = boat.x-c*26*k-s*side*7*k, ry = boat.y-s*26*k+c*side*7*k;
    ctx.beginPath(); ctx.moveTo(px(rx,ry), py(rx,ry,6*k));
    ctx.lineTo(px(e[0],e[1]), py(e[0],e[1])); ctx.stroke(); }
  polyPath(pts,0); ctx.fillStyle = torn ? 'rgba(255,120,100,.12)' : 'rgba(255,255,255,.13)'; ctx.fill();
  if (jellies.inNet){ const k = Math.min(jellies.inNet, 7); ctx.fillStyle = 'rgba(222,190,255,.7)';
    for (let i=0;i<k;i++){ const p = pts[1 + Math.floor(i*(m-1)/k)]; ctx.beginPath(); ctx.arc(px(p[0],p[1]), py(p[0],p[1], 2+Math.sin(T*2.5+i)*1.5), (3.5+Math.sin(T*3+i))*Z, 0, Math.PI*2); ctx.fill(); } }
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1*Z;
  for (let i=1;i<m;i++){ const a = pts[i], b = pts[m-i]; if (i >= m-i) break;
    ctx.beginPath(); ctx.moveTo(px(a[0],a[1]),py(a[0],a[1])); ctx.lineTo(px(b[0],b[1]),py(b[0],b[1])); ctx.stroke(); }
  for (let i=0;i<=m;i++){ const p = pts[i]; if (torn && i > 3 && i < 7) continue;
    ctx.fillStyle = torn ? '#9AA7AD' : i%2 ? PAINTS[paint].trim : PAINTS[paint].hull;
    ctx.beginPath(); ctx.arc(px(p[0],p[1]), py(p[0],p[1],1.5+Math.sin(T*3+i)*.8), 3.1*Z, 0, Math.PI*2); ctx.fill(); }
  ctx.globalAlpha = 1;
}
const HEAP = [[-15,0,0],[-20,-4,0],[-20,4,0],[-11,-4,0],[-11,4,0],[-24,0,0],[-16,0,3]];
function drawShip(s,o){
  const c = Math.cos(s.h), sn = Math.sin(s.h), k = o.scale;
  const Lp = (lx,ly) => [s.x + (lx*c - ly*sn)*k, s.y + (lx*sn + ly*c)*k];
  const bob = Math.sin(T*2.1 + s.x*.01)*1.3, z1 = 9*k + bob, tr = o.tier || 0;
  polyPath(HULL.map(p => Lp(p[0]*1.08, p[1]*1.3)), 0); ctx.fillStyle = 'rgba(8,40,52,.22)'; ctx.fill();
  extrude(HULL.map(p => Lp(p[0],p[1])), -1+bob, z1, o.hull, o.trim);
  polyPath(HULL.map(p => Lp(p[0]*.86-1, p[1]*.7)), z1); ctx.fillStyle = o.deck; ctx.fill();
  const parts = [];
  if (o.heap > 0){ const hp = Lp(-17,0); parts.push({d: hp[0]+hp[1], f: () => {
    const n = Math.max(1, Math.ceil(o.heap*HEAP.length));
    for (let i=0;i<n;i++){ const h = HEAP[i], p = Lp(h[0],h[1]); ctx.fillStyle = i%3===2 ? o.heapTint : '#DCEBEE';
      isoEllipse(p[0],p[1],4.4,z1+1.5+h[2]); ctx.fill(); }
  }}); }
  const cp = Lp(3,0); parts.push({d: cp[0]+cp[1], f: () => {
    const cw = tr >= 1 ? 8 : 7;
    extrude([Lp(13,-cw),Lp(13,cw),Lp(-6,cw),Lp(-6,-cw)], z1, z1+14*k, o.cabin, tr >= 2 ? o.cabin : o.roof);
    if (tr >= 2) extrude([Lp(10,-5.5),Lp(10,5.5),Lp(-2,5.5),Lp(-2,-5.5)], z1+14*k, z1+23*k, o.cabin, o.roof);
  }});
  if (o.harpoon){ const g = Lp(25,0); parts.push({d: g[0]+g[1], f: () => {
    // A harpoon gun on the bow: a post, and the harpoon on it while it is loaded.
    ctx.strokeStyle = '#3B2A1A'; ctx.lineWidth = 3*Z; ctx.beginPath(); ctx.moveTo(px(g[0],g[1]), py(g[0],g[1],z1)); ctx.lineTo(px(g[0],g[1]), py(g[0],g[1],z1+6*k)); ctx.stroke();
    if (o.harpoon < 2) return; const a = Lp(16,0), b = Lp(40,0);
    ctx.strokeStyle = '#5E3D1C'; ctx.lineWidth = 2.6*Z; ctx.beginPath(); ctx.moveTo(px(a[0],a[1]), py(a[0],a[1],z1+7*k)); ctx.lineTo(px(b[0],b[1]), py(b[0],b[1],z1+8*k)); ctx.stroke();
    ctx.fillStyle = '#D8DEE2'; ctx.beginPath(); ctx.arc(px(b[0],b[1]), py(b[0],b[1],z1+8*k), 2.8*Z, 0, Math.PI*2); ctx.fill(); }}); }
  if (tr >= 4){ const a = Lp(-20,0), b = Lp(-31,0);
    ctx.strokeStyle = o.mast; ctx.lineWidth = 2*Z;
    ctx.beginPath(); ctx.moveTo(px(a[0],a[1]),py(a[0],a[1],z1)); ctx.lineTo(px(a[0],a[1]),py(a[0],a[1],z1+24*k)); ctx.lineTo(px(b[0],b[1]),py(b[0],b[1],z1+15*k)); ctx.stroke(); }
  parts.sort((a,b) => a.d-b.d); for (const p of parts) p.f();
  const mx = px(cp[0],cp[1]), myB = py(cp[0],cp[1],z1+14*k), myT = py(cp[0],cp[1],z1+((o.sail?46:36)+(tr>=2?9:0))*k);
  if (o.sail){ const a = Lp(5,-15), b = Lp(5,15);
    ctx.beginPath(); ctx.moveTo(px(a[0],a[1]),py(a[0],a[1],z1+8*k)); ctx.lineTo(px(b[0],b[1]),py(b[0],b[1],z1+8*k));
    ctx.lineTo(px(b[0],b[1]),py(b[0],b[1],z1+40*k)); ctx.lineTo(px(a[0],a[1]),py(a[0],a[1],z1+40*k)); ctx.closePath();
    ctx.fillStyle = o.sail; ctx.fill(); }
  ctx.strokeStyle = o.mast; ctx.lineWidth = 2.2*Z; ctx.beginPath(); ctx.moveTo(mx,myB); ctx.lineTo(mx,myT); ctx.stroke();
  const fw = Math.sin(T*5 + s.x*.02)*3*Z;
  if (o.design){ drawFlagAt(mx, myT, 17*Z*k, 11*Z*k, o.design, fw, -1); return; }
  ctx.beginPath(); ctx.moveTo(mx,myT); ctx.lineTo(mx-15*Z*k, myT+5*Z*k+fw); ctx.lineTo(mx, myT+10*Z*k); ctx.closePath();
  ctx.fillStyle = o.flag; ctx.fill();
}
// A designed flag at a screen point on its pole, w by h, flying left (dir -1) or right, rippled by wave.
function drawFlagAt(sx, sy, w, h, f, wave, dir){
  ctx.save(); ctx.translate(sx, sy); ctx.scale(dir < 0 ? -1 : 1, 1); ctx.transform(1, wave/w, 0, 1, 0, 0);
  for (const q of flagShapes(f, w, h)){ ctx.fillStyle = q.c;
    if (q.t === 'rect') ctx.fillRect(q.x, q.y, q.w, q.h);
    else if (q.t === 'circle'){ ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI*2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(q.p[0], q.p[1]); for (let i=2;i<q.p.length;i+=2) ctx.lineTo(q.p[i], q.p[i+1]); ctx.closePath(); ctx.fill(); } }
  ctx.restore();
}
function drawPalm(x,y,lean){
  const bx = px(x,y), by = py(x,y), sway = Math.sin(T*.9+x)*3*Z, tx = px(x+lean,y) + sway, ty = py(x+lean,y,58);
  ctx.strokeStyle = C.wood; ctx.lineWidth = 5*Z; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(bx,by); ctx.quadraticCurveTo(bx + lean*.2*Z, (by+ty)/2, tx, ty); ctx.stroke();
  for (let i=0;i<6;i++){ const a = i/6*Math.PI*2 + .3;
    ctx.fillStyle = i%2 ? '#4FA35B' : '#3E8E4E';
    ctx.beginPath(); ctx.ellipse(tx + Math.cos(a)*13*Z, ty + Math.sin(a)*6*Z + 2*Z, 15*Z, 5.5*Z, Math.atan2(Math.sin(a)*.5+.25, Math.cos(a)), 0, Math.PI*2); ctx.fill(); }
}
function blob(x,y,z,r,c){ ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px(x,y), py(x,y,z), r*Z, 0, Math.PI*2); ctx.fill(); }
function flagAt(x,y,z,c,design){ const sx = px(x,y), sy = py(x,y,z), w = Math.sin(T*5+x)*2*Z;
  ctx.strokeStyle = C.wood; ctx.lineWidth = 1.8*Z; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx,sy-16*Z); ctx.stroke();
  if (design){ drawFlagAt(sx, sy-16*Z, 14*Z, 9*Z, design, w, 1); return; }
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(sx,sy-16*Z); ctx.lineTo(sx+12*Z,sy-12*Z+w); ctx.lineTo(sx,sy-8*Z); ctx.closePath(); ctx.fill(); }
function perched(x,y,z){ const sx = px(x,y), sy = py(x,y,z);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(sx,sy-4*Z,4.2*Z,3*Z,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(sx+3.4*Z,sy-7.5*Z,2.2*Z,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#9AA7AD'; ctx.beginPath(); ctx.ellipse(sx-1.2*Z,sy-4.2*Z,3*Z,1.8*Z,.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#F2A33A'; ctx.beginPath(); ctx.moveTo(sx+5.2*Z,sy-7.8*Z); ctx.lineTo(sx+8.4*Z,sy-7*Z); ctx.lineTo(sx+5.2*Z,sy-6.4*Z); ctx.closePath(); ctx.fill(); }
function drawBigTree(){
  const bx = px(TX,TY), by = py(TX,TY), ty = py(TX,TY,84);
  isoEllipse(TX+6,TY+6,40); ctx.fillStyle = 'rgba(20,60,30,.22)'; ctx.fill();
  ctx.fillStyle = '#7A5230'; ctx.beginPath(); ctx.moveTo(bx-10*Z,by); ctx.lineTo(bx+10*Z,by); ctx.lineTo(bx+5*Z,ty); ctx.lineTo(bx-5*Z,ty); ctx.closePath(); ctx.fill();
  blob(TX-16,TY-16,100,40,'#3E8E4E'); blob(TX+18,TY-8,108,34,'#479A55');
  if (build >= 1){
    box(TX-28,TY-28,56,56,40,44,C.wood,C.woodTop);
    ctx.strokeStyle = C.wood; ctx.lineWidth = 1.8*Z;
    for (const o of [0,7]){ ctx.beginPath(); ctx.moveTo(px(TX+28,TY+6+o),py(TX+28,TY+6+o,0)); ctx.lineTo(px(TX+28,TY+6+o),py(TX+28,TY+6+o,40)); ctx.stroke(); }
    for (let z=6; z<40; z+=7){ ctx.beginPath(); ctx.moveTo(px(TX+28,TY+6),py(TX+28,TY+6,z)); ctx.lineTo(px(TX+28,TY+13),py(TX+28,TY+13,z)); ctx.stroke(); }
  }
  if (build >= 2){ box(TX-19,TY-19,38,38,44,68,'#EAD7A8','#EAD7A8');
    ctx.fillStyle = '#3A2A1A'; ctx.beginPath();
    ctx.moveTo(px(TX+19,TY-6),py(TX+19,TY-6,44)); ctx.lineTo(px(TX+19,TY+5),py(TX+19,TY+5,44)); ctx.lineTo(px(TX+19,TY+5),py(TX+19,TY+5,60)); ctx.lineTo(px(TX+19,TY-6),py(TX+19,TY-6,60)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFD98A'; ctx.beginPath();
    ctx.moveTo(px(TX-8,TY+19),py(TX-8,TY+19,52)); ctx.lineTo(px(TX+4,TY+19),py(TX+4,TY+19,52)); ctx.lineTo(px(TX+4,TY+19),py(TX+4,TY+19,62)); ctx.lineTo(px(TX-8,TY+19),py(TX-8,TY+19,62)); ctx.closePath(); ctx.fill();
    box(TX-24,TY-24,48,48,68,73,'#C9483B','#DB5B4C'); }
  if (build >= 3){ box(TX-25,TY-25,50,50,73,76,C.wood,C.woodTop); box(TX-14,TY-14,28,28,76,98,'#F3E2B8','#F3E2B8');
    ctx.fillStyle = '#FFD98A'; ctx.beginPath();
    ctx.moveTo(px(TX-5,TY+14),py(TX-5,TY+14,82)); ctx.lineTo(px(TX+5,TY+14),py(TX+5,TY+14,82)); ctx.lineTo(px(TX+5,TY+14),py(TX+5,TY+14,92)); ctx.lineTo(px(TX-5,TY+14),py(TX-5,TY+14,92)); ctx.closePath(); ctx.fill();
    box(TX-19,TY-19,38,38,98,102,'#C9483B','#DB5B4C'); if (build < 5) flagAt(TX,TY,102,PAINTS[paint].hull,flag); }
  if (build >= 5){ const dx = px(TX,TY), dy = py(TX,TY,102);
    ctx.fillStyle = '#C9982A'; ctx.beginPath(); ctx.ellipse(dx,dy,16*Z,8*Z,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#F0C544'; ctx.beginPath(); ctx.ellipse(dx,dy,16*Z,19*Z,0,Math.PI,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFE58A'; ctx.beginPath(); ctx.ellipse(dx-5*Z,dy-9*Z,3.5*Z,7*Z,.4,0,Math.PI*2); ctx.fill();
    flagAt(TX,TY,121,PAINTS[paint].hull,flag);
    flagAt(TX-19,TY+19,102,C.coin); flagAt(TX+19,TY-19,102,C.coin); }
  blob(TX-34,TY+6,86,20,'#56AD63');
}
function drawTower(){
  if (build < 4) return;
  box(TWX,TWY,18,18,0,118,'#D9D2C0','#D9D2C0');
  ctx.fillStyle = '#FFD98A';
  for (const z of [40,76]){ ctx.beginPath(); ctx.moveTo(px(TWX+5,TWY+18),py(TWX+5,TWY+18,z)); ctx.lineTo(px(TWX+12,TWY+18),py(TWX+12,TWY+18,z)); ctx.lineTo(px(TWX+12,TWY+18),py(TWX+12,TWY+18,z+12)); ctx.lineTo(px(TWX+5,TWY+18),py(TWX+5,TWY+18,z+12)); ctx.closePath(); ctx.fill(); }
  box(TWX-4,TWY-4,26,26,118,125,'#BDB5A0','#E8E2D0');
  if (build >= 5){ ctx.fillStyle = '#F0C544'; ctx.beginPath();
    ctx.moveTo(px(TWX-4,TWY+22),py(TWX-4,TWY+22,125)); ctx.lineTo(px(TWX+22,TWY+22),py(TWX+22,TWY+22,125)); ctx.lineTo(px(TWX+22,TWY-4),py(TWX+22,TWY-4,125)); ctx.lineTo(px(TWX+9,TWY+9),py(TWX+9,TWY+9,162)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#C9982A'; ctx.beginPath();
    ctx.moveTo(px(TWX+22,TWY+22),py(TWX+22,TWY+22,125)); ctx.lineTo(px(TWX+22,TWY-4),py(TWX+22,TWY-4,125)); ctx.lineTo(px(TWX+9,TWY+9),py(TWX+9,TWY+9,162)); ctx.closePath(); ctx.fill();
    flagAt(TWX+9,TWY+9,162,PAINTS[paint].hull,flag);
  } else flagAt(TWX+9,TWY+9,125,PAINTS[paint].hull,flag);
}
function drawBird(x,y,z,flap,k,alpha){
  ctx.globalAlpha = .13*alpha; ctx.fillStyle = '#0A2A33'; isoEllipse(x,y,6*k); ctx.fill();
  const sx = px(x,y), sy = py(x,y,z), w = 10*Z*k, h = Math.sin(flap)*5*Z*k;
  const path = () => { ctx.beginPath(); ctx.moveTo(sx-w,sy-h); ctx.quadraticCurveTo(sx-w*.45,sy-4*Z*k-h*.3,sx,sy); ctx.quadraticCurveTo(sx+w*.45,sy-4*Z*k-h*.3,sx+w,sy-h); };
  ctx.lineCap = 'round'; ctx.globalAlpha = .3*alpha; ctx.strokeStyle = C.ink; ctx.lineWidth = 4*Z*k; path(); ctx.stroke();
  ctx.globalAlpha = alpha; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.3*Z*k; path(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx,sy,2*Z*k,0,Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
}
// The Ten Cent Bridge: pilings and two stone abutments, a plank deck with rails, a lamp, and the toll sign at the beach end.
// It is drawn in parts along the span, each sorted by its own depth: one object as long as this cannot have one depth, and
// sorting the whole of it round the boat, as the pier does, painted it over the palace tree whenever the boat was in front.
function drawBridgePart(i){
  const {ax, ay, bx, by, w, z} = BRIDGE, L = Math.hypot(bx-ax, by-ay), ux = (bx-ax)/L, uy = (by-ay)/L, h = w/2;
  const d0 = L*i/BRIDGE_PARTS, d1 = L*(i+1)/BRIDGE_PARTS, last = i === BRIDGE_PARTS-1, mine = d => d >= d0 && (d < d1 || (last && d <= L));
  for (const t of [.1,.23,.49,.58,.83,.94]){ if (!mine(L*t)) continue; const q = bridgeAt(L*t); box(q[0]-4, q[1]-4, 8, 8, 0, z, shade(C.wood,.72), C.wood); }
  for (const a of ABUTMENTS) if (mine((a[0]-ax)*ux + (a[1]-ay)*uy)) box(a[0]-16, a[1]-16, 32, 32, 0, z+2, '#8E989E', '#C3CBCF');
  extrude([bridgeAt(d0,h), bridgeAt(d1,h), bridgeAt(d1,-h), bridgeAt(d0,-h)], z, z+4, C.wood, C.woodTop);
  ctx.strokeStyle = 'rgba(60,30,0,.18)'; ctx.lineWidth = 1*Z;
  for (let d = 12; d < L-6; d += 14){ if (!mine(d)) continue; const l = bridgeAt(d,h), r = bridgeAt(d,-h); ctx.beginPath(); ctx.moveTo(px(l[0],l[1]),py(l[0],l[1],z+4)); ctx.lineTo(px(r[0],r[1]),py(r[0],r[1],z+4)); ctx.stroke(); }
  ctx.strokeStyle = '#7A5230'; ctx.lineWidth = 1.6*Z;
  for (const side of [1,-1]){ const f = bridgeAt(d0,h*side), t = bridgeAt(d1,h*side);
    ctx.beginPath(); ctx.moveTo(px(f[0],f[1]),py(f[0],f[1],z+13)); ctx.lineTo(px(t[0],t[1]),py(t[0],t[1],z+13)); ctx.stroke();
    for (let d = 0; d <= L; d += 29){ if (!mine(d)) continue; const q = bridgeAt(d,h*side); ctx.beginPath(); ctx.moveTo(px(q[0],q[1]),py(q[0],q[1],z+4)); ctx.lineTo(px(q[0],q[1]),py(q[0],q[1],z+13)); ctx.stroke(); } }
  { const a = ABUTMENTS[0]; if (mine((a[0]-ax)*ux + (a[1]-ay)*uy)){ const lx = a[0]+BRIDGE_SOUTH[0]*h, ly = a[1]+BRIDGE_SOUTH[1]*h;
    ctx.strokeStyle = '#3A2E28'; ctx.lineWidth = 2*Z; ctx.beginPath(); ctx.moveTo(px(lx,ly),py(lx,ly,z+4)); ctx.lineTo(px(lx,ly),py(lx,ly,z+30)); ctx.stroke();
    ctx.fillStyle = dark > .3 ? '#FFE9A8' : '#E8D9A8'; ctx.beginPath(); ctx.arc(px(lx,ly),py(lx,ly,z+32),3.2*Z,0,Math.PI*2); ctx.fill(); } }
  if (last){ const [sx0, sy0] = TOLL_SIGN; // at the beach end: the palace tree hides the island end
    box(sx0-1.5, sy0-1.5, 3, 3, 0, 26, '#5E3D1C', '#7A5230');
    const sx = px(sx0,sy0), sy = py(sx0,sy0,33); ctx.save();
    ctx.fillStyle = '#5E3D1C'; ctx.fillRect(sx-16*Z, sy-10*Z, 32*Z, 20*Z); ctx.fillStyle = C.trim; ctx.fillRect(sx-14.5*Z, sy-8.5*Z, 29*Z, 17*Z);
    ctx.fillStyle = C.ink; ctx.font = `800 ${12*Z}px Grandstander, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('10\u00a2', sx, sy+1*Z); ctx.restore(); }
}
// What is on the beach: an umbrella and a towel, for now.
function drawBeachThings(){
  const [x, y] = UMBRELLA; // up the beach, clear of the toll sign
  box(x-34, y+14, 26, 13, 0, 1, '#2B8A99', '#5BBFB5');
  ctx.strokeStyle = '#7A5230'; ctx.lineWidth = 2*Z; ctx.beginPath(); ctx.moveTo(px(x,y),py(x,y,0)); ctx.lineTo(px(x,y),py(x,y,34)); ctx.stroke();
  for (let i=0;i<8;i++){ const a0 = i*Math.PI/4, a1 = (i+1)*Math.PI/4, r = 24;
    ctx.fillStyle = i%2 ? C.trim : C.hull; ctx.beginPath(); ctx.moveTo(px(x,y),py(x,y,40));
    ctx.lineTo(px(x+Math.cos(a0)*r,y+Math.sin(a0)*r),py(x+Math.cos(a0)*r,y+Math.sin(a0)*r,30)); ctx.lineTo(px(x+Math.cos(a1)*r,y+Math.sin(a1)*r),py(x+Math.cos(a1)*r,y+Math.sin(a1)*r,30)); ctx.closePath(); ctx.fill(); }
}
function drawPier(){
  extrude(PIER, 0, 7, C.wood, C.woodTop);
  ctx.strokeStyle = 'rgba(60,30,0,.18)'; ctx.lineWidth = 1*Z;
  for (let x = PX0+14; x < PX0+152; x += 14){ ctx.beginPath(); ctx.moveTo(px(x,IY-17),py(x,IY-17,7)); ctx.lineTo(px(x,IY+17),py(x,IY+17,7)); ctx.stroke(); }
  box(PX0+118, IY-12, 22, 22, 7, 25, '#C98B4E', '#E6B877');
  box(PX0+94, IY-13, 16, 16, 7, 20, '#B97F45', '#DDAA66');
  perched(PX0+102, IY-5, 20);
}
function drawStall(){
  const {x, y} = STALL;
  box(x-14, y-10, 28, 20, 0, 13, '#8A5A3C', '#C98B5E');
  box(x-18, y-14, 36, 8, 13, 16, '#B23A48', '#F2E6D8');
  box(x-18, y+6, 36, 8, 13, 16, '#B23A48', '#F2E6D8');
  if (market !== NO_PICK){ ctx.fillStyle = SPECIES[market].c; isoEllipse(x, y-13, 4.5, 22); ctx.fill(); }
}
function drawSmokehouse(){
  const {x, y} = SMOKEHOUSE;
  box(x-16, y-12, 32, 24, 0, 17, '#4A3B33', '#6E5A4E');
  box(x+5, y-7, 7, 7, 17, 30, '#3A2E28', '#3A2E28');
  for (let k=0;k<3;k++){ const t = (T*.35 + k/3) % 1;
    ctx.fillStyle = `rgba(230,230,230,${(1-t)*.35})`; ctx.beginPath();
    ctx.arc(px(x+8.5, y-3.5), py(x+8.5, y-3.5, 30 + t*36), (4 + t*7)*Z, 0, Math.PI*2); ctx.fill(); }
}
// Island 2's trading post: plank walls, a green roof, a door on the near side and a fish over it.
function drawPost(){
  const {x0, y0, x1, y1} = POST;
  box(x0+4, y0+4, x1-x0-8, y1-y0-8, 0, 30, '#E9D3A6', '#E9D3A6');
  ctx.fillStyle = '#6B4A2C'; ctx.beginPath(); // the door, on the south face
  ctx.moveTo(px(x0+16,y1-4),py(x0+16,y1-4,0)); ctx.lineTo(px(x0+28,y1-4),py(x0+28,y1-4,0));
  ctx.lineTo(px(x0+28,y1-4),py(x0+28,y1-4,20)); ctx.lineTo(px(x0+16,y1-4),py(x0+16,y1-4,20)); ctx.closePath(); ctx.fill();
  box(x0, y0, x1-x0, y1-y0, 30, 38, '#2F8A78', shade('#2F8A78', 1.15));
  ctx.fillStyle = SPECIES[13].c; fishShape(px(x0+38,y1), py(x0+38,y1,26), 8*Z, SPECIES[13], Math.PI, 0);
}
// Island 2's tower: eight sides of grey stone, a door at its foot, slit windows, battlements and an empty pole.
// Nobody has climbed it yet. At night something at the top shows a purple light.
function drawTower2(){
  const {x, y, r, h} = TOWER, pts = [];
  for (let i=0;i<8;i++){ const a = i*Math.PI/4 + Math.PI/8; pts.push([x+Math.cos(a)*r, y+Math.sin(a)*r]); }
  extrude(pts, 0, h, '#8F9893', '#B9C1BC');
  const c = r*.924*Math.SQRT1_2, fx = x+c, fy = y+c, tx = -Math.SQRT1_2, ty = Math.SQRT1_2; // the face toward the viewer
  const quad = (w, z0, z1, col) => { ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(px(fx-tx*w,fy-ty*w),py(fx-tx*w,fy-ty*w,z0)); ctx.lineTo(px(fx+tx*w,fy+ty*w),py(fx+tx*w,fy+ty*w,z0));
    ctx.lineTo(px(fx+tx*w,fy+ty*w),py(fx+tx*w,fy+ty*w,z1)); ctx.lineTo(px(fx-tx*w,fy-ty*w),py(fx-tx*w,fy-ty*w,z1)); ctx.closePath(); ctx.fill(); };
  quad(7, 0, 24, '#3A2E28');
  for (const z of [62, 104]) quad(2, z, z+11, dark > .3 && !towerTaken ? '#B98AFF' : '#2B2F31');
  const top = pts.map(p => p).sort((a,b) => (a[0]+a[1])-(b[0]+b[1]));
  for (const p of top) box(p[0]-4, p[1]-4, 8, 8, h, h+9, '#8F9893', '#C3CAC5');
  ctx.strokeStyle = C.wood; ctx.lineWidth = 2*Z; ctx.beginPath(); ctx.moveTo(px(x,y),py(x,y,h)); ctx.lineTo(px(x,y),py(x,y,h+40)); ctx.stroke();
  if (towerTaken) drawFlagAt(px(x,y), py(x,y,h+40), 18*Z, 12*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1);
}
// The monkey camp: thatched huts round a fire, a skull on a pole, and a chest that opens when they are beaten.
function drawHut(x, y){ box(x-9, y-9, 18, 18, 0, 11, '#8A6A43', '#8A6A43');
  ctx.fillStyle = '#6B4A2C'; ctx.beginPath(); ctx.moveTo(px(x-3,y+9),py(x-3,y+9,0)); ctx.lineTo(px(x+3,y+9),py(x+3,y+9,0)); ctx.lineTo(px(x+3,y+9),py(x+3,y+9,8)); ctx.lineTo(px(x-3,y+9),py(x-3,y+9,8)); ctx.closePath(); ctx.fill();
  const tx = px(x,y), ty = py(x,y,32), r = 15;
  ctx.fillStyle = '#C9A15A'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px(x-r,y+r), py(x-r,y+r,9)); ctx.lineTo(px(x+r,y+r), py(x+r,y+r,9)); ctx.lineTo(px(x+r,y-r), py(x+r,y-r,9)); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#B08A47'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px(x+r,y+r), py(x+r,y+r,9)); ctx.lineTo(px(x+r,y-r), py(x+r,y-r,9)); ctx.closePath(); ctx.fill(); }
function drawFire(){ const {x, y} = FIRE;
  for (let i=0;i<7;i++){ const a = i/7*Math.PI*2; ctx.fillStyle = '#8E989E'; isoEllipse(x+Math.cos(a)*9, y+Math.sin(a)*9, 3, 1); ctx.fill(); }
  for (let k=0;k<3;k++){ const h = 7 + Math.sin(T*9+k*2)*2.5; ctx.fillStyle = k === 1 ? '#FFD24A' : '#F2913A';
    const sx = px(x+(k-1)*3, y), sy = py(x+(k-1)*3, y, 1); ctx.beginPath(); ctx.moveTo(sx-2.5*Z, sy); ctx.quadraticCurveTo(sx, sy-h*2*Z, sx+2.5*Z, sy); ctx.closePath(); ctx.fill(); }
  for (let k=0;k<3;k++){ const t = (T*.4 + k/3) % 1; ctx.fillStyle = `rgba(220,220,220,${(1-t)*.3})`; ctx.beginPath(); ctx.arc(px(x,y), py(x,y,14+t*40), (3+t*7)*Z, 0, Math.PI*2); ctx.fill(); } }
function drawTotem(){ const {x, y} = TOTEM; ctx.strokeStyle = '#5E3D1C'; ctx.lineWidth = 2.4*Z; ctx.beginPath(); ctx.moveTo(px(x,y),py(x,y,0)); ctx.lineTo(px(x,y),py(x,y,30)); ctx.stroke();
  const sx = px(x,y), sy = py(x,y,33); ctx.fillStyle = '#F4F1E6'; ctx.beginPath(); ctx.arc(sx, sy, 5*Z, 0, Math.PI*2); ctx.fill(); ctx.fillRect(sx-2.6*Z, sy+3*Z, 5.2*Z, 3*Z);
  ctx.fillStyle = '#1E2227'; for (const e of [-1,1]){ ctx.beginPath(); ctx.arc(sx+e*1.9*Z, sy-.5*Z, 1.3*Z, 0, Math.PI*2); ctx.fill(); } }
function drawChest(){ const {x, y} = CHEST; box(x-7, y-5, 14, 10, 0, 8, '#7A4E25', '#8F5E2E'); box(x-7, y-1, 14, 2, 0, 8.2, '#D9A520', '#F0C544');
  if (monkeys.cleared){ ctx.fillStyle = '#5E3D1C'; ctx.beginPath(); ctx.moveTo(px(x-7,y-5),py(x-7,y-5,8)); ctx.lineTo(px(x+7,y-5),py(x+7,y-5,8)); ctx.lineTo(px(x+7,y-5),py(x+7,y-5,18)); ctx.lineTo(px(x-7,y-5),py(x-7,y-5,18)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.coin; isoEllipse(x, y, 4, 9); ctx.fill(); }
  else box(x-7, y-5, 14, 10, 8, 11, '#7A4E25', '#9A6A36'); }
function drawWorldObjects(){
  const pierD = boat.x+boat.y + (boat.y < IY ? 1 : -1), dog = pets.dog;
  const list = [
    {d: (IX+80)+(IY-70), f: () => { box(IX+20,IY-120,60,50,0,38,'#FFF1D6','#FFF1D6'); box(IX+14,IY-126,72,62,38,47,C.hull,shade(C.hull,1.12)); perched(IX+30,IY-72,47); drawTrophies(); }},
    {d: (IX+118)+(IY-30), f: () => drawPalm(IX+118,IY-30,10)},
    {d: (IX-150)+(IY-70), f: () => drawPalm(IX-150,IY-70,-8)},
    {d: (IX+50)+(IY+125), f: () => drawPalm(IX+50,IY+125,7)},
    {d: TX+TY+30, f: drawBigTree},
    {d: TWX+TWY+18, f: drawTower},
    {d: boat.x+boat.y, f: () => {
      let tint = '#DCEBEE'; for (let i=SPECIES.length-1;i>0;i--) if (hold[i]){ tint = SPECIES[i].c; break; }
      const P = PAINTS[paint];
      drawShip(boat, {scale:bk(), tier:tier(), hull:P.hull, trim:P.trim, deck:C.deck, cabin:C.cabin, roof:P.roof, mast:C.wood, flag:P.flag, design:flag,
        heap: holdTotal/HOLD[lv.hold], heapTint: tint, harpoon: hasHarpoon() ? (T >= harpoonAt ? 2 : 1) : 0}); }},
    {d: pierD, f: drawPier},
    {d: BEACH.x+BEACH.y, f: drawBeachThings}
  ];
  for (let i=0;i<BRIDGE_PARTS;i++) list.push({d: bridgePartDepth(i), f: () => drawBridgePart(i)});
  if (onScreen(ISLE2.x, ISLE2.y, (ISLE2.r+260)*Z)){
    list.push({d: POST.x1+POST.y1, f: drawPost}, {d: TOWER.x+TOWER.y, f: drawTower2});
    PALMS2.forEach((p, i) => list.push({d: p[0]+p[1], f: () => drawPalm(p[0], p[1], [8,-9,6,-7,10][i])}));
    HUTS.forEach(h => list.push({d: h[0]+h[1]+11, f: () => drawHut(h[0], h[1])}));
    list.push({d: FIRE.x+FIRE.y, f: drawFire}, {d: TOTEM.x+TOTEM.y, f: drawTotem}, {d: CHEST.x+CHEST.y+5, f: drawChest});
    for (const m of monkeys.list) if (m.state !== 'gone') list.push({d: walkerDepth(m.x, m.y, build, pierD, null), f: () => monkeys.drawMonkey(drawView, m, 0)}); }
  if (warlock.shown && floor < 0) list.push({d: walkerDepth(warlock.x, warlock.y, build, pierD, null), f: () => warlock.drawBody(drawView)});
  if (tarbaby.with && floor < 0) list.push({d: walkerDepth(tarbaby.x, tarbaby.y, build, pierD, null), f: () => tarbaby.drawBody(drawView)});
  if (tarbaby.free && !tarbaby.with) list.push({d: boat.x+boat.y+.5, f: () => tarbaby.drawAboard(drawView, boat, bk())});
  for (const p of [cat, warrior, bonesPal]){ if (p.shown && floor < 0) list.push({d: walkerDepth(p.x, p.y, build, pierD, null), f: () => p.drawBody(drawView)});
    else if (p.free && !p.shown) list.push({d: boat.x+boat.y+.6, f: () => p.drawAboard(drawView, boat, bk())}); }
  if (floor < 0) for (const a of allies.list) list.push({d: walkerDepth(a.x, a.y, build, pierD, null), f: () => allies.drawBody(drawView, a)});
  if (anchorer.state !== 'gone' && isle3Stage >= 4) list.push({d: anchorer.x + anchorer.y, f: () => anchorer.drawBody(drawView)});
  if (deep.state !== 'down') list.push({d: deep.x + deep.y, f: () => deep.drawBody(drawView)});
  list.push(...isle4Solids(drawView, isle4Look()));
  list.push(...isle5Solids(drawView, isle5Stage >= 1));
  list.push(...isle6Solids(drawView, (i) => (chests6 & (1 << i)) !== 0));
  list.push(...isle7Solids(drawView, isle7Look()));
  for (const m of monkeys7.list) if (m.state !== 'gone' && onScreen(m.x, m.y, 60*Z)) list.push({d: walkerDepth(m.x, m.y, build, pierD, null), f: () => monkeys7.drawMonkey(drawView, m, 0)});
  list.push(...isle3Solids(drawView, isle3Stage >= 1 ? (sx, sy) => drawFlagAt(sx, sy, 18*Z, 12*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1) : null));
  if (build >= FISHMONGER_STAGE) list.push({d: STALL.x+STALL.y, f: drawStall});
  if (build >= SMOKEHOUSE_STAGE) list.push({d: SMOKEHOUSE.x+SMOKEHOUSE.y, f: drawSmokehouse});
  list.push(...scene.solids(drawView), ...bushSolids(drawView));
  if (walker.shown){ walker.shirt = PAINTS[paint].hull;
    list.push({d: walker.sortDepth(build, pierD, dog ? {x: dog.x, y: dog.y, d: pets.depth()} : null), f: () => walker.draw(drawView, 'solids')}); }
  list.sort((a,b) => a.d-b.d); for (const o of list) o.f();
}
function drawBuoys(){
  for (let i=0;i<buoys.length;i++){ const b = buoys[i]; if (!onScreen(b[0],b[1],30)) continue;
    const z = Math.sin(T*2+i)*1.5; isoEllipse(b[0],b[1],7,0); ctx.fillStyle = 'rgba(8,40,52,.25)'; ctx.fill();
    const x = px(b[0],b[1]), y = py(b[0],b[1],4+z);
    ctx.fillStyle = C.hull; ctx.beginPath(); ctx.arc(x,y,5.5*Z,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = C.trim; ctx.beginPath(); ctx.arc(x,y-2.5*Z,2.6*Z,0,Math.PI*2); ctx.fill(); }
  // The far buoys, dark red and black, and the anchor chain sagging between them while it holds.
  const chained = !farOpen();
  for (let i=0;i<farBuoys.length;i++){ const b = farBuoys[i]; if (!onScreen(b[0],b[1],FAR_BUOY_GAP*Z)) continue;
    const z = Math.sin(T*1.6+i)*1.8, x = px(b[0],b[1]), y = py(b[0],b[1],5+z);
    if (chained){ const n = farBuoys[(i+1) % farBuoys.length], nx = px(n[0],n[1]), ny = py(n[0],n[1],5+Math.sin(T*1.6+i+1)*1.8);
      ctx.strokeStyle = '#3A3F44'; ctx.lineWidth = 2.4*Z; ctx.setLineDash([3*Z, 2*Z]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x+nx)/2, (y+ny)/2 + 10*Z, nx, ny); ctx.stroke(); ctx.setLineDash([]); }
    isoEllipse(b[0],b[1],9,0); ctx.fillStyle = 'rgba(4,24,32,.3)'; ctx.fill();
    ctx.fillStyle = '#8E2B2B'; ctx.beginPath(); ctx.arc(x,y,7*Z,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#1E2227'; ctx.fillRect(x-7*Z, y-1.6*Z, 14*Z, 3.2*Z);
    ctx.fillStyle = '#8E2B2B'; ctx.beginPath(); ctx.arc(x,y-4*Z,3*Z,0,Math.PI*2); ctx.fill(); }
}
function drawFlies(){
  for (const f of flies){ if (f.t < 0) continue;
    const tgt = f.to === 'boat' ? [boat.x-Math.cos(boat.h)*16*bk(), boat.y-Math.sin(boat.h)*16*bk(), 12*bk()] : f.to === 'crate' ? [CRATE.x,CRATE.y,26] : f.to === 'post' ? [POST_MID.x,POST_MID.y,26] : f.to === 'trader' ? [TRADER_MID.x,TRADER_MID.y,30] : f.to === 'post6' ? [POST6_MID.x,POST6_MID.y,30] : f.to === 'post7' ? [POST7_MID.x,POST7_MID.y,30] : f.to === 'figure' ? [walker.x,walker.y,walker.z+20] : f.to === 'stall' ? [STALL.x,STALL.y,18] : f.to === 'smoke' ? [SMOKEHOUSE.x,SMOKEHOUSE.y,20] : [pirate.x,pirate.y,16];
    const t = f.t, e = t*t*(3-2*t), x = f.x0+(tgt[0]-f.x0)*e, y = f.y0+(tgt[1]-f.y0)*e, z = f.z0+(tgt[2]-f.z0)*e + Math.sin(Math.PI*t)*38;
    ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(px(x,y), py(x,y,z), f.s*Z, f.s*.45*Z, t*7, 0, Math.PI*2); ctx.fill(); }
}
function glow(x,y,z,r,color){
  const sx = px(x,y), sy = py(x,y,z), R = r*Z, g = ctx.createRadialGradient(sx,sy,0,sx,sy,R);
  g.addColorStop(0,color); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(sx-R,sy-R,R*2,R*2);
}
let nightCv = null, nctx = null;
function light(x,y,z,r,k){ k *= dark;
  const sx = px(x,y), sy = py(x,y,z), R = r*Z, g = nctx.createRadialGradient(sx,sy,0,sx,sy,R);
  g.addColorStop(0,`rgba(0,0,0,${k})`); g.addColorStop(.45,`rgba(0,0,0,${k*.8})`); g.addColorStop(1,'rgba(0,0,0,0)');
  nctx.fillStyle = g; nctx.fillRect(sx-R,sy-R,R*2,R*2);
}
function drawNight(){
  const q = .5, w = Math.ceil(W*q), h = Math.ceil(H*q);
  if (!nightCv){ nightCv = document.createElement('canvas'); nctx = nightCv.getContext('2d'); }
  if (nightCv.width !== w || nightCv.height !== h){ nightCv.width = w; nightCv.height = h; }
  nctx.setTransform(q,0,0,q,0,0);
  nctx.globalCompositeOperation = 'source-over'; { const m = (a,b,t) => Math.round(a + (b-a)*t), wt = warm*.5;
    nctx.fillStyle = `rgb(${m(m(255,115,dark),255,wt)},${m(m(255,134,dark),168,wt)},${m(m(255,194,dark),122,wt)})`; }
  nctx.fillRect(0,0,W,H);
  nctx.globalCompositeOperation = 'destination-out';
  light(boat.x, boat.y, 10, 240 + 40*bk(), 1);
  for (const sc of schools) if (SPECIES[sc.sp].glow && sc.vis) light(sc.cx, sc.cy, 0, sc.r+80, .55);
  scene.draw(drawView, 'mask');
  light(net.x, net.y, 0, 150, .8);
  light(IX+50, IY-90, 20, 280, .95);
  if (build >= 2) light(TX, TY, 60, 230, .95);
  light(CRATE.x, CRATE.y, 10, 200, .95);
  light(POST_MID.x, POST_MID.y, 20, 230, .95);
  light(FIRE.x, FIRE.y, 10, 200, .95);
  light(TRADER_MID.x, TRADER_MID.y, 20, 200, .95);
  isle3Lights(drawView);
  light(ABUTMENTS[0][0], ABUTMENTS[0][1], 40, 190, .9);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(nightCv,0,0,W,H);
  ctx.globalCompositeOperation = 'source-over';
}
function drawTexts(){
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const t of texts){ const k = t.age/t.life;
    ctx.globalAlpha = k > .7 ? (1-k)/.3 : 1;
    ctx.font = `800 ${Math.round(t.size*Math.max(.85,Z))}px Grandstander, ui-rounded, system-ui, sans-serif`;
    const x = px(t.x,t.y), y = py(t.x,t.y,t.z) - k*34*Z;
    ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.strokeText(t.txt,x,y); ctx.fillStyle = t.color; ctx.fillText(t.txt,x,y); }
  ctx.globalAlpha = 1;
}
const placed = [];
function indicator(wx,wy,bg,kind,pulse){
  const x = px(wx,wy), y = py(wx,wy), m = 32, top = 100, bot = shopOpen ? 300 : m;
  if (x>m && x<W-m && y>top && y<H-bot) return;
  const cx = W/2, cy = (top + H - bot)/2, dx = x-cx, dy = y-cy;
  const tx = dx ? ((dx>0 ? W-m-cx : cx-m)/Math.abs(dx)) : 1e9, ty = dy ? ((dy>0 ? H-bot-cy : cy-top)/Math.abs(dy)) : 1e9;
  const t = Math.min(tx,ty), a = Math.atan2(dy,dx); let ix = cx+dx*t, iy = cy+dy*t;
  for (let n=0;n<4;n++) for (const q of placed) if (Math.hypot(q[0]-ix, q[1]-iy) < 36){ if (tx < ty) iy += 38; else ix += 38; }
  placed.push([ix,iy]);
  const r = 15 + (pulse ? Math.sin(T*6)*2 : 0);
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.moveTo(ix+Math.cos(a)*(r+9), iy+Math.sin(a)*(r+9));
  ctx.lineTo(ix+Math.cos(a+.75)*r, iy+Math.sin(a+.75)*r); ctx.lineTo(ix+Math.cos(a-.75)*r, iy+Math.sin(a-.75)*r); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(ix,iy,r,0,Math.PI*2); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = C.ink; ctx.stroke();
  if (kind === 'dock'){ ctx.fillStyle = C.wood; ctx.fillRect(ix-7,iy-6,14,12); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(ix-7,iy-6,14,12);
    ctx.beginPath(); ctx.moveTo(ix-7,iy); ctx.lineTo(ix+7,iy); ctx.stroke(); }
  else if (kind === 'pirate'){ ctx.fillStyle = '#fff'; ctx.font = '800 20px Grandstander, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', ix, iy+2); }
  else if (kind === 'sleep'){ ctx.fillStyle = C.trim; ctx.font = '800 18px Grandstander, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('z', ix, iy+1); }
  else if (kind === 'eye'){ ctx.fillStyle = '#C8F56A'; ctx.beginPath(); ctx.ellipse(ix,iy,9,6,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0B1F18'; ctx.beginPath(); ctx.ellipse(ix,iy,2,5,0,0,Math.PI*2); ctx.fill(); }
  else { ctx.fillStyle = kind; ctx.beginPath(); ctx.ellipse(ix+2,iy,7,3.6,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ix-4,iy); ctx.lineTo(ix-10,iy-4.5); ctx.lineTo(ix-10,iy+4.5); ctx.closePath(); ctx.fill(); }
}
function draw(){
  drawView.zoom = Z; drawView.dark = dark; drawView.T = T;
  ctx.setTransform(DPR,0,0,DPR,0,0); placed.length = 0;
  ctx.lineJoin = 'round';
  if (floor >= 0 && walker.shown){ drawRoom(); return; }
  drawSea(); scene.draw(drawView, 'underwater'); drawFish(); drawSnookShadow(); scene.draw(drawView, 'surface'); drawWakes(); drawNet(); drawBuoys(); scene.draw(drawView, 'afloat'); drawWorldObjects(); drawFishing(); scene.draw(drawView, 'air'); drawFlies();

  if (dark > .01 || warm > .01) drawNight();
  drawGlow();

  drawTexts();

  const full = holdTotal >= HOLD[lv.hold];
  if (!cine && !kingDying()){
  if (!docked) indicator(DOCK.x, DOCK.y, full ? C.coin : C.trim, 'dock', full);
  if (walker.aboard && pastBuoys(boat.x, boat.y) && !(docked && dockHere === ISLE2_DOCK)) indicator(DOCK2.x, DOCK2.y, '#9CF0C0', 'dock', !isle2Seen); // the way to island 2
  if (walker.aboard && pastBuoys(boat.x, boat.y) && (isle2Seen || towerTaken || isle3Seen) && !(docked && dockHere === ISLE3_DOCK)) indicator(DOCK3.x, DOCK3.y, '#9CD8F0', 'dock', !isle3Seen); // and to island 3, once island 2 is found
  if (walker.aboard && pastBuoys(boat.x, boat.y) && isle3Stage >= 4) indicator(ISLE4.x, ISLE4.y, '#3B2A44', 'dock', false); // the tar island
  if (walker.aboard && pastBuoys(boat.x, boat.y) && farOpen()) indicator(ISLE5.x, ISLE5.y, '#EDE6D3', 'dock', !isle5Seen); // island 5, once the far deep is open
  if (walker.aboard && pastBuoys(boat.x, boat.y) && isle5Stage >= 1 && !(docked && dockHere === ISLE6_DOCK)) indicator(ISLE6_DOCK.x, ISLE6_DOCK.y, '#7DD27A', 'dock', !isle6Seen); // island 6, once the King is dead
  if (walker.aboard && pastBuoys(boat.x, boat.y) && isle6Stage >= 2 && !(docked && dockHere === ISLE7_DOCK)) indicator(DOCK7.x, DOCK7.y, '#C9B2FF', 'dock', !isle7Seen); // island 7, once Cthulhu is beaten
  if (walker.shown) indicator(boat.x, boat.y, C.trim, 'dock', false); // the way back to the boat
  else if (!full && started){
    let best = null, bd = 1e9, anyVis = false, want = null, wd = 1e9, wantVis = false;
    const R = range();
    for (const sc of schools){ if (sc.alive < sc.n*.35 || (sc.night && dark < .75) || Math.hypot(sc.cx-IX, sc.cy-IY) > R-40) continue;
      const d = Math.hypot(sc.cx-boat.x, sc.cy-boat.y);
      if (sc.sp === order.sp){ if (sc.vis) wantVis = true; else if (d < wd){ wd = d; want = sc; } }
      if (sc.vis) anyVis = true; else if (d < bd){ bd = d; best = sc; } }
    if (want && !wantVis) indicator(want.cx, want.cy, C.coin, SPECIES[want.sp].c, false);
    else if (!anyVis && best) indicator(best.cx, best.cy, '#1F6B7A', SPECIES[best.sp].c, false);
  }
  drawHarpoonMarks();
  scene.draw(drawView, 'overlay');
  }
  drawTension();
  drawCine();
  drawKingScene();

  // Swallowed: the view closes on the boat, stays dark inside, and opens again where it was spat out.
  if (swallowT > 0 || irisT > 0){ const big = Math.hypot(W, H);
    const r = swallowT > 0 ? big*clamp((swallowT - (SWALLOW - .5))/.5, 0, 1) : big*(1 - irisT/SPIT);
    ctx.fillStyle = '#05080C'; ctx.beginPath(); ctx.rect(0, 0, W, H);
    if (r > 1){ ctx.moveTo(px(boat.x,boat.y) + r, py(boat.x,boat.y)); ctx.arc(px(boat.x,boat.y), py(boat.x,boat.y), r, 0, Math.PI*2, true); }
    ctx.fill('evenodd'); }
  if (joy.on && started){
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(joy.sx,joy.sy,JR,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(joy.x,joy.y,20,0,Math.PI*2); ctx.fill();
  }
}

/* ---------- the tower's rooms ---------- */
// A stone room lit by torches, or the roof under the sky: the floor, the back wall, the stairs once open,
// then whoever is in it in depth order, the spears, coconuts and bolts, and the floating text.
function drawRoom(){
  const R = ROOMS[floor], roof = R.roof, sunk = tower && tower.boss === boss3, under = R.kind === 'hall' || R.kind === 'demon' || R.kind === 'temple';
  const castle = R.kind === 'court' || R.kind === 'castle' || R.kind === 'throne' || R.kind === 'ruins';
  if (castle){ if (R.kind === 'court'){ drawCourtBack(drawView, R, W, H); drawPortal7(drawView, 1, GATE_PORTAL); } else if (R.kind === 'ruins') drawRuinsBack(drawView, R, W, H); else drawCastleBack(drawView, R, W, H);
    if (floor === THRONE) drawLockedDoor(drawView, LOCKED.x, LOCKED.y, isle7Stage >= 3); else if (hordes[floor]){ const st = stairs(floor); drawCastleDoor(drawView, st.x, st.y, hordes[floor].cleared); } }
  else if (under){ if (R.kind === 'hall'){ drawHallBack(drawView, R, W, H); if (isle3Stage >= 2) drawPortal(drawView, PORTAL.x, PORTAL.y); } else if (R.kind === 'temple') drawHallBack(drawView, R, W, H, true); else drawDemonBack(drawView, R, W, H); }
  else {
  if (roof){ const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1A1440'); g.addColorStop(1, '#4B2E83'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i=0;i<40;i++){ const hx = Math.sin(i*12.9898)*43758.5453, x = (hx - Math.floor(hx))*W, hy = Math.sin(i*78.233)*12345.678, y = (hy - Math.floor(hy))*H*.6;
      ctx.globalAlpha = .4 + .4*Math.sin(T*2 + i); ctx.fillRect(x, y, 2, 2); } ctx.globalAlpha = 1; }
  else { ctx.fillStyle = sunk ? '#121A1A' : '#15181D'; ctx.fillRect(0, 0, W, H); }
  // The back wall, its inside facing us, with torches.
  if (!roof){ for (let i=0;i<24;i++){ const a0 = Math.PI*.75 + i*Math.PI/24, a1 = a0 + Math.PI/24, h = 70;
      const x0 = R.x + Math.cos(a0)*R.r, y0 = R.y + Math.sin(a0)*R.r, x1 = R.x + Math.cos(a1)*R.r, y1 = R.y + Math.sin(a1)*R.r;
      ctx.fillStyle = sunk ? (i%2 ? '#34433F' : '#3B4B46') : i%2 ? '#3A3F46' : '#40464E'; ctx.beginPath(); ctx.moveTo(px(x0,y0),py(x0,y0,0)); ctx.lineTo(px(x1,y1),py(x1,y1,0)); ctx.lineTo(px(x1,y1),py(x1,y1,h)); ctx.lineTo(px(x0,y0),py(x0,y0,h)); ctx.closePath(); ctx.fill(); }
    for (const a of [Math.PI*.95, Math.PI*1.25, Math.PI*1.55]){ const x = R.x + Math.cos(a)*(R.r-2), y = R.y + Math.sin(a)*(R.r-2), fl = Math.sin(T*11 + a*3)*1.5;
      ctx.globalCompositeOperation = 'lighter'; glow(x, y, 44, 60, 'rgba(255,170,80,.35)'); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#5E3D1C'; ctx.fillRect(px(x,y)-1.5*Z, py(x,y,36), 3*Z, 8*Z);
      ctx.fillStyle = '#FFB347'; ctx.beginPath(); ctx.arc(px(x,y), py(x,y,46+fl), 3.4*Z, 0, Math.PI*2); ctx.fill(); } }
  // Island 3's walls are wet and weedy: strands hang down them, and the floor shines with puddles.
  if (sunk && !roof) for (let i=0;i<12;i++){ const a = Math.PI*.8 + i*Math.PI/14, x = R.x + Math.cos(a)*(R.r-1), y = R.y + Math.sin(a)*(R.r-1);
      ctx.strokeStyle = '#3F5A2A'; ctx.lineWidth = 2.4*Z; ctx.beginPath(); ctx.moveTo(px(x,y), py(x,y,70)); ctx.quadraticCurveTo(px(x,y)+Math.sin(T*1.5+i)*3*Z, py(x,y,52), px(x,y), py(x,y,38 + (i*7)%14)); ctx.stroke(); }
  // The floor.
  isoEllipse(R.x, R.y, R.r); ctx.fillStyle = roof ? (sunk ? '#A49C86' : '#7C848C') : sunk ? '#50605B' : '#59616B'; ctx.fill();
  if (sunk && !roof) for (const [dx, dy, r] of [[-40, 20, 18], [30, -35, 12], [50, 40, 15]]){ isoEllipse(R.x+dx, R.y+dy, r); ctx.fillStyle = 'rgba(150,200,210,.18)'; ctx.fill(); }
  for (const k of [.75, .5, .25]){ isoEllipse(R.x, R.y, R.r*k); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2*Z; ctx.stroke(); }
  if (roof){ for (let i=0;i<16;i++){ const a = i/16*Math.PI*2, x = R.x + Math.cos(a)*(R.r+4), y = R.y + Math.sin(a)*(R.r+4); if (Math.sin(a) + Math.cos(a) > .3) continue; box(x-6, y-6, 12, 12, 0, 12, sunk ? '#B9AF95' : '#8F9893', sunk ? '#D8D0BA' : '#B9C1BC'); }
    ctx.strokeStyle = C.wood; ctx.lineWidth = 2.4*Z; ctx.beginPath(); ctx.moveTo(px(R.x,R.y),py(R.x,R.y,0)); ctx.lineTo(px(R.x,R.y),py(R.x,R.y,60)); ctx.stroke();
    if (towerWon) drawFlagAt(px(R.x,R.y), py(R.x,R.y,60), 22*Z, 15*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1); }
  }
  // The stairs up, once the room is beaten: glowing steps at the back.
  if (!roof && floors[floor] && floors[floor].cleared){ const st = stairs(floor);
    for (let k=0;k<4;k++) box(st.x-16+k*5, st.y-16+k*5, 26-k*5, 26-k*5, 0, 6+k*6, '#8F9893', '#C3CAC5');
    isoEllipse(st.x, st.y, 24 + Math.sin(T*4)*2); ctx.strokeStyle = 'rgba(156,240,192,.7)'; ctx.lineWidth = 2.5*Z; ctx.stroke(); }
  // Who is in the room, back to front.
  const actors = [{d: walker.x + walker.y, f: () => walker.draw(drawView, 'solids')}];
  if (hordes[floor]) for (const u of hordes[floor].list) if (u.state !== 'gone') actors.push({d: u.x + u.y, f: () => hordes[floor].drawUnit(drawView, u)});
  if (floor === RUINS){ for (const c of COLUMNS) actors.push({d: c.x + c.y + c.r, f: () => drawColumn(drawView, c.x, c.y, c.r, c.h)});
    for (const l of lancers.list) if (l.state !== 'gone') actors.push({d: l.x + l.y, f: () => lancers.drawBody(drawView, l)}); }
  if (floor === THRONE){ actors.push({d: SEAT.x + SEAT.y + SEAT.r, f: () => drawThrone(drawView, SEAT.x, SEAT.y, SEAT.r)});
    if (forgotten.state !== 'gone') actors.push({d: forgotten.x + forgotten.y, f: () => forgotten.drawBody(drawView)}); }
  for (const a of allies.list) actors.push({d: a.x + a.y, f: () => allies.drawBody(drawView, a)});
  if (floor === ROOF7) for (const m of roofMonkeys.list) if (m.state !== 'gone') actors.push({d: m.x + m.y, f: () => roofMonkeys.drawMonkey(drawView, m, 0)});
  if (!roof && floors[floor]) for (const m of floors[floor].list) if (m.state !== 'gone') actors.push({d: m.x + m.y, f: () => floors[floor].drawMonkey(drawView, m, 0)});
  if (floor === HALL && swordsman.state !== 'gone') actors.push({d: swordsman.x + swordsman.y, f: () => swordsman.drawBody(drawView)});
  if (floor === TEMPLE6){ if (cth.state !== 'gone') actors.push({d: cth.x + cth.y, f: () => cth.drawBody(drawView)});
    for (const k of cth.tents) actors.push({d: k.x + k.y, f: () => cth.drawTent(drawView, k)}); }
  if (floor === DEMON){
    for (const d of demons) if (d.state !== 'gone') actors.push({d: d.x + d.y, f: () => d.drawBody(drawView)});
    for (const m of demonMonkeys.list) if (m.state !== 'gone') actors.push({d: m.x + m.y, f: () => demonMonkeys.drawMonkey(drawView, m, 0)});
    actors.push({d: CAGE.x + CAGE.y + CAGE.r, f: () => drawCage(drawView, cageOpen, !warlock.free)}); }
  if (warlock.shown) actors.push({d: warlock.x + warlock.y, f: () => warlock.drawBody(drawView)});
  if (tarbaby.with) actors.push({d: tarbaby.x + tarbaby.y, f: () => tarbaby.drawBody(drawView)});
  for (const p of [cat, warrior, bonesPal]) if (p.shown) actors.push({d: p.x + p.y, f: () => p.drawBody(drawView)});
  actors.sort((a,b) => a.d-b.d); for (const o of actors) o.f();
  // The front rim, so the room reads as a room.
  if (!roof && R.kind !== 'demon'){ isoEllipse(R.x, R.y, R.r+4); ctx.strokeStyle = R.kind === 'hall' ? '#24413F' : '#2A2E34'; ctx.lineWidth = 6*Z; ctx.stroke(); }
  scene.draw(drawView, 'air'); drawFlies();
  for (const q of sparks){ ctx.globalAlpha = 1 - q.age/q.life; ctx.fillStyle = q.c || (Math.random() < .5 ? '#FFFFFF' : '#E8D9FF'); star(px(q.x,q.y), py(q.x,q.y,q.z), 4*Z); } ctx.globalAlpha = 1;
  drawTexts();
  if (redFlash > 0){ ctx.fillStyle = `rgba(200,20,30,${redFlash*.8})`; ctx.fillRect(0, 0, W, H); }
  if (joy.on && started){
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(joy.sx,joy.sy,JR,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(joy.x,joy.y,20,0,Math.PI*2); ctx.fill(); }
}

/* ---------- loop ---------- */
let last = performance.now(), saveT = 0;
function frame(now){
  const dt = Math.min(.05, Math.max(.001, (now-last)/1000)); last = now;
  update(dt); updateAmbience(dt); draw();
  elShop.classList.toggle('steer', joy.on && joy.through);
  renderToast();
  if (started){ saveT += dt; if (saveT >= 5){ saveT = 0; save(); } }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__np = {get cine(){ return cine; }, monkeys7, get isle7Seen(){ return isle7Seen; }, get isle7Stage(){ return isle7Stage; }, set isle7Stage(v){ isle7Stage = v; }, get portalOpen(){ return portalOpen; }, boss7, roofMonkeys, hordes, forgotten, lancers, allies, bonesPal, cat, warrior, get catAt(){ return catAt(); }, deep, cth, get isle6Stage(){ return isle6Stage; }, set isle6Stage(v){ isle6Stage = v; }, get isle5Seen(){ return isle5Seen; }, get isle6Seen(){ return isle6Seen; }, get chests6(){ return chests6; }, CHESTS6, king, get isle5Stage(){ return isle5Stage; }, isle4Look, anchorer, tarbaby, get isle4Stage(){ return isle4Stage; }, set isle4Stage(v){ isle4Stage = v; }, get isle3Seen(){ return isle3Seen; }, get isle3Stage(){ return isle3Stage; }, boss3, swordsman, demons, demonMonkeys, warlock, wboat, rare, lev, leviathan, turtles, get turtleSwims(){ return turtleSwims; }, cthulu, angler, gulper, driven, get harpoonTarget(){ const t = harpoonTarget(); return t ? t.k : null; }, fireHarpoon, shallows, monkeys, floors, boss, get floor(){ return floor; }, get towerTaken(){ return towerTaken; }, get hearts(){ return hearts; }, get masks(){ return masks; }, get spear(){ return spear; }, set spear(v){ spear = v; refreshShop(); }, get swallowing(){ return swallowT > 0; }, get hp(){ return hp; }, walker, get dogAt(){ const d = pets.dog; return d ? [px(d.x, d.y), py(d.x, d.y, d.z + 12)] : null; }, get petted(){ return petted; }, jellies, pets, whales, mantas, snook, get fight(){return fight;}, SNOOK_SPOT, gear, set coins(v){coins=v; hud(); refreshShop();}, get day(){return day;}, first, get earned(){return earned;}, set earned(v){earned=v;}, get market(){return market;}, get clock(){return clock;}, set clock(v){clock=v;}, get keys(){return keyMode;}, set keys(v){keyMode=v; keysLabel();}, get ambience(){return !!ambience;}, get phase(){return phase;}, boat, net, schools, pirate, sharks, flotsam, drift, pods: dolphins.pods, lv, DOCK, set build(v){build=v;}, set wood(v){wood=v; hudWood(); refreshShop();}, get hold(){return holdTotal;}, get coins(){return coins;}};
})();
