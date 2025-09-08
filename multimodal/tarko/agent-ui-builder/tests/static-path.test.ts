/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getDefaultStaticPath, isDefaultStaticPathValid, getStaticPath } from '../src/static-path';

describe('static-path', () => {
  let tempDir: string;
  let mockStaticPath: string;

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-builder-static-test-'));
    mockStaticPath = path.join(tempDir, 'static');
    fs.mkdirSync(mockStaticPath, { recursive: true });
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getDefaultStaticPath', () => {
    it('should return a path relative to the package', () => {
      const staticPath = getDefaultStaticPath();
      expect(staticPath).toContain('agent-ui-builder');
      expect(staticPath).toContain('static');
      expect(path.isAbsolute(staticPath)).toBe(true);
    });
  });

  describe('isDefaultStaticPathValid', () => {
    it('should return boolean indicating if default static path exists', () => {
      // The result depends on whether static files are built or not
      const isValid = isDefaultStaticPathValid();
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('getStaticPath', () => {
    it('should return custom path when provided and valid', () => {
      // Create mock index.html
      const indexPath = path.join(mockStaticPath, 'index.html');
      fs.writeFileSync(indexPath, '<html><body>Test</body></html>');

      const result = getStaticPath(mockStaticPath);
      expect(result).toBe(mockStaticPath);
    });

    it('should throw error when custom path is invalid', () => {
      const invalidPath = path.join(tempDir, 'nonexistent');

      expect(() => {
        getStaticPath(invalidPath);
      }).toThrow('Custom static path invalid');
    });

    it('should throw error when no valid path can be found', () => {
      // Skip this test if default static path exists (e.g., in built environment)
      if (isDefaultStaticPathValid()) {
        // If default path exists, getStaticPath() should work without custom path
        expect(() => getStaticPath()).not.toThrow();
      } else {
        // No custom path provided and default path doesn't exist
        expect(() => {
          getStaticPath();
        }).toThrow('No valid static path found');
      }
    });

    it('should validate that index.html exists in custom path', () => {
      // Create directory but no index.html
      expect(() => {
        getStaticPath(mockStaticPath);
      }).toThrow('index.html not found');
    });
  });
});
