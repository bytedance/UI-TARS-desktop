/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Example demonstrating how to use the onBeforeLoopTermination hook
 * to enforce specific completion criteria before ending the agent loop
 */

import { LoopTerminationCheckResult } from '@multimodal/agent-interface';
import {
  Agent,
  AgentOptions,
  AssistantMessageEvent,
  EventType,
  LogLevel,
  Tool,
  z,
} from '../../src';

/**
 * PlannerAgent - Demonstrates use of onBeforeLoopTermination hook
 *
 * This agent requires the "final_answer" tool to be called before allowing
 * the agent loop to terminate.
 */
class PlannerAgent extends Agent {
  private finalAnswerCalled = false;

  constructor(options: AgentOptions) {
    super({
      ...options,
      instructions: `${options.instructions || ''}

You are an agent that must ALWAYS call the "final_answer" tool before finishing.
This is extremely important - you must NEVER provide a direct answer without first calling "final_answer".
`,
    });

    // Register the final report tool
    this.registerTool(
      new Tool({
        id: 'final_answer',
        description: 'Generate a comprehensive final report. Must be called before finishing.',
        parameters: z.object({
          summary: z.string().describe('A summary of your findings'),
        }),
        function: async ({ summary }) => {
          console.log(`🎯 Final report called with summary: ${summary}`);
          this.finalAnswerCalled = true;
          return { success: true, message: 'Report generated successfully' };
        },
      }),
    );
  }

  /**
   * Override the onBeforeLoopTermination hook to enforce calling finalAnswer
   * before allowing the agent loop to terminate
   */
  override async onBeforeLoopTermination(
    id: string,
    finalEvent: AssistantMessageEvent,
  ): Promise<LoopTerminationCheckResult> {
    // Check if "final_answer" was called
    if (!this.finalAnswerCalled) {
      this.logger.warn(`[Agent] Preventing loop termination: "final_answer" tool was not called`);

      // Add a user message reminding the agent to call finalAnswer
      const reminderEvent = this.getEventStream().createEvent(EventType.USER_MESSAGE, {
        content:
          'Please call the "final_answer" tool before providing your final answer. This is required to complete the task.',
      });
      this.getEventStream().sendEvent(reminderEvent);

      // Prevent loop termination
      return {
        finished: false,
        message: '"final_answer" tool must be called before completing the task',
      };
    }

    // If "final_answer" was called, allow termination
    this.logger.info(`[Agent] Allowing loop termination: "final_answer" tool was called`);
    return { finished: true };
  }

  /**
   * Reset the finalAnswerCalled flag when the agent loop ends
   * to prepare for the next run
   */
  override async onAgentLoopEnd(id: string): Promise<void> {
    this.finalAnswerCalled = false;
    await super.onAgentLoopEnd(id);
  }
}

async function main() {
  // Create the planner agent
  const agent = new PlannerAgent({
    name: 'Planner Agent',
    logLevel: LogLevel.INFO,
    maxIterations: 10,
  });

  console.log('\n🤖 Running Planner Agent');
  console.log('--------------------------------------------');
  console.log('This example demonstrates how onBeforeLoopTermination hook');
  console.log('can enforce calling the "final_answer" tool before completing.');
  console.log('--------------------------------------------\n');

  try {
    // Run the agent
    const result = await agent.run('Summarize the benefits of clean code in 3 bullet points');

    console.log('\n✅ Final response:');
    console.log('--------------------------------------------');
    console.log(result.content);
    console.log('--------------------------------------------');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
