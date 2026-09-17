# Net Profit

A cosy isometric fishing tycoon for the browser. Tow a net through schools of fish, haul the catch home, build up the boat, build up the island, sail further, find bigger things.

This document hands the project from a chat-built prototype to a real repo. It describes what exists, how it works, what is wrong with it, and what comes next. The prototype is `legacy/net-profit.html` (one file, ~1,300 lines, no dependencies, no build). Treat that file as the behavioural reference until the port reaches parity. `index.html` at the repo root began as a copy of it and is where the port happens; the README covers how to run and test.

## Who this is for

The owner (engineer, final say) and her kid (co-designer, chief playtester, source of the best ideas in this doc). It started as "like Harvest Hero, but not wheat" and turned into something they both want to be real.

Working style the owner expects from a collaborator: real opinions, pushback when something is a bad idea, corrections over comfort. Say "I think this is wrong because…" and then do the work. No performing.

## Design pillars

1. **The sweep is the game.** The net is towed like a trailer, so turning swings it wide. Carving an arc through a school has to feel good before anything else matters. Never trade this away for features.
2. **Short loop, long horizon.** A trip is under a minute: catch, fill, dock, sell, buy. The horizon is the palace, the flagship, the leviathan, the next island.
3. **Base grows the boat, boat grows the world.** (Kid.) Building the island unlocks upgrade levels. Upgrades grow the boat. A bigger boat has a bigger range. Further out there are richer fish and stranger things.
4. **The game grows up with the player.** (Owner.) Each new island introduces a new verb and a visible step up in graphics and mechanical depth. Island 1 is flat shapes and trawling. Later islands earn shaders, weather, crew, line fishing. The game gets a bit meta about its own evolution.
5. **Cosy with teeth.** Threats exist (pirates, sharks, later ninjas) but always have a counter the player can buy, befriend, or outrun. Losing fish stings; nothing is ever lost permanently.
6. **Rare things sparkle.** (Kid.) Dawn and dusk ultra-rares, night-only glowing fish, a leviathan you see long before you can do anything about it. Discovery is a reward in itself; the catch log is a collection.
7. **Phone first.** One thumb, floating joystick, portrait. Everything is tested at 390×780. Desktop (WASD/arrows) is a bonus.

## What exists today

All of this is implemented and smoke-tested in the prototype.

**Core loop**
- Floating joystick (touch or mouse) that points where to go. The keyboard has two feels, chosen by a HUD button that appears where a mouse lives or once a key is pressed, and saved: drive (A and D turn the hull, W is throttle, S brakes; the default) or point (WASD and the arrows aim the boat like the stick, eased over 150 ms). Arrows match WASD in both. Boat has heading, turn rate, acceleration, drag.
- Net follows the stern at a fixed tow length (trailer physics). Catches any fish within `netWidth/2 + 5` of the net centre while the net is moving (> 22 u/s), the hold has room, and the net is not torn.
- Hold fills; HUD bar turns red and nudges when full; gold edge arrow points to the dock.
- Dock ring: entering it opens the shop and auto-sells one fish every 45 ms, cheapest first. Docking also mends a torn net. The shop covers where the thumb lives, so a drag on its wood steers the boat straight through it and the panel fades to a quarter while you do; buttons and the catch log still take taps (2026-09-17, after a playtester had to reach over the panel to leave).
- Upgrades: net width, hold size, engine speed. Six levels each.

**World**
- 4800×4800 world, island at the centre, rendered as a 2:1 isometric diamond with concentric depth rings and a buoy line at the edge.
- 36 schools in rings by value. Fish respawn 8–17 s after being caught (plus 1.5 s per species index). Schools visibly thin.
- Ambience (2026-09-17): waves that breathe and hiss with speed, a calm pad rooted on F that warms at dawn and dusk and thins at night, wind chimes within 400 units of the shore or pier, gulls crying from birds that are around and awake, and dolphins chirping when a pod is within 350 units. All procedural on one bus that ducks 40% under every cue for half a second, behind the sound toggle. Levels are a first guess and want ears.
- Day cycle, 300 s: dawn (12%), day (43%), dusk (12%), night (33%). Night is a multiply mask with light-shaped holes (boat, net, hut, crates, treehouse, driftwood, salvage, glowing schools). Dawn and dusk tint warm.

