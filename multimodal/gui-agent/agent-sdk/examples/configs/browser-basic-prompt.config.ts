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
    storageDirectory: path.join(__dirname, '../snapshots/browser-basic-prompt'),
  },
  uiTarsVersion: 'latest',
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Browser (Basic Prompt)',
    subtitle: 'Browser GUI agent with basic system prompt for testing',
    welcomTitle: 'Browser GUI Agent with Basic Prompt',
    welcomePrompts: [
      'Test basic web navigation capabilities',
      'Perform simple click and type operations',
      'Navigate through standard web interfaces',
      'Test fundamental GUI interaction patterns',
      'Validate core browser automation features',
    ],
  },
});
