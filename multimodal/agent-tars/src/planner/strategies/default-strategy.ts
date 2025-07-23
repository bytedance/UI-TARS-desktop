import { Tool, z } from '@mcp-agent/core';
import { AgentEventStream } from '@mcp-agent/core';
import { BasePlannerStrategy } from './base-strategy';
import { PlannerContext, ToolFilterResult } from '../types';

/**
 * Default planner strategy - uses simplified todo format with markdown input
 * This strategy provides a natural, todo-style planning approach using markdown lists
 */
export class DefaultPlannerStrategy extends BasePlannerStrategy {
  getSystemInstrucution(): string {
    return `
<planning_approach>

You follow a structured 4-phase thinking model for complex tasks:




## 🔄 **4-Phase Thinking Model**


### 1. **📋 PLAN Phase** - Initial Task Analysis
- Analyze if the task requires multiple steps and systematic planning
- Use \`create_todos\` to break down complex tasks into actionable items
- Create clear, specific todos using markdown format: "- [ ] specific action item"

### 2. **⚡ EXECUTION Phase** - Active Task Performance  
- Execute tasks using available tools (browser, search, file operations, etc.)
- Focus on completing one or more todo items through actual work
- Gather information, perform analysis, create deliverables

### 3. **✅ CHECK Phase** - Progress Verification
- After completing actual work, use \`edit_todos\` to mark items as done: "- [x] completed item"
- Verify what was accomplished and update your progress
- Be honest about completion status - only mark items truly finished

### 4. **🔧 UPDATE PLAN Phase** - Dynamic Plan Adjustment
- When new requirements emerge or scope changes, use \`adjust_todos\` to insert additional tasks
- Add new todo items without disrupting already completed work
- Maintain plan relevance as understanding deepens

## ⚠️ **CRITICAL LOOP EXIT RULE**
**You MUST complete ALL todo items before exiting the agent loop. The agent will continue running until every "- [ ]" becomes "- [x]".**

## 📊 **RESEARCH TASK SPECIAL HANDLING**
**When you detect that the user is conducting RESEARCH, INVESTIGATION, or requesting COMPREHENSIVE INFORMATION GATHERING:**

### 🎯 **Research Task Recognition**
- User asks for "research on...", "investigate...", "analyze...", "study...", "explore..."
- Requests for comprehensive information about topics, companies, technologies, markets, etc.
- Tasks involving gathering information from multiple sources
- Comparative analysis or detailed background information requests

### 📝 **Research Task Planning Requirements**
- **ALWAYS include a final deliverable step**: Create a comprehensive written report/summary/analysis
- **DO NOT** end with generic completion messages like "task completed" or "research finished"
- The final todo should be something like:
  - "- [ ] Write a comprehensive research report summarizing all findings"
  - "- [ ] Create a detailed analysis document with key insights and conclusions"
  - "- [ ] Produce a structured summary report with actionable recommendations"
  - "- [ ] Generate a final research deliverable document for the user"

### 📄 **Research Report Requirements**
When creating research reports, ensure they include:
- **Executive Summary**: Key findings and conclusions upfront
- **Structured Content**: Well-organized sections with clear headings
- **Source Attribution**: Reference the sources and methods used
- **Key Insights**: Highlight the most important discoveries
- **Actionable Conclusions**: Provide clear takeaways for the user
- **Professional Format**: Use proper formatting, bullet points, and structure

## 🎯 **Best Practices**
- Only call planning tools AFTER doing actual work, not consecutively
- Be specific about what you accomplished when updating todos  
- Use the 5-step structured thinking format in \`edit_todos\`
- Insert new todos strategically using \`adjust_todos\` when scope expands
- **For research tasks**: Always plan to deliver a comprehensive final document, not just a completion message
</planning_approach>
`;
  }

