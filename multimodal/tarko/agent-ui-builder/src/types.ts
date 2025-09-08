/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentEventStream,
  AgentServerVersionInfo,
  SessionInfo,
  AgentWebUIImplementation,
} from '@tarko/interface';

/**
 * Input options for building agent UI replay HTML
 */
export interface AgentUIBuilderInputOptions {
  /** Session events to include in the replay */
  events: AgentEventStream.Event[];

  /** Session information */
  sessionInfo: SessionInfo;

  /** Path to static web UI files (optional, will use built-in static files if not provided) */
  staticPath?: string;

  /** Optional server version info */
  serverInfo?: AgentServerVersionInfo;

  /** Optional web UI configuration to inject */
  uiConfig?: AgentWebUIImplementation;
}

/**
 * Post-processor function type that can return a URL
 */
export type PostProcessor = (html: string, metadata: SessionInfo) => Promise<string | void>;

/**
 * Output options for the generated HTML
 */
export interface AgentUIBuilderOutputOptions {
  /** File path to save HTML (optional) */
  filePath?: string;

  /** Post-processor function to handle the generated HTML (optional) */
  post?: PostProcessor;
}

/**
 * Result of the build operation
 */
export interface AgentUIBuilderResult {
  /** Generated HTML content (always available) */
  html: string;

  /** File path (available when destination is 'file') */
  filePath?: string;

  /** URL returned from post-processor (available when post-processor is used) */
  url?: string;

  /** Build metadata */
  metadata: {
    /** Size of generated HTML in bytes */
    size: number;

    /** Build timestamp */
    timestamp: number;

    /** Number of events included */
    eventCount: number;
  };
}
