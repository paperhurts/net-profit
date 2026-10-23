# Net Profit

A cosy isometric fishing game for phones and browsers, made by a family. You tow a net through schools of fish, sell the catch at the dock, and spend the coins on a bigger net, a deeper hold, a faster engine and a better boat. Then you sail further out.

There is a lot further out. The sea runs from the home island past three lines of buoys to the far far sea. Along the way you find thirteen islands, a castle that becomes your headquarters, and a tar ocean behind a metal bridge. There are bosses on land and at sea, companions who fight beside you and ride their own boats, and dives into a trench and the abyss. There are mini-games too, and a Battle Barge for re-fighting any boss you've beaten. Most of the world was designed by the owner's kid: his drawings and answers are written into [project.md](project.md) next to what each thing became.

**Play it:** https://net-profit.paperhurts.dev. It works best on a phone held upright. Add it to the home screen and it installs as an app and plays offline.

## Saving

- The game saves itself in the browser as you play.
- **Play on another device**, the last row in the shop, shows the game's four-word save code; the game reminds you to write it down now and then. Type the code into the game on another device, or after clearing the browser, and the game comes back. The code and the game are kept online in a small table with nothing personal in it ([`supabase/migrations`](supabase/migrations)).
- The same card gives a link that carries the whole game, for when there is no internet.
- On an iPhone, the game on the Home Screen keeps its own save, apart from Safari's: type the code in there.
- Old saves always load. When the save format changes, it is migrated, never wiped.

## For testers

Add `#tester` to the address (https://net-profit.paperhurts.dev/#tester) to get the tester panel. From there you can:

- skip any step of the story, with its cutscene still playing;
- add coins and driftwood;
- unfog the sea map;
- hand yourself pets, companions, gear and badges.

It is how new features get checked without playing for hours to reach them.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:4830/ on this machine. To try it on a phone on the same Wi-Fi, run `npm run dev -- --host` and open the Network URL Vite prints. A Tailscale hostname works too. On Windows, reaching the dev server over the LAN needs an inbound firewall rule for TCP 4830. Test at 390x780 portrait first: that is the screen the game is made for.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload, on port 4830 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build, on port 4831 |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | Biome lint and format check |
| `npm run format` | Biome format, in place |
| `npm run test:unit` | Vitest: the game's logic, drawing and save format |
| `npm run test:e2e` | Playwright smoke tests: the real game at phone size, driven through the `window.__np` debug hook. First run: `npx playwright install chromium` |
| `npm test` | Unit then smoke |

Ports are pinned: dev on 4830, preview and the smoke tests on 4831. Other projects on the same machine use Vite's defaults.

## How it is built

No game framework: a custom canvas renderer draws everything, in an isometric projection (`src/core/iso.ts`).

- `index.html` holds the page, its styles and every card and panel (the shop, the sea map, the tester panel and the rest).
- `src/main.js` is the game: its loop, its state, and the wiring between everything below. It began as the original prototype's script and is being split into typed modules; new work goes into the modules.
- `src/world/` has the places: islands, docks, buoy lines, the tar ocean, the castle's rooms.
- `src/entities/` has everything that moves: the boat, the net, the walker on foot, fish, bosses, companions.
- `src/render/` has the drawing of each.
- `src/data/` has tables and rules: gear, armour, trophies, the castle's upgrades and the rest.
- `src/fishing/`, `src/input/`, `src/audio/` and `src/ui/` are the rod, the joystick and keys, the sound, and the message queue.
- `src/state/` holds the save format (with its migrations) and the online save code.
- `legacy/net-profit.html` is the original single-file prototype. It stays as the reference for how the boat and net feel. Do not edit it.
- `tests/unit/` has the Vitest tests and `tests/smoke.spec.ts` the Playwright ones.
- `public/` has the icons, the app manifest and the service worker that keeps it playable offline.

Everything about the design lives in [project.md](project.md): the pillars, the tuning tables, every shipped feature in order with the kid's answers behind it, the persistence format, and the roadmap. [CLAUDE.md](CLAUDE.md) has the rules for working on the code.

## Deploying

CI runs on every pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): typecheck, lint, unit tests, then the smoke tests. Merging to `main` builds the game and deploys `dist/` to GitHub Pages ([`deploy.yml`](.github/workflows/deploy.yml)). The repository's Pages source is GitHub Actions, so nothing deploys from the branch itself, and only the game is served, not the docs. An open game notices the new version when it comes back to the front and offers to update.
