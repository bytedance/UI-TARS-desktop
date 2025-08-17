/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  loadWorkspaceConfig,
  hasWorkspaceConfig,
  WORKSPACE_CONFIG_PATHS,
} from '../src/utils/workspace-config';

/**
 * Test suite for workspace configuration utilities
 */
describe('workspace-config', () => {
  let tempDir: string;
  let workspacePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tarko-test-'));
    workspacePath = tempDir;
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadWorkspaceConfig', () => {
    it('should return empty config when .tarko directory does not exist', () => {
      const result = loadWorkspaceConfig(workspacePath);
      expect(result).toEqual({});
    });

    it('should return empty config when instructions.md does not exist', () => {
      const tarkoDir = path.join(workspacePath, '.tarko');
      fs.mkdirSync(tarkoDir);

      const result = loadWorkspaceConfig(workspacePath);
      expect(result).toEqual({});
    });

    it('should load instructions from instructions.md', () => {
      const tarkoDir = path.join(workspacePath, '.tarko');
      const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);
      const instructionsContent = 'You are a helpful coding assistant specialized in TypeScript.';

      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, instructionsContent);

      const result = loadWorkspaceConfig(workspacePath);
      expect(result).toEqual({
        instructions: instructionsContent,
      });
    });

    it('should trim whitespace from instructions', () => {
      const tarkoDir = path.join(workspacePath, '.tarko');
      const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);
      const instructionsContent = '\n\n  You are a helpful assistant.  \n\n';
      const expectedContent = 'You are a helpful assistant.';

      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, instructionsContent);

      const result = loadWorkspaceConfig(workspacePath);
      expect(result).toEqual({
        instructions: expectedContent,
      });
    });

    it('should return empty config when instructions.md is empty after trimming', () => {
      const tarkoDir = path.join(workspacePath, '.tarko');
      const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);

      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, '   \n\n   ');

      const result = loadWorkspaceConfig(workspacePath);
      expect(result).toEqual({});
    });

    it('should handle file read errors gracefully', () => {
      const tarkoDir = path.join(workspacePath, '.tarko');
      const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);

      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, 'test content');

      const originalReadFileSync = fs.readFileSync;
      const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(fs, 'readFileSync').mockImplementation((filePath, options) => {
        if (filePath === instructionsPath) {
          throw new Error('Permission denied');
        }
        return originalReadFileSync(filePath, options);
      });

      const result = loadWorkspaceConfig(workspacePath);

      expect(result).toEqual({});
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Failed to read'),
      );
      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('Permission denied'));

      vi.restoreAllMocks();
      mockConsoleWarn.mockRestore();
    });

    it('should handle non-Error exceptions gracefully', () => {
      const tarkoDir = path.join(workspacePath, '.tarko');
      const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);

      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, 'test content');

      const originalReadFileSync = fs.readFileSync;
      const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      vi.spyOn(fs, 'readFileSync').mockImplementation((filePath, options) => {
        if (filePath === instructionsPath) {
          throw 'String error';
        }
        return originalReadFileSync(filePath, options);
      });

      const result = loadWorkspaceConfig(workspacePath);

      expect(result).toEqual({});
      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('String error'));

      vi.restoreAllMocks();
      mockConsoleWarn.mockRestore();
    });

    it('should load multiline instructions correctly', () => {
      const tarkoDir = path.join(workspacePath, '.tarko');
      const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);
      const instructionsContent = `You are a helpful coding assistant.

Please follow these guidelines:
- Write clean code
- Add proper comments
- Use TypeScript`;

      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, instructionsContent);

      const result = loadWorkspaceConfig(workspacePath);
      expect(result).toEqual({
        instructions: instructionsContent,
      });
    });
  });

  describe('hasWorkspaceConfig', () => {
    it('should return false when .tarko directory does not exist', () => {
      const result = hasWorkspaceConfig(workspacePath);
      expect(result).toBe(false);
    });

    it('should return false when .tarko directory exists but no instructions.md', () => {
      const tarkoDir = path.join(workspacePath, '.tarko');
      fs.mkdirSync(tarkoDir);

      const result = hasWorkspaceConfig(workspacePath);
      expect(result).toBe(false);
    });

    it('should return true when instructions.md exists', () => {
      const tarkoDir = path.join(workspacePath, '.tarko');
      const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);

      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, 'test instructions');

      const result = hasWorkspaceConfig(workspacePath);
      expect(result).toBe(true);
    });

    it('should return true even when instructions.md is empty', () => {
      const tarkoDir = path.join(workspacePath, '.tarko');
      const instructionsPath = path.join(workspacePath, WORKSPACE_CONFIG_PATHS.INSTRUCTIONS);

      fs.mkdirSync(tarkoDir, { recursive: true });
      fs.writeFileSync(instructionsPath, '');

      const result = hasWorkspaceConfig(workspacePath);
      expect(result).toBe(true);
    });
  });

  describe('WORKSPACE_CONFIG_PATHS', () => {
    it('should have correct path for instructions', () => {
      expect(WORKSPACE_CONFIG_PATHS.INSTRUCTIONS).toBe('.tarko/instructions.md');
    });
  });
});
