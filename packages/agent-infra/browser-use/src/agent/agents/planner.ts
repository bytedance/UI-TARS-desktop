/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/agents/planner.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import {
  BaseAgent,
  type BaseAgentOptions,
  type ExtraAgentOptions,
} from './base';
import { createLogger, isAuthenticationError } from '../../utils';
import { z } from 'zod';
import type { AgentOutput } from '../types';
import { HumanMessage } from '@langchain/core/messages';
import { Actors, ExecutionState } from '../event/types';
import { ChatModelAuthError } from './errors';
const logger = createLogger('PlannerAgent');

// Define Zod schema for planner output
export const plannerOutputSchema = z.object({
  observation: z.string(),
  challenges: z.string(),
  done: z.boolean(),
  next_steps: z.string(),
  reasoning: z.string(),
  web_task: z.boolean(),
});

export type PlannerOutput = z.infer<typeof plannerOutputSchema>;

export class PlannerAgent extends BaseAgent<
  typeof plannerOutputSchema,
  PlannerOutput
> {
  constructor(
    options: BaseAgentOptions,
    extraOptions?: Partial<ExtraAgentOptions>,
  ) {
    super(plannerOutputSchema, options, { ...extraOptions, id: 'planner' });
  }

  async execute(): Promise<AgentOutput<PlannerOutput>> {
    try {
      this.context.emitEvent(
        Actors.PLANNER,
        ExecutionState.STEP_START,
        'Planning...',
      );
      // get all messages from the message manager, state message should be the last one
      const messages = this.context.messageManager.getMessages();
      // Use full message history except the first one
      const plannerMessages = [
        this.prompt.getSystemMessage(),
        ...messages.slice(1),
      ];

      // Remove images from last message if vision is not enabled for planner but vision is enabled
      if (
        !this.context.options.useVisionForPlanner &&
        this.context.options.useVision
      ) {
        const lastStateMessage = plannerMessages[plannerMessages.length - 1];
        let newMsg = '';

        if (Array.isArray(lastStateMessage.content)) {
          for (const msg of lastStateMessage.content) {
            if (msg.type === 'text') {
              newMsg += msg.text;
            }
            // Skip image_url messages
          }
        } else {
          newMsg = lastStateMessage.content;
        }

        plannerMessages[plannerMessages.length - 1] = new HumanMessage(newMsg);
      }

      const modelOutput = await this.invoke(plannerMessages);
      if (!modelOutput) {
        throw new Error('Failed to validate planner output');
      }
      this.context.emitEvent(
        Actors.PLANNER,
        ExecutionState.STEP_OK,
        modelOutput.next_steps,
      );

      return {
        id: this.id,
        result: modelOutput,
      };
    } catch (error) {
      // Check if this is an authentication error
      if (isAuthenticationError(error)) {
        throw new ChatModelAuthError(
          'Planner API Authentication failed. Please verify your API key',
          error,
        );
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.context.emitEvent(
        Actors.PLANNER,
        ExecutionState.STEP_FAIL,
        `Planning failed: ${errorMessage}`,
      );
      return {
        id: this.id,
        error: errorMessage,
      };
    }
  }
}
