import { defineConfig } from '@playwright/test';

// Not Vite's default 4173: that port is shared by every Vite project on the
// machine, and a smoke test that quietly drives the wrong app is worse than
// one that fails to start.
const PORT = 4831;
const BASE = '/net-profit/';
const URL = `http://localhost:${PORT}${BASE}`;

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  // The smoke scenarios drive a real-time game with mouse gestures; run them
  // one at a time so they never fight for CPU and drift off their timings.
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: URL,
    // Phone first: everything is verified at 390x780 portrait.
    viewport: { width: 390, height: 780 },
    deviceScaleFactor: 2,
    trace: 'retain-on-failure',
  },
  projects: [
    // What CI runs. Needs `npx playwright install chromium` once.
    { name: 'chromium', use: { browserName: 'chromium' } },
    // Fallback for a machine that cannot fetch the Chromium build: uses the
    // Edge that ships with Windows.  npx playwright test --project=msedge
    { name: 'msedge', use: { browserName: 'chromium', channel: 'msedge' } },
  ],
  webServer: {
    // Test what ships: the production build served by vite preview.
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: URL,
    // Always start our own server so the test can never bind to a stranger.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
