/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, ConsoleLogger } from '@tarko/mcp-agent';

/**
 * ToolLogger - Handles beautiful logging of registered tools
 * 
 * This utility class provides formatted logging for tool registration,
 * making it easier to understand what tools are available.
 */
export class ToolLogger {
  private logger: ConsoleLogger;

  constructor(logger: ConsoleLogger) {
    this.logger = logger;
  }

  /**
   * Log all registered tools in a beautiful format
   */
  logRegisteredTools(tools: Tool[]): void {
    try {
      if (!tools || tools.length === 0) {
        this.logger.info('🧰 No tools registered');
        return;
      }

      const toolCount = tools.length;
      const header = `🧰 ${toolCount} Tools Registered 🧰`;
      const separator = '═'.repeat(header.length);

      this.logger.info('\n');
      this.logger.info(separator);
      this.logger.info(header);
      this.logger.info(separator);

      // Group tools by their module/category
      const toolsByCategory = this.groupToolsByCategory(tools);

      // Print tools by category
      Object.entries(toolsByCategory).forEach(([category, toolNames]) => {
        this.logger.info(`\n📦 ${category} (${toolNames.length}):`);
        toolNames.sort().forEach((name) => {
          this.logger.info(`  • ${name}`);
        });
      });

      this.logger.info('\n' + separator);
      this.logger.info(`✨ Total: ${toolCount} tools ready to use`);
      this.logger.info(separator + '\n');
    } catch (error) {
      this.logger.error('❌ Failed to log registered tools:', error);
    }
  }

  /**
   * Group tools by their category (derived from description)
   */
  private groupToolsByCategory(tools: Tool[]): Record<string, string[]> {
    const toolsByCategory: Record<string, string[]> = {};

    tools.forEach((tool) => {
      // Extract category from description [category] format if available
      const categoryMatch = tool.description?.match(/^\[(.*?)\]/);
      const category = categoryMatch ? categoryMatch[1] : 'general';

      if (!toolsByCategory[category]) {
        toolsByCategory[category] = [];
      }

      toolsByCategory[category].push(tool.name);
    });

    return toolsByCategory;
  }
}
