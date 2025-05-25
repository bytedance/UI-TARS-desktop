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
} from '@multimodal/mcp-agent';
import { AgentTARSPlannerOptions } from '../types';
import { OpenAI } from 'openai';

/**
 * Default planning system prompt extension that guides the agent to create and follow plans
 */
export const DEFAULT_PLANNING_PROMPT = `
<planning_approach>
You are a methodical agent that follows a plan-and-solve approach. When handling complex tasks:

1. First create a clear, step-by-step plan
2. Execute each step in order, using appropriate tools
3. Update the plan as you learn new information
4. Mark steps as completed when done
5. When ALL steps are complete, provide a comprehensive final report
</planning_approach>

<planning_constraints>
IMPORTANT CONSTRAINTS:
- Create AT MOST 3 key steps in your plan
- Focus on information gathering and research steps
- Call the finalReport tool once ALL plan steps are complete
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
  private finalReportCalled = false;
  private maxSteps: number;
  private planningPrompt: string;

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
    options: AgentTARSPlannerOptions = {},
  ) {
    this.maxSteps = options.maxSteps ?? 3;
    this.planningPrompt = options.planningPrompt
      ? `${DEFAULT_PLANNING_PROMPT}\n\n${options.planningPrompt}`
      : DEFAULT_PLANNING_PROMPT;

    this.logger = logger.spawn('PlanManager');
    this.logger.info(`PlanManager initialized with max steps: ${this.maxSteps}`);
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
        id: 'finalReport',
        description: 'Generate a comprehensive final report after all plan steps are completed',
        parameters: z.object({
          summary: z.string().optional().describe('A summary of findings and conclusions'),
        }),
        function: async ({ summary }) => {
          this.logger.info('Final report tool called with summary:', summary);
          this.finalReportCalled = true;

          // Create plan finish event with the report as summary
          const finishEvent = this.eventStream.createEvent(EventType.PLAN_FINISH, {
            sessionId: 'final-report',
            summary: summary || 'Task completed successfully',
          });
          this.eventStream.sendEvent(finishEvent);

          return {
            success: true,
            message: 'Report generated successfully',
            summary,
          };
        },
      }),
    ];
  }

  /**
   * Checks if the final report has been called
   */
  isFinalReportCalled(): boolean {
    return this.finalReportCalled;
  }

  /**
   * Resets the final report status
   */
  resetFinalReportStatus(): void {
    this.finalReportCalled = false;
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
    console.log('generateInitialPlan!!!');

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
              "Create a step-by-step plan to complete the user's request. " +
              'Return a JSON object with an array of steps. Each step should have a "content" field ' +
              'describing what needs to be done and a "done" field set to false.\n\n' +
              'IMPORTANT CONSTRAINTS:\n' +
              `- Create AT MOST ${this.maxSteps} key steps in your plan\n` +
              '- Focus ONLY on information gathering and research steps\n' +
              '- DO NOT include report creation as a step (the finalReport tool will handle this)',
          },
        ],
      });

      // Parse the response
      const content = response.choices[0]?.message?.content || '{"steps":[]}';
      let planData: { steps: PlanStep[] };
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

      // Send plan update event
      const updateEvent = this.eventStream.createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.eventStream.sendEvent(updateEvent);

      // Send a system event for better visibility
      const systemEvent = this.eventStream.createEvent(EventType.SYSTEM, {
        level: 'info',
        message: `Initial plan created with ${this.currentPlan.length} steps`,
        details: { plan: this.currentPlan },
      });
      this.eventStream.sendEvent(systemEvent);
    } catch (error) {
      this.logger.error(`Error generating initial plan: ${error}`);

      // Create a minimal default plan if generation fails
      this.currentPlan = [{ content: 'Complete the task', done: false }];

      const updateEvent = this.eventStream.createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.eventStream.sendEvent(updateEvent);
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
              'Evaluate the current progress and update the plan.' +
              'Return a JSON object with an array of steps, marking completed steps as "done": true.' +
              'Add new steps or update current steps if needed.' +
              'If all steps are complete, include a "completed": true field ' +
              'and a "summary" field with a final summary.\n\n' +
              'IMPORTANT CONSTRAINTS:\n' +
              `- Create AT MOST ${this.maxSteps} key steps in your plan\n` +
              '- Focus ONLY on information gathering and research steps\n' +
              '- DO NOT include report creation as a step (another tool will handle this)',
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
        planData = JSON.parse(content) as { steps: PlanStep[]; summary?: string };
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

      // Send plan update event
      const updateEvent = this.eventStream.createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.eventStream.sendEvent(updateEvent);

      // Check if the plan is completed
      const allStepsDone = this.currentPlan.every((step) => step.done);
      this.taskCompleted = allStepsDone;

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
    this.finalReportCalled = false;
    this.logger.info('Plan state reset');
  }
}
