/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ResolvedModel,
  ChatCompletionMessageParam,
  ConsoleLogger,
  EventStream,
  EventType,
  PlanStep,
  ToolDefinition,
  Tool,
  z,
  OpenAI,
} from '@multimodal/mcp-agent';
import { AgentTARSPlannerOptions } from '../types';
import type { AgentTARS } from '../agent-tars';
import { DeepResearchGenerator } from './deep-research';

/**
 * Default planning system prompt extension that guides the agent to create and follow plans
 */
export const DEFAULT_PLANNING_PROMPT = `
<planning_approach>
You are a methodical agent that follows a plan-and-solve approach for complex tasks. When handling tasks:

1. Analyze if the task requires a multi-step plan:
   - For complex research, analysis, or multi-part tasks → Create a plan
   - For simple questions or tasks → Skip planning and answer directly

2. If a plan is needed:
   - Create a clear, step-by-step plan with specific goals
   - Execute each step in order, using appropriate tools
   - Update the plan as you learn new information
   - Mark steps as completed when done
   - Once ALL steps are complete, call the "final_answer" tool

3. During execution:
   - Adapt your plan as needed based on new findings
   - Be willing to simplify the plan if the task turns out simpler than expected
   - Always complete your plan before providing final answers
</planning_approach>

<planning_constraints>
IMPORTANT CONSTRAINTS:
- Create AT MOST 3 key steps in your plan
- Focus on information gathering and research steps
- Call the "final_answer" tool once ALL plan steps are complete
- For simple questions, you can skip planning entirely
</planning_constraints>
`;

/**
 * PlanManager - Manages planning functionality for the agent
 *
 * This class handles the creation, updating, and tracking of plans,
 * as well as registering necessary tools for plan management.
 */
export class PlanManager {
  private currentPlan: PlanStep[] = [];
  private taskCompleted = false;
  private finalAnswerCalled = false;
  private maxSteps: number;
  private planningPrompt: string;
  private hasPlan = false;
  private deepResearchGenerator: DeepResearchGenerator;

  /**
   * Creates a new PlanManager instance
   *
   * @param logger - Logger instance for logging plan-related events
   * @param eventStream - EventStream for tracking plan events
   * @param options - Configuration options for the planning system
   */
  constructor(
    private logger: ConsoleLogger,
    private eventStream: EventStream,
    private agent: AgentTARS,
    options: AgentTARSPlannerOptions = {},
  ) {
    this.maxSteps = options.maxSteps ?? 3;
    this.planningPrompt = options.planningPrompt
      ? `${DEFAULT_PLANNING_PROMPT}\n\n${options.planningPrompt}`
      : DEFAULT_PLANNING_PROMPT;

    this.logger = logger.spawn('PlanManager');
    this.logger.info(`PlanManager initialized with max steps: ${this.maxSteps}`);

    // Initialize deep research generator
    this.deepResearchGenerator = new DeepResearchGenerator(this.logger, this.eventStream);
  }

  /**
   * Checks if a plan has been generated for the current task
   */
  hasPlanGenerated(): boolean {
    return this.hasPlan;
  }

  /**
   * Gets the planning system prompt extension
   */
  getPlanningPrompt(): string {
    return this.planningPrompt;
  }

