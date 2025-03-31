import { Memory } from '@agent-infra/shared';
import { ChatMessageUtil } from '@renderer/utils/ChatMessageUtils';
import { AppContext } from '@renderer/hooks/useAgentFlow';
import { Aware, AwareResult } from './Aware';
import { Executor } from './Executor';
import {
  PlanTask,
  PlanTaskStatus,
  ToolCallParam,
  ToolCallType,
} from '@renderer/type/agent';
import { EventManager } from './EventManager';
import { ExecutorToolType } from './Executor/tools';
import { ipcClient } from '@renderer/api';
import { GlobalEvent, globalEventEmitter } from '@renderer/state/chat';
import { Greeter } from './Greeter';
import { extractHistoryEvents } from '@renderer/utils/extractHistoryEvents';
import { EventItem, EventType } from '@renderer/type/event';
import { SNAPSHOT_BROWSER_ACTIONS } from '@renderer/constants';

export interface AgentContext {
  plan: PlanTask[];
  currentStep: number;
  memory: Memory;
  getEnvironmentInfo: (
    appContext: AppContext,
    agentContext: AgentContext,
  ) => string;
  eventManager: EventManager;
}

export interface EventStream {}

export class AgentFlow {
  private eventManager: EventManager;
  private abortController: AbortController;
  private interruptController: AbortController;
  private hasFinished = false;
  private loadingStatusTip = '';

  constructor(private appContext: AppContext) {
    const omegaHistoryEvents = this.parseHistoryEvents();
    this.eventManager = new EventManager(omegaHistoryEvents);
    this.abortController = new AbortController();
    this.interruptController = new AbortController();
  }

  async run() {
    this.appContext.setPlanTasks([]);
    const chatUtils = this.appContext.chatUtils;
    const { setAgentStatusTip } = this.appContext;
    this.eventManager.addLoadingStatus('Thinking');
    chatUtils.addMessage(
      ChatMessageUtil.assistantOmegaMessage({
        events: this.eventManager.getAllEvents(),
      }),
      {
        shouldSyncStorage: true,
      },
    );
    // this.appContext.setEvents([
    //   ...this.eventManager.getHistoryEvents(),
    //   ...this.eventManager.getAllEvents(),
    // ]);
    // return;
    setAgentStatusTip('Thinking');
    // First, we give a loading ui to the user to indicate that the agent is thinking
    const agentContext: AgentContext = {
      plan: [],
      currentStep: 0,
      memory: new Memory(),
      getEnvironmentInfo: this.getEnvironmentInfo,
      eventManager: this.eventManager,
    };
    const aware = new Aware(
      this.appContext,
      agentContext,
      this.interruptController.signal,
    );
    const executor = new Executor(
      this.appContext,
      agentContext,
      this.interruptController.signal,
    );
    this.eventManager.addLoadingStatus('Thinking');
    const greeter = new Greeter(this.appContext, this.abortController.signal);

    globalEventEmitter.addListener(
      this.appContext.agentFlowId,
      async (event) => {
        if (event.type === 'terminate') {
          this.abortController.abort();
          await this.eventManager.addEndEvent(
            'Agent flow has been terminated.',
          );
        }
      },
    );
    const preparePromise = greeter.run().then(async () => {
      // Run planner agent
      const omegaMessage = await chatUtils.addMessage(
        ChatMessageUtil.assistantOmegaMessage({
          events: this.eventManager.getAllEvents(),
        }),
        {
          shouldSyncStorage: true,
        },
      );
      // Bind event data and ui, when event added, the ui will be updated automatically
      // In other words, reactive ui programming
      this.eventManager.setUpdateCallback(async (events) => {
        this.appContext.setEvents((preEvents: EventItem[]) => {
          // Show canvas automatically when tool used
          if (preEvents.find((e) => e.type === EventType.ToolUsed)) {
            this.appContext.setShowCanvas(true);
          }
          const latestToolUsedEvent = [...events]
            .reverse()
            .find((e) => e.type === EventType.ToolUsed);
          console.log('latestToolUsedEvent', latestToolUsedEvent);
          latestToolUsedEvent &&
            this.appContext.setEventId(latestToolUsedEvent.id);
          return [...this.eventManager.getHistoryEvents(), ...events];
        });
        await chatUtils.updateMessage(
          ChatMessageUtil.assistantOmegaMessage({ events }),
          {
            messageId: omegaMessage!.id,
            shouldSyncStorage: true,
            shouldScrollToBottom: true,
          },
        );
      });

      globalEventEmitter.addListener(
        this.appContext.agentFlowId,
        async (event: GlobalEvent) => {
          switch (event.type) {
            case 'user-interrupt':
              await this.eventManager.addUserInterruptionInput(event.text);
              this.interruptController.abort();
              await chatUtils.updateMessage(
                ChatMessageUtil.assistantOmegaMessage({
                  events: this.eventManager.getAllEvents(),
                }),
                {
                  messageId: omegaMessage!.id,
                  shouldSyncStorage: true,
                },
              );
              break;
            default:
              break;
          }
        },
      );
    });

    await Promise.all([
      preparePromise,
      this.launchAgentLoop(executor, aware, agentContext, preparePromise),
    ]);

    if (!this.abortController.signal.aborted) {
      this.eventManager.addEndEvent('> Agent TARS has finished.');
    }
  }

