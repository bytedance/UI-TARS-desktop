/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import Agent, { LLMRequestHookPayload, LLMResponseHookPayload, Tool } from '@tarko/agent';

/**
 * Standard interface that all agent plugins must implement
 */
export class AgentPlugin {
  /** Unique identifier for this agent plugin */
  readonly name?: string;
  /** Environment section this agent provides (will be combined with others) */
  readonly environmentSection?: string;
  /** the agent instance for this plugin (called during composition setup) */
  private _agent?: Agent;
  protected tools: Tool[] = [];

  get agent() {
    if (!this._agent) {
      throw new Error('The current plugin does not associate any agent instances');
    }
    return this._agent;
  }

  setAgent(agent: Agent) {
    this._agent = agent;
  }

  /** Initialize the agent plugin (called during composition setup) */
  initialize?(): Promise<void>;

  /** Register tools provided by this agent plugin */
  getTools(): Tool[] {
    return this.tools;
  }
  /** Hook called on each LLM request */
  onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void> {
    //logic here
  }

  /** Hook called on each LLM response */
  onLLMResponse(id: string, payload: LLMResponseHookPayload): void | Promise<void> {
    //logic here
  }

  /** Hook called at the start of each agent loop */
  onEachAgentLoopStart(): void | Promise<void> {
    //logic here
  }

  /** Hook called at the end of each agent loop */
  onAgentLoopEnd(): void | Promise<void> {
    //logic here
  }
}
