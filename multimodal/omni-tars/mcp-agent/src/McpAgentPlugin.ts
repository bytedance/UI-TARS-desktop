/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentPlugin, MCP_ENVIRONMENT } from '@omni-tars/core';
import { SearchToolProvider } from './tools/search';
import { LinkReaderToolProvider } from './tools/linkReader';
import { McpManager } from './tools/mcp';
import {
  McpJsonParser,
  DynamicMcpToolRegistry,
  McpJsonSchema,
} from './tools/mcp-json-parser';
import { Tool } from '@tarko/agent';
import { MCPServer } from '@agent-infra/mcp-client';

export interface McpAgentPluginOption {
  mcpServers: MCPServer[];
}

export interface McpToolHandler {
  name: string;
  handler: (args: unknown) => Promise<unknown> | unknown;
}

/**
 * MCP Agent Plugin - handles MCP_ENVIRONMENT and provides search/link reading capabilities
 *
 * Supports two modes of tool registration:
 * 1. Server-based: Provide MCP servers via mcpServers option (existing behavior)
 * 2. JSON-based: Import tools directly from MCP JSON schema via addMcpJson()
 */
export class McpAgentPlugin extends AgentPlugin {
  readonly name = 'mcp-agent-plugin';
  readonly environmentSection = MCP_ENVIRONMENT;

  private mcpManager: McpManager;
  /** Tools imported via addMcpJson() — stored separately for lifecycle management */
  private _dynamicTools: Tool[] = [];

  constructor(option: McpAgentPluginOption) {
    super();
    this.mcpManager = new McpManager({
      mcpServers: option.mcpServers.filter((s) => s.enable),
    });
  }

  async initialize(): Promise<void> {
    //FIXME:Temporarily remove await to speed up the agent initialization process; the logic of mcpManager.getClient() needs to be added later
    this.mcpManager.init();

    // Initialize tools
    this.tools = [
      new SearchToolProvider(this.mcpManager).getTool(),
      new LinkReaderToolProvider(this.mcpManager).getTool(),
    ];
  }

  /**
   * Import tools from an MCP JSON schema string.
   *
   * Supports three input formats:
   *
   * Format 1 — Standard MCP tools/list response:
   * ```json
   * { "tools": [{ "name": "my_tool", "description": "...", "inputSchema": { "type": "object", "properties": {...} } }] }
   * ```
   *
   * Format 2 — Single tool (legacy MCP format):
   * ```json
   * { "name": "my_tool", "description": "...", "input_schema": { "type": "object", "properties": {...} } }
   * ```
   *
   * Format 3 — Single tool (inputSchema key):
   * ```json
   * { "name": "my_tool", "description": "...", "inputSchema": { "type": "object", "properties": {...} } }
   * ```
   *
   * After importing, call `registerHandlers()` to attach actual implementations.
   *
   * @param mcpJson - A JSON string conforming to MCP tool schema
   * @returns Array of parsed Tool objects
   * @throws Error if the JSON cannot be parsed or has no valid tool definitions
   */
  addMcpJson(mcpJson: string): Tool[] {
    const { tools, errors } = McpJsonParser.parse(mcpJson);

    if (errors.length > 0 && tools.length === 0) {
      throw new Error(`Failed to parse MCP JSON: ${errors.join('; ')}`);
    }

    this._dynamicTools.push(...tools);
    // Merge into this.tools immediately so the agent can see them
    this.tools = [...this.tools, ...tools];

    if (errors.length > 0) {
      this.logger.warn(`MCP JSON parsed with warnings: ${errors.join('; ')}`);
    }

    return tools;
  }

  /**
   * Register handler functions for tools imported via addMcpJson().
   *
   * @param handlers - Record mapping tool names to their handler functions.
   *                   Example: { "my_tool": async (args) => { return await callMyApi(args); } }
   *
   * Handlers are matched by tool name and replace the placeholder function
   * that was created during addMcpJson().
   */
  registerHandlers(handlers: Record<string, (args: unknown) => Promise<unknown> | unknown>): void {
    DynamicMcpToolRegistry.registerHandler(this._dynamicTools, handlers);
  }

  /**
   * Register handlers by name-to-handler mapping for a specific set of tools.
   * Convenience method when you want to register only a subset of imported tools.
   */
  registerHandlersForTools(
    tools: Tool[],
    handlers: Record<string, (args: unknown) => Promise<unknown> | unknown>,
  ): void {
    DynamicMcpToolRegistry.registerHandler(tools, handlers);
  }

  private get logger() {
    // Lazy import logger to avoid circular deps at module load
    const { getLogger } = require('@agent-infra/logger');
    return getLogger('McpAgentPlugin');
  }
}
