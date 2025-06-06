/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent } from './types';

/**
 * Configuration options for Agio
 */
export interface AgioConfig {
  /**
   * Endpoint URL to send events to
   */
  endpoint?: string;

  /**
   * Whether data collection is enabled
   * @default true if endpoint is provided
   */
  enabled?: boolean;

  /**
   * Custom client identifier
   */
  clientId?: string;

  /**
   * Buffer size before auto-flushing events
   * @default 10
   */
  bufferSize?: number;

  /**
   * Maximum buffer size when retrying
   * @default 100
   */
  maxBufferSize?: number;

  /**
   * Whether to automatically flush events periodically
   * @default true
   */
  autoFlush?: boolean;

  /**
   * Interval in milliseconds for auto-flushing
   * @default 10000 (10 seconds)
   */
  flushIntervalMs?: number;

  /**
   * Whether to retry sending events if the request fails
   * @default false
   */
  retryOnFailure?: boolean;

  /**
   * Additional headers to include with requests
   */
  headers?: Record<string, string>;

  /**
   * Function to transform events before sending
   * Return null to filter out an event
   */
  transformer?: (event: AgioEvent) => AgioEvent | null;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Create a configuration with default values filled in
 *
 * @param config Partial configuration
 * @returns Complete configuration with defaults
 */
export function createAgioConfig(config: Partial<AgioConfig> = {}): AgioConfig {
  return {
    enabled: !!config.endpoint,
    bufferSize: 10,
    maxBufferSize: 100,
    autoFlush: true,
    flushIntervalMs: 10000,
    retryOnFailure: false,
    debug: false,
    ...config,
  };
}
