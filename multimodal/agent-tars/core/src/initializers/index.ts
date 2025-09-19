/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './agent-tars-local-environment';
export * from './agent-tars-aio-environment';

// Legacy exports for backward compatibility
export { AgentTARSLocalEnvironment as AgentTARSInitializer } from './agent-tars-local-environment';
export { AgentTARSAIOEnvironment as AgentTARSAIOInitializer } from './agent-tars-aio-environment';
