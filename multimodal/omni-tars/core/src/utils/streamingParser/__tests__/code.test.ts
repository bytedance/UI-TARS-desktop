/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createInitState, processStreamingChunk, OmniStreamProcessingState } from '../index';
import { realStreamingChunks, createChunk } from '../data/testData';
import { StreamingToolCallUpdate } from '@tarko/agent-interface';

describe('processStreamingChunk', () => {
  let state: OmniStreamProcessingState;

  beforeEach(() => {
    state = createInitState();
  });

  describe('code_env tag parsing', () => {
    it('should parse code_env tag in single chunk', () => {
      const chunk = createChunk(`<code_env>
<function=str_replace_editor>
<parameter=command>create</parameter>
<parameter=path>/home/gem/fibonacci/fibonacci_function.py</parameter>
<parameter=file_text>xxx
</parameter>
</function>
</code_env>`);

      const result = processStreamingChunk(chunk, state);

      // console.log('**** streamingToolCallUpdates: ', result.streamingToolCallUpdates);

      expect(result.content).toBe('');
      expect(result.reasoningContent).toBe('');
      expect(result.hasToolCallUpdate).toBe(true);
      expect(result.streamingToolCallUpdates?.length).toBeGreaterThan(0);
      expect(result.streamingToolCallUpdates?.[0].toolCallId).toBeDefined();
      expect(result.streamingToolCallUpdates?.[0].toolName).toBe('str_replace_editor');
      // The last update should mark completion
      const lastUpdate =
        result.streamingToolCallUpdates?.[result.streamingToolCallUpdates.length - 1];
      expect(lastUpdate?.isComplete).toBe(true);
      expect(result.toolCalls).toEqual([
        {
          id: 'random_id',
          type: 'function',
          function: {
            name: 'str_replace_editor',
            arguments:
              '{"command": "create", "path": "/home/gem/fibonacci/fibonacci_function.py", "file_text": "xxx\\n" }',
          },
        },
      ]);
      expect(state.accumulatedAnswerBuffer).toBe('');
      expect(state.reasoningBuffer).toBe('');
    });

    it('should parse real-world streaming data with complete file content', () => {
      // Use actual streaming chunks from the code.jsonl file to test real-world scenarios
      // This includes complete streaming data with full tool call execution
      const allUpdates: StreamingToolCallUpdate[] = [];
      for (const chunk of realStreamingChunks) {
        const result = processStreamingChunk(createChunk(chunk), state);
        if (result.streamingToolCallUpdates) {
          allUpdates.push(...result.streamingToolCallUpdates);
        }
      }
      // Verify think content was processed
      expect(state.reasoningBuffer).toContain('项目');
      expect(state.reasoningBuffer).toContain('目录');
      expect(state.reasoningBuffer).toContain('斐波那契');

      // Tool call should be created and completed
      expect(state.toolCalls.length).toBe(1);

      // Verify complete arguments were parsed correctly
      const toolCall = state.toolCalls[0];
      expect(toolCall.function.name).toBe('str_replace_editor');

      const args = JSON.parse(toolCall.function.arguments);
      expect(args.command).toBe('create');
      expect(args.path).toBe('/home/gem/fibonacci/fibonacci_function.py');
      expect(args.file_text).toContain('def fibonacci(n):');
      expect(args.file_text).toContain('生成斐波那契数列的函数');
      expect(args.file_text).toContain('return fib_sequence');

      // console.log(JSON.stringify(state, null, 2));

      // Verify streamingToolCallUpdates captured intermediate states
      expect(allUpdates.length).toBeGreaterThan(0);
      // Find updates with argumentsDelta to verify incremental parsing
      const deltaUpdates = allUpdates.filter(
        (update: StreamingToolCallUpdate) => update.argumentsDelta,
      );
      expect(deltaUpdates.length).toBeGreaterThan(0);

      // Check if we have any completed updates
      const completedUpdates = allUpdates.filter(
        (update: StreamingToolCallUpdate) => update.isComplete,
      );
      expect(completedUpdates.length).toBeGreaterThan(0);
    });

    it('should handle code_env parameter with complex content across chunks', () => {
      // Test handling of file content parameter that spans multiple chunks
      const chunks = [
        '<code_env>\n<function=str_replace_editor>\n<parameter=command>create</parameter>\n<parameter=path>/test.py</parameter>\n<parameter=file_text>def fib',
        'onacci(n):\n    return [0, 1]',
        '</parameter>\n</function>\n</code_env>',
      ];

      for (const chunk of chunks) {
        processStreamingChunk(createChunk(chunk), state);
      }

      // Final state should have complete tool call with complex file content
      expect(state.toolCalls.length).toBe(1);
      expect(state.toolCalls[0].function.name).toBe('str_replace_editor');

      const args = JSON.parse(state.toolCalls[0].function.arguments);
      expect(args.command).toBe('create');
      expect(args.path).toBe('/test.py');
      expect(args.file_text).toContain('def fibonacci(n):');
      expect(args.file_text).toContain('return [0, 1]');
    });

    it('should handle mixed think and code_env tags correctly', () => {
      // Test scenario with both think and code_env tags in sequence
      // const chunk = createChunk(
      //   '<think>我需要创建Python文件</think>\n<code_env>\n<function=str_replace_editor>\n<parameter=command>create</parameter>\n<parameter=path>/test.py</parameter>\n<parameter=file_text>print("Hello")</parameter>\n</function>\n</code_env>',
      // );

      // const result = processStreamingChunk(chunk, state);

      const chunks = [
        '<think>我需要创建Pyth',
        'on文件</t',
        'hink>\n<co',
        'de_env>\n<fun',
        'ction=',
        'str_replace_editor',
        '>\n<parameter=command>create</parameter>',
        '\n<parameter=pat',
        'h>/test.py</paramete',
        'r>\n<parameter=file_tex',
        't>print("Hello")</parameter>\n</function>\n</code_env>',
      ];

      for (const chunk of chunks) {
        processStreamingChunk(createChunk(chunk), state);
      }

      // Should have Chinese reasoning content from think tag
      expect(state.reasoningBuffer).toBe('我需要创建Python文件');

      // Should have tool call from code_env
      expect(state.toolCalls.length).toBe(1);
      expect(state.toolCalls[0].function.name).toBe('str_replace_editor');

      const args = JSON.parse(state.toolCalls[0].function.arguments);
      expect(args.command).toBe('create');
      expect(args.path).toBe('/test.py');
      expect(args.file_text).toBe('print("Hello")');
    });

    it('should track argumentsDelta in streamingToolCallUpdates for intermediate states', () => {
      // Test that argumentsDelta is correctly captured during streaming
      const allUpdates: StreamingToolCallUpdate[] = [];

      // Simulate streaming chunks that build up arguments incrementally
      const chunks = [
        '<code_env>\\n<function=str_replace_editor>\\n<parameter=command>',
        'create</parameter>\\n<parameter=path>/test',
        '.py</parameter>\\n<parameter=file_text>def ',
        'hello():\\n    print("Hello")',
        '</parameter>\\n</function>\\n</code_env>',
      ];

      for (const chunk of chunks) {
        const result = processStreamingChunk(createChunk(chunk), state);
        if (result.streamingToolCallUpdates) {
          allUpdates.push(...result.streamingToolCallUpdates);
        }
      }

      // Verify that argumentsDelta was captured correctly
      const deltaUpdates = allUpdates.filter((update) => update.argumentsDelta);
      expect(deltaUpdates.length).toBeGreaterThan(0);

      // Verify that each update have correct toolName
      deltaUpdates.forEach((u) => expect(u.toolName).toBe('str_replace_editor'));

      // Check that argumentsDelta contains incremental parameter data
      const commandDelta = deltaUpdates.find(
        (update) => update.argumentsDelta && update.argumentsDelta.includes('command'),
      );
      expect(commandDelta).toBeDefined();

      const pathDelta = deltaUpdates.find(
        (update) => update.argumentsDelta && update.argumentsDelta.includes('path'),
      );
      expect(pathDelta).toBeDefined();

      const fileTextDelta = deltaUpdates.find(
        (update) => update.argumentsDelta && update.argumentsDelta.includes('file_text'),
      );
      expect(fileTextDelta).toBeDefined();

      // Verify the final arguments are complete
      expect(deltaUpdates.map((u) => u.argumentsDelta).join('')).toBe(
        '{"command": "create", "path": "/test.py", "file_text": "def hello():\\\\n    print(\\"Hello\\")" }',
      );

      const finalArgs = JSON.parse(state.toolCalls[0].function.arguments);
      expect(finalArgs.command).toBe('create');
      expect(finalArgs.path).toBe('/test.py');
      expect(finalArgs.file_text).toContain('def hello()');
    });

    it('should correctly track argumentsDelta values during real streaming', () => {
      // Test with real streaming data to verify argumentsDelta correctness
      const allUpdates: StreamingToolCallUpdate[] = [];
      const stateSnapshots: any[] = [];
      let chunkIndex = 0;

      for (const chunk of realStreamingChunks) {
        const result = processStreamingChunk(createChunk(chunk), state);

        if (result.streamingToolCallUpdates && result.streamingToolCallUpdates.length > 0) {
          allUpdates.push(
            ...result.streamingToolCallUpdates.map((update) => ({
              ...update,
              chunkIndex,
              chunk,
            })),
          );

          // Take snapshots of state.toolCalls at key moments
          stateSnapshots.push({
            chunkIndex,
            chunk,
            toolCallsCount: state.toolCalls.length,
            toolCallsState: JSON.parse(JSON.stringify(state.toolCalls)),
            argumentsLength: state.toolCalls[0]?.function.arguments.length || 0,
          });
        }
        chunkIndex++;
      }

      // Should have 293 content chunks based on testData
      expect(allUpdates.length).toBe(293);

      // Check that argumentsDelta values are meaningful and incremental
      const functionStartUpdate = allUpdates.find((u) => u.argumentsDelta === '');
      expect(functionStartUpdate).toBeDefined();
      expect(functionStartUpdate?.toolName).toBe('str_replace_editor');

      const commandStartUpdate = allUpdates.find((u) => u.argumentsDelta.includes('{"command": "'));
      expect(commandStartUpdate).toBeDefined();

      const commandValueUpdate = allUpdates.find((u) => u.argumentsDelta === 'create');
      expect(commandValueUpdate).toBeDefined();

      const pathStartUpdate = allUpdates.find((u) => u.argumentsDelta.includes(', "path": "'));
      expect(pathStartUpdate).toBeDefined();

      const fileTextStartUpdate = allUpdates.find((u) =>
        u.argumentsDelta.includes(', "file_text": "'),
      );
      expect(fileTextStartUpdate).toBeDefined();

      // Check that file_text content is streamed incrementally
      const fileTextContentUpdates = allUpdates.filter(
        (u) =>
          u.argumentsDelta &&
          !u.argumentsDelta.includes('"') &&
          !u.argumentsDelta.includes('{') &&
          !u.argumentsDelta.includes('}') &&
          u.argumentsDelta.length > 0,
      );

      // Should have 273 content chunks based on testData
      expect(fileTextContentUpdates.length).toBe(273);

      // Verify completion update
      const completionUpdate = allUpdates.find(
        (u) => u.argumentsDelta === ' }' && u.isComplete === true,
      );
      expect(completionUpdate).toBeDefined();

      // Check state.toolCalls progression
      expect(stateSnapshots.length).toBeGreaterThan(0);

      // First snapshot should have 1 tool call
      expect(stateSnapshots[0].toolCallsCount).toBe(1);

      // Arguments should grow over time - verify incremental growth
      const argumentsLengths = stateSnapshots.map((s) => s.argumentsLength);
      expect(argumentsLengths[argumentsLengths.length - 1]).toBeGreaterThan(argumentsLengths[0]);

      // Verify that arguments length generally increases (allowing for occasional same values)
      let increasingCount = 0;
      for (let i = 1; i < argumentsLengths.length; i++) {
        if (argumentsLengths[i] > argumentsLengths[i - 1]) {
          increasingCount++;
        }
      }
      // Most snapshots should show increasing arguments length
      expect(increasingCount).toBeGreaterThan(argumentsLengths.length * 0.8);

      // Final state verification
      expect(state.toolCalls.length).toBe(1);
      const finalArgs = JSON.parse(state.toolCalls[0].function.arguments);
      expect(finalArgs.command).toBe('create');
      expect(finalArgs.path).toBe('/home/gem/fibonacci/fibonacci_function.py');
      expect(finalArgs.file_text).toContain('def fibonacci(n):');
    });

    it('should maintain tool call state consistency across chunks', () => {
      // Test intermediate state consistency during streaming
      const toolCallStates: any[] = [];
      let chunkIndex = 0;

      for (const chunk of realStreamingChunks) {
        const result = processStreamingChunk(createChunk(chunk), state);

        // Record state after each chunk that produces updates
        if (result.streamingToolCallUpdates && result.streamingToolCallUpdates.length > 0) {
          toolCallStates.push({
            chunkIndex,
            chunk,
            insideCodeEnv: state.insideCodeEnv,
            insideFunction: state.insideFunction,
            insideParameter: state.insideParameter,
            currentParameterName: state.currentParameterName,
            toolCallsCount: state.toolCalls.length,
            currentArguments: state.toolCalls[0]?.function.arguments || '',
            updatesProduced: result.streamingToolCallUpdates.length,
          });
        }
        chunkIndex++;
      }

      // Verify state progression makes sense
      expect(toolCallStates.length).toBeGreaterThan(0);

      // Should start with function creation
      const firstState = toolCallStates[0];
      expect(firstState.insideCodeEnv).toBe(true);
      expect(firstState.insideFunction).toBe(true);
      expect(firstState.toolCallsCount).toBe(1);

      // Should transition through different parameters
      const statesWithCommandParam = toolCallStates.filter(
        (s) => s.currentParameterName === 'command',
      );
      const statesWithPathParam = toolCallStates.filter((s) => s.currentParameterName === 'path');
      const statesWithFileTextParam = toolCallStates.filter(
        (s) => s.currentParameterName === 'file_text',
      );

      expect(statesWithCommandParam.length).toBeGreaterThan(0);
      expect(statesWithPathParam.length).toBeGreaterThan(0);
      expect(statesWithFileTextParam.length).toBeGreaterThan(0);

      // Arguments should only grow (never shrink)
      for (let i = 1; i < toolCallStates.length; i++) {
        expect(toolCallStates[i].currentArguments.length).toBeGreaterThanOrEqual(
          toolCallStates[i - 1].currentArguments.length,
        );
      }

      // Final state should be complete
      const finalState = toolCallStates[toolCallStates.length - 1];

      const args = JSON.parse(finalState.currentArguments);
      expect(args.command).toBe('create');
      expect(args.path).toBe('/home/gem/fibonacci/fibonacci_function.py');
      expect(args.file_text).toContain('def fibonacci(n):');
    });

    it('should produce correct argumentsDelta sequence for parameter content', () => {
      // Test specific argumentsDelta values for file_text parameter
      const fileTextUpdates: any[] = [];
      let insideFileText = false;

      for (const chunk of realStreamingChunks) {
        const result = processStreamingChunk(createChunk(chunk), state);

        // Track when we enter file_text parameter
        if (state.currentParameterName === 'file_text' && !insideFileText) {
          insideFileText = true;
        }

        // Collect updates during file_text parameter
        if (insideFileText && result.streamingToolCallUpdates) {
          result.streamingToolCallUpdates.forEach((update) => {
            if (update.argumentsDelta) {
              fileTextUpdates.push({
                argumentsDelta: update.argumentsDelta,
                isComplete: update.isComplete,
                chunk: chunk,
              });
            }
          });
        }

        // Track when we exit file_text
        if (state.currentParameterName !== 'file_text' && insideFileText) {
          insideFileText = false;
          break;
        }
      }

      expect(fileTextUpdates.length).toBeGreaterThan(200);

      // First file_text update should be the parameter opening
      expect(fileTextUpdates[0].argumentsDelta).toBe(', "file_text": "');

      // Should have many content updates
      const contentUpdates = fileTextUpdates.filter(
        (u) => u.argumentsDelta !== ', "file_text": "' && u.argumentsDelta !== '"',
      );
      expect(contentUpdates.length).toBeGreaterThan(200);

      // Content should include code snippets
      const codeSnippets = fileTextUpdates.filter(
        (u) =>
          u.argumentsDelta.includes('def') ||
          u.argumentsDelta.includes('return') ||
          u.argumentsDelta.includes('if'),
      );
      expect(codeSnippets.length).toBeGreaterThan(0);

      // Should have proper escaping for special characters
      const escapedUpdates = fileTextUpdates.filter(
        (u) => u.argumentsDelta.includes('\\n') || u.argumentsDelta.includes('\\"'),
      );
      expect(escapedUpdates.length).toBeGreaterThan(0);

      // Find the parameter closing quote (not the function closing)
      const parameterClosingUpdates = fileTextUpdates.filter((u) => u.argumentsDelta === '"');
      expect(parameterClosingUpdates.length).toBeGreaterThan(0);

      // Verify we have the expected sequence: parameter start, content, parameter end
      expect(fileTextUpdates[0].argumentsDelta).toBe(', "file_text": "');
      const lastParameterUpdate = parameterClosingUpdates[parameterClosingUpdates.length - 1];
      expect(lastParameterUpdate.argumentsDelta).toBe('"');
    });

    it('should show continuous arguments growth during file_text streaming', () => {
      // Test that arguments continuously grow during file_text parameter processing
      const argumentsLengthHistory: number[] = [];
      let insideFileText = false;
      let fileTextChunkCount = 0;

      for (const chunk of realStreamingChunks) {
        const result = processStreamingChunk(createChunk(chunk), state);

        // Track when we enter file_text parameter
        if (state.currentParameterName === 'file_text' && !insideFileText) {
          insideFileText = true;
        }

        // Record arguments length during file_text parameter
        if (insideFileText && state.toolCalls.length > 0) {
          argumentsLengthHistory.push(state.toolCalls[0].function.arguments.length);
          fileTextChunkCount++;
        }

        // Track when we exit file_text
        if (state.currentParameterName !== 'file_text' && insideFileText) {
          insideFileText = false;
          break;
        }
      }

      expect(argumentsLengthHistory.length).toBeGreaterThan(200);
      expect(fileTextChunkCount).toBeGreaterThan(200);

      // Verify arguments length is non-decreasing (only increases or stays same)
      for (let i = 1; i < argumentsLengthHistory.length; i++) {
        expect(argumentsLengthHistory[i]).toBeGreaterThanOrEqual(argumentsLengthHistory[i - 1]);
      }

      // Verify significant overall growth
      const initialLength = argumentsLengthHistory[0];
      const finalLength = argumentsLengthHistory[argumentsLengthHistory.length - 1];
      expect(finalLength).toBeGreaterThan(initialLength + 700); // Substantial growth (726 actual)

      // Verify many incremental increases (not just staying the same)
      let actualIncreases = 0;
      for (let i = 1; i < argumentsLengthHistory.length; i++) {
        if (argumentsLengthHistory[i] > argumentsLengthHistory[i - 1]) {
          actualIncreases++;
        }
      }
      expect(actualIncreases).toBeGreaterThan(argumentsLengthHistory.length * 0.9); // Most chunks should add content (96% actual)
    });
  });
});
