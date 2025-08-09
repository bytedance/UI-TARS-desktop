/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent } from '@tarko/agio';
import { IAgent, TConstructor, AgentOptions } from '@tarko/agent-interface';
import { AgentImplementation } from './agent-implementation';
import { AgentWebUIImplementation } from './web-ui-implementation';
import { AgentStorageImplementation } from './storage-implementation';

/**
 * Global directory configuration options
 */
export interface GlobalDirectoryOptions {
  /**
   * Global workspace directory name
   * @default '.tarko'
   */
  globalWorkspaceDir?: string;
}

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
   * @default "~/.tarko/snapshots"
   * If not specified, snapshots will be stored in ~/.tarko/snapshots
   */
  storageDirectory?: string;
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
 * - Global directory configuration
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
    storage?: AgentStorageImplementation;
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
   * Configuration for agent snapshots
   * Controls whether to create and store snapshots of agent executions
   */
  snapshot?: AgentServerSnapshotOptions;
  /**
   * Agent implementation options.
   */
  agent?: AgentImplementation;
  /**
   * Agent Web UI implementation options.
   */
  webui?: AgentWebUIImplementation;
}

export type { TConstructor };

export type AgioProviderConstructor<T extends AgentOptions = AgentOptions> = TConstructor<
  AgioEvent.AgioProvider,
  [string, T, string, IAgent]
>;
