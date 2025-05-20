import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/entry.tsx',
    },
  },
  dev: {
    port: 5173,
  },
  output: {
    distPath: {
      root: 'dist',
    },
  },
  html: {
    template: './index.html',
  },
});
