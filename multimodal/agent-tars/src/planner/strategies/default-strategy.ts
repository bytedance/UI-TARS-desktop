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
<enhanced_checklist_planning_approach>
You are a methodical agent that uses an adaptive checklist-based planning approach for complex tasks. Your workflow:

1. **Dynamic Planning Phase**:
   - For complex research, analysis, or multi-part tasks → Create a detailed plan using create_checklist_plan
   - For simple questions or tasks → Skip planning and answer directly
   - Create AT MOST ${this.options.maxSteps} key steps focusing on comprehensive information gathering
   - Output a clean markdown checklist format with - [ ] for incomplete and - [x] for completed items

2. **Adaptive Execution Phase**:
   - Execute plan steps systematically using available tools (browser, search, file operations, etc.)
   - **CRITICAL**: Be thorough and comprehensive in your research - don't rush to completion
   - When you make progress → Use update_checklist to update the entire checklist
   - **EXPAND your research scope** as you discover new important areas to investigate
   - Add new checklist items when you realize additional work is needed for completeness
   - Only mark items as complete when you've thoroughly covered that aspect

3. **Comprehensive Research Guidelines**:
   - For research tasks: Investigate MULTIPLE sources, not just the first few you find
   - For comparison tasks: Ensure you've covered ALL major aspects mentioned in the original request
   - For analysis tasks: Dig deeper into details, don't settle for surface-level information
   - When you find interesting leads, FOLLOW them to gather more comprehensive data
   - Use update_checklist to both mark progress AND add newly discovered work items

4. **Checklist Format Rules**:
   - Use markdown format: "- [ ] Task description" for incomplete items
   - Use "- [x] Task description" for completed items
   - Keep descriptions clear and specific
   - You can add new items or modify existing ones in each update

IMPORTANT: 
- Output clean markdown checklist format consistently
- Prioritize DEPTH and COMPREHENSIVENESS over speed
- Add new checklist items as you discover additional research areas
- Be confident in your progress updates - trust your judgment
</enhanced_checklist_planning_approach>

<adaptive_planning_constraints>
PLANNING CONSTRAINTS:
- Start with AT MOST ${this.options.maxSteps} key steps, but be ready to expand
- Focus on comprehensive information gathering and deep analysis
- For research tasks, plan to investigate multiple sources and angles
- Be specific about what each step should accomplish
- For simple questions, you can skip planning entirely
</adaptive_planning_constraints>
`;
  }

  createPlanningTools(context: PlannerContext): Tool[] {
    const createChecklistPlanTool = new Tool({
      id: 'create_checklist_plan',
      description:
        'Create a comprehensive checklist-style plan for complex tasks. Use markdown format with - [ ] for incomplete items.',
      parameters: z.object({
        title: z.string().describe('A brief title or description of the overall task'),
        checklist: z
          .string()
          .describe(
            'Markdown checklist format with - [ ] for incomplete items. Example: "- [ ] Research topic A\\n- [ ] Analyze data B\\n- [ ] Compare results"',
          ),
        needsPlanning: z
          .boolean()
          .describe(
            'Whether this task actually needs systematic planning or can be answered directly',
          ),
        researchScope: z
          .string()
          .optional()
          .describe('Brief description of the expected scope and depth of research needed'),
      }),
      function: async ({ title, checklist, needsPlanning, researchScope }) => {
        console.log('create_checklist_plan', { title, checklist, needsPlanning, researchScope });

        if (!needsPlanning) {
          // Task is simple, mark planning as completed
          context.state.completed = true;
          context.state.stage = 'execute';
          return {
            status: 'skipped',
            message: 'Task is simple enough to handle directly without systematic planning',
          };
        }

        // Parse markdown checklist into plan steps
        const steps = this.parseMarkdownChecklist(checklist);

        if (steps.length === 0) {
          return {
            status: 'error',
            message:
              'Invalid checklist format. Please use markdown format like "- [ ] Task description"',
          };
        }

        // Update state with new plan
        context.state.steps = steps;
        context.state.stage = 'execute';

        // Send plan events
        this.sendPlanEvents(context.sessionId, steps, 'start');
        this.sendPlanEvents(context.sessionId, steps, 'update');

        this.logger.info(
          `Created comprehensive checklist plan "${title}" with ${steps.length} items for session ${context.sessionId}`,
        );

        return {
          status: 'success',
          title,
          checklist: steps,
          researchScope,
          message: `Created a ${steps.length}-item comprehensive research plan: "${title}". Now proceeding with systematic execution.`,
        };
      },
    });

    return [createChecklistPlanTool];
  }

  createPlanUpdateTools(context: PlannerContext): Tool[] {
    const updateChecklistTool = new Tool({
      id: 'update_checklist',
      description:
        'Update your checklist plan by providing the complete updated markdown checklist. Use - [x] for completed items and - [ ] for incomplete items.',
      parameters: z.object({
        checklist: z
          .string()
          .describe(
            'Complete updated markdown checklist. Use - [x] for completed items and - [ ] for incomplete. Example: "- [x] Research topic A\\n- [ ] Analyze data B\\n- [ ] Compare results"',
          ),
        thought: z
          .string()
          .describe(
            'Your current thinking about what you just accomplished and what needs to be done next',
          ),
        nextStep: z
          .string()
          .describe('Specific description of what you should do next. Be concrete and actionable.'),
      }),
      function: async ({ checklist, thought, nextStep }) => {
        console.log('update_checklist', { checklist, thought, nextStep });

        if (!context.state.steps || context.state.steps.length === 0) {
          return {
            status: 'error',
            nextStep: 'Create a plan first using create_checklist_plan',
          };
        }

        // Parse the updated markdown checklist
        const updatedSteps = this.parseMarkdownChecklist(checklist);

        if (updatedSteps.length === 0) {
          return {
            status: 'error',
            nextStep:
              'Provide a valid checklist format like "- [x] Completed task" or "- [ ] Incomplete task"',
          };
        }

        // Update the state directly - trust the agent's judgment
        context.state.steps = updatedSteps;

        // Check if task is complete - all steps must be done
        const isTaskComplete = updatedSteps.every((step) => step.done);

        if (isTaskComplete) {
          // Task is complete
          context.state.completed = true;
          context.state.stage = 'execute';
          this.sendPlanEvents(context.sessionId, updatedSteps, 'finish');

          return {
            status: 'completed',
            nextStep:
              'All checklist items are complete. Provide the final comprehensive answer to the user.',
          };
        } else {
          // Task continues
          this.sendPlanEvents(context.sessionId, updatedSteps, 'update');

          return {
            status: 'updated',
            nextStep,
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
      // Planning completed, return all original tools
      return {
        tools: context.availableTools,
        systemPromptAddition: `
