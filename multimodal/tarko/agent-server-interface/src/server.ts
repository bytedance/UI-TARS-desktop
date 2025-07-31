/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent } from '@multimodal/agio';
import { IAgent, TConstructor, AgentOptions } from '@multimodal/agent-interface';

/**
 * Version information for the Agent Server
 * Contains build metadata that can be displayed in the UI
 */
export interface AgentServerVersionInfo {
  /** Version string from package.json */
  version: string;
  /** Build timestamp */
  buildTime: number;
  /** Git commit hash */
  gitHash: string;
}

export interface AgentServerSnapshotOptions {
  /**
   * Whether to enable snapshots for agent sessions
   * @default false
   */
  enable: boolean;

  /**
   * Directory to store agent snapshots
   * If not specified, snapshots will be stored in the session's working directory
   */
  storageDirectory: string;
}

/**
 * Storage configuration options
 */
export interface AgentServerStorageOptions {
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
 * Options implemented by Agent Server
 *
 * Defines all customizable aspects of the server including:
 * - Network configuration (port)
 * - Agent configuration
 * - File system paths
 * - Storage configuration
 * - Sharing capabilities
 * - AGIO monitoring integration
 */
export interface AgentServerOptions {
  /**
   * Server config
   */
  server?: {
    /**
     * Agent  Server port
     */
    port?: number;
    /**
     * Server Storage options.
     */
    storage?: AgentServerStorageOptions;
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
  snapshot?: AgentServerSnapshotOptions;
}

export type { TConstructor };

export type AgioProviderImpl<T extends AgentOptions = AgentOptions> = TConstructor<
  AgioEvent.AgioProvider,
  [string, T, string, IAgent]
>;
