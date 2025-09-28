/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { defineConfig } from '@tarko/agent-ui-cli';

export default defineConfig({
  /**
   * Session Information
   */
  sessionInfo: {
    id: 'example-session-001',
    workspace: '~/workspace/agent-examples',
    metadata: {
      name: 'Calculator and Weather Demo',
      tags: ['demo', 'calculator', 'weather'],
      modelConfig: {
        provider: 'openai',
        modelId: 'gpt-4',
        displayName: 'GPT-4',
      },
      agentInfo: {
        name: 'Demo Agent',
      },
    },
  },
  /**
   * Server Information
   */
  serverInfo: {
    version: '1.0.0-demo',
    gitHash: 'abc123def456',
  },
  /**
   * UI Configuration
   */
  uiConfig: {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'Demo Agent UI',
    subtitle: 'Calculator and Weather Assistant Demo',
    welcomTitle: 'Welcome to Demo Agent',
    guiAgent: {
      defaultScreenshotRenderStrategy: 'afterAction',
      enableScreenshotRenderStrategySwitch: true,
      renderGUIAction: true,
      renderBrowserShell: false,
    },
  },
});
