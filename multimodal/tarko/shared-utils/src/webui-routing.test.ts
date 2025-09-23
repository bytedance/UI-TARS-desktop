/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRegexPattern, createPathMatcher, extractActualBasename } from './webui-routing';

describe('WebUI Routing Shared Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isRegexPattern', () => {
    it('should detect regex patterns correctly', () => {
      // Regex patterns
      expect(isRegexPattern('/tenant-.+')).toBe(true);
      expect(isRegexPattern('/(foo|bar)/app')).toBe(true);
      expect(isRegexPattern('/user/[^/]+/dashboard')).toBe(true);
      expect(isRegexPattern('/path/with.*wildcard')).toBe(true);
      expect(isRegexPattern('/path/with?optional')).toBe(true);
      expect(isRegexPattern('/path/with^start')).toBe(true);
      expect(isRegexPattern('/path/with$end')).toBe(true);
      expect(isRegexPattern('/path/with{count}')).toBe(true);
      expect(isRegexPattern('/path/with\\escaped')).toBe(true);

      // Static patterns
      expect(isRegexPattern('/agent-ui')).toBe(false);
      expect(isRegexPattern('/foo/bar')).toBe(false);
      expect(isRegexPattern('/simple/path')).toBe(false);
      expect(isRegexPattern('')).toBe(false);
    });
  });

  describe('extractActualBasename', () => {
    describe('static base', () => {
      it('should extract static basename correctly', () => {
        expect(extractActualBasename('/agent-ui', '/agent-ui')).toBe('/agent-ui');
        expect(extractActualBasename('/agent-ui', '/agent-ui/')).toBe('/agent-ui');
        expect(extractActualBasename('/agent-ui', '/agent-ui/chat')).toBe('/agent-ui');
        expect(extractActualBasename('/agent-ui', '/agent-ui/workspace/files')).toBe('/agent-ui');
      });

      it('should return empty for non-matching static paths', () => {
        expect(extractActualBasename('/agent-ui', '/other-path')).toBe('');
        expect(extractActualBasename('/agent-ui', '/agent')).toBe('');
        expect(extractActualBasename('/agent-ui', '/agent-ui-extended')).toBe('');
      });

      it('should handle base with trailing slash', () => {
        expect(extractActualBasename('/agent-ui/', '/agent-ui')).toBe('/agent-ui');
        expect(extractActualBasename('/agent-ui/', '/agent-ui/')).toBe('/agent-ui');
        expect(extractActualBasename('/agent-ui/', '/agent-ui/chat')).toBe('/agent-ui');
      });
    });

    describe('regex base', () => {
      it('should extract regex basename correctly', () => {
        expect(extractActualBasename('/tenant-.+', '/tenant-abc')).toBe('/tenant-abc');
        expect(extractActualBasename('/tenant-.+', '/tenant-xyz/chat')).toBe('/tenant-xyz');
        expect(extractActualBasename('/tenant-.+', '/tenant-123/workspace/files')).toBe('/tenant-123');
      });

      it('should handle complex regex patterns', () => {
        expect(extractActualBasename('/(dev|staging|prod)/app', '/dev/app')).toBe('/dev/app');
        expect(extractActualBasename('/(dev|staging|prod)/app', '/staging/app/chat')).toBe('/staging/app');
        expect(extractActualBasename('/(dev|staging|prod)/app', '/prod/app/workspace')).toBe('/prod/app');
      });

      it('should handle user-specific regex patterns', () => {
        expect(extractActualBasename('/user/[^/]+/dashboard', '/user/john/dashboard')).toBe('/user/john/dashboard');
        expect(extractActualBasename('/user/[^/]+/dashboard', '/user/jane/dashboard/settings')).toBe('/user/jane/dashboard');
        expect(extractActualBasename('/user/[^/]+/dashboard', '/user/user123/dashboard')).toBe('/user/user123/dashboard');
      });

      it('should return empty for non-matching regex patterns', () => {
        expect(extractActualBasename('/tenant-.+', '/other-abc')).toBe('');
        expect(extractActualBasename('/tenant-.+', '/tenant')).toBe('');
        expect(extractActualBasename('/(dev|staging|prod)/app', '/test/app')).toBe('');
        expect(extractActualBasename('/user/[^/]+/dashboard', '/user/dashboard')).toBe('');
      });

      it('should handle malformed regex gracefully', () => {
        expect(extractActualBasename('/[unclosed', '/[unclosed')).toBe('');
        expect(extractActualBasename('/[unclosed', '/[unclosed/path')).toBe('');
      });
    });

    describe('edge cases', () => {
      it('should handle empty base', () => {
        expect(extractActualBasename('', '/any/path')).toBe('');
        expect(extractActualBasename('', '/')).toBe('');
      });

      it('should handle undefined base', () => {
        expect(extractActualBasename(undefined, '/any/path')).toBe('');
        expect(extractActualBasename(undefined, '/')).toBe('');
      });

      it('should handle real-world scenarios', () => {
        // Random ID patterns
        expect(extractActualBasename('/[a-zA-Z0-9]+', '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY')).toBe('/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY');
        expect(extractActualBasename('/[a-zA-Z0-9]+', '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY/chat')).toBe('/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY');
        
        // Multi-tenant patterns
        expect(extractActualBasename('/tenant-.+', '/tenant-company1')).toBe('/tenant-company1');
        expect(extractActualBasename('/tenant-.+', '/tenant-company1/dashboard')).toBe('/tenant-company1');
        
        // Environment-specific patterns
        expect(extractActualBasename('/(dev|staging|prod)/.+', '/dev/app1')).toBe('/dev/app1');
        expect(extractActualBasename('/(dev|staging|prod)/.+', '/staging/app2/dashboard')).toBe('/staging/app2');
      });
    });
  });

  describe('createPathMatcher', () => {
    describe('static base', () => {
      it('should match exact static paths', () => {
        const matcher = createPathMatcher('/agent-ui');

        expect(matcher.test('/agent-ui')).toBe(true);
        expect(matcher.test('/agent-ui/')).toBe(true);
        expect(matcher.test('/agent-ui/chat')).toBe(true);
        expect(matcher.test('/agent-ui/workspace')).toBe(true);

        expect(matcher.test('/other-path')).toBe(false);
        expect(matcher.test('/agent')).toBe(false);
        expect(matcher.test('/agent-ui-extended')).toBe(false);
      });

      it('should extract paths correctly for static base', () => {
        const matcher = createPathMatcher('/agent-ui');

        expect(matcher.extract('/agent-ui')).toBe('/');
        expect(matcher.extract('/agent-ui/')).toBe('/');
        expect(matcher.extract('/agent-ui/chat')).toBe('/chat');
        expect(matcher.extract('/agent-ui/workspace/files')).toBe('/workspace/files');
      });
    });

    describe('regex base', () => {
      it('should match regex patterns correctly', () => {
        const matcher = createPathMatcher('/tenant-.+');

        expect(matcher.test('/tenant-abc')).toBe(true);
        expect(matcher.test('/tenant-xyz')).toBe(true);
        expect(matcher.test('/tenant-123')).toBe(true);
        expect(matcher.test('/tenant-abc/chat')).toBe(true);

        expect(matcher.test('/tenant-')).toBe(false);
        expect(matcher.test('/other-abc')).toBe(false);
        expect(matcher.test('/tenant')).toBe(false);
      });

      it('should extract paths correctly for regex base', () => {
        const matcher = createPathMatcher('/tenant-.+');

        expect(matcher.extract('/tenant-abc')).toBe('/');
        expect(matcher.extract('/tenant-xyz/chat')).toBe('/chat');
        expect(matcher.extract('/tenant-123/workspace/files')).toBe('/workspace/files');
      });
    });

    describe('edge cases', () => {
      it('should handle empty base', () => {
        const matcher = createPathMatcher('');

        expect(matcher.test('/')).toBe(true);
        expect(matcher.test('/any/path')).toBe(true);
        expect(matcher.test('/agent-ui')).toBe(true);

        expect(matcher.extract('/')).toBe('/');
        expect(matcher.extract('/any/path')).toBe('/any/path');
        expect(matcher.extract('/agent-ui')).toBe('/agent-ui');
      });

      it('should handle undefined base', () => {
        const matcher = createPathMatcher(undefined);

        expect(matcher.test('/')).toBe(true);
        expect(matcher.test('/any/path')).toBe(true);
        expect(matcher.test('/agent-ui')).toBe(true);

        expect(matcher.extract('/')).toBe('/');
        expect(matcher.extract('/any/path')).toBe('/any/path');
        expect(matcher.extract('/agent-ui')).toBe('/agent-ui');
      });

      it('should handle malformed regex patterns gracefully', () => {
        expect(() => createPathMatcher('/[unclosed')).not.toThrow();

        const matcher = createPathMatcher('/[unclosed');
        expect(typeof matcher.test).toBe('function');
        expect(typeof matcher.extract).toBe('function');

        // Should work as static path since regex is malformed
        expect(matcher.test('/[unclosed')).toBe(true);
        expect(matcher.test('/[unclosed/path')).toBe(true);
        expect(matcher.test('/other')).toBe(false);
      });
    });
  });
});