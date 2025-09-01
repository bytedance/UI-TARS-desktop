/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionItemMetadata } from '@tarko/interface';
import { AgentEventStream } from '@/common/types';

/**
 * Create model config from agent run start event
 *
 * @param event - Agent run start event
 * @returns Model config object
 */
export function createModelConfigFromEvent(
  event: AgentEventStream.AgentRunStartEvent,
): SessionItemMetadata['modelConfig'] | null {
  if (!event.provider && !event.model) {
    return null;
  }

  return {
    provider: event.provider || '',
    modelId: event.model || '',
    displayName: event.modelDisplayName,
    configuredAt: Date.now(),
  };
}

/**
 * Create agent info from agent run start event
 *
 * @param event - Agent run start event
 * @returns Agent info object
 */
export function createAgentInfoFromEvent(
  event: AgentEventStream.AgentRunStartEvent,
): SessionItemMetadata['agentInfo'] | null {
  if (!event.agentName) {
    return null;
  }

  return {
    name: event.agentName,
    configuredAt: Date.now(),
  };
}
