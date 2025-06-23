import { describe, it, expect } from 'vitest';
import { applyDefaultOptions, deepMerge } from '../../src/shared/config-utils';
import { AgentTARSOptions } from '@agent-tars/interface';

describe('Configuration Utilities', () => {
  describe('deepMerge', () => {
    it('should merge basic objects correctly', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
      // Original object should remain unchanged with default non-destructive option
      expect(target).toEqual({ a: 1, b: 2 });
    });

    it('should merge nested objects recursively', () => {
      const target = {
        a: 1,
        nested: {
          x: 10,
          y: 20,
          deep: { value: 'original' },
        },
      };
      const source = {
        b: 2,
        nested: {
          y: 30,
          z: 40,
          deep: { value: 'updated', extra: true },
        },
      };

      const result = deepMerge(target, source);

      expect(result).toEqual({
        a: 1,
        b: 2,
        nested: {
          x: 10,
          y: 30,
          z: 40,
          deep: { value: 'updated', extra: true },
        },
      });
    });

    it('should support destructive merge when specified', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source, { nonDestructive: false });

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
      // Original object should be modified with destructive option
      expect(target).toEqual({ a: 1, b: 3, c: 4 });
      // Both references should point to the same object
      expect(result).toBe(target);
    });

    it('should handle null or undefined source gracefully', () => {
      const target = { a: 1, b: 2 };

      expect(deepMerge(target, null)).toEqual({ a: 1, b: 2 });
      expect(deepMerge(target, undefined)).toEqual({ a: 1, b: 2 });
      // Should return a copy, not the original
      expect(deepMerge(target, null)).not.toBe(target);
    });

    it('should preserve arrays without merging them', () => {
      const target = { items: [1, 2, 3], settings: { enable: true } };
      const source = { items: [4, 5], settings: { timeout: 1000 } };

      const result = deepMerge<{
        items: number[];
        settings: { enable?: boolean; timeout?: number };
      }>(target, source);

      // Arrays should be replaced, not merged
      expect(result.items).toEqual([4, 5]);
      // Objects should still be merged
      expect(result.settings).toEqual({ enable: true, timeout: 1000 });
    });

    it('should ignore undefined values in source', () => {
      const target = { a: 1, b: 2 };
      const source = { a: undefined, c: 3 };

      const result = deepMerge<{ a?: number; b?: number; c?: number }>(target, source);

      // undefined values shouldn't overwrite existing properties
      expect(result.a).toBe(1);
      expect(result.c).toBe(3);
    });
  });

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
