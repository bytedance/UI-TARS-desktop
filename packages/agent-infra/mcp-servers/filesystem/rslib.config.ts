/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from '@rslib/core';
import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '.', 'package.json'), 'utf-8'),
);

const BANNER = `/**
* Copyright (c) 2025 Bytedance, Inc. and its affiliates.
* SPDX-License-Identifier: Apache-2.0
*/`;

export default defineConfig({
  source: {
    entry: {
      index: ['src/index.ts'],
      server: ['src/server.ts'],
    },
    define: {
      'process.env.NAME': JSON.stringify(pkg.name),
      'process.env.DESCRIPTION': JSON.stringify(pkg.description),
      'process.env.VERSION': JSON.stringify(pkg.version),
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
    cleanDistPath: true,
    sourceMap: false,
  },
});
