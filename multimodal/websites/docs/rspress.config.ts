import * as path from 'node:path';
import { defineConfig } from 'rspress/config';
import mermaid from 'rspress-plugin-mermaid';
import { pluginClientRedirects } from '@rspress/plugin-client-redirects';
import { SEO_CONFIG } from './src/shared/seoConfig';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  lang: 'en',
  title: SEO_CONFIG.siteName,
  icon: SEO_CONFIG.images.favicon,
  globalStyles: path.join(__dirname, 'src/styles/index.css'),
  logo: {
    light: '/agent-tars-dark-logo.png',
    dark: '/agent-tars-dark-logo.png',
  },
  route: {
    exclude: isProd
      ? [
          'en/sdk/**',
          'en/api/**',
          'en/api/runtime/**',
          'zh/sdk/**',
          'zh/api/**',
          'zh/api/runtime/**',
          'en/banner',
        ].filter(Boolean)
      : [],
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
      title: SEO_CONFIG.defaultTitle,
      meta: {
        description: SEO_CONFIG.defaultDescription,
        keywords: SEO_CONFIG.keywords.join(', '),
        author: SEO_CONFIG.author,
        viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
        'content-language': SEO_CONFIG.contentLanguage,
        robots: SEO_CONFIG.robots,
        'twitter:card': 'summary_large_image',
        'twitter:site': SEO_CONFIG.social.twitter.site,
        'twitter:creator': SEO_CONFIG.social.twitter.creator,
        'twitter:title': SEO_CONFIG.defaultTitle,
        'twitter:description': SEO_CONFIG.defaultDescription,
        'twitter:image': SEO_CONFIG.images.defaultOgImage,
        // Open Graph metadata (also used by Twitter)
        'og:title': SEO_CONFIG.defaultTitle,
        'og:description': SEO_CONFIG.defaultDescription,
        'og:image': SEO_CONFIG.images.defaultOgImage,
        'og:url': SEO_CONFIG.siteUrl,
        'og:type': 'website',
        'og:site_name': SEO_CONFIG.siteName,
        // Canonical URL
        canonical: SEO_CONFIG.siteUrl,
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
