/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, z } from '@mcp-agent/core';
import { AgentEventStream } from '@mcp-agent/core';
import { BasePlannerStrategy } from './base-strategy';
import { PlannerContext, ToolFilterResult } from '../types';

/**
 * Default planner strategy - uses checklist format with simple tool-based planning
 * This strategy provides a more natural, checklist-style planning approach while still
 * using tools for structured interaction, making it easier for LLMs to adopt
 */
export class DefaultPlannerStrategy extends BasePlannerStrategy {
  getSystemInstrucution(): string {
    return `
<checklist_planning_approach>
You are a methodical agent that uses a simple checklist-based planning approach for complex tasks. Your workflow:

1. **Planning Phase** (when no plan exists):
   - Analyze if the task requires a multi-step plan
   - For complex research, analysis, or multi-part tasks → Create a plan using create_checklist_plan
   - For simple questions or tasks → Skip planning and answer directly
   - Create AT MOST ${this.options.maxSteps} key steps focusing on information gathering and research

2. **Execution Phase** (when plan exists):
   - Execute plan steps using available tools (browser, search, file operations, etc.)
   - When you complete work → Use update_checklist to mark progress
   - Continue working toward completing all planned steps

3. **Progress Management Guidelines**:
   - Use update_checklist when you finish tasks - describe what you completed
   - Be specific about what you accomplished when updating progress
   - The checklist format makes it easy to track what's done and what's next

IMPORTANT: Always update your progress using update_checklist when you complete work.
</checklist_planning_approach>

<planning_constraints>
PLANNING CONSTRAINTS:
- Create AT MOST ${this.options.maxSteps} key steps in your plan
- Focus on information gathering and research steps
- For simple questions, you can skip planning entirely
</planning_constraints>
`;
  }

  createPlanningTools(context: PlannerContext): Tool[] {
    const createChecklistPlanTool = new Tool({
      id: 'create_checklist_plan',
      description:
        "Create a simple checklist-style plan for completing the user's task. Use this when you need to break down complex tasks into manageable checklist items.",
      parameters: z.object({
        title: z.string().describe('A brief title or description of the overall task'),
        items: z
          .array(z.string())
          .max(this.options.maxSteps)
          .describe('List of checklist items describing what needs to be done'),
        needsPlanning: z
          .boolean()
          .describe('Whether this task actually needs planning or can be answered directly'),
      }),
      function: async ({ title, items, needsPlanning }) => {
        if (!needsPlanning) {
          // Task is simple, mark planning as completed
          context.state.completed = true;
          context.state.stage = 'execute';
          return {
            status: 'skipped',
            message: 'Task is simple enough to handle directly without planning',
          };
        }

        // Convert string items to plan steps
        const steps: AgentEventStream.PlanStep[] = items.map((item) => ({
          content: item,
          done: false,
        }));

        // Update state with new plan
        context.state.steps = steps;
        context.state.stage = 'execute';

        // Send plan events
        this.sendPlanEvents(context.sessionId, steps, 'start');
        this.sendPlanEvents(context.sessionId, steps, 'update');

        this.logger.info(
          `Created checklist plan "${title}" with ${steps.length} items for session ${context.sessionId}`,
        );

        return {
          status: 'success',
          title,
          checklist: steps,
          message: `Created a ${steps.length}-item checklist plan: "${title}". Now proceeding with execution.`,
        };
      },
    });

    return [createChecklistPlanTool];
  }

