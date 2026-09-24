/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { Agent } from '@tarko/agent';
import {
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  ChatCompletionMessageToolCall,
  ToolCallResult,
} from '@tarko/agent-interface';
import { logger } from './utils/logger';
import { AgentHookBase } from './agent-hook-base';
import { ToolCallTracker, ToolCallData } from './utils/tool-call-tracker';



/**
 * Agent Generate Snapshot Hook - Manages hooks into agent for test snapshot generation
 */
export class AgentGenerateSnapshotHook extends AgentHookBase {
  private llmRequests: Record<number, LLMRequestHookPayload> = {};
  private llmResponses: Record<number, LLMResponseHookPayload> = {};
  private toolCallTracker = new ToolCallTracker();

  constructor(
    agent: Agent,
    options: {
      snapshotPath: string;
      snapshotName: string;
    },
  ) {
    super(agent, options);
  }

  protected onEachAgentLoopStart(id: string): void | Promise<void> {
    const currentLoop = this.agent.getCurrentLoopIteration();
    logger.info(`Starting agent loop ${currentLoop}`);
    this.toolCallTracker.initializeLoop(currentLoop);

    if (this.originalEachLoopStartHook) {
      return this.originalEachLoopStartHook.call(this.agent, id);
    }
  }

  protected onLLMRequest(id: string, payload: LLMRequestHookPayload): void | Promise<void> {
    const currentLoop = this.agent.getCurrentLoopIteration();
    this.llmRequests[currentLoop] = payload;

    const loopDir = path.join(this.snapshotPath, `loop-${currentLoop}`);
    if (!fs.existsSync(loopDir)) {
      fs.mkdirSync(loopDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(loopDir, 'llm-request.jsonl'),
      JSON.stringify(payload, null, 2),
      'utf-8',
    );

    const events = this.agent.getEventStream().getEvents();
    fs.writeFileSync(
      path.join(loopDir, 'event-stream.jsonl'),
      JSON.stringify(events, null, 2),
      'utf-8',
    );

    if (this.originalRequestHook) {
      return this.originalRequestHook.call(this.agent, id, payload);
    }
  }

  protected onLLMResponse(id: string, payload: LLMResponseHookPayload): void | Promise<void> {
    const currentLoop = this.agent.getCurrentLoopIteration();
    this.llmResponses[currentLoop] = payload;

    if (this.originalResponseHook) {
      return this.originalResponseHook.call(this.agent, id, payload);
    }
  }

  protected onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void {
    const currentLoop = this.agent.getCurrentLoopIteration();
    const responsePath = path.join(this.snapshotPath, `loop-${currentLoop}`, 'llm-response.jsonl');

    try {
      this.writeStreamingChunks(responsePath, payload.chunks);
      logger.info(`Saved ${payload.chunks.length} streaming chunks for loop-${currentLoop}`);
    } catch (error) {
      logger.error(`Failed to save streaming chunks: ${error}`);
    }

    if (this.originalStreamingResponseHook) {
      this.originalStreamingResponseHook.call(this.agent, id, payload);
    }
  }

  protected onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: unknown,
  ): unknown {
    const currentLoop = this.agent.getCurrentLoopIteration();
    this.toolCallTracker.startToolCall(currentLoop, toolCall, args);

    logger.debug(
      `Tool call captured for ${toolCall.name} (${toolCall.toolCallId}) in loop ${currentLoop}`,
    );

    if (this.originalBeforeToolCallHook) {
      return this.originalBeforeToolCallHook.call(this.agent, id, toolCall, args);
    }
    return args;
  }

  protected onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: unknown,
  ): unknown {
    const currentLoop = this.agent.getCurrentLoopIteration();
    this.toolCallTracker.finishToolCall(currentLoop, toolCall.toolCallId, result);

    logger.debug(
      `Tool call result captured for ${toolCall.name} (${toolCall.toolCallId}) in loop ${currentLoop}`,
    );

    this.saveToolCalls(currentLoop);

    if (this.originalAfterToolCallHook) {
      return this.originalAfterToolCallHook.call(this.agent, id, toolCall, result);
    }
    return result;
  }

  protected onToolCallError(
    id: string,
    toolCall: { toolCallId: string; name: string },
    error: unknown,
  ): unknown {
    const currentLoop = this.agent.getCurrentLoopIteration();
    this.toolCallTracker.finishToolCall(currentLoop, toolCall.toolCallId, undefined, error);

    logger.debug(
      `Tool call error captured for ${toolCall.name} (${toolCall.toolCallId}) in loop ${currentLoop}`,
    );

    this.saveToolCalls(currentLoop);

    if (this.originalToolCallErrorHook) {
      return this.originalToolCallErrorHook.call(this.agent, id, toolCall, error);
    }
    return `Error: ${error}`;
  }

  private saveToolCalls(loopNumber: number): void {
    const toolCalls = this.toolCallTracker.getToolCallsForLoop(loopNumber);
    if (toolCalls.length === 0) return;

    try {
      const loopDir = path.join(this.snapshotPath, `loop-${loopNumber}`);
      if (!fs.existsSync(loopDir)) {
        fs.mkdirSync(loopDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(loopDir, 'tool-calls.jsonl'),
        JSON.stringify(toolCalls, null, 2),
        'utf-8',
      );

      logger.info(`Saved ${toolCalls.length} tool calls for loop ${loopNumber}`);
    } catch (error) {
      logger.error(`Failed to save tool calls for loop ${loopNumber}: ${error}`);
    }
  }

  protected onAgentLoopEnd(id: string): void | Promise<void> {
    const finalEvents = this.agent.getEventStream().getEvents();
    fs.writeFileSync(
      path.join(this.snapshotPath, 'event-stream.jsonl'),
      JSON.stringify(finalEvents, null, 2),
      'utf-8',
    );

    logger.info(`Snapshot generation completed: ${this.snapshotPath}`);

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
