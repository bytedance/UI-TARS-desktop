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

const mcpToolCallEngine = new McpToolCallEngineProvider();

const omniToolCallEngine = createComposableToolCallEngineFactory({
  engines: [
    new GuiToolCallEngineProvider('omni'),
    mcpToolCallEngine,
    new CodeToolCallEngineProvider(),
  ],
  defaultEngine: mcpToolCallEngine,
});

const guiToolCallEngine = createComposableToolCallEngineFactory({
  engines: [new GuiToolCallEngineProvider('gui')],
});

export type OmniTarsOption = AgentAppConfig &
  MCPTarsExtraOption &
  CodeAgentExtraOption & {
    agentMode: AgentMode;
    browserMode: 'dom' | 'visual-grounding' | 'hybrid';
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
    agentMode = 'omni',
    browserMode = 'hybrid',
    ...restOptions
  } = options;

  const baseOptions: Partial<ComposableAgentOptions> = {
    ...restOptions,
    maxTokens: 32768,
    enableStreamingToolCallEvents: true,
  };

  const guiPlugin = new GuiAgentPlugin({
    operatorManager: OperatorManager.createHybird(options.sandboxUrl),
  });

  if (agentMode === 'gui') {
    baseOptions.toolCallEngine = guiToolCallEngine;
    baseOptions.plugins = [guiPlugin];
  } else if (agentMode === 'omni') {
    baseOptions.toolCallEngine = omniToolCallEngine;
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
  }

  return baseOptions as ComposableAgentOptions;
}
