import { codePlugin } from '@omni-tars/code-agent';
import { mcpPlugin } from '@omni-tars/mcp-agent';
import { guiPlugin } from '@omni-tars/gui-agent';
import { AgentBuilder } from '@omni-tars/core';

const agent = new AgentBuilder()
  .addPlugin(mcpPlugin)
  .addPlugin(guiPlugin)
  .addPlugin(codePlugin)
  .withName('Omni Tars Agent')
  .build();

export { agent };
