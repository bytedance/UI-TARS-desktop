/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPAgent } from '@multimodal/agent';
import { DEFAULT_SYSTEM_PROMPT } from './shared-constants';
import { TARSAgentOptions } from './types';

/**
 * TARS Agent - A general-purpose agent with integrated MCP tools
 */
export class TARSAgent extends MCPAgent {
  private workingDirectory: string;

  constructor(options: TARSAgentOptions) {
    // Prepare system instructions by combining default prompt with custom instructions
    const instructions = options.instructions
      ? `${DEFAULT_SYSTEM_PROMPT}\n\n${options.instructions}`
      : DEFAULT_SYSTEM_PROMPT;

    // Set working directory
    const workingDirectory = options.workingDirectory || process.cwd();

    // Configure MCP servers
    const defaultMcpServers = {
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
    };

    // Use custom MCP configurations if provided
    const mcpServers = {
      browser: options.mcpServers?.browser || defaultMcpServers.browser,
      filesystem: options.mcpServers?.filesystem || defaultMcpServers.filesystem,
      commands: options.mcpServers?.commands || defaultMcpServers.commands,
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
