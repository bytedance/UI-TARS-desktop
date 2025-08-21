import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'esm',
      dts: true,
    },
    {
      format: 'cjs',
      dts: false,
    },
  ],
  output: {
    target: 'node',
  },
});
