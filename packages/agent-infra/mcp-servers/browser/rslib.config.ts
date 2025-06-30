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

const REQUEST_CONTEXT_PATH = /^(.\/request-context\.js)$/;

const BANNER = `/**
* Copyright (c) 2025 Bytedance, Inc. and its affiliates.
* SPDX-License-Identifier: Apache-2.0
*/`;

export default defineConfig({
  source: {
    define: {
      'process.env.NAME': JSON.stringify(pkg.name),
      'process.env.DESCRIPTION': JSON.stringify(pkg.description),
      'process.env.VERSION': JSON.stringify(pkg.version),
    },
    entry: {
      index: ['src/index.ts'],
      'request-context': ['src/request-context.ts'],
      server: ['src/server.ts'],
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: 'es2021',
      bundle: true,
      dts: true,
      banner: { js: BANNER },
      output: {
        externals: [
          function ({ context, request }, callback) {
            if (REQUEST_CONTEXT_PATH.test(request ?? '')) {
              const externalPath = request!.replace(/\.js$/, '.js');
              return callback(null as any, 'module ' + externalPath);
            }
            callback();
          },
        ],
      },
    },
    {
      format: 'cjs',
      syntax: 'es2021',
      bundle: true,
      dts: true,
      banner: { js: BANNER },
      output: {
        externals: [
          function ({ context, request }, callback) {
            if (REQUEST_CONTEXT_PATH.test(request ?? '')) {
              const externalPath = request!.replace(/\.js$/, '.cjs');
              return callback(null as any, 'commonjs ' + externalPath);
            }
            callback();
          },
        ],
      },
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: true,
    sourceMap: false,
  },
});
