/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agent Web UI implementation type
 *
 * - `static`: local static directory.
 * - `remote`: remote web ui implementation.
 */
export type AgentWebUIImplementationType = 'static' | 'remote';

/**
 * Base agent implementation interface
 */
export interface BaseAgentWebUIImplementation {
  /**
   * Agent implementation type
   *
   * @defaultValue static
   */
  type?: AgentWebUIImplementationType;
  /**
   * Web UI Logo
   *
   * @defaultValue Tarko logo
   */
  logo?: string;
  /**
   * Web UI site title, usually displayed in the upper right corner of the navbar
   * also used in meta.
   *
   * @defaultValue Agent Name
   */
  title?: string;
  /**
   * Web UI Sub title
   *
   * @defaultValue Agent Subtitle, Subtitle, for Home or SEO
   */
  subtitle?: string;
  /**
   * Web UI hero title, usually displayed on the home page, The project's positioning
   * and welcome message, telling people your positioning
   */
  welcomTitle?: string;
  /**
   * Welcome prompts
   */
  welcomePrompts?: string[];
}

/**
 * Static implementation
 */
export interface StaticAgentWebUIImplementation extends BaseAgentWebUIImplementation {
  type?: 'static';
  /**
   * Web UI Static Path, example implementation: `@tarko/web-ui`.
   */
  staticPath: string;
}

/**
 * Remote implementation (TODO)
 */
export interface RemoteAgentWebUIImplementation extends BaseAgentWebUIImplementation {
  type?: 'remote';
}

/**
 * Union type for all agent implementations
 */
export type AgentWebUIImplementation =
  | StaticAgentWebUIImplementation
  | RemoteAgentWebUIImplementation;

/**
 * Utility type to extract implementation by type
 */
export type AgentWebUIImplementationByType<T extends AgentWebUIImplementationType> =
  T extends 'static'
    ? StaticAgentWebUIImplementation
    : T extends 'remote'
      ? RemoteAgentWebUIImplementation
      : never;

/**
 * Type guard to check if implementation is of specific type
 */
export function isAgentWebUIImplementationType<T extends AgentWebUIImplementationType>(
  implementation: AgentWebUIImplementation,
  type: T,
): implementation is AgentWebUIImplementationByType<T> {
  return implementation.type === type;
}
