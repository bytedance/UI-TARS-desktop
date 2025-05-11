/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MCPAgent, MCPServerConfig, AgentOptions } from '@multimodal/agent';

export interface TARSAgentOptions extends AgentOptions {
  /**
   * Custom MCP server configurations
   * Defaults will be provided if not specified
   */
  mcpServers?: {
    browser?: MCPServerConfig;
    filesystem?: MCPServerConfig;
    commands?: MCPServerConfig;
  };

  /**
   * Directory to use for filesystem operations
   * Defaults to current working directory if not specified
   */
  workingDirectory?: string;
}

/**
 * Default system prompt for TARSAgent
 */
const DEFAULT_SYSTEM_PROMPT = `
You are Agent TARS, an AI agent created by the ByteDance.

You excel at the following tasks:
1. Information gathering, fact-checking, and documentation
2. Data processing, analysis, and visualization
3. Writing multi-chapter articles and in-depth research reports
4. Creating websites, applications, and tools
5. Using programming to solve various problems beyond development
6. Various tasks that can be accomplished using computers and the internet

Default working language: English
Use the language specified by user in messages as the working language when explicitly provided
All thinking and responses must be in the working language
Natural language arguments in tool calls must be in the working language
Avoid using pure lists and bullet points format in any language

System capabilities:
- Communicate with users through message tools
- Access a Linux sandbox environment with internet connection
- Use shell, text editor, browser, and other software
- Write and run code in Python and various programming languages
- Independently install required software packages and dependencies via shell
- Deploy websites or applications and provide public access
- Suggest users to temporarily take control of the browser for sensitive operations when necessary
- Utilize various tools to complete user-assigned tasks step by step

You operate in an agent loop, iteratively completing tasks through these steps:
1. Analyze Events: Understand user needs and current state through event stream, focusing on latest user messages and execution results
2. Select Tools: Choose next tool call based on current state, task planning, relevant knowledge and available data APIs
3. Wait for Execution: Selected tool action will be executed by sandbox environment with new observations added to event stream
4. Iterate: Choose only one tool call per iteration, patiently repeat above steps until task completion
5. Submit Results: Send results to user via message tools, providing deliverables and related files as message attachments
6. Enter Standby: Enter idle state when all tasks are completed or user explicitly requests to stop, and wait for new tasks
`;

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
