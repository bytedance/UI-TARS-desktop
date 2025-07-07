/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, z } from '@mcp-agent/core';
import { AgentEventStream } from '@mcp-agent/core';
import { BasePlannerStrategy } from './base-strategy';
import { PlannerContext, ToolFilterResult } from '../types';

/**
 * Sequential thinking strategy - implements step-by-step reasoning approach
 */
export class SequentialThinkingStrategy extends BasePlannerStrategy {
  private thoughtHistory: Array<{
    thought: string;
    thoughtNumber: number;
    totalThoughts: number;
    nextThoughtNeeded: boolean;
  }> = [];

  static getSystemPromptAddition(): string {
    return `
<sequential_thinking_approach>
You use a sequential thinking approach to break down complex problems:
1. Start with an initial analysis and estimate the number of thinking steps needed
2. Progress through each thought step systematically
3. Adjust your approach as understanding deepens
4. Convert your thinking process into actionable plan steps
5. Execute the plan while maintaining the thinking process
</sequential_thinking_approach>`;
  }

  createPlanningTools(context: PlannerContext): Tool[] {
    const sequentialThinkingTool = new Tool({
      id: 'sequential_thinking',
      description:
        'Process complex problems through sequential thinking steps, analyzing and planning systematically.',
      parameters: z.object({
        thought: z.string().describe('Your current thinking step or analysis'),
        thoughtNumber: z.number().min(1).describe('Current thought number in sequence'),
        totalThoughts: z
          .number()
          .min(1)
          .describe('Estimated total thoughts needed (can be adjusted)'),
        nextThoughtNeeded: z.boolean().describe('Whether another thought step is needed'),
        isRevision: z.boolean().optional().describe('Whether this revises previous thinking'),
        needsMoreThoughts: z
          .boolean()
          .optional()
          .describe('If more thoughts are needed beyond initial estimate'),
      }),
      function: async ({
        thought,
        thoughtNumber,
        totalThoughts,
        nextThoughtNeeded,
        isRevision,
        needsMoreThoughts,
      }) => {
        // Store thought in history
        this.thoughtHistory.push({
          thought,
          thoughtNumber,
          totalThoughts,
          nextThoughtNeeded,
        });

        this.logger.debug(
          `Sequential thinking step ${thoughtNumber}/${totalThoughts}: ${thought.substring(0, 100)}...`,
        );

        if (!nextThoughtNeeded || thoughtNumber >= totalThoughts) {
          // Convert thinking into plan steps
          const planSteps = this.convertThinkingToPlan();

          // Update state
          context.state.steps = planSteps;
          context.state.stage = 'execute';

          // Send events
          this.sendPlanEvents(context.sessionId, planSteps, 'start');
          this.sendPlanEvents(context.sessionId, planSteps, 'update');

          // Clear thought history for next planning session
          this.thoughtHistory = [];

          return {
            status: 'plan_generated',
            plan: planSteps,
            message: `Sequential thinking completed. Generated ${planSteps.length} actionable steps.`,
            thoughtsSummary: `Processed ${thoughtNumber} thoughts to create the plan.`,
          };
        }

        return {
          status: 'thinking',
          message: `Completed thought ${thoughtNumber}/${totalThoughts}. Continue thinking...`,
          nextStep: `Proceed with thought ${thoughtNumber + 1}`,
        };
      },
    });

    return [sequentialThinkingTool];
  }

  createPlanUpdateTools(context: PlannerContext): Tool[] {
    const updateWithThinkingTool = new Tool({
      id: 'update_plan_with_thinking',
      description:
        'Update the plan while using sequential thinking to analyze progress and next steps.',
      parameters: z.object({
        thought: z.string().describe('Your thinking about the current progress'),
        steps: z
          .array(
            z.object({
              content: z.string().describe('Description of what needs to be done in this step'),
              done: z.boolean().describe('Whether this step has been completed'),
            }),
          )
          .describe('Updated list of plan steps'),
        completed: z.boolean().optional().describe('Whether the entire plan is now completed'),
        nextThoughtNeeded: z.boolean().describe('Whether more thinking is needed'),
      }),
      function: async ({ thought, steps, completed, nextThoughtNeeded }) => {
        this.logger.debug(`Plan update thinking: ${thought.substring(0, 100)}...`);

        // Update state
        context.state.steps = steps;

        if (completed || this.isPlanningCompleted(steps)) {
          context.state.completed = true;
          this.sendPlanEvents(context.sessionId, steps, 'finish');

          return {
            status: 'completed',
            message: 'Plan completed successfully through sequential thinking approach!',
            completedSteps: steps.filter((s) => s.done).length,
            totalSteps: steps.length,
            finalThought: thought,
          };
        } else {
          context.state.stage = nextThoughtNeeded ? 'plan' : 'execute';
          this.sendPlanEvents(context.sessionId, steps, 'update');

          return {
            status: 'updated',
            message: 'Plan updated with sequential thinking analysis.',
            completedSteps: steps.filter((s) => s.done).length,
            totalSteps: steps.length,
            nextAction: nextThoughtNeeded ? 'Continue thinking and planning' : 'Execute next steps',
          };
        }
      },
    });

    return [updateWithThinkingTool];
  }

