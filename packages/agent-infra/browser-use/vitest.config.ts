/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/*.e2e.{test,spec}.ts'],
    testTimeout: 10000,
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    // Mock the BUILD_DOM_TREE_SCRIPT for tests
    BUILD_DOM_TREE_SCRIPT: '"mock-script"',
  },
});
