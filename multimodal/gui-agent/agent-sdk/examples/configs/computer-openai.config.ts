/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { SYSTEM_PROMPT_2 } from './prompts';

export default defineConfig({
  operatorType: 'computer',
  model: {
    provider: 'openai',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    id: process.env.OPENAI_MODEL || 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY, // secretlint-disable-line
  },
  systemPrompt: SYSTEM_PROMPT_2,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/computer-openai'),
  },
  uiTarsVersion: 'latest',
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Computer (OpenAI)',
    subtitle: 'Desktop computer GUI agent powered by OpenAI GPT models',
    welcomTitle: 'Computer GUI Agent with OpenAI',
    welcomePrompts: [
      'Help me automate repetitive desktop tasks',
      'Assist with file management and organization',
      'Navigate through complex application interfaces',
      'Perform system administration tasks',
      'Help with software installation and configuration',
    ],
  },
});