<current_plan_status>
Your comprehensive checklist planning has been completed successfully. You can now use all available tools to provide the final answer.
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

  private formatCurrentPlanForPrompt(steps: AgentEventStream.PlanStep[]): string {
    if (steps.length === 0) {
      return `
<comprehensive_planning_guidance>
For complex, multi-faceted tasks requiring systematic research, create a detailed plan using create_checklist_plan tool with:
- A clear title describing the comprehensive research task
- A markdown checklist using "- [ ] Task description" format for incomplete items
- Set needsPlanning=true for complex research tasks, false for simple questions
- Include researchScope to clarify the expected depth and breadth

Focus on creating plans that encourage deep, comprehensive investigation rather than surface-level work.
</comprehensive_planning_guidance>`;
    }

    const stepsList = steps
      .map((step) => `- [${step.done ? 'x' : ' '}] ${step.content}`)
      .join('\n');

    const completedCount = steps.filter((s) => s.done).length;
    const completionPercentage = Math.round((completedCount / steps.length) * 100);

    return `
<current_comprehensive_plan>
## Current Comprehensive Research Plan

${stepsList}

**Progress:** ${completedCount}/${steps.length} items completed (${completionPercentage}%)

**ENHANCED RESEARCH INSTRUCTIONS:**
- Conduct THOROUGH research for each uncompleted item - don't rush
- When researching topics, investigate MULTIPLE sources comprehensively
- For analysis items, check various indicators across different sources
- Use update_checklist to provide the complete updated markdown checklist
- Add new checklist items when you realize additional investigation is needed
- PRIORITIZE comprehensive coverage over speed of completion
- In nextStep field, be very specific about what you will do next

**CHECKLIST UPDATE FORMAT:**
When using update_checklist, provide:
1. Complete markdown checklist with current status
2. Your thought about what you just accomplished
3. Specific nextStep describing exactly what you'll do next

**QUALITY STANDARDS:**
- For each research area, gather information from multiple sources
- Follow interesting leads that emerge during your investigation
- Ensure depth of analysis, not just surface-level information
- Be specific in your nextStep - avoid vague statements like "continue research"
</current_comprehensive_plan>`;
  }
}
