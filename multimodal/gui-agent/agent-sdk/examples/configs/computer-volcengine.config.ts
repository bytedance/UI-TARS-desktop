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
    provider: 'volcengine',
    baseURL: process.env.ARK_BASE_URL,
    id: process.env.ARK_MODEL,
    apiKey: process.env.ARK_API_KEY, // secretlint-disable-line
  },
  systemPrompt: SYSTEM_PROMPT_2,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/computer-volcengine'),
  },
  uiTarsVersion: 'latest',
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Computer (Volcengine)',
    subtitle: 'Desktop computer GUI agent powered by Volcengine ARK models',
    welcomTitle: 'Computer GUI Agent with Volcengine',
    welcomePrompts: [
      'Help me organize files and folders on my desktop',
      'Open applications and perform system tasks',
      'Manage system settings and preferences',
      'Create and edit documents using desktop applications',
      'Navigate through file systems and perform file operations',
    ],
  },
});
