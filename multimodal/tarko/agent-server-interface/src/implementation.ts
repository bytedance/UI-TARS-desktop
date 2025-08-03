/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentConstructor } from '@multimodal/agent-interface';
import { AgioProviderConstructor } from './server';

/**
 * Agent implementation type
 *
 * - `markdown`: A markdown-based agent implementation, write natural language.
 * - `module`: A module-based agent implementation, write ECMAScript modules.
 */
export type AgentImplementationType = 'markdown' | 'module';

/**
 * Resource type mapping for different agent implementation types
 */
export interface AgentResourceMap {
  module: {
    constructor: AgentConstructor;
    agio: AgioProviderConstructor;
  };
  markdown: {
    content: string;
    agio: AgioProviderConstructor;
  };
}

/**
 * Generic agent implementation interface
 */
export interface BaseAgentImplementation<
  T extends AgentImplementationType = AgentImplementationType,
> {
  /**
   * Agent display name
   */
  label?: string;
  /**
   * Agent type
   */
  type?: T;
  /**
   * Agent resources
   */
  resource: AgentResourceMap[T];
}

/**
 * Specific agent implementation types
 */
export type ModuleAgentImplementation = BaseAgentImplementation<'module'>;

/**
 * FIXME: To implement.
 */
export type MarkdownAgentImplementation = BaseAgentImplementation<'markdown'>;

/**
 * Union type for all agent implementations
 */
export type AgentImplementation = BaseAgentImplementation;

/**
 * Utility type to extract implementation by type
 */
export type AgentImplementationByType<T extends AgentImplementationType> =
  BaseAgentImplementation<T>;

/**
 * Type guard to check if implementation is of specific type
 */
export function isAgentImplementationType<T extends AgentImplementationType>(
  implementation: AgentImplementation,
  type: T,
): implementation is BaseAgentImplementation<T> {
  return implementation.type === type;
}

/**
 * Type for resolved agent.
 */
export interface AgentResolutionResult {
  agentName: string;
  agentConstructor: AgentConstructor;
  agioProviderConstructor: AgioProviderConstructor;
}
