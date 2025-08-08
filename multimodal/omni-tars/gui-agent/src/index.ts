/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComposableAgent } from '@omni-tars/core';
import { GuiAgentPlugin } from './GuiAgentPlugin';
import { AgentOptions } from '@tarko/agent';
import { GuiToolCallEngine } from './GuiToolCallEngine';

export { GuiAgentPlugin } from './GuiAgentPlugin';
export { GuiToolCallEngineProvider } from './GuiToolCallEngineProvider';

export const guiPlugin = new GuiAgentPlugin({
  screenWidth: 1920,
  screenHeight: 1080,
  actionBudget: 100,
});

export default class GUIAgent extends ComposableAgent {
  static label: 'Seed GUI Agent';
  constructor(options: AgentOptions) {
    super({
      ...options,
      plugins: [guiPlugin],
      toolCallEngine: GuiToolCallEngine,
    });
  }
}
