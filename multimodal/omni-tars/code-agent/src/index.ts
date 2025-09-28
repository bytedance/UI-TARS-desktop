/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComposableAgent } from '@omni-tars/core';
import { CodeAgentPlugin } from './CodeAgentPlugin';
import { AgentOptions } from '@tarko/agent';
import { CodeToolCallEngine } from './CodeToolCallEngine';
export { CodeToolCallEngineProvider } from './CodeToolCallEngineProvider';

export interface CodeAgentExtraOption {
  sandboxUrl: string;
  ignoreSandboxCheck?: boolean;
}

export const codePluginBuilder = (option: CodeAgentExtraOption) => {
  return new CodeAgentPlugin(option);
};

type CodeAgentOption = AgentOptions & CodeAgentExtraOption;

export default class CodeAgent extends ComposableAgent {
  static label: 'Seed Code Agent';
  constructor(options: CodeAgentOption) {
    const { ignoreSandboxCheck, ...restOptions } = options;

    super({
      ...restOptions,
      plugins: [codePluginBuilder({ sandboxUrl: options.sandboxUrl, ignoreSandboxCheck })],
      toolCallEngine: CodeToolCallEngine,
    });
  }
}
