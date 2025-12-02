import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      index: ['src/**/*.ts', '!src/**/*.{test,bench}.ts'],
    },
  },
  lib: [
    {
      format: 'cjs',
      syntax: 'es2021',
      bundle: false,
      dts: true,
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: false,
    sourceMap: true,
  },
});
