/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  AgentRunOptions,
  AgentRunObjectOptions,
  AgentRunNonStreamingOptions,
  AgentRunStreamingOptions,
  isAgentRunObjectOptions,
  isStreamingOptions,
} from '../src/agent-run-options';
import { ChatCompletionContentPart } from '@tarko/model-provider/types';

describe('Agent Run Options', () => {
  describe('type definitions', () => {
    it('should accept string input for AgentRunOptions', () => {
      const options: AgentRunOptions = 'Simple text query';
      expect(typeof options).toBe('string');
    });

    it('should accept object input for AgentRunOptions', () => {
      const options: AgentRunOptions = {
        input: 'Object-based query',
        model: 'gpt-4',
        provider: 'openai',
      };
      expect(typeof options).toBe('object');
      expect(options.input).toBe('Object-based query');
    });

    it('should support environmentInput in run options', () => {
      const options: AgentRunNonStreamingOptions = {
        input: 'Query with context',
        environmentInput: {
          content: 'Context from @file references',
          description: 'Expanded context',
        },
      };

      expect(options.environmentInput).toBeDefined();
      expect(options.environmentInput?.content).toBe('Context from @file references');
      expect(options.environmentInput?.description).toBe('Expanded context');
    });

    it('should support multimodal environmentInput', () => {
      const multimodalContent: ChatCompletionContentPart[] = [
        { type: 'text', text: 'File context' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,test' } },
      ];

      const options: AgentRunStreamingOptions = {
        input: 'Analyze with context',
        stream: true,
        environmentInput: {
          content: multimodalContent,
          description: 'Multimodal context',
        },
      };

      expect(options.environmentInput?.content).toEqual(multimodalContent);
    });

    it('should support environmentInput without description', () => {
      const options: AgentRunNonStreamingOptions = {
        input: 'Query',
        environmentInput: {
          content: 'Just content',
        },
      };

      expect(options.environmentInput?.content).toBe('Just content');
      expect(options.environmentInput?.description).toBeUndefined();
    });
  });

  describe('type guards', () => {
    describe('isAgentRunObjectOptions', () => {
      it('should return false for string input', () => {
        const options: AgentRunOptions = 'String input';
        expect(isAgentRunObjectOptions(options)).toBe(false);
      });

      it('should return true for object input', () => {
        const options: AgentRunOptions = {
          input: 'Object input',
        };
        expect(isAgentRunObjectOptions(options)).toBe(true);
      });

      it('should return true for object with environmentInput', () => {
        const options: AgentRunOptions = {
          input: 'Query with context',
          environmentInput: {
            content: 'Context data',
            description: 'Context description',
          },
        };
        expect(isAgentRunObjectOptions(options)).toBe(true);
      });

      it('should narrow type correctly', () => {
        const options: AgentRunOptions = {
          input: 'Test query',
          model: 'gpt-4',
          environmentInput: {
            content: 'Test context',
          },
        };

        if (isAgentRunObjectOptions(options)) {
          // TypeScript should now know this is AgentRunObjectOptions
          expect(options.input).toBe('Test query');
          expect(options.model).toBe('gpt-4');
          expect(options.environmentInput?.content).toBe('Test context');
        } else {
          throw new Error('Type guard failed');
        }
      });
    });

    describe('isStreamingOptions', () => {
      it('should return false for non-streaming options', () => {
        const options: AgentRunObjectOptions = {
          input: 'Non-streaming query',
        };
        expect(isStreamingOptions(options)).toBe(false);
      });

      it('should return false for explicitly disabled streaming', () => {
        const options: AgentRunObjectOptions = {
          input: 'Non-streaming query',
          stream: false,
        };
        expect(isStreamingOptions(options)).toBe(false);
      });

      it('should return true for streaming options', () => {
        const options: AgentRunObjectOptions = {
          input: 'Streaming query',
          stream: true,
        };
        expect(isStreamingOptions(options)).toBe(true);
      });

      it('should return true for streaming options with environmentInput', () => {
        const options: AgentRunObjectOptions = {
          input: 'Streaming query with context',
          stream: true,
          environmentInput: {
            content: 'Streaming context',
            description: 'Context for streaming',
          },
        };
        expect(isStreamingOptions(options)).toBe(true);
      });

      it('should narrow type correctly', () => {
        const options: AgentRunObjectOptions = {
          input: 'Streaming test',
          stream: true,
          environmentInput: {
            content: 'Stream context',
          },
        };

        if (isStreamingOptions(options)) {
          // TypeScript should now know this is AgentRunStreamingOptions
          expect(options.stream).toBe(true);
          expect(options.environmentInput?.content).toBe('Stream context');
        } else {
          throw new Error('Type guard failed');
        }
      });
    });
  });

  describe('interface compatibility', () => {
    it('should be compatible with existing AgentRunBaseOptions', () => {
      const baseOptions = {
        input: 'Test input',
        model: 'gpt-4',
        provider: 'openai' as const,
        sessionId: 'test-session',
        toolCallEngine: 'native' as const,
      };

      // Should be assignable to both streaming and non-streaming
      const nonStreamingOptions: AgentRunNonStreamingOptions = {
        ...baseOptions,
        stream: false,
      };

      const streamingOptions: AgentRunStreamingOptions = {
        ...baseOptions,
        stream: true,
      };

      expect(nonStreamingOptions.input).toBe('Test input');
      expect(streamingOptions.input).toBe('Test input');
    });

    it('should support all environmentInput combinations', () => {
      // Text content
      const textOptions: AgentRunNonStreamingOptions = {
        input: 'Query',
        environmentInput: {
          content: 'Text context',
          description: 'Text description',
        },
      };

      // Multimodal content
      const multimodalOptions: AgentRunStreamingOptions = {
        input: 'Query',
        stream: true,
        environmentInput: {
          content: [
            { type: 'text', text: 'Context text' },
            { type: 'image_url', image_url: { url: 'test-url' } },
          ],
          description: 'Multimodal description',
        },
      };

      // Without description
      const noDescOptions: AgentRunNonStreamingOptions = {
        input: 'Query',
        environmentInput: {
          content: 'Context without description',
        },
      };

      expect(textOptions.environmentInput?.content).toBe('Text context');
      expect(multimodalOptions.environmentInput?.content).toHaveLength(2);
      expect(noDescOptions.environmentInput?.description).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty environmentInput content', () => {
      const options: AgentRunNonStreamingOptions = {
        input: 'Query',
        environmentInput: {
          content: '',
          description: 'Empty content',
        },
      };

      expect(options.environmentInput?.content).toBe('');
      expect(options.environmentInput?.description).toBe('Empty content');
    });

    it('should handle empty multimodal environmentInput', () => {
      const options: AgentRunStreamingOptions = {
        input: 'Query',
        stream: true,
        environmentInput: {
          content: [],
          description: 'Empty multimodal',
        },
      };

      expect(Array.isArray(options.environmentInput?.content)).toBe(true);
      expect(options.environmentInput?.content).toHaveLength(0);
    });

    it('should handle undefined environmentInput', () => {
      const options: AgentRunNonStreamingOptions = {
        input: 'Query without context',
      };

      expect(options.environmentInput).toBeUndefined();
    });
  });
});
