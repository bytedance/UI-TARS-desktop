import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      index: 'src/index.ts',
    },
  },
  lib: [
    {
      format: 'cjs',
      syntax: 'es2021',
      bundle: true,
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
