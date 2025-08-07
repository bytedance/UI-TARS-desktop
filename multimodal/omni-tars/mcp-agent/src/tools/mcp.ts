/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { MCPClient, MCPServer } from '@agent-infra/mcp-client';

export interface McpManagerOptions {
  mcpServers: MCPServer[];
}

export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export class McpManager {
  static McpClientType = {
    Tavily: 'tavily_client',
    Google: 'google_search_client',
    ShellCI: 'shell_ci_client',
  };

  public client: MCPClient;

  constructor(options: McpManagerOptions) {
    this.client = new MCPClient(options.mcpServers);
  }

  async init() {
    await this.client.init();

    const start = Date.now();

    const tools = await this.client.listTools();

    console.log(
      '[tools]: ',
      tools.map((t) => t.name),
      'time: ',
      Date.now() - start,
    );
  }
}
