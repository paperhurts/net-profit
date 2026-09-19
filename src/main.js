// The prototype game script, moved here verbatim from index.html so Vite can
// serve and bundle it. Phase 1 of project.md splits it into modules; until
// then it is not linted or type-checked, and legacy/net-profit.html stays the
// behavioural reference.
import { baseZoom, dirToWorld, onScreen as isoOnScreen, screenX, screenY } from './core/iso';
import { COST, DAY_LEN, HOLD, MAXLV, NETW, PAINTS, PIRATE_SPEED, PIRATE_UNLOCK, RING_R, SHARK, SPECIES, SPEED, STAGES, TIER_NAME } from './data/tuning';
import { angDiff, clamp, rng } from './core/math';
import { rgba, shade } from './core/color';
import { guidePage } from './data/guide';
import { buyer, FISHMONGER_STAGE, NO_PICK, pickMarket, salePrice, SMOKEHOUSE_STAGE, vendorsOpen } from './data/vendors';
import { hullScale, levelCap, paintsUnlocked, rangeOf, tierOf } from './data/progression';
import { advanceClock, dayState, PHASE_COLOR as PHASE_C } from './world/daycycle';
import { parseSave, SAVE_KEY, serializeSave } from './state/save';
import { around, CRATE, DOCK, IR, IX, IY, PIER, PIER_BUMPS, pushOut, PX0, SMOKEHOUSE, STALL, TWX, TWY, TX, TY, WS } from './world/island';
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
import { Pets } from './entities/pets';
import { Leviathan } from './entities/leviathan';
import { Pirate } from './entities/pirate';
import { Rare } from './entities/rare';
import { Sharks } from './entities/sharks';
import { Whales } from './entities/whales';
import { Scene } from './render/layers';
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
let coins = 0, earned = 0, muted = false, paint = 0, wood = 0, build = 0, carry = 0, levSeen = false, whaleSeen = false, keyMode = 'drive';
let clock = .13, dark = 0, warm = 0, phase = 'Day', lastPhase = 'Day', rangeToastT = 0;
const lv = {net:0, hold:0, engine:0};
const log = SPECIES.map(() => 0);
let order = {sp:0, n:8, have:0, pay:15}, market = NO_PICK, day = 1;
const first = new Array(SPECIES.length).fill(0); // the day each species was first landed
function noteFirst(sp){ if (!first[sp]) first[sp] = day; }
const SAVE_BOUNDS = {maxLevel: MAXLV, paints: PAINTS.length, stages: STAGES.length, species: SPECIES.length, worldSize: WS, holdCaps: HOLD};
let savedTrip = null;
{ let raw = null; try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  const s = parseSave(raw, SAVE_BOUNDS);
  coins = s.coins; earned = s.earned; muted = s.muted; lv.net = s.lv.net; lv.hold = s.lv.hold; lv.engine = s.lv.engine;
  paint = s.paint; levSeen = s.levSeen; whaleSeen = s.whaleSeen; wood = s.wood; build = s.build; s.log.forEach((n,i) => { log[i] = n; }); order = s.order; market = s.market; day = s.day; s.first.forEach((n,i) => { first[i] = n; }); savedTrip = s.trip; keyMode = s.keys; }
setMuted(muted);
function save(){ try { localStorage.setItem(SAVE_KEY, serializeSave({coins, earned, muted, lv, paint, log, order, wood, build, market, day, first, levSeen, whaleSeen, trip: tripSnapshot() || null, keys: keyMode})); } catch (e) {} }
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
const cam = {x: boat.x, y: boat.y};

