import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@default-scope/shared': resolve(__dirname, 'packages/shared/src'),
      '@default-scope/foo': resolve(__dirname, 'packages/foo/src'),
    },
  },
});
