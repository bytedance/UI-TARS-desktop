/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { SYSTEM_PROMPT_2 } from './prompts';
import { androidOperator } from './operators';
import { model_claude_4 } from './models';

export default defineConfig({
  operator: androidOperator,
  model: model_claude_4,
  systemPrompt: SYSTEM_PROMPT_2, // TODO: add corresponding system prompt
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/android-claude'),
  },
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Android (Claude)',
    subtitle: 'Android-based GUI agent powered by Anthropic Claude models',
    welcomTitle: 'Android GUI Agent with Claude',
    welcomePrompts: [
      'Check the weather in Beijing',
      'Add Tom: 12345678900 to contacts',
      'What is Agent TARS',
      'Set an alarm for 8:00',
      'Check the current device version',
    ],
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
});
