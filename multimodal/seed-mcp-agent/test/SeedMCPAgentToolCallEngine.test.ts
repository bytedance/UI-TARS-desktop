/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SeedMCPAgentToolCallEngine } from '../src/SeedMCPAgentToolCallEngine';

describe('SeedMCPAgentToolCallEngine', () => {
  let engine: SeedMCPAgentToolCallEngine;

  beforeEach(() => {
    engine = new SeedMCPAgentToolCallEngine();
  });

  describe('parseContent', () => {
    it('should parse content with think and answer tags', () => {
      const content = '<think>这是思考过程</think><answer>这是最终答案</answer>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('这是思考过程');
      expect(result.answer).toBe('这是最终答案');
      expect(result.tools).toEqual([]);
    });

    it('should parse content with only think tag', () => {
      const content = '<think>只有思考内容</think>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('只有思考内容');
      expect(result.answer).toBe('');
      expect(result.tools).toEqual([]);
    });

    it('should parse content with only answer tag', () => {
      const content = '<answer>只有答案内容</answer>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('只有答案内容');
      expect(result.tools).toEqual([]);
    });

    it('should parse resp1 format - FunctionCall without think tag', () => {
      const content =
        '<mcp_env>\n<|FunctionCallBegin|>用户需要了解北京当前的天气情况。[{"name":"Search","parameters":{"query":"北京当前天气"}}]<|FunctionCallEnd|>\n</mcp_env>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('Search');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({
        query: '北京当前天气',
      });
      expect(result.tools[0].id).toMatch(/^call_\d+_[a-z0-9]+$/);
      expect(result.tools[0].type).toBe('function');
    });

    // it('should parse resp2 format - think tag with FunctionCall', () => {
    //   const content =
    //     '<mcp_env>\n<think>I need to search information</think>\n<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"UEFA Champions League"}}]<|FunctionCallEnd|>\n</mcp_env>';

    //   const result = (engine as any).parseContent(content);

    //   expect(result.think).toBe('I need to search information');
    //   expect(result.answer).toBe('');
    //   expect(result.tools).toHaveLength(1);
    //   expect(result.tools[0].function.name).toBe('Search');
    //   expect(JSON.parse(result.tools[0].function.arguments)).toEqual({});
    //   expect(result.tools[0].id).toMatch(/^call_\d+_[a-z0-9]+$/);
    //   expect(result.tools[0].type).toBe('function');
    // });

    it('should parse resp3 format - simple think and answer', () => {
      const content = '<think>thinking</think><answer>final answer</answer>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('thinking');
      expect(result.answer).toBe('final answer');
      expect(result.tools).toEqual([]);
    });

    it('should parse multiple tool calls', () => {
      const content =
        '<mcp_env>\n<think>需要进行多个搜索</think>\n<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"query1"}},{"name":"LinkReader","parameters":{"url":"http://example.com"}}]<|FunctionCallEnd|>\n</mcp_env>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('需要进行多个搜索');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].function.name).toBe('Search');
      expect(result.tools[1].function.name).toBe('LinkReader');
    });

    it('should handle malformed JSON in tool calls gracefully', () => {
      const content =
        '<mcp_env>\n<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"test"</|FunctionCallEnd|>\n</mcp_env>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe(
        '<mcp_env>\n<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"test"</|FunctionCallEnd|>\n</mcp_env>',
      );
      expect(result.tools).toEqual([]);
    });

    it('should handle content without any tags', () => {
      const content = '这是普通的文本内容，没有任何标签';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('这是普通的文本内容，没有任何标签');
      expect(result.tools).toEqual([]);
    });

    it('should handle empty content', () => {
      const content = '';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
      expect(result.tools).toEqual([]);
    });

    it('should handle content with think but no answer and no tools', () => {
      const content = '<think>只有思考</think>剩余内容';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('只有思考');
      expect(result.answer).toBe('剩余内容');
      expect(result.tools).toEqual([]);
    });

    it('should handle tool calls with empty parameters', () => {
      const content =
        '<|FunctionCallBegin|>[{"name":"TestTool","parameters":{}}]<|FunctionCallEnd|>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('TestTool');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({});
    });

    it('should handle tool calls without parameters', () => {
      const content = '<|FunctionCallBegin|>[{"name":"TestTool"}]<|FunctionCallEnd|>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('TestTool');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({});
    });

    it('should parse new format - FunctionCallBegin with think content and JSON without FunctionCallEnd', () => {
      const content = `<mcp_env>
<|FunctionCallBegin|>我需要搜索北京当前的天气情况，所以使用Search工具，查询词设为"北京当前天气"</think>
[{"name":"Search","parameters":{"query":"北京当前天气"}}]
</mcp_env>`;

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe(
        '我需要搜索北京当前的天气情况，所以使用Search工具，查询词设为"北京当前天气"',
      );
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('Search');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({
        query: '北京当前天气',
      });
      expect(result.tools[0].id).toMatch(/^call_\d+_[a-z0-9]+$/);
      expect(result.tools[0].type).toBe('function');
    });

    it('should parse new format with multiple tool calls', () => {
      const content = `<mcp_env>
<|FunctionCallBegin|>需要进行搜索和链接读取</think>
[{"name":"Search","parameters":{"query":"test query"}},{"name":"LinkReader","parameters":{"url":"https://example.com"}}]
</mcp_env>`;

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('需要进行搜索和链接读取');
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
  });
});
