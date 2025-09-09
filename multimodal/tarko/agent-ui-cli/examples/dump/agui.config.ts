/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export default {
  /**
   * Session Information
   */
  sessionInfo: {
    id: 'example-session-001',
    createdAt: Date.now() - 60000, // 1 minute ago
    updatedAt: Date.now(),
    workspace: '~/workspace/agent-examples',
    metadata: {
      name: 'Calculator and Weather Demo',
      tags: ['demo', 'calculator', 'weather'],
      modelConfig: {
        provider: 'openai',
        modelId: 'gpt-4',
        displayName: 'GPT-4',
        configuredAt: Date.now() - 3600000, // 1 hour ago
      },
      agentInfo: {
        name: 'Demo Agent',
        configuredAt: Date.now() - 3600000,
      },
    },
  },
  /**
   * Server Information
   */
  serverInfo: {
    version: '1.0.0-demo',
    buildTime: Date.now() - 86400000, // 1 day ago
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
};
