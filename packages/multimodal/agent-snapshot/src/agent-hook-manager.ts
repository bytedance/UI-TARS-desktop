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
} from '@multimodal/agent-interface';
import { logger } from './utils/logger';

/**
 * Agent Hook Manager - Manages hooks into agent for test snapshot generation
 * This replacesthe environment variable based approach with direct hooks
 */
export class AgentHookManager {
  private agent: Agent;
  private snapshotPath: string;
  private snapshotName: string;
  private llmRequests: Record<number, LLMRequestHookPayload> = {};
  private llmResponses: Record<number, LLMResponseHookPayload> = {};
  private sourceFile?: string;
  private currentRunOptions?: AgentRunOptions;

  // Original hooks storage
  private originalRequestHook:
    | ((id: string, payload: LLMRequestHookPayload) => LLMRequestHookPayload)
    | null = null;
  private originalResponseHook:
    | ((id: string, payload: LLMResponseHookPayload) => LLMResponseHookPayload)
    | null = null;
  private originalStreamingResponseHook:
    | ((id: string, payload: LLMStreamingResponseHookPayload) => void)
    | null = null;
  private originalLoopEndHook: ((id: string) => void) | null = null;
  private originalLoopStartHook: ((id: string) => void | Promise<void>) | null = null;
  private isHooked = false;

  constructor(
    agent: Agent,
    options: {
      snapshotPath: string;
      snapshotName: string;
      sourceFile?: string;
    },
  ) {
    this.agent = agent;
    this.snapshotPath = options.snapshotPath;
    this.snapshotName = options.snapshotName;
    this.sourceFile = options.sourceFile;

    // Create output directory
    if (!fs.existsSync(this.snapshotPath)) {
      fs.mkdirSync(this.snapshotPath, { recursive: true });
    }
  }

  /**
   * Store current run options for snapshot generation
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
    this.originalLoopStartHook = this.agent.onEachAgentLoopStart;

    // Replace with our hooks
    this.agent.onLLMRequest = (
      id: string,
      payload: LLMRequestHookPayload,
    ): LLMRequestHookPayload => {
      this.onLLMRequest(id, payload);
      // Call original hook if it exists
      if (this.originalRequestHook) {
        return this.originalRequestHook.call(this.agent, id, payload);
      }
      return payload;
    };

    this.agent.onLLMResponse = (
      id: string,
      payload: LLMResponseHookPayload,
    ): LLMResponseHookPayload => {
      this.onLLMResponse(id, payload);
      // Call original hook if it exists
      if (this.originalResponseHook) {
        return this.originalResponseHook.call(this.agent, id, payload);
      }
      return payload;
    };

    this.agent.onLLMStreamingResponse = (
      id: string,
      payload: LLMStreamingResponseHookPayload,
    ): void => {
      this.onLLMStreamingResponse(id, payload);
      // Call original hook if it exists
      if (this.originalStreamingResponseHook) {
        this.originalStreamingResponseHook.call(this.agent, id, payload);
      }
    };

    this.agent.onAgentLoopEnd = (id: string): void => {
      this.onAgentLoopEnd(id);
      // Call original hook if it exists
      if (this.originalLoopEndHook) {
        this.originalLoopEndHook.call(this.agent, id);
      }
    };

    this.agent.onEachAgentLoopStart = (id: string): void | Promise<void> => {
      this.onAgentLoopStart(id);
      // Call original hook if it exists
      if (this.originalLoopStartHook) {
        return this.originalLoopStartHook.call(this.agent, id);
      }
    };

    this.isHooked = true;
    logger.info(`Hooked into agent for snapshot generation: ${this.snapshotName}`);
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

    if (this.originalLoopStartHook) {
      this.agent.onEachAgentLoopStart = this.originalLoopStartHook;
    }

    this.isHooked = false;
    logger.info(`Unhooked from agent: ${this.snapshotName}`);
    return true;
  }

  /**
   * Hook called at the beginning of each agent loop
   */
  onAgentLoopStart(id: string): void {
    logger.info(`Starting agent loop ${this.agent.getCurrentLoopIteration()}`);
  }

  /**
   * Hook called before sending a request to the LLM
   */
  onLLMRequest(id: string, payload: LLMRequestHookPayload): void {
    // Get current loop from the Agent directly
    const currentLoop = this.agent.getCurrentLoopIteration();

    // Store the request for current loop
    this.llmRequests[currentLoop] = payload;

    // Create loop directory
    const loopDir = path.join(this.snapshotPath, `loop-${currentLoop}`);
    if (!fs.existsSync(loopDir)) {
      fs.mkdirSync(loopDir, { recursive: true });
    }

    // Write request to file
    fs.writeFileSync(
      path.join(loopDir, 'llm-request.jsonl'),
      JSON.stringify(payload, null, 2),
      'utf-8',
    );

    // Dump current event stream state
    const events = this.agent.getEventStream().getEvents();
    fs.writeFileSync(
      path.join(loopDir, 'event-stream.jsonl'),
      JSON.stringify(events, null, 2),
      'utf-8',
    );
  }

  /**
   * Hook called after receiving a response from the LLM
   */
  onLLMResponse(id: string, payload: LLMResponseHookPayload): void {
    // Store the response for the current loop using Agent's loop count
    const currentLoop = this.agent.getCurrentLoopIteration();
    this.llmResponses[currentLoop] = payload;
  }

  /**
   * Hook called for streaming responses from the LLM
   */
  onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void {
    const currentLoop = this.agent.getCurrentLoopIteration();
    const loopDir = `loop-${currentLoop}`;

    try {
      // Get path to save response
      const responsePath = path.join(this.snapshotPath, loopDir, 'llm-response.jsonl');

      // Write streaming chunks to file
      this.writeStreamingChunks(responsePath, payload.chunks);

      logger.info(`Saved ${payload.chunks.length} streaming chunks for ${loopDir}`);
    } catch (error) {
      logger.error(`Failed to save streaming chunks: ${error}`);
    }
  }

  /**
   * Write streaming chunks to JSONL file
   */
  private writeStreamingChunks(filePath: string, chunks: ChatCompletionChunk[]): void {
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
   * Hook called at the end of the agent's execution loop
   */
  onAgentLoopEnd(id: string): void {
    // Export final event stream state to the root directory
    const finalEvents = this.agent.getEventStream().getEvents();
    fs.writeFileSync(
      path.join(this.snapshotPath, 'event-stream.jsonl'),
      JSON.stringify(finalEvents, null, 2),
      'utf-8',
    );

    logger.info(`Snapshot generation completed: ${this.snapshotPath}`);
  }
}
