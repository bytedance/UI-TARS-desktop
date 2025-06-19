import { describe, it, expect, beforeEach } from 'vitest';
import { ConsoleLogger } from '@mcp-agent/core';
import { BrowserToolsManager } from '../../src/browser/browser-tools-manager';

describe('BrowserToolsManager', () => {
  const logger = new ConsoleLogger('test');
  let toolsManager: BrowserToolsManager;

  beforeEach(() => {
    toolsManager = new BrowserToolsManager(logger, 'mixed');
  });

  it('should initialize with correct mode', () => {
    expect(toolsManager.getMode()).toBe('mixed');
    expect(toolsManager.getRegisteredTools()).toEqual([]);
  });

  it('should return correct mode after initialization', () => {
    const browserUseOnlyManager = new BrowserToolsManager(logger, 'browser-use-only');
    expect(browserUseOnlyManager.getMode()).toBe('browser-use-only');
  });

  it('should return empty array when no tools are registered', () => {
    expect(toolsManager.getRegisteredTools()).toEqual([]);
  });
});