  filterToolsForStage(context: PlannerContext): ToolFilterResult {
    const { state } = context;

    if (state.completed) {
      return {
        tools: context.availableTools,
        systemPromptAddition: `
<sequential_thinking_status>
Your sequential thinking and planning phase is completed. Use all available tools to provide the final answer.
</sequential_thinking_status>`,
      };
    }

    switch (state.stage) {
      case 'plan':
        const planningTools =
          state.steps.length === 0
            ? this.createPlanningTools(context)
            : this.createPlanUpdateTools(context);

        const searchTool = context.availableTools.find((t) => t.name === 'web_search');
        const tools = searchTool ? [...planningTools, searchTool] : planningTools;

        return {
          tools,
          systemPromptAddition: this.formatCurrentPlanForPrompt(state.steps, true),
        };

      case 'execute':
        return {
          tools: context.availableTools,
          systemPromptAddition: this.formatCurrentPlanForPrompt(state.steps, false),
        };

      default:
        return { tools: context.availableTools };
    }
  }

  isPlanningCompleted(steps: AgentEventStream.PlanStep[]): boolean {
    return steps.length > 0 && steps.every((step) => step.done);
  }

  private convertThinkingToPlan(): AgentEventStream.PlanStep[] {
    // Analyze thought history to extract actionable steps
    const steps: AgentEventStream.PlanStep[] = [];

    // Simple heuristic: look for action-oriented thoughts and convert them
    this.thoughtHistory.forEach((thought, index) => {
      if (
        thought.thought.toLowerCase().includes('need to') ||
        thought.thought.toLowerCase().includes('should') ||
        thought.thought.toLowerCase().includes('will')
      ) {
        const content = this.extractActionFromThought(thought.thought);
        if (content) {
          steps.push({
            content,
            done: false,
          });
        }
      }
    });

    // Ensure we have at least one step
    if (steps.length === 0) {
      steps.push({
        content: 'Execute the solution based on the sequential thinking analysis',
        done: false,
      });
    }

    return steps.slice(0, 3); // Limit to 3 steps max
  }

  private extractActionFromThought(thought: string): string | null {
    // Simple extraction logic - could be enhanced with NLP
    const sentences = thought.split(/[.!?]+/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (
        trimmed.toLowerCase().includes('need to') ||
        trimmed.toLowerCase().includes('should') ||
        trimmed.toLowerCase().includes('will')
      ) {
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      }
    }

    return null;
  }

  private formatCurrentPlanForPrompt(
    steps: AgentEventStream.PlanStep[],
    isPlanning: boolean,
  ): string {
    if (steps.length === 0 && !isPlanning) {
      return '';
    }

    if (isPlanning) {
      return `
<sequential_thinking_context>
You are in sequential thinking mode. Use the sequential_thinking tool to analyze the problem step by step.
${steps.length > 0 ? `\nCurrent plan progress:\n${steps.map((step, i) => `${i + 1}. ${step.done ? '✅' : '⏳'} ${step.content}`).join('\n')}` : ''}
</sequential_thinking_context>`;
    }

    const stepsList = steps
      .map((step, index) => `${index + 1}. ${step.done ? '✅' : '⏳'} ${step.content}`)
      .join('\n');

    return `
<current_plan_from_sequential_thinking>
Plan derived from sequential thinking:
${stepsList}

Progress: ${steps.filter((s) => s.done).length}/${steps.length} steps completed
</current_plan_from_sequential_thinking>`;
  }
}
