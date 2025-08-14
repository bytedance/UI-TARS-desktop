/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { parseCodeContent, parseMcpContent, parseComputerContent } from '../src/utils/parser';

describe('Parser Functions', () => {
  describe('parseCodeContent', () => {
    it('should parse code content with think and tool call', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>xxx</think_never_used_51bce0c785ca2f68081bfa7d91973934>
<code_env>
<function=str_replace_editor>
<parameter=command>view</parameter>
<parameter=path>/app/src/data_processor.py</parameter>
</function>
</code_env>`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('xxx');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools![0].function.name).toBe('str_replace_editor');
      expect(JSON.parse(result.tools![0].function.arguments)).toEqual({
        command: 'view',
        path: '/app/src/data_processor.py',
      });
    });

    it('should parse content with answer tag', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>
xxx
</think_never_used_51bce0c785ca2f68081bfa7d91973934>
<answer>
The task is finished, answer is xxx
</answer>`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('xxx');
      expect(result.answer).toBe('The task is finished, answer is xxx');
      expect(result.tools).toEqual([]);
    });

    it('should handle content without code_env', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>thinking</think_never_used_51bce0c785ca2f68081bfa7d91973934>`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('thinking');
      expect(result.answer).toBe('');
      expect(result.tools).toEqual([]);
    });
  });

  describe('parseMcpContent', () => {
    it('should parse MCP content with function call', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>xxx</think_never_used_51bce0c785ca2f68081bfa7d91973934>
<mcp_env>
<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"Season 2015/16 Stats UEFA Champions League top goal scoring teams"}}]<|FunctionCallEnd|>
</mcp_env>`;

      const result = parseMcpContent(input);

      expect(result.think).toBe('xxx');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools![0].function.name).toBe('Search');
      expect(JSON.parse(result.tools![0].function.arguments)).toEqual({
        query: 'Season 2015/16 Stats UEFA Champions League top goal scoring teams',
      });
    });

    it('should extract content outside think tags as answer in MCP content', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>
Planning the search
</think_never_used_51bce0c785ca2f68081bfa7d91973934>

Based on the search results, here is the answer.

<mcp_env>
<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"test"}}]<|FunctionCallEnd|>
</mcp_env>`;

      const result = parseMcpContent(input);

      expect(result.think).toBe('Planning the search');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].function.name).toBe('Search');
    });

    it('should handle multiple function calls', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>thinking</think_never_used_51bce0c785ca2f68081bfa7d91973934>
<mcp_env>
<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"test"}},{"name":"Analyze","parameters":{"data":"sample"}}]<|FunctionCallEnd|>
</mcp_env>`;

      const result = parseMcpContent(input);

      expect(result.think).toBe('thinking');
      expect(result.tools).toHaveLength(2);
      expect(result.tools![0].function.name).toBe('Search');
      expect(result.tools![1].function.name).toBe('Analyze');
    });

    it('should handle invalid JSON gracefully', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>thinking</think_never_used_51bce0c785ca2f68081bfa7d91973934>
<mcp_env>
<|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"test"</|FunctionCallEnd|>
</mcp_env>`;

      const result = parseMcpContent(input);

      expect(result.think).toBe('thinking');
      expect(result.tools).toEqual([]);
    });
  });

  describe('parseComputerContent', () => {
    it('should parse computer action with point parameter', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>
xxx
</think_never_used_51bce0c785ca2f68081bfa7d91973934>
<computer_env>
Action: click(point='<point>100 200</point>')
</computer_env>`;

      const result = parseComputerContent(input);

      expect(result.think).toBe('xxx');
      expect(result.answer).toBe('');
      expect(result.tools).toHaveLength(1);
      expect(result.tools![0].function.name).toBe('click');
      expect(JSON.parse(result.tools![0].function.arguments)).toEqual({
        point: { x: 100, y: 200 },
      });
    });

    it('should parse computer action with multiple parameters', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>thinking</think_never_used_51bce0c785ca2f68081bfa7d91973934>
<computer_env>
Action: type(text='hello world', delay=100)
</computer_env>`;

      const result = parseComputerContent(input);

      expect(result.think).toBe('thinking');
      expect(result.tools).toHaveLength(1);
      expect(result.tools![0].function.name).toBe('type');
      expect(JSON.parse(result.tools![0].function.arguments)).toEqual({
        text: 'hello world',
        delay: '100',
      });
    });

    it('should handle content without computer_env', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>thinking</think_never_used_51bce0c785ca2f68081bfa7d91973934>`;

      const result = parseComputerContent(input);

      expect(result.think).toBe('thinking');
      expect(result.answer).toBe('');
      expect(result.tools).toEqual([]);
    });
  });

  describe('Common tag parsing', () => {
    it('should handle missing think tag', () => {
      const input = `<answer>just answer</answer>`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('');
      expect(result.answer).toBe('just answer');
    });

    it('should extract content outside think tags as answer when no answer tag', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>
some thinking
</think_never_used_51bce0c785ca2f68081bfa7d91973934>

This is the actual content that should be the answer.`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('some thinking');
      expect(result.answer).toBe('This is the actual content that should be the answer.');
    });

    it('should handle content with think tags in the middle', () => {
      const input = `Before think content
<think_never_used_51bce0c785ca2f68081bfa7d91973934>
internal thinking
</think_never_used_51bce0c785ca2f68081bfa7d91973934>
After think content`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('internal thinking');
      expect(result.answer).toBe('Before think content\n\nAfter think content');
    });

    it('should handle multiple think blocks and extract remaining content', () => {
      const input = `Start content
<think_never_used_51bce0c785ca2f68081bfa7d91973934>
first think
</think_never_used_51bce0c785ca2f68081bfa7d91973934>
Middle content
<think_never_used_51bce0c785ca2f68081bfa7d91973934>
second think
</think_never_used_51bce0c785ca2f68081bfa7d91973934>
End content`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('first think'); // Only first think block is extracted
      expect(result.answer).toBe('Start content\n\nMiddle content\n\nEnd content');
    });

    it('should prioritize answer tag over content outside think tags', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>
thinking
</think_never_used_51bce0c785ca2f68081bfa7d91973934>
Content outside think
<answer>
This is in answer tag
</answer>`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('thinking');
      expect(result.answer).toBe('This is in answer tag');
    });

    it('should handle empty content outside think tags', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>
only thinking here
</think_never_used_51bce0c785ca2f68081bfa7d91973934>`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('only thinking here');
      expect(result.answer).toBe('');
    });

    it('should handle content with various whitespace around think tags', () => {
      const input = `   
      
<think_never_used_51bce0c785ca2f68081bfa7d91973934>
thinking content
</think_never_used_51bce0c785ca2f68081bfa7d91973934>

Answer content with spaces around
   
   `;

      const result = parseCodeContent(input);

      expect(result.think).toBe('thinking content');
      expect(result.answer).toBe('Answer content with spaces around');
    });

    it('should handle empty tags', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934></think_never_used_51bce0c785ca2f68081bfa7d91973934>
<answer></answer>`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('');
      expect(result.answer).toBe('');
    });

    it('should trim whitespace from extracted content', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>
      
      some thinking with whitespace
      
      </think_never_used_51bce0c785ca2f68081bfa7d91973934>
<answer>
      
      some answer with whitespace
      
      </answer>`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('some thinking with whitespace');
      expect(result.answer).toBe('some answer with whitespace');
    });
  });

  describe('Tool call ID generation', () => {
    it('should generate unique IDs for different tool calls', () => {
      const input1 = `<code_env><function=test1><parameter=param>value</parameter></function></code_env>`;
      const input2 = `<code_env><function=test2><parameter=param>value</parameter></function></code_env>`;

      const result1 = parseCodeContent(input1);
      const result2 = parseCodeContent(input2);

      expect(result1.tools![0].id).not.toBe(result2.tools![0].id);
      expect(result1.tools![0].id).toMatch(/^call_\d+_[a-z0-9]{9}$/);
      expect(result2.tools![0].id).toMatch(/^call_\d+_[a-z0-9]{9}$/);
    });
  });

  describe('tool call without closed tag, eg: lose </code_env>', () => {
    it('should parse correctly for code_env', () => {
      const input = `<think_never_used_51bce0c785ca2f68081bfa7d91973934>xxx</think_never_used_51bce0c785ca2f68081bfa7d91973934>
      <code_env>
        <function=str_replace_editor>
        <parameter=command>view</parameter>
        <parameter=path>/app/src/data_processor.py</parameter>
        </function>`;

      const result = parseCodeContent(input);

      expect(result.think).toBe('xxx');
      expect(result.tools.length).toBe(1);
      expect(result.tools[0].function.name).toBe('str_replace_editor');
    });

    it('should parse correctly for mcp_env', () => {
      const input = ` <think_never_used_51bce0c785ca2f68081bfa7d91973934>
          xxx
          </think_never_used_51bce0c785ca2f68081bfa7d91973934>

          <mcp_env>
          <|FunctionCallBegin|>
          [{"name": "Search", "parameters": {"query": "latest GUI Agent papers 2024 2025"}}]
          <|FunctionCallEnd|>`;
      const result = parseMcpContent(input);

      expect(result.think).toBe('xxx');
      expect(result.tools.length).toBe(1);
      expect(result.tools[0].function.name).toBe('Search');
    });
  });
});
