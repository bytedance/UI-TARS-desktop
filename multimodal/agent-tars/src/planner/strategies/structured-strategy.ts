/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, z } from '@mcp-agent/core';
import { AgentEventStream } from '@mcp-agent/core';
import { BasePlannerStrategy } from './base-strategy';
import { PlannerContext, ToolFilterResult } from '../types';

/**
 * Structured planner strategy - creates step-by-step plans using structured tool calls
 * This strategy requires LLMs to output structured JSON data through tool calls
 */
export class StructuredPlannerStrategy extends BasePlannerStrategy {
  getSystemInstrucution(): string {
    return `
<structured_planning_approach>
You are a methodical agent that follows a structured plan-and-solve approach for complex tasks. Your workflow:

1. **Planning Phase** (when no plan exists):
   - Analyze if the task requires a multi-step plan
   - For complex research, analysis, or multi-part tasks → Create a plan using generate_plan
   - For simple questions or tasks → Skip planning and answer directly
   - Create AT MOST ${this.options.maxSteps} key steps focusing on information gathering and research

2. **Execution Phase** (when plan exists):
   - Execute plan steps using available tools (browser, search, file operations, etc.)
   - When you complete work → Use mark_step_completed to track progress
   - Only use revise_plan if the plan structure itself needs to change (NOT for marking completion)
   - Continue working toward completing all planned steps

3. **Progress Management Guidelines**:
   - Use mark_step_completed when you finish tasks - provide specific step indices
   - Use revise_plan only when new information requires changing the plan structure
   - Don't call tools repeatedly with identical parameters
   - Be specific about what you accomplished when marking progress

IMPORTANT: Always mark your progress using mark_step_completed when you complete work, and only revise the plan structure when truly necessary.
</structured_planning_approach>

<planning_constraints>
PLANNING CONSTRAINTS:
- Create AT MOST ${this.options.maxSteps} key steps in your plan
- Focus on information gathering and research steps
- For simple questions, you can skip planning entirely by setting needsPlanning=false
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
          .max(this.options.maxSteps)
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
    const markStepCompletedTool = new Tool({
      id: 'mark_step_completed',
      description:
        'Mark specific steps as completed when you have finished the work described in those steps. Use this to track your progress through the plan.',
      parameters: z.object({
        stepIndices: z
          .array(z.number())
          .describe(
            'Array of step indices (0-based) to mark as completed. For example, [0, 2] marks the 1st and 3rd steps as done.',
          ),
        summary: z
          .string()
          .optional()
          .describe('Brief summary of what was accomplished in the completed steps'),
      }),
      function: async ({ stepIndices, summary }) => {
        if (!context.state.steps || context.state.steps.length === 0) {
          return {
            status: 'error',
            message: 'No plan exists to update. Please create a plan first.',
          };
        }

        // Validate step indices
        const invalidIndices = stepIndices.filter((i) => i < 0 || i >= context.state.steps.length);
        if (invalidIndices.length > 0) {
          return {
            status: 'error',
            message: `Invalid step indices: ${invalidIndices.join(', ')}. Plan has ${context.state.steps.length} steps (indices 0-${context.state.steps.length - 1}).`,
          };
        }

        // Check if steps are already completed
        const alreadyCompleted = stepIndices.filter((i) => context.state.steps[i].done);
        if (alreadyCompleted.length > 0) {
          return {
            status: 'warning',
            message: `Steps ${alreadyCompleted.join(', ')} are already marked as completed.`,
            completedSteps: context.state.steps.filter((s) => s.done).length,
            totalSteps: context.state.steps.length,
          };
        }

        // Mark steps as completed
        stepIndices.forEach((i) => {
          context.state.steps[i].done = true;
        });

        // Check if all steps are completed
        const allCompleted = context.state.steps.every((step) => step.done);
        if (allCompleted) {
          context.state.completed = true;
          context.state.stage = 'execute';
          this.sendPlanEvents(context.sessionId, context.state.steps, 'finish');

          return {
            status: 'completed',
            message: 'All plan steps completed! The plan is now finished.',
            completedSteps: context.state.steps.length,
            totalSteps: context.state.steps.length,
            summary,
          };
        } else {
          this.sendPlanEvents(context.sessionId, context.state.steps, 'update');

          const completedCount = context.state.steps.filter((s) => s.done).length;
          return {
            status: 'updated',
            message: `Marked ${stepIndices.length} step(s) as completed. Progress: ${completedCount}/${context.state.steps.length} steps done.`,
            completedSteps: completedCount,
            totalSteps: context.state.steps.length,
            markedIndices: stepIndices,
            summary,
          };
        }
      },
    });

    const revisePlanTool = new Tool({
      id: 'revise_plan',
      description:
        'Revise the plan structure when you discover that the original plan needs changes (add, remove, or modify steps). Only use this for structural changes, NOT for marking steps as completed.',
      parameters: z.object({
        revisedSteps: z
          .array(
            z.object({
              content: z.string().describe('Description of what needs to be done in this step'),
              done: z.boolean().describe('Whether this step has been completed'),
            }),
          )
          .max(this.options.maxSteps)
          .describe('The revised plan with new structure'),
        reason: z.string().describe('Explanation for why the plan needs to be revised'),
      }),
      function: async ({ revisedSteps, reason }) => {
        if (!context.state.steps || context.state.steps.length === 0) {
          return {
            status: 'error',
            message: 'No plan exists to revise. Please create a plan first.',
          };
        }

        // Check if the revised plan is identical to the current plan
        const currentStepsStr = JSON.stringify(
          context.state.steps.map((step) => ({
            content: step.content.trim(),
            done: step.done,
          })),
        );
        const revisedStepsStr = JSON.stringify(
          revisedSteps.map((step) => ({
            content: step.content.trim(),
            done: step.done,
          })),
        );

        if (currentStepsStr === revisedStepsStr) {
          return {
            status: 'error',
            message:
              'The revised plan is identical to the current plan. If you want to mark steps as completed, use mark_step_completed instead. If you want to make changes, please modify the plan structure.',
            suggestion:
              'Consider: 1) Use mark_step_completed to track progress, or 2) Actually modify the plan steps if revision is needed.',
            currentPlan: context.state.steps,
          };
        }

        // Update the plan
        const oldSteps = [...context.state.steps];
        context.state.steps = revisedSteps;

        // Check if all steps are completed
        const allCompleted = revisedSteps.every((step) => step.done);
        if (allCompleted) {
          context.state.completed = true;
          context.state.stage = 'execute';
          this.sendPlanEvents(context.sessionId, revisedSteps, 'finish');
        } else {
          this.sendPlanEvents(context.sessionId, revisedSteps, 'update');
        }

        this.logger.info(
          `Plan revised for session ${context.sessionId}: ${oldSteps.length} → ${revisedSteps.length} steps`,
        );

        return {
          status: allCompleted ? 'completed' : 'revised',
          message: allCompleted
            ? 'Plan revised and all steps are completed!'
            : `Plan successfully revised. Updated from ${oldSteps.length} to ${revisedSteps.length} steps.`,
          reason,
          oldStepCount: oldSteps.length,
          newStepCount: revisedSteps.length,
          completedSteps: revisedSteps.filter((s) => s.done).length,
          totalSteps: revisedSteps.length,
        };
      },
    });

    return [markStepCompletedTool, revisePlanTool];
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

    const createPlanningTools = this.createPlanningTools(context);
    const updatePlanningTools = this.createPlanUpdateTools(context);
    switch (state.stage) {
      case 'plan':
        // Only planning tools
        const planningTools = state.steps.length === 0 ? createPlanningTools : updatePlanningTools;
        return {
          tools: planningTools,
          systemPromptAddition: this.formatCurrentPlanForPrompt(state.steps),
        };

      case 'execute':
        // All tools except planning tools
        return {
          tools: [...context.availableTools, ...updatePlanningTools],
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
      .map((step, index) => `- [${step.done ? 'x' : ' '}] ${step.content}`)
      .join('\n');

    return `
<current_plan>
## Current Plan

${stepsList}

**Progress:** ${steps.filter((s) => s.done).length}/${steps.length} steps completed

**IMPORTANT REMINDERS:**
- Use mark_step_completed when you finish work (provide step indices like [0, 2])
- Use revise_plan only when the plan structure needs changes
- Don't call the same tool with identical parameters repeatedly
</current_plan>`;
  }
}
