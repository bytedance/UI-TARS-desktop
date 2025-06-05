/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from '@rslib/core';
import pkg from './package.json';

const BANNER = `/**
* Copyright (c) 2025 Bytedance, Inc. and its affiliates.
* SPDX-License-Identifier: Apache-2.0
*/`;

export default defineConfig({
  source: {
    entry: {
      cli: ['src/cli.ts'],
    },
    define: {
      __VERSION__: JSON.stringify(pkg.version),
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: 'es2021',
      bundle: true,
      dts: true,
      banner: { js: BANNER },
    },
    {
      format: 'cjs',
      syntax: 'es2021',
      bundle: true,
      dts: true,
      banner: { js: BANNER },
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: false,
    sourceMap: true,
  },
});
