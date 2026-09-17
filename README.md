# Net Profit

A cosy isometric fishing tycoon for the browser. Tow a net through schools of fish, haul the catch home, build up the boat, build up the island, sail further, find bigger things.

Design, tuning tables, architecture and roadmap live in [project.md](project.md). Read it before changing anything.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:4830/net-profit/ on this machine, or the Network URL Vite prints on a phone on the same Wi-Fi. Test at 390x780 portrait first.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | Biome lint and format check |
| `npm run format` | Biome format, in place |
| `npm run test:unit` | Vitest, pure logic |
| `npm run test:e2e` | Playwright smoke test at phone size. First run: `npx playwright install chromium`. If that download will not complete, `npx playwright test --project=msedge` uses the Edge already on Windows |
| `npm test` | Unit then smoke |

## Layout

- `index.html` is the game as it ships. It began as a copy of the prototype and is where the TypeScript port happens.
- `legacy/net-profit.html` is the untouched prototype and the behavioural reference until the port reaches parity. Do not edit it.
- `tests/smoke.spec.ts` drives the real game through the `window.__np` debug hook.

## Deploying

Pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`. The repository Pages source must be set to **GitHub Actions**.
