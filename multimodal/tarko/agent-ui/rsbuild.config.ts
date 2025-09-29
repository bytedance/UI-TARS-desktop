import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    define: {
      'process.env.AGENT_BASE_URL': JSON.stringify(process.env.AGENT_BASE_URL || ''),
      'process.env.AGENT_WEBUI_CONFIG': JSON.stringify(
        process.env.AGENT_WEBUI_CONFIG,
        // ||
        // {
        //   basePath: '/[a-zA-Z0-9]+',
        // },
      ),
    },
    entry: {
      index: './src/entry.tsx',
    },
  },
  dev: {
    writeToDisk: true,
  },
  // server: {
  //   base: '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY',
  // },
  output: {
    cleanDistPath: true,
    inlineScripts: true,
    inlineStyles: true,
    distPath: {
      root: resolve(__dirname, '../agent-ui-builder/static'),
    },
  },
  html: {
    template: './public/index.html',
    inject: 'body',
  },
});
