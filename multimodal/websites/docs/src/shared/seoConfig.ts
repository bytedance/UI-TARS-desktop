export const SEO_CONFIG = {
  // Basic information
  siteName: 'Agent TARS',
  siteUrl: 'https://agent-tars.com',
  defaultTitle: 'Agent TARS - Open-source Multimodal AI Agent Stack',
  defaultDescription:
    'Agent TARS is a general multimodal AI Agent stack, it brings the power of GUI Agent and Vision into your terminal, computer, browser and product. It primarily ships with a CLI and Web UI for usage. It aims to provide a workflow that is closer to human-like task completion through cutting-edge multimodal LLMs and seamless integration with various real-world MCP tools.',

  // Social media
  social: {
    twitter: {
      site: '@agent_tars',
      creator: '@_ulivz',
    },
  },

  // Image resources
  images: {
    defaultOgImage:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/x-banner.png',
    favicon:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png',
  },

  // Keywords
  keywords: [
    'AI agent',
    'multimodal',
    'GUI interaction',
    'GUI Agent',
    'GUI Grounding',
    'Visual Grounding',
    'Agent TARS',
    'open-source',
    'browser automation',
  ],

  // Other configurations
  author: 'Agent TARS Team',
  contentLanguage: 'en',
  robots: 'index, follow',
} as const;

export type SEOConfig = typeof SEO_CONFIG;
