/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/agents/navigator.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import { z } from 'zod';
import {
  BaseAgent,
  type BaseAgentOptions,
  type ExtraAgentOptions,
} from './base';
import { ActionResult, type AgentOutput } from '../types';
import type { Action } from '../actions/builder';
import { buildDynamicActionSchema } from '../actions/builder';
import { agentBrainSchema } from '../types';
import { type BaseMessage, HumanMessage } from '@langchain/core/messages';
import { Actors, ExecutionState } from '../event/types';
import { isAuthenticationError, createLogger } from '../../utils';
import { ChatModelAuthError } from './errors';
import { jsonNavigatorOutputSchema } from '../actions/json_schema';
import { geminiNavigatorOutputSchema } from '../actions/json_gemini';
import { jsonrepair } from 'jsonrepair';
const logger = createLogger('NavigatorAgent');

export class NavigatorActionRegistry {
  private actions: Record<string, Action> = {};

  constructor(actions: Action[]) {
    for (const action of actions) {
      this.registerAction(action);
    }
  }

  registerAction(action: Action): void {
    this.actions[action.name()] = action;
  }

  unregisterAction(name: string): void {
    delete this.actions[name];
  }

  getAction(name: string): Action | undefined {
    return this.actions[name];
  }

  setupModelOutputSchema(): z.ZodType {
    const actionSchema = buildDynamicActionSchema(Object.values(this.actions));
    return z.object({
      current_state: agentBrainSchema,
      action: z.array(actionSchema),
    });
  }
}

export interface NavigatorResult {
  done: boolean;
}

export class NavigatorAgent extends BaseAgent<z.ZodType, NavigatorResult> {
  private actionRegistry: NavigatorActionRegistry;

  constructor(
    actionRegistry: NavigatorActionRegistry,
    options: BaseAgentOptions,
    extraOptions?: Partial<ExtraAgentOptions>,
  ) {
    super(actionRegistry.setupModelOutputSchema(), options, {
      ...extraOptions,
      id: 'navigator',
    });

    this.actionRegistry = actionRegistry;
  }

  async invoke(inputMessages: BaseMessage[]): Promise<this['ModelOutput']> {
    logger.info('invoke this.chatLLM', this.withStructuredOutput);
    // Use structured output
    if (this.withStructuredOutput) {
      // For Google Generative AI, we need to use the modelOutputSchema directly
      // but make sure it doesn't have any 'default' properties that cause issues

      const schema =
        this.chatModelLibrary === 'ChatGoogleGenerativeAI'
          ? geminiNavigatorOutputSchema
          : jsonNavigatorOutputSchema;

      // TODO: don't know why zod can not generate the same schema. Use the json schema exported from browser-use as a workaround for now, need to fix it
      const structuredLlm = this.chatLLM.withStructuredOutput(schema, {
        includeRaw: true,
      });

      console.log('structuredLlm', structuredLlm);

      const response = await structuredLlm.invoke(inputMessages, {
        ...this.callOptions,
      });
      logger.info('invoke structuredLlm response', response);

      if (response.parsed) {
        return response.parsed;
      } else {
        return response.raw;
      }
      // throw new Error('Could not parse response');
    }

    // Without structured output support, need to extract JSON from model output manually
    const response = await this.chatLLM.invoke(inputMessages, {
      ...this.callOptions,
    });
    logger.info('invoke response', response);
    if (typeof response.content === 'string') {
      response.content = this.removeThinkTags(response.content);
      try {
        const extractedJson = this.extractJsonFromModelOutput(response.content);
        const parsed = this.validateModelOutput(extractedJson);
        if (parsed) {
          return parsed;
        }
      } catch (error) {
        logger.error('Could not parse response', response);
        throw new Error('Could not parse response');
      }
    }
    throw new Error('Could not parse response');
  }

