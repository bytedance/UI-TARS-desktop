/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin, COMPUTER_USE_ENVIRONMENT } from '@omni-tars/core';
import { Tool, LLMRequestHookPayload, LLMResponseHookPayload } from '@tarko/agent';

export interface GuiAgentConfig {
  // Configuration specific to GUI/computer interactions
  screenWidth?: number;
  screenHeight?: number;
  actionBudget?: number;
}

/**
 * GUI Agent Plugin - handles COMPUTER_USE_ENVIRONMENT for screen interaction
 */
export class GuiAgentPlugin implements AgentPlugin {
  readonly name = 'gui-agent';
  readonly environmentSection = COMPUTER_USE_ENVIRONMENT;

  private tools: Tool[] = [];
  private config: GuiAgentConfig;

  constructor(config: GuiAgentConfig = {}) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    console.log('[GuiAgentPlugin] Initializing computer interaction capabilities');
  }

  getTools(): Tool[] {
    return this.tools;
  }

  onLLMRequest?(id: string, payload: LLMRequestHookPayload): void | Promise<void> {
    // GUI-specific request handling if needed
  }

  onLLMResponse?(id: string, payload: LLMResponseHookPayload): void | Promise<void> {
    // GUI-specific response handling if needed
  }

  onEachAgentLoopStart?(): void | Promise<void> {
    // GUI-specific loop start handling if needed
  }

  onAgentLoopEnd?(): void | Promise<void> {
    // GUI-specific loop end handling if needed
  }
}
