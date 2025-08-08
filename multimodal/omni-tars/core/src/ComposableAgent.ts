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
import { AgentPlugin } from './types';

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
    // Initialize composer first to generate system prompt
    const composer = new AgentComposer({ plugins: options.plugins });

    super({
      instructions: composer.generateSystemPrompt(),
      maxIterations: options.maxIterations || 100,
      ...options,
    });

    this.composer = composer;
    this.logger = getLogger('ComposableAgent');
  }

  async initialize(): Promise<void> {
    // Initialize the composer and all plugins
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

  async onAgentLoopEnd(): Promise<void> {
    // Execute hooks for all plugins
    await this.composer.executeOnAgentLoopEnd();
  }
}