**Creatures and hazards**
- Seven day species, two night-only glowing species, sharks, two sparkle rares. Table below.
- Gulls circle schools that still have fish (3 = full, 2 = thinning, 0 = fished out), trail the boat as the hold fills, sleep at night. Two perch on the island.
- Two dolphin pods roam. Pass one at speed and it escorts you for up to 30 s; while escorted, sharks will not charge.
- Six sharks orbit tuna, goldfin and lanternfish schools. They charge a moving net within 330 u. Net level < 4: net torn for 6 s, up to 3 fish spilled. Net level ≥ 4: the shark is caught (40 coins).
- One pirate, unlocked at 60 lifetime coins. Prowls, chases when you carry ≥ 4 fish, steals half the hold (highest species index first), leaves, returns in ~30–50 s. Never comes within ~400 u of the dock. Slightly faster than a level-1 engine.
- Leviathan: a 28-segment serpent shadow on a squircle path ~2,180 u out. Spines surface, spots glow at night. Passing within 300 u rumbles the screen and logs a sighting. Not catchable yet.

**Progression**
- Boat tier = `floor((net + hold + engine levels) / 3)`, 0–5: dinghy, skiff, cutter, trawler, seiner, flagship. Each tier scales the hull, adds detail (wider cabin → second deck → stern crane), zooms the camera out 2%, unlocks paint, and raises the sailing range.
- Range per tier is a dashed ring; beyond it the boat is pushed back with a toast.
- Upgrade level cap = `min(5, 2 + buildStage)`. The base gates the boat.
- Driftwood (22 logs, 65% spawn inside current range, and respawn 18–40 s after pickup with the same bias) builds the treehouse palace in five stages. Each stage adds 15% to all sale prices. The dock camera zooms out to frame the island once the boat settles.
- Orders: "12 mackerel pays 40". Filling one pays a bonus and rolls a new one, restricted to species inside your range. The gold edge arrow points to the nearest school of the order species.
- Salvage crates (10) give instant coins, scaled by tier.
- Catch log chips in the shop; rares get a gold ring; leviathan sighting is logged.
- Ten hull paints; net floats and palace flags match the hull.

**Persistence**: `localStorage["netprofit.v1"]` = `{coins, earned, muted, lv:{net,hold,engine}, paint, log[], order, wood, build, levSeen, trip}`. `keys` is `"drive"` or `"point"`, the keyboard feel, missing in old saves and read as drive. `trip` is `{x, y, h, clock, hold[]}`: the boat's position and heading, the time of day and the hold. It is written on every save, when the tab is hidden, on pagehide and every five seconds while sailing, and restored on load, so a phone that discards the tab does not lose the haul (added 2026-09-17; legacy does not have it, and old saves without it load unchanged). Entity state is not saved.

## Tuning tables (as shipped in the prototype)

Units are world units (u). The starter boat is ~62 u long.

| Level | Net width | Hold | Top speed | Net cost | Hold cost | Engine cost |
|---|---|---|---|---|---|---|
| 1 | 52 | 12 | 175 | – | – | – |
| 2 | 68 | 20 | 205 | 8 | 6 | 10 |
| 3 | 88 | 32 | 240 | 20 | 16 | 25 |
| 4 | 112 | 50 | 275 | 45 | 40 | 60 |
| 5 | 140 | 80 | 315 | 100 | 90 | 130 |
| 6 | 170 | 120 | 350 | 220 | 200 | 280 |

| Tier | Name | Hull scale | Range from island (u) | Paints unlocked |
|---|---|---|---|---|
| 0 | dinghy | 1.00 | 1,150 | 2 |
| 1 | skiff | 1.10 | 1,600 | 4 |
| 2 | cutter | 1.20 | 2,000 | 6 |
| 3 | trawler | 1.32 | 2,400 | 7 |
| 4 | seiner | 1.45 | 2,900 | 9 |
| 5 | flagship | 1.60 | unlimited | 10 |

