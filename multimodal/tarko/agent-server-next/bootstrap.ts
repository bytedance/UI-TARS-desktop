/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentServer } from './src/server';
import { resolve } from 'path';

const workspace = resolve(__dirname, './tmp');

const server = new AgentServer({
  appConfig: {
    agent: {
      type: 'modulePath',
      value: '@omni-tars/agent',
    },
    model: {
      /** tars */
      provider: 'volcengine',
      id: process.env.OMNI_TARS_MODEL_ID,
      baseURL: process.env.OMNI_TARS_BASE_URL,
      apiKey: process.env.OMNI_TARS_API_KEY,
      displayName: 'UI-TARS-2',
    },
    share: {
      provider: process.env.SHARE_PROVIDER,
    },
    temperature: 0.7,
    top_p: 0.9,
    workspace,
    snapshot: { storageDirectory: resolve(workspace, 'snapshots'), enable: true },
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
  },
});

console.log('🚀 Starting UI-TARS Agent Server...');
server.start();
