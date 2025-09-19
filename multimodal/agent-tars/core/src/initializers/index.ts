/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from './agent-tars-initializer';
export * from './agent-tars-aio-initializer';

// Legacy exports for backward compatibility
export { AgentTARSLocalEnvironment as AgentTARSInitializer } from './agent-tars-initializer';
export { AgentTARSAIOEnvironment as AgentTARSAIOInitializer } from './agent-tars-aio-initializer';
