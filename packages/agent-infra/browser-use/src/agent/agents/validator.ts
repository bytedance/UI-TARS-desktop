/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/agents/validator.ts
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
import { z } from 'zod';
import { ActionResult, type AgentOutput } from '../types';
import { Actors, ExecutionState } from '../event/types';
import { HumanMessage } from '@langchain/core/messages';
import { isAuthenticationError, createLogger } from '../../utils';
import { ChatModelAuthError } from './errors';
const logger = createLogger('ValidatorAgent');

// Define Zod schema for validator output
export const validatorOutputSchema = z.object({
  is_valid: z.boolean(), // indicates if the output is correct
  reason: z.string(), // explains why it is valid or not
  answer: z.string(), // the final answer to the task if it is valid
});

export type ValidatorOutput = z.infer<typeof validatorOutputSchema>;

export class ValidatorAgent extends BaseAgent<
  typeof validatorOutputSchema,
  ValidatorOutput
> {
  // sometimes we need to validate the output against both the current browser state and the plan
  private plan: string | null = null;
  constructor(
    options: BaseAgentOptions,
    extraOptions?: Partial<ExtraAgentOptions>,
  ) {
    super(validatorOutputSchema, options, { ...extraOptions, id: 'validator' });
  }

  /**
   * Set the plan for the validator agent
   * @param plan - The plan to set
   */
  setPlan(plan: string | null): void {
    this.plan = plan;
  }

  /**
   * Executes the validator agent
   * @returns AgentOutput<ValidatorOutput>
   */
  async execute(): Promise<AgentOutput<ValidatorOutput>> {
    try {
      this.context.emitEvent(
        Actors.VALIDATOR,
        ExecutionState.STEP_START,
        'Validating...',
      );

      let stateMessage = await this.prompt.getUserMessage(this.context);
      if (this.plan) {
        // merge the plan and the state message
        const mergedMessage = new HumanMessage(
          `${stateMessage.content}\n\nThe current plan is: \n${this.plan}`,
        );
        stateMessage = mergedMessage;
      }
      const systemMessage = this.prompt.getSystemMessage();
      const inputMessages = [systemMessage, stateMessage];

      const modelOutput = await this.invoke(inputMessages);
      if (!modelOutput) {
        throw new Error('Failed to validate task result');
      }

      logger.info('validator output', JSON.stringify(modelOutput, null, 2));

      if (!modelOutput.is_valid) {
        // need to update the action results so that other agents can see the error
        const msg = `The answer is not yet correct. ${modelOutput.reason}.`;
        this.context.emitEvent(Actors.VALIDATOR, ExecutionState.STEP_FAIL, msg);
        this.context.actionResults = [
          new ActionResult({ extractedContent: msg, includeInMemory: true }),
        ];
      } else {
        this.context.emitEvent(
          Actors.VALIDATOR,
          ExecutionState.STEP_OK,
          modelOutput.answer,
        );
      }

      return {
        id: this.id,
        result: modelOutput,
      };
    } catch (error) {
      // Check if this is an authentication error
      if (isAuthenticationError(error)) {
        throw new ChatModelAuthError(
          'Validator API Authentication failed. Please verify your API key',
          error,
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Validation failed: ${errorMessage}`);
      this.context.emitEvent(
        Actors.VALIDATOR,
        ExecutionState.STEP_FAIL,
        `Validation failed: ${errorMessage}`,
      );
      return {
        id: this.id,
        error: `Validation failed: ${errorMessage}`,
      };
    }
  }
}
