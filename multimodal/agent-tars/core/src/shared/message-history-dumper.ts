/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { ConsoleLogger, LLMRequestHookPayload, LLMResponseHookPayload } from '@tarko/mcp-agent';

/**
 * Message history trace entry
 */
export interface MessageHistoryTrace {
  /** Type of the trace entry */
  type: 'request' | 'response';
  /** Timestamp when the entry was created */
  timestamp: number;
  /** Session/request identifier */
  id: string;
  /** The actual data payload */
  data: LLMRequestHookPayload | LLMResponseHookPayload;
}

/**
 * Output structure for message history dump
 */
export interface MessageHistoryOutput {
  /** Agent metadata */
  agent: {
    id: string;
    name: string;
  };
  /** Session identifier */
  sessionId: string;
  /** Current timestamp */
  timestamp: number;
  /** Array of trace entries */
  history: MessageHistoryTrace[];
}

/**
 * Configuration options for MessageHistoryDumper
 */
export interface MessageHistoryDumperOptions {
  /** Working directory where files will be saved */
  workspace: string;
  /** Agent identifier */
  agentId: string;
  /** Agent name */
  agentName: string;
  /** Logger instance for debugging */
  logger: ConsoleLogger;
}

/**
 * MessageHistoryDumper - Handles dumping LLM request/response traces to files
 *
 * This class provides a clean separation of concerns for message history functionality,
 * allowing agents to track and persist their LLM interactions for debugging and analysis.
 */
export class MessageHistoryDumper {
  private readonly options: MessageHistoryDumperOptions;
  private readonly traces: MessageHistoryTrace[] = [];

  constructor(options: MessageHistoryDumperOptions) {
    this.options = options;
  }

  /**
   * Add a request trace to the history
   *
   * @param sessionId - Session identifier
   * @param payload - LLM request payload
   */
  addRequestTrace(sessionId: string, payload: LLMRequestHookPayload): void {
    const trace: MessageHistoryTrace = {
      type: 'request',
      timestamp: Date.now(),
      id: sessionId,
      // Deep clone to prevent mutations affecting the trace
      data: JSON.parse(JSON.stringify(payload)) as LLMRequestHookPayload,
    };

    this.traces.push(trace);
    this.dumpToFile(sessionId);
  }

  /**
   * Add a response trace to the history
   *
   * @param sessionId - Session identifier
   * @param payload - LLM response payload
   */
  addResponseTrace(sessionId: string, payload: LLMResponseHookPayload): void {
    const trace: MessageHistoryTrace = {
      type: 'response',
      timestamp: Date.now(),
      id: sessionId,
      // Deep clone to prevent mutations affecting the trace
      data: JSON.parse(JSON.stringify(payload)) as LLMResponseHookPayload,
    };

    this.traces.push(trace);
    this.dumpToFile(sessionId);
  }

  /**
   * Get current traces (for testing or inspection)
   *
   * @returns Array of current traces
   */
  getTraces(): readonly MessageHistoryTrace[] {
    return [...this.traces];
  }

  /**
   * Clear all traces from memory
   */
  clearTraces(): void {
    this.traces.length = 0;
  }

  /**
   * Dump the current message history to a file
   *
   * @param sessionId - Session identifier used for filename
   */
  private dumpToFile(sessionId: string): void {
    try {
      const filename = `session_${sessionId}.json`;
      const filePath = path.join(this.options.workspace, filename);

      const output: MessageHistoryOutput = {
        agent: {
          id: this.options.agentId,
          name: this.options.agentName,
        },
        sessionId,
        timestamp: Date.now(),
        history: this.traces,
      };

      // Write with pretty formatting for better readability
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
      this.options.logger.debug(`📝 Message history updated in: ${filePath}`);
    } catch (error) {
      this.options.logger.error(
        `Failed to dump message history: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
