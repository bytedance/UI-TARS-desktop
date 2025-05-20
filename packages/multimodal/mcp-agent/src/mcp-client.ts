/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FIXME: migrate to `packages/agent-infra/mcp-client`.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { Tool as MCPTool } from '@modelcontextprotocol/sdk/types.js';
import { IMCPClient, MCPClientResult, MCPServerConfig } from './mcp-types';
import type { Logger } from '@agent-infra/logger';

export class MCPClient implements IMCPClient {
  private client: Client;
  private transport: StdioClientTransport | SSEClientTransport | null = null;
  private tools: MCPTool[] = [];

  constructor(
    private serverName: string,
    private config: MCPServerConfig,
    private logger: Logger,
  ) {
    this.client = new Client(
      {
        name: `mcp-client-${serverName}`,
        version: '1.0.0',
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      },
    );
  }

  /**
   * Get enhanced PATH including common tool locations
   */
  private getEnhancedPath(originalPath: string): string {
    // split original PATH by separator
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    const existingPaths = new Set(originalPath.split(pathSeparator).filter(Boolean));
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';

    // define new paths to add
    const newPaths: string[] = [];

    if (process.platform === 'darwin') {
      newPaths.push(
        '/bin',
        '/usr/bin',
        '/usr/local/bin',
        '/usr/local/sbin',
        '/opt/homebrew/bin',
        '/opt/homebrew/sbin',
        '/usr/local/opt/node/bin',
        `${homeDir}/.nvm/current/bin`,
        `${homeDir}/.npm-global/bin`,
        `${homeDir}/.yarn/bin`,
        `${homeDir}/.cargo/bin`,
        '/opt/local/bin',
      );
    }

    if (process.platform === 'linux') {
      newPaths.push(
        '/bin',
        '/usr/bin',
        '/usr/local/bin',
        `${homeDir}/.nvm/current/bin`,
        `${homeDir}/.npm-global/bin`,
        `${homeDir}/.yarn/bin`,
        `${homeDir}/.cargo/bin`,
        '/snap/bin',
      );
    }

    if (process.platform === 'win32') {
      newPaths.push(
        `${process.env.APPDATA}\\npm`,
        `${homeDir}\\AppData\\Local\\Yarn\\bin`,
        `${homeDir}\\.cargo\\bin`,
      );
    }

    // add new paths to existing paths
    newPaths.forEach((path) => {
      if (path && !existingPaths.has(path)) {
        existingPaths.add(path);
      }
    });

    // convert to string
    return Array.from(existingPaths).join(pathSeparator);
  }

  async initialize(): Promise<MCPTool[]> {
    // Create appropriate transport
    if (this.config.command) {
      let cmd = this.config.command;

      // Handle platform-specific command adjustments
      if (process.platform === 'win32') {
        if (cmd === 'npx') {
          cmd = `${cmd}.cmd`;
        } else if (cmd === 'node') {
          cmd = `${cmd}.exe`;
        }
      }

      // Enhance environment variables with better PATH
      const mergedEnv = {
        PATH: this.getEnhancedPath(process.env.PATH || ''),
        ...this.config.env,
      };

      this.logger.info(`Creating stdio transport for ${this.serverName} with command: ${cmd}`);
      this.transport = new StdioClientTransport({
        command: cmd,
        args: this.config.args || [],
        stderr: process.platform === 'win32' ? 'pipe' : 'inherit',
        env: mergedEnv as Record<string, string>,
      });
    } else if (this.config.url) {
      this.logger.info(
        `Creating SSE transport for ${this.serverName} with URL: ${this.config.url}`,
      );
      this.transport = new SSEClientTransport(new URL(this.config.url));
    } else {
      this.logger.error(`Invalid MCP server configuration for: ${this.serverName}`);
      throw new Error(`Invalid MCP server configuration for: ${this.serverName}`);
    }

    // Connect to the server
    this.logger.info(`Connecting to MCP server: ${this.serverName}`);
    await this.client.connect(this.transport);

    // List available tools
    const response = await this.client.listTools();
    this.tools = response.tools;
    this.logger.success(`Connected to ${this.serverName}, found ${this.tools.length} tools`);

    return this.tools;
  }

  async callTool(toolName: string, args: any): Promise<MCPClientResult> {
    if (!this.client) {
      this.logger.error('MCP Client not initialized');
      throw new Error('MCP Client not initialized');
    }

    try {
      this.logger.info(`Calling tool: ${toolName}`);
      this.logger.debug(`Tool args:`, args);

      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      this.logger.debug(`Tool ${toolName} executed successfully`);
      return result as unknown as MCPClientResult;
    } catch (error) {
      this.logger.error(`Error calling MCP tool ${toolName}:`, error);
      return {
        content: `Error: Failed to execute tool ${toolName}: ${error}`,
      };
    }
  }

  async close(): Promise<void> {
    if (this.transport) {
      this.logger.info(`Closing transport for ${this.serverName}`);
      await this.transport.close();
      this.transport = null;
      this.logger.success(`Transport for ${this.serverName} closed successfully`);
    }
  }

  getTools(): MCPTool[] {
    return [...this.tools];
  }
}
