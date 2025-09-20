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
    provider: 'anthropic',
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    id: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY, // secretlint-disable-line
  },
  systemPrompt: SYSTEM_PROMPT_2,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/browser-claude'),
  },
  uiTarsVersion: 'latest',
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Browser (Claude)',
    subtitle: 'Browser-based GUI agent powered by Anthropic Claude models',
    welcomTitle: 'Browser GUI Agent with Claude',
    welcomePrompts: [
      'Help me analyze web content and extract key information',
      'Navigate to news websites and summarize current events',
      'Visit documentation sites and help me understand complex topics',
      'Browse e-commerce sites and compare product features',
      'Open educational platforms and find relevant courses',
    ],
  },
});
