/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getLogger } from '../utils/logger';
import { Agent } from '../agent/agent';
import { ReflectionRequest, ReflectionResult } from './types';
import { ChatCompletionCreateParams } from '@multimodal/agent-interface';

/**
 * ReflectionService - Provides self-reflection capabilities for agents
 *
 * This service evaluates whether an agent's response actually resolves the user's query
 * or indicates more work to be done. It helps prevent premature loop termination when
 * the agent itself indicates that additional steps are needed.
 */
export class ReflectionService {
  private logger = getLogger('ReflectionService');

  /**
   * Perform reflection on an assistant message to determine if it should
   * be the final response or if the agent loop should continue
   *
   * @param agent The agent instance that will perform the reflection
   * @param request The reflection request parameters
   * @returns Promise resolving to a reflection result with termination decision
   */
  async reflect(agent: Agent, request: ReflectionRequest): Promise<ReflectionResult> {
    try {
      // Get LLM client from agent
      const llmClient = agent.getLLMClient();
      if (!llmClient) {
        this.logger.warn('No LLM client available for reflection, allowing termination');
        return { finished: true };
      }

      const resolvedModel = agent.getCurrentResolvedModel();
      if (!resolvedModel) {
        this.logger.warn('No resolved model available for reflection, allowing termination');
        return { finished: true };
      }

      // Extract the most recent user message content
      const lastUserMessage = request.userMessages[request.userMessages.length - 1];
      if (!lastUserMessage) {
        this.logger.warn('No user message found for reflection, allowing termination');
        return { finished: true };
      }

      const userContent =
        typeof lastUserMessage.content === 'string'
          ? lastUserMessage.content
          : 'Complex multimodal query'; // Simplified handling for multimodal content

      const assistantContent = request.assistantMessage.content || '';

      // Create prompt for reflection
      const messages = [
        {
          role: 'system' as const,
          content: `You are a reflection engine that evaluates whether an assistant's response properly addresses the user's query. Your task is to analyze:
1. If the assistant's message clearly indicates that MORE WORK NEEDS TO BE DONE but the conversation is about to end
2. If the assistant mentions "I'll", "I will", "I need to", "Let me", followed by a task that wasn't completed
3. If the assistant mentions using tools or performing actions that weren't executed

Respond ONLY with a JSON object with these fields:
- "shouldContinue": boolean (true if the loop should continue, false if it can terminate)
- "reason": brief explanation of your decision
- "analysis": detailed analysis of why the response is incomplete or complete

Focus specifically on whether the assistant indicates pending tasks in its LAST response.`,
        },
        {
          role: 'user' as const,
          content: `USER QUERY:
${userContent}

ASSISTANT'S FINAL RESPONSE:
${assistantContent}

Should the agent conversation continue or is this a complete response?`,
        },
      ];

      // Call LLM with JSON response format
      const params: ChatCompletionCreateParams = {
        messages,
        model: resolvedModel.id,
        temperature: 0.2, // Lower temperature for more consistent reasoning
        response_format: { type: 'json_object' },
        max_tokens: 500,
      };

      this.logger.info(`[SessionId: ${request.sessionId}] Performing reflection check`);

      // Make the LLM call with abort signal
      const response = await llmClient.chat.completions.create(params, {
        signal: request.abortSignal,
      });

      // Parse JSON response
      try {
        const content = response.choices[0]?.message?.content || '{"shouldContinue": false}';
        const reflectionData = JSON.parse(content);

        const result: ReflectionResult = {
          finished: !reflectionData.shouldContinue,
          message: reflectionData.reason,
          analysis: reflectionData.analysis,
        };

        this.logger.info(
          `[SessionId: ${request.sessionId}] Reflection result: ${result.finished ? 'Should terminate' : 'Should continue'}, reason: ${result.message || 'No reason provided'}`,
        );

        return result;
      } catch (parseError) {
        this.logger.error(`Failed to parse reflection response: ${parseError}`, response);
        return { finished: true, message: 'Error in reflection process' };
      }
    } catch (error) {
      // Handle errors gracefully
      this.logger.error(`Reflection error: ${error}`);
      if (request.abortSignal?.aborted) {
        this.logger.info('Reflection aborted');
      }

      // Default to allowing termination on error
      return {
        finished: true,
        message: `Error during reflection: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
