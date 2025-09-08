/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentEventStream,
  AgentServerVersionInfo,
  SessionItemInfo,
  AgentWebUIImplementation,
} from '@tarko/interface';

/**
 * Input options for building agent UI replay HTML
 */
export interface AgentUIBuilderInputOptions {
  /** Session events to include in the replay */
  events: AgentEventStream.Event[];

  /** Session information */
  sessionInfo: SessionItemInfo;

  /** Path to static web UI files */
  staticPath: string;

  /** Optional server version info */
  serverInfo?: AgentServerVersionInfo;

  /** Optional web UI configuration to inject */
  uiConfig?: AgentWebUIImplementation;
}

/**
 * Output destination types
 */
export type OutputDestination = 'memory' | 'file' | 'custom';

/**
 * File system output options
 */
export interface FileSystemOutputOptions {
  /** Output file path */
  filePath: string;

  /** Whether to overwrite existing files */
  overwrite?: boolean;
}

/**
 * Custom post-processor function type
 */
export type PostProcessor = (html: string, metadata: SessionItemInfo) => Promise<string | void>;

/**
 * Output options for the generated HTML
 */
export interface AgentUIBuilderOutputOptions {
  /** Output destination type */
  destination: OutputDestination;

  /** File system options (required when destination is 'file') */
  fileSystem?: FileSystemOutputOptions;

  /** Custom post-processor function (used when destination is 'custom') */
  postProcessor?: PostProcessor;
}

/**
 * Complete builder options
 */
export interface AgentUIBuilderOptions {
  /** Input configuration */
  input: AgentUIBuilderInputOptions;

  /** Output configuration */
  output: AgentUIBuilderOutputOptions;
}

/**
 * Result of the build operation
 */
export interface AgentUIBuilderResult {
  /** Generated HTML content (always available) */
  html: string;

  /** File path (available when destination is 'file') */
  filePath?: string;

  /** Custom result from post-processor (available when destination is 'custom') */
  customResult?: string;

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
