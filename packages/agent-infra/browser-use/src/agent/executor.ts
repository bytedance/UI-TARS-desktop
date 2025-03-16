/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/executor.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AgentContext, type AgentOptions } from './types';
import { NavigatorAgent, NavigatorActionRegistry } from './agents/navigator';
import { PlannerAgent } from './agents/planner';
import { ValidatorAgent } from './agents/validator';
import { NavigatorPrompt } from './prompts/navigator';
import { PlannerPrompt } from './prompts/planner';
import { ValidatorPrompt } from './prompts/validator';
import { createLogger } from '../utils';
import MessageManager from './messages/service';
import type BrowserContext from '../browser/context';
import { ActionBuilder } from './actions/builder';
import { EventManager } from './event/manager';
import {
  Actors,
  type EventCallback,
  EventType,
  ExecutionState,
} from './event/types';
import { ChatModelAuthError } from './agents/errors';
const logger = createLogger('Executor');

export interface ExecutorExtraArgs {
  plannerLLM?: BaseChatModel;
  validatorLLM?: BaseChatModel;
  extractorLLM?: BaseChatModel;
  agentOptions?: Partial<AgentOptions>;
}

export class Executor {
  private readonly navigator: NavigatorAgent;
  private readonly planner: PlannerAgent;
  private readonly validator: ValidatorAgent;
  private readonly context: AgentContext;
  private readonly plannerPrompt: PlannerPrompt;
  private readonly navigatorPrompt: NavigatorPrompt;
  private readonly validatorPrompt: ValidatorPrompt;
  private tasks: string[] = [];
  constructor(
    task: string,
    taskId: string,
    browserContext: BrowserContext,
    navigatorLLM: BaseChatModel,
    extraArgs?: Partial<ExecutorExtraArgs>,
  ) {
    const messageManager = new MessageManager({});

    const plannerLLM = extraArgs?.plannerLLM ?? navigatorLLM;
    const validatorLLM = extraArgs?.validatorLLM ?? navigatorLLM;
    const extractorLLM = extraArgs?.extractorLLM ?? navigatorLLM;
    const eventManager = new EventManager();
    const context = new AgentContext(
      taskId,
      browserContext,
      messageManager,
      eventManager,
      extraArgs?.agentOptions ?? {},
    );

    this.tasks.push(task);
    this.navigatorPrompt = new NavigatorPrompt(
      context.options.maxActionsPerStep,
    );
    this.plannerPrompt = new PlannerPrompt();
    this.validatorPrompt = new ValidatorPrompt(task);

    const actionBuilder = new ActionBuilder(context, extractorLLM);
    const navigatorActionRegistry = new NavigatorActionRegistry(
      actionBuilder.buildDefaultActions(),
    );

    // Initialize agents with their respective prompts
    this.navigator = new NavigatorAgent(navigatorActionRegistry, {
      chatLLM: navigatorLLM,
      context: context,
      prompt: this.navigatorPrompt,
    });
    this.planner = new PlannerAgent({
      chatLLM: plannerLLM,
      context: context,
      prompt: this.plannerPrompt,
    });

    this.validator = new ValidatorAgent({
      chatLLM: validatorLLM,
      context: context,
      prompt: this.validatorPrompt,
    });

    this.context = context;
    // Initialize message history
    this.context.messageManager.initTaskMessages(
      this.navigatorPrompt.getSystemMessage(),
      task,
    );
  }

  subscribeExecutionEvents(callback: EventCallback): void {
    this.context.eventManager.subscribe(EventType.EXECUTION, callback);
  }

  clearExecutionEvents(): void {
    // Clear all execution event listeners
    this.context.eventManager.clearSubscribers(EventType.EXECUTION);
  }

  addFollowUpTask(task: string): void {
    this.tasks.push(task);
    this.context.messageManager.addNewTask(task);
    // update validator prompt
    this.validatorPrompt.addFollowUpTask(task);

    // need to reset previous action results that are not included in memory
    this.context.actionResults = this.context.actionResults.filter(
      (result) => result.includeInMemory,
    );
  }

