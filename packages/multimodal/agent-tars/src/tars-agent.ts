/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPAgent, MCPServerRegistry } from '@multimodal/agent';
import { TARSAgentOptions } from './types';
import { handleOptions } from './shared';

/**
 * TARS Agent - A general-purpose agent with integrated MCP tools
 */
export class TARSAgent extends MCPAgent {
  private workingDirectory: string;

  constructor(options: TARSAgentOptions) {
    const { instructions, workingDirectory } = handleOptions(options);

    const mcpServers: MCPServerRegistry = {
      browser: {
        command: 'npx',
        args: ['-y', '@agent-infra/mcp-server-browser'],
      },
      filesystem: {
        command: 'npx',
        args: ['-y', '@agent-infra/mcp-server-filesystem', workingDirectory],
      },
      commands: {
        command: 'npx',
        args: ['-y', '@agent-infra/mcp-server-commands'],
      },
      ...(options.mcpServers || {}),
    };

    super({
      ...options,
      instructions,
      mcpServers,
    });

    this.workingDirectory = workingDirectory;

    console.log(`🤖 TARSAgent initialized | Working directory: ${this.workingDirectory}`);
  }

  /**
   * Get the current working directory for filesystem operations
   */
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  /**
   * Set allowed directories for filesystem access
   * @param directories Array of directory paths to allow access to
   */
  setAllowedDirectories(directories: string[]): void {
    // This method would ideally interact with the underlying filesystem MCP service
    // This is a placeholder - actual implementation depends on how to communicate with MCP servers
    console.log(`📁 Setting allowed directories for filesystem access: ${directories.join(', ')}`);
  }
}
