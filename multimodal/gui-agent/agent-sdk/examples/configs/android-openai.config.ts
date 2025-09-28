/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { SYSTEM_PROMPT_2 } from './prompts';
import { androidOperator } from './operators';
import { model_openai } from './models';

export default defineConfig({
  operator: androidOperator,
  model: model_openai,
  systemPrompt: SYSTEM_PROMPT_2, // TODO: use corresponding system prompt
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/android-openai'),
  },
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Android (OpenAI)',
    subtitle: 'Android mobile GUI agent powered by OpenAI GPT models',
    welcomTitle: 'Android GUI Agent with OpenAI',
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
