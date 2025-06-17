import * as path from 'node:path';
import { defineConfig } from 'rspress/config';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  lang: 'en',
  title: 'Agent TARS',
  icon: '/agent-tars-icon.png',
  globalStyles: path.join(__dirname, 'src/styles/index.css'),
  logo: {
    light: '/agent-tars-dark-logo.png',
    dark: '/agent-tars-dark-logo.png',
  },
  builderConfig: {
    html: {
      tags: [
        {
          tag: 'script',
          // Specify the default theme mode, which can be `dark` or `light`
          children: "window.RSPRESS_THEME = 'dark';",
        },
      ],
    },
  },
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
        content: 'https://x.com/agenttars',
      },
    ],
  },
});
