/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AssistantMessageEvent,
  EventStream,
  EventType,
  ToolCallEngine,
} from '@multimodal/agent-interface';
import { getLogger } from '../../utils/logger';
import { ResolvedModel } from '../../utils/model-resolver';
import { LLMProcessor } from './llm-processor';

/**
 * LoopExecutor - Responsible for executing the agent's reasoning loop
 *
 * This class manages the core loop of the agent's reasoning process,
 * driving the interaction between the LLM, tools, and events.
 */
export class LoopExecutor {
  private logger = getLogger('LoopExecutor');
  private currentIteration = 1;

  constructor(
    private llmProcessor: LLMProcessor,
    private eventStream: EventStream,
    private instructions: string,
    private maxIterations: number,
  ) {}

  /**
   * Get the current iteration/loop number
   * @returns The current loop iteration (1-based)
   */
  getCurrentIteration(): number {
    return this.currentIteration;
  }

  /**
   * Executes the full reasoning loop until completion or max iterations
   *
   * @param resolvedModel The resolved model configuration
   * @param sessionId Session identifier
   * @param toolCallEngine The tool call engine to use
   * @param streamingMode Whether to operate in streaming mode
   * @param abortSignal Optional signal to abort the execution
   * @returns The final assistant message event
   */
  async executeLoop(
    resolvedModel: ResolvedModel,
    sessionId: string,
    toolCallEngine: ToolCallEngine,
    streamingMode = false,
    abortSignal?: AbortSignal,
  ): Promise<AssistantMessageEvent> {
    let finalEvent: AssistantMessageEvent | null = null;

    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      // Update current iteration
      this.currentIteration = iteration;
      // Check if operation was aborted
      if (abortSignal?.aborted) {
        this.logger.info(`[Iteration] Aborted at iteration ${iteration}/${this.maxIterations}`);

        // Add system event for aborted execution
        const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
          level: 'warning',
          message: 'Execution aborted',
        });
        this.eventStream.sendEvent(systemEvent);

        // Create final event for aborted execution with a unique messageId
        const abortMessageId = `msg_abort_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        finalEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
          content: 'Request was aborted',
          finishReason: 'abort',
          messageId: abortMessageId,
        });

        this.eventStream.sendEvent(finalEvent);
        break;
      }

      if (finalEvent !== null) {
        // Revert to the real loop count.
        this.currentIteration--;
        break;
      }

      this.logger.info(`[Iteration] ${iteration}/${this.maxIterations} started`);

      // Process the current iteration
      await this.llmProcessor.processRequest(
        resolvedModel,
        this.instructions,
        toolCallEngine,
        sessionId,
        streamingMode,
        iteration,
        abortSignal,
      );

      // Check if we've reached a final answer
      const assistantEvents = this.eventStream.getEventsByType([EventType.ASSISTANT_MESSAGE]);
      if (assistantEvents.length > 0) {
        const latestAssistantEvent = assistantEvents[
          assistantEvents.length - 1
        ] as AssistantMessageEvent;

        if (!latestAssistantEvent.toolCalls || latestAssistantEvent.toolCalls.length === 0) {
          finalEvent = latestAssistantEvent;
          const contentLength = latestAssistantEvent.content?.length || 0;
          this.logger.info(`[LLM] Text response received | Length: ${contentLength} characters`);
          this.logger.info(`[Agent] Final answer received`);
        }
      }

      this.logger.info(`[Iteration] ${iteration}/${this.maxIterations} completed`);
    }

    // Handle case where max iterations is reached without resolution
    if (finalEvent === null) {
      this.logger.warn(
        `[Agent] Maximum iterations reached (${this.maxIterations}), forcing termination`,
      );
      const errorMsg = 'Sorry, I could not complete this task. Maximum iterations reached.';

      // Add system event for max iterations
      const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
        level: 'warning',
        message: `Maximum iterations reached (${this.maxIterations}), forcing termination`,
      });
      this.eventStream.sendEvent(systemEvent);

      // Add final assistant message event with a unique messageId
      const maxIterMessageId = `msg_maxiter_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      finalEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
        content: errorMsg,
        finishReason: 'max_iterations',
        messageId: maxIterMessageId,
      });

      this.eventStream.sendEvent(finalEvent);
    }

    this.logger.info(
      `[Loop] Execution completed | SessionId: "${sessionId}" | ` +
        `Iterations: ${this.currentIteration}/${this.maxIterations}`,
    );

    return finalEvent;
  }
}
