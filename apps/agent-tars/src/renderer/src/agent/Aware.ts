import { Message } from '@agent-infra/shared';
import { AgentContext } from './AgentFlow';
import { ipcClient } from '@renderer/api';
import { AppContext } from '@renderer/hooks/useAgentFlow';
import { PlanTask } from '@renderer/type/agent';
import { jsonrepair } from 'jsonrepair';

export interface AwareResult {
  reflection: string;
  step: number;
  status: string;
  plan?: PlanTask[];
}

// Note: Aware is the `Ambient World Analysis and Response Engine` for short, meaning that it is responsible for analyzing the ambient world and response the plan for the next step.
export class Aware {
  constructor(
    private appContext: AppContext,
    private agentContext: AgentContext,
    private abortSignal: AbortSignal,
  ) {}

  private systemPrompt = `You are an AI agent with the ability to analyze the current environment, decide the next task status, tell user the next specific action.

<task_description>
You must call the aware_analysis tool.

You should give the insights of current environment according to the various context information, and then decide the next task status.

If the task is none or current step is done, you should increment the step number and update system status. Please return the json output in the tool call part:

\`\`\`json
{
  "reflection": "[your reflection about current environment]",
  "step": "[next step number]",
  "plan": "[steps array with id and title fields]",
  "status": "[next task description, a complete sentence tell user what to do next]",
}
\`\`\`

You should output the reflection first.

You should not output any response text and only return the tool call.

Only when there is no existing plan in the current environment, you should return plan field with the following format:
- id: string (format: "step_XXX" where XXX is a sequential number starting from 001)
- title: string (clear, concise description of the step)

</task_description>


<think_steps>
For any given task or problem:
1. Analyze the requirements thoroughly
2. Create a systematic, step-by-step solution
3. Ensure each step is concrete and actionable
4. Maintain logical progression between steps
</think_steps>

<limitation>
You must follow these limitations:

- If there is plan exist, you should not return the plan field.
- Don't ask user anything, just tell user what to do next. If some points is not very clear, you should tell user your solution. Remember, you are a agent for human.
- Don't output any response text and only return the tool call.
- You should not repeat the same behavior or mean with previous steps.
- Don't output any file path in current machine and ensure the security in your message. Don't output any absolute path in your message.

</limitation>

<update_plan_in_process>

Only except user interrupt or start a new session, you CANNOT update the plan!

If you reset the plan to a new one, you should also reset the step to number 1.

</update_plan_in_process>


<status_field>

In the \`status\` field, you should only return a sentence to tell user what you will do next, and don't need to return the reason and other information.Please the the first person perspective to answer, indicating that you are work for the user.

</status_field>


<end_step>

If in the last step, but we still have issues to solve, you cannot increment the step number and should continue to solve the issue.

</end_step>

<user_interrupt>

For user interrupt input in the middle of the event stream, you should handle it in the first important level and handle it as soon as possible.If current plan tasks cannot match the new user input, you should reset the plan.

</user_interrupt>

<event_stream>

The event stream result record the complete response of the agent, you should make next decision base on the history, if current step has not been done, please don't increment the step number. If you meet the \`ended\` message, that means you entered a new session and you should reset the plan from scratch.

In the event stream, the \`observation\` type message is the observation of the tool use, you should attention to the field and judge the task status according to it.When the observer represent the error message, you should reflect the error and solve it in the next step.

</event_stream>

<after_web_search>

After \`web_search\` called, then you must select web page from the search result, then you must see the detail of the page, call navigate to get detail. See the detail right away after get search result!

</after_web_search>

<write_file>

When you want to write file, you should list allowed directories and write the file to the allowed directory.

</write_file>


<language>

You should use the same language as the user input by default.

</language>
  `;

  private awareSchema = {
    type: 'object',
    properties: {
      step: {
        type: 'number',
        description: 'Next step number',
      },
      status: {
        type: 'string',
        description:
          'Next task description, a complete sentence tell user what to do next',
      },
      reflection: {
        type: 'string',
        description: 'Your reflection about current environment',
      },
      plan: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'title'],
          properties: {
            id: {
              type: 'string',
              description: 'Step ID is a sequential number',
            },
            title: {
              type: 'string',
              minLength: 1,
              description: 'Clear and concise description of the step',
            },
          },
        },
      },
    },
    required: ['step', 'status', 'reflection'],
  } as const;

  public updateSignal(abortSignal: AbortSignal) {
    this.abortSignal = abortSignal;
  }

  async run() {
    const environmentInfo = await this.agentContext.getEnvironmentInfo(
      this.appContext,
      this.agentContext,
    );
    const defaultResult = {
      reflection: 'No plan',
      step: this.agentContext.currentStep,
      status: 'No plan',
      plan: [],
    };

    if (this.abortSignal.aborted) {
      return defaultResult;
    }

    const streamId = Math.random().toString(36).substring(7);
    return new Promise<AwareResult>(async (resolve, reject) => {
      const abortHandler = () => {
        ipcClient.abortRequest({ requestId: streamId });
        resolve(defaultResult);
      };

      try {
        this.abortSignal.addEventListener('abort', abortHandler);
        const executorTools = await ipcClient.listTools();
        const result = await ipcClient.askLLMTool({
          messages: [
            Message.systemMessage(this.systemPrompt),
            Message.systemMessage(
              `You are working with executor agent, here is the executor tools: ${executorTools
                .map((tool) => `${tool.name}: ${tool.description}`)
                .join(', ')}`,
            ),
            Message.userMessage(environmentInfo),
            Message.userMessage(
              `Please call aware_analysis tool to give me next decision.`,
            ),
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'aware_analysis',
                description:
                  'Analyze the current environment with user input, and decide the next task status',
                parameters: this.awareSchema,
              },
            },
          ],
          requestId: streamId,
        });

        if (!result.tool_calls?.length) {
          console.warn('No tool calls returned');

          // retry
          try {
            const res = JSON.parse(
              jsonrepair(result.content || ''),
            ) as AwareResult;
            resolve(res);
          } catch (e) {
            throw new Error(`No tool calls returned ${result.content}`);
          }
          return;
        }

        const awareResult = JSON.parse(
          result.tool_calls.filter(Boolean)[0].function.arguments,
        ) as AwareResult;
        resolve(awareResult);
      } catch (error) {
        reject(error);
      } finally {
        this.abortSignal.removeEventListener('abort', abortHandler);
      }
    });
  }
}
