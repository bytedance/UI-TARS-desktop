/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tool, z } from '@tarko/agent';
import { getLogger } from '@agent-infra/logger';

/**
 * Standard MCP tool definition as returned by tools/list
 */
export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
}

/**
 * Parsed MCP JSON schema (supports both legacy and spec-compliant formats)
 */
export interface McpJsonSchema {
  tools?: McpToolDefinition[];
  /**
   * Legacy single-tool format for direct paste
   */
  name?: string;
  description?: string;
  input_schema?: McpToolDefinition['inputSchema'];
}

export class McpJsonParser {
  private static logger = getLogger('McpJsonParser');

  /**
   * Parse a JSON string into an array of Tool definitions
   * Supports multiple input formats:
   *
   * Format 1 - Standard MCP tools/list response:
   * { "tools": [{ "name": "...", "description": "...", "inputSchema": {...} }] }
   *
   * Format 2 - Single tool (legacy/direct paste):
   * { "name": "...", "description": "...", "input_schema": {...} }
   *
   * Format 3 - Single tool with inputSchema key:
   * { "name": "...", "description": "...", "inputSchema": {...} }
   */
  static parse(jsonString: string): { tools: Tool[]; errors: string[] } {
    const tools: Tool[] = [];
    const errors: string[] = [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      errors.push(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return { tools, errors };
    }

    if (!parsed || typeof parsed !== 'object') {
      errors.push('JSON must be an object');
      return { tools, errors };
    }

    const obj = parsed as Record<string, unknown>;

    // Format 1: Standard MCP tools/list response
    if (Array.isArray(obj.tools)) {
      for (const toolDef of obj.tools) {
        const result = this.parseToolDefinition(toolDef);
        if (result.tool) {
          tools.push(result.tool);
        }
        if (result.error) {
          errors.push(result.error);
        }
      }
      return { tools, errors };
    }

    // Format 2 & 3: Single tool (legacy format with input_schema or inputSchema)
    if (obj.name && typeof obj.name === 'string') {
      const result = this.parseToolDefinition(obj as unknown as McpToolDefinition);
      if (result.tool) {
        tools.push(result.tool);
      }
      if (result.error) {
        errors.push(result.error);
      }
      return { tools, errors };
    }

    errors.push(
      'Unrecognized MCP JSON format. Expected either:\n' +
        '  1. { "tools": [...] } — MCP tools/list response\n' +
        '  2. { "name": "...", "input_schema": {...} } — single tool object',
    );
    return { tools, errors };
  }

  /**
   * Parse a single tool definition into a Tool instance
   */
  private static parseToolDefinition(def: unknown): { tool?: Tool; error?: string } {
    if (!def || typeof def !== 'object') {
      return { error: 'Tool definition must be an object' };
    }

    const obj = def as Record<string, unknown>;

    const name =
      typeof obj.name === 'string' ? obj.name : typeof obj.name === 'undefined' ? undefined : String(obj.name);

    if (!name) {
      return { error: 'Tool missing required field: name' };
    }

    const description = typeof obj.description === 'string' ? obj.description : '';

    // Support both inputSchema (standard) and input_schema (legacy)
    const rawSchema = (obj.inputSchema ?? obj.input_schema) as
      | McpToolDefinition['inputSchema']
      | undefined;

    if (!rawSchema || typeof rawSchema !== 'object') {
      return { error: `Tool "${name}" missing required field: inputSchema` };
    }

    const schema = rawSchema as McpToolDefinition['inputSchema'];

    // Build Zod schema from JSON Schema
    const zodSchema = this.jsonSchemaToZod(schema, name);

    return {
      tool: new Tool({
        id: name,
        description,
        parameters: zodSchema,
        function: async () => {
          // Placeholder — actual implementation provided via registerHandler()
          return `Tool "${name}" called. Please implement the handler via McpJsonParser.registerHandler().`;
        },
      }),
    };
  }

  /**
   * Convert a JSON Schema object to a Zod schema
   */
  private static jsonSchemaToZod(schema: McpToolDefinition['inputSchema'], toolName: string): z.ZodObject<any> {
    const shape: Record<string, unknown> = {};

    const properties = schema.properties || {};
    const required = schema.required || [];

    for (const [key, propDef] of Object.entries(properties)) {
      const prop = propDef as Record<string, unknown>;
      let zodType: unknown;

      switch (prop.type) {
        case 'string':
          zodType = z.string();
          break;
        case 'number':
          zodType = z.number();
          break;
        case 'integer':
          zodType = z.number().int();
          break;
        case 'boolean':
          zodType = z.boolean();
          break;
        case 'array':
          zodType = z.array(z.unknown());
          break;
        case 'object':
          zodType = z.record(z.unknown());
          break;
        default:
          zodType = z.unknown();
      }

      if (prop.description) {
        (zodType as { describe: (d: string) => unknown }).describe = (d: string) =>
          (zodType as { describe: (d: string) => unknown }).describe.call(zodType, d);
      }

      // Handle optional vs required
      if (!required.includes(key)) {
        zodType = (zodType as z.ZodType).optional();
      }

      shape[key] = zodType;
    }

    return z.object(shape);
  }
}

/**
 * Tool registry that supports both static tools and dynamically registered handlers
 */
export class DynamicMcpToolRegistry {
  private static logger = getLogger('DynamicMcpToolRegistry');

  /**
   * Register a handler function for a tool that was created from MCP JSON schema.
   * The handler will replace the placeholder function.
   */
  static registerHandler(tools: Tool[], handlers: Record<string, (args: unknown) => Promise<unknown> | unknown>): void {
    for (const tool of tools) {
      const handler = handlers[tool.name];
      if (handler) {
        // Replace the placeholder function with the actual handler
        // We need to cast through 'any' since Tool.function is typed narrowly
        (tool as unknown as { function: (args: unknown) => unknown }).function = handler;
        this.logger.info(`Registered handler for tool: ${tool.name}`);
      }
    }
  }

  /**
   * Create tools from an MCP JSON string and register handlers in one step.
   */
  static createToolsWithHandlers(
    jsonString: string,
    handlers: Record<string, (args: unknown) => Promise<unknown> | unknown>,
  ): { tools: Tool[]; errors: string[] } {
    const { tools, errors } = McpJsonParser.parse(jsonString);
    if (tools.length > 0) {
      this.registerHandler(tools, handlers);
    }
    return { tools, errors };
  }
}
