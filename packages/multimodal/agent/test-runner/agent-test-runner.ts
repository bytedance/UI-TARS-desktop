import fs from 'fs';
import path from 'path';
import { Agent } from '../src/agent';
import { SnapshotManager } from './snapshot-manager';
import { LLMMocker } from './llm-mocker';
import { getLogger } from '../src/utils/logger';
import { AgentRunObjectOptions, isStreamingOptions } from '@multimodal/agent-interface';

const logger = getLogger('AgentTestRunner');

interface RunTestOptions {
  /**
   * Name of the test case - corresponds to the directory name in fixtures
   */
  caseName: string;
  /**
   * Whether to update snapshots when they don't match
   */
  updateSnapshots?: boolean;
}

/**
 * AgentTestRunner - A test utility that runs agent tests against filesystem fixtures
 *
 * This runner loads test case data from the filesystem, mocks LLM responses, and verifies
 * that the agent's behavior matches the expected state transitions in each loop.
 */
export class AgentTestRunner {
  private snapshotManager: SnapshotManager;
  private llmMocker: LLMMocker;
  private fixturesRoot: string;

  constructor(options?: { fixturesRoot?: string }) {
    this.fixturesRoot = options?.fixturesRoot || path.join(process.cwd(), 'fixtures');
    this.snapshotManager = new SnapshotManager(this.fixturesRoot);
    this.llmMocker = new LLMMocker();
  }

  /**
   * Run a test case against a fixture directory
   */
  async runTest({ caseName, updateSnapshots = false }: RunTestOptions): Promise<void> {
    const casePath = path.join(this.fixturesRoot, caseName);

    // Verify the case directory exists
    if (!fs.existsSync(casePath)) {
      throw new Error(`Test case directory not found: ${casePath}`);
    }

    // Load setup module
    const setupPath = path.join(casePath, 'setup.ts');
    if (!fs.existsSync(setupPath)) {
      throw new Error(`Setup file not found: ${setupPath}`);
    }

    logger.info(`\n🚀 Running test case: ${caseName}${updateSnapshots ? ' (update mode)' : ''}`);

    // Import setup module
    const { agent, runOptions } = (await import(setupPath)) as {
      agent: Agent;
      runOptions: AgentRunObjectOptions;
    };

    // Count how many loop directories exist
    const loopDirs = fs
      .readdirSync(casePath)
      .filter(
        (dir) => dir.startsWith('loop-') && fs.statSync(path.join(casePath, dir)).isDirectory(),
      )
      .sort((a, b) => {
        const numA = parseInt(a.split('-')[1], 10);
        const numB = parseInt(b.split('-')[1], 10);
        return numA - numB;
      });

    const totalLoops = loopDirs.length;
    logger.info(`📂 Found ${totalLoops} loops in test case`);

    // Mock the LLM client to intercept requests
    this.llmMocker.setup(agent, casePath, totalLoops, { updateSnapshots });

    // Run the agent
    let result;

    try {
      // Check if streaming mode is requested
      const isStreaming = typeof runOptions === 'object' && isStreamingOptions(runOptions);

      if (isStreaming) {
        // Handle streaming mode - need to consume the entire AsyncIterable
        const asyncIterable = await agent.run(runOptions);
        const events = [];

        // Consume all events from the stream
        logger.info(`📊 Processing streaming response...`);
        for await (const event of asyncIterable) {
          events.push(event);
        }

        logger.success(`✅ Streaming agent execution completed with ${events.length} events`);
        result = { events, count: events.length };
      } else {
        // Handle non-streaming mode
        result = await agent.run(runOptions);
        logger.success(`✅ Agent execution completed successfully`);
      }

      logger.info(`📝 Result: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.error(`❌ Agent execution failed: ${error}`);
      throw error;
    } finally {
      // Cleanup mocking - final verification now happens in mockAgentLoopEndHook
      this.llmMocker.restore();
    }

    // Verify that the number of executed loops matches the number of loop directories
    const executedLoops = this.llmMocker.getCurrentLoop() - 1; // Subtract 1 because currentLoop is incremented at start of each loop
    logger.info(`🔄 Executed ${executedLoops} agent loops out of ${totalLoops} expected loops`);

    if (executedLoops !== totalLoops) {
      const error = `Loop count mismatch: Agent executed ${executedLoops} loops, but fixture has ${totalLoops} loop directories`;
      logger.error(`❌ ${error}`);
      throw new Error(error);
    }

    logger.success(`✓ Loop count verification passed: ${executedLoops} loops executed as expected`);

    logger.success(`\n✨ Test case ${caseName} completed successfully ✨\n`);
  }
}
