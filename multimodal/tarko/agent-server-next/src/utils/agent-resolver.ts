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
  implementaion?: AgentImplementation,
  options?: AgentResolutionOptions,
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
      // Build resolve options with workspace path if provided
      const resolveOptions: { paths?: string[] } = {};
      if (options?.workspace) {
        resolveOptions.paths = [options.workspace];
      }

      // Dynamic import the module
      const module = await import(agentModulePathIdentifier);

      // Extract the agent constructor from the module
      const agentConstructor: AgentConstructor = module.default || module.Agent;

      if (!agentConstructor) {
        throw new Error(`No agent constructor found in module: ${agentModulePathIdentifier}`);
      }

      return {
        agentName: implementaion.label ?? agentConstructor.label ?? 'Anonymous',
        agentConstructor,
        agioProviderConstructor: implementaion.agio,
      };
    } catch (error) {
      throw new Error(
        `Failed to resolve agent module "${agentModulePathIdentifier}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  throw new Error(`Unsupported agent implementation type: ${(implementaion as any).type}`);
}