/* ---------- view ---------- */
let W = 0, H = 0, DPR = 1, Z = 1, shx = 0, shy = 0, viewDY = 0, dockView = 0;
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
const schools = [];
(function buildSchools(){
  const R = rng(11);
  function ringOf(n,r0,r1,sp,count,rad,base,night){
    for (let i=0;i<n;i++){
      const ang = base + i*(Math.PI*2/n) + (i ? (R()-.5)*.5 : 0);
      const r = r0 + R()*(r1-r0);
      const sc = {ax: clamp(IX+Math.cos(ang)*r,220,WS-220), ay: clamp(IY+Math.sin(ang)*r,220,WS-220),
        cx:0, cy:0, r:rad, sp, n:count, alive:count, p:R()*9, q:R()*9, spin:(R()<.5?-1:1)*(.05+R()*.05), fish:[]};
      sc.cx = sc.ax; sc.cy = sc.ay;
      for (let j=0;j<count;j++){
        const a = R()*Math.PI*2, d = Math.sqrt(R())*rad;
        sc.fish.push({ox:Math.cos(a)*d, oy:Math.sin(a)*d, ph:R()*9, w:.8+R()*.9, a:9+R()*14,
          alive:true, grow:1, resp:0, x:sc.ax, y:sc.ay, ang:0});
      }
      sc.night = !!night; schools.push(sc);
    }
  }
  ringOf(5, 560, 700, 0, 46, 105, .3);
  ringOf(5, 900, 1060, 1, 42, 105, 1.1);
  ringOf(5, 1260, 1440, 2, 40, 100, .6);
  ringOf(4, 1620, 1780, 3, 20, 80, 2.0);
  ringOf(4, 1960, 2120, 4, 26, 110, .2);
  ringOf(4, 2280, 2440, 5, 26, 85, 1.4);
  ringOf(2, 2850, 3150, 6, 24, 80, Math.PI/4);
  ringOf(4, 950, 1450, 8, 30, 95, .9, true);
  ringOf(3, 1900, 2450, 9, 26, 90, 2.6, true);
})();
const buoys = [];
for (let i=0;i<=WS;i+=260){ buoys.push([i,0],[i,WS]); if (i && i<WS) buoys.push([0,i],[WS,i]); }

