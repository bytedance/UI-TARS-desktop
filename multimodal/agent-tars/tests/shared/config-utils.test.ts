import { describe, it, expect } from 'vitest';
import { applyDefaultOptions } from '../../src/shared/config-utils';
import { AgentTARSOptions } from '@agent-tars/interface';

describe('Configuration Utilities', () => {
  describe('applyDefaultOptions', () => {
    it('should apply defaults to empty options', () => {
      const userOptions = {};
      const result = applyDefaultOptions<AgentTARSOptions>(userOptions);

      expect(result.browser).toEqual({
        type: 'local',
        headless: false,
        control: 'hybrid',
      });

      expect(result.search).toEqual({
        provider: 'browser_search',
        count: 10,
        browserSearch: {
          engine: 'google',
          needVisitedUrls: false,
        },
      });
    });

    it('should correctly merge browser options preserving defaults', () => {
      const userOptions = {
        browser: {
          headless: true,
          // note: control is intentionally not specified
        },
      };

      const result = applyDefaultOptions(userOptions);

      expect(result.browser).toEqual({
        type: 'local',
        headless: true,
        control: 'hybrid', // control default should be preserved
      });
    });

    it('should correctly merge nested search options', () => {
      const userOptions: AgentTARSOptions = {
        search: {
          provider: 'browser_search',
          browserSearch: {
            engine: 'baidu',
          },
        },
      };

      const result = applyDefaultOptions(userOptions);

      expect(result.search).toEqual({
        provider: 'browser_search',
        count: 10, // default preserved
        browserSearch: {
          engine: 'baidu',
          needVisitedUrls: false, // default preserved
        },
      });
    });

    it('should preserve custom options not in defaults', () => {
      const userOptions: AgentTARSOptions = {
        planner: {
          enable: true,
        },
      };

      const result = applyDefaultOptions(userOptions);

      // Default values
      expect(result.browser).toBeDefined();
      expect(result.search).toBeDefined();

      // Custom values preserved
      expect(result.planner).toEqual({
        enable: true,
      });
    });
  });
});
