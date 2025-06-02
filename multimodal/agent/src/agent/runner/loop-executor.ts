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
import { ResolvedModel } from '@multimodal/model-provider';
import { LLMProcessor } from './llm-processor';
import type { Agent } from '../agent';

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
    private agent: Agent,
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

      // Check if higher-level agent requested termination
      if (this.agent.isLoopTerminationRequested()) {
        this.logger.info(
          `[Iteration] Terminated at iteration ${iteration}/${this.maxIterations} due to higher-level agent request`,
        );

        // FIXME: add it back

        // Create system event for terminated execution
        // const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
        //   level: 'info',
        //   message: 'Execution terminated by higher-level agent',
        // });
        // this.eventStream.sendEvent(systemEvent);

        // If we already have a final event, use it
        if (finalEvent !== null) {
          // No need to modify iteration count as it's already done below
          break;
        }

        // Create final event for terminated execution with a unique messageId
        const terminationMessageId = `msg_termination_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        finalEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
          content: 'Aggent TARS is finished',
          finishReason: 'stop',
          messageId: terminationMessageId,
        });

        this.eventStream.sendEvent(finalEvent);
        break;
      }

      if (finalEvent !== null) {
        // Call hook to check if loop should actually terminate
        try {
          const terminationResult = await Promise.resolve(
            this.agent.onBeforeLoopTermination(sessionId, finalEvent),
          );

          if (terminationResult.finished) {
            // Higher-level agent allowed termination, exit the loop
            this.logger.info(`[Agent] Loop termination approved by higher-level agent`);
            // Revert to the real loop count
            this.currentIteration--;
            break;
          } else {
            // Higher-level agent prevented termination, continue the loop
            this.logger.info(
              `[Agent] Loop termination prevented by higher-level agent: ${terminationResult.message || 'No reason provided'}`,
            );

            // Add system event to indicate continuation
            const continueEvent = this.eventStream.createEvent(EventType.SYSTEM, {
              level: 'info',
              message: `Loop continuation requested: ${terminationResult.message || 'No reason provided'}`,
            });
            this.eventStream.sendEvent(continueEvent);

            // Reset finalEvent to continue the loop
            finalEvent = null;
          }
        } catch (error) {
          // If hook throws an error, log it and allow termination by default
          this.logger.error(`[Agent] Error in onBeforeLoopTermination hook: ${error}`);
          this.currentIteration--;
          break;
        }
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
