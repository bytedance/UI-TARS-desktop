/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import fs from 'fs';
import { Agent } from '@multimodal/agent';
import { SnapshotManager } from './snapshot-manager';
import { logger } from './utils/logger';
import {
  Event,
  LLMRequestHookPayload,
  LLMResponseHookPayload,
  LLMStreamingResponseHookPayload,
  ChatCompletion,
  ChatCompletionChunk,
} from '@multimodal/agent-interface';
import { OpenAI } from 'openai';
import { AgentHookBase } from './agent-hook-base';
import { NormalizerConfig } from './utils/snapshot-normalizer';

interface LLMMockerSetupOptions {
  updateSnapshots?: boolean;
  normalizerConfig?: NormalizerConfig;
  verification?: {
    verifyLLMRequests?: boolean;
    verifyEventStreams?: boolean;
  };
}

/**
 * LLMMocker - Mocks LLM requests and responses for agent testing
 *
 * This class intercepts LLM requests from the agent, verifies they match
 * expected requests, and returns mock responses from snapshots.
 */
export class LLMMocker extends AgentHookBase {
  private totalLoops = 0;
  private updateSnapshots = false;
  private eventStreamStatesByLoop: Map<number, Event[]> = new Map();
  private finalEventStreamState: Event[] = [];
  private mockLLMClient: OpenAI | undefined = undefined;
  private verifyLLMRequests = true;
  private verifyEventStreams = true;

  /**
   * Set up the LLM mocker with an agent and test case
   */
  setup(
    agent: Agent,
    casePath: string,
    totalLoops: number,
    options: LLMMockerSetupOptions = {},
  ): void {
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

    // Create the snapshot manager with the normalizer config if provided
    this.snapshotManager = new SnapshotManager(path.dirname(casePath), options.normalizerConfig);

    // Hook the agent
    this.hookAgent();

    // Create a mock LLM client that will be injected into the agent
    this.mockLLMClient = this.createMockLLMClient();

    logger.info(`LLM mocker set up for ${this.snapshotName} with ${totalLoops} loops`);
    logger.info(
      `Verification settings: LLM requests: ${this.verifyLLMRequests ? 'enabled' : 'disabled'}, Event streams: ${this.verifyEventStreams ? 'enabled' : 'disabled'}`,
    );

    // Verify initial event stream state immediately after setup if enabled
    if (this.verifyEventStreams) {
      this.verifyInitialEventStreamState();
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
              throw new Error(`No mock response found for ${loopDir}`);
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
