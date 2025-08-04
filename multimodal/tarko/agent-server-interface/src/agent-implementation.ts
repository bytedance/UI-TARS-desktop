/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentConstructor } from '@tarko/agent-interface';
import { AgioProviderConstructor } from './server';

/**
 * Agent implementation type
 *
 * - `markdown`: A markdown-based agent implementation, write natural language.
 * - `module`: A module-based agent implementation, write ECMAScript modules.
 * - `modulePath`: A module path-based agent implementation, resolved from path or package name.
 */
export type AgentImplementationType = 'markdown' | 'module' | 'modulePath';

/**
 * Base agent implementation interface
 */
export interface BaseAgentImplementation {
  /**
   * Agent display name
   */
  label?: string;
  /**
   * Agent implementation type
   */
  type: AgentImplementationType;
  /**
   * Optional agio provider constructor
   */
  agio?: AgioProviderConstructor;
}

/**
 * Module-based agent implementation
 */
export interface ModuleAgentImplementation extends BaseAgentImplementation {
  type: 'module';
  /**
   * Agent constructor in memory (Recommended for production)
   */
  constructor: AgentConstructor;
}

/**
 * Module path-based agent implementation
 */
export interface ModulePathAgentImplementation extends BaseAgentImplementation {
  type: 'modulePath';
  /**
   * Agent module path - a string identifier that can be resolved, such as a local path or npm package name
   */
  value: string;
}

/**
 * Markdown-based agent implementation
 */
export interface MarkdownAgentImplementation extends BaseAgentImplementation {
  type: 'markdown';
  /**
   * Agent content defined with markdown
   */
  content: string;
}

/**
 * Union type for all agent implementations
 */
export type AgentImplementation =
  | ModuleAgentImplementation
  | ModulePathAgentImplementation
  | MarkdownAgentImplementation;

/**
 * Utility type to extract implementation by type
 */
export type AgentImplementationByType<T extends AgentImplementationType> = T extends 'module'
  ? ModuleAgentImplementation
  : T extends 'modulePath'
    ? ModulePathAgentImplementation
    : T extends 'markdown'
      ? MarkdownAgentImplementation
      : never;

/**
 * Type guard to check if implementation is of specific type
 */
export function isAgentImplementationType<T extends AgentImplementationType>(
  implementation: AgentImplementation,
  type: T,
): implementation is AgentImplementationByType<T> {
  return implementation.type === type;
}

/**
 * Type for resolved agent with required fields
 */
export interface AgentResolutionResult {
  agentName: string;
  agentConstructor: AgentConstructor;
  agioProviderConstructor?: AgioProviderConstructor;
}
