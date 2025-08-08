/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

// Export the new composable architecture
export { ComposableAgent, ComposableAgentOptions } from './ComposableAgent';
export { AgentComposer } from './AgentComposer';
export { AgentBuilder } from './AgentBuilder';
export { ComposableToolCallEngine } from './ComposableToolCallEngine';
export {
  ComposableToolCallEngineFactory,
  createComposableToolCallEngineFactory,
} from './ComposableToolCallEngineFactory';
export {
  AgentPlugin,
  AgentCompositionConfig,
  EnvironmentSection,
  ToolCallEngineProvider,
  ToolCallEngineContext,
  ToolCallEngineCompositionConfig,
} from './types';

// Export environment sections for use by agent plugins
export { CODE_ENVIRONMENT } from './environments/code';
export { MCP_ENVIRONMENT } from './environments/mcp';
export { COMPUTER_USE_ENVIRONMENT } from './environments/computer';

export { SearchToolProvider } from './tools/search';
export { LinkReaderToolProvider } from './tools/linkReader';
export { McpManager } from './tools/mcp';
export { SnapshotPlugin } from './plugins/snapshot';
