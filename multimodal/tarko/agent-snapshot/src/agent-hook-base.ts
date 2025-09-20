/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import { Agent } from '@tarko/agent';
import {
  AgentRunOptions,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  ChatCompletionChunk,
  ToolCallResult,
  ChatCompletionMessageToolCall,
} from '@tarko/agent-interface';
import { logger } from './utils/logger';

/**
 * Hook configuration options
 */
export interface HookOptions {
  snapshotPath: string;
  snapshotName: string;
}

/**
 * Base class for agent hooks providing common functionality
 */
export abstract class AgentHookBase {
  protected readonly agent: Agent;
  protected readonly snapshotPath: string;
  protected readonly snapshotName: string;
  protected currentRunOptions?: AgentRunOptions;
  protected lastError: Error | null = null;
  private isHooked = false;
  private originalHooks: Partial<Agent> = {};

  // Protected access to original hooks for subclasses
  protected get originalRequestHook() { return this.originalHooks.onLLMRequest; }
  protected get originalResponseHook() { return this.originalHooks.onLLMResponse; }
  protected get originalStreamingResponseHook() { return this.originalHooks.onLLMStreamingResponse; }
  protected get originalLoopEndHook() { return this.originalHooks.onAgentLoopEnd; }
  protected get originalEachLoopStartHook() { return this.originalHooks.onEachAgentLoopStart; }
  protected get originalBeforeToolCallHook() { return this.originalHooks.onBeforeToolCall; }
  protected get originalAfterToolCallHook() { return this.originalHooks.onAfterToolCall; }
  protected get originalToolCallErrorHook() { return this.originalHooks.onToolCallError; }
  protected get originalProcessToolCallsHook() { return this.originalHooks.onProcessToolCalls; }

  constructor(agent: Agent, options: HookOptions) {
    this.agent = agent;
    this.snapshotPath = options.snapshotPath;
    this.snapshotName = options.snapshotName;

    this.ensureSnapshotDirectory();
  }

  /**
   * Set current run options for context
   */
  setCurrentRunOptions(options: AgentRunOptions): void {
    this.currentRunOptions = options;
  }

  /**
   * Hook into the agent
   */
  hookAgent(): void {
    if (this.isHooked) {
      logger.warn('Agent already hooked, skipping');
      return;
    }

    // Store original hooks
    this.originalHooks = {
      onLLMRequest: this.agent.onLLMRequest,
      onLLMResponse: this.agent.onLLMResponse,
      onLLMStreamingResponse: this.agent.onLLMStreamingResponse,
      onAgentLoopEnd: this.agent.onAgentLoopEnd,
      onEachAgentLoopStart: this.agent.onEachAgentLoopStart,
      onBeforeToolCall: this.agent.onBeforeToolCall,
      onAfterToolCall: this.agent.onAfterToolCall,
      onToolCallError: this.agent.onToolCallError,
      onProcessToolCalls: this.agent.onProcessToolCalls,
    };

    // Install our hooks
    this.agent.onLLMRequest = (id, payload) => this.safeHook(() => this.onLLMRequest(id, payload));
    this.agent.onLLMResponse = (id, payload) => this.safeHook(() => this.onLLMResponse(id, payload));
    this.agent.onLLMStreamingResponse = (id, payload) => this.safeHook(() => this.onLLMStreamingResponse(id, payload));
    this.agent.onAgentLoopEnd = (id) => this.safeHook(() => this.onAgentLoopEnd(id));
    this.agent.onEachAgentLoopStart = (id) => this.safeHook(() => this.onEachAgentLoopStart(id));
    this.agent.onBeforeToolCall = (id, toolCall, args) => this.safeHook(() => this.onBeforeToolCall(id, toolCall, args));
    this.agent.onAfterToolCall = (id, toolCall, result) => this.safeHook(() => this.onAfterToolCall(id, toolCall, result));
    this.agent.onToolCallError = (id, toolCall, error) => this.safeHook(() => this.onToolCallError(id, toolCall, error));
    this.agent.onProcessToolCalls = (id, toolCalls) => {
      const result = this.safeHook(() => this.onProcessToolCalls(id, toolCalls));
      // Handle the Promise<void | ToolCallResult[]> return type
      return result as Promise<ToolCallResult[] | undefined> | ToolCallResult[] | undefined;
    };

    this.isHooked = true;
    logger.debug(`Hooked into agent: ${this.snapshotName}`);
  }

  /**
   * Unhook from the agent
   */
  unhookAgent(): void {
    if (!this.isHooked) {
      return;
    }

    // Restore original hooks
    Object.assign(this.agent, this.originalHooks);
    
    this.isHooked = false;
    this.originalHooks = {};
    
    logger.debug(`Unhooked from agent: ${this.snapshotName}`);
  }

  /**
   * Check if there was an error during hook execution
   */
  hasError(): boolean {
    return this.lastError !== null;
  }

  /**
   * Get the last error that occurred
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Clear the last error
   */
  clearError(): void {
    this.lastError = null;
  }

  /**
   * Safely execute a hook function with error handling
   */
  private async safeHook<T>(hookFn: () => T | Promise<T>): Promise<T | void> {
    try {
      const result = await hookFn();
      return result;
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(`Hook execution error in ${this.snapshotName}: ${this.lastError.message}`);
      // Don't re-throw to avoid breaking agent execution
    }
  }

  /**
   * Write streaming chunks to a file
   */
  protected writeStreamingChunks(filePath: string, chunks: ChatCompletionChunk[]): void {
    if (!chunks?.length) {
      return;
    }

    try {
      const content = chunks.map(chunk => JSON.stringify(chunk)).join('\n');
      fs.writeFileSync(filePath, content, 'utf-8');
      logger.debug(`Wrote ${chunks.length} streaming chunks to ${filePath}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Failed to write streaming chunks: ${err.message}`);
      this.lastError = err;
    }
  }

  private ensureSnapshotDirectory(): void {
    if (!fs.existsSync(this.snapshotPath)) {
      fs.mkdirSync(this.snapshotPath, { recursive: true });
    }
  }

  // Abstract methods to be implemented by subclasses
  protected abstract onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void>;
  protected abstract onLLMResponse(id: string, payload: LLMResponseHookPayload): void | Promise<void>;
  protected abstract onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void;
  protected abstract onAgentLoopEnd(id: string): void | Promise<void>;
  protected abstract onEachAgentLoopStart(id: string): void | Promise<void>;
  protected abstract onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: unknown
  ): Promise<unknown> | unknown;
  protected abstract onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: unknown
  ): Promise<unknown> | unknown;
  protected abstract onToolCallError(
    id: string,
    toolCall: { toolCallId: string; name: string },
    error: unknown
  ): Promise<unknown> | unknown;
  protected abstract onProcessToolCalls(
    id: string,
    toolCalls: ChatCompletionMessageToolCall[]
  ): Promise<ToolCallResult[] | undefined> | ToolCallResult[] | undefined;
}
