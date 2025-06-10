/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from '@agent-tars/interface';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Built-in MCP Server shortcut name.
 */
export type BuiltInMCPServerName = 'browser' | 'filesystem' | 'commands' | 'search';

export type BuiltInMCPServers = Partial<Record<BuiltInMCPServerName, McpServer>>;
