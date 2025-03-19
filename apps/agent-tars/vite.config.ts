import path, { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  (async () => {
    const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
    return {
      worker: false,
      root: 'src/renderer',
      resolve: {
        alias: {
          '@ui-tars/electron-ipc/renderer': path.resolve(
            __dirname,
            './src/renderer/mock/ipc.ts',
          ),
        },
      },
      define: {
        'process.env.REPORT_HTML_MODE': 'true',
      },
      build: {
        outDir: resolve(__dirname, './dist/reporter'),
        rollupOptions: {
          input: {
            main: resolve('./src/renderer/index.html'),
          },
          output: {
            manualChunks: undefined,
            inlineDynamicImports: true,
            format: 'iife',
            entryFileNames: '[name].js',
            chunkFileNames: '[name].js',
            assetFileNames: '[name][extname]',
          },
        },
        cssCodeSplit: false,
        assetsInlineLimit: 100000000,
        minify: true,
      },
      css: {
        preprocessorOptions: {
          scss: {
            api: 'modern',
          },
        },
      },

      plugins: [react(), tsconfigPaths(), viteSingleFile()],
    };
  })(),
);
