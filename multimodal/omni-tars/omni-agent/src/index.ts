/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  codePluginBuilder,
  CodeToolCallEngineProvider,
  CodeAgentExtraOption,
} from '@omni-tars/code-agent';
import {
  mcpPluginBuilder,
  McpToolCallEngineProvider,
  MCPTarsExtraOption,
} from '@omni-tars/mcp-agent';
import { guiPlugin, GuiToolCallEngineProvider } from '@omni-tars/gui-agent';
import { ComposableAgent, createComposableToolCallEngineFactory } from '@omni-tars/core';
import { AgentOptions } from '@tarko/agent';
import { AgentWebUIImplementation } from '@tarko/interface';

const mcpToolCallEngine = new McpToolCallEngineProvider();

const toolCallEngine = createComposableToolCallEngineFactory({
  engines: [new GuiToolCallEngineProvider(), mcpToolCallEngine, new CodeToolCallEngineProvider()],
  defaultEngine: mcpToolCallEngine,
});

const sandboxBaseUrl = process.env.AIO_SANDBOX_URL ?? '.';

type OmniTarsOption = AgentOptions & MCPTarsExtraOption & CodeAgentExtraOption;

export default class OmniTARSAgent extends ComposableAgent {
  static label = 'Omni Agent';

  static webuiConfig: AgentWebUIImplementation = {
    logo: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/zyha-aulnh/ljhwZthlaukjlkulzlp/icon.png',
    title: 'Omni Agent',
    subtitle: 'Offering seamless integration with a wide range of real-world tools.',
    welcomTitle: 'A multimodal AI agent',
    welcomePrompts: [
      'Search for the latest GUI Agent papers',
      'Find information about UI TARS',
      'Tell me the top 5 most popular projects on ProductHunt today',
      'Write hello world using python',
      'Use jupyter to calculate who is greater in 9.11 and 9.9',
      'Write code to reproduce seed-tars.com',
      'Summary seed-tars.com/1.5',
      'Write a python code to download the paper https://arxiv.org/abs/2505.12370, and convert the pdf to markdown',
      'Search news about bytedance seed1.6 model, then write a web page in modern style and deploy it',
      'Write a minimal code sample to help me use transformer',
      'Please search for trending datasets on Hugging Face, download the top-ranked dataset, and calculate the total number of characters in the entire datase.',
      `Identify the independence process of a twin-island nation where the pro-self-governance political group won thirteen out of seventeen legislative seats in spring 1980 national polls, a second constitutional conference was held at a historic London venue in late 1980, liberation from colonial rule is annually commemorated on November 1st as a public holiday, and an agreement revised the smaller island's local governance legislation for enhanced autonomy. What was the composition of the associated state that preceded its independence?`,
      `I am a high school music theory teacher and i'm preparing a course on basic music theory to explain knowledge about music names, roll titles, major scales, octave distribution, and physical frequency. Please help me collect enough informations,  design fulfilling and authoritative course content with demonstration animations,  and finally output them as web page`,
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

  constructor(options: OmniTarsOption) {
    const {
      tavilyApiKey,
      googleApiKey,
      googleMcpUrl,
      aioSandboxUrl,
      ignoreSandboxCheck,
      linkReaderAK,
      linkReaderMcpUrl,
      ...restOptions
    } = options;
    super({
      ...restOptions,
      plugins: [
        mcpPluginBuilder({
          tavilyApiKey,
          googleApiKey,
          googleMcpUrl,
          linkReaderAK,
          linkReaderMcpUrl,
        }),
        codePluginBuilder({ aioSandboxUrl, ignoreSandboxCheck }),
        guiPlugin,
      ],
      toolCallEngine,
      maxTokens: 32768,
      enableStreamingToolCallEvents: true,
    });
  }
}
