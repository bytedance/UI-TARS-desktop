/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { Agent } from '@multimodal/agent';
import {
  AgentRunOptions,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  ChatCompletionChunk,
  Event,
  ToolCallResult,
  ChatCompletionMessageToolCall,
} from '@multimodal/agent-interface';
import { logger } from './utils/logger';
import { SnapshotManager } from './snapshot-manager';

/**
 * Base class for agent hooks that provides common functionality
 * for both snapshot generation and LLM mocking
 */
export abstract class AgentHookBase {
  protected agent: Agent;
  protected snapshotPath: string;
  protected snapshotName: string;
  protected originalRequestHook: Agent['onLLMRequest'] | null = null;
  protected originalResponseHook: Agent['onLLMResponse'] | null = null;
  protected originalLoopEndHook: Agent['onAgentLoopEnd'] | null = null;
  protected originalEachLoopStartHook: Agent['onEachAgentLoopStart'] | null = null;
  protected originalStreamingResponseHook: Agent['onLLMStreamingResponse'] | null = null;
  protected originalBeforeToolCallHook: Agent['onBeforeToolCall'] | null = null;
  protected originalAfterToolCallHook: Agent['onAfterToolCall'] | null = null;
  protected originalToolCallErrorHook: Agent['onToolCallError'] | null = null;
  protected originalProcessToolCallsHook: Agent['onProcessToolCalls'] | null = null;
  protected isHooked = false;
  protected currentRunOptions?: AgentRunOptions;
  protected snapshotManager?: SnapshotManager;
  protected lastError: Error | null = null;

  constructor(
    agent: Agent,
    options: {
      snapshotPath: string;
      snapshotName: string;
    },
  ) {
    this.agent = agent;
    this.snapshotPath = options.snapshotPath;
    this.snapshotName = options.snapshotName;

    // Create output directory
    if (!fs.existsSync(this.snapshotPath)) {
      fs.mkdirSync(this.snapshotPath, { recursive: true });
    }
  }

  /**
   * Store current run options
   */
  setCurrentRunOptions(options: AgentRunOptions): void {
    this.currentRunOptions = options;
  }

  /**
   * Hook into the agent by replacing its hook methods
   */
  hookAgent(): boolean {
    if (this.isHooked) return false;

    // Store original hooks
    this.originalRequestHook = this.agent.onLLMRequest;
    this.originalResponseHook = this.agent.onLLMResponse;
    this.originalStreamingResponseHook = this.agent.onLLMStreamingResponse;
    this.originalLoopEndHook = this.agent.onAgentLoopEnd;
    this.originalEachLoopStartHook = this.agent.onEachAgentLoopStart;
    this.originalBeforeToolCallHook = this.agent.onBeforeToolCall;
    this.originalAfterToolCallHook = this.agent.onAfterToolCall;
    this.originalToolCallErrorHook = this.agent.onToolCallError;
    this.originalProcessToolCallsHook = this.agent.onProcessToolCalls;

    // Replace with our hooks
    this.agent.onLLMRequest = (id, payload) =>
      this.safeExecuteHook(() => this.onLLMRequest(id, payload));
    this.agent.onLLMResponse = (id, payload) =>
      this.safeExecuteHook(() => this.onLLMResponse(id, payload));
    this.agent.onLLMStreamingResponse = (id, payload) =>
      this.safeExecuteHook(() => this.onLLMStreamingResponse(id, payload));
    this.agent.onAgentLoopEnd = (id) => this.safeExecuteHook(() => this.onAgentLoopEnd(id));
    this.agent.onEachAgentLoopStart = (id) =>
      this.safeExecuteHook(() => this.onEachAgentLoopStart(id));
    this.agent.onBeforeToolCall = (id, toolCall, args) =>
      this.safeExecuteHook(() => this.onBeforeToolCall(id, toolCall, args));
    this.agent.onAfterToolCall = (id, toolCall, result) =>
      this.safeExecuteHook(() => this.onAfterToolCall(id, toolCall, result));
    this.agent.onToolCallError = (id, toolCall, error) =>
      this.safeExecuteHook(() => this.onToolCallError(id, toolCall, error));
    this.agent.onProcessToolCalls = (id, toolCalls) =>
      this.safeExecuteHook(() => this.onProcessToolCalls(id, toolCalls));

    this.isHooked = true;
    logger.info(`Hooked into agent: ${this.snapshotName}`);
    return true;
  }

