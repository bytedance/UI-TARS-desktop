/**
 * Integration tests for Claude header functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenJS } from '../index.js';
import { HeaderConfigRegistry } from '../config/index.js';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation((config) => {
      return {
        messages: {
          create: vi.fn().mockResolvedValue({
            id: 'test-id',
            content: [{ type: 'text', text: 'Test response' }],
            model: 'claude-3-sonnet',
            role: 'assistant',
            stop_reason: 'end_turn',
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
          stream: vi.fn().mockImplementation(async function* () {
            yield {
              type: 'message_start',
              message: {
                id: 'test-id',
                model: 'claude-3-sonnet',
                role: 'assistant',
                stop_reason: null,
              },
            };
          }),
        },
        _config: config, // Store config for inspection
      };
    }),
  };
});

describe('Claude Headers Integration', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    // Reset registry
    (HeaderConfigRegistry as any).configs = {};
  });

  it('should automatically add anthropic-beta headers for Claude models', async () => {
    const client = new TokenJS({
      apiKey: 'test-key',
    });

    await client.chat.completions.create({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    });

    // Verify Anthropic constructor was called with correct headers
    expect(Anthropic).toHaveBeenCalledWith({
      apiKey: 'test-key',
      defaultHeaders: {
        'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19',
      },
    });
  });

  it('should merge custom headers with automatic headers', async () => {
    const client = new TokenJS({
      apiKey: 'test-key',
      headers: {
        'X-Custom-Header': 'custom-value',
        'X-Another': 'another-value',
      },
    });

    await client.chat.completions.create({
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    });

    expect(Anthropic).toHaveBeenCalledWith({
      apiKey: 'test-key',
      defaultHeaders: {
        'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19',
        'X-Custom-Header': 'custom-value',
        'X-Another': 'another-value',
      },
    });
  });

  it('should not add headers when autoHeaders is disabled', async () => {
    const client = new TokenJS({
      apiKey: 'test-key',
      autoHeaders: false,
    });

    await client.chat.completions.create({
      provider: 'anthropic',
      model: 'claude-3-haiku',
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    });

    expect(Anthropic).toHaveBeenCalledWith({
      apiKey: 'test-key',
      defaultHeaders: {},
    });
  });

  it('should add conditional headers for tool usage', async () => {
    const client = new TokenJS({
      apiKey: 'test-key',
    });

    await client.chat.completions.create({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: 'What is the weather?',
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get weather information',
            parameters: {
              type: 'object',
              properties: {
                location: { type: 'string' },
              },
            },
          },
        },
      ],
    });

    expect(Anthropic).toHaveBeenCalledWith({
      apiKey: 'test-key',
      defaultHeaders: {
        'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19',
      },
    });
  });

  it('should not add anthropic-beta headers for non-Claude models', async () => {
    const client = new TokenJS({
      apiKey: 'test-key',
    });

    await client.chat.completions.create({
      provider: 'anthropic',
      model: 'some-other-model', // Not a Claude model
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    });

    expect(Anthropic).toHaveBeenCalledWith({
      apiKey: 'test-key',
      defaultHeaders: {},
    });
  });

  it('should handle streaming requests with headers', async () => {
    const client = new TokenJS({
      apiKey: 'test-key',
    });

    const stream = await client.chat.completions.create({
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      stream: true,
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    });

    // Verify headers were applied
    expect(Anthropic).toHaveBeenCalledWith({
      apiKey: 'test-key',
      defaultHeaders: {
        'anthropic-beta': 'fine-grained-tool-streaming-2025-05-14,token-efficient-tools-2025-02-19',
      },
    });

    // Verify stream works
    expect(stream).toBeDefined();
  });

  it('should allow custom header to override automatic header', async () => {
    const client = new TokenJS({
      apiKey: 'test-key',
      headers: {
        'anthropic-beta': 'custom-beta-feature-2025-01-01', // Override automatic
      },
    });

    await client.chat.completions.create({
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    });

    expect(Anthropic).toHaveBeenCalledWith({
      apiKey: 'test-key',
      defaultHeaders: {
        'anthropic-beta': 'custom-beta-feature-2025-01-01', // Custom header wins
      },
    });
  });
});
