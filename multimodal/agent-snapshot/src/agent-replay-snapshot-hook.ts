/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { Agent } from '@multimodal/agent';
import { SnapshotManager, ToolCallData } from './snapshot-manager';
import { logger } from './utils/logger';
import {
  Event,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  ChatCompletion,
  ChatCompletionChunk,
  ToolCallResult,
  ChatCompletionMessageToolCall,
  OpenAI,
} from '@multimodal/agent-interface';
import { AgentHookBase } from './agent-hook-base';
import { AgentNormalizerConfig } from './utils/snapshot-normalizer';

interface LLMMockerSetupOptions {
  updateSnapshots?: boolean;
  normalizerConfig?: AgentNormalizerConfig;
  verification?: {
    verifyLLMRequests?: boolean;
    verifyEventStreams?: boolean;
    verifyToolCalls?: boolean;
  };
}

/**
 * Agent Replay Snapshot Hook - Mocks LLM requests and responses for agent testing
 *
 * This class intercepts LLM requests from the agent, verifies they match
 * expected requests, and returns mock responses from snapshots.
 */
export class AgentReplaySnapshotHook extends AgentHookBase {
  private totalLoops = 0;
  private updateSnapshots = false;
  private eventStreamStatesByLoop: Map<number, Event[]> = new Map();
  private finalEventStreamState: Event[] = [];
  private mockLLMClient: OpenAI | undefined = undefined;
  private verifyLLMRequests = true;
  private verifyEventStreams = true;
  private verifyToolCalls = true;
  private toolCallsByLoop: Record<number, ToolCallData[]> = {};
  private startTimeByToolCall: Record<string, number> = {};

  /**
   * Set up the LLM mocker with an agent and test case
   */
  async setup(
    agent: Agent,
    casePath: string,
    totalLoops: number,
    options: LLMMockerSetupOptions = {},
  ) {
    // LLMMocker directly extends AgentHookBase but uses a different constructor
    // pattern, so we need to set these properties manually
    this.agent = agent;
    this.snapshotPath = casePath;
    this.snapshotName = path.basename(casePath);
    this.totalLoops = totalLoops;
    this.updateSnapshots = options.updateSnapshots || false;

    // Set verification options
    this.verifyLLMRequests = options.verification?.verifyLLMRequests !== false;
    this.verifyEventStreams = options.verification?.verifyEventStreams !== false;
    this.verifyToolCalls = options.verification?.verifyToolCalls !== false;

    // Create the snapshot manager with the normalizer config if provided
    this.snapshotManager = new SnapshotManager(path.dirname(casePath), options.normalizerConfig);

    // Hook the agent
    this.hookAgent();

    // Create a mock LLM client that will be injected into the agent
    this.mockLLMClient = this.createMockLLMClient();

    logger.info(`LLM mocker set up for ${this.snapshotName} with ${totalLoops} loops`);
    logger.info(
      `Verification settings: LLM requests: ${this.verifyLLMRequests ? 'enabled' : 'disabled'}, ` +
        `Event streams: ${this.verifyEventStreams ? 'enabled' : 'disabled'}, ` +
        `Tool calls: ${this.verifyToolCalls ? 'enabled' : 'disabled'}`,
    );

    // Verify initial event stream state immediately after setup if enabled
    if (this.verifyEventStreams) {
      await this.verifyInitialEventStreamState();
    }
  }

  /**
   * Store final event stream state
   */
  storeFinalEventStreamState(events: Event[]): void {
    this.finalEventStreamState = [...events];
  }

  /**
   * Get the final event stream state after agent completes
   */
  getFinalEventStreamState(): Event[] {
    return this.finalEventStreamState;
  }

  /**
   * Get the mock LLM client to be passed to the Agent
   */
  getMockLLMClient(): OpenAI | undefined {
    return this.mockLLMClient;
  }

  /**
   * Restore original hooks and functions
   */
  restore(): void {
    this.unhookAgent();
    this.mockLLMClient = undefined;
    logger.info('Restored original LLM hooks and client');
  }

