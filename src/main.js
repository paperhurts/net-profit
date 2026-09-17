// The prototype game script, moved here verbatim from index.html so Vite can
// serve and bundle it. Phase 1 of project.md splits it into modules; until
// then it is not linted or type-checked, and legacy/net-profit.html stays the
// behavioural reference.
import { baseZoom, dirToWorld, onScreen as isoOnScreen, screenX, screenY } from './core/iso';
import { COST, DAY_LEN, HOLD, MAXLV, NETW, PAINTS, PIRATE_SPEED, PIRATE_UNLOCK, RING_R, SHARK, SPECIES, SPEED, STAGES, TIER_NAME } from './data/tuning';
import { angDiff, clamp, rng } from './core/math';
import { rgba, shade } from './core/color';
import { hullScale, levelCap, paintsUnlocked, rangeOf, tierOf } from './data/progression';
import { advanceClock, dayState, PHASE_COLOR as PHASE_C } from './world/daycycle';
import { parseSave, SAVE_KEY, serializeSave } from './state/save';
import { around, CRATE, DOCK, IR, IX, IY, PIER, PIER_BUMPS, pushOut, PX0, TWX, TWY, TX, TY, WS } from './world/island';
import { placeNetBehind, towLength, towNet } from './entities/net';
import { bindJoystick, createJoystick, JR, joystickVector } from './input/joystick';
import { bindKeys, keyControls, keyVector, smoothVector } from './input/keys';
import { steerBoat, steerBoatRelative } from './entities/boat';
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
let coins = 0, earned = 0, muted = false, paint = 0, wood = 0, build = 0, carry = 0, levSeen = false, keyMode = 'drive';
let clock = .13, dark = 0, warm = 0, phase = 'Day', lastPhase = 'Day', rangeToastT = 0, rareFullT = 0;
const lv = {net:0, hold:0, engine:0};
const log = SPECIES.map(() => 0);
let order = {sp:0, n:8, have:0, pay:15};
const SAVE_BOUNDS = {maxLevel: MAXLV, paints: PAINTS.length, stages: STAGES.length, species: SPECIES.length, worldSize: WS, holdCaps: HOLD};
let savedTrip = null;
{ let raw = null; try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  const s = parseSave(raw, SAVE_BOUNDS);
  coins = s.coins; earned = s.earned; muted = s.muted; lv.net = s.lv.net; lv.hold = s.lv.hold; lv.engine = s.lv.engine;
  paint = s.paint; levSeen = s.levSeen; wood = s.wood; build = s.build; s.log.forEach((n,i) => { log[i] = n; }); order = s.order; savedTrip = s.trip; keyMode = s.keys; }
function save(){ try { localStorage.setItem(SAVE_KEY, serializeSave({coins, earned, muted, lv, paint, log, order, wood, build, levSeen, trip: tripSnapshot() || null, keys: keyMode})); } catch (e) {} }
// The trip is what a phone loses when it discards a backgrounded tab: where the boat is, what time it is, what is in the hold.
function tripSnapshot(){ return started ? {x: Math.round(boat.x), y: Math.round(boat.y), h: +boat.h.toFixed(3), clock: +clock.toFixed(4), hold: hold.slice()} : (savedTrip || undefined); }

let T = 0, started = false, docked = false, sellT = 0, saleSum = 0, saleN = 0;
let combo = 0, comboT = 0, shake = 0, wakeT = 0;
const hold = SPECIES.map(() => 0); let holdTotal = 0;
const boat = {x: DOCK.x+125, y: IY+125, h: .45, v: 0};
const net = {x:0, y:0, speed:0, torn:0};
let Zbase = 1, sharkWarnT = 0;
const pirate = {state:'away', timer:6, x:0, y:0, h:0, v:0, tx:0, ty:0, age:0, warned:0};
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
let ac = null;
function audio(){ if (!ac){ try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (ac && ac.state === 'suspended') ac.resume(); }
function tone(f,d=.12,type='sine',vol=.1,slide=0,delay=0){
  if (!ac || muted) return;
  try {
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f,t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40,f*slide),t+d);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+.012); g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+d+.03);
  } catch (e) {}
}

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
const sharks = [];
(function(){ const want = {4:2, 5:2, 6:2}, cnt = {};
  for (const sc of schools){ cnt[sc.sp] = cnt[sc.sp] || 0; if (cnt[sc.sp] < (want[sc.sp]||0)){ cnt[sc.sp]++;
    sharks.push({home:sc, a:Math.random()*6.28, x:sc.ax, y:sc.ay, ang:0, state:'circle', t:0, cool:0, alive:true, resp:0}); } } })();
const flotsam = [];
function placeFlotsam(f, near=.5){
  if (Math.random() < near){ const a = Math.random()*6.28, R = Math.min(range()-60, 2300), r = 560 + Math.random()*Math.max(120, R-560);
    f.x = clamp(IX+Math.cos(a)*r,160,WS-160); f.y = clamp(IY+Math.sin(a)*r,160,WS-160); return; }
  do { f.x = 160 + Math.random()*(WS-320); f.y = 160 + Math.random()*(WS-320); } while (Math.hypot(f.x-IX, f.y-IY) < 560); }
for (let i=0;i<10;i++){ const f = {x:0, y:0, alive:true, resp:0, ph:Math.random()*9}; placeFlotsam(f); flotsam.push(f); }
const drift = [];
for (let i=0;i<22;i++){ const f = {x:0, y:0, alive:true, resp:0, ph:Math.random()*9, rot:Math.random()*6.28}; placeFlotsam(f, .65); drift.push(f); }
const boatGulls = [0,1,2,3].map(() => ({x:boat.x, y:boat.y, a:0}));
const pods = [0,1].map(i => ({x:IX + (i?-1:1)*900, y:IY + (i?700:-800), tx:IX, ty:IY, h:0, state:'roam', t:0, cool:0, side:1,
  d:[{ox:0,oy:0,p:0},{ox:-30,oy:26,p:2.1},{ox:-36,oy:-24,p:4.2}]}));
let escorted = false, dolphinToastT = 0;
const rare = {on:false, sp:10, x:0, y:0, tx:0, ty:0, t:0, ang:0};
const LEV_N = 28, lev = {th:Math.random()*6.28, x:0, y:0, trail:[], rumbleT:0};
function levPos(th){ const A = 2180, c = Math.cos(th), sn = Math.sin(th);
  return [IX + A*Math.sign(c)*Math.sqrt(Math.abs(c)), IY + A*Math.sign(sn)*Math.sqrt(Math.abs(sn))]; }
