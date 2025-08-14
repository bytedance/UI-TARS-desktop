/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { defineConfig } from '@tarko/agent-cli';
import { SYSTEM_PROMPT_LATEST } from './src/constants';
import { SYSTEM_PROMPT } from './dist/constants';
import path from 'path';

export default defineConfig({
  operatorType: 'browser',
  model: {
    provider: 'volcengine',
    baseURL: process.env.ARK_BASE_URL,
    id: process.env.ARK_MODEL,
    apiKey: process.env.ARK_API_KEY, // secretlint-disable-line
    // provider: 'openai-non-streaming',
    // baseURL: process.env.SEED_BASE_URL,
    // id: process.env.SEED_MODEL,
    // apiKey: process.env.SEED_API_KEY, // secretlint-disable-line
  },
  systemPrompt: SYSTEM_PROMPT,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, 'snapshot'),
  },
  uiTarsVersion: 'latest',
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent',
    subtitle: 'The GUI agent driven by UI-TARS and Seed-1.5-VL/1.6 series models.',
    welcomTitle: 'An multimodal GUI agent',
    welcomePrompts: [
      'Search for the latest GUI Agent papers',
      'Find information about UI TARS',
      'Tell me the top 5 most popular projects on ProductHunt today',
      'Please book me the earliest flight from Hangzhou to Shenzhen on 10.1',
      'What is Agent TARS',
    ],
  },
});
