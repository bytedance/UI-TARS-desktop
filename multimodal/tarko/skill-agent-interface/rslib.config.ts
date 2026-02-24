import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      syntax: 'es2021',
      dts: true,
      outDir: 'dist',
      sourceMap: true,
    },
    {
      format: 'cjs',
      syntax: 'es2021',
      dts: true,
      outDir: 'dist',
      sourceMap: true,
    },
  ],
  output: {
    target: 'node',
  },
});
