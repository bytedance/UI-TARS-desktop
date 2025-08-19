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
    Tavily: 'tavily-client',
    Google: 'google-search-client',
    LinkReader: 'link-reader',
    AIO: 'aio',
  };

  public client: MCPClient;

  constructor(options: McpManagerOptions) {
    this.client = new MCPClient(options.mcpServers);
  }

  async init() {
    await this.client.init();
  }
}