| # | Species | Value | Where / when | Schools × fish | Notes |
|---|---|---|---|---|---|
| 0 | sardine | 1 | ring 560–700 | 5 × 46 | |
| 1 | mackerel | 2 | ring 900–1,060 | 5 × 42 | stripe |
| 2 | snapper | 4 | ring 1,260–1,440 | 5 × 40 | |
| 3 | pufferfish | 6 | ring 1,620–1,780 | 4 × 20 | round |
| 4 | tuna | 9 | ring 1,960–2,120 | 4 × 26 | large; sharks start here |
| 5 | goldfin | 14 | ring 2,280–2,440 | 4 × 26 | twinkles |
| 6 | lanternfish | 22 | far corners, 2,850–3,150 | 2 × 24 | glows at night |
| 7 | shark | 40 | orbits species 4–6 | 6 singles | needs net level ≥ 4; 45 s respawn |
| 8 | moonfish | 10 | ring 950–1,450, night only | 4 × 30 | glows |
| 9 | starfin | 18 | ring 1,900–2,450, night only | 3 × 26 | glows |
| 10 | sunrise koi | 60 | one per dawn, inside range | 1 | sparkles, 80 s window |
| 11 | dusk ray | 90 | one per dusk, inside range | 1 | sparkles, 80 s window |

| Stage | Build | Driftwood | Coins | Effect |
|---|---|---|---|---|
| 1 | tree platform | 8 | 0 | +15% prices, upgrade cap → 4 |
| 2 | treehouse | 20 | 0 | +30%, cap → 5 |
| 3 | second storey | 40 | 100 | +45%, cap → 6 |
| 4 | watchtower | 70 | 2,000 | +60% |
| 5 | palace dome | 120 | 5,000 | +75% |

Other constants: pirate speed 188, pirate unlock 60 lifetime coins, shark charge speed 235, shark orbit speed 95, dolphin escort speed `max(150, boat·1.15 + 50)`, rare swim speed 58, driftwood yield `1–3 + tier`, salvage `[5,8,10,15,20,35] × (1 + floor(tier/2))`.

**Balance status: lightly tested.** The owner has played to flagship. She asked for faster early upgrades once (costs were roughly halved). Everything past cutter is numbers picked to look sensible. Expect to retune.

Retuned 2026-09-16 after the owner reached flagship with 3,600 idle coins and 20 of 70 driftwood. Driftwood yield now scales with the full tier (was half of it) and respawns favour the current range, because the spawn disc grows almost six times in area from dinghy to flagship while the same 22 logs had to cover it, which left wood per minute at the top at about 40% of a dinghy's. The watchtower and dome cost 2,000 and 5,000 coins (were 250 and 600). A first pass at 1,200 and 3,500 was banked before the wood was; a second at 4,000 and 12,000 assumed a flagship docking pays one to two thousand, which one big lanternfish sale had suggested. Measured over ten minutes of real play at stage 4 on 2026-09-17 (screenshots 18:12 and 18:22), casual income near the island is about 115 coins a minute, so the dome was a hundred-minute grind. At 2,000 and 5,000 the stages are roughly eighteen and twenty-seven minutes of casual play, or a few good trips to the goldfin and lanternfish rings. A carpenter selling wood for coins was considered and rejected: at flagship income it would make driftwood optional exactly when the map is biggest. Where these tables and `legacy/net-profit.html` disagree, the tables win and the port reproduces the tables.

## How the prototype is built

One IIFE, plain canvas 2D, DOM for HUD and shop, Web Audio oscillators for sound, Grandstander from Google Fonts.

**Projection.** `K = √½`. Screen x = `((wx−camX) − (wy−camY))·K·Z + W/2`. Screen y = `((wx−camX) + (wy−camY))·K/2·Z + H/2 + viewDY − wz·Z`. A world circle of radius r draws as an ellipse `r·Z` by `r·Z/2`. Joystick screen vectors are inverted back to world with `a = dx/K, b = 2dy/K → ((a+b)/2, (b−a)/2)`. `Z` is a zoom derived from `min(W,H)/500`, clamped 0.62–1.35, eased by tier and by the dock view.

**Solids.** `extrude(poly, z0, z1, side, top)` draws only viewer-facing side quads (normal·(1,1) > 0), shaded by normal, then the top face. Ships are hull polygon + inset deck + cabin boxes rotated by heading, so they foreshorten correctly. Depth sorting is by `wx + wy` for a short list of drawables (hut, palms, tree, tower, boat, pirate). The pier is a special case that sorts relative to the boat's side of it.

**Update order.** clock → input → boat physics → island/pier push-out → world clamp → range limit → net tow → schools + catching → dock + selling → rare → leviathan → sparks → pirate → gulls + dolphins → sharks → salvage → driftwood → zoom → wakes/particles/texts → camera.

**Draw order.** sea (abyss, lagoon diamond, depth rings, glints, range ring, island flats, dock ring) → leviathan → fish → rare → sharks → dolphins → wakes → net → buoys → salvage → driftwood → depth-sorted objects → birds → flying-fish particles → night mask → glow pass (bioluminescence, sparkles) → floating text → edge indicators → joystick.