  async execute(): Promise<AgentOutput<NavigatorResult>> {
    const agentOutput: AgentOutput<NavigatorResult> = {
      id: this.id,
    };

    let cancelled = false;

    try {
      this.context.emitEvent(
        Actors.NAVIGATOR,
        ExecutionState.STEP_START,
        'Navigating...',
      );

      const messageManager = this.context.messageManager;
      // add the browser state message
      await this.addStateMessageToMemory();
      // check if the task is paused or stopped
      if (this.context.paused || this.context.stopped) {
        cancelled = true;
        return agentOutput;
      }

      // call the model to get the actions to take
      const inputMessages = messageManager.getMessages();
      const modelOutput = await this.invoke(inputMessages);
      logger.info('modelOutput', modelOutput);

      // check if the task is paused or stopped
      if (this.context.paused || this.context.stopped) {
        cancelled = true;
        return agentOutput;
      }
      // remove the last state message from memory before adding the model output
      this.removeLastStateMessageFromMemory();
      this.addModelOutputToMemory(modelOutput);

      logger.info('modelOutput.action', modelOutput.action);

      // take the actions
      const actionResults = await this.doMultiAction(modelOutput);
      logger.info('actionResults', actionResults);
      this.context.actionResults = actionResults;

      // check if the task is paused or stopped
      if (this.context.paused || this.context.stopped) {
        cancelled = true;
        return agentOutput;
      }
      // emit event
      this.context.emitEvent(
        Actors.NAVIGATOR,
        ExecutionState.STEP_OK,
        'Navigation done',
      );
      let done = false;
      if (
        actionResults.length > 0 &&
        actionResults[actionResults.length - 1].isDone
      ) {
        done = true;
      }
      agentOutput.result = { done };
      return agentOutput;
    } catch (error) {
      logger.error('execute error', error);
      this.removeLastStateMessageFromMemory();
      // Check if this is an authentication error
      if (isAuthenticationError(error)) {
        throw new ChatModelAuthError(
          'Navigator API Authentication failed. Please verify your API key',
          error,
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorString = `Navigation failed: ${errorMessage}`;
      logger.error(errorString);
      this.context.emitEvent(
        Actors.NAVIGATOR,
        ExecutionState.STEP_FAIL,
        errorString,
      );
      agentOutput.error = errorMessage;
      return agentOutput;
    } finally {
      // if the task is cancelled, remove the last state message from memory and emit event
      if (cancelled) {
        this.removeLastStateMessageFromMemory();
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.STEP_CANCEL,
          'Navigation cancelled',
        );
      }
    }
  }

  /**
   * Add the state message to the memory
   */
  public async addStateMessageToMemory() {
    if (this.context.stateMessageAdded) {
      return;
    }

    const messageManager = this.context.messageManager;
    const options = this.context.options;
    // Handle results that should be included in memory
    if (this.context.actionResults.length > 0) {
      let index = 0;
      for (const r of this.context.actionResults) {
        if (r.includeInMemory) {
          if (r.extractedContent) {
            const msg = new HumanMessage(
              `Action result: ${r.extractedContent}`,
            );
            // logger.info('Adding action result to memory', msg.content);
            messageManager.addMessageWithTokens(msg);
          }
          if (r.error) {
            const msg = new HumanMessage(
              `Action error: ${r.error.toString().slice(-options.maxErrorLength)}`,
            );
            logger.info('Adding action error to memory', msg.content);
            messageManager.addMessageWithTokens(msg);
          }
          // reset this action result to empty, we dont want to add it again in the state message
          this.context.actionResults[index] = new ActionResult();
        }
        index++;
      }
    }

    const state = await this.prompt.getUserMessage(this.context);
    messageManager.addStateMessage(state);
    this.context.stateMessageAdded = true;
  }

  /**
   * Remove the last state message from the memory
   */
  protected async removeLastStateMessageFromMemory() {
    if (!this.context.stateMessageAdded) return;
    const messageManager = this.context.messageManager;
    messageManager.removeLastStateMessage();
    this.context.stateMessageAdded = false;
  }

  private async doMultiAction(
    response: this['ModelOutput'],
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    let errCount = 0;

    logger.info('doMultiAction_Actions', response.action);
    // sometimes response.action is a string, but not an array as expected, so we need to parse it as an array
    let actions: Record<string, unknown>[] = [];
    if (Array.isArray(response.action)) {
      // if the item is null, skip it
      actions = response.action.filter((item: unknown) => item !== null);
      if (actions.length === 0) {
        logger.warning('No valid actions found', response.action);
      }
    } else if (typeof response.action === 'string') {
      try {
        logger.warning('Unexpected action format', response.action);
        const repaired = jsonrepair(response.action);
        // try to parse the action as an JSON object
        actions = JSON.parse(repaired);
      } catch (error) {
        logger.error('Invalid action format', response.action);
        throw new Error('Invalid action output format');
      }
    } else {
      // if the action is neither an array nor a string, it should be an object
      actions = [response.action];
    }

    for (const action of actions) {
      const actionName = Object.keys(action)[0];
      const actionArgs = action[actionName];
      try {
        // check if the task is paused or stopped
        if (this.context.paused || this.context.stopped) {
          return results;
        }

        const result = await this.actionRegistry
          .getAction(actionName)
          ?.call(actionArgs);
        if (result === undefined) {
          throw new Error(
            `Action ${actionName} not exists or returned undefined`,
          );
        }
        results.push(result);
        // check if the task is paused or stopped
        if (this.context.paused || this.context.stopped) {
          return results;
        }
        // TODO: wait for 1 second for now, need to optimize this to avoid unnecessary waiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error('doAction error', errorMessage);
        // unexpected error, emit event
        this.context.emitEvent(
          Actors.NAVIGATOR,
          ExecutionState.ACT_FAIL,
          errorMessage,
        );
        errCount++;
        if (errCount > 3) {
          throw new Error('Too many errors in actions');
        }
        results.push(
          new ActionResult({
            error: errorMessage,
            isDone: false,
            includeInMemory: true,
          }),
        );
      }
    }
    return results;
  }
}
