/*
 * Copyright (C) 2025 Bytedance Ltd. and/or its affiliates
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import pkg from './package.json';

// get all workspace:* deps
const workspaceDeps = [
  ...Object.entries(pkg.dependencies || {})
    .filter(
      ([, version]) =>
        typeof version === 'string' && version.startsWith('workspace:'),
    )
    .map(([name]) => name),
  // extra esm only deps
  'electron-store',
];

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      lib: {
        entry: './src/main/main.ts',
      },
    },
    plugins: [
      externalizeDepsPlugin({
        exclude: workspaceDeps,
      }),
      tsconfigPaths(),
    ],
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: './src/preload/index.ts',
      },
    },
    plugins: [
      externalizeDepsPlugin({
        exclude: workspaceDeps,
      }),
      tsconfigPaths(),
    ],
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
