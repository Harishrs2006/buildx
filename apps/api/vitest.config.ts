import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Inline (empty) PostCSS config stops Vite walking up to the BOM-prefixed root package.json
  css: { postcss: {} },
  // Tests run against the shared package's source, so no build is needed first
  resolve: { alias: { '@buildx/shared': path.resolve(__dirname, '../../packages/shared/index.ts') } },
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
