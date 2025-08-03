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
      const agentModule = (await import(agentModulePathIdentifier)).default;

      // Look for default export or named exports
      const agentConstructor = (agentModule.default ||
        agentModule.Agent ||
        agentModule) as AgentConstructor;
      const agentName = agentConstructor.label ?? agentModulePathIdentifier;

      if (!agentConstructor || typeof agentConstructor !== 'function') {
        throw new Error(
          `Invalid agent module path: ${agentModulePathIdentifier}. Must export an Agent constructor.`,
        );
      }

      return {
        agentName: implementaion.label ?? agentConstructor.label ?? 'Anonymous',
        agentConstructor,
        agioProviderConstructor: implementaion.agio,
      };
    } catch (e) {
      throw new Error(`Failed to resolve: ${agentModulePathIdentifier}.`);
    }
  }

  throw new Error(`Non-supported agent type: ${implementaion.type}`);
}