  /**
   * Create a mock LLM client compatible with OpenAI interface
   */
  private createMockLLMClient(): OpenAI {
    return {
      chat: {
        completions: {
          create: async (request: Record<string, unknown>) => {
            // Get current loop from the Agent directly
            const currentLoop = this.agent?.getCurrentLoopIteration() as number;
            logger.info(
              `[Mock LLM Client] Creating chat completion for loop ${currentLoop} with args: ` +
                JSON.stringify(request, null, 2),
            );

            // Load the mock response for this loop
            const loopDir = `loop-${currentLoop}`;
            const mockResponse = await this.snapshotManager?.readSnapshot<
              ChatCompletion | ChatCompletionChunk[]
            >(path.basename(this.snapshotPath), loopDir, 'llm-response.jsonl');

            if (!mockResponse) {
              const error = new Error(`No mock response found for ${loopDir}`);
              this.lastError = error;
            }

            logger.info(
              `[Mock LLM Response] Loop ${currentLoop}: Type: ${Array.isArray(mockResponse) ? 'array' : 'object'}, Length: ${Array.isArray(mockResponse) ? mockResponse.length : 1}`,
            );
            logger.success(`✅ Using mock LLM response from snapshot for ${loopDir}`);

            // Handle streaming vs non-streaming responses
            if (request.stream) {
              // For streaming, ensure we have an array of chunks
              const streamResponse = Array.isArray(mockResponse)
                ? mockResponse
                : [mockResponse as unknown as ChatCompletionChunk];

              logger.info(
                `Creating streaming response with ${streamResponse.length} chunks for loop ${currentLoop}`,
              );

              // Verify the response objects have the required structure
              streamResponse.forEach((chunk, idx) => {
                if (!chunk.id || !chunk.object || !chunk.choices) {
                  logger.warn(`Chunk ${idx} may have invalid structure: ${JSON.stringify(chunk)}`);
                }
              });

              return this.createAsyncIterable(streamResponse);
            } else {
              // For non-streaming, return the response directly
              return mockResponse;
            }
          },
        },
      },
    } as unknown as OpenAI;
  }

  /**
   * Verify initial event stream state before the first loop
   */
  private async verifyInitialEventStreamState(): Promise<void> {
    if (!this.snapshotPath || !this.snapshotManager || !this.agent) {
      throw new Error('LLMMocker not properly set up');
    }

    logger.info(`🔍 Verifying initial event stream state before first loop`);

    const events = this.agent.getEventStream().getEvents();
    if (events.length > 0) {
      try {
        await this.snapshotManager.verifyEventStreamSnapshot(
          path.basename(this.snapshotPath),
          'initial',
          events,
          this.updateSnapshots,
        );
        logger.success(`✅ Initial event stream verification succeeded`);
      } catch (error) {
        logger.error(`❌ Initial event stream verification failed: ${error}`);
        if (!this.updateSnapshots) {
          throw error;
        }
      }
    }
  }

  private createAsyncIterable(chunks: ChatCompletionChunk[]): AsyncIterable<ChatCompletionChunk> {
    logger.info(`Creating AsyncIterable with ${chunks.length} chunks`);

    return {
      [Symbol.asyncIterator]() {
        let index = 0;
        let iteratorClosed = false;

        logger.info(`AsyncIterator created for ${chunks.length} chunks`);

        return {
          async next() {
            if (iteratorClosed) {
              logger.info(`Iterator already closed, returning done`);
              return { done: true, value: undefined };
            }

            if (index < chunks.length) {
              const chunk = chunks[index];
              logger.info(`Yielding chunk ${index + 1}/${chunks.length}`);
              index++;
              return { done: false, value: chunk };
            } else {
              logger.info(`Iterator completed after yielding ${index} chunks`);
              iteratorClosed = true;
              return { done: true, value: undefined };
            }
          },
          async return() {
            // Proper cleanup when iterator is closed early
            logger.info(`Iterator return() called early at index ${index}/${chunks.length}`);
            iteratorClosed = true;
            return { done: true, value: undefined };
          },
          async throw(error: unknown) {
            // Handle errors properly
            logger.error(`Error in streaming response iterator: ${error}`);
            iteratorClosed = true;
            return { done: true, value: undefined };
          },
        };
      },
    };
  }

  /**
   * Hook implementation for agent loop start
   */
  protected onEachAgentLoopStart(id: string): void | Promise<void> {
    const currentLoop = this.agent.getCurrentLoopIteration();

    // Initialize tool calls array for this loop
    if (!this.toolCallsByLoop[currentLoop]) {
      this.toolCallsByLoop[currentLoop] = [];
    }

    // Pass through to original hook if present
    if (this.originalEachLoopStartHook) {
      return this.originalEachLoopStartHook.call(this.agent, id);
    }
  }

