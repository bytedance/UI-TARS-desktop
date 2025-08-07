import { ComposableAgent } from '@omni-tars/core';
import { CodeAgentPlugin } from './CodeAgentPlugin';
import { CodeToolCallEngine } from './CodeToolCallEngine';

const codePlugin = new CodeAgentPlugin({
  workingDirectory: '/workspace',
  maxExecutionTime: 30000,
});

const agent = new ComposableAgent({
  name: 'Seed MCP Agent',
  plugins: [codePlugin],
  toolCallEngine: CodeToolCallEngine,
});

export { agent, codePlugin };
