/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import {
  AgentEventStream,
  AgentStatus,
  AgioProviderImpl,
  ChatCompletionContentPart,
  IAgent,
} from '@tarko/agent-server-interface';
import { AgentSnapshot } from '@multimodal/agent-snapshot';
import { EventStreamBridge } from '../utils/event-stream';
import type { AgentServer } from '../server';
import { AgioEvent } from '@multimodal/agio';
import { handleAgentError, ErrorWithCode } from '../utils/error-handler';

/**
 * Check if an event should be stored in persistent storage
 * Filters out streaming events that are only needed for real-time updates
 * but not for replay/sharing functionality
 */
function shouldStoreEvent(event: AgentEventStream.Event): boolean {
  // Filter out streaming events that cause performance issues during replay
  const streamingEventTypes: AgentEventStream.EventType[] = [
    'assistant_streaming_message',
    'assistant_streaming_thinking_message',
    'assistant_streaming_tool_call',
    'final_answer_streaming',
  ];

  return !streamingEventTypes.includes(event.type);
}

/**
 * Response type for agent query execution
 */
export interface AgentQueryResponse<T = any> {
  success: boolean;
  result?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * AgentSession - Represents a single agent execution context
 *
 * Responsible for:
 * - Managing a generic Agent instance and its lifecycle
 * - Connecting agent events to clients via EventStreamBridge
 * - Handling queries and interactions with the agent
 * - Persisting events to storage
 * - Collecting AGIO monitoring events if configured
 */
export class AgentSession {
  id: string;
  agent: IAgent;
  eventBridge: EventStreamBridge;
  private unsubscribe: (() => void) | null = null;
  private agioProvider?: AgioEvent.AgioProvider;

  constructor(
    private server: AgentServer,
    sessionId: string,
    agioProviderImpl?: AgioProviderImpl,
    workingDirectory?: string,
  ) {
    this.id = sessionId;
    this.eventBridge = new EventStreamBridge();

    // Get agent options from server
    const agentOptions = { ...server.appConfig };

    // Update workspace directory if provided
    if (workingDirectory && agentOptions.workspace) {
      agentOptions.workspace.workingDirectory = workingDirectory;
    }

    // Create agent instance using the server's factory method
    const agent = server.createAgent();

    // Initialize agent snapshot if enabled
    if (agentOptions.snapshot?.enable) {
      const snapshotStoragesDirectory =
        agentOptions.snapshot.storageDirectory ?? agentOptions.workspace?.workingDirectory;

      if (snapshotStoragesDirectory) {
        const snapshotPath = path.join(snapshotStoragesDirectory, sessionId);
        // @ts-expect-error
        this.agent = new AgentSnapshot(agent, {
          snapshotPath,
          snapshotName: sessionId,
        }) as unknown as IAgent;

        // Log snapshot initialization if agent has logger
        if ('logger' in agent) {
          (agent as any).logger.debug(`AgentSnapshot initialized with path: ${snapshotPath}`);
        }
      } else {
        this.agent = agent;
      }
    } else {
      this.agent = agent;
    }

    // Initialize AGIO collector if provider URL is configured
    if (agentOptions.agio?.provider && agioProviderImpl) {
      const impl = agioProviderImpl;
      this.agioProvider = new impl(agentOptions.agio.provider, agentOptions, sessionId, this.agent);

      // Log AGIO initialization if agent has logger
      if ('logger' in this.agent) {
        (this.agent as any).logger.debug(
          `AGIO collector initialized with provider: ${agentOptions.agio.provider}`,
        );
      }
    }

    // Log agent configuration if agent has logger and getOptions method
    if ('logger' in this.agent && 'getOptions' in this.agent) {
      (this.agent as any).logger.info(
        'Agent Config',
        JSON.stringify((this.agent as any).getOptions(), null, 2),
      );
    }
  }

  /**
   * Get the current processing status of the agent
   * @returns Whether the agent is currently processing a request
   */
  getProcessingStatus(): boolean {
    return this.agent.status() === AgentStatus.EXECUTING;
  }

