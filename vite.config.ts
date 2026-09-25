import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs, so one build works at net-profit.paperhurts.dev, under
  // `vite preview`, and at the old paperhurts.dev/net-profit/ path while it redirects.
  base: './',
  // Other projects on this machine own 5173 (Reader dev), 4173 (Reader prod) and
  // more via server-start. Net Profit takes 4830 for dev and 4831 for preview and the
  // smoke test, strictly, so a busy port fails loudly instead of drifting.
  // Phones reach the dev server over Tailscale by name (minerva.neko-panga.ts.net).
  // Vite blocks unknown hostnames against DNS rebinding, so allow the tailnet.
  server: { port: 4830, strictPort: true, allowedHosts: ['.ts.net'] },
  preview: { port: 4831, strictPort: true },
  build: { target: 'es2022' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    // Phase 1 brings the first pure modules and their tests.
    passWithNoTests: true,
  },
});