  /**
   * Registers planning-related tools with the agent
   *
   * @returns Array of tool definitions to register
   */
  getTools(): ToolDefinition[] {
    return [
      new Tool({
        id: 'final_answer',
        description:
          'Generate a focused report or answer after completing research or information gathering',
        parameters: z.object({
          isDeepResearch: z
            .boolean()
            .optional()
            .describe('Whether to generate a structured report (true) or simple answer (false)'),
          title: z.string().optional().describe('Title for the report or answer'),
          format: z
            .enum(['detailed', 'concise'])
            .optional()
            .describe('Report format: detailed or concise'),
        }),
        function: async ({ isDeepResearch = false, title, format = 'concise' }) => {
          this.logger.info(
            `Final answer tool called with isDeepResearch=${isDeepResearch}, title=${title || 'untitled'}`,
          );
          this.finalAnswerCalled = true;

          const llmClient = this.agent.getLLMClient()!;
          const resolvedModel = this.agent.getCurrentResolvedModel()!;

          // Get the abort signal from the agent's execution controller
          const abortSignal = this.agent.getAbortSignal();

          try {
            if (isDeepResearch) {
              // Generate a focused research report
              await this.deepResearchGenerator.generateReport(
                llmClient,
                resolvedModel,
                this.eventStream,
                {
                  title: title || 'Information Report',
                  format,
                },
                abortSignal, // Pass the abort signal
              );
            } else {
              // Generate a simple answer - sent directly as assistant message
              const messageId = `final-answer-${Date.now()}`;

              // Create the final answer event
              const finalAnswerEvent = this.eventStream.createEvent(EventType.FINAL_ANSWER, {
                content: "I've completed the task. Here's a summary of what I found:",
                isDeepResearch: false,
                title: title || 'Answer',
                messageId,
              });

              // Send the event
              this.eventStream.sendEvent(finalAnswerEvent);
            }
          } catch (error) {
            // 处理中断错误
            if (abortSignal?.aborted) {
              this.logger.info('Final answer generation aborted');
              return {
                success: false,
                error: 'Final answer generation aborted',
              };
            }

            this.logger.error(`Error generating final answer: ${error}`);
            return {
              success: false,
              error: `Failed to generate final answer: ${error}`,
            };
          }

          // Request loop termination
          this.agent.requestLoopTermination();

          return {
            success: true,
            message: 'Final answer generated',
          };
        },
      }),
    ];
  }

  /**
   * Checks if the final report has been called
   */
  isFinalAnswerCalled(): boolean {
    return this.finalAnswerCalled;
  }

  /**
   * Resets the final report status
   */
  resetFinalAnswerStatus(): void {
    this.finalAnswerCalled = false;
  }

  /**
   * Checks if all plan steps are complete
   */
  isTaskCompleted(): boolean {
    return this.taskCompleted;
  }

  /**
   * Gets the current plan steps
   */
  getCurrentPlan(): PlanStep[] {
    return [...this.currentPlan];
  }

