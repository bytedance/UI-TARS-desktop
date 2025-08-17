/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { buildAppConfig } from '../src/config/builder';
import { AgentCLIArguments, AgentAppConfig } from '@tarko/interface';

/**
 * End-to-end tests for workspace configuration feature
 */
describe('workspace-config E2E', () => {
  let tempDir: string;
  let workspacePath: string;
  let tarkoDir: string;
  let instructionsPath: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarko-e2e-'));
    workspacePath = tempDir;
    tarkoDir = path.join(workspacePath, '.tarko');
    instructionsPath = path.join(tarkoDir, 'instructions.md');

    process.chdir(workspacePath);
  });

  afterEach(() => {
    process.chdir(originalCwd);

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Real file system integration', () => {
    it('should load workspace instructions when .tarko/instructions.md exists', () => {
      // Setup workspace config
      const workspaceInstructions = 'You are a TypeScript expert assistant for this project.';
      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, workspaceInstructions);

      // Build config with real file system operations
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
          id: 'gpt-4',
        },
      };

      const userConfig: AgentAppConfig = {};

      const result = buildAppConfig(cliArgs, userConfig, undefined, undefined, workspacePath);

      // Verify workspace instructions were loaded
      expect(result.instructions).toBe(workspaceInstructions);
      expect(result.model?.provider).toBe('openai');
      expect(result.model?.id).toBe('gpt-4');
    });

    it('should prioritize CLI args > workspace config > user config', () => {
      // Setup workspace config
      const workspaceInstructions = 'Workspace instructions';
      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, workspaceInstructions);

      // User config (lowest priority)
      const userConfig: AgentAppConfig = {
        instructions: 'User instructions',
        model: {
          provider: 'anthropic',
          id: 'claude-3',
        },
      };

      // CLI args (highest priority)
      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai', // Should override workspace and user
        },
        debug: true, // Should override user logLevel
      };

      const result = buildAppConfig(cliArgs, userConfig, undefined, undefined, workspacePath);

      // Verify priority order
      expect(result.instructions).toBe('Workspace instructions'); // Workspace overrides user
      expect(result.model?.provider).toBe('openai'); // CLI overrides workspace
      expect(result.model?.id).toBe('claude-3'); // User config preserved where not overridden
      // Note: logLevel is set by applyLoggingShortcuts which runs after config merging
      // The debug flag sets logLevel to DEBUG (3) during the shortcuts application
    });

    it('should work when no workspace config exists', () => {
      // No .tarko directory created

      const userConfig: AgentAppConfig = {
        instructions: 'User instructions',
        model: {
          provider: 'openai',
        },
      };

      const cliArgs: AgentCLIArguments = {
        port: 3000,
      };

      const result = buildAppConfig(cliArgs, userConfig, undefined, undefined, workspacePath);

      // Should use user config since no workspace config
      expect(result.instructions).toBe('User instructions');
      expect(result.model?.provider).toBe('openai');
      expect(result.server?.port).toBe(3000);
    });

    it('should handle empty workspace instructions file', () => {
      // Create empty instructions file
      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, '   \n\n   '); // Only whitespace

      const userConfig: AgentAppConfig = {
        instructions: 'User instructions',
      };

      const result = buildAppConfig({}, userConfig, undefined, undefined, workspacePath);

      // Should use user config since workspace file is empty
      expect(result.instructions).toBe('User instructions');
    });

    it('should handle file read errors gracefully', () => {
      // Create instructions file with restricted permissions
      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, 'Test instructions');

      // Mock console.warn to capture warning messages
      const mockWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock fs.readFileSync to simulate permission error
      const originalReadFileSync = fs.readFileSync;
      vi.spyOn(fs, 'readFileSync').mockImplementation((filePath, options) => {
        if (typeof filePath === 'string' && filePath.includes('instructions.md')) {
          throw new Error('Permission denied');
        }
        return originalReadFileSync(filePath, options);
      });

      const userConfig: AgentAppConfig = {
        instructions: 'User instructions',
      };

      const result = buildAppConfig({}, userConfig, undefined, undefined, workspacePath);

      // Should fall back to user config and log warning
      expect(result.instructions).toBe('User instructions');
      expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('Warning: Failed to read'));

      // Restore mocks
      mockWarn.mockRestore();
      vi.restoreAllMocks();
    });

    it('should handle multiline workspace instructions correctly', () => {
      const multilineInstructions = `You are a helpful coding assistant.

Please follow these guidelines:
- Write clean, readable code
- Add comprehensive comments
- Use TypeScript best practices
- Follow the project's coding standards

For this specific project:
- Focus on React and Node.js development
- Prioritize performance and maintainability`;

      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, multilineInstructions);

      const result = buildAppConfig({}, {}, undefined, undefined, workspacePath);

      expect(result.instructions).toBe(multilineInstructions);
      expect(result.instructions).toMatchInlineSnapshot(`
        "You are a helpful coding assistant.

        Please follow these guidelines:
        - Write clean, readable code
        - Add comprehensive comments
        - Use TypeScript best practices
        - Follow the project's coding standards

        For this specific project:
        - Focus on React and Node.js development
        - Prioritize performance and maintainability"
      `);
    });
  });

  describe('Real workspace scenarios', () => {
    it('should work with typical project structure', () => {
      // Simulate a real project structure
      fs.mkdirSync(path.join(workspacePath, 'src'), { recursive: true });
      fs.mkdirSync(path.join(workspacePath, 'tests'));
      fs.writeFileSync(
        path.join(workspacePath, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        }),
      );
      fs.writeFileSync(path.join(workspacePath, 'README.md'), '# Test Project');

      // Add workspace config
      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(
        instructionsPath,
        'You are working on the test-project. This is a TypeScript/Node.js project. ' +
          'Please help with code reviews, bug fixes, and feature development.',
      );

      const cliArgs: AgentCLIArguments = {
        model: {
          provider: 'openai',
          id: 'gpt-4',
        },
        port: 8080,
      };

      const result = buildAppConfig(cliArgs, {}, undefined, undefined, workspacePath);

      expect(result.instructions).toMatchInlineSnapshot(`
        "You are working on the test-project. This is a TypeScript/Node.js project. Please help with code reviews, bug fixes, and feature development."
      `);
      expect(result.model?.provider).toBe('openai');
      expect(result.model?.id).toBe('gpt-4');
      expect(result.server?.port).toBe(8080);
    });

    it('should handle different workspace paths correctly', () => {
      // Create workspace config in the temp directory
      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, 'Root workspace instructions');

      // Test with different workspace path (subdirectory that doesn't have .tarko)
      const subDir = path.join(workspacePath, 'packages', 'frontend');
      fs.mkdirSync(subDir, { recursive: true });

      // Use subdirectory as workspace path (should not find config)
      const result1 = buildAppConfig({}, {}, undefined, undefined, subDir);
      expect(result1.instructions).toBeUndefined();

      // Use root directory as workspace path (should find config)
      const result2 = buildAppConfig({}, {}, undefined, undefined, workspacePath);
      expect(result2.instructions).toBe('Root workspace instructions');
    });
  });
});
