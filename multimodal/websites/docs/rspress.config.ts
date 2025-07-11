import * as path from 'node:path';
import { defineConfig } from 'rspress/config';
import mermaid from 'rspress-plugin-mermaid';
import { pluginClientRedirects } from '@rspress/plugin-client-redirects';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  lang: 'en',
  title: 'Agent TARS',
  icon: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png',
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
      isProd ? 'en/banner' : '',
    ].filter(Boolean),
  },
  builderConfig: {
    resolve: {
      alias: {
        '@components': './src/components',
        '@pages': './src/pages',
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
      title: 'Agent TARS - Open-source Multimodal AI Agent Stack',
      meta: {
        description:
          'Agent TARS is a general multimodal AI Agent stack, it brings the power of GUI Agent and Vision into your terminal, computer, browser and product. It primarily ships with a CLI and Web UI for usage. It aims to provide a workflow that is closer to human-like task completion through cutting-edge multimodal LLMs and seamless integration with various real-world MCP tools.',
        keywords:
          'AI agent, multimodal, GUI interaction, GUI Agent, GUI Grounding, Visual Grounding, Agent TARS, open-source, browser automation',
        author: 'Agent TARS Team',
        viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
        'content-language': 'en',
        robots: 'index, follow',
        'twitter:card': 'summary_large_image',
        'twitter:site': '@agent_tars',
        'twitter:creator': '@_ulivz',
        'twitter:title': 'Agent TARS - Open-source Multimodal AI Agent Stack',
        'twitter:description':
          'Agent TARS is a general multimodal AI Agent stack, it brings the power of GUI Agent and Vision into your terminal, computer, browser and product. It primarily ships with a CLI and Web UI for usage. It aims to provide a workflow that is closer to human-like task completion through cutting-edge multimodal LLMs and seamless integration with various real-world MCP tools.',
        'twitter:image':
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/banner.png',
        // Open Graph metadata (also used by Twitter)
        'og:title': 'Agent TARS - Open-source Multimodal AI Agent Stack',
        'og:description':
          'Agent TARS is a general multimodal AI Agent stack, it brings the power of GUI Agent and Vision into your terminal, computer, browser and product. It primarily ships with a CLI and Web UI for usage. It aims to provide a workflow that is closer to human-like task completion through cutting-edge multimodal LLMs and seamless integration with various real-world MCP tools.',
        'og:image':
          'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/banner.png',
        'og:url': 'https://agent-tars.com',
        'og:type': 'website',
        'og:site_name': 'Agent TARS',
        // Canonical URL
        canonical: 'https://agent-tars.com',
      },
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