  /**
   * Generates the initial plan for a task
   *
   * @param llmClient - The LLM client to use for plan generation
   * @param resolvedModel - The resolved model configuration
   * @param messages - The current conversation messages
   * @param sessionId - The session identifier
   */
  async generateInitialPlan(
    llmClient: OpenAI,
    resolvedModel: ResolvedModel,
    messages: ChatCompletionMessageParam[],
    sessionId: string,
  ): Promise<void> {
    // Create plan start event
    const startEvent = this.eventStream.createEvent(EventType.PLAN_START, {
      sessionId,
    });
    this.eventStream.sendEvent(startEvent);

    try {
      // Request the LLM to create an initial plan with steps
      const response = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          ...messages,
          {
            role: 'user',
            content:
              "Analyze the user's request and determine if it requires a multi-step plan. " +
              'For complex research, analysis, or multi-part tasks, create a step-by-step plan. ' +
              'For simple questions or tasks that can be answered directly, return an empty plan. ' +
              'Return a JSON object with an array of steps. Each step should have a "content" field ' +
              'describing what needs to be done and a "done" field set to false.\n\n' +
              'IMPORTANT CONSIDERATIONS:\n' +
              '1. Only create steps for tasks that truly require planning and multiple tools\n' +
              '2. For simple questions or factual queries, return an empty steps array\n' +
              '3. For browsing tasks, only use a plan if multiple sites or complex research is needed\n' +
              `4. Create AT MOST ${this.maxSteps} key steps in your plan\n` +
              '5. Focus ONLY on information gathering and research steps\n' +
              '6. DO NOT include report creation as a step (the finalAnswer tool will handle this)',
          },
        ],
      });

      // Parse the response
      const content = response.choices[0]?.message?.content || '{"steps":[]}';
      let planData: {
        steps: PlanStep[];
        summary?: string;
        completed?: boolean;
      };
      try {
        planData = JSON.parse(content);
      } catch (e) {
        this.logger.error(`Failed to parse plan JSON: ${e}`);
        planData = { steps: [] };
      }

      // Store the plan
      this.currentPlan = Array.isArray(planData.steps)
        ? planData.steps.map((step) => ({
            content: step.content || 'Unknown step',
            done: false,
          }))
        : [];

      // Set hasPlan flag based on whether we have any plan steps
      this.hasPlan = this.currentPlan.length > 0;

      // Only send plan update event if there are steps
      if (this.hasPlan) {
        // Send plan update event
        const updateEvent = this.eventStream.createEvent(EventType.PLAN_UPDATE, {
          sessionId,
          steps: this.currentPlan,
        });
        this.eventStream.sendEvent(updateEvent);

        this.logger.info(`Initial plan created with ${this.currentPlan.length} steps`);
      } else {
        // Log that no plan was needed for this task
        this.logger.info(`No plan needed for this task - proceeding with direct execution`);

        // Mark task as completed if no steps are needed
        this.taskCompleted = true;
      }
    } catch (error) {
      this.logger.error(`Error generating initial plan: ${error}`);

      // Create a minimal default plan if generation fails
      this.currentPlan = [];
      this.taskCompleted = true;
    }
  }

  /**
   * Updates the plan based on current progress
   *
   * @param llmClient - The LLM client to use for plan updates
   * @param resolvedModel - The resolved model configuration
   * @param messages - The current conversation messages
   * @param sessionId - The session identifier
   */
  async updatePlan(
    llmClient: OpenAI,
    resolvedModel: ResolvedModel,
    messages: ChatCompletionMessageParam[],
    sessionId: string,
  ): Promise<void> {
    try {
      // Request the LLM to evaluate and update the plan
      const response = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          ...messages,
          {
            role: 'system',
            content:
              'Evaluate the current progress and update the plan. ' +
              'Return a JSON object with an array of steps, marking completed steps as "done": true. ' +
              'Add new steps or update current steps if needed based on new information. ' +
              "If user's task is simple and doesn't require a multi-step plan, return an empty steps array. " +
              'If all steps are complete, include a "completed": true field ' +
              'and a "summary" field with a final summary.\n\n' +
              'IMPORTANT CONSIDERATIONS:\n' +
              '1. Be willing to adapt the plan as you learn more about the task\n' +
              "2. If the user's request turns out to be simpler than initially thought, simplify the plan\n" +
              '3. If some steps are no longer necessary, mark them as done or remove them\n' +
              '4. For simple questions that can be answered directly, return an empty plan\n' +
              `5. Create AT MOST ${this.maxSteps} key steps in your plan\n` +
              '6. Focus ONLY on information gathering and research steps\n' +
              '7. DO NOT include report creation as a step (another tool will handle this)',
          },
          {
            role: 'system',
            content: `Current plan: ${JSON.stringify({ steps: this.currentPlan })}`,
          },
        ],
      });

      // Parse the response
      const content = response.choices[0]?.message?.content || '{"steps":[]}';
      let planData;
      try {
        planData = JSON.parse(content) as {
          steps: PlanStep[];
          summary?: string;
          completed?: boolean;
        };
      } catch (e) {
        this.logger.error(`Failed to parse plan update JSON: ${e}`);
        planData = { steps: this.currentPlan };
      }

      // Update the plan
      if (Array.isArray(planData.steps)) {
        this.currentPlan = planData.steps.map((step) => ({
          content: step.content || 'Unknown step',
          done: Boolean(step.done),
        }));
      }

      // Update hasPlan flag based on whether we have any plan steps
      this.hasPlan = this.currentPlan.length > 0;

      // Send plan update event
      const updateEvent = this.eventStream.createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.eventStream.sendEvent(updateEvent);

      // Check if the plan is completed
      const allStepsDone =
        this.currentPlan.every((step) => step.done) || this.currentPlan.length === 0;
      this.taskCompleted = allStepsDone || Boolean(planData.completed);

      if (this.taskCompleted) {
        // Send plan finish event
        const finishEvent = this.eventStream.createEvent(EventType.PLAN_FINISH, {
          sessionId,
          summary: planData.summary || 'Task completed successfully',
        });
        this.eventStream.sendEvent(finishEvent);
      }
    } catch (error) {
      this.logger.error(`Error updating plan: ${error}`);
    }
  }

  /**
   * Resets the planner state for a new session
   */
  reset(): void {
    this.currentPlan = [];
    this.taskCompleted = false;
    this.finalAnswerCalled = false;
    this.hasPlan = false;
    this.logger.info('Plan state reset');
  }
}
