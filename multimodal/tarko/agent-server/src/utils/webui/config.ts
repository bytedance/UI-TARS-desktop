/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentWebUIImplementation } from '@tarko/interface';
import type { AgentServer } from '../../server';

/**
 * Merge web UI config with agent constructor config
 * This ensures consistent configuration merging across different contexts
 * @param baseWebUIConfig Base web UI configuration from app config
 * @param server Optional agent server instance to get constructor config
 * @returns Merged web UI configuration
 */
export function mergeWebUIConfig(
  baseWebUIConfig: AgentWebUIImplementation,
  server?: AgentServer,
): AgentWebUIImplementation & Record<string, any> {
  const agentConstructorWebConfig = server?.getAgentConstructorWebConfig();
  return { ...baseWebUIConfig, ...agentConstructorWebConfig };
}
