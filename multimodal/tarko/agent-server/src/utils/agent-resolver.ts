/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentImplementation,
  isAgentImplementationType,
  AgentResolutionResult,
} from '@tarko/agent-server-interface';

export function resolveAgent(implementaion?: AgentImplementation): AgentResolutionResult {
  if (!implementaion) {
    throw new Error(`Missing agent implmentation`);
  }

  if (isAgentImplementationType(implementaion, 'module')) {
    return {
      agentConstructor: implementaion.resource.constructor,
      agioProviderConstructor: implementaion.resource.agio,
    };
  } else {
    throw new Error(`Non-supported agent type: ${implementaion.type}`);
  }
}
