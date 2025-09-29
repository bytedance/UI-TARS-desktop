/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// Environment implementations
export { AgentTARSBaseEnvironment } from './base';
export { AgentTARSLocalEnvironment } from './local';
export { AgentTARSAIOEnvironment } from './aio';

// Legacy exports for backward compatibility
export { AgentTARSLocalEnvironment as AgentTARSInitializer } from './local';
export { AgentTARSAIOEnvironment as AgentTARSAIOInitializer } from './aio';