  /**
   * Mock the LLM request hook to intercept and verify requests
   */
  protected async onLLMRequest(id: string, payload: LLMRequestHookPayload): Promise<void> {
    if (!this.snapshotPath || !this.snapshotManager) {
      throw new Error('LLMMocker not properly set up');
    }

    // Get current loop from the Agent directly
    const currentLoop = this.agent.getCurrentLoopIteration();
    const loopDir = `loop-${currentLoop}`;
    logger.info(`🔄 Intercepted LLM request for loop ${currentLoop}`);

    // Capture current event stream state BEFORE the LLM call
    const events = this.agent.getEventStream().getEvents();
    this.eventStreamStatesByLoop.set(currentLoop, [...events]);

    // Verify event stream state at this point in time if enabled
    if (this.verifyEventStreams) {
      try {
        logger.info(`🔍 Verifying event stream state at the beginning of ${loopDir}`);
        if (this.updateSnapshots) {
          logger.warn(
            `⚠️ Update mode enabled: directly updating event stream snapshot for ${loopDir}`,
          );
        }
        await this.snapshotManager.verifyEventStreamSnapshot(
          path.basename(this.snapshotPath),
          loopDir,
          events,
          this.updateSnapshots,
        );
      } catch (error) {
        logger.error(`❌ Event stream verification failed for ${loopDir}: ${error}`);
        if (!this.updateSnapshots) {
          throw error;
        }
      }
    } else {
      logger.info(`Event stream verification skipped for ${loopDir} (disabled in config)`);
    }

    // Verify request matches expected request in snapshot if enabled
    if (this.verifyLLMRequests) {
      try {
        if (this.updateSnapshots) {
          logger.warn(
            `⚠️ Update mode enabled: directly updating LLM request snapshot for ${loopDir}`,
          );
        }
        await this.snapshotManager.verifyRequestSnapshot(
          path.basename(this.snapshotPath),
          loopDir,
          // @ts-expect-error
          payload,
          this.updateSnapshots,
        );
      } catch (error) {
        logger.error(`❌ Request verification failed for ${loopDir}: ${error}`);
        if (!this.updateSnapshots) {
          throw error;
        }
      }
    } else {
      logger.info(`LLM request verification skipped for ${loopDir} (disabled in config)`);
    }

    // Call original hook if present
    if (this.originalRequestHook) {
      await this.originalRequestHook.call(this.agent, id, payload);
    }
  }

  /**
   * Mock the LLM response hook
   */
  protected async onLLMResponse(id: string, payload: LLMResponseHookPayload): Promise<void> {
    // Simply log the response hook call
    const currentLoop = this.agent.getCurrentLoopIteration();
    logger.debug(`LLM response hook called for loop ${currentLoop}`);

    // Call original hook if present
    if (this.originalResponseHook) {
      await this.originalResponseHook.call(this.agent, id, payload);
    }
  }

  /**
   * Mock the streaming response hook
   */
  protected onLLMStreamingResponse(id: string, payload: LLMStreamingResponseHookPayload): void {
    const currentLoop = this.agent.getCurrentLoopIteration();
    logger.debug(`LLM onStreamingResponseHook called for loop ${currentLoop}`);

    // Call original hook if present
    if (this.originalStreamingResponseHook) {
      this.originalStreamingResponseHook.call(this.agent, id, payload);
    }
  }

