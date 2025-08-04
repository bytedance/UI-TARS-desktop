import { describe, it, expect, beforeEach } from 'vitest';
import { ConsoleLogger } from '@tarko/mcp-agent';
import { BrowserToolsManager } from '../../src/browser/browser-tools-manager';

describe('BrowserToolsManager', () => {
  const logger = new ConsoleLogger('test');
  let toolsManager: BrowserToolsManager;

  beforeEach(() => {
    toolsManager = new BrowserToolsManager(logger, 'hybrid');
  });

  it('should initialize with correct mode', () => {
    expect(toolsManager.getMode()).toBe('hybrid');
    expect(toolsManager.getRegisteredTools()).toEqual([]);
  });

  it('should return correct mode after initialization', () => {
    const browserUseOnlyManager = new BrowserToolsManager(logger, 'dom');
    expect(browserUseOnlyManager.getMode()).toBe('dom');
  });

  it('should return empty array when no tools are registered', () => {
    expect(toolsManager.getRegisteredTools()).toEqual([]);
  });
});
