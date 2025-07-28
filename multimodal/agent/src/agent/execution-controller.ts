import { getLogger } from '../utils/logger';
import { AgentStatus } from '@multimodal/agent-interface';

/**
 * Controls the execution state of an Agent and manages abort functionality
 *
 * This class provides:
 * 1. Status management to prevent concurrent executions
 * 2. Abort signal handling to cancel running tasks
 * 3. Cleanup hooks for proper resource management
 */
export class AgentExecutionController {
  private abortController: AbortController | null = null;
  private status: AgentStatus = AgentStatus.IDLE;
  private logger = getLogger('ExecutionController');
  private cleanupHandlers: (() => Promise<void> | void)[] = [];

  /**
   * Get the current execution status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Check if the agent is currently executing
   */
  isExecuting(): boolean {
    return this.status === AgentStatus.EXECUTING;
  }

  /**
   * Get the current abort signal
   * @returns The current abort signal or undefined if not executing
   */
  getAbortSignal(): AbortSignal | undefined {
    return this.abortController?.signal;
  }

  /**
   * Begin a new execution session
   * @returns abort signal for the new session
   * @throws Error if another execution is already in progress
   */
  beginExecution(): AbortSignal {
    if (this.isExecuting()) {
      throw new Error(
        'Agent is already executing a task. Complete or abort the current task before starting a new one.',
      );
    }

    // Clean up any previous abort controller
    this.abortController?.abort();

    // Create new abort controller for this execution
    this.abortController = new AbortController();
    this.status = AgentStatus.EXECUTING;
    this.cleanupHandlers = [];

    this.logger.info(`Agent execution started with status: ${this.status}`);
    return this.abortController.signal;
  }

  /**
   * End the current execution session
   * @param status The final status to set
   */
  async endExecution(status: AgentStatus = AgentStatus.IDLE): Promise<void> {
    // Run cleanup handlers in reverse order they were added
    for (const handler of this.cleanupHandlers.reverse()) {
      try {
        await handler();
      } catch (error) {
        this.logger.error(`Error in cleanup handler: ${error}`);
      }
    }

    this.cleanupHandlers = [];
    this.status = status;
    this.logger.info(`Agent execution ended with status: ${this.status}`);
  }

  /**
   * Abort the current execution
   * @returns True if execution was aborted, false if there was no execution to abort
   */
  abort(): boolean {
    if (!this.isExecuting() || !this.abortController) {
      this.logger.info(
        `Abort called but no execution in progress (current status: ${this.status})`,
      );
      return false;
    }

    this.logger.info('Aborting agent execution');
    this.abortController.abort();
    this.status = AgentStatus.ABORTED;
    return true;
  }

  /**
   * Register a cleanup handler to be called when execution ends
   * @param handler Function to call during cleanup
   */
  registerCleanupHandler(handler: () => Promise<void> | void): void {
    this.cleanupHandlers.push(handler);
  }

  /**
   * Check if the current execution has been aborted
   */
  isAborted(): boolean {
    return this.status === AgentStatus.ABORTED;
  }
}
