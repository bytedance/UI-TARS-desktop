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
 * This agent requires the "final_report" tool to be called before allowing
 * the agent loop to terminate.
 */
class PlannerAgent extends Agent {
  private finalReportCalled = false;

  constructor(options: AgentOptions) {
    super({
      ...options,
      instructions: `${options.instructions || ''}

You are an agent that must ALWAYS call the "final_report" tool before finishing.
This is extremely important - you must NEVER provide a direct answer without first calling "final_report".
`,
    });

    // Register the final report tool
    this.registerTool(
      new Tool({
        id: 'final_report',
        description: 'Generate a comprehensive final report. Must be called before finishing.',
        parameters: z.object({
          summary: z.string().describe('A summary of your findings'),
        }),
        function: async ({ summary }) => {
          console.log(`🎯 Final report called with summary: ${summary}`);
          this.finalReportCalled = true;
          return { success: true, message: 'Report generated successfully' };
        },
      }),
    );
  }

  /**
   * Override the onBeforeLoopTermination hook to enforce calling finalReport
   * before allowing the agent loop to terminate
   */
  override async onBeforeLoopTermination(
    id: string,
    finalEvent: AssistantMessageEvent,
  ): Promise<LoopTerminationCheckResult> {
    // Check if "final_report" was called
    if (!this.finalReportCalled) {
      this.logger.warn(`[Agent] Preventing loop termination: "final_report" tool was not called`);

      // Add a user message reminding the agent to call finalReport
      const reminderEvent = this.getEventStream().createEvent(EventType.USER_MESSAGE, {
        content:
          'Please call the "final_report" tool before providing your final answer. This is required to complete the task.',
      });
      this.getEventStream().sendEvent(reminderEvent);

      // Prevent loop termination
      return {
        finished: false,
        message: '"final_report" tool must be called before completing the task',
      };
    }

    // If "final_report" was called, allow termination
    this.logger.info(`[Agent] Allowing loop termination: "final_report" tool was called`);
    return { finished: true };
  }

  /**
   * Reset the finalReportCalled flag when the agent loop ends
   * to prepare for the next run
   */
  override async onAgentLoopEnd(id: string): Promise<void> {
    this.finalReportCalled = false;
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
  console.log('can enforce calling the "final_report" tool before completing.');
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
