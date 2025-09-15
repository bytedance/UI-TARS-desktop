/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import {
  AgentEventStream,
  AgentRunNonStreamingOptions,
  AgentRunStreamingOptions,
  AgentStatus,
  AgioProviderConstructor,
  ChatCompletionContentPart,
  IAgent,
  AgentStatusInfo,
  SessionInfo,
} from '@tarko/interface';
import { AgentSnapshot } from '@tarko/agent-snapshot';
import { EventStreamBridge } from '../../utils/event-stream';
import type { AgentServer } from '../../types';
import { AgioEvent } from '@tarko/agio';
import { handleAgentError } from '../../utils/error-handler';

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
  private sessionInfo?: SessionInfo;

  constructor(
    private server: AgentServer,
    sessionInfo: SessionInfo,
    agioProviderImpl?: AgioProviderConstructor,
  ) {
    this.id = sessionInfo.id;
    this.eventBridge = new EventStreamBridge();
    this.sessionInfo = sessionInfo;

    // Get agent options from server
    const agentOptions = { ...server.appConfig };

    // Create agent instance using the server's session-aware factory method
    const agent = server.createAgentWithSessionModel(sessionInfo);

    // Initialize agent snapshot if enabled
    if (agentOptions.snapshot?.enable) {
      const snapshotStoragesDirectory =
        agentOptions.snapshot.storageDirectory ?? server.getCurrentWorkspace();

      if (snapshotStoragesDirectory) {
        const snapshotPath = path.join(snapshotStoragesDirectory, this.id);
        // @ts-expect-error
        this.agent = new AgentSnapshot(agent, {
          snapshotPath,
          snapshotName: this.id,
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
      this.agioProvider = new impl(agentOptions.agio.provider, agentOptions, this.id, this.agent);

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
    const initStartTime = Date.now();

    const agentInitStartTime = Date.now();
    await this.agent.initialize();
    const agentInitDuration = Date.now() - agentInitStartTime;

    console.log(
      `[AgentSession] agent.initialize() took ${agentInitDuration}ms for session ${this.id}`,
    );

    // Send agent initialization event to AGIO if configured
    if (this.agioProvider) {
      try {
        await this.agioProvider.sendAgentInitialized();
      } catch (error) {
        console.error('Failed to send AGIO initialization event:', error);
      }
    }

    const totalInitDuration = Date.now() - initStartTime;
    console.log(
      `[AgentSession] Total initialization took ${totalInitDuration}ms for session ${this.id}`,
    );

    // Log to agent if it has a logger
    if ('logger' in this.agent) {
      (this.agent as any).logger.info('Session initialization completed', {
        sessionId: this.id,
        agentInitDuration,
        totalInitDuration,
      });
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
   * @param options The query options containing input and optional environment input
   * @returns Structured response with success/error information
   */
  async runQuery(options: {
    input: string | ChatCompletionContentPart[];
    environmentInput?: {
      content: string;
      description?: string;
      metadata?: Record<string, any>;
    };
  }): Promise<AgentQueryResponse> {
    try {
      // Set exclusive mode if enabled
      if (this.server.isExclusive) {
        this.server.setRunningSession(this.id);
      }

      const result = await this.agent.run(options as AgentRunNonStreamingOptions);
      return { success: true, result };
    } catch (error) {
      const errorResponse = handleAgentError(error);
      return { success: false, error: errorResponse };
    } finally {
      // Clear exclusive mode if enabled
      if (this.server.isExclusive) {
        this.server.clearRunningSession(this.id);
      }
    }
  }

  /**
   * Run a streaming query that returns an async iterator
   * @param options The query options containing input and optional environment input
   * @returns Async iterator for streaming events
   */
  async runQueryStreaming(options: {
    input: string | ChatCompletionContentPart[];
    environmentInput?: {
      content: string;
      description?: string;
      metadata?: Record<string, any>;
    };
  }): Promise<AsyncIterable<AgentEventStream.Event>> {
    try {
      // Set exclusive mode if enabled
      if (this.server.isExclusive) {
        this.server.setRunningSession(this.id);
      }

      // Use the streaming version of run method
      const streamingOptions = {
        ...options,
        stream: true,
      } as AgentRunStreamingOptions;

      return await this.agent.run(streamingOptions);
    } catch (error) {
      // For streaming, we need to return an async iterable that yields the error
      const errorResponse = handleAgentError(error);
      return (async function* () {
        yield {
          type: 'system',
          level: 'error',
          message: errorResponse.message || 'Unknown error occurred',
          timestamp: Date.now(),
        } as AgentEventStream.Event;
      })();
    } finally {
      // Clear exclusive mode if enabled
      if (this.server.isExclusive) {
        this.server.clearRunningSession(this.id);
      }
    }
  }

  /**
   * Abort the current running query
   * @returns Promise that resolves when the abort is complete
   */
  async abortQuery(): Promise<boolean> {
    try {
      await this.agent.abort();
      return true;
    } catch (error) {
      console.error('Failed to abort query:', error);
      return false;
    }
  }

  /**
   * Get current status information for the agent
   * @returns Status information including processing state and agent details
   */
  getStatus(): {
    isProcessing: boolean;
    state: AgentStatus;
    sessionId: string;
    agentInfo?: AgentStatusInfo;
  } {
    const isProcessing = this.getProcessingStatus();
    const state = this.agent.status();

    let agentInfo: AgentStatusInfo | undefined;
    if ('getStatusInfo' in this.agent) {
      try {
        agentInfo = (this.agent as any).getStatusInfo();
      } catch {
        // Ignore errors getting status info
      }
    }

    return {
      isProcessing,
      state,
      sessionId: this.id,
      agentInfo,
    };
  }

  /**
   * Store the updated model configuration for this session
   * The model will be used in subsequent queries via Agent.run() parameters
   * @param sessionInfo Updated session metadata with new model config
   */
  async updateModelConfig(sessionInfo: SessionInfo): Promise<void> {
    console.log(
      `🔄 [AgentSession] Storing model config for session ${this.id}: ${sessionInfo.metadata?.modelConfig?.provider}:${sessionInfo.metadata?.modelConfig?.modelId}`,
    );

    // Store the session metadata for use in future queries
    this.sessionInfo = sessionInfo;

    // Emit model updated event to client
    this.eventBridge.emit('model_updated', {
      sessionId: this.id,
      modelConfig: sessionInfo.metadata?.modelConfig,
    });

    console.log(`✅ [AgentSession] Model config updated for session ${this.id}`);
  }

  /**
   * Cleanup resources when session is destroyed
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanup(): Promise<void> {
    try {
      // Unsubscribe from event stream
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }

      // Clean up AGIO provider
      if (this.agioProvider && 'cleanup' in this.agioProvider) {
        try {
          await (this.agioProvider as any).cleanup();
        } catch (error) {
          console.error('Failed to cleanup AGIO provider:', error);
        }
      }

      // Clean up agent if it has a cleanup method
      if ('cleanup' in this.agent) {
        try {
          await (this.agent as any).cleanup();
        } catch (error) {
          console.error('Failed to cleanup agent:', error);
        }
      }

      // Clear exclusive mode if this session was running
      if (this.server.isExclusive && this.server.getRunningSessionId() === this.id) {
        this.server.clearRunningSession(this.id);
      }
    } catch (error) {
      console.error('Error during session cleanup:', error);
    }
  }
}
