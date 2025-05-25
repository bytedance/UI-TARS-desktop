// /packages/multimodal/agent/examples/planner/basic.ts
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
3. Provide a final summary when all steps are complete`,
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

    const client = this.getLLMClient();
    if (!client) {
      this.logger.error('LLM client not available for plan generation');
      return;
    }

    // In the first iteration, create an initial plan
    if (this.getCurrentLoopIteration() === 1) {
      await this.generateInitialPlan(sessionId, client);
    } else {
      // In subsequent iterations, update the plan
      await this.updatePlan(sessionId, client);
    }
  }

  /**
   * Generates the initial plan
   */
  private async generateInitialPlan(sessionId: string, client: any): Promise<void> {
    // Create plan start event
    const startEvent = this.getEventStream().createEvent(EventType.PLAN_START, {
      sessionId,
    });
    this.getEventStream().sendEvent(startEvent);

    // Get messages from event stream to understand the task
    const messages = this.getMessages();

    try {
      // Request the LLM to create an initial plan with steps
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          ...messages,
          {
            role: 'system',
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
  private async updatePlan(sessionId: string, client: any): Promise<void> {
    // Get the current conversation context
    const messages = this.getMessages();

    try {
      // Request the LLM to evaluate and update the plan
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
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
 * Example search tool for the planner
 */
const searchTool = new Tool({
  id: 'search',
  description: 'Search for information on a topic',
  parameters: z.object({
    query: z.string().describe('The search query'),
  }),
  function: async ({ query }) => {
    // Simulate search results
    console.log(`Searching for: ${query}`);

    // Return mock data based on query
    if (query.includes('weather')) {
      return {
        results: [
          { title: 'Current Weather', content: 'Today is sunny with a high of 75°F' },
          {
            title: 'Weekly Forecast',
            content: 'The week ahead looks warm with a chance of rain on Thursday',
          },
        ],
      };
    } else if (query.includes('recipe')) {
      return {
        results: [
          {
            title: 'Pasta Carbonara Recipe',
            content:
              '1. Cook pasta 2. Mix eggs, cheese, and pepper 3. Combine with pasta and bacon',
          },
        ],
      };
    } else {
      return {
        results: [{ title: 'Search Results', content: `Found some information about ${query}` }],
      };
    }
  },
});

/**
 * Example tool to get the current date and time
 */
const datetimeTool = new Tool({
  id: 'getCurrentDateTime',
  description: 'Get the current date and time',
  parameters: z.object({}),
  function: async () => {
    return {
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
    };
  },
});

// Export the agent and runOptions for testing
export const agent = new PlannerAgent({
  name: 'Plan-and-Solve Agent',
  tools: [searchTool, datetimeTool],
  logLevel: LogLevel.INFO,
  instructions: 'You are a helpful assistant that plans and executes tasks methodically.',
  model: {
    use: {
      provider: 'openai',
      model: 'gpt-4o',
    },
  },
  maxIterations: 10,
});

export const runOptions: AgentRunNonStreamingOptions = {
  input:
    'I need to plan a dinner party for tomorrow. Help me figure out what to cook and how to prepare.',
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
