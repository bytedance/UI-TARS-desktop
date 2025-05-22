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
import { AgentHookBase } from './agent-hook-base';

/**
 * Agent Hook Manager - Manages hooks into agent for test snapshot generation
 */
export class AgentHookManager extends AgentHookBase {
  private llmRequests: Record<number, LLMRequestHookPayload> = {};
  private llmResponses: Record<number, LLMResponseHookPayload> = {};

  constructor(
    agent: Agent,
    options: {
      snapshotPath: string;
      snapshotName: string;
    },
  ) {
    super(agent, options);
  }

  /**
   * Hook called at the beginning of each agent loop
   */
  protected onEachAgentLoopStart(id: string): void | Promise<void> {
    logger.info(`Starting agent loop ${this.agent.getCurrentLoopIteration()}`);
    // Call original hook if it exists
    if (this.originalEachLoopStartHook) {
      return this.originalEachLoopStartHook.call(this.agent, id);
    }
  }

  /**
   * Hook called before sending a request to the LLM
   */
  protected onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void> {
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

    // Call original hook if it exists
    if (this.originalRequestHook) {
      return this.originalRequestHook.call(this.agent, id, payload);
    }
  }

  /**
   * Hook called after receiving a response from the LLM
   */
  protected onLLMResponse(id: string, payload: LLMResponseHookPayload): void | Promise<void> {
    // Store the response for the current loop using Agent's loop count
    const currentLoop = this.agent.getCurrentLoopIteration();
    this.llmResponses[currentLoop] = payload;

    // Call original hook if it exists
    if (this.originalResponseHook) {
      return this.originalResponseHook.call(this.agent, id, payload);
    }
  }

  /**
   * Hook called for streaming responses from the LLM
   */
  protected onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void {
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

    // Call original hook if it exists
    if (this.originalStreamingResponseHook) {
      this.originalStreamingResponseHook.call(this.agent, id, payload);
    }
  }

  /**
   * Hook called at the end of the agent's execution loop
   */
  protected onAgentLoopEnd(id: string): void | Promise<void> {
    // Export final event stream state to the root directory
    const finalEvents = this.agent.getEventStream().getEvents();
    fs.writeFileSync(
      path.join(this.snapshotPath, 'event-stream.jsonl'),
      JSON.stringify(finalEvents, null, 2),
      'utf-8',
    );

    logger.info(`Snapshot generation completed: ${this.snapshotPath}`);

    // Call original hook if it exists
    if (this.originalLoopEndHook) {
      return this.originalLoopEndHook.call(this.agent, id);
    }
  }
}
