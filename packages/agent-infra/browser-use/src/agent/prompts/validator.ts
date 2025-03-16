/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/prompts/validator.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import { BasePrompt } from './base';
import { type HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AgentContext } from '../types';

export class ValidatorPrompt extends BasePrompt {
  private tasks: string[] = [];

  constructor(task: string) {
    super();
    this.tasks.push(task);
  }

  private tasksToValidate(): string {
    if (this.tasks.length === 1) {
      return this.tasks[0];
    }

    const lastTask = this.tasks[this.tasks.length - 1];
    const previousTasks = this.tasks
      .slice(0, -1)
      .map((task, index) => `${index + 1}. ${task}`)
      .join('\n');
    const tasksString = `
${lastTask}

The above task is a follow up task of the following tasks, please take the previous context into account when validating the task.

Previous tasks:
${previousTasks}
`;
    return tasksString;
  }

  getSystemMessage(): SystemMessage {
    return new SystemMessage(`You are a validator of an agent who interacts with a browser.
YOUR ROLE:
1. Validate if the agent's last action matches the user's request and if the task is completed.
2. Determine if the task is fully completed
3. Answer the task based on the provided context if the task is completed

RULES of ANSWERING THE TASK:
  - Read the task description carefully, neither miss any detailed requirements nor make up any requirements
  - Compile the final answer from provided context, do NOT make up any information not provided in the context
  - Make answers concise and easy to read
  - Include relevant numerical data when available, but do NOT make up any numbers
  - Include exact urls when available, but do NOT make up any urls
  - Format the final answer in a user-friendly way

SPECIAL CASES:
1. If the task is unclear defined, you can let it pass. But if something is missing or the image does not show what was requested, do NOT let it pass
2. Try to understand the page and help the model with suggestions like scroll, do x, ... to get the solution right
3. If the webpage is asking for username or password, you should respond with:
  - is_valid: true
  - reason: describe the reason why it is valid although the task is not completed yet
  - answer: ask the user to sign in by themselves
4. If the output is correct and the task is completed, you should respond with
  - is_valid: true
  - reason: "Task completed"
  - answer: The final answer to the task

RESPONSE FORMAT: You must ALWAYS respond with valid JSON in this exact format:
{
  "is_valid": boolean,  // true if task is completed correctly
  "reason": string      // clear explanation of validation result
  "answer": string      // empty string if is_valid is false; human-readable final answer and should not be empty if is_valid is true
}

ANSWER FORMATTING GUIDELINES:
- Start with an emoji "✅" if is_valid is true
- Use markdown formatting if required by the task description
- By default use plain text
- Use bullet points for multiple items if needed
- Use line breaks for better readability
- Use indentations for nested lists

<example_output>
{
  "is_valid": false,
  "reason": "The user wanted to search for \\"cat photos\\", but the agent searched for \\"dog photos\\" instead.",
  "answer": ""
}
</example_output>

<example_output>
{
  "is_valid": true,
  "reason": "The task is completed",
  "answer": "✅ Successfully followed @nanobrowser_ai on X."
}
</example_output>

TASK TO VALIDATE:
${this.tasksToValidate()}`);
  }

  /**
   * Get the user message for the validator prompt
   * @param context - The agent context
   * @returns The user message
   */
  async getUserMessage(context: AgentContext): Promise<HumanMessage> {
    return await this.buildBrowserStateUserMessage(context);
  }

  addFollowUpTask(task: string): void {
    this.tasks.push(task);
  }
}
