import { defineConfig } from '@rslib/core';
import { readFileSync } from 'node:fs';

const BANNER = `/**
* Copyright (c) 2025 Bytedance, Inc. and its affiliates.
* SPDX-License-Identifier: Apache-2.0
*/
`;

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;

export default defineConfig({
  source: {
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.VERSION': `"${version}"`,
    },
    entry: {
      cli: ['src/utils/cli.ts'],
    },
  },
  lib: [
    {
      format: 'cjs',
      syntax: 'es2021',
      bundle: true,
      dts: false,
      banner: { js: BANNER },
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: true,
    minify: true,
    sourceMap: false,
  },
});
