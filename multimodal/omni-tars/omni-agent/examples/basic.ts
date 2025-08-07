/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ComposableAgent,
  ComposableAgentOptions,
  createComposableToolCallEngineFactory,
} from '@omni-tars/core';
import { mcpPlugin, McpToolCallEngineProvider } from '@omni-tars/mcp-agent';
import { codePlugin, CodeToolCallEngineProvider } from '@omni-tars/code-agent';
import { guiPlugin, GuiToolCallEngineProvider } from '@omni-tars/gui-agent';
import { LogLevel } from '@tarko/agent-interface';

async function main() {
  const toolCallEngine = createComposableToolCallEngineFactory({
    engines: [
      new GuiToolCallEngineProvider(),
      new McpToolCallEngineProvider(),
      new CodeToolCallEngineProvider(),
    ],
  });

  const options: ComposableAgentOptions = {
    name: 'Omni Agent',
    plugins: [mcpPlugin, codePlugin, guiPlugin],
    toolCallEngine,
    model: {
      provider: 'openai-non-streaming',
      baseURL: process.env.OMNI_TARS_BASE_URL,
      apiKey: process.env.OMNI_TARS_API_KEY,
      id: process.env.OMNI_TARS_MODEL_ID,
    },
    logLevel: LogLevel.DEBUG,
  };

  const agent = new ComposableAgent(options);

  const res = await agent.run('北京的天气如何');

  console.log(res);
}

main();
