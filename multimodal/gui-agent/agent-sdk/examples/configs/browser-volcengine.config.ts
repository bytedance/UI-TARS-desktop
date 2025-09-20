/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { SYSTEM_PROMPT_2 } from './prompts';

export default defineConfig({
  operatorType: 'browser',
  model: {
    provider: 'volcengine',
    baseURL: process.env.ARK_BASE_URL,
    id: process.env.ARK_MODEL,
    apiKey: process.env.ARK_API_KEY, // secretlint-disable-line
  },
  systemPrompt: SYSTEM_PROMPT_2,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/browser-volcengine'),
  },
  uiTarsVersion: 'latest',
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Browser (Volcengine)',
    subtitle: 'Browser-based GUI agent powered by Volcengine ARK models',
    welcomTitle: 'Browser GUI Agent with Volcengine',
    welcomePrompts: [
      'Search for the latest AI research papers',
      'Navigate to GitHub and find trending repositories',
      'Open Google Maps and search for nearby restaurants',
      'Visit YouTube and find tutorials on machine learning',
      'Browse Amazon and search for tech gadgets',
    ],
  },
});
