import { codePlugin, CodeToolCallEngineProvider } from '@omni-tars/code-agent';
import { mcpPlugin, McpToolCallEngineProvider } from '@omni-tars/mcp-agent';
import { guiPlugin, GuiToolCallEngineProvider } from '@omni-tars/gui-agent';
import { ComposableAgent, createComposableToolCallEngineFactory } from '@omni-tars/core';

const toolCallEngine = createComposableToolCallEngineFactory({
  engines: [
    new GuiToolCallEngineProvider(),
    new McpToolCallEngineProvider(),
    new CodeToolCallEngineProvider(),
  ],
});

const agent = new ComposableAgent({
  name: 'Omni TARS Agent',
  plugins: [mcpPlugin, guiPlugin, codePlugin],
  toolCallEngine,
});

export { agent };
