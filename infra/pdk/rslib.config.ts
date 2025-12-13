import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      index: 'src/**',
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: 'es2021',
      bundle: false,
      autoExternal: {
        dependencies: false, // Enable bundling to include tiny-conventional-commits-parser
        optionalDependencies: true,
        peerDependencies: true,
      },
      dts: true,
    },
  ],
  output: {
    target: 'node',
    cleanDistPath: false,
    sourceMap: true,
  },
});