function resetNet(){ placeNetBehind(net, boat, bk(), towLen()); }
const sharksEntity = new Sharks(schools); const sharks = sharksEntity.sharks;
const gullsEntity = new Gulls(schools, boat), boatGulls = gullsEntity.gulls;
const world = { T: 0, started: false, docked: false, boat, rng: Math.random, net, // what entities may read; the getters stay live
  get earned(){ return earned; }, get holdTotal(){ return holdTotal; }, get hullScale(){ return bk(); },
  get netWidth(){ return NETW[lv.net]; }, get netLevel(){ return lv.net; }, get holdCap(){ return HOLD[lv.hold]; }, get escorted(){ return dolphins.escorted; }, get range(){ return range(); }, get tier(){ return tier(); }, get netFouled(){ return jellies.inNet > 0; }, get build(){ return build; } };
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
const whales = new Whales(Math.random);
whales.onSight = () => { if (!whaleSeen){ whaleSeen = true; save(); toast('A whale and her calf. Ease off and listen.', 3800, 1); } };
const jellies = new Jellies();
jellies.onFoul = () => { toast('Jellyfish in the net. Nothing else will stay in it until you shake them out at the dock.', 3400, 1); sfx.jellies(); };
const pets = new Pets(build); let dogToastT = 0;
pets.onEarn = () => toast('A dog has come to live on the pier. It barks when pirates are about.', 3600, 1);
pets.onBark = () => { sfx.bark(); if (dogToastT <= 0){ dogToastT = 60; toast('The dog is barking at the horizon. Pirates are about.', 3200, 1); } };
pirateEntity.onProwl = () => pets.alert();
// One list, one order, for updating and for z within a layer: the prototype's update order, then what came after.
const scene = new Scene();
for (const e of [rareEntity, leviathan, whales, pirateEntity, gullsEntity, dolphins, sharksEntity, crates, driftwood, jellies, pets]) scene.add(e);
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
  if (m){ elToast.textContent = m; elToast.classList.add('show'); } else elToast.classList.remove('show'); }
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
  refreshBuild(); refreshMarket();
  $('log').innerHTML = SPECIES.map((S,i) => `<span class="chip${log[i]?'':' unk'}${S.rare&&log[i]?' gold':''}" title="${log[i]?S.name:'Not caught yet'}">${FISH_SVG(log[i]?S.c:'currentColor')}${log[i]||'?'}</span>`).join('')
    + `<span class="chip${levSeen?' gold':' unk'}">${levSeen?'Leviathan sighted':'Something bigger?'}</span>`
    + `<span class="chip${whaleSeen?' gold':' unk'}">${whaleSeen?'Whales sighted':'A song, far out?'}</span>`;
}
const FISH_SVG = c => `<svg width="18" height="11" viewBox="0 0 22 14" aria-hidden="true"><path d="M1 7c3-5 9-7 14-3l5-3v12l-5-3C10 14 4 12 1 7z" fill="${c}" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/></svg>`;
const LOG_SVG = '<svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true"><rect x="1" y="2" width="18" height="8" rx="4" fill="#A9773F" stroke="#5E3D1C" stroke-width="1.5"/><circle cx="15.5" cy="6" r="1.8" fill="#E6B877"/></svg>';
function hudPhase(){ $('phase').innerHTML = `<i style="background:${PHASE_C[phase]}"></i><span>${phase}</span>`; }
function hudWood(){ $('wood').innerHTML = LOG_SVG + '<span>' + wood + '</span>'; }
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
const elGuide = $('guide');
const LEV_SVG = '<svg width="18" height="11" viewBox="0 0 22 14" aria-hidden="true"><ellipse cx="11" cy="7" rx="10" ry="4" fill="currentColor" opacity=".7"/></svg>';
function renderGuide(){
  const pages = SPECIES.map((S, sp) => { const g = guidePage(sp, log[sp], first[sp]);
    return `<article class="page${g.known ? '' : ' unk'}${g.known && S.rare ? ' gold' : ''}">${FISH_SVG(g.known ? S.c : 'currentColor')}<b>${g.name}</b><small>${g.blurb}</small>`
      + `<div class="facts"><span>${g.where}</span><span>${g.when}</span><span>${g.worth}</span><span>${g.caught}</span></div></article>`; });
  pages.push(`<article class="page${levSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${levSeen ? 'Leviathan' : '?'}</b><small>${levSeen
    ? 'Something enormous circles the island far out: a chain of shadows, the odd back breaking the surface, lit at night. You have felt it pass.'
    : 'Not seen yet. Something enormous circles the island, far out. Sail over it, and go at night.'}</small><div class="facts"><span>About 2,180 out</span><span>Day and night</span><span>Not for catching</span></div></article>`);
  pages.push(`<article class="page${whaleSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${whaleSeen ? 'Whale and calf' : '?'}</b><small>${whaleSeen
    ? 'A mother and her calf, round and round the far water. They come up to breathe, and they sing: she low, the calf higher. At night the song carries.'
    : 'Not seen yet. Listen out in the far water, best at night.'}</small><div class="facts"><span>1,750 to 2,250 out</span><span>Day and night</span><span>Not for catching</span></div></article>`);
  $('pages').innerHTML = pages.join('');
}
function openGuide(){ audio(); sfx.click(); renderGuide(); elGuide.hidden = false; }
function closeGuide(){ elGuide.hidden = true; sfx.click(); }
$('guideBtn').addEventListener('click', openGuide);
$('log').addEventListener('click', openGuide);
$('guideClose').addEventListener('click', closeGuide);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !elGuide.hidden) closeGuide(); });
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
  wood = 0; build = 0; carry = 0; hudWood(); levSeen = false; whaleSeen = false; rareEntity.reset(); jellies.reset(); pets.reset(); clock = .13;
  pirateEntity.reset();
  for (const sc of schools){ sc.alive = sc.n; for (const f of sc.fish){ f.alive = true; f.grow = 1; } }
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
  flies.push({x0:boat.x, y0:boat.y, z0:12, to: to === 'fishmonger' ? 'stall' : to === 'smokehouse' ? 'smoke' : 'crate', t:0, dur: to === 'dock' ? .3 : .45, c:SPECIES[sp].c, s:SPECIES[sp].s});
  sfx.sale(saleN, sp);
  if (sp === order.sp){ order.have++;
    if (order.have >= order.n){ coins += order.pay; earned += order.pay;
      addText(CRATE.x, CRATE.y, 70, 'Order filled +' + order.pay, '#9CF0C0', 20, 2.2);
      sfx.orderFilled();
      newOrder(); } else drawOrder(); }
  hud(); refreshShop();
}
function finishSale(){
  addText(CRATE.x, CRATE.y, 40, '+' + saleSum, C.coin, 26, 1.6);
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
  const toIsland = Math.hypot(boat.x-IX, boat.y-IY) - IR;
  let toPier = Infinity; for (const b of PIER_BUMPS) toPier = Math.min(toPier, Math.hypot(boat.x-b[0], boat.y-b[1]) - 30);
  const gulls = [];
  boatGulls.forEach(g => { if (g.a > .5) gulls.push({dx: g.x-boat.x, dy: g.y-boat.y}); });
  for (const sc of schools) if (sc.alive > 0 && onScreen(sc.cx, sc.cy, 0)) gulls.push({dx: sc.cx-boat.x, dy: sc.cy-boat.y});
  ambience.update(dt, {
    on: started && !muted, t: T, speedRatio: boat.v/SPEED[lv.engine], dockness: dockView, dark, phase,
    shoreDist: Math.max(0, Math.min(toIsland, toPier)), gulls,
    pods: dolphins.pods.map(p => ({dx: p.x-boat.x, dy: p.y-boat.y, dist: Math.hypot(p.x-boat.x, p.y-boat.y), escort: p.state === 'escort'})),
    whales: whales.all.map(w => ({dx: w.x-boat.x, dy: w.y-boat.y, dist: Math.hypot(w.x-boat.x, w.y-boat.y)})),
    sinceWhistle: T - lastWhistleT,
  });
}
function update(dt){
  T += dt; updateClock(dt);
  world.T = T; world.started = started; world.docked = docked;
  /* input and boat: the stick points; the keys drive or point, by setting */
  if (started && !joy.on && keyMode === 'drive'){
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
  boat.x = clamp(boat.x, 40, WS-40); boat.y = clamp(boat.y, 40, WS-40);
  { const R = range(), dI = Math.hypot(boat.x-IX, boat.y-IY); rangeToastT -= dt;
    if (dI > R){ boat.x = IX + (boat.x-IX)/dI*R; boat.y = IY + (boat.y-IY)/dI*R; boat.v *= .93;
      if (rangeToastT <= 0){ rangeToastT = 9; toast(`Too rough out there for a ${TIER_NAME[tier()]}. Grow your boat to sail further.`, 2800, 1); sfx.rangeEdge(); } } }

  /* net tows behind like a trailer */
  towNet(net, boat, k, towLen(), dt);

  /* fish */
  const cap = HOLD[lv.hold], nw = NETW[lv.net], rr = (nw*.5+5)*(nw*.5+5);
  net.torn = Math.max(0, net.torn - dt);
  const catching = started && net.speed > 22 && net.torn <= 0;
  comboT -= dt;
  for (const sc of schools){
    sc.cx = sc.ax + Math.sin(T*.05+sc.p)*60; sc.cy = sc.ay + Math.cos(T*.04+sc.q)*60;
    if (sc.night && dark < .5){ sc.vis = false; continue; }
    const near = Math.hypot(net.x-sc.cx, net.y-sc.cy) < sc.r + nw + 80;
    sc.vis = onScreen(sc.cx, sc.cy, (sc.r+80)*Z);
    const rot = T*sc.spin, cr = Math.cos(rot), sr = Math.sin(rot);
    for (const f of sc.fish){
      if (!f.alive){ if (T >= f.resp){ f.alive = true; f.grow = 0; sc.alive++; } else continue; }
      if (!near && !sc.vis) continue;
      if (f.grow < 1) f.grow = Math.min(1, f.grow + dt*1.3);
      const hx = f.ox*cr - f.oy*sr, hy = f.ox*sr + f.oy*cr;
      const x = sc.cx + hx + Math.cos(f.ph + T*f.w)*f.a, y = sc.cy + hy + Math.sin(f.ph*1.7 + T*f.w*1.3)*f.a*.7;
      const dx = x-f.x, dy = y-f.y;
      if (dx*dx+dy*dy > .0004 && dx*dx+dy*dy < 400) f.ang = Math.atan2((dx+dy)*.5, dx-dy);
      f.x = x; f.y = y;
      if (catching && near && !jellies.inNet && f.grow >= 1 && holdTotal < cap && !(sc.night && dark < .75)){
        const ex = x-net.x, ey = y-net.y; if (ex*ex+ey*ey < rr) catchFish(f,sc);
      }
    }
  }

  /* dock */
  const inDock = Math.hypot(boat.x-DOCK.x, boat.y-DOCK.y) < DOCK.r;
  if (inDock !== docked){ docked = inDock; elShop.classList.toggle('open', docked); elShop.setAttribute('aria-hidden', String(!docked)); if (docked){ refreshShop(); toasts.clear(); renderToast(); if (net.torn > 0){ net.torn = 0; addText(boat.x, boat.y, 40, 'Net mended', '#9CF0C0', 17, 1.4); }
    if (jellies.inNet){ const n = jellies.shakeOut(); toast(n === 1 ? 'Shook a jellyfish out of the net.' : `Shook ${n} jellyfish out of the net.`, 2400); sfx.jelliesOut(); } } }
  if (docked && holdTotal > 0){
    sellT -= dt;
    while (sellT <= 0 && holdTotal > 0){ sellOne(); sellT += .045; }
    if (holdTotal === 0) finishSale();
  } else sellT = 0;

  dolphinToastT -= dt; dogToastT -= dt; scene.update(dt, world);
  for (let i=sparks.length-1;i>=0;i--){ const q = sparks[i]; q.age += dt; q.x += q.vx*dt; q.y += q.vy*dt; q.z += q.vz*dt; q.vz -= 120*dt; if (q.age > q.life) sparks.splice(i,1); }
  Z += (Zbase*(1 - .02*tier())*(1 - .2*dockView) - Z)*Math.min(1, dt*4);

  /* bits */
  wakeT -= dt;
  if (wakeT <= 0){ wakeT = .06; emitWake(boat,k); if (pirate.state !== 'away') emitWake(pirate,1.3); }
  for (let i=wakes.length-1;i>=0;i--){ const w = wakes[i]; w.age += dt; w.x += w.vx*dt; w.y += w.vy*dt; if (w.age > w.life) wakes.splice(i,1); }
  for (let i=flies.length-1;i>=0;i--){ const f = flies[i]; f.t += dt/f.dur; if (f.t >= 1) flies.splice(i,1); }
  for (let i=texts.length-1;i>=0;i--){ const t = texts[i]; t.age += dt; if (t.age > t.life) texts.splice(i,1); }
  shake = Math.max(0, shake - dt*2.5);
  shx = (Math.random()-.5)*shake*14; shy = (Math.random()-.5)*shake*14;

  /* camera leads the boat a little */
  let lx = boat.x + Math.cos(boat.h)*boat.v*.3, ly = boat.y + Math.sin(boat.h)*boat.v*.3;
  dockView += ((docked && boat.v < 70 ? 1 : 0) - dockView)*Math.min(1, dt*1.6);
  const w = .4*dockView; lx = lx*(1-w) + TX*w; ly = ly*(1-w) + (TY-30)*w;
  viewDY = -Math.min(150, H*.17)*dockView;
  cam.x += (lx-cam.x)*Math.min(1, dt*3.5); cam.y += (ly-cam.y)*Math.min(1, dt*3.5);
}

/* ---------- drawing ---------- */
function drawSea(){
  ctx.fillStyle = C.abyss; ctx.fillRect(0,0,W,H);
  polyPath([[0,0],[WS,0],[WS,WS],[0,WS]],0); ctx.fillStyle = C.lagoon; ctx.fill();
  ctx.save(); ctx.clip();
  isoEllipse(IX,IY,2250); ctx.fillStyle = '#30949F'; ctx.fill();
  isoEllipse(IX,IY,1600); ctx.fillStyle = C.mid; ctx.fill();
  isoEllipse(IX,IY,880);  ctx.fillStyle = C.shallow; ctx.fill();
  isoEllipse(IX,IY,IR+150); ctx.fillStyle = C.shore; ctx.fill();
  ctx.restore();

  /* wave glints across the visible patch of world */
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const c of [[0,0],[W,0],[W,H],[0,H]]){
    const w = dirToWorld((c[0]-W/2)/Z, (c[1]-H/2)/Z); const wx = cam.x+w[0], wy = cam.y+w[1];
    x0 = Math.min(x0,wx); x1 = Math.max(x1,wx); y0 = Math.min(y0,wy); y1 = Math.max(y1,wy);
  }
  const G = 130; ctx.strokeStyle = C.foam; ctx.lineWidth = 2*Z; ctx.lineCap = 'round';
  for (let gx = Math.max(0,Math.floor(x0/G)*G); gx <= Math.min(WS,x1); gx += G){
    for (let gy = Math.max(0,Math.floor(y0/G)*G); gy <= Math.min(WS,y1); gy += G){
      const hsh = Math.sin(gx*12.9898+gy*78.233)*43758.5453, r = hsh - Math.floor(hsh);
      const wx = gx + r*90, wy = gy + ((r*7)%1)*90;
      if (Math.hypot(wx-IX, wy-IY) < IR+30) continue;
      const sx = px(wx,wy), sy = py(wx,wy); if (sx<-20||sx>W+20||sy<-20||sy>H+20) continue;
      const ph = Math.sin(T*1.1 + r*30);
      ctx.globalAlpha = .1 + .16*(ph*.5+.5);
      ctx.beginPath(); ctx.ellipse(sx + ph*5*Z, sy, 11*Z, 4*Z, 0, Math.PI*1.12, Math.PI*1.88); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  /* how far this boat can go */
  { const R = range(); if (R < 1e8){ const dI = Math.hypot(boat.x-IX, boat.y-IY), hot = dI > R-260;
    isoEllipse(IX,IY,R); ctx.setLineDash([16*Z,14*Z]); ctx.strokeStyle = hot ? '#FF9A8A' : C.foam; ctx.globalAlpha = hot ? .85 : .3; ctx.lineWidth = (hot?3:2)*Z; ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; } }

  /* island, flat parts */
  isoEllipse(IX,IY,IR+9+Math.sin(T*1.3)*3); ctx.strokeStyle = C.foam; ctx.globalAlpha = .7; ctx.lineWidth = 4*Z; ctx.stroke(); ctx.globalAlpha = 1;
  isoEllipse(IX,IY,IR); ctx.fillStyle = C.sand; ctx.fill();
  isoEllipse(IX-25,IY-12,150); ctx.fillStyle = C.grass; ctx.fill();

  /* dock zone */
  isoEllipse(DOCK.x,DOCK.y,DOCK.r);
  ctx.setLineDash([10*Z,9*Z]); ctx.lineDashOffset = holdTotal ? -T*26 : 0;
  ctx.strokeStyle = holdTotal ? C.coin : C.foam; ctx.globalAlpha = holdTotal ? .95 : .45; ctx.lineWidth = 3*Z; ctx.stroke();
  ctx.setLineDash([]); ctx.globalAlpha = 1;
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
  scene.draw(drawView, 'glow');
  for (const q of sparks){ ctx.globalAlpha = 1 - q.age/q.life; ctx.fillStyle = Math.random() < .5 ? '#FFFFFF' : '#FFE58A'; star(px(q.x,q.y), py(q.x,q.y,q.z), 4*Z); } ctx.globalAlpha = 1;
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
  ctx.beginPath(); ctx.moveTo(mx,myT); ctx.lineTo(mx-15*Z*k, myT+5*Z*k+fw); ctx.lineTo(mx, myT+10*Z*k); ctx.closePath();
  ctx.fillStyle = o.flag; ctx.fill();
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
function flagAt(x,y,z,c){ const sx = px(x,y), sy = py(x,y,z), w = Math.sin(T*5+x)*2*Z;
  ctx.strokeStyle = C.wood; ctx.lineWidth = 1.8*Z; ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx,sy-16*Z); ctx.stroke();
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
    box(TX-19,TY-19,38,38,98,102,'#C9483B','#DB5B4C'); if (build < 5) flagAt(TX,TY,102,PAINTS[paint].hull); }
  if (build >= 5){ const dx = px(TX,TY), dy = py(TX,TY,102);
    ctx.fillStyle = '#C9982A'; ctx.beginPath(); ctx.ellipse(dx,dy,16*Z,8*Z,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#F0C544'; ctx.beginPath(); ctx.ellipse(dx,dy,16*Z,19*Z,0,Math.PI,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFE58A'; ctx.beginPath(); ctx.ellipse(dx-5*Z,dy-9*Z,3.5*Z,7*Z,.4,0,Math.PI*2); ctx.fill();
    flagAt(TX,TY,121,PAINTS[paint].hull);
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
    flagAt(TWX+9,TWY+9,162,PAINTS[paint].hull);
  } else flagAt(TWX+9,TWY+9,125,PAINTS[paint].hull);
}
function drawBird(x,y,z,flap,k,alpha){
  ctx.globalAlpha = .13*alpha; ctx.fillStyle = '#0A2A33'; isoEllipse(x,y,6*k); ctx.fill();
  const sx = px(x,y), sy = py(x,y,z), w = 10*Z*k, h = Math.sin(flap)*5*Z*k;
  const path = () => { ctx.beginPath(); ctx.moveTo(sx-w,sy-h); ctx.quadraticCurveTo(sx-w*.45,sy-4*Z*k-h*.3,sx,sy); ctx.quadraticCurveTo(sx+w*.45,sy-4*Z*k-h*.3,sx+w,sy-h); };
  ctx.lineCap = 'round'; ctx.globalAlpha = .3*alpha; ctx.strokeStyle = C.ink; ctx.lineWidth = 4*Z*k; path(); ctx.stroke();
  ctx.globalAlpha = alpha; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.3*Z*k; path(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx,sy,2*Z*k,0,Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
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
function drawWorldObjects(){
  const list = [
    {d: (IX+80)+(IY-70), f: () => { box(IX+20,IY-120,60,50,0,38,'#FFF1D6','#FFF1D6'); box(IX+14,IY-126,72,62,38,47,C.hull,shade(C.hull,1.12)); perched(IX+30,IY-72,47); }},
    {d: (IX+118)+(IY-30), f: () => drawPalm(IX+118,IY-30,10)},
    {d: (IX-150)+(IY-70), f: () => drawPalm(IX-150,IY-70,-8)},
    {d: (IX+50)+(IY+125), f: () => drawPalm(IX+50,IY+125,7)},
    {d: TX+TY+30, f: drawBigTree},
    {d: TWX+TWY+18, f: drawTower},
    {d: boat.x+boat.y, f: () => {
      let tint = '#DCEBEE'; for (let i=SPECIES.length-1;i>0;i--) if (hold[i]){ tint = SPECIES[i].c; break; }
      const P = PAINTS[paint];
      drawShip(boat, {scale:bk(), tier:tier(), hull:P.hull, trim:P.trim, deck:C.deck, cabin:C.cabin, roof:P.roof, mast:C.wood, flag:P.flag,
        heap: holdTotal/HOLD[lv.hold], heapTint: tint}); }},
    {d: boat.x+boat.y + (boat.y < IY ? 1 : -1), f: drawPier}
  ];
  if (build >= FISHMONGER_STAGE) list.push({d: STALL.x+STALL.y, f: drawStall});
  if (build >= SMOKEHOUSE_STAGE) list.push({d: SMOKEHOUSE.x+SMOKEHOUSE.y, f: drawSmokehouse});
  list.push(...scene.solids(drawView));
  list.sort((a,b) => a.d-b.d); for (const o of list) o.f();
}
function drawBuoys(){
  for (let i=0;i<buoys.length;i++){ const b = buoys[i]; if (!onScreen(b[0],b[1],30)) continue;
    const z = Math.sin(T*2+i)*1.5; isoEllipse(b[0],b[1],7,0); ctx.fillStyle = 'rgba(8,40,52,.25)'; ctx.fill();
    const x = px(b[0],b[1]), y = py(b[0],b[1],4+z);
    ctx.fillStyle = C.hull; ctx.beginPath(); ctx.arc(x,y,5.5*Z,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = C.trim; ctx.beginPath(); ctx.arc(x,y-2.5*Z,2.6*Z,0,Math.PI*2); ctx.fill(); }
}
function drawFlies(){
  for (const f of flies){ if (f.t < 0) continue;
    const tgt = f.to === 'boat' ? [boat.x-Math.cos(boat.h)*16*bk(), boat.y-Math.sin(boat.h)*16*bk(), 12*bk()] : f.to === 'crate' ? [CRATE.x,CRATE.y,26] : f.to === 'stall' ? [STALL.x,STALL.y,18] : f.to === 'smoke' ? [SMOKEHOUSE.x,SMOKEHOUSE.y,20] : [pirate.x,pirate.y,16];
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
  const x = px(wx,wy), y = py(wx,wy), m = 32, top = 100, bot = docked ? 300 : m;
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
  else { ctx.fillStyle = kind; ctx.beginPath(); ctx.ellipse(ix+2,iy,7,3.6,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ix-4,iy); ctx.lineTo(ix-10,iy-4.5); ctx.lineTo(ix-10,iy+4.5); ctx.closePath(); ctx.fill(); }
}
function draw(){
  drawView.zoom = Z; drawView.dark = dark; drawView.T = T;
  ctx.setTransform(DPR,0,0,DPR,0,0); placed.length = 0;
  ctx.lineJoin = 'round';
  drawSea(); scene.draw(drawView, 'underwater'); drawFish(); scene.draw(drawView, 'surface'); drawWakes(); drawNet(); drawBuoys(); scene.draw(drawView, 'afloat'); drawWorldObjects(); scene.draw(drawView, 'air'); drawFlies();

  if (dark > .01 || warm > .01) drawNight();
  drawGlow();

  drawTexts();

  const full = holdTotal >= HOLD[lv.hold];
  if (!docked) indicator(DOCK.x, DOCK.y, full ? C.coin : C.trim, 'dock', full);
  if (!full && started){
    let best = null, bd = 1e9, anyVis = false, want = null, wd = 1e9, wantVis = false;
    const R = range();
    for (const sc of schools){ if (sc.alive < sc.n*.35 || (sc.night && dark < .75) || Math.hypot(sc.cx-IX, sc.cy-IY) > R-40) continue;
      const d = Math.hypot(sc.cx-boat.x, sc.cy-boat.y);
      if (sc.sp === order.sp){ if (sc.vis) wantVis = true; else if (d < wd){ wd = d; want = sc; } }
      if (sc.vis) anyVis = true; else if (d < bd){ bd = d; best = sc; } }
    if (want && !wantVis) indicator(want.cx, want.cy, C.coin, SPECIES[want.sp].c, false);
    else if (!anyVis && best) indicator(best.cx, best.cy, '#1F6B7A', SPECIES[best.sp].c, false);
  }
  scene.draw(drawView, 'overlay');

  if (joy.on && started){
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(joy.sx,joy.sy,JR,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(joy.x,joy.y,20,0,Math.PI*2); ctx.fill();
  }
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
window.__np = {rare, lev, jellies, pets, whales, get day(){return day;}, first, get earned(){return earned;}, set earned(v){earned=v;}, get market(){return market;}, get clock(){return clock;}, set clock(v){clock=v;}, get keys(){return keyMode;}, set keys(v){keyMode=v; keysLabel();}, get ambience(){return !!ambience;}, get phase(){return phase;}, boat, net, schools, pirate, sharks, flotsam, drift, pods: dolphins.pods, lv, DOCK, set build(v){build=v;}, set wood(v){wood=v; hudWood(); refreshShop();}, get hold(){return holdTotal;}, get coins(){return coins;}};
})();
