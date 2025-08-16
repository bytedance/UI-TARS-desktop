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
  ModelProviderName,
  AgentProcessingPhase,
  AgentStatusInfo,
} from '@tarko/interface';
import { getLogger } from '@tarko/shared-utils';

// Logger interface for type safety
interface Logger {
  log(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  success(message: string): void;
  infoWithData<T = any>(message: string, data?: T, transformer?: (value: T) => any): void;
  spawn(subPrefix: string): Logger;
  setLevel(level: any): void;
  getLevel(): any;
}
import { AgentSnapshot } from '@tarko/agent-snapshot';
import { EventStreamBridge } from '../utils/event-stream';
import type { AgentServer } from '../server';
import { AgioEvent } from '@tarko/agio';
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
 * Log entry interface for AgentSession log collection
 */
export interface LogEntry {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  source: 'agent' | 'system';
  message: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

/**
 * Log subscription callback type
 */
export type LogSubscriptionCallback = (log: LogEntry) => void;

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
  private sessionMetadata?: import('../storage').SessionMetadata;

  // Log collection properties
  private logBuffer: LogEntry[] = [];
  private logSubscribers: Set<LogSubscriptionCallback> = new Set();
  private maxLogBufferSize = 1000; // Configurable log buffer size

  constructor(
    private server: AgentServer,
    sessionId: string,
    agioProviderImpl?: AgioProviderConstructor,
    sessionMetadata?: import('../storage').SessionMetadata,
  ) {
    this.id = sessionId;
    this.eventBridge = new EventStreamBridge();
    this.sessionMetadata = sessionMetadata;

    // Get agent options from server
    const agentOptions = { ...server.appConfig };

    // Create collecting logger that wraps the original logger
    const collectingLogger = this.createCollectingLogger();

    // Create agent instance using the server's session-aware factory method
    const agent = server.createAgentWithSessionModel(sessionMetadata, {
      logger: collectingLogger, // Inject our collecting logger
    });

    // Initialize agent snapshot if enabled
    if (agentOptions.snapshot?.enable) {
      const snapshotStoragesDirectory =
        agentOptions.snapshot.storageDirectory ?? server.getCurrentWorkspace();

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
    this.addSystemLog('INFO', 'Query execution started', {
      query: typeof query === 'string' ? query : '[multimodal]',
    });

    try {
      // Prepare run options with session-specific model configuration
      // Emit TTFT initialization status
      this.eventBridge.emit('agent-status', {
        isProcessing: true,
        state: 'initializing',
        phase: 'query_preparation',
        message: 'Preparing to process your request...',
        estimatedTime: '5-15 seconds',
      } as AgentStatusInfo);

      const runOptions: AgentRunNonStreamingOptions = {
        input: query,
        sessionId: this.id,
      };

      // Run agent to process the query

      // Add model configuration if available in session metadata
      if (this.sessionMetadata?.metadata?.modelConfig) {
        runOptions.provider = this.sessionMetadata.metadata.modelConfig.provider as ModelProviderName;
        runOptions.model = this.sessionMetadata.metadata.modelConfig.modelId;
        console.log(
          `🎯 [AgentSession] Using session model: ${runOptions.provider}:${runOptions.model}`,
        );
        this.addSystemLog(
          'INFO',
          `Using session model: ${runOptions.provider}:${runOptions.model}`,
        );
      }

      // Run agent to process the query
      const result = await this.agent.run(runOptions);
      this.addSystemLog('INFO', 'Query execution completed successfully');

      return {
        success: true,
        result,
      };
    } catch (error) {
      this.addSystemLog(
        'ERROR',
        `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          error: error instanceof Error ? error.stack : String(error),
        },
      );

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
    this.addSystemLog('INFO', 'Streaming query execution started', {
      query: typeof query === 'string' ? query : '[multimodal]',
    });

    try {
      // Prepare run options with session-specific model configuration
      // Emit enhanced TTFT initialization status for streaming
      this.eventBridge.emit('agent-status', {
        isProcessing: true,
        state: 'initializing',
        phase: 'streaming_preparation',
        message: 'Preparing streaming response...',
        estimatedTime: '3-10 seconds for first token',
      } as AgentStatusInfo);

      const runOptions: AgentRunStreamingOptions = {
        input: query,
        stream: true,
        sessionId: this.id,
      };

      // Add model configuration if available in session metadata
      if (this.sessionMetadata?.metadata?.modelConfig) {
        runOptions.provider = this.sessionMetadata.metadata.modelConfig.provider as ModelProviderName;
        runOptions.model = this.sessionMetadata.metadata.modelConfig.modelId;
        console.log(
          `🎯 [AgentSession] Using session model for streaming: ${runOptions.provider}:${runOptions.model}`,
        );
        this.addSystemLog(
          'INFO',
          `Using session model for streaming: ${runOptions.provider}:${runOptions.model}`,
        );
      }

      // Run agent in streaming mode
      const result = await this.agent.run(runOptions);
      this.addSystemLog('INFO', 'Streaming query execution started successfully');

      return result;
    } catch (error) {
      this.addSystemLog(
        'ERROR',
        `Streaming query execution failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          error: error instanceof Error ? error.stack : String(error),
        },
      );

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
    this.addSystemLog('WARN', 'Query abort requested');

    try {
      const aborted = this.agent.abort();
      if (aborted) {
        this.addSystemLog('INFO', 'Query aborted successfully');
        this.eventBridge.emit('aborted', { sessionId: this.id });
      } else {
        this.addSystemLog('WARN', 'Query abort failed or no active query');
      }
      return aborted;
    } catch (error) {
      this.addSystemLog(
        'ERROR',
        `Query abort error: ${error instanceof Error ? error.message : String(error)}`,
      );

      this.eventBridge.emit('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Store the updated model configuration for this session
   * The model will be used in subsequent queries via Agent.run() parameters
   * @param sessionMetadata Updated session metadata with new model config
   */
  async updateModelConfig(sessionMetadata: import('../storage').SessionMetadata): Promise<void> {
    console.log(
      `🔄 [AgentSession] Storing model config for session ${this.id}: ${sessionMetadata.metadata?.modelConfig?.provider}:${sessionMetadata.metadata?.modelConfig?.modelId}`,
    );

    // Store the session metadata for use in future queries
    this.sessionMetadata = sessionMetadata;

    // Emit model updated event to client
    this.eventBridge.emit('model_updated', {
      sessionId: this.id,
      modelConfig: sessionMetadata.metadata?.modelConfig,
    });

    console.log(`✅ [AgentSession] Model config stored for session ${this.id}`);
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

  /**
   * Create a collecting logger that wraps the original logger
   * and captures all log entries for this session
   */
  private createCollectingLogger(): Logger {
    const originalLogger = getLogger('Core');

    return {
      log: (...args: any[]) => {
        originalLogger.log(...args);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'INFO',
          source: 'agent',
          message: this.formatLogMessage('', args),
          sessionId: this.id,
        });
      },

      debug: (...args: any[]) => {
        originalLogger.debug(...args);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'DEBUG',
          source: 'agent',
          message: this.formatLogMessage('', args),
          sessionId: this.id,
        });
      },

      info: (...args: any[]) => {
        originalLogger.info(...args);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'INFO',
          source: 'agent',
          message: this.formatLogMessage('', args),
          sessionId: this.id,
        });
      },

      warn: (...args: any[]) => {
        originalLogger.warn(...args);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'WARN',
          source: 'agent',
          message: this.formatLogMessage('', args),
          sessionId: this.id,
        });
      },