**Night.** A half-resolution offscreen canvas is filled with the ambient colour, lights are punched out with `destination-out` radial gradients scaled by `dark`, and the result is multiplied onto the scene. Glow species then get a `screen` halo and per-fish bright dots. This replaced an additive glow that washed the boat out; do not go back to adding light on top of sprites.

**Steering around land.** `around(x, y, tx, ty, R)` returns a tangent waypoint when the straight line to a target would cross the island. Dolphins and the pirate use it, with `pushOut` as a backstop. Any new roaming entity needs the same.

**Debug hook.** `window.__np` exposes boat, net, schools, pirate, sharks, pods, rare, lev, and setters for clock, wood and build; `hold` and `coins` are getters, `wood` is a setter only, so read the wood count from the HUD pill `#wood`. The smoke test drives the game through it, and so do balance probes in headless Chromium (max the levels, set `build` and `wood`, drop a log on the boat, read the shop). Keep an equivalent in dev builds.

## Known debt (fix during the port, not before)

- Global mutable state in one closure. No entity interface, no layers, no event bus.
- Species are coupled by array index (`SHARK = 7`, night = 8–9, rares = 10–11, `RING_R` parallel array). Move to string ids and data files; migrate the save's `log[]` to a map.
- `refreshShop()` rebuilds paint swatches and log chips via `innerHTML` on every sale tick.
- One toast slot: important toasts (pirate chase) get overwritten by routine ones (hold full).
- Pier depth-sort hack. Tall palace pieces can overlap the hut at some camera positions.
- Fish heading is derived from frame-to-frame position delta; schools that come on screen snap for a frame.
- Leviathan path speed is non-uniform (squircle parameterisation).
- No pause beyond clamping dt to 50 ms. The trip survives a discarded tab (see Persistence); entities do not, so schools, sharks and the pirate reset on reload.
- Sound is raw oscillators by design. `audio/sfx.ts` (2026-09-17) names the twenty-five cues and locks each to the legacy numbers by test; the catch, sell, driftwood blip and dolphin whistle are keepers (owner and kid, 2026-09-16 and 17). Music and ambience are separate layers and never replace a cue.
- Dead code: `isDark`, `mq` (night used to follow the OS theme).
- The palace is small. It reads as a treehouse wearing a hat. It deserves its own art pass.
- Accessibility: canvas has a label and the shop is real buttons, but there is no reduced-motion path for screen shake or the day-cycle tint.

## Target architecture

Vite + TypeScript (strict), no game framework. Keep the custom canvas renderer: pillar 4 needs full control over how the look evolves, and the bespoke projection/extrusion code is small. Deploy to GitHub Pages. Vitest for pure logic, Playwright for the smoke test.

```
src/
  main.ts            boot, resize, loop
  core/              iso.ts  math.ts  rng.ts  color.ts
  data/              tuning.ts today, a verbatim move of every balance table; Phase 2
                     splits it into species.ts zones.ts upgrades.ts tiers.ts stages.ts paints.ts
  state/             save.ts today: reads and writes netprofit.v1 exactly as the prototype did,
                     with a legacy save in its tests; store.ts and the versioned format are Phase 2
  input/             joystick.ts  keys.ts  (done)
  world/             daycycle.ts and island.ts done; schools.ts and range.ts to come
  entities/          boat.ts and net.ts done; pirate.ts  shark.ts  dolphins.ts
                     leviathan.ts  rare.ts  flotsam.ts  birds.ts
  render/            sea.ts  solids.ts  ship.ts  fish.ts  night.ts
                     particles.ts  indicators.ts
  ui/                hud.ts  shop.ts  toast.ts (queue with priorities)
  audio/             sfx.ts (done; named cues locked to legacy by test)
legacy/net-profit.html   the reference build, untouched
index.html               the shipping game; identical to legacy until the port starts
tests/smoke.spec.ts      Playwright, drives the game through window.__np at 390x780
tests/unit/              Vitest, pure logic; first tests arrive with the first module
vite.config.ts           base /net-profit/, dev 4830, preview 4831, tailnet hostname allowed
playwright.config.ts     chromium (CI) and msedge (local fallback) projects, own server on 4831
biome.json               lint and format: LF, single quotes, 100 columns
.github/workflows/       ci.yml (typecheck, lint, unit, smoke) and deploy.yml (Pages)
```

