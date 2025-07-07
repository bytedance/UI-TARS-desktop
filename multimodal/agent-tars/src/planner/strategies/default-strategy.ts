/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, z } from '@mcp-agent/core';
import { AgentEventStream } from '@mcp-agent/core';
import { BasePlannerStrategy } from './base-strategy';
import { PlannerContext, ToolFilterResult } from '../types';

/**
 * Default planner strategy - creates simple step-by-step plans
 */
export class DefaultPlannerStrategy extends BasePlannerStrategy {
  static getSystemPromptAddition(): string {
    return `
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
3. During execution:
   - Adapt your plan as needed based on new findings
   - Be willing to simplify the plan if the task turns out simpler than expected
   - Always complete your plan before providing final answers
</planning_approach>

<planning_constraints>
IMPORTANT CONSTRAINTS:
- Create AT MOST 3 key steps in your plan
- Focus on information gathering and research steps
- For simple questions, you can skip planning entirely
</planning_constraints>
`;
  }

  createPlanningTools(context: PlannerContext): Tool[] {
    const generatePlanTool = new Tool({
      id: 'generate_plan',
      description:
        "Generate a step-by-step plan for completing the user's task. Use this when you need to break down complex tasks into manageable steps.",
      parameters: z.object({
        steps: z
          .array(
            z.object({
              content: z.string().describe('Description of what needs to be done in this step'),
              done: z.boolean().default(false).describe('Whether this step has been completed'),
            }),
          )
          .max(3)
          .describe('List of plan steps'),
        needsPlanning: z
          .boolean()
          .describe('Whether this task actually needs planning or can be answered directly'),
      }),
      function: async ({ steps, needsPlanning }) => {
        if (!needsPlanning) {
          // Task is simple, mark planning as completed
          context.state.completed = true;
          context.state.stage = 'execute';
          return {
            status: 'skipped',
            message: 'Task is simple enough to handle directly without planning',
          };
        }

        // Update state with new plan
        context.state.steps = steps;
        context.state.stage = 'execute';

        // Send plan events
        this.sendPlanEvents(context.sessionId, steps, 'start');
        this.sendPlanEvents(context.sessionId, steps, 'update');

        this.logger.info(
          `Generated plan with ${steps.length} steps for session ${context.sessionId}`,
        );

        return {
          status: 'success',
          plan: steps,
          message: `Created a ${steps.length}-step plan. Now proceeding with execution.`,
        };
      },
    });

    return [generatePlanTool];
  }

  createPlanUpdateTools(context: PlannerContext): Tool[] {
    const updatePlanTool = new Tool({
      id: 'update_plan',
      description:
        'Update the current plan by marking steps as completed or modifying the plan based on new information.',
      parameters: z.object({
        steps: z
          .array(
            z.object({
              content: z.string().describe('Description of what needs to be done in this step'),
              done: z.boolean().describe('Whether this step has been completed'),
            }),
          )
          .describe('Updated list of plan steps'),
        completed: z.boolean().optional().describe('Whether the entire plan is now completed'),
      }),
      function: async ({ steps, completed }) => {
        // Update state
        context.state.steps = steps;

        if (completed || this.isPlanningCompleted(steps)) {
          context.state.completed = true;
          this.sendPlanEvents(context.sessionId, steps, 'finish');

          return {
            status: 'completed',
            message: 'Plan completed successfully! All steps have been executed.',
            completedSteps: steps.filter((s) => s.done).length,
            totalSteps: steps.length,
          };
        } else {
          context.state.stage = 'execute';
          this.sendPlanEvents(context.sessionId, steps, 'update');

          return {
            status: 'updated',
            message: 'Plan updated. Continuing with execution.',
            completedSteps: steps.filter((s) => s.done).length,
            totalSteps: steps.length,
          };
        }
      },
    });

    return [updatePlanTool];
  }

  filterToolsForStage(context: PlannerContext): ToolFilterResult {
    const { state } = context;

    if (state.completed) {
      // Planning completed, return all original tools
      return {
        tools: context.availableTools,
        systemPromptAddition: `
<current_plan_status>
Your planning phase has been completed. You can now use all available tools to provide the final answer.
</current_plan_status>`,
      };
    }

    switch (state.stage) {
      case 'plan':
        // Only planning tools + search for research
        const planningTools =
          state.steps.length === 0
            ? this.createPlanningTools(context)
            : this.createPlanUpdateTools(context);

        const searchTool = context.availableTools.find((t) => t.name === 'web_search');
        const tools = searchTool ? [...planningTools, searchTool] : planningTools;

        return {
          tools,
          systemPromptAddition: this.formatCurrentPlanForPrompt(state.steps),
        };

      case 'execute':
        // All tools except planning tools
        return {
          tools: context.availableTools,
          systemPromptAddition: this.formatCurrentPlanForPrompt(state.steps),
        };

      default:
        return { tools: context.availableTools };
    }
  }

  isPlanningCompleted(steps: AgentEventStream.PlanStep[]): boolean {
    return steps.length > 0 && steps.every((step) => step.done);
  }

  private formatCurrentPlanForPrompt(steps: AgentEventStream.PlanStep[]): string {
    if (steps.length === 0) {
      return '';
    }

    const stepsList = steps
      .map((step, index) => `${index + 1}. ${step.done ? '✅' : '⏳'} ${step.content}`)
      .join('\n');

    return `
<current_plan>
You are working on the following plan:
${stepsList}

Progress: ${steps.filter((s) => s.done).length}/${steps.length} steps completed
</current_plan>`;
  }
}
