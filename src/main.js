// The prototype game script, moved here verbatim from index.html so Vite can
// serve and bundle it. Phase 1 of project.md splits it into modules; until
// then it is not linted or type-checked, and legacy/net-profit.html stays the
// behavioural reference.
import { baseZoom, dirToWorld, K as ISO_K, onScreen as isoOnScreen, screenX, screenY } from './core/iso';
import { COST, DAY_LEN, HOLD, ICE_CHAR, ICEFISH, MAXLV, NETW, PAINTS, PARROT, PIRATE_SPEED, PIRATE_UNLOCK, POLAR_COD, REMORO, RING_R, SHARK, CRAB, SPECIES, SPEED, STAGES, TIER_NAME } from './data/tuning';
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
import { ABUTMENTS, around, BEACH, BRIDGE, BRIDGE_BUMPS, BRIDGE_PARTS, BRIDGE_SOUTH, bridgeAt, bridgePartDepth, CRATE, DEEP, DOCK, FAR, FAR_BUOY_GAP, FARFAR, FARFAR_BUOY_GAP, IR, IX, IY, pastBuoys, pastFar, pastFarFar, PIER, PIER_BUMPS, pushOut, PX0, SMOKEHOUSE, SNOOK_SPOT, STALL, seaEdge, TOLL_SIGN, TWX, TWY, TX, TY, UMBRELLA, WS } from './world/island';
import { placeNetBehind, towLength, towNet } from './entities/net';
import { bindJoystick, bindJoystickThrough, createJoystick, JR, joystickVector } from './input/joystick';
import { bindKeys, keyControls, keyVector, smoothVector } from './input/keys';
import { steerBoat, steerBoatRelative } from './entities/boat';
import { cues as sfx, getContext, setCueListener, setMuted, unlock as audio } from './audio/sfx';
import { Ambience, panFor } from './audio/ambience';
import { ToastQueue } from './ui/toast';
import { Dolphins } from './entities/dolphins';
import { CRATES, DRIFTWOOD, Flotsam } from './entities/flotsam';
import { Gulls } from './entities/gulls';
import { Jellies } from './entities/jellies';
import { lionAt, Lionfishes } from './entities/lionfish';
import { LION_BOUNTY, Rod, ROD_RANGE, ROD_SPEED } from './fishing/rod';
import { PET_REACH, Pets } from './entities/pets';
import { FEED_REACH, OTTER_FEEDS, OTTER_HOME, Otter } from './entities/otter';
import { Leviathan, seaWater as levRing } from './entities/leviathan';
import { Cthuluviathan, LAIR as CTHULU_LAIR, SIGHT_RADIUS as CTHULU_SIGHT, seaCity } from './entities/cthuluviathan';
import { LENS, LEVIATHANS, nextSeen, SCOPE_AT, SCOPE_REACH, SCOPE_SWING, seaZone } from './data/observatory';
import { fare as charterFare, newCharter, SHIRTS, SIGHTS, see as seeSight, wishList } from './fishing/charter';
import { Anglerfish, seaWater as anglerRing } from './entities/anglerfish';
import { Gulper, seaZone as gulperRing } from './entities/gulper';
import { DIVE_HIT, isleStar, MeteorSerpent, seaHaunt } from './entities/meteor';
import { Reaper, SWEEP_HIT as REAPER_HIT, seaWater } from './entities/reaper';
import { BODY_R as LR_BODY, deckLair, LandReaper } from './entities/reaperland';
import { IceRun, IceSeal, icePool, leftToCatch, SEAL_CHANCE } from './fishing/icefish';
import { drawSealDive, FLOE_TOP, NEIL_FEEDS, Neil, nearNeil } from './entities/seal';
import { drawIceScene } from './render/icefish';
import { drawFloe } from './render/icefloe';
import { alongsideFloe, FLOE_MAX, ICE_FLOE } from './world/icefloe';
import { Shallows } from './entities/shallows';
import { BLUE, Fighter, GREEN, RED, SLASH_ARC, SLASH_SLACK, SWORDSMAN } from './entities/fighter';
import { BONK_EVERY, BONK_R, MONKEY_HP, Monkeys } from './entities/monkeys';
import { ARENA_NAMES, ARENA_SIZES, arenaSpots, BARGE_DROP, BARGE_FOES, BARGE_LEAN, BARGE_MAX, BARGE_PRIZE, bargeAdd, bargeTotal, bargeZoom, BOSS_FOES, defaultBarge, FIGHTER_FOES, FOE_NAMES, FRAME_MID, BRIDGE_U, bridgeBerth, bridgeLanding, bridgeShare, bridgeWalls, capsuleNear, onSeaBridge, SEA_ARENA, SEA_BRIDGE_HALF, SEA_BRIDGE_REACH, SEA_BRIDGES_MAX, SEA_FOES, SEA_ISLE_R, SEA_ISLES_MAX, SEA_LOOK, SEA_NAMES, SEA_RING, SEA_SEEN, SEA_TAR_R, SEA_TAR_SLOW, SEA_TARS_MAX, SEA_ZOOM_MAX, SEA_ZOOM_MIN, seaAdd, seaBlocked, seaFrame, seaIsleNo, seaIsleTap, seaIsleWay, seaSpots, seaSpotsClear, seaBridgeNo, seaBridgeTap, seaBridgeZ, seaStart, seaTarNo, seaTarTap, seaTotal, UNDEAD_FOES } from './data/barge';
import { drawArenaBack } from './render/barge';
import { drawSeaRing, drawSeaWater } from './render/seaarena';
import { drawSeaBridgesWater, drawSeaIslesFlat, drawSeaIslesSea, drawSeaTar, seaBridgeSolids, seaIslePalms, seaIslesSolids } from './render/seaisles';
import { BOLT_HIT, CALL_N, Sorcerer, THIRD_HP } from './entities/sorcerer';
import { Warlock, WARLOCK_HEARTS } from './entities/warlock';
import { WarlockBoat } from './entities/warlockboat';
import { ARENAS, CAGE, CRYPT, DEMON, DOOR, entry, GATE, HALL, HALL_A, HALL_B, NEST9, ROOF, ROOF3, ROOF7, ROOF8, ROOF10, ROOMS, RUINS, STEP, stairs, TEMPLE6, THRONE, TOWERS } from './world/tower';
import { Spears } from './entities/spears';
import { ARMOURS, armourAt, nextArmour, heartsFor, hasKnife, HONOR_GUARD, knifeUse, KNIFE } from './data/armour';
import { FACES, HAIR_COLOURS, HAIRS, HAT_COLOURS, HATS, PRESETS, presetOf, SKINS, SKIPPER, wornArmour } from './data/look';
import { decodeSailed, encodeSailed, noSailed, sail, sailAll, sailedCount, sailedShare, seedSailed } from './state/sailed';
import { drawRadar } from './render/radar';
import { inRange } from './world/radar';
import { FINDER, sunkenFor } from './world/sunken';
import { noSubFound, patchAt, SUBMARINE, subLoot, subPlants, subShoals, subSite, subWater } from './world/subsea';
import { BADGE_KINDS, BADGES, noBadges, owned, pin, SHIELD_UP, wornBy } from './data/badges';
import { drawWorn } from './render/badges';
import { Sunken } from './entities/sunken';
import { isNewVersion } from './state/update';
import { gameCode, gameLink, gameSummary, looksLikeSave, packGame, unpackGame } from './state/share';
import { CLOUD_EVERY, getGame, makeCode, putGame, readCode } from './state/cloud';
import { isScanKind, SCAN_EGGS, SCAN_HP, SCAN_REACH, SCAN_SEA, SCAN_SEA_FAR, SCAN_TIME, SCANNER_LEVELS, scannerLevel, SCANS } from './data/scans';
import { skipTo, STEPS, stepsDone, TESTER_KEY, testerFromHash } from './ui/tester';
import { SeaMap } from './render/seamap';
import { Tank, TANK_W, tankKinds } from './render/tank';
import { BASES, baseAtDock, FLOE_BASE, hasCharters, hasPots, hasSeine, homePort, nextStage, noBases } from './world/bases';
import { canDrop, fillPots, POT_MAX, POT_REACH, POTS, potNear } from './fishing/pots';
import { drawPot } from './render/pots';
import { clearOfLoot, foundCount, LOOT_ONCE, lootNear, pearlReady, taken as lootTaken, TRENCH_LOOT } from './world/loot';
import { LANTERN, TRENCH, TRENCH_SIGHT, trenchPlants, trenchShoals } from './world/trench';
import { AIR_MAX, Diver, TANK_AIR } from './entities/diver';
import { Remoro, REMORO_HITS, remoroHere } from './entities/remoro';
import { Giants } from './entities/abyssgiants';
import { drawFloorGulper, drawFloorGulperGlow, drawGiantGlow, drawGiants } from './render/abyssgiants';
import { BITE, Lurker } from './entities/lurker';
import { BoneShark, LENGTH as SHARK_LEN } from './entities/boneshark';
import { Storm, stormHandling } from './world/storm';
import { drawBoneShark } from './render/wreck';
import { TRENCH_SITE } from './world/divesite';
import { WRECK_CHEST, WRECK_SITE, wreckPlants, wreckShoals } from './world/wreck';
import { COLD_T, ICE_LOOT, ICE_SITE, iceFound, iceLootNear, icePlants, iceShoals, iceTaken } from './world/icedive';
import { KEY_REACH, LAGOON_SITE, lagoonPlants, SKULL_KEY } from './world/lagoondive';
import { ABYSS, ABYSS_LURK, ABYSS_SITE, abyssPlants, abyssShoals, nearAbyss, overAbyss } from './world/abyss';
import { drawAbyssMark, drawCageBack, drawCageFront, drawCageRope, drawRemoro, drawRemoroGlint } from './render/abyss';
import { CLAW_AIR, DivePal, LagoonFolk } from './entities/lagoonfolk';
import { drawCreatureEye, drawDivePal, drawKeyGlint, drawLagoonCreature, drawSkullKey } from './render/lagoondive';
import { drawFrozen, drawIceSeals, drawRope } from './render/icedive';
import { drawDive } from './render/dive';
import { aimAt, here as fishHere, noneGone, REACH, spear as spearFish, stepSpear, throwSpear as throwDiveSpear } from './fishing/underwater';
import { crabSvg, drawSpiderCrab } from './render/crab';
import { HAUL_GAP, keepShare, Seine } from './fishing/seine';
import { drawSeine } from './render/seine';
import { AQUARIUM, AQUARIUM_BASE, AQUARIUM_COST, AQUARIUM_FROM, AQUARIUM_MID, AQUARIUM_TOP, nearAquarium } from './world/aquarium';
import { nextSpear, spearAt } from './data/spear';
import { drivePrize, HARPOON_LEVEL, HARPOON_POWER, HARPOON_RANGE, HARPOON_RELOAD, noDriven, RESOLVE, TROPHY } from './data/harpoon';
import { HP_MAX, HURT, hurt, mend, SPIT, SWALLOW } from './data/health';
import { assignSlots, formation, formUp, spreadOut } from './entities/spread';
import { setWalkLand, dockAt, HOME_DOCK, ISLE2_DOCK, ISLE3_DOCK, ISLE6_DOCK, ISLE7_DOCK, ISLE8_DOCK, ISLE10_DOCK, ISLE11_DOCK, tarDock, WALK_DROP, WALK_FULL, WALK_ZOOM, Walker, groundZ, onLand as landAt, walkable, walkerDepth, walkStep } from './entities/walker';
import { CAMP, CHEST, DOCK2, FIRE, HUTS, ISLE2, NAGA_CAGE, PALMS2, POST, TOTEM, TOWER } from './world/isle2';
import { DIVE3, DOCK3, DOOR3, ISLE3, MAT, onPlanks, pushOffTown, TRADER_MID } from './world/isle3';
import { atTar, ISLE4, MONSTER, SUMMONER, TAR_R, TAR_STOP } from './world/isle4';
import { ANCHOR_HIT, Anchorer, BODY_R, SWEEP_R, seaMoat } from './entities/anchorer';
import { drawTarblob, Tarling } from './entities/tarling';
import { CRAFTS, DEFAULT_CREW, Flotilla, RIDERS, seatsOf } from './entities/flotilla';
import { drawCaterman } from './render/caterman';
import { drawCraft } from './render/flotilla';
import { BAKER, DECK_Z, DRURY_LANE, MuffinMan, WORDS_Z } from './entities/muffinman';
import { drawBakery, drawDruryLane, drawMuffin, drawMuffinWords } from './render/bakery';
import { bakeable, JUNK_MAX, JUNK_NAMES, junkWith, MUFFIN_BOX } from './data/junk';
import { drawJunk } from './render/junk';
import { LEGGY_MAX, LEGS_AFTER, LeggyMuffins, sprouting } from './entities/leggy';
import { drawLeggy, drawStinkCrate } from './render/leggy';
import { drawIsle4Flat, drawIsle4Sea, isle4Solids } from './render/isle4';
import { ISLE5, SIGHT5, WRECK } from './world/isle5';
import { BITE as KING_BITE, KING_RESOLVE, SharkKing, seaReef, TRIDENT as KING_TRIDENT } from './entities/sharkking';
import { drawBoneFins, drawIsle5Flat, drawIsle5Sea, isle5Solids } from './render/isle5';
import { berth6, CHEST_COINS, CHEST_REACH, CHESTS6, ISLE6, NEST6, PALMS6, POST6_MID, pushOffIsle6, SIGHT6, shoreR as shore6, TEMPLE } from './world/isle6';
import { BODY_R as DEEP_BODY, DEEP_RESOLVE, DeepOne, LOG as DEEP_LOG, seaDeepHome } from './entities/deepone';
import { Cthulhu, CTH_R } from './entities/cthulhu';
import { drawBones, drawNagaCage, drawSwimming, drawWarrior, Pal, swims } from './entities/pals';
import { CRACK_WORDS, CRACKS, EGG_CINE, EGG_IN, EGG_OUT, eggDue, eggLook, HATCH_WAIT, INTO_SEA, POP_T } from './entities/egg';
import { drawIsle6Flat, drawIsle6Sea, isle6Solids } from './render/isle6';
import { CRATES10, DOCK10, DOOR10, FEEDER10, HIVE10, ISLE10, nearIsle10, OLDMAN10, POND, pushOffIsle10, SHACK10, SIGHT10 } from './world/isle10';
import { CROW_REACH, CROWS, Crows, FEEDER_REACH, GuideCrow, TRAY_Z } from './entities/crows';
import { crowSeat, drawCrow, drawCrowsAboard, drawFeeder, drawFlying, drawGuide } from './render/crows';
import { byLagoon11, CLEARING11, CRATES11, DOCK11, SHOP_DOOR11, insideIsle11, ISLE11, LAGOON11, nearIsle11, PERCH11, PORTAL11, PORTAL11_FRONT, pushOffIsle11, SIGHT11 } from './world/isle11';
import { drawIsle11Flat, drawIsle11Sea, isle11Solids } from './render/isle11';
import { answers, SCIENCE } from './data/science';
import { drawIsle10Flat, drawIsle10Sea, isle10Solids } from './render/isle10';
import { Prairie10 } from './entities/prairie10';
import { GATOR_PRIZE, Gators } from './entities/gators';
import { GORILLA_PRIZE, Gorillas } from './entities/gorillas';
import { Pelican } from './entities/pelican';
import { Swamp10 } from './entities/swamp10';
import { offWeb, SPIDER_HP, SPIDER_PRIZE, SPRAY_RANGE, Spider10, WEB, WEB_HOLD, WEB_STUCK, WEB_THICK, webBetween } from './entities/spider10';
import { OldMan } from './entities/oldman';
import { drawOldMan, drawShack10 } from './render/oldman';
import { APPLE_PACE, BANANA_HEARTS, BUG_SPRAY, CARROT_POWER, DAD_JOKES, HIVE_REACH, HONEY, HONEY_LAND, HONEY_MAX, noSnacks, SNACK_FOR, SNACK_KINDS, SNACK_MAX, SNACKS, SPRAY_MAX } from './data/snacks';
import { PondBirds } from './entities/pond10';
import { drawPondBird, drawPondLine } from './render/pond10';
import { castSpot, PondLine } from './fishing/pond';
import { drawBison, drawBunny, drawPrairieAir, drawPrairieDog } from './render/prairie10';
import { drawGator } from './render/gators';
import { drawGorilla, drawSlamRing } from './render/gorillas';
import { drawPelican, drawPerchNest, drawPerchSky, drawScoopRing, drawSpatFish } from './render/pelican';
import { drawCub, drawDeer, drawFrog, drawMonster, drawPanther, drawSnake } from './render/swamp10';
import { drawCocoon, drawSpider, drawSprayPuff, drawWeb } from './render/spider10';
import { Birds6, wetSand } from './entities/birds6';
import { drawBirds6Air, drawPerched, drawPiper } from './render/birds6';
import { drawReaperBody, drawReaperEgg, drawReaperNest, sideOn } from './render/reaper';
import { CAMP7, CHEST7, DOCK7, DOOR7, ISLE7, PORTAL7, POST7_MID, pushOffIsle7, SIGHT7 } from './world/isle7';
import { BAR, CAMP8, CAMP9, DOCK8, DOOR8, DOOR9, ISLE8, ISLE9, nearTwins, POST8_MID, pushOffTwins, SIGHT8 } from './world/isle8';
import { FLEE_T, HERON_HP, HERON9_HP, Heron, segDist, ZAP_HIT } from './entities/heron';
import { ESCAPE_CAPTIONS, ESCAPE_IN, ESCAPE_LEN, ESCAPE_OUT, ESCAPE_VIEW, escapeAt, PORTAL_OPEN, REAPER_SHOWS, SNAP_T, SPLASH_T } from './world/heronescape';
import { escapeSolids } from './render/heronescape';
import { drawNecromancer, Nest } from './entities/nest';
import { drawNestBack, drawNestFront } from './render/nest';
import { HIRED_BOUNTY, HIRED_CAMP_PRIZE, HIRED_HP, HIRED_MAN_HP, HIRED_PAY, HIRED_RAM, HiredBoats } from './entities/hired';
import { drawIsle8Flat, drawIsle8Sea, isle8Glow, isle8Solids } from './render/isle8';
import { baseHutLight, drawBaseHut, drawBaseShed } from './render/base';
import { drawIsle7Flat, drawIsle7Sea, drawPortal7, isle7Glow, isle7Solids } from './render/isle7';
import { Horde } from './entities/undead';
import { ARC as FG_ARC, FORGOTTEN_HP, Forgotten, REACH as FG_REACH, RAY_HIT, SKULL_HIT } from './entities/forgotten';
import { Allies } from './entities/allies';
import { CASTLE_ROOMS, CASTLE_SPAWNS, COLUMNS, CRYPT_FORGOTTEN, FORGOTTEN_START, LANCER_POSTS, LOCKED, LOCKED_REACH, POOL, PORTAL_OUT, SEAT, SKULL_DOOR, SKULL_REACH } from './world/gigantis';
import { LANCE_ARC, LANCE_REACH, Lancers } from './entities/lancers';
import { OLD_HP, OLD_RISE, OLD_SINK, OldOne } from './entities/oldone';
import { drawCastleBack, drawCastleDoor, drawColumn, drawCourtBack, drawLockedDoor, drawRuinsBack, drawSkullDoor, drawThrone } from './render/gigantis';
import { drawIsle3Flat, drawIsle3Sea, isle3Glow, isle3Lights, isle3Solids } from './render/isle3';
import { drawCage, drawDemonBack, drawHallBack, drawPortal } from './render/depths';
import { Mantas } from './entities/mantas';
import { Turtles } from './entities/turtles';
import { bushSolids, drawGroundPlants, drawUnderwaterPlants } from './render/plants';
import { Pirate } from './entities/pirate';
import { CoastGuard } from './entities/coastguard';
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
let coins = 0, earned = 0, muted = false, paint = 0, wood = 0, build = 0, carry = 0, levSeen = false, whaleSeen = false, mantaSeen = false, cthuluSeen = false, anglerSeen = false, petted = false, isle2Seen = false, isle3Seen = false, isle3Stage = 0, isle4Stage = 0, isle5Seen = false, isle5Stage = 0, isle6Seen = false, chests6 = 0, isle6Stage = 0, isle7Seen = false, soulArmour = false, isle7Stage = 0, flag = null, gulperSeen = false, meteorSeen = false, reaperSeen = false, reaperLandSeen = false, reaperRematch = false, oldOwed = false, snacks = noSnacks(), bugSpray = 0, honey = 0, hiveDay = 0, pelicanBeaten = false, bread = 0, feederFull = false, crowsOwned = 0, finder = false, sunkenDay = 0, sunkenFound = 0, badges = noBadges(), sub = false, subFound = noSubFound(), appleT = 0, carrotT = 0, reaperEgg = 0, eggDay = 0, crew = {...DEFAULT_CREW}, junk = 0, muffins = [], iceSeen = false, iceRuns = 0, lionSeen = false, lionCaught = 0, aquarium = false, aquaKinds = [], bases = noBases(), pots = [], trenchSeen = false, abyssSeen = false, abyssDown = false, remoroDay = 0, trenchDeep = 0, trenchLoot = 0, iceLoot = 0, pearlDay = 0, wreckChest = false, stormSeen = false, lurkerSeen = false, lurkerStung = 0, charter = null, chartersRun = 0, nagaFree = false, nagaCage = 0, isle8Seen = false, isle10Seen = false, isle11Seen = false, catermanFree = false, catermanT = -1, skullKey = false, cryptWon = false, castleHQ = false, scanner = 0, scanned = [], saveCode = '', codeTold = 0, barge = defaultBarge(), bargeWins = 0, heronStage = 0, heronFled = false, charLook = {...SKIPPER}, otterFed0 = 0, neilFed0 = 0, radioDay = 0, barredT = 0, spear = 0, armour = 0, masks = 0, towerTaken = false, turtleSeen = false, turtleSwims = 0, keyMode = 'drive';
let hp = HP_MAX, swallowT = 0, irisT = 0, hpShown = -1; // the boat's health in the deep, and being swallowed
let clock = .13, dark = 0, warm = 0, phase = 'Day', lastPhase = 'Day', rangeToastT = 0, deepToastT = 0, wasDeep = false, farToastT = 0, wasFar = false, farFarToastT = 0, wasFarFar = false;
const lv = {net:0, hold:0, engine:0};
const log = SPECIES.map(() => 0);
let order = {sp:0, n:8, have:0, pay:15}, market = NO_PICK, day = 1;
const first = new Array(SPECIES.length).fill(0); // the day each species was first landed
const gear = noGear(); // what the shipwright has fitted
const driven = noDriven(); // how many times the harpoon has driven off each leviathan
const sailed = noSailed(); // everywhere the boat has sailed, for the sea map
const snook = {casts:0, landed:0, kept:0, giant:0, best:0, firstDay:0}; // the fishing log
const leggy = new LeggyMuffins(); // fish muffins left uneaten, grown legs (entities/leggy.ts); its count is saved
let fight = null, pullSmooth = 0, slipT = 0, slipShow = 9, castShown = false; // the line: a Fight while one is out
function noteFirst(sp){ if (!first[sp]) first[sp] = day; }
const SAVE_BOUNDS = {maxLevel: MAXLV, paints: PAINTS.length, stages: STAGES.length, species: SPECIES.length, worldSize: WS, deep: DEEP + FAR + FARFAR, holdCaps: HOLD};
let savedTrip = null, saveOff = false, updateReady = false; // saveOff: another game has been put in the save, and this one must not write over it as the page goes
{ let raw = null; try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  const s = parseSave(raw, SAVE_BOUNDS);
  coins = s.coins; earned = s.earned; muted = s.muted; lv.net = s.lv.net; lv.hold = s.lv.hold; lv.engine = s.lv.engine;
  paint = s.paint; levSeen = s.levSeen; whaleSeen = s.whaleSeen; mantaSeen = s.mantaSeen; cthuluSeen = s.cthuluSeen; anglerSeen = s.anglerSeen; petted = s.petted; isle2Seen = s.isle2Seen; isle3Seen = s.isle3Seen; isle3Stage = s.isle3Stage; isle4Stage = s.isle4Stage; isle5Seen = s.isle5Seen; isle5Stage = s.isle5Stage; isle6Seen = s.isle6Seen; chests6 = s.chests6; isle6Stage = s.isle6Stage; isle7Seen = s.isle7Seen; soulArmour = s.soulArmour; isle7Stage = s.isle7Stage; flag = s.flag; gulperSeen = s.gulperSeen; meteorSeen = s.meteorSeen; reaperSeen = s.reaperSeen; reaperLandSeen = s.reaperLandSeen; reaperRematch = s.reaperRematch; oldOwed = s.oldOwed; snacks = s.snacks; bugSpray = s.bugSpray; honey = s.honey; hiveDay = s.hiveDay; pelicanBeaten = s.pelicanBeaten; bread = s.bread; feederFull = s.feederFull; crowsOwned = s.crows; finder = s.finder; sunkenDay = s.sunkenDay; sunkenFound = s.sunkenFound; badges = s.badges; sub = s.sub; subFound = s.subFound; reaperEgg = s.reaperEgg; eggDay = s.eggDay; crew = s.crew; junk = s.junk; muffins = s.muffins; leggy.count = s.leggy; iceSeen = s.iceSeen; iceRuns = s.iceRuns; lionSeen = s.lionSeen; lionCaught = s.lionCaught; aquarium = s.aquarium; bases = s.bases; pots = s.pots; trenchSeen = s.trenchSeen; abyssSeen = s.abyssSeen; abyssDown = s.abyssDown; remoroDay = s.remoroDay; trenchDeep = s.trenchDeep; trenchLoot = s.trenchLoot; iceLoot = s.iceLoot; pearlDay = s.pearlDay; wreckChest = s.wreckChest; stormSeen = s.stormSeen; lurkerSeen = s.lurkerSeen; lurkerStung = s.lurkerStung; charter = s.charter; chartersRun = s.chartersRun; nagaFree = s.nagaFree; isle8Seen = s.isle8Seen; isle10Seen = s.isle10Seen; isle11Seen = s.isle11Seen; catermanFree = s.catermanFree; skullKey = s.skullKey; cryptWon = s.cryptWon; castleHQ = s.castleHQ; scanner = s.scanner ? Math.max(s.scanner, scannerLevel(s.scanned.length)) : 0; scanned = s.scanned; saveCode = s.saveCode || newCode(); codeTold = s.codeTold; barge = s.barge; bargeWins = s.bargeWins; heronStage = s.heronStage; heronFled = s.heronFled; charLook = s.look; otterFed0 = s.otterFed; neilFed0 = s.neilFed; radioDay = s.radioDay; nagaCage = nagaFree ? 1 : 0; spear = s.spear; armour = s.armour; masks = s.masks; towerTaken = s.towerTaken; turtleSeen = s.turtleSeen; turtleSwims = s.turtleSwims; Object.assign(gear, s.gear); Object.assign(driven, s.driven); Object.assign(snook, s.snook); wood = s.wood; build = s.build; s.log.forEach((n,i) => { log[i] = n; }); order = s.order; market = s.market; day = s.day; s.first.forEach((n,i) => { first[i] = n; }); savedTrip = s.trip; keyMode = s.keys; sailed.set(decodeSailed(s.sailed)); }
setMuted(muted);
// A save from before the sea map: open the water such a player must know, round home and each island found.
if (earned > 0 && sailedCount(sailed) === 0) seedSailed(sailed, [[isle2Seen, ISLE2], [isle3Seen, ISLE3], [isle3Stage >= 4, ISLE4], [isle5Seen, ISLE5], [isle6Seen, ISLE6], [isle7Seen, ISLE7], [isle10Seen, ISLE10], [isle11Seen, ISLE11], [isle8Seen, ISLE8], [isle8Seen, ISLE9]].filter(([f]) => f).map(([, i]) => i));
function save(){ if (saveOff) return; try { const json = serializeSave({coins, earned, muted, lv, paint, log, order, wood, build, market, day, first, levSeen, whaleSeen, mantaSeen, cthuluSeen, anglerSeen, petted, isle2Seen, isle3Seen, isle3Stage, isle4Stage, isle5Seen, isle5Stage, isle6Seen, chests6, isle6Stage, isle7Seen, soulArmour, isle7Stage, flag, gulperSeen, meteorSeen, reaperSeen, reaperLandSeen, reaperRematch, oldOwed, snacks, bugSpray, honey, hiveDay, pelicanBeaten, bread, feederFull, crows: crowsOwned, finder, sunkenDay, sunkenFound, badges, sub, subFound, reaperEgg, eggDay, crew, junk, muffins, leggy: leggy.count, iceSeen, iceRuns, lionSeen, lionCaught, aquarium, bases, pots, trenchSeen, abyssSeen, abyssDown, remoroDay, trenchDeep: Math.round(trenchDeep), trenchLoot, iceLoot, pearlDay, wreckChest, stormSeen, lurkerSeen, lurkerStung, charter, chartersRun, nagaFree, isle8Seen, isle10Seen, isle11Seen, catermanFree, skullKey, cryptWon, castleHQ, scanner, scanned, saveCode, codeTold, barge, bargeWins, heronStage, heronFled, look: charLook, otterFed: otter.fed, neilFed: neil.fed, radioDay, spear, armour, sailed: encodeSailed(sailed), masks, towerTaken, driven, turtleSeen, turtleSwims, gear, snook, trip: tripSnapshot() || null, keys: keyMode}); localStorage.setItem(SAVE_KEY, json); cloudSoon(json); } catch (e) {} }
// The game online too (state/cloud.ts), under its save code: put there at most once a minute while it is played, and as
// the page goes. Refused, because the game there has earned more (played on further on another device), it offers that
// one, once. The state is for the Play on another device card to tell.
let cloudAt = -Infinity, cloudLast = null, cloudSent = '', cloudBusy = false, cloudState = 'none', cloudSavedAt = 0, cloudOffered = false;
function newCode(){ const b = new Uint8Array(4); try { crypto.getRandomValues(b); } catch (e) { for (let i=0;i<4;i++) b[i] = Math.random()*256; } return makeCode(b); }
function cloudSoon(json){ cloudLast = {json, earned}; if (performance.now() - cloudAt >= CLOUD_EVERY) cloudPut(false); }
async function cloudPut(going){ const c = cloudLast; if (!c || !saveCode || cloudBusy || saveOff || c.json === cloudSent) return;
  cloudBusy = true; cloudAt = performance.now();
  try { const r = await putGame(saveCode, await packGame(c.json), c.earned, {keepalive: going});
    if (r === 'down'){ cloudState = 'down'; return; }
    cloudSent = c.json;
    if (r.saved){ cloudState = 'saved'; cloudSavedAt = Date.now(); }
    else { cloudState = 'behind'; if (!cloudOffered) cloudOffer(); }
  } catch (e) { cloudState = 'down'; } finally { cloudBusy = false; } }
// Played on further on another device: that game, offered, to load here in place of this one.
async function cloudOffer(){ cloudOffered = true; const got = await getGame(saveCode); if (!got || got === 'down') return;
  const un = await unpackGame(got.game); if (!('json' in un) || !looksLikeSave(un.json)) return;
  const d = parseSave(un.json, SAVE_BOUNDS); if (d.earned <= earned) return;
  askLoad(un.json, 'Played on further on another device'); }
// The Battle Barge at sea (below): where the boat came from, its ring's size, and whether the fight is won.
let seaFight = null, seaWon = false, seaView = 0; const seaCam = {x: 0, y: 0, k: SEA_ZOOM_MAX};
const seaBoss = {meteor: [], king: [], deep: [], reaper: [], gulper: [], angler: [], cthulu: [], guard: []};
// The trip is what a phone loses when it discards a backgrounded tab: where the boat is, what time it is, what is in the hold.
function tripSnapshot(){ const at = seaFight || boat; // out at the Battle Barge at sea, the boat is kept where it came from
  return started ? {x: Math.round(at.x), y: Math.round(at.y), h: +at.h.toFixed(3), clock: +clock.toFixed(4), hold: hold.slice()} : (savedTrip || undefined); }

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
wasDeep = pastBuoys(boat.x, boat.y); wasFar = pastFar(boat.x, boat.y); wasFarFar = pastFarFar(boat.x, boat.y); // a trip restored out in the deep has not just crossed the buoys
const cam = {x: boat.x, y: boat.y};

/* ---------- view ---------- */
let W = 0, H = 0, DPR = 1, Z = 1, shx = 0, shy = 0, viewDY = 0, dockView = 0, walkView = 0, bargeView = 0;
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
// The far far sea, past island 10 (the owner's call): open to a boat carrying one of island 10's crows to let go, and
// for good once island 11 has been found. Its buoys stand round the far deep's end, a third line, tall and white.
function farFarOpen(){ return crowsOwned >= 1 || isle11Seen; }
const farFarBuoys = [], FFE = WS + DEEP + FAR;
for (let i = -DEEP-FAR; i < FFE; i += FARFAR_BUOY_GAP) farFarBuoys.push([i, -DEEP-FAR]);
for (let i = -DEEP-FAR; i < FFE; i += FARFAR_BUOY_GAP) farFarBuoys.push([FFE, i]);
for (let i = FFE; i > -DEEP-FAR; i -= FARFAR_BUOY_GAP) farFarBuoys.push([i, FFE]);
for (let i = FFE; i > -DEEP-FAR; i -= FARFAR_BUOY_GAP) farFarBuoys.push([-DEEP-FAR, i]);

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
// The coast guard, from the grown-ups' list: the radio calls it once a day when pirates come in home water. Its boat races
// out from the dock, sails beside yours for a minute, and the pirates turn tail and stay away while it is out.
const coastGuard = new CoastGuard();
coastGuard.onArrive = () => toast('The coast guard is alongside, lights flashing. No pirate will come near you now.', 3600, 2);
coastGuard.onLeave = () => toast('The coast guard heads home. Your radio will be ready again tomorrow.', 3200, 1);
pirateEntity.onFlee = () => { toast('The pirates have seen the coast guard. They turn tail and run!', 3200, 2); sfx.tierUp(); };
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
// The kid's lionfish, round the outer sea once the shipwright is open: their spines cut the net, which then catches
// nothing until it is mended, at a dock or at sea with the shipwright's mending kit.
const lionfish = new Lionfishes(), NET_CUT = 1e9, MEND_TIME = 2.5;
// The otter, the kid's: wild off the home dock until he has had three fish from the hold, then he goes where the boat
// goes, in the water beside it in home water and up on deck past the buoys or when something is in the water near it.
const otter = new Otter(), OTTER_WARY = 420;
otter.set(otterFed0);
let otterSeenT = 0, otterSeenTold = false;
const otterTold = {deep: false, danger: false};
otter.onClimb = (why) => { sfx.yip();
  if (why === 'danger'){ addText(boat.x, boat.y, 40, 'Eep!', '#FFE38A', 16, 1);
    if (!otterTold.danger){ otterTold.danger = true; toast('The otter scrambles aboard: something is in the water near the boat!', 3200, 2); } }
  else if (!otterTold.deep){ otterTold.deep = true; toast('Out past the buoys, the otter rides up on deck where it is safe.', 3000, 1); } };
// What would have him aboard now: the deep past the buoys, or something in the water near the boat.
function otterReason(){ if (!otter.free || swallowT > 0) return null;
  if (pastBuoys(boat.x, boat.y)) return 'deep';
  return dangerNear() ? 'danger' : null; }
// Something in the water near the boat: a shark, the lionfish, or one of the beasts.
function dangerNear(){ const near = (x, y) => Math.hypot(x - boat.x, y - boat.y) < OTTER_WARY;
  if (sharks.some(sh => near(sh.x, sh.y))) return true;
  if (lionfish.here){ const n = lionfish.nearest(boat.x, boat.y); if (n && n.d < OTTER_WARY) return true; }
  for (const [, , m] of beasts()) if (m && near(m.x, m.y)) return true;
  return false; }
// Tapped: wild, the boat beside him and fish aboard, he is tossed one, the commonest; otherwise he is petted.
function tapOtter(){ audio();
  if (otter.free){ otter.pet(); sfx.yip(); return; }
  if (!walker.aboard || Math.hypot(boat.x - otter.x, boat.y - otter.y) > FEED_REACH){ toast('Bring the boat right up beside the otter to toss him a fish.', 2400, 1); return; }
  if (!holdTotal){ toast('The otter looks at your empty hold. Catch a fish to toss him one.', 2600, 1); return; }
  let sp = 0; while (sp < hold.length && !hold[sp]) sp++; hold[sp]--; holdTotal--; hud(); sfx.yip(); toasts.clear();
  addText(otter.x, otter.y, 20, '+' + SPECIES[sp].name, '#FFE9A8', 14, 1.2);
  if (otter.feed()) toast('The otter is yours! He swims along with the boat now, and climbs aboard when the water is not safe.', 4600, 2);
  else toast(`The otter catches the ${SPECIES[sp].name} and eats it on his tummy. ${OTTER_FEEDS - otter.fed} more and he might come with you.`, 3200, 1);
  refreshShop(); save(); }
// Where to tap him on the screen, if he is on it.
function otterAt(){ if (otter.aboard){ if (!walker.aboard) return null; const p = otter.seat(boat, bk()); return [px(p.x, p.y), py(p.x, p.y, p.z + 8)]; }
  return onScreen(otter.x, otter.y, 40) ? [px(otter.x, otter.y), py(otter.x, otter.y, 4)] : null; }
// Neil, the owner's seal, hauled out at the ice floe's edge by the hole: three ice fish tossed from the boat make him
// yours. Then he swims beside the boat, flops up on deck when it stops a while or something is in the water, and
// comes ice fishing, sitting by the hole and now and then going in after a fish for the hold.
const neil = new Neil(), ICE_FISH = [ICE_CHAR, POLAR_COD, ICEFISH];
neil.set(neilFed0);
let neilTold = false, iceSeal = null;
const neilFlopTold = {rest: false, danger: false};
neil.onFlop = (why) => { sfx.yip();
  if (why === 'danger'){ addText(boat.x, boat.y, 40, 'Arf!', '#FFE38A', 16, 1);
    if (!neilFlopTold.danger){ neilFlopTold.danger = true; toast('Neil flops up on deck: something is in the water near the boat!', 3200, 2); } }
  else if (!neilFlopTold.rest){ neilFlopTold.rest = true; toast('The boat has stopped, so Neil flops up on deck for a rest. He slips back in when you go.', 3400, 1); } };
// Tapped: wild, the boat beside him and an ice fish aboard, he is tossed one; otherwise he is petted.
function tapNeil(){ audio();
  if (neil.free){ neil.pet(); sfx.yip(); return; }
  if (!walker.aboard || !nearNeil(boat.x, boat.y)){ toast('Bring the boat right up beside the seal to toss him a fish.', 2400, 1); return; }
  const sp = ICE_FISH.find(k => hold[k] > 0);
  if (sp === undefined){ toast('The seal sniffs at your hold. He only wants ice fish: arctic char, polar cod or icefish, from the hole in the ice.', 3600, 1); return; }
  hold[sp]--; holdTotal--; hud(); sfx.yip(); toasts.clear();
  addText(neil.x, neil.y, 30, '+' + SPECIES[sp].name, '#FFE9A8', 14, 1.2);
  if (neil.feed()) toast('The seal is yours, and his name is Neil! He swims along with the boat, flops up on deck when you stop, and comes ice fishing with you.', 5200, 2);
  else toast(`The seal gulps down the ${SPECIES[sp].name} and barks for more. ${NEIL_FEEDS - neil.fed} more and he might come with you.`, 3200, 1);
  refreshShop(); save(); }
// Where to tap him on the screen, if he is on it.
function neilAt(){ if (icing) return null;
  if (neil.aboard){ const p = neil.seat(boat, bk()); return [px(p.x, p.y), py(p.x, p.y, p.z + 8)]; }
  if (!onScreen(neil.x, neil.y, 40)) return null;
  return [px(neil.x, neil.y), py(neil.x, neil.y, neil.state === 'wild' ? FLOE_TOP + 10 : 4)]; }
// What Neil brings up through the hole goes in the hold, if there is room; if not, it goes back down.
function neilCatch(f){
  if (holdTotal >= HOLD[lv.hold]){ f.caught = false; toast(`Neil brought up a${'aeiou'.includes(SPECIES[f.sp].name[0]) ? 'n' : ''} ${SPECIES[f.sp].name}, but the hold is full: he lets it go.`, 2800, 1); return; }
  const sp = f.sp; hold[sp]++; holdTotal++; log[sp]++; noteFirst(sp); sfx.yip(); sfx.fish(1, sp);
  toast(`Neil caught a${'aeiou'.includes(SPECIES[sp].name[0]) ? 'n' : ''} ${SPECIES[sp].name} for you!`, 2600, 1); hud(); }
let mendT = 0, mendShown = false;
function netCut(){ return net.torn > 1e6; }
lionfish.onSight = () => { if (lionSeen) return; lionSeen = true; save(); refreshShop();
  toast('Lionfish! Red and white stripes and long spines. They don\'t belong in this sea, and their spines cut nets: keep your net away from them.', 4400, 2); };
lionfish.onCut = (x, y) => { net.torn = NET_CUT; const lost = spill(3); lionSeen = true;
  addText(x, y, 30, lost ? `Net cut, ${lost} fish lost` : 'Net cut', '#FF9A8A', 19, 2); shake = .6; sfx.netTorn(); toasts.clear();
  toast(gear.kit ? 'Lionfish spines cut your net! Stop the boat and tap Mend the net.' : 'Lionfish spines cut your net! It catches nothing until it is mended at a dock. The shipwright sells a mending kit.', 3800, 2);
  hud(); refreshShop(); save(); };
// With the shipwright's lionfish net their spines cannot cut it: each one swept up pays the bounty.
let sweptTold = false;
lionfish.onSweep = (x, y) => { lionCaught++; coins += LION_BOUNTY; earned += LION_BOUNTY; sfx.orderFilled();
  addText(x, y, 30, '+' + LION_BOUNTY, C.coin, 22, 2);
  if (!sweptTold){ sweptTold = true; toast(`The lionfish net sweeps them up: ${LION_BOUNTY} coins bounty each.`, 3000, 1); }
  hud(); };
function mendNet(){ if (!netCut() || !gear.kit) return; if (boat.v > 40){ sfx.denied(); return; }
  if (mendT <= 0){ mendT = MEND_TIME; sfx.click(); } }
// The button says what to do: stop first, then mend, then waits while the mending is done.
// The coast guard radio's button: at sea in home water, with pirates about, and a call left today.
let radioShown = false;
function canCallRadio(){ return gear.radio && radioDay !== day && started && walker.aboard && !docked && !diving && !icing && floor < 0
  && !pastBuoys(boat.x, boat.y) && (pirate.state === 'prowl' || pirate.state === 'chase') && coastGuard.ship.state === 'home'; }
function updateRadio(){ const show = canCallRadio(); if (show !== radioShown){ radioShown = show; $('radioBtn').hidden = !show; } }
function callCoastGuard(){ if (!canCallRadio()) return; audio(); if (!coastGuard.call()) return;
  radioDay = day; save(); updateRadio(); sfx.siren(); toast('Mayday! The coast guard is on its way from the dock.', 3200, 2); }
// On the press, like the throw button: a second finger's tap on an iPhone, while the first steers, fires no click.
$('radioBtn').addEventListener('pointerdown', e => { if (e.button > 0) return; callCoastGuard(); });
$('radioBtn').addEventListener('click', e => { if (e.detail === 0) callCoastGuard(); });
function updateMend(dt){ const show = started && walker.aboard && !docked && netCut() && gear.kit, el = $('mend');
  if (show !== mendShown){ mendShown = show; el.hidden = !show; if (!show) mendT = 0; }
  if (!show) return;
  if (mendT <= 0){ const moving = boat.v > 40, label = moving ? 'Stop to mend' : 'Mend the net';
    if (el.textContent !== label){ el.textContent = label; el.setAttribute('aria-disabled', String(moving)); } return; }
  if (boat.v > 40){ mendT = 0; return; }
  mendT -= dt; el.textContent = 'Mending\u2026';
  if (mendT <= 0){ net.torn = 0; mendT = 0; sfx.build(); addText(boat.x, boat.y, 40, 'Net mended', '#9CF0C0', 17, 1.4); } }
// The seine, opened by island 2's gear shed: drop the buoy, loop a school, come back to the buoy, and haul.
const seine = new Seine();
let haul = [], haulT = 0, seineShown = false, seineLeft = -1, seineTold = false;
function seineStern(){ const k = bk(); return {x: boat.x - Math.cos(boat.h)*27*k, y: boat.y - Math.sin(boat.h)*27*k}; }
function stowSeine(){ seine.stow(); haul = []; }
function toggleSeine(){ audio(); if (!seineShown) return; toasts.clear();
  if (seine.out){ stowSeine(); sfx.click(); toast('Hauled the seine back in, empty.', 1800); return; }
  const st = seineStern(); seine.drop(st.x, st.y); sfx.cast();
  if (!seineTold){ seineTold = true; toast('Buoy over! Drive a loop round a school, then come back to the buoy to close the seine. Keep it tight.', 3600, 1); } }
// Closed: every fish up and inside comes aboard, as many as a loop that tight keeps, one after another.
function closeSeine(){ const inside = []; let schoolArea = 0;
  for (const sc of schools){ if (sc.night && dark < .75) continue; let any = false;
    for (const f of sc.fish) if (f.alive && f.grow >= 1 && seine.inside(f.x, f.y)){ inside.push({f, sc}); any = true; }
    if (any) schoolArea += Math.PI*sc.r*sc.r; }
  const share = keepShare(seine.area(), schoolArea), n = Math.round(inside.length*share);
  for (let i = inside.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [inside[i], inside[j]] = [inside[j], inside[i]]; }
  haul = inside.slice(0, n); haulT = 0; seine.stow(); sfx.upgrade();
  if (!n){ toast('The seine came up empty. Loop it right round a school.', 2600); return; }
  if (holdTotal >= HOLD[lv.hold]){ haul = []; toast('The seine is full of fish, but the hold is full too, so they swim out again. Sell first.', 3200); return; }
  toast(`Seine closed round ${n} fish!${share < 1 ? ' Some slipped out under the loose loop: a tighter loop keeps more.' : ' Not one got away.'}`, 3200, 1); }
function updateSeine(dt){ const can = started && walker.aboard && !docked && swallowT <= 0 && !cine && hasSeine(bases), el = $('seineBtn');
  if (!can && seine.out) stowSeine();
  if (can !== seineShown){ seineShown = can; el.hidden = !can; }
  if (seine.out){ const st = seineStern(), ev = seine.follow(st.x, st.y);
    if (ev === 'closed') closeSeine();
    else if (ev === 'spent'){ stowSeine(); sfx.denied(); toast('The seine ran out before you got back to the buoy. A tighter loop!', 2800); } }
  const left = seine.out ? Math.round(seine.left*40)/40 : -1;
  if (left !== seineLeft){ seineLeft = left; el.classList.toggle('out', seine.out); el.style.setProperty('--left', String(Math.max(0, left)));
    el.setAttribute('aria-label', seine.out ? 'Haul the seine in' : 'Drop the seine'); }
  if (haul.length){ haulT -= dt;
    while (haulT <= 0 && haul.length){ const {f, sc} = haul.shift(); haulT += HAUL_GAP;
      if (holdTotal >= HOLD[lv.hold]){ haul = []; break; }
      if (f.alive) catchFish(f, sc); } } }
// Crab pots, opened by island 3's crab shed: drop one in home water, come back past it for the spider crabs.
let potShown = false, potLabel = '', potHaul = 0, potTold = false;
function potsAboard(){ return POTS - pots.length; }
function haulPot(p){ let n = 0; const room = HOLD[lv.hold] - holdTotal;
  while (p.crabs > 0 && n < room){ p.crabs--; n++; hold[CRAB]++; holdTotal++; log[CRAB]++; noteFirst(CRAB);
    flies.push({x0:p.x, y0:p.y, z0:0, to:'boat', t:-n*.1, dur:.4, c:SPECIES[CRAB].c, s:SPECIES[CRAB].s, crab:true}); }
  if (n){ sfx.fish(4, CRAB); toast(`Hauled ${n} spider crab${n === 1 ? '' : 's'} out of the pot!${p.crabs ? ' The hold is full: the rest wait in the pot.' : ''}`, 2400, 1); hud(); }
  else if (p.crabs && room <= 0) toast('The hold is full: the crabs wait in the pot.', 2000);
  return n; }
// A tap on the button is answered at once, not queued behind whatever else is showing.
function tapPot(){ audio(); if (!potShown) return; toasts.clear();
  const st = seineStern(), near = potNear(pots, boat.x, boat.y, POT_REACH) || potNear(pots, st.x, st.y, POT_REACH);
  if (near){ haulPot(near); pots.splice(pots.indexOf(near), 1); sfx.click(); toast(`Pot lifted aboard. ${potsAboard()} of ${POTS} on the boat.`, 2000); save(); return; }
  if (!potsAboard()){ sfx.denied(); toast(`All ${POTS} pots are out. Stop by one and tap here to lift it.`, 2600); return; }
  const why = canDrop(pots, st.x, st.y);
  if (why){ sfx.denied(); toast(why === 'deep' ? 'No crab pots past the buoys: the crabs live in home water.' : why === 'near' ? 'Too near your other pot. Spread them out.' : why === 'dock' ? 'Not in the dock. Drop it out in the water.' : 'Too near the island. Drop it further out.', 2400); return; }
  pots.push({x: st.x, y: st.y, crabs: 0, t: 0}); sfx.cast(); save();
  toast(potTold ? `Pot down. ${potsAboard()} left on the boat.` : 'Pot down! Spider crabs climb in for the bait, and pots further out fill faster. Come back past it later for the crabs.', potTold ? 1800 : 3600, 1); potTold = true; }
function updatePots(dt){ fillPots(pots, dt);
  const can = started && walker.aboard && !docked && swallowT <= 0 && !cine && hasPots(bases), el = $('potBtn');
  if (can !== potShown){ potShown = can; el.hidden = !can; }
  if (!can) return;
  // Come past a pot and its crabs come aboard; it stays down to fill again.
  potHaul -= dt;
  if (potHaul <= 0){ const p = potNear(pots, boat.x, boat.y, POT_REACH); if (p && p.crabs > 0){ haulPot(p); potHaul = 1.5; } }
  const st = seineStern(), near = !!(potNear(pots, boat.x, boat.y, POT_REACH) || potNear(pots, st.x, st.y, POT_REACH));
  const label = near ? 'lift' : String(potsAboard());
  if (label !== potLabel){ potLabel = label; $('potN').textContent = near ? '\u2191' : label;
    el.setAttribute('aria-label', near ? 'Lift the crab pot' : `Drop a crab pot (${potsAboard()} on the boat)`); el.classList.toggle('empty', !near && !potsAboard()); } }
// The trench, the kid's THE DEEP: stopped over it with the scuba gear, dive. The sea waits while the diver is down.
const diver = new Diver(), lurker = new Lurker(), trenchPl = clearOfLoot(trenchPlants()), trenchSh = trenchShoals();
// The wreck off island 5, the other place to dive: its weed, its groupers, and the bone sharks round it.
const wreckPl = wreckPlants(), wreckSh = wreckShoals(), boneSharks = [new BoneShark(0), new BoneShark(Math.PI)];
// Under the ice floe, the third: its kelp and stones, its cod, char and icefish, and Neil swimming along if he is yours.
const iceDivePl = icePlants(), iceDiveSh = iceShoals(), neilDive = {x: 0, y: 0, dir: 1};
let iceDiveTold = false;
// Island 11's black lagoon, the kid's, dived from its bank: its weed and glowing fungus, no fish to spear, its ten
// creatures (entities/lagoonfolk.ts), and the friends who can go under water swimming down too.
const lagoonPl = lagoonPlants(), LAGOON_SH = [], lagoonFolk = new LagoonFolk();
let divePals = [], lagoonTold = false, lagoonNoticed = false;
// The abyss past the white buoys, the kid's 1,000-metre dive, gone down in a cage (world/abyss.ts).
const abyssPl = abyssPlants(), abyssSh = abyssShoals();
let abyssToastT = 0;
// The Remoro, the kid's great silver fish on its floor (entities/remoro.ts): three spears land it, one a day.
const remoro = new Remoro();
let remoroTold = false;
// The giants of the deep passing the cage on the way down (entities/abyssgiants.ts): one slams into its bars.
const giants = new Giants();
// The gulper hunting over the floor, the lurker's hunt (entities/lurker.ts): out of the cage a while, it comes and bites air.
const floorGulper = new Lurker(ABYSS_LURK);
let gulperTold = false;
const GIANT_NAME = {leviathan: 'leviathan', reaper: 'Reaper', cthuluviathan: 'Cthuluviathan', cthulhu: 'Cthulhu', gulper: 'gulper'};
let diving = false, diveSite = 'trench', diveT = 0, diveBubT = 0, diveBubbles = [], diveShown = null, trenchToastT = 0, wreckToastT = 0, sharkTold = false;
function diveSh(){ return diveSite === 'wreck' ? wreckSh : diveSite === 'ice' ? iceDiveSh : diveSite === 'sub' ? subDive.shoals : diveSite === 'lagoon' ? LAGOON_SH : diveSite === 'abyss' ? abyssSh : trenchSh; }
// The treasure submarine's dive, the kid's (world/subsea.ts): the patch of the far deep the boat stopped over, its site,
// what grows and swims there and its treasure; and which of that treasure has been found today.
let subDive = {key: '', site: null, plants: [], shoals: [], loot: []}, subTold = false;
function subFoundHere(key){ if (subFound.day !== day){ subFound = {day, patches: {}}; } return subFound.patches[key] ?? 0; }
function subOpenWater(x, y){ return subWater(x, y) && mapIsles().every(i => Math.hypot(x - i.x, y - i.y) > i.r + 200); }
// Spearfishing down there: which fish are speared and when they are back, spears in flight, words off a catch, the aim.
let diveGone = noneGone(trenchSh), diveSpears = [], diveTexts = [], diveReload = 0, diveAim = null;
function hasScuba(){ return isle3Stage >= 1; }
// Over the trench is over its dark water, as far out as the patch drawn on the surface (it was a ring inside it,
// so a boat stopped on the bubbles could find no Dive button). The boat dives once it has all but stopped: this slow.
function overTrench(){ return Math.hypot(boat.x - TRENCH.x, boat.y - TRENCH.y) < TRENCH.r * 1.2; }
const DIVE_SLOW = 90;
let diveHintT = 0;
/** Stopped this near the wreck on island 5's rocks, the boat can dive to it. */
const WRECK_DIVE_R = 150;
function overWreck(){ return isle5Seen && Math.hypot(boat.x - WRECK.x, boat.y - WRECK.y) < WRECK_DIVE_R; }
function startDive(){ audio(); if (!diveShown) return; diveSite = diveShown; diving = true; boat.v = 0;
  if (diveSite === 'sub'){ const p = patchAt(boat.x, boat.y); subDive = {key: p.key, site: subSite(p.seed), plants: subPlants(p.seed), shoals: subShoals(p.seed), loot: subLoot(p.seed)}; }
  diver.reset(gear.tank ? TANK_AIR : AIR_MAX, diveSite === 'wreck' ? WRECK_SITE : diveSite === 'ice' ? ICE_SITE : diveSite === 'sub' ? subDive.site : diveSite === 'lagoon' ? LAGOON_SITE : diveSite === 'abyss' ? ABYSS_SITE : TRENCH_SITE, diveSite === 'ice' && !gear.white ? 1 / COLD_T : 0, diveSite === 'sub');
  lagoonFolk.reset(); divePals = diveSite === 'lagoon' ? lagoonPals() : [];
  neilDive.x = diver.x + 30; neilDive.y = diver.y + 20; diveGone = noneGone(diveSh()); lurker.reset(); boneSharks.forEach((b, i) => b.reset(i * Math.PI)); sharkTold = false;
  diveBubbles = []; stowSeine(); joy.on = false;
  document.body.classList.add('diving'); $('diveBtn').hidden = true; diveShown = null; $('surfaceBtn').hidden = false; $('surfaceBtn').textContent = diveSite === 'sub' ? 'Back up to the boat' : diveSite === 'abyss' ? 'Ride the cage up' : 'Swim back up'; sfx.spit(); toasts.clear();
  elThrow.hidden = !spear; throwShown = 'dive'; elThrow.classList.remove('harpoon', 'knife'); elThrow.setAttribute('aria-label', 'Throw the spear');
  if (diveSite === 'lagoon'){ const pals = divePals.map(p => p.kind === 'naga' ? 'the naga' : 'the baby Reaper'), who = pals.join(' and ');
    toast((lagoonTold ? 'Back down into the black lagoon.' : 'Down into the black lagoon! It is dark from the very top: only your lamp lights the way.')
      + (skullKey ? '' : ' Something glints, far down on the bottom.') + (lagoonTold ? '' : ' Its creatures live down here, and they claw at your tank.')
      + (spear ? ' Spear them!' : ' Bring a spear from the shipwright to fight them.')
      + (pals.length ? ` ${who[0].toUpperCase() + who.slice(1)} ${pals.length > 1 ? 'swim' : 'swims'} down with you.` : ''), lagoonTold ? 3400 : 6400, 1);
    lagoonTold = true; return; }
  if (diveSite === 'sub'){ const left = subDive.loot.filter((_, i) => !(subFoundHere(subDive.key) & (1 << i))).length;
    toast((subTold ? 'Down in the submarine.' : 'Down in the submarine! Drive with the stick; let go and it hovers where it is. No air to run out of in here.')
      + (left ? ` ${left === 1 ? 'One treasure is' : `${left} treasures are`} lying on the sea floor here: drive right up to one to pick it up with the claw.` : ' You have found all the treasure on this patch of sea floor today. Every patch of the far deep has its own: sail on and dive again.')
      + (spear ? ' Your spear fires from the submarine too.' : ''), subTold ? 3600 : 6200, 1); subTold = true; return; }
  if (diveSite === 'abyss'){ elThrow.hidden = true; remoro.reset(remoroHere(remoroDay, day)); remoroTold = false; giants.reset(Math.floor(Math.random() * 1e9)); floorGulper.reset(); gulperTold = false;
    toast(abyssDown ? 'Into the cage, and down the abyss: 1,000 metres.' : 'Into the dive cage! It goes down on the boat\'s rope, 1,000 metres, into the dark. In the cage you breathe from the boat: hold on and watch.', abyssDown ? 2600 : 5200, 1); return; }
  if (diveSite === 'wreck'){ toast(wreckChest ? 'Down to the wreck. Bone sharks circle it: keep moving, or spear them off.'
    : 'Down to the wreck! Its treasure is inside, at the back of the hold: swim in where the deck is torn open. Bone sharks circle it, but they cannot follow you inside.'
    + (spear ? ' Spear them off if they come for you.' : ''), wreckChest ? 3200 : 6000, 1); return; }
  if (diveSite === 'ice'){ toast((iceDiveTold ? 'Back under the ice.' : 'Down through the hole and under the ice! The ice is a roof over you, so a rope ties you to the hole: tap Swim back up and it pulls you back. Look for the cave, the tunnel, and things frozen in the ice.')
    + (gear.white ? '' : ' It is freezing down here: without a white scuba suit you will not last long.') + (spear ? ' Spear the cod and char.' : ''), iceDiveTold ? 2800 : 6400, 1);
    iceDiveTold = true; return; }
  toast((trenchDeep ? 'Back down the trench. Swim with the stick; let go and you drift up.' : 'Down into the trench! Swim with the stick; let go and you drift gently up. The deeper you go, the darker it gets, until only the glowing things light the way.')
    + (spear ? ' Throw your spear at the glowing fish.' : ' Bring a spear from the shipwright and you can spear the glowing fish down here.')
    + (foundCount(trenchLoot) < LOOT_ONCE ? ' Look out for things glinting: treasure!' : ''), trenchDeep ? 3600 : 5600, 1); }
// Back aboard: from the surface, or (quietly) when the game starts over.
function endDive(quiet){ const deepest = diver.deepest, trench = diveSite === 'trench', record = trench && deepest > trenchDeep + 1; diving = false; if (trench) trenchDeep = Math.max(trenchDeep, deepest);
  document.body.classList.remove('diving'); $('surfaceBtn').hidden = true; elThrow.hidden = true; throwShown = null; diveSpears = []; diveTexts = []; diveAim = null; divePals = []; if (quiet) return;
  sfx.spit(); toasts.clear(); toast(trench ? `Back aboard. ${record ? `Deepest yet: ${Math.round(deepest)}!` : `You went ${Math.round(deepest)} deep.`}` : diveSite === 'sub' ? 'Back up, and the submarine is winched back aboard.' : diveSite === 'abyss' ? (diver.deepest >= ABYSS_SITE.cage - 1 ? 'The cage comes up out of the blue hole, and you climb back aboard. 1,000 metres down and back!' : 'The cage comes back up, and you climb back aboard.') : diveSite === 'ice' ? 'Up through the hole, over the ice and back aboard.' : diveSite === 'lagoon' ? 'Up out of the black lagoon, dripping, and onto its bank.' : 'Back aboard from the wreck.', 2600, 1); save(); refreshShop(); }
function updateDive(dt){ diveT += dt;
  let ix = 0, iy = 0;
  if (joy.on){ const v = joystickVector(joy); ix = v[0]; iy = v[1]; } else { const v = keyVector(keys); ix = v[0]; iy = v[1]; }
  const ev = diver.update(dt, ix, iy);
  if (diveSite === 'trench'){ const lev = lurker.update(dt, diver, diver.state === 'up');
    if (lev === 'eyes') lurkerEyes(); else if (lev === 'tell') sfx.anglerOpen(); else if (lev === 'bite') lurkerBite(); }
  else if (diveSite === 'wreck') for (const b of boneSharks){ const sev = b.update(dt, diver, diver.state === 'up');
    if (sev === 'tell') sharkTell(); else if (sev === 'bite') sharkBite(b); }
  else if (diveSite === 'lagoon'){ for (const c of lagoonFolk.list){ const cev = c.update(dt, diver, diver.state === 'up');
      if (cev === 'notice') creatureNotice(); else if (cev === 'tell') sfx.hiss(); else if (cev === 'claw') creatureClaw(c); }
    for (const p of divePals){ const r = p.update(dt, diver, lagoonFolk); if (r) creatureHit(r.hit, r.beat, '#B8FFC8'); } }
  else if (diveSite === 'abyss'){ remoro.update(dt); giantEvent(giants.update(dt, diver.cage));
    const gev = floorGulper.update(dt, diver, diver.state === 'up' || diver.inCage);
    if (gev === 'eyes') gulperEyes(); else if (gev === 'tell') sfx.gulperHunt(); else if (gev === 'bite') gulperBite();
    if (remoro.here && !remoroTold && !diver.riding && !diver.inCage && remoro.nearest(diver.x, diver.y).d < 260){ remoroTold = true; sfx.leviathan(); toasts.clear();
      toast(log[REMORO] ? 'The Remoro, cruising over the floor. Three spears to land it.' : `Something huge and silver in the dark... the Remoro! A great silver fish, as big as Star, worth 190. ${spear ? 'Three spears land it: each one sends it darting off.' : 'Bring a spear from the shipwright to land it.'}`, log[REMORO] ? 2600 : 5600, 1); } }
  if (ev === 'floor'){ const first = !abyssDown; abyssDown = true; save(); refreshShop(); sfx.tierUp(); toasts.clear();
    toast(first ? 'The bottom of the abyss, 1,000 metres down! The door swings open. Swim out: your air only runs while you are out of the cage. Swim back in to fill your tank, and tap Ride the cage up to go home.' : `The bottom, 1,000 metres down. The door swings open.${remoro.here ? '' : ' The Remoro is gone for today.'}`, first ? 6400 : 2400, 1); }
  else if (ev === 'cage'){ sfx.spit(); }
  if (diveSite === 'abyss'){ const h = !spear || diver.riding; if (elThrow.hidden !== h) elThrow.hidden = h; }
  if (ev === 'low'){ toasts.clear(); toast(diveSite === 'abyss' ? 'Air running low! Swim back into the cage.' : 'Air running low! Head back up.', 2600, 2); sfx.denied(); }
  else if (ev === 'out'){ toasts.clear(); toast(diveSite === 'abyss' ? 'Out of air! You are pulled back into the cage, and up you go.' : diveSite === 'ice' ? 'Out of air! The rope pulls you back up through the hole.' : diveSite === 'lagoon' ? 'Out of air! You float back up to the bank.' : 'Out of air! You float back up to the boat.', 2600, 2); }
  else if (ev === 'chilly'){ toasts.clear(); toast('Brrr! You are getting cold. The shipwright\'s white scuba suit would keep you warm down here.', 3000, 2); sfx.denied(); }
  else if (ev === 'frozen'){ toasts.clear(); toast('Too cold! The rope pulls you back up through the hole, shivering.', 2800, 2); }
  // Neil, if he is yours, swims along just behind the diver under the ice.
  if (diveSite === 'ice'){ const tx = diver.x - diver.face * 34, ty = diver.y - 18, k = Math.min(1, dt * 2.2);
    if (Math.abs(tx - neilDive.x) > 2) neilDive.dir = tx > neilDive.x ? 1 : -1;
    neilDive.x += (tx - neilDive.x) * k; neilDive.y += (ty - neilDive.y) * k; ICE_SITE.keep(neilDive, 8); }
  diveBubT -= dt;
  if (diveBubT <= 0){ diveBubT = .35 + Math.random()*.3; diveBubbles.push(diver.sub ? {x: diver.x - diver.face*44, y: diver.y, r: 1.5 + Math.random()*2.4} : {x: diver.x + diver.face*10, y: diver.y - 6, r: 1.5 + Math.random()*1.8}); }
  for (const b of diveBubbles){ b.y -= (36 + b.r*8)*dt; b.x += Math.sin(diveT*3 + b.r*7)*8*dt; }
  diveBubbles = diveBubbles.filter(b => b.y > 0);
  // The spear: what the next throw would go for, the ones in flight, and what they hit.
  const sp = spearAt(spear); diveReload -= dt;
  const wreck = diveSite === 'wreck', reach = sp ? sp.range*REACH : 0;
  diveAim = sp && diver.state === 'swim' && !diver.riding ? (wreck ? sharkAim(reach) : diveSite === 'trench' ? lurkerAim(reach) : diveSite === 'lagoon' ? lagoonAim(reach) : diveSite === 'abyss' ? abyssAim(reach) : null) || aimAt(diveSh(), diveGone, diveT, diver, reach) : null;
  for (let i = diveSpears.length-1; i >= 0; i--){ const s = diveSpears[i], x0 = s.x, y0 = s.y, r = stepSpear(s, dt, diveSh(), diveGone, diveT);
    const shark = wreck ? boneSharks.find(b => b.hitBy(x0, y0, s.x, s.y)) : null, folk = diveSite === 'lagoon' ? lagoonFolk.hitBy(x0, y0, s.x, s.y) : null;
    if (r && r !== 'spent'){ diveSpears.splice(i, 1); catchDiveFish(r); }
    else if (diveSite === 'abyss' && remoro.hitBy(x0, y0, s.x, s.y)){ diveSpears.splice(i, 1); spearRemoro(); }
    else if (diveSite === 'abyss' && floorGulper.hitBy(x0, y0, s.x, s.y)){ diveSpears.splice(i, 1); stingGulper(); }
    else if (diveSite === 'trench' && lurker.hitBy(x0, y0, s.x, s.y)){ diveSpears.splice(i, 1); stingLurker(); }
    else if (shark){ diveSpears.splice(i, 1); stingShark(shark); }
    else if (folk){ diveSpears.splice(i, 1); creatureHit(folk, folk.hit(sp ? sp.power : 1), '#FFB37A'); }
    else if (r === 'spent') diveSpears.splice(i, 1); }
  if (diver.state === 'swim'){
    if (diveSite === 'ice'){ const li = iceLootNear(iceLoot, diver.x, diver.y); if (li !== null) takeIceLoot(li); }
    else if (diveSite === 'sub'){ const li = lootNear(subDive.loot, subFoundHere(subDive.key), diver.x, diver.y, false); if (li !== null) takeSubLoot(li); }
    else if (diveSite === 'lagoon'){ if (!skullKey && Math.hypot(diver.x - SKULL_KEY.x, diver.y - SKULL_KEY.y) < KEY_REACH) takeSkullKey(); }
    else if (diveSite === 'trench'){ const li = lootNear(TRENCH_LOOT, trenchLoot, diver.x, diver.y, pearlReady(pearlDay, day)); if (li !== null) takeLoot(li); }
    else if (wreck && !wreckChest && lootNear([WRECK_CHEST], 0, diver.x, diver.y, false) !== null) takeWreckChest(); }
  for (const t of diveTexts) t.t += dt*.8;
  diveTexts = diveTexts.filter(t => t.t < 1);
  const wait = diveReload > 0; if (wait !== throwWait){ throwWait = wait; elThrow.classList.toggle('wait', wait); }
  if (ev === 'surfaced') endDive(false); }
function diveThrow(){ const sp = spearAt(spear); if (!sp || diver.state !== 'swim' || diver.riding || diveReload > 0) return;
  diveReload = sp.reload; diveSpears.push(throwDiveSpear(diver, diveAim, sp.range*REACH)); sfx.spearThrow(); }
// A fish speared down there goes into the hold, if there is room; the first of a kind is told.
function catchDiveFish(f){ const S = diveSh()[f.si], sp = S.sp;
  if (holdTotal >= HOLD[lv.hold]){ sfx.denied(); toasts.clear(); toast('The hold is full. Swim up and sell first.', 2200); return; }
  const fresh = !log[sp]; spearFish(diveGone, f, diveT); hold[sp]++; holdTotal++; log[sp]++; noteFirst(sp); sfx.spearHit(); sfx.fish(2, sp);
  diveTexts.push({x: f.x, y: f.y, t: 0, msg: '+1 ' + SPECIES[sp].name, c: S.light ?? S.c});
  if (fresh){ toasts.clear(); toast(`A ${SPECIES[sp].name}! ${sp === LANTERN ? 'The same lanternfish as the far corners, down here in the dark.' : 'Your first. It is in the field guide now.'}`, 3000, 1); }
  hud(); }
// A giant passing the cage rumbles; the one that lunges roars first, then slams into the bars, which hold.
function giantEvent(ev){ if (!ev) return;
  if (ev === 'pass'){ sfx.leviathan(); return; }
  const g = giants.lunging ?? giants.list.find(x => x.lunges);
  if (ev === 'tell'){ if (g?.kind === 'reaper') sfx.reaperRoar(); else if (g?.kind === 'gulper') sfx.gulperHunt(); else sfx.anglerOpen(); return; }
  const c = diver.cage; sfx.clang(); sfx.whump(); toasts.clear();
  if (c) for (let i = 0; i < 16; i++) diveBubbles.push({x: c.x + (Math.random()-.5)*40, y: c.y + (Math.random()-.5)*50, r: 1.5 + Math.random()*3});
  const name = GIANT_NAME[g?.kind] ?? 'giant', who = g?.kind === 'gulper' ? 'A gulper' : `The ${name}`;
  toast(abyssDown ? `${who} slams into the cage! The bars hold.` : `${who} slams into the cage! The bars hold: nothing can get you in here.`, 2800, 1); }
// The cage, shaking a moment from a slam.
function shaken(c){ return giants.shake > 0 ? {...c, x: c.x + Math.sin(diveT * 70) * giants.shake * 5} : c; }
// In the abyss the spear goes for whichever is nearest: a deep fish, the Remoro, or the gulper coming for you.
function abyssAim(reach){ const near = (p) => p ? Math.hypot(p.x - diver.x, p.y - diver.y) : Infinity;
  const g = floorGulper.out && near(floorGulper) <= reach && (floorGulper.x - diver.x)*diver.face >= -8 ? {x: floorGulper.x, y: floorGulper.y} : null;
  return [aimAt(diveSh(), diveGone, diveT, diver, reach), remoro.aim(diver, reach), g].reduce((a, b) => near(b) < near(a) ? b : a, null); }
// The gulper over the floor: out of the dark it comes for a diver out of the cage, gapes, and bites air; the cage is
// safe, and a spear stings it off.
function gulperEyes(){ sfx.gulperHunt(); toasts.clear();
  toast(gulperTold ? 'The gulper is coming.' : `A gulper, out of the dark! It hunts over the floor and bites air out of your tank. When its mouth gapes wide, swim aside, or get back in the cage, where it can't reach you.${spear ? ' Throw your spear to drive it off.' : ''}`, gulperTold ? 2000 : 5600, 2);
  gulperTold = true; }
function gulperBite(){ diver.air = Math.max(0, diver.air - BITE); diver.vx += Math.cos(floorGulper.a)*160; diver.vy += Math.sin(floorGulper.a)*160;
  for (let i = 0; i < 14; i++) diveBubbles.push({x: diver.x + (Math.random()-.5)*16, y: diver.y - 4 - Math.random()*12, r: 1.5 + Math.random()*2.8});
  sfx.gulp(); toasts.clear();
  toast(diver.air > 0 ? 'Gulp! The gulper bit your tank, and air bubbles out. Back to the cage!' : 'Gulp! The gulper bit your tank, and the last of your air bubbles out.', 2800, 2); }
function stingGulper(){ floorGulper.sting(); sfx.spearHit(); toasts.clear();
  diveTexts.push({x: floorGulper.x, y: floorGulper.y - 20, t: 0, msg: 'Stung!', c: '#FFB37A'});
  toast('Stung! The gulper shoots back into the dark, and stays away a good while.', 2400, 1); }
// The Remoro struck: it darts off, and the third spear lands it, into the hold, if there is room; then it is gone till tomorrow.
function spearRemoro(){ const last = remoro.hits + 1 >= REMORO_HITS, room = holdTotal < HOLD[lv.hold], landed = remoro.spear(diver.x, room); toasts.clear();
  if (landed){ const fresh = !log[REMORO]; hold[REMORO]++; holdTotal++; log[REMORO]++; noteFirst(REMORO); remoroDay = day; save(); sfx.spearHit(); sfx.rareCaught();
    diveTexts.push({x: remoro.x, y: remoro.y - 34, t: 0, msg: '+1 Remoro!', c: '#E8F4FF'});
    toast(fresh ? 'You landed the Remoro! The great silver fish, worth 190, is in the hold. Your first: it is in the field guide now. Another comes tomorrow.' : 'You landed the Remoro! Worth 190. Another comes tomorrow.', fresh ? 5200 : 3200, 1); hud(); return; }
  if (last && !room){ sfx.denied(); toast('The hold is full! The Remoro shakes off the spear. Ride up and sell, then come back for it.', 3000, 2); return; }
  sfx.spearHit(); diveTexts.push({x: remoro.x, y: remoro.y - 34, t: 0, msg: 'Hit!', c: '#E8F4FF'});
  toast(remoro.hits === 1 ? 'A hit! The Remoro darts off. Two more spears land it.' : 'Another hit! One more spear lands it.', 2200, 1); }
// The lurker, the kid's thing in the dark: its eyes come out of it, it bites air, and a spear drives it off.
function lurkerEyes(){ sfx.leviathan(); toasts.clear();
  toast(lurkerSeen ? 'Eyes in the dark: the lurker is coming.' : 'Two eyes in the dark... something big lives down here! It bites air out of your tank. When its eyes go orange, swim out of the way.'
    + (lurkerSeen ? '' : spear ? ' Throw your spear to drive it off.' : ' Swim up out of the dark to lose it, and bring a spear next time to drive it off.'), lurkerSeen ? 2200 : 5600, 2);
  if (!lurkerSeen){ lurkerSeen = true; save(); refreshShop(); } }
function lurkerBite(){ diver.air = Math.max(0, diver.air - BITE); diver.vx += Math.cos(lurker.a)*160; diver.vy += Math.sin(lurker.a)*160;
  for (let i = 0; i < 14; i++) diveBubbles.push({x: diver.x + (Math.random()-.5)*16, y: diver.y - 4 - Math.random()*12, r: 1.5 + Math.random()*2.8});
  sfx.anglerSnap(); toasts.clear();
  toast(diver.air > 0 ? 'Chomp! It bit your tank, and air bubbles out. When its eyes go orange, swim aside!' : 'Chomp! It bit your tank, and the last of your air bubbles out.', 2800, 2); }
function lurkerAim(range){ if (!lurker.out) return null; const dx = lurker.x - diver.x, dy = lurker.y - diver.y;
  return Math.hypot(dx, dy) <= range && dx*diver.face >= -8 ? {x: lurker.x, y: lurker.y} : null; }
function stingLurker(){ lurker.sting(); lurkerStung++; sfx.spearHit(); toasts.clear();
  diveTexts.push({x: lurker.x, y: lurker.y - 20, t: 0, msg: 'Stung!', c: '#FFB37A'});
  toast(lurkerStung === 1 ? 'Your spear stung it! It shot back into the dark, and it will stay away a good while.' : 'Stung! Back into the dark it goes.', 2600, 1); save(); refreshShop(); }
// The bone sharks round the wreck: a warning, a rush that bites air, and a spear stings one off.
function sharkTell(){ sfx.sharkWarning(); if (sharkTold) return; sharkTold = true; toasts.clear();
  toast('A bone shark is coming for you! When its jaw opens, swim aside, or get inside the wreck: they cannot follow you in.' + (spear ? ' Or spear it.' : ''), 4200, 2); }
function sharkBite(b){ diver.air = Math.max(0, diver.air - BITE); diver.vx += Math.cos(b.a)*150; diver.vy += Math.sin(b.a)*150;
  for (let i = 0; i < 12; i++) diveBubbles.push({x: diver.x + (Math.random()-.5)*16, y: diver.y - 4 - Math.random()*12, r: 1.5 + Math.random()*2.8});
  sfx.anglerSnap(); toasts.clear();
  toast(diver.air > 0 ? 'Chomp! A bone shark bit your tank, and air bubbles out.' : 'Chomp! A bone shark bit your tank, and the last of your air bubbles out.', 2600, 2); }
function sharkAim(range){ let best = null, bd = range;
  for (const b of boneSharks){ if (!b.out) continue; const dx = b.x - diver.x, dy = b.y - diver.y, d = Math.hypot(dx, dy);
    if (d < bd && dx*diver.face >= -8){ bd = d; best = {x: b.x, y: b.y}; } }
  return best; }
function stingShark(b){ b.sting(); sfx.spearHit(); toasts.clear(); diveTexts.push({x: b.x, y: b.y - 16, t: 0, msg: 'Stung!', c: '#FFB37A'});
  toast('Stung! The bone shark swims off.', 2000, 1); }
// The black lagoon's creatures (entities/lagoonfolk.ts): one notices you, raises its claws and claws your tank; a spear,
// or a friend's trident or nip, beats one; and on the bottom, the skull key.
/** The naga and the baby Reaper, if they are with you ashore, go down too. */
function lagoonPals(){ const out = [];
  if (naga.free && naga.shown) out.push(new DivePal('naga', diver.x - 34, diver.y + 4));
  if (baby.free && baby.shown) out.push(new DivePal('baby', diver.x - 26, diver.y + 24));
  return out; }
function creatureNotice(){ sfx.grr(); if (lagoonNoticed) return; lagoonNoticed = true; toasts.clear();
  toast('A lagoon creature is coming for you! It is slower than you: when it raises its claws, swim away.' + (spear ? ' Or spear it: two hits and it gives up.' : ''), 4200, 2); }
function creatureClaw(c){ diver.air = Math.max(0, diver.air - CLAW_AIR); diver.vx += c.face*140; diver.vy -= 30;
  for (let i = 0; i < 10; i++) diveBubbles.push({x: diver.x + (Math.random()-.5)*16, y: diver.y - 4 - Math.random()*12, r: 1.5 + Math.random()*2.4});
  sfx.anglerSnap(); toasts.clear();
  toast(diver.air > 0 ? 'Scratch! It clawed your tank, and air bubbles out.' : 'Scratch! It clawed your tank, and the last of your air bubbles out.', 2400, 2); }
function lagoonAim(range){ const c = lagoonFolk.aim(diver, range); return c ? {x: c.x, y: c.y} : null; }
/** One is hit, by your spear or a friend: words over it, and if that beat it, how many are left. */
function creatureHit(c, beat, col){ sfx.spearHit(); diveTexts.push({x: c.x, y: c.y - 16, t: 0, msg: beat ? 'Beaten!' : 'Hit!', c: col});
  if (!beat) return; sfx.splash(); const n = lagoonFolk.left; toasts.clear();
  toast(n ? `It gives up and swims off down into the dark. ${n} left down here.` : 'That was the last of them! The black lagoon is quiet.', 2200, 1); }
function takeSkullKey(){ skullKey = true; sfx.tierUp(); shake = Math.max(shake, .2);
  diveTexts.push({x: SKULL_KEY.x, y: SKULL_KEY.y - 16, t: 0, msg: 'The skull key!', c: '#CFFFC8'}); toasts.clear();
  toast('The skull key! An old key of bone, with a grinning skull for its handle. Somewhere past the portal, a door is waiting for it.', 5200, 2); save(); refreshShop(); }
// A thing frozen in the ice under the floe: swim up to it and chip it out, once.
function takeIceLoot(i){ const l = ICE_LOOT[i]; iceLoot |= 1 << i; coins += l.coins; earned += l.coins; sfx.orderFilled(); shake = Math.max(shake, .15);
  diveTexts.push({x: l.x, y: l.y - 14, t: 0, msg: '+' + l.coins, c: '#FFD34D'});
  const n = iceFound(iceLoot); toasts.clear();
  toast(`You chip ${l.name} out of the ice! +${l.coins} coins. ${n === ICE_LOOT.length ? 'That is everything frozen in the ice.' : `${n} of ${ICE_LOOT.length} frozen things found.`}`, 3200, 1);
  hud(); refreshShop(); save(); }
// The wreck's treasure: at the back of its hold, found once.
function takeSubLoot(i){ const l = subDive.loot[i], f = subFoundHere(subDive.key) | (1 << i); subFound.patches[subDive.key] = f;
  const keys = Object.keys(subFound.patches); if (keys.length > 120) delete subFound.patches[keys[0]];
  coins += l.coins; earned += l.coins; sfx.orderFilled(); diveTexts.push({x: l.x, y: l.y - 10, t: 0, msg: '+' + l.coins, c: '#FFD34D'});
  const left = subDive.loot.filter((_, j) => !(f & (1 << j))).length; toasts.clear();
  toast(`The claw grabs ${l.name}! +${l.coins} coins.` + (left ? ` ${left} more here.` : ' That is all the treasure on this patch today. Sail on: every patch of the far deep has its own.'), 3200, 1);
  hud(); refreshShop(); save(); }
function takeWreckChest(){ wreckChest = true; const c = WRECK_CHEST.coins; coins += c; earned += c; sfx.orderFilled(); shake = Math.max(shake, .2);
  diveTexts.push({x: WRECK_CHEST.x, y: WRECK_CHEST.y - 14, t: 0, msg: '+' + c, c: '#FFD34D'});
  toasts.clear(); toast(`The wreck's treasure! A chest full of gold: +${c} coins.`, 3600, 1); hud(); refreshShop(); save(); }
// Treasure in the trench: swim up to it and it is yours, once; the giant clam's pearl grows back every dawn.
function takeLoot(i){ const l = TRENCH_LOOT[i], pearl = l.kind === 'clam', first = pearl && !pearlDay;
  if (pearl) pearlDay = day; else trenchLoot |= 1 << i;
  coins += l.coins; earned += l.coins; sfx.orderFilled();
  diveTexts.push({x: l.x, y: l.y - 10, t: 0, msg: '+' + l.coins, c: '#FFD34D'});
  const n = foundCount(trenchLoot); toasts.clear();
  toast(pearl ? (first ? `A pearl in the giant clam! +${l.coins} coins. It grows a new one every dawn.` : `A pearl! +${l.coins} coins.`)
    : `${l.name[0].toUpperCase() + l.name.slice(1)}! +${l.coins} coins. ${n === LOOT_ONCE ? `That is all ${n} treasures in the trench.` : `${n} of ${LOOT_ONCE} treasures found.`}`, 3000, 1);
  hud(); refreshShop(); save(); }
// Over the trench, stopped, the Dive button; and the first sight of it.
function updateTrench(dt){ trenchToastT -= dt;
  const near = Math.hypot(boat.x - TRENCH.x, boat.y - TRENCH.y) < TRENCH.r + TRENCH_SIGHT;
  if (near && walker.aboard && !trenchSeen){ trenchSeen = true; save(); refreshShop(); trenchToastT = 30;
    toast(hasScuba() ? 'A trench! The water here goes down and down, and bubbles come up from the dark. Stop over the bubbles to dive.' : 'A trench! The water here goes down and down, and bubbles come up from the dark. You need scuba gear to dive: it is in island 3\'s tower.', 4600, 1); sfx.tierUp(); }
  // The abyss past the white buoys: told once, the first time the boat comes near it.
  if (walker.aboard && !abyssSeen && nearAbyss(boat.x, boat.y) && pastFarFar(boat.x, boat.y)){ abyssSeen = true; save(); refreshShop(); abyssToastT = 30; sfx.tierUp();
    toast(hasScuba() ? 'A blue hole! The brightest blue, with a small dark middle: under it the sea goes down 1,000 metres. Stop over the dark middle to dive in the cage.' : 'A blue hole! The brightest blue, with a small dark middle: under it the sea goes down 1,000 metres. You need scuba gear to dive: it is in island 3\'s tower.', 5200, 1); }
  abyssToastT -= dt;
  if (!hasScuba() && overAbyss(boat.x, boat.y) && walker.aboard && abyssToastT <= 0){ abyssToastT = 20; toast('To dive here you need scuba gear: it is in island 3\'s tower.', 2600); }
  const can = started && walker.aboard && !docked && swallowT <= 0 && !cine && hasScuba() && boat.v < DIVE_SLOW;
  // Over a place to dive but still under way: how to dive there, now and then.
  diveHintT -= dt;
  if (started && walker.aboard && !docked && !cine && hasScuba() && boat.v >= DIVE_SLOW && (overTrench() || overWreck() || overAbyss(boat.x, boat.y)) && diveHintT <= 0){ diveHintT = 15;
    toast('Let go of the stick and let the boat slow down here: then tap Dive.', 2800); }
  const canSub = started && walker.aboard && !docked && swallowT <= 0 && !cine && sub && boat.v < DIVE_SLOW && subOpenWater(boat.x, boat.y) && !alongsideFloe(boat.x, boat.y);
  // Ashore on island 11 at the black lagoon's edge, with the scuba gear: dive in off the bank.
  const canLagoon = started && walker.state === 'ashore' && walker.dock === ISLE11_DOCK && floor < 0 && !cine && hasScuba() && byLagoon11(walker.x, walker.y, 40);
  const show = (can ? (overTrench() ? 'trench' : overWreck() ? 'wreck' : overAbyss(boat.x, boat.y) ? 'abyss' : iceSeen && alongsideFloe(boat.x, boat.y) ? 'ice' : null) : null) ?? (canSub ? 'sub' : null) ?? (canLagoon ? 'lagoon' : null);
  if (show !== diveShown){ diveShown = show; const el = $('diveBtn'); el.hidden = !show; document.body.classList.toggle('floedive', show === 'ice');
    if (show) el.textContent = show === 'wreck' ? 'Dive to the wreck' : show === 'ice' ? 'Dive under the ice' : show === 'sub' ? 'Dive in the submarine' : show === 'lagoon' ? 'Dive into the lagoon' : show === 'abyss' ? 'Dive into the abyss' : 'Dive into the trench'; }
  // Near the wreck on island 5's rocks with its treasure still in it, the game says it can be dived.
  wreckToastT -= dt;
  if (hasScuba() && !wreckChest && isle5Seen && walker.aboard && wreckToastT <= 0 && Math.hypot(boat.x - WRECK.x, boat.y - WRECK.y) < 420){ wreckToastT = 45;
    toast('The wreck on the rocks! Its treasure is still inside. Stop right beside it to dive down.', 3600, 1); }
  if (!hasScuba() && overTrench() && walker.aboard && trenchToastT <= 0){ trenchToastT = 20; toast('To dive here you need scuba gear: it is in island 3\'s tower.', 2600); } }
// The ice floe in the far deep's north-west corner, the kid's ice fishing, with the kit the Reaper leaves: alongside
// it, all but stopped, Ice fish; the line goes down through its hole and comes up with what it hooks. The sea waits.
// The fish under the hole are a day's worth; what is caught stays caught until the next dawn.
let icing = false, iceRun = null, icePoolDay = -1, icePoolList = [], iceToastT = 0, iceHintT = 0, iceTold = false, iglooShown = null;
function hasIceKit(){ return driven.reaper > 0; }
function poolToday(){ if (icePoolDay !== day){ icePoolDay = day; icePoolList = icePool(day); } return icePoolList; }
function updateFloe(dt){ iceToastT -= dt; iceHintT -= dt;
  const d = Math.hypot(boat.x - ICE_FLOE.x, boat.y - ICE_FLOE.y);
  if (!iceSeen && walker.aboard && started && d < 900){ iceSeen = true; save(); refreshShop(); iceToastT = 30;
    toast(hasIceKit() ? 'An ice floe, with seals on it and a hole cut in the ice! Bring the boat alongside and stop, then Ice fish.'
      : 'An ice floe out here, with seals on it and a hole cut in the ice. To fish through it you would need an ice fishing kit: the Reaper is said to carry one.', 5200, 1); sfx.tierUp(); }
  const along = alongsideFloe(boat.x, boat.y);
  const here = started && walker.aboard && !docked && swallowT <= 0 && !cine && boat.v < DIVE_SLOW && along;
  const can = here && hasIceKit();
  $('iceBtn').hidden = !can;
  // The igloo, built from the boat: then somewhere to sleep till morning, though not when it is morning already.
  const igloo = here && iceSeen ? (bases.floe < 1 ? 'build' : phase !== 'Dawn' ? 'sleep' : null) : null;
  if (igloo !== iglooShown){ iglooShown = igloo; const el = $('iglooBtn'); el.hidden = !igloo;
    if (igloo) el.textContent = igloo === 'sleep' ? 'Sleep till morning' : 'Build an igloo'; }
  if (along && walker.aboard && !docked && iceToastT <= 0 && !hasIceKit()){ iceToastT = 25; toast('You need an ice fishing kit to fish through the ice. The Reaper carries one: drive him off.', 3000); }
  if (along && walker.aboard && !docked && hasIceKit() && boat.v >= DIVE_SLOW && iceHintT <= 0){ iceHintT = 15; toast('Let go of the stick and let the boat slow down by the ice: then tap Ice fish.', 2800); } }
function startIce(){ audio(); const pool = poolToday();
  if (!leftToCatch(pool)){ toast('The fish under the hole are all caught today. Come back tomorrow.', 3000, 1); return; }
  icing = true; iceRun = new IceRun(pool); iceSeal = neil.free ? new IceSeal() : null; boat.v = 0; stowSeine(); joy.on = false; sfx.spit(); toasts.clear();
  document.body.classList.add('icing'); $('iceBtn').hidden = true; $('iceDrop').hidden = false; $('iceLeave').hidden = false;
  toast(iceTold ? 'Tap Drop the line.' : 'Drop the line: down, down, down it goes. On the way up, steer it into fish to hook them. Keep off the jellies!', iceTold ? 1800 : 5200, 1);
  iceTold = true; }
function iceDrop(){ audio(); if (!iceRun) return; iceRun.drop(); $('iceDrop').hidden = true; $('iceLeave').hidden = true; sfx.cast(); }
function endIce(){ const f = iceSeal?.finish(); if (f) neilCatch(f); iceSeal = null; icing = false; iceRun = null; document.body.classList.remove('icing'); $('iceDrop').hidden = true; $('iceLeave').hidden = true; save(); refreshShop(); }
function updateIce(dt){ let ix = 0;
  if (joy.on) ix = joystickVector(joy)[0]; else ix = keyVector(keys)[0];
  const ev = iceRun.update(dt, iceRun.phase === 'drop' || iceRun.phase === 'reel' ? ix : 0);
  if (iceSeal){ if (ev === 'bottom' && Math.random() < SEAL_CHANCE) iceSeal.dive(iceRun.pool);
    const f = iceSeal.update(dt); if (f) neilCatch(f); }
  if (ev === 'bottom') sfx.plip();
  else if (ev === 'hook') sfx.strike();
  else if (ev === 'sting'){ sfx.zap(); toast('A jelly! It stung, and a fish wriggled off the line.', 2000); }
  else if (ev === 'done'){ iceRuns++; const got = [], full = [];
    for (const f of iceRun.line){ if (holdTotal >= HOLD[lv.hold]){ f.caught = false; full.push(f); continue; }
      const sp = f.sp; if (!log[sp]) toast(`First ${SPECIES[sp].name}! It is in the field guide now.`, 2600, 1);
      hold[sp]++; holdTotal++; log[sp]++; noteFirst(sp); got.push(sp); }
    const counts = new Map(); for (const sp of got) counts.set(sp, (counts.get(sp) || 0) + 1);
    const said = [...counts].map(([sp, n]) => n === 1 ? `a${'aeiou'.includes(SPECIES[sp].name[0]) ? 'n' : ''} ${SPECIES[sp].name}` : `${n} ${SPECIES[sp].pl}`).join(', ');
    if (got.length) sfx.fish(got.length, got[got.length - 1]);
    toast(got.length ? `Up through the hole: ${said}!${full.length ? ' The hold is full: the rest went back.' : ''}` : full.length ? 'The hold is full: they went back down the hole.' : 'Nothing on the line that time. Steer into the fish on the way up.', 3000, 1);
    const left = leftToCatch(iceRun.pool);
    $('iceLeave').hidden = false; if (left) $('iceDrop').hidden = false;
    else toast('That is all the fish under the hole today. Come back tomorrow.', 3200, 1);
    hud(); save(); } }
$('iceBtn').addEventListener('click', startIce);
// The igloo: built like a hut, with driftwood and coins, then a bed till morning, when the hole's fish are back.
function buildIgloo(){ const S = FLOE_BASE.stages[0];
  if (wood < S.wood || coins < S.coins){ toast(`An igloo takes ${S.wood} driftwood and ${S.coins} coins. You have ${wood} driftwood and ${coins} coins.`, 3200); return; }
  wood -= S.wood; coins -= S.coins; bases.floe = 1; sfx.build(); shake = Math.max(shake, .3);
  toasts.clear(); toast(S.built, 5200, 1); hud(); hudWood(); refreshShop(); save(); iglooShown = null; }
function sleepTillDawn(){ if (phase === 'Dawn') return; irisT = SPIT; clock = 0; lastPhase = 'Night'; sfx.phaseChange();
  toasts.clear(); toast('A night in the igloo, warm as toast. Morning! The fish are back under the hole.', 3600, 1); save(); }
$('iglooBtn').addEventListener('click', () => { audio(); if (bases.floe >= 1) sleepTillDawn(); else buildIgloo(); });
$('iceDrop').addEventListener('click', iceDrop);
$('iceLeave').addEventListener('click', () => { audio(); endIce(); toast('Back aboard from the ice.', 1800); });
// The trench from the surface: a patch of darker water with bubbles coming up.
function drawTrenchMark(){ if (!onScreen(TRENCH.x, TRENCH.y, (TRENCH.r + 60)*Z)) return;
  const g = ctx.createRadialGradient(px(TRENCH.x, TRENCH.y), py(TRENCH.x, TRENCH.y), 0, px(TRENCH.x, TRENCH.y), py(TRENCH.x, TRENCH.y), TRENCH.r*1.2*Z);
  g.addColorStop(0, 'rgba(2,10,24,.5)'); g.addColorStop(1, 'rgba(2,10,24,0)');
  ctx.fillStyle = g; isoEllipse(TRENCH.x, TRENCH.y, TRENCH.r*1.2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 9; i++){ const t = (T*.6 + i*.37) % 1, a = i*2.4, r = 20 + (i*31) % 90, x = TRENCH.x + Math.cos(a)*r, y = TRENCH.y + Math.sin(a)*r;
    ctx.globalAlpha = 1 - t; ctx.beginPath(); ctx.arc(px(x,y), py(x,y,t*6), (2 + t*3)*Z, 0, Math.PI*2); ctx.fill(); }
  ctx.globalAlpha = 1; }
// The kid's rod: stopped near some lionfish, cast; when the float goes under, reel in, for the bounty.
const rod = new Rod();
let rodAt = null, rodShown = false;
function rodNear(){ return lionfish.here && started && walker.aboard && !docked && gear.rod && !fight ? lionfish.nearestFish(boat.x, boat.y, ROD_RANGE) : null; }
function useRod(){ audio();
  if (rod.state === 'idle'){ const n = rodNear(); if (!n || boat.v > ROD_SPEED) return; rodAt = n; rod.cast(Math.random()); sfx.cast(); return; }
  rodDone(rod.reel()); }
function rodDone(r){ const at = rodAt; rodAt = null; if (!at || !r) return;
  if (r === 'caught'){ lionfish.take(at.f); const first = !lionCaught; lionCaught++; coins += LION_BOUNTY; earned += LION_BOUNTY; sfx.orderFilled();
    addText(at.x, at.y, 30, '+' + LION_BOUNTY, C.coin, 22, 2);
    if (first){ toasts.clear(); toast(`A lionfish! Every one you catch pays a ${LION_BOUNTY}-coin bounty: they don't belong in this sea.`, 3600, 1); }
    hud(); save(); return; }
  addText(at.x, at.y, 26, r === 'early' ? 'Too soon!' : 'It let go', '#FFF3C4', 17, 1.3); sfx.denied(); }
function updateRod(dt){
  if (rod.state !== 'idle' && (!rodAt || rodAt.f.away > 0 || boat.v > ROD_SPEED * 1.5 || !walker.aboard || docked)){ rod.stop(); rodAt = null; }
  const ev = rod.update(dt); if (ev === 'bite') sfx.strike(); else if (ev === 'late') rodDone('late');
  if (rodAt){ const [x, y] = lionAt(rodAt.g, rodAt.f); rodAt.x = x; rodAt.y = y; }
  const el = $('rodcast'), show = rod.state !== 'idle' || (!!rodNear() && boat.v <= ROD_SPEED);
  if (show !== rodShown){ rodShown = show; el.hidden = !show; }
  if (!show) return;
  const label = rod.state === 'bite' ? 'Reel in!' : rod.state === 'wait' ? 'Wait for it\u2026' : 'Cast for lionfish';
  if (el.textContent !== label){ el.textContent = label; el.classList.toggle('bite', rod.state === 'bite'); } }
// Fishing at island 10's pond, the kid's, peaceful on purpose (fishing/pond.ts): at its edge, cast; when the float goes
// under, reel in. A fish missed swims off and another comes; too soon changes nothing. The catch goes in the hold.
const pondLine = new PondLine();
let pondAt = null, pondShown = false, pondEarlyTold = false;
function pondNear(){ return started && walker.state === 'ashore' && walker.dock === ISLE10_DOCK && !inFight() ? castSpot(POND, walker.x, walker.y) : null; }
function usePond(){ audio();
  if (pondLine.state === 'idle'){ const at = pondNear(); if (!at) return; pondAt = at; pondLine.cast(Math.random()); pondEarlyTold = false; sfx.cast(); return; }
  const r = pondLine.reel();
  if (r === 'early'){ if (!pondEarlyTold && pondAt){ pondEarlyTold = true; addText(pondAt.x, pondAt.y, 16, 'Not yet\u2026', '#FFF3C4', 15, 1.2); toasts.clear(); toast('Wait for the float to go under, then reel in.', 2200); } return; }
  if (r === 'caught') pondCatch(pondLine.sp); }
function pondCatch(sp){ const at = pondAt; pondAt = null; if (!at) return; const S = SPECIES[sp];
  if (holdTotal >= HOLD[lv.hold]){ addText(at.x, at.y, 16, 'Plop!', '#E3ECEF', 15, 1.2); toasts.clear(); toast(`A ${S.name}! But the hold is full, so you let it go.`, 2600); sfx.plip(); return; }
  const firstOne = !first[sp]; hold[sp]++; holdTotal++; log[sp]++; noteFirst(sp);
  flies.push({x0: at.x, y0: at.y, z0: 0, to: 'figure', t: 0, dur: .6, c: S.c, s: S.s});
  addText(walker.x, walker.y, 40, `A ${S.name}!`, '#FFF3C4', 17, 1.6); sfx.snookLanded(firstOne);
  if (firstOne){ toasts.clear(); toast(`Your first ${S.name}! Four kinds of fish live in this pond. How many can you find?`, 3200, 1); }
  hud(); save(); }
function updatePond(dt){
  if (pondLine.state !== 'idle' && !pondNear()){ pondLine.stop(); pondAt = null; }
  const ev = pondLine.update(dt, Math.random(), Math.random());
  if (ev === 'nibble') sfx.plip(); else if (ev === 'bite') sfx.strike(); else if (ev === 'away' && pondAt) addText(pondAt.x, pondAt.y, 16, 'It swam off', '#FFF3C4', 14, 1.2);
  const el = $('pondcast'), show = pondLine.state !== 'idle' || !!pondNear();
  if (show !== pondShown){ pondShown = show; el.hidden = !show; }
  if (!show) return;
  const label = pondLine.state === 'bite' ? 'Reel in!' : pondLine.state === 'idle' ? 'Cast into the pond' : 'Wait for it\u2026';
  if (el.textContent !== label){ el.textContent = label; el.classList.toggle('bite', pondLine.state === 'bite'); } }
$('pondcast').addEventListener('click', usePond);
// The pond's songbirds: one sings every few seconds while the figure is near by day (entities/pond10.ts).
const pondBirds = new PondBirds();
pondBirds.onSing = (b, level) => { if (ambience && !muted) ambience.songbird(b.kind, panFor(b.x - walker.x, b.y - walker.y), level); };
// The line out to the float, which bobs, then goes under in a ring when a lionfish takes it.
function drawRod(){ if (!rodAt || rod.state === 'idle') return;
  const bx = px(boat.x, boat.y), by = py(boat.x, boat.y, 30*bk()), fx = px(rodAt.x, rodAt.y), fy = py(rodAt.x, rodAt.y, 0), bite = rod.state === 'bite';
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2*Z; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx+fx)/2, (by+fy)/2 + (bite ? 10 : 26)*Z, fx, fy); ctx.stroke();
  if (bite){ const t = (T*2.4)%1; ctx.strokeStyle = C.foam; ctx.globalAlpha = .9*(1-t); ctx.lineWidth = 2.4*Z;
    ctx.beginPath(); ctx.ellipse(fx, fy, (6+22*t)*Z, (3+10*t)*Z, 0, 0, Math.PI*2); ctx.stroke(); ctx.globalAlpha = 1; return; }
  const bob = Math.sin(T*4)*1.5*Z; ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(fx, fy+bob, 3.4*Z, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = C.hull; ctx.beginPath(); ctx.arc(fx, fy+bob-1.6*Z, 3.4*Z, Math.PI, 0); ctx.fill(); }
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
// The kid's meteor serpent, Star (he named it), haunts island 6: it loops high over the island, hunts a flagship that comes near, and
// dives head-first into a ring on the water where the boat is going. Steer out of it; harpoon it while it thrashes.
// It holds off while the Deep One or the Reaper is up, so two never come at once.
const serpent = new MeteorSerpent();
let serpentTold = false, splashTold = false;
serpent.holdOff = () => reaper.hunting;
// Star is afraid of anything bigger than it, the kid's: the Deep One up out of the water, and (the owner's call) the
// walkable big ship once there is one, never the boat's upgrades. Off to space until it has gone.
serpent.scaredOf = () => deep.state === 'rise' || deep.state === 'fight' || deep.state === 'drag';
// Said over him as he goes; and told once he is up there, so it waits its turn behind the Deep One's own warning.
serpent.onScared = () => { sfx.meteorDive(); addText(serpent.x, serpent.y, serpent.z + 40, 'Too big! Off to space!', '#FFD27A', 18, 2); };
serpent.onSpace = () => { if (Math.hypot(serpent.x - boat.x, serpent.y - boat.y) > 1400) return;
  toast("Star saw the Deep One and shot up into space! He's afraid of anything bigger than him. He'll be back once it's gone.", 4200, 1); };
serpent.onSight = () => { if (meteorSeen) return; meteorSeen = true; save();
  toast('Something with wings is flying round island 6. Its head glows like a falling star.', 3200, 1); };
serpent.onHunt = () => { sfx.gulperHunt(); shake = Math.max(shake, .3); const first = !meteorSeen; if (first){ meteorSeen = true; save(); }
  toast(serpentTold ? 'Star is hunting you!' : `${first ? 'Star, a winged serpent with a meteor for a head,' : 'Star'} is hunting you! When its head lights up, steer out of the ring.`, serpentTold ? 1800 : 3200, 2);
  serpentTold = true; };
serpent.onWarn = () => sfx.meteorDive();
serpent.onHit = () => { sfx.whump(); damage(DIVE_HIT, 'meteor'); };
serpent.onSplash = (x, y) => { const near = Math.hypot(x - boat.x, y - boat.y) < HARPOON_RANGE; shake = Math.max(shake, near ? .35 : .1);
  if (near && hasHarpoon() && !splashTold && hp > 0){ splashTold = true; toast(`It is in the water! Harpoon it now: ${hitsWord('meteor')} drive it off.`, 2600, 2); }
  for (let i=0;i<14;i++) sparks.push({x, y, vx:(Math.random()-.5)*160, vy:(Math.random()-.5)*160, z:4, vz:60+Math.random()*80, age:0, life:.7+Math.random()*.5, c:i % 3 ? '#E8F6FA' : '#FFB070'}); };
// The kid's Reaper ("but he doesn't answer to that"), a leviathan with legs: the one in the water roams the deep and
// the far deep, and hunts a boat that comes near him past the buoys. A red fan shows on the water where the boat is
// going and his tail sweeps through it: turn hard out of it. Then he rears up roaring, and the harpoon reaches him.
// He holds off while another great beast is after the boat, or nobody is aboard. Beaten the first time, he leaves
// his ice fishing kit.
const reaper = new Reaper();
let reaperTold = false, rearTold = false;
reaper.holdOff = () => king.fighting || serpent.hunting || deep.state === 'rise' || deep.state === 'fight' || deep.state === 'drag'
  || gulper.state === 'hunt' || cthulu.state === 'awake' || hiredBoats.chasing || swallowT > 0 || diving || !!cine || walker.state !== 'aboard';
reaper.onSight = () => { if (reaperSeen) return; reaperSeen = true; save();
  toast('A yellow-striped fin is cutting the water out here. Sailors call him the Reaper... but he doesn\'t answer to that.', 4400, 1); };
reaper.onHunt = () => { sfx.gulperHunt(); shake = Math.max(shake, .3); if (!reaperSeen){ reaperSeen = true; save(); }
  toast(reaperTold ? 'The Reaper is hunting you!' : `The Reaper is hunting you! When a red fan shows on the water, turn hard out of it.${hasHarpoon() ? ' When he rears up, harpoon him.' : ' You need the harpoon to fight him.'}`, reaperTold ? 1800 : 4200, 2);
  reaperTold = true; };
reaper.onWarn = () => sfx.reaperSwing();
reaper.onSweep = () => { sfx.whump(); damage(REAPER_HIT, 'reaper'); };
reaper.onRear = () => { sfx.reaperRoar(); shake = Math.max(shake, .25);
  if (hasHarpoon() && !rearTold && hp > 0){ rearTold = true; toast(`He is up! Harpoon him now: ${hitsWord('reaper')} drive him off.`, 2600, 2); } };
reaper.onGiveUp = () => { if (swallowT <= 0) toast('The Reaper lost interest and sank away.', 2200, 1); };
// The harpoon, the spear's top level, on the bow: it fires at the nearest leviathan that is up and in reach,
// on a line, and always lands. Enough hits drive one off for a trophy; it is never killed.
let harpoonAt = 0;
function hasHarpoon(){ return spear >= HARPOON_LEVEL; }
function hitsWord(k){ return (['no', 'one', 'two', 'three', 'four', 'five', 'six'][RESOLVE[k]] || RESOLVE[k]) + ' hits'; }
const BOW = { get x(){ return boat.x + Math.cos(boat.h)*30*bk(); }, get y(){ return boat.y + Math.sin(boat.h)*30*bk(); } };
// Each leviathan, what it is, and where a harpoon would strike it now.
// The Skeleton Shark King is not driven off like the four: harpooned down, he dies, and says why it matters.
function beasts(){ return [['guard', leviathan, leviathan.mark(boat)], ['cthulu', cthulu, cthulu.mark(boat)], ['angler', angler, angler.mark()], ['gulper', gulper, gulper.mark()], ['meteor', serpent, serpent.mark()], ['reaper', reaper, reaper.mark()], ['king', king, king.mark()], ['deep', deep, deep.mark()], ['hired', hiredBoats, hiredBoats.mark(boat)], ...seaMarks()]; }
const BEAST_Z = {guard: 30, cthulu: 36, angler: 6, gulper: 6, meteor: 10, reaper: 40, king: 50, deep: 40, hired: 14};
const RESOLVES = {...RESOLVE, king: KING_RESOLVE, deep: DEEP_RESOLVE, hired: HIRED_HP};
function harpoonTarget(){ if (!hasHarpoon() || walker.state !== 'aboard' || !started || docked || swallowT > 0) return null;
  let best = null, bd = HARPOON_RANGE;
  for (const [k, e, m] of beasts()){ if (!m) continue; const d = Math.hypot(m.x - boat.x, m.y - boat.y); if (d < bd){ bd = d; best = {k, e, m}; } }
  return best; }
function fireHarpoon(){ if (T < harpoonAt) return; const t = harpoonTarget(); if (!t) return;
  harpoonAt = T + HARPOON_RELOAD; sfx.spearThrow(); const z = BEAST_Z[t.k];
  // Fired at a mark, it counts when it lands, even if what it was fired at has gone back under by then.
  spears.launch(BOW.x, BOW.y, 14, t.m, z, () => { const before = t.e.resolve;
    if (t.e.harpoon(HARPOON_POWER, t.m, true)){ if (seaBosses().includes(t.e)) seaDown(t.e); else if (t.k !== 'king' && t.k !== 'deep' && t.k !== 'hired') driveOff(t.k); }
    else if (t.e.resolve < before){ sfx.spearHit(); shake = Math.max(shake, .2); addText(t.m.x, t.m.y, z + 24, 'Hit!', '#FFF3C4', 18, 1); } }, BOW); }
function driveOff(k){ const prize = drivePrize(driven[k]), first = !driven[k]; driven[k]++; coins += prize; earned += prize;
  shake = 1; sfx.tierUp(); for (let i=0;i<18;i++) sparks.push({x:boat.x, y:boat.y, vx:(Math.random()-.5)*180, vy:(Math.random()-.5)*180, z:20, vz:50+Math.random()*70, age:0, life:1+Math.random()*.7});
  addText(boat.x, boat.y, 60, '+' + prize, C.coin, 24, 2.4); toasts.clear();
  // The first time the Reaper goes, he leaves his ice fishing kit too: said in the same toast, so nothing crowds it out.
  const kit = k === 'reaper' && first ? ' He spat something out as he went: an ice fishing kit! There must be ice somewhere out in the far deep.' : '';
  toast(`${TROPHY[k].told}${kit} +${prize} coins.`, kit ? 7000 : 4800, 2); hud(); refreshShop(); save(); }
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
const SWALLOWED = {hired: 'The Heron\'s hired boats sank your boat!', reaper: 'The Reaper\'s tail sank your boat!', angler: 'Swallowed whole by the anglerfish!', gulper: 'The gulper ate your boat!', leviathan: 'The leviathan swallowed your boat!', tentacle: 'The Cthuluviathan dragged your boat under!', king: 'The Skeleton Shark King ate your boat!', trident: 'The trident sank your boat!', log: 'The driftwood sank your boat!', squeeze: 'The Deep One crushed your boat!', meteor: 'Star smashed your boat!'};
function swallow(by){ if (swallowT > 0) return; swallowT = SWALLOW; hp = 0; boat.v = 0; shake = 1; sfx.gulp(); if (!seaFight){ charterGone = !!charter; charter = null; hudCharter(); }
  stowSeine(); toasts.clear(); toast(SWALLOWED[by], 1800, 2); hudHull(); }
// Out by the nearest home port: a base with its hut built, if one is nearer than home.
function spitOut(){ if (seaFight){ endSea(true); return; } const lost = holdTotal; hold.fill(0); holdTotal = 0; const port = homePort(bases, boat.x, boat.y, DOCK);
  if (port){ boat.x = port.spit.x; boat.y = port.spit.y; boat.h = port.spit.h; } else { boat.x = DOCK.x+125; boat.y = IY+125; boat.h = .45; }
  boat.v = 0; resetNet(); net.torn = 0; wasDeep = pastBuoys(boat.x, boat.y); wasFar = pastFar(boat.x, boat.y); wasFarFar = pastFarFar(boat.x, boat.y);
  cam.x = boat.x; cam.y = boat.y; hp = HP_MAX; irisT = SPIT; gulper.reset(); serpent.reset(); reaper.reset(); king.reset(); deep.reset(); sfx.spit();
  toasts.clear(); toast(`${port ? `Spat out by your ${port.igloo ? 'igloo' : 'hut'} on ${port.island}.` : 'Spat out in the shallows by home.'} ${lost ? `Your ${lost} fish are gone, but the` : 'The'} boat is fine.${charterGone ? ' Your passengers have had enough: they go home without paying.' : ''}`, 3800, 2); charterGone = false;
  hud(); hudHull(); save(); }
// Island 2's shallows and the spear: ashore there, the Throw button spears the nearest parrotfish in range.
const shallows = new Shallows(Math.random), spears = new Spears();
// A stab's flash: a bright slash across where the knife went in.
function stabFlash(to, tz){ for (let k = 0; k < 7; k++){ const a = -0.9 + k*0.3; sparks.push({x: to.x, y: to.y, vx: Math.cos(a)*60, vy: Math.sin(a)*60, z: Math.max(8, tz*0.6), vz: 20 + k*4, age: 0, life: .28, c: k % 2 ? '#FFFFFF' : '#DCE6EE'}); } }
let reloadAt = 0;
// With the survival knife, as far as the spear or the knife reaches, whichever is further.
function weaponRange(){ return Math.max(spearAt(spear)?.range ?? 0, hasKnife(armour) ? KNIFE.range : 0); }
function spearTarget(range = weaponRange()){ const sp = {range}; if (walker.state !== 'ashore' || !sp.range) return null;
  if (floor === TEMPLE6){ const k = cth.nearestTent(walker.x, walker.y, sp.range); if (k) return k;
    return cth.up && Math.hypot(cth.x - walker.x, cth.y - walker.y) <= sp.range ? cth : null; }
  if (floor === HALL || floor === DEMON){ let best = null, bd = sp.range;
    for (const f of floor === HALL ? [swordsman] : demons) if (f.up){ const d = Math.hypot(f.x - walker.x, f.y - walker.y); if (d <= bd){ bd = d; best = f; } }
    const m = floor === DEMON ? demonMonkeys.nearest(walker.x, walker.y, sp.range) : null;
    return m && Math.hypot(m.x - walker.x, m.y - walker.y) < bd ? m : best; }
  // In the ruins: a lagoon creature that has come close, else the Old One, else any creature; then a roused
  // lancer; a quiet one only if there is nothing else at all, and then it is roused.
  if (floor === RUINS){ const u = hordes[RUINS].target(walker.x, walker.y, sp.range);
    if (oldOne.up && Math.hypot(oldOne.x - walker.x, oldOne.y - walker.y) - 40 <= sp.range && (!u || Math.hypot(u.x - walker.x, u.y - walker.y) > CLOSE_FOE)) return oldOne;
    if (u) return u;
    const busy = oldOne.up || oldScene || hordes[RUINS].list.some(q => Horde.up(q));
    return lancers.nearest(walker.x, walker.y, sp.range) || (busy ? null : lancers.nearest(walker.x, walker.y, sp.range, true)); }
  // On the Battle Barge: the nearest of its undead and its camps.
  if (bargeCamps[floor]){ const u = hordes[floor].target(walker.x, walker.y, sp.range); let best = u, bd = u ? Math.hypot(u.x - walker.x, u.y - walker.y) : Infinity;
    const consider = (m) => { if (m){ const d = Math.hypot(m.x - walker.x, m.y - walker.y); if (d < bd){ bd = d; best = m; } } };
    for (const c of Object.values(bargeCamps[floor])) consider(c.nearest(walker.x, walker.y, sp.range));
    for (const g of [bargeGorillas, bargeGators, bargeLancers]) consider(g.nearest(walker.x, walker.y, sp.range, true));
    for (const f of bargeFighters) if (f.up && Math.hypot(f.x - walker.x, f.y - walker.y) <= sp.range) consider(f);
    // The bosses: the sorcerer and the Forgotten One while up, the Heron and his copies, the pelican only down low.
    for (const b of [...bargeBoss.sorcerer, ...bargeBoss.forgotten]) if (b.up && Math.hypot(b.x - walker.x, b.y - walker.y) <= sp.range) consider(b);
    for (const hn of bargeBoss.heron) for (const t of hn.targets()) if (Math.hypot(t.x - walker.x, t.y - walker.y) <= sp.range) consider(t);
    for (const p of bargeBoss.pelican) if (p.low && Math.hypot(p.x - walker.x, p.y - walker.y) <= sp.range) consider(p);
    for (const c of bargeBoss.cthulhu){ consider(c.nearestTent(walker.x, walker.y, sp.range)); if (c.up && Math.hypot(c.x - walker.x, c.y - walker.y) <= sp.range) consider(c); }
    for (const o of bargeBoss.oldone) if (o.up && Math.hypot(o.x - walker.x, o.y - walker.y) - 40 <= sp.range) consider(o);
    // The Reaper only reared up: his scales turn a spear the rest of the time.
    for (const r of bargeBoss.reaper) if (r.open && Math.hypot(r.x - walker.x, r.y - walker.y) <= sp.range) consider(r);
    for (const a of bargeBoss.anchorer) if (a.up && Math.hypot(a.x - walker.x, a.y - walker.y) <= sp.range) consider(a);
    // The spider down out of his web: a spear only bounces off him.
    for (const sd of bargeBoss.spider) if (sd.awake && Math.hypot(sd.x - walker.x, sd.y - walker.y) <= sp.range) consider(sd);
    return best; }
  if (hordes[floor]){ const u = hordes[floor].target(walker.x, walker.y, sp.range);
    // In the throne room the Forgotten One too, if he is nearer than any but a necromancer; and in the crypt.
    const fg = floor === THRONE ? forgotten : floor === CRYPT ? forgotten2 : null;
    if (fg && fg.up && (!u || u.kind !== 'necro')){ const fd = Math.hypot(fg.x - walker.x, fg.y - walker.y);
      if (fd <= sp.range && (!u || fd < Math.hypot(u.x - walker.x, u.y - walker.y))) return fg; }
    return u; }
  if (floor === NEST9){ const u = nestHorde.nearest(walker.x, walker.y, sp.range);
    if (u && Math.hypot(u.x - walker.x, u.y - walker.y) < CLOSE_FOE) return u;
    if (nest.up && Math.hypot(nest.x - walker.x, nest.y - walker.y) <= sp.range) return nest;
    if (u) return u;
    let best = null, bd = sp.range;
    for (const t of heron9.targets()){ const d = Math.hypot(t.x - walker.x, t.y - walker.y); if (d <= bd){ bd = d; best = t; } }
    return best; }
  if (floor === ROOF8){ let best = null, bd = sp.range;
    for (const t of heron.targets()){ const d = Math.hypot(t.x - walker.x, t.y - walker.y); if (d <= bd){ bd = d; best = t; } }
    return best; }
  // On island 10's roof, the pelican, but only down where a spear can reach it.
  if (floor === ROOF10) return pelican.low && Math.hypot(pelican.x - walker.x, pelican.y - walker.y) <= sp.range ? pelican : null;
  if (floor >= 0){ const b = bosses[floor];
    if (b){ const bd = b.up ? Math.hypot(b.x - walker.x, b.y - walker.y) : Infinity, m = floor === ROOF7 ? roofMonkeys.nearest(walker.x, walker.y, sp.range) : null;
      if (m && Math.hypot(m.x - walker.x, m.y - walker.y) < bd) return m; return bd <= sp.range ? b : null; }
    return floors[floor] ? floors[floor].nearest(walker.x, walker.y, sp.range) : null; }
  // Island 10's gators: one out of its pool, else one in its pool, which a spear rouses.
  // The spider too, when he is down out of his web, though a spear only bounces off him.
  if (walker.dock === ISLE10_DOCK){ const sp10 = spider10.awake && Math.hypot(spider10.x - walker.x, spider10.y - walker.y) <= sp.range ? spider10 : null;
    const closest = (...c) => c.filter(Boolean).sort((a, b) => Math.hypot(a.x - walker.x, a.y - walker.y) - Math.hypot(b.x - walker.x, b.y - walker.y))[0] ?? null;
    return closest(gators.nearest(walker.x, walker.y, sp.range), gorillas.nearest(walker.x, walker.y, sp.range)) || sp10 || closest(gators.nearest(walker.x, walker.y, sp.range, true), gorillas.nearest(walker.x, walker.y, sp.range, true)); }
  if (walker.dock === ISLE11_DOCK && brother.up){ let best = null, bd = sp.range;
    for (const t of brother.targets()){ const d = Math.hypot(t.x - walker.x, t.y - walker.y); if (d <= bd){ bd = d; best = t; } }
    if (best) return best; }
  if (anchorer.up && Math.hypot(anchorer.x - walker.x, anchorer.y - walker.y) <= sp.range) return anchorer;
  // The Reaper on land only while he is reared up: his scales turn a spear the rest of the time.
  if (landReaper.open && Math.hypot(landReaper.x - walker.x, landReaper.y - walker.y) <= sp.range) return landReaper;
  for (const r of seaReapers) if (r.open && Math.hypot(r.x - walker.x, r.y - walker.y) <= sp.range) return r;
  // Star only while he is down on the sand after a dive.
  for (const m of seaStars) if (m.mark() && Math.hypot(m.x - walker.x, m.y - walker.y) <= sp.range) return m;
  return monkeys.nearest(walker.x, walker.y, sp.range) || monkeys7.nearest(walker.x, walker.y, sp.range) || hired8.nearest(walker.x, walker.y, sp.range) || hired9.nearest(walker.x, walker.y, sp.range) || shallows.nearest(walker.x, walker.y, sp.range); }
// With the survival knife (it comes with the Honor Guard armour), a foe right up close is stabbed, one a little further
// off has the knife thrown at it, and past that it is the spear, as before; the knife hits for 4 either way.
function throwSpear(target){ if (walker.state !== 'ashore' || T < reloadAt || oldScene || fgScene) return;
  const f = target || spearTarget(); if (!f) return;
  const use = knifeUse(armour, Math.hypot(f.x - walker.x, f.y - walker.y)), sp0 = use ? {power: KNIFE.power, reload: use === 'stab' ? KNIFE.stabReload : KNIFE.reload} : spearAt(spear);
  if (!sp0) return;
  // A carrot from island 10's old man doubles the blow while it lasts.
  const sp = carrotT > 0 ? {...sp0, power: sp0.power * CARROT_POWER} : sp0;
  reloadAt = T + sp.reload; sfx.spearThrow();
  if (use === 'stab') walker.stabAt(f.x, f.y); else walker.throwAt(f.x, f.y);
  // A stab lands at once, with a flash of the blade; a thrown knife flies like a spear, turning over.
  const send = (x, y, z, to, tz, hit) => { if (use === 'stab'){ stabFlash(to, tz); hit(); } else spears.launch(x, y, z, to, tz, hit, null, use === 'throw'); };
  if (f instanceof Sorcerer){ send(walker.x, walker.y, walker.z + 20, f, 34, () => { f.hit(sp.power); soulHit(); }); return; }
  if (f instanceof Fighter){ send(walker.x, walker.y, walker.z + 20, f, 18*f.spec.scale, () => { f.hit(sp.power); soulHit(); }); return; }
  for (const hn of [heron, heron9, brother, ...bargeBoss.heron]) if (f === hn || hn.copies.includes(f)){ send(walker.x, walker.y, walker.z + 20, f, 60, () => { const real = f === hn && hn.up && !hn.shielded; hn.spear(f, sp.power); if (real) soulHit(); }); return; }
  if (f === nest){ send(walker.x, walker.y, walker.z + 20, f, 28, () => { nest.hit(sp.power); soulHit(); }); return; }
  if (f instanceof Pelican){ send(walker.x, walker.y, walker.z + 20, f, 16, () => { if (f.hit(sp.power)) soulHit(); }); return; }
  if (f instanceof Anchorer){ send(walker.x, walker.y, walker.z + 20, f, 70, () => { f.hit(sp.power); soulHit(); }); return; }
  if (f instanceof LandReaper){ send(walker.x, walker.y, walker.z + 20, f, 55, () => { if (f.hit(sp.power, true)) soulHit(); }); return; }
  if (f instanceof MeteorSerpent){ send(walker.x, walker.y, walker.z + 20, f, 20, () => { if (seaStarHit(f, sp.power)){ sfx.spearHit(); soulHit(); } }); return; }
  if (f instanceof Cthulhu){ send(walker.x, walker.y, walker.z + 20, f, 90, () => { f.hit(sp.power); soulHit(); }); return; }
  for (const c of [cth, ...bargeBoss.cthulhu]) if (c.tents.includes(f)){ send(walker.x, walker.y, walker.z + 20, f, 24, () => { c.hitTent(f, sp.power); soulHit(); }); return; }
  if (f instanceof Forgotten){ send(walker.x, walker.y, walker.z + 20, f, 40, () => { f.hit(sp.power); soulHit(); }); return; }
  if (f instanceof OldOne){ send(walker.x, walker.y, walker.z + 20, f, 110, () => { f.hit(sp.power); soulHit(); }); return; }
  if (f instanceof Spider10){ send(walker.x, walker.y, walker.z + 20, f, 8, () => { sfx.clang(); addText(f.x, f.y, 22, 'Tink!', '#E8E0C8', 16, 1);
    if (!spearTinkTold){ spearTinkTold = true; toasts.clear(); toast('Tink! Your spear bounces off the spider. Only bug spray beats him: the old man on the prairie sells it.', 4200, 2); } }); return; }
  for (const gs of [gorillas, bargeGorillas]) if (gs.list.includes(f)){ send(walker.x, walker.y, walker.z + 20, f, 20, () => { if (gs.hit(f, sp.power)) soulHit(); }); return; }
  for (const gs of [gators, bargeGators]) if (gs.list.includes(f)){ send(walker.x, walker.y, walker.z + 20, f, 6, () => { if (gs.hit(f, sp.power, walker.x, walker.y)) soulHit(); }); return; }
  for (const ls of [lancers, bargeLancers]) if (ls.list.includes(f)){ send(walker.x, walker.y, walker.z + 20, f, 34, () => { ls.hit(f, sp.power); soulHit(); }); return; }
  for (const h of HORDES) if (h.list.includes(f)){ send(walker.x, walker.y, walker.z + 20, f, 18*f.spec.scale, () => { h.hit(f, sp.power, walker.x, walker.y); soulHit(); }); return; }
  for (const camp of [monkeys, monkeys7, hired8, hired9, ...camps, demonMonkeys, roofMonkeys]) if (camp.list.includes(f)){ send(walker.x, walker.y, walker.z + 20, f, 10, () => { camp.hit(f, sp.power, walker.x, walker.y); soulHit(); }); return; }
  send(walker.x, walker.y, walker.z + 20, f, 0, () => { if (!f.alive) return; shallows.take(f); sellSpeared(PARROT, f.x, f.y); }); }
// The monkey camp. Three hearts ashore; bonked out, the figure wakes up aboard, nothing lost.
// Hearts ashore: three, and one more for each level of armour.
const CAMP_PRIZE = 400;
function maxHearts(){ return heartsFor(armour); }
let hearts = maxHearts(), invulnT = 0, heartT = 0, spotToldT = 0;
const monkeys = new Monkeys();
monkeys.onSpot = () => { if (spotToldT <= 0){ spotToldT = 90; toast(spear ? 'Monkeys in skull masks! Keep moving and throw your spear.' : 'Monkeys in skull masks! You have no spear: run back to the boat.', 3000, 2); } };
monkeys.onThrow = () => sfx.spearThrow();
monkeys.onBonk = (by) => bonked(by);
function bonked(by, n = 1){ if (invulnT > 0 || walker.state !== 'ashore') return;
  hearts = Math.max(0, hearts - n); if (hearts > 0) cat.noticeHurt(); invulnT = 1.2; heartT = 0; shake = Math.max(shake, .4); sfx.whump(); hudHearts();
  addText(walker.x, walker.y, 30, {coconut: 'Coconut!', meteor: 'Crash!', stone: 'Thwack!', bolt: 'Zap!', peck: 'Peck!', slash: 'Slash!', anchor: 'Clang!', sweep: 'Whack!', tentacle: 'Squeeze!', arrow: 'Twang!', wisp: 'Brrr!', sword: 'Slash!', skull: 'Crack!', ray: 'Zzzap!', lance: 'Stab!', slam: 'Slam!', tail: 'Thwump!', bite: 'Chomp!', web: 'Wrapped!', gulp: 'Gulp!', fish: 'Splat!'}[by] || 'Bonk!', '#FF9A8A', 18, 1.1);
  const m = monkeys.nearest(walker.x, walker.y, 60) || monkeys7.nearest(walker.x, walker.y, 60) || hired8.nearest(walker.x, walker.y, 60) || hired9.nearest(walker.x, walker.y, 60); if (m){ const d = Math.hypot(walker.x - m.x, walker.y - m.y) || 1; walkStep(walker, (walker.x - m.x)/d*22, (walker.y - m.y)/d*22, build); }
  if (hearts <= 0 && tower === BARGE){ hearts = maxHearts(); hudHearts(); endBarge(true); return; }
  if (hearts <= 0){ leaveTower(false); walker.knockOut(); hearts = maxHearts(); hudHearts(); toasts.clear(); toast('Bonked out! You woke up aboard the boat. Nothing lost.', 3600, 2); } }
monkeys.onBeat = (m) => { masks++; sfx.spearHit(); addText(m.x, m.y, 26, 'Mask!', '#F4F1E6', 18, 1.3);
  flies.push({x0:m.x, y0:m.y, z0:16, to:'figure', t:0, dur:.5, c:'#F4F1E6', s:5}); refreshShop(); save(); };
monkeys.onClear = () => { coins += CAMP_PRIZE; earned += CAMP_PRIZE; sfx.orderFilled(); shake = Math.max(shake, .3);
  addText(CHEST.x, CHEST.y, 30, '+' + CAMP_PRIZE, C.coin, 24, 2.2); toasts.clear();
  // The first time, the cage opens too, and the naga they kept in it is yours.
  if (!nagaFree){ nagaFree = true; naga.come(NAGA_CAGE.x + 6, NAGA_CAGE.y + NAGA_CAGE.r + 12); sfx.tierUp();
    addText(NAGA_CAGE.x, NAGA_CAGE.y, 75, 'Freed!', '#8FC4F0', 22, 2.2);
    toast(`You beat the monkey camp and opened their cage! The naga they kept in it fights beside you now, with his fin-blade, and swims beside your boat at sea. The chest held ${CAMP_PRIZE} coins.`, 6000, 2); }
  else toast(`You beat the monkey camp! Its chest held ${CAMP_PRIZE} coins. They will be back.`, 4200, 2);
  hud(); save(); };
// Island 7's camp: the same monkeys, one more of them, and a fuller chest.
const CAMP7_PRIZE = 800;
const monkeys7 = new Monkeys(CAMP7, 6, 2);
// The Heron's hired men on islands 8 and 9: they fight as the monkeys do, tougher, in his blue. Each beaten drops his pay.
const hired8 = new Monkeys(CAMP8, 5, 2, true, 'hired', HIRED_MAN_HP), hired9 = new Monkeys(CAMP9, 4, 1, true, 'hired', HIRED_MAN_HP);
let hiredSpotT = 0, hiredTold = false;
for (const c of [hired8, hired9]){ c.onThrow = () => sfx.spearThrow(); c.onBonk = (by) => bonked(by === 'coconut' ? 'stone' : by);
  c.onSpot = () => { if (hiredSpotT <= 0){ hiredSpotT = 90; toast(spear ? 'The Heron\'s hired men! Clubs and slings. Keep moving and throw your spear.' : 'The Heron\'s hired men! You have no spear: run back to the boat.', 3200, 2); } };
  c.onBeat = (m) => { coins += HIRED_PAY; earned += HIRED_PAY; sfx.spearHit(); addText(m.x, m.y, 30, '+' + HIRED_PAY, C.coin, 18, 1.3);
    if (!hiredTold){ hiredTold = true; toast(`Beaten, a hired man drops his pay and runs: +${HIRED_PAY} coins.`, 2600, 1); } hud(); save(); };
  c.onClear = () => { coins += HIRED_CAMP_PRIZE; earned += HIRED_CAMP_PRIZE; sfx.orderFilled(); shake = Math.max(shake, .3);
    addText(c.home.x, c.home.y, 30, '+' + HIRED_CAMP_PRIZE, C.coin, 24, 2.2); toasts.clear();
    toast(`You beat the Heron's hired men! They run for their boats and drop a purse of ${HIRED_CAMP_PRIZE} coins. He will hire more.`, 4600, 2); hud(); save(); }; }
// And his hired boats, keeping the water round the twins.
const hiredBoats = new HiredBoats();
hiredBoats.onChase = () => { toast('The Heron\'s hired boats are after you! Outrun them, or harpoon them: three hits sinks one.', 3600, 2); sfx.pirateChase(); };
hiredBoats.onRam = () => { sfx.whump(); damage(HIRED_RAM, 'hired'); };
hiredBoats.onSink = (x, y) => { coins += HIRED_BOUNTY; earned += HIRED_BOUNTY; sfx.sharkCaught(); shake = Math.max(shake, .4);
  addText(x, y, 40, 'Sunk! +' + HIRED_BOUNTY, C.coin, 22, 2); hud(); save(); };
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
floors[17] = new Monkeys(ROOMS[17], 5, 2, true, 'hired', HIRED_MAN_HP); floors[18] = new Monkeys(ROOMS[18], 6, 2, true, 'hired', HIRED_MAN_HP); // island 8's: the Heron's hired men
floors[20] = new Monkeys(ROOMS[20], 6, 2, true, 'hired', HIRED_MAN_HP); floors[21] = new Monkeys(ROOMS[21], 7, 3, true, 'hired', HIRED_MAN_HP); // and island 9's, more of them
// The Battle Barge's tower, the fight's own (below); and, off the boat onto the barge, a dock that is nowhere, so
// nothing on it is a way back aboard.
const BARGE = {dock: null, door: {x: 0, y: 0}, first: ARENAS.medium, roof: -1, boss: null};
const BARGE_DOCK = {x: -19500, y: -7000, r: 0, berth: () => ({x: boat.x, y: boat.y, h: boat.h}), landing: {x: 1e7, y: 1e7}};
const camps = floors.filter(Boolean);
// The Battle Barge's camps, the kid's (data/barge.ts): a monkeys' and a hired men's in each of its arenas, empty until
// a fight is picked; the undead it can hold are its arenas' hordes, below.
const bargeCamps = {};
for (const i of Object.values(ARENAS)){ bargeCamps[i] = {monkey: new Monkeys(ROOMS[i], 0, 0, false, 'monkey', MONKEY_HP), hired: new Monkeys(ROOMS[i], 0, 0, false, 'hired', HIRED_MAN_HP), imps: new Monkeys(ROOMS[i], 0, 0, false)};
  for (const [look, c] of Object.entries(bargeCamps[i])){ c.onBonk = (by) => bonked(look === 'hired' && by === 'coconut' ? 'stone' : by); c.onThrow = () => sfx.spearThrow();
    c.onBeat = (m) => { sfx.spearHit(); addText(m.x, m.y, 26, 'Down!', '#D8FFE0', 18, 1.1); bargeCheck(); }; c.onClear = () => bargeCheck(); camps.push(c); } }
for (const [i, fl] of floors.entries()){ if (!fl) continue; const men = fl.look === 'hired';
  fl.onBonk = (by) => bonked(men && by === 'coconut' ? 'stone' : by); fl.onThrow = () => sfx.spearThrow(); fl.onBeat = men ? hired8.onBeat : monkeys.onBeat;
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
// The Heron, the sorcerer's boss, on island 8's tower roof: he zaps down a pink line, and his staff makes copies of
// him; only the real one can be hurt. Beaten there, he flies off to his nest on island 9 (heronStage 1).
const HERON_PRIZE = 2500;
const heron = new Heron(ROOMS[ROOF8]);
heron.onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .4); toasts.clear(); toast('The Heron! Step off his pink line before he zaps. When there are three of him, only one is real.', 3400, 2); };
heron.onHit = (by) => bonked(by);
heron.onZap = () => sfx.zap();
heron.onCast = () => sfx.portal();
heron.onPop = (x, y) => { sfx.spearHit(); addText(x, y, 60, 'Pop!', '#FFB0E8', 20, 1.1); };
heron.onBeaten = () => { const prize = HERON_PRIZE; coins += prize; earned += prize; heronStage = Math.max(heronStage, 1); towerWon = true;
  burst(heron); addText(heron.home.x, heron.home.y, 60, '+' + prize, C.coin, 26, 2.6); toasts.clear();
  toast(`You beat the Heron! He screeches and flies off across the sandbar to his nest on island 9's tower. Your flag flies here now. +${prize} coins.`, 6200, 2); hud(); refreshShop(); save(); };
// Round two, in his nest on top of island 9's tower: tougher, and shielded by the orb of power while the necromancer
// is chained to it, raising skeletons. Beat the necromancer and his chain snaps, the orb goes dark and the shield with
// it; beat the Heron then and he is beaten (heronStage 2). Here he has 14 hits, the kid's sixth list, and his zap takes
// two hearts. Back aboard, his escape plays (world/heronescape.ts): into the sea, the Reaper, and away through a portal.
const HERON9_PRIZE = 4000;
// The Heron's brother on island 11, the kid's: "the same as the Heron but two hands, and never beaten". He stalks his
// clearing and zaps as the Heron does on his roof, two hearts a zap as in the nest, with his copies; brought down to
// nothing he does not fall: he stops, says goodbye, and flies off, and Caterman comes out of his workshop to join you.
const brother = new Heron(CLEARING11, HERON9_HP); brother.hands = true;
brother.onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .3); toasts.clear();
  toast('A heron! Just like the Heron, but with two hands. "Have a good day! Oh, by the way, have you seen my brother?" Then up comes his alien gun. Step off the pink line!', 4800, 2); };
brother.onHit = (by) => bonked(by, 2);
brother.onZap = () => sfx.zap();
brother.onCast = () => sfx.portal();
brother.onPop = (x, y) => { sfx.spearHit(); addText(x, y, 60, 'Pop!', '#FFB0E8', 20, 1.1); };
brother.onBeaten = () => { catermanFree = true; catermanT = FLEE_T + .5; save(); refreshShop(); toasts.clear(); sfx.tierUp();
  addText(brother.x, brother.y, 70, 'Bye!', '#E8ECF4', 22, 1.8);
  toast('He stops, and lowers his gun. "Bye! It\'s hard for challengers. Have a good day! Oh, by the way, where is my brother?" And off he flies.', 5200, 2); };
const heron9 = new Heron(ROOMS[NEST9], HERON9_HP), nest = new Nest(ROOMS[NEST9]);
let blockToldT = 0;
heron9.onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .4); };
heron9.onHit = (by) => bonked(by, 2);
heron9.onZap = () => sfx.zap();
heron9.onCast = () => sfx.portal();
heron9.onPop = heron.onPop;
heron9.onBlock = (x, y) => { sfx.clang(); addText(x, y, 60, 'Shielded!', '#FFB0E8', 18, 1.1);
  if (blockToldT <= 0){ blockToldT = 8; toast('The orb\'s shield! Nothing gets through it while the necromancer is chained. Spear him first.', 3200, 2); } };
heron9.onBeaten = () => { const prize = HERON9_PRIZE; coins += prize; earned += prize; heronStage = 2; towerWon = true;
  burst(heron9); addText(heron9.home.x, heron9.home.y, 60, '+' + prize, C.coin, 26, 2.6); toasts.clear();
  nest.join(); necroPal.come(nest.x, nest.y); necroTold = true;
  toast(`You beat the Heron! He tumbles out of his nest and flaps off over the sea, and his hired boats sail home. The necromancer is free, and he is coming with you: in a fight he raises his skeleton hamster. +${prize} coins.`, 7000, 2); hud(); refreshShop(); save(); };
nest.onWake = () => { toasts.clear(); toast('The Heron\'s nest, and the orb of power! While the necromancer is chained to it, the Heron is shielded. Spear the necromancer first.', 4400, 2); };
nest.standing = () => nestHorde.list.filter(u => u.state !== 'fall' && u.state !== 'gone').length;
nest.onRaise = (x, y) => { sfx.tentacle(); const u = nestHorde.raise(x, y, 'skeleton'); addText(u.x, u.y, 34, 'Rise!', '#8CFFA8', 18, 1.1); };
nest.onHurt = () => sfx.spearHit();
nest.onFree = () => { for (const u of nestHorde.list) if (u.state !== 'gone' && u.state !== 'fall'){ u.state = 'fall'; u.t = 0; }
  heron9.shielded = false; burst({x: nest.orb.x, y: nest.orb.y}); addText(nest.x, nest.y, 40, 'Snap!', '#9FB8FF', 22, 1.4); toasts.clear();
  toast('His chain snaps! The orb of power goes dark, and the Heron\'s shield goes with it. Now spear the Heron!', 4200, 2); };
// The giant pelican on top of island 10's tower, the kid's: 15 hits, three hearts a dive; spits fish; beaten, it leaves
// a little bread for a birdfeeder (entities/pelican.ts). The tower is only its roof, up a long stair.
const PELICAN_PRIZE = 1500;
const pelican = new Pelican(ROOMS[ROOF10]);
let pelicanTold = false, stuckTold = false;
pelican.onWake = () => { sfx.squawk(); shake = Math.max(shake, .3);
  if (!pelicanTold){ pelicanTold = true; toasts.clear(); toast('The giant pelican! Up high your spear can\'t reach it. When its ring on the floor turns red, get out!', 3400, 2); } };
pelican.onSpit = () => sfx.spit();
pelican.onLock = () => sfx.reaperSwing();
pelican.onDive = (caught) => { sfx.whump(); shake = Math.max(shake, caught ? .5 : .3);
  if (!stuckTold){ stuckTold = true; setTimeout(() => { if (pelican.state === 'stuck'){ toasts.clear(); toast('Its bill is stuck in the floor! Spear it now!', 1800, 2); } }, 250); } };
pelican.onHit = (n, by) => bonked(by === 'scoop' ? 'gulp' : 'fish', n);
pelican.onBeaten = () => { const first = !pelicanBeaten, prize = first ? PELICAN_PRIZE : TOWER_AGAIN; coins += prize; earned += prize; pelicanBeaten = true; towerWon = true;
  burst(pelican); hearts = maxHearts(); hudHearts(); sfx.orderFilled(); addText(pelican.x, pelican.y, 50, '+' + prize, C.coin, 24, 2.2);
  const loaf = bread < 1; if (loaf){ bread = 1; flies.push({x0: pelican.x, y0: pelican.y, z0: 12, to: 'figure', t: 0, dur: .7, c: '#D9A45A', s: 6}); }
  toasts.clear(); toast(first ? `You beat the giant pelican! ${prize} coins, and it leaves a little loaf of bread behind. Keep the bread: in a birdfeeder, it might bring the crows. Your flag flies on the tower.`
    : `The pelican is beaten again! ${prize} coins.${loaf ? ' And another little loaf of bread.' : ''}`, 5200, 1); hud(); save(); };
const bosses = {[ROOF]: boss, [ROOF3]: boss3, [ROOF7]: boss7};
// Each tower: the dock its island is reached from, its door, its rooms and its boss.
const TOWER_AT = [{dock: ISLE2_DOCK, door: DOOR, ...TOWERS[0], boss}, {dock: ISLE3_DOCK, door: DOOR3, ...TOWERS[1], boss: boss3}, {dock: ISLE7_DOCK, door: DOOR7, ...TOWERS[2], boss: boss7}, {dock: ISLE8_DOCK, door: DOOR8, ...TOWERS[3], boss: heron}, {dock: ISLE8_DOCK, door: DOOR9, ...TOWERS[4], boss: heron9}, {dock: ISLE10_DOCK, door: DOOR10, ...TOWERS[5], boss: pelican}];
// The tower whose open door the figure is up against, or null. Island 8's dock reaches both twins' towers: island 8's
// opens once island 7's sorcerer has failed the Heron, island 9's once he has fled to it.
function towerAtDoor(){ return TOWER_AT.find(t => t.dock === walker.dock && (t.boss !== heron || isle7Stage >= 1) && (t.boss !== heron9 || heronStage >= 1)
  && Math.hypot(walker.x - t.door.x, walker.y - t.door.y) < STEP) || null; }
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
swordsman.onBeaten = () => { const first = isle3Stage < 2; isle3Stage = Math.max(isle3Stage, 2); hearts = maxHearts(); hudHearts(); burst(swordsman);
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
// What the warlock, the cat, the warrior, the bones, the allies and the tarling fight: where it is, how it is hurt, and for the
// tarling's tar, how it is stuck and how high its face is.
function campTarget(camp, m){ return {get x(){ return m.x; }, get y(){ return m.y; }, hit: (p) => camp.hit(m, p, warlock.x, warlock.y), stun: (s) => camp.stun(m, s), head: 18}; }
function fighterTarget(f, head = 24){ return {get x(){ return f.x; }, get y(){ return f.y; }, hit: (p) => f.hit(p), stun: (s) => f.stun(s), head}; }
function bossHead(b){ return b instanceof Anchorer ? 70 : b instanceof Cthulhu ? 80 : b instanceof Forgotten ? 50 : 52; }
warlock.findTarget = (x, y, range) => { let best = null, bd = range;
  const consider = (t, d) => { if (d <= bd){ bd = d; best = t; } };
  for (const camp of [monkeys, monkeys7, hired8, hired9, ...camps, demonMonkeys, roofMonkeys]) for (const m of camp.list) if (m.state === 'chase') consider(campTarget(camp, m), Math.hypot(m.x - x, m.y - y));
  for (const f of [swordsman, ...demons, ...bargeFighters]) if (f.up) consider(fighterTarget(f, 24*f.spec.scale), Math.hypot(f.x - x, f.y - y));
  for (const h of HORDES) for (const u of h.list) if (Horde.up(u)) consider({get x(){ return u.x; }, get y(){ return u.y; }, hit: (p) => h.hit(u, p, warlock.x, warlock.y), stun: (s) => h.stun(u, s), head: (u.kind === 'ghost' ? 34 : 25)*u.spec.scale}, Math.hypot(u.x - x, u.y - y));
  for (const b of [boss, boss3, boss7, anchorer, cth, forgotten, forgotten2, ...bargeBoss.sorcerer, ...bargeBoss.forgotten, ...bargeBoss.cthulhu, ...bargeBoss.anchorer]) if (b.up) consider(fighterTarget(b, bossHead(b)), Math.hypot(b.x - x, b.y - y));
  for (const o of [oldOne, ...bargeBoss.oldone]) if (o.up) consider(fighterTarget(o, 120), Math.hypot(o.x - x, o.y - y));
  // The Reaper on land only reared up, when anything gets past his scales; tar then holds him up a little longer.
  for (const m of seaStars) if (m.mark()) consider({get x(){ return m.x; }, get y(){ return m.y; }, hit: (p) => { seaStarHit(m, p); }, stun: () => {}, head: 30}, Math.hypot(m.x - x, m.y - y));
  for (const lr of [landReaper, ...bargeBoss.reaper, ...seaReapers]) if (lr.open) consider({get x(){ return lr.x; }, get y(){ return lr.y; }, hit: (p) => lr.hit(p, true), stun: (s) => lr.stun(s), head: 55}, Math.hypot(lr.x - x, lr.y - y));
  for (const hn of [heron, heron9, brother, ...bargeBoss.heron]) if (!hn.shielded) for (const t of hn.targets()) consider({get x(){ return t.x; }, get y(){ return t.y; }, hit: (p) => hn.spear(t, p), stun: (s) => { if (t === hn) hn.stun(s); }, head: 60}, Math.hypot(t.x - x, t.y - y));
  if (nest.up) consider(fighterTarget(nest, 30), Math.hypot(nest.x - x, nest.y - y));
  for (const p of [pelican, ...bargeBoss.pelican]) if (p.low) consider(fighterTarget(p, 18), Math.hypot(p.x - x, p.y - y));
  for (const gs of [gorillas, bargeGorillas]) for (const g of gs.list) if (Gorillas.up(g)) consider({get x(){ return g.x; }, get y(){ return g.y; }, hit: (p) => gs.hit(g, p), stun: (s) => gs.stun(g, s), head: 26}, Math.hypot(g.x - x, g.y - y));
  for (const gs of [gators, bargeGators]) for (const g of gs.list) if (Gators.up(g)) consider({get x(){ return g.x; }, get y(){ return g.y; }, hit: (p) => gs.hit(g, p), stun: (s) => gs.stun(g, s), head: 8}, Math.hypot(g.x - x, g.y - y));
  for (const ls of [lancers, bargeLancers]) for (const l of ls.list) if (Lancers.up(l)) consider({get x(){ return l.x; }, get y(){ return l.y; }, hit: (p) => ls.hit(l, p), stun: (s) => ls.stun(l, s), head: 40}, Math.hypot(l.x - x, l.y - y));
  for (const c of [cth, ...bargeBoss.cthulhu]) for (const k of c.tents) if (k.state === 'chase') consider({get x(){ return k.x; }, get y(){ return k.y; }, hit: (p) => c.hitTent(k, p), stun: (s) => c.stunTent(k, s), head: 22}, Math.hypot(k.x - x, k.y - y));
  return best; };
warlock.onCast = () => sfx.zap();
warlock.onHurt = (out) => { addText(warlock.x, warlock.y, 32, out ? 'Worn out!' : 'Ow!', '#B8FFC8', 16, 1.1); hudHearts(); if (!out) cat.noticePalHurt(warlock);
  if (out){ toasts.clear(); toast('The warlock is worn out. He flies back to his boat to rest.', 3200, 1); } };
warlock.onArrive = () => { if (!warlockTold){ warlockTold = true; toast('The warlock comes ashore with you. He casts at whatever you fight.', 3000, 1); } };
// What would hurt the figure hurts the warlock if he is in the way: a monkey's bonk, a bolt, a slash.
// The companions with the figure keep a little apart, round it, rather than all stopping in one stack behind it; and
// outside a fight each has a place of its own, the small ones near and the big ones further out, in rings behind the
// figure, so the whole army reads (spread.ts). On the move they string out behind it, each stopping at its own ring;
// once it stops they walk in to their places. In a fight they go for whatever it fights, and only keep apart.
const ARMY_SIZE = {tarling: 8, cat: 10, warrior: 13, naga: 14, bones: 14, warlock: 15, necro: 15, baby: 24, caterman: 13};
function spreadPals(dt){ const step = (b, dx, dy) => walkStep(b, dx, dy, build), all = [warlock, tarling, cat, warrior, bonesPal, naga, necroPal, baby, caterman];
  const size = (b) => ARMY_SIZE[b === warlock ? 'warlock' : b === tarling ? 'tarling' : b.kind] ?? 0;
  const list = walker.state === 'ashore' ? all.filter(b => b === tarling ? tarling.with : b.shown) : [];
  for (const b of all) if (!list.includes(b)) b.heelAt = null;
  if (!list.length) return;
  if (inFight()){ for (const b of list) b.heelAt = null; spreadOut(list, walker, dt, step); return; }
  list.sort((a, b) => size(a) - size(b));
  const places = assignSlots(list, formation(list.length, (dx, dy) => walkable(walker.x + dx, walker.y + dy, build)), walker);
  list.forEach((b, i) => { const s = places[i]; b.heelAt = s ? s.r + 8 : null; });
  if (Math.hypot(walker.vx, walker.vy) < 15) formUp(list, places, walker, dt, step);
  else spreadOut(list, walker, dt, step); }
function hurtWarlock(dt){ for (const h of [warlock, cat, warrior, bonesPal, naga, necroPal, baby, caterman]) hurtHelper(h, dt);
  for (const a of allies.list) hurtHelper({shown: a.state === 'fight', x: a.x, y: a.y, hurt: () => allies.hurt(a)}, dt); }
// What would hurt the figure hurts a helper in the way: the warlock, the cat, the warrior or the bones.
function hurtHelper(h, dt){ if (!h.shown) return;
  for (const camp of [monkeys, monkeys7, hired8, hired9, ...camps, demonMonkeys, roofMonkeys]) for (const m of camp.list)
    if (m.state === 'chase' && !m.thrower && m.cd <= 0 && Math.hypot(m.x - h.x, m.y - h.y) < BONK_R){ m.cd = BONK_EVERY; h.hurt(); }
  for (const hn of [heron, heron9, brother, ...bargeBoss.heron]) for (const z of hn.zaps) if (z.t === 0 && segDist(h.x, h.y, z.x0, z.y0, z.x1, z.y1) < ZAP_HIT) h.hurt();
  for (const b of [boss, boss3, boss7, ...bargeBoss.sorcerer]) for (let i = b.bolts.length - 1; i >= 0; i--){ const q = b.bolts[i];
    if (Math.hypot(q.x - h.x, q.y - h.y) < BOLT_HIT){ b.bolts.splice(i, 1); h.hurt(); } }
  for (const f of [swordsman, ...demons, ...bargeFighters]) if (f.state === 'swing' && f.t <= dt * 1.01){
    const d = Math.hypot(h.x - f.x, h.y - f.y);
    if (d < f.spec.reach + SLASH_SLACK && Math.abs(angDiff(f.h, Math.atan2(h.y - f.y, h.x - f.x))) < SLASH_ARC) h.hurt(); }
  for (const k of [cth, ...bargeBoss.cthulhu].flatMap(c => c.tents)) if (k.state === 'chase' && Math.hypot(k.x - h.x, k.y - h.y) < 14){ k.state = 'sink'; k.t = 0; h.hurt(); }
  for (const hd of HORDES){ for (const u of hd.list) if (u.state === 'swing' && u.spec.reach > 0 && u.t <= dt * 1.01){
      if (Math.hypot(h.x - u.x, h.y - u.y) < u.spec.reach + SLASH_SLACK && Math.abs(angDiff(u.h, Math.atan2(h.y - u.y, h.x - u.x))) < SLASH_ARC) h.hurt(); }
    for (let i = hd.shots.length - 1; i >= 0; i--){ const q = hd.shots[i]; if (Math.hypot(q.x - h.x, q.y - h.y) < 10){ hd.shots.splice(i, 1); h.hurt(); } } }
  for (const g of [...gators.list, ...bargeGators.list]) if (g.state === 'snap' && g.t <= dt * 1.01 && Gators.bites(g, h.x, h.y)) h.hurt();
  for (const g of [...gorillas.list, ...bargeGorillas.list]) if (g.state === 'slam' && g.t <= dt * 1.01 && Gorillas.catches(g, h.x, h.y)) h.hurt();
  for (const pl of [pelican, ...bargeBoss.pelican]){ if (pl.state === 'stuck' && pl.t <= dt * 1.01 && pl.catches(h.x, h.y)) h.hurt();
    for (let i = pl.fish.length - 1; i >= 0; i--){ const q = pl.fish[i]; if (Math.hypot(q.x - h.x, q.y - h.y) < 10){ pl.fish.splice(i, 1); h.hurt(); } } }
  for (const l of [...lancers.list, ...bargeLancers.list]) if (l.state === 'thrust' && l.t <= dt * 1.01 && Math.hypot(h.x - l.x, h.y - l.y) < LANCE_REACH + 4 && Math.abs(angDiff(l.h, Math.atan2(h.y - l.y, h.x - l.x))) < LANCE_ARC) h.hurt();
  for (const fg of [forgotten, forgotten2, ...bargeBoss.forgotten]) if (fg.up){ const fd = Math.hypot(h.x - fg.x, h.y - fg.y);
    if (fg.state === 'swing' && fg.t <= dt * 1.01 && fd < FG_REACH + 6 && Math.abs(angDiff(fg.h, Math.atan2(h.y - fg.y, h.x - fg.x))) < FG_ARC) h.hurt();
    if (fg.state === 'beam' && fg.t <= dt * 1.01 && fg.offRay(h.x, h.y) < RAY_HIT) h.hurt();
    for (let i = fg.skulls.length - 1; i >= 0; i--){ const q = fg.skulls[i]; if (Math.hypot(q.x - h.x, q.y - h.y) < SKULL_HIT){ fg.skulls.splice(i, 1); h.hurt(); } } } }
// His boat: beside yours at sea, netting fish for you from it while he is aboard.
const wboat = new WarlockBoat();
wboat.findFish = (x, y, reach) => { if (holdTotal >= HOLD[lv.hold]) return null; let best = null, bd = reach;
  for (const sc of schools){ if (sc.alive <= 0 || (sc.night && dark < .75) || Math.hypot(sc.cx - x, sc.cy - y) > reach + sc.r + 20) continue;
    for (const f of sc.fish){ if (!f.alive || f.grow < 1) continue; const d = Math.hypot(f.x - x, f.y - y); if (d < bd){ bd = d; best = {x: f.x, y: f.y, f, sc}; } } }
  return best; };
wboat.onFish = (c) => { sfx.zap(); catchFish(c.f, c.sc); };
wboat.onArrive = () => toast('The warlock sails his own boat beside yours. He will catch fish for you.', 3600, 1);
// Island 4's boss, the kid's: the tar monster with an anchor on a chain. It watches from the tar until the figure sets
// foot on the sand, then rises, and the evil monkey vanishes. Beaten, it melts, and a tarling climbs out and comes along.
const TAR_PRIZE = 2000;
const anchorer = new Anchorer(), tarling = new Tarling();
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
  tarling.come(walker.x + 14, walker.y + 10); sfx.yip();
  // The first time, the far deep opening is said in the same toast: a second one queued behind a toast this long
  // waits past the queue's MAX_WAIT and is dropped before it is ever shown.
  const far = first ? ' Far out at the deep\'s end, its anchor chain sinks between the far buoys: the far deep is open.' : '';
  toasts.clear(); toast(`You beat the Tar Anchorer! A tarling climbed out of the tar, and it is coming with you.${far} +${TAR_PRIZE} coins.`, first ? 7000 : 5000, 2);
  hud(); refreshShop(); save(); };
tarling.findTarget = (x, y, range) => warlock.findTarget(x, y, range);
tarling.onSpit = () => sfx.spit();
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
cth.onBeaten = () => { const first = isle6Stage < 2; isle6Stage = 2; towerWon = true; burst(cth); hearts = maxHearts(); hudHearts();
  if (first){ coins += RARE_FISH; earned += RARE_FISH; addText(cth.x, cth.y, 60, '+' + RARE_FISH, C.coin, 24, 2.4); }
  if (first){ cat.come(cth.x + 30, cth.y + 40); warrior.come(cth.x + 40, cth.y + 26); }
  toasts.clear(); toast(first ? `Cthulhu crumbles into the deep... and leaves behind a rare fish worth ${RARE_FISH} coins, and two who were kept down there: a healer cat and a little Cthulhu warrior. They are coming with you!` : 'Cthulhu crumbles into the deep.', 6400, 2);
  hud(); refreshShop(); save(); };
// The two Cthulhu leaves behind, the kid's: a healer cat and a little Cthulhu warrior. They follow the figure ashore and
// fight beside it; the cat gives back a heart, twice a fight, and more for a fish from the hold. Tap it to feed or pet it.
// And the Forgotten One's bones, the kid's, on your side once he falls: they hit for two and raise a ghost and a
// skeleton to fight for you.
// And the necromancer, freed from the Heron's orb: he keeps back and raises his skeleton hamster to fight for you.
// And the baby Reaper, out of the Reaper on land's egg: he nips for one ashore, and swims and leaps off the bow at sea.
const cat = new Pal('cat'), warrior = new Pal('warrior'), bonesPal = new Pal('bones'), naga = new Pal('naga'), necroPal = new Pal('necro'), baby = new Pal('baby'), caterman = new Pal('caterman');
let palsTold = false, wasFight = false, bonesTold = false, raiseTold = false, necroTold = false, hamsterTold = false;
// The flotilla, the kid's: the four with nothing to do at sea, the warrior, the bones, the necromancer and the tarling,
// sail craft of their own round the boat instead of crowding its deck (entities/flotilla.ts): an airboat, a catamaran,
// a windsurfer and a banana boat; and Caterman his swan paddle boat, for two. Ashore they step off and walk with the
// army; the craft wait.
const flotilla = new Flotilla(); flotilla.crew = crew; // the same object as the save's, so a change is saved
// The muffin man, the owner's: a bakery stall on the pier, Drury Lane, and a loop that never resolves (entities/muffinman.ts).
const muffin = new MuffinMan();
// Island 6's birds, the kid's: parrots in the palms, sandpipers on the sand, skeins overhead (entities/birds6.ts).
const birds6 = new Birds6(); birds6.onStartle = () => sfx.squawk();
// Island 10's prairie animals, the kid's: bunnies, prairie dogs, butterflies and bison (entities/prairie10.ts).
const prairie10 = new Prairie10(); prairie10.onDuck = () => sfx.squeak();
// The old man in his rocking chair on his store's porch, the kid's: dad jokes, and snacks (entities/oldman.ts).
const oldMan = new OldMan();
// The crows at island 10's birdfeeder, the kid's: one question each, and answered right, yours (entities/crows.ts).
const crows = new Crows(); crows.onCaw = () => sfx.caw();
// Ashore on island 11, the portal in the ruins and the black lagoon each say what they are, once a landing, close up.
// What they are for comes later: the key in the lagoon, and the way through to the Old One's place.
let isle11Told = new Set();
function updateIsle11(){ if (walker.state !== 'ashore' || walker.dock !== ISLE11_DOCK){ if (walker.aboard) isle11Told.clear(); return; }
  if (!isle11Told.has('portal') && Math.hypot(walker.x - PORTAL11.x, walker.y - PORTAL11.y) < PORTAL11.r + 60){ isle11Told.add('portal');
    toast(isle7Stage >= 4 ? 'An old portal of carved stone, a skull at its top, awake and swirling green! It goes to the Old One\'s place. Walk into it.'
      : 'An old portal of carved stone, a skull at its top. It is dark and cold. On the other side, something old is still awake: the Old One, on Gigantis.', 4600, 1); }
  if (!isle11Told.has('lagoon') && byLagoon11(walker.x, walker.y, 40)){ isle11Told.add('lagoon');
    toast('The black lagoon. The water is so dark you cannot see the bottom. ' + (skullKey ? 'Things still move down there.' : 'Far down, something glints... and something moves.')
      + (hasScuba() ? (skullKey ? '' : ' Tap Dive into the lagoon to go and see.') : ' You need scuba gear to dive in: it is in island 3\'s tower.'), 4800, 1); } }
// The crow let go in the far far sea (entities/crows.ts GuideCrow): one of the figure's crows off the rail, flying for
// island 11, waiting on its sand, and back to the rail once the boat comes close.
const guide = new GuideCrow(PERCH11);
guide.onArrive = () => { sfx.caw(); if (!isle11Seen){ toasts.clear(); toast('Caw! Far off, your crow has come down. It has found land: follow the crow marker.', 3600, 1); } };
guide.onBack = () => { sfx.caw(); toast('Caw! Your crow flies back to its place on the rail.', 2600); };
/** The figure's crows riding on the rail now: not on their way to it from the feeder, and not out finding land. */
function crowsAboard(){ return Math.max(0, crowsOwned - crows.flying - (guide.away ? 1 : 0)); }
let crowGoShown = false;
function letCrowGo(){ audio(); if (!crowGoShown) return; const n = crowsAboard(); if (n < 1) return;
  if (!guide.letGo(crowSeat(boat, bk(), n - 1))) return; sfx.caw(); toasts.clear();
  toast('Off it goes, up and away! A crow flies for land: follow it.', 3200, 1); updateCrowGo(); }
// Out in the far far sea with a crow on the rail and island 11 not yet found: Let a crow go.
function updateCrowGo(){ const show = started && walker.aboard && !docked && !seaFight && !cine && !diving && !icing && !isle11Seen && !guide.away && crowsAboard() > 0 && pastFarFar(boat.x, boat.y);
  if (show !== crowGoShown){ crowGoShown = show; $('crowGo').hidden = !show; } }
$('crowGo').addEventListener('click', letCrowGo);
// The day's sunken treasure, the kid's, shown by the old man's treasure finder on the radar and hauled up in the net
// (entities/sunken.ts, world/sunken.ts). A fresh lot each day; which were found today is saved.
const sunken = new Sunken();
let sunkenListDay = -1, sunkenTold = false;
sunken.onSnag = (s) => { coins += s.coins; earned += s.coins; sunkenFound = sunken.found; sfx.orderFilled();
  flies.push({x0: s.x, y0: s.y, z0: 0, to: 'boat', t: 0, dur: .6, c: '#FFD24A', s: 9}); addText(s.x, s.y, 30, '+' + s.coins, C.coin, 22, 1.8);
  const left = sunken.list.filter((_, i) => sunken.left(i)).length;
  toasts.clear(); toast(`Clunk! Your net snagged ${s.name}! ${s.coins} coins.` + (sunkenTold ? '' : left ? ` ${left} more down there today: follow the gold on your radar.` : ' That was the last one today. More sinks tomorrow.'), 3600, 1);
  sunkenTold = true; hud(); save(); };
// Out in open water, past every island's shallows (and the tar round island 4), so the net can be towed over it.
function seaClear(x, y){ return mapIsles().every(i => Math.hypot(x - i.x, y - i.y) > i.r + 420) && Math.hypot(x - ISLE4.x, y - ISLE4.y) > TAR_R + 200 && Math.hypot(x - TRENCH.x, y - TRENCH.y) > TRENCH.r + 100; }
function updateSunken(){ if (sunkenListDay !== day){ if (sunkenDay !== day){ sunkenDay = day; sunkenFound = 0; }
    sunken.set(sunkenFor(day, seaClear), sunkenFound); sunkenListDay = day; }
  sunken.on = finder && gear.radar; }
// The nearest of today's treasure that the radar's scope does not reach, for the arrowhead on its rim.
function sunkenToward(){ if (!sunken.on) return null; let best = null, bd = Infinity;
  sunken.list.forEach((s, i) => { if (!sunken.left(i)) return; const d = Math.hypot(s.x - boat.x, s.y - boat.y); if (!inRange(s.x - boat.x, s.y - boat.y) && d < bd){ bd = d; best = s; } });
  return sunken.list.some((s, i) => sunken.left(i) && inRange(s.x - boat.x, s.y - boat.y)) ? null : best; }
// The swamp's gators, the kid's: hostile, ten hits each; one in each of the bigger pools (entities/gators.ts).
const gators = new Gators();
let gatorTold = false, gatorPaidTold = false;
gators.onBite = (n) => bonked('bite', n);
gators.onRise = () => { sfx.splash(); if (!gatorTold){ gatorTold = true; toasts.clear(); toast('A gator! When it opens its jaws wide, get out of the way: it bites for a heart. Ten hits beat one.', 4200, 2); } };
gators.onGape = () => sfx.hiss();
gators.onSnap = () => sfx.anglerSnap();
gators.onBeaten = (g) => { coins += GATOR_PRIZE; earned += GATOR_PRIZE; sfx.spearHit(); addText(g.x, g.y, 24, '+' + GATOR_PRIZE, C.coin, 18, 1.4);
  if (!gatorPaidTold){ gatorPaidTold = true; toasts.clear(); toast(`You beat a gator! It rolls over and leaves ${GATOR_PRIZE} coins. The gators are back in their pools every time you come to the island.`, 4200, 1); } hud(); save(); };
// The forest's gorillas, the kid's: a troop of three that hit hard (three hearts), each slam wound up with a ring on the
// ground where it will land, so it can be dodged; seven hits each (entities/gorillas.ts).
const gorillas = new Gorillas();
let gorillaTold = false, gorillaBeatTold = false, hootAt = 0;
gorillas.onWarn = () => { if (T > hootAt){ hootAt = T + .5; sfx.hoot(); }
  if (!gorillaTold){ gorillaTold = true; toasts.clear(); toast('Gorillas! When one rears up with its fists high, a red ring shows where they will land: get out of it! A slam takes three hearts. Seven hits beat one.', 4800, 2); } };
gorillas.onWindup = () => sfx.gorillaRoar();
gorillas.onSlam = () => { sfx.whump(); shake = Math.max(shake, .45); };
gorillas.onHit = (n) => bonked('slam', n);
gorillas.onBeaten = (g) => { coins += GORILLA_PRIZE; earned += GORILLA_PRIZE; sfx.spearHit(); addText(g.x, g.y, 40, '+' + GORILLA_PRIZE, C.coin, 18, 1.4);
  if (!gorillaBeatTold){ gorillaBeatTold = true; toasts.clear(); toast(`The gorilla has had enough: it runs off into the trees and drops ${GORILLA_PRIZE} coins. The troop is back every time you come to the island.`, 4200, 1); } hud(); save(); };
// The swamp's other creatures, the kid's, none of them any trouble: frogs, snakes, panthers, tiny bears, tiny deer and
// the swamp monster (entities/swamp10.ts).
const swamp10 = new Swamp10();
let monsterTold = false;
swamp10.onCroak = () => sfx.croak();
swamp10.onPlop = () => sfx.plip();
swamp10.onHiss = () => sfx.hiss();
swamp10.onRoar = (m) => { sfx.blargh(); shake = Math.max(shake, .25); addText(m.x, m.y, 62, 'BLAAARGH!', '#9FE07A', 20, 1.4);
  if (!monsterTold){ monsterTold = true; toasts.clear(); toast('The swamp monster! It roars... and then it waves. It is a friendly one.', 3600, 1); } };
// The swamp's giant spider, the kid's: only bug spray beats him; without it he wraps the figure up and hangs it in his
// web (entities/spider10.ts). webT is how long it is still stuck there, at webAt; webFree, a moment after, before the web
// can stick it again.
const spider10 = new Spider10();
let webT = 0, webAt = null, webFree = 0, sprayAt = 0, sprayFx = null, spiderTold = false, webTold = false, spiderBeatTold = false, spearTinkTold = false;
spider10.onDrop = () => { sfx.skitter(); if (!spiderTold){ spiderTold = true; toasts.clear();
  toast(bugSpray > 0 ? 'A giant spider! Get close and tap the spray can: bug spray is the only thing that beats him.' : 'A giant spider! Nothing hurts him but bug spray, and you have none: run! The old man on the prairie sells it.', 4200, 2); } };
spider10.onGrab = () => bonked('web');
spider10.onHang = () => { if (walker.state !== 'ashore') return; webT = WEB_HOLD; webAt = {x: WEB.x, y: WEB.y, web: WEB};
  if (!webTold){ webTold = true; toasts.clear(); toast('The spider wrapped you up and hung you in his web! Wriggle... and you drop free. Bug spray beats him: the old man sells it.', 4200, 2); } };
spider10.onSprayed = () => sfx.shriek();
spider10.onBeaten = () => { coins += SPIDER_PRIZE; earned += SPIDER_PRIZE; sfx.orderFilled(); addText(spider10.x, spider10.y, 30, '+' + SPIDER_PRIZE, C.coin, 22, 1.8); toasts.clear();
  toast(spiderBeatTold ? `The spider curls up and is gone! +${SPIDER_PRIZE} coins.` : `Psssht! The spider curls up and is gone, and his web hangs torn. +${SPIDER_PRIZE} coins. He will be back next time you come.`, 4200, 1);
  spiderBeatTold = true; hud(); save(); };
// The spider's hold on the figure: towed behind him as he drags it home, then stuck in his web a moment; and the web
// itself sticks a figure that walks into it, and wakes him.
/** The spiders the figure could meet where it is: island 10's on its island, or the Battle Barge's on the barge. */
function spidersHere(){ return walker.state !== 'ashore' ? [] : tower === BARGE ? bargeBoss.spider : walker.dock === ISLE10_DOCK ? [spider10] : []; }
function updateSpider(dt){ webFree = Math.max(0, webFree - dt); if (sprayFx){ sprayFx.t += dt; if (sprayFx.t > .45) sprayFx = null; }
  const ss = spidersHere(); if (!ss.length){ webT = 0; return; }
  const dragger = ss.find(sd => sd.state === 'drag'); if (dragger){ const [tx, ty] = dragger.towed; walker.x = tx; walker.y = ty; return; }
  if (webT > 0){ webT -= dt; if (webAt){ walker.x = webAt.x; walker.y = webAt.y; }
    if (webT <= 0){ webT = 0; webFree = 2;
      // Dropped free on the near side of the web, toward the island's middle, or the barge's.
      const wb = webAt?.web ?? WEB, mid = tower === BARGE ? ROOMS[BARGE.first] : ISLE10, nx = mid.x - wb.x, ny = mid.y - wb.y, d = Math.hypot(nx, ny) || 1;
      walker.x = wb.x + nx/d*14; walker.y = wb.y + ny/d*14; addText(walker.x, walker.y, 30, 'Free!', '#F4F1E6', 16, 1.1); }
    return; }
  for (const sd of ss) if (sd.here && webFree <= 0 && offWeb(walker.x, walker.y, sd.web) < WEB_THICK){ webT = WEB_STUCK; webAt = {x: walker.x, y: walker.y, web: sd.web}; sfx.skitter();
    addText(walker.x, walker.y, 30, 'Stuck!', '#F4F1E6', 16, 1.1); sd.alert(); break; } }
function wrapped(){ const ss = spidersHere(); return ss.length > 0 && (webT > 0 || ss.some(sd => sd.state === 'drag')); }
// The spray can, over the throw button: shown with bug spray in the bag and the spider in reach.
const elSpray = $('sprayBtn'); let sprayShown = false;
function sprayTarget(){ if (bugSpray <= 0 || wrapped()) return null; let best = null, bd = SPRAY_RANGE;
  for (const sd of spidersHere()){ const d = Math.hypot(sd.x - walker.x, sd.y - walker.y); if (sd.here && d <= bd){ bd = d; best = sd; } }
  return best; }
function sprayNow(){ audio(); const s = sprayTarget(); if (!s || T < sprayAt) return; sprayAt = T + .6; bugSpray--; sfx.spray(); walker.throwAt(s.x, s.y);
  sprayFx = {t: 0, x0: walker.x, y0: walker.y, x1: s.x, y1: s.y}; s.spray(); hudSpray(); save(); }
elSpray.addEventListener('pointerdown', e => { if (e.button > 0) return; sprayNow(); });
elSpray.addEventListener('click', e => { if (e.detail === 0) sprayNow(); });
function hudSpray(){ const show = !!sprayTarget(); if (show !== sprayShown){ sprayShown = show; elSpray.hidden = !show; }
  if (show){ const b = elSpray.querySelector('b'); if (b.textContent !== String(bugSpray)) b.textContent = String(bugSpray); elSpray.classList.toggle('wait', T < sprayAt); } }
// Honey, the kid's: both Reapers are afraid of it (data/snacks.ts). A jar from the old man or the forest's bees, held
// up at a Reaper after the boat or the figure, stops him dead: he shakes the boat (ashore, himself), then runs off
// splashing. Not a win: no prize at sea, no egg ashore, and he is back after a while (entities/reaper.ts, reaperland.ts).
const elHoney = $('honeyBtn'); let honeyShown = false, honeySplashT = 0;
function honeyTarget(){ if (honey <= 0 || !started || cine || diving || icing || wrapped()) return null;
  if (walker.aboard){ if (docked || swallowT > 0) return null;
    if (seaFight) return seaBoss.reaper.find(r => r.hunting && r.state !== 'shy') ?? null;
    return reaper.hunting && reaper.state !== 'shy' ? reaper : null; }
  if (walker.state !== 'ashore') return null; let best = null, bd = HONEY_LAND;
  for (const lr of [landReaper, ...bargeBoss.reaper, ...seaReapers]){ const d = Math.hypot(lr.x - walker.x, lr.y - walker.y); if (lr.awake && d < bd){ bd = d; best = lr; } }
  return best; }
function honeyNow(){ audio(); const r = honeyTarget(); if (!r || !r.scare()) return; honey--; sfx.reaperRoar(); shake = Math.max(shake, .5); toasts.clear();
  setTimeout(() => sfx.splash(), 1500);
  if (r === reaper) toast("You hold up the honey. The Reaper stops dead! He shakes your boat... and runs off, splashing! He'll be back.", 4200, 2);
  else if (seaBoss.reaper.includes(r)) toast('You hold up the honey. The Reaper stops dead! He shakes your boat... and runs off, splashing, out of the fight!', 3600, 2);
  else if (seaReapers.includes(r)) toast('You hold up the honey. The Reaper stops dead, shakes all over, and runs off into the sea, splashing, out of the fight!', 3600, 2);
  else if (r === landReaper && reaperEgg < 1) toast("You hold up the honey. The Reaper stops dead, shakes all over, and runs off into the sea, splashing! He'll be back by his nest: beat him to win his egg.", 4800, 2);
  else toast('You hold up the honey. The Reaper stops dead, shakes all over, and runs off, splashing!', 3600, 2);
  hudHoney(); save(); }
elHoney.addEventListener('pointerdown', e => { if (e.button > 0) return; honeyNow(); });
elHoney.addEventListener('click', e => { if (e.detail === 0) honeyNow(); });
function hudHoney(){ const show = !!honeyTarget(); if (show !== honeyShown){ honeyShown = show; elHoney.hidden = !show; }
  if (show){ const b = elHoney.querySelector('b'); if (b.textContent !== String(honey)) b.textContent = String(honey); } }
function honeySplash(x, y, n){ for (let k = 0; k < n; k++) sparks.push({x: x + (Math.random()-.5)*40, y: y + (Math.random()-.5)*40, vx: (Math.random()-.5)*70, vy: (Math.random()-.5)*70, z: 2, vz: 50 + Math.random()*60, age: 0, life: .5 + Math.random()*.3, c: '#E8F6FF'}); }
// While he shakes the boat it shakes, and as he runs the water flies up round him.
function updateHoney(dt){ hudHoney(); honeySplashT -= dt; const now = honeySplashT <= 0; if (now) honeySplashT = .08;
  for (const r of [reaper, ...seaBoss.reaper]){ if (r.state === 'shy'){ shake = Math.max(shake, .35); if (now) honeySplash(boat.x, boat.y, 2); }
    if (r.fled && r.state === 'away' && r.t < 3 && now) honeySplash(r.x, r.y, 5); }
  for (const lr of [landReaper, ...bargeBoss.reaper, ...seaReapers]){ if (lr.state === 'shy') shake = Math.max(shake, .2);
    if (lr.state === 'run' && now && lr.lair.inSea(lr.x, lr.y)) honeySplash(lr.x, lr.y, 4); } }
// The forest's beehive on island 10 (world/isle10.ts HIVE10): a jar of honey a day, for the Reapers.
function hiveAt(){ return [px(HIVE10.x, HIVE10.y), py(HIVE10.x, HIVE10.y, HIVE10.z + 6)]; }
function tapHive(){ audio(); toasts.clear();
  if (Math.hypot(walker.x - HIVE10.x, walker.y - HIVE10.y) > HIVE_REACH){ toast('Walk up to the beehive under the oak.', 1800); return; }
  if (hiveDay === day){ toast('Bzzz! The bees are busy making more. Come back tomorrow for another jar.', 2600); return; }
  if (honey >= HONEY_MAX){ toast(`Bzzz! Your bag holds ${HONEY_MAX} jars of honey, and it's full.`, 2400); return; }
  const first = !hiveDay; honey++; hiveDay = day; sfx.upgrade(); addText(HIVE10.x, HIVE10.y, HIVE10.z + 18, '+1 honey', '#FFD36A', 16, 1.2);
  toast(first ? "Bzzz! You take a jar of honey from the hive, and the bees let you: there's plenty. The Reaper is afraid of honey! The bees make a jar a day." : 'Bzzz! A jar of honey from the hive. The bees make one a day.', first ? 5200 : 2600, 1); save(); }
const SWAMP_SAY = {frog: ['Ribbit!', '#B8E07A', () => sfx.ribbit()], snake: ['Hisss!', '#D8E8A0', () => sfx.hiss()], panther: ['Rrrowr!', '#C9C2E8', () => sfx.rowr()], cub: ['Grr!', '#E2C29A', () => sfx.grr()], deer: ['Meep!', '#F1DDB8', () => sfx.bleat()]};
const PRAIRIE_SAY = {bunny: ['Boing!', '#F4EBD8', () => sfx.hop()], dog: ['Squeak!', '#EBD3A8', () => sfx.squeak()], bison: ['Snort!', '#D9B98A', () => sfx.snort()]};
// A tap on him or on his words, from the figure ashore; the dog, pottering in front of his counter, keeps a tap nearer it.
function tapsBaker(x, y){ const bx = px(BAKER.x, BAKER.y), d = Math.hypot(x - bx, y - py(BAKER.x, BAKER.y, DECK_Z + 18)), g = pets.dog;
  if (g && Math.hypot(x - px(g.x, g.y), y - py(g.x, g.y, g.z + 12)) < Math.min(d, 36)) return false;
  return d < 30 || (!!muffin.saying() || muffin.near) && Math.hypot(x - bx, y - (py(BAKER.x, BAKER.y, WORDS_Z) - 24)) < 40; }
function talkToBaker(){ audio();
  // A tap answers at once, not behind whatever was being said.
  if (!MuffinMan.reaches(walker.x, walker.y)){ toasts.clear(); toast('Walk up to the baker.', 1600); return; }
  muffin.say(); sfx.muffinMan(muffin.line);
  // With junk aboard he takes it, a piece for each muffin there is room for in the box, and bakes.
  const n = bakeable(junk, muffins.length); if (n > 0){ junk -= n; const now = day + clock;
    for (let i = 0; i < n; i++){ muffins.push(now); flies.push({x0: BAKER.x, y0: BAKER.y, z0: DECK_Z + 22, to: 'figure', t: -i*.14, dur: .5, muffin: true}); }
    hudJunk(); save(); toast(`He takes your junk and bakes you ${n} fish muffin${n === 1 ? '' : 's'}! Eat one for a heart back: tap the muffin up top. Don't leave them too long...`, 3800, 1); }
  else if (junk > 0) toast('Your muffin box is full. Eat one first!', 2000); }
// A fish muffin, eaten: a heart back, for the middle of a fight. The oldest goes first.
function eatMuffin(){ audio(); if (!muffins.length) return;
  // A button pressed answers at once, not behind whatever was being said.
  if (hearts >= maxHearts()){ toasts.clear(); toast('Your hearts are full. Keep it for a fight.', 1800); return; }
  muffins.shift(); hearts = Math.min(maxHearts(), hearts + 1); hudHearts(); hudJunk(); sfx.nom(); save();
  if (walker.shown) addText(walker.x, walker.y, 34, 'Nom! +1 heart', '#F28FAE', 17, 1.3); }
$('muffinBtn').addEventListener('click', eatMuffin);
// Left a whole game day in the box, a muffin grows legs and follows you; past six, the oldest wanders off into the sea.
function growLegs(){ const n = sprouting(muffins, day + clock); if (!n) return; muffins.splice(0, n);
  for (let i = 0; i < n; i++){ const was = leggy.count, at = walker.shown ? walker : crateSeat();
    if (leggy.sprout(at.x, at.y)){ addText(at.x, at.y, 20, 'Splash!', '#E3ECEF', 15, 1.2); toast('A muffin grew legs, and the oldest wandered off into the sea. An unholy half dozen is plenty.', 3400); }
    else if (was === 0) toast('One of your fish muffins grew legs! It follows you about now. Pee-yew.', 3600, 1);
    else toast('Another fish muffin grew legs! Eat them before they do.', 2600); }
  sfx.squeak(); hudJunk(); save(); }
// The stink crate, on the foredeck's other side from where the egg rode: the cabin aft would hide it, and Neil has the stern.
function crateSeat(){ const c = Math.cos(boat.h), s = Math.sin(boat.h), k = bk(); return {x: boat.x + c*11*k + s*5*k, y: boat.y + s*11*k - c*5*k, z: 9*k + 1}; }
const RIDER_PAL = {warrior, bones: bonesPal, necro: necroPal, caterman};
flotilla.free = (r) => r === 'tarling' ? tarling.free : RIDER_PAL[r].free;
flotilla.riding = (r) => r === 'tarling' ? !tarling.with : !RIDER_PAL[r].shown;
flotilla.onLand = (x, y) => landAt(x, y) || seaLand(x, y, 20);
// On the swan they pedal: the legs going round under way.
function riderOn(r){ const v = drawView; return (x, y, z, h, pedal) => { const ph = pedal ? pedal.ph : 0, gait = pedal ? pedal.gait : 0;
  if (r === 'tarling') drawTarblob(v, v.px(x, y), v.py(x, y, z), h, .95, v.T);
  else if (r === 'necro') drawNecromancer(v, x, y, 0, {z, size: .8});
  else if (r === 'caterman') drawCaterman(v, v.px(x, y), v.py(x, y, z), h, ph, gait, false, .8);
  else (r === 'bones' ? drawBones : drawWarrior)(v, v.px(x, y), v.py(x, y, z), h, ph, gait, false, .85); }; }
/** A rider at a craft's seat, unless ashore with the figure. */
function seated(r){ return r && flotilla.riding(r) ? riderOn(r) : null; }
/** A rider out on its own craft, and so not on the deck. */
function onCraft(r){ const c = flotilla.craftOf(r); return !!c && c.placed; }
for (const p of [cat, warrior, bonesPal, naga, necroPal, baby, caterman]){ p.findTarget = (x, y, r) => warlock.findTarget(x, y, r); p.onSwing = () => sfx.spearHit();
  p.onHurt = (out) => { addText(p.x, p.y, 26, out ? 'Worn out!' : 'Ow!', '#B8FFC8', 15, 1); if (!out) cat.noticePalHurt(p); if (out){ toasts.clear(); toast(p.kind === 'naga' ? 'The naga is worn out. He swims back to the boat to rest.' : p.kind === 'baby' ? 'The baby Reaper is worn out. He swims back to the boat to rest.' : p.kind === 'necro' ? 'The necromancer is worn out. He goes back to the boat to rest.' : p.kind === 'caterman' ? 'Caterman is worn out. He goes back to the boat to fix his suit.' : `The ${p.kind === 'cat' ? 'cat' : p.kind === 'warrior' ? 'warrior' : 'skeleton'} is worn out. It goes back to the boat to rest.`, 2800, 1); } }; }
bonesPal.canRaise = () => allies.count('ghost') + allies.count('skeleton') === 0;
necroPal.canRaise = () => allies.count('hamster') === 0;
necroPal.onRaise = (x, y) => { allies.call(x + 16, y + 14, 'hamster'); sfx.portal(); addText(x + 16, y + 14, 30, 'Squeak!', '#D8FFE0', 16, 1.1);
  if (!hamsterTold){ hamsterTold = true; toast('The necromancer raises his skeleton hamster! It only bites for one, but it takes a lot of hits.', 3200, 1); } };
bonesPal.onRaise = (x, y) => { allies.call(x + 18, y + 8, 'ghost'); allies.call(x - 14, y + 16, 'skeleton'); sfx.portal();
  if (!raiseTold){ raiseTold = true; toast('The skeleton raises a ghost and a skeleton out of the ground. They fight for you!', 3000, 1); } };
cat.onHeal = () => { if (hearts < maxHearts()){ hearts++; hudHearts(); sfx.turtle(); addText(walker.x, walker.y, 34, '+1', '#FF8FB0', 18, 1.2);
  for (let i=0;i<8;i++) sparks.push({x: walker.x, y: walker.y, vx:(Math.random()-.5)*60, vy:(Math.random()-.5)*60, z:20, vz:30+Math.random()*30, age:0, life:.7, c:'#FFB3C8'}); } };
// Fed tuna, the cat heals a hurt companion too: the warlock a heart, the others a hit, with the same pink sparkle.
cat.onHealPal = (who) => { const p = who; if (!p.shown) return;
  if (p === warlock) warlock.hearts = Math.min(WARLOCK_HEARTS, warlock.hearts + 1); else p.hp = Math.min(p.maxHp, p.hp + 1);
  hudHearts(); sfx.turtle(); addText(p.x, p.y, 30, '+1', '#FF8FB0', 17, 1.2);
  for (let i=0;i<8;i++) sparks.push({x: p.x, y: p.y, vx:(Math.random()-.5)*60, vy:(Math.random()-.5)*60, z:18, vz:30+Math.random()*30, age:0, life:.7, c:'#FFB3C8'}); };
const TUNA = SPECIES.findIndex(s => s.name === 'tuna');
// Tapped: on the boat at sea with fish aboard it eats one, a tuna if there is one (it can smell it), else the
// commonest, for another heal; otherwise it is petted.
function tapCat(){ if (walker.state === 'ashore' && Math.hypot(walker.x - cat.x, walker.y - cat.y) > PET_REACH){ toast('Walk up to the cat.', 1600); return; }
  const tuna = TUNA >= 0 && hold[TUNA] > 0, firstTuna = tuna && !cat.tuna;
  if (walker.aboard && holdTotal > 0 && cat.feed(tuna)){ let sp = 0; if (tuna) sp = TUNA; else while (sp < hold.length && !hold[sp]) sp++; hold[sp]--; holdTotal--; hud(); sfx.yip();
    hudHearts(); toasts.clear(); toast(firstTuna ? `The cat ate a tuna! Purr. Now it heals your companions in a fight too, as well as you. ${cat.heals} heals.`
      : `The cat ate a ${SPECIES[sp].name}. It has ${cat.heals} heals for the next fight.`, firstTuna ? 3400 : 2400, 1); }
  else { cat.pet(); sfx.yip(); if (walker.aboard && cat.heals >= 5 && holdTotal > 0) toast('The cat is full. Purr.', 1600);
    else if (walker.aboard && !holdTotal && !catFedTold){ catFedTold = true; toast('Purr. Catch a fish and tap the cat to feed it: one more heal.', 2800, 1); } } }
let catFedTold = false;
function catAt(){ if (cat.shown) return [px(cat.x, cat.y), py(cat.x, cat.y, 8)];
  if (cat.free && walker.aboard){ const p = cat.seat(boat, bk()); return [px(p.x, p.y), py(p.x, p.y, p.z + 6)]; } return null; }
// Dragged under: the boat is left tied up at island 6's pier, and the figure, in its helmet, is in the temple.
function dragUnder(){ isle6Stage = Math.max(isle6Stage, 1); const b = berth6(bk()); boat.x = b.x; boat.y = b.y; boat.h = b.h; boat.v = 0;
  walker.landIn(ISLE6_DOCK, TEMPLE_DOOR.x, TEMPLE_DOOR.y); intoTemple(); redFlash = .6; save(); }
function intoTemple(){ resetTowers(); towerWon = false; tower = TEMPLE_DEEP; toRoom(TEMPLE6); walker.diving = true; cth.reset(); if (isle6Stage >= 2) cth.beaten(); sfx.portal(); }
// The Reaper on land, the kid's: the second of him, asleep by his nest on island 6's north-west beach, his egg in it.
// Walk near the nest and he wakes. Step out of his tail's red fan and off his charge's red line; when he rears up and
// roars, spear him. Beaten, he backs off into the sea and leaves the egg (reaperEgg 1); walk up to the nest and it is
// yours (reaperEgg 2), aboard in a coil of rope at the bow until it hatches.
const LAND_REAPER_PRIZE = 1000;
const landReaper = new LandReaper();
let landRearTold = false;
landReaper.onSight = () => { if (reaperLandSeen || reaperEgg) return; reaperLandSeen = true; save(); refreshShop();
  toast('The Reaper, out of the water, asleep by a nest on the sand. There are two of him. Something is in that nest.', 4400, 1); };
landReaper.onWake = () => { sfx.reaperRoar(); shake = Math.max(shake, .5); toasts.clear(); if (!reaperLandSeen){ reaperLandSeen = true; save(); refreshShop(); }
  toast(spear ? 'The Reaper wakes! Step out of his red fan, off his red line, and spear him when he rears up.'
    : 'The Reaper wakes! You have no spear: run back to the boat.', 4200, 2); };
landReaper.onWarn = (what) => what === 'sweep' ? sfx.reaperSwing() : sfx.jaws();
landReaper.onHit = (by) => bonked(by);
// What would hurt the figure hurts a helper in the way: in the fan when the tail has swept it, or on the charge's line.
landReaper.onBlow = (hits) => { sfx.whump(); for (const h of [warlock, cat, warrior, bonesPal, naga, necroPal, baby, caterman]) if (h.shown && hits(h.x, h.y, 6)) h.hurt();
  for (const a of allies.list) if (a.state === 'fight' && hits(a.x, a.y, 6)) allies.hurt(a); };
landReaper.onRear = () => { sfx.reaperRoar(); shake = Math.max(shake, .25);
  if (spear && !landRearTold && walker.state === 'ashore'){ landRearTold = true; toast('He is up! Spear him now.', 2000, 2); } };
landReaper.onHurt = () => sfx.spearHit();
landReaper.onGiveUp = () => toast('The Reaper goes back to his nest and lies down.', 2200, 1);
landReaper.onBeaten = () => { const first = reaperEgg < 1, again = reaperRematch && !first; reaperRematch = false; reaperEgg = Math.max(reaperEgg, 1); burst(landReaper); hearts = maxHearts(); hudHearts();
  if (first || again){ coins += LAND_REAPER_PRIZE; earned += LAND_REAPER_PRIZE; addText(landReaper.x, landReaper.y, 60, '+' + LAND_REAPER_PRIZE, C.coin, 24, 2.4); }
  toasts.clear(); toast(again ? `You beat the Reaper on land! He backs off into the sea, back to the deep. +${LAND_REAPER_PRIZE} coins.` : `You beat the Reaper! He backs off into the sea, and leaves his egg in the nest for you. +${LAND_REAPER_PRIZE} coins.`, 5000, 2);
  hud(); refreshShop(); save(); };
// The egg, waiting in his nest: walk up to it and it is yours.
function takeEgg(){ if (reaperEgg !== 1 || walker.state !== 'ashore' || walker.dock !== ISLE6_DOCK || floor >= 0) return;
  if (Math.hypot(walker.x - NEST6.x, walker.y - NEST6.y) > NEST6.r + 12) return;
  reaperEgg = 2; eggDay = day; sfx.tierUp(); shake = Math.max(shake, .2);
  for (let k=0;k<12;k++) sparks.push({x: NEST6.x, y: NEST6.y, vx:(Math.random()-.5)*90, vy:(Math.random()-.5)*90, z:10, vz:50+Math.random()*50, age:0, life:.9+Math.random()*.5, c:'#BFE0FF'});
  addText(NEST6.x, NEST6.y, 34, 'The egg!', '#BFE0FF', 22, 2);
  toasts.clear(); toast('The Reaper\'s egg is yours! It is warm, and something in it moves. It rides at your boat\'s bow now. Keep it till morning...', 4600, 2);
  hud(); refreshShop(); save(); }
// The egg aboard, at the bow on the side away from the necromancer, in a coil of rope; it wobbles now and then.
function eggSeat(){ const c = Math.cos(boat.h), s = Math.sin(boat.h), k = bk(); return {x: boat.x + c*12*k - s*6*k, y: boat.y + s*12*k + c*6*k, z: 9*k + 1}; }
function drawEggAboard(){ const p = eggSeat(), sx = px(p.x, p.y), sy = py(p.x, p.y, p.z), t = eggT(), r = eggLook(T, t);
  ctx.strokeStyle = '#C9A46A'; ctx.lineWidth = 1.6*Z; for (const q of [6, 4.5]){ ctx.beginPath(); ctx.ellipse(sx, sy, q*Z, q*.5*Z, 0, 0, Math.PI*2); ctx.stroke(); }
  // In its scene it is drawn a little bigger again, so the shaking and the cracks read on a phone.
  const s = .55*Z*(1 + r.swell)*(t === null ? 1 : 1 + .35*cineK());
  if (t === null || t < POP_T){ eggGlow(sx, sy - 4*Z, 18*Z); drawReaperEgg(ctx, sx, sy + 1*Z - r.hop*2.5*Z, s, r.wob, r.crack); return; }
  // Out: the bottom of his shell in the coil of rope, and him in it, looking about, a tiny roar as he comes out.
  ctx.save(); ctx.beginPath(); ctx.rect(sx - 40*Z, sy - 1.3*8.4*s + 1*Z, 80*Z, 40*Z); ctx.clip(); drawReaperEgg(ctx, sx, sy + 1*Z, s, 0, 1); ctx.restore();
  const u = t - POP_T, look = Math.sin(u*2.2)*.5 > 0 ? -1 : 1;
  drawReaperBody(drawView, p.x, p.y, p.z + 6 + Math.abs(Math.sin(u*5))*1.5*Math.max(0, 1 - u), sideOn(boat.h + (look > 0 ? 0 : Math.PI)), .35,
    {T: u*.6, len: 30, legs: 'walk', mouth: u < .9 ? 1 - u/.9 : 0, young: true}); }
// It hatches at the first dawn after it came aboard, once the figure is aboard and out at sea with nothing after the
// boat: a moment for the dawn's news, then the owner's cutscene. The little egg shakes on deck, Crack! Crack!
// Crrrrack!, and he is out: Congratulations! It's a baby Reaper! Then he hops over the side into the sea. A landing,
// the shop open at a pier, the map, a dive, the ice, the tank or a beast after the boat puts it off.
let hatchT = -1, babyTold = false, boatsShown = false, badgesShown = false;
/** The hatching scene's clock, or null when it is not on. */
function eggT(){ return cine && cine.kind === 'egg' ? cine.t : null; }
function calmSea(){ return !dangerNear() && !reaper.hunting && !serpent.hunting && !king.fighting && !hiredBoats.chasing && pirate.state !== 'chase'
  && cthulu.state !== 'awake' && gulper.state !== 'hunt' && deep.state !== 'rise' && deep.state !== 'fight' && deep.state !== 'drag'; }
function updateEgg(dt){ if (reaperEgg !== 2 || cine){ hatchT = -1; return; }
  if (!eggDue(reaperEgg, eggDay, day) || !started || walker.state !== 'aboard' || docked || shopOpen || mapOpen || diving || icing || swallowT > 0 || tankOpen || !calmSea()){ hatchT = -1; return; }
  hatchT = Math.max(0, hatchT + dt);
  if (hatchT >= HATCH_WAIT){ hatchT = -1; startCine('egg'); } }
// The scene's beats: each crack, the pop, the banner, and the hop into the sea.
function updateEggCine(){ const t = cine.t;
  while (cine.cue < CRACKS.length && t >= CRACKS[cine.cue]){ cine.cue++; sfx.eggCrack(); sfx.eggCrack(); shake = Math.max(shake, .12 + cine.cue*.06); }
  if (cine.cue === CRACKS.length && t >= POP_T){ cine.cue++; const p = eggSeat(); sfx.babyRoar(); sfx.tierUp(); shake = Math.max(shake, .3);
    for (let k=0;k<16;k++) sparks.push({x: p.x, y: p.y, vx:(Math.random()-.5)*70, vy:(Math.random()-.5)*70, z: p.z + 8, vz:50+Math.random()*50, age:0, life:.9+Math.random()*.4, c: k % 3 ? '#DCEEFB' : '#4F86C6'});
    for (let k=0;k<28;k++) sparks.push({x: p.x, y: p.y, vx:(Math.random()-.5)*110, vy:(Math.random()-.5)*110, z: p.z + 30, vz:60+Math.random()*60, age:0, life:1.4+Math.random()*.8, c: ['#F2C230', '#FF8FB0', '#7FD8FF', '#9BE58A', '#FFFFFF'][k % 5]}); }
  if (cine.cue === CRACKS.length + 1 && t >= INTO_SEA){ cine.cue++; hatch(); } }
function endEggCine(){ if (reaperEgg === 2) hatch();
  toast('A baby Reaper! He swims beside your boat, and now and then he leaps. Ashore, he walks with you and nips whatever you fight. Tap him!', 5600, 2); }
// Out of the scene, or skipped: he hops from the bow into the sea, and he is yours.
function hatch(){ const p = eggSeat(); reaperEgg = 3; baby.hatchAt(p.x, p.y); sfx.babyRoar();
  addText(p.x, p.y, 30, 'Rawr!', '#BFE0FF', 18, 1.2);
  hud(); refreshShop(); save(); }
// The baby Reaper, tapped: at sea he leaps for you; ashore, walk up to him and he gets a pat.
function babyAt(){ if (baby.shown) return [px(baby.x, baby.y), py(baby.x, baby.y, 10)];
  if (walker.aboard && swims(baby)) return [px(baby.x, baby.y), py(baby.x, baby.y, baby.leapZ + 4)]; return null; }
function tapBaby(){ audio(); if (baby.shown && Math.hypot(walker.x - baby.x, walker.y - baby.y) > PET_REACH){ toast('Walk up to the baby Reaper.', 1600); return; }
  baby.pet(); baby.leap(); sfx.babyRoar(); addText(baby.x, baby.y, 26, 'Rawr!', '#BFE0FF', 15, 1); }
baby.onSplash = (x, y) => { for (let k=0;k<6;k++) sparks.push({x, y, vx:(Math.random()-.5)*50, vy:(Math.random()-.5)*50, z:2, vz:30+Math.random()*30, age:0, life:.5, c:'#E8F6FF'}); };
function drawNestHere(){ drawReaperNest(drawView, NEST6.x, NEST6.y, NEST6.r);
  if (reaperEgg < 2){ const sx = px(NEST6.x, NEST6.y), sy = py(NEST6.x, NEST6.y, 3);
    eggGlow(sx, sy - 6*Z, 22*Z); drawReaperEgg(ctx, sx, sy, .78*Z, landReaper.state === 'sleep' && T % 7 < .5 ? Math.sin(T*30)*.1 : 0);
    // It sparkles a little, so it is found.
    const tw = (Math.sin(T*3) + 1)/2; ctx.fillStyle = `rgba(255,248,210,${.35 + tw*.5})`; star(sx + 6*Z, sy - 11*Z, (1.5 + tw*1.6)*Z); } }
function puff(x, y){ for (let i=0;i<16;i++) sparks.push({x, y, vx:(Math.random()-.5)*90, vy:(Math.random()-.5)*90, z:14, vz:30+Math.random()*40, age:0, life:.8+Math.random()*.5, c:'#B98AFF'}); }
// The kid's cutscene, once the warlock is free and the figure is back aboard: far off in the south corner of the deep,
// an evil monkey summons a tar monster out of the sea, the water goes black, and island 4 turns to tar. A tap skips it.
// The other cutscenes are the egg's (kind egg): the camera in close on the bow while the Reaper's egg hatches; and the
// Heron's escape (kind heron), once he is beaten on island 9: out over the sea, he falls, the Reaper comes, he portals.
const CINE = 12, CINE_IN = 2.5, CINE_OUT = 9.5;
const EGG_CAPTIONS = [[0, 'The Reaper\'s egg is shaking...'], [POP_T + .3, 'He has his dad\'s zigzags, and his dad\'s fin.'], [INTO_SEA - .2, 'And over the side he goes!']];
const CAPTIONS = [[0, 'Far away, in the south corner of the deep...'], [2.6, 'An evil monkey is summoning something out of the sea.'],
  [4.8, 'A tar monster! The water is turning black.'], [7.6, 'Island 4 is a tar island now. To go there, you will need a chemistry suit from the shipwright.']];
let cine = null, cineWait = 0, tarToastT = 0;
const ease = (t) => t*t*(3 - 2*t);
function cineLen(){ return !cine ? CINE : cine.kind === 'egg' ? EGG_CINE : cine.kind === 'heron' ? ESCAPE_LEN : CINE; }
function cineK(){ if (!cine) return 0; const t = cine.t, k = cine.kind, len = cineLen(), i = k === 'egg' ? EGG_IN : k === 'heron' ? ESCAPE_IN : CINE_IN, o = k === 'egg' ? EGG_OUT : k === 'heron' ? ESCAPE_OUT : CINE_OUT;
  return t < i ? ease(t/i) : t < o ? 1 : ease(clamp(1 - (t - o)/(len - o), 0, 1)); }
// Once it is tar the Anchorer draws the monster, and the evil monkey stands on the beach until it wakes.
// How island 7 looks now: the camp's chest, the tower's flag once the sorcerer is beaten there, and the portal.
function isle8Look(){ const fl = (sx, sy) => drawFlagAt(sx, sy, 18*Z, 12*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1);
  return {barred8: isle7Stage < 1, barred9: heronStage < 1, flag8: heronStage >= 1 ? fl : null, orbLit: heronStage < 2, flag9: heronStage >= 2 ? fl : null}; }
function isle7Look(){ return {cleared: monkeys7.cleared, open: isle7Stage >= 1 ? portalOpen : 0,
  flag: isle7Stage >= 1 ? (sx, sy) => drawFlagAt(sx, sy, 18*Z, 12*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1) : null}; }
// The portal wakes the first time the figure is back out on island 7 after the sorcerer falls: its lights come on and
// the ring fills over a couple of seconds. Awake, it is the way to Gigantis.
let portalOpen = isle7Stage >= 1 ? 1 : 0;
// Gigantis, through island 7's portal once it is awake: a courtyard inside its gate and two halls of the undead, each
// opening its door at the back once everyone in it is beaten, and then the throne room's great door, barred for now.
// Back through the portal is the way home; bonked out, the figure wakes aboard. It is whole again next time.
const CASTLE = {dock: ISLE7_DOCK, door: PORTAL_OUT, first: GATE, roof: -1, boss: null};
// The kid's island 11 portal, once the Old One is beaten: straight into his ruins, and home again to island 11.
const OLDPLACE = {dock: ISLE11_DOCK, door: PORTAL11_FRONT, first: RUINS, roof: -1, boss: null};
/** In Gigantis, by either way in. */
function inGigantis(){ return tower === CASTLE || tower === OLDPLACE; }
const hordes = {};
const CASTLE_WAKE = {[GATE]: 'Gigantis! Skeletons with swords and shields, and archers. Turn when an arrow flies.',
  [HALL_A]: 'Zombies, slow and tough, and ghosts. Walk away from their wisps.',
  [HALL_B]: 'Necromancers! They raise skeletons from the floor. Your spear goes for them first.',
  [THRONE]: 'The throne room! Three necromancers, and the Forgotten One: skulls, a sword, and a death ray. Step off the orange line!',
  [CRYPT]: 'The Forgotten One! On his feet again, laughing: "Ha ha ha! You thought you beat me? I fooled you!" And his skeletons, zombies and ghosts come for you. His sword hits harder now!'};
for (const i of [...CASTLE_ROOMS, RUINS, CRYPT]){ const h = hordes[i] = new Horde(ROOMS[i], CASTLE_SPAWNS[i] ?? []);
  h.onHit = (by, n) => bonked(by, n); h.onWindup = () => sfx.spearThrow(); h.onShoot = () => sfx.spearThrow();
  h.onWake = () => { if (CASTLE_WAKE[i]){ toasts.clear(); toast(CASTLE_WAKE[i], 3600, 2); } };
  h.onBlock = (u) => { sfx.clang(); addText(u.x, u.y, 40, 'Blocked!', '#FFE9A8', 20, 1.2); };
  h.onBeat = (u) => { sfx.spearHit(); addText(u.x, u.y, 30, u.kind === 'ghost' ? 'Gone!' : u.kind === 'lagoon' ? 'Splash!' : 'Down!', '#D8FFE0', 18, 1.1); };
  h.onRaise = (u) => { sfx.tentacle(); addText(u.x, u.y, 34, 'Rise!', '#8CFFA8', 18, 1.1); };
  h.onClear = () => { if (i === RUINS) return; if (i === THRONE){ castleWon(); return; } if (i === CRYPT){ cryptCheck(); return; } sfx.orderFilled();
    toast(i === HALL_B ? 'The hall is clear. The great door at its back opens on the throne room.' : 'The room is clear, and the door at the back is open.', 3000, 1); }; }
const nestHorde = hordes[NEST9] = new Horde(ROOMS[NEST9], []);
nestHorde.onHit = (by, n) => bonked(by, n); nestHorde.onWindup = () => sfx.spearThrow();
nestHorde.onBeat = (u) => { sfx.spearHit(); addText(u.x, u.y, 30, 'Down!', '#D8FFE0', 18, 1.1); };
for (const i of Object.values(ARENAS)){ const h = hordes[i] = new Horde(ROOMS[i], []);
  h.onHit = (by, n) => bonked(by, n); h.onWindup = () => sfx.spearThrow(); h.onShoot = () => sfx.spearThrow();
  h.onBlock = (u) => { sfx.clang(); addText(u.x, u.y, 40, 'Blocked!', '#FFE9A8', 20, 1.2); };
  h.onBeat = (u) => { sfx.spearHit(); addText(u.x, u.y, 30, u.kind === 'ghost' ? 'Gone!' : u.kind === 'lagoon' ? 'Splash!' : 'Down!', '#D8FFE0', 18, 1.1); };
  h.onRaise = (u) => { sfx.tentacle(); addText(u.x, u.y, 34, 'Rise!', '#8CFFA8', 18, 1.1); };
  h.onClear = () => bargeCheck(); }
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
// The Battle Barge's second stage, the rest of those on foot: a troop of gorillas, gators, lancers, and island 3's
// swordsman and his little demons, placed afresh for each fight (fillBarge), all coming for the figure from the start,
// and never giving up on it. No coins for each; the barge pays its own.
const bargeGorillas = new Gorillas([], Infinity), bargeGators = new Gators([], Infinity), bargeLancers = new Lancers([], {x: 0, y: 0});
let bargeFighters = [];
// And its bosses, the third stage, each made for the fight at its own spot: the leviathan sorcerer, the Forgotten One,
// the Heron and the giant pelican. Pick two and they fight together.
const bargeBoss = {sorcerer: [], forgotten: [], heron: [], pelican: [], cthulhu: [], oldone: [], reaper: [], anchorer: [], spider: []};
const bargeBosses = () => BOSS_FOES.flatMap(k => bargeBoss[k]);
/** Beaten, on the barge: fallen, flown off, sunk or on his knees. */
// A Reaper run off by honey ('run', 'away') has left the barge too.
const BOSS_DOWN = ['fall', 'gone', 'flee', 'sink', 'yield', 'melt', 'run', 'away'];
const bargeBand = {update(dt, w){ for (const f of bargeFighters) f.update(dt, w); for (const b of bargeBosses()) b.update(dt, w);
    // The Old One, up out of the sea, roars and fights; and nobody walks through Cthulhu.
    for (const o of bargeBoss.oldone) if (o.state === 'rise' && o.t >= OLD_RISE){ o.roar(); o.fight(); sfx.cthuluWake(); shake = Math.max(shake, .6); }
    for (const c of bargeBoss.cthulhu) if (c.state !== 'gone' && walker.state === 'ashore'){ const dx = walker.x - c.x, dy = walker.y - c.y, d = Math.hypot(dx, dy);
      if (d < CTH_R && d > 0) walkStep(walker, dx/d*(CTH_R - d), dy/d*(CTH_R - d), build); } },
  draw(v, layer){ for (const b of bargeBosses()) b.draw(v, layer); }};
const bargeDown = (x, y) => { sfx.spearHit(); addText(x, y, 30, 'Down!', '#D8FFE0', 18, 1.1); bargeCheck(); };
// The Battle Barge at sea (data/barge.ts): the sea bosses picked on the card's At sea side, each made for the fight at
// its own spot round the ring's back, given a home there where it wakes at once and never gives up, and fought from the
// boat with the harpoon. They see the world with the fight always on, while the sea's own hunters, far off, leave the
// boat alone.
const seaBosses = () => SEA_FOES.flatMap(k => seaBoss[k]);
const seaWorld = Object.create(world); seaWorld.started = true;
/** Beaten, at sea: driven off, dying or dead, sinking or sunk, or (the anglerfish, the Cthuluviathan) done for good;
 * and, besides, gone from sight, and no longer minded. The Deep One's 'down' is sunk; Star's is only him thrashing in
 * the water after a dive, the harpoon's chance (until 2026-10-17 it counted as beaten too, and the fight was won the
 * moment he first dived, with him frozen out of sight). */
const SEA_DOWN = ['away', 'dying', 'dead', 'sink'];
const seaSunk = (b) => b.state === 'down' && !(b instanceof MeteorSerpent);
const seaOut = (b) => !!b.done || seaSunk(b) || SEA_DOWN.includes(b.state);
// A beaten Cthuluviathan sleeps on in its sunken city, which stays: it is never gone. The leviathan is, once sunk out of sight.
const seaGone = (b) => b.state === 'dead' || seaSunk(b) || (b.state === 'away' && b.t > 5) || (!!b.done && b.state === 'gone') || b.gone === true;
/** Where one is: the Cthuluviathan is its city, the leviathan where it has risen, or else its head. */
const seaAt = (b) => b.lev ? (b.lev.rise ?? b.lev) : b.x === undefined ? b.lair : b;
/** Each still in the fight, what kind it is, and where the harpoon would strike it now. */
function seaMarks(){ return seaFight ? SEA_FOES.flatMap(k => seaBoss[k].filter(b => !seaGone(b)).map(b => [k, b, b.mark(boat)])) : []; }
let seaSpaceTold = false, seaLevTold = false, seaHideTold = false;
// The Reapers on the kid's islands, the land one, each on his own island, fought on foot (seaReaperOn); and the
// Stars over them, who dive at the figure on the sand (seaStarOn).
let seaReapers = [], seaStars = [];
/** Beaten, one of those: a Reaper down or run off, Star driven away. */
const seaAshoreOut = (f) => f instanceof MeteorSerpent ? f.state === 'away' : BOSS_DOWN.includes(f.state);
const seaBand = {update(dt){ if (!seaFight) return; for (const b of seaBosses()) if (!seaGone(b)){ b.update(dt, seaSight(b)); seaShore(b); }
    // One run off with honey is off his island for good, out of the fight, as on the barge.
    for (const r of seaReapers){ r.update(dt, seaWorld); if (r.state === 'away') r.beatenForGood(); }
    for (const m of seaStars) if (!seaGone(m)) m.update(dt, seaWorld); seaCheck(); },
  // The kid's islands go down over what swims under the water, so a shadow passing under one is hidden by its sand.
  draw(v, layer){ if (!seaFight) return; if (layer === 'surface'){ drawSeaTar(v, seaFight.tar); drawSeaBridgesWater(v, seaFight.bridges); drawSeaIslesFlat(v, seaFight.isles); drawSeaRing(v, SEA_ARENA, seaFight.r); } for (const b of seaBosses()) if (!seaGone(b)) b.draw(v, layer); for (const r of seaReapers) r.draw(v, layer); for (const m of seaStars) if (!seaGone(m)) m.draw(v, layer); },
  radar(blip){ if (seaFight) for (const b of seaBosses()) if (!seaGone(b)) b.radar(blip); }};
/** What a boss that chases the boat sees of it (data/barge.ts seaBlocked): the boat, or, with one of the kid's islands
 * in the way, where it last saw it, still on the water, where it makes for; '?' over it when it loses the boat, '!'
 * when it finds it again. The rest (Star up in the sky, the leviathan, the Deep One and the Cthuluviathan, who feel
 * the boat through the water and do not chase it) are not fooled. */
function seaSight(b){ if (b.seaGhost === undefined) return seaWorld;
  const hid = seaBlocked(b.x, b.y, boat.x, boat.y, seaFight.isles, b.seaHid ? SEA_SEEN : undefined);
  if (hid !== b.seaHid){ b.seaHid = hid;
    if (hid){ b.seaGhost = {x: boat.x, y: boat.y, h: boat.h, v: 0}; b.seaSees.boat = b.seaGhost; addText(b.x, b.y, 70, '?', '#FFF3C4', 26, 1.4);
      if (!seaHideTold){ seaHideTold = true; toast("Hidden behind the island! The bosses that chase you can't see you there.", 3000, 1); } }
    else addText(b.x, b.y, 70, '!', '#FF9A8A', 26, 1); }
  return hid ? b.seaSees : seaWorld; }
/** One that chases the boat, made to lose it behind the islands; and a blow of its, which lands only on a boat it can see. */
function seaHider(b){ b.seaGhost = null; b.seaHid = false; b.seaSees = Object.create(seaWorld); return b; }
const seaSeen = (b, f) => (...a) => { if (!b.seaHid) f(...a); };
/** Within pad of one of a list of lengths (each island, patch of tar or bridge, as a capsule). */
const seaIn = (caps, x, y, pad) => caps.some(c => { const i = capsuleNear(c, x, y); return Math.hypot(x - i.x, y - i.y) < c.r + pad; });
/** On the land of one of the kid's islands in the ring at sea, or a bridge, or within pad of either: what no boat goes through. */
function seaLand(x, y, pad = 0){ return !!seaFight && seaIn(seaFight.solid, x, y, pad); }
/** Where no boss goes: on an island, in the tar, or at a bridge, or within pad of one. */
function seaWall(x, y, pad = 0){ return !!seaFight && seaIn(seaFight.walls, x, y, pad); }
/** A bridge's dock the boat is at, all but stopped, if any: from there the figure can tie up and step onto it. */
const SEA_DOCK_REACH = 70, SEA_DOCK_STOP = 45;
function seaDockNear(){ if (!seaFight || Math.abs(boat.v) > SEA_DOCK_STOP) return null; const k = bk();
  return seaFight.bridges.find(b => { const p = b.dock.berth(k); return Math.hypot(boat.x - p.x, boat.y - p.y) < SEA_DOCK_REACH; })?.dock ?? null; }
/** One of the kid's islands the boat is up against, all but stopped, if any: a way ashore wherever it meets the sand,
 * the boat tied up there bow in, and the figure landing just up the beach where the boat does not hide it (seaIsleWay). */
const SEA_ISLE_NEAR = 40;
function seaIsleNear(){ if (!seaFight || Math.abs(boat.v) > SEA_DOCK_STOP) return null; const k = bk();
  const i = seaFight.isles.find(i => Math.hypot(boat.x - i.x, boat.y - i.y) < i.r + 24*k + SEA_ISLE_NEAR); if (!i) return null;
  const w = seaIsleWay(i, boat); return {x: w.landing.x, y: w.landing.y, r: 0, berth: w.berth, landing: w.landing, isle: i}; }
/** The share of its top speed the boat keeps: in the kid's tar it crawls. */
function seaTarK(){ return seaFight && seaFight.tar.some(t => Math.hypot(boat.x - t.x, boat.y - t.y) < t.r) ? SEA_TAR_SLOW : 1; }
/** The kid's islands block the bosses: one that has come up onto an island's sand is put back in the water at its
 * edge, where it slides round it; so is where it is making for, the gulper's body, and a tentacle coming up. Star flies over them, and the
 * leviathan goes under them and rises clear of them. */
function seaShore(b){ if (!seaFight.walls.length) return;
  const off = (p, pad) => { for (const c of seaFight.walls){ const i = capsuleNear(c, p.x, p.y), dx = p.x - i.x, dy = p.y - i.y, d = Math.hypot(dx, dy), r = c.r + pad;
    if (d < r && d > 0){ p.x = i.x + dx/d*r; p.y = i.y + dy/d*r; } } };
  if (b.tentacles) for (const t of b.tentacles) off(t, 20);
  if (b.lev || b instanceof MeteorSerpent || b.x === undefined) return;
  off(b, 40); if (typeof b.tx === 'number'){ const t = {x: b.tx, y: b.ty}; off(t, 40); b.tx = t.x; b.ty = t.y; }
  // The gulper's long body too, link by link, so it slides round after its head.
  if (Array.isArray(b.body)) for (const p of b.body) off(p, 30); }
/** One of the sea bosses at its spot in the ring, with its blows and sounds, which are its own island's. */
function seaBossAt(kind, at){
  if (kind === 'meteor'){ const m = new MeteorSerpent(seaHaunt(at));
    // Afraid of the Deep One here too: off to space while one is up, and back once they are all beaten.
    m.scaredOf = () => seaBoss.deep.some(d => d.state === 'rise' || d.state === 'fight');
    m.onScared = () => { sfx.meteorDive(); addText(m.x, m.y, m.z + 40, 'Too big! Off to space!', '#FFD27A', 18, 2); };
    m.onSpace = () => { if (seaSpaceTold) return; seaSpaceTold = true; toast("Star saw the Deep One and shot up into space! He'll be back once it's beaten.", 3600, 1); };
    m.onWarn = serpent.onWarn; m.onHit = serpent.onHit; m.onSplash = serpent.onSplash; return m; }
  const ring = {...SEA_ARENA, r: seaFight.r};
  if (kind === 'guard'){ const l = new Leviathan(Math.random, levRing(at, ring, (x, y) => seaWall(x, y, 60)));
    l.onPass = () => { shake = Math.max(shake, .3); sfx.leviathan(); };
    l.onRise = () => { shake = Math.max(shake, .35); sfx.leviathanRise();
      if (!seaLevTold){ seaLevTold = true; toast('The leviathan rises across your way! Turn away from the spines, or harpoon it while it stands.', 3200, 1); } };
    // Running into it costs the boat's health here, never fish: the Battle Barge costs nothing else.
    l.onHit = () => { shake = 1; sfx.whump(); resetNet(); addText(boat.x, boat.y, 44, 'Shoved back', '#FF9A8A', 19, 2); damage(HURT.leviathan, 'leviathan'); };
    return l; }
  if (kind === 'angler'){ const a = seaHider(new Anglerfish(anglerRing(ring), at));
    a.onOpen = () => { sfx.anglerOpen(); shake = Math.max(shake, .25); }; a.onBite = seaSeen(a, angler.onBite); a.onMiss = () => sfx.anglerSnap(); return a; }
  if (kind === 'cthulu'){ const c = new Cthuluviathan(seaCity(at));
    c.onWake = () => { shake = Math.max(shake, .5); sfx.cthuluWake(); }; c.onTentacle = cthulu.onTentacle;
    // A grab here takes no fish: the Battle Barge costs nothing but the boat's health.
    c.onGrab = () => { shake = Math.max(shake, .6); sfx.whump(); addText(boat.x, boat.y, 44, 'Grabbed', '#FF9A8A', 19, 1.8); damage(HURT.tentacle, 'tentacle'); };
    return c; }
  if (kind === 'reaper'){ const r = seaHider(new Reaper(seaWater(at, ring)));
    r.onWarn = reaper.onWarn; r.onSweep = seaSeen(r, reaper.onSweep); r.onRear = reaper.onRear; return r; }
  if (kind === 'gulper'){ const g = seaHider(new Gulper(gulperRing(ring), at));
    g.onHunt = () => sfx.gulperHunt(); g.onBite = seaSeen(g, gulper.onBite); return g; }
  if (kind === 'king'){ const k = seaHider(new SharkKing(seaReef(at, ring)));
    k.onRise = () => { sfx.cthuluWake(); shake = Math.max(shake, .4); };
    k.onWarn = king.onWarn; k.onBite = seaSeen(k, king.onBite); k.onTrident = seaSeen(k, king.onTrident); k.onSplash = king.onSplash;
    k.onBeaten = () => { sfx.cthuluWake(); shake = Math.max(shake, .6); }; return k; }
  const d = new DeepOne(seaDeepHome(at));
  d.onRise = () => { sfx.cthuluWake(); shake = Math.max(shake, .5); };
  d.onWarn = deep.onWarn; d.onGrab = deep.onGrab; d.onSqueeze = deep.onSqueeze; d.onLog = deep.onLog; d.onSplash = deep.onSplash;
  d.onBeaten = () => { sfx.cthuluWake(); shake = Math.max(shake, .6); }; return d; }
/** A Reaper on one of the kid's islands, the land one: asleep across its middle, facing the ring's, he is up the
 * moment the figure comes ashore and fights it there as on island 6 (the fan, the charge, then up on his hind legs
 * for the spear). Back aboard, he lies down again, whole. Beaten, he goes off into the sea, out of the fight. */
function seaReaperOn(i){ const a = Math.atan2(i.y - SEA_ARENA.y, i.x - SEA_ARENA.x), at = {x: i.x + Math.cos(a)*i.r*.2, y: i.y + Math.sin(a)*i.r*.2};
  const b = new LandReaper(deckLair(i, at, seaIslePalms(i)));
  b.onWake = () => { sfx.reaperRoar(); shake = Math.max(shake, .5); }; b.onWarn = (what) => what === 'sweep' ? sfx.reaperSwing() : sfx.jaws();
  b.onHit = (by) => bonked(by); b.onBlow = landReaper.onBlow; b.onRear = () => { sfx.reaperRoar(); shake = Math.max(shake, .25); };
  b.onHurt = () => sfx.spearHit(); b.onBeaten = () => { burst(b); seaDown(b); }; b.isle = i; return b; }
/** Star over one of the kid's islands: looping high over it, he hunts the figure the moment it comes ashore, as he
 * hunts a boat (the ring where it will be, on the sand, then the dive), and while he is down on the sand after, the
 * spear reaches him (data/harpoon.ts RESOLVE). A dive that lands on the figure is his hardest hit ashore. Back aboard,
 * he is up on his loop again, whole. Driven off, he flies away, out of the fight. Afraid of the Deep One here too. */
const STAR_ASHORE_HIT = 2;
function seaStarOn(i){ const m = isleStar(i); m.isle = i;
  m.scaredOf = () => seaBoss.deep.some(d => d.state === 'rise' || d.state === 'fight');
  m.onScared = () => { sfx.meteorDive(); addText(m.x, m.y, m.z + 40, 'Too big! Off to space!', '#FFD27A', 18, 2); };
  m.onSpace = () => { if (seaSpaceTold) return; seaSpaceTold = true; toast("Star saw the Deep One and shot up into space! He'll be back once it's beaten.", 3600, 1); };
  m.onWarn = () => sfx.meteorDive(); m.onHit = () => bonked('meteor', STAR_ASHORE_HIT);
  m.onSplash = (x, y) => { sfx.whump(); shake = Math.max(shake, .35);
    for (let k = 0; k < 14; k++){ const a = Math.random()*Math.PI*2, sp = 40 + Math.random()*90; sparks.push({x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, z: 2, vz: 40 + Math.random()*70, age: 0, life: .5 + Math.random()*.3, c: '#F2D9A0'}); } };
  return m; }
/** A spear in Star, down on the sand: a hit while he is down counts, and the last drives him off. */
function seaStarHit(m, power){ const counted = !!m.mark(); if (m.harpoon(power)) seaDown(m); return counted; }
/** What the camera keeps in frame at sea, from the boat: the boat, its net behind, and each boss still in the fight
 * within SEA_LOOK, how far round it reaches and how tall it stands (Star where it flies). */
const SEA_FRAME = {meteor: [120, 40], king: [110, 80], deep: [170, 110], reaper: [150, 90], gulper: [150, 30], angler: [140, 20], cthulu: [200, 80], guard: [260, 60]};
function seaFramePoints(){ const k = bk(), pts = [{dx: 0, dy: 0, r: 110*k, tall: 50*k}];
  // The leviathan only once it has risen: crawling round, it is a shadow under the water.
  for (const [kind, b] of seaMarks()){ if (b.afraid || seaOut(b) || b.state === 'gone' || b.state === 'asleep' || (kind === 'guard' && !b.lev.rise)) continue;
    const p = seaAt(b), dx = p.x - boat.x, dy = p.y - boat.y; if (Math.hypot(dx, dy) > SEA_LOOK) continue;
    const [r, tall] = SEA_FRAME[kind]; pts.push({dx, dy, z: kind === 'meteor' ? b.z : 0, r, tall}); }
  return pts; }
/** Harpooned down: Down!, and won once every one of them is. */
function seaDown(b){ const p = seaAt(b); sfx.spearHit(); shake = Math.max(shake, .5); addText(p.x, p.y, 50, 'Down!', '#D8FFE0', 20, 1.4); seaCheck(); }
function seaCheck(){ if (!seaFight || seaWon || seaBosses().some(b => !seaOut(b)) || [...seaReapers, ...seaStars].some(f => !seaAshoreOut(f))) return;
  seaWon = true; bargeWins++; coins += BARGE_PRIZE; earned += BARGE_PRIZE; hp = HP_MAX; hudHull(); sfx.tierUp(); shake = Math.max(shake, .6);
  addText(boat.x, boat.y, 60, '+' + BARGE_PRIZE, C.coin, 24, 2.2); toasts.clear();
  toast(`You beat them all! +${BARGE_PRIZE} coin. Leave the Battle Barge, or tap the crossed swords for another fight.`, 4200, 2); hud(); refreshShop(); save(); }
bargeGorillas.onWarn = () => { if (T > hootAt){ hootAt = T + .5; sfx.hoot(); } };
bargeGorillas.onWindup = () => sfx.gorillaRoar();
bargeGorillas.onSlam = () => { sfx.whump(); shake = Math.max(shake, .45); };
bargeGorillas.onHit = (n) => bonked('slam', n);
bargeGorillas.onBeaten = (g) => bargeDown(g.x, g.y);
bargeGators.onBite = (n) => bonked('bite', n);
bargeGators.onGape = () => sfx.hiss();
bargeGators.onSnap = () => sfx.anglerSnap();
bargeGators.onBeaten = (g) => bargeDown(g.x, g.y);
bargeLancers.onHit = (n) => bonked('lance', n);
bargeLancers.onWindup = () => sfx.spearThrow();
bargeLancers.onBeaten = (l) => bargeDown(l.x, l.y);
const FIGHTER_SPECS = {swordsman: SWORDSMAN, red: RED, blue: BLUE, green: GREEN};
/** One of island 3's fighters on the barge, its blows, its block, and the monkeys the blue and the green call up. */
function bargeFighter(kind, room, at){ const f = new Fighter(FIGHTER_SPECS[kind], ROOMS[room], at), imps = bargeCamps[room].imps;
  f.onHit = (by) => bonked(by); f.onWindup = () => sfx.spearThrow();
  f.onBlock = () => { sfx.clang(); addText(f.x, f.y, 40, 'Blocked!', '#FFE9A8', 20, 1.2); };
  if (f.spec.summon > 0) f.onSummon = (x, y) => { sfx.spearThrow(); addText(x, y, 40, 'Monkeys!', '#FFB0A0', 18, 1.1);
    return [imps.summon(x + 14, y + 10), imps.summon(x - 14, y + 10, kind === 'green')]; };
  f.onBeaten = () => bargeDown(f.x, f.y);
  return f; }
/** One of the bosses on the barge, at this spot in the arena, with its blows, its sounds, and Down! when it is beaten. */
function bargeBossAt(kind, room, at){ const R = ROOMS[room];
  if (kind === 'sorcerer'){ const b = new Sorcerer(R); b.field = R.r + 80; b.a0 = Math.atan2(at.y - R.y, at.x - R.x); b.reset();
    b.onHit = (by) => bonked(by); b.onCast = () => sfx.tentacle(); b.onBeaten = () => bargeDown(b.x, b.y); return b; }
  if (kind === 'forgotten'){ const b = new Forgotten(R, at);
    b.onHit = (by) => bonked(by); b.onWindup = () => sfx.spearThrow(); b.onSkulls = () => sfx.spearThrow(); b.onAim = () => sfx.zap();
    b.onBeaten = (x, y) => { burst({x, y}); bargeDown(x, y); }; return b; }
  if (kind === 'heron'){ const b = new Heron(R, HERON_HP, at);
    b.onHit = (by) => bonked(by); b.onZap = () => sfx.zap(); b.onCast = () => sfx.portal(); b.onPop = heron.onPop;
    b.onBeaten = () => bargeDown(b.x, b.y); return b; }
  if (kind === 'spider'){
    // His web strung across the deck between two posts, square to the way in, and he comes down out of it at once.
    const a = Math.atan2(at.y - R.y, at.x - R.x), ox = -Math.sin(a)*26, oy = Math.cos(a)*26;
    const web = webBetween([at.x + ox, at.y + oy], [at.x - ox, at.y - oy]), b = new Spider10(web, Infinity, Infinity);
    b.onDrop = () => sfx.skitter(); b.onGrab = () => bonked('web'); b.onSprayed = () => sfx.shriek();
    b.onHang = () => { if (walker.state !== 'ashore') return; webT = WEB_HOLD; webAt = {x: web.x, y: web.y, web}; };
    b.onBeaten = () => bargeDown(b.x, b.y); return b; }
  if (kind === 'anchorer'){ const b = new Anchorer(seaMoat(R, at));
    b.onWake = () => { sfx.cthuluWake(); shake = Math.max(shake, .5); }; b.onHit = (by) => bonked(by); b.onWindup = () => sfx.tentacle(); b.onThud = anchorer.onThud;
    b.onSwing = () => { sfx.whump(); if (warlock.shown && Math.hypot(warlock.x - b.x, warlock.y - b.y) < SWEEP_R + 6) warlock.hurt(); };
    b.onBeaten = () => { burst(b); bargeDown(b.x, b.y); }; return b; }
  if (kind === 'reaper'){ const b = new LandReaper(deckLair(R, at));
    b.onWake = () => { sfx.reaperRoar(); shake = Math.max(shake, .5); }; b.onWarn = (what) => what === 'sweep' ? sfx.reaperSwing() : sfx.jaws();
    b.onHit = (by) => bonked(by); b.onBlow = landReaper.onBlow; b.onRear = () => { sfx.reaperRoar(); shake = Math.max(shake, .25); };
    b.onHurt = () => sfx.spearHit(); b.onBeaten = () => bargeDown(b.x, b.y); return b; }
  if (kind === 'cthulhu'){ const b = new Cthulhu(R, at);
    b.onBonk = (by) => bonked(by); b.onRipple = () => sfx.tentacle(); b.onSink = () => sfx.spearHit();
    b.onBeaten = () => { burst(b); bargeDown(b.x, b.y); }; return b; }
  if (kind === 'oldone'){
    // Out of the sea just off the deck's back, toward where his spot was, and his creatures climb aboard.
    const a = Math.atan2(at.y - R.y, at.x - R.x), b = new OldOne({x: R.x + Math.cos(a)*(R.r + 34), y: R.y + Math.sin(a)*(R.r + 34), r: POOL.r});
    const h = hordes[room], deck = R.r - 26;
    b.standing = () => h.list.filter(u => Horde.up(u) || u.state === 'rise').length;
    b.onSummon = (ps) => { sfx.tentacle(); for (const p of ps){ const d = Math.hypot(p.x - R.x, p.y - R.y), k = d > deck ? deck / d : 1; h.raise(R.x + (p.x - R.x)*k, R.y + (p.y - R.y)*k, 'lagoon'); } };
    b.onSlamWarn = () => sfx.spearThrow(); b.onHit = () => { sfx.whump(); shake = Math.max(shake, .5); bonked('slam'); };
    b.onBeaten = () => { sfx.cthuluWake(); shake = Math.max(shake, .6); bargeDown(b.x, b.y); };
    b.rise(); sfx.cthuluWake(); return b; }
  const b = new Pelican(R, at);
  b.onSpit = () => sfx.spit(); b.onLock = () => sfx.reaperSwing(); b.onDive = (caught) => { sfx.whump(); shake = Math.max(shake, caught ? .5 : .3); };
  b.onHit = (n, by) => bonked(by === 'scoop' ? 'gulp' : 'fish', n); b.onBeaten = () => bargeDown(b.x, b.y); return b; }
/** All the barge's own off it, between fights. */
function clearBand(){ bargeGorillas.place([]); bargeGators.place([]); bargeLancers.place([], {x: 0, y: 0}); bargeFighters = [];
  for (const k of BOSS_FOES) bargeBoss[k] = []; }
// The Forgotten One again, the kid's: in the crypt behind the ruins' skull door, laughing, with fewer hit points (9)
// and a harder hand (4 hearts a blow). Beaten, he yields on his knees, still alive; with his crypt clear, it is won,
// and he stays kneeling there after.
const CRYPT_FG_HP = 9, CRYPT_FG_HIT = 4, CRYPT_PRIZE = 6000;
const forgotten2 = new Forgotten(ROOMS[CRYPT], CRYPT_FORGOTTEN, CRYPT_FG_HP);
forgotten2.yields = true;
forgotten2.onHit = (by) => bonked(by, CRYPT_FG_HIT);
forgotten2.onWindup = () => sfx.spearThrow(); forgotten2.onSkulls = () => sfx.spearThrow(); forgotten2.onAim = () => sfx.zap();
forgotten2.onBeaten = (x, y) => { addText(x, y, 60, 'Enough!', '#FFE9A8', 22, 1.8); sfx.cthuluWake(); shake = Math.max(shake, .5);
  if (hordes[CRYPT].cleared){ cryptCheck(); return; } toasts.clear();
  toast('He sinks to his knees and lowers his sword. He is still alive! Now the rest of them.', 3200, 2); };
/** Won once both are done, whichever is last: he has yielded and his crypt is clear. */
function cryptCheck(){ if (cryptWon || floor !== CRYPT || forgotten2.state !== 'yield' || !hordes[CRYPT].cleared) return;
  cryptWon = true; hearts = maxHearts(); hudHearts(); allies.clear();
  coins += CRYPT_PRIZE; earned += CRYPT_PRIZE; sfx.tierUp(); shake = 1;
  addText(forgotten2.x, forgotten2.y, 70, '+' + CRYPT_PRIZE, C.coin, 26, 2.6); toasts.clear();
  toast(`You beat the Forgotten One again! He kneels, still alive. "You beat me," he says. "Fair and square. I have something to show you." Go to him. +${CRYPT_PRIZE} coins.`, 6400, 2);
  hud(); refreshShop(); save(); }
/** Through the skull door into the crypt: the fight, or, won already, quiet, with him kneeling where he was beaten; or,
 *  after his ending, empty. */
function intoCrypt(){ sfx.portal(); shake = Math.max(shake, .3);
  if (!cryptWon) return;
  for (const u of hordes[CRYPT].list) u.state = 'gone'; hordes[CRYPT].cleared = true; toasts.clear();
  if (castleHQ){ forgotten2.beaten(); toast('The crypt is quiet, and empty now.', 3000, 2); return; }
  forgotten2.kneel(); toast('The crypt is quiet. The Forgotten One kneels where you beat him, waiting: he has something to show you. Go to him.', 4200, 2); }
let skullToldT = 0;
// The warlock's merlocks, and the ghost and skeleton the bones raise: allies called up to fight beside the figure.
const allies = new Allies();
allies.findTarget = (x, y, r) => warlock.findTarget(x, y, r);
allies.onHit = () => sfx.spearHit();
allies.onHurt = (a, out) => addText(a.x, a.y, 30, out ? (a.kind === 'merlock' ? 'Splash!' : 'Crumble!') : a.kind === 'hamster' ? 'Squeak!' : 'Ow!', '#B8F0E0', 16, 1.1);
let throneToldT = 0, merlockT = 0, merlocksTold = false;
// Won once only: after it his throne room is empty.
function castleWon(){ if (forgotten.state !== 'gone' || towerWon) return;
  isle7Stage = 2; towerWon = true; hearts = maxHearts(); hudHearts(); allies.clear();
  coins += FORGOTTEN_PRIZE; earned += FORGOTTEN_PRIZE; sfx.tierUp(); shake = 1;
  addText(SEAT.x, SEAT.y, 60, '+' + FORGOTTEN_PRIZE, C.coin, 26, 2.6); toasts.clear();
  toast(`You beat the Forgotten One, and his bones are on your side now! And behind his empty throne, a locked door: walk his bones to it. +${FORGOTTEN_PRIZE} coins.`, 6400, 2);
  hud(); refreshShop(); save(); }
function intoCastle(){ resetTowers(); towerWon = false; tower = CASTLE; toRoom(GATE); sfx.portal(); shake = Math.max(shake, .4); toasts.clear();
  // Once he is beaten, his throne room stays empty; and once it is yours, all of it.
  if (isle7Stage >= 2){ forgotten.beaten(); for (const u of hordes[THRONE].list) u.state = 'gone'; hordes[THRONE].cleared = true; }
  if (castleHQ){ quietCastle(); toast('Through the portal: Gigantis, your headquarters! Your flag flies over the courtyard, and the halls are quiet.', 4200, 2); return; }
  toast('Through the portal: Gigantis, a castle standing on the sea under a green sky. The dead walk here.', 4200, 2); }
/** Nobody in the castle to fight: it is yours. */
function quietCastle(){ forgotten.beaten(); for (const r of CASTLE_ROOMS){ for (const u of hordes[r].list) u.state = 'gone'; hordes[r].cleared = true; } }
/** Through island 11's old portal: out in the Old One's ruins on Gigantis. */
function intoOldPlace(){ resetTowers(); towerWon = false; tower = OLDPLACE; toRoom(RUINS); sfx.portal(); shake = Math.max(shake, .4); }
function updateCastle(dt){ throneToldT -= dt;
  if (!inGigantis() || floor !== THRONE) return;
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
// The Old One, the kid's, under the black pool in the ruins: "you see the old one rise, he wants you dead. Cutscene:
// your skeleton charges at him, he knocks him away and roars at you. You get soul armour, heals you when you hit an
// enemy. Boss level: now he summons 5 creatures from the black lagoon, all 2 hp and 1 damage." Beaten (isle7Stage 4),
// he stays gone and the pool still. Soul armour is kept (the save's soulArmour): every third enemy hit gives a heart.
const OLD_PRIZE = 8000, SOUL_EVERY = 3, CLOSE_FOE = 80;
const oldOne = new OldOne(POOL);
let oldScene = null, oldWinT = 0, bonesRun = null, soulN = 0;
oldOne.standing = () => hordes[RUINS].list.filter(u => Horde.up(u) || u.state === 'rise').length;
oldOne.onSummon = (at) => { sfx.tentacle(); for (const p of at) hordes[RUINS].raise(p.x, p.y, 'lagoon'); };
oldOne.onSlamWarn = () => sfx.spearThrow();
oldOne.onHit = () => { sfx.whump(); shake = Math.max(shake, .5); bonked('slam'); };
oldOne.onBeaten = () => { sfx.cthuluWake(); shake = 1; oldWinT = OLD_SINK + .3;
  for (const u of hordes[RUINS].list) if (u.state !== 'gone' && u.state !== 'fall'){ u.state = 'fall'; u.t = 0; }
  toasts.clear(); toast('He is going down! The Old One sinks back into the black pool, and his creatures with him.', 3200, 2); };
function oldWin(){ if (isle7Stage !== 3) return; isle7Stage = 4; hearts = maxHearts(); hudHearts();
  coins += OLD_PRIZE; earned += OLD_PRIZE; sfx.tierUp(); shake = 1; addText(POOL.x, POOL.y, 80, '+' + OLD_PRIZE, C.coin, 26, 2.6); toasts.clear();
  toast(`You beat the Old One! The black pool is still. +${OLD_PRIZE} coins. Your skeleton will be back at the next landing.`, 6400, 2);
  hud(); refreshShop(); save(); }
// Soul armour: every third enemy the spear hits gives a heart back.
function soulHit(){ if (!soulArmour) return; soulN++;
  if (soulN >= SOUL_EVERY){ soulN = 0; if (hearts < maxHearts()){ hearts++; sfx.turtle(); addText(walker.x, walker.y, 34, '+1', '#A8F0FF', 18, 1.2);
    for (let i=0;i<8;i++) sparks.push({x: walker.x, y: walker.y, vx:(Math.random()-.5)*60, vy:(Math.random()-.5)*60, z:20, vz:30+Math.random()*30, age:0, life:.7, c:'#BFF6FF'}); } }
  hudHearts(); }
// The scene as he rises, the first time the full one; after, he just rises and the fight is on. Owed to a game the
// tester skipped past him, it plays in full and ends with him sinking back, beaten long ago, instead of the fight.
function oldSteps(owed = false){ const bones = bonesPal.shown, end = owed ? oldSinkBack : oldFight;
  if (soulArmour && !owed) return [[0, () => { oldOne.boil = 1; toast('The black pool is boiling...', 1600, 2); }],
    [1.2, () => { oldOne.rise(); sfx.cthuluWake(); shake = Math.max(shake, .6); toasts.clear(); toast('The Old One rises again. He wants you dead!', 2400, 2); }],
    [3.6, () => { oldOne.roar(); sfx.cthuluWake(); shake = 1; }], [4.6, oldFight]];
  return [[0, () => { oldOne.boil = 1; toast('Ruins behind the throne, round a black pool. Lancers stand guard. And the black pool is boiling...', 2600, 2); }],
    [2.4, () => { oldOne.rise(); sfx.cthuluWake(); shake = Math.max(shake, .6); toasts.clear(); toast('The Old One rises out of the black pool. He wants you dead!', 2600, 2); }],
    ...(bones ? [[5, () => { bonesRun = {x0: bonesPal.x, y0: bonesPal.y, t: 0}; toasts.clear(); toast('Your skeleton charges at him!', 1400, 2); }],
      [5.9, () => { bonesRun = null; burst({x: bonesPal.x, y: bonesPal.y}); addText(bonesPal.x, bonesPal.y, 40, 'Smash!', '#FFE9A8', 22, 1.4); bonesPal.knockOut(); sfx.whump(); shake = 1;
        toasts.clear(); toast('He knocks it flying!', 1400, 2); }]] : []),
    [bones ? 7 : 5, () => { oldOne.roar(); sfx.cthuluWake(); shake = 1; toasts.clear(); toast('He roars at you.', 1400, 2); }],
    [bones ? 8.4 : 6.4, () => { soulArmour = true; save(); hudHearts(); sfx.tierUp();
      for (let i=0;i<24;i++) sparks.push({x: walker.x, y: walker.y, vx:(Math.random()-.5)*90, vy:(Math.random()-.5)*90, z:10, vz:40+Math.random()*50, age:0, life:1.2, c:'#BFF6FF'});
      toasts.clear(); toast(bones ? 'Your skeleton\'s soul stays with you, as armour: soul armour! It heals you as you hit. Every third hit gives a heart back.' : 'A pale light rises from the ruins and wraps round you: soul armour! It heals you as you hit. Every third hit gives a heart back.', 4600, 2); }],
    [bones ? 11.4 : 9.4, end]]; }
function oldSinkBack(){ oldScene = null; oldOne.boil = 0; oldOne.sink(); sfx.cthuluWake(); shake = Math.max(shake, .5); toasts.clear();
  toast('And down he sinks again: you beat the Old One long ago. The black pool goes still.', 3600, 2); }
function oldFight(){ oldScene = null; oldOne.boil = 0; oldOne.fight(); toasts.clear();
  toast('He calls lagoon creatures out of the water, five at a time. Keep off the pool\'s edge, or his hand comes down!', 3600, 2); }
function updateRuins(dt){ if (!inGigantis() || floor !== RUINS) return;
  // The skull door: without its key, what it is and where the key lies, now and then.
  skullToldT -= dt;
  if (!skullKey && isle7Stage >= 4 && skullToldT <= 0 && Math.hypot(walker.x - SKULL_DOOR.x, walker.y - SKULL_DOOR.y) <= SKULL_REACH){ skullToldT = 20; toasts.clear();
    toast('A door of old stone, a skull carved over it, and a keyhole shaped like a skull. Locked. Its key lies at the bottom of a black lagoon, far away.', 4600, 2); }
  if (oldScene){ oldScene.t += dt; const st = oldScene.steps;
    while (oldScene && oldScene.i < st.length && oldScene.t >= st[oldScene.i][0]){ const f = st[oldScene.i][1]; oldScene.i++; f(); } }
  // The skeleton's charge, at the pool's edge.
  if (bonesRun && bonesPal.shown){ bonesRun.t += dt; const k = Math.min(1, bonesRun.t / .8), a = Math.atan2(bonesRun.y0 - POOL.y, bonesRun.x0 - POOL.x);
    const ex = POOL.x + Math.cos(a) * (POOL.r + 8), ey = POOL.y + Math.sin(a) * (POOL.r + 8);
    bonesPal.x = bonesRun.x0 + (ex - bonesRun.x0) * k; bonesPal.y = bonesRun.y0 + (ey - bonesRun.y0) * k; bonesPal.h = a + Math.PI; }
  oldOne.update(dt, world);
  if (oldWinT > 0){ oldWinT -= dt; if (oldWinT <= 0) oldWin(); } }
// Into the ruins behind the throne: the lancers back at their posts, quiet; and the Old One rising, or gone.
function intoRuins(){ lancers.reset(); toasts.clear();
  if (isle7Stage >= 4 && oldOwed && !castleHQ){ oldOwed = false; save(); oldOne.reset(); oldScene = {t: 0, i: 0, steps: oldSteps(true)}; return; }
  if (isle7Stage >= 4){ oldOne.beaten();
    toast((tower === OLDPLACE ? 'Through the old portal, and out in the Old One\'s ruins on Gigantis! ' : 'The ruins are quiet now, and the black pool is still. ')
      + (castleHQ ? 'The Old One is gone for good.' : cryptWon ? 'The lancers stand guard.' : 'And at the back, a door with a skull carved over it.'), 4400, 2); return; }
  oldOne.reset(); oldScene = {t: 0, i: 0, steps: oldSteps()}; }
// The Forgotten One's ending, the kid's: beaten in his crypt, he gets up and shows you round his castle, walking with
// you, and gives it you, Gigantis your headquarters, and his portable scanner; and walking you back through the ruins,
// as the Old One rises out of his pool to kill you, he runs at him and bursts into bones, blowing him apart into black
// water. Once (the save's castleHQ), as a cutscene: the bars come down, the words are in them, and the figure walks with
// him by itself.
const FG_TALK = 50, FG_RUSH = 170, FG_END = 38.5;
let fgScene = null, fgFlash = 0;
const fgBits = [];
// The courtyard's flagpole, once it is yours.
const HQ_POLE = {x: ROOMS[GATE].x - 70, y: ROOMS[GATE].y + 10};
function startFgScene(){ fgScene = {t: 0, i: 0, steps: fgSteps(), cap: '', follow: false, flag: -1}; toasts.clear(); document.body.classList.add('cine');
  quietCastle(); allies.clear(); }
// Into the next room with him: the figure at its way in, him beside it, and off he walks to show it.
function fgCut(room, goal){ toRoom(room); const e = entry(room); forgotten2.x = e.x - 20; forgotten2.y = e.y + 20; forgotten2.guide(goal.x, goal.y); fgScene.follow = true; }
function fgFace(){ forgotten2.guide(forgotten2.x, forgotten2.y); forgotten2.h = Math.atan2(walker.y - forgotten2.y, walker.x - forgotten2.x); }
function fgSay(c){ if (fgScene) fgScene.cap = c; }
function fgSteps(){ const say = fgSay, mid = (r) => ({x: ROOMS[r].x, y: ROOMS[r].y});
  const stop = {x: POOL.x + POOL.r + 40, y: POOL.y}, edge = {x: POOL.x + POOL.r - 6, y: POOL.y};
  return [[0, () => { fgFace(); sfx.cthuluWake(); say('"Come," says the Forgotten One, getting up. "I will show you my castle."'); }],
    [1.4, () => { const e = entry(CRYPT); forgotten2.guide(e.x, e.y); fgScene.follow = true; }],
    [4, () => { fgCut(THRONE, FORGOTTEN_START); say('"My throne. I sat on it so long that the world forgot me."'); }],
    [9, () => { fgCut(HALL_B, mid(HALL_B)); say('"My halls. The dead walked them for me. Not any more."'); }],
    [12.5, () => { fgCut(GATE, mid(GATE)); say('"My courtyard, under the green sky, and my gate."'); }],
    [15.4, () => { fgFace(); fgScene.flag = T; sfx.tierUp(); shake = Math.max(shake, .4);
      for (let i=0;i<20;i++) sparks.push({x: HQ_POLE.x, y: HQ_POLE.y, vx:(Math.random()-.5)*80, vy:(Math.random()-.5)*80, z:60, vz:20+Math.random()*50, age:0, life:1.2, c: C.coin});
      say('"It is all yours now. Gigantis is your headquarters!"'); }],
    [18.8, () => { sfx.zap(); for (let i=0;i<20;i++) sparks.push({x: walker.x, y: walker.y, vx:(Math.random()-.5)*70, vy:(Math.random()-.5)*70, z:16, vz:30+Math.random()*40, age:0, life:1, c: '#7FE0FF'});
      say('He gives you his portable scanner. "Point it at a creature, and it tells you its secrets."'); }],
    [22.4, () => say('"Come. I will walk you back through the ruins."')],
    [24, () => { lancers.reset(); oldOne.reset(); fgCut(RUINS, stop); say('The ruins are quiet...'); }],
    [26.6, () => { fgFace(); forgotten2.h = Math.atan2(POOL.y - forgotten2.y, POOL.x - forgotten2.x); oldOne.boil = 1; say('"Wait." The black pool is boiling...'); }],
    [28.2, () => { oldOne.rise(); sfx.cthuluWake(); shake = Math.max(shake, .6); say('The Old One rises out of the black pool. He wants you dead!'); }],
    [30.6, () => { oldOne.roar(); sfx.cthuluWake(); shake = 1; say('He roars at you...'); }],
    [31.8, () => { fgScene.follow = false; forgotten2.guide(edge.x, edge.y, FG_RUSH); sfx.spearThrow(); say('"Not this one!" The Forgotten One runs at him.'); }],
    [32.6, fgBurst],
    [35.4, () => { oldOne.boil = 0; say('He gave everything to save you. The Old One is gone for good.'); }],
    [FG_END, endFgScene]]; }
// He bursts into bones, his skull with them, and the Old One is blown apart into black water.
function fgBurst(){ const g = forgotten2; sfx.whump(); sfx.cthuluWake(); shake = 1; fgFlash = 1;
  for (let i=0;i<16;i++){ const a = Math.random()*Math.PI*2, v = 60 + Math.random()*110;
    fgBits.push({x: g.x, y: g.y, z: 24, vx: Math.cos(a)*v, vy: Math.sin(a)*v, vz: 90 + Math.random()*120, spin: Math.random()*6, vs: (Math.random()-.5)*16, age: 0, life: 5.4, bone: i > 0, skull: i === 0, len: 3 + Math.random()*2.5}); }
  for (let i=0;i<70;i++){ const a = Math.random()*Math.PI*2, r = Math.random()*POOL.r*.8, v = 20 + Math.random()*60;
    fgBits.push({x: POOL.x + Math.cos(a)*r, y: POOL.y + Math.sin(a)*r, z: 10 + Math.random()*40, vx: Math.cos(a)*v, vy: Math.sin(a)*v, vz: 120 + Math.random()*240, age: 0, life: 2.2, r: 2 + Math.random()*3, c: i % 3 ? '#0D1414' : '#26393A'}); }
  g.beaten(); oldOne.beaten(); oldOne.boil = 1;
  fgSay('He bursts into bones, and blows the Old One apart into black water!'); }
function endFgScene(){ fgScene = null; fgBits.length = 0; document.body.classList.remove('cine');
  castleHQ = true; scanner = Math.max(scanner, 1); oldOwed = false; sfx.tierUp(); toasts.clear();
  toast('Gigantis is your headquarters now, and the portable scanner is yours. The Forgotten One saved your life.', 5200, 2);
  hud(); refreshShop(); save(); }
function updateFgScene(dt){ fgFlash = Math.max(0, fgFlash - dt*1.4);
  for (let i = fgBits.length - 1; i >= 0; i--){ const b = fgBits[i]; b.age += dt; if (b.age >= b.life){ fgBits.splice(i, 1); continue; }
    if (b.z > 0 || b.vz > 0){ b.vz -= 340*dt; b.z += b.vz*dt; b.x += b.vx*dt; b.y += b.vy*dt; if (b.bone || b.skull) b.spin += b.vs*dt; }
    if (b.z <= 0 && b.vz <= 0){ b.z = 0; b.vz = 0; if (!b.bone && !b.skull){ fgBits.splice(i, 1); continue; } const f = Math.max(0, 1 - dt*6); b.vx *= f; b.vy *= f; b.x += b.vx*dt; b.y += b.vy*dt; } }
  if (!fgScene) return; fgScene.t += dt; const st = fgScene.steps;
  while (fgScene && fgScene.i < st.length && fgScene.t >= st[fgScene.i][0]){ const f = st[fgScene.i][1]; fgScene.i++; f(); } }
// Walking with him while he walks: a step behind and to his side, at his pace.
function fgFollow(){ const g = forgotten2; if (!fgScene.follow || g.state !== 'guide' || !g.moving) return [0, 0];
  const c = Math.cos(g.h), sn = Math.sin(g.h), tx = g.x - c*26 - sn*18, ty = g.y - sn*26 + c*18, dx = tx - walker.x, dy = ty - walker.y, d = Math.hypot(dx, dy);
  if (d < 8) return [0, 0];
  // The stick's screen vector for that way on the ground, pushed less the nearer it is.
  const sx = dx - dy, sy = (dx + dy)/2, n = Math.hypot(sx, sy) || 1, push = WALK_FULL * Math.min(1, d/40);
  return [sx/n*push, sy/n*push]; }
// The bones and the black water, in the air and lying on the floor, fading.
function drawFgBits(){ for (const b of fgBits){ ctx.globalAlpha = clamp(b.life - b.age, 0, 1); const x = px(b.x, b.y), y = py(b.x, b.y, b.z);
    if (b.skull){ ctx.fillStyle = '#EDE5D2'; ctx.beginPath(); ctx.arc(x, y - 2*Z, 3.6*Z, 0, Math.PI*2); ctx.fill(); ctx.fillRect(x - 2*Z, y, 4*Z, 2.6*Z);
      ctx.fillStyle = '#2A2226'; for (const e of [-1, 1]){ ctx.beginPath(); ctx.arc(x + e*1.4*Z, y - 2.2*Z, .9*Z, 0, Math.PI*2); ctx.fill(); } }
    else if (b.bone){ const c = Math.cos(b.spin)*b.len*Z, sn = Math.sin(b.spin)*b.len*Z; ctx.strokeStyle = '#EDE5D2'; ctx.fillStyle = '#EDE5D2'; ctx.lineWidth = 1.8*Z; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - c, y - sn); ctx.lineTo(x + c, y + sn); ctx.stroke();
      for (const e of [-1, 1]){ ctx.beginPath(); ctx.arc(x + e*c, y + e*sn, 1.4*Z, 0, Math.PI*2); ctx.fill(); } }
    else { ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(x, y, b.r*Z, 0, Math.PI*2); ctx.fill(); } }
  ctx.globalAlpha = 1; }
// Your flag over the courtyard, once Gigantis is yours; run up its pole as he gives it you.
// The observatory at your headquarters (data/observatory.ts): a brass telescope on a stone step in the courtyard. Look
// through it and it turns to each leviathan in turn, live, wherever it is in the sea; the game goes on round it.
const HQ_SCOPE = {x: ROOMS[GATE].x + SCOPE_AT.dx, y: ROOMS[GATE].y + SCOPE_AT.dy};
function drawTelescope(){ const x = HQ_SCOPE.x, y = HQ_SCOPE.y, sx = px(x, y), sy = py(x, y, 0), top = py(x, y, 24);
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1*Z, 15*Z, 6.5*Z, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#8A9488'; ctx.beginPath(); ctx.ellipse(sx, sy - 1*Z, 13*Z, 5.6*Z, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#A3AC9F'; ctx.beginPath(); ctx.ellipse(sx, sy - 3*Z, 13*Z, 5.6*Z, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#5A3A22'; ctx.lineWidth = 2.2*Z; ctx.lineCap = 'round';
  for (const [dx, dy] of [[-8, 1], [8, 1], [0, 4]]){ ctx.beginPath(); ctx.moveTo(sx + dx*Z, sy - 3*Z + dy*Z); ctx.lineTo(sx, top); ctx.stroke(); }
  ctx.save(); ctx.translate(sx, top); ctx.rotate(-.55);
  ctx.fillStyle = '#B88E36'; ctx.fillRect(-15*Z, -3.4*Z, 30*Z, 6.8*Z); ctx.fillStyle = '#E8C66A'; ctx.fillRect(-15*Z, -3.4*Z, 30*Z, 2.2*Z);
  ctx.fillStyle = '#7A5A1A'; ctx.fillRect(11*Z, -4.6*Z, 6*Z, 9.2*Z); ctx.fillRect(-17*Z, -2.4*Z, 3*Z, 4.8*Z);
  ctx.fillStyle = 'rgba(190,240,255,.85)'; ctx.beginPath(); ctx.ellipse(17*Z, 0, 1.2*Z, 4*Z, 0, 0, Math.PI*2); ctx.fill(); ctx.restore(); }
// Your bed at your headquarters, the kid's ("sleeping there"): a four-poster in the castle's first hall, at its back,
// the blanket in your boat's paint. Sleep till morning, as in the igloo, and wake with every heart back.
const HQ_BED = {x: ROOMS[HALL_A].x + 52, y: ROOMS[HALL_A].y - 58}, BED_REACH = 46;
function drawHQBed(){ const x = HQ_BED.x, y = HQ_BED.y, P = PAINTS[paint];
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(px(x, y), py(x, y, 0), 34*Z, 16*Z, 0, 0, Math.PI*2); ctx.fill();
  for (const [dx, dy] of [[-24, -14], [-24, 13], [21, -14], [21, 13]]) box(x + dx, y + dy, 3, 3, 0, dx < 0 ? 42 : 30, '#4A2E18', '#6A4426');
  box(x - 22, y - 12, 44, 26, 0, 8, '#5A3A22', '#7A5230');
  box(x - 20, y - 11, 40, 24, 8, 12, '#D9D0BA', '#F4EEDD');
  box(x - 19, y - 9, 9, 20, 12, 16, '#D6CDB8', '#FFFDF5');
  box(x - 6, y - 12, 27, 26, 11, 14, P.trim, P.hull);
  box(x - 25, y - 14, 3, 30, 8, 30, '#4A2E18', '#6A4426');
  box(x - 25, y - 14, 50, 30, 40, 42, '#3A2412', '#7A1E28'); }
function sleepInCastle(){ if (phase === 'Dawn') return; irisT = SPIT; clock = 0; lastPhase = 'Night'; sfx.phaseChange(); hearts = maxHearts(); hudHearts();
  toasts.clear(); toast('A night in your own castle, safe and sound under your flag. Morning! Every heart is back.', 3800, 1); save(); }
// Where each leviathan is now and what it is doing, for the telescope and the sea map; null once it is no more.
function leviathanAt(k){ switch (k){
  case 'guard': return {x: lev.x, y: lev.y, doing: lev.rise ? 'risen up at the buoys' : 'crawling round its path'};
  case 'cthulu': return {x: CTHULU_LAIR.x, y: CTHULU_LAIR.y, doing: cthulu.state === 'awake' ? 'awake and reaching' : 'asleep in its sunken city'};
  case 'angler': return {x: angler.x, y: angler.y, doing: angler.state === 'gone' ? 'deep down, out of sight' : 'lurking, its light glowing'};
  case 'gulper': return {x: gulper.x, y: gulper.y, doing: gulper.state === 'hunt' ? 'hunting a boat' : 'prowling'};
  case 'king': return king.state === 'dead' ? null : {x: king.x, y: king.y, doing: king.fighting ? 'fighting a boat' : 'circling island 5'};
  case 'reaper': return {x: reaper.x, y: reaper.y, doing: reaper.hunting ? 'hunting a boat' : reaper.state === 'away' ? 'swimming off' : 'roaming'};
  // Star flies high: the telescope looks up at him, not at his shadow; up in space, at the sea he left.
  case 'meteor': return {x: serpent.x, y: serpent.y, z: serpent.afraid ? 0 : serpent.z, doing: serpent.afraid ? 'up in space' : serpent.hunting ? 'hunting a boat' : 'flying round island 6'};
  case 'deep': return {x: deep.x, y: deep.y, doing: deep.state === 'sleep' ? 'asleep off the temple' : 'up and fighting'};
  default: return null; } }
function seenLeviathans(){ return LEVIATHANS.filter(l => leviathanAt(l.k)); }
// Every leviathan on the sea map, once Gigantis's observatory is yours.
function mapBeasts(){ return castleHQ ? seenLeviathans().map(l => { const at = leviathanAt(l.k); return {x: at.x, y: at.y, name: l.short}; }) : []; }
const elScope = $('scope'); let scope = null, scopeSaid = '';
function openScope(){ audio(); const list = seenLeviathans(); if (!list.length) return; const at = leviathanAt(list[0].k);
  scope = {i: 0, x: at.x, y: at.y, z: at.z ?? 0}; walker.vx = walker.vy = 0; sfx.click(); elScope.hidden = false; document.body.classList.add('scoping'); scopeSaid = ''; hudScope(); }
function closeScope(){ if (!scope) return; scope = null; elScope.hidden = true; document.body.classList.remove('scoping'); sfx.click(); }
function turnScope(step){ if (!scope) return; scope.i = nextSeen(scope.i, step, seenLeviathans().length); sfx.click(); hudScope(); }
function updateScope(dt){ if (!scope) return; const list = seenLeviathans(); if (!list.length){ closeScope(); return; } if (scope.i >= list.length) scope.i = 0;
  walker.vx = walker.vy = 0; const at = leviathanAt(list[scope.i].k), k = Math.min(1, dt*SCOPE_SWING); scope.x += (at.x - scope.x)*k; scope.y += (at.y - scope.y)*k; scope.z += ((at.z ?? 0) - scope.z)*k; hudScope(); }
function hudScope(){ const list = seenLeviathans(), l = list[scope.i]; if (!l) return; const at = leviathanAt(l.k), where = `${at.doing}, ${seaZone(at.x, at.y)}.`;
  const said = `${l.name}|${where}|${scope.i + 1} of ${list.length}`; if (said === scopeSaid) return; scopeSaid = said;
  $('scopeName').textContent = l.name; $('scopeWhere').textContent = where.charAt(0).toUpperCase() + where.slice(1); $('scopeCount').textContent = `${scope.i + 1} of ${list.length}`; }
$('scopePrev').addEventListener('click', e => { e.stopPropagation(); turnScope(-1); });
$('scopeNext').addEventListener('click', e => { e.stopPropagation(); turnScope(1); });
$('scopeDone').addEventListener('click', e => { e.stopPropagation(); closeScope(); });
elScope.addEventListener('click', e => { if (e.target === elScope) turnScope(1); });
// The sea through the lens: drawn round where the telescope looks, then dark all round a circle with a brass rim.
function drawScope(){ const cx = cam.x, cy = cam.y, dy = viewDY, ly = H*.42; cam.x = scope.x; cam.y = scope.y; viewDY = ly - H/2 + scope.z*Z;
  drawSea(); scene.draw(drawView, 'underwater'); drawFish(); scene.draw(drawView, 'surface'); drawFloe(drawView, T); drawWakes(); drawBuoys();
  scene.draw(drawView, 'afloat'); drawWorldObjects(); scene.draw(drawView, 'air'); drawBoil(); if (dark > .01 || warm > .01) drawNight(); drawStorm();
  cam.x = cx; cam.y = cy; viewDY = dy;
  const r = Math.min(W, H)*LENS, lx = W/2;
  ctx.fillStyle = '#05080C'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(lx + r, ly); ctx.arc(lx, ly, r, 0, Math.PI*2, true); ctx.fill('evenodd');
  ctx.strokeStyle = '#B88E36'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(lx, ly, r + 4, 0, Math.PI*2); ctx.stroke();
  ctx.strokeStyle = '#E8C66A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx, ly, r + 8, 0, Math.PI*2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,246,229,.4)'; ctx.lineWidth = 1.5;
  for (let a = 0; a < 4; a++){ const u = Math.cos(a*Math.PI/2), v = Math.sin(a*Math.PI/2); ctx.beginPath(); ctx.moveTo(lx + u*r*.84, ly + v*r*.84); ctx.lineTo(lx + u*r*.95, ly + v*r*.95); ctx.stroke(); } }
function drawHQFlag(){ const x = HQ_POLE.x, y = HQ_POLE.y, up = fgScene && fgScene.flag >= 0 ? clamp((T - fgScene.flag)/1.6, 0, 1) : 1;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; isoEllipse(x, y, 5); ctx.fill();
  ctx.strokeStyle = C.wood; ctx.lineWidth = 2.4*Z; ctx.beginPath(); ctx.moveTo(px(x,y),py(x,y,0)); ctx.lineTo(px(x,y),py(x,y,72)); ctx.stroke();
  drawFlagAt(px(x,y), py(x,y,30 + 42*up), 22*Z, 15*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1); }
function updatePortal7(dt){ if (isle7Stage < 1){ portalOpen = 0; return; }
  const out = floor < 0 && walker.state === 'ashore' && walker.dock === ISLE7_DOCK;
  if (portalOpen < 1 && out){ if (portalOpen === 0){ sfx.portal(); shake = Math.max(shake, .4); toasts.clear(); toast('The ring on the burnt grass is waking up. It is a portal! Walk into it.', 3600, 2); }
    portalOpen = Math.min(1, portalOpen + dt/2.5); } }
function isle4Look(){ if (isle3Stage >= 4) return {tar: 1, spread: 1, rise: 0, summon: 0, monkey: anchorer.waiting};
  if (!cine || cine.kind !== 'tar') return {tar: 0, spread: 0, rise: 0, summon: 0, monkey: false};
  const t = cine.t, r = (a, b) => clamp((t - a)/(b - a), 0, 1);
  return {summon: r(2.5, 4.6), rise: r(4.4, 6.8), spread: r(5, 8.2), tar: r(6.2, 8.8), monkey: t >= 2.5}; }
// The tar scene and the Heron's stop the boat where it is; the egg's lets it coast to a stop, its net still out.
function startCine(kind = 'tar'){ cine = {kind, t: 0, cue: 0}; toasts.clear(); if (kind !== 'egg') boat.v = 0; document.body.classList.add('cine'); }
function endCine(){ const kind = cine.kind; cine = null; document.body.classList.remove('cine'); if (kind === 'egg'){ endEggCine(); return; }
  if (kind === 'heron'){ heronFled = true; save(); refreshShop(); toast('The Heron got away through a portal of his own. Wherever it took him, he will be back...', 5200, 1); return; }
  isle3Stage = Math.max(isle3Stage, 4); save(); refreshShop();
  toast('Island 4 has turned to tar. A dark marker shows the way there. You need a chemistry suit: dock, and the shipwright in the shop sells one.', 5200, 1); }
// Which scene is owed, once the figure is back aboard: the tar's after the warlock, the Heron's after island 9.
function cineDue(){ return isle3Stage === 3 ? 'tar' : heronStage >= 2 && !heronFled ? 'heron' : null; }
function updateCine(dt){
  if (!cine){ const due = cineDue(); if (due && walker.aboard && started && swallowT <= 0 && !diving){ cineWait += dt; if (cineWait > 1.5){ cineWait = 0; startCine(due); } } else cineWait = 0; return; }
  cine.t += dt;
  if (cine.kind === 'egg') updateEggCine();
  else if (cine.kind === 'heron') updateEscapeCine();
  else if (cine.cue === 0 && cine.t >= 2.5){ cine.cue = 1; sfx.portal(); }
  else if (cine.cue === 1 && cine.t >= 4.4){ cine.cue = 2; sfx.cthuluWake(); shake = Math.max(shake, .6); }
  if (cine.t >= cineLen()) endCine(); }
// The Heron's escape, beat by beat: the splash, the Reaper's fin, the portal, and the jaws shutting on nothing.
function updateEscapeCine(){ const t = cine.t;
  if (cine.cue === 0 && t >= SPLASH_T){ cine.cue = 1; sfx.splash(); shake = Math.max(shake, .25); }
  else if (cine.cue === 1 && t >= REAPER_SHOWS){ cine.cue = 2; sfx.jaws(); }
  else if (cine.cue === 2 && t >= PORTAL_OPEN - .4){ cine.cue = 3; sfx.portal(); }
  else if (cine.cue === 3 && t >= SNAP_T){ cine.cue = 4; sfx.anglerSnap(); sfx.reaperRoar(); shake = Math.max(shake, .5); } }
// A tap skips it; the egg's only once it is in, so a tap that was steering the boat as it began does not lose it.
cv.addEventListener('pointerdown', () => { if (cine && (cine.kind !== 'egg' || cine.t > EGG_IN)) cine.t = Math.max(cine.t, cineLen() - .01); });
function drawCine(){ if (!cine) return; const len = cineLen(), k = Math.min(1, cine.t/.5, (len - cine.t)/.5);
  let cap = ''; for (const [t, c] of cine.kind === 'egg' ? EGG_CAPTIONS : cine.kind === 'heron' ? ESCAPE_CAPTIONS : CAPTIONS) if (cine.t >= t) cap = c;
  drawCaption(k, cap, true, cine.kind === 'egg' ? drawEggWords : null); }
// A cutscene's bars, in as far as k, with its words in the lower one; and, for one that can be, a word on skipping it.
function drawCaption(k, cap, skip, under = null){ const bar = H*.11*k;
  ctx.fillStyle = '#05080C'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
  if (under) under();
  ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#FFF1D6';
  ctx.font = `800 ${Math.round(Math.min(18, W/22))}px Grandstander, ui-rounded, system-ui, sans-serif`;
  const words = cap.split(' '), lines = []; let line = '';
  for (const w of words){ const tryLine = line ? line + ' ' + w : w; if (ctx.measureText(tryLine).width > W - 40){ lines.push(line); line = w; } else line = tryLine; }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, W/2, H - bar/2 + (i - (lines.length - 1)/2)*22));
  if (skip){ ctx.font = `600 12px Grandstander, ui-rounded, system-ui, sans-serif`; ctx.fillStyle = 'rgba(255,241,214,.6)'; ctx.fillText('Tap to skip', W/2, bar*.75); }
  ctx.globalAlpha = 1; }
// Over the egg, each crack in big comic letters, popping up and fading; then the banner: Congratulations! It's a baby Reaper!
function drawEggWords(){ const t = cine.t, p = eggSeat(), ex = px(p.x, p.y), ey = py(p.x, p.y, p.z), pop = (u) => u < .18 ? .4 + u/.18*.75 : u < .3 ? 1.15 - (u - .18)/.12*.15 : 1;
  const word = (text, x, y, size, fill, tilt, a) => { ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(tilt);
    ctx.font = `900 ${Math.round(size)}px Grandstander, ui-rounded, system-ui, sans-serif`;
    // Never wider than the screen, less a margin.
    const fit = Math.min(1, (W - 36)/(ctx.measureText(text).width + size*.2)); if (fit < 1){ size *= fit; ctx.font = `900 ${Math.round(size)}px Grandstander, ui-rounded, system-ui, sans-serif`; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = size*.18; ctx.strokeStyle = '#1D2B3A'; ctx.strokeText(text, 0, 0); ctx.fillStyle = fill; ctx.fillText(text, 0, 0); ctx.restore(); };
  CRACKS.forEach((c, i) => { const u = t - c; if (u < 0 || u > 1.1 || t >= POP_T) return;
    const big = i === CRACKS.length - 1, side = i % 2 ? 1 : -1;
    word(CRACK_WORDS[i], ex + side*Math.min(W*.22, 70)*(big ? .2 : 1), ey - 70 - i*14 - u*14, Math.min(W/8, big ? 52 : 40)*pop(u), '#FFFBEF', side*.12, Math.min(1, (1.1 - u)/.3)); });
  const u = t - POP_T - .15; if (u < 0) return; const a = Math.min(1, u/.2, (EGG_CINE - .3 - t)/.4);
  word('Congratulations!', W/2, H*.2, Math.min(W/9, 46)*pop(u), '#F2C230', -.04, a);
  word('It\'s a baby Reaper!', W/2, H*.2 + Math.min(W/9, 46)*1.05, Math.min(W/13, 32)*pop(Math.max(0, u - .2)), '#BFE0FF', .03, u < .2 ? 0 : a); }
function inFight(){ return [monkeys, monkeys7, hired8, hired9, ...camps, demonMonkeys, roofMonkeys].some(c => c.list.some(m => m.state === 'chase')) || HORDES.some(h => h.list.some(u => Horde.up(u))) || forgotten.up || forgotten2.up || boss.up || boss3.up || boss7.up || heron.up || heron9.up || brother.up || nest.up || swordsman.up || demons.some(d => d.up) || anchorer.up || landReaper.awake || cth.up || lancers.roused || gators.roused || gorillas.roused || bargeLancers.roused || bargeGators.roused || bargeGorillas.roused || bargeFighters.some(f => f.up) || bargeBosses().some(b => b.up) || bargeBoss.reaper.some(r => r.awake) || seaReapers.some(r => r.awake) || seaStars.some(m => m.hunting) || bargeBoss.spider.some(sd => sd.awake) || spider10.awake || pelican.up || oldOne.up || !!oldScene || pullT > 0; }
warlock.fighting = inFight;
function dive(){ resetTowers(); towerWon = false; tower = DEPTHS; toRoom(HALL); walker.diving = true; applyStage(); sfx.hop();
  toast(isle3Stage >= 2 ? 'Down at the tower\'s foot again. The portal is still turning.' : 'Down to the foot of the tower, under the sea.', 3000, 1); }
function intoDemons(){ sfx.portal(); redFlash = 1; shake = Math.max(shake, .6); toRoom(DEMON); walker.diving = false; demonMonkeys.reset(); for (const d of demons) d.reset(); applyStage(); }
// Inside a room the boat's bubbles (the order, the hold, the hull, the market, the driftwood) are put away: only coins and hearts matter in there.
function toRoom(i){ floor = i; document.body.classList.add('inside'); allies.clear(); const e = entry(i); walker.x = e.x; walker.y = e.y; walker.vx = walker.vy = 0; cam.x = walker.x; cam.y = walker.y; sfx.hop(); if (fgScene) return; if (i === RUINS) intoRuins(); else if (i === CRYPT) intoCrypt(); }
function resetTowers(){ clearBand(); for (const fl of camps) fl.reset(); for (const h of HORDES) h.reset(); forgotten.reset(); forgotten2.reset(); lancers.reset(); oldOne.reset(); oldScene = null; oldWinT = 0; bonesRun = null; if (fgScene){ fgScene = null; fgBits.length = 0; if (!cine) document.body.classList.remove('cine'); } allies.clear(); bonesJoined = false; merlockT = 1; boss.reset(); boss3.reset(); boss7.reset(); heron.reset(); if (heronStage >= 1) heron.away(); heron9.reset(); nest.reset(); if (heronStage >= 2){ heron9.away(); nest.freed(); } roofMonkeys.reset(); pelican.reset(); swordsman.reset(); for (const d of demons) d.reset(); demonMonkeys.reset(); pullT = 0; cageOpen = 0; }
function enterTower(t){ resetTowers(); towerWon = false; tower = t; toRoom(t.first);
  toast(!spear ? 'Inside the tower, and you have no spear! Leave, and buy one from the shipwright.'
    : t.boss === boss3 ? 'Inside the sunken tower. It drips. Beat the monkeys to open the stairs.' : t.boss === boss7 ? 'Inside island 7\'s tower. More monkeys this time: beat them to open the stairs.'
    : t.boss === heron ? (heronStage >= 1 ? 'Inside island 8\'s tower. He has hired more men to hold it.' : 'Inside the Heron\'s tower. His hired men hold the floors: beat them to open the stairs.')
    : t.boss === heron9 ? (heronStage >= 2 ? 'Inside island 9\'s tower. His hired men still hold it, unpaid.' : 'Inside the Heron\'s own tower. More hired men, and his nest at the top.')
    : t.boss === pelican ? 'Up and up the long winding stairs, out into the sunshine on top of island 10\'s tower. Something big is sat in that nest...' : 'Inside the tower. Beat the monkeys to open the stairs.', 3200, 1); }
function leaveTower(out = true){ if (floor < 0) return; floor = -1; document.body.classList.remove('inside'); resetTowers(); walker.diving = false;
  if (out && walker.state === 'ashore' && tower){ walker.x = tower.door.x; walker.y = tower.door.y; walker.vx = walker.vy = 0; cam.x = walker.x; cam.y = walker.y; }
  tower = null; }
// What the climb button would do now: in at a door, up the open stairs, or nothing.
function climbAction(){
  // Up against island 4's tar in the chemistry suit, all but stopped: into it.
  // At a bridge's dock in the Battle Barge at sea, all but stopped: onto it.
  if (walker.aboard && !cine && swallowT <= 0 && seaDockNear()) return 'bridge';
  // Up against one of the kid's islands there, all but stopped: ashore on it.
  if (walker.aboard && !cine && swallowT <= 0 && seaIsleNear()) return 'isle';
  if (walker.aboard) return !cine && gear.suit && isle3Stage >= 4 && Math.abs(boat.v) < TAR_STOP && atTar(boat.x, boat.y, bk()) ? 'tar' : null;
  if (walker.state !== 'ashore') return null;
  if (floor < 0){ if (walker.dock === HOME_DOCK && aquarium && nearAquarium(walker.x, walker.y)) return 'aquarium';
    if (walker.dock === ISLE3_DOCK && isle3Stage >= 1 && Math.hypot(walker.x - DIVE3.x, walker.y - DIVE3.y) < STEP) return 'dive';
    if (walker.dock === ISLE6_DOCK && isle6Stage === 1 && Math.hypot(walker.x - TEMPLE_DOOR.x, walker.y - TEMPLE_DOOR.y) < STEP + 6) return 'temple';
    if (walker.dock === ISLE7_DOCK && isle7Stage >= 1 && portalOpen >= 1 && Math.hypot(walker.x - PORTAL7.x, walker.y - PORTAL7.y) < PORTAL7.r * .7) return 'castle';
    if (walker.dock === ISLE11_DOCK && isle7Stage >= 4 && Math.hypot(walker.x - PORTAL11_FRONT.x, walker.y - PORTAL11_FRONT.y) < STEP + 4) return 'oldplace';
    return towerAtDoor() ? 'door' : null; }
  if (inGigantis()){ const h = hordes[floor], st = stairs(floor); if (fgScene) return null;
    if (floor === THRONE) return isle7Stage >= 3 && Math.hypot(walker.x - LOCKED.x, walker.y - LOCKED.y) < LOCKED_REACH ? 'onward' : null;
    // The skull door, with its key, once the Old One's ruins are quiet.
    if (floor === RUINS) return skullKey && isle7Stage >= 4 && !oldScene && Math.hypot(walker.x - SKULL_DOOR.x, walker.y - SKULL_DOOR.y) < SKULL_REACH ? 'skull' : null;
    // Beaten in his crypt, he has something to show you: go with him.
    if (floor === CRYPT) return cryptWon && !castleHQ && forgotten2.state === 'yield' && Math.hypot(walker.x - forgotten2.x, walker.y - forgotten2.y) < FG_TALK ? 'fgtour' : null;
    if (floor === GATE && castleHQ && !scope && Math.hypot(walker.x - HQ_SCOPE.x, walker.y - HQ_SCOPE.y) < SCOPE_REACH) return 'scope';
    if (floor === HALL_A && castleHQ && phase !== 'Dawn' && Math.hypot(walker.x - HQ_BED.x, walker.y - HQ_BED.y) < BED_REACH) return 'bed';
    return h && h.cleared && Math.hypot(walker.x - st.x, walker.y - st.y) < STEP + 6 ? 'onward' : null; }
  if (floor === HALL && isle3Stage >= 2 && pullT <= 0 && Math.hypot(walker.x - PORTAL.x, walker.y - PORTAL.y) < STEP + 6) return 'portal';
  if (tower && floor < tower.roof && floors[floor] && floors[floor].cleared){ const st = stairs(floor); if (Math.hypot(walker.x - st.x, walker.y - st.y) < STEP + 6) return 'stairs'; }
  return null; }
function hudHearts(){ const el = $('hearts'), show = walker.state === 'ashore' && (tower === BARGE || walker.dock === ISLE2_DOCK || walker.dock === ISLE3_DOCK || walker.dock === ISLE7_DOCK || walker.dock === ISLE8_DOCK || walker.dock === ISLE10_DOCK || walker.dock === ISLE11_DOCK || (walker.dock === ISLE6_DOCK && reaperEgg < 1) || walker.dock.tar || walker.dock.isle || warlock.shown || cat.shown || bonesPal.shown || naga.shown || necroPal.shown || baby.shown) || hearts < maxHearts(); el.hidden = !show;
  if (show) el.innerHTML = Array.from({length: maxHearts()}, (_, i) => HEART_SVG.replace('#E4572E', i < hearts ? '#E4572E' : 'rgba(128,128,128,.35)')).join('')
    // The warlock's, in green, after a gap.
    + (warlock.shown ? '<i style="display:inline-block;width:8px"></i>' + Array.from({length: WARLOCK_HEARTS}, (_, i) => HEART_SVG.replace('#E4572E', i < warlock.hearts ? '#3FB37A' : 'rgba(128,128,128,.35)')).join('') : '')
    // The cat's heals left, as little pink crosses.
    + (cat.shown && cat.heals ? '<i style="display:inline-block;width:8px"></i>' + Array.from({length: cat.heals}, () => HEAL_SVG).join('') : '')
    // Soul armour: a pale shield, its dots filling with each hit until the third gives a heart back.
    + (soulArmour ? '<i style="display:inline-block;width:8px"></i>' + soulSvg(soulN) : ''); }
function soulSvg(n){ return '<svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true"><path d="M8 1 15 4v5c0 4-3 7-7 8-4-1-7-4-7-8V4z" fill="none" stroke="#8FE6FF" stroke-width="1.6"/>'
  + [0, 1, 2].map(i => `<circle cx="${4.5 + i*3.5}" cy="9" r="1.3" fill="${i < n ? '#BFF6FF' : 'rgba(143,230,255,.3)'}"/>`).join('') + '</svg>'; }
const HEAL_SVG = '<svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true"><path d="M4 2h4v4h4v4H8v4H4v-4H0V6h4z" fill="#FF8FB0"/></svg>';
// The boat is tied up at the trading post while the figure is ashore, so a speared fish is sold on the spot.
function sellSpeared(sp, x, y){ log[sp]++; noteFirst(sp); carry += salePrice(SPECIES[sp].v, build, sp, market); const v = Math.floor(carry); carry -= v;
  coins += v; earned += v; sfx.spearHit();
  flies.push({x0:x, y0:y, z0:0, to:'post', t:0, dur:.55, c:SPECIES[sp].c, s:SPECIES[sp].s});
  addText(x, y, 18, '+' + v, C.coin, 19, 1.3); hud(); refreshShop(); save(); }
// Off the boat: tie up at the pier and walk the island. The stick walks the figure while it is ashore.
const walker = new Walker();
walker.onHop = () => sfx.hop();
const ashoreTold = new Set([BARGE_DOCK]); // each landing explains itself once a visit; the barge's never
walker.onLand = () => { gapTold = false; if (walker.dock === ISLE11_DOCK){ if (catermanFree) brother.away(); else brother.reset(); } if (walker.dock === ISLE10_DOCK){ prairie10.home(); swamp10.home(); gators.reset(); gorillas.reset(); spider10.reset(); webT = 0; webFree = 0; if (feederFull && crowsOwned < CROWS) crows.come(CROWS - crowsOwned, false); else crows.clear(); } const foeHere = walker.dock.isle && [...seaReapers, ...seaStars].find(f => f.isle === walker.dock.isle && !seaAshoreOut(f)), reaperHere = foeHere instanceof LandReaper, starHere = foeHere instanceof MeteorSerpent;
  const told = walker.dock.tar ? 'tar' : walker.dock.bridge ? 'bridge' : walker.dock.isle ? (reaperHere ? 'isle-reaper' : starHere ? 'isle-star' : 'isle') : walker.dock; if (!ashoreTold.has(told)){ ashoreTold.add(told);
    toast(walker.dock.bridge ? "On the bridge! The bosses can't get up here, but they are still after your boat. Get back aboard at the end of the dock." : reaperHere ? "Ashore, and this island's Reaper is up! Step out of his fan and off his line. When he rears up after, throw. The bosses at sea are still after your boat." : starHere ? "Ashore, and Star is coming for you! When his head glows, get out of the ring. While he's down on the sand, throw! The bosses at sea are still after your boat." : walker.dock.isle ? "Ashore on your island! The bosses can't come up on the sand, but they are still after your boat. Get back aboard where you landed." : walker.dock.tar ? 'Into the tar in your chemistry suit. Swim to the island; the boat waits at the edge.' : walker.dock === HOME_DOCK ? 'Ashore. Walk the island, the pier and the bridge. The boat waits at the end of the pier.' : walker.dock === ISLE3_DOCK ? 'Ashore on the floating town. Walk the planks out to the seaweed round the tower.' : walker.dock === ISLE6_DOCK ? `Ashore on island 6, the big island. ${CHESTS6.length} treasure chests are hidden on it: walk it all to find them.` : walker.dock === ISLE8_DOCK ? (isle7Stage < 1 ? 'Ashore on island 8. Walk across the sandbar to island 9. Both towers are barred shut, for now.' : heronStage >= 2 ? 'Ashore on island 8. Your flags fly on both towers, and the orb over island 9 is dark.' : heronStage >= 1 ? 'Ashore on island 8. Your flag flies on its tower. Across the sandbar, island 9\'s door is open: the Heron waits in his nest.' : 'Ashore on island 8. Its tower door is open: the Heron waits on the roof, behind his hired men.') : walker.dock === ISLE10_DOCK ? 'Ashore on island 10. The prairie is all around the pier, with the pond in it; the forest is across the far side, the swamp is off to the right, and a tall tower stands in the middle.' : walker.dock === ISLE11_DOCK ? 'Ashore on island 11. Jungle all round. The black lagoon is off to the right, and the old ruins are up across the far side.' + (catermanFree ? '' : ' And off to the left, something keeps going ZAP.') : walker.dock === ISLE7_DOCK ? 'Ashore on island 7. Monkeys on the far side, a tower in the middle, and a ring of strange metal standing on burnt grass. It is dead quiet.' : (spear ? 'Ashore on island 2. Walk along the sand: when a parrotfish swims close, throw your spear.' : 'Ashore on island 2. Parrotfish swim close to the sand here, and the shipwright sells a spear.'), 3800, 1); } save(); };
for (const e of [rareEntity, leviathan, cthulu, angler, gulper, serpent, reaper, lionfish, shallows, spears, monkeys, monkeys7, hired8, hired9, hiredBoats, coastGuard, ...camps, roofMonkeys, ...HORDES, forgotten, forgotten2, lancers, bargeLancers, bargeGorillas, bargeGators, bargeBand, seaBand, allies, boss, boss3, boss7, heron, heron9, nest, swordsman, ...demons, demonMonkeys, warlock, wboat, anchorer, landReaper, tarling, king, deep, cth, cat, warrior, bonesPal, naga, necroPal, baby, caterman, flotilla, muffin, leggy, birds6, prairie10, swamp10, pondBirds, oldMan, crows, guide, brother, sunken, gators, gorillas, spider10, pelican, otter, neil, whales, mantas, turtles, pirateEntity, gullsEntity, dolphins, sharksEntity, crates, driftwood, jellies, pets, walker]) scene.add(e);
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
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden'){ save(); cloudPut(true); } });
window.addEventListener('pagehide', () => { save(); cloudPut(true); });

/* ---------- HUD ---------- */
const elCoins = $('coins'), elHoldTxt = $('holdTxt'), elHoldBar = $('holdBar'), elHoldPill = $('holdPill');
const elToast = $('toast'), elShop = $('shop'), elSnd = $('snd'), elRst = $('rst');
const toasts = new ToastQueue(); let toastShown = null;
// pri 0 is routine, 1 an event, 2 danger; danger interrupts, the rest wait their turn.
function toast(msg, ms=2600, pri=0){ toasts.push(msg, ms, pri, performance.now()/1000); }
function renderToast(){ if (toastDrag || toastGoing) return; const m = toasts.tick(performance.now()/1000); if (m === toastShown) return; toastShown = m;
  if (m){ elToast.textContent = m; placeToast(); elToast.classList.add('show'); } else elToast.classList.remove('show'); }
// A message goes when it is tapped, or flicked off the screen any way (the owner's, 2026-10-17: "swipeable"): it follows
// the finger, slides off the way it was flicked, and the next one waiting may show. A press on it does not steer. A
// drag too short to be a flick puts it back.
const TOAST_TAP = 10, TOAST_FLICK = 40;
let toastDrag = null, toastGoing = false;
elToast.addEventListener('pointerdown', (e) => { if (!toastShown || toastGoing) return; e.preventDefault(); e.stopPropagation();
  toastDrag = {id: e.pointerId, msg: toastShown, x: e.clientX, y: e.clientY, dx: 0, dy: 0}; elToast.classList.add('drag');
  try { elToast.setPointerCapture(e.pointerId); } catch { /* a synthetic or already-released pointer */ } });
elToast.addEventListener('pointermove', (e) => { if (!toastDrag || e.pointerId !== toastDrag.id) return;
  toastDrag.dx = e.clientX - toastDrag.x; toastDrag.dy = e.clientY - toastDrag.y; elToast.style.translate = `${toastDrag.dx}px ${toastDrag.dy}px`; });
const toastLet = (e) => { if (!toastDrag || e.pointerId !== toastDrag.id) return;
  const {dx, dy, msg} = toastDrag, d = Math.hypot(dx, dy); toastDrag = null; elToast.classList.remove('drag');
  if (e.type === 'pointercancel' || (d >= TOAST_TAP && d < TOAST_FLICK)){ elToast.style.translate = ''; toastShown = null; return; }
  sendToast(msg, d >= TOAST_TAP ? dx/d : 0, d >= TOAST_TAP ? dy/d : 0); };
elToast.addEventListener('pointerup', toastLet); elToast.addEventListener('pointercancel', toastLet);
/** Send a message away: off the screen the way (ux, uy) it was flicked, or, tapped, fading where it is. */
function sendToast(msg, ux = 0, uy = 0){ sfx.click(); toasts.dismiss(msg, performance.now()/1000); toastGoing = true;
  elToast.style.translate = `${Math.round(ux*180)}px ${Math.round(uy*180)}px`; elToast.classList.remove('show');
  setTimeout(() => { elToast.classList.add('drag'); elToast.style.translate = ''; toastGoing = false; toastShown = null;
    requestAnimationFrame(() => elToast.classList.remove('drag')); }, 220); }
// A message sits below the bubbles at the top, which grow a row for each of hearts, the hull and the market. When the
// right-hand column stands much taller than the left (hearts, snacks, the hull, the time of day...), the message goes
// beside it instead, on the left under the order, so it never comes down over the figure or the fight (the owner's,
// 2026-10-16: "the text covers the action all the time").
const TOAST_TOP = 140, TOAST_SIDE = 160, TOAST_WIDE = 360;
function placeToast(){ let left = 0;
  for (const el of [$('order'), $('charter')]){ const r = el.getBoundingClientRect(); if (r.height) left = Math.max(left, r.bottom); }
  const rc = $('rchips').getBoundingClientRect(), gap = rc.left - 22;
  const side = rc.height > 0 && rc.bottom > left + 60 && gap >= TOAST_SIDE;
  elToast.classList.toggle('side', side); elToast.style.maxWidth = side ? Math.min(gap, TOAST_WIDE) + 'px' : '';
  const b = side ? left : Math.max(left, rc.height ? rc.bottom : 0);
  elToast.style.top = b + 10 > TOAST_TOP ? (b + 10) + 'px' : ''; }
// The bubbles change as hearts, the hull and the market come and go; the message moves with them.
hudCharter();
if (typeof ResizeObserver !== 'undefined'){ const ro = new ResizeObserver(() => { placeCharter(); placeToast(); }); ro.observe($('order')); ro.observe($('rchips')); ro.observe($('charter')); }
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
function refreshShop(){ $('updateBtn').hidden = !updateReady;
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
  refreshBase(); refreshCharter(); refreshBuild(); refreshAquarium(); refreshMarket(); refreshGear(); refreshYours(); $('flagMini').innerHTML = flagSvg(flag || START_FLAG, 30, 20);
  $('log').innerHTML = SPECIES.map((S,i) => `<span class="chip${log[i]?'':' unk'}${S.rare&&log[i]?' gold':''}" title="${log[i]?S.name:'Not caught yet'}">${spSvg(S, log[i]?S.c:'currentColor')}${log[i]||'?'}</span>`).join('')
    + `<span class="chip${levSeen?' gold':' unk'}">${levSeen?'Leviathan sighted':'Something bigger?'}</span>`
    + `<span class="chip${whaleSeen?' gold':' unk'}">${whaleSeen?'Whales sighted':'A song, far out?'}</span>`
    + `<span class="chip${turtleSeen?' gold':' unk'}">${turtleSeen ? (turtleSwims ? 'Turtle swims ' + turtleSwims : 'Turtles sighted') : 'Something paddling?'}</span>`
    + `<span class="chip${mantaSeen?' gold':' unk'}">${mantaSeen?'Mantas sighted':'Wings in the water?'}</span>`
    + `<span class="chip${cthuluSeen?' gold':' unk'}">${cthuluSeen?'Cthuluviathan sighted':'Something asleep?'}</span>`
    + `<span class="chip${anglerSeen?' gold':' unk'}">${anglerSeen?'Anglerfish sighted':'A light in the deep?'}</span>`
    + `<span class="chip${towerTaken?' gold':' unk'}">${towerTaken ? 'Tower taken' : 'Who is in the tower?'}</span>`
    + `<span class="chip${masks?' gold':' unk'}">${masks ? 'Skull masks ' + masks : 'Masks on island 2?'}</span>`
    + `<span class="chip${gulperSeen?' gold':' unk'}">${gulperSeen?'Gulper escaped':'An open mouth?'}</span>`
    + (lionSeen ? '<span class="chip gold">Lionfish sighted</span>' : '')
    + (trenchSeen || hasScuba() ? `<span class="chip${trenchSeen?' gold':' unk'}">${trenchDeep ? 'Trench dived ' + Math.round(trenchDeep) + ' deep' : trenchSeen ? 'Trench found' : 'A trench in the deep?'}</span>` : '')
    + (abyssSeen ? `<span class="chip gold">${abyssDown ? 'Abyss: 1,000 m down' : 'Abyss found'}</span>` : '')
    + (trenchDeep ? `<span class="chip${foundCount(trenchLoot) === LOOT_ONCE ? ' gold' : ''}">Trench treasure ${foundCount(trenchLoot)} of ${LOOT_ONCE}</span>` : '')
    + (iceSeen && hasScuba() ? `<span class="chip${iceFound(iceLoot) === ICE_LOOT.length ? ' gold' : ''}">Frozen in the ice ${iceFound(iceLoot)} of ${ICE_LOOT.length}</span>` : '')
    + (isle5Seen && hasScuba() ? `<span class="chip${wreckChest ? ' gold' : ' unk'}">${wreckChest ? 'Wreck treasure found' : 'Treasure in the wreck?'}</span>` : '')
    + (trenchDeep ? `<span class="chip${lurkerSeen ? ' gold' : ' unk'}">${lurkerStung ? `Lurker stung ${lurkerStung} ${lurkerStung === 1 ? 'time' : 'times'}` : lurkerSeen ? 'Met the lurker' : 'Eyes in the dark?'}</span>` : '')
    + (isle6Seen ? `<span class="chip${meteorSeen?' gold':' unk'}">${meteorSeen?'Star sighted':'Wings over island 6?'}</span>` : '')
    + (reaperSeen ? '<span class="chip gold">Reaper sighted</span>' : '')
    + (driven.reaper ? '<span class="chip gold">Ice fishing kit</span>' : '')
    + (reaperLandSeen || reaperEgg ? `<span class="chip gold">${reaperEgg >= 3 ? 'Baby Reaper' : reaperEgg >= 2 ? 'Reaper egg' : reaperEgg ? 'Reaper on land beaten' : 'Reaper on land seen'}</span>` : '')
    + (iceSeen ? `<span class="chip gold">${iceRuns ? `Ice fished ${iceRuns} ${iceRuns === 1 ? 'time' : 'times'}` : 'Ice floe found'}</span>` : '')
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
    + (isle8Seen ? '<span class="chip gold">Islands 8 and 9 found</span>' : '')
    + (isle10Seen ? '<span class="chip gold">Island 10 found</span>' : '')
    + (isle11Seen ? '<span class="chip gold">Island 11 found</span>' : '')
    + (catermanFree ? '<span class="chip gold">Caterman joined you</span>' : '')
    + (skullKey ? '<span class="chip gold">Skull key found</span>' : '')
    + (cryptWon ? '<span class="chip gold">The Forgotten One again</span>' : '')
    + (castleHQ ? '<span class="chip gold">Gigantis, your headquarters</span>' : '') + (scanner ? `<span class="chip">Portable scanner${scanned.length ? `: ${scanned.length} scanned` : ''}</span>` : '')
    + (bargeWins ? `<span class="chip gold">Battle Barge: ${bargeWins} won</span>` : '')
    + `<span class="chip${otter.free ? ' gold' : ' unk'}">${otter.free ? 'Otter befriended' : otter.fed ? 'Otter fed ' + otter.fed + ' of ' + OTTER_FEEDS : 'Something off the dock?'}</span>`
    + (iceSeen ? `<span class="chip${neil.free ? ' gold' : ' unk'}">${neil.free ? 'Neil the seal' : neil.fed ? 'Seal fed ' + neil.fed + ' of ' + NEIL_FEEDS : 'A seal on the ice?'}</span>` : '')
    + (heronStage >= 1 ? `<span class="chip gold">${heronStage >= 2 ? (heronFled ? 'Heron beaten, and fled by portal' : 'Heron beaten') : 'Heron driven off'}</span>` : '')
    + (isle7Stage >= 1 ? '<span class="chip gold">Portal awake</span>' : '')
    + (isle7Stage >= 2 ? '<span class="chip gold">Forgotten One beaten</span>' : '')
    + (isle6Seen ? `<span class="chip gold">Big island found${chests6 ? ': ' + popcount(chests6) + ' of ' + CHESTS6.length + ' chests' : ''}</span>` : '')
    + `<span class="chip${snook.landed?' gold':' unk'}">${snook.landed ? 'Snook landed ' + snook.landed : 'Under the bridge?'}</span>`;
}
const FISH_SVG = c => `<svg width="18" height="11" viewBox="0 0 22 14" aria-hidden="true"><path d="M1 7c3-5 9-7 14-3l5-3v12l-5-3C10 14 4 12 1 7z" fill="${c}" stroke="currentColor" stroke-opacity=".35" stroke-width="1"/></svg>`;
const LOG_SVG = '<svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true"><rect x="1" y="2" width="18" height="8" rx="4" fill="#A9773F" stroke="#5E3D1C" stroke-width="1.5"/><circle cx="15.5" cy="6" r="1.8" fill="#E6B877"/></svg>';
// A species' little picture: the crab has legs.
function spSvg(S, c){ return S.crab ? crabSvg(c) : FISH_SVG(c); }
function hudPhase(){ $('phase').innerHTML = `<i style="background:${PHASE_C[phase]}"></i><span>${phase}</span>`; }
function hudWood(){ $('wood').innerHTML = LOG_SVG + '<span>' + wood + '</span>'; }
// The junk bucket and the muffin box, each shown only with something in it; the box is a button that eats one.
const BOOT_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h5v8l5.5 1.6V14H3.6z" fill="#7A4E2A" stroke="#3B2617" stroke-width="1.2" stroke-linejoin="round"/><path d="M3.6 13.2h10.9" stroke="#2E2219" stroke-width="2"/></svg>';
const MUFFIN_SVG = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M10 6.2 8.6 2.2l2.6 1.4 2.4-1.6-1.3 4.2z" fill="#9FB8C4"/><path d="M4.4 10h9.2l-1.3 6.5H5.7z" fill="#E8D3B2" stroke="#9C7A4C" stroke-width="1"/><path d="M3 10.4C3 7 6 5.4 9 5.4s6 1.6 6 5z" fill="#9A6234" stroke="#5E3A1C" stroke-width="1"/></svg>';
function hudJunk(){ const j = $('junk'), m = $('muffinBtn');
  j.hidden = junk <= 0; if (junk > 0) j.innerHTML = BOOT_SVG + '<span>' + junk + '</span>';
  m.hidden = !muffins.length; if (muffins.length) m.innerHTML = MUFFIN_SVG + '<span>' + muffins.length + '</span>'; }
// The old man's store on island 10, the kid's: walk up and tap him for a dad joke, and his shelf of snacks. Snacks go in
// the bag, shown by the hearts, and are eaten ashore: an apple walks you half again as fast, a carrot doubles the
// spear's blows, each for SNACK_FOR seconds; a banana gives two hearts back (data/snacks.ts).
const SNACK_SVG = {apple: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4.2c-1.8-1.3-5.6-.8-5.6 3.6 0 3.6 2.6 6.6 4.2 6.6.8 0 .9-.4 1.4-.4s.6.4 1.4.4c1.6 0 4.2-3 4.2-6.6 0-4.4-3.8-4.9-5.6-3.6z" fill="#E0453A" stroke="#7A1E18" stroke-width=".8"/><path d="M8 4.4c0-1.4.6-2.6 1.8-3.2" stroke="#5A3A22" stroke-width="1.2" fill="none"/><path d="M9.2 2.6c1.6-.8 3-.2 3.4.6-1.4.8-2.8.4-3.4-.6z" fill="#5EA35A"/></svg>',
  carrot: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 14.4 11.4 5c.9-.9 2.3-.2 2 1.1L4.6 15c-.6.6-1.8 0-1.4-.6z" fill="#F28C28" stroke="#8A4A12" stroke-width=".7"/><path d="M12.2 4.2c-.2-1.6.4-2.8 1.6-3.2M12.6 4.6c1.2-1 2.6-1 3.2-.4M12 4.4c-1.2-1-1.4-2.4-.8-3.2" stroke="#3E8A3A" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>',
  banana: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.4 9.8c2.6 4 8.6 4.4 11.6-1.6.4-.8-.4-1.4-1-.8-2.6 3.2-6.8 3.6-9.6 1.6-.6-.4-1.4.2-1 .8z" fill="#F2D24A" stroke="#8A6A12" stroke-width=".8"/><path d="M13.6 7.4l.8-1.4" stroke="#5A3A22" stroke-width="1.2" stroke-linecap="round"/></svg>'};
const SNACK_ID = {apple: 'snackApple', carrot: 'snackCarrot', banana: 'snackBanana'};
let storeOpen = false, storeJoke = '', snackShown = '';
function oldManAt(){ return [px(OLDMAN10.x, OLDMAN10.y), py(OLDMAN10.x, OLDMAN10.y, 30)]; }
function talkToOldMan(){ audio();
  if (!OldMan.reaches(walker.x, walker.y)){ toasts.clear(); toast('Walk up to the old man on his porch.', 1800); return; }
  storeJoke = oldMan.tell(); sfx.hop(); openStore10(); }
function openStore10(){ storeOpen = true; $('store10Joke').innerHTML = '\u201C' + storeJoke + '\u201D<small>Heh heh heh! Now, what can I get you?</small>'; renderStore10(); $('store10').hidden = false; }
function closeStore10(){ storeOpen = false; $('store10').hidden = true; sfx.click(); }
const SUB_SVG = '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><rect x="12" y="6" width="7" height="6" rx="1.5" fill="#F2C230"/><path d="M16 6V3h3" stroke="#5A6268" stroke-width="1.4" fill="none"/><ellipse cx="15" cy="16" rx="12" ry="7" fill="#F2C230"/><path d="M4 13l-3-3v12l3-3" fill="#E0602E"/><circle cx="10" cy="15" r="2.2" fill="#9FE3F5" stroke="#5A6268"/><circle cx="16" cy="15" r="2.2" fill="#9FE3F5" stroke="#5A6268"/><circle cx="22" cy="15" r="2.2" fill="#9FE3F5" stroke="#5A6268"/></svg>';
const HONEY_SVG = '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><rect x="9" y="4" width="12" height="4" rx="1.4" fill="#8A4A1E"/><path d="M8 9.5h14v12.5a3.5 3.5 0 0 1-3.5 3.5h-7a3.5 3.5 0 0 1-3.5-3.5z" fill="#F2B632" stroke="#8A5A12" stroke-width="1.2"/><path d="M8 12.5h14" stroke="#E09A1E" stroke-width="2"/><rect x="10.5" y="15.5" width="9" height="6" rx="1.4" fill="#FFF3D6"/><ellipse cx="15" cy="18.5" rx="2.2" ry="1.4" fill="#F2C230"/><path d="M14.4 17.2v2.6M15.6 17.2v2.6" stroke="#2A2014" stroke-width=".8"/></svg>';
const FINDER_SVG = '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="12" fill="#0E4250" stroke="#5A6268" stroke-width="2"/><circle cx="15" cy="15" r="7" fill="none" stroke="rgba(207,232,236,.35)" stroke-width="1"/><path d="M15 15 L23 8" stroke="#7FE0A0" stroke-width="1.6" stroke-linecap="round"/><path d="M20 15 l2.6 -2.6 2.6 2.6 -2.6 2.6z" fill="#FFD24A"/><path d="M9 18 l2 -2 2 2 -2 2z" fill="#FFD24A"/></svg>';
const SPRAY_SVG = '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><rect x="8" y="10" width="12" height="17" rx="3" fill="#5E9A3A" stroke="#2C4A1C" stroke-width="1.2"/><rect x="10" y="6" width="8" height="5" rx="1.5" fill="#C9D2D6" stroke="#5A6268" stroke-width="1"/><path d="M18 7.5h3.5" stroke="#5A6268" stroke-width="2" stroke-linecap="round"/><path d="M10.5 16h7M10.5 19.5h7" stroke="#E8F4C8" stroke-width="1.6"/><circle cx="25" cy="5.5" r="1.4" fill="#9FD38A"/><circle cx="27.5" cy="9" r="1.1" fill="#9FD38A"/></svg>';
function renderStore10(){ $('store10Shelf').innerHTML = SNACK_KINDS.map(k => { const S = SNACKS[k], full = snacks[k] >= SNACK_MAX, no = coins < S.price || full;
  return `<button class="item" data-buy="${k}" aria-disabled="${no ? 'true' : 'false'}">${SNACK_SVG[k].replace(/width="16" height="16"/, 'width="30" height="30"')}<span><b>${S.name}</b><small>${S.blurb}${snacks[k] ? ` You have ${snacks[k]}.` : ''}</small></span><span class="buy">${full ? 'Bag full' : S.price}</span></button>`; }).join('')
  + (() => { const full = bugSpray + BUG_SPRAY.sprays > SPRAY_MAX, no = coins < BUG_SPRAY.price || full;
    return `<button class="item" data-buy="spray" aria-disabled="${no ? 'true' : 'false'}">${SPRAY_SVG}<span><b>${BUG_SPRAY.name}</b><small>${BUG_SPRAY.blurb}${bugSpray ? ` You have ${bugSpray} sprays.` : ''}</small></span><span class="buy">${full ? 'Bag full' : BUG_SPRAY.price}</span></button>`; })()
  + (() => { const full = honey >= HONEY_MAX, no = coins < HONEY.price || full;
    return `<button class="item" data-buy="honey" aria-disabled="${no ? 'true' : 'false'}">${HONEY_SVG}<span><b>${HONEY.name}</b><small>${HONEY.blurb}${honey ? ` You have ${honey} jar${honey === 1 ? '' : 's'}.` : ''}</small></span><span class="buy">${full ? 'Bag full' : HONEY.price}</span></button>`; })()
  + (() => { const no = finder || !gear.radar || coins < FINDER.price;
    return `<button class="item" data-buy="finder" aria-disabled="${no ? 'true' : 'false'}">${FINDER_SVG}<span><b>${FINDER.name}</b><small>${finder ? 'Fitted to your radar. Follow the gold!' : gear.radar ? FINDER.blurb : 'Needs a radar first: the shipwright sells one.'}</small></span><span class="buy">${finder ? 'Fitted' : FINDER.price}</span></button>`; })()
  + BADGE_KINDS.map(k => { const up = k === 'shield' && badges.shield === 1, have = owned(badges, k) && !up, spec = up ? SHIELD_UP : BADGES[k];
    const none = !friends().length, no = have || none || coins < spec.price;
    return `<button class="item" data-buy="badge-${k}" aria-disabled="${no ? 'true' : 'false'}">${BADGE_SVG[k].replace('class="pin"', 'width="30" height="30"')}<span><b>${spec.name}</b><small>${have ? 'Yours. Pin it on a friend in the shop\u2019s Badges card.' : none ? 'For a companion to wear, and you have none yet.' : spec.blurb}</small></span><span class="buy">${have ? 'Yours' : spec.price}</span></button>`; }).join('')
  + `<button class="item" data-buy="sub" aria-disabled="${sub || coins < SUBMARINE.price ? 'true' : 'false'}">${SUB_SVG}<span><b>${SUBMARINE.name}</b><small>${sub ? 'Yours. Stop anywhere out in the far deep and tap Dive in the submarine.' : SUBMARINE.blurb}</small></span><span class="buy">${sub ? 'Yours' : SUBMARINE.price}</span></button>`; }
$('store10Close').addEventListener('click', closeStore10);
$('store10Shelf').addEventListener('click', (e) => { const b = e.target.closest('[data-buy]'); if (!b) return; const k = b.dataset.buy, S = SNACKS[k];
  if (k.startsWith('badge-')){ const b = k.slice(6), up = b === 'shield' && badges.shield === 1, spec = up ? SHIELD_UP : BADGES[b];
    if ((owned(badges, b) && !up) || !friends().length || coins < spec.price){ sfx.denied(); return; }
    coins -= spec.price; if (b === 'shield') badges.shield = up ? 2 : 1; else badges[b] = true;
    const on = up ? (badges.on.shield ? WEARER_NAMES[badges.on.shield] : null) : pinNew(b); wearBadges(); sfx.upgrade(); hud(); save(); renderStore10(); toasts.clear();
    toast(up ? `The shield badge takes 6 hits now!${on ? ` ${on} wears it.` : ''}` : `The ${spec.name.toLowerCase()} is yours!${on ? ` It's pinned on the ${on.toLowerCase()}.` : ''} Move it to another friend in the shop's Badges card.`, 4200, 1); return; }
  if (k === 'sub'){ if (sub || coins < SUBMARINE.price){ sfx.denied(); return; }
    coins -= SUBMARINE.price; sub = true; sfx.upgrade(); hud(); save(); renderStore10(); toasts.clear();
    toast('The treasure submarine is yours! It rides on your boat. Sail out into the far deep, stop anywhere in open water, and tap Dive in the submarine.', 4600, 1); return; }
  if (k === 'finder'){ if (finder || !gear.radar || coins < FINDER.price){ sfx.denied(); if (!gear.radar && !finder){ toasts.clear(); toast('It fits a radar, and you have none yet. The shipwright sells one.', 2400); } return; }
    coins -= FINDER.price; finder = true; sfx.upgrade(); hud(); save(); renderStore10(); toasts.clear();
    toast('The treasure finder is fitted to your radar! Sunken treasure shows on it in gold. Sail out and tow your net over it.', 4200, 1); return; }
  if (k === 'honey'){ if (honey >= HONEY_MAX || coins < HONEY.price){ sfx.denied(); return; }
    const first = !honey && !hiveDay; coins -= HONEY.price; honey++; sfx.upgrade(); hud(); save(); renderStore10();
    if (first){ toasts.clear(); toast('"Honey! That Reaper can\'t stand the stuff. And the bees in the forest make it too, if you ask them nicely."', 4600, 1); }
    const nb = $('store10Shelf').querySelector('[data-buy="honey"]'); if (nb){ nb.classList.add('added'); setTimeout(() => nb.classList.remove('added'), 700); } return; }
  if (k === 'spray'){ if (bugSpray + BUG_SPRAY.sprays > SPRAY_MAX || coins < BUG_SPRAY.price){ sfx.denied(); return; }
    coins -= BUG_SPRAY.price; bugSpray += BUG_SPRAY.sprays; sfx.upgrade(); hud(); save(); renderStore10();
    const nb = $('store10Shelf').querySelector('[data-buy="spray"]'); if (nb){ nb.classList.add('added'); setTimeout(() => nb.classList.remove('added'), 700); } return; }
  if (snacks[k] >= SNACK_MAX){ sfx.denied(); return; }
  if (coins < S.price){ sfx.denied(); return; }
  coins -= S.price; snacks[k]++; sfx.upgrade(); hud(); hudSnacks(); save(); renderStore10();
  const nb = $('store10Shelf').querySelector(`[data-buy="${k}"]`); if (nb){ nb.classList.add('added'); setTimeout(() => nb.classList.remove('added'), 700); } });
// Island 10's birdfeeder and its crows, the kid's (entities/crows.ts): the pelican's bread in the feeder brings three
// crows; each asks a science question (data/science.ts), and answered right it can be petted, and it is yours, and it
// rides on the boat's rail. Answered wrong, it says the right answer and a fact, and asks another: nothing is lost.
let crowCard = -1, crowAsk = null, crowDeck = [];
function feederAt(){ return [px(FEEDER10.x, FEEDER10.y), py(FEEDER10.x, FEEDER10.y, TRAY_Z + 8)]; }
function crowAt(i){ const c = crows.list[i]; return c ? [px(c.x, c.y), py(c.x, c.y, c.z + 7)] : null; }
function tapFeeder(){ audio();
  if (Math.hypot(walker.x - FEEDER10.x, walker.y - FEEDER10.y) > FEEDER_REACH){ toasts.clear(); toast('Walk up to the birdfeeder.', 1800); return; }
  toasts.clear();
  if (feederFull){ toast(crowsOwned >= CROWS ? `The birdfeeder is full of crumbs. Your ${CROWS} crows ride on your boat.` : 'The crows love the bread. Tap a crow to talk to it.', 2400); return; }
  if (bread < 1){ toast(pelicanBeaten ? 'An empty birdfeeder. A little bread in it might bring the crows: the giant pelican up the tower leaves a loaf each time it is beaten.'
    : 'An empty birdfeeder. Crows love bread, but who has bread on this island? Something up the tall tower, maybe.', 3600); return; }
  bread--; feederFull = true; crows.come(CROWS - crowsOwned, true); sfx.plip(); save();
  toast('You crumble the bread into the birdfeeder. Caw! Caw! Here come the crows!', 3000, 1); }
function tapCrow(i){ audio(); const c = crows.list[i]; if (!c || crowCard >= 0) return;
  if (Math.hypot(walker.x - c.x, walker.y - c.y) > CROW_REACH){ toasts.clear(); toast('Walk up to the crows.', 1800); return; }
  if (c.solved){ petCrow(i); return; }
  if (!crows.ask(i)) return;
  crowCard = i; askCrow(); toasts.clear(); $('crowCard').hidden = false; }
// One question at a time from a shuffled deck of them, so none comes round again until every one has.
function nextQuestion(){ if (!crowDeck.length){ crowDeck = SCIENCE.map((_, i) => i);
    for (let i = crowDeck.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [crowDeck[i], crowDeck[j]] = [crowDeck[j], crowDeck[i]]; } }
  return SCIENCE[crowDeck.pop()]; }
function askCrow(){ const q = nextQuestion(); crowAsk = {q, picks: answers(q, Math.random), done: false};
  $('crowQ').textContent = q.q; const list = $('crowAnswers'); list.textContent = '';
  crowAsk.picks.forEach((a, k) => { const b = document.createElement('button'); b.className = 'answer'; b.dataset.a = String(k); b.textContent = a; list.appendChild(b); });
  $('crowFact').hidden = true; $('crowPet').hidden = true; $('crowNext').hidden = true; }
function answerCrow(k){ if (!crowAsk || crowAsk.done) return; const q = crowAsk.q, pick = crowAsk.picks[k]; if (pick === undefined) return; crowAsk.done = true;
  const right = pick === q.right;
  for (const b of $('crowAnswers').querySelectorAll('[data-a]')){ b.disabled = true; const a = crowAsk.picks[+b.dataset.a]; if (a === q.right) b.classList.add('right'); else if (+b.dataset.a === k) b.classList.add('wrong'); }
  const fact = $('crowFact'); fact.textContent = ''; const head = document.createElement('b'); head.textContent = right ? 'Caw! That’s right!' : `Not quite: it’s “${q.right}”.`;
  fact.append(head, q.fact); fact.hidden = false;
  if (right){ const c = crows.list[crowCard]; if (c) c.solved = true; sfx.rightAnswer(); $('crowPet').hidden = false; }
  else { sfx.click(); $('crowNext').hidden = false; } }
function petCrow(i){ if (!crows.pet(i)) return; closeCrowCard(true); crowsOwned = Math.min(CROWS, crowsOwned + 1); sfx.yip(); sfx.caw(); save();
  const c = crows.list[i]; if (c) addText(c.x, c.y, c.z + 18, 'Caw!', '#E8ECF4', 15, 1);
  toasts.clear(); toast(crowsOwned >= CROWS ? `The crow is yours! That is all ${CROWS}. They wait on your boat's rail. Crows always know the way to land.`
    : `The crow is yours! It flies off to wait on your boat. ${crowsOwned} of ${CROWS} crows.`, 4200, 1); }
function closeCrowCard(quiet){ if (crowCard < 0 && $('crowCard').hidden) return; crowCard = -1; crowAsk = null; crows.calm(); $('crowCard').hidden = true; if (!quiet) sfx.click(); }
$('crowAnswers').addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (b) answerCrow(+b.dataset.a); });
$('crowPet').addEventListener('click', () => { if (crowCard >= 0) petCrow(crowCard); });
$('crowNext').addEventListener('click', () => { sfx.caw(); askCrow(); });
$('crowClose').addEventListener('click', () => closeCrowCard());
// Back aboard, a crow still on its way to the boat is on its rail; walk off from one asking and its question is put away.
function updateCrows(){ if (walker.aboard){ if (crows.list.length) crows.clear(); }
  if (crowCard < 0) return; const c = crows.list[crowCard];
  if (!c || walker.state !== 'ashore' || Math.hypot(walker.x - c.x, walker.y - c.y) > CROW_REACH + 30) closeCrowCard(true); }
// The bag by the hearts: one chip for each snack there is, and an apple or carrot still working shows its seconds.
function hudSnacks(){ for (const k of SNACK_KINDS){ const el = $(SNACK_ID[k]), t = k === 'apple' ? appleT : k === 'carrot' ? carrotT : 0, n = snacks[k];
  const key = n + ':' + Math.ceil(t); if (el.dataset.k === key) continue; el.dataset.k = key;
  el.hidden = n <= 0 && t <= 0; el.classList.toggle('on', t > 0);
  el.innerHTML = SNACK_SVG[k] + '<span>' + n + '</span>' + (t > 0 ? `<span class="t">${Math.ceil(t)}s</span>` : ''); } }
function eatSnack(k){ audio(); if (!snacks[k]) return;
  if (walker.state !== 'ashore'){ toasts.clear(); toast('Snacks are for ashore. Keep it for your next landing.', 2000); return; }
  if (k === 'banana'){ if (hearts >= maxHearts()){ toasts.clear(); toast('Your hearts are full. Keep the banana for a fight.', 1800); return; }
    hearts = Math.min(maxHearts(), hearts + BANANA_HEARTS); hudHearts(); addText(walker.x, walker.y, 34, `Yum! +${BANANA_HEARTS} hearts`, '#F2D24A', 17, 1.3); }
  else if (k === 'apple'){ appleT = SNACK_FOR; addText(walker.x, walker.y, 34, 'Crunch! Speedy!', '#FF8A80', 17, 1.3); }
  else { carrotT = SNACK_FOR; addText(walker.x, walker.y, 34, 'Crunch! Strong!', '#FFB45A', 17, 1.3); }
  snacks[k]--; sfx.nom(); hudSnacks(); save(); }
for (const k of SNACK_KINDS) $(SNACK_ID[k]).addEventListener('click', () => eatSnack(k));
function updateSnacks(dt){ updateCrows(); updateSunken(); appleT = Math.max(0, appleT - dt); carrotT = Math.max(0, carrotT - dt); walker.speedK = appleT > 0 ? APPLE_PACE : 1;
  if (storeOpen && (walker.state !== 'ashore' || !OldMan.reaches(walker.x, walker.y))) closeStore10();
  hudSnacks(); }
// What is fitted, owned or worn is in the Yours row (refreshYours); the shelf shows what is still to buy.
function refreshGear(){ const el = $('gear'); el.hidden = !shipwrightOpen(tier());
  // The chemistry suit is kept back until the tar island has been seen, the lionfish gear until a lionfish has, and the big air tank until there is scuba gear.
  el.innerHTML = '<span class="gearhead">Shipwright</span>' + GEAR_IDS.filter(id => (id !== 'suit' || isle3Stage >= 4 || gear.suit) && (id !== 'kit' || lionSeen || gear.kit) && (id !== 'rod' || lionSeen || gear.rod) && (id !== 'lionnet' || lionSeen || gear.lionnet) && (id !== 'tank' || hasScuba() || gear.tank) && (id !== 'ballast' || stormSeen || gear.ballast) && (id !== 'white' || (iceSeen && hasScuba()) || gear.white)).filter(id => !gear[id]).map(id => { const g = GEAR[id], no = refusal(id, gear, coins);
    return `<button class="gear" data-g="${id}" aria-disabled="${no ? 'true' : 'false'}"><b>${g.name}</b><span class="buy">${no === 'fitted' ? 'Fitted' : g.cost}</span><small>${g.blurb}</small></button>`; }).join('')
    // The spear is for island 2's shallows, so the shipwright keeps it back until island 2 has been found.
    + (() => { const n = nextSpear(spear), have = spearAt(spear); if (!isle2Seen && !spear) return '';
      return n ? `<button class="gear" data-s="1" aria-disabled="${coins < n.cost ? 'true' : 'false'}"><b>${n.name}</b><span class="buy">${n.cost}</span><small>${n.blurb}</small></button>` : ''; })()
    // Armour, the kid's, once there is a spear to fight with: a level at a time, space armour once the portal is awake.
    + (() => { if (!spear && !armour) return ''; const n = nextArmour(armour, isle7Stage >= 1, heronStage >= 2), have = armourAt(armour);
      return n ? `<button class="gear" data-a="1" aria-disabled="${coins < n.cost ? 'true' : 'false'}"><b>${n.name}</b><span class="buy">${n.cost}</span><small>${n.blurb}</small></button>` : ''; })();
  // Nothing left on the shelf: no shelf.
  if (!el.querySelector('button')) el.hidden = true; }
// Bought and done, in one short row of chips: fitted gear, the top spear owned and the top armour worn, the palace
// finished, and the base at this dock built. The cards above are for what is still to buy.
function refreshYours(){ const el = $('yours'), chips = [];
  for (const id of GEAR_IDS) if (gear[id]) chips.push(GEAR[id].name);
  if (spear && !nextSpear(spear)) chips.push(spearAt(spear).name);
  if (armour && !nextArmour(armour, isle7Stage >= 1, heronStage >= 2)) chips.push(`${armourAt(armour).name}, ${armourAt(armour).hearts} hearts`);
  if (build >= STAGES.length) chips.push(`Palace: fish sell for ${Math.round(build*15)}% more`);
  const b = docked ? baseAtDock(boat.x, boat.y) : null;
  if (b && !nextStage(b, bases)) chips.push(`Your base on ${b.island}`);
  el.hidden = !chips.length;
  el.innerHTML = '<span class="yh">Yours</span>' + chips.map(c => `<span class="chip">${c}</span>`).join(''); }
function refreshBuild(){
  const b = $('build'), mult = Math.round(build*15);
  // Finished: it is a chip in the Yours row.
  b.hidden = build >= STAGES.length; if (b.hidden) return;
  const S = STAGES[build], ok = wood >= S.wood && coins >= S.coins;
  const note = wood < S.wood ? `You have ${wood} of ${S.wood} driftwood.` : coins < S.coins ? `You need ${S.coins - coins} more coins.` : `Fish sell for ${mult+15}% more${build < 3 ? '. Unlocks the next upgrade level' : build === FISHMONGER_STAGE-1 ? '. Opens the fishmonger, who pays double for his pick of the day' : build === SMOKEHOUSE_STAGE-1 ? '. Opens the smokehouse: tuna, goldfin and shark sell for half again' : ''}.`;
  b.setAttribute('aria-disabled', ok ? 'false' : 'true');
  b.innerHTML = `<span><b>Build the ${S.name}</b><small>${note}</small></span><span class="buy">${S.wood} driftwood${S.coins ? ' and ' + S.coins + ' coins' : ''}</span>`;
}
// A base's card, docked at its island: the next stage to build, or what it is once finished.
function refreshBase(){ const el = $('baseBtn'), b = docked ? baseAtDock(boat.x, boat.y) : null; el.hidden = !b; if (!b) return;
  const S = nextStage(b, bases);
  // Built: it is a chip in the Yours row.
  if (!S){ el.hidden = true; return; }
  const ok = wood >= S.wood && coins >= S.coins;
  const note = wood < S.wood ? `You have ${wood} of ${S.wood} driftwood.` : coins < S.coins ? `You need ${S.coins - coins} more coins.` : S.blurb;
  el.setAttribute('aria-disabled', ok ? 'false' : 'true');
  el.innerHTML = `<span><b>Build a ${S.name} here</b><small>${note}</small></span><span class="buy">${S.wood} driftwood and ${S.coins} coins</span>`; }
function refreshAquarium(){ const b = $('aquaBtn'), show = build >= AQUARIUM_FROM; b.hidden = !show;
  aquaKinds = aquarium ? tankKinds(SPECIES, log, lionCaught, snook.landed) : []; if (!show) return;
  if (aquarium){ const n = aquaKinds.length; b.setAttribute('aria-disabled', 'false');
    b.innerHTML = `<span><b>Your aquarium</b><small>${n} kind${n === 1 ? '' : 's'} of fish live in it. Feed them and play.</small></span><span class="buy">Look</span>`; return; }
  const need = AQUARIUM_COST, ok = wood >= need.wood && coins >= need.coins;
  const note = wood < need.wood ? `You have ${wood} of ${need.wood} driftwood.` : coins < need.coins ? `You need ${need.coins - coins} more coins.` : 'A glass tank by the palace tree, with a fish of every kind you catch in it.';
  b.setAttribute('aria-disabled', ok ? 'false' : 'true');
  b.innerHTML = `<span><b>Build an aquarium</b><small>${note}</small></span><span class="buy">${need.wood} driftwood and ${need.coins} coins</span>`; }
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
$('baseBtn').addEventListener('click', () => { audio();
  const b = docked ? baseAtDock(boat.x, boat.y) : null, S = b && nextStage(b, bases); if (!S) return;
  if (wood < S.wood || coins < S.coins){ sfx.denied();
    toast(wood < S.wood ? `Collect ${S.wood - wood} more driftwood out at sea.` : `You need ${S.coins - coins} more coins.`, 2000); return; }
  wood -= S.wood; coins -= S.coins; bases[b.id]++;
  addText(b.hut.x, b.hut.y, 50, 'Built your ' + S.name, '#9CF0C0', 22, 2.6);
  toast(S.built, 4200, 1);
  sfx.build(); save(); hud(); hudWood(); refreshShop(); });
// Storms, past the buoys only (the owner's call): a warning, a storm that slows the boat and sends the fish deep, then
// the boil, when the fish come up and count double. stormE is how much of it the boat is in: none in home water or tied up.
const storm = new Storm(), reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
let stormE = 0, flashA = 0, thunderAt = -1;
function updateStorm(dt){ if (!started || cine || diving) return;
  const out = walker.aboard && !docked && pastBuoys(boat.x, boat.y), ev = storm.update(dt, out);
  stormE = walker.aboard && !docked && !seaFight ? storm.k * clamp(Math.max(-boat.x, boat.x-WS, -boat.y, boat.y-WS)/150, 0, 1) : 0;
  flashA = Math.max(0, flashA - dt*4);
  if (ev === 'flash' && stormE > .5){ if (!reduceMotion) flashA = 1; thunderAt = T + .5 + Math.random()*.6; }
  if (thunderAt > 0 && T >= thunderAt){ thunderAt = -1; sfx.whump(); }
  if (!out) return;
  if (ev === 'warn'){ toasts.clear(); toast('Dark clouds over the deep: a storm is coming! The gulls have gone quiet.', 3600, 2); }
  else if (ev === 'storm'){ const first = !stormSeen; if (first){ stormSeen = true; save(); refreshShop(); }
    toasts.clear(); toast('The storm is here! Your boat is slow and turns wide, and the fish have gone deep. Ride it out, or head inside the buoys where it is calm.' + (!gear.ballast && first ? ' The shipwright has ballast to steady the boat now.' : ''), 5000, 2); sfx.whump(); }
  else if (ev === 'boil'){ toasts.clear(); toast('The storm has passed, and the fish are boiling up! For a minute, every fish you catch past the buoys counts double.', 4200, 1); sfx.tierUp(); } }
// Over the sea while it storms: darker, rain blowing across, and lightning (no flash and still rain for reduced motion).
function drawStorm(){ if (stormE < .01) return;
  ctx.fillStyle = `rgba(28,36,52,${.34*stormE})`; ctx.fillRect(0, 0, W, H);
  const n = Math.round(140*stormE), t = reduceMotion ? 0 : T;
  ctx.strokeStyle = `rgba(220,232,240,${.38*stormE})`; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < n; i++){ const x = ((i*97.3 + t*520) % (W+120)) - 60, y = ((i*173.7 + t*900) % (H+80)) - 40;
    ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 20); }
  ctx.stroke();
  if (flashA > 0){ ctx.fillStyle = `rgba(240,246,255,${.45*flashA})`; ctx.fillRect(0, 0, W, H); } }
// In a storm the schools out past the buoys go deep, out of sight and out of the net's reach.
function stormSunk(sc){ return storm.phase === 'storm' && pastBuoys(sc.ax, sc.ay); }
// The boil after a storm: splashes over the schools out past the buoys.
function drawBoil(){ if (storm.phase !== 'boil') return;
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.6*Z;
  for (const sc of schools){ if (!sc.vis || !pastBuoys(sc.ax, sc.ay)) continue;
    for (let k = 0; k < 7; k++){ const a = k*2.1 + sc.p, ph = (T*1.6 + k*.37) % 1, r = sc.r*(.3 + (k%3)*.25),
      x = sc.cx + Math.cos(a)*r, y = sc.cy + Math.sin(a)*r;
      ctx.globalAlpha = 1 - ph; ctx.beginPath(); ctx.ellipse(px(x,y), py(x,y), (4 + ph*14)*Z, (2 + ph*7)*Z, 0, 0, Math.PI*2); ctx.stroke(); } }
  ctx.globalAlpha = 1; }
// Island 6's charter office: docked at its pier, the shop offers the passengers waiting there.
let charterOffer = null, charterGone = false, charterHp = 0;
function refreshCharter(){ const el = $('charterBtn'), here = docked && walker.aboard && hasCharters(bases) && baseAtDock(boat.x, boat.y)?.id === 'isle6';
  if (here && !charter && !charterOffer) charterOffer = newCharter(Math.random);
  const show = here && !!(charter || charterOffer); el.hidden = !show; if (!show) return;
  if (charter){ el.setAttribute('aria-disabled', 'true');
    el.innerHTML = `<span><b>Your passengers are aboard</b><small>They want to ${wishList(charter)}. Tie up at any dock when you are done.</small></span>`; return; }
  const n = charterOffer.wants.length;
  el.setAttribute('aria-disabled', 'false');
  el.innerHTML = `<span><b>Take a charter: ${n} passengers</b><small>They want to ${wishList(charterOffer)}. They pay for each, and tip if they see it all.</small></span><span class="buy">Take them</span>`; }
$('charterBtn').addEventListener('click', () => { audio(); if (charter || !charterOffer) return;
  charter = charterOffer; charterOffer = null; charterHp = hp; sfx.click();
  toasts.clear(); toast(`${charter.wants.length} passengers aboard! They want to ${wishList(charter)}. Find it for them, then tie up at any dock for the fare.`, 4600, 1);
  hudCharter(); save(); refreshShop(); });
// At sea with passengers: what they see, and what frightens them.
function updateCharter(){ if (!charter || !started || docked || swallowT > 0) return;
  const bx = boat.x, by = boat.y, near = (x, y, r) => Math.hypot(x - bx, y - by) < r;
  const seen = [];
  if ((whales.mother.up > 0 && near(whales.mother.x, whales.mother.y, 500)) || (whales.calf.up > 0 && near(whales.calf.x, whales.calf.y, 500))) seen.push('whales');
  if (mantas.mantas.some(m => m.leap >= 0 && near(m.x, m.y, 750))) seen.push('manta');
  if (turtles.turtles.some(t => t.state === 'with')) seen.push('turtle');
  if (dolphins.escorted) seen.push('dolphins');
  if (cthulu.state === 'asleep' && cthulu.boatD < CTHULU_SIGHT) seen.push('cthulu');
  for (const id of seen) if (seeSight(charter, id)){ sfx.orderFilled(); addText(bx, by, 50, 'Ooh!', '#FFE9A0', 22, 1.6);
    toasts.clear(); toast(`Your passengers saw ${SIGHTS[id].name}! +${SIGHTS[id].fare} on the fare.${charter.seen.length === charter.wants.length ? ' That is everything they wanted: they will tip.' : ''}`, 3000, 1); hudCharter(); save(); }
  // A fright, once: the boat hurt, or a shark charging close.
  const hurt = hp < charterHp - 0.5; charterHp = hp;
  if (!charter.scared && (hurt || sharks.some(s => s.state === 'charge' && near(s.x, s.y, 220)))){ charter.scared = true;
    toasts.clear(); toast(hurt ? 'Your passengers screamed! They are shaken: they will only pay half.' : 'A shark! Your passengers screamed: they will only pay half.', 3000, 2); hudCharter(); save(); } }
// Tied up anywhere after a charter: they pay and step off.
function endCharter(){ const c = charter, f = charterFare(c); charter = null;
  if (!f){ sfx.denied(); toast('Your passengers step off disappointed: they saw nothing they wanted, so they pay nothing.', 3400, 1); hudCharter(); save(); return; }
  chartersRun++; coins += f; earned += f; sfx.orderFilled(); addText(boat.x, boat.y, 50, '+' + f, C.coin, 24, 2);
  toast(`Your passengers step off happy${c.scared ? ', if a little shaken' : ''}: they saw ${c.seen.map(id => SIGHTS[id].name).join(', ')}. +${f} coins.`, 3800, 1);
  hudCharter(); hud(); save(); }
// The charter card under the order: what each passenger wants, ticked when seen.
function hudCharter(){ const el = $('charter'); el.hidden = !charter; if (!charter) return;
  el.innerHTML = `<b>Charter</b>` + charter.wants.map(id => `<span class="${charter.seen.includes(id) ? 'seen' : ''}">${charter.seen.includes(id) ? '\u2713 ' : ''}${SIGHTS[id].name}</span>`).join('') + (charter.scared ? '<i>Half fare</i>' : '');
  placeCharter(); }
function placeCharter(){ const el = $('charter'); if (el.hidden) return; el.style.top = ($('order').getBoundingClientRect().bottom + 6) + 'px'; }
$('aquaBtn').addEventListener('click', () => { audio();
  if (aquarium){ openTank(); return; }
  const need = AQUARIUM_COST;
  if (wood < need.wood || coins < need.coins){ sfx.denied();
    toast(wood < need.wood ? `Collect ${need.wood - wood} more driftwood out at sea.` : `You need ${need.coins - coins} more coins.`, 2000); return; }
  wood -= need.wood; coins -= need.coins; aquarium = true;
  addText(AQUARIUM_MID.x, AQUARIUM_MID.y, 60, 'Built the aquarium', '#9CF0C0', 22, 2.6);
  toast('Built the aquarium, by the palace tree. A fish of every kind you have caught lives in it. Walk up to it ashore, or tap it here, to look in.', 4200, 1);
  sfx.build(); save(); hud(); hudWood(); refreshShop(); });
$('gear').addEventListener('click', e => { const b = e.target.closest('.gear'); if (!b) return; audio();
  if (b.dataset.s){ const n = nextSpear(spear); if (!n) return;
    if (coins < n.cost){ sfx.denied(); toast(`${n.blurb} You need ${n.cost - coins} more coins.`, 2600); return; }
    coins -= n.cost; spear++; sfx.upgrade(); toast(n.bought, 3600, 1); save(); hud(); refreshShop(); return; }
  if (b.dataset.a){ const n = nextArmour(armour, isle7Stage >= 1, heronStage >= 2); if (!n) return;
    if (coins < n.cost){ sfx.denied(); toast(`${n.blurb} You need ${n.cost - coins} more coins.`, 2600); return; }
    coins -= n.cost; armour++; hearts = maxHearts(); sfx.upgrade(); toast(n.bought, 3600, 1); save(); hud(); hudHearts(); refreshShop(); return; }
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
    return `<article class="page${g.known ? '' : ' unk'}${g.known && S.rare ? ' gold' : ''}">${spSvg(S, g.known ? S.c : 'currentColor')}<b>${g.name}</b><small>${g.blurb}</small>`
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
      + (isle4Stage >= 1 ? ' Set foot on its sand and it rose with an anchor on a chain: the Tar Anchorer. It threw the anchor where you were going and swung it round itself. You beat it, it melted, and a tarling climbed out of what was left.' : '')
    : 'Not seen yet.'}</small><div class="facts"><span>Island 4</span><span>${isle4Stage >= 1 ? 'The Tar Anchorer' : 'Black water'}</span><span>${isle4Stage >= 1 ? 'Beaten: a tarling' : gear.suit ? 'Suit bought' : 'Suit: the shipwright'}</span></div></article>`);
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
  pages.push(`<article class="page${isle7Stage >= 4 ? ' gold' : ' unk'}">${LEV_SVG}<b>${isle7Stage >= 4 ? 'The Old One' : '?'}</b><small>${isle7Stage >= 4
    ? 'What slept under the black pool in the ruins behind the Forgotten One\'s throne. He rose wanting you dead, knocked your skeleton flying and roared at you, and fought from the water: he called lagoon creatures out of it, five at a time, and brought his great hand down on anyone at the pool\'s edge. Beaten, he sank back, and the pool went still. Your skeleton\'s soul stayed with you as soul armour: every third hit gives a heart back.'
    : 'Not met yet. Something sleeps under the black pool in the ruins behind the throne.'}</small><div class="facts"><span>Gigantis ruins</span><span>${OLD_HP} to beat</span><span>${isle7Stage >= 4 ? 'Beaten' : 'Not beaten'}</span></div></article>`);
  if (isle7Stage >= 1) pages.push(`<article class="page${heronStage >= 1 ? ' gold' : ' unk'}">${LEV_SVG}<b>${heronStage >= 1 ? 'The Heron' : '?'}</b><small>${heronStage >= 1
    ? 'The leviathan sorcerer\'s boss: a great grey heron on long black legs, with an alien gun and a staff of illusion. He hires men to keep his water round islands 8 and 9. On island 8\'s tower roof he zapped down a thin pink line and made copies of himself with his staff, and only the real one could be hurt. Beaten there, he flew off to his nest on island 9\'s tower, where the orb of power is.' + (heronStage >= 2 ? ' In his nest the orb shielded him while a necromancer was chained to it, raising skeletons; you beat the necromancer, his chain snapped, the orb went dark, and you beat the Heron. He flapped off over the sea.' + (heronFled ? ' Too hurt to fly far, he fell into the water, and the Reaper came for him; but he raised his staff, a portal opened under him, and he was gone. The spell worked. He will be back.' : '') : '')
    : 'Not met yet. The sorcerer had a boss. Its banner, a white heron on midnight blue, flies on island 8.'}</small><div class="facts"><span>Islands 8 and 9</span><span>${HERON_HP} to beat</span><span>${heronStage >= 2 ? (heronFled ? 'Escaped by portal' : 'Beaten') : heronStage >= 1 ? 'Flown to his nest' : 'Not met'}</span></div></article>`);
  if (isle11Seen) pages.push(`<article class="page${catermanFree ? ' gold' : ' unk'}">${LEV_SVG}<b>${catermanFree ? 'The Heron\'s brother' : '?'}</b><small>${catermanFree
    ? 'Just like the Heron, but with two hands: one on his alien gun and one on his staff of illusion. He kept a clearing on island 11 and zapped at Caterman\'s workshop all day. "Have a good day! Oh, by the way, have you seen my brother?" He can\'t be beaten: when you got the better of him he stopped, said "Bye! It\'s hard for challengers," and flew off, still asking where his brother was. Caterman came out of his workshop and joined you.'
    : 'Not met yet. Something on island 11 keeps going ZAP.'}</small><div class="facts"><span>Island 11</span><span>${HERON9_HP} to stop him</span><span>${catermanFree ? 'Flew off' : 'Not met'}</span></div></article>`);
  pages.push(`<article class="page${masks ? ' gold' : ' unk'}">${LEV_SVG}<b>${masks ? 'Skull-mask monkeys' : '?'}</b><small>${masks
    ? 'A camp of monkeys in little skull masks on the far side of island 2. They run at you to bonk you, and two of them throw coconuts: keep moving, step out from under the shadow, and throw your spear. Beaten, a monkey drops its mask and runs off. Beat the whole camp and its chest opens.'
    : 'Not met yet. Something lives in the huts on the far side of island 2. Take a spear.'}</small><div class="facts"><span>Island 2</span><span>Three hearts ashore</span><span>${masks} masks</span></div></article>`);
  pages.push(`<article class="page${gulperSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${gulperSeen ? 'Gulper' : '?'}</b><small>${gulperSeen
    ? 'A giant gulper eel, black as the deep, with a mouth like a pelican\'s and a pink light at the tip of its tail. It hunts the east side of the deep. Each bite takes a third of the boat\'s health; three and it eats the boat, which it spits out at home without the catch. It is slower than a flagship flat out: run, and turn hard when it closes.'
    : 'Not seen yet. Something with an enormous mouth hunts the east side of the deep. Watch for a pink light.'}</small><div class="facts"><span>East side of the deep</span><span>Day and night</span><span>${beastFact('gulper')}</span></div></article>`);
  if (trenchDeep) pages.push(`<article class="page${lurkerSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${lurkerSeen ? 'The lurker' : '?'}</b><small>${lurkerSeen
    ? 'Something big that lives in the trench\'s midnight water: a long black fish with a jaw full of needle teeth, a row of faint lights down its side and two pale eyes. Stay down in the dark a while and the eyes come out of it, circling just out of your lamp. When they go orange and its jaw drops, it lunges: swim out of the way, or it bites your tank and a big gulp of air bubbles out. A spear stings it and it flees for a good while, and it never follows you up out of the dark. A bigger air tank takes more bites.'
    : 'Not met yet. Something lives in the trench\'s dark, below the jellies.'}</small><div class="facts"><span>The trench, in the dark</span><span>Bites air</span><span>${lurkerStung ? `Stung ${lurkerStung} ${lurkerStung === 1 ? 'time' : 'times'}` : lurkerSeen ? 'Met' : 'Not met'}</span></div></article>`);
  pages.push(`<article class="page${meteorSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${meteorSeen ? 'Star, the meteor serpent' : '?'}</b><small>${meteorSeen
    ? 'A long snake with two great wings and four legs, three claws on each, and a head like a meteor: lumpy rock with a glowing crater and a mouth full of teeth. It haunts island 6, flying slow loops high over it. Sail near and it hunts you: it circles over the boat, its head lights up like a falling star, and a ring shows on the water where you are going. Then it dives head-first into the ring, its hardest hit: steer out of it. After a dive it thrashes in the water a moment, and that is when the harpoon reaches it.'
    : 'Not seen yet. Something with wings flies round island 6.'}</small><div class="facts"><span>Island 6</span><span>Day and night</span><span>${beastFact('meteor')}</span></div></article>`);
  pages.push(`<article class="page${reaperSeen ? ' gold' : ' unk'}">${LEV_SVG}<b>${reaperSeen ? 'The Reaper' : '?'}</b><small>${reaperSeen
    ? 'The Reaper... but he doesn\'t answer to that. A great blue fish with a pointed snout, a jagged mouth, a big yellow eye under an angry brow, a yellow-striped fin on his back, and legs underneath, for he can walk on land too. There are said to be two of him, one in the water and one on land. The one in the water roams the deep and the far deep, his yellow fin cutting the water. Sail near and he hunts you: he circles, then a red fan shows on the water where you are going, and his tail sweeps through it like a scythe. Turn hard out of the fan. Then he rears up out of the water roaring, which is when the harpoon reaches him. Angry, he sweeps twice, there and back. The first time you drive him off, he leaves an ice fishing kit behind.'
    : 'Not seen yet. A yellow fin roams the deep and the far deep.'}</small><div class="facts"><span>The deep and the far deep</span><span>Day and night</span><span>${beastFact('reaper')}</span></div></article>`);
  // The second of him, on land, once he has been seen asleep by his nest on island 6.
  if (reaperLandSeen || reaperEgg) pages.push(`<article class="page gold">${LEV_SVG}<b>The Reaper on land</b><small>${'The other one of him, on his four clawed legs: he lies asleep on the sand of a cove on island 6\'s north-west shore, curled by a nest of seaweed with an egg in it. Walk near the nest and he wakes, roaring, and comes for you, faster than you walk. His tail sweeps through a red fan on the sand, as the one in the water does: step out of it. And he charges along a red line, jaws first: step off it. After each he rears up on his hind legs and roars, and only then does a spear get past his scales to his belly. Walk away from his cove and he goes back to his nest. '
    + (reaperEgg >= 3 ? 'You beat him, and he left you his egg, and at dawn it hatched: the baby Reaper is yours. At sea he swims off your bow, his little striped fin up, and leaps clear of the water now and then; tap him and he leaps for you. Ashore he trots at your heel on his four little legs and nips whatever you fight.'
      : reaperEgg >= 2 ? 'You beat him, and he left you his egg: pale blue with his zigzag round it and yellow speckles. It rides in a coil of rope at your bow. It is warm, and now and then it wobbles. Something in it will be out by morning.'
      : reaperEgg ? 'You beat him, and he went back into the sea. His egg is still in the nest: walk up and take it.' : 'Beat him, and the egg in his nest is yours.')}</small><div class="facts"><span>Island 6, the north-west cove</span><span>On foot</span><span>${reaperEgg >= 3 ? 'His baby is yours' : reaperEgg >= 2 ? 'His egg is yours' : reaperEgg ? 'Beaten: the egg waits' : 'Spear him reared up'}</span></div></article>`);
  pages.push(`<article class="page${lionSeen ? ' gold' : ' unk'}">${FISH_SVG(lionSeen ? '#B9472F' : 'currentColor')}<b>${lionSeen ? 'Lionfish' : '?'}</b><small>${lionSeen
    ? 'Little fish with red and white stripes, a fan of fins and long spines. They don\'t belong in this sea: real lionfish came to Florida\'s water from far away, and people there are asked to catch them. Tow your net through them and their spines cut it, and it catches nothing until it is mended, at a dock or with the shipwright\'s mending kit. Catch them on the rod, or sweep them up with the lionfish net, which they cannot cut: each pays a bounty. They live in small groups round the outer sea.'
    : 'Not seen yet. Something striped and spiny has turned up in the outer sea.'}</small><div class="facts"><span>The outer sea</span><span>Cuts nets</span><span>${lionCaught ? `Caught ${lionCaught} for the bounty` : gear.rod ? 'Catch them on the rod' : 'The shipwright sells a rod'}</span></div></article>`);
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
// The tester panel, the owner's: #tester at the end of the link turns it on for this device (#tester-off puts it
// away), and a Tester button in the shop opens it. A story step marks everything up to it beaten; the game saves
// and starts again from the save, so all that hangs off the story fits. The extras need no restart.
let tester = false;
function testerSay(said){
  try { if (said === 'on') localStorage.setItem(TESTER_KEY, '1'); else if (said === 'off') localStorage.removeItem(TESTER_KEY);
    tester = localStorage.getItem(TESTER_KEY) === '1'; } catch { if (said) tester = said === 'on'; }
  if (said && started) toast(tester ? 'Tester on: open it from the shop.' : 'Tester off.', 2400);
  $('testerBtn').hidden = !tester; }
function story(){ return {isle3Seen, isle3Stage, isle4Stage, isle5Seen, isle5Stage, isle6Seen, isle6Stage, isle7Seen, isle7Stage, soulArmour, isle8Seen, heronStage}; }
function openTester(){ audio(); sfx.click(); const done = stepsDone(story());
  $('testerSteps').innerHTML = STEPS.map((st, i) => `<button class="tstep${i < done ? ' done' : ''}" data-step="${i}"><span>${st.label}</span><span class="tk">${i < done ? 'Done' : 'Skip to here'}</span></button>`).join('');
  renderExtras(); $('tester').hidden = false; }
// The extras: some again and again (coins, driftwood, mending), the rest once, and say so once you have them.
const EXTRAS = [['coins', '+10,000 coins'], ['wood', '+100 driftwood'], ['unfog', 'Unfog the sea map', () => sailedShare(sailed) >= 1], ['kit', "The Reaper's ice fishing kit", () => driven.reaper > 0],
  ['egg', "The Reaper's egg", () => reaperEgg >= 2], ['hatch', "The Reaper's egg, hatching now", () => reaperEgg >= 3], ['reaperland', 'The Reaper on land, back by his nest for a rematch', () => reaperEgg < 1 || reaperRematch],
  ['sub', 'The treasure submarine', () => sub], ['badges', 'All three badges, the shield upgraded', () => badges.shield >= 2 && badges.damage && badges.heal], ['finder', 'The radar and the treasure finder', () => finder && gear.radar], ['crows', "Island 10's three crows, on the rail", () => crowsOwned >= CROWS], ['bread', 'The giant pelican beaten, and its bread for the birdfeeder', () => pelicanBeaten && (bread >= 1 || feederFull)], ['otter', 'The otter', () => otter.free], ['neil', 'Neil the seal', () => neil.free], ['naga', 'The naga', () => nagaFree], ['junk', 'A bucket of junk, for the muffin man'], ['stale', 'A fish muffin about to grow legs'], ['leggy', 'Six leggy muffins', () => leggy.count >= LEGGY_MAX], ['mend', 'Mend the boat, fill the hearts'], ['snacks', "A bag of snacks and bug spray from island 10's old man", () => SNACK_KINDS.every(k => snacks[k] >= 3) && bugSpray >= 12]];
function renderExtras(){ $('testerExtras').innerHTML = EXTRAS.map(([k, l, has]) => { const got = has && has();
  return `<button class="tstep${got ? ' done' : ''}" data-extra="${k}"><span>${l}</span><span class="tk">${got ? 'Have it' : 'Add'}</span></button>`; }).join(''); }
$('testerBtn').addEventListener('click', openTester);
$('testerClose').addEventListener('click', () => { sfx.click(); $('tester').hidden = true; });
// The Battle Barge, the kid's (data/barge.ts): from anywhere, aboard or ashore, a card to pick an arena and up to ten
// on-foot enemies, and Fight! puts the figure on the barge with them, and the army with it. Beat them all for a coin;
// bonked out, or leaving, back where it was. While it is out there, the sea's hunters leave the boat alone.
let bargeFrom = null, bargeWon = false, bargeShown = false;
/** Whether a fight can start from here, now. */
function bargeCan(){ return started && spear > 0 && !seaFight && floor < 0 && !diving && !icing && !cine && swallowT <= 0 && !inFight() && (walker.aboard || walker.state === 'ashore'); }
function openBarge(){ audio(); sfx.click(); seaMapWhy = ''; renderBarge(); $('bargeCard').hidden = false; }
function closeBarge(){ $('bargeCard').hidden = true; }
function renderBarge(){
  // On the barge the next fight is on foot; out at the ring, at sea.
  const fixed = tower === BARGE ? 'foot' : seaFight ? 'sea' : null; if (fixed) barge.where = fixed;
  $('bargeWhereRow').hidden = !!fixed;
  $('bargeWhere').innerHTML = [['foot', 'On foot'], ['sea', 'At sea']].map(([k, n]) => `<button class="rchip${barge.where === k ? ' on' : ''}" data-where="${k}">${n}</button>`).join('');
  $('bargeSize').innerHTML = ARENA_SIZES.map(k => `<button class="rchip${barge.size === k ? ' on' : ''}" data-size="${k}">${ARENA_NAMES[k]}</button>`).join('');
  if (barge.where === 'sea'){ renderSea(); return; }
  const total = bargeTotal(barge.pick);
  $('bargeList').innerHTML = BARGE_FOES.map(k => { const [n, d] = FOE_NAMES[k];
    // The spider only with bug spray in the bag: three sprays a spider.
    const noSpray = k === 'spider' && bugSpray < SPIDER_HP * (barge.pick.spider + 1);
    const why = noSpray ? (bugSpray ? ` You have ${bugSpray} sprays: not enough for another.` : ' You have no bug spray: the old man on island 10 sells it.') : '';
    return `${k === BOSS_FOES[0] ? '<p class="tnote">Bosses</p>' : ''}<div class="boat foe"><div><b>${n}</b><small>${d}${why}</small></div><div class="count"><button class="rchip" data-foe="${k}" data-d="-1" aria-label="One fewer ${n}">−</button><span>${barge.pick[k]}</span><button class="rchip" data-foe="${k}" data-d="1" aria-label="One more ${n}"${total >= BARGE_MAX || noSpray ? ' disabled' : ''}>+</button></div></div>`; }).join('');
  $('bargeTotal').textContent = total ? `${total} of ${BARGE_MAX} picked.` : 'Pick at least one to fight.';
  $('bargeGo').disabled = !total; }
/** The card's At sea side: the kid's map, and the sea bosses, fought from the boat with the harpoon. */
function renderSea(){ const total = seaTotal(barge.sea), harpoon = hasHarpoon(), ashore = seaIsleFoes();
  $('bargeList').innerHTML = `<p class="tnote">${harpoon ? 'Out on open water in a ring of buoys, fought from your boat with the harpoon.' : 'You need the harpoon to fight at sea: the shipwright sells it.'}</p>` + seaChart() + SEA_FOES.map(k => { const [n, d] = SEA_NAMES[k];
    return `<div class="boat foe"><div><b>${n}</b><small>${d}</small></div><div class="count"><button class="rchip" data-sea="${k}" data-d="-1" aria-label="One fewer ${n}">−</button><span>${barge.sea[k]}</span><button class="rchip" data-sea="${k}" data-d="1" aria-label="One more ${n}"${total >= BARGE_MAX ? ' disabled' : ''}>+</button></div></div>`; }).join('');
  const nr = barge.isles.filter(i => i.who === 'reaper').length, ns = ashore - nr;
  const onIsles = [nr && (nr === 1 ? 'a Reaper' : `${nr} Reapers`), ns && (ns === 1 ? 'Star' : `${ns} Stars`)].filter(Boolean).join(' and ') + (ashore === 1 ? ' on an island' : ' on your islands');
  $('bargeTotal').textContent = total ? `${total} of ${BARGE_MAX} picked${ashore ? `, and ${onIsles}` : ''}.` : ashore ? `Just ${onIsles}.` : 'Pick at least one to fight.';
  $('bargeGo').disabled = !(total || ashore) || !harpoon; }
/** The kid's map on the card: the ring from above, turned the way the game is (up on the chart is up on the screen),
 * his islands on it, his boat where it comes in, and the bosses where they start. Tap the water for an island there,
 * an island to take it away; where one cannot go, the card says why. */
const SEA_CHART = 1.12;
const SEA_MAP_NO = {isle: {edge: 'Not so near the buoys: leave a way round.', boat: 'Not there: that is where your boat comes in.', near: 'Too near another island or the tar: leave water between them.', full: `That is ${SEA_ISLES_MAX} islands, the most. Tap one to take it away.`},
  tar: {edge: 'Not so near the buoys.', boat: 'Not there: that is where your boat comes in.', near: 'Too near an island or more tar: leave water between them.', full: `That is ${SEA_TARS_MAX} patches of tar, the most. Tap one to take it away.`},
  bridge: {edge: 'Not so near the buoys: the bridge and its dock have to fit inside them.', boat: 'Not there: that is where your boat comes in.', near: 'Too near an island, the tar or another bridge: leave water between them.', full: `That is ${SEA_BRIDGES_MAX} bridges, the most. Tap one to take it away.`}};
/** What a tap on the chart puts down: an island, or tar. */
let seaTool = 'isle';
/** What the bosses go round, from the map: the islands, the tar with how far it reaches, and each bridge end to end. */
const seaBlocks = () => [...barge.isles, ...barge.tar.map(t => ({...t, r: SEA_TAR_R})),
  ...barge.bridges.map(b => ({x: b.x - BRIDGE_U.x*SEA_BRIDGE_HALF, y: b.y - BRIDGE_U.y*SEA_BRIDGE_HALF, x2: b.x + BRIDGE_U.x*SEA_BRIDGE_HALF, y2: b.y + BRIDGE_U.y*SEA_BRIDGE_HALF, r: SEA_BRIDGE_REACH}))];
let seaMapWhy = '';
/** A Reaper lying on an island on the chart: his blue body, his forked tail, his striped fin, his yellow eye. */
const seaChartReaper = (x, y) => `<g transform="translate(${x} ${y})"><path d="M.07 0L.1-.03L.1.03Z" fill="#2F5E9E"/><path d="M-.02-.02L.01-.05L.03-.02Z" fill="#F2C230" stroke="#1C1719" stroke-width=".006"/><ellipse rx=".075" ry=".03" fill="#3E7BC4" stroke="#1F3F6E" stroke-width=".008"/><circle cx="-.045" cy="-.006" r=".009" fill="#F2C230"/></g>`;
/** Star over an island on the chart: his rocky head with its glowing crater, and a wing either side. */
const seaChartStar = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-.02-.01L-.09-.05L-.07 0Z" fill="#B8462E"/><path d="M.02-.01L.09-.05L.07 0Z" fill="#B8462E"/><circle r=".035" fill="#6E4A36" stroke="#3B2418" stroke-width=".008"/><circle cx=".008" cy="-.008" r=".014" fill="#FFB347"/></g>`;
const seaChartAt = (x, y) => [((x - y)*Math.SQRT1_2).toFixed(3), ((x + y)*Math.SQRT1_2).toFixed(3)];
function seaChart(){ const R = SEA_RING[barge.size], st = seaStart(1), [bx, by] = seaChartAt(st.x, st.y).map(Number);
  const spots = seaSpotsClear(seaSpots(seaTotal(barge.sea), R), seaBlocks(), R);
  const buoys = Array.from({length: 24}, (_, i) => { const a = i/24*Math.PI*2; return `<circle cx="${Math.cos(a).toFixed(3)}" cy="${Math.sin(a).toFixed(3)}" r=".032" fill="${i % 2 ? '#F2C230' : '#E4572E'}"/>`; }).join('');
  const isles = barge.isles.map(i => { const [x, y] = seaChartAt(i.x, i.y);
    return `<circle cx="${x}" cy="${y}" r="${SEA_ISLE_R*1.35}" fill="#35A0A6"/><circle cx="${x}" cy="${y}" r="${SEA_ISLE_R}" fill="#F2D9A0"/><circle cx="${x}" cy="${y}" r="${SEA_ISLE_R*.6}" fill="#6FB062"/>${i.who === 'reaper' ? seaChartReaper(Number(x), Number(y)) : i.who === 'star' ? seaChartStar(Number(x), Number(y)) : ''}`; }).join('');
  const tar = barge.tar.map(t => { const [x, y] = seaChartAt(t.x, t.y);
    return `<circle cx="${x}" cy="${y}" r="${SEA_TAR_R}" fill="#1C1719" stroke="#4A4246" stroke-width=".014"/><circle cx="${x}" cy="${y}" r="${SEA_TAR_R*.55}" fill="none" stroke="#5A4A6A" stroke-width=".01" stroke-dasharray=".05 .04"/>`; }).join('');
  // A bridge lies across the chart as it lies across the screen, its dock below it.
  const bridges = barge.bridges.map(b => { const [x, y] = seaChartAt(b.x, b.y).map(Number), h = SEA_BRIDGE_HALF;
    return `<rect x="${(x - .03).toFixed(3)}" y="${y.toFixed(3)}" width=".06" height=".09" fill="#A9845A"/><rect x="${(x - h).toFixed(3)}" y="${(y - .03).toFixed(3)}" width="${(2*h).toFixed(3)}" height=".06" rx=".015" fill="#E9EFF2" stroke="#A9BAC4" stroke-width=".012"/>`; }).join('');
  const foes = spots.map(p => { const [x, y] = seaChartAt(p.x/R, p.y/R); return `<circle cx="${x}" cy="${y}" r=".035" fill="#3B1F3F" stroke="#FFF7E6" stroke-width=".012"/>`; }).join('');
  const boatAt = `<path d="M${bx} ${(by - .075).toFixed(3)}L${(bx - .045).toFixed(3)} ${(by + .05).toFixed(3)}L${(bx + .045).toFixed(3)} ${(by + .05).toFixed(3)}Z" fill="#FFF7E6" stroke="#C0392B" stroke-width=".015"/>`;
  return `<p class="tnote">Your map: pick Island, Tar or Bridge, tap the sea to put one there, and tap one to take it away. Tap an island once to put a Reaper on it, again for Star, and again to take it away. Islands block the bosses and your boat, and hide you from the ones chasing you. Stop at one to go ashore, where its Reaper or Star fights you on foot. Your boat crawls through tar, and the bosses can't go in it. Bridges block the water, and have a dock: stop at it to step onto the bridge. The dark dots are where the bosses start.</p>`
    + `<div class="bchips" id="seaTools">${[['isle', 'Island'], ['tar', 'Tar'], ['bridge', 'Bridge']].map(([k, n]) => `<button class="rchip${seaTool === k ? ' on' : ''}" data-tool="${k}">${n}</button>`).join('')}</div>`
    + `<svg id="seaMap" viewBox="${-SEA_CHART} ${-SEA_CHART} ${SEA_CHART*2} ${SEA_CHART*2}" role="img" aria-label="Your map, with ${barge.isles.length} islands (${seaIsleFoes()} with someone on them), ${barge.tar.length} patches of tar and ${barge.bridges.length} bridges. Tap the sea to put ${seaTool === 'tar' ? 'tar' : seaTool === 'bridge' ? 'a bridge' : 'an island'} there.">`
    + `<rect x="${-SEA_CHART}" y="${-SEA_CHART}" width="${SEA_CHART*2}" height="${SEA_CHART*2}" rx=".12" fill="#0E4252"/><circle r="1" fill="#16586A"/><circle r=".45" fill="#1A6276"/>`
    + `<circle r="1" fill="none" stroke="#F2C230" stroke-width=".01" stroke-dasharray=".03 .03"/>${buoys}${tar}${isles}${bridges}${foes}${boatAt}</svg>`
    + `<p class="tnote" id="seaMapWhy"${seaMapWhy ? '' : ' hidden'}>${seaMapWhy}</p>`; }
$('bargeBtn').addEventListener('click', openBarge);
$('bargeOpen').addEventListener('click', openBarge);
$('bargeClose').addEventListener('click', () => { sfx.click(); closeBarge(); });
$('bargeWhere').addEventListener('click', (e) => { const b = e.target.closest('[data-where]'); if (!b) return; barge.where = b.dataset.where; sfx.click(); renderBarge(); save(); });
$('bargeSize').addEventListener('click', (e) => { const b = e.target.closest('[data-size]'); if (!b) return; barge.size = b.dataset.size; sfx.click(); renderBarge(); save(); });
$('bargeList').addEventListener('click', (e) => { const m = e.target.closest('#seaMap');
  if (m){ const rc = m.getBoundingClientRect(), cx = ((e.clientX - rc.left)/rc.width*2 - 1)*SEA_CHART, cy = ((e.clientY - rc.top)/rc.height*2 - 1)*SEA_CHART;
    const p = {x: (cx + cy)*Math.SQRT1_2, y: (cy - cx)*Math.SQRT1_2}; let why = null;
    // On an island or a patch of tar, whatever is in hand, it goes; on open water, what is in hand goes down there.
    const {isles, tar, bridges} = barge;
    if (isles.some(i => Math.hypot(p.x - i.x, p.y - i.y) <= SEA_ISLE_R)) barge.isles = seaIsleTap(isles, p, tar, bridges);
    else if (tar.some(t => Math.hypot(p.x - t.x, p.y - t.y) <= SEA_TAR_R)) barge.tar = seaTarTap(tar, p, isles, bridges);
    else if (bridges.some(b => bridgeShare(b, p.x, p.y) <= SEA_BRIDGE_REACH*.6)) barge.bridges = seaBridgeTap(bridges, p, isles, tar);
    else if (seaTool === 'tar'){ why = seaTarNo(tar, p, isles, bridges); if (!why) barge.tar = seaTarTap(tar, p, isles, bridges); }
    else if (seaTool === 'bridge'){ why = seaBridgeNo(bridges, p, isles, tar); if (!why) barge.bridges = seaBridgeTap(bridges, p, isles, tar); }
    else { why = seaIsleNo(isles, p, tar, bridges); if (!why) barge.isles = seaIsleTap(isles, p, tar, bridges); }
    seaMapWhy = why ? SEA_MAP_NO[seaTool][why] : ''; if (why) sfx.denied(); else sfx.click(); renderBarge(); save(); return; }
  const tool = e.target.closest('[data-tool]');
  if (tool){ seaTool = tool.dataset.tool; seaMapWhy = ''; sfx.click(); renderBarge(); return; }
  seaMapWhy = ''; const s = e.target.closest('[data-sea]');
  if (s){ barge.sea = seaAdd(barge.sea, s.dataset.sea, Number(s.dataset.d)); sfx.click(); renderBarge(); save(); return; }
  const b = e.target.closest('[data-foe]'); if (!b) return;
  barge.pick = bargeAdd(barge.pick, b.dataset.foe, Number(b.dataset.d)); sfx.click(); renderBarge(); save(); });
$('bargeGo').addEventListener('click', () => startBarge());
/** Onto the barge with the fight picked; or, a fight won, straight into another. */
function startBarge(){ audio(); if (barge.where === 'sea'){ startSea(); return; } if (!bargeTotal(barge.pick)) return;
  const again = tower === BARGE && bargeWon;
  if (!again && !bargeCan()){ sfx.denied(); toasts.clear(); toast(spear ? 'Not now: finish what you are doing first.' : 'You need a spear to fight: the shipwright sells one.', 2600, 2); return; }
  closeBarge(); const room = ARENAS[barge.size];
  if (!again){ bargeFrom = {aboard: walker.aboard, dock: walker.dock, x: walker.x, y: walker.y}; BARGE.dock = walker.dock; BARGE.door = {x: walker.x, y: walker.y};
    // From the boat the camera would drift over from it: straight onto the barge instead.
    if (walker.aboard){ boat.v = 0; walker.landIn(BARGE_DOCK, walker.x, walker.y); walkView = 1; } }
  resetTowers(); towerWon = false; bargeWon = false; BARGE.first = room;
  tower = BARGE; toRoom(room); fillBarge(room); hearts = maxHearts(); hudHearts(); sfx.portal(); shake = Math.max(shake, .3); toasts.clear();
  toast(`The Battle Barge! ${bargeTotal(barge.pick)} to beat. Fight!`, 2600, 2); }
/** The picked enemies, at their places round the back of the arena. */
function fillBarge(room){ const R = ROOMS[room], spots = arenaSpots(bargeTotal(barge.pick), R.r).map(s => ({x: R.x + s.x, y: R.y + s.y})); let k = 0;
  const at = {}; for (const kind of BARGE_FOES) at[kind] = spots.slice(k, k += barge.pick[kind]);
  hordes[room].spawns = UNDEAD_FOES.flatMap(kind => at[kind].map(s => ({kind, ...s}))); hordes[room].reset();
  for (const look of ['monkey', 'hired']){ const c = bargeCamps[room][look]; c.n = barge.pick[look]; c.throwers = Math.floor(c.n / 2); c.reset();
    c.list.forEach((m, i) => { const s = at[look][i]; m.x = m.tx = s.x; m.y = m.ty = s.y; }); }
  bargeGorillas.place(at.gorilla.map(s => [s.x, s.y])); bargeGorillas.wake();
  bargeGators.place(at.gator.map(s => ({...s, r: 0}))); bargeGators.loose();
  bargeLancers.place(at.lancer, R); bargeLancers.wake();
  bargeFighters = FIGHTER_FOES.flatMap(kind => at[kind].map(s => bargeFighter(kind, room, s)));
  for (const kind of BOSS_FOES) bargeBoss[kind] = at[kind].map(s => bargeBossAt(kind, room, s)); }
/** Won once every one of them is beaten. */
function bargeCheck(){ if (tower !== BARGE || bargeWon) return; const room = BARGE.first, h = hordes[room];
  const standing = (s) => s !== 'fall' && s !== 'gone';
  if (h.list.some(u => u.state !== 'fall' && u.state !== 'gone') || Object.values(bargeCamps[room]).some(c => c.n > 0 && !c.cleared) || bargeCamps[room].imps.list.some(m => m.state === 'idle' || m.state === 'chase')) return;
  if ([...bargeGorillas.list, ...bargeGators.list, ...bargeLancers.list].some(u => standing(u.state)) || bargeFighters.some(f => f.state !== 'gone')) return;
  if (bargeBosses().some(b => !BOSS_DOWN.includes(b.state))) return;
  bargeWon = true; bargeWins++; coins += BARGE_PRIZE; earned += BARGE_PRIZE; hearts = maxHearts(); hudHearts(); sfx.tierUp(); shake = Math.max(shake, .6);
  addText(walker.x, walker.y, 50, '+' + BARGE_PRIZE, C.coin, 24, 2.2); toasts.clear();
  toast(`You beat them all! +${BARGE_PRIZE} coin. Leave the barge, or tap the crossed swords for another fight.`, 4200, 2); hud(); refreshShop(); save(); }
/** Off the barge, back where the figure was: aboard, or on the spot ashore. */
function endBarge(out){ const from = bargeFrom; bargeFrom = null; leaveTower(false);
  if (from && from.aboard){ walker.knockOut(); walker.dock = from.dock; walkView = 0; cam.x = boat.x; cam.y = boat.y; }
  else if (from){ walker.x = from.x; walker.y = from.y; walker.vx = walker.vy = 0; cam.x = walker.x; cam.y = walker.y; }
  sfx.portal(); toasts.clear(); toast(out ? 'Bonked out! Off the Battle Barge, and back where you were. Nothing lost.' : 'Off the Battle Barge, and back where you were.', 3000, 1); }
/** Whether a sea fight can start from here, now: aboard and under way, with the harpoon. */
function seaCan(){ return started && hasHarpoon() && !seaFight && walker.state === 'aboard' && !docked && floor < 0 && !diving && !icing && !cine && swallowT <= 0 && !kingDying() && !deep.holding; }
/** Out to the ring with the sea bosses picked, the boat at its front heading in; or, a fight won, straight into another. */
function startSea(){ if (!seaTotal(barge.sea) && !seaIsleFoes()) return;
  const again = !!seaFight && seaWon;
  if (!again && !seaCan()){ sfx.denied(); toasts.clear();
    toast(!hasHarpoon() ? 'You need the harpoon to fight at sea: the shipwright sells it.' : walker.state !== 'aboard' ? 'Get aboard your boat first: at sea you fight from it.' : docked ? 'Cast off first: at sea you fight from your boat, out on the water.' : 'Not now: finish what you are doing first.', 2600, 2); return; }
  closeBarge(); if (!again){ seaFight = {x: boat.x, y: boat.y, h: boat.h}; document.body.classList.add('seafight'); }
  if (!walker.aboard) walker.reset();
  seaFight.r = SEA_RING[barge.size]; seaWon = false; seaSpaceTold = false; seaLevTold = false; seaHideTold = false;
  const st = seaStart(seaFight.r); stowSeine(); boat.x = SEA_ARENA.x + st.x; boat.y = SEA_ARENA.y + st.y; boat.h = st.h; boat.v = 0; resetNet();
  wasDeep = wasFar = wasFarFar = true; cam.x = boat.x; cam.y = boat.y; seaCam.x = seaCam.y = 0; seaCam.k = SEA_ZOOM_MAX; irisT = SPIT; hp = HP_MAX; hudHull();
  const R = seaFight.r, spots = seaSpotsClear(seaSpots(seaTotal(barge.sea), R), seaBlocks(), R).map(p => ({x: SEA_ARENA.x + p.x, y: SEA_ARENA.y + p.y})); let k = 0;
  // The kid's map: his islands and his tar where he put them, at this ring's size; the bosses go in neither.
  seaFight.isles = barge.isles.map(i => ({x: SEA_ARENA.x + i.x*R, y: SEA_ARENA.y + i.y*R, r: SEA_ISLE_R*R, who: i.who}));
  seaReapers = seaFight.isles.filter(i => i.who === 'reaper').map(seaReaperOn);
  seaStars = seaFight.isles.filter(i => i.who === 'star').map(seaStarOn);
  seaFight.tar = barge.tar.map(t => ({x: SEA_ARENA.x + t.x*R, y: SEA_ARENA.y + t.y*R, r: SEA_TAR_R*R}));
  // His bridges, each a short span with a dock on its near side where the boat ties up and the figure steps off.
  seaFight.bridges = barge.bridges.map(b => { const at = {x: SEA_ARENA.x + b.x*R, y: SEA_ARENA.y + b.y*R, half: SEA_BRIDGE_HALF*R}, land = bridgeLanding(at);
    return {...at, walls: bridgeWalls(at), dock: {x: land.x, y: land.y, r: 0, berth: (k) => bridgeBerth(at, k), landing: land, bridge: true}}; });
  const round = (c) => ({ax: c.x, ay: c.y, bx: c.x, by: c.y, r: c.r});
  seaFight.solid = [...seaFight.isles.map(round), ...seaFight.bridges.flatMap(b => b.walls)];
  seaFight.walls = [...seaFight.solid, ...seaFight.tar.map(round)];
  // Ashore, the figure walks the islands' sand, round their palms, and the bridges.
  const bridges = seaFight.bridges, isles = seaFight.isles, palms = isles.flatMap(seaIslePalms);
  const onIsle = (x, y) => isles.some(i => Math.hypot(x - i.x, y - i.y) < i.r - 12) && !palms.some(p => Math.hypot(x - p.x, y - p.y) < 8);
  setWalkLand(bridges.length || isles.length ? {on: (x, y) => onIsle(x, y) || bridges.some(b => onSeaBridge(b, x, y)), z: (x, y) => { const b = bridges.find(b => onSeaBridge(b, x, y)); return b ? seaBridgeZ(b, x, y) : 0; }} : null);
  for (const kind of SEA_FOES) seaBoss[kind] = spots.slice(k, k += barge.sea[kind]).map(p => seaBossAt(kind, p));
  sfx.portal(); shake = Math.max(shake, .3); toasts.clear(); const ashore = seaReapers.length + seaStars.length;
  toast(`The Battle Barge, at sea! ${seaTotal(barge.sea) + ashore} to beat. ${!seaTotal(barge.sea) ? 'Go ashore on your islands to fight them.' : ashore ? 'Harpoon them, and go ashore on your islands for the rest.' : 'Harpoon them!'}`, 2600, 2); }
/** How many of the kid's islands have someone on them. */
const seaIsleFoes = () => barge.isles.filter(i => i.who).length;
/** Back where the boat was, its hull mended and its catch kept: left, or sunk. */
function endSea(sunk){ const from = seaFight; if (!from) return; seaFight = null; seaWon = false; document.body.classList.remove('seafight'); for (const k of SEA_FOES) seaBoss[k] = []; seaReapers = []; seaStars = [];
  // Off a bridge, the figure is back aboard with the boat; and the bridges are gone.
  if (!walker.aboard) walker.reset(); setWalkLand(null);
  swallowT = 0; hp = HP_MAX; boat.x = from.x; boat.y = from.y; boat.h = from.h; boat.v = 0; resetNet(); net.torn = 0;
  wasDeep = pastBuoys(boat.x, boat.y); wasFar = pastFar(boat.x, boat.y); wasFarFar = pastFarFar(boat.x, boat.y); cam.x = boat.x; cam.y = boat.y; seaCam.x = seaCam.y = 0; irisT = SPIT; hudHull();
  sfx.portal(); toasts.clear(); toast(sunk ? 'Sunk! Off the Battle Barge, and back where you were. The boat is fine, and nothing is lost.' : 'Off the Battle Barge, and back where you were.', 3000, 1); hud(); save(); }
// The Boats card, the kid's: who rides which craft of the flotilla. Tap a friend under a boat to put him on it; one who
// already had a boat swaps with whoever was on this one. Nobody sends a rider back to the deck. Only friends you have
// are offered, and the swan once Caterman, whose it is, is with you; it has two seats, side by side.
const CRAFT_NAMES = {airboat: ['Airboat', 'A giant fan on the back. It tows the banana boat.'], catamaran: ['Catamaran', 'Two little hulls and a striped sail.'],
  windsurf: ['Windsurfer', 'A board and a pink sail. Stand up and hold on!'], banana: ['Banana boat', 'A giant yellow banana, towed by the airboat. Hold on tight!'],
  swan: ['Swan paddle boat', "Caterman's big white swan, for two. Pedal together!"]};
const RIDER_NAMES = {warrior: 'Warrior', bones: 'Skeleton', necro: 'Necromancer', tarling: 'Tarling', caterman: 'Caterman'};
const SEAT_NAMES = {swan: 'Right seat', swan2: 'Left seat'};
function renderBoats(){ const riders = RIDERS.filter(r => flotilla.free(r));
  const chips = (s) => { const who = riders.includes(crew[s]) ? crew[s] : null;
    return `<div class="bchips">${riders.map(r => `<button class="rchip${who === r ? ' on' : ''}" data-craft="${s}" data-rider="${r}">${RIDER_NAMES[r]}</button>`).join('')}`
      + `<button class="rchip${who ? '' : ' on'}" data-craft="${s}" data-rider="">Nobody</button></div>`; };
  $('boatsList').innerHTML = CRAFTS.filter(k => k !== 'swan' || catermanFree).map(k => { const [n, d] = CRAFT_NAMES[k], seats = seatsOf(k);
    return `<div class="boat"><b>${n}</b><small>${d}</small>${seats.length > 1 ? seats.map(s => `<small class="seat">${SEAT_NAMES[s]}</small>${chips(s)}`).join('') : chips(k)}</div>`; }).join(''); }
$('boatsBtn').addEventListener('click', () => { audio(); sfx.click(); renderBoats(); $('boats').hidden = false; });
$('boatsClose').addEventListener('click', () => { sfx.click(); $('boats').hidden = true; });
$('boatsList').addEventListener('click', (e) => { const b = e.target.closest('[data-craft]'); if (!b) return;
  flotilla.assign(b.dataset.craft, b.dataset.rider || null); sfx.click(); renderBoats(); save(); });
// The Badges card, the kid's: who wears which badge (data/badges.ts). Tap a friend under a badge to pin it on them;
// a friend wears one badge, so pinning a second on them takes the first off. Only friends you have are offered.
const WEARER = {warlock, cat, warrior, bones: bonesPal, naga, necro: necroPal, baby, caterman};
const WEARER_NAMES = {warlock: 'Warlock', cat: 'Cat', warrior: 'Warrior', bones: 'Skeleton', naga: 'Naga', necro: 'Necromancer', baby: 'Baby Reaper', caterman: 'Caterman'};
const BADGE_SVG = {shield: '<svg class="pin" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9.5" fill="#4FA8FF" stroke="#fff" stroke-width="2"/><path d="M6.5 6.5h9l-.3 4.5c-.6 3-2.4 4.4-4.2 5.4-1.8-1-3.6-2.4-4.2-5.4z" fill="#fff"/></svg>',
  damage: '<svg class="pin" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9.5" fill="#E5483B" stroke="#fff" stroke-width="2"/><path d="M6.5 15.5l9-9M6.3 11.2l4.5 4.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
  heal: '<svg class="pin" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="9.5" fill="#3FB37A" stroke="#fff" stroke-width="2"/><path d="M11 6v10M6 11h10" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>'};
// How tall each friend stands, for its badge over its head and its shield round it.
const WEAR_TALL = {warlock: 30, cat: 14, warrior: 30, bones: 30, naga: 30, necro: 32, baby: 22, caterman: 36};
function friends(){ return Object.keys(WEARER).filter(k => WEARER[k].free); }
// Each friend carries the badge pinned on it, its shield at the badge's level.
function wearBadges(){ for (const k of Object.keys(WEARER)) WEARER[k].worn.wear(wornBy(badges, k), badges.shield); }
wearBadges();
function badgeName(k){ return k === 'shield' && badges.shield >= 2 ? SHIELD_UP.name : BADGES[k].name; }
function renderBadges(){ const who = friends();
  $('badgesList').innerHTML = BADGE_KINDS.filter(k => owned(badges, k)).map(k => { const on = who.includes(badges.on[k]) ? badges.on[k] : null;
    return `<div class="boat"><b>${BADGE_SVG[k]}${badgeName(k)}</b><small>${k === 'shield' && badges.shield >= 2 ? SHIELD_UP.blurb : BADGES[k].blurb}</small><div class="bchips">${who.map(r => `<button class="rchip${on === r ? ' on' : ''}" data-badge="${k}" data-wearer="${r}">${WEARER_NAMES[r]}</button>`).join('')}`
      + `<button class="rchip${on ? '' : ' on'}" data-badge="${k}" data-wearer="">Nobody</button></div></div>`; }).join(''); }
$('badgesBtn').addEventListener('click', () => { audio(); sfx.click(); renderBadges(); $('badges').hidden = false; });
// Choose your character, the kid's: the old figure (Skipper) or one of his three, named by us, or your own, made of a
// skin, hair, a hat and a face; and the Honor Guard armour to wear as a look. The figure turns slowly on the card.
const charPreview = new Walker(); let charOpen = false;
function drawCharPreview(){ const el = $('charPreview'), c2 = el.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), w = el.clientWidth || 150, h = el.clientHeight || 170;
  if (el.width !== Math.round(w*dpr) || el.height !== Math.round(h*dpr)){ el.width = Math.round(w*dpr); el.height = Math.round(h*dpr); }
  c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, w, h);
  const p = charPreview, Zp = 3.4, x0 = p.x, y0 = p.y, cx = w/2, cy = h*.86, T0 = performance.now()/1000;
  const pxp = (x, y) => (x - y - (x0 - y0))*ISO_K*Zp + cx, pyp = (x, y, z = 0) => ((x + y) - (x0 + y0))*ISO_K*.5*Zp - z*Zp + cy;
  const v = {...drawView, ctx: c2, zoom: Zp, dark: 0, T: T0, px: pxp, py: pyp, onScreen: () => true, glow(){}, light(){},
    isoEllipse: (x, y, r, z = 0) => { c2.beginPath(); c2.ellipse(pxp(x, y), pyp(x, y, z), r*Zp, r*Zp/2, 0, 0, Math.PI*2); } };
  p.z = 0; p.look = charLook; p.shirt = PAINTS[paint].hull; p.armed = spear > 0; p.knife = hasKnife(armour);
  p.armour = wornArmour(charLook, ARMOURS[HONOR_GUARD - 1].look, armourAt(armour)?.look ?? null);
  p.h = Math.PI/4 + Math.sin(T0*.9)*1.25;
  p.drawPortrait(v);
  if (charOpen) requestAnimationFrame(drawCharPreview); }
function renderChar(){ const cur = presetOf(charLook);
  $('charName').textContent = cur ? PRESETS.find(p => p.id === cur).name : 'Your own';
  $('charPresets').innerHTML = PRESETS.map(p => `<button class="rchip${cur === p.id ? ' on' : ''}" data-preset="${p.id}">${p.name}</button>`).join('')
    + `<button class="rchip${cur ? '' : ' on'}" data-preset="">Your own</button>`;
  const row = (label, key, opts) => `<div class="crow"><small>${label}</small><div class="bchips">${opts.map(([k, name]) => `<button class="rchip${charLook[key] === k ? ' on' : ''}" data-key="${key}" data-val="${k}">${name}</button>`).join('')}</div></div>`;
  const swatches = (label, key, cols) => `<div class="crow"><small>${label}</small><div class="bchips">${cols.map((c, i) => `<button class="swatch${charLook[key] === i ? ' on' : ''}" data-key="${key}" data-val="${i}" style="background:${typeof c === 'string' ? c : c[0]}" aria-label="${label} ${i + 1}"></button>`).join('')}</div></div>`;
  $('charOptions').innerHTML = swatches('Skin', 'skin', SKINS) + row('Hair', 'hair', HAIRS) + swatches('Hair colour', 'hairColour', HAIR_COLOURS)
    + row('Hat', 'hat', HATS) + swatches('Hat colour', 'hatColour', HAT_COLOURS) + row('Face', 'face', FACES)
    // The armour from the shipwright, shown over the look or hidden so the look shows; its hearts stay either way.
    + (armourAt(armour) ? `<div class="crow"><small>Your armour (${armourAt(armour).name}): hidden, its hearts still count</small><div class="bchips">`
      + `<button class="rchip${charLook.hideArmour ? '' : ' on'}" data-key="hideArmour" data-val="">Show it</button><button class="rchip${charLook.hideArmour ? ' on' : ''}" data-key="hideArmour" data-val="1">Hide it</button></div></div>` : '')
    + `<div class="crow"><small>Honor Guard armour, to look at</small><div class="bchips"><button class="rchip${charLook.honorGuard ? ' on' : ''}" data-key="honorGuard" data-val="${charLook.honorGuard ? '' : '1'}">${charLook.honorGuard ? 'Wearing it' : 'Wear it'}</button></div></div>`; }
function openChar(){ audio(); sfx.click(); renderChar(); $('charCard').hidden = false; if (!charOpen){ charOpen = true; requestAnimationFrame(drawCharPreview); } }
function closeChar(){ sfx.click(); $('charCard').hidden = true; charOpen = false; }
$('charBtn').addEventListener('click', openChar);
$('charIntro').addEventListener('click', openChar);
$('charClose').addEventListener('click', closeChar);
$('charCard').addEventListener('click', (e) => { const b = e.target.closest('[data-preset], [data-key]'); if (!b) return;
  if (b.dataset.preset !== undefined){ const p = PRESETS.find(q => q.id === b.dataset.preset); if (p) charLook = {...p.look, hideArmour: charLook.hideArmour}; }
  else { const k = b.dataset.key, val = b.dataset.val;
    charLook = {...charLook, [k]: k === 'honorGuard' || k === 'hideArmour' ? val === '1' : ['skin', 'hairColour', 'hatColour'].includes(k) ? +val : val}; }
  sfx.click(); renderChar(); save(); });

$('badgesClose').addEventListener('click', () => { sfx.click(); $('badges').hidden = true; });
$('badgesList').addEventListener('click', (e) => { const b = e.target.closest('[data-badge]'); if (!b) return;
  pin(badges, b.dataset.badge, b.dataset.wearer || null); wearBadges(); sfx.click(); renderBadges(); save(); });
// A badge just bought goes on the first friend without one, if there is one.
function pinNew(k){ const free = friends().find(w => !wornBy(badges, w)); if (free) pin(badges, k, free); wearBadges(); return free ? WEARER_NAMES[free] : null; }
$('testerSteps').addEventListener('click', (e) => { const b = e.target.closest('[data-step]'); if (!b) return;
  const s = story(), hadOld = isle7Stage >= 4; skipTo(s, +b.dataset.step);
  // Cutscenes are the kid's favourite part: a skip never skips one. The tar monster's plays the next time the boat is
  // out (the step leaves island 3 at stage 3); the Old One's, the next time the figure goes into the ruins.
  if (!hadOld && s.isle7Stage >= 4) oldOwed = true;
  ({isle3Seen, isle3Stage, isle4Stage, isle5Seen, isle5Stage, isle6Seen, isle6Stage, isle7Seen, isle7Stage, soulArmour, isle8Seen, heronStage} = s);
  save(); location.reload(); });
$('testerExtras').addEventListener('click', (e) => { const b = e.target.closest('[data-extra]'); if (!b) return; const k = b.dataset.extra;
  if (k === 'coins'){ coins += 10000; hud(); }
  else if (k === 'wood'){ wood += 100; hudWood(); }
  else if (k === 'unfog') sailAll(sailed);
  else if (k === 'kit'){ driven.reaper = Math.max(1, driven.reaper); reaperSeen = true; }
  else if (k === 'egg'){ if (reaperEgg < 1) reaperRematch = true; if (reaperEgg < 2){ reaperEgg = 2; eggDay = day; } reaperLandSeen = true; }
  else if (k === 'hatch'){ if (reaperEgg < 1) reaperRematch = true; if (reaperEgg < 3){ reaperEgg = 2; eggDay = 0; } reaperLandSeen = true; }
  else if (k === 'reaperland'){ if (reaperEgg >= 1){ reaperRematch = true; landReaper.rematch(); } }
  else if (k === 'finder'){ gear.radar = true; finder = true; }
  else if (k === 'sub') sub = true;
  else if (k === 'badges'){ badges.shield = 2; badges.damage = badges.heal = true; for (const b of BADGE_KINDS) if (!badges.on[b]) pinNew(b); wearBadges(); }
  else if (k === 'crows'){ pelicanBeaten = true; feederFull = true; crowsOwned = CROWS; crows.clear(); }
  else if (k === 'bread'){ pelicanBeaten = true; if (!feederFull) bread = Math.max(bread, 1); }
  else if (k === 'otter') otter.set(OTTER_FEEDS);
  else if (k === 'neil'){ neil.set(NEIL_FEEDS); iceSeen = true; }
  else if (k === 'naga') nagaFree = true;
  else if (k === 'junk'){ junk = JUNK_MAX; hudJunk(); }
  else if (k === 'stale'){ if (muffins.length >= MUFFIN_BOX) muffins.shift(); muffins.unshift(day + clock - LEGS_AFTER + 4/DAY_LEN); hudJunk(); }
  else if (k === 'leggy'){ while (leggy.count < LEGGY_MAX) leggy.sprout(walker.x, walker.y); }
  else if (k === 'mend'){ hp = HP_MAX; hearts = maxHearts(); hudHull(); hudHearts(); }
  else if (k === 'snacks'){ for (const s of SNACK_KINDS) snacks[s] = Math.max(snacks[s], 3); bugSpray = Math.max(bugSpray, 12); honey = Math.max(honey, 3); hudSnacks(); }
  sfx.upgrade(); save(); refreshShop();
  // Down here the toasts are hidden behind the panel, so the button itself says it worked.
  const tk = b.querySelector('.tk'); if (tk) tk.textContent = 'Added \u2713'; b.classList.add('added');
  setTimeout(renderExtras, 1400); });
// Your game on another device, for the owner's dad: no accounts, so the game travels in a link, #game=… on the end,
// the save squeezed small. Opened, it asks before it takes the place of the game here. The panel copies the link,
// and takes one pasted in, for a phone's home-screen game, which keeps a game of its own and opens no links.
const elCarry = $('carry'), elAsk = $('carryAsk'), elCarryLink = $('carryLink'), elCarryIn = $('carryIn');
let carryJson = null;
function here(){ return gameSummary({isle3Seen, isle3Stage, isle4Stage, isle5Seen, isle5Stage, isle6Seen, isle6Stage, isle7Seen, isle7Stage, soulArmour, isle8Seen, heronStage, day, coins}); }
async function openCarry(){ audio(); sfx.click(); save(); elCarryIn.value = ''; elCarryLink.value = ''; elCarry.hidden = false;
  let json = null; try { json = localStorage.getItem(SAVE_KEY); } catch (e) {}
  elCarryLink.value = json ? gameLink(location.href, await packGame(json)) : 'This browser is not keeping the game, so there is nothing to copy.';
  $('codeOut').value = saveCode; $('cloudSay').textContent = cloudSay(); carryNote(''); }
// What came of a code or a link typed in, under the box: a toast would be behind the card.
function carryNote(msg){ const el = $('carryNote'); el.textContent = msg; el.hidden = !msg; }
// How the copy online is doing, in a line.
function cloudSay(){ const m = Math.round((Date.now() - cloudSavedAt) / 60000);
  return cloudState === 'saved' ? `Saved online ${m < 2 ? 'just now' : m < 60 ? `${m} minutes ago` : 'a while ago'}.`
    : cloudState === 'behind' ? 'This game has been played on further on another device. Load it here with the code, or play on to catch up.'
    : cloudState === 'down' ? 'The online save cannot be reached just now. It keeps trying, and the game is safe on this device.'
    : 'It goes online within a minute of play.'; }
$('codeCopy').addEventListener('click', () => { const t = saveCode;
  const done = (ok) => { if (ok){ sfx.upgrade(); toast('Copied the save code.', 2400); } else { $('codeOut').focus(); $('codeOut').select(); toast('Hold on the code to copy it.', 2600); } };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(() => done(true), () => done(false)); else done(false); });
function carryCopied(ok){ if (ok){ sfx.upgrade(); toast('Copied. Open it on the other device.', 2600); }
  else { elCarryLink.focus(); elCarryLink.select(); toast('Hold on the link to copy it.', 2600); } }
$('carryBtn').addEventListener('click', openCarry);
$('carryClose').addEventListener('click', () => { sfx.click(); elCarry.hidden = true; });
$('carryCopy').addEventListener('click', () => { const t = elCarryLink.value; if (!t.includes('#')) return;
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(() => carryCopied(true), () => carryCopied(false)); else carryCopied(false); });
// On a phone, its share sheet: to a laptop, a message to yourself, AirDrop.
if (navigator.share) $('carrySend').hidden = false;
$('carrySend').addEventListener('click', () => { const t = elCarryLink.value; if (!t.includes('#')) return;
  navigator.share({title: 'Net Profit', text: 'My Net Profit game', url: t}).catch(() => {}); });
// A game from a link or the paste box: read it, and ask.
async function carryAsk(code){ const got = await unpackGame(code);
  if (!('json' in got) || !looksLikeSave(got.json)){
    const m = got.fault === 'old' ? 'This browser is too old to open that game link. Try another browser.' : 'That link has no game in it. Copy it again, all of it.';
    if (elCarry.hidden) toast(m, 4200); else carryNote(m); return; }
  askLoad(got.json, 'In the link'); }
// A game from somewhere, asked about before it takes the place of this one.
function askLoad(json, from){ carryJson = json; const d = parseSave(json, SAVE_BOUNDS);
  $('carryFrom').textContent = from; $('carryThere').textContent = gameSummary(d); $('carryHere').textContent = here();
  elCarry.hidden = true; elAsk.hidden = false; }
// A game by its save code, fetched from online.
async function loadByCode(c){ if (c === saveCode){ carryNote('That is this game\'s own code. Type it on the other device.'); return; }
  const got = await getGame(c);
  if (got === 'down'){ carryNote('The online saves cannot be reached just now. Try again in a bit, or use a link.'); return; }
  if (!got){ carryNote('No game is saved under that code. Check the four words.'); return; }
  const un = await unpackGame(got.game);
  if (!('json' in un) || !looksLikeSave(un.json)){ carryNote(un.fault === 'old' ? 'This browser is too old to open that game. Try another browser.' : 'That game would not open.'); return; }
  askLoad(un.json, 'Saved online under that code'); }
$('carryNo').addEventListener('click', () => { sfx.click(); carryJson = null; elAsk.hidden = true; });
$('carryYes').addEventListener('click', () => { if (!carryJson) return;
  try { localStorage.setItem(SAVE_KEY, carryJson); } catch (e) { toast('This browser will not keep a game, so it cannot load one.', 4200); return; }
  saveOff = true; location.reload(); });
$('carryLoad').addEventListener('click', () => { const t = elCarryIn.value.trim(), said = testerFromHash(t.slice(t.indexOf('#'))), byCode = readCode(t);
  if (byCode){ loadByCode(byCode); return; }
  if (t.includes('#') && said){ testerSay(said); elCarry.hidden = true; return; }
  const code = gameCode(t); if (!code){ carryNote('That is not a save code or a game link. A code is four words.'); return; }
  carryAsk(code); });
// The #… on the end of the link, read on load and again when it changes, since typing it onto a page already open
// does not reload it: #tester and #tester-off, and #game=…. Read, it is tidied away.
function onHash(){ const said = testerFromHash(location.hash), code = said ? null : gameCode(location.hash);
  if (said || code) history.replaceState(null, '', location.pathname + location.search);
  testerSay(said); if (code) carryAsk(code); }
onHash();
window.addEventListener('hashchange', onHash);
// A game already here goes online at once, its code made if it is from before codes, and kept.
{ let raw = null; try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {} if (raw) save(); }
// Installed as an app, it plays with no signal: the service worker keeps the page and its scripts (public/sw.js).
// Not in dev, where it would hold on to old code between edits.
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
// A new version, found while the game runs (state/update.ts). On a phone's home screen the app is paused in the background
// and comes back as the same page, so coming back to the front, and every quarter of an hour while playing, the game
// asks for its page again. A newer one: on the title screen it simply loads; mid-trip the shop offers it at the next
// dock, so nothing is cut short at sea.
const RUNNING = document.querySelector('script[type="module"][src*="assets/"]')?.getAttribute('src') ?? '';
let updateAt = 0;
async function checkForUpdate(force = false){ if (!import.meta.env.PROD || updateReady || !RUNNING) return false;
  if (!force && Date.now() - updateAt < 60000) return false; updateAt = Date.now();
  try { const res = await fetch('./', {cache: 'no-store'}); if (!res.ok || !isNewVersion(await res.text(), RUNNING, location.href)) return false; }
  catch { return false; }
  updateReady = true;
  if (!started){ location.reload(); return true; }
  toast('A new version of the game is ready. Tie up at a dock to update.', 4200, 1); refreshShop(); return true; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkForUpdate(); });
setInterval(() => { if (document.visibilityState === 'visible') checkForUpdate(); }, 15 * 60 * 1000);
$('updateBtn').addEventListener('click', () => { save(); location.reload(); });
// The sea map, the kid's: the whole sea, fogged where the boat has not been. Open, the game waits.
const elMap = $('seamap'), elMapBtn = $('mapBtn'), mapCanvas = $('mapCanvas'), seaMap = new SeaMap();
let mapOpen = false;
function mapIsles(){ const green = '#EED9A4', leaf = '#6FB35A';
  return [{x: IX, y: IY, r: IR, name: 'Home', sand: green, top: leaf},
    {...ISLE2, name: isle2Seen ? 'Island 2' : null, sand: green, top: leaf},
    {...ISLE3, name: isle3Seen ? 'Island 3' : null, sand: '#C8AE80', top: '#8A6A44'},
    {...ISLE4, name: isle3Stage >= 4 ? 'Island 4' : null, sand: isle3Stage >= 4 ? '#2A2430' : green, top: isle3Stage >= 4 ? '#17131B' : leaf},
    {...ISLE5, name: isle5Seen ? 'Island 5' : null, sand: '#EDE6D3', top: '#CFC6B0'},
    {...ISLE6, name: isle6Seen ? 'Island 6' : null, sand: green, top: leaf},
    {...ISLE7, name: isle7Seen ? 'Island 7' : null, sand: green, top: '#7DAA55'},
    // The twins are close enough that one name serves both.
    {...ISLE8, name: isle8Seen ? 'Islands 8 & 9' : null, sand: green, top: leaf},
    {...ISLE9, name: null, sand: green, top: '#5E7F55'},
    {...ISLE10, name: isle10Seen ? 'Island 10' : null, sand: '#EED9A4', top: '#B5C46A'},
    // Island 10 is beside it on the map, its name under it, so island 11's goes over.
    {...ISLE11, name: isle11Seen ? 'Island 11' : null, sand: '#E8D29A', top: '#3F6E36', nameAbove: true},
    {x: ICE_FLOE.x, y: ICE_FLOE.y, r: ICE_FLOE.r, name: iceSeen ? 'Ice floe' : null, sand: '#8FC3D6', top: '#EEF8FC'}]; }
// The trench to dive, marked once it has been found, or once there is scuba gear to dive it with.
function mapMarks(){ return [...(trenchSeen || hasScuba() ? [{x: TRENCH.x, y: TRENCH.y, name: 'Trench: dive here'}] : []), ...(abyssSeen ? [{x: ABYSS.x, y: ABYSS.y, name: 'Abyss: 1,000 m down'}] : [])]; }
function drawMap(){ if (!mapOpen) return; const dpr = Math.min(2, window.devicePixelRatio || 1);
  // A square as big as fits: the planks' width, and the screen's height less the title and the note.
  const side = Math.max(120, Math.floor(Math.min(mapCanvas.parentElement.clientWidth - 20, window.innerHeight - 170)));
  if (mapCanvas.style.width !== side + 'px'){ mapCanvas.style.width = mapCanvas.style.height = side + 'px'; }
  const w = Math.round(side * dpr), h = w;
  if (mapCanvas.width !== w || mapCanvas.height !== h){ mapCanvas.width = w; mapCanvas.height = h; }
  seaMap.draw(mapCanvas.getContext('2d'), w, h, {sailed, boat, isles: mapIsles(), marks: mapMarks(), beasts: mapBeasts(), T: performance.now() / 1000, farFar: farFarOpen()}); }
function openMap(){ audio(); sfx.click(); mapOpen = true; elMap.hidden = false;
  const share = sailedShare(sailed, farFarOpen());
  $('mapNote').textContent = (share >= 1 ? 'No fog left: the whole sea is on the map.' : `You have sailed ${Math.max(1, Math.round(share * 100))}% of the sea. Fog is where you have not been yet.`)
    + (castleHQ ? ' Your observatory marks every leviathan in red.' : ''); drawMap(); }
function closeMap(){ mapOpen = false; elMap.hidden = true; sfx.click(); }
elMapBtn.addEventListener('click', openMap); $('mapPill').addEventListener('click', openMap); $('mapClose').addEventListener('click', closeMap);
elMap.addEventListener('click', e => { if (e.target === elMap) closeMap(); });
// Inside the aquarium, the kid's: the fish you have caught, to feed and play with. Open, the game waits.
const elTank = $('aquarium'), tankCanvas = $('tankCanvas'), tankView = new Tank();
let tankOpen = false, tankPress = null;
function tankSize(){ const dpr = Math.min(2, window.devicePixelRatio || 1);
  // From the window, not the planks, which grow to fit the canvas: the overlay's and the planks' padding, and the frame.
  const cw = Math.max(200, Math.floor(Math.min(window.innerWidth - 46, 534)));
  const ch = Math.max(180, Math.floor(Math.min(window.innerHeight - 190, cw * 1.15)));
  if (tankCanvas.style.width !== cw + 'px' || tankCanvas.style.height !== ch + 'px'){ tankCanvas.style.width = cw + 'px'; tankCanvas.style.height = ch + 'px'; }
  const w = Math.round(cw * dpr), h = Math.round(ch * dpr);
  if (tankCanvas.width !== w || tankCanvas.height !== h){ tankCanvas.width = w; tankCanvas.height = h; }
  tankView.resize(TANK_W * ch / cw); }
function drawTank(dt){ if (!tankOpen) return; tankSize();
  const ate = tankView.eaten; tankView.update(dt); if (tankView.eaten > ate) sfx.nibble();
  tankView.draw(tankCanvas.getContext('2d'), tankCanvas.width); }
function openTank(){ audio(); sfx.click(); tankOpen = true; elTank.hidden = false; tankSize();
  aquaKinds = tankKinds(SPECIES, log, lionCaught, snook.landed); tankView.stock(aquaKinds); const n = aquaKinds.length;
  $('tankNote').textContent = n ? `${n} kind${n === 1 ? '' : 's'} of fish. Tap the water to feed them. Hold a finger in the tank and they follow it. Tap a fish to see what it is.` : 'Empty for now. Every kind of fish you catch comes to live here.'; }
function closeTank(){ tankOpen = false; elTank.hidden = true; tankView.finger = null; tankPress = null; sfx.click(); }
function tankAt(e){ const r = tankCanvas.getBoundingClientRect(), c = tankCanvas; // inside its frame
  return [(e.clientX - r.left - c.clientLeft) / c.clientWidth * TANK_W, (e.clientY - r.top - c.clientTop) / c.clientHeight * tankView.h]; }
tankCanvas.addEventListener('pointerdown', e => { e.preventDefault(); const [x, y] = tankAt(e);
  try { tankCanvas.setPointerCapture(e.pointerId); } catch (_) {}
  tankPress = {x, y, t: performance.now(), moved: false}; tankView.finger = {x, y}; });
tankCanvas.addEventListener('pointermove', e => { if (!tankPress) return; const [x, y] = tankAt(e);
  if (Math.hypot(x - tankPress.x, y - tankPress.y) > 6) tankPress.moved = true; tankView.finger = {x, y}; });
function tankUp(e){ if (!tankPress) return; const p = tankPress; tankPress = null; tankView.finger = null;
  // A quick tap, not a hold: a fish's name, or food.
  if (e.type === 'pointerup' && !p.moved && performance.now() - p.t < 350){ if (tankView.tap(p.x, p.y)) sfx.click(); else sfx.plip(); } }
tankCanvas.addEventListener('pointerup', tankUp); tankCanvas.addEventListener('pointercancel', tankUp);
$('tankClose').addEventListener('click', closeTank);
elTank.addEventListener('click', e => { if (e.target === elTank) closeTank(); });
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
window.addEventListener('keydown', e => { if (e.key === 'Escape' && scope) closeScope(); if (e.key === 'Escape' && mapOpen) closeMap(); if (e.key === 'Escape' && tankOpen) closeTank(); if (e.key === 'Escape' && !elGuide.hidden) closeGuide(); if (e.key === 'Escape' && !elFlagger.hidden) closeFlagger(); });
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
  wood = 0; build = 0; carry = 0; hudWood(); levSeen = false; whaleSeen = false; mantaSeen = false; cthuluSeen = false; anglerSeen = false; petted = false; isle2Seen = false; isle3Seen = false; isle3Stage = 0; isle4Stage = 0; isle5Seen = false; isle5Stage = 0; isle6Seen = false; chests6 = 0; isle6Stage = 0; isle7Seen = false; soulArmour = false; isle7Stage = 0; portalOpen = 0; deep.state = 'sleep'; deep.reset(); cth.state = 'wait'; cth.reset(); king.state = 'wait'; king.reset(); anchorer.state = 'lurk'; anchorer.reset(); flag = null; gulperSeen = false; meteorSeen = false; reaperSeen = false; reaperLandSeen = false; reaperRematch = false; oldOwed = false; snacks = noSnacks(); bugSpray = 0; honey = 0; hiveDay = 0; pelicanBeaten = false; bread = 0; feederFull = false; crowsOwned = 0; crows.clear(); closeCrowCard(true); finder = false; sunkenDay = 0; sunkenFound = 0; sunkenListDay = -1; badges = noBadges(); wearBadges(); sub = false; subFound = noSubFound(); appleT = 0; carrotT = 0; reaperEgg = 0; eggDay = 0; Object.assign(crew, DEFAULT_CREW); junk = 0; muffins = []; leggy.count = 0; hudJunk(); hatchT = -1; baby.free = false; baby.state = 'away'; baby.swimming = false; landReaper.state = 'sleep'; landReaper.reset(); iceSeen = false; iceRuns = 0; if (icing) endIce(); reaper.state = 'roam'; reaper.reset(); lionSeen = false; lionCaught = 0; aquarium = false; bases = noBases(); pots = []; potHaul = 0; potTold = false; if (diving) endDive(true); trenchSeen = false; abyssSeen = false; abyssDown = false; remoroDay = 0; trenchDeep = 0; trenchLoot = 0; iceLoot = 0; pearlDay = 0; wreckChest = false; stormSeen = false; Object.assign(storm, new Storm()); stormE = 0; lurkerSeen = false; lurkerStung = 0; charter = null; charterOffer = null; chartersRun = 0; hudCharter(); if (tankOpen) closeTank(); nagaFree = false; nagaCage = 0; isle8Seen = false; isle10Seen = false; isle11Seen = false; catermanFree = false; catermanT = -1; skullKey = false; cryptWon = false; castleHQ = false; scanner = 0; scanned = []; saveCode = newCode(); codeTold = 0; cloudSent = ''; cloudOffered = false; barge = defaultBarge(); bargeWins = 0; caterman.free = false; caterman.state = 'away'; brother.reset(); guide.reset(); heronStage = 0; heronFled = false; charLook = {...SKIPPER}; otter.set(0); neil.set(0); radioDay = 0; coastGuard.reset(); neilTold = false; naga.free = false; naga.state = 'away'; necroPal.free = false; necroPal.state = 'away'; lionfish.reset(); stowSeine(); seineTold = false; mendT = 0; rod.stop(); rodAt = null; serpent.state = 'haunt'; serpent.reset(); spear = 0; armour = 0; sailed.fill(0); masks = 0; towerTaken = false; turtleSeen = false; turtleSwims = 0; Object.assign(driven, noDriven()); harpoonAt = 0; leaveTower(false); monkeys.reset(); monkeys7.reset(); hired8.reset(); hired9.reset(); hiredBoats.reset(); hearts = maxHearts(); shallows.reset(); hp = HP_MAX; swallowT = 0; pets.hint = true; Object.assign(gear, noGear()); Object.assign(snook, {casts:0, landed:0, kept:0, giant:0, best:0, firstDay:0}); fight = null; rareEntity.reset(); jellies.reset(); pets.reset(); clock = .13;
  pirateEntity.reset(); walker.reset();
  resetSchools(schools);
  save(); hud(); refreshShop(); toast('Started over.', 1400);
});
$('go').addEventListener('click', () => { audio(); started = true; $('intro').classList.add('gone'); sfx.castOff(); codeReminder(); });
// Once a week, the kid's yes: the game's save code, to write down. A new game waits its first week; a game from before
// codes hears it at once.
const CODE_EVERY = 7*24*3600e3;
function codeReminder(){ const now = Date.now();
  if (!codeTold && earned <= 0){ codeTold = now; save(); return; }
  if (now - codeTold < CODE_EVERY) return;
  codeTold = now; save(); setTimeout(() => toast(`Your save code is ${saveCode}. Write it down: type it into the game on any other device to carry on there.`, 7000, 1), 4500); }
sndLabel(); hud(); hudWood(); hudJunk(); hudPhase(); refreshShop(); drawOrder();
// A fishmonger who is open but has never asked picks now, rather than making a loaded save wait for dawn.
if (vendorsOpen(build).fishmonger && market === NO_PICK){ newMarket(); toast(`The fishmonger wants ${SPECIES[market].pl} today. Double pay.`, 3200); }
keysLabel();

/* ---------- game logic ---------- */
function addText(x,y,z,txt,color,size=18,life=1.2){ texts.push({x,y,z,txt,color,size,age:0,life}); }

function catchFish(f,sc){
  f.alive = false; f.resp = T + 8 + Math.random()*9 + sc.sp*1.5; sc.alive--;
  hold[sc.sp]++; holdTotal++; log[sc.sp]++; noteFirst(sc.sp);
  // After a storm, the fish boiling up out past the buoys count double.
  if (storm.phase === 'boil' && pastBuoys(sc.ax, sc.ay) && holdTotal < HOLD[lv.hold]){ hold[sc.sp]++; holdTotal++; log[sc.sp]++; addText(f.x, f.y, 20, 'x2', '#FFF3C4', 16, .9); }
  flies.push({x0:f.x, y0:f.y, z0:0, to:'boat', t:0, dur:.32, c:SPECIES[sc.sp].c, s:SPECIES[sc.sp].s});
  // Now and then, junk with it, for the muffin man: into the bucket on deck, not the hold. (A test can ask for it.)
  const jk = window.__npJunk && junk < JUNK_MAX ? window.__npJunk : junkWith(Math.random, junk);
  if (jk){ junk++; flies.push({x0:f.x, y0:f.y, z0:0, to:'boat', t:-.15, dur:.42, junk: jk}); addText(f.x, f.y, 24, JUNK_NAMES[jk], '#E3ECEF', 15, 1.4); hudJunk();
    if (junk === 1) toast(`${JUNK_NAMES[jk]} Junk goes in the bucket. The baker on the pier wants it.`, 3000); }
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
  flies.push({x0:boat.x, y0:boat.y, z0:12, to: dockHere === ISLE2_DOCK ? 'post' : dockHere === ISLE3_DOCK ? 'trader' : dockHere === ISLE6_DOCK ? 'post6' : dockHere === ISLE7_DOCK ? 'post7' : dockHere === ISLE8_DOCK ? 'post8' : dockHere === ISLE10_DOCK ? 'crates10' : dockHere === ISLE11_DOCK ? 'crates11' : to === 'fishmonger' ? 'stall' : to === 'smokehouse' ? 'smoke' : 'crate', t:0, dur: to === 'dock' ? .3 : .45, c:SPECIES[sp].c, s:SPECIES[sp].s});
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
    deepness: clamp(Math.max(-boat.x, boat.x-WS, -boat.y, boat.y-WS)/400, 0, 1), storm: stormE,
    shoreDist: Math.max(0, Math.min(toIsland, toPier)), gulls: storm.k > .2 && stormE > 0 ? [] : gulls,
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
$('mend').addEventListener('click', mendNet);
$('seineBtn').addEventListener('click', toggleSeine);
$('potBtn').addEventListener('click', tapPot);
$('diveBtn').addEventListener('click', startDive);
$('surfaceBtn').addEventListener('click', () => { audio(); diver.surface(); });
$('rodcast').addEventListener('click', useRod);
const elAshore = $('ashore'), elAboard = $('aboard'); let shopOpen = false, aboardShown = false;
let dockHere = HOME_DOCK; // the dock the boat is in, or was in last
const POST_MID = {x: (POST.x0+POST.x1)/2, y: (POST.y0+POST.y1)/2};
function saleSpot(){ return dockHere === ISLE2_DOCK ? POST_MID : dockHere === ISLE3_DOCK ? TRADER_MID : dockHere === ISLE6_DOCK ? POST6_MID : dockHere === ISLE7_DOCK ? POST7_MID : dockHere === ISLE8_DOCK ? POST8_MID : dockHere === ISLE10_DOCK ? CRATES10 : dockHere === ISLE11_DOCK ? CRATES11 : CRATE; }
elAshore.addEventListener('click', () => { audio(); if (walker.stepAshore(dockHere)) toasts.clear(); });
elAboard.addEventListener('click', () => { audio(); walker.goAboard(); });
const elThrow = $('throw'); let throwShown = null, throwWait = false;
const elClimb = $('climb'), elLeave = $('leave'); let climbShown = null, leaveShown = null;
elClimb.addEventListener('click', () => { audio(); const a = climbAction();
  if (a === 'tar'){ if (walker.stepAshore(tarDock(Math.atan2(boat.y - ISLE4.y, boat.x - ISLE4.x)))) toasts.clear(); return; }
  if (a === 'bridge'){ const d = seaDockNear(); if (d && walker.stepAshore(d)) toasts.clear(); return; }
  if (a === 'isle'){ const d = seaIsleNear(); if (d && walker.stepAshore(d)) toasts.clear(); return; }
  if (a === 'aquarium'){ openTank(); return; }
  if (a === 'temple'){ intoTemple(); return; }
  if (a === 'castle'){ intoCastle(); return; }
  if (a === 'oldplace'){ intoOldPlace(); return; }
  if (a === 'fgtour'){ startFgScene(); return; }
  if (a === 'scope'){ openScope(); return; }
  if (a === 'bed'){ sleepInCastle(); return; }
  if (a === 'skull'){ toRoom(CRYPT); if (hearts < maxHearts()){ hearts = maxHearts(); hudHearts(); } return; }
  if (a === 'door') enterTower(towerAtDoor());
  else if (a === 'dive') dive(); else if (a === 'portal') intoDemons();
  else if (a === 'stairs' || a === 'onward'){ toRoom(floor + 1); if (hearts < maxHearts()){ hearts = maxHearts(); hudHearts(); toast('You catch your breath on the stairs. Hearts full.', 2000); } } });
elLeave.addEventListener('click', () => { audio(); if (seaFight){ if (swallowT <= 0) endSea(false); return; } if (floor < 0) return;
  if (tower === BARGE){ endBarge(false); return; }
  // Island 7's tower beaten: down the stairs and out at its door, to see the portal wake.
  if (towerWon && tower && tower.boss === boss7){ leaveTower(); return; }
  if (tower === CASTLE){ leaveTower(); sfx.portal(); toast('Back through the portal to island 7.', 2400, 1); return; }
  if (tower === OLDPLACE){ leaveTower(); sfx.portal(); toast('Back through the old portal to island 11.', 2400, 1); return; }
  if (towerWon){ const depths = tower === DEPTHS, temple = tower === TEMPLE_DEEP; leaveTower(false); walker.knockOut(); toast(temple ? 'Back aboard. The Deep One is gone for good.' : depths ? 'Back aboard, and the warlock with you.' : 'Back aboard. The tower is yours.', 2400, 1); }
  else if (tower === DEPTHS){ leaveTower(); toast('Up through the gap in the seaweed.', 2200); }
  else if (tower === TEMPLE_DEEP){ leaveTower(); toast('Up out of the temple. It waits below.', 2200); }
  else { leaveTower(); toast('Out of the tower. Come back with more spears.', 2200); } });
// It throws on the press, not the click: on a phone the other thumb is on the stick, and an iPhone makes no click of a
// tap while another finger is down, so a diver swimming and throwing threw nothing. A click with no press behind it
// (the keyboard's, detail 0) still throws; a tap's own click after its press does not throw twice.
function throwNow(){ audio(); if (diving) diveThrow(); else if (walker.state === 'ashore') throwSpear(); else fireHarpoon(); }
elThrow.addEventListener('pointerdown', e => { if (e.button > 0) return; throwNow(); });
elThrow.addEventListener('click', e => { if (e.detail === 0) throwNow(); });
// The portable scanner, the Forgotten One's gift (data/scans.ts): it scans what the spear would aim at ashore, or what
// the harpoon would at sea, and says how to beat it and what it is afraid of. A beam out to it and back, then its
// blue screen, where the toasts go, until a tap or a while; each kind scanned is kept.
const elScan = $('scanBtn'), elScanOut = $('scanOut'); let scanShown = false, scanning = null, scanOutT = 0;
const SCAN_SHOW = 11;
// What kind of creature the spear's target is, by where it lives.
function scanKindOf(t){ if (!t) return null; const has = (c) => !!c && Array.isArray(c.list) && c.list.includes(t);
  for (const h of HORDES) if (h.list.includes(t)) return isScanKind(t.kind) ? t.kind : null;
  if (has(lancers) || has(bargeLancers)) return 'lancer';
  if (has(gorillas) || has(bargeGorillas)) return 'gorilla';
  if (has(gators) || has(bargeGators)) return 'gator';
  for (const c of [monkeys, monkeys7, hired8, hired9, ...camps, roofMonkeys, demonMonkeys, ...Object.values(bargeCamps[floor] || {})])
    if (has(c)) return c.look === 'hired' ? 'hiredman' : 'monkey';
  if (t === spider10 || bargeBoss.spider.includes(t)) return 'spider';
  if (t === pelican || bargeBoss.pelican.includes(t)) return 'pelican';
  if ([boss, boss3, boss7, ...bargeBoss.sorcerer].includes(t)) return 'sorcerer';
  if ([heron, heron9, ...bargeBoss.heron].some(h => h === t || h.targets().includes(t))) return 'heron';
  if (t === nest) return 'orb';
  if (t.spec && isScanKind(t.spec.look)) return t.spec.look;
  if (t === anchorer || bargeBoss.anchorer.includes(t)) return 'anchorer';
  if (t === landReaper || bargeBoss.reaper.includes(t) || seaReapers.includes(t)) return 'reaperland';
  if (seaStars.includes(t)) return 'meteor';
  if (t === cth || cth.tents.includes(t) || bargeBoss.cthulhu.some(c => c === t || c.tents.includes(t))) return 'cthulhu';
  if ([forgotten, forgotten2, ...bargeBoss.forgotten].includes(t)) return 'forgotten';
  if (t === oldOne || bargeBoss.oldone.includes(t)) return 'oldone';
  if (t === brother) return 'brother';
  return null; }
// What the scanner would scan now, if anything: the nearest beast in reach of the boat, or what the spear would aim at.
function scanTarget(){ if (scanner < 1 || !started || scanning || cine || fgScene || oldScene || mapOpen || wrapped()) return null;
  const far = scanner >= 2, egg = eggToScan();
  if (walker.aboard){ if (docked || swallowT > 0) return null; let best = null, bd = far ? SCAN_SEA_FAR : SCAN_SEA;
    for (const [k, e, m] of beasts()){ if (!m || !isScanKind(k)) continue; const d = Math.hypot(m.x - boat.x, m.y - boat.y); if (d < bd){ bd = d; best = {kind: k, x: m.x, y: m.y, z: BEAST_Z[k], obj: e}; } }
    return best || (egg && reaperEgg === 2 ? {kind: 'egg', ...eggSeat()} : null); }
  if (walker.state !== 'ashore') return null;
  const reach = weaponRange()*(far ? SCAN_REACH : 1), t = spearTarget(reach), kind = scanKindOf(t);
  if (kind) return {kind, x: t.x, y: t.y, z: 18, obj: t};
  return egg && reaperEgg < 2 && walker.dock === ISLE6_DOCK && floor < 0 && Math.hypot(walker.x - NEST6.x, walker.y - NEST6.y) <= Math.max(reach, 90) ? {kind: 'egg', x: NEST6.x, y: NEST6.y, z: 6} : null; }
// The Reaper's egg, to scan once the scanner scans eggs, until it has: it glows blue till then.
function eggToScan(){ return scanner >= SCAN_EGGS && reaperEgg < 3 && !scanned.includes('egg'); }
// Blue, not light: over the white cabin a lighter glow only goes white. A ring pulses out from it, so it reads small.
function eggGlow(sx, sy, r){ if (!eggToScan()) return; ctx.save();
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r), a = .5 + Math.sin(T*3)*.15;
  g.addColorStop(0, `rgba(40,170,255,${a})`); g.addColorStop(.6, `rgba(40,170,255,${a*.45})`); g.addColorStop(1, 'rgba(40,170,255,0)'); ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
  const k = (T*.8) % 1; ctx.strokeStyle = `rgba(127,224,255,${.9*(1 - k)})`; ctx.lineWidth = 2*Z;
  ctx.beginPath(); ctx.ellipse(sx, sy, r*(.5 + k*.7), r*(.5 + k*.7)*.6, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore(); }
function startScan(){ audio(); const s = scanTarget(); if (!s) return; scanning = {...s, t: 0}; sfx.zap(); }
function updateScan(dt){ if (scanOutT > 0){ scanOutT -= dt; if (scanOutT <= 0) hideScan(); }
  if (!scanning) return; scanning.t += dt; if (scanning.t >= SCAN_TIME){ const k = scanning.kind, o = scanning.obj; scanning = null; showScan(k, o); } }
function showScan(kind, obj){ const sc = SCANS[kind], fresh = !scanned.includes(kind), was = scanner;
  if (fresh){ scanned.push(kind); scanner = Math.max(scanner, scannerLevel(scanned.length)); save(); }
  // A better scanner shows how much fight is left in it: the harpoon's hits at sea, hit points on foot.
  const hp = was >= SCAN_HP && obj ? (typeof obj.resolve === 'number' ? ['Hits left', obj.resolve] : typeof obj.hp === 'number' ? ['Hit points', Math.ceil(obj.hp)] : null) : null;
  $('scanHpP').hidden = !hp; if (hp){ $('scanHpL').textContent = hp[0]; $('scanHp').textContent = String(Math.max(0, hp[1])); }
  $('scanUp').hidden = scanner === was; if (scanner !== was) $('scanUp').textContent = SCANNER_LEVELS[scanner - 1]?.said ?? '';
  $('scanName').textContent = sc.name; $('scanBeat').textContent = sc.beat;
  $('scanWeakP').hidden = !sc.weak; $('scanWeak').textContent = sc.weak || '';
  $('scanCount').textContent = `${fresh ? 'New! ' : ''}${scanned.length} kind${scanned.length === 1 ? '' : 's'} of creature scanned.`;
  elScanOut.hidden = false; document.body.classList.add('scanning'); scanOutT = SCAN_SHOW; sfx.upgrade(); }
function hideScan(){ elScanOut.hidden = true; document.body.classList.remove('scanning'); scanOutT = 0; }
elScan.addEventListener('pointerdown', e => { if (e.button > 0) return; startScan(); });
elScan.addEventListener('click', e => { if (e.detail === 0) startScan(); });
elScanOut.addEventListener('click', () => { sfx.click(); hideScan(); });
// The beam, dashed and running out to it, and rings spreading round it.
function drawScan(){ if (!scanning) return;
  const from = walker.aboard ? {x: boat.x, y: boat.y, z: 16} : {x: walker.x, y: walker.y, z: walker.z + 16};
  const fx = px(from.x, from.y), fy = py(from.x, from.y, from.z), tx = px(scanning.x, scanning.y), ty = py(scanning.x, scanning.y, scanning.z);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(127,224,255,.75)'; ctx.lineWidth = 2.6*Z; ctx.setLineDash([7*Z, 5*Z]); ctx.lineDashOffset = -T*70;
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]);
  for (let i=0;i<3;i++){ const u = (T*1.4 + i/3) % 1; ctx.strokeStyle = `rgba(127,224,255,${(1 - u)*.85})`; ctx.lineWidth = 2*Z;
    ctx.beginPath(); ctx.ellipse(tx, ty, (8 + u*34)*Z, (4 + u*17)*Z, 0, 0, Math.PI*2); ctx.stroke(); }
  ctx.restore(); }
window.addEventListener('keydown', e => { if (e.key !== ' ') return;
  if (diving){ e.preventDefault(); diveThrow(); }
  else if (walker.state === 'ashore'){ e.preventDefault(); throwSpear(); } else if (harpoonTarget()){ e.preventDefault(); fireHarpoon(); } });
// A tap, not a drag: ashore, a tap on the dog pats it, if the figure is near enough to reach.
let tapFrom = null;
cv.addEventListener('pointerdown', e => { tapFrom = {x: e.clientX, y: e.clientY, t: performance.now()}; });
cv.addEventListener('pointerup', e => { const q = tapFrom; tapFrom = null;
  if (!q || performance.now() - q.t > 350 || Math.hypot(e.clientX - q.x, e.clientY - q.y) > 12) return;
  if (walker.state === 'ashore' && spear > 0){ const sp = spearAt(spear);
    const f = shallows.fish.find(f => f.alive && Math.hypot(e.clientX - px(f.x, f.y), e.clientY - py(f.x, f.y)) < 30 && Math.hypot(f.x - walker.x, f.y - walker.y) <= sp.range);
    if (f){ throwSpear(f); return; } }
  { const o = otterAt(); if (o && Math.hypot(e.clientX - o[0], e.clientY - o[1]) < 28){ tapOtter(); return; } }
  { const n = neilAt(); if (n && Math.hypot(e.clientX - n[0], e.clientY - n[1]) < 32){ tapNeil(); return; } }
  { const c = catAt(); if (c && Math.hypot(e.clientX - c[0], e.clientY - c[1]) < 30){ tapCat(); return; } }
  { const b = babyAt(); if (b && Math.hypot(e.clientX - b[0], e.clientY - b[1]) < 30){ tapBaby(); return; } }
  // A tap right on a leggy muffin pokes it, even one trotting past the baker's counter.
  if (walker.state === 'ashore'){ let i = -1, best = 14;
    leggy.list.forEach((m, j) => { const d = Math.hypot(e.clientX - px(m.x, m.y), e.clientY - py(m.x, m.y, groundZ(m.x, m.y) + 9)); if (d < best){ best = d; i = j; } });
    if (i >= 0){ leggy.poke(i); sfx.squeak(); return; } }
  if (walker.state === 'ashore' && tapsBaker(e.clientX, e.clientY)){ talkToBaker(); return; }
  if (walker.state === 'ashore' && walker.dock === ISLE10_DOCK){ const o = oldManAt(); if (Math.hypot(e.clientX - o[0], e.clientY - o[1]) < 34){ talkToOldMan(); return; } }
  // A tap on a crow at the feeder asks it; on the feeder itself, fills it.
  if (walker.state === 'ashore' && walker.dock === ISLE10_DOCK){ let i = -1, best = 26;
    crows.list.forEach((c, j) => { if (c.state !== 'peck' && c.state !== 'hop' && c.state !== 'ask') return; const p = crowAt(j); const d = Math.hypot(e.clientX - p[0], e.clientY - p[1]); if (d < best){ best = d; i = j; } });
    if (i >= 0){ tapCrow(i); return; }
    const f = feederAt(); if (Math.hypot(e.clientX - f[0], e.clientY - f[1]) < 30){ tapFeeder(); return; }
    const hv = hiveAt(); if (Math.hypot(e.clientX - hv[0], e.clientY - hv[1]) < 30){ tapHive(); return; } }
  // On island 10, a tap on an animal: a bunny boings, a prairie dog squeaks and ducks, a bison snorts; in the swamp a
  // frog ribbits, a snake rears and hisses, a panther yawns, a cub rolls over, a deer bounds off, and the monster wakes
  // (its roar has its own sound and words).
  if (walker.state === 'ashore' && walker.dock === ISLE10_DOCK){ let hit = null, best = 1;
    for (const t of [...prairie10.targets(), ...swamp10.targets()]){ const d = Math.hypot(e.clientX - px(t.x, t.y), e.clientY - py(t.x, t.y, t.z)) / (t.k === 'monster' ? 44 : 26); if (d < best){ best = d; hit = t; } }
    if (hit && hit.k in PRAIRIE_SAY){ const [say, c, play] = PRAIRIE_SAY[hit.k]; prairie10.poke(hit.k, hit.i); play(); addText(hit.x, hit.y, hit.z + 14, say, c, 15, 1); return; }
    if (hit){ swamp10.poke(hit.k, hit.i); const said = SWAMP_SAY[hit.k]; if (said){ const [say, c, play] = said; play(); addText(hit.x, hit.y, hit.z + 14, say, c, 15, 1); } return; } }
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
  world.T = T; world.started = started && tower !== BARGE && !seaFight; world.docked = docked || !walker.aboard; // tied up at the tar's edge too, with nobody aboard
  /* input and boat: the stick points; the keys drive or point, by setting */
  updateCine(dt);
  if (fight || swallowT > 0 || cine || kingDying() || deep.holding || seaBoss.deep.some(d => d.holding)){ steerBoat(boat, 0, 0, SPEED[lv.engine], dt); }
  else if (!walker.aboard){ steerBoat(boat, 0, 0, SPEED[lv.engine], dt);
    // Ashore the stick walks, and the keys always point: driving a person by turning them reads as a tank.
    let ix = 0, iy = 0;
    if (joy.on){ const v = joystickVector(joy); ix = v[0]; iy = v[1]; }
    else { const v = keyVector(keys); smoothVector(keySmooth, v[0], v[1], dt); ix = keySmooth.x; iy = keySmooth.y; }
    if (oldScene || wrapped()){ ix = 0; iy = 0; }
    if (fgScene){ const v = fgFollow(); ix = v[0]; iy = v[1]; }
    walker.intent(ix, iy); }
  else if (started && !joy.on && keyMode === 'drive'){
    const c = keyControls(keys), sk = stormHandling(stormE, gear.ballast); steerBoatRelative(boat, c.turn, c.throttle, c.brake, SPEED[lv.engine]*sk.speed*seaTarK(), dt, sk.turn);
  } else {
    let ix = 0, iy = 0;
    if (started){
      if (joy.on){ const v = joystickVector(joy); ix = v[0]; iy = v[1]; }
      else { const v = keyVector(keys); smoothVector(keySmooth, v[0], v[1], dt); ix = keySmooth.x; iy = keySmooth.y; }
    }
    const sk = stormHandling(stormE, gear.ballast); steerBoat(boat, ix, iy, SPEED[lv.engine]*sk.speed*seaTarK(), dt, sk.turn);
  }
  const k = bk();
  pushOut(boat, IX, IY, IR+24*k);
  for (const b of PIER_BUMPS) pushOut(boat, b[0], b[1], 20+20*k);
  for (const b of BRIDGE_BUMPS) pushOut(boat, b[0], b[1], 18+20*k);
  pushOut(boat, BEACH.x, BEACH.y, BEACH.r+24*k);
  pushOut(boat, ISLE2.x, ISLE2.y, ISLE2.r+24*k);
  pushOffTown(boat, 4+20*k);
  pushOut(boat, ISLE5.x, ISLE5.y, ISLE5.r+24*k);
  pushOut(boat, ICE_FLOE.x, ICE_FLOE.y, FLOE_MAX+24*k);
  pushOffIsle6(boat, 24*k);
  pushOffIsle7(boat, 24*k);
  pushOffTwins(boat, 24*k);
  pushOffIsle10(boat, 24*k);
  pushOffIsle11(boat, 24*k);
  { const look = isle4Look(), r = Math.max(ISLE4.r, TAR_R*look.spread) + 24*k, d = Math.hypot(boat.x - ISLE4.x, boat.y - ISLE4.y); tarToastT -= dt;
    if (d < r){ pushOut(boat, ISLE4.x, ISLE4.y, r);
      if (look.spread >= 1 && tarToastT <= 0){ tarToastT = 9;
        toast(gear.suit ? 'Tar. No hull goes in, but you can: stop here and tap Into the tar.' : 'Tar! The water round island 4 is black and sticky. You need a chemistry suit: the shipwright sells one.', 3200, 1); } } }
  // The buoys hold every boat but the flagship, which goes on into the deep as far as the deep runs, and on into the far
  // deep once the anchor chain between the far buoys is gone.
  // Out at the Battle Barge at sea, its ring of buoys holds the boat instead.
  if (seaFight){ const dx = boat.x - SEA_ARENA.x, dy = boat.y - SEA_ARENA.y, d = Math.hypot(dx, dy), max = seaFight.r - 30*bk();
    if (d > max){ boat.x = SEA_ARENA.x + dx/d*max; boat.y = SEA_ARENA.y + dy/d*max; boat.v *= .9;
      if (rangeToastT <= 0){ rangeToastT = 9; toast('The Battle Barge\'s buoys: the fight is inside them. Leave the Battle Barge to go home.', 3000, 1); } }
    for (const c of seaFight.solid){ const i = capsuleNear(c, boat.x, boat.y); pushOut(boat, i.x, i.y, c.r + 24*bk()); } }
  else { const flag = tier() === TIER_NAME.length-1, m = seaEdge(flag, farOpen(), farFarOpen()), x0 = boat.x, y0 = boat.y;
    boat.x = clamp(boat.x, 40-m, WS-40+m); boat.y = clamp(boat.y, 40-m, WS-40+m);
    if ((boat.x !== x0 || boat.y !== y0) && rangeToastT <= 0){ rangeToastT = 9;
      toast(!m ? 'Only a flagship can cross the buoys.' : m > DEEP + FAR ? 'Nothing out here but water. For now.'
        : m > DEEP ? 'The far far buoys. Past them the sea goes on and on, and nobody knows where land is. Sailors used to take a bird along and let it go, because a bird flies for land. Island 10\'s crows might know the way.'
        : isle3Stage >= 4 ? 'An anchor chain runs between the far buoys, and nothing gets past it. Whatever holds the anchor is on the tar island.'
        : 'An anchor chain runs between the far buoys, and nothing gets past it. For now.', 3400, 1); sfx.rangeEdge(); } }
  { const far = pastFar(boat.x, boat.y); farToastT -= dt;
    if (far && !wasFar && farToastT <= 0){ farToastT = 60; toast(isle5Seen ? 'Past the far buoys, into the far deep. Marlin school at its corners.' : 'Past the far buoys, into the far deep. An island of bones is out here: follow the white marker. Marlin school at its corners.', 3600, 1); }
    wasFar = far; }
  { const ff = pastFarFar(boat.x, boat.y); farFarToastT -= dt;
    if (ff && !wasFarFar && farFarToastT <= 0){ farFarToastT = 60; toast(isle11Seen ? 'Past the far far buoys, into the far far sea. Island 11 is out here, past island 10.' : 'Past the far far buoys, into the far far sea. No land in sight, any way you look. Let a crow go: a crow flies for land.', 4200, 1); }
    wasFarFar = ff; }
  { const deep = pastBuoys(boat.x, boat.y); deepToastT -= dt;
    if (deep && !wasDeep && deepToastT <= 0){ deepToastT = 60; toast(!isle2Seen ? 'Past the buoys, into the deep. There is land out here: follow the green marker.' : !isle3Seen ? 'Past the buoys, into the deep. Another island is out here: follow the blue marker, up to the top of the map.' : 'Past the buoys, into the deep. Mahi-mahi school under the floating weed.', 3400, 1); }
    wasDeep = deep; }
  if (!isle2Seen && Math.hypot(boat.x-ISLE2.x, boat.y-ISLE2.y) < ISLE2.r + 700){ isle2Seen = true; save(); refreshShop();
    toast('Land ho: island 2. Parrotfish school round it, and the trading post buys your catch.' + (spear ? '' : ' The shipwright has a spear for its shallows now.'), 4600, 1); sfx.tierUp(); }
  if (!isle6Seen && Math.hypot(boat.x-ISLE6.x, boat.y-ISLE6.y) < ISLE6.r + SIGHT6){ isle6Seen = true; save(); refreshShop(); sfx.tierUp(); toasts.clear();
    toast('Island 6: the big island! A pier with a trading post, a rocky hill, and an old green temple half in the sea on its east side. Something big sleeps by it...', 5600, 2); }
  if (!isle7Seen && Math.hypot(boat.x-ISLE7.x, boat.y-ISLE7.y) < ISLE7.r + SIGHT7){ isle7Seen = true; save(); refreshShop(); sfx.tierUp(); toasts.clear();
    toast('Island 7! Monkeys again, and a tower again, with a purple light at the top. And something strange: a ring of grey metal, standing on burnt grass.', 5600, 2); }
  if (!isle8Seen && nearTwins(boat.x, boat.y, SIGHT8)){ isle8Seen = true; save(); refreshShop(); sfx.tierUp(); toasts.clear();
    toast('Islands 8 and 9! Twins, joined by a sandbar, with a tower on each. On top of the far one, in a great nest of sticks under a purple light, something huge is sitting...', 5800, 2); }
  if (!isle11Seen && nearIsle11(boat.x, boat.y, SIGHT11)){ isle11Seen = true; save(); refreshShop(); sfx.tierUp(); toasts.clear();
    toast('Land ho: island 11! A big island, all jungle, with black water in it and old grey stones among the trees.' + (guide.state === 'perch' ? ' Your crow is waiting on the beach, by the pier.' : ' There is a pier on the side toward home.'), 6000, 2); }
  if (!isle10Seen && nearIsle10(boat.x, boat.y, SIGHT10)){ isle10Seen = true; save(); refreshShop(); sfx.tierUp(); toasts.clear();
    toast('Island 10! A golden prairie with a pond in it, a dark forest on the far side, and a swamp, all steamy, on the right. Something is moving in the trees...', 5800, 2); }
  if (!isle5Seen && Math.hypot(boat.x-ISLE5.x, boat.y-ISLE5.y) < SIGHT5){ isle5Seen = true; save(); refreshShop(); sfx.cthuluWake(); toasts.clear();
    toast('Island 5: a reef of bleached bones, with a throne under a giant shark\'s jaw. Bone sharks circle it. Something bigger is down there...', 5200, 2); }
  if (!isle3Seen && Math.hypot(boat.x-ISLE3.x, boat.y-ISLE3.y) < ISLE3.r + 700){ isle3Seen = true; save(); refreshShop();
    toast('Island 3 sank long ago: its old town lies under the water. Only its tower and a floating town are left up top. Grouper school over the ruins.', 5200, 1); sfx.tierUp(); }
  { const R = range(), dI = Math.hypot(boat.x-IX, boat.y-IY); rangeToastT -= dt;
    if (dI > R && !seaFight){ boat.x = IX + (boat.x-IX)/dI*R; boat.y = IY + (boat.y-IY)/dI*R; boat.v *= .93;
      if (rangeToastT <= 0){ rangeToastT = 9; toast(`Too rough out there for a ${TIER_NAME[tier()]}. Grow your boat to sail further.`, 2800, 1); sfx.rangeEdge(); } } }

  /* net tows behind like a trailer */
  towNet(net, boat, k, towLen(), dt);

  /* fish */
  const cap = HOLD[lv.hold], nw = NETW[lv.net];
  net.torn = Math.max(0, net.torn - dt);
  const catching = started && net.speed > 22 && net.torn <= 0 && !seine.out; // the towed net is lifted while the seine is out
  comboT -= dt;
  updateSchools(schools, {T, dt, dark, net, sunk: stormSunk, netWidth: nw, catching: catching && !jellies.inNet, zoom: Z, onScreen, hasRoom: () => holdTotal < cap}, catchFish);

  /* dock */
  const dk = dockAt(boat.x, boat.y), inDock = !!dk; if (dk) dockHere = dk;
  if (inDock !== docked){ docked = inDock; if (!docked && charter && !charter.left){ charter.left = true; save(); }
    // The dock clears what was being said, then the charter's passengers pay, so their word is the one that shows.
    if (docked){ refreshShop(); toasts.clear(); renderToast(); if (charter && charter.left) endCharter(); if (net.torn > 0){ net.torn = 0; addText(boat.x, boat.y, 40, 'Net mended', '#9CF0C0', 17, 1.4); }
    if (jellies.inNet){ const n = jellies.shakeOut(); toast(n === 1 ? 'Shook a jellyfish out of the net.' : `Shook ${n} jellyfish out of the net.`, 2400); sfx.jelliesOut(); } } }
  // The shop is the dock while aboard; ashore it folds away so the stick has the screen.
  { const open = docked && walker.aboard && !cine && !kingDying(); if (open !== shopOpen){ shopOpen = open; if (open) refreshShop();
      elShop.classList.toggle('open', open); elShop.setAttribute('aria-hidden', String(!open)); elAshore.hidden = !open; elMapBtn.hidden = open; } }
  if (started && walker.aboard && !seaFight) sail(sailed, boat.x, boat.y);
  if (swallowT > 0){ swallowT -= dt; boat.v = 0; if (swallowT <= 0) spitOut(); }
  irisT = Math.max(0, irisT - dt);
  if (swallowT <= 0){ hp = mend(hp, dt, !pastBuoys(boat.x, boat.y), docked); hudHull(); }
  if (docked && holdTotal > 0){
    sellT -= dt;
    while (sellT <= 0 && holdTotal > 0){ sellOne(); sellT += .045; }
    if (holdTotal === 0) finishSale();
  } else sellT = 0;

  dolphinToastT -= dt; dogToastT -= dt; pirateEntity.held = coastGuard.out; scene.update(dt, world);
  if (walker.nearBoat !== aboardShown){ aboardShown = walker.nearBoat; elAboard.hidden = !aboardShown; }
  walker.armed = spear > 0;
  invulnT = Math.max(0, invulnT - dt); walker.blink = invulnT > 0; spotToldT -= dt;
  { const fighting = inFight(); heartT += dt;
    if (hearts < maxHearts() && (!walker.shown || (!fighting && heartT > 6))){ hearts = walker.shown ? hearts + 1 : maxHearts(); heartT = 0; }
    hudHearts(); }
  // With the survival knife and a foe within its reach, the button shows the knife: it stabs, or throws the knife.
  { const t = fgScene ? null : spearTarget(), show = t ? (knifeUse(armour, Math.hypot(t.x - walker.x, t.y - walker.y)) ? 'knife' : 'spear') : harpoonTarget() ? 'harpoon' : null;
    if (show !== throwShown){ throwShown = show; elThrow.hidden = !show; elThrow.classList.toggle('harpoon', show === 'harpoon'); elThrow.classList.toggle('knife', show === 'knife');
      if (show) elThrow.setAttribute('aria-label', show === 'harpoon' ? 'Fire the harpoon' : show === 'knife' ? 'Use the knife' : 'Throw the spear'); }
    const wait = !!show && T < (show === 'harpoon' ? harpoonAt : reloadAt);
    if (wait !== throwWait){ throwWait = wait; elThrow.classList.toggle('wait', wait); } }
  { const show = !!scanning || !!scanTarget(); if (show !== scanShown){ scanShown = show; elScan.hidden = !show; } elScan.classList.toggle('busy', !!scanning); }
  { const a = climbAction(); if (a !== climbShown){ climbShown = a; elClimb.hidden = !a; if (a) elClimb.textContent = a === 'aquarium' ? 'Look in the aquarium' : a === 'tar' ? 'Into the tar' : a === 'bridge' ? 'Onto the bridge' : a === 'isle' ? 'Step ashore' : a === 'temple' ? 'Into the temple' : a === 'door' ? 'Climb the tower' : a === 'dive' ? 'Dive' : a === 'portal' || a === 'castle' || a === 'oldplace' ? 'Into the portal' : a === 'onward' ? 'Through the door' : a === 'skull' ? 'Open the skull door' : a === 'fgtour' ? 'Go with him' : a === 'scope' ? 'Look through the telescope' : a === 'bed' ? 'Sleep till morning' : tower && floor + 1 === tower.roof ? 'Up to the roof' : 'Climb the stairs'; } }
  { const l = seaFight && walker.state === 'aboard' ? 'sea' : floor >= 0 && walker.state === 'ashore' && !fgScene ? (tower === BARGE ? 'barge' : inGigantis() ? 'home' : towerWon ? (tower && tower.boss === boss7 ? 'down' : 'jump') : tower === DEPTHS || tower === TEMPLE_DEEP ? 'swim' : 'leave') : null;
    if (l !== leaveShown){ leaveShown = l; elLeave.hidden = !l; if (l) elLeave.textContent = l === 'jump' ? 'Back to the boat' : l === 'down' ? 'Down to the portal' : l === 'home' ? 'Back through the portal' : l === 'barge' ? 'Leave the barge' : l === 'sea' ? 'Leave the Battle Barge' : l === 'swim' ? 'Swim up' : 'Leave the tower'; } }
  if (isle5Stage >= 1 && king.state !== 'dead' && king.state !== 'dying') king.dead();
  if (isle6Stage >= 1 && deep.state !== 'down' && deep.state !== 'drag') deep.down();
  updatePortal7(dt); updateCastle(dt); updateRuins(dt); updateFgScene(dt); updateScan(dt);
  if (floor === ROOF8 && heron.state === 'gone' && !towerWon) towerWon = true;
  if (floor === NEST9 && heron9.state === 'gone' && !towerWon) towerWon = true;
  heron9.shielded = nest.lit; blockToldT -= dt;
  if (isle6Stage >= 2 && cth.state !== 'gone' && cth.state !== 'fall') cth.beaten();
  for (const d of [deep, ...seaBoss.deep]) if (d.up > .3 && d.state !== 'down') pushOut(boat, d.x, d.y, DEEP_BODY + 24*bk());
  if (floor === TEMPLE6 && cth.state !== 'gone' && walker.state === 'ashore'){ const dx = walker.x - cth.x, dy = walker.y - cth.y, d = Math.hypot(dx, dy);
    if (d < CTH_R && d > 0) walkStep(walker, dx/d*(CTH_R - d), dy/d*(CTH_R - d), build); }
  jawsT -= dt; { const k = [king, ...seaBoss.king].find(s => s.state === 'stalk'); if (k && jawsT <= 0){ sfx.jaws(); jawsT = k.angry ? .7 : 1.1; } }
  openChests();
  cat.free = warrior.free = isle6Stage >= 2;
  bonesPal.free = isle7Stage >= 2 || bonesJoined;
  necroPal.free = heronStage >= 2;
  // Caterman comes out of his workshop once the brother has flown; leaving first, he is with you at the next landing.
  if (catermanT >= 0){ catermanT -= dt;
    if (walker.state !== 'ashore' || walker.dock !== ISLE11_DOCK) catermanT = -1;
    else if (catermanT < 0){ caterman.come(SHOP_DOOR11.x, SHOP_DOOR11.y); sfx.yip(); toasts.clear();
      toast('Out of the workshop comes Caterman, a cat in a silver suit with goggles and a blaster. "Thanks! That heron zapped my workshop all day. I\'m Caterman. I build things! Can I come with you? I\'ll bring my swan paddle boat. It\'s for two!" Caterman joins you.', 7000, 2); } }
  caterman.free = catermanFree && catermanT < 0;
  if (catermanFree && brother.state === 'wait') brother.away(); // gone for good, his clearing empty
  baby.free = reaperEgg >= 3; updateEgg(dt);
  { const any = RIDERS.some(r => flotilla.free(r)); if (any !== boatsShown){ boatsShown = any; $('boatsBtn').hidden = !any; } }
  // The Battle Barge's crossed swords: with a spear, wherever a fight could start, or on the barge once it is won.
  { const b = !shopOpen && (bargeCan() || (tower === BARGE && bargeWon) || (!!seaFight && seaWon)); if (b !== bargeShown){ bargeShown = b; $('bargeBtn').hidden = !b; } $('bargeOpen').hidden = !spear; }
  { const any = BADGE_KINDS.some(k => owned(badges, k)); if (any !== badgesShown){ badgesShown = any; $('badgesBtn').hidden = !any; } }
  otter.reason = otterReason(); otterSeenT -= dt;
  neil.danger = neil.free && swallowT <= 0 && dangerNear();
  if (!neil.free && !neilTold && iceSeen && walker.aboard && Math.hypot(boat.x - neil.x, boat.y - neil.y) < 420){ neilTold = true;
    toast('A seal at the edge of the ice floe, watching your boat. He looks like a Neil. Stop beside him and tap him to toss him an ice fish.', 4800, 1); }
  if (!otter.free && !otterSeenTold && walker.aboard && Math.hypot(boat.x - OTTER_HOME.x, boat.y - OTTER_HOME.y) < 320){ otterSeenTold = true;
    toast('An otter, floating on his back off the dock! Stop beside him and tap him to toss him a fish from your hold.', 4200, 1); }
  naga.free = nagaFree; hiredBoats.here = isle7Stage >= 1 && farOpen() && heronStage < 2; // beaten for good, his boats go home; his camps stay hiredSpotT -= dt; if (nagaFree && nagaCage < 1) nagaCage = Math.min(1, nagaCage + dt);
  // Island 8's tower is barred until the Heron's war has begun, and island 9's until he has fled to it: at a barred door, say so.
  barredT -= dt;
  if (barredT <= 0 && floor < 0 && walker.state === 'ashore' && walker.dock === ISLE8_DOCK){
    const at9 = heronStage < 1 && Math.hypot(walker.x - DOOR9.x, walker.y - DOOR9.y) < 26;
    if (at9 || (isle7Stage < 1 && Math.hypot(walker.x - DOOR8.x, walker.y - DOOR8.y) < 26)){ barredT = 8; sfx.denied();
      toast(at9 ? 'Barred from inside. High above, something shifts in the nest of sticks, and the purple light flickers.' : 'Barred from inside. Up top flies a banner: a white heron on midnight blue.', 3600, 1); } }
  if (baby.shown && !babyTold){ babyTold = true; toast('The baby Reaper walks with you, on his four little legs. He nips whatever you fight, and he swims back to the boat to rest when he is worn out.', 4400, 1); }
  if (necroPal.shown && !necroTold){ necroTold = true; toast('The necromancer walks with you now. In a fight he raises his skeleton hamster: it bites for one, and it takes a lot of hits.', 4400, 1); }
  if (bonesPal.shown && !bonesTold){ bonesTold = true; toast('The Forgotten One\'s bones walk with you now. They hit for two, and raise a ghost and a skeleton to fight for you.', 4400, 1); }
  { const f = inFight(); if (f && !wasFight){ cat.newFight(); hudHearts(); } wasFight = f; }
  if (cat.shown && !palsTold){ palsTold = true; toast('The cat heals you, twice a fight: the pink crosses. Aboard at sea, tap it to feed it a fish from the hold for another heal.', 4400, 1); }
  tarling.free = isle4Stage >= 1; if (isle4Stage >= 1 && anchorer.state !== 'gone' && anchorer.state !== 'melt') anchorer.beaten();
  // The Reaper on land stays beaten; nothing walks through him; and his egg waits in the nest to be taken.
  if (reaperEgg >= 1 && !reaperRematch && landReaper.state !== 'gone' && landReaper.state !== 'beaten' && landReaper.state !== 'flee') landReaper.beatenForGood();
  for (const lr of [landReaper, ...bargeBoss.reaper, ...seaReapers]) if (lr.awake && walker.state === 'ashore'){ const dx = walker.x - lr.x, dy = walker.y - lr.y, d = Math.hypot(dx, dy);
    if (d < LR_BODY && d > 0) walkStep(walker, dx/d*(LR_BODY - d), dy/d*(LR_BODY - d), build); }
  takeEgg();
  // Nothing walks through the tar monster.
  for (const an of [anchorer, ...bargeBoss.anchorer]) if (an.state !== 'gone' && walker.state === 'ashore'){ const dx = walker.x - an.x, dy = walker.y - an.y, d = Math.hypot(dx, dy);
    if (d < BODY_R && d > 0) walkStep(walker, dx/d*(BODY_R - d), dy/d*(BODY_R - d), build); }
  growLegs();
  warlock.free = isle3Stage >= 3; hurtWarlock(dt); spreadPals(dt); wboat.free = warlock.free; wboat.crewed = !warlock.shown;
  if (wboat.free){ const wk = .85; pushOut(wboat, IX, IY, IR+24*wk); for (const b of PIER_BUMPS) pushOut(wboat, b[0], b[1], 20+20*wk);
    for (const b of BRIDGE_BUMPS) pushOut(wboat, b[0], b[1], 18+20*wk); pushOut(wboat, BEACH.x, BEACH.y, BEACH.r+24*wk);
    pushOut(wboat, ISLE2.x, ISLE2.y, ISLE2.r+24*wk); pushOut(wboat, ISLE5.x, ISLE5.y, ISLE5.r+24*wk); pushOffIsle6(wboat, 24*wk); pushOffIsle7(wboat, 24*wk); pushOffTwins(wboat, 24*wk); pushOffIsle10(wboat, 24*wk); pushOffIsle11(wboat, 24*wk); pushOffTown(wboat, 4+20*wk); pushOut(wboat, ISLE4.x, ISLE4.y, Math.max(ISLE4.r, TAR_R*isle4Look().spread) + 24*wk); pushOut(wboat, boat.x, boat.y, 36*k);
    wboat.x = clamp(wboat.x, 40-DEEP-FAR-FARFAR, WS-40+DEEP+FAR+FARFAR); wboat.y = clamp(wboat.y, 40-DEEP-FAR-FARFAR, WS-40+DEEP+FAR+FARFAR); }
  if (pullT > 0){ pullT -= dt; if (pullT <= 0 && floor === HALL) intoDemons(); }
  redFlash = Math.max(0, redFlash - dt*1.2); if (cageOpen > 0 && cageOpen < 1) cageOpen = Math.min(1, cageOpen + dt/1.2);
  { const near = walker.state === 'ashore' && walker.dock === ISLE3_DOCK && floor < 0 && isle3Stage < 1 && Math.hypot(walker.x - DIVE3.x, walker.y - DIVE3.y) < STEP;
    if (near && !gapTold){ gapTold = true; toast('A gap in the seaweed, and deep water under it. You would need scuba gear.', 3200, 1); } }
  updateFishing(dt);
  lionfish.here = shipwrightOpen(tier()); lionfish.sweeps = gear.lionnet; updateMend(dt); updateRadio(); updateSeine(dt); updatePots(dt); updateTrench(dt); updateCrowGo(); updateIsle11(); updateFloe(dt); updateRod(dt); updatePond(dt); updateHoney(dt); updateScope(dt); updateSnacks(dt); updateSpider(dt); hudSpray(); updateCharter(); updateStorm(dt);
  for (let i=sparks.length-1;i>=0;i--){ const q = sparks[i]; q.age += dt; q.x += q.vx*dt; q.y += q.vy*dt; q.z += q.vz*dt; q.vz -= 120*dt; if (q.age > q.life) sparks.splice(i,1); }
  // The egg's scene comes in close on the bow; the Battle Barge stands further back, to take in its arena. At sea it
  // frames the fight: the boat and every boss still in it, near enough, between the top bar and the buttons.
  // Off on a bridge, the camera follows the figure as it does ashore.
  seaView += ((seaFight && !walker.shown ? 1 : 0) - seaView)*Math.min(1, dt*3);
  if (seaFight){ const f = seaFrame(seaFramePoints(), W, H), zSea = Zbase*(1 - .02*tier());
    seaCam.k += (clamp(f.zoom/zSea, SEA_ZOOM_MIN, SEA_ZOOM_MAX) - seaCam.k)*Math.min(1, dt*1.2);
    seaCam.x += (f.dx - seaCam.x)*Math.min(1, dt*2); seaCam.y += (f.dy - seaCam.y)*Math.min(1, dt*2); }
  Z += (Zbase*(1 - .02*tier())*(1 - .2*dockView)*(1 + WALK_ZOOM*walkView)*(1 + (cine && cine.kind === 'egg' ? 2.2*cineK() : 0))*(1 - (1 - bargeZoom(ROOMS[BARGE.first]?.r ?? 150))*bargeView)*(1 - (1 - seaCam.k)*seaView) - Z)*Math.min(1, dt*4);

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
  const w = .4*dockView, isle2 = dockHere === ISLE2_DOCK, isle3 = dockHere === ISLE3_DOCK, isle6 = dockHere === ISLE6_DOCK, isle7 = dockHere === ISLE7_DOCK, isle8 = dockHere === ISLE8_DOCK, isle10 = dockHere === ISLE10_DOCK, isle11 = dockHere === ISLE11_DOCK;
  lx = lx*(1-w) + (isle2 ? ISLE2.x : isle3 ? ISLE3.x+110 : isle6 ? POST6_MID.x : isle7 ? ISLE7.x + 30 : isle8 ? ISLE8.x - 120 : isle10 ? CRATES10.x : isle11 ? CRATES11.x : TX)*w; ly = ly*(1-w) + (isle2 ? ISLE2.y : isle3 ? ISLE3.y+90 : isle6 ? POST6_MID.y + 60 : isle7 ? ISLE7.y - 120 : isle8 ? ISLE8.y - 40 : isle10 ? CRATES10.y + 60 : isle11 ? CRATES11.y + 60 : TY-30)*w;
  // Ashore the camera comes in close and follows the figure, leading it a little.
  walkView += ((walker.shown ? 1 : 0) - walkView)*Math.min(1, dt*2.2);
  lx += (walker.x + walker.vx*.3 - lx)*walkView; ly += (walker.y + walker.vy*.3 - ly)*walkView;
  // Fighting the Reaper on land, the camera takes him in too: he is big, and the messages sit over the figure's head.
  { const lr = landReaper.awake ? landReaper : seaReapers.find(r => r.awake); if (lr && walker.shown){ const c = .35*walkView; lx += (lr.x - lx)*c; ly += (lr.y - ly)*c; } }
  // On the Battle Barge it frames the arena, leaning a little toward the figure, further out and lower (data/barge.ts).
  const onBarge = tower === BARGE && floor >= 0 && walker.shown, arena = ROOMS[BARGE.first];
  bargeView += ((onBarge ? 1 : 0) - bargeView)*Math.min(1, dt*3);
  if (bargeView > .001 && arena){ const ax = arena.x + (walker.x - arena.x)*BARGE_LEAN, ay = arena.y + (walker.y - arena.y)*BARGE_LEAN;
    lx += (ax - lx)*bargeView; ly += (ay - ly)*bargeView; }
  // At sea, on the middle of the fight.
  if (seaView > .001){ lx += (boat.x + seaCam.x - lx)*seaView; ly += (boat.y + seaCam.y - ly)*seaView; }
  if (cine){ const c = cineK(), e = cine.kind === 'egg' ? eggSeat() : cine.kind === 'heron' ? ESCAPE_VIEW : {x: ISLE4.x - 70, y: ISLE4.y - 70}; lx = lx*(1-c) + e.x*c; ly = ly*(1-c) + e.y*c; }
  if (kingDying()){ const c = clamp(Math.min(king.t, 12 - king.t)/.8, 0, 1); lx = lx*(1-c) + king.x*c; ly = ly*(1-c) + king.y*c; }
  viewDY = -Math.min(150, H*.17)*dockView*(1 - cineK()) + H*BARGE_DROP*bargeView - H*FRAME_MID*seaView + H*WALK_DROP*walkView*(1 - bargeView);
  cam.x += (lx-cam.x)*Math.min(1, dt*3.5); cam.y += (ly-cam.y)*Math.min(1, dt*3.5);
}

/* ---------- drawing ---------- */
// Past the buoys the water darkens in bands, like the depth rings inside them; past the last band the deep ends.
const DEEP_BANDS = [[DEEP + FAR + FARFAR, '#0B3644'], [DEEP + FAR + FARFAR*.5, '#0D3C4A'], [DEEP + FAR, '#0F4150'], [DEEP + FAR*.5, '#114A58'], [DEEP, '#155565'], [DEEP*.62, '#185D6C'], [DEEP*.28, C.abyss]];
function square(m){ return [[-m,-m],[WS+m,-m],[WS+m,WS+m],[-m,WS+m]]; }
function drawSea(){
  ctx.fillStyle = '#09303B'; ctx.fillRect(0,0,W,H);
  for (const [m, c] of DEEP_BANDS){ polyPath(square(m),0); ctx.fillStyle = c; ctx.fill(); }
  if (seaFight) drawSeaWater(drawView, SEA_ARENA, seaFight.r);
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
  drawIsle10Sea(drawView);
  drawIsle11Sea(drawView);
  drawIsle7Sea(drawView);
  drawIsle8Sea(drawView);
  if (seaFight) drawSeaIslesSea(drawView, seaFight.isles);
  drawUnderwaterPlants(drawView);

  /* wave glints across the visible patch of world */
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const c of [[0,0],[W,0],[W,H],[0,H]]){
    const w = dirToWorld((c[0]-W/2)/Z, (c[1]-H/2)/Z); const wx = cam.x+w[0], wy = cam.y+w[1];
    x0 = Math.min(x0,wx); x1 = Math.max(x1,wx); y0 = Math.min(y0,wy); y1 = Math.max(y1,wy);
  }
  const G = 130; ctx.strokeStyle = C.foam; ctx.lineWidth = 2*Z; ctx.lineCap = 'round';
  const GE = DEEP+FAR+FARFAR;
  for (let gx = Math.max(-GE,Math.floor(x0/G)*G); gx <= Math.min(WS+GE,x1); gx += G){
    for (let gy = Math.max(-GE,Math.floor(y0/G)*G); gy <= Math.min(WS+GE,y1); gy += G){
      const hsh = Math.sin(gx*12.9898+gy*78.233)*43758.5453, r = hsh - Math.floor(hsh);
      const wx = gx + r*90, wy = gy + ((r*7)%1)*90;
      if (Math.hypot(wx-IX, wy-IY) < IR+30 || Math.hypot(wx-ISLE2.x, wy-ISLE2.y) < ISLE2.r+30 || Math.hypot(wx-MAT.x, wy-MAT.y) < MAT.r+20 || onPlanks(wx, wy) || Math.hypot(wx-ISLE4.x, wy-ISLE4.y) < ISLE4.r+30 || Math.hypot(wx-ISLE5.x, wy-ISLE5.y) < ISLE5.r+30 || Math.hypot(wx-ISLE6.x, wy-ISLE6.y) < shore6(Math.atan2(wy-ISLE6.y, wx-ISLE6.x))+30 || Math.hypot(wx-ISLE7.x, wy-ISLE7.y) < ISLE7.r+30 || nearTwins(wx, wy, 30) || insideIsle11(wx, wy, 30) || (wx > BAR.x0 - 30 && wx < BAR.x1 + 30 && wy > BAR.y0 && wy < BAR.y1)) continue;
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
  drawIsle10Flat(drawView);
  drawIsle11Flat(drawView);
  drawIsle7Flat(drawView);
  drawIsle8Flat(drawView);
  drawGroundPlants(drawView);

  /* dock zone */
  if (isle3Seen || pastBuoys(boat.x, boat.y)){ isoEllipse(DOCK3.x,DOCK3.y,DOCK3.r);
    ctx.setLineDash([10*Z,9*Z]); ctx.lineDashOffset = holdTotal ? -T*26 : 0;
    ctx.strokeStyle = holdTotal ? C.coin : C.foam; ctx.globalAlpha = holdTotal ? .95 : .45; ctx.lineWidth = 3*Z; ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1; }
  if (isle11Seen && onScreen(DOCK11.x, DOCK11.y, 200*Z)){ isoEllipse(DOCK11.x,DOCK11.y,DOCK11.r);
    ctx.setLineDash([10*Z,9*Z]); ctx.lineDashOffset = holdTotal ? -T*26 : 0;
    ctx.strokeStyle = holdTotal ? C.coin : C.foam; ctx.globalAlpha = holdTotal ? .95 : .45; ctx.lineWidth = 3*Z; ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1; }
  if (isle10Seen && onScreen(DOCK10.x, DOCK10.y, 200*Z)){ isoEllipse(DOCK10.x,DOCK10.y,DOCK10.r);
    ctx.setLineDash([10*Z,9*Z]); ctx.lineDashOffset = holdTotal ? -T*26 : 0;
    ctx.strokeStyle = holdTotal ? C.coin : C.foam; ctx.globalAlpha = holdTotal ? .95 : .45; ctx.lineWidth = 3*Z; ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1; }
  if (isle8Seen && onScreen(DOCK8.x, DOCK8.y, 200*Z)){ isoEllipse(DOCK8.x,DOCK8.y,DOCK8.r);
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
  // The aquarium, lit from inside at night.
  if (dark > .05 && aquarium && build >= AQUARIUM_FROM && onScreen(AQUARIUM_MID.x, AQUARIUM_MID.y, 120*Z)){ ctx.globalCompositeOperation = 'screen';
    glow(AQUARIUM_MID.x, AQUARIUM_MID.y, AQUARIUM_TOP*.6, 55, rgba('#7FE3F0', .4*dark)); ctx.globalCompositeOperation = 'source-over'; }
  if (isle3Stage < 1) isle3Glow(drawView);
  isle7Glow(drawView, isle7Look());
  isle8Glow(drawView, heronStage < 2);
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
  const full = holdTotal >= HOLD[lv.hold]; ctx.globalAlpha = (full || torn || seine.out) ? .45 : 1;
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
  // Charter passengers: up at the bow rail, and one aft, in sun hats; they bob with the boat.
  if (o.passengers) o.passengers.forEach((si, i) => { const g = Lp(...[[18,-4.5],[18,4.5],[-26,0]][i]); parts.push({d: g[0]+g[1], f: () => {
    const sx = px(g[0],g[1]), base = py(g[0],g[1],z1), sz = Z*k;
    ctx.fillStyle = SHIRTS[si]; ctx.fillRect(sx - 2.6*sz, base - 8*sz, 5.2*sz, 8*sz);
    ctx.fillStyle = '#F2C8A0'; ctx.beginPath(); ctx.arc(sx, base - 10.5*sz, 2.6*sz, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#F6E3B4'; ctx.beginPath(); ctx.ellipse(sx, base - 12.4*sz, 4.4*sz, 1.5*sz, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(sx, base - 13.4*sz, 2.4*sz, 1.6*sz, 0, 0, Math.PI*2); ctx.fill(); }}); });
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
  drawBakery(drawView, muffin);
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
// The aquarium, the kid's. Until it is built, its plot: stakes, a rope and a sign with a fish on it. Then a glass tank on a
// wooden base, a few of your fish going to and fro behind the glass, and a board over it with a fish on.
function drawAquarium(){
  const {x0, y0, x1, y1} = AQUARIUM, mx = (x0+x1)/2, z0 = AQUARIUM_BASE, z1 = AQUARIUM_TOP;
  const sign = (x, y, z) => { ctx.strokeStyle = C.wood; ctx.lineWidth = 1.6*Z;
    for (const ox of [-7, 7]){ ctx.beginPath(); ctx.moveTo(px(x+ox,y),py(x+ox,y,z-2)); ctx.lineTo(px(x+ox,y),py(x+ox,y,z+12)); ctx.stroke(); }
    box(x-10, y-1, 20, 2, z+3, z+12, '#C98B4E', '#E6B877');
    ctx.fillStyle = '#2C7E9A'; fishShape(px(x,y+1), py(x,y+1,z+7.5), 4.2*Z, SPECIES[2], 0, Math.sin(T*3)*.2); };
  if (!aquarium){
    const corners = [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
    ctx.strokeStyle = 'rgba(255,246,229,.8)'; ctx.lineWidth = 1*Z; ctx.beginPath();
    corners.forEach((c, i) => { const X = px(c[0],c[1]), Y = py(c[0],c[1],5); i ? ctx.lineTo(X,Y) : ctx.moveTo(X,Y); }); ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = C.wood; ctx.lineWidth = 2*Z;
    for (const c of corners){ ctx.beginPath(); ctx.moveTo(px(c[0],c[1]),py(c[0],c[1],0)); ctx.lineTo(px(c[0],c[1]),py(c[0],c[1],8)); ctx.stroke(); }
    sign(mx, y1, 0); return; }
  box(x0, y0, x1-x0, y1-y0, 0, z0, '#8A6243', '#B48C62');
  const quad = (a, b, za, zb) => { ctx.beginPath(); ctx.moveTo(px(a[0],a[1]),py(a[0],a[1],za)); ctx.lineTo(px(b[0],b[1]),py(b[0],b[1],za));
    ctx.lineTo(px(b[0],b[1]),py(b[0],b[1],zb)); ctx.lineTo(px(a[0],a[1]),py(a[0],a[1],zb)); ctx.closePath(); };
  const g0 = [x0+1, y1-1], g1 = [x1-1, y1-1], g2 = [x1-1, y0+1], g3 = [x0+1, y0+1];
  // The water, seen through the two near faces, and its surface.
  quad(g0, g1, z0, z1-3); ctx.fillStyle = 'rgba(78,176,204,.92)'; ctx.fill();
  quad(g1, g2, z0, z1-3); ctx.fillStyle = 'rgba(58,150,184,.92)'; ctx.fill();
  polyPath([g0, g1, g2, g3], z1-3); ctx.fillStyle = 'rgba(160,226,236,.95)'; ctx.fill();
  // A few of the fish, swimming the length of the front face.
  for (let i = 0; i < Math.min(4, aquaKinds.length); i++){ const L = aquaKinds[(i*3) % aquaKinds.length].look;
    const u = Math.sin(T*.45 + i*1.9), dir = Math.cos(T*.45 + i*1.9) > 0 ? 1 : -1, fx = mx + u*(x1-x0-12)/2, fy = y1-1, fz = z0 + 4 + ((i*5) % 13);
    ctx.fillStyle = L.c; fishShape(px(fx,fy), py(fx,fy,fz), 3.4*Z, L, dir > 0 ? -.46 : Math.PI-.46, Math.sin(T*8+i)*.3); }
  // The glass: a glint across the front, the frame at its corners and round the top.
  ctx.fillStyle = 'rgba(255,255,255,.18)'; quad([x0+6, y1-1], [x0+11, y1-1], z0+2, z1-2); ctx.fill();
  ctx.strokeStyle = '#3B4A4F'; ctx.lineWidth = 1.4*Z;
  for (const c of [g0, g1, g2]){ ctx.beginPath(); ctx.moveTo(px(c[0],c[1]),py(c[0],c[1],z0)); ctx.lineTo(px(c[0],c[1]),py(c[0],c[1],z1)); ctx.stroke(); }
  polyPath([g0, g1, g2, g3], z1); ctx.stroke();
  sign(mx, y0+3, z1);
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
        heap: holdTotal/HOLD[lv.hold], heapTint: tint, harpoon: hasHarpoon() ? (T >= harpoonAt ? 2 : 1) : 0, passengers: charter ? charter.shirts : null}); }},
    {d: pierD, f: drawPier},
    {d: BEACH.x+BEACH.y, f: drawBeachThings}
  ];
  for (let i=0;i<BRIDGE_PARTS;i++) list.push({d: bridgePartDepth(i), f: () => drawBridgePart(i)});
  if (onScreen(ISLE2.x, ISLE2.y, (ISLE2.r+260)*Z)){
    list.push({d: POST.x1+POST.y1, f: drawPost}, {d: TOWER.x+TOWER.y, f: drawTower2});
    PALMS2.forEach((p, i) => list.push({d: p[0]+p[1], f: () => drawPalm(p[0], p[1], [8,-9,6,-7,10][i])}));
    HUTS.forEach(h => list.push({d: h[0]+h[1]+11, f: () => drawHut(h[0], h[1])}));
    list.push({d: FIRE.x+FIRE.y, f: drawFire}, {d: TOTEM.x+TOTEM.y, f: drawTotem}, {d: CHEST.x+CHEST.y+5, f: drawChest});
    list.push({d: NAGA_CAGE.x+NAGA_CAGE.y, f: () => drawNagaCage(drawView, NAGA_CAGE.x, NAGA_CAGE.y, NAGA_CAGE.r, nagaCage, !nagaFree)});
    for (const m of monkeys.list) if (m.state !== 'gone') list.push({d: walkerDepth(m.x, m.y, build, pierD, null), f: () => monkeys.drawMonkey(drawView, m, 0)}); }
  if (warlock.shown && floor < 0) list.push({d: walkerDepth(warlock.x, warlock.y, build, pierD, null), f: () => { warlock.drawBody(drawView); drawWorn(drawView, warlock.x, warlock.y, WEAR_TALL.warlock, warlock.worn); }});
  if (tarling.with && floor < 0) list.push({d: walkerDepth(tarling.x, tarling.y, build, pierD, null), f: () => tarling.drawBody(drawView)});
  if (tarling.free && !tarling.with && !onCraft('tarling')) list.push({d: boat.x+boat.y+.5, f: () => tarling.drawAboard(drawView, boat, bk())});
  for (const p of [cat, warrior, bonesPal, naga, necroPal, baby, caterman]){ if (p.shown && floor < 0) list.push({d: walkerDepth(p.x, p.y, build, pierD, null), f: () => { p.drawBody(drawView); drawWorn(drawView, p.x, p.y, WEAR_TALL[p.kind], p.worn); }});
    else if (p.free && !p.shown && !onCraft(p.kind)) list.push({d: boat.x+boat.y+.6, f: () => p.drawAboard(drawView, boat, bk())}); }
  // The flotilla, each craft sorted on its own, its riders aboard unless ashore with the figure (the swan seats two).
  for (const c of flotilla.crafts){ if (!c.placed || !onScreen(c.x, c.y, 120*Z)) continue; const [r, r2] = flotilla.ridersOf(c.kind);
    list.push({d: c.x + c.y, f: () => drawCraft(drawView, c, seated(r), seated(r2))}); }
  // The naga swims beside the boat at sea.
  if (otter.aboard){ if (otter.free) list.push({d: boat.x+boat.y+.7, f: () => otter.drawAboard(drawView, boat, bk())}); }
  else if (onScreen(otter.x, otter.y, 60*Z)) list.push({d: otter.x+otter.y, f: () => otter.drawWater(drawView, boat.v)});
  { const n = crowsAboard(); if (n > 0) list.push({d: boat.x+boat.y+.65, f: () => drawCrowsAboard(drawView, boat, bk(), n)}); }
  if (neil.aboard){ if (neil.free) list.push({d: boat.x+boat.y+.6, f: () => neil.drawAboard(drawView, boat, bk())}); }
  else if (onScreen(neil.x, neil.y, 80*Z)) list.push({d: neil.x+neil.y, f: () => neil.drawOut(drawView, boat.v)});
  for (const p of [naga, baby]) if (floor < 0 && swims(p) && onScreen(p.x, p.y, 80*Z)) list.push({d: p.x+p.y, f: () => drawSwimming(drawView, p)});
  if (floor < 0) for (const a of allies.list) list.push({d: walkerDepth(a.x, a.y, build, pierD, null), f: () => allies.drawBody(drawView, a)});
  if (anchorer.state !== 'gone' && isle3Stage >= 4) list.push({d: anchorer.x + anchorer.y, f: () => anchorer.drawBody(drawView)});
  if (landReaper.state !== 'gone') list.push({d: landReaper.x + landReaper.y, f: () => landReaper.drawBody(drawView)});
  for (const r of seaReapers) if (r.state !== 'gone') list.push({d: r.x + r.y, f: () => r.drawBody(drawView)});
  if (onScreen(NEST6.x, NEST6.y, 80*Z)) list.push({d: NEST6.x + NEST6.y, f: drawNestHere});
  if (reaperEgg === 2) list.push({d: boat.x+boat.y+.55, f: drawEggAboard});
  if (leggy.count > 0 && !leggy.list.length){ const p = crateSeat(); list.push({d: boat.x+boat.y+.5, f: () => drawStinkCrate(drawView, p.x, p.y, p.z, leggy.count)}); }
  if (walker.shown) leggy.list.forEach((m, i) => { if (onScreen(m.x, m.y, 40*Z)) list.push({d: walkerDepth(m.x, m.y, build, pierD, null), f: () => drawLeggy(drawView, m, groundZ(m.x, m.y), i)}); });
  if (deep.state !== 'down') list.push({d: deep.x + deep.y, f: () => deep.drawBody(drawView)});
  for (const d of seaBoss.deep) if (d.state !== 'down') list.push({d: d.x + d.y, f: () => d.drawBody(drawView)});
  list.push(...isle4Solids(drawView, isle4Look()));
  list.push(...isle5Solids(drawView, isle5Stage >= 1));
  list.push(...isle6Solids(drawView, (i) => (chests6 & (1 << i)) !== 0, (i, sx, sy) => drawPerched(drawView, birds6, i, sx, sy)));
  if (onScreen(ISLE6.x, ISLE6.y, (ISLE6.r + 260)*Z)) for (const s of birds6.pipers){ const p = wetSand(s.a); if (onScreen(p.x, p.y, 40*Z)) list.push({d: p.x + p.y, f: () => drawPiper(drawView, s)}); }
  list.push(...isle7Solids(drawView, isle7Look()));
  if (seaFight) list.push(...seaIslesSolids(drawView, seaFight.isles), ...seaBridgeSolids(drawView, seaFight.bridges));
  list.push(...isle8Solids(drawView, isle8Look()));
  if (cine && cine.kind === 'heron') list.push(...escapeSolids(drawView, escapeAt(cine.t)));
  list.push(...isle11Solids(drawView, !catermanFree, isle7Stage >= 4));
  if (onScreen(CLEARING11.x, CLEARING11.y, 360*Z)) list.push(...brother.solids(drawView));
  if (guide.away && onScreen(guide.x, guide.y, (guide.z + 60)*Z)) list.push({d: guide.state === 'perch' ? guide.x + guide.y : 1e9, f: () => drawGuide(drawView, guide)});
  list.push(...isle10Solids(drawView, pelicanBeaten ? (x, y) => drawFlagAt(x, y, 22*Z, 15*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1) : null, hiveDay !== day));
  if (onScreen(ISLE10.x, ISLE10.y, (ISLE10.r + 200)*Z)){
    for (const b of prairie10.bunnies) if (onScreen(b.x, b.y, 30*Z)) list.push({d: b.x + b.y, f: () => drawBunny(drawView, b)});
    for (const g of prairie10.dogs) if (onScreen(g.x, g.y, 30*Z)) list.push({d: g.x + g.y, f: () => drawPrairieDog(drawView, g)});
    for (const b of prairie10.bison) if (onScreen(b.x, b.y, 60*Z)) list.push({d: b.x + b.y, f: () => drawBison(drawView, b)});
    for (const b of pondBirds.birds) if (onScreen(b.x, b.y, 40*Z)) list.push({d: b.x + b.y, f: () => drawPondBird(drawView, b)});
    for (const g of gators.list) if (g.state !== 'gone' && onScreen(g.x, g.y, 60*Z)) list.push({d: g.x + g.y, f: () => drawGator(drawView, g)});
    for (const g of gorillas.list) if (g.state !== 'gone' && onScreen(g.x, g.y, 70*Z)){ list.push({d: g.x + g.y, f: () => drawGorilla(drawView, g)});
      if (g.state === 'windup' || g.state === 'slam') list.push({d: -1e9, f: () => drawSlamRing(drawView, g)}); }
    for (const f of swamp10.frogs) if (onScreen(f.x, f.y, 30*Z)) list.push({d: f.x + f.y, f: () => drawFrog(drawView, f)});
    for (const s of swamp10.snakes) if (onScreen(s.x, s.y, 60*Z)) list.push({d: s.x + s.y, f: () => drawSnake(drawView, s)});
    for (const p of swamp10.panthers) if (onScreen(p.x, p.y, 60*Z)) list.push({d: p.x + p.y, f: () => drawPanther(drawView, p)});
    for (const c of swamp10.cubs) if (onScreen(c.x, c.y, 40*Z)) list.push({d: c.x + c.y, f: () => drawCub(drawView, c)});
    for (const d of swamp10.deer) if (onScreen(d.x, d.y, 40*Z)) list.push({d: d.x + d.y, f: () => drawDeer(drawView, d)});
    { const m = swamp10.monster; if (onScreen(m.x, m.y, 90*Z)) list.push({d: m.x + m.y, f: () => drawMonster(drawView, m)}); }
    if (onScreen(WEB.x, WEB.y, 90*Z)){ const whole = spider10.here; list.push({d: WEB.x + WEB.y + .6, f: () => drawWeb(drawView, whole)});
      if (spider10.state !== 'gone') list.push({d: spider10.x + spider10.y + .7, f: () => drawSpider(drawView, spider10)}); }
    if (onScreen(FEEDER10.x, FEEDER10.y, 90*Z)) list.push({d: FEEDER10.x + FEEDER10.y, f: () => drawFeeder(drawView, feederFull)});
    for (const c of crows.list) if (c.state !== 'gone' && c.state !== 'wait' && onScreen(c.x, c.y, (c.z + 40)*Z)) list.push({d: c.state === 'fly' || c.state === 'leave' ? 1e9 : c.x + c.y, f: () => drawCrow(drawView, c)});
    if (onScreen(OLDMAN10.x, OLDMAN10.y, 120*Z)){ list.push({d: SHACK10.x1 + SHACK10.y1, f: () => drawShack10(drawView)}); list.push({d: OLDMAN10.x + OLDMAN10.y, f: () => drawOldMan(drawView, oldMan)}); } }
  for (const m of monkeys7.list) if (m.state !== 'gone' && onScreen(m.x, m.y, 60*Z)) list.push({d: walkerDepth(m.x, m.y, build, pierD, null), f: () => monkeys7.drawMonkey(drawView, m, 0)});
  for (const c of [hired8, hired9]) for (const m of c.list) if (m.state !== 'gone' && onScreen(m.x, m.y, 60*Z)) list.push({d: walkerDepth(m.x, m.y, build, pierD, null), f: () => c.drawMonkey(drawView, m, 0)});
  list.push(...hiredBoats.solids(drawView));
  list.push(...isle3Solids(drawView, isle3Stage >= 1 ? (sx, sy) => drawFlagAt(sx, sy, 18*Z, 12*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1) : null));
  if (build >= FISHMONGER_STAGE) list.push({d: STALL.x+STALL.y, f: drawStall});
  if (onScreen(DRURY_LANE.x, DRURY_LANE.y, 80*Z)) list.push({d: DRURY_LANE.x+DRURY_LANE.y, f: () => drawDruryLane(drawView)});
  if (build >= SMOKEHOUSE_STAGE) list.push({d: SMOKEHOUSE.x+SMOKEHOUSE.y, f: drawSmokehouse});
  if (build >= AQUARIUM_FROM && onScreen(AQUARIUM_MID.x, AQUARIUM_MID.y, 80*Z)) list.push({d: AQUARIUM_MID.x+AQUARIUM_MID.y, f: drawAquarium});
  for (const b of BASES) if (onScreen(b.hut.x, b.hut.y, 120*Z)){ const built = bases[b.id] >= 1;
    if (b.shed) list.push({d: b.shed.x+b.shed.y+b.shed.half, f: () => drawBaseShed(drawView, b, bases[b.id] >= 2, PAINTS[paint].roof)});
    list.push({d: b.hut.x+b.hut.y+b.hut.half, f: () => drawBaseHut(drawView, b, built, PAINTS[paint].roof, built ? (sx, sy) => drawFlagAt(sx, sy, 18*Z, 12*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1) : null)}); }
  list.push(...scene.solids(drawView), ...bushSolids(drawView));
  // The Honor Guard look, picked on the character screen, shows over whatever armour is worn; the hearts are the armour's.
  walker.armour = wornArmour(charLook, ARMOURS[HONOR_GUARD - 1].look, armourAt(armour)?.look ?? null); walker.knife = hasKnife(armour); walker.look = charLook;
  if (walker.shown){ walker.shirt = PAINTS[paint].hull;
    list.push({d: walker.sortDepth(build, pierD, dog ? {x: dog.x, y: dog.y, d: pets.depth()} : null), f: () => { walker.draw(drawView, 'solids'); if (wrapped()) drawCocoon(drawView, walker.x, walker.y, walker.z, T); }}); }
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
  // The far far buoys round the far deep's end: tall and white, a black band round each, a lamp on top that blinks.
  for (let i=0;i<farFarBuoys.length;i++){ const b = farFarBuoys[i]; if (!onScreen(b[0],b[1],60*Z)) continue;
    const z = Math.sin(T*1.3+i)*2, x = px(b[0],b[1]), y = py(b[0],b[1],4+z);
    isoEllipse(b[0],b[1],11,0); ctx.fillStyle = 'rgba(4,24,32,.32)'; ctx.fill();
    ctx.fillStyle = '#E9E4D6'; ctx.beginPath(); ctx.ellipse(x, y, 8*Z, 4*Z, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(x-3.5*Z, y-24*Z, 7*Z, 24*Z);
    ctx.fillStyle = '#1E2227'; ctx.fillRect(x-3.5*Z, y-15*Z, 7*Z, 5*Z);
    const lit = (T*.8 + i*.37) % 2 < .3; ctx.fillStyle = lit ? '#FFE27A' : '#8C7A3A';
    ctx.beginPath(); ctx.arc(x, y-27*Z, 2.6*Z, 0, Math.PI*2); ctx.fill();
    if (lit){ ctx.fillStyle = 'rgba(255,226,122,.25)'; ctx.beginPath(); ctx.arc(x, y-27*Z, 7*Z, 0, Math.PI*2); ctx.fill(); } }
}
function drawFlies(){
  for (const f of flies){ if (f.t < 0) continue;
    const tgt = f.to === 'boat' ? [boat.x-Math.cos(boat.h)*16*bk(), boat.y-Math.sin(boat.h)*16*bk(), 12*bk()] : f.to === 'crate' ? [CRATE.x,CRATE.y,26] : f.to === 'post' ? [POST_MID.x,POST_MID.y,26] : f.to === 'trader' ? [TRADER_MID.x,TRADER_MID.y,30] : f.to === 'post6' ? [POST6_MID.x,POST6_MID.y,30] : f.to === 'post7' ? [POST7_MID.x,POST7_MID.y,30] : f.to === 'post8' ? [POST8_MID.x,POST8_MID.y,30] : f.to === 'crates10' ? [CRATES10.x,CRATES10.y,24] : f.to === 'crates11' ? [CRATES11.x,CRATES11.y,24] : f.to === 'figure' ? [walker.x,walker.y,walker.z+20] : f.to === 'stall' ? [STALL.x,STALL.y,18] : f.to === 'smoke' ? [SMOKEHOUSE.x,SMOKEHOUSE.y,20] : [pirate.x,pirate.y,16];
    const t = f.t, e = t*t*(3-2*t), x = f.x0+(tgt[0]-f.x0)*e, y = f.y0+(tgt[1]-f.y0)*e, z = f.z0+(tgt[2]-f.z0)*e + Math.sin(Math.PI*t)*38;
    if (f.crab){ drawSpiderCrab(ctx, px(x,y), py(x,y,z), 3.2*Z, t*7, T*8); continue; }
    if (f.junk){ drawJunk(ctx, px(x,y), py(x,y,z), 7.5*Z, f.junk, t*9); continue; }
    if (f.muffin){ drawMuffin(ctx, px(x,y), py(x,y,z) + 2*Z, 2.4*Z, '#9A6234', true); continue; }
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
  for (const b of BASES) baseHutLight(drawView, b, bases[b.id] >= 1);
  light(FIRE.x, FIRE.y, 10, 200, .95);
  light(TRADER_MID.x, TRADER_MID.y, 20, 200, .95);
  isle3Lights(drawView);
  // The Reaper's egg glows a little in his nest, so it is found in the dark.
  if (reaperEgg < 2) light(NEST6.x, NEST6.y, 6, 80, .7);
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
  // Not under the radar in the corner: along the bottom it stops short of it, up the right side it waits above it.
  if (!elRadar.hidden && ix > W - 150 && iy > H - 156){ if (ty <= tx) ix = W - 150; else iy = H - 156; }
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
  else if (kind === 'crab') drawSpiderCrab(ctx, ix, iy, 4.2, 0, T*5);
  else if (kind === 'crow') drawFlying(ctx, ix, iy + 5, 1, T*10, 1.9);
  else if (kind === 'bubbles'){ ctx.fillStyle = '#BFEFFF'; for (const [bx, by, br] of [[-3,3,3.2],[3,-1,2.4],[-1,-5,1.8]]){ ctx.beginPath(); ctx.arc(ix+bx, iy+by, br, 0, Math.PI*2); ctx.fill(); } }
  else if (kind === 'pirate'){ ctx.fillStyle = '#fff'; ctx.font = '800 20px Grandstander, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', ix, iy+2); }
  else if (kind === 'sleep'){ ctx.fillStyle = C.trim; ctx.font = '800 18px Grandstander, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('z', ix, iy+1); }
  else if (kind === 'eye'){ ctx.fillStyle = '#C8F56A'; ctx.beginPath(); ctx.ellipse(ix,iy,9,6,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#0B1F18'; ctx.beginPath(); ctx.ellipse(ix,iy,2,5,0,0,Math.PI*2); ctx.fill(); }
  else { ctx.fillStyle = kind; ctx.beginPath(); ctx.ellipse(ix+2,iy,7,3.6,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(ix-4,iy); ctx.lineTo(ix-10,iy-4.5); ctx.lineTo(ix-10,iy+4.5); ctx.closePath(); ctx.fill(); }
}
// The radar, the kid's: a scope in the corner, at sea, once the shipwright has fitted one. Each creature puts on it what
// of it is out on the water (Entity.radar); the schools, the islands and the lines of buoys are the game's to add.
const elRadar = $('radar'), radarCtx = elRadar.getContext('2d'), RADAR_PX = 104;
const RADAR_LINES = [{lo: 0, hi: WS, colour: 'rgba(228,87,46,.85)'}, {lo: -DEEP, hi: WS + DEEP, colour: 'rgba(163,51,42,.85)'}];
function radarOn(){ return gear.radar && started && walker.aboard && !shopOpen && !diving && !icing && floor < 0 && !mapOpen && !tankOpen && !cine; }
function radarBlips(){ const out = [], blip = (x, y, kind) => { if (inRange(x - boat.x, y - boat.y)) out.push({x, y, kind}); };
  for (const e of scene.entities) e.radar?.(blip);
  for (const sc of schools) if (sc.vis) blip(sc.cx, sc.cy, 'fish');
  return out; }
function drawRadarHud(){ const on = radarOn(); if (elRadar.hidden === on) elRadar.hidden = !on; if (!on) return;
  const px = Math.round(RADAR_PX * Math.min(2, window.devicePixelRatio || 1));
  if (elRadar.width !== px){ elRadar.width = elRadar.height = px; }
  radarCtx.setTransform(px / RADAR_PX, 0, 0, px / RADAR_PX, 0, 0);
  drawRadar(radarCtx, RADAR_PX, {boat, blips: radarBlips(), isles: mapIsles(), lines: RADAR_LINES, T, toward: seaFight ? null : sunkenToward()}); }
function draw(){
  drawRadarHud();
  drawView.zoom = Z; drawView.dark = dark; drawView.T = T;
  ctx.setTransform(DPR,0,0,DPR,0,0); placed.length = 0;
  ctx.lineJoin = 'round';
  if (scope){ drawScope(); return; }
  if (floor >= 0 && walker.shown){ drawRoom(); return; }
  if (icing){ drawIceScene(ctx, W, H, iceRun, iceRun.T, leftToCatch(iceRun.pool), iceSeal, charLook); drawStick(); return; }
  if (diving){ const P = PAINTS[paint]; drawDive(ctx, W, H, diveT, {diver, plants: trenchPl, shoals: trenchSh, hull: P.hull, trim: P.trim, bubbles: diveBubbles,
    here: (si, i) => fishHere(diveGone, si, i, diveT), spears: diveSpears, aim: diveAim, texts: diveTexts,
    ...(diveSite === 'wreck' ? {site: WRECK_SITE, plants: wreckPl, shoals: wreckSh, loot: [WRECK_CHEST], found: () => wreckChest, pearl: false,
      under: (c, X, Y, s) => { for (const b of boneSharks) drawBoneShark(c, X, Y, s, b, diveT, SHARK_LEN); }}
      : diveSite === 'sub' ? {site: subDive.site, plants: subDive.plants, shoals: subDive.shoals, loot: subDive.loot, found: (i) => (subFoundHere(subDive.key) & (1 << i)) !== 0, pearl: false}
      : diveSite === 'ice' ? {site: ICE_SITE, plants: iceDivePl, shoals: iceDiveSh, loot: ICE_LOOT, found: (i) => iceTaken(iceLoot, i), pearl: false, white: gear.white,
      under: (c, X, Y, s) => { drawFrozen(c, X, Y, s, diveT, (i) => iceTaken(iceLoot, i)); drawIceSeals(c, X, Y, s, diveT);
        if (neil.free) drawSealDive(c, X(neilDive.x), Y(neilDive.y), neilDive.dir, diveT, 1.2 * s); drawRope(c, X, Y, s, diver); }}
      : diveSite === 'lagoon' ? {site: LAGOON_SITE, plants: lagoonPl, shoals: LAGOON_SH,
      under: (c, X, Y, s) => { if (!skullKey) drawSkullKey(c, X, Y, s); for (const k of lagoonFolk.list) drawLagoonCreature(c, X, Y, s, k); for (const p of divePals) drawDivePal(c, X, Y, s, p, diveT); },
      over: (c, X, Y, s) => { if (!skullKey) drawKeyGlint(c, X, Y, s, diveT); for (const k of lagoonFolk.list) drawCreatureEye(c, X, Y, s, k, diveT); }}
      : diveSite === 'abyss' ? {site: ABYSS_SITE, plants: abyssPl, shoals: abyssSh,
      under: (c, X, Y, s) => { drawGiants(c, X, Y, s, giants, diveT); drawFloorGulper(c, X, Y, s, floorGulper, diveT); drawRemoro(c, X, Y, s, remoro, diveT); if (diver.cage){ const k = shaken(diver.cage); drawCageRope(c, X, Y, s, k); drawCageBack(c, X, Y, s, k); } },
      front: (c, X, Y, s) => { if (diver.cage) drawCageFront(c, X, Y, s, shaken(diver.cage)); },
      over: (c, X, Y, s) => { drawGiantGlow(c, X, Y, s, giants, diveT); drawFloorGulperGlow(c, X, Y, s, floorGulper, diveT); drawRemoroGlint(c, X, Y, s, remoro, diveT); }}
      : {loot: TRENCH_LOOT, found: (i) => lootTaken(trenchLoot, i), pearl: pearlReady(pearlDay, day), lurker})}); drawStick(); return; }
  drawSea(); scene.draw(drawView, 'underwater'); drawFish(); drawSnookShadow(); scene.draw(drawView, 'surface'); drawTrenchMark(); drawAbyssMark(drawView); drawFloe(drawView, T); drawWakes(); drawNet(); { const st = seineStern(); drawSeine(drawView, seine, st.x, st.y); } for (const p of pots) if (onScreen(p.x, p.y, 60*Z)) drawPot(drawView, p, PAINTS[paint].hull); drawBuoys(); scene.draw(drawView, 'afloat'); drawWorldObjects(); drawFishing(); drawRod(); scene.draw(drawView, 'air'); drawBirds6Air(drawView, birds6); if (onScreen(ISLE10.x, ISLE10.y, (ISLE10.r + 200)*Z)) drawPrairieAir(drawView, prairie10.flies); if (sprayFx) drawSprayPuff(drawView, sprayFx.x0, sprayFx.y0, sprayFx.x1, sprayFx.y1, sprayFx.t / .45); if (pondAt && pondLine.state !== 'idle') drawPondLine(drawView, px(walker.x, walker.y) + 4*Z, py(walker.x, walker.y, groundZ(walker.x, walker.y) + 14), pondAt.x, pondAt.y, pondLine.state, T); drawFlies();

  drawBoil();
  if (dark > .01 || warm > .01) drawNight();
  drawGlow();
  drawStorm();

  drawTexts();

  const full = holdTotal >= HOLD[lv.hold];
  if (!cine && !kingDying()){
  if (!docked) indicator(DOCK.x, DOCK.y, full ? C.coin : C.trim, 'dock', full);
  if (walker.aboard) for (const p of pots) if (p.crabs >= POT_MAX) indicator(p.x, p.y, '#2F8A78', 'crab', true); // a full crab pot
  if (walker.aboard && hasIceKit() && !iceSeen && pastBuoys(boat.x, boat.y) && farOpen()) indicator(ICE_FLOE.x, ICE_FLOE.y, '#BFE6F2', 'dock', true); // the ice floe, once there is a kit to fish it with
  if (walker.aboard && trenchSeen && hasScuba() && pastBuoys(boat.x, boat.y) && !overTrench()) indicator(TRENCH.x, TRENCH.y, '#123A5A', 'bubbles', false); // the trench, to dive
  if (walker.aboard && abyssSeen && hasScuba() && pastFarFar(boat.x, boat.y) && !overAbyss(boat.x, boat.y)) indicator(ABYSS.x, ABYSS.y, '#123A5A', 'bubbles', false); // the abyss, to dive
  if (walker.aboard && pastBuoys(boat.x, boat.y) && !(docked && dockHere === ISLE2_DOCK)) indicator(DOCK2.x, DOCK2.y, '#9CF0C0', 'dock', !isle2Seen); // the way to island 2
  if (walker.aboard && pastBuoys(boat.x, boat.y) && (isle2Seen || towerTaken || isle3Seen) && !(docked && dockHere === ISLE3_DOCK)) indicator(DOCK3.x, DOCK3.y, '#9CD8F0', 'dock', !isle3Seen); // and to island 3, once island 2 is found
  if (walker.aboard && pastBuoys(boat.x, boat.y) && isle3Stage >= 4) indicator(ISLE4.x, ISLE4.y, '#3B2A44', 'dock', false); // the tar island
  if (walker.aboard && pastBuoys(boat.x, boat.y) && farOpen()) indicator(ISLE5.x, ISLE5.y, '#EDE6D3', 'dock', !isle5Seen); // island 5, once the far deep is open
  if (walker.aboard && pastBuoys(boat.x, boat.y) && isle5Stage >= 1 && !(docked && dockHere === ISLE6_DOCK)) indicator(ISLE6_DOCK.x, ISLE6_DOCK.y, '#7DD27A', 'dock', !isle6Seen); // island 6, once the King is dead
  if (walker.aboard && pastBuoys(boat.x, boat.y) && isle6Stage >= 2 && !(docked && dockHere === ISLE7_DOCK)) indicator(DOCK7.x, DOCK7.y, '#C9B2FF', 'dock', !isle7Seen); // island 7, once Cthulhu is beaten
  if (walker.aboard && pastBuoys(boat.x, boat.y) && isle7Stage >= 1 && farOpen() && !(docked && dockHere === ISLE8_DOCK)) indicator(DOCK8.x, DOCK8.y, '#8FB8FF', 'dock', !isle8Seen);
  if (walker.aboard && (guide.state === 'out' || guide.state === 'perch')) indicator(guide.x, guide.y, '#DCE6F2', 'crow', !isle11Seen); // the crow let go, flying for land or waiting there
  else if (walker.aboard && isle11Seen && pastFar(boat.x, boat.y) && !(docked && dockHere === ISLE11_DOCK)) indicator(DOCK11.x, DOCK11.y, '#8FD08A', 'dock', false); // island 11, once found
  if (walker.aboard && pastBuoys(boat.x, boat.y) && isle8Seen && farOpen() && !(docked && dockHere === ISLE10_DOCK)) indicator(DOCK10.x, DOCK10.y, '#D8E27A', 'dock', !isle10Seen); // island 10, once islands 8 and 9 are found // islands 8 and 9, once island 7's sorcerer is beaten
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
  drawHarpoonMarks(); drawScan();
  scene.draw(drawView, 'overlay');
  drawMuffinWords(drawView, muffin, W);
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
  drawStick();
}
// The stick's ring and knob, where the thumb is.
function drawStick(){ if (!joy.on || !started) return;
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(joy.sx,joy.sy,JR,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(joy.x,joy.y,20,0,Math.PI*2); ctx.fill(); }

/* ---------- the tower's rooms ---------- */
// A stone room lit by torches, or the roof under the sky: the floor, the back wall, the stairs once open,
// then whoever is in it in depth order, the spears, coconuts and bolts, and the floating text.
function drawRoom(){
  const R = ROOMS[floor], roof = R.roof, sunk = tower && tower.boss === boss3, under = R.kind === 'hall' || R.kind === 'demon' || R.kind === 'temple';
  const castle = R.kind === 'court' || R.kind === 'castle' || R.kind === 'throne' || R.kind === 'ruins' || R.kind === 'crypt';
  if (castle){ if (R.kind === 'court'){ drawCourtBack(drawView, R, W, H); drawPortal7(drawView, 1, GATE_PORTAL); } else if (R.kind === 'ruins') drawRuinsBack(drawView, R, W, H); else drawCastleBack(drawView, R, W, H);
    if (floor === THRONE) drawLockedDoor(drawView, LOCKED.x, LOCKED.y, isle7Stage >= 3); else if (floor === RUINS) drawSkullDoor(drawView, SKULL_DOOR.x, SKULL_DOOR.y, skullKey && isle7Stage >= 4);
    else if (floor !== CRYPT){ const st = stairs(floor); drawCastleDoor(drawView, st.x, st.y, hordes[floor].cleared); } }
  else if (R.kind === 'nest'){ drawNestBack(drawView, R, W, H, nest.lit);
    if (towerWon){ ctx.strokeStyle = C.wood; ctx.lineWidth = 2.4*Z; ctx.beginPath(); ctx.moveTo(px(R.x,R.y),py(R.x,R.y,0)); ctx.lineTo(px(R.x,R.y),py(R.x,R.y,60)); ctx.stroke();
      drawFlagAt(px(R.x,R.y), py(R.x,R.y,60), 22*Z, 15*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1); } }
  else if (R.kind === 'arena') drawArenaBack(drawView, R, W, H);
  else if (under){ if (R.kind === 'hall'){ drawHallBack(drawView, R, W, H); if (isle3Stage >= 2) drawPortal(drawView, PORTAL.x, PORTAL.y); } else if (R.kind === 'temple') drawHallBack(drawView, R, W, H, true); else drawDemonBack(drawView, R, W, H); }
  else {
  const perch = R.kind === 'perch';
  if (perch) drawPerchSky(drawView, W, H);
  else if (roof){ const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1A1440'); g.addColorStop(1, '#4B2E83'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
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
  isoEllipse(R.x, R.y, R.r); ctx.fillStyle = perch ? '#C9B48C' : roof ? (sunk ? '#A49C86' : '#7C848C') : sunk ? '#50605B' : '#59616B'; ctx.fill();
  if (sunk && !roof) for (const [dx, dy, r] of [[-40, 20, 18], [30, -35, 12], [50, 40, 15]]){ isoEllipse(R.x+dx, R.y+dy, r); ctx.fillStyle = 'rgba(150,200,210,.18)'; ctx.fill(); }
  for (const k of [.75, .5, .25]){ isoEllipse(R.x, R.y, R.r*k); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = 2*Z; ctx.stroke(); }
  if (roof){ for (let i=0;i<16;i++){ const a = i/16*Math.PI*2, x = R.x + Math.cos(a)*(R.r+4), y = R.y + Math.sin(a)*(R.r+4); if (Math.sin(a) + Math.cos(a) > .3) continue; box(x-6, y-6, 12, 12, 0, 12, sunk || perch ? '#B9AF95' : '#8F9893', sunk || perch ? '#D8D0BA' : '#B9C1BC'); }
    ctx.strokeStyle = C.wood; ctx.lineWidth = 2.4*Z; ctx.beginPath(); ctx.moveTo(px(R.x,R.y),py(R.x,R.y,0)); ctx.lineTo(px(R.x,R.y),py(R.x,R.y,60)); ctx.stroke();
    if (towerWon) drawFlagAt(px(R.x,R.y), py(R.x,R.y,60), 22*Z, 15*Z, flag || START_FLAG, Math.sin(T*5)*3*Z, 1); }
  }
  // The stairs up, once the room is beaten: glowing steps at the back.
  if (!roof && floors[floor] && floors[floor].cleared){ const st = stairs(floor);
    for (let k=0;k<4;k++) box(st.x-16+k*5, st.y-16+k*5, 26-k*5, 26-k*5, 0, 6+k*6, '#8F9893', '#C3CAC5');
    isoEllipse(st.x, st.y, 24 + Math.sin(T*4)*2); ctx.strokeStyle = 'rgba(156,240,192,.7)'; ctx.lineWidth = 2.5*Z; ctx.stroke(); }
  // Who is in the room, back to front.
  const actors = [{d: walker.x + walker.y, f: () => { walker.draw(drawView, 'solids'); if (wrapped()) drawCocoon(drawView, walker.x, walker.y, walker.z, T); }}];
  if (hordes[floor]) for (const u of hordes[floor].list) if (u.state !== 'gone') actors.push({d: u.x + u.y, f: () => hordes[floor].drawUnit(drawView, u)});
  if (floor === RUINS){ actors.push({d: POOL.x + POOL.y, f: () => oldOne.drawBody(drawView)});
    for (const c of COLUMNS) actors.push({d: c.x + c.y + c.r, f: () => drawColumn(drawView, c.x, c.y, c.r, c.h)});
    for (const l of lancers.list) if (l.state !== 'gone') actors.push({d: l.x + l.y, f: () => lancers.drawBody(drawView, l)}); }
  if (floor === THRONE){ actors.push({d: SEAT.x + SEAT.y + SEAT.r, f: () => drawThrone(drawView, SEAT.x, SEAT.y, SEAT.r)});
    if (forgotten.state !== 'gone') actors.push({d: forgotten.x + forgotten.y, f: () => forgotten.drawBody(drawView)}); }
  if ((floor === CRYPT || fgScene) && forgotten2.state !== 'gone') actors.push({d: forgotten2.x + forgotten2.y, f: () => forgotten2.drawBody(drawView)});
  if (floor === GATE && (castleHQ || (fgScene && fgScene.flag >= 0))) actors.push({d: HQ_POLE.x + HQ_POLE.y, f: drawHQFlag});
  if (floor === GATE && castleHQ) actors.push({d: HQ_SCOPE.x + HQ_SCOPE.y, f: drawTelescope});
  if (floor === HALL_A && castleHQ) actors.push({d: HQ_BED.x + HQ_BED.y, f: drawHQBed});
  for (const a of allies.list) actors.push({d: a.x + a.y, f: () => allies.drawBody(drawView, a)});
  if (floor === ROOF10){ drawScoopRing(drawView, pelican); actors.push({d: pelican.nest.x + pelican.nest.y - 30, f: () => drawPerchNest(drawView, pelican)});
    // Up in the air it is over everything on the roof.
    if (pelican.state !== 'gone') actors.push({d: pelican.x + pelican.y + (pelican.z > 12 ? 1e6 : 0), f: () => drawPelican(drawView, pelican)}); }
  if (floor === ROOF8) actors.push(...heron.solids(drawView));
  if (floor === NEST9) actors.push(...nest.solids(drawView), ...heron9.solids(drawView));
  if (floor === ROOF7) for (const m of roofMonkeys.list) if (m.state !== 'gone') actors.push({d: m.x + m.y, f: () => roofMonkeys.drawMonkey(drawView, m, 0)});
  if (!roof && floors[floor]) for (const m of floors[floor].list) if (m.state !== 'gone') actors.push({d: m.x + m.y, f: () => floors[floor].drawMonkey(drawView, m, 0)});
  if (bargeCamps[floor]){ for (const c of Object.values(bargeCamps[floor])) for (const m of c.list) if (m.state !== 'gone') actors.push({d: m.x + m.y, f: () => c.drawMonkey(drawView, m, 0)});
    for (const g of bargeGorillas.list) if (g.state !== 'gone'){ actors.push({d: g.x + g.y, f: () => drawGorilla(drawView, g)});
      if (g.state === 'windup' || g.state === 'slam') actors.push({d: -1e9, f: () => drawSlamRing(drawView, g)}); }
    for (const g of bargeGators.list) if (g.state !== 'gone') actors.push({d: g.x + g.y, f: () => drawGator(drawView, g)});
    for (const l of bargeLancers.list) if (l.state !== 'gone') actors.push({d: l.x + l.y, f: () => bargeLancers.drawBody(drawView, l)});
    for (const f of bargeFighters) if (f.state !== 'gone') actors.push({d: f.x + f.y, f: () => f.drawBody(drawView)});
    for (const b of bargeBoss.forgotten) if (b.state !== 'gone') actors.push({d: b.x + b.y, f: () => b.drawBody(drawView)});
    for (const hn of bargeBoss.heron) actors.push(...hn.solids(drawView));
    for (const p of bargeBoss.pelican){ drawScoopRing(drawView, p); actors.push({d: p.nest.x + p.nest.y - 30, f: () => drawPerchNest(drawView, p)});
      if (p.state !== 'gone') actors.push({d: p.x + p.y + (p.z > 12 ? 1e6 : 0), f: () => drawPelican(drawView, p)}); }
    for (const c of bargeBoss.cthulhu){ if (c.state !== 'gone') actors.push({d: c.x + c.y, f: () => c.drawBody(drawView)});
      for (const k of c.tents) actors.push({d: k.x + k.y, f: () => c.drawTent(drawView, k)}); }
    for (const o of bargeBoss.oldone) actors.push({d: o.x + o.y, f: () => o.drawBody(drawView)});
    // The Reaper's red fan and line on the deck under everyone, then him.
    for (const r of bargeBoss.reaper){ r.draw(drawView, 'surface'); if (r.state !== 'gone') actors.push({d: r.x + r.y, f: () => r.drawBody(drawView)}); }
    // The Anchorer's red ring on the deck, then it, wading in the sea off the side; its anchor flies over everything.
    for (const a of bargeBoss.anchorer){ a.draw(drawView, 'surface'); if (a.state !== 'gone') actors.push({d: a.x + a.y, f: () => a.drawBody(drawView)}); }
    // Each spider's web between its two posts, whole until he is beaten, and him.
    for (const sd of bargeBoss.spider){ const w = sd.web;
      for (const [x, y] of [w.a, w.b]) actors.push({d: x + y, f: () => box(x - 3, y - 3, 6, 6, 0, w.z + 30, '#6E4A2A', '#8F6A43')});
      actors.push({d: w.x + w.y + .6, f: () => drawWeb(drawView, sd.here, w)});
      if (sd.state !== 'gone') actors.push({d: sd.x + sd.y + .7, f: () => drawSpider(drawView, sd)}); } }
  if (floor === HALL && swordsman.state !== 'gone') actors.push({d: swordsman.x + swordsman.y, f: () => swordsman.drawBody(drawView)});
  if (floor === TEMPLE6){ if (cth.state !== 'gone') actors.push({d: cth.x + cth.y, f: () => cth.drawBody(drawView)});
    for (const k of cth.tents) actors.push({d: k.x + k.y, f: () => cth.drawTent(drawView, k)}); }
  if (floor === DEMON){
    for (const d of demons) if (d.state !== 'gone') actors.push({d: d.x + d.y, f: () => d.drawBody(drawView)});
    for (const m of demonMonkeys.list) if (m.state !== 'gone') actors.push({d: m.x + m.y, f: () => demonMonkeys.drawMonkey(drawView, m, 0)});
    actors.push({d: CAGE.x + CAGE.y + CAGE.r, f: () => drawCage(drawView, cageOpen, !warlock.free)}); }
  if (warlock.shown) actors.push({d: warlock.x + warlock.y, f: () => { warlock.drawBody(drawView); drawWorn(drawView, warlock.x, warlock.y, WEAR_TALL.warlock, warlock.worn); }});
  if (tarling.with) actors.push({d: tarling.x + tarling.y, f: () => tarling.drawBody(drawView)});
  for (const p of [cat, warrior, bonesPal, naga, necroPal, baby, caterman]) if (p.shown) actors.push({d: p.x + p.y, f: () => { p.drawBody(drawView); drawWorn(drawView, p.x, p.y, WEAR_TALL[p.kind], p.worn); }});
  actors.sort((a,b) => a.d-b.d); for (const o of actors) o.f();
  if (floor === ROOF10) drawSpatFish(drawView, pelican);
  if (bargeCamps[floor]) for (const p of bargeBoss.pelican) drawSpatFish(drawView, p);
  if (R.kind === 'nest') drawNestFront(drawView, R);
  // The front rim, so the room reads as a room.
  if (!roof && R.kind !== 'demon' && R.kind !== 'arena'){ isoEllipse(R.x, R.y, R.r+4); ctx.strokeStyle = R.kind === 'hall' ? '#24413F' : '#2A2E34'; ctx.lineWidth = 6*Z; ctx.stroke(); }
  scene.draw(drawView, 'air'); if (floor === RUINS) oldOne.draw(drawView, 'air'); drawFgBits(); if (sprayFx && tower === BARGE) drawSprayPuff(drawView, sprayFx.x0, sprayFx.y0, sprayFx.x1, sprayFx.y1, sprayFx.t / .45); drawFlies();
  for (const q of sparks){ ctx.globalAlpha = 1 - q.age/q.life; ctx.fillStyle = q.c || (Math.random() < .5 ? '#FFFFFF' : '#E8D9FF'); star(px(q.x,q.y), py(q.x,q.y,q.z), 4*Z); } ctx.globalAlpha = 1;
  drawTexts();
  if (redFlash > 0){ ctx.fillStyle = `rgba(200,20,30,${redFlash*.8})`; ctx.fillRect(0, 0, W, H); }
  if (fgFlash > 0){ ctx.fillStyle = `rgba(236,244,255,${fgFlash*.7})`; ctx.fillRect(0, 0, W, H); }
  drawScan();
  if (fgScene) drawCaption(Math.min(1, fgScene.t/.5, (FG_END - fgScene.t)/.5), fgScene.cap, false);
  if (joy.on && started && !fgScene){
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.arc(joy.sx,joy.sy,JR,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(joy.x,joy.y,20,0,Math.PI*2); ctx.fill(); }
}

/* ---------- loop ---------- */
let last = performance.now(), saveT = 0;
function frame(now){
  const dt = Math.min(.05, Math.max(.001, (now-last)/1000)); last = now;
  if (icing) updateIce(dt); else if (diving) updateDive(dt); else if (!mapOpen && !tankOpen) update(dt); updateAmbience(dt); draw(); drawMap(); drawTank(dt);
  elShop.classList.toggle('steer', joy.on && joy.through);
  renderToast();
  if (started){ saveT += dt; if (saveT >= 5){ saveT = 0; save(); } }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__np = {toast, ABYSS, abyssSh, remoro, giants, floorGulper, get remoroDay(){ return remoroDay; }, set remoroDay(v){ remoroDay = v; }, get abyssSeen(){ return abyssSeen; }, get abyssDown(){ return abyssDown; }, get seaReapers(){ return seaReapers; }, get seaStars(){ return seaStars; }, get seaIsle(){ return !!seaIsleNear(); }, get seaTarK(){ return seaTarK(); }, get seaDock(){ return !!seaDockNear(); }, get seaFight(){ return seaFight; }, get seaWon(){ return seaWon; }, seaBoss, endSea, SEA_ARENA, HQ_BED, screenOf(x, y){ return [px(x, y), py(x, y, 0)]; }, get viewSize(){ return [W, H]; }, get scope(){ return scope ? {i: scope.i, name: seenLeviathans()[scope.i]?.name ?? ''} : null; }, openScope, closeScope, turnScope, HQ_SCOPE, mapBeasts, get honey(){ return honey; }, set honey(v){ honey = v; }, get hiveDay(){ return hiveDay; }, HIVE10, hiveAt, tapHive, honeyNow, get honeyAt(){ const t = honeyTarget(); return t === reaper ? 'sea' : t ? 'land' : null; }, get barge(){ return barge; }, set barge(v){ barge = v; }, get bargeWins(){ return bargeWins; }, startBarge, openBarge, bargeCamps, bargeGorillas, bargeGators, bargeLancers, get bargeFighters(){ return bargeFighters; }, bargeBoss, ARENAS, get bargeOn(){ return tower === BARGE; }, forgotten2, CRYPT, SKULL_DOOR, PORTAL11_FRONT, get cryptWon(){ return cryptWon; }, set cryptWon(v){ cryptWon = v; }, get castleHQ(){ return castleHQ; }, get scanner(){ return scanner; }, set scanner(v){ scanner = v; }, get scanned(){ return scanned; }, get scanAt(){ const s = scanTarget(); return s ? s.kind : null; }, startScan, get saveCode(){ return saveCode; }, get cloudState(){ return cloudState; }, get fgScene(){ return fgScene; }, HQ_POLE, lagoonFolk, get divePals(){ return divePals; }, get skullKey(){ return skullKey; }, set skullKey(v){ skullKey = v; }, SKULL_KEY, LAGOON11, craftAt(k){ const c = flotilla.crafts.find(c => c.kind === k); return c && c.placed ? [px(c.x, c.y), py(c.x, c.y, 10)] : null; }, DOCK11, PORTAL11, CLEARING11, SHOP_DOOR11, brother, caterman, get catermanFree(){ return catermanFree; }, set catermanFree(v){ catermanFree = v; }, brotherAt(){ return [px(brother.x, brother.y), py(brother.x, brother.y, 40)]; }, get isle11Seen(){ return isle11Seen; }, set isle11Seen(v){ isle11Seen = v; }, ISLE11, PERCH11, guide, letCrowGo, get crowGoShown(){ return crowGoShown; }, get farFarOpen(){ return farFarOpen(); }, get charLook(){ return charLook; }, openChar, closeChar, get charOpen(){ return charOpen; }, get walkerAt(){ return [px(walker.x, walker.y), py(walker.x, walker.y, walker.z + 12)]; }, get heronFled(){ return heronFled; }, set heronFled(v){ heronFled = v; }, escapeAt, get sub(){ return sub; }, set sub(v){ sub = v; }, get subDive(){ return subDive; }, get subFound(){ return subFound; }, get diveShown(){ return diveShown; }, get badges(){ return badges; }, wearBadges, renderBadges, WEARER, sunken, get finder(){ return finder; }, set finder(v){ finder = v; }, get sunkenFound(){ return sunkenFound; }, sunkenToward, seaClear, crows, FEEDER10, get feederFull(){ return feederFull; }, get crowsOwned(){ return crowsOwned; }, set crowsOwned(v){ crowsOwned = v; }, set bread(v){ bread = v; }, feederAt, crowAt, tapFeeder, tapCrow, answerCrow, get crowCard(){ return crowCard; }, get crowAsk(){ return crowAsk; }, get isle10Seen(){ return isle10Seen; }, pelican, ROOF10, DOOR10, get pelicanBeaten(){ return pelicanBeaten; }, get bread(){ return bread; }, pelicanAt(){ return [px(pelican.x, pelican.y), py(pelican.x, pelican.y, pelican.z + 12)]; }, gorillas, gorillaAt(i){ const g = gorillas.list[i]; return g ? [px(g.x, g.y), py(g.x, g.y, 12)] : null; }, spider10, WEB, get webT(){ return webT; }, get wrapped(){ return wrapped(); }, get bugSpray(){ return bugSpray; }, set bugSpray(v){ bugSpray = v; }, sprayNow, get sprayShown(){ return sprayShown; }, swamp10, swampAt(k, i){ const t = swamp10.targets().find(t => t.k === k && t.i === i); return t ? [px(t.x, t.y), py(t.x, t.y, t.z)] : null; }, gators, gatorAt(i){ const g = gators.list[i]; return g ? [px(g.x, g.y), py(g.x, g.y, 6)] : null; }, oldMan, OLDMAN10, get oldManAt(){ return oldManAt(); }, talkToOldMan, get storeOpen(){ return storeOpen; }, get snacks(){ return snacks; }, get appleT(){ return appleT; }, get carrotT(){ return carrotT; }, eatSnack, DAD_JOKES, pondLine, pondBirds, usePond, get pondAt(){ return pondAt; }, get pondShown(){ return pondShown; }, POND, prairie10, prairieAt(k, i){ const t = prairie10.targets().find(t => t.k === k && t.i === i); return t ? [px(t.x, t.y), py(t.x, t.y, t.z)] : null; }, muffin, leggy, birds6, palms6: PALMS6, wetSand, leggyAt(i){ const m = leggy.list[i]; return m ? [px(m.x, m.y), py(m.x, m.y, groundZ(m.x, m.y) + 9)] : null; }, get junk(){ return junk; }, set junk(v){ junk = v; hudJunk(); }, get muffins(){ return muffins; }, setHearts(n){ hearts = n; heartT = 0; hudHearts(); }, get bakerAt(){ return [px(BAKER.x, BAKER.y), py(BAKER.x, BAKER.y, DECK_Z + 18)]; }, get cine(){ return cine; }, monkeys7, get isle7Seen(){ return isle7Seen; }, get isle7Stage(){ return isle7Stage; }, set isle7Stage(v){ isle7Stage = v; }, get portalOpen(){ return portalOpen; }, boss7, roofMonkeys, hordes, forgotten, lancers, oldOne, get soulArmour(){ return soulArmour; }, allies, bonesPal, cat, warrior, get catAt(){ return catAt(); }, deep, cth, get isle6Stage(){ return isle6Stage; }, set isle6Stage(v){ isle6Stage = v; }, get isle5Seen(){ return isle5Seen; }, get isle6Seen(){ return isle6Seen; }, get chests6(){ return chests6; }, CHESTS6, king, get isle5Stage(){ return isle5Stage; }, isle4Look, anchorer, tarling, get isle4Stage(){ return isle4Stage; }, set isle4Stage(v){ isle4Stage = v; }, get isle3Seen(){ return isle3Seen; }, get isle3Stage(){ return isle3Stage; }, boss3, swordsman, demons, demonMonkeys, warlock, wboat, rare, lev, leviathan, turtles, get turtleSwims(){ return turtleSwims; }, cthulu, angler, gulper, serpent, get meteorSeen(){ return meteorSeen; }, reaper, get reaperSeen(){ return reaperSeen; }, landReaper, get reaperLandSeen(){ return reaperLandSeen; }, get reaperRematch(){ return reaperRematch; }, get oldOwed(){ return oldOwed; }, get reaperEgg(){ return reaperEgg; }, set reaperEgg(v){ reaperEgg = v; }, get eggDay(){ return eggDay; }, set eggDay(v){ eggDay = v; }, get hatchT(){ return hatchT; }, get eggT(){ return eggT(); }, baby, flotilla, warriorPal: warrior, get babyAt(){ return babyAt(); }, tapBaby, NEST6, get icing(){ return icing; }, get iceRun(){ return iceRun; }, get iceSeen(){ return iceSeen; }, get iceRuns(){ return iceRuns; }, get iceLoot(){ return iceLoot; }, ICE_FLOE, neil, tapNeil, get neilAt(){ return neilAt(); }, get iceSeal(){ return iceSeal; }, startIce, iceDrop, FLOE_BASE, driven, get harpoonTarget(){ const t = harpoonTarget(); return t ? t.k : null; }, fireHarpoon, shallows, monkeys, floors, boss, get floor(){ return floor; }, get towerTaken(){ return towerTaken; }, get hearts(){ return hearts; }, get masks(){ return masks; }, get spear(){ return spear; }, set spear(v){ spear = v; refreshShop(); }, get armour(){ return armour; }, set armour(v){ armour = v; hearts = maxHearts(); hudHearts(); refreshShop(); }, get maxHearts(){ return maxHearts(); }, lionfish, rod, get lionSeen(){ return lionSeen; }, get lionCaught(){ return lionCaught; }, get aquarium(){ return aquarium; }, get bases(){ return bases; }, BASES, get pots(){ return pots; }, get diving(){ return diving; }, diver, startDive, trenchSh, get diveAim(){ return diveAim; }, diveThrow, get diveT(){ return diveT; }, get trenchSeen(){ return trenchSeen; }, get trenchDeep(){ return trenchDeep; }, storm, get stormE(){ return stormE; }, get stormSeen(){ return stormSeen; }, get charter(){ return charter; }, get charterOffer(){ return charterOffer; }, get chartersRun(){ return chartersRun; }, get trenchLoot(){ return trenchLoot; }, get wreckChest(){ return wreckChest; }, get diveSite(){ return diveSite; }, boneSharks, WRECK, WRECK_CHEST, get pearlDay(){ return pearlDay; }, TRENCH_LOOT, lurker, get lurkerSeen(){ return lurkerSeen; }, get lurkerStung(){ return lurkerStung; }, TRENCH, tapPot, swallow, seine, get haulLeft(){ return haul.length; }, toggleSeine, naga, get nagaFree(){ return nagaFree; }, NAGA_CAGE, get isle8Seen(){ return isle8Seen; }, hired8, hired9, hiredBoats, heron, heron9, nest, nestHorde, NEST9, necroPal, otter, tapOtter, OTTER_HOME, get heronStage(){ return heronStage; }, set heronStage(v){ heronStage = v; }, ROOF8, ISLE8, ISLE9, BAR, DOOR8, DOOR9, set aquarium(v){ aquarium = v; refreshShop(); }, get tankOpen(){ return tankOpen; }, tankView, openTank, closeTank, AQUARIUM, get netCut(){ return netCut(); }, get mending(){ return mendT > 0; }, get sailedShare(){ return sailedShare(sailed); }, get mapOpen(){ return mapOpen; }, get radarOn(){ return radarOn(); }, radarBlips, checkForUpdate, get updateReady(){ return updateReady; }, coastGuard, get radioDay(){ return radioDay; }, set radioDay(v){ radioDay = v; }, openMap, closeMap, mapMarks, get swallowing(){ return swallowT > 0; }, get hp(){ return hp; }, walker, get dogAt(){ const d = pets.dog; return d ? [px(d.x, d.y), py(d.x, d.y, d.z + 12)] : null; }, get petted(){ return petted; }, jellies, pets, whales, mantas, snook, get fight(){return fight;}, SNOOK_SPOT, gear, set coins(v){coins=v; hud(); refreshShop();}, get day(){return day;}, first, get earned(){return earned;}, set earned(v){earned=v;}, get market(){return market;}, get clock(){return clock;}, set clock(v){clock=v;}, get keys(){return keyMode;}, set keys(v){keyMode=v; keysLabel();}, get ambience(){return !!ambience;}, get phase(){return phase;}, boat, net, schools, pirate, sharks, flotsam, drift, pods: dolphins.pods, lv, DOCK, set build(v){build=v;}, set wood(v){wood=v; hudWood(); refreshShop();}, get hold(){return holdTotal;}, get coins(){return coins;}};
})();
