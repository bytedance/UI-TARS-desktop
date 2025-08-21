/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig, LogLevel } from '@tarko/agent-cli';
import { resolve } from 'node:path';

export default defineConfig({
  model: {
    /** tars */
    provider: 'volcengine',
    id: process.env.OMNI_TARS_MODEL_ID,
    baseURL: process.env.OMNI_TARS_BASE_URL,
    apiKey: process.env.OMNI_TARS_API_KEY,
    displayName: 'Omni-TARS',
    /** aws */
    // provider: 'azure-openai',
    // id: 'aws_sdk_claude4_sonnet',
    // apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
    // baseURL: process.env.GPT_I18N_URL,
    /** seed1.6 */
    // provider: 'volcengine',
    // id: 'ep-20250613182556-7z8pl',
    // apiKey: process.env.ARK_API_KEY,
    thinking: {
      type: 'disabled',
    },
  },
  logLevel: LogLevel.DEBUG,
  share: {
    provider: process.env.SHARE_PROVIDER,
  },
  snapshot: { storageDirectory: resolve(__dirname, 'snapshots'), enable: true },
});
