/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Agent,
  AgentOptions,
  getLogger,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
} from '@tarko/agent';
import { AgentComposer } from './AgentComposer';
import { AgentPlugin } from './AgentPlugin';

export interface ComposableAgentOptions extends AgentOptions {
  /** Agent plugins to compose */
  plugins: AgentPlugin[];
}

/**
 * Main composable agent that orchestrates multiple agent plugins
 */
export class ComposableAgent extends Agent {
  private composer: AgentComposer;

  constructor(options: ComposableAgentOptions) {
    const { plugins, ...optionsWithoutPlugins } = options;
    // Initialize composer first to generate system prompt
    const composer = new AgentComposer({ plugins });

    super({
      // instructions: SYSTEM_PROMPT,
      // instructions: composer.generateSystemPrompt(),
      //Remove plugins to prevent circular reference from reporting errors
      ...optionsWithoutPlugins,
    });

    this.composer = composer;
    this.composer.setAgent(this);
    this.logger = getLogger('ComposableAgent');

    this.logger.info(
      'load plugins success: ',
      plugins.map((p) => p.name),
    );
  }

  async initialize(): Promise<void> {
    await this.composer.initialize();

    // Register all tools from all plugins
    const tools = this.composer.getAllTools();
    for (const tool of tools) {
      this.registerTool(tool);
    }

    await super.initialize();
  }

  async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    // Execute hooks for all plugins
    await this.composer.executeOnLLMRequest(id, payload);
  }

  async onLLMResponse(id: string, payload: LLMResponseHookPayload): Promise<void> {
    // Execute hooks for all plugins
    await this.composer.executeOnLLMResponse(id, payload);
  }

  async onEachAgentLoopStart(): Promise<void> {
    // Execute hooks for all plugins
    await this.composer.executeOnEachAgentLoopStart();
  }

  async onEachAgentLoopEnd(): Promise<void> {
    // Execute hooks for all plugins
    await this.composer.executeOnEachAgentLoopEnd();
  }

  async onAgentLoopEnd(id: string): Promise<void> {
    // Execute hooks for all plugins
    await this.composer.executeOnAgentLoopEnd();
    // Call parent implementation to ensure proper agent loop termination
    await super.onAgentLoopEnd(id);
  }
}