  /**
   * Unhook from the agent, restoring original hooks
   * @param force If true, force unhooking even if isHooked is false
   */
  unhookAgent(force = false): boolean {
    if (!this.isHooked && !force) return false;

    // Restore original hooks
    if (this.originalRequestHook) {
      this.agent.onLLMRequest = this.originalRequestHook;
    }

    if (this.originalResponseHook) {
      this.agent.onLLMResponse = this.originalResponseHook;
    }

    if (this.originalStreamingResponseHook) {
      this.agent.onLLMStreamingResponse = this.originalStreamingResponseHook;
    }

    if (this.originalLoopEndHook) {
      this.agent.onAgentLoopEnd = this.originalLoopEndHook;
    }

    if (this.originalEachLoopStartHook) {
      this.agent.onEachAgentLoopStart = this.originalEachLoopStartHook;
    }

    if (this.originalBeforeToolCallHook) {
      this.agent.onBeforeToolCall = this.originalBeforeToolCallHook;
    }

    if (this.originalAfterToolCallHook) {
      this.agent.onAfterToolCall = this.originalAfterToolCallHook;
    }

    if (this.originalToolCallErrorHook) {
      this.agent.onToolCallError = this.originalToolCallErrorHook;
    }

    if (this.originalProcessToolCallsHook) {
      this.agent.onProcessToolCalls = this.originalProcessToolCallsHook;
    }

    this.isHooked = false;
    logger.info(`Unhooked from agent: ${this.snapshotName}`);
    return true;
  }

  /**
   * Safely execute a hook function, capturing any errors
   */
  protected async safeExecuteHook<T>(hookFn: () => T | Promise<T>) {
    try {
      const result = await hookFn();

      // Handle both synchronous and asynchronous results
      if (result instanceof Promise) {
        return result.catch((error) => {
          this.lastError = error;
          logger.error(`Hook execution error: ${error.message}`);
          throw error; // Re-throw to propagate
        });
      }

      return result;
    } catch (error) {
      this.lastError = error as Error;
      logger.error(`Hook execution error: ${(error as Error).message}`);
      // do not throw it.
    }
  }

  /**
   * Check if there was an error during hook execution
   */
  hasError(): boolean {
    return this.lastError !== null;
  }

  /**
   * Get the last error that occurred during hook execution
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
   * Write streaming chunks to a file
   */
  protected writeStreamingChunks(filePath: string, chunks: ChatCompletionChunk[]): void {
    // Skip if no chunks
    if (!chunks || chunks.length === 0) {
      return;
    }

    try {
      // Format each chunk as a JSON line
      const chunksAsJsonLines = chunks.map((chunk) => JSON.stringify(chunk)).join('\n');
      fs.writeFileSync(filePath, chunksAsJsonLines, 'utf-8');
      logger.debug(`${chunks.length} chunks written to ${filePath}`);
    } catch (error) {
      logger.error(`Error writing streaming chunks: ${error}`);
      this.lastError = error as Error;
      throw error;
    }
  }

  /**
   * Hook implementations to be provided by subclasses
   */
  protected abstract onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void>;
  protected abstract onLLMResponse(
    id: string,
    payload: LLMResponseHookPayload,
  ): void | Promise<void>;
  protected abstract onLLMStreamingResponse(
    id: string,
    payload: LLMStreamingResponseHookPayload,
  ): void;
  protected abstract onAgentLoopEnd(id: string): void | Promise<void>;
  protected abstract onEachAgentLoopStart(id: string): void | Promise<void>;
  protected abstract onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: unknown,
  ): Promise<unknown> | unknown;
  protected abstract onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: unknown,
  ): Promise<unknown> | unknown;
  protected abstract onToolCallError(
    id: string,
    toolCall: { toolCallId: string; name: string },
    error: unknown,
  ): Promise<unknown> | unknown;
  public abstract onProcessToolCalls(
    id: string,
    toolCalls: ChatCompletionMessageToolCall[],
  ): Promise<ToolCallResult[] | undefined> | ToolCallResult[] | undefined;
}
