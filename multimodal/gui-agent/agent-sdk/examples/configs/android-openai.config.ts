/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { SYSTEM_PROMPT_2 } from './prompts';

export default defineConfig({
  operatorType: 'android',
  model: {
    provider: 'openai',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    id: process.env.OPENAI_MODEL || 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY, // secretlint-disable-line
  },
  systemPrompt: SYSTEM_PROMPT_2,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/android-openai'),
  },
  uiTarsVersion: 'latest',
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Android (OpenAI)',
    subtitle: 'Android mobile GUI agent powered by OpenAI GPT models',
    welcomTitle: 'Android GUI Agent with OpenAI',
    welcomePrompts: [
      'Help me test mobile applications thoroughly',
      'Automate Android UI interactions and workflows',
      'Assist with mobile device management tasks',
      'Navigate complex mobile app interfaces',
      'Perform mobile accessibility testing',
    ],
  },
});