  createPlanningTools(context: PlannerContext): Tool[] {
    const createTodosTool = new Tool({
      id: 'create_todos',
      description: 'Create a todo list for complex tasks using markdown format.',
      parameters: z.object({
        title: z.string().describe('Brief title of the task'),
        todos: z.string().describe('Markdown todo list with - [ ] for incomplete items'),
        needsPlanning: z.boolean().describe('Whether this task needs systematic planning'),
      }),
      function: async ({ title, todos, needsPlanning }) => {
        if (!needsPlanning) {
          context.state.completed = true;
          context.state.stage = 'execute';
          return { status: 'skipped', message: 'Task is simple, no planning needed' };
        }

        const steps = this.parseMarkdownTodos(todos);
        if (steps.length === 0) {
          return { error: 'Invalid todo format' };
        }

        context.state.steps = steps;
        context.state.stage = 'execute';
        this.sendPlanEvents(context.sessionId, steps, 'start');
        this.sendPlanEvents(context.sessionId, steps, 'update');

        return {
          status: 'success',
          title,
          message: `Created ${steps.length}-item todo list: "${title}"`,
        };
      },
    });

    return [createTodosTool];
  }

  createPlanUpdateTools(context: PlannerContext): Tool[] {
    const editTodosTool = new Tool({
      id: 'edit_todos',
      description:
        'Update todo list progress after completing actual work. Use - [x] for completed items, - [ ] for incomplete. ' +
        '⚠️ CRITICAL: DO NOT call this tool consecutively without doing actual work between calls. ' +
        'IMPORTANT: Only call this tool AFTER you have actually executed the necessary tools and gathered the required information. ' +
        'Do not call this tool if you have not done any actual work.',
      parameters: z.object({
        thought: z
          .string()
          .describe(
            'Your structured thinking following this exact 5-step format: ' +
              '1. WHAT: What task am I completing this time and how does it relate to the original request? ' +
              '2. DUPLICATE CHECK: Am I smart enough to avoid repetition? What task am I completing and am I not repeating previous work? ' +
              '3. WHY: Why do I believe this task is complete? What work did I do and what results did I see? My confidence level is ___ (out of 100) ' +
              '4. REFLECTION: Is my judgment incomplete? Am I being lazy? For example, when researching projects, did I only find 1-2 instead of being thorough? ' +
              '5. NEXT: What should I do next? ' +
              'If you did no actual work, do NOT call this tool.',
          ),
        todos: z.string().describe('Complete updated markdown todo list'),
      }),
      function: async ({ thought, todos }) => {
        if (!context.state.steps?.length) {
          return { error: 'Create todos first using create_todos' };
        }

        const updatedSteps = this.parseMarkdownTodos(todos);
        if (updatedSteps.length === 0) {
          return { error: 'Invalid todo format' };
        }

        context.state.steps = updatedSteps;
        const isComplete = updatedSteps.every((step) => step.done);

        if (isComplete) {
          context.state.completed = true;
          this.sendPlanEvents(context.sessionId, updatedSteps, 'finish');
          return {
            status: 'completed',
            thought,
            message: '🎉 All todos completed! Ready to exit agent loop.',
          };
        } else {
          this.sendPlanEvents(context.sessionId, updatedSteps, 'update');
          const remainingCount = updatedSteps.filter((s) => !s.done).length;
          return {
            status: 'updated',
            thought,
            message: `Progress updated. ${remainingCount} todos remaining - agent loop will continue until all are completed.`,
          };
        }
      },
    });

    const adjustTodosTool = new Tool({
      id: 'adjust_todos',
      description:
        '🔧 Insert additional todo items into the existing plan when new requirements emerge or scope expands. ' +
        'Use this when you discover additional tasks are needed, but want to preserve already completed work. ' +
        'This is different from edit_todos - use this for plan adjustments, not progress updates.',
      parameters: z.object({
        reason: z
          .string()
          .describe(
            'Clear explanation of why additional todos are needed (e.g., "Discovered need for data validation step", "User requested additional analysis")',
          ),
        newTodos: z
          .string()
          .describe(
            'New todo items to insert, in markdown format with - [ ] for incomplete items. These will be added to the existing plan.',
          ),
        insertPosition: z
          .enum(['beginning', 'end', 'after_current'])
          .default('end')
          .describe(
            'Where to insert the new todos: "beginning" (start of list), "end" (append to list), "after_current" (after currently completed items)',
          ),
      }),
      function: async ({ reason, newTodos, insertPosition }) => {
        if (!context.state.steps?.length) {
          return { error: 'Create todos first using create_todos before adjusting the plan' };
        }

        const newSteps = this.parseMarkdownTodos(newTodos);
        if (newSteps.length === 0) {
          return { error: 'Invalid todo format for new items' };
        }

        const currentSteps = [...context.state.steps];
        let updatedSteps: AgentEventStream.PlanStep[];

        switch (insertPosition) {
          case 'beginning':
            updatedSteps = [...newSteps, ...currentSteps];
            break;
          case 'after_current':
            const completedCount = currentSteps.filter((s) => s.done).length;
            updatedSteps = [
              ...currentSteps.slice(0, completedCount),
              ...newSteps,
              ...currentSteps.slice(completedCount),
            ];
            break;
          case 'end':
          default:
            updatedSteps = [...currentSteps, ...newSteps];
            break;
        }

        context.state.steps = updatedSteps;
        this.sendPlanEvents(context.sessionId, updatedSteps, 'update');

        const totalCount = updatedSteps.length;
        const completedCount = updatedSteps.filter((s) => s.done).length;
        const addedCount = newSteps.length;

        return {
          status: 'adjusted',
          reason,
          message: `Plan adjusted: Added ${addedCount} new todos at ${insertPosition}. Total: ${totalCount} todos (${completedCount} completed, ${totalCount - completedCount} remaining).`,
          addedTodos: newSteps.map((s) => s.content),
          currentProgress: `${completedCount}/${totalCount}`,
        };
      },
    });

    return [editTodosTool, adjustTodosTool];
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

  /**
   * Parse markdown todo format into plan steps
   * Supports both - [ ] and - [x] formats
   */
  private parseMarkdownTodos(todos: string): AgentEventStream.PlanStep[] {
    const lines = todos.split('\n').filter((line) => line.trim());
    const steps: AgentEventStream.PlanStep[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Match markdown todo format: - [ ] or - [x]
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

  private formatCurrentPlanForPrompt(steps: AgentEventStream.PlanStep[]): string {
    if (steps.length === 0) {
      return 'For complex tasks, create todos using create_todos.';
    }

    const stepsList = steps
      .map((step) => `- [${step.done ? 'x' : ' '}] ${step.content}`)
      .join('\n');

    const completedCount = steps.filter((s) => s.done).length;
    const remainingCount = steps.length - completedCount;

    return `
<current_todos>
${stepsList}


📊 **Progress: ${completedCount}/${steps.length} completed**
${remainingCount > 0 ? `⏳ **${remainingCount} todos remaining - agent loop will continue until ALL are completed**` : '✅ **All todos completed - ready to exit agent loop**'}






## 🎯 **4-Phase Action Reminders**

### 📋 **PLAN Phase** (if needed)
- Use \`create_todos\` for initial task breakdown

### ⚡ **EXECUTION Phase** (current focus)
- Execute tools to complete todo items through actual work
- Gather information, perform analysis, create deliverables

### ✅ **CHECK Phase** (after doing work)
- Only call \`edit_todos\` AFTER you have done actual work
- ⚠️ DO NOT call \`edit_todos\` consecutively without doing actual work between calls
- Follow the structured 5-step thinking format:
  1. WHAT: What task am I completing this time and how does it relate to the original request?
  2. DUPLICATE CHECK: Am I smart enough to avoid repetition? What task am I completing and am I not repeating previous work?
  3. WHY: Why do I believe this task is complete? What work did I do and what results did I see? My confidence level is ___ (out of 100)
  4. REFLECTION: Is my judgment incomplete? Am I being lazy? For example, when researching projects, did I only find 1-2 instead of being thorough?
  5. NEXT: What should I do next?


### 🔧 **UPDATE PLAN Phase** (when scope changes)
- Use \`adjust_todos\` to insert additional tasks when new requirements emerge
- Preserve completed work while expanding the plan as needed

## ⚠️ **CRITICAL LOOP EXIT RULE**
**The agent loop will NOT exit until ALL todos show "- [x]". Every "- [ ]" must become "- [x]" through actual completion.**
</current_todos>`;
  }
}
