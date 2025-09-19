/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, ConsoleLogger } from '@tarko/mcp-agent';
import { BuiltInMCPServers, BuiltInMCPServerName } from '../types';
import { BrowserManager } from '../environments/local/browser';
import { MessageHistoryDumper } from '../shared/message-history-dumper';

/**
 * ResourceCleaner - Handles cleanup of all AgentTARS resources
 * 
 * This class centralizes cleanup logic to ensure proper resource disposal
 * and prevent memory leaks.
 */
export class ResourceCleaner {
  private logger: ConsoleLogger;

  constructor(logger: ConsoleLogger) {
    this.logger = logger.spawn('ResourceCleaner');
  }

  /**
   * Clean up all resources
   */
  async cleanup(
    mcpClients: Partial<Record<BuiltInMCPServerName, Client>>,
    mcpServers: BuiltInMCPServers,
    browserManager: BrowserManager,
    messageHistoryDumper?: MessageHistoryDumper,
  ): Promise<void> {
    this.logger.info('🧹 Starting resource cleanup...');

    const cleanupPromises: Promise<void>[] = [];

    // Close MCP clients
    cleanupPromises.push(this.cleanupMCPClients(mcpClients));

    // Close MCP servers
    cleanupPromises.push(this.cleanupMCPServers(mcpServers));

    // Close browser
    cleanupPromises.push(this.cleanupBrowser(browserManager));

    // Wait for all cleanup operations
    await Promise.allSettled(cleanupPromises);

    // Clear message history traces
    if (messageHistoryDumper) {
      messageHistoryDumper.clearTraces();
    }

    this.logger.info('✅ Resource cleanup complete');
  }

  /**
   * Clean up MCP clients
   */
  private async cleanupMCPClients(
    mcpClients: Partial<Record<BuiltInMCPServerName, Client>>,
  ): Promise<void> {
    const clientPromises = Object.entries(mcpClients).map(async ([name, client]) => {
      try {
        await client.close();
        this.logger.info(`✅ Closed ${name} MCP client`);
      } catch (error) {
        this.logger.warn(`⚠️ Error closing ${name} client: ${error}`);
      }
    });

    await Promise.allSettled(clientPromises);
  }

  /**
   * Clean up MCP servers
   */
  private async cleanupMCPServers(mcpServers: BuiltInMCPServers): Promise<void> {
    const serverPromises = Object.entries(mcpServers).map(async ([name, server]) => {
      if (server?.close) {
        try {
          await server.close();
          this.logger.info(`✅ Closed ${name} MCP server`);
        } catch (error) {
          this.logger.warn(`⚠️ Error closing ${name} server: ${error}`);
        }
      }
    });

    await Promise.allSettled(serverPromises);
  }

  /**
   * Clean up browser resources
   */
  private async cleanupBrowser(browserManager: BrowserManager): Promise<void> {
    try {
      await browserManager.closeBrowser();
      this.logger.info('✅ Closed browser instance');
    } catch (error) {
      this.logger.warn(`⚠️ Error closing browser: ${error}`);
    }
  }
}