for (let i=0;i<LEV_N;i++) lev.trail.push(levPos(lev.th - i*.016));
lev.x = lev.trail[0][0]; lev.y = lev.trail[0][1];
function podWaypoint(p){ const a = Math.random()*6.28, r = 700 + Math.random()*1600; p.tx = clamp(IX+Math.cos(a)*r,200,WS-200); p.ty = clamp(IY+Math.sin(a)*r,200,WS-200); }
pods.forEach(podWaypoint);
function towLen(){ return towLength(NETW[lv.net]); }
resetNet();

/* ---------- input ---------- */
const joy = createJoystick();
const keys = new Set();
const keySmooth = {x:0, y:0};
const elKeys = $('keys');
function keysLabel(){ elKeys.textContent = keyMode === 'drive' ? '⌨ drive' : '⌨ point'; elKeys.setAttribute('aria-label', keyMode === 'drive' ? 'Keys drive the boat' : 'Keys point the boat'); }
function showKeys(){ elKeys.hidden = false; }
elKeys.addEventListener('click', () => { keyMode = keyMode === 'drive' ? 'point' : 'drive'; keysLabel(); save(); audio(); tone(700,.08,'triangle',.08);
  toast(keyMode === 'drive' ? 'Keys drive the boat. A and D turn, W throttle, S brakes.' : 'Keys point the boat. Hold a direction and it goes that way.', 3200); });
// The keyboard button is noise on a phone: show it where a mouse lives, or once a key is pressed.
if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) showKeys();
bindJoystick(cv, joy, audio);
bindKeys(window, keys, () => { audio(); showKeys(); });
window.addEventListener('blur', () => { keys.clear(); joy.on = false; });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });
window.addEventListener('pagehide', () => save());

/* ---------- HUD ---------- */
const elCoins = $('coins'), elHoldTxt = $('holdTxt'), elHoldBar = $('holdBar'), elHoldPill = $('holdPill');
const elToast = $('toast'), elShop = $('shop'), elSnd = $('snd'), elRst = $('rst');
let toastTimer = 0;
function toast(msg, ms=2600){ elToast.textContent = msg; elToast.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elToast.classList.remove('show'), ms); }
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
  refreshBuild();
  $('log').innerHTML = SPECIES.map((S,i) => `<span class="chip${log[i]?'':' unk'}${S.rare&&log[i]?' gold':''}" title="${log[i]?S.name:'Not caught yet'}">${FISH_SVG(log[i]?S.c:'currentColor')}${log[i]||'?'}</span>`).join('')
    + `<span class="chip${levSeen?' gold':' unk'}">${levSeen?'Leviathan sighted':'Something bigger?'}</span>`;
}
const FISH_SVG = c => `<svg width="18" height="11" viewBox="0 0 22 14" aria-hidden="true"><path d="M1 7c3-5 9-7 14-3l5-3v12l-5-3C10 14 4 12 1 7z" fill="${c}" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/></svg>`;
const LOG_SVG = '<svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true"><rect x="1" y="2" width="18" height="8" rx="4" fill="#A9773F" stroke="#5E3D1C" stroke-width="1.5"/><circle cx="15.5" cy="6" r="1.8" fill="#E6B877"/></svg>';
function hudPhase(){ $('phase').innerHTML = `<i style="background:${PHASE_C[phase]}"></i><span>${phase}</span>`; }
function hudWood(){ $('wood').innerHTML = LOG_SVG + '<span>' + wood + '</span>'; }
function refreshBuild(){
  const b = $('build'), mult = Math.round(build*15);
  if (build >= STAGES.length){ b.setAttribute('aria-disabled','true');
    b.innerHTML = `<span><b>Your palace is finished</b><small>All fish sell for ${mult}% more.</small></span>`; return; }
  const S = STAGES[build], ok = wood >= S.wood && coins >= S.coins;
  const note = wood < S.wood ? `You have ${wood} of ${S.wood} driftwood.` : coins < S.coins ? `You need ${S.coins - coins} more coins.` : `Fish sell for ${mult+15}% more${build < 3 ? '. Unlocks the next upgrade level' : ''}.`;
  b.setAttribute('aria-disabled', ok ? 'false' : 'true');
  b.innerHTML = `<span><b>Build the ${S.name}</b><small>${note}</small></span><span class="buy">${S.wood} driftwood${S.coins ? ' and ' + S.coins + ' coins' : ''}</span>`;
}
function drawOrder(){
  const S = SPECIES[order.sp];
  $('order').innerHTML = `${FISH_SVG(S.c)}<span>${order.n} ${S.pl} pays ${order.pay}</span><b>${Math.min(order.have,order.n)}/${order.n}</b>`;
}
function newOrder(){
  let top = 0; for (let i=0;i<SHARK;i++) if (log[i] > 0) top = i;
  top = Math.min(SHARK-1, top+1); while (top > 0 && RING_R[top] + 120 > range()) top--;
  let sp = Math.max(Math.floor(Math.random()*(top+1)), Math.floor(Math.random()*(top+1)));
  if (sp === order.sp && top > 0) sp = (sp + 1) % (top+1);
  const n = Math.max(4, Math.round((15 - sp*1.5)*(.7 + Math.random()*.6)));
  order = {sp, n, have:0, pay: Math.max(10, Math.round(n*SPECIES[sp].v*1.6/5)*5)};
  drawOrder();
}
elShop.addEventListener('click', e => {
  const b = e.target.closest('.up'); if (!b) return; audio();
  const k = b.dataset.k, l = lv[k]; if (l >= MAXLV) return;
  if (l >= levelCap(build)){ tone(180,.12,'square',.05); toast(`Build the ${STAGES[build].name} to unlock the next level.`, 2400); return; }
  const t0 = tier();
  const cost = COST[k][l];
  if (coins < cost){ tone(180,.12,'square',.05); toast(`You need ${cost - coins} more coins.`, 1600); return; }
  coins -= cost; lv[k]++;
  if (tier() > t0){
    const fresh = paintsUnlocked(t0); if (fresh < PAINTS.length) paint = fresh;
    toast(`Your boat grew into a ${TIER_NAME[tier()]}. New paint unlocked.`, 3000);
    tone(392,.12,'triangle',.1,0,.25); tone(523,.12,'triangle',.1,0,.35); tone(784,.3,'triangle',.1,0,.45);
  } else toast('Bought ' + b.querySelector('b').textContent.toLowerCase() + '.', 1600);
  save(); hud(); refreshShop(); resetNet();
  tone(523,.1,'triangle',.1); tone(659,.1,'triangle',.1,0,.08); tone(784,.16,'triangle',.1,0,.16);
});
function sndLabel(){ elSnd.classList.toggle('off', muted); elSnd.setAttribute('aria-label', muted ? 'Sound off' : 'Sound on'); }
elSnd.addEventListener('click', () => { muted = !muted; sndLabel(); save(); audio(); tone(660,.08,'triangle',.08); });
$('paints').addEventListener('click', e => {
  const b = e.target.closest('.sw'); if (!b) return; audio();
  const i = +b.dataset.i;
  if (i >= paintsUnlocked(tier())){ toast('More paint unlocks as your boat grows.', 1800); tone(180,.12,'square',.05); return; }
  paint = i; save(); refreshShop(); tone(700,.08,'triangle',.08);
});
$('build').addEventListener('click', () => { audio();
  if (build >= STAGES.length) return;
  const S = STAGES[build];
  if (wood < S.wood || coins < S.coins){ tone(180,.12,'square',.05);
    toast(wood < S.wood ? `Collect ${S.wood - wood} more driftwood out at sea.` : `You need ${S.coins - coins} more coins.`, 2000); return; }
  wood -= S.wood; coins -= S.coins; build++;
  addText(TX, TY, 130, 'Built the ' + S.name, '#9CF0C0', 22, 2.6);
  toast(`Built the ${S.name}. Fish now sell for ${build*15}% more.`, 3200);
  [523,659,784,1047].forEach((f,i) => tone(f,.16,'triangle',.1,0,i*.11));
  save(); hud(); hudWood(); refreshShop();
});
let rstTimer = 0;
elRst.addEventListener('click', () => {
  if (!elRst.classList.contains('sure')){
    elRst.classList.add('sure'); elRst.textContent = 'Start over?';
    rstTimer = setTimeout(() => { elRst.classList.remove('sure'); elRst.textContent = '↻'; }, 3000); return;
  }
  clearTimeout(rstTimer); elRst.classList.remove('sure'); elRst.textContent = '↻';
  coins = 0; earned = 0; lv.net = lv.hold = lv.engine = 0; hold.fill(0); holdTotal = 0; log.fill(0); paint = 0; net.torn = 0;
  order = {sp:0, n:8, have:0, pay:15}; drawOrder();
  for (const sh of sharks){ sh.alive = true; sh.state = 'circle'; sh.cool = 0; }
  boat.x = DOCK.x+125; boat.y = IY+125; boat.h = .45; boat.v = 0; resetNet();
  wood = 0; build = 0; carry = 0; hudWood(); levSeen = false; rare.on = false; clock = .13;
  pirate.state = 'away'; pirate.timer = 6;
  for (const sc of schools){ sc.alive = sc.n; for (const f of sc.fish){ f.alive = true; f.grow = 1; } }
  save(); hud(); refreshShop(); toast('Started over.', 1400);
});
$('go').addEventListener('click', () => { audio(); started = true; $('intro').classList.add('gone'); tone(392,.12,'triangle',.1); tone(587,.2,'triangle',.1,0,.1); });
sndLabel(); hud(); hudWood(); hudPhase(); refreshShop(); drawOrder();
keysLabel();

