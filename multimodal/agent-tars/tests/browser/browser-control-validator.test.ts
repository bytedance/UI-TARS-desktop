import { describe, it, expect } from 'vitest';
import { validateBrowserControlMode } from '../../src/browser/browser-control-validator';
import { ConsoleLogger } from '@mcp-agent/core';

describe('Browser Control Validator', () => {
  const logger = new ConsoleLogger('test');

  it('should return requested mode when provider is volcengine', () => {
    const result = validateBrowserControlMode('volcengine', 'mixed', logger);
    expect(result).toBe('mixed');
  });

  it('should enforce browser-use-only mode for unsupported providers', () => {
    const result = validateBrowserControlMode('openai', 'mixed', logger);
    expect(result).toBe('browser-use-only');
  });

  it('should enforce browser-use-only mode for undefined provider', () => {
    const result = validateBrowserControlMode(undefined, 'gui-agent-only', logger);
    expect(result).toBe('browser-use-only');
  });

  it('should not change browser-use-only mode regardless of provider', () => {
    const result = validateBrowserControlMode('unknown', 'browser-use-only', logger);
    expect(result).toBe('browser-use-only');
  });
});
