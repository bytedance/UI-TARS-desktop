import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/entry.tsx',
    },
  },
  html: {
    title: 'Agent TARS - An Open-source Multimodal AI Agent',
    meta: {
      description:
        'Agent TARS is an open-source multimodal AI agent designed to revolutionize GUI interaction by visually interpreting web pages and seamlessly integrating with command lines and file systems.',
      keywords:
        'AI agent, multimodal, GUI interaction, Agent TARS, open-source, browser automation',
      author: 'Agent TARS Team',
      // Viewport for mobile responsiveness
      viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
    },
  },
});
