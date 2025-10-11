/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import 'dotenv/config';
import path from 'path';

import { defineConfig } from '@tarko/agent-cli';
import { browserOperator, remoteBrowserOperator } from './operators';
import { doubao_1_5_vp } from './models';
import { systemPromptTemplate2 } from './promptTemps';

export default defineConfig({
  // operator: browserOperator,
  operator: remoteBrowserOperator,
  model: doubao_1_5_vp,
  systemPrompt: systemPromptTemplate2,
  snapshot: {
    enable: true,
    storageDirectory: path.join(__dirname, '../snapshots/browser-ve-15vp'),
  },
  webui: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'GUI Agent - Browser (Volcengine)',
    subtitle: 'Browser-based GUI agent powered by Volcengine ARK models',
    welcomTitle: 'Browser GUI Agent with Volcengine',
    welcomePrompts: [
      'Search for the latest AI research papers',
      'Navigate to GitHub and find trending repositories',
      'Open Google Maps and search for nearby restaurants',
      'Visit YouTube and find tutorials on machine learning',
      'Browse Amazon and search for tech gadgets',
    ],
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
});
