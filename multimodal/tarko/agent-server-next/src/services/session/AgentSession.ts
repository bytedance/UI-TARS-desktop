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
  SessionInfo,
  AgentAppConfig,
} from '@tarko/interface';
import { AgentSnapshot } from '@tarko/agent-snapshot';
import { EventStreamBridge } from '../../utils/event-stream';
import type { AgentServer, ILogger } from '../../types';
import { AgioEvent } from '@tarko/agio';
import { handleAgentError, ErrorWithCode } from '../../utils/error-handler';
import { getAvailableModels, getDefaultModel } from '../../utils/model-utils';
import { getLogger } from '../../utils/logger';

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
  private agioProviderConstructor?: AgioProviderConstructor;
  private sessionInfo?: SessionInfo;
  private logger: ILogger;
  /**
   * Create event handler for storage and AGIO processing
   */
  private createEventHandler() {
    return async (event: AgentEventStream.Event) => {
      // Save to storage if available and event should be stored
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
  }

  /**
   * Setup event stream connections for storage and client communication
   */
  private setupEventStreams() {
    const agentEventStream = this.agent.getEventStream();
    const handleEvent = this.createEventHandler();

    // Subscribe to events for storage and AGIO processing
    const storageUnsubscribe = agentEventStream.subscribe(handleEvent);

    // Connect to event bridge for client communication
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.unsubscribe = this.eventBridge.connectToAgentEventStream(agentEventStream);

    return { storageUnsubscribe };
  }

  /**
   * Create and initialize a complete agent instance with all wrappers and configuration
   */
  private async createAndInitializeAgent(sessionInfo?: SessionInfo): Promise<IAgent> {
    // Get agent resolution
    const agentResolution = this.server.getCurrentAgentResolution();
    if (!agentResolution) {
      throw new Error('Cannot found available resolved agent');
    }

       // Get stored events for this session before creating the agent
    const storedEvents = this.server.storageProvider
      ? await this.server.storageProvider.getSessionEvents(this.id)
      : [];

    // Create agent options
    const agentOptions: AgentAppConfig = {
      ...this.server.appConfig,
      name: this.server.getCurrentAgentName(),
      model: this.resolveModelConfig(sessionInfo),
      sandboxUrl: sessionInfo?.metadata?.sandboxUrl,
      initialEvents: storedEvents, // 🎯 Pass initial events directly to agent
    };

    // Create base agent
    const baseAgent = new agentResolution.agentConstructor(agentOptions);

    // Apply snapshot wrapper if enabled
    const wrappedAgent = this.createAgentWithSnapshot(baseAgent, this.id);

    // Initialize the agent (this will automatically restore events)
    await wrappedAgent.initialize();

    // Initialize AGIO collector if provider URL is configured
    if (agentOptions.agio?.provider && this.agioProviderConstructor) {
      this.agioProvider = new this.agioProviderConstructor(
        agentOptions.agio.provider,
        agentOptions,
        this.id,
        wrappedAgent,
      );

      // Send agent initialization event to AGIO
      try {
        await this.agioProvider.sendAgentInitialized();
      } catch (error) {
        console.error('Failed to send AGIO initialization event:', error);
      }

      // Log AGIO initialization
      console.debug('AGIO collector initialized', { provider: agentOptions.agio.provider });
    }
    this.logger.info('create new agent with config: ',  JSON.stringify({
      agent: agentOptions.agent,
      share: agentOptions.share,
      workspace: agentOptions.workspace,
      thinking: agentOptions.thinking,
      name: agentOptions.name
    }, null, 2));

    return wrappedAgent;
  }

  /**
   * Resolve model configuration for agent creation
   */
  private resolveModelConfig(sessionInfo?: SessionInfo) {
    // Try to use session-specific model first
    if (sessionInfo?.metadata?.modelConfig) {
      const { provider, id: modelId } = sessionInfo.metadata.modelConfig;
      const availableModels = getAvailableModels(this.server.appConfig);
      const sessionModel = availableModels.find(
        (model) => model.provider === provider && model.id === modelId,
      );

      if (sessionModel) {
        return sessionModel;
      }

      // Log fallback warning if session model is not available
      if (this.server.isDebug) {
        console.warn('Session model not found, falling back to default', { provider, modelId });
      }
    }

    // Fall back to default model
    return getDefaultModel(this.server.appConfig);
  }

  /**
   * Create agent with snapshot support if enabled
   */
  private createAgentWithSnapshot(baseAgent: IAgent, sessionId: string): IAgent {
    const agentOptions = { ...this.server.appConfig };

    if (agentOptions.snapshot?.enable) {
      const snapshotStoragesDirectory =
        agentOptions.snapshot.storageDirectory ?? this.server.getCurrentWorkspace();

      if (snapshotStoragesDirectory) {
        const snapshotPath = path.join(snapshotStoragesDirectory, sessionId);
        const wrappedAgent = new AgentSnapshot(baseAgent as any, {
          snapshotPath,
          snapshotName: sessionId,
        }) as unknown as IAgent;

        // Log snapshot initialization
        console.debug('AgentSnapshot initialized', { snapshotPath });

        return wrappedAgent;
      }
    }

    return baseAgent;
  }

  constructor(
    private server: AgentServer,
    sessionId: string,
    agioProviderImpl?: AgioProviderConstructor,
    sessionInfo?: SessionInfo,
  ) {
    this.id = sessionId;
    this.eventBridge = new EventStreamBridge();
    this.sessionInfo = sessionInfo;
    this.agioProviderConstructor = agioProviderImpl;
    this.logger = getLogger('AgentSession');

    // Agent will be created and initialized in initialize() method
    this.agent = null as any; // Temporary placeholder
  }

  /**
   * Get the current processing status of the agent
   * @returns Whether the agent is currently processing a request
   */
  getProcessingStatus(): boolean {
    return this.agent.status() === AgentStatus.EXECUTING;
  }

  async initialize() {
    // Create and initialize agent with all wrappers
    this.agent = await this.createAndInitializeAgent(this.sessionInfo);

    // Setup event stream connections
    const { storageUnsubscribe } = this.setupEventStreams();

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
      content: string | ChatCompletionContentPart[];
      description?: string;
      metadata?: AgentEventStream.EnvironmentInputMetadata;
    };
  }): Promise<AgentQueryResponse> {
    try {
      // Set running session for exclusive mode
      this.server.setRunningSession(this.id);

      // Debug logging for issue #1150
      if (this.server.isDebug) {
        console.log('[DEBUG] Query started', {
          sessionId: this.id,
          queryType: typeof options.input === 'string' ? 'string' : 'ContentPart',
          queryPreview:
            typeof options.input === 'string'
              ? options.input.substring(0, 100) + '...'
              : '[ContentPart]',
        });
      }

      const runOptions: AgentRunNonStreamingOptions = {
        input: options.input,
        sessionId: this.id,
        environmentInput: options.environmentInput,
      };

      // Run agent to process the query
      const result = await this.agent.run(runOptions);

      // Debug logging for issue #1150
      if (this.server.isDebug) {
        console.log('[DEBUG] Query completed successfully', { sessionId: this.id });
      }

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

      // Debug logging for issue #1150
      if (this.server.isDebug) {
        console.log('[DEBUG] Query failed', { sessionId: this.id, error: handledError.message });
      }

      return {
        success: false,
        error: {
          code: handledError.code,
          message: handledError.message,
          details: handledError.details,
        },
      };
    } finally {
      // Clear running session for exclusive mode
      this.server.clearRunningSession(this.id);
    }
  }

  /**
   * Execute a streaming query with robust error handling
   * @param options The query options containing input and optional environment input
   * @returns AsyncIterable of events or error response
   */
  async runQueryStreaming(options: {
    input: string | ChatCompletionContentPart[];
    environmentInput?: {
      content: string | ChatCompletionContentPart[];
      description?: string;
      metadata?: AgentEventStream.EnvironmentInputMetadata;
    };
  }): Promise<AsyncIterable<AgentEventStream.Event>> {
    try {
      // Set running session for exclusive mode
      this.server.setRunningSession(this.id);

      // Debug logging for issue #1150
      if (this.server.isDebug) {
        console.log('[DEBUG] Streaming query started', {
          sessionId: this.id,
          queryType: typeof options.input === 'string' ? 'string' : 'ContentPart',
          queryPreview:
            typeof options.input === 'string'
              ? options.input.substring(0, 100) + '...'
              : '[ContentPart]',
        });
      }

      const runOptions: AgentRunStreamingOptions = {
        input: options.input,
        stream: true,
        sessionId: this.id,
        environmentInput: options.environmentInput,
      };

      // Run agent in streaming mode
      const stream = await this.agent.run(runOptions);

      // Wrap the stream to clear running session when done
      return this.wrapStreamForExclusiveMode(stream);
    } catch (error) {
      // Emit error event
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });

      // Handle error and return a synthetic event stream with the error
      const handledError = handleAgentError(error, `Session ${this.id} (streaming)`);

      // Debug logging for issue #1150
      if (this.server.isDebug) {
        console.log('[DEBUG] Streaming query failed', {
          sessionId: this.id,
          error: handledError.message,
        });
      }

      // Create a synthetic event stream that yields just an error event
      return this.createErrorEventStream(handledError);
    }
  }

  /**
   * Wrap a stream to clear running session when done (for exclusive mode)
   */
  private async *wrapStreamForExclusiveMode(
    stream: AsyncIterable<AgentEventStream.Event>,
  ): AsyncIterable<AgentEventStream.Event> {
    try {
      for await (const event of stream) {
        yield event;
      }

      // Debug logging for issue #1150
      if (this.server.isDebug) {
        console.log('[DEBUG] Streaming query completed', { sessionId: this.id });
      }
    } finally {
      // Clear running session for exclusive mode when stream ends
      this.server.clearRunningSession(this.id);
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
        // Clear running session for exclusive mode when aborted
        this.server.clearRunningSession(this.id);
      }
      return aborted;
    } catch (error) {
      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Store the updated model configuration for this session
   * The model will be used in subsequent queries via Agent.run() parameters
   * @param sessionInfo Updated session metadata with new model config
   */
  async updateModelConfig(sessionInfo: SessionInfo): Promise<void> {
    // Store the session metadata for use in future queries
    this.sessionInfo = sessionInfo;

    // Recreate agent with new model configuration
    try {
      // Clean up current agent and AGIO provider
      if (this.agent && typeof this.agent.dispose === 'function') {
        await this.agent.dispose();
      }
      if (this.agioProvider?.cleanup) {
        await this.agioProvider.cleanup();
      }

      // Create and initialize new agent with updated session info
      this.agent = await this.createAndInitializeAgent(sessionInfo);

      // Reconnect event streams
      this.setupEventStreams();
    } catch (error) {
      console.error('Failed to recreate agent for session', { sessionId: this.id, error });
      throw error;
    }
  }

  async cleanup() {
    // Clear running session for exclusive mode
    this.server.clearRunningSession(this.id);

    // Unsubscribe from event stream
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    // Clean up agent resources
    if (this.agent && typeof this.agent.dispose === 'function') {
      await this.agent.dispose();
    }

    if (this.agioProvider) {
      // This ensures that all buffered analytics events are sent before the session is terminated.
      await this.agioProvider.cleanup?.();
    }

    this.eventBridge.emit('closed', { sessionId: this.id });
  }
}

export default AgentSession;