/* ---------- game logic ---------- */
function addText(x,y,z,txt,color,size=18,life=1.2){ texts.push({x,y,z,txt,color,size,age:0,life}); }

function catchFish(f,sc){
  f.alive = false; f.resp = T + 8 + Math.random()*9 + sc.sp*1.5; sc.alive--;
  hold[sc.sp]++; holdTotal++; log[sc.sp]++;
  flies.push({x0:f.x, y0:f.y, z0:0, to:'boat', t:0, dur:.32, c:SPECIES[sc.sp].c, s:SPECIES[sc.sp].s});
  combo = comboT > 0 ? Math.min(combo+1, 14) : 0; comboT = .5;
  tone(500 + combo*34 + sc.sp*60, .08, 'sine', .07);
  if (holdTotal >= HOLD[lv.hold]){ toast('Hold full. Head for the dock.'); tone(330,.18,'triangle',.1); tone(262,.25,'triangle',.1,0,.15); }
  hud();
}
function sellOne(){
  let sp = hold.findIndex(n => n > 0); if (sp < 0) return;
  hold[sp]--; holdTotal--;
  carry += SPECIES[sp].v*(1 + .15*build); const v = Math.floor(carry); carry -= v;
  coins += v; earned += v; saleSum += v; saleN++;
  flies.push({x0:boat.x, y0:boat.y, z0:12, to:'crate', t:0, dur:.3, c:SPECIES[sp].c, s:SPECIES[sp].s});
  tone(620 + Math.min(saleN,30)*16 + sp*40, .07, 'triangle', .07);
  if (sp === order.sp){ order.have++;
    if (order.have >= order.n){ coins += order.pay; earned += order.pay;
      addText(CRATE.x, CRATE.y, 70, 'Order filled +' + order.pay, '#9CF0C0', 20, 2.2);
      tone(659,.1,'triangle',.1,0,.1); tone(880,.1,'triangle',.1,0,.2); tone(1319,.3,'triangle',.1,0,.3);
      newOrder(); } else drawOrder(); }
  hud(); refreshShop();
}
function finishSale(){
  addText(CRATE.x, CRATE.y, 40, '+' + saleSum, C.coin, 26, 1.6);
  tone(880,.1,'triangle',.1); tone(1175,.22,'triangle',.1,0,.09);
  saleSum = 0; saleN = 0; save();
  if (earned >= PIRATE_UNLOCK && pirate.state === 'away' && !pirate.warned){
    pirate.warned = 1; setTimeout(() => toast('Word is out about your catch. Pirates are about.', 3400), 1700);
  }
}
function steerShip(s,tx,ty,maxV,turn,dt){
  const diff = angDiff(Math.atan2(ty-s.y, tx-s.x), s.h);
  s.h += clamp(diff, -turn*dt, turn*dt);
  const tv = maxV*Math.max(.3, Math.cos(diff));
  s.v += (tv - s.v)*Math.min(1, dt*1.6);
  s.x += Math.cos(s.h)*s.v*dt; s.y += Math.sin(s.h)*s.v*dt;
}
function nearestEdgeExit(x,y){
  const d = [x, WS-x, y, WS-y], m = Math.min(...d);
  if (m === d[0]) return [-260, y]; if (m === d[1]) return [WS+260, y];
  if (m === d[2]) return [x, -260]; return [x, WS+260];
}
function updatePirate(dt){
  const p = pirate;
  if (earned < PIRATE_UNLOCK) return;
  if (p.state === 'away'){
    p.timer -= dt; if (p.timer > 0) return;
    for (let i=0;i<12;i++){
      const side = Math.floor(Math.random()*4), t = 200 + Math.random()*(WS-400);
      const pt = side===0?[-200,t]:side===1?[WS+200,t]:side===2?[t,-200]:[t,WS+200];
      p.x = pt[0]; p.y = pt[1];
      if (Math.hypot(p.x-boat.x, p.y-boat.y) > 800) break;
    }
    p.h = Math.atan2(IY-p.y, IX-p.x); p.v = 60; p.state = 'prowl'; p.age = 0; p.tx = IX; p.ty = IY; return;
  }
  p.age += dt;
  const dBoat = Math.hypot(boat.x-p.x, boat.y-p.y);
  const boatSafe = Math.hypot(boat.x-DOCK.x, boat.y-DOCK.y) < 340;
  let tx = p.tx, ty = p.ty, speed = PIRATE_SPEED*.6;
  if (p.state === 'prowl'){
    if (Math.hypot(p.tx-p.x, p.ty-p.y) < 120 || p.age < .1){
      const a = Math.random()*Math.PI*2, r = 800 + Math.random()*1500;
      p.tx = clamp(IX+Math.cos(a)*r,150,WS-150); p.ty = clamp(IY+Math.sin(a)*r,150,WS-150);
    }
    tx = p.tx; ty = p.ty;
    if (holdTotal >= 4 && !boatSafe && dBoat < 720){
      p.state = 'chase'; toast('Pirates on your tail. Run for the dock.'); tone(196,.2,'sawtooth',.06); tone(185,.3,'sawtooth',.06,0,.2);
    } else if (p.age > 50) p.state = 'leave';
  } else if (p.state === 'chase'){
    tx = boat.x + Math.cos(boat.h)*boat.v*.4; ty = boat.y + Math.sin(boat.h)*boat.v*.4; speed = PIRATE_SPEED;
    if (boatSafe || holdTotal === 0){ p.state = 'prowl'; p.age = Math.max(p.age, 25); p.tx = p.x; p.ty = p.y; }
    else if (dBoat < 30 + 18*bk()){
      let n = Math.ceil(holdTotal/2); const took = n;
      for (let sp=SPECIES.length-1; sp>=0 && n>0; sp--){ const k = Math.min(hold[sp], n); hold[sp] -= k; n -= k; holdTotal -= k; }
      addText(boat.x, boat.y, 46, 'Pirates took ' + took + ' fish', '#FF9A8A', 19, 2);
      shake = 1; tone(220,.35,'sawtooth',.09,.4); tone(110,.4,'square',.06,.5,.1);
      for (let i=0;i<Math.min(took,10);i++) flies.push({x0:boat.x, y0:boat.y, z0:12, to:'pirate', t:-i*.04, dur:.35, c:SPECIES[0].c, s:7});
      hud(); p.state = 'leave';
    } else if (p.age > 70) p.state = 'leave';
  }
  if (p.state === 'leave'){
    const ex = nearestEdgeExit(p.x,p.y); tx = ex[0]; ty = ex[1]; speed = PIRATE_SPEED*.9;
    if (p.x < -180 || p.x > WS+180 || p.y < -180 || p.y > WS+180){ p.state = 'away'; p.timer = 28 + Math.random()*20; return; }
  }
  const dd = Math.hypot(p.x-DOCK.x, p.y-DOCK.y);
  if (dd < 400 && p.state !== 'leave'){ tx = p.x + (p.x-DOCK.x)/dd*300; ty = p.y + (p.y-DOCK.y)/dd*300; }
  { const ar = around(p.x, p.y, tx, ty, IR+90); tx = ar[0]; ty = ar[1]; }
  steerShip(p, tx, ty, speed, 1.7, dt); pushOut(p, IX, IY, IR+60);
}
function spill(n){ let lost = 0; for (let sp=0; sp<SPECIES.length && n>0; sp++){ const k = Math.min(hold[sp], n); hold[sp] -= k; holdTotal -= k; n -= k; lost += k; } return lost; }
function updateSharks(dt){
  const nw = NETW[lv.net], cap = HOLD[lv.hold]; sharkWarnT -= dt;
  for (const sh of sharks){
    if (!sh.alive){ if (T >= sh.resp){ sh.alive = true; sh.state = 'circle'; sh.cool = 4; sh.x = sh.home.cx; sh.y = sh.home.cy; } continue; }
    sh.cool -= dt;
    const dn = Math.hypot(net.x-sh.x, net.y-sh.y); let tx, ty, sp;
    if (sh.state === 'circle'){
      sh.a += dt*.5; tx = sh.home.cx + Math.cos(sh.a)*(sh.home.r+55); ty = sh.home.cy + Math.sin(sh.a)*(sh.home.r+55); sp = 95;
      if (started && !docked && !escorted && sh.cool <= 0 && net.torn <= 0 && net.speed > 22 && dn < 330){
        sh.state = 'charge'; sh.t = 0;
        if (sharkWarnT <= 0){ sharkWarnT = 9; toast(lv.net >= 3 ? 'Shark incoming. Your net can hold it.' : 'Shark after your net. Steer clear.', 2200); tone(150,.25,'sawtooth',.05); tone(140,.25,'sawtooth',.05,0,.3); }
      }
    } else {
      sh.t += dt; tx = net.x; ty = net.y; sp = 235;
      if (dn < nw*.5 + 12){
        if (lv.net >= 3 && holdTotal < cap){
          hold[SHARK]++; holdTotal++; log[SHARK]++; sh.alive = false; sh.resp = T + 45;
          flies.push({x0:sh.x, y0:sh.y, z0:0, to:'boat', t:0, dur:.45, c:SPECIES[SHARK].c, s:14});
          addText(sh.x, sh.y, 30, 'Shark caught', '#CFE3EE', 20, 1.8);
          tone(330,.12,'triangle',.1); tone(494,.12,'triangle',.1,0,.1); tone(740,.25,'triangle',.1,0,.2); hud(); continue;
        } else if (lv.net >= 3){ sh.state = 'circle'; sh.cool = 8; }
        else { net.torn = 6; const lost = spill(3);
          addText(net.x, net.y, 30, lost ? `Net torn, ${lost} fish lost` : 'Net torn', '#FF9A8A', 19, 2);
          shake = .7; tone(200,.3,'sawtooth',.08,.35); sh.state = 'circle'; sh.cool = 14; hud(); }
      } else if (dn > 560 || sh.t > 7 || docked || escorted || net.torn > 0){ sh.state = 'circle'; sh.cool = 6; }
    }
    const dx = tx-sh.x, dy = ty-sh.y, d = Math.hypot(dx,dy);
    if (d > 1){ const st = Math.min(d, sp*dt); sh.x += dx/d*st; sh.y += dy/d*st; sh.ang = Math.atan2((dx+dy)*.5, dx-dy); }
  }
}
function updateFlotsam(){
  const nr = NETW[lv.net]*.5 + 10, br = 30*bk();
  for (const f of flotsam){
    if (!f.alive){ if (T >= f.resp){ placeFlotsam(f); f.alive = true; } continue; }
    if (!started) continue;
    if (Math.hypot(f.x-net.x, f.y-net.y) < nr || Math.hypot(f.x-boat.x, f.y-boat.y) < br){
      const r = [5,8,10,15,20,35][Math.floor(Math.random()*6)] * (1 + Math.floor(tier()/2));
      coins += r; earned += r; f.alive = false; f.resp = T + 25 + Math.random()*25;
      addText(f.x, f.y, 24, 'Salvage +' + r, C.coin, 19, 1.6);
      tone(784,.09,'triangle',.09); tone(1047,.16,'triangle',.09,0,.08); hud(); save();
    }
  }
}
function updateClock(dt){
  if (started) clock = advanceClock(clock, dt, DAY_LEN);
  { const d = dayState(clock); phase = d.phase; dark = d.dark; warm = d.warm; }
  if (phase !== lastPhase){ lastPhase = phase; hudPhase();
    if (phase === 'Dawn'){ spawnRare(10); toast('Dawn. Something is sparkling out on the water.', 3200); }
    else if (phase === 'Dusk'){ spawnRare(11); toast('Dusk. Something is sparkling out on the water.', 3200); }
    else if (phase === 'Night') toast('Night. Glowing fish are rising.', 2600);
    if (phase !== 'Day'){ tone(660,.2,'sine',.06); tone(990,.35,'sine',.05,0,.18); } }
}
function rarePoint(cx,cy,spread){
  const R = Math.min(range()-140, 2250);
  for (let i=0;i<20;i++){ const a = Math.random()*6.28, r = spread ? Math.random()*spread : 520 + Math.random()*Math.max(100, R-520);
    const x = (spread ? cx : IX) + Math.cos(a)*r, y = (spread ? cy : IY) + Math.sin(a)*r, d = Math.hypot(x-IX, y-IY);
    if (d > 480 && d < R && x > 150 && x < WS-150 && y > 150 && y < WS-150 && (spread || Math.hypot(x-boat.x, y-boat.y) > 420)) return [x,y]; }
  return [clamp(cx,150,WS-150), clamp(cy,150,WS-150)];
}
function spawnRare(sp){ const pt = rarePoint(IX+700, IY, 0); rare.on = true; rare.sp = sp; rare.x = pt[0]; rare.y = pt[1]; rare.tx = pt[0]; rare.ty = pt[1]; rare.t = 80; }
function updateRare(dt){
  rareFullT -= dt; if (!rare.on) return;
  rare.t -= dt; const S = SPECIES[rare.sp];
  if (rare.t <= 0){ rare.on = false; toast(`The ${S.name} slipped away. It will be back.`, 2400); return; }
  if (Math.hypot(rare.tx-rare.x, rare.ty-rare.y) < 30){ const pt = rarePoint(rare.x, rare.y, 280); rare.tx = pt[0]; rare.ty = pt[1]; }
  const dx = rare.tx-rare.x, dy = rare.ty-rare.y, d = Math.hypot(dx,dy) || 1;
  rare.x += dx/d*58*dt; rare.y += dy/d*58*dt; rare.ang = Math.atan2((dx+dy)*.5, dx-dy);
  if (started && net.speed > 22 && net.torn <= 0 && Math.hypot(rare.x-net.x, rare.y-net.y) < NETW[lv.net]*.5 + 12){
    if (holdTotal >= HOLD[lv.hold]){ if (rareFullT <= 0){ rareFullT = 5; toast(`Hold full. Sell up to land the ${S.name}.`, 2200); } return; }
    hold[rare.sp]++; holdTotal++; log[rare.sp]++; rare.on = false; shake = .3;
    flies.push({x0:rare.x, y0:rare.y, z0:0, to:'boat', t:0, dur:.5, c:S.c, s:15});
    addText(rare.x, rare.y, 40, S.name[0].toUpperCase() + S.name.slice(1) + '!', '#FFF3C4', 24, 2.6);
    for (let i=0;i<14;i++) sparks.push({x:rare.x, y:rare.y, vx:(Math.random()-.5)*160, vy:(Math.random()-.5)*160, z:10, vz:40+Math.random()*60, age:0, life:.9+Math.random()*.6});
    [784,988,1175,1568].forEach((f,i) => tone(f,.18,'triangle',.1,0,i*.09)); hud(); save();
  }
}
const sparks = [];
function updateLeviathan(dt){
  lev.th += dt*.03; const p = levPos(lev.th); lev.x = p[0]; lev.y = p[1];
  const h = lev.trail[0]; if (Math.hypot(p[0]-h[0], p[1]-h[1]) > 30){ lev.trail.unshift(p); lev.trail.length = LEV_N; }
  lev.rumbleT -= dt;
  let near = 1e9; for (let i=0;i<LEV_N;i+=3) near = Math.min(near, Math.hypot(lev.trail[i][0]-boat.x, lev.trail[i][1]-boat.y));
  if (started && near < 300 && lev.rumbleT <= 0){ lev.rumbleT = 14; shake = Math.max(shake,.4);
    tone(55,1.4,'sine',.14); tone(41,1.8,'sine',.12,0,.3);
    toast(levSeen ? 'The leviathan passes beneath you.' : 'Something enormous is moving beneath you.', 3200);
    if (!levSeen){ levSeen = true; save(); } }
}
function updateDrift(){
  const nr = NETW[lv.net]*.5 + 12, br = 30*bk();
  for (const f of drift){
    if (!f.alive){ if (T >= f.resp){ placeFlotsam(f, .65); f.alive = true; } continue; }
    if (!started) continue;
    if (Math.hypot(f.x-net.x, f.y-net.y) < nr || Math.hypot(f.x-boat.x, f.y-boat.y) < br){
      const n = 1 + Math.floor(Math.random()*3) + tier();
      wood += n; f.alive = false; f.resp = T + 18 + Math.random()*22;
      addText(f.x, f.y, 24, 'Driftwood +' + n, '#F0C58A', 18, 1.5);
      tone(233,.07,'square',.05); tone(349,.1,'square',.05,0,.07); hudWood(); save();
    }
  }
}
function updateBirdsAndDolphins(dt){
  const want = Math.ceil(holdTotal/HOLD[lv.hold]*4), c = Math.cos(boat.h), sn = Math.sin(boat.h);
  boatGulls.forEach((g,i) => {
    const tx = boat.x - c*(55+i*28) + Math.cos(T*1.3+i*2.1)*22, ty = boat.y - sn*(55+i*28) + Math.sin(T*1.1+i*1.7)*22;
    g.x += (tx-g.x)*Math.min(1,dt*1.8); g.y += (ty-g.y)*Math.min(1,dt*1.8);
    g.a += ((i < want ? 1 : 0) - g.a)*Math.min(1,dt*2);
  });
  escorted = false; dolphinToastT -= dt;
  for (const p of pods){
    p.cool -= dt; const db = Math.hypot(p.x-boat.x, p.y-boat.y); let tx, ty, sp;
    if (p.state === 'roam'){
      if (Math.hypot(p.tx-p.x, p.ty-p.y) < 100) podWaypoint(p);
      tx = p.tx; ty = p.ty; sp = 120;
      if (started && !docked && p.cool <= 0 && db < 400 && boat.v > 60){
        p.state = 'escort'; p.t = 0; p.side = Math.random() < .5 ? -1 : 1;
        if (dolphinToastT <= 0){ dolphinToastT = 60; toast('Dolphins alongside. Sharks keep their distance.', 2600); }
        tone(1400,.09,'sine',.05,1.5); tone(1800,.12,'sine',.05,1.3,.1);
      }
    } else {
      p.t += dt; tx = boat.x + c*45 - sn*p.side*75; ty = boat.y + sn*45 + c*p.side*75; sp = Math.max(150, boat.v*1.15 + 50);
      if (db < 280) escorted = true;
      if (p.t > 30 || docked || db > 800){ p.state = 'roam'; p.cool = 35; podWaypoint(p); }
    }
    const ar = around(p.x, p.y, tx, ty, IR+110); tx = ar[0]; ty = ar[1];
    const dx = tx-p.x, dy = ty-p.y, d = Math.hypot(dx,dy);
    if (d > 6){ const st = Math.min(d, sp*dt); p.x += dx/d*st; p.y += dy/d*st; p.h += angDiff(Math.atan2(dy,dx), p.h)*Math.min(1,dt*3); }
    else p.h += angDiff(boat.h, p.h)*Math.min(1,dt*3);
    pushOut(p, IX, IY, IR+95); for (const b of PIER_BUMPS) pushOut(p, b[0], b[1], 85);
    for (const q of p.d) q.p += dt*(p.state === 'escort' ? 3.2 : 2.2);
  }
}
function emitWake(s,k){
  if (s.v < 25) return;
  const c = Math.cos(s.h), sn = Math.sin(s.h);
  for (const side of [-1,1]){
    wakes.push({x: s.x - c*26*k - sn*side*8*k, y: s.y - sn*26*k + c*side*8*k,
      vx: -sn*side*16, vy: c*side*16, age:0, life: 1.1 + s.v/300});
  }
  if (wakes.length > 260) wakes.splice(0, wakes.length-260);
}

