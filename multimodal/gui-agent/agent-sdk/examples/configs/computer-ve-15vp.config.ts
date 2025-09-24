/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@tarko/agent-cli';
import { computerOperator } from './operators';
import { doubao_1_5_vp } from './models';
import { systemPromptTemplate1 } from './promptTemps';

export default defineConfig({
  operator: computerOperator,
  model: doubao_1_5_vp,
  systemPrompt: systemPromptTemplate1,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/computer-ve-15vp'),
  },
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
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
});
