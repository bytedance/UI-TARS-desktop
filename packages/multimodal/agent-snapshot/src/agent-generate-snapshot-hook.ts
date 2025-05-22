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
  ChatCompletionMessageToolCall,
  ToolCallResult,
} from '@multimodal/agent-interface';
import { logger } from './utils/logger';
import { AgentHookBase } from './agent-hook-base';

/**
 * Structure to store tool call data for snapshot
 */
interface ToolCallData {
  toolCallId: string;
  name: string;
  args: unknown;
  result?: unknown;
  error?: unknown;
  executionTime?: number;
}

/**
 * Agent Generate Snapshot Hook - Manages hooks into agent for test snapshot generation
 */
export class AgentGenerateSnapshotHook extends AgentHookBase {
  private llmRequests: Record<number, LLMRequestHookPayload> = {};
  private llmResponses: Record<number, LLMResponseHookPayload> = {};
  private toolCallsByLoop: Record<number, ToolCallData[]> = {};
  private startTimeByToolCall: Record<string, number> = {};

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

    // Initialize tool calls array for this loop
    const currentLoop = this.agent.getCurrentLoopIteration();
    if (!this.toolCallsByLoop[currentLoop]) {
      this.toolCallsByLoop[currentLoop] = [];
    }

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
   * Hook called before a tool is executed
   */
  protected onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: unknown,
  ): unknown {
    const currentLoop = this.agent.getCurrentLoopIteration();

    // Record starting time to calculate execution time later
    this.startTimeByToolCall[toolCall.toolCallId] = Date.now();

    // Store tool call information
    if (!this.toolCallsByLoop[currentLoop]) {
      this.toolCallsByLoop[currentLoop] = [];
    }

    this.toolCallsByLoop[currentLoop].push({
      toolCallId: toolCall.toolCallId,
      name: toolCall.name,
      args,
    });

    logger.debug(
      `Tool call captured for ${toolCall.name} (${toolCall.toolCallId}) in loop ${currentLoop}`,
    );

    // Call original hook if it exists
    if (this.originalBeforeToolCallHook) {
      return this.originalBeforeToolCallHook.call(this.agent, id, toolCall, args);
    }

    return args;
  }

  /**
   * Hook called after a tool is executed
   */
  protected onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: unknown,
  ): unknown {
    const currentLoop = this.agent.getCurrentLoopIteration();
    const executionTime =
      Date.now() - (this.startTimeByToolCall[toolCall.toolCallId] || Date.now());

    // Find the tool call in our records and update with result
    if (this.toolCallsByLoop[currentLoop]) {
      const toolCallData = this.toolCallsByLoop[currentLoop].find(
        (tc) => tc.toolCallId === toolCall.toolCallId,
      );

      if (toolCallData) {
        toolCallData.result = result;
        toolCallData.executionTime = executionTime;
      }
    }

    logger.debug(
      `Tool call result captured for ${toolCall.name} (${toolCall.toolCallId}) in loop ${currentLoop}`,
    );

    // Write tool calls to file for current loop
    this.saveToolCalls(currentLoop);

    // Call original hook if it exists
    if (this.originalAfterToolCallHook) {
      return this.originalAfterToolCallHook.call(this.agent, id, toolCall, result);
    }

    return result;
  }

  /**
   * Hook called when a tool execution results in an error
   */
  protected onToolCallError(
    id: string,
    toolCall: { toolCallId: string; name: string },
    error: unknown,
  ): unknown {
    const currentLoop = this.agent.getCurrentLoopIteration();
    const executionTime =
      Date.now() - (this.startTimeByToolCall[toolCall.toolCallId] || Date.now());

    // Find the tool call in our records and update with error
    if (this.toolCallsByLoop[currentLoop]) {
      const toolCallData = this.toolCallsByLoop[currentLoop].find(
        (tc) => tc.toolCallId === toolCall.toolCallId,
      );

      if (toolCallData) {
        toolCallData.error = error;
        toolCallData.executionTime = executionTime;
      }
    }

    logger.debug(
      `Tool call error captured for ${toolCall.name} (${toolCall.toolCallId}) in loop ${currentLoop}`,
    );

    // Write tool calls to file for current loop
    this.saveToolCalls(currentLoop);

    // Call original hook if it exists
    if (this.originalToolCallErrorHook) {
      return this.originalToolCallErrorHook.call(this.agent, id, toolCall, error);
    }

    return `Error: ${error}`;
  }

  /**
   * Save tool calls data to file for current loop
   */
  private saveToolCalls(loopNumber: number): void {
    if (!this.toolCallsByLoop[loopNumber] || this.toolCallsByLoop[loopNumber].length === 0) {
      return;
    }

    try {
      const loopDir = path.join(this.snapshotPath, `loop-${loopNumber}`);
      if (!fs.existsSync(loopDir)) {
        fs.mkdirSync(loopDir, { recursive: true });
      }

      // Write tool calls to file
      fs.writeFileSync(
        path.join(loopDir, 'tool-calls.jsonl'),
        JSON.stringify(this.toolCallsByLoop[loopNumber], null, 2),
        'utf-8',
      );

      logger.info(
        `Saved ${this.toolCallsByLoop[loopNumber].length} tool calls for loop ${loopNumber}`,
      );
    } catch (error) {
      logger.error(`Failed to save tool calls for loop ${loopNumber}: ${error}`);
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

  public onProcessToolCalls(
    id: string,
    toolCalls: ChatCompletionMessageToolCall[],
  ): Promise<ToolCallResult[] | undefined> | ToolCallResult[] | undefined {
    return undefined;
  }
}