  /**
   * Hook implementation for before tool call
   */
  protected onBeforeToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    args: unknown,
  ): unknown {
    const currentLoop = this.agent.getCurrentLoopIteration();

    // Record starting time to calculate execution time later
    this.startTimeByToolCall[toolCall.toolCallId] = Date.now();

    // Load expected tool calls from snapshot
    if (this.verifyToolCalls) {
      this.loadToolCallsFromSnapshot(currentLoop).catch((error) => {
        logger.error(`Error loading tool calls from snapshot: ${error}`);
        if (!this.updateSnapshots) {
          this.lastError = error instanceof Error ? error : new Error(String(error));
        }
      });
    }

    // Add tool call to the current loop's collection
    if (!this.toolCallsByLoop[currentLoop]) {
      this.toolCallsByLoop[currentLoop] = [];
    }

    this.toolCallsByLoop[currentLoop].push({
      toolCallId: toolCall.toolCallId,
      name: toolCall.name,
      args,
    });

    logger.debug(
      `Tool call intercepted for ${toolCall.name} (${toolCall.toolCallId}) in loop ${currentLoop}`,
    );

    // Call original hook if present
    if (this.originalBeforeToolCallHook) {
      return this.originalBeforeToolCallHook.call(this.agent, id, toolCall, args);
    }

    return args;
  }

  /**
   * Hook implementation for after tool call
   */
  protected onAfterToolCall(
    id: string,
    toolCall: { toolCallId: string; name: string },
    result: unknown,
  ): unknown {
    const currentLoop = this.agent.getCurrentLoopIteration();
    const executionTime =
      Date.now() - (this.startTimeByToolCall[toolCall.toolCallId] || Date.now());

    // Find and update the corresponding tool call record
    if (this.toolCallsByLoop[currentLoop]) {
      const toolCallData = this.toolCallsByLoop[currentLoop].find(
        (tc) => tc.toolCallId === toolCall.toolCallId,
      );

      if (toolCallData) {
        toolCallData.result = result;
        toolCallData.executionTime = executionTime;
      }
    }

    logger.debug(
      `Tool call result intercepted for ${toolCall.name} (${toolCall.toolCallId}) in loop ${currentLoop}`,
    );

    // Verify tool calls if enabled
    if (this.verifyToolCalls) {
      this.verifyToolCallsForLoop(currentLoop).catch((error) => {
        logger.error(`Error verifying tool calls: ${error}`);
        if (!this.updateSnapshots) {
          this.lastError = error instanceof Error ? error : new Error(String(error));
        }
      });
    }

    // Call original hook if present
    if (this.originalAfterToolCallHook) {
      return this.originalAfterToolCallHook.call(this.agent, id, toolCall, result);
    }

    return result;
  }

  /**
   * Hook implementation for tool call error
   */
  protected onToolCallError(
    id: string,
    toolCall: { toolCallId: string; name: string },
    error: unknown,
  ): unknown {
    const currentLoop = this.agent.getCurrentLoopIteration();
    const executionTime =
      Date.now() - (this.startTimeByToolCall[toolCall.toolCallId] || Date.now());

    // Find and update the corresponding tool call record
    if (this.toolCallsByLoop[currentLoop]) {
      const toolCallData = this.toolCallsByLoop[currentLoop].find(
        (tc) => tc.toolCallId === toolCall.toolCallId,
      );

      if (toolCallData) {
        toolCallData.error = error;
        toolCallData.executionTime = executionTime;
      }
    }

    logger.debug(
      `Tool call error intercepted for ${toolCall.name} (${toolCall.toolCallId}) in loop ${currentLoop}`,
    );

    // Verify tool calls if enabled
    if (this.verifyToolCalls) {
      this.verifyToolCallsForLoop(currentLoop).catch((error) => {
        logger.error(`Error verifying tool calls: ${error}`);
        if (!this.updateSnapshots) {
          this.lastError = error instanceof Error ? error : new Error(String(error));
        }
      });
    }

    // Call original hook if present
    if (this.originalToolCallErrorHook) {
      return this.originalToolCallErrorHook.call(this.agent, id, toolCall, error);
    }

    return `Error: ${error}`;
  }

  /**
   * Hook implementation for process tool calls
   */
  async onProcessToolCalls(
    id: string,
    toolCalls: ChatCompletionMessageToolCall[],
  ): Promise<ToolCallResult[] | undefined> {
    // Only intercept if we're verifying tool calls
    if (!this.verifyToolCalls) {
      return undefined;
    }

    const currentLoop = this.agent.getCurrentLoopIteration();
    const loopDir = `loop-${currentLoop}`;

    try {
      // Load saved tool calls from the snapshot
      const savedToolCalls = await this.snapshotManager?.readSnapshot<ToolCallData[]>(
        path.basename(this.snapshotPath),
        loopDir,
        'tool-calls.jsonl',
      );

      if (!savedToolCalls || savedToolCalls.length === 0) {
        logger.warn(`No saved tool calls found for ${loopDir}, executing real tools`);
        return undefined;
      }

      if (savedToolCalls.length !== toolCalls.length) {
        logger.warn(
          `Tool call count mismatch in ${loopDir}: expected ${toolCalls.length} but found ${savedToolCalls.length} in snapshot`,
        );
        // Still attempt to use what we have
      }

      // Map saved tool calls to tool call results
      const results: ToolCallResult[] = [];

      for (let i = 0; i < toolCalls.length; i++) {
        const toolCall = toolCalls[i];
        // Find matching saved tool call by name and args
        const savedToolCall = savedToolCalls.find((stc) => stc.name === toolCall.function.name);

        if (savedToolCall) {
          // Use result from saved tool call
          results.push({
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            content: savedToolCall.result || savedToolCall.error || 'No result in snapshot',
          });
        } else {
          // If no matching tool call found, create a placeholder
          logger.warn(
            `No matching saved tool call found for ${toolCall.function.name} in ${loopDir}`,
          );
          results.push({
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            content: `Mock result: No saved result found for this tool in snapshot`,
          });
        }
      }

      logger.info(`Replaying ${results.length} tool call results from snapshot`);
      return results;
    } catch (error) {
      logger.error(`Error replaying tool calls: ${error}`);
      return undefined; // Fall back to real tool execution
    }
  }

  /**
   * Load tool calls from snapshot for a specific loop
   */
  private async loadToolCallsFromSnapshot(loopNumber: number): Promise<void> {
    if (!this.snapshotManager) return;

    const loopDir = `loop-${loopNumber}`;
    const toolCalls = await this.snapshotManager.readSnapshot<ToolCallData[]>(
      path.basename(this.snapshotPath),
      loopDir,
      'tool-calls.jsonl',
    );

    // If no tool calls found in snapshot, that's ok - might be first run
    if (!toolCalls || toolCalls.length === 0) {
      logger.debug(`No tool calls found in snapshot for ${loopDir}`);
      return;
    }

    logger.debug(`Loaded ${toolCalls.length} tool calls from snapshot for ${loopDir}`);
  }

  /**
   * Verify tool calls against snapshot for a specific loop
   */
  private async verifyToolCallsForLoop(loopNumber: number): Promise<void> {
    if (!this.snapshotManager || !this.toolCallsByLoop[loopNumber]) return;

    const loopDir = `loop-${loopNumber}`;

    try {
      await this.snapshotManager.verifyToolCallsSnapshot(
        path.basename(this.snapshotPath),
        loopDir,
        this.toolCallsByLoop[loopNumber],
        this.updateSnapshots,
      );
      logger.success(`✅ Tool calls verification succeeded for ${loopDir}`);
    } catch (error) {
      logger.error(`❌ Tool calls verification failed for ${loopDir}: ${error}`);
      if (!this.updateSnapshots) {
        throw error;
      }
    }
  }

  /**
   * Mock the agent loop end hook to verify final event stream state
   */
  protected async onAgentLoopEnd(id: string): Promise<void> {
    if (!this.snapshotPath || !this.snapshotManager || !this.agent) {
      throw new Error('LLMMocker not properly set up');
    }

    logger.info(`🔄 Agent loop execution completed`);

    // Get the final event stream state
    const finalEvents = this.agent.getEventStream().getEvents();
    this.finalEventStreamState = finalEvents;

    // Verify final event stream state if enabled
    if (this.verifyEventStreams) {
      try {
        logger.info(`🔍 Verifying final event stream state after agent completion`);
        await this.snapshotManager.verifyEventStreamSnapshot(
          path.basename(this.snapshotPath),
          '', // Root level snapshot
          JSON.parse(JSON.stringify(finalEvents)), // Deep-clone it
          this.updateSnapshots,
        );
        logger.success(`✅ Final event stream verification succeeded`);
      } catch (error) {
        logger.error(`❌ Final event stream verification failed: ${error}`);
        if (!this.updateSnapshots) {
          throw error;
        }
      }
    } else {
      logger.info(`Final event stream verification skipped (disabled in config)`);
    }

    // Perform cleanup of any leftover actual files if all verifications passed
    if (!this.hasError() && this.snapshotManager) {
      await this.snapshotManager.cleanupAllActualFiles(path.basename(this.snapshotPath));
    }

    // Call original hook if present
    if (this.originalLoopEndHook) {
      await this.originalLoopEndHook.call(this.agent, id);
    }
  }

  /**
   * Get the event stream state after a specific loop
   */
  getEventStreamStateAfterLoop(loopNumber: number): Event[] {
    const events = this.eventStreamStatesByLoop.get(loopNumber);
    if (!events) {
      throw new Error(`No event stream state found for loop ${loopNumber}`);
    }
    return events;
  }
}
