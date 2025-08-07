/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from '@rslib/core';

const BANNER = `/**
* Copyright (c) 2025 Bytedance, Inc. and its affiliates.
* SPDX-License-Identifier: Apache-2.0
*/`;

export default defineConfig({
  source: {
    entry: {
      index: ['src/index.ts'],
    },
  },
  lib: [
    {
      format: 'cjs',
      syntax: 'es2021',
      bundle: true,
      dts: true,
      banner: { js: BANNER },
      autoExternal: {
        dependencies: false,
        optionalDependencies: true,
        peerDependencies: true,
      },
      output: {
        externals: ['@tarko/context-engineer', '@tarko/context-engineer/node'],
      },
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: true,
    sourceMap: true,
  },
});
