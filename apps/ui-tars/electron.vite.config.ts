/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import pkg from './package.json';
import { getExternalPkgs } from 'scripts/getExternalPkgs';

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      lib: {
        entry: './src/main/main.ts',
      },
      rollupOptions: {
        external: getExternalPkgs(),
      },
    },
    plugins: [tsconfigPaths()],
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: './src/preload/index.ts',
      },
    },
    plugins: [tsconfigPaths()],
  },
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          main: resolve('./src/renderer/index.html'),
        },
      },
      minify: true,
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
        },
      },
    },
    plugins: [react(), tsconfigPaths()],
    define: {
      APP_VERSION: JSON.stringify(pkg.version),
    },
  },
});