  createPlanUpdateTools(context: PlannerContext): Tool[] {
    const updateChecklistTool = new Tool({
      id: 'update_checklist',
      description:
        'Update your checklist plan by marking items as completed and optionally adding new items. Use this to track your progress through the plan.',
      parameters: z.object({
        completed: z
          .array(z.string())
          .describe(
            'List of completed task descriptions. These should match or closely describe the checklist items you have finished.',
          ),
        newItems: z
          .array(z.string())
          .optional()
          .describe('Optional new checklist items to add if you discover additional work needed'),
        summary: z
          .string()
          .optional()
          .describe('Brief summary of what was accomplished or current status'),
      }),
      function: async ({ completed, newItems, summary }) => {
        if (!context.state.steps || context.state.steps.length === 0) {
          return {
            status: 'error',
            message: 'No checklist exists to update. Please create a plan first.',
          };
        }

        const updatedSteps = [...context.state.steps];
        let completedCount = 0;

        // Mark items as completed based on description matching
        for (const completedItem of completed) {
          for (const step of updatedSteps) {
            if (
              !step.done &&
              (step.content.toLowerCase().includes(completedItem.toLowerCase()) ||
                completedItem.toLowerCase().includes(step.content.toLowerCase()) ||
                this.calculateSimilarity(step.content, completedItem) > 0.6)
            ) {
              step.done = true;
              completedCount++;
              break; // Only mark one step per completed item
            }
          }
        }

        // Add new items if provided
        if (newItems && newItems.length > 0) {
          const newSteps = newItems.map((item) => ({
            content: item,
            done: false,
          }));
          updatedSteps.push(...newSteps);
          this.logger.info(`Added ${newItems.length} new items to checklist`);
        }

        // Update state
        context.state.steps = updatedSteps;

        // Check if all steps are completed
        const allCompleted = updatedSteps.every((step) => step.done);
        if (allCompleted) {
          context.state.completed = true;
          context.state.stage = 'execute';
          this.sendPlanEvents(context.sessionId, updatedSteps, 'finish');

          return {
            status: 'completed',
            message: 'All checklist items completed! The plan is now finished.',
            completedItems: completed,
            totalItems: updatedSteps.length,
            summary,
          };
        } else {
          this.sendPlanEvents(context.sessionId, updatedSteps, 'update');

          const totalCompletedCount = updatedSteps.filter((s) => s.done).length;
          return {
            status: 'updated',
            message: `Marked ${completedCount} item(s) as completed. Progress: ${totalCompletedCount}/${updatedSteps.length} items done.`,
            completedItems: completed,
            newItems: newItems || [],
            totalItems: updatedSteps.length,
            completedCount: totalCompletedCount,
            summary,
          };
        }
      },
    });

    return [updateChecklistTool];
  }

  filterToolsForStage(context: PlannerContext): ToolFilterResult {
    const { state } = context;

    if (state.completed) {
      // Planning completed, return all original tools
      return {
        tools: context.availableTools,
        systemPromptAddition: `
<current_plan_status>
Your checklist planning has been completed. You can now use all available tools to provide the final answer.
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
        // All tools plus update tools
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

  /**
   * Calculate similarity between two strings for better matching
   * Simple implementation using common words
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter((word) =>
      words2.some((w2) => w2.includes(word) || word.includes(w2)),
    );

    return commonWords.length / Math.max(words1.length, words2.length);
  }

  private formatCurrentPlanForPrompt(steps: AgentEventStream.PlanStep[]): string {
    if (steps.length === 0) {
      return `
<checklist_guidance>
For complex tasks requiring multiple steps, create a plan using create_checklist_plan tool with:
- A clear title describing the overall task
- A list of specific, actionable checklist items
- Set needsPlanning=true for complex tasks, false for simple ones

Then work through each item systematically, using update_checklist to mark progress.
</checklist_guidance>`;
    }

    const stepsList = steps
      .map((step) => `- [${step.done ? 'x' : ' '}] ${step.content}`)
      .join('\n');

    const completedCount = steps.filter((s) => s.done).length;

    return `
<current_plan>
## Current Checklist Plan

${stepsList}

**Progress:** ${completedCount}/${steps.length} items completed

**Instructions:**
- Continue working through unchecked items
- Use update_checklist to mark items as completed when you finish them
- Describe what you completed in the "completed" array
- Use all available tools to accomplish each task
- Be systematic and thorough in your approach
</current_plan>`;
  }
}
