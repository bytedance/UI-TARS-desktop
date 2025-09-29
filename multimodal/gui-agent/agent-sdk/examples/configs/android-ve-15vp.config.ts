/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { doubao_1_5_vp } from './models';
import { androidOperator } from './operators';
import { systemPromptTemplate1 } from './promptTemps';

export default defineConfig({
  operator: androidOperator,
  model: doubao_1_5_vp,
  systemPrompt: systemPromptTemplate1,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/android-ve-15vp'),
  },
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Android (Volcengine)',
    subtitle: 'Android mobile GUI agent powered by Volcengine ARK models',
    welcomTitle: 'Android GUI Agent with Volcengine',
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
