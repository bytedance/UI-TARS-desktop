/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool } from '@tarko/agent-interface';
import { ConsoleLogger } from '@tarko/shared-utils';

/**
 * Manages tools for the Agent, handling registration, lookup, and execution
 */
export class ToolManager {
  private tools: Map<string, Tool> = new Map();

  constructor(private logger: ConsoleLogger) {}

  /**
   * Registers a new tool that the agent can use during execution
   */
  registerTool(tool: Tool): void {
    this.logger.info(`[Tool] Registered: ${tool.name} | Description: "${tool.description}"`);
    if (tool.schema.type === 'object' && !tool.schema.properties) {
      tool.schema.properties = {};
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Returns all registered tools as an array
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Gets a specific tool by name
   * @param name Tool name to retrieve
   * @returns The tool definition or undefined if not found
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Checks if a tool exists
   * @param name Tool name to check
   * @returns True if the tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool with the given arguments
   * @param toolName Name of the tool to execute
   * @param toolCallId ID of the tool call
   * @param args Arguments to pass to the tool
   * @returns Result of execution and execution time
   */
  async executeTool(
    toolName: string,
    toolCallId: string,
    args: unknown,
  ): Promise<{
    result: unknown;
    executionTime: number;
    error?: string;
  }> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      const errorMessage = `Tool "${toolName}" not found`;
      this.logger.error(`[Tool] Not found: "${toolName}"`);
      return {
        result: `Error: ${errorMessage}`,
        executionTime: 0,
        error: errorMessage,
      };
    }

    try {
      this.logger.info(`[Tool] Executing: "${toolName}" | ToolCallId: ${toolCallId}`);
      this.logger.debug(`[Tool] Arguments: ${JSON.stringify(args)}`);

      const startTime = Date.now();
      const result = await tool.function(args);
      const executionTime = Date.now() - startTime;

      this.logger.info(
        `[Tool] Execution completed: "${toolName}" | Duration: ${executionTime}ms | ToolCallId: ${toolCallId}`,
      );
      this.logger.debug(
        `[Tool] Result: ${typeof result === 'string' ? result : JSON.stringify(result)}`,
      );

      return {
        result,
        executionTime,
      };
    } catch (error) {
      const errorMessage = String(error);
      this.logger.error(
        `[Tool] Execution failed: "${toolName}" | Error: ${errorMessage} | ToolCallId: ${toolCallId}`,
      );

      return {
        result: `Error: ${errorMessage}`,
        executionTime: 0,
        error: errorMessage,
      };
    }
  }
}
