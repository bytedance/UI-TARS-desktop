import * as path from 'node:path';
import { defineConfig } from 'rspress/config';
import mermaid from 'rspress-plugin-mermaid';
import { pluginClientRedirects } from '@rspress/plugin-client-redirects';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  lang: 'en',
  title: 'Agent TARS',
  icon: '/favicon.png',
  globalStyles: path.join(__dirname, 'src/styles/index.css'),
  logo: {
    light: '/agent-tars-dark-logo.png',
    dark: '/agent-tars-dark-logo.png',
  },
  route: {
    exclude: [
      'en/sdk/**',
      'en/api/**',
      'en/api/runtime/**',
      'zh/sdk/**',
      'zh/api/**',
      'zh/api/runtime/**',
    ],
  },
  builderConfig: {
    resolve: {
      alias: {
        '@components': './src/components',
      },
    },
    html: {
      template: 'public/index.html',
      tags: [
        {
          tag: 'script',
          // Specify the default theme mode, which can be `dark` or `light`
          children: "window.RSPRESS_THEME = 'dark';",
        },
      ],
    },
  },
  plugins: [
    // @ts-expect-error
    mermaid({
      mermaidConfig: {
        // theme: 'base',
        fontSize: 16,
      },
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
      {
        icon: 'X',
        mode: 'link',
        content: 'https://x.com/agent_tars',
      },
      {
        icon: 'discord',
        mode: 'link',
        content: 'https://discord.com/invite/HnKcSBgTVx',
      },
    ],
  },
});
