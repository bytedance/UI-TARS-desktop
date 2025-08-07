// /*
//  * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
//  * SPDX-License-Identifier: Apache-2.0
//  */

// export { agent as default } from './agent';
// export * from './agent';

import { codePlugin, CodeToolCallEngineProvider } from '@omni-tars/code-agent';
import { mcpPlugin, McpToolCallEngineProvider } from '@omni-tars/mcp-agent';
import { guiPlugin, GuiToolCallEngineProvider } from '@omni-tars/gui-agent';
import { ComposableAgent, createComposableToolCallEngineFactory } from '@omni-tars/core';
import Agent from '@tarko/agent';

// const toolCallEngine = createComposableToolCallEngineFactory({
//   engines: [
//     new GuiToolCallEngineProvider(),
//     new McpToolCallEngineProvider(),
//     new CodeToolCallEngineProvider(),
//   ],
// });

//TODO:
// const agent = new ComposableAgent({
//   plugins: [mcpPlugin, guiPlugin, codePlugin],
//   toolCallEngine,
// });

class MyAgent extends Agent {
  static label = 'xxx';
}

export default MyAgent;
