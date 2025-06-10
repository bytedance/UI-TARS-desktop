/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent } from '@multimodal/agio';
import { AgentTARSAppConfig } from './config';
import { IAgent } from '@mcp-agent/interface';

export interface ServerSnapshotOptions {
  /**
   * Whether to enable snapshots for agent sessions
   * @default false
   */
  enable: boolean;

  /**
   * Path to store agent snapshots
   * If not specified, snapshots will be stored in the session's working directory
   */
  snapshotPath: string;
}

/**
 * Storage configuration options
 */
export interface ServerStorageOptions {
  /** Storage type: 'memory', 'file', 'sqlite', or 'database' */
  type: 'memory' | 'file' | 'sqlite' | 'database';
  /** File path for file-based storage or SQLite database */
  path?: string;
  /** Database connection configuration for database storage */
  database?: {
    url: string;
    name?: string;
    [key: string]: any;
  };
}

/**
 * Options implemented by Agent TARS Server
 *
 * Defines all customizable aspects of the server including:
 * - Network configuration (port)
 * - Agent configuration
 * - File system paths
 * - Storage configuration
 * - Sharing capabilities
 * - AGIO monitoring integration
 */
export interface AgentTARSServerOptions {
  /**
   * Server config
   */
  server?: {
    /**
     * Agent TARS Server port
     */
    port?: number;
    /**
     * Server Storage options.
     */
    storage?: ServerStorageOptions;
  };
  /**
   * Share config
   */
  share?: {
    /**
     * Share provider base url
     */
    provider?: string;
  };
  /**
   * Agio config
   */
  agio?: {
    /**
     * AGIO provider URL for monitoring events
     * When configured, the server will send standardized monitoring events
     * to the specified endpoint for operational insights and analytics
     */
    provider?: string;
  };
  /**
   * web ui config
   */
  ui?: {
    /**
     * Web UI path.
     */
    staticPath?: string;
  };
  /**
   * Configuration for agent snapshots
   * Controls whether to create and store snapshots of agent executions
   */
  snapshot?: ServerSnapshotOptions;
}

export type TConstructor<T, U extends unknown[] = unknown[]> = new (...args: U) => T;

export type AgioProviderImpl = TConstructor<
  AgioEvent.AgioProvider,
  [string, AgentTARSAppConfig, string, IAgent]
>;
