/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Example implementing a Planner Agent that uses Plan-and-solve methodology
 * This agent first creates a plan of steps, then executes and updates them
 */

import {
  Agent,
  AgentOptions,
  AgentRunNonStreamingOptions,
  Event,
  EventType,
  LogLevel,
  PlanStep,
  Tool,
  z,
} from '../../src';
import { BrowserSearch } from '@agent-infra/browser-search';
import { ConsoleLogger } from '@agent-infra/logger';

/**
 * PlannerAgent - Extends the base Agent to implement a Plan-and-solve pattern
 *
 * This agent follows this workflow:
 * 1. Generate an initial plan with steps
 * 2. Before each agent loop, reflect on current progress and update the plan
 * 3. Execute tools as needed to complete plan steps
 * 4. Provide a final summary when all steps are complete
 */
class PlannerAgent extends Agent {
  private currentPlan: PlanStep[] = [];
  private taskCompleted = false;

  constructor(options: AgentOptions) {
    super({
      ...options,
      instructions: `${options.instructions || ''}

You are a methodical agent that follows a plan-and-solve approach. First create a plan with steps, then execute each step in order. As you work:
1. Update the plan as you learn new information
2. Mark steps as completed when they are done
3. Provide a final summary when all steps are complete

The plan data structure consists of an array of steps, where each step must have:
- "content": A detailed description of what needs to be done
- "done": A boolean flag indicating completion status (true/false)

IMPORTANT: You must complete ALL plan steps before exiting the agent loop. The task is only considered complete when every step is marked as done and you've provided a final summary. Never exit prematurely.`,
    });
  }

  /**
   * Initializes the agent with required tools and setup
   */
  override async initialize(): Promise<void> {
    await super.initialize();
  }

  /**
   * Hook called at the beginning of each agent loop iteration
   * Used to update the plan before each loop
   */
  override async onEachAgentLoopStart(sessionId: string): Promise<void> {
    await super.onEachAgentLoopStart(sessionId);

    if (this.taskCompleted) {
      return;
    }

    // In the first iteration, create an initial plan
    if (this.getCurrentLoopIteration() === 1) {
      await this.generateInitialPlan(sessionId);
    } else {
      // In subsequent iterations, update the plan
      await this.updatePlan(sessionId);
    }
  }

  private getLLMClientAndResolvedModel() {
    const resolvedModel = this.getCurrentResolvedModel()!;
    const llmClient = this.getLLMClient()!;
    return { resolvedModel, llmClient };
  }

