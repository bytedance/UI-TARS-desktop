/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { browserOperator } from './operators';
import { doubao_1_5_ui_tars } from './models';
import { systemPromptTemplate1 } from './promptTemps';

export default defineConfig({
  operator: browserOperator,
  model: doubao_1_5_ui_tars,
  systemPrompt: systemPromptTemplate1,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/browser-ve-ui-tars-15'),
  },
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Browser (Latest Prompt)',
    subtitle: 'Browser GUI agent with latest advanced system prompt',
    welcomTitle: 'Browser GUI Agent with Latest Prompt',
    welcomePrompts: [
      'Test advanced reasoning and multi-step planning',
      'Perform complex web automation workflows',
      'Test environment-aware task execution',
      'Validate advanced GUI interaction capabilities',
      'Test multi-environment task handling',
    ],
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
});
