import { defineConfig } from 'vitest/config';

// Vitest's "is jsdom installed?" pre-check walks up to the repo-root package.json, which starts
// with a UTF-8 BOM and makes the check crash (exit 1 even when every test passes). jsdom is a
// declared devDependency of this package, so the check adds nothing here. Remove this once the
// root package.json is saved without a BOM.
process.env.VITEST_SKIP_INSTALL_CHECKS = '1';

export default defineConfig({
  // Inline (empty) PostCSS config stops Vite walking up to the BOM-prefixed root package.json
  css: { postcss: {} },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
  },
});
