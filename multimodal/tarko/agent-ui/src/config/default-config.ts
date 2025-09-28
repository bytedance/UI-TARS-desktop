/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { BaseAgentWebUIImplementation } from '@tarko/interface';

const sandboxBaseUrl = location.host.includes('localhost') ? 'http://localhost:8080' : '';

/**
 * Default Agent UI Configuration for standalone deployment
 */
export const DEFAULT_WEBUI_CONFIG: BaseAgentWebUIImplementation = {
  logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
  title: 'Tarko Agent UI',
  subtitle: 'Offering seamless integration with a wide range of real-world tools.',
  welcomTitle: 'A multimodal AI agent',
  welcomePrompts: [
    'Search for the latest GUI Agent papers',
    'Find information about UI TARS',
    'Tell me the top 5 most popular projects on ProductHunt today',
    'Write hello world using python',
  ],
  workspace: {
    navItems: [
      {
        title: 'Code Server',
        link: sandboxBaseUrl + '/code-server/',
        icon: 'code',
      },
      {
        title: 'VNC',
        link: sandboxBaseUrl + '/vnc/index.html?autoconnect=true',
        icon: 'monitor',
      },
    ],
  },
  guiAgent: {
    defaultScreenshotRenderStrategy: 'afterAction',
    enableScreenshotRenderStrategySwitch: true,
    renderGUIAction: true,
    renderBrowserShell: false,
  },
  layout: {
    enableLayoutSwitchButton: true,
  },
};
