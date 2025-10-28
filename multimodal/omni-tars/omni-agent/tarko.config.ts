/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentOptions, LogLevel, AgentAppConfig } from '@tarko/interface';
import { resolve } from 'node:path';

export default {
  model: {
    /** tars */
    provider: 'volcengine',
    id: process.env.OMNI_TARS_MODEL_ID,
    baseURL: process.env.OMNI_TARS_BASE_URL,
    apiKey: process.env.OMNI_TARS_API_KEY,
    displayName: 'UI-TARS-2',
    /** aws */
    // provider: 'azure-openai',
    // id: 'aws_sdk_claude4_sonnet',
    // apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
    // baseURL: process.env.GPT_I18N_URL,
    /** seed1.6 */
    // provider: 'volcengine',
    // id: 'ep-20250613182556-7z8pl',
    // apiKey: process.env.ARK_API_KEY,
  },
  share: {
    provider: process.env.SHARE_PROVIDER,
  },
  temperature: 1,
  top_p: 0.9,
  snapshot: { storageDirectory: resolve(__dirname, 'snapshots'), enable: true },
  googleApiKey: process.env.GOOGLE_API_KEY,
  googleMcpUrl: process.env.GOOGLE_MCP_URL,
  sandboxUrl: process.env.AIO_SANDBOX_URL,
  // tavilyApiKey: process.env.TAVILY_API_KEY,
  linkReaderMcpUrl: process.env.LINK_READER_URL,
  linkReaderAK: process.env.LINK_READER_AK,
  ignoreSandboxCheck: true,
  thinking: {
    type: process.env.NATIVE_THINKING === 'true' ? 'enabled' : 'disabled',
  },
  server: {
    storage: {
      type: process.env.STORAGE_TYPE,
      uri: process.env.MONGO_URI,
      options: {
        dbName: process.env.MONGO_DB_NAME,
      },
    },
    runtimeSettings: {
        schema: {
          type: 'object',
          properties: {
            agentMode: {
              type: 'string',
              title: 'Agent Mode',
              enum: ['omni', 'gui', 'game'],
              enumLabels: ['Omni', 'GUI', 'Game'],
              default: 'omni',
              placement: 'chat-bottom',
            },
            browserMode: {
              type: 'string',
              title: 'Browser Control',
              enum: ['hybrid'],
              enumLabels: ['Hybrid'],
              default: 'hybrid',
              placement: 'chat-bottom',
              visible: {
                dependsOn: 'agentMode',
                when: 'gui',
              },
            },
          },
        },
        transform: (runtimeSettings: Record<string, unknown>) => {
          return {
            agentMode: {
              id: runtimeSettings.agentMode,
              browserMode: runtimeSettings.browserMode,
              link: runtimeSettings.link ?? undefined,
            },
          };
        },
      },
  },
  logLevel: LogLevel.DEBUG,
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png',
    subtitle: 'Offering seamless integration with a wide range of real-world tools.',
    welcomTitle: 'Omni Agent',
    welcomePrompts: [
      'Search for the latest GUI Agent papers',
      'Find information about UI TARS',
      'Tell me the top 5 most popular projects on ProductHunt today',
      'Please book me the earliest flight from Hangzhou to Shenzhen on 10.1',
      'What is Agent TARS',
    ],
  },
} as AgentAppConfig;
