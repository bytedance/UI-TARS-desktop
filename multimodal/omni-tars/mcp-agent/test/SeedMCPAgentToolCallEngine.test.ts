/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { McpToolCallEngine } from '../src/McpToolCallEngine';

describe('SeedMCPAgentToolCallEngine', () => {
  let engine: McpToolCallEngine;

  beforeEach(() => {
    engine = new McpToolCallEngine();
  });

  describe('parseContent', () => {
    it('should parse content with only think tag', () => {
      const content = '<think>Only thinking content</think>';

      const result = engine.parseContent(content);

      expect(result.think).toBe('Only thinking content');
      expect(result.answer).toBe('');
      expect(result.tools).toEqual([]);
    });

    it('should parse content with only answer tag', () => {
      const content = '<answer>Only answer content</answer>';

      const result = engine.parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('Only answer content');
      expect(result.tools).toEqual([]);
    });

    it('should parse simple think and answer', () => {
      const content = '<think>thinking</think><answer>final answer</answer>';

      const result = engine.parseContent(content);

      expect(result.think).toBe('thinking');
      expect(result.answer).toBe('final answer');
      expect(result.tools).toEqual([]);
    });

    it('should parse content with only FunctionCall tag', () => {
      const content =
        '<mcp_env>\n<|FunctionCallBegin|>User needs to understand the current weather conditions in Beijing.[{"name":"Search","parameters":{"query":"Beijing current weather"}}]<|FunctionCallEnd|>\n</mcp_env>';

      const result = engine.parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('Search');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({
        query: 'Beijing current weather',
      });
      expect(result.tools[0].id).toMatch(/^call_\d+_[a-z0-9]+$/);
      expect(result.tools[0].type).toBe('function');
    });

    it('should parse content with multiple tool calls', () => {
      const content =
        '<mcp_env>\n<think>Need to perform multiple searches</think>\n<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"query1"}},{"name":"LinkReader","parameters":{"url":"http://example.com"}}]<|FunctionCallEnd|>\n</mcp_env>';

      const result = engine.parseContent(content);

      expect(result.think).toBe('Need to perform multiple searches');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].function.name).toBe('Search');
      expect(result.tools[1].function.name).toBe('LinkReader');
    });

    it('should handle content without any tags', () => {
      const content = 'This is ordinary text content without any tags';

      const result = engine.parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('This is ordinary text content without any tags');
      expect(result.tools).toEqual([]);
    });

    it('should handle empty content', () => {
      const content = '';

      const result = engine.parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
      expect(result.tools).toEqual([]);
    });

    it('should handle content with think but no answer and no tools', () => {
      const content = '<think>Only thinking</think>Remaining content';

      const result = engine.parseContent(content);

      expect(result.think).toBe('Only thinking');
      expect(result.answer).toBe('Remaining content');
      expect(result.tools).toEqual([]);
    });

    it('should handle tool calls with empty parameters', () => {
      const content =
        '<|FunctionCallBegin|>[{"name":"TestTool","parameters":{}}]<|FunctionCallEnd|>';

      const result = engine.parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('TestTool');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({});
    });

    it('should handle tool calls without parameters', () => {
      const content = '<|FunctionCallBegin|>[{"name":"TestTool"}]<|FunctionCallEnd|>';

      const result = engine.parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('TestTool');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({});
    });

    it('should parse new format - FunctionCallBegin with think content and JSON without FunctionCallEnd', () => {
      const content = `<mcp_env>
<|FunctionCallBegin|>I need to search for the current weather conditions in Beijing, so I use the Search tool with the query set to "Beijing current weather"</think>
[{"name":"Search","parameters":{"query":"Beijing current weather"}}]
</mcp_env>`;

      const result = engine.parseContent(content);

      expect(result.think).toBe(
        'I need to search for the current weather conditions in Beijing, so I use the Search tool with the query set to "Beijing current weather"',
      );
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('Search');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({
        query: 'Beijing current weather',
      });
      expect(result.tools[0].id).toMatch(/^call_\d+_[a-z0-9]+$/);
      expect(result.tools[0].type).toBe('function');
    });

    it('should parse new format with multiple tool calls', () => {
      const content = `<mcp_env>
<|FunctionCallBegin|>Need to perform search and link reading</think>
[{"name":"Search","parameters":{"query":"test query"}},{"name":"LinkReader","parameters":{"url":"https://example.com"}}]
</mcp_env>`;

      const result = engine.parseContent(content);

      expect(result.think).toBe('Need to perform search and link reading');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].function.name).toBe('Search');
      expect(result.tools[1].function.name).toBe('LinkReader');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({
        query: 'test query',
      });
      expect(JSON.parse(result.tools[1].function.arguments)).toEqual({
        url: 'https://example.com',
      });
    });

    it('should handler answer without <answer>', () => {
      const content = `<|FCResponseBegin|>Beijing's weather today (July 23, 2025) is thundershowers, with temperatures between 25°C-33°C and wind force less than level 3; tomorrow (July 24) will still be thundershowers, with temperatures 25°C-30°C and wind force less than level 3.</answer>`;
      const result = engine.parseContent(content);
      expect(result.answer).toBe(
        "Beijing's weather today (July 23, 2025) is thundershowers, with temperatures between 25°C-33°C and wind force less than level 3; tomorrow (July 24) will still be thundershowers, with temperatures 25°C-30°C and wind force less than level 3.",
      );
      expect(result.tools).toHaveLength(0);
      expect(result.think).toBe('');
    });

    it('should handle malformed JSON in tool calls gracefully', () => {
      const content =
        '<mcp_env>\n<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"test"</|FunctionCallEnd|>\n</mcp_env>';

      const result = engine.parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe(
        '<mcp_env>\n<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"test"</|FunctionCallEnd|>\n</mcp_env>',
      );
      expect(result.tools).toEqual([]);
    });

    it('should parse content without FunctionCallBegin', () => {
      const content =
        '<mcp_env>\n' +
        '[{"name":"LinkReader","parameters":{"description":"Get detailed weather information for Beijing current and recent periods, including temperature, weather conditions, etc.","url":"https://www.weather.com.cn/weather/101010100.shtml"}}]<|FunctionCallEnd|>\n' +
        '</mcp_env>';

      const result = engine.parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('LinkReader');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({
        description:
          'Get detailed weather information for Beijing current and recent periods, including temperature, weather conditions, etc.',
        url: 'https://www.weather.com.cn/weather/101010100.shtml',
      });
    });
  });
});
