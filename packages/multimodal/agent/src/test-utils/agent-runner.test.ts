/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentTestRunner } from './agent-test-runner';
import path from 'path';
import fs from 'fs';

// Mock the fs module
vi.mock('fs', async () => {
  const actual = (await vi.importActual('fs')) as typeof fs;
  return {
    ...actual,
    // Add specific mocks as needed
    existsSync: vi.fn().mockImplementation(actual.existsSync),
    promises: {
      ...actual.promises,
      readFile: vi.fn().mockImplementation(actual.promises.readFile),
      writeFile: vi.fn().mockImplementation(actual.promises.writeFile),
      mkdir: vi.fn().mockImplementation(actual.promises.mkdir),
    },
  };
});

// Create a test fixture directory for tests
const TEST_FIXTURES_DIR = path.join(__dirname, '../../fixtures/test');

describe('AgentTestRunner', () => {
  let runner: AgentTestRunner;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Ensure fixtures dir exists
    if (!fs.existsSync(TEST_FIXTURES_DIR)) {
      fs.mkdirSync(TEST_FIXTURES_DIR, { recursive: true });
    }

    // Create runner with test fixtures dir
    runner = new AgentTestRunner({ fixturesRoot: TEST_FIXTURES_DIR });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should verify that test fixtures directory exists', () => {
    expect(fs.existsSync(TEST_FIXTURES_DIR)).toBe(true);
  });

  it('should throw an error when case directory does not exist', async () => {
    // Mock existsSync to return false for the case directory
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      if (path.toString().includes('non-existent-case')) {
        return false;
      }
      return true;
    });

    await expect(runner.runTest({ caseName: 'non-existent-case' })).rejects.toThrow(
      'Test case directory not found',
    );
  });

  // More tests can be added here to test various aspects of the AgentTestRunner
  // For example:
  // - Testing that LLM requests/responses are correctly mocked
  // - Testing event stream comparison logic
  // - Testing snapshot update functionality
});
