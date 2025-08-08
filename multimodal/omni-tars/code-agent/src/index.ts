/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComposableAgent } from '@omni-tars/core';
import { CodeAgentPlugin } from './CodeAgentPlugin';
import { AgentOptions } from '@tarko/agent';
import { CodeToolCallEngine } from './CodeToolCallEngine';

export { CodeAgentPlugin } from './CodeAgentPlugin';
export { CodeToolCallEngineProvider } from './CodeToolCallEngineProvider';

export const codePlugin = new CodeAgentPlugin({
  workingDirectory: '/workspace',
  maxExecutionTime: 30000,
});

export default class CodeAgent extends ComposableAgent {
  static label: 'Seed Code Agent';
  constructor(options: AgentOptions) {
    super({
      ...options,
      plugins: [codePlugin],
      toolCallEngine: CodeToolCallEngine,
    });
  }
}
