/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { SYSTEM_PROMPT_2 } from './prompts';
import { computerOperator } from './operators';
import { model_claude_4 } from './models';

export default defineConfig({
  operator: computerOperator,
  model: model_claude_4,
  systemPrompt: SYSTEM_PROMPT_2, // TODO: add corresponding system prompt
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/computer-claude'),
  },
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Computer (Claude)',
    subtitle: 'Computer-based GUI agent powered by Anthropic Claude models',
    welcomTitle: 'Computer GUI Agent with Claude',
    welcomePrompts: [
      'Help me analyze web content and extract key information',
      'Navigate to news websites and summarize current events',
      'Visit documentation sites and help me understand complex topics',
      'Browse e-commerce sites and compare product features',
      'Open educational platforms and find relevant courses',
    ],
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
});
