/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/service.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { v4 as uuidv4 } from 'uuid';

import BrowserContext from '../browser/context';
import { BrowserContextConfig } from '../browser/types';
import { Executor } from './executor';
import { AgentEvent, ExecutionState } from './event/types';

type RegisterNewStepCallback = (event: AgentEvent) => Promise<void>;
// type RegisterDoneCallback = (history: any) => Promise<void>;

export class Agent {
  private browserContext: BrowserContext;
  private registerNewStepCallback?: RegisterNewStepCallback;
  // private registerDoneCallback?: RegisterDoneCallback;
  private executor?: Executor;

  constructor(
    private llm: BaseChatModel,
    options?: {
      browserContextConfig?: BrowserContextConfig;
      registerNewStepCallback?: RegisterNewStepCallback;
      // registerDoneCallback?: RegisterDoneCallback;
    },
  ) {
    this.browserContext = new BrowserContext(
      options?.browserContextConfig || {},
    );

    this.registerNewStepCallback = options?.registerNewStepCallback;
  }

  private subscribeToExecutorEvents(executor: Executor) {
    // Clear previous event listeners to prevent multiple subscriptions
    executor.clearExecutionEvents();

    // Subscribe to new events
    executor.subscribeExecutionEvents(async (event) => {
      try {
        this.registerNewStepCallback?.(event);
      } catch (error) {
        console.error('Failed to send message to side panel:', error);
      }

      if (
        event.state === ExecutionState.TASK_OK ||
        event.state === ExecutionState.TASK_FAIL ||
        event.state === ExecutionState.TASK_CANCEL
      ) {
        await this.executor?.cleanup();
      }
    });
  }

  async run(task: string) {
    // this.registerDoneCallback = options?.registerDoneCallback;

    this.executor = new Executor(
      task,
      `${uuidv4()}`,
      this.browserContext,
      this.llm,
      {
        plannerLLM: this.llm,
        validatorLLM: this.llm,
      },
    );

    this.subscribeToExecutorEvents(this.executor);

    const result = await this.executor.execute();
    console.info('new_task execution result', result);
  }
}
