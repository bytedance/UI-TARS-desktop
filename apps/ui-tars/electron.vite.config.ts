/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import {
  defineConfig,
  externalizeDepsPlugin,
  bytecodePlugin,
} from 'electron-vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import pkg from './package.json';
import { getExternalPkgs } from './scripts/getExternalPkgs';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  main: {
    define: {
      'process.env.UI_TARS_APP_PRIVATE_KEY_BASE64': JSON.stringify(
        process.env.UI_TARS_APP_PRIVATE_KEY_BASE64,
      ),
    },
    build: {
      outDir: 'dist/main',
      lib: {
        entry: './src/main/main.ts',
      },
      rollupOptions: {
        output: {
          manualChunks(id): string | void {
            // IMPORTANT: can't change the name of the chunk, avoid private key leak
            if (id.includes('app_private')) {
              return 'app_private';
            }
          },
        },
      },
    },
    plugins: [
      bytecodePlugin({
        chunkAlias: 'app_private',
        protectedStrings: [process.env.UI_TARS_APP_PRIVATE_KEY_BASE64!],
      }),
      tsconfigPaths(),
      externalizeDepsPlugin({
        include: [...getExternalPkgs()],
      }),
      {
        name: 'native-node-module-path',
        enforce: 'pre',
        resolveId(source) {
          if (source.includes('screencapturepermissions.node')) {
            return {
              id: '@computer-use/mac-screen-capture-permissions/build/Release/screencapturepermissions.node',
              external: true,
            };
          }
          return null;
        },
      },
    ],
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: './src/preload/index.ts',
      },
    },
    plugins: [tsconfigPaths()],
  },
  renderer: {
    root: 'src/renderer',
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          main: resolve('./src/renderer/index.html'),
        },
      },
      minify: true,
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
        },
      },
    },
    plugins: [react(), tsconfigPaths(), tailwindcss()],
    define: {
      APP_VERSION: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        crypto: resolve(__dirname, 'src/renderer/src/polyfills/crypto.ts'),
      },
    },
  },
});
