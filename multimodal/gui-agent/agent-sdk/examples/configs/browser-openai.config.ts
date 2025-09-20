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
    provider: 'openai',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    id: process.env.OPENAI_MODEL || 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY, // secretlint-disable-line
  },
  systemPrompt: SYSTEM_PROMPT_2,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/browser-openai'),
  },
  uiTarsVersion: 'latest',
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Browser (OpenAI)',
    subtitle: 'Browser-based GUI agent powered by OpenAI GPT models',
    welcomTitle: 'Browser GUI Agent with OpenAI',
    welcomePrompts: [
      'Help me research the latest developments in AI',
      'Navigate to Stack Overflow and find solutions for React issues',
      'Visit LinkedIn and help me update my profile',
      'Browse Reddit and find interesting tech discussions',
      'Open Wikipedia and search for information about quantum computing',
    ],
  },
});
