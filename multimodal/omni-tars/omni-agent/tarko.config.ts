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
    displayName: 'omni-tars',
    /** aws */
    // provider: 'azure-openai',
    // id: 'aws_sdk_claude4_sonnet',
    // apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
    // baseURL: process.env.GPT_I18N_URL,
    /** seed1.6 */
    // provider: 'volcengine',
    // id: 'ep-20250613182556-7z8pl',
    // apiKey: process.env.ARK_API_KEY,
    // thinking: {
    //   type: 'disabled',
    // },
  },
  logLevel: LogLevel.DEBUG,
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png',
    title: 'Omni TARS Agent',
    subtitle: 'Offering seamless integration with a wide range of real-world tools.',
    welcomTitle: 'An multimodal AI agent',
    welcomePrompts: [
      'Search for the latest GUI Agent papers',
      'Find information about UI TARS',
      'Tell me the top 5 most popular projects on ProductHunt today',
      'Excute ls -al',
      'Write hello world using python',
      'Write a python code to download the paper https://arxiv.org/abs/2505.12370, and convert the pdf to markdown',
    ],
  },
  share: {
    provider: process.env.SHARE_PROVIDER,
  },
  snapshot: { storageDirectory: resolve(__dirname, 'snapshots'), enable: true },
});
