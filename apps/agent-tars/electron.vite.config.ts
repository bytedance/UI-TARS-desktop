import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  main: {
    root: 'src/main',
    build: {
      outDir: resolve(__dirname, './dist/main'),
    },
    plugins: [externalizeDepsPlugin(), tsconfigPaths()],
  },
  preload: {
    root: 'src/preload',
    build: {
      outDir: resolve(__dirname, './dist/preload'),
    },
    plugins: [externalizeDepsPlugin(), tsconfigPaths()],
  },
  renderer: {
    optimizeDeps: {
      include: [
        '@monaco-editor/react',
        'monaco-editor/esm/vs/language/json/json.worker',
        'monaco-editor/esm/vs/language/css/css.worker',
        'monaco-editor/esm/vs/language/html/html.worker',
        'monaco-editor/esm/vs/language/typescript/ts.worker',
        'monaco-editor/esm/vs/editor/editor.worker',
      ],
    },
    define: {
      'process.env.REPORT_HTML_MODE': 'false',
    },
    worker: {
      format: 'es',
    },
    root: 'src/renderer',
    build: {
      outDir: resolve(__dirname, './dist/renderer'),
      rollupOptions: {
        input: {
          main: resolve('./src/renderer/index.html'),
        },
        output: {
          manualChunks: {
            monaco: ['monaco-editor'],
          },
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

    plugins: [react(), tsconfigPaths()],
  },
});
