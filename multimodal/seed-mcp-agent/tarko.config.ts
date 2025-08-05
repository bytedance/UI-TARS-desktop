import { defineConfig, LogLevel } from '@tarko/agent-cli';

export default defineConfig({
  // model: {
  //   baseURL: process.env.ARK_TEST_URL,
  //   apiKey: process.env.ARK_TEST_KEY,
  //   id: 'ep-20250627155918-4jmhg',
  // },
  model: {
    provider: 'openai-non-streaming',
    baseURL: process.env.SEED_PROXY_URL,
    apiKey: process.env.ARK_TEST_KEY,
    id: '{search.nlp.seed_vision}.{hl}.{M8-23B-MoE-250717_m8_agentrlmodel_codeformatv2_0711_google_roll_back-S100}.{gui_23b_rl_s100}',
  },
  tavilyApiKey: process.env.TAVILY_API_KEY!,
  googleApiKey: process.env.GOOGLE_API_KEY!,
  logLevel: LogLevel.DEBUG,
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png',
    title: 'Seed MCP Agent',
    subtitle: 'Offering seamless integration with a wide range of real-world tools.',
    welcomTitle: 'An multimodal AI agent',
    welcomePrompts: [
      'Search for the latest GUI Agent papers',
      'Find information about UI TARS',
      'Tell me the top 5 most popular projects on ProductHunt today',
      'Please book me the earliest flight from Hangzhou to Shenzhen on 10.1',
    ],
  },
});
