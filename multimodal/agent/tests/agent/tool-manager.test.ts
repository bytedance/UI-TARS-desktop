/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z, Tool, getLogger, ToolManager } from './../../src';

// Mock logger
vi.mock('../utils/logger', () => ({
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('ToolManager', () => {
  let toolManager: ToolManager;
  const mockLogger = getLogger('test');

  beforeEach(() => {
    vi.clearAllMocks();
    toolManager = new ToolManager(mockLogger);
  });

  it('should register and retrieve tools', () => {
    // Create test tools
    const testTool1 = new Tool({
      id: 'test1',
      description: 'Test tool 1',
      parameters: z.object({
        param1: z.string(),
      }),
      function: async () => ({ result: 'success1' }),
    });

    const testTool2 = new Tool({
      id: 'test2',
      description: 'Test tool 2',
      parameters: z.object({
        param2: z.number(),
      }),
      function: async () => ({ result: 'success2' }),
    });

    // Register tools
    toolManager.registerTool(testTool1);
    toolManager.registerTool(testTool2);

    // Verify tools were registered
    expect(toolManager.getTools()).toHaveLength(2);
    expect(toolManager.getTool('test1')).toBe(testTool1);
    expect(toolManager.getTool('test2')).toBe(testTool2);
    expect(toolManager.hasTool('test1')).toBe(true);
    expect(toolManager.hasTool('nonexistent')).toBe(false);
  });

  it('should execute tools successfully', async () => {
    // Create test tool with mock function
    const mockFn = vi.fn().mockResolvedValue({ data: 'test-result' });
    const testTool = new Tool({
      id: 'execTest',
      description: 'Tool for execution testing',
      parameters: z.object({}),
      function: mockFn,
    });

    // Register tool
    toolManager.registerTool(testTool);

    // Execute tool
    const result = await toolManager.executeTool('execTest', 'call-123', {});

    // Verify execution
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result.result).toEqual({ data: 'test-result' });
    expect(result.executionTime).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it('should handle tool execution errors', async () => {
    // Create test tool with function that throws
    const errorMessage = 'Test execution error';
    const mockFn = vi.fn().mockRejectedValue(new Error(errorMessage));
    const testTool = new Tool({
      id: 'errorTest',
      description: 'Tool that throws errors',
      parameters: z.object({}),
      function: mockFn,
    });

    // Register tool
    toolManager.registerTool(testTool);

    // Execute tool
    const result = await toolManager.executeTool('errorTest', 'call-123', {});

    // Verify error handling
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result.result).toContain(errorMessage);
    expect(result.error).toContain(errorMessage);
    expect(result.executionTime).toBe(0);
  });

  it('should handle requests for non-existent tools', async () => {
    // Execute non-existent tool
    const result = await toolManager.executeTool('nonexistent', 'call-123', {});

    // Verify error response
    expect(result.result).toContain('not found');
    expect(result.error).toContain('not found');
    expect(result.executionTime).toBe(0);
  });
});
