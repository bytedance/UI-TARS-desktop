/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMMocker } from './llm-mocker';
import { Agent } from '../agent';
import { Tool } from '../agent/tool';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Mock filesystem functions
vi.mock('fs', async () => {
  const actual = (await vi.importActual('fs')) as typeof fs;
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn().mockImplementation(async (path: string) => {
        // Mock response for llm-response.jsonl
        if (path.includes('llm-response.jsonl')) {
          return JSON.stringify({
            id: 'mock-id',
            choices: [{ message: { content: 'Mocked response' }, finish_reason: 'stop' }],
            created: 123456789,
            model: 'mock-model',
            object: 'chat.completion',
          });
        }

        // Mock response for event-stream.jsonl
        if (path.includes('event-stream.jsonl')) {
          return JSON.stringify([]);
        }

        return '{}';
      }),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
    },
    existsSync: vi.fn().mockReturnValue(true),
  };
});

// Mock agent
vi.mock('../agent', () => ({
  Agent: vi.fn().mockImplementation(() => ({
    onLLMRequest: vi.fn(),
    onLLMResponse: vi.fn(),
    onAgentLoopEnd: vi.fn(),
    getEventStream: vi.fn().mockReturnValue({
      getEvents: vi.fn().mockReturnValue([]),
    }),
    run: vi.fn().mockResolvedValue('Mocked agent response'),
  })),
}));

describe('LLMMocker', () => {
  let mocker: LLMMocker;
  let agent: Agent;
  let mockCasePath: string;

  beforeEach(() => {
    mocker = new LLMMocker();
    agent = new Agent({
      tools: [
        new Tool({
          id: 'test',
          description: 'Test tool',
          parameters: z.object({}),
          function: async () => ({ result: 'test' }),
        }),
      ],
    });
    mockCasePath = path.join(__dirname, '../../fixtures/test-case');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully set up mocking environment', async () => {
    await mocker.setup(agent, mockCasePath, 2, { updateSnapshots: true });

    // Should replace the getLLMClient function
    const utils = require('../agent/llm-client');
    expect(utils.getLLMClient).not.toBe(undefined);

    // Restore after test
    mocker.restore();
  });

  it('should restore original functions when cleanup is called', async () => {
    // Store original function
    const utils = require('../agent/llm-client');
    const originalFunc = utils.getLLMClient;

    await mocker.setup(agent, mockCasePath, 2);
    expect(utils.getLLMClient).not.toBe(originalFunc);

    mocker.restore();
    expect(utils.getLLMClient).toBe(originalFunc);
  });
});
