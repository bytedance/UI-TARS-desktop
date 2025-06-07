/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export * from '@agent-tars/interface';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * In-process MCP module interface for the new architecture
 */
export interface InMemoryMCPModule {
  /**
   * Create server function that returns an MCP server instance
   * FIXME: Strict type
   */

  createServer: (config?: any) => MCPServerInterface;
}

/**
 * MCP Server interface based on the ModelContextProtocol specification
 */
export interface MCPServerInterface {
  server: McpServer;
  connect: (transport: any) => Promise<void>;
  close?: () => Promise<void>;
}

/**
 * Built-in MCP Server shortcut name.
 */
export type BuiltInMCPServerName = 'browser' | 'filesystem' | 'commands' | 'search';

export type BuiltInMCPServers = Partial<Record<BuiltInMCPServerName, MCPServerInterface>>;