  private async launchAgentLoop(
    executor: Executor,
    aware: Aware,
    agentContext: AgentContext,
    preparePromise: Promise<void>,
  ) {
    this.loadingStatusTip = 'Thinking';
    try {
      while (!this.abortController.signal.aborted && !this.hasFinished) {
        // The environment includes
        // - The current event stream context
        // - The current task
        // - The current user message
        try {
          await this.eventManager.addLoadingStatus(this.loadingStatusTip);
          console.log(
            'env info',
            this.getEnvironmentInfo(this.appContext, agentContext),
          );
          const awareResult = await aware.run();
          this.loadingStatusTip = 'Thinking';
          await preparePromise;
          if (this.abortController.signal.aborted) {
            break;
          }
          if (
            awareResult.plan &&
            awareResult.plan.every(
              (task) => task.status === PlanTaskStatus.Done,
            )
          ) {
            this.hasFinished = true;
            break;
          }

          if (this.interruptController.signal.aborted) {
            this.interruptController = new AbortController();
            this.loadingStatusTip = 'Replanning';
            aware.updateSignal(this.interruptController.signal);
            executor.updateSignal(this.interruptController.signal);
            await this.eventManager.addLoadingStatus(this.loadingStatusTip);
            this.appContext.setAgentStatusTip(this.loadingStatusTip);
            continue;
          }
          console.log('aware result', awareResult);

          // Reset the plan
          agentContext.plan = this.normalizePlan(awareResult, agentContext);
          await this.eventManager.addPlanUpdate(
            awareResult.step,
            agentContext.plan,
          );
          this.appContext.setPlanTasks(agentContext.plan);
          if (agentContext.plan.length === 0) {
            this.hasFinished = true;
            break;
          }
          agentContext.currentStep = awareResult.step;
          if (awareResult.step > agentContext.currentStep) {
            // Update UI, render new step
            await this.eventManager.addNewPlanStep(agentContext.currentStep);
            // Over the max task number, break the loop
            if (awareResult.step > agentContext.plan.length) {
              break;
            }
          }
          if (awareResult.status) {
            // Update UI, render new status
            await this.eventManager.addAgentStatus(awareResult.status);
          }

          await this.eventManager.addLoadingStatus(this.loadingStatusTip);
          this.appContext.setAgentStatusTip(this.loadingStatusTip);

          const toolCallList = (await executor.run(awareResult.status)).filter(
            Boolean,
          );

          if (this.abortController.signal.aborted) {
            break;
          }

          if (this.interruptController.signal.aborted) {
            this.handleUserInterrupt(aware, executor);
            continue;
          }

          const mcpTools = await ipcClient.listMcpTools();
          const customServerTools = await ipcClient.listCustomTools();
          this.loadingStatusTip = 'Executing Tool';
          // Execute the tools
          for (const toolCall of toolCallList) {
            const toolName = toolCall.function.name;
            const isMCPToolCall = mcpTools.some(
              (tool) => tool.name === toolCall.function.name,
            );
            const isCustomServerToolCall = customServerTools.some(
              (tool) => tool.function.name === toolCall.function.name,
            );

            await this.eventManager.addToolCallStart(
              toolName,
              toolCall.function.arguments,
            );

            await this.eventManager.addToolExecutionLoading(toolCall);

            // Set up permission check interval for this specific tool execution
            let originalFileContent: string | null = null;

            if (isMCPToolCall || isCustomServerToolCall) {
              if (
                toolName === ToolCallType.EditFile ||
                toolName === ToolCallType.WriteFile
              ) {
                const params = JSON.parse(
                  toolCall.function.arguments,
                ) as ToolCallParam['edit_file'];
                originalFileContent = await ipcClient.getFileContent({
                  filePath: params.path,
                });
              }
              // Execute tool in the main thread
              const callResult = (await executor.executeTools([toolCall]))[0];
              this.appContext.setAgentStatusTip('Executing Tool');

              await this.eventManager.handleToolExecution({
                toolName,
                toolCallId: toolCall.id,
                params: toolCall.function.arguments,
                result: callResult.content,
                isError: callResult.isError as boolean,
              });
            }

            if (originalFileContent) {
              // Add the missing original file content for diff code display
              this.eventManager.updateFileContentForEdit(originalFileContent);
            }

            if (SNAPSHOT_BROWSER_ACTIONS.includes(toolName as ToolCallType)) {
              const screenshotPath = await ipcClient.saveBrowserSnapshot();
              console.log('screenshotPath', screenshotPath);
              this.eventManager.updateScreenshot(screenshotPath.filepath);
            }

            if (toolName === ExecutorToolType.ChatMessage) {
              const params = JSON.parse(toolCall.function.arguments);
              await this.eventManager.addChatText(
                params.text,
                params.attachments,
              );
            }

            if (toolName === ExecutorToolType.Idle) {
              this.hasFinished = true;
              this.eventManager.addPlanUpdate(
                agentContext.plan.length,
                this.flagPlanDone(agentContext.plan),
              );
              break;
            }
          }
          this.loadingStatusTip = 'Thinking';
        } catch (e) {
          console.log(e);
          break;
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Agent loop aborted');
        return;
      }
      throw error;
    }
  }

  private async handleUserInterrupt(aware: Aware, executor: Executor) {
    this.interruptController = new AbortController();
    aware.updateSignal(this.interruptController.signal);
    executor.updateSignal(this.interruptController.signal);
    this.loadingStatusTip = 'Replanning';
    await this.eventManager.addLoadingStatus(this.loadingStatusTip);
    this.appContext.setAgentStatusTip(this.loadingStatusTip);
  }

  private getEnvironmentInfo(
    appContext: AppContext,
    agentContext: AgentContext,
  ) {
    const pendingInit = agentContext.plan.length === 0;
    const currentStep = agentContext.currentStep;
    const currentTask = agentContext.plan[currentStep - 1]?.title;
    return `Event stream result history: ${this.eventManager.normalizeEventsForPrompt()}

The user original input: ${appContext.request.inputText}

    ${
      pendingInit
        ? 'Plan: None'
        : `Plan:
${agentContext.plan.map((item) => `  - [${item.id}] ${item.title}`).join('\n')}

Current step: ${currentStep}

Current task: ${currentTask}
`
    }
    `;
  }

  /**
   * Get the event manager instance
   */
  public getEventManager(): EventManager {
    return this.eventManager;
  }

  private normalizePlan(awareResult: AwareResult, agentContext: AgentContext) {
    return (awareResult.plan || agentContext.plan).map((item, index) => {
      // const currentTask = agentContext.plan[index];
      if (index < awareResult.step - 1) {
        return {
          ...item,
          status: PlanTaskStatus.Done,
        };
      }

      if (index === awareResult.step - 1) {
        return {
          ...item,
          status: PlanTaskStatus.Doing,
        };
      }

      return {
        ...item,
        status: PlanTaskStatus.Todo,
      };
    });
  }

  private flagPlanDone(plan: PlanTask[]) {
    return plan.map((item) => {
      return {
        ...item,
        status: PlanTaskStatus.Done,
      };
    });
  }

  private parseHistoryEvents() {
    const events = extractHistoryEvents(this.appContext.chatUtils.messages);
    this.appContext.setEvents(events);
    return events;
  }
}