`src/main.js` is the prototype script moved out of index.html so Vite serves and bundles it; it is excluded from Biome and not type-checked, and shrinks as Phase 1 splits it into the modules above. `core/iso.ts` is the first, with unit tests in `tests/unit/`; main.js keeps `px`, `py`, `dirToWorld` and `onScreen` as thin wrappers so call sites do not change.

Entity contract: `update(dt, world)`, `draw(ctx, view, layer)`, optional `depth()`. Render layers replace the hand-ordered draw list: `underwater, surface, solids(sorted), air, mask, glow, overlay`.

## Migration plan

**Phase 0, scaffold.** Repo, Vite, TS strict, lint, Pages deploy, `legacy/` copy. Port the Playwright smoke test. Done 2026-09-16: Vite + TypeScript strict, Biome, Vitest, Playwright (`tests/smoke.spec.ts`), CI and Pages workflows. The Pages source is set to GitHub Actions, so nothing deploys until `deploy.yml` reaches `main`; from then on the site is `dist/` only, which is the game and none of the docs.

**Phase 1, parity port.** Move code into modules with no behaviour changes. Step 1 done 2026-09-17: the inline script became the ES module `src/main.js`, verbatim, and index.html loads it with `type="module"`. Safe because the prototype was already a strict-mode IIFE with no inline handlers or load-event dependence. Step 2 done 2026-09-17: the projection became `core/iso.ts`, pure and unit-tested, behind wrappers in main.js. Step 3 done 2026-09-17: every balance table moved to `data/tuning.ts`, and a unit test reads the tables in this document and checks the code against them. Step 4 done 2026-09-17: `core/math.ts` (clamp, angDiff, smoothstep, the seeded rng, locked to the prototype's sequence), `core/color.ts`, `world/daycycle.ts` and `data/progression.ts` (tier, hull scale, range, paints, level cap), each unit-tested, the last two against this document's tables and percentages. Step 5 done 2026-09-17: `state/save.ts` parses and serializes `netprofit.v1`, with a real pre-trip save in its tests so old saves provably keep loading. Step 6 done 2026-09-17: `world/island.ts` holds the island, pier and dock geometry with `around` and `pushOut`, tested for the detour, its mirror and the push to the rim. Step 7 done 2026-09-17: the tow physics became `entities/net.ts`; its test runs the tow block from `legacy/net-profit.html` itself against the module on five hundred random states and requires bit-identical results, which is the side-by-side check for this move. Step 8 done 2026-09-17: `input/joystick.ts` and `input/keys.ts` hold the floating joystick and the keyboard vector with their DOM bindings, tested with fake event targets; the steering that consumes them is step 9. Step 9 done 2026-09-17: `entities/boat.ts` holds the steering, throttle, easing and move, with the same legacy-slice parity test as the net, so both halves of the feel are locked to the reference. WASD tuning shipped as a setting. Step 10 done 2026-09-17: `audio/sfx.ts` holds the oscillator plumbing and every cue by name, each locked to the legacy `tone()` lines by a test that runs those lines through a recorder. Done when: the smoke test passes, an existing `netprofit.v1` save loads, and side-by-side play at 390×780 feels identical (tow physics especially).

**Phase 2, data-driven content.** Species, zones, upgrades, tiers, stages, paints become data with string ids. Save v2 with migration. Balance values live in one place.

**Phase 3, systems.** Entity interface, render layers, toast queue, sfx cues, pause/visibility, reduced motion.

**Phase 4, new content.** See roadmap. One feature per PR, playable at every commit.

## Working on it

- `npm run dev` serves the game at http://localhost:4830/net-profit/ with hot reload; `npm run preview` serves the production build on 4831. Both ports are pinned strictly because other projects on the same machine use Vite's defaults. Never fall back to 5173 or 4173.
- Phone testing: `npm run dev -- --host`, then open the Network URL Vite prints. A tailnet hostname works too, since `*.ts.net` is allowed through Vite's host check. Reaching the dev server over the LAN on Windows needs an inbound firewall rule scoped to TCP 4830 on the private profile, not a blanket rule for node.
- `npm run test:e2e` runs the smoke test in Chromium against the production build on its own server. `npx playwright test --project=msedge` uses the Edge already on Windows when the Chromium download will not complete.
- Balance probes beat playing to flagship: drive the game in headless Chromium through `window.__np`, exactly as the driftwood retune was checked.
- CI runs typecheck, lint, unit and smoke on every PR. Merging to `main` builds `dist/` and deploys it to GitHub Pages. Only the game ships; none of the docs are served.
- Where the tuning tables above and `legacy/net-profit.html` disagree, the tables win and the port reproduces the tables.
- Keyboard steering has two feels and a setting, because on 2026-09-17 the owner picked drive and her kid picked point, and both were right for how they play. Legacy points with the keys, unsmoothed; neither feel is that, so this is the one deliberate difference from legacy in how the boat is driven. The joystick and the physics under all three are bit-identical to legacy by test.
- The people in this doc are "the owner" and "her kid" on purpose. No real names or personal email anywhere in the repo, commits or PRs; the repo commits as the GitHub noreply address.

## Roadmap (ideas discussed, none built)

Near:
- **Ninjas.** The night threat, opposite of pirates: silent, empty your crab pots, never seen. Later hireable as palace guards and sushi chefs. Possible late-game faction choice, pirates vs ninjas.
- **Crab pots.** Drop, leave, return. Passive income and route planning. The thing ninjas rob.
- **Line fishing for legendaries.** Second verb: one giant shadow per zone, timing minigame, trophy mounted on the palace. Nets are volume; lines are single targets. The first legendary is the snook, below.
- **Ambience.** Built 2026-09-17 as designed here; levels untuned. Procedural, on its own bus that ducks 40% under every cue for half a second so nothing cute gets stepped on. Waves: brown noise low-passed near 400 Hz on a slow wandering swell, two LFO phases for stereo, a brighter hiss that rises with boat speed, a quick lap inside the dock ring, lower and quieter at night. Gulls: a triangle sliding 1.1 kHz to 700 Hz with a fast tremolo, one to three syllables, only from birds on screen and awake, one cry every five to twelve seconds, silent for two seconds after an escort starts. The calm layer: three detuned triangles on F2, C3 and F3 under a slow chorus, low-passed at 500 Hz, an A3 at dawn and dusk, two notes at night; rooted on F because the dolphin whistle ends on C7 and D7. Wind chimes near shore (owner, 2026-09-17): sparse F-pentatonic pings with long decays and a couple of bright partials, fading in within about 400 units of the island and the pier, panned toward it, never more than one every few seconds. Dolphin chirps (kid, 2026-09-17): soft single chirps, quieter than the whistle, from a pod within a few hundred units every several seconds with jitter, panned toward it, an occasional double while escorting, and none within two seconds of the escort whistle. Everything stays out of the whistle's 1.4 to 2.4 kHz band.
- **Palace art pass.** Wings, rope bridge to the hut, dock gate, lights. Make stage 5 worth 258 driftwood.
- **Leviathan as a gate.** Today it is a sighting. It should become the thing between you and the next island.
- **Stages 4 and 5 should unlock something.** Past stage 3 the base grows nothing, so the palace trails the boat by construction. The watchtower and dome each want a boat-side reward, and the dock buildings below are the coin sinks the endgame lacks.
- **Background music.** A layer under the sfx with its own volume, sharing the mute toggle. Tracks load from `assets/music/` and the game stays silent when the folder is empty, so CI and Pages work without it. The folder is gitignored on purpose: the placeholder tracks there are a commercial soundtrack and cannot ship. Needs licensed or original music before it goes live.

Creatures (brainstormed 2026-09-17, in the order they should be built):

- **Jellyfish pools.** Drifting blooms of twenty to forty jellies that pulse, and glow at night through the existing glow pass, so they are the prettiest thing on the water and the one thing the sweep has to respect: tow the net through a bloom and it fills with jellies, catching nothing until you shake them out at the dock. Cosy with teeth. Later a finer mesh or a rake upgrade could let a good net pass clean. Simplest of the four: one drifting zone and one net rule.
- **Manta rays, for the owner.** A squadron of three to five that glides the middle rings and, every so often, one leaps: it rises off its shadow, hangs, and comes down in a ring of spray with a low whump. The net slides off them. Purely spectacle, logged as a sighting, the kind of thing you point at when someone else is holding the phone.
- **Whales, for the kid.** A mother and calf that cruise the far water and surface with a spout. They sing within earshot: procedural glides between 80 and 400 Hz with a delay for the echo, the calf answering higher, call and response, well below the dolphin whistle's band so the two never fight. Not catchable, never in danger. A sighting in the log, and a reason to sail out at night, when the song carries further. First real use of the ambience bus.
- **Snook, for the owner's dad.** The first line-fishing legendary. Silver, sloped head, jutting lower jaw, one black stripe down the lateral line, yellow fins, all in our own flat shapes. It shows at dawn and dusk only, rarely, in the shadow of the Ten Cent Bridge: a wooden bridge from the beach out to a rock, with a painted sign and a ten-coin toll per cast that earns the name. Nets cannot take it; it slides under the net every time, with a splash so you know it was there. Line only: dock at the bridge, step off the boat, cast. The fight is the real one: a hooked snook runs for the pilings, and you steer it away with the joystick while holding tension; let it reach a piling and the line breaks, and the toast says what every Florida fisherman already knows: "The snook is still under the bridge." Most casts end that way; that is the point. Land it and it hangs on the palace as the first trophy, in the log under the bridge's name. Eighty-second window like the other sparkle rares. Needs the bridge, the second verb and the trophy wall, so it comes last and is worth it.

Dinner brainstorm (2026-09-17, the husband, the owner and the kid; my notes in the same breath, decisions still the owner's):

- **Seining.** The husband and the owner both want it, and it is the strongest idea here: drop a buoy, drive a loop around a school, come back to the buoy, and everything inside is yours. It is the sweep grown up, which keeps pillar 1 at the centre, and it finally gives the seiner tier its meaning. Skill, not volume: a clean tight loop catches more than a lazy wide one. My pick for island 2's verb.
- **Storms.** Roll in from an edge with a warning (gulls flee, the pad drops out, the swell builds in the ambience layer), last a minute or two, slow the boat, widen its turns and push schools deep; then the reward, schools boiling in the shallows after. Counters to buy: ballast, or shelter in the dock ring. Lightning and rain are island 2's renderer step, with the reduced-motion path from known debt. Already on the Further list; promoted.
- **Sirens and mermaids.** The owner's, and a matched pair. Mermaids are a dusk-and-night sparkle rare on the far rocks whose song takes over the pad for a while and leaves a gift (a pearl in the log, a hull paint). Sirens are the same rocks at night with teeth: the song pulls the wheel toward the rocks and the counter is speed, a dolphin escort, or a bought charm. Island 2's night threat, the sea's answer to the ninjas.
- **Coast guard.** The husband's. Take it as the counter to the pirate, not as an enforcer: a cutter on a patrol route that pirates will not approach, and a radio upgrade to call it on a cooldown. No quotas or licences; that is teeth against the player with nothing to buy back.
- **Vendors on the island.** The husband's. A fishmonger who pays more than the dock but only for what he asks for that day, then a smokehouse and cannery from the Further list. These are what stages 4 and 5 of the palace should unlock, which is the fix this morning's balance note asked for.
- **Charters.** The husband's: take people out for coins and bring back no fish. A different loop, not a multiplier, and the creatures are the destinations: whales at night, the mantas' leap, the leviathan from a safe distance. Sharks scare the passengers and cost the fare. Island 2.
- **Cast netting.** The owner's. A tap throws a round net a short way for a small instant catch, for shallows and tight spots the tow cannot reach. Keep it a sidearm with a cooldown so the sweep stays the game. Mid island 1 or island 2.
- **Pets.** The kid's, for the base and later islands, and the right way to make the island a place: a dog on the pier that barks early when pirates prowl, a cat that keeps gulls off the catch, the crab from the illustration, whatever else he draws. Earned by palace stages and rare discoveries. The kid designs them.
- **Scuba and spearfishing.** The husband's. A whole underwater level with sharks that matter is a second game, and per pillar 4 that is what a later island is for. Island 3's verb, with a counter for the sharks before it ships. Not before.
- **Protected animals.** The husband's: endangered animals to avoid, with a fine if you catch one. Keep the avoiding, reshape the fine. Sea turtles, manatees and sawfish drift near the schools; net one and the catch stops while it is released, a few fish spill, and the coast guard's dock inspection finds bycatch, which costs the clean-catch bonus the fishmonger pays for fish caught without any. A coin fine is loss that is never won back, which is the one thing pillar 5 forbids; a lost bonus stings and leaves nothing permanent. The buyable counter is the real one: a turtle excluder for the net, from the shipwright. Manatees are Florida, which matters here.
- **A field guide, for fish caught by hand.** The owner's. The catch log grows into a book: every species with how it was taken, net or line, the biggest yet, where and when, first seen, and a page per legendary with the bridge or reef it came from. Fish taken on the line are their own collection, so the second verb has its own trophy shelf and the snook's page is worth the wait. Pillar 6 says the log is a collection; this makes it one you can open and read on the phone.
- **A fleet.** Everyone agrees: not until several islands in. Stays on Further.
- **Fishing rivals.** The husband's; the owner is not sold, and neither am I yet. Rivals thin your schools and there is no cosy counter to another boat except conflict. The alive-world feeling they promise comes cheaper from vendors, charters and the coast guard. Parked; revisit once island 2 exists.

The arc this suggests: island 1 finishes with the creatures, the snook at the bridge, vendors gating the last palace stages, and pets; island 2 brings seining, storms, sirens and mermaids, the coast guard and charters; island 3 goes under the water.

Further:
- **Island 2 and the meta layer.** Reaching a new island unlocks a new mechanic and a renderer upgrade (water shader, shadows, weather, particles). Each island is a chapter in the game growing up.
- Crew and a fleet of auto-fishing boats. Weather and storms (rough water, double prices). Ice and freshness (value decays in the hold). Sonar upgrade. Dock buildings that multiply value: smokehouse, cannery, sushi bar. Pelican thief. Message bottles with map fragments leading to a dig site. More dawn/dusk rares per zone, seasonal rares.

## Look and voice

- Palette anchors: sea `#2B8A99` / `#1B6676`, foam `#F3FFFB`, sand `#F2D79B`, buoy red `#E4572E`, cream `#FFF6E5`, coin `#FFC53D`, ink `#12303A`. Flat shaded, no outlines, light from the left (+y faces lighter than +x faces).
- Type: Grandstander 500/700/800, with a rounded system fallback. HUD chrome is pills; the shop is a plank sign.
- Copy: sentence case, plain verbs, a button says what it does ("Buy for 20", "Build the treehouse"), the confirmation uses the same words ("Built the treehouse"). Errors say what to do next ("Collect 5 more driftwood out at sea."). No exclamation marks except a rare catch.

## Things learned the hard way

- A canvas with `position:fixed; inset:0` does not stretch. Set `width:100%; height:100%` or the backing store draws at the wrong scale.
- Additive glow over sprites at night washes them out and makes them look darker. Use a darkness mask with holes.
- Panning the camera the moment the boat crosses the dock ring feels like being yanked. Wait until the boat has slowed, zoom out, drift gently.
- Anything that roams needs to know the island exists.
- In night scenes, anything the player must find (driftwood, crates, rares) needs its own small light.
- Test at phone size first. The isometric squash halves vertical distances, so the world feels smaller on screen than the numbers suggest.
- Vite's default ports are shared by every Vite project on the machine, and Playwright's `reuseExistingServer` will happily test whichever app answers first. Pin ports and never reuse.
- Vite blocks any Host header that is not localhost or an IP address. A dev server reached by hostname needs `server.allowedHosts`.
- A network that advertises IPv6 without routing it hangs Node downloads, including Playwright's browser installer, while curl falls back to IPv4 in milliseconds. If curl works and Node does not, suspect IPv6 first.
- Git Bash's tar cannot read zip files. `C:\Windows\System32\tar.exe` can.
- A force-push does not start a GitHub Pages branch build, and with the Pages source set to GitHub Actions nothing deploys until a workflow exists on `main`.
- Phone browsers discard a backgrounded tab. Anything not saved is a lost trip.
- A panel that covers the thumb's home must let steering through. Pointer capture makes it one binding: a press on the panel's background anchors the stick and hands the pointer to the canvas.
- iOS ignores `user-scalable=no`, so a double-tap on any button zooms the page, and once zoomed the canvas's `touch-action: none` swallows the pinch that would zoom back out. `touch-action: manipulation` on the body kills double-tap zoom everywhere and leaves pinch alone. Found by the chief playtester buying an upgrade twice, fast.
- Coins come from the sweep and wood from errands, so a base gated only on wood always trails the boat. Fix supply before price, and give the late stages something to gate.
- Price nothing off a single big docking. Take two screenshots ten minutes apart of the owner actually playing and divide; that number was a tenth of the burst.
- Eight-way keys on an isometric map point at a diagonal the boat is rarely facing, so the throttle penalty for turning is on almost all the time and the keyboard feels slower and twitchier than the stick. Put feels side by side behind a switch and let the players pick. Two players picked two different ones, and a setting was cheaper than a winner.