  /**
   * Generates the initial plan
   */
  private async generateInitialPlan(sessionId: string): Promise<void> {
    // Create plan start event
    const startEvent = this.getEventStream().createEvent(EventType.PLAN_START, {
      sessionId,
    });
    this.getEventStream().sendEvent(startEvent);
    const { llmClient, resolvedModel } = this.getLLMClientAndResolvedModel();

    // Get messages from event stream to understand the task
    const messages = this.getMessages();

    try {
      // Request the LLM to create an initial plan with steps
      const response = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          ...messages,
          {
            role: 'user',
            content:
              "Create a step-by-step plan to complete the user's request. " +
              'Return a JSON object with an array of steps. Each step should have a "content" field ' +
              'describing what needs to be done and a "done" field set to false.',
          },
        ],
      });

      // Parse the response
      const content = response.choices[0]?.message?.content || '{"steps":[]}';
      let planData;
      try {
        planData = JSON.parse(content);
      } catch (e) {
        this.logger.error(`Failed to parse plan JSON: ${e}`);
        planData = { steps: [] };
      }

      // Store the plan
      this.currentPlan = Array.isArray(planData.steps)
        ? planData.steps.map((step: any) => ({
            content: step.content || 'Unknown step',
            done: false,
          }))
        : [];

      // Send plan update event
      const updateEvent = this.getEventStream().createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.getEventStream().sendEvent(updateEvent);

      // Send a system event for better visibility
      const systemEvent = this.getEventStream().createEvent(EventType.SYSTEM, {
        level: 'info',
        message: `Initial plan created with ${this.currentPlan.length} steps`,
        details: { plan: this.currentPlan },
      });
      this.getEventStream().sendEvent(systemEvent);
    } catch (error) {
      this.logger.error(`Error generating initial plan: ${error}`);

      // Create a minimal default plan if generation fails
      this.currentPlan = [{ content: 'Complete the task', done: false }];

      const updateEvent = this.getEventStream().createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.getEventStream().sendEvent(updateEvent);
    }
  }

  /**
   * Updates the plan based on current progress
   */
  private async updatePlan(sessionId: string): Promise<void> {
    // Get the current conversation context
    const messages = this.getMessages();
    const { llmClient, resolvedModel } = this.getLLMClientAndResolvedModel();

    try {
      // Request the LLM to evaluate and update the plan
      const response = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          ...messages,
          {
            role: 'system',
            content:
              'Evaluate the current progress and update the plan. ' +
              'Return a JSON object with an array of steps, marking completed steps as "done": true. ' +
              'Add new steps if needed. If all steps are complete, include a "completed": true field ' +
              'and a "summary" field with a final summary.',
          },
          {
            role: 'system',
            content: `Current plan: ${JSON.stringify({ steps: this.currentPlan })}`,
          },
        ],
      });

      // Parse the response
      const content = response.choices[0]?.message?.content || '{"steps":[]}';
      let planData;
      try {
        planData = JSON.parse(content);
      } catch (e) {
        this.logger.error(`Failed to parse plan update JSON: ${e}`);
        planData = { steps: this.currentPlan };
      }

      // Update the plan
      if (Array.isArray(planData.steps)) {
        this.currentPlan = planData.steps.map((step: any) => ({
          content: step.content || 'Unknown step',
          done: Boolean(step.done),
        }));
      }

      // Send plan update event
      const updateEvent = this.getEventStream().createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.getEventStream().sendEvent(updateEvent);

      // Check if the plan is completed
      const allStepsDone = this.currentPlan.every((step) => step.done);
      this.taskCompleted = allStepsDone && Boolean(planData.completed);

      if (this.taskCompleted) {
        // Send plan finish event
        const finishEvent = this.getEventStream().createEvent(EventType.PLAN_FINISH, {
          sessionId,
          summary: planData.summary || 'Task completed successfully',
        });
        this.getEventStream().sendEvent(finishEvent);

        // Send a system event
        const systemEvent = this.getEventStream().createEvent(EventType.SYSTEM, {
          level: 'info',
          message: 'Plan completed',
          details: { summary: planData.summary },
        });
        this.getEventStream().sendEvent(systemEvent);
      }
    } catch (error) {
      this.logger.error(`Error updating plan: ${error}`);
    }
  }

  /**
   * Get messages for planning context
   */
  private getMessages(): any[] {
    // Get only user and assistant messages to avoid overwhelming the context
    const events = this.getEventStream().getEventsByType([
      EventType.USER_MESSAGE,
      EventType.ASSISTANT_MESSAGE,
    ]);

    // Convert events to message format
    return events.map((event) => {
      if (event.type === EventType.USER_MESSAGE) {
        return {
          role: 'user',
          content:
            typeof event.content === 'string' ? event.content : JSON.stringify(event.content),
        };
      } else {
        return {
          role: 'assistant',
          content: event.content,
        };
      }
    });
  }
}

/**
 * Search Tool - Uses real browser-based search
 * This tool performs actual web searches and extracts content from result pages
 */
