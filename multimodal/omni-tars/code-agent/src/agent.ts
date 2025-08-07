import { AgentBuilder } from '@omni-tars/core';
import { CodeAgentPlugin } from './CodeAgentPlugin';

const codePlugin = new CodeAgentPlugin({
  workingDirectory: '/workspace',
  maxExecutionTime: 30000,
});

const agent = AgentBuilder.create().withName('Seed Code Agent').addPlugin(codePlugin).build();

export { agent, codePlugin };
