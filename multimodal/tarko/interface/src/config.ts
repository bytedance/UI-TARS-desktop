/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentServerOptions } from './server';
import { AgentOptions, Tool, ToolCallEngineType } from '@tarko/agent-interface';

export type AgentAppConfig<T extends AgentOptions = AgentOptions> = T & AgentServerOptions;

/**
 * Sanitized tool interface that excludes function implementations for serialization
 */
export type SanitizedTool = Omit<Tool, 'function'> & {
  // Keep all Tool properties except function implementation
};

/**
 * Sanitized agent options for client-server communication
 * Extends AgentOptions with additional fields and serialized representations
 */
export interface SanitizedAgentOptions extends Omit<AgentOptions, 'toolCallEngine' | 'tools'> {
  /**
   * Workspace directory basename for UI display
   */
  workspaceName?: string;

  /**
   * Tool call engine serialized as string instead of ToolCallEngineType
   */
  toolCallEngine?: string;

  /**
   * Sanitized tools without function implementations
   */
  tools?: SanitizedTool[];
}

/**
 * Workspace information for UI display
 */
export interface WorkspaceInfo {
  name: string;
  path: string;
}
