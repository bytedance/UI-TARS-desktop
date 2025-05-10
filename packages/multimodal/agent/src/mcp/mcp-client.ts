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

export interface MCPClientResult {
  content: string;
}

export interface MCPServerConfig {
  // Command based server config
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // SSE based server config
  url?: string;
}

export interface MCPServerRegistry {
  [serverName: string]: MCPServerConfig;
}

export class MCPClient {
  private client: Client;
  private transport: StdioClientTransport | SSEClientTransport | null = null;
  private tools: MCPTool[] = [];

  constructor(
    private serverName: string,
    private config: MCPServerConfig,
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
    const existingPaths = new Set(
      originalPath.split(pathSeparator).filter(Boolean),
    );
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

      this.transport = new StdioClientTransport({
        command: cmd,
        args: this.config.args || [],
        stderr: process.platform === 'win32' ? 'pipe' : 'inherit',
        env: mergedEnv as Record<string, string>,
      });
    } else if (this.config.url) {
      this.transport = new SSEClientTransport(new URL(this.config.url));
    } else {
      throw new Error(
        `Invalid MCP server configuration for: ${this.serverName}`,
      );
    }

    // Connect to the server
    await this.client.connect(this.transport);

    // List available tools
    const response = await this.client.listTools();
    this.tools = response.tools;

    return this.tools;
  }

  async callTool(toolName: string, args: any): Promise<MCPClientResult> {
    if (!this.client) {
      throw new Error('MCP Client not initialized');
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });

      return result as unknown as MCPClientResult;
    } catch (error) {
      console.error(`Error calling MCP tool ${toolName}:`, error);
      return {
        content: `Error: Failed to execute tool ${toolName}: ${error}`,
      };
    }
  }

  async close(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  getTools(): MCPTool[] {
    return [...this.tools];
  }
}
