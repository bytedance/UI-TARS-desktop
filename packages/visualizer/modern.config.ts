/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import path from 'node:path';

import { defineConfig, moduleTools } from '@modern-js/module-tools';
import { modulePluginNodePolyfill } from '@modern-js/plugin-module-node-polyfill';

import { version } from './package.json';

const externals = ['playwright', 'langsmith'];

const commonConfig = {
  asset: {
    svgr: true,
  },
  autoExternal: false,
  externals: [...externals],
  target: 'es2018',
  minify: process.env.CI
    ? {
        compress: true,
      }
    : undefined,
  define: {
    __VERSION__: JSON.stringify(version),
    global: 'globalThis',
  },
};

export default defineConfig({
  buildConfig: [
    {
      ...commonConfig,
      alias: {
        async_hooks: path.join(__dirname, './src/blank_polyfill.ts'),
      },
      format: 'umd',
      dts: false,
      input: {
        report: 'src/index.tsx',
      },
      umdModuleName: (path) => {
        return 'uiTARSVisualizer';
      },
      platform: 'browser',
      outDir: 'dist',
      target: 'es2018',
    },
  ],
  plugins: [
    moduleTools(),
    modulePluginNodePolyfill({
      excludes: ['console'],
    }),
  ],
  buildPreset: 'npm-component',
});
