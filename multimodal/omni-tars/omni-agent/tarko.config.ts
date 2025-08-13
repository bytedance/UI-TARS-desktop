/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig, LogLevel } from '@tarko/agent-cli';
import { resolve } from 'node:path';

export default defineConfig({
  model: {
    // provider: 'openai-non-streaming',
    // baseURL: process.env.OMNI_TARS_BASE_URL,
    // apiKey: process.env.OMNI_TARS_API_KEY,
    // id: process.env.OMNI_TARS_MODEL_ID,

    // id: '{search.nlp.seed_vision}.{hl}.{M8-23B-MoE-250717_m8_agentrlmodel_codeformatv2_0711_google_roll_back-S100}.{gui_23b_rl_s100}',
    // id: 'aws_claude35_sonnet',
    // id: 'aws_sdk_claude4_sonnet',
    // id: 'gpt-5-2025-08-07	',
    // id: 'gcp-claude4.1-opus	',
    // id: 'gemini-2.5-pro-preview-06-05',
    id: 'aws_sdk_claude4_sonnet',
    provider: 'azure-openai',
    apiKey: process.env.ANTHROPIC_AUTH_TOKEN,
    baseURL: process.env.GPT_I18N_URL,
    // provider: 'volcengine',
    // id: 'ep-20250613182556-7z8pl',
    // apiKey: process.env.ARK_API_KEY,
    thinking: {
      type: 'disabled',
    },
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
  snapshot: { storageDirectory: resolve(__dirname, 'snapshots'), enable: true },
});
