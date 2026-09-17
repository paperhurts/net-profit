import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves the project site under /net-profit/.
  base: '/net-profit/',
  build: { target: 'es2022' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    // Phase 1 brings the first pure modules and their tests.
    passWithNoTests: true,
  },
});
