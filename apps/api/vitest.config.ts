import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Inline (empty) PostCSS config stops Vite walking up to the BOM-prefixed root package.json
  css: { postcss: {} },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup-env.ts'],
    // Fetches the MongoDB binary for mongodb-memory-server once (first run only)
    globalSetup: ['./test/global-setup.ts'],
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
