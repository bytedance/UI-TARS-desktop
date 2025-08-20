/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import Agent, { LLMRequestHookPayload, LLMResponseHookPayload, Tool } from '@tarko/agent';

/**
 * Base class that all agent plugins must extends
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
      throw new Error('The current plugin does not associate any agent instance');
    }
    return this._agent;
  }

  setAgent(agent: Agent) {
    this._agent = agent;
  }

  /** Register tools provided by this agent plugin */
  getTools(): Tool[] {
    return this.tools;
  }

  /** Initialize the agent plugin (called during composition setup) */
  async initialize?(): Promise<void>;

  /** Hook called on each LLM request */
  async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    //logic here
  }

  /** Hook called on each LLM response */
  async onLLMResponse(id: string, payload: LLMResponseHookPayload): Promise<void> {
    //logic here
  }

  /** Hook called at the start of each agent loop */
  async onEachAgentLoopStart(): Promise<void> {
    //logic here
  }

  /** Hook called at the start of each agent loop */
  async onEachAgentLoopEnd(): Promise<void> {
    //logic here
  }

  /** Hook called at the end of each agent loop */
  async onAgentLoopEnd(): Promise<void> {
    //logic here
  }
}
