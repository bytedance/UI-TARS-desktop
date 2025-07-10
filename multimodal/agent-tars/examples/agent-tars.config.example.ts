import { defineConfig } from '@agent-tars/interface';

export default defineConfig({
  model: {
    provider: 'volcengine',
    id: 'doubao-1-5-thinking-vision-pro-250428',
    // id: 'ep-20250707042204-d9mbh',
    apiKey: process.env.VOLCENGINE_API_KEY || 'your-api-key-here',
  },

  browser: {
    type: 'local',
    headless: false,
    control: 'hybrid',
    stealth: true, // 启用 Puppeteer Stealth 插件（默认值）
    // stealth: false,  // 禁用 Puppeteer Stealth 插件
    // userDataDir: '/path/to/custom/profile', // 自定义浏览器配置文件路径（可选）
  },

  workspace: {
    workingDirectory: './workspace',
  },

  planner: {
    enable: false,
    maxSteps: 3,
  },

  logLevel: 'info',
  stream: true,

  thinking: {
    type: 'enabled',
  },

  // 可以根据环境变量动态配置
  ...(process.env.NODE_ENV === 'development' && {
    debug: true,
    browser: {
      headless: false,
      // stealth: false, // 取消注释以在开发环境禁用 stealth
    },
  }),
});
