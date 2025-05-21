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
  protected isHooked = false;
  protected currentRunOptions?: AgentRunOptions;
  protected snapshotManager?: SnapshotManager;

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

    // Replace with our hooks
    this.agent.onLLMRequest = (id, payload) => this.onLLMRequest(id, payload);
    this.agent.onLLMResponse = (id, payload) => this.onLLMResponse(id, payload);
    this.agent.onLLMStreamingResponse = (id, payload) => this.onLLMStreamingResponse(id, payload);
    this.agent.onAgentLoopEnd = (id) => this.onAgentLoopEnd(id);
    this.agent.onEachAgentLoopStart = (id) => this.onEachAgentLoopStart(id);

    this.isHooked = true;
    logger.info(`Hooked into agent: ${this.snapshotName}`);
    return true;
  }

  /**
   * Unhook from the agent, restoring original hooks
   */
  unhookAgent(): boolean {
    if (!this.isHooked) return false;

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

    this.isHooked = false;
    logger.info(`Unhooked from agent: ${this.snapshotName}`);
    return true;
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
}
