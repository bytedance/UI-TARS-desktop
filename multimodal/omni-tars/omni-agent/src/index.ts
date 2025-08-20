/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { codePlugin, CodeToolCallEngineProvider } from '@omni-tars/code-agent';
import { mcpPlugin, McpToolCallEngineProvider } from '@omni-tars/mcp-agent';
import { guiPlugin, GuiToolCallEngineProvider } from '@omni-tars/gui-agent';
import { ComposableAgent, createComposableToolCallEngineFactory } from '@omni-tars/core';
import { AgentOptions } from '@tarko/agent';

const toolCallEngine = createComposableToolCallEngineFactory({
  engines: [
    new GuiToolCallEngineProvider(),
    new McpToolCallEngineProvider(),
    new CodeToolCallEngineProvider(),
  ],
});

export default class OmniTARSAgent extends ComposableAgent {
  static label = 'Omni-TARS Agent';

  constructor(options: AgentOptions) {
    super({
      ...options,
      plugins: [mcpPlugin, guiPlugin, codePlugin],
      toolCallEngine,
      maxTokens: 32768,
    });
  }
}