  /**
   * Execute the task
   *
   * @returns {Promise<void>}
   */
  async execute(): Promise<void> {
    logger.info(`🚀 Executing task: ${this.tasks[this.tasks.length - 1]}`);
    // reset the step counter
    const context = this.context;
    context.nSteps = 0;
    const allowedMaxSteps = this.context.options.maxSteps;
    const browserState = await this.context.browserContext.getState();

    try {
      this.context.emitEvent(
        Actors.SYSTEM,
        ExecutionState.TASK_START,
        this.context.taskId,
        browserState,
      );

      let done = false;
      let step = 0;
      let validatorFailed = false;

      for (step = 0; step < allowedMaxSteps; step++) {
        context.stepInfo = {
          stepNumber: context.nSteps,
          maxSteps: context.options.maxSteps,
        };

        logger.info(`🔄 Step ${step + 1} / ${allowedMaxSteps}`);
        if (await this.shouldStop()) {
          break;
        }

        // Run planner if configured
        if (
          this.planner &&
          (context.nSteps % context.options.planningInterval === 0 ||
            validatorFailed)
        ) {
          validatorFailed = false;
          // The first planning step is special, we don't want to add the browser state message to memory
          if (this.tasks.length > 1 || step > 0) {
            await this.navigator.addStateMessageToMemory();
          }

          const planOutput = await this.planner.execute();
          if (planOutput.result) {
            logger.info(
              `🔄 Planner output: ${JSON.stringify(planOutput.result, null, 2)}`,
            );
            this.context.messageManager.addPlan(
              JSON.stringify(planOutput.result),
              this.context.messageManager.length() - 1,
            );
            if (planOutput.result.done) {
              // task is complete, skip navigation
              done = true;
              this.validator.setPlan(planOutput.result.next_steps);
            } else {
              // task is not complete, let's navigate
              this.validator.setPlan(null);
              done = false;
            }

            if (!planOutput.result.web_task && planOutput.result.done) {
              break;
            }
          }
        }

        // execute the navigation step
        if (!done) {
          done = await this.navigate();
        }

        // validate the output
        if (
          done &&
          this.context.options.validateOutput &&
          !this.context.stopped &&
          !this.context.paused
        ) {
          const validatorOutput = await this.validator.execute();
          if (validatorOutput.result?.is_valid) {
            logger.info('✅ Task completed successfully');
            break;
          }
          validatorFailed = true;
        }
      }

      if (done) {
        this.context.emitEvent(
          Actors.SYSTEM,
          ExecutionState.TASK_OK,
          this.context.taskId,
          browserState,
        );
      } else if (step >= allowedMaxSteps) {
        logger.info('❌ Task failed: Max steps reached');
        this.context.emitEvent(
          Actors.SYSTEM,
          ExecutionState.TASK_FAIL,
          'Task failed: Max steps reached',
          browserState,
        );
      } else if (this.context.stopped) {
        this.context.emitEvent(
          Actors.SYSTEM,
          ExecutionState.TASK_CANCEL,
          'Task cancelled',
          browserState,
        );
      } else {
        this.context.emitEvent(
          Actors.SYSTEM,
          ExecutionState.TASK_PAUSE,
          'Task paused',
          browserState,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.context.emitEvent(
        Actors.SYSTEM,
        ExecutionState.TASK_FAIL,
        `Task failed: ${errorMessage}`,
        browserState,
      );
    }
  }

  private async navigate(): Promise<boolean> {
    const context = this.context;
    try {
      // Get and execute navigation action
      // check if the task is paused or stopped
      if (context.paused || context.stopped) {
        return false;
      }
      const navOutput = await this.navigator.execute();
      // check if the task is paused or stopped
      if (context.paused || context.stopped) {
        return false;
      }
      context.nSteps++;
      if (navOutput.error) {
        throw new Error(navOutput.error);
      }
      context.consecutiveFailures = 0;
      if (navOutput.result?.done) {
        return true;
      }
    } catch (error) {
      if (error instanceof ChatModelAuthError) {
        throw error;
      }
      context.consecutiveFailures++;
      logger.error(`Failed to execute step: ${error}`);
      if (context.consecutiveFailures >= context.options.maxFailures) {
        throw new Error('Max failures reached');
      }
    }
    return false;
  }

  private async shouldStop(): Promise<boolean> {
    if (this.context.stopped) {
      logger.info('Agent stopped');
      return true;
    }

    while (this.context.paused) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (this.context.stopped) {
        return true;
      }
    }

    if (this.context.consecutiveFailures >= this.context.options.maxFailures) {
      logger.error(
        `Stopping due to ${this.context.options.maxFailures} consecutive failures`,
      );
      return true;
    }

    return false;
  }

  async cancel(): Promise<void> {
    this.context.stop();
  }

  async resume(): Promise<void> {
    this.context.resume();
  }

  async pause(): Promise<void> {
    this.context.pause();
  }

  async cleanup(): Promise<void> {
    try {
      await this.context.browserContext.cleanup();
    } catch (error) {
      logger.error(`Failed to cleanup browser context: ${error}`);
    }
  }

  async getCurrentTaskId(): Promise<string> {
    return this.context.taskId;
  }
}
