/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  McpJsonParser,
  DynamicMcpToolRegistry,
  type McpJsonSchema,
  type McpToolDefinition,
} from '../src/tools/mcp-json-parser';

describe('McpJsonParser', () => {
  describe('parse()', () => {
    it('should parse standard MCP tools/list format', () => {
      const input: McpJsonSchema = {
        tools: [
          {
            name: 'Search',
            description: 'Search the web',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'The search query' },
              },
              required: ['query'],
            },
          },
          {
            name: 'LinkReader',
            description: 'Read a URL',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string' },
                description: { type: 'string' },
              },
              required: ['url'],
            },
          },
        ],
      };

      const { tools, errors } = McpJsonParser.parse(JSON.stringify(input));

      expect(errors).toHaveLength(0);
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('Search');
      expect(tools[1].name).toBe('LinkReader');
    });

    it('should parse legacy single-tool format with input_schema key', () => {
      const input = {
        name: 'my_calculator',
        description: 'Perform calculations',
        input_schema: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression' },
          },
          required: ['expression'],
        },
      };

      const { tools, errors } = McpJsonParser.parse(JSON.stringify(input));

      expect(errors).toHaveLength(0);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('my_calculator');
      expect(tools[0].description).toBe('Perform calculations');
    });

    it('should parse single-tool format with inputSchema key', () => {
      const input = {
        name: 'my_calculator',
        description: 'Perform calculations',
        inputSchema: {
          type: 'object',
          properties: {
            expression: { type: 'string', description: 'Math expression' },
          },
          required: ['expression'],
        },
      };

      const { tools, errors } = McpJsonParser.parse(JSON.stringify(input));

      expect(errors).toHaveLength(0);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('my_calculator');
    });

    it('should return error for invalid JSON', () => {
      const { tools, errors } = McpJsonParser.parse('not json at all');

      expect(tools).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Invalid JSON');
    });

    it('should return error for unrecognized format', () => {
      const { tools, errors } = McpJsonParser.parse(JSON.stringify({ foo: 'bar' }));

      expect(tools).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Unrecognized MCP JSON format');
    });

    it('should handle tools with all primitive types', () => {
      const input: McpJsonSchema = {
        tools: [
          {
            name: 'multi_type_tool',
            inputSchema: {
              type: 'object',
              properties: {
                strField: { type: 'string' },
                numField: { type: 'number' },
                intField: { type: 'integer' },
                boolField: { type: 'boolean' },
                arrayField: { type: 'array' },
                objField: { type: 'object' },
                unknownField: { type: 'unknown' },
              },
              required: ['strField', 'numField', 'boolField'],
            },
          },
        ],
      };

      const { tools, errors } = McpJsonParser.parse(JSON.stringify(input));

      expect(errors).toHaveLength(0);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('multi_type_tool');
    });

    it('should handle missing inputSchema gracefully', () => {
      const input = { name: 'bad_tool', description: 'missing schema' };

      const { tools, errors } = McpJsonParser.parse(JSON.stringify(input));

      expect(tools).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('missing required field: inputSchema');
    });

    it('should report error per individual tool in a batch that has partial failures', () => {
      const input: McpJsonSchema = {
        tools: [
          {
            name: 'good_tool',
            inputSchema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] },
          },
          { name: 'bad_tool', description: 'missing schema' },
          {
            name: 'another_good',
            inputSchema: { type: 'object', properties: { x: { type: 'number' } }, required: [] },
          },
        ],
      };

      const { tools, errors } = McpJsonParser.parse(JSON.stringify(input));

      expect(tools).toHaveLength(2);
      expect(tools.map((t) => t.name)).toEqual(['good_tool', 'another_good']);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('bad_tool');
    });
  });

  describe('DynamicMcpToolRegistry', () => {
    it('should register handlers for parsed tools', async () => {
      const input: McpJsonSchema = {
        tools: [
          {
            name: 'adder',
            description: 'Adds two numbers',
            inputSchema: {
              type: 'object',
              properties: {
                a: { type: 'number', description: 'First number' },
                b: { type: 'number', description: 'Second number' },
              },
              required: ['a', 'b'],
            },
          },
        ],
      };

      const { tools } = McpJsonParser.parse(JSON.stringify(input));

      const handlers = {
        adder: async (args: unknown) => {
          const { a, b } = args as { a: number; b: number };
          return String(a + b);
        },
      };

      DynamicMcpToolRegistry.registerHandler(tools, handlers);

      // Call the tool function directly
      const result = await tools[0].function({ a: 3, b: 5 });
      expect(result).toBe('8');
    });

    it('should create tools with handlers in one step', async () => {
      const json = JSON.stringify({
        name: 'multiplier',
        inputSchema: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
          },
          required: ['x', 'y'],
        },
      });

      const handlers = {
        multiplier: async (args: unknown) => {
          const { x, y } = args as { x: number; y: number };
          return String(x * y);
        },
      };

      const { tools, errors } = DynamicMcpToolRegistry.createToolsWithHandlers(json, handlers);

      expect(errors).toHaveLength(0);
      expect(tools).toHaveLength(1);
      expect(await tools[0].function({ x: 4, y: 7 })).toBe('28');
    });

    it('should ignore handlers for tools that were not parsed', () => {
      const input: McpJsonSchema = {
        tools: [
          {
            name: 'tool_a',
            inputSchema: { type: 'object', properties: {}, required: [] },
          },
        ],
      };

      const { tools } = McpJsonParser.parse(JSON.stringify(input));

      // Register handler for a different tool name
      const handlers = { tool_b: async () => 'result' };

      // Should not throw
      DynamicMcpToolRegistry.registerHandler(tools, handlers);
    });
  });

  describe('real-world MCP JSON samples', () => {
    it('should parse a typical Claude MCP server tools/list response', () => {
      // Real-world example from an MCP server
      const realMcpResponse = JSON.stringify({
        tools: [
          {
            name: 'tavily_search',
            description: 'Search for information using the Tavily search engine',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to look up',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'tavily_extract',
            description: 'Extract information from specific URLs',
            inputSchema: {
              type: 'object',
              properties: {
                urls: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of URLs to extract from',
                },
              },
              required: ['urls'],
            },
          },
        ],
      });

      const { tools, errors } = McpJsonParser.parse(realMcpResponse);

      expect(errors).toHaveLength(0);
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('tavily_search');
      expect(tools[1].name).toBe('tavily_extract');
    });

    it('should parse a single tool config commonly used in MCP provider docs', () => {
      // Common "copy-paste" format from MCP provider documentation
      const singleToolJson = JSON.stringify({
        name: 'filesystem',
        description: 'Read and write files to the local filesystem',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path' },
            content: { type: 'string', description: 'Content to write' },
          },
          required: ['path'],
        },
      });

      const { tools, errors } = McpJsonParser.parse(singleToolJson);

      expect(errors).toHaveLength(0);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('filesystem');
    });
  });
});
