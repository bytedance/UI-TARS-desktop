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

    it('should parse simple think and answer', () => {
      const content = '<think>thinking</think><answer>final answer</answer>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('thinking');
      expect(result.answer).toBe('final answer');
      expect(result.tools).toEqual([]);
    });

    it('should parse content with only FunctionCall tag', () => {
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

    it('should parse content with multiple tool calls', () => {
      const content =
        '<mcp_env>\n<think>需要进行多个搜索</think>\n<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"query1"}},{"name":"LinkReader","parameters":{"url":"http://example.com"}}]<|FunctionCallEnd|>\n</mcp_env>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('需要进行多个搜索');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(2);
      expect(result.tools[0].function.name).toBe('Search');
      expect(result.tools[1].function.name).toBe('LinkReader');
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

    it('should handler answer without <answer>', () => {
      const content = `<|FCResponseBegin|>北京今日（2025年7月23日）天气为雷阵雨，气温在25℃-33℃之间，风力小于3级；明日（7月24日）仍为雷阵雨天气，气温25℃-30℃，风力小于3级。</answer>`;
      const result = (engine as any).parseContent(content);
      expect(result.answer).toBe(
        '北京今日（2025年7月23日）天气为雷阵雨，气温在25℃-33℃之间，风力小于3级；明日（7月24日）仍为雷阵雨天气，气温25℃-30℃，风力小于3级。',
      );
      expect(result.tools).toHaveLength(0);
      expect(result.think).toBe('');
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

    it('should parse content without FunctionCallBegin', () => {
      const content =
        '<mcp_env>\n' +
        '[{"name":"LinkReader","parameters":{"description":"获取北京当前及近期详细天气信息，包括温度、天气状况等","url":"https://www.weather.com.cn/weather/101010100.shtml"}}]<|FunctionCallEnd|>\n' +
        '</mcp_env>';

      const result = (engine as any).parseContent(content);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('LinkReader');
      expect(JSON.parse(result.tools[0].function.arguments)).toEqual({
        description: '获取北京当前及近期详细天气信息，包括温度、天气状况等',
        url: 'https://www.weather.com.cn/weather/101010100.shtml',
      });
    });
  });
});
