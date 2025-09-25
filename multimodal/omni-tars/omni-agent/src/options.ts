/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CodeAgentExtraOption,
  codePluginBuilder,
  CodeToolCallEngineProvider,
} from '@omni-tars/code-agent';
import {
  AgentMode,
  ComposableAgentOptions,
  createComposableToolCallEngineFactory,
} from '@omni-tars/core';
import { GuiAgentPlugin, GuiToolCallEngineProvider, OperatorManager } from '@omni-tars/gui-agent';
import {
  mcpPluginBuilder,
  MCPTarsExtraOption,
  McpToolCallEngineProvider,
} from '@omni-tars/mcp-agent';
import { AgentAppConfig } from '@tarko/interface';

export type OmniTarsOption = AgentAppConfig &
  MCPTarsExtraOption &
  CodeAgentExtraOption & {
    agentMode: AgentMode;
  };

export function getComposableOption(options: OmniTarsOption) {
  const {
    tavilyApiKey,
    googleApiKey,
    googleMcpUrl,
    sandboxUrl,
    ignoreSandboxCheck,
    linkReaderAK,
    linkReaderMcpUrl,
    agentMode = { id: 'omni' },
    ...restOptions
  } = options;

  const baseOptions: Partial<ComposableAgentOptions> = {
    ...restOptions,
    maxTokens: 32768,
    enableStreamingToolCallEvents: true,
  };

  const guiPlugin = new GuiAgentPlugin({
    operatorManager: OperatorManager.create(options.agentMode, options.sandboxUrl),
    agentMode,
  });

  switch (agentMode.id) {
    case 'game':
    case 'gui':
      baseOptions.toolCallEngine = createComposableToolCallEngineFactory({
        engines: [new GuiToolCallEngineProvider(agentMode)],
      });
      baseOptions.plugins = [guiPlugin];
      break;
    case 'omni':
    default:
      baseOptions.toolCallEngine = createComposableToolCallEngineFactory({
        engines: [
          new GuiToolCallEngineProvider(agentMode),
          new McpToolCallEngineProvider(),
          new CodeToolCallEngineProvider(),
        ],
      });
      baseOptions.plugins = [
        mcpPluginBuilder({
          tavilyApiKey,
          googleApiKey,
          googleMcpUrl,
          linkReaderAK,
          linkReaderMcpUrl,
        }),
        codePluginBuilder({ sandboxUrl, ignoreSandboxCheck }),
        guiPlugin,
      ];
      break;
  }

  return baseOptions as ComposableAgentOptions;
}