  async initialize() {
    await this.agent.initialize();

    // Send agent initialization event to AGIO if configured
    if (this.agioProvider) {
      try {
        await this.agioProvider.sendAgentInitialized();
      } catch (error) {
        console.error('Failed to send AGIO initialization event:', error);
      }
    }

    // Connect to agent's event stream manager
    const agentEventStream = this.agent.getEventStream();

    // Create an event handler that saves events to storage and processes AGIO events
    const handleEvent = async (event: AgentEventStream.Event) => {
      // If we have storage, save the event (filtered for performance)
      if (this.server.storageProvider && shouldStoreEvent(event)) {
        try {
          await this.server.storageProvider.saveEvent(this.id, event);
        } catch (error) {
          console.error(`Failed to save event to storage: ${error}`);
        }
      }

      // Process AGIO events if collector is configured
      if (this.agioProvider) {
        try {
          await this.agioProvider.processAgentEvent(event);
        } catch (error) {
          console.error('Failed to process AGIO event:', error);
        }
      }
    };

    // Subscribe to events for storage and AGIO processing
    const storageUnsubscribe = agentEventStream.subscribe(handleEvent);

    // Connect to event bridge for client communication
    this.unsubscribe = this.eventBridge.connectToAgentEventStream(agentEventStream);

    // Notify client that session is ready
    this.eventBridge.emit('ready', { sessionId: this.id });

    return { storageUnsubscribe };
  }

  /**
   * Run a query and return a strongly-typed response
   * This version captures errors and returns structured response objects
   * @param query The query to process
   * @returns Structured response with success/error information
   */
  async runQuery(query: string | ChatCompletionContentPart[]): Promise<AgentQueryResponse> {
    try {
      // Run agent to process the query
      const result = await this.agent.run({
        input: query,
      });
      return {
        success: true,
        result,
      };
    } catch (error) {
      // Emit error event but don't throw
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });

      // Handle error and return structured response
      const handledError = handleAgentError(error, `Session ${this.id}`);

      return {
        success: false,
        error: {
          code: handledError.code,
          message: handledError.message,
          details: handledError.details,
        },
      };
    }
  }

  /**
   * Execute a streaming query with robust error handling
   * @param query The query to process in streaming mode
   * @returns AsyncIterable of events or error response
   */
  async runQueryStreaming(
    query: string | ChatCompletionContentPart[],
  ): Promise<AsyncIterable<AgentEventStream.Event>> {
    try {
      // Run agent in streaming mode
      return await this.agent.run({
        input: query,
        stream: true,
      });
    } catch (error) {
      // Emit error event
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });

      // Handle error and return a synthetic event stream with the error
      const handledError = handleAgentError(error, `Session ${this.id} (streaming)`);

      // Create a synthetic event stream that yields just an error event
      return this.createErrorEventStream(handledError);
    }
  }

  /**
   * Create a synthetic event stream containing an error event
   * This allows streaming endpoints to handle errors gracefully
   */
  private async *createErrorEventStream(
    error: ErrorWithCode,
  ): AsyncIterable<AgentEventStream.Event> {
    yield this.agent.getEventStream().createEvent('system', {
      level: 'error',
      message: error.message,
      details: {
        errorCode: error.code,
        details: error.details,
      },
    });
  }

  /**
   * Abort the currently running query
   * @returns True if the agent was running and aborted successfully
   */
  async abortQuery(): Promise<boolean> {
    try {
      const aborted = this.agent.abort();
      if (aborted) {
        this.eventBridge.emit('aborted', { sessionId: this.id });
      }
      return aborted;
    } catch (error) {
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async cleanup() {
    // Unsubscribe from event stream
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Clean up agent resources
    await this.agent.dispose();

    if (this.agioProvider) {
      // This ensures that all buffered analytics events are sent before the session is terminated.
      await this.agioProvider.cleanup?.();
    }

    this.eventBridge.emit('closed', { sessionId: this.id });
  }
}

export default AgentSession;