function update(dt){
  T += dt; updateClock(dt);
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
      if (rangeToastT <= 0){ rangeToastT = 9; toast(`Too rough out there for a ${TIER_NAME[tier()]}. Grow your boat to sail further.`, 2800); tone(160,.2,'triangle',.06); } } }

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
      if (catching && near && f.grow >= 1 && holdTotal < cap && !(sc.night && dark < .75)){
        const ex = x-net.x, ey = y-net.y; if (ex*ex+ey*ey < rr) catchFish(f,sc);
      }
    }
  }

  /* dock */
  const inDock = Math.hypot(boat.x-DOCK.x, boat.y-DOCK.y) < DOCK.r;
  if (inDock !== docked){ docked = inDock; elShop.classList.toggle('open', docked); elShop.setAttribute('aria-hidden', String(!docked)); if (docked){ refreshShop(); elToast.classList.remove('show'); if (net.torn > 0){ net.torn = 0; addText(boat.x, boat.y, 40, 'Net mended', '#9CF0C0', 17, 1.4); } } }
  if (docked && holdTotal > 0){
    sellT -= dt;
    while (sellT <= 0 && holdTotal > 0){ sellOne(); sellT += .045; }
    if (holdTotal === 0) finishSale();
  } else sellT = 0;

  updateRare(dt); updateLeviathan(dt);
  for (let i=sparks.length-1;i>=0;i--){ const q = sparks[i]; q.age += dt; q.x += q.vx*dt; q.y += q.vy*dt; q.z += q.vz*dt; q.vz -= 120*dt; if (q.age > q.life) sparks.splice(i,1); }
  updatePirate(dt); updateBirdsAndDolphins(dt); updateSharks(dt); updateFlotsam(); updateDrift();
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
function drawLeviathan(){
  if (!onScreen(lev.x, lev.y, 700)) return;
  for (let i=LEV_N-1;i>=0;i--){ const p = lev.trail[i], r = 10 + 52*Math.sin(Math.PI*(i+1.6)/(LEV_N+2));
    const wob = Math.sin(T*1.1 - i*.55)*14, nx = lev.trail[Math.max(0,i-1)], dx = nx[0]-p[0], dy = nx[1]-p[1], dl = Math.hypot(dx,dy) || 1;
    const x = p[0] - dy/dl*wob, y = p[1] + dx/dl*wob;
    ctx.fillStyle = 'rgba(6,20,34,.5)'; isoEllipse(x,y,r); ctx.fill();
    if (i%3 === 1 && Math.sin(T*1.1 - i*.55) > .15){ const sx = px(x,y), sy = py(x,y), hgt = r*.55*Z*(Math.sin(T*1.1 - i*.55));
      ctx.fillStyle = '#2E4558'; ctx.beginPath(); ctx.moveTo(sx-r*.35*Z,sy); ctx.lineTo(sx,sy-hgt); ctx.lineTo(sx+r*.35*Z,sy); ctx.closePath(); ctx.fill(); } }
}
function drawRare(){
  if (!rare.on || !onScreen(rare.x,rare.y,60)) return; const S = SPECIES[rare.sp];
  ctx.fillStyle = S.c; ctx.globalAlpha = .95; fishShape(px(rare.x,rare.y), py(rare.x,rare.y), S.s*Z, S, rare.ang, Math.sin(T*7)*.35); ctx.globalAlpha = 1;
}
function drawGlow(){
  if (dark > .05){
    ctx.globalCompositeOperation = 'screen';
    for (const sc of schools){ const S = SPECIES[sc.sp]; if (!S.glow || !sc.vis) continue;
      const a = dark*(sc.night ? clamp((dark-.5)/.3,0,1) : 1); if (a < .03) continue;
      glow(sc.cx, sc.cy, 0, sc.r+80, rgba(S.c, .3*a*sc.alive/sc.n));
      ctx.fillStyle = rgba(S.c, .9*a);
      for (const f of sc.fish){ if (!f.alive || f.grow < .5) continue; const x = px(f.x,f.y), y = py(f.x,f.y);
        if (x<-10||x>W+10||y<-10||y>H+10) continue; ctx.beginPath(); ctx.arc(x,y,2.4*Z,0,Math.PI*2); ctx.fill(); } }
    if (onScreen(lev.x,lev.y,700)){ ctx.fillStyle = rgba('#7CF5E6', .55*dark);
      for (let i=0;i<LEV_N;i+=2){ const p = lev.trail[i]; ctx.beginPath(); ctx.arc(px(p[0],p[1]), py(p[0],p[1]), (2+Math.sin(T*2+i)*1)*Z, 0, Math.PI*2); ctx.fill(); } }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (rare.on && onScreen(rare.x,rare.y,80)){ const c = SPECIES[rare.sp].c;
    for (let i=0;i<7;i++){ const a = T*1.4 + i*.9, r = 16 + 10*Math.sin(T*2+i*2), tw = .5 + .5*Math.sin(T*6+i*1.7);
      ctx.globalAlpha = tw; ctx.fillStyle = i%2 ? '#FFFFFF' : c;
      star(px(rare.x+Math.cos(a)*r, rare.y+Math.sin(a)*r), py(rare.x+Math.cos(a)*r, rare.y+Math.sin(a)*r, 4+6*tw), (3+3*tw)*Z); } ctx.globalAlpha = 1; }
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
function drawSharks(){
  for (const sh of sharks){
    if (!sh.alive || !onScreen(sh.x, sh.y, 60)) continue;
    const x = px(sh.x,sh.y), y = py(sh.x,sh.y), len = 30*Z, ca = Math.cos(sh.ang), sa = Math.sin(sh.ang), hot = sh.state === 'charge';
    ctx.fillStyle = 'rgba(24,44,62,.72)';
    ctx.beginPath(); ctx.ellipse(x,y,len,len*.3,sh.ang,0,Math.PI*2); ctx.fill();
    const tx = x - ca*len*.9, ty = y - sa*len*.9, ta = sh.ang + Math.sin(T*(hot?12:5))*.4;
    ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx - Math.cos(ta-.7)*len*.6, ty - Math.sin(ta-.7)*len*.6);
    ctx.lineTo(tx - Math.cos(ta+.7)*len*.6, ty - Math.sin(ta+.7)*len*.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.foam; ctx.globalAlpha = .55; ctx.lineWidth = 1.5*Z;
    ctx.beginPath(); ctx.ellipse(x,y,11*Z,4.5*Z,0,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = hot ? '#D2493A' : '#5F7080';
    ctx.beginPath(); ctx.moveTo(x + ca*7*Z, y + sa*7*Z); ctx.lineTo(x - ca*5*Z, y - sa*5*Z - 18*Z); ctx.lineTo(x - ca*9*Z, y - sa*9*Z); ctx.closePath(); ctx.fill();
  }
}
function drawFlotsam(){
  for (const f of flotsam){ if (!f.alive || !onScreen(f.x,f.y,40)) continue;
    const b = Math.sin(T*1.8 + f.ph)*1.5;
    isoEllipse(f.x+7,f.y+7,13); ctx.strokeStyle = C.foam; ctx.globalAlpha = .5; ctx.lineWidth = 1.5*Z; ctx.stroke(); ctx.globalAlpha = 1;
    box(f.x, f.y, 14, 14, -3+b, 9+b, '#B97F45', '#E6B877');
    ctx.fillStyle = C.coin; isoEllipse(f.x+7, f.y+7, 3, 9.5+b); ctx.fill(); }
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
function drawBirds(){
  for (let j=0;j<schools.length;j++){ const sc = schools[j]; if (sc.night || dark > .8 || !onScreen(sc.cx,sc.cy,220*Z)) continue;
    const fr = sc.alive/sc.n, n = fr > .7 ? 3 : fr > .35 ? 2 : 0, dir = j%2 ? 1 : -1;
    for (let i=0;i<n;i++){ const a = T*.7*dir + i*(Math.PI*2/n) + j, r = 50 + i*9;
      drawBird(sc.cx+Math.cos(a)*r, sc.cy+Math.sin(a)*r, 78+Math.sin(T+i+j)*8, T*7+i*2+j, 1, 1); } }
  boatGulls.forEach((g,i) => { if (g.a > .03) drawBird(g.x, g.y, 50+i*7+Math.sin(T*1.5+i)*4, T*8+i*1.7, .9, g.a); });
}
function drawDolphins(){
  for (const p of pods){ if (!onScreen(p.x,p.y,140)) continue;
    const c = Math.cos(p.h), sn = Math.sin(p.h), ang = Math.atan2((c+sn)*.5, c-sn), dirS = Math.cos(ang) >= 0 ? 1 : -1;
    for (const q of p.d){
      const wx = p.x + q.ox*c - q.oy*sn, wy = p.y + q.ox*sn + q.oy*c, sp = Math.sin(q.p), up = sp > .3, z = up ? (sp-.3)/.7*26 : 0;
      const x = px(wx,wy), y0 = py(wx,wy), y = y0 - z*Z, a = ang - (up ? Math.cos(q.p)*.65*dirS : 0), len = 23*Z;
      if (up && z < 8){ ctx.strokeStyle = C.foam; ctx.globalAlpha = .7; ctx.lineWidth = 2*Z; ctx.beginPath(); ctx.ellipse(x,y0,(10+(8-z))*Z,(4.5+(8-z)*.4)*Z,0,0,Math.PI*2); ctx.stroke(); }
      ctx.globalAlpha = up ? 1 : .42; ctx.fillStyle = up ? '#6E8FA8' : '#23465A';
      const ca = Math.cos(a), sa = Math.sin(a);
      ctx.beginPath(); ctx.ellipse(x,y,len,len*.3,a,0,Math.PI*2); ctx.fill();
      const tx = x-ca*len*.9, ty = y-sa*len*.9;
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(tx-Math.cos(a-.8)*len*.5, ty-Math.sin(a-.8)*len*.5); ctx.lineTo(tx-Math.cos(a+.8)*len*.5, ty-Math.sin(a+.8)*len*.5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+ca*3*Z, y+sa*3*Z-len*.25); ctx.lineTo(x-ca*6*Z, y-sa*6*Z-len*.75); ctx.lineTo(x-ca*7*Z, y-sa*7*Z-len*.2); ctx.closePath(); ctx.fill();
      if (up){ ctx.fillStyle = '#C5D6E2'; ctx.beginPath(); ctx.ellipse(x+ca*2*Z, y+sa*2*Z+len*.1, len*.6, len*.12, a, 0, Math.PI*2); ctx.fill(); }
      ctx.globalAlpha = 1;
    } }
}
function drawDrift(){
  for (const f of drift){ if (!f.alive || !onScreen(f.x,f.y,40)) continue;
    const b = Math.sin(T*1.6+f.ph)*1.2, r = f.rot + Math.sin(T*.4+f.ph)*.3, c = Math.cos(r), sn = Math.sin(r);
    const P = (lx,ly) => [f.x + lx*c - ly*sn, f.y + lx*sn + ly*c];
    isoEllipse(f.x,f.y,17); ctx.strokeStyle = C.foam; ctx.globalAlpha = .45; ctx.lineWidth = 1.5*Z; ctx.stroke(); ctx.globalAlpha = 1;
    extrude([P(-16,-4),P(16,-4),P(16,4),P(-16,4)], -2+b, 5+b, '#7A5230', '#A9773F');
    const e = P(9,0); ctx.fillStyle = '#C79A5E'; isoEllipse(e[0],e[1],2.5,5.4+b); ctx.fill(); }
}
function drawPier(){
  extrude(PIER, 0, 7, C.wood, C.woodTop);
  ctx.strokeStyle = 'rgba(60,30,0,.18)'; ctx.lineWidth = 1*Z;
  for (let x = PX0+14; x < PX0+152; x += 14){ ctx.beginPath(); ctx.moveTo(px(x,IY-17),py(x,IY-17,7)); ctx.lineTo(px(x,IY+17),py(x,IY+17,7)); ctx.stroke(); }
  box(PX0+118, IY-12, 22, 22, 7, 25, '#C98B4E', '#E6B877');
  box(PX0+94, IY-13, 16, 16, 7, 20, '#B97F45', '#DDAA66');
  perched(PX0+102, IY-5, 20);
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
  if (pirate.state !== 'away') list.push({d: pirate.x+pirate.y, f: () =>
    drawShip(pirate, {scale:1.3, hull:'#2B2233', trim:'#B23A48', deck:'#6B5540', cabin:'#3A3145', roof:'#1D1926', mast:'#1D1926', flag:'#111', sail:'#1D1926', heap:0}) });
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
    const tgt = f.to === 'boat' ? [boat.x-Math.cos(boat.h)*16*bk(), boat.y-Math.sin(boat.h)*16*bk(), 12*bk()] : f.to === 'crate' ? [CRATE.x,CRATE.y,26] : [pirate.x,pirate.y,16];
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
  if (rare.on) light(rare.x, rare.y, 0, 130, .85);
  light(net.x, net.y, 0, 150, .8);
  light(IX+50, IY-90, 20, 280, .95);
  if (build >= 2) light(TX, TY, 60, 230, .95);
  for (const f of drift) if (f.alive && onScreen(f.x,f.y,60)) light(f.x, f.y, 0, 60, .6);
  for (const f of flotsam) if (f.alive && onScreen(f.x,f.y,60)) light(f.x, f.y, 0, 60, .6);
  light(CRATE.x, CRATE.y, 10, 200, .95);
  if (pirate.state !== 'away') light(pirate.x, pirate.y, 14, 170, .75);
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(nightCv,0,0,W,H);
  if (pirate.state !== 'away' && dark > .3){ ctx.globalCompositeOperation = 'screen'; glow(pirate.x, pirate.y, 20, 120, `rgba(255,60,60,${.16*dark})`); }
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
  ctx.setTransform(DPR,0,0,DPR,0,0); placed.length = 0;
  ctx.lineJoin = 'round';
  drawSea(); drawLeviathan(); drawFish(); drawRare(); drawSharks(); drawDolphins(); drawWakes(); drawNet(); drawBuoys(); drawFlotsam(); drawDrift(); drawWorldObjects(); drawBirds(); drawFlies();

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
  if (rare.on) indicator(rare.x, rare.y, '#FFF3C4', SPECIES[rare.sp].c, true);
  if (pirate.state === 'prowl' || pirate.state === 'chase') indicator(pirate.x, pirate.y, '#B23A48', 'pirate', pirate.state === 'chase');

  if (joy.on && started){
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(joy.sx,joy.sy,JR,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(joy.x,joy.y,20,0,Math.PI*2); ctx.fill();
  }
}

/* ---------- loop ---------- */
let last = performance.now(), saveT = 0;
function frame(now){
  const dt = Math.min(.05, Math.max(.001, (now-last)/1000)); last = now;
  update(dt); draw();
  if (started){ saveT += dt; if (saveT >= 5){ saveT = 0; save(); } }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__np = {rare, lev, get clock(){return clock;}, set clock(v){clock=v;}, get keys(){return keyMode;}, set keys(v){keyMode=v; keysLabel();}, get phase(){return phase;}, boat, net, schools, pirate, sharks, flotsam, drift, pods, lv, DOCK, set build(v){build=v;}, set wood(v){wood=v; hudWood(); refreshShop();}, get hold(){return holdTotal;}, get coins(){return coins;}};
})();
