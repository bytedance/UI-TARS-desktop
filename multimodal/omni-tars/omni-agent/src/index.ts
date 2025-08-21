/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { codePluginBuilder, CodeToolCallEngineProvider } from '@omni-tars/code-agent';
import { mcpPluginBuilder, McpToolCallEngineProvider } from '@omni-tars/mcp-agent';
import { guiPlugin, GuiToolCallEngineProvider } from '@omni-tars/gui-agent';
import { ComposableAgent, createComposableToolCallEngineFactory } from '@omni-tars/core';
import { AgentOptions } from '@tarko/agent';
import { AgentWebUIImplementation } from '@tarko/interface';

const toolCallEngine = createComposableToolCallEngineFactory({
  engines: [
    new GuiToolCallEngineProvider(),
    new McpToolCallEngineProvider(),
    new CodeToolCallEngineProvider(),
  ],
});

const sandboxUrl = process.env.AIO_SANDBOX_URL;

interface OmniTarsOption extends AgentOptions {
  tavilyApiKey: string;
  googleMcpUrl: string;
  googleApiKey: string;
  aioSandboxUrl: string;
  ignoreSandboxCheck?: boolean;
}

export default class OmniTARSAgent extends ComposableAgent {
  static label = 'Omni-TARS Agent';

  static webUIConfig: AgentWebUIImplementation = {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/appicon.png',
    title: 'Omni-TARS Agent',
    subtitle: 'Offering seamless integration with a wide range of real-world tools.',
    welcomTitle: 'An multimodal AI agent',
    welcomePrompts: [
      'Search for the latest GUI Agent papers',
      'Find information about UI TARS',
      'Tell me the top 5 most popular projects on ProductHunt today',
      'write a tic-tac-toe program in js',
      'Write hello world using python',
      'Use jupyter to calculate who is greater in 9.11 and 9.9',
      'Write a python code to download the paper https://arxiv.org/abs/2505.12370, and convert the pdf to markdown',
    ],
    workspace: {
      navItems: [
        // DO NOT DISPLAY CODE SERVER FOR NOW
        // {
        //   title: 'Code Server',
        //   link: sandboxUrl + '/code-server/',
        // },
        {
          title: 'VNC',
          link: sandboxUrl ? sandboxUrl + '/vnc/index.html' : './vnc/index.html',
        },
      ],
    },
  };

  constructor(options: OmniTarsOption) {
    const {
      tavilyApiKey,
      googleApiKey,
      googleMcpUrl,
      aioSandboxUrl,
      ignoreSandboxCheck,
      ...restOptions
    } = options;
    super({
      ...restOptions,
      plugins: [
        mcpPluginBuilder({ tavilyApiKey, googleApiKey, googleMcpUrl }),
        codePluginBuilder({ aioSandboxUrl, ignoreSandboxCheck }),
        guiPlugin,
      ],
      toolCallEngine,
      maxTokens: 32768,
    });
  }
}
