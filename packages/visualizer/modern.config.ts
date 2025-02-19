/**
 * Copyright (c) 2024-present Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: MIT
 */
import path from 'node:path';

import { defineConfig, moduleTools } from '@modern-js/module-tools';
import { modulePluginNodePolyfill } from '@modern-js/plugin-module-node-polyfill';

import { version } from './package.json';

const externals = [
  'playwright',
  'langsmith',
  'react',
  'react-dom',
  'dayjs',
  'antd',
  // 'pixi.js', // pixi.js and pixi.js-legacy use same globalName: PIXI
  'pixi.js-legacy',
  'pixi-filters',
];

export default defineConfig({
  buildConfig: [
    {
      asset: {
        svgr: true,
      },
      autoExternal: false,
      externals: [...externals],
      define: {
        __VERSION__: JSON.stringify(version),
        global: 'globalThis',
      },
      minify: 'terser',
      umdGlobals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        dayjs: 'dayjs',
        antd: 'antd',
        'pixi.js-legacy': 'PIXI',
      },
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
