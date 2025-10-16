/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { getContext } from 'hono/context-storage';
import { AuthHook, CorsHook, AgentServer, ContextStorageHook } from '../src/index';
import { resolve } from 'path';
import { ContextVariables } from '../src/types';

const workspace = resolve(__dirname, './tmp');

const server = new AgentServer({
  appConfig: {
    agent: {
      type: 'modulePath',
      value: '@omni-tars/agent',
    },
    share: {
      provider: process.env.SHARE_PROVIDER,
    },
    temperature: 0.7,
    top_p: 0.9,
    workspace,
    snapshot: process.env.AGENT_DEBUG
      ? { storageDirectory: resolve(workspace, 'snapshots'), enable: true }
      : undefined,
    googleApiKey: process.env.GOOGLE_API_KEY,
    googleMcpUrl: process.env.GOOGLE_MCP_URL,
    sandboxUrl: process.env.AIO_SANDBOX_URL,
    linkReaderMcpUrl: process.env.LINK_READER_URL,
    linkReaderAK: process.env.LINK_READER_AK,
    ignoreSandboxCheck: true,
    thinking: {
      type: process.env.NATIVE_THINKING === 'true' ? 'enabled' : 'disabled',
    },
    server: {
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
              link: runtimeSettings.link || '',
            },
          };
        },
      },
      storage: {
        type: 'mongodb',
        uri: process.env.MONGO_URI,
        options: {
          dbName: process.env.MONGO_DB_NAME,
        },
      },
      tenant: {
        mode: 'multi',
        auth: true,
      },
      models: [
         {
          id: 'ep-20250926155907-tnrqq',
          provider: 'volcengine',
          displayName: 'T6.5-RL',
          baseURL: process.env.OMNI_TARS_BASE_URL,
          apiKey: process.env.OMNI_TARS_API_KEY,
        },
        {
          id: 'ep-20250905175225-hlrvd',
          provider: 'volcengine',
          displayName: 'T5-RL',
          baseURL: process.env.OMNI_TARS_BASE_URL,
          apiKey: process.env.OMNI_TARS_API_KEY,
        },
        {
          id: 'ep-20250909173748-wcfb2',
          provider: 'volcengine',
          displayName: 'T6-SFT',
          baseURL: process.env.OMNI_TARS_BASE_URL,
          apiKey: process.env.OMNI_TARS_API_KEY,
        },
      ],
      sandbox: {
        baseUrl: process.env.SANDBOX_BASE_URL,
        getJwtToken: async () => {
          const res = await fetch(process.env.SANDBOX_JWT_URL, {
            method: 'GET',
            headers: {
              Authorization: process.env.SANDBOX_JWT_TOKEN,
            },
          });

          const token = res.headers.get('x-jwt-token');

          return token;
        },
      },
    },
    webui: {
      type: 'remote',
      remoteUrl: process.env.WEBUI_REMOTE_URL,
    },
  },
});

const logger = {
  name: 'custom',
  info: (...splat) => {
    const requestId = getContext<{ Variables: ContextVariables }>().var.requestId;
    console.log(`[CUSTOM LOGGER] ${requestId}`, ...splat);
  },
  warn: console.warn,
  error: console.error,
  debug: console.debug,
  setLevel: () => {},
};

server.setLogger(logger);
server.registerHook(AuthHook);
server.registerHook(CorsHook);
server.registerHook(ContextStorageHook);

console.log('🚀 Starting TARS Agent Server...');
server.start();
