import { Tool, z } from '@mcp-agent/core';
import { AgentEventStream } from '@mcp-agent/core';
import { BasePlannerStrategy } from './base-strategy';
import { PlannerContext, ToolFilterResult } from '../types';

/**
 * Default planner strategy - uses simplified checklist format with markdown input
 * This strategy provides a natural, checklist-style planning approach using markdown lists
 */
export class DefaultPlannerStrategy extends BasePlannerStrategy {
  getSystemInstrucution(): string {
    return `
<planning_approach>
For complex tasks that need multiple steps, use structured planning:

1. **Planning Phase**: Create a plan using create_checklist_plan with markdown format
2. **Execution Phase**: Execute steps and update progress with update_checklist  
3. **Completion**: Mark items complete when finished

Use markdown checklist format: "- [ ] Task description" for incomplete, "- [x] Task description" for completed.
</planning_approach>
`;
  }

  createPlanningTools(context: PlannerContext): Tool[] {
    const createChecklistPlanTool = new Tool({
      id: 'create_checklist_plan',
      description: 'Create a checklist-style plan for complex tasks using markdown format.',
      parameters: z.object({
        title: z.string().describe('Brief title of the task'),

        checklist: z.string().describe('Markdown checklist with - [ ] for incomplete items'),
        needsPlanning: z.boolean().describe('Whether this task needs systematic planning'),
      }),
      function: async ({ title, checklist, needsPlanning }) => {
        if (!needsPlanning) {
          context.state.completed = true;
          context.state.stage = 'execute';
          return { status: 'skipped', message: 'Task is simple, no planning needed' };
        }

        const steps = this.parseMarkdownChecklist(checklist);
        if (steps.length === 0) {
          return { error: 'Invalid checklist format' };
        }

        context.state.steps = steps;
        context.state.stage = 'execute';
        this.sendPlanEvents(context.sessionId, steps, 'start');
        this.sendPlanEvents(context.sessionId, steps, 'update');

        return {
          status: 'success',
          title,
          message: `Created ${steps.length}-item plan: "${title}"`,
        };
      },
    });

    return [createChecklistPlanTool];
  }

  createPlanUpdateTools(context: PlannerContext): Tool[] {
    const updateChecklistTool = new Tool({
      id: 'update_checklist',
      description:
        'Update checklist progress after completing actual work. Use - [x] for completed items, - [ ] for incomplete. ' +
        '⚠️ CRITICAL: DO NOT call this tool consecutively without doing actual work between calls. ' +
        'IMPORTANT: Only call this tool AFTER you have actually executed the necessary tools and gathered the required information. ' +
        'Do not call this tool if you have not done any actual work.',
      parameters: z.object({
        thought: z
          .string()
          .describe(
            'Your structured thinking following this exact 5-step format: ' +
              '1. WHAT：本次我计划完成什么任务，对应了什么原始需求 ' +
              '2. DUPLICATE THOUGHT：我是否足够聪明，没有重复 Check：本次我要完成什么任务，是否没有存在重复执行 ' +
              '3. WHY：为什么我判断我做完了这件事？我前面做了什么事、看到了什么，让我判断我完成这次任务是可靠的，我的信心是 XXX（满分 100） ' +
              '4. REFLEXTION: 上一步的判断是否不完整，我是否偷懒了？比如调研一系列项目，但是我只偷懒找了 1-2 个，而不是尽可能找到所有的 ' +
              '5. NEXT：下一步我应该做什么？ ' +
              'If you did no actual work, do NOT call this tool.',
          ),
        checklist: z.string().describe('Complete updated markdown checklist'),
      }),
      function: async ({ thought, checklist }) => {
        if (!context.state.steps?.length) {
          return { error: 'Create a plan first using create_checklist_plan' };
        }

        const updatedSteps = this.parseMarkdownChecklist(checklist);
        if (updatedSteps.length === 0) {
          return { error: 'Invalid checklist format' };
        }

        context.state.steps = updatedSteps;
        const isComplete = updatedSteps.every((step) => step.done);

        if (isComplete) {
          context.state.completed = true;
          this.sendPlanEvents(context.sessionId, updatedSteps, 'finish');
          return {
            status: 'completed',
            thought,
          };
        } else {
          this.sendPlanEvents(context.sessionId, updatedSteps, 'update');
          return {
            status: 'updated',
            thought,
          };
        }
      },
    });

    return [updateChecklistTool];
  }

  /**
   * Parse markdown checklist format into plan steps
   * Supports both - [ ] and - [x] formats
   */
  private parseMarkdownChecklist(checklist: string): AgentEventStream.PlanStep[] {
    const lines = checklist.split('\n').filter((line) => line.trim());
    const steps: AgentEventStream.PlanStep[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Match markdown checklist format: - [ ] or - [x]
      const incompleteMatch = trimmed.match(/^-\s*\[\s*\]\s*(.+)$/);
      const completedMatch = trimmed.match(/^-\s*\[x\]\s*(.+)$/i);

      if (incompleteMatch) {
        steps.push({
          content: incompleteMatch[1].trim(),
          done: false,
        });
      } else if (completedMatch) {
        steps.push({
          content: completedMatch[1].trim(),
          done: true,
        });
      }
      // Ignore lines that don't match the expected format
    }

    return steps;
  }

  filterToolsForStage(context: PlannerContext): ToolFilterResult {
    const { state } = context;

    if (state.completed) {
      return {
        tools: context.availableTools,
        systemPromptAddition: 'Planning completed. Use all tools to provide final answer.',
      };
    }

    const createPlanningTools = this.createPlanningTools(context);
    const updatePlanningTools = this.createPlanUpdateTools(context);

    switch (state.stage) {
      case 'plan':
        const planningTools = state.steps.length === 0 ? createPlanningTools : updatePlanningTools;
        return {
          tools: planningTools,
          systemPromptAddition: this.formatCurrentPlanForPrompt(state.steps),
        };

      case 'execute':
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
      return 'For complex tasks, create a plan using create_checklist_plan.';
    }

    const stepsList = steps
      .map((step) => `- [${step.done ? 'x' : ' '}] ${step.content}`)
      .join('\n');

    const completedCount = steps.filter((s) => s.done).length;

    return `
<current_plan>
${stepsList}

Progress: ${completedCount}/${steps.length} completed

IMPORTANT REMINDERS:
- Only call update_checklist AFTER you have done actual work (executed tools, gathered information)
- ⚠️ DO NOT call update_checklist consecutively without doing actual work between calls
- If you haven't done any real work yet, continue working instead of updating the checklist
- In the thought parameter, follow the structured 5-step thinking format:
  1. WHAT：本次我计划完成什么任务，对应了什么原始需求
  2. DUPLICATE THOUGHT：我是否足够聪明，没有重复 Check：本次我要完成什么任务，是否没有存在重复执行
  3. WHY：为什么我判断我做完了这件事？我前面做了什么事、看到了什么，让我判断我完成这次任务是可靠的，我的信心是 XXX（满分 100）
  4. REFLEXTION: 上一步的判断是否不完整，我是否偷懒了？比如调研一系列项目，但是我只偷懒找了 1-2 个，而不是尽可能找到所有的
  5. NEXT：下一步我应该做什么？
- Be specific about tools you called and information you gathered
</current_plan>`;
  }
}
