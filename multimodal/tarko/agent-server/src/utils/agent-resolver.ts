/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentImplementation,
  isAgentImplementationType,
  AgentResolutionResult,
  AgentConstructor,
} from '@tarko/interface';

/**
 * Options for agent implementation resolution
 */
interface AgentResolutionOptions {
  /**
   * Workspace directory path for resolving relative module paths
   */
  workspace?: string;
}

export async function resolveAgentImplementation(
  implementation?: AgentImplementation,
  options?: AgentResolutionOptions,
): Promise<AgentResolutionResult> {
  if (!implementation) {
    throw new Error(`Missing agent implementation`);
  }

  if (isAgentImplementationType(implementation, 'module')) {
    return {
      agentName: implementation.label ?? implementation.constructor.label ?? 'Anonymous',
      agentConstructor: implementation.constructor,
      agioProviderConstructor: implementation.agio,
    };
  }

  if (isAgentImplementationType(implementation, 'modulePath')) {
    const agentModulePathIdentifier = implementation.value;

    try {
      // Build resolve options with workspace path if provided
      const resolveOptions: { paths?: string[] } = {};
      if (options?.workspace) {
        resolveOptions.paths = [options.workspace];
      }

      // First, use require.resolve to validate module existence and get absolute path
      // This handles npm packages, relative paths, and directories more robustly
      // When workspace is provided, it will be used as the base path for relative imports
      const resolvedPath = require.resolve(agentModulePathIdentifier, resolveOptions);

      // Use the resolved absolute path for import to ensure consistency
      const agentModule = await import(resolvedPath);

      // Handle nested default exports (common in transpiled modules)
      let agentConstructor = agentModule.default as AgentConstructor;

      // Check for double default nesting (e.g., agentModule.default.default)
      if (
        agentConstructor &&
        typeof agentConstructor === 'object' &&
        'default' in agentConstructor
      ) {
        // @ts-expect-error
        agentConstructor = agentConstructor.default as AgentConstructor;
      }

      if (!agentConstructor || typeof agentConstructor !== 'function') {
        throw new Error(
          `Invalid agent module at '${agentModulePathIdentifier}': Must export an Agent constructor as default export.`,
        );
      }

      return {
        agentName: implementation.label ?? agentConstructor.label ?? 'Anonymous',
        agentConstructor,
        agioProviderConstructor: implementation.agio,
      };
    } catch (error) {
      throw new Error(
        `Failed to resolve agent module '${agentModulePathIdentifier}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(`Non-supported agent type: ${implementation.type}`);
}
