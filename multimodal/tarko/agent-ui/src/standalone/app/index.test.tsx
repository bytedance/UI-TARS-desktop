/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the functions since they're not exported
function isRegexPattern(path: string): boolean {
  return /[.*+?^${}()|[\]\\]/.test(path);
}

function extractActualBasename(basePath: string, currentPath: string): string {
  if (!basePath) return '';

  if (isRegexPattern(basePath)) {
    try {
      // Replace .+ with [^/]+ (non-greedy match)
      const extractPattern = basePath.replace(/\.\+/g, '[^/]+');
      const extractRegex = new RegExp(`^${extractPattern}`);
      const match = currentPath.match(extractRegex);

      return match ? match[0] : '';
    } catch (error) {
      console.warn('Invalid regex pattern in basePath:', basePath, error);
      return '';
    }
  } else {
    // Static path
    const normalized = basePath.replace(/\/$/, '');
    if (currentPath === normalized || currentPath.startsWith(normalized + '/')) {
      return normalized;
    }
    return '';
  }
}

describe('AgentWebUI basename extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isRegexPattern', () => {
    it('should detect regex patterns correctly', () => {
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
    describe('static basePath', () => {
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

      it('should handle basePath with trailing slash', () => {
        expect(extractActualBasename('/agent-ui/', '/agent-ui')).toBe('/agent-ui');
        expect(extractActualBasename('/agent-ui/', '/agent-ui/')).toBe('/agent-ui');
        expect(extractActualBasename('/agent-ui/', '/agent-ui/chat')).toBe('/agent-ui');
      });

      it('should handle nested static paths', () => {
        expect(extractActualBasename('/foo/bar', '/foo/bar')).toBe('/foo/bar');
        expect(extractActualBasename('/foo/bar', '/foo/bar/baz')).toBe('/foo/bar');
        expect(extractActualBasename('/foo/bar', '/foo')).toBe('');
        expect(extractActualBasename('/foo/bar', '/foo/other')).toBe('');
      });
    });

    describe('regex basePath', () => {
      it('should extract regex basename correctly', () => {
        expect(extractActualBasename('/tenant-.+', '/tenant-abc')).toBe('/tenant-abc');
        expect(extractActualBasename('/tenant-.+', '/tenant-xyz/chat')).toBe('/tenant-xyz');
        expect(extractActualBasename('/tenant-.+', '/tenant-123/workspace/files')).toBe(
          '/tenant-123',
        );
      });

      it('should handle complex regex patterns', () => {
        expect(extractActualBasename('/(dev|staging|prod)/app', '/dev/app')).toBe('/dev/app');
        expect(extractActualBasename('/(dev|staging|prod)/app', '/staging/app/chat')).toBe(
          '/staging/app',
        );
        expect(extractActualBasename('/(dev|staging|prod)/app', '/prod/app/workspace')).toBe(
          '/prod/app',
        );
      });

      it('should handle user-specific regex patterns', () => {
        expect(extractActualBasename('/user/[^/]+/dashboard', '/user/john/dashboard')).toBe(
          '/user/john/dashboard',
        );
        expect(
          extractActualBasename('/user/[^/]+/dashboard', '/user/jane/dashboard/settings'),
        ).toBe('/user/jane/dashboard');
        expect(extractActualBasename('/user/[^/]+/dashboard', '/user/user123/dashboard')).toBe(
          '/user/user123/dashboard',
        );
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
      it('should handle empty basePath', () => {
        expect(extractActualBasename('', '/any/path')).toBe('');
        expect(extractActualBasename('', '/')).toBe('');
      });

      it('should handle root path basePath', () => {
        expect(extractActualBasename('/', '/')).toBe('');
        expect(extractActualBasename('/', '/chat')).toBe('');
      });

      it('should handle unicode characters', () => {
        expect(extractActualBasename('/agent-ui', '/agent-ui/测试')).toBe('/agent-ui');
        expect(extractActualBasename('/agent-ui', '/agent-ui/🚀')).toBe('/agent-ui');
      });
    });

    describe('real-world scenarios', () => {
      it('should handle random ID patterns', () => {
        const randomIdPattern = '/[a-zA-Z0-9]+';
        expect(extractActualBasename(randomIdPattern, '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY')).toBe(
          '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY',
        );
        expect(
          extractActualBasename(randomIdPattern, '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY/chat'),
        ).toBe('/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY');
        expect(
          extractActualBasename(
            randomIdPattern,
            '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY/workspace/files',
          ),
        ).toBe('/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY');
      });

      it('should handle fixed-length ID patterns', () => {
        const fixedLengthPattern = '/[a-zA-Z0-9]{33}'; // Actual length is 33
        expect(
          extractActualBasename(fixedLengthPattern, '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY'),
        ).toBe('/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY');
        expect(
          extractActualBasename(fixedLengthPattern, '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY/chat'),
        ).toBe('/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY');
        expect(extractActualBasename(fixedLengthPattern, '/short')).toBe('');
      });

      it('should handle range-length ID patterns', () => {
        const rangeLengthPattern = '/[a-zA-Z0-9]{25,35}';
        expect(
          extractActualBasename(rangeLengthPattern, '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY'),
        ).toBe('/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY');
        expect(
          extractActualBasename(rangeLengthPattern, '/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY/chat'),
        ).toBe('/p9fgsSryzeO5JtefS1bMfsa7G11S6pGKY');
        expect(extractActualBasename(rangeLengthPattern, '/short')).toBe('');
        // This will match the first 35 characters, which is still a valid match
        expect(
          extractActualBasename(rangeLengthPattern, '/toolongpatternexceedingthirtyfivecharacters'),
        ).toBe('/toolongpatternexceedingthirtyfivech');
      });

      it('should handle multi-tenant patterns', () => {
        const tenantPattern = '/tenant-.+';
        expect(extractActualBasename(tenantPattern, '/tenant-company1')).toBe('/tenant-company1');
        expect(extractActualBasename(tenantPattern, '/tenant-company1/dashboard')).toBe(
          '/tenant-company1',
        );
        expect(extractActualBasename(tenantPattern, '/tenant-company1/users/123')).toBe(
          '/tenant-company1',
        );
        expect(extractActualBasename(tenantPattern, '/other-company1')).toBe('');
      });

      it('should handle environment-specific patterns', () => {
        const envPattern = '/(dev|staging|prod)/.+';
        expect(extractActualBasename(envPattern, '/dev/app1')).toBe('/dev/app1');
        expect(extractActualBasename(envPattern, '/staging/app2/dashboard')).toBe('/staging/app2');
        expect(extractActualBasename(envPattern, '/prod/app3/users/123')).toBe('/prod/app3');
        expect(extractActualBasename(envPattern, '/test/app1')).toBe('');
      });
    });
  });
});
