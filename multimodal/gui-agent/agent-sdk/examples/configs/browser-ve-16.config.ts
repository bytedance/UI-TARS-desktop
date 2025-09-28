/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { browserOperator } from './operators';
import { doubao_seed_1_6 } from './models';
import { systemPromptTemplate1 } from './promptTemps';

export default defineConfig({
  operator: browserOperator,
  model: doubao_seed_1_6,
  systemPrompt: systemPromptTemplate1,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/browser-ve-16'),
  },
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
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
});
