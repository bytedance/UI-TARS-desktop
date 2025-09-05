/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComposableAgent } from '@omni-tars/core';
import { GuiAgentPlugin } from './GuiAgentPlugin';
import { AgentOptions } from '@tarko/agent';
import { GUIAgentToolCallEngine } from './GUIAgentToolCallEngine';
import { OperatorManager } from './OperatorManager';

export { GuiAgentPlugin } from './GuiAgentPlugin';
export { GuiToolCallEngineProvider } from './GuiToolCallEngineProvider';

export interface GUIAgentConfig<TOperator> {
  operator: TOperator;
  model: {
    baseURL: string;
    id: string;
    apiKey: string; // @secretlint-disable-line
    uiTarsVersion?:
      | 'ui-tars-1.0'
      | 'ui-tars-1.5'
      | 'doubao-1.5-ui-tars-15b'
      | 'doubao-1.5-ui-tars-20b';
  };
  // ===== Optional =====
  systemPrompt?: string;
  signal?: AbortSignal;
  maxLoopCount?: number;
  loopIntervalInMs?: number;
}

export const guiPlugin = new GuiAgentPlugin({
  operatorManager: OperatorManager.createHybird(),
});

export default class GUIAgent extends ComposableAgent {
  static label: 'Browser GUI Agent';
  constructor(options: AgentOptions) {
    super({
      ...options,
      plugins: [guiPlugin],
      toolCallEngine: GUIAgentToolCallEngine,
    });
  }
}