      error: (...args: any[]) => {
        originalLogger.error(...args);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'ERROR',
          source: 'agent',
          message: this.formatLogMessage('', args),
          sessionId: this.id,
        });
      },

      success: (message: string) => {
        originalLogger.success(message);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'SUCCESS',
          source: 'agent',
          message,
          sessionId: this.id,
        });
      },

      infoWithData: <T = any>(message: string, data?: T, transformer?: (value: T) => any) => {
        originalLogger.infoWithData(message, data, transformer);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'INFO',
          source: 'agent',
          message,
          sessionId: this.id,
          metadata: data ? { data: transformer ? transformer(data) : data } : undefined,
        });
      },

      spawn: (subPrefix: string): Logger => {
        const spawnedLogger = originalLogger.spawn(subPrefix);
        // Return a new collecting logger for the spawned instance
        return this.createCollectingLoggerWithPrefix(spawnedLogger, subPrefix);
      },

      setLevel: (level: any) => {
        originalLogger.setLevel(level);
      },

      getLevel: () => {
        return originalLogger.getLevel();
      },
    };
  }

  /**
   * Create a collecting logger with a specific prefix for spawned loggers
   */
  private createCollectingLoggerWithPrefix(baseLogger: Logger, prefix: string): Logger {
    return {
      log: (...args: any[]) => {
        baseLogger.log(...args);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'INFO',
          source: 'agent',
          message: `[${prefix}] ${this.formatLogMessage('', args)}`,
          sessionId: this.id,
        });
      },

      debug: (...args: any[]) => {
        baseLogger.debug(...args);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'DEBUG',
          source: 'agent',
          message: `[${prefix}] ${this.formatLogMessage('', args)}`,
          sessionId: this.id,
        });
      },

      info: (...args: any[]) => {
        baseLogger.info(...args);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'INFO',
          source: 'agent',
          message: `[${prefix}] ${this.formatLogMessage('', args)}`,
          sessionId: this.id,
        });
      },

      warn: (...args: any[]) => {
        baseLogger.warn(...args);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'WARN',
          source: 'agent',
          message: `[${prefix}] ${this.formatLogMessage('', args)}`,
          sessionId: this.id,
        });
      },

      error: (...args: any[]) => {
        baseLogger.error(...args);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'ERROR',
          source: 'agent',
          message: `[${prefix}] ${this.formatLogMessage('', args)}`,
          sessionId: this.id,
        });
      },

      success: (message: string) => {
        baseLogger.success(message);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'SUCCESS',
          source: 'agent',
          message: `[${prefix}] ${message}`,
          sessionId: this.id,
        });
      },

      infoWithData: <T = any>(message: string, data?: T, transformer?: (value: T) => any) => {
        baseLogger.infoWithData(message, data, transformer);
        this.addLogEntry({
          timestamp: Date.now(),
          level: 'INFO',
          source: 'agent',
          message: `[${prefix}] ${message}`,
          sessionId: this.id,
          metadata: data ? { data: transformer ? transformer(data) : data } : undefined,
        });
      },

      spawn: (subPrefix: string): Logger => {
        return this.createCollectingLoggerWithPrefix(
          baseLogger.spawn(subPrefix),
          `${prefix}:${subPrefix}`,
        );
      },

      setLevel: (level: any) => {
        baseLogger.setLevel(level);
      },

      getLevel: () => {
        return baseLogger.getLevel();
      },
    };
  }

  /**
   * Format log message from arguments
   */
  private formatLogMessage(message: string, args: any[]): string {
    if (args.length === 0) return message;

    const formattedArgs = args
      .map((arg) => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    return message ? `${message} ${formattedArgs}` : formattedArgs;
  }

  /**
   * Add a log entry to the buffer and notify subscribers
   */
  private addLogEntry(log: LogEntry): void {
    // Add to buffer
    this.logBuffer.push(log);

    // Limit buffer size
    if (this.logBuffer.length > this.maxLogBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxLogBufferSize);
    }

    // Notify subscribers
    this.logSubscribers.forEach((callback) => {
      try {
        callback(log);
      } catch (error) {
        console.error('Error in log subscriber:', error);
      }
    });
  }

  /**
   * Add a system log entry
   */
  private addSystemLog(level: LogEntry['level'], message: string, metadata?: any): void {
    this.addLogEntry({
      timestamp: Date.now(),
      level,
      source: 'system',
      message,
      sessionId: this.id,
      metadata,
    });
  }

  /**
   * Subscribe to log stream for this session
   * @param callback Function to call when new logs are added
   * @returns Unsubscribe function
   */
  subscribeToLogs(callback: LogSubscriptionCallback): () => void {
    this.logSubscribers.add(callback);
    return () => this.logSubscribers.delete(callback);
  }

  /**
   * Get historical logs for this session
   * @param level Optional minimum log level filter
   * @returns Array of log entries
   */
  getHistoricalLogs(level?: string): LogEntry[] {
    if (!level) return [...this.logBuffer];

    const levelPriority = { DEBUG: 0, INFO: 1, SUCCESS: 2, WARN: 3, ERROR: 4 };
    const minPriority = levelPriority[level as keyof typeof levelPriority] ?? 1;

    return this.logBuffer.filter((log) => levelPriority[log.level] >= minPriority);
  }

  /**
   * Clear the log buffer for this session
   */
  clearLogs(): void {
    this.logBuffer = [];
  }

  /**
   * Get log statistics for this session
   */
  getLogStats(): { total: number; byLevel: Record<string, number> } {
    const byLevel: Record<string, number> = {};

    this.logBuffer.forEach((log) => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    });

    return {
      total: this.logBuffer.length,
      byLevel,
    };
  }
}

export default AgentSession;