const SearchTool = new Tool({
  id: 'web-search',
  description: 'Perform a comprehensive web search on a topic and extract detailed information',
  parameters: z.object({
    query: z.string().describe('The search query to research'),
    count: z.number().optional().describe('Number of results to fetch (default: 3)'),
    engine: z
      .enum(['google', 'bing', 'baidu'])
      .optional()
      .describe('Search engine to use (default: google)'),
  }),
  function: async ({ query, count = 3, engine = 'google' }) => {
    console.log(`Performing deep research on: "${query}" using ${engine} search engine`);

    // Create logger for the search
    const logger = new ConsoleLogger('[DeepResearch]');

    // Initialize the browser search client
    const browserSearch = new BrowserSearch({
      logger,
      browserOptions: {
        headless: true, // Run in headless mode
      },
    });

    try {
      // Perform the search
      const results = await browserSearch.perform({
        // @ts-expect-error
        query: query as string,
        count: count as number,
        // @ts-expect-error
        engine,
        needVisitedUrls: true, // Extract content from pages
      });

      console.log(`Found ${results.length} results for "${query}"`);

      // Process results to make them more useful for the agent
      const processedResults = results.map((result, index) => {
        // Trim content to a reasonable length to avoid overwhelming the model
        const maxContentLength = 1000;
        const trimmedContent =
          result.content.length > maxContentLength
            ? result.content.substring(0, maxContentLength) + '...(content trimmed)'
            : result.content;

        return {
          index: index + 1,
          title: result.title,
          url: result.url,
          content: trimmedContent,
        };
      });

      return {
        query,
        engine,
        totalResults: results.length,
        results: processedResults,
      };
    } catch (error) {
      logger.error(`Error in deep research: ${error}`);
      return {
        error: `Failed to perform research: ${error}`,
        query,
      };
    } finally {
      // Always close the browser to free resources
      await browserSearch.closeBrowser();
    }
  },
});

// Export the agent and runOptions for testing
export const agent = new PlannerAgent({
  name: 'Plan-and-Solve Agent',
  tools: [SearchTool],
  logLevel: LogLevel.INFO,
  model: {
    use: {
      provider: 'volcengine',
      model: 'ep-20250512165931-2c2ln', // 'doubao-1.5-thinking-vision-pro',
      apiKey: process.env.ARK_API_KEY,
    },
  },
  maxIterations: 100,
  toolCallEngine: 'structured_outputs',
});

export const runOptions: AgentRunNonStreamingOptions = {
  input: `帮我调研一下 ByteDance 的开源项目，给出一份完整的报告

我期待覆盖的信息： 
1. 主要的开源项目、贡献者；
2. 应用场景； 
3. 项目活跃状态；
4. 社区影响力；
5. 技术蓝图；

要求报告输出中文。`,
};

// Main function for running the example
async function main() {
  // Check for command line arguments
  const userQuery = process.argv[2] || runOptions.input;

  await agent.initialize();

  console.log('\n🤖 Running Planner Agent');
  console.log('--------------------------------------------');
  console.log(`Query: "${userQuery}"`);
  console.log('--------------------------------------------');

  // Subscribe to plan events

  const unsubscribe = agent
    .getEventStream()
    .subscribeToTypes(
      [EventType.PLAN_START, EventType.PLAN_UPDATE, EventType.PLAN_FINISH],
      (event: Event) => {
        if (event.type === EventType.PLAN_START) {
          console.log('\n📝 Plan started');
          console.log('--------------------------------------------');
        } else if (event.type === EventType.PLAN_UPDATE) {
          const planEvent = event as any;
          console.log('\n📋 Plan updated:');
          console.log('--------------------------------------------');
          planEvent.steps.forEach((step: PlanStep, index: number) => {
            console.log(`  ${index + 1}. [${step.done ? '✓' : ' '}] ${step.content}`);
          });
          console.log('--------------------------------------------');
        } else if (event.type === EventType.PLAN_FINISH) {
          const planEvent = event as any;
          console.log('\n🎉 Plan finished!');
          console.log('--------------------------------------------');
          console.log(`Summary: ${planEvent.summary}`);
          console.log('--------------------------------------------');
        }
      },
    );

  // Also subscribe to tool events for better visibility

  const toolUnsubscribe = agent
    .getEventStream()
    .subscribeToTypes([EventType.TOOL_CALL, EventType.TOOL_RESULT], (event: Event) => {
      if (event.type === EventType.TOOL_CALL) {
        const toolEvent = event as any;
        console.log(`\n🔧 Using tool: ${toolEvent.name}`);
      } else if (event.type === EventType.TOOL_RESULT) {
        const resultEvent = event as any;
        console.log(`✅ Tool result: ${JSON.stringify(resultEvent.content)}`);
      }
    });

  // Run the agent with the specified query
  const result = await agent.run({
    ...runOptions,
    input: userQuery,
  });

  console.log('\n🤖 Final response:');
  console.log('--------------------------------------------');
  console.log(result.content);
  console.log('--------------------------------------------');

  // Clean up subscriptions
  unsubscribe();
  toolUnsubscribe();
}

if (require.main === module) {
  main().catch(console.error);
}
