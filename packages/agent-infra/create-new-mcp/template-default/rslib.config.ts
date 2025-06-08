import { defineConfig } from '@rslib/core';
import path from 'node:path';
import fs from 'node:fs';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '.', 'package.json'), 'utf-8'),
);

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
    },
    {
      format: 'cjs',
      syntax: 'es2021',
      bundle: true,
      dts: true,
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: true,
    sourceMap: false,
  },
});
