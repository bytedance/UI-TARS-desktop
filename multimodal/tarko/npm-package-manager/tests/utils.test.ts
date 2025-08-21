/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { isNPMPackage, analyzeAgentInput } from '../src/utils';

describe('utils', () => {
  describe('isNPMPackage', () => {
    it('should return true for valid NPM package names', () => {
      expect(isNPMPackage('package-name')).toBe(true);
      expect(isNPMPackage('@scope/package')).toBe(true);
      expect(isNPMPackage('tarko-agent')).toBe(true);
      expect(isNPMPackage('simple')).toBe(true);
      expect(isNPMPackage('package.name')).toBe(true);
      expect(isNPMPackage('package_name')).toBe(true);
    });

    it('should return false for invalid NPM package names', () => {
      expect(isNPMPackage('./local-path')).toBe(false);
      expect(isNPMPackage('../relative-path')).toBe(false);
      expect(isNPMPackage('/absolute/path')).toBe(false);
      expect(isNPMPackage('https://example.com')).toBe(false);
      expect(isNPMPackage('invalid@package')).toBe(false);
      expect(isNPMPackage('')).toBe(false);
      expect(isNPMPackage('package with spaces')).toBe(false);
    });
  });

  describe('analyzeAgentInput', () => {
    it('should analyze NPM package inputs correctly', () => {
      const result = analyzeAgentInput('agent');
      expect(result.type).toBe('npm-package');
      expect(result.isNPMCandidate).toBe(true);
      expect(result.suggestions).toContain('tarko-agent');
      expect(result.suggestions).toContain('@tarko/agent');
    });

    it('should analyze scoped packages correctly', () => {
      const result = analyzeAgentInput('@scope/package');
      expect(result.type).toBe('npm-package');
      expect(result.isNPMCandidate).toBe(true);
      expect(result.suggestions).toBeUndefined();
    });

    it('should analyze local paths correctly', () => {
      const result = analyzeAgentInput('./local-agent');
      expect(result.type).toBe('local-path');
      expect(result.isNPMCandidate).toBe(false);
      expect(result.suggestions).toBeUndefined();
    });

    it('should analyze HTTP URLs correctly', () => {
      const result = analyzeAgentInput('https://example.com/agent.js');
      expect(result.type).toBe('http-url');
      expect(result.isNPMCandidate).toBe(false);
      expect(result.suggestions).toBeUndefined();
    });

    it('should not suggest tarko- prefix if already present', () => {
      const result = analyzeAgentInput('tarko-agent');
      expect(result.type).toBe('npm-package');
      expect(result.isNPMCandidate).toBe(true);
      expect(result.suggestions).not.toContain('tarko-tarko-agent');
    });

    it('should handle unknown inputs as potential NPM candidates', () => {
      const result = analyzeAgentInput('simpleagent');
      expect(result.type).toBe('npm-package');
      expect(result.isNPMCandidate).toBe(true);
      expect(result.suggestions).toContain('tarko-simpleagent');
    });
  });
});
