/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { AgentOptions, LogLevel } from '@tarko/interface';
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
  aioSandboxUrl: process.env.AIO_SANDBOX_URL,
  // tavilyApiKey: process.env.TAVILY_API_KEY,
  linkReaderMcpUrl: process.env.LINK_READER_URL,
  linkReaderAK: process.env.LINK_READER_AK,
  ignoreSandboxCheck: true,
  logLevel: LogLevel.DEBUG,
  thinking: {
    type: process.env.NATIVE_THINKING === 'true' ? 'enabled' : 'disabled',
  },
} as AgentOptions;
