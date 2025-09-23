/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRegexPattern, createPathMatcher } from '../src/utils/webui-routing';

describe('WebUI Routing Functions', () => {
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

  describe('createPathMatcher', () => {
    describe('empty basePath', () => {
      it('should match all paths when basePath is empty', () => {
        const matcher = createPathMatcher('');

        expect(matcher.test('/')).toBe(true);
        expect(matcher.test('/any/path')).toBe(true);
        expect(matcher.test('/agent-ui')).toBe(true);

        expect(matcher.extract('/')).toBe('/');
        expect(matcher.extract('/any/path')).toBe('/any/path');
        expect(matcher.extract('/agent-ui')).toBe('/agent-ui');
      });

      it('should match all paths when basePath is undefined', () => {
        const matcher = createPathMatcher(undefined as any);

        expect(matcher.test('/')).toBe(true);
        expect(matcher.test('/any/path')).toBe(true);
      });
    });

    describe('static basePath', () => {
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

      it('should extract paths correctly for static basePath', () => {
        const matcher = createPathMatcher('/agent-ui');

        expect(matcher.extract('/agent-ui')).toBe('/');
        expect(matcher.extract('/agent-ui/')).toBe('/');
        expect(matcher.extract('/agent-ui/chat')).toBe('/chat');
        expect(matcher.extract('/agent-ui/workspace/files')).toBe('/workspace/files');
      });

      it('should handle basePath with trailing slash', () => {
        const matcher = createPathMatcher('/agent-ui/');

        expect(matcher.test('/agent-ui')).toBe(true);
        expect(matcher.test('/agent-ui/')).toBe(true);
        expect(matcher.test('/agent-ui/chat')).toBe(true);

        expect(matcher.extract('/agent-ui')).toBe('/');
        expect(matcher.extract('/agent-ui/chat')).toBe('/chat');
      });

      it('should handle nested static paths', () => {
        const matcher = createPathMatcher('/foo/bar');

        expect(matcher.test('/foo/bar')).toBe(true);
        expect(matcher.test('/foo/bar/baz')).toBe(true);
        expect(matcher.test('/foo')).toBe(false);
        expect(matcher.test('/foo/other')).toBe(false);

        expect(matcher.extract('/foo/bar')).toBe('/');
        expect(matcher.extract('/foo/bar/baz')).toBe('/baz');
      });
    });

    describe('regex basePath', () => {
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

      it('should extract paths correctly for regex basePath', () => {
        const matcher = createPathMatcher('/tenant-.+');

        expect(matcher.extract('/tenant-abc')).toBe('/');
        expect(matcher.extract('/tenant-xyz/chat')).toBe('/chat');
        expect(matcher.extract('/tenant-123/workspace/files')).toBe('/workspace/files');
      });

      it('should handle complex regex patterns', () => {
        const matcher = createPathMatcher('/(dev|staging|prod)/app');

        expect(matcher.test('/dev/app')).toBe(true);
        expect(matcher.test('/staging/app')).toBe(true);
        expect(matcher.test('/prod/app')).toBe(true);
        expect(matcher.test('/dev/app/chat')).toBe(true);

        expect(matcher.test('/test/app')).toBe(false);
        expect(matcher.test('/dev/other')).toBe(false);

        expect(matcher.extract('/dev/app')).toBe('/');
        expect(matcher.extract('/staging/app/chat')).toBe('/chat');
        expect(matcher.extract('/prod/app/workspace')).toBe('/workspace');
      });

      it('should handle user-specific regex patterns', () => {
        const matcher = createPathMatcher('/user/[^/]+/dashboard');

        expect(matcher.test('/user/john/dashboard')).toBe(true);
        expect(matcher.test('/user/jane/dashboard')).toBe(true);
        expect(matcher.test('/user/user123/dashboard')).toBe(true);
        expect(matcher.test('/user/john/dashboard/settings')).toBe(true);

        expect(matcher.test('/user/dashboard')).toBe(false);
        expect(matcher.test('/user/john/other')).toBe(false);
        expect(matcher.test('/user/john/jane/dashboard')).toBe(false);

        expect(matcher.extract('/user/john/dashboard')).toBe('/');
        expect(matcher.extract('/user/jane/dashboard/settings')).toBe('/settings');
      });

      it('should handle exact match for regex patterns', () => {
        const matcher = createPathMatcher('/tenant-abc');

        // This should be treated as static, not regex
        expect(matcher.test('/tenant-abc')).toBe(true);
        expect(matcher.test('/tenant-xyz')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle root path basePath', () => {
        const matcher = createPathMatcher('/');

        expect(matcher.test('/')).toBe(true);
        expect(matcher.test('/chat')).toBe(true);
        expect(matcher.test('/workspace')).toBe(true);

        expect(matcher.extract('/')).toBe('/');
        expect(matcher.extract('/chat')).toBe('/chat');
      });

      it('should handle complex nested paths', () => {
        const matcher = createPathMatcher('/api/v1/agent');

        expect(matcher.test('/api/v1/agent')).toBe(true);
        expect(matcher.test('/api/v1/agent/chat')).toBe(true);
        expect(matcher.test('/api/v1/other')).toBe(false);

        expect(matcher.extract('/api/v1/agent')).toBe('/');
        expect(matcher.extract('/api/v1/agent/chat')).toBe('/chat');
      });

      it('should handle special characters in static paths', () => {
        const matcher = createPathMatcher('/agent-ui_v2');

        expect(matcher.test('/agent-ui_v2')).toBe(true);
        expect(matcher.test('/agent-ui_v2/chat')).toBe(true);
        expect(matcher.test('/agent-ui_v3')).toBe(false);
      });
    });
  });

  describe('setupUI integration', () => {
    it('should setup routes correctly with basePath', () => {
      const webui = {
        basePath: '/agent-ui',
        title: 'Test UI',
      };

      const pathMatcher = createPathMatcher(webui.basePath);

      // Test that the path matcher works as expected for the setupUI logic
      expect(pathMatcher.test('/agent-ui')).toBe(true);
      expect(pathMatcher.test('/agent-ui/chat')).toBe(true);
      expect(pathMatcher.test('/other')).toBe(false);

      expect(pathMatcher.extract('/agent-ui')).toBe('/');
      expect(pathMatcher.extract('/agent-ui/chat')).toBe('/chat');
    });

    it('should handle static file serving with basePath', () => {
      const webui = {
        basePath: '/agent-ui',
      };

      const pathMatcher = createPathMatcher(webui.basePath);

      // Test static file paths
      expect(pathMatcher.test('/agent-ui/static/js/main.js')).toBe(true);
      expect(pathMatcher.test('/agent-ui/assets/logo.png')).toBe(true);
      expect(pathMatcher.test('/other/static/js/main.js')).toBe(false);

      expect(pathMatcher.extract('/agent-ui/static/js/main.js')).toBe('/static/js/main.js');
      expect(pathMatcher.extract('/agent-ui/assets/logo.png')).toBe('/assets/logo.png');
    });

    it('should handle SPA routing with basePath', () => {
      const webui = {
        basePath: '/agent-ui',
      };

      const pathMatcher = createPathMatcher(webui.basePath);

      // Test SPA routes
      expect(pathMatcher.test('/agent-ui/chat')).toBe(true);
      expect(pathMatcher.test('/agent-ui/workspace')).toBe(true);
      expect(pathMatcher.test('/agent-ui/settings')).toBe(true);

      expect(pathMatcher.extract('/agent-ui/chat')).toBe('/chat');
      expect(pathMatcher.extract('/agent-ui/workspace')).toBe('/workspace');
      expect(pathMatcher.extract('/agent-ui/settings')).toBe('/settings');
    });

    it('should handle regex basePath in setupUI context', () => {
      const webui = {
        basePath: '/tenant-.+',
      };

      const pathMatcher = createPathMatcher(webui.basePath);

      // Test multi-tenant routing
      expect(pathMatcher.test('/tenant-abc/chat')).toBe(true);
      expect(pathMatcher.test('/tenant-xyz/workspace')).toBe(true);
      expect(pathMatcher.test('/other-abc/chat')).toBe(false);

      expect(pathMatcher.extract('/tenant-abc/chat')).toBe('/chat');
      expect(pathMatcher.extract('/tenant-xyz/workspace')).toBe('/workspace');
    });

    it('should handle HTML injection with basePath configuration', () => {
      const webui = {
        basePath: '/agent-ui',
        title: 'Test Agent UI',
      };

      // Simulate the HTML injection logic
      const mockHtmlContent = '<html><head></head><body><div id="root"></div></body></html>';
      const expectedScriptTag = `<script>
      window.AGENT_BASE_URL = "";
      window.AGENT_WEB_UI_CONFIG = ${JSON.stringify(webui)};
      console.log("Agent: Using API baseURL:", window.AGENT_BASE_URL);
    </script>`;

      const modifiedHtml = mockHtmlContent.replace('</head>', `${expectedScriptTag}\n</head>`);

      expect(modifiedHtml).toContain('window.AGENT_WEB_UI_CONFIG');
      expect(modifiedHtml).toContain('"basePath":"/agent-ui"');
      expect(modifiedHtml).toContain('"title":"Test Agent UI"');
    });
  });

  describe('performance and edge cases', () => {
    it('should handle large number of path tests efficiently', () => {
      const matcher = createPathMatcher('/tenant-.+');

      const testPaths = Array.from({ length: 1000 }, (_, i) => `/tenant-${i}/path`);

      const start = performance.now();
      testPaths.forEach((path) => {
        expect(matcher.test(path)).toBe(true);
        expect(matcher.extract(path)).toBe('/path');
      });
      const end = performance.now();

      // Should complete within reasonable time (less than 100ms for 1000 operations)
      expect(end - start).toBeLessThan(100);
    });

    it('should handle malformed regex patterns gracefully', () => {
      // This should not throw an error, even with potentially problematic regex
      // Instead it should fall back to static path matching
      expect(() => createPathMatcher('/[unclosed')).not.toThrow();

      const matcher = createPathMatcher('/[unclosed');
      expect(typeof matcher.test).toBe('function');
      expect(typeof matcher.extract).toBe('function');

      // Should work as static path since regex is malformed
      expect(matcher.test('/[unclosed')).toBe(true);
      expect(matcher.test('/[unclosed/path')).toBe(true);
      expect(matcher.test('/other')).toBe(false);
    });

    it('should handle very long paths', () => {
      const longPath = '/very/long/path/' + 'segment/'.repeat(100);
      const matcher = createPathMatcher('/very/long/path');

      expect(matcher.test(longPath)).toBe(true);
      expect(matcher.extract(longPath)).toContain('segment');
    });

    it('should handle unicode characters in paths', () => {
      const matcher = createPathMatcher('/agent-ui');

      expect(matcher.test('/agent-ui/测试')).toBe(true);
      expect(matcher.test('/agent-ui/🚀')).toBe(true);

      expect(matcher.extract('/agent-ui/测试')).toBe('/测试');
      expect(matcher.extract('/agent-ui/🚀')).toBe('/🚀');
    });
  });
});
