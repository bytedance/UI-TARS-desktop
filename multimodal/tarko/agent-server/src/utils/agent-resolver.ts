/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentImplementation,
  isAgentImplementationType,
  AgentResolutionResult,
  AgentConstructor,
} from '@tarko/agent-server-interface';

export async function resolveAgentImplementation(
  implementaion?: AgentImplementation,
): Promise<AgentResolutionResult> {
  if (!implementaion) {
    throw new Error(`Missing agent implmentation`);
  }

  if (isAgentImplementationType(implementaion, 'module')) {
    return {
      agentName: implementaion.label ?? implementaion.constructor.label ?? 'Anonymous',
      agentConstructor: implementaion.constructor,
      agioProviderConstructor: implementaion.agio,
    };
  }

  if (isAgentImplementationType(implementaion, 'modulePath')) {
    const agentModulePathIdentifier = implementaion.value;

    try {
      // First, use require.resolve to validate module existence and get absolute path
      // This handles npm packages, relative paths, and directories more robustly
      const resolvedPath = require.resolve(agentModulePathIdentifier);

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
        agentName: implementaion.label ?? agentConstructor.label ?? 'Anonymous',
        agentConstructor,
        agioProviderConstructor: implementaion.agio,
      };
    } catch (error) {
      throw new Error(
        `Failed to resolve agent module '${agentModulePathIdentifier}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(`Non-supported agent type: ${implementaion.type}`);
}
