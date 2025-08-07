/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentBuilder } from '@omni-tars/core';
import { GuiAgentPlugin } from './GuiAgentPlugin';

const guiPlugin = new GuiAgentPlugin({
  screenWidth: 1920,
  screenHeight: 1080,
  actionBudget: 100,
});

const agent = AgentBuilder.create().withName('Seed GUI Agent').addPlugin(guiPlugin).build();

export { agent, guiPlugin };
