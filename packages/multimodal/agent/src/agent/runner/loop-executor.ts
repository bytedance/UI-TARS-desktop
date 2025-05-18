/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AssistantMessageEvent, EventStream, EventType } from '../../types';
import { ToolCallEngine } from '../../types/tool-call-engine';
import { getLogger } from '../../utils/logger';
import { ResolvedModel } from '../../utils/model-resolver';
import { LLMProcessor } from './llm-processor';
import { ToolProcessor } from './tool-processor';

/**
 * LoopExecutor - Responsible for executing the agent's reasoning loop
 *
 * This class manages the core loop of the agent's reasoning process,
 * driving the interaction between the LLM, tools, and events.
 */
export class LoopExecutor {
  private logger = getLogger('LoopExecutor');

  constructor(
    private llmProcessor: LLMProcessor,
    private toolProcessor: ToolProcessor,
    private eventStream: EventStream,
    private instructions: string,
    private maxIterations: number,
  ) {}

  /**
   * Executes the full reasoning loop until completion or max iterations
   *
   * @param resolvedModel The resolved model configuration
   * @param sessionId Session identifier
   * @param toolCallEngine The tool call engine to use
   * @param streamingMode Whether to operate in streaming mode
   * @returns The final assistant message event
   */
  async executeLoop(
    resolvedModel: ResolvedModel,
    sessionId: string,
    toolCallEngine: ToolCallEngine,
    streamingMode = false,
  ): Promise<AssistantMessageEvent> {
    let finalEvent: AssistantMessageEvent | null = null;

    // Build system prompt and enhance with tool call engine
    const systemPrompt = this.getSystemPrompt();
    const enhancedSystemPrompt = toolCallEngine.preparePrompt(
      systemPrompt,
      this.toolProcessor.getTools(),
    );

    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      if (finalEvent !== null) {
        break;
      }

      this.logger.info(`[Iteration] ${iteration}/${this.maxIterations} started`);

      // Process the current iteration
      await this.llmProcessor.processRequest(
        resolvedModel,
        enhancedSystemPrompt,
        toolCallEngine,
        sessionId,
        streamingMode,
        iteration,
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

      // Add final assistant message event
      finalEvent = this.eventStream.createEvent(EventType.ASSISTANT_MESSAGE, {
        content: errorMsg,
        finishReason: 'max_iterations',
      });

      this.eventStream.sendEvent(finalEvent);
    }

    this.logger.info(
      `[Loop] Execution completed | SessionId: "${sessionId}" | ` +
        `Iterations: ${this.maxIterations}/${this.maxIterations}`,
    );

    return finalEvent;
  }

  /**
   * Generates the system prompt for the agent.
   * Combines the base instructions with the current time.
   */
  private getSystemPrompt(): string {
    if (process.env.TEST_AGENT_SNAPSHOP || process.env.DUMP_AGENT_SNAPSHOP) {
      return `${this.instructions}

Current time: 5/20/2025, 10:00:00 AM`;
    }

    return `${this.instructions}

Current time: ${new Date().toLocaleString()}`;
  }
}
