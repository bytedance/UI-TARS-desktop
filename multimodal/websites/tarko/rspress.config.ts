import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import mermaid from 'rspress-plugin-mermaid';
import { pluginClientRedirects } from '@rspress/plugin-client-redirects';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  lang: 'en',
  title: 'Tarko',
  icon: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/vryha/ljhwZthlaukjlkulzlp/tarko.png',
  logo: {
    light: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/vryha/ljhwZthlaukjlkulzlp/tarko.png',
    dark: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/vryha/ljhwZthlaukjlkulzlp/tarko.png',
  },
  builderConfig: {
    resolve: {
      alias: {
        '@components': './src/components',
        '@pages': './src/pages',
      },
    },
    html: {
      title: 'Tarko - Tool-augmented Agent Runtime Kernel',
      meta: {
        description:
          'A tool-augmented agent runtime kernel with powerful Context Engineering capabilities',
        keywords: 'agent, runtime, tool-call, context-engineering, llm, ai',
        author: 'Tarko Team',
        viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
        robots: 'index, follow',
      },
    },
  },
  plugins: [
    // @ts-expect-error
    mermaid({
      mermaidConfig: {
        fontSize: 16,
      },
    }),
    pluginClientRedirects({
      redirects: [],
    }),
  ],
  themeConfig: {
    darkMode: false,
    enableContentAnimation: true,
    enableAppearanceAnimation: true,
    locales: [
      {
        lang: 'en',
        label: 'English',
        outlineTitle: 'On This Page',
      },
      {
        lang: 'zh',
        label: '简体中文',
        outlineTitle: '大纲',
      },
    ],
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/bytedance/UI-TARS-desktop',
      },
    ],
  },
});
