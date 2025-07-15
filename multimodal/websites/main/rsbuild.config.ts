import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginHtmlGenerator } from './src/build/htmlGeneratorPlugin';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginHtmlGenerator({
      verbose: true,
    }),
  ],
  tools: {
    rspack: config => {
      config.module!.rules!.push({
        test: /\.md$/,
        type: 'asset/source',
      });
      return config;
    },
  },
  source: {
    entry: {
      index: './src/render/entry.tsx',
    },
  },
  server: {
    historyApiFallback: true,
  },
  html: {
    title: 'Agent TARS - Open-source Multimodal AI Agent',
    template: 'public/index.html',
    favicon:
      'https://github.com/bytedance/UI-TARS-desktop/blob/main/apps/ui-tars/resources/favicon-32x32.png?raw=true',
    meta: {
      description:
        'Agent TARS is an open-source multimodal AI agent designed to revolutionize GUI interaction by visually interpreting web pages and seamlessly integrating with command lines and file systems.',
      keywords:
        'AI agent, multimodal, GUI interaction, Agent TARS, open-source, browser automation',
      author: 'Agent TARS Team',
      // Viewport for mobile responsiveness
      viewport: 'width=device-width, initial-scale=1, maximum-scale=5',
      // Content language
      'content-language': 'en',
      // Robots directive
      robots: 'index, follow',
      // Twitter Card metadata
      'twitter:card': 'summary_large_image',
      'twitter:site': '@AgentTars',
      'twitter:creator': '@AgentTars',
      'twitter:title': 'Agent TARS - Open-source Multimodal AI Agent',
      'twitter:description':
        'An open-source multimodal AI agent designed to revolutionize GUI interaction by visually interpreting web pages and seamlessly integrating with command lines and file systems.',
      'twitter:image':
        'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/agent-tars-twitter-banner.png',
      // Open Graph metadata (also used by Twitter)
      'og:title': 'Agent TARS - Open-source Multimodal AI Agent',
      'og:description':
        'An open-source multimodal AI agent designed to revolutionize GUI interaction by visually interpreting web pages and seamlessly integrating with command lines and file systems.',
      'og:image':
        'https://sf16-sg.tiktokcdn.com/obj/eden-sg/psvhouloj/images/agent-tars-twitter-banner.png',
      'og:url': 'https://agent-tars.com',
      'og:type': 'website',
      'og:site_name': 'Agent TARS',
      // Article specific metadata
      'og:article:published_time': '2025-03-18',
      'og:article:author': 'Agent TARS Team',
      // Canonical URL
      canonical: 'https://agent-tars.com',
    },
    // 使用 tags 配置替代之前的 scripts 配置
    tags: [
      {
        tag: 'link',
        attrs: {
          rel: 'canonical',
          href: 'https://agent-tars.com',
        },
      },
      {
        tag: 'script',
        attrs: {
          type: 'application/ld+json',
        },
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Agent TARS',
          applicationCategory: 'AIApplication',
          operatingSystem: 'macOS',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          description:
            'An open-source multimodal AI agent designed to revolutionize GUI interaction',
        }),
      },
    ],
  },
  // Performance optimization
  performance: {
    chunkSplit: {
      strategy: 'all-in-one',
    },
  },
});
