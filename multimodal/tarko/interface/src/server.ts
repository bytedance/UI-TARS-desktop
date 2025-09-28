/**
 * Enhanced runtime settings configuration with UI placement and enum labels support
 */
export interface AgentRuntimeSettings {
  /**
   * JSON Schema defining the structure and UI rendering of runtime settings
   */
  schema: AgentRuntimeSettingsSchema;
  /**
   * Optional transform function to convert runtime settings to agent-specific options
   * @param runtimeSettings - The current runtime settings values
   * @returns Transformed options that can be applied to the agent
   */
  transform?: (runtimeSettings: any) => any;
  /**
   * UI placement configuration
   * Controls where settings appear in the interface
   * @default 'dropdown-item'
   */
  placement?: 'dropdown-item' | 'chat-bottom';
}

/**
 * Enhanced JSON Schema for runtime settings with UI-specific extensions
 */
export interface AgentRuntimeSettingsSchema {
  type: 'object';
  properties: Record<string, AgentRuntimeSettingProperty>;
}

/**
 * Visibility condition for runtime settings
 * Defines when a setting should be visible based on other setting values
 */
export interface AgentRuntimeSettingVisibilityCondition {
  /** The key of the setting to check */
  dependsOn: string;
  /** The value that the dependent setting must have for this setting to be visible */
  when: any;
}

/**
 * Runtime setting property with enhanced UI support
 */
export interface AgentRuntimeSettingProperty {
  /** Property type */
  type: 'boolean' | 'string' | 'number';
  /** Display title for the setting */
  title?: string;
  /** Default value */
  default?: any;
  /** For string type: allowed enum values */
  enum?: string[];
  /** For enum type: display labels corresponding to enum values */
  enumLabels?: string[];
  /** Setting description */
  description?: string;
  /** Icon identifier for UI rendering */
  icon?: string;
  /** UI placement override for individual settings */
  placement?: 'dropdown-item' | 'chat-bottom';
  /** Visibility condition - when this setting should be shown */
  visible?: AgentRuntimeSettingVisibilityCondition;
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Use AgentRuntimeSettings instead
 */
export interface LegacyAgentRuntimeSettings {
  schema: Record<string, any>;
  transform?: (runtimeSettings: any) => any;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent } from '@tarko/agio';
import { IAgent, TConstructor, AgentOptions, AgentModel } from '@tarko/agent-interface';
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
   * If not specified, snapshots will be stored in the session's working directory
   */
  storageDirectory: string;
}

/**
 * Sandbox configuration for agent execution environments
 *
 * Defines the connection and authentication settings for sandbox instance management
 * where agents execute their tasks in isolated environments.
 */
export interface SandboxConfig {
  /**
   * Base URL of the sandbox manager service endpoint
   */
  baseUrl: string;

  /**
   * Static JWT token for sandbox manager authentication
   */
  jwtToken?: string;

  /**
   * Dynamic JWT token provider function
   * Use this for scenarios requiring token refresh or dynamic token generation
   * @returns Promise that resolves to a valid JWT token
   */
  getJwtToken?: () => Promise<string>;

  /**
   * Default time-to-live for sandbox instances in minutes
   */
  defaultTtlMinutes?: number;
}

/**
 * Tenant mode
 * @type {('multi' | 'single')}
 */
export interface TenantConfig {
  mode: 'multi' | 'single';
  auth: boolean;
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
    /**
     * Enable exclusive mode - reject new requests while an agent is running
     * @default false
     */
    exclusive?: boolean;
    /**
     * Available models for the agent server
     * These models will be merged with AgentOptions.model and made available for selection in the UI
     */
    models?: AgentModel[];
    /**
     * Runtime settings configuration
     * Defines user-configurable settings that can be adjusted during runtime
     */
    runtimeSettings?: AgentRuntimeSettings;
    /*
     * Sandbox config
     */
    sandbox?: SandboxConfig;

    /**
     * Tenant mode, default to single tenant, no auth required
     */
    tenant?: TenantConfig;
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

/**
 * Session item metadata interface - JSON schema design for extensibility
 */
export interface SessionItemMetadata {
  /**
   * Reserved version interface for backward compatibility
   */
  version?: number;
  /**
   * Session name
   */
  name?: string;
  /**
   * Session tags
   */
  tags?: string[];
  /**
   * Current using model configuration
   */
  modelConfig?: AgentModel;
  /**
   * Current using agent configuration
   */
  agentInfo?: {
    name: string;
    configuredAt: number;
    [key: string]: any; // Future agent info fields
  };
  /**
   * Current runtime settings configuration
   * User-adjustable settings that affect agent behavior during execution
   */
  runtimeSettings?: Record<string, any>;
  /** The sandbox associated with the current session */
  sandboxUrl?: string;
  /**
   * Future extensible fields
   */
  [key: string]: any;
}

/**
 * Session interface
 */
export interface SessionInfo {
  id: string;
  createdAt: number;
  updatedAt: number;
  workspace: string;
  metadata?: SessionItemMetadata;
  userId?: string;
}

/**
 * Legacy interface for backward compatibility during transition
 * @deprecated Use SessionInfo.metadata instead
 */
export interface LegacySessionItemInfo {
  id: string;
  createdAt: number;
  updatedAt: number;
  name?: string;
  workspace: string;
  tags?: string[];
  modelConfig?: {
    provider: string;
    id: string;
  };
}
