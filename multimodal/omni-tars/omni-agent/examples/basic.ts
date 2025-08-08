/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ComposableAgentOptions,
  createComposableToolCallEngineFactory,
  SnapshotPlugin,
} from '@omni-tars/core';
import { mcpPlugin, McpToolCallEngineProvider } from '@omni-tars/mcp-agent';
import { codePlugin, CodeToolCallEngineProvider } from '@omni-tars/code-agent';
import { guiPlugin, GuiToolCallEngineProvider } from '@omni-tars/gui-agent';
import { LogLevel } from '@tarko/agent-interface';
import path from 'path';
import OmniTARSAgent from '../dist';

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
    plugins: [
      mcpPlugin,
      codePlugin,
      guiPlugin,
      new SnapshotPlugin({ baseDir: path.resolve(__dirname, '../snapshot') }),
    ],
    toolCallEngine,
    model: {
      provider: 'openai-non-streaming',
      baseURL: process.env.OMNI_TARS_BASE_URL,
      apiKey: process.env.OMNI_TARS_API_KEY,
      id: process.env.OMNI_TARS_MODEL_ID,
    },
    logLevel: LogLevel.DEBUG,
  };

  // const agent = new ComposableAgent(options);
  const agent = new OmniTARSAgent(options);

  const res = await agent.run(
    'Use LinkReader to read the content of https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
  );

  console.log(res);
}

main();
