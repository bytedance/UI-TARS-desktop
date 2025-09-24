/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { SYSTEM_PROMPT_2 } from './prompts';
import { computerOperator } from './operators';
import { model_openai } from './models';
import { systemPromptTemplate1 } from './promptTemps';

export default defineConfig({
  operator: computerOperator,
  model: model_openai,
  systemPrompt: systemPromptTemplate1,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/computer-openai'),
  },
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
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
});
