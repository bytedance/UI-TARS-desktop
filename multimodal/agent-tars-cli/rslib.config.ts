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
      cli: ['src/**'],
    },
  },
  lib: [
    {
      format: 'cjs',
      syntax: 'esnext',
      bundle: false,
      dts: true,
      autoExternal: {
        dependencies: false,
        optionalDependencies: false,
        peerDependencies: false,
      },
      banner: { js: BANNER },
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: false,
    sourceMap: false,
  },
});
