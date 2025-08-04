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
 * FIXME: move to impl based on event stream.
 */
export interface BrowserState {
  currentUrl?: string;
  currentScreenshot?: string;
}
