/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from '@rslib/core';
import path from 'path';
import fs from 'fs';

const BANNER = `/**
* Copyright (c) 2025 Bytedance, Inc. and its affiliates.
* SPDX-License-Identifier: Apache-2.0
*/`;

export default defineConfig({
  source: {
    entry: {
      index: ['src/**/*.ts', '!src/**/*.{test,bench}.ts'],
    },
    define: {
      BUILD_DOM_TREE_SCRIPT: JSON.stringify(
        fs.readFileSync(
          path.join(__dirname, './assets/buildDomTree.js'),
          'utf8',
        ),
      ),
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: 'es2021',
      bundle: false,
      dts: true,
      banner: { js: BANNER },
    },
    {
      format: 'cjs',
      syntax: 'es2021',
      bundle: false,
      dts: true,
      banner: { js: BANNER },
    },
  ],
  output: {
    target: 'web',
    cleanDistPath: true,
    sourceMap: true,
  },
});
