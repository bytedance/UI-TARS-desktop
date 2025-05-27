import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/entry.tsx',
    },
  },
  dev: {
    writeToDisk: true,
  },
  output: {
    cleanDistPath: true,
    distPath: {
      root: resolve(__dirname, '../agent-tars-cli/static'),
    },
  },
  html: {
    template: './public/index.html',
  },
});
