/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from '@agent-tars/interface';
import type { McpServer } from '@tarko/mcp-agent';

/**
 * Built-in MCP Server shortcut name.
 */
export type BuiltInMCPServerName = 'browser' | 'filesystem' | 'commands' | 'search';

export type BuiltInMCPServers = Partial<Record<BuiltInMCPServerName, McpServer>>;

/**
 * Browser state information for tracking current page status
 *
 * This interface tracks the current browser state including URL and screenshot
 * for use in tool results and event streams.
 */
export interface BrowserState {
  currentUrl?: string;
  currentScreenshot?: string;
}
